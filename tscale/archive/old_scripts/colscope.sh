#!/usr/bin/env bash
# colview.sh — interactive column viewer with real-time stats for tscale.tsv
# Features:
#  - Top pane: scrollable “less-like” pager over the last N lines (follow or manual).
#  - Bottom pane: real-time stats for a selected column over multiple time windows.
#  - Input: stdin (stream) or a file path. TSV/whitespace columns: t, y, env, evt.
#  - Keys:
#      q          quit
#      f          toggle follow (auto-scroll to end)
#      ↑/k        scroll up 1
#      ↓/j        scroll down 1
#      PgUp/b     page up
#      PgDn/space page down
#      g          go to start
#      G          go to end
#      2/y        select column 2 (y)
#      3/e        select column 3 (env)
#      4/v        select column 4 (evt)
#      r          recompute fs estimate
#  - Env:
#      COL=2           initial data column (2..4)
#      WINS=0.05,0.25,1   stats windows in seconds (CSV)
#      MAXBUF=50000    maximum buffered lines
#      COL1_IS_TIME=1  first column is time in seconds (default 1)
#      PAGE=           lines shown in top pane (auto if unset)
set -euo pipefail

# ---------- defaults ----------
COL="${COL:-2}"
WINS="${WINS:-0.05,0.25,1}"
MAXBUF="${MAXBUF:-50000}"
COL1_IS_TIME="${COL1_IS_TIME:-1}"
SRC="${1:-}"          # optional file path; if empty, read stdin (stream)
FOLLOW=1
PAGE="${PAGE:-}"
TITLE="${TITLE:-colview (tscale.tsv)}"

# ---------- term init / cleanup ----------
HEIGHT=$(tput lines)
WIDTH=$(tput cols)
if [[ -z "${PAGE}" ]]; then
  # bottom stats pane uses ~7 lines
  PAGE=$(( HEIGHT - 7 ))
  (( PAGE < 5 )) && PAGE=5
fi

TMP="$(mktemp -t colscope.XXXXXX)"
cleanup() {
  tput rmcup || true
  tput cnorm || true
  [[ -n "${TAIL_PID:-}" ]] && kill "${TAIL_PID}" 2>/dev/null || true
  rm -f "$TMP" 2>/dev/null || true
}
trap cleanup INT TERM EXIT
if [[ -t 1 ]]; then tput smcup; tput civis; else echo "Requires a TTY" >&2; exit 1; fi


# ---------- start reader into TMP ----------
# We append to a temp file and the UI loop pulls incremental slices from it.
if [[ -n "$SRC" ]]; then
  stdbuf -oL -eL tail -n +1 -F -- "$SRC" >>"$TMP" &
  TAIL_PID=$!
else
  # Stream from stdin
  stdbuf -oL -eL cat >>"$TMP" &
  TAIL_PID=$!
fi

# ---------- buffers ----------
# Bash arrays holding parsed columns. We keep time[] and up to 4 columns.
declare -a T_ Y_ E_ V_
declare -i N=0
declare -i CUR=0       # index of last visible line
declare -i FIRST=1     # next unread line number in $TMP (1-based for sed -n)
declare -i FS_READY=0
FS_EST=0

# ---------- helpers ----------
draw_box() {
  local r1=$1 c1=$2 r2=$3 c2=$4
  local h=$(( r2-r1+1 )) w=$(( c2-c1+1 ))
  tput cup "$r1" "$c1"; printf '+%*s+' $((w-2)) | tr ' ' '-'
  for ((i=r1+1;i<r2;i++)); do tput cup "$i" "$c1"; printf '|'; tput cup "$i" "$c2"; printf '|'; done
  tput cup "$r2" "$c1"; printf '+%*s+' $((w-2)) | tr ' ' '-'
}
clear_region() {
  local r1=$1 c1=$2 r2=$3 c2=$4
  local h=$(( r2-r1+1 )) w=$(( c2-c1+1 ))
  for ((i=r1;i<=r2;i++)); do tput cup "$i" "$c1"; printf "%${w}s" ""; done
}
pr() { printf "%s" "$*"; }
pr_at() { tput cup "$1" "$2"; shift 2; printf "%s" "$*"; }

parse_new_lines() {
  # Read new lines from TMP starting at FIRST, append into arrays, cap MAXBUF.
  # Obtain total lines in TMP
  local total
  total=$(wc -l < "$TMP" 2>/dev/null || echo 0)
  (( total < FIRST )) && return 0
  if (( total >= FIRST )); then
    # Read [FIRST..total]
    local chunk
    chunk="$(sed -n "${FIRST},${total}p" "$TMP")"
    local line f1 f2 f3 f4
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      # Split on whitespace or tabs
      IFS=$'\t '" " read -r f1 f2 f3 f4 _ <<<"$line"
      # Skip comments/header
      [[ "${f1:0:1}" == "#" ]] && continue
      # Parse
      if (( COL1_IS_TIME )); then
        T_[N]="${f1:-0}"
        Y_[N]="${f2:-0}"
        E_[N]="${f3:-0}"
        V_[N]="${f4:-0}"
      else
        # If not time, we synthesize time by sample index / fs later
        T_[N]="$N"
        Y_[N]="${f1:-0}"
        E_[N]="${f2:-0}"
        V_[N]="${f3:-0}"
      fi
      (( N++ ))
      # Cap buffer size
      if (( N > MAXBUF )); then
        # drop oldest ~10%
        local drop=$(( MAXBUF/10 ))
        (( drop < 1 )) && drop=1
        T_=("${T_[@]:drop}")
        Y_=("${Y_[@]:drop}")
        E_=("${E_[@]:drop}")
        V_=("${V_[@]:drop}")
        (( N -= drop ))
      fi
    done <<<"$chunk"
    FIRST=$(( total+1 ))
  fi
}

estimate_fs() {
  # Estimate sampling frequency from last 512 intervals
  (( N < 4 )) && { FS_READY=0; return; }
  local m=512; (( m > N-1 )) && m=$((N-1))
  local i
  local t0=${T_[$((N-m-1))]}
  local tn=${T_[$((N-1))]}
  local dt=$(awk -v a="$t0" -v b="$tn" 'BEGIN{d=b-a; if (d<=0) d=1; print d}')
  local fs=$(awk -v n="$m" -v dt="$dt" 'BEGIN{print n/dt}')
  FS_EST="$fs"
  FS_READY=1
}

format_num() { awk -v x="$1" 'BEGIN{printf("%.9f", x)}'; }
join_by() { local IFS="$1"; shift; echo "$*"; }

slice_values_for_col() {
  # echo values for selected column over [i0..i1], one per line
  local i0=$1 i1=$2 col=$3
  local i
  for ((i=i0;i<=i1;i++)); do
    case "$col" in
      2) echo "${Y_[$i]}";;
      3) echo "${E_[$i]}";;
      4) echo "${V_[$i]}";;
      *) echo 0;;
    esac
  done
}

find_window_start_idx() {
  # Given window seconds w, return index i0 such that T_[i0] >= T_[CUR]-w
  local w="$1"
  if (( N == 0 )); then echo 0; return; end
  local t_end="${T_[$CUR]}"
  local t0=$(awk -v te="$t_end" -v w="$w" 'BEGIN{print te-w}')
  # linear scan backwards (simple and robust)
  local i=$CUR
  while (( i>0 )); do
    awk -v tt="${T_[$i-1]}" -v t0="$t0" 'BEGIN{exit !(tt<t0)}'
    if [[ $? -eq 0 ]]; then break; fi
    (( i-- ))
  done
  echo "$i"
}

stats_for_window() {
  # Inputs: i0 i1 col. Outputs one line: "n mean sd min max"
  local i0=$1 i1=$2 col=$3
  if (( i1<i0 )); then echo "0 0 0 0 0"; return; fi
  slice_values_for_col "$i0" "$i1" "$col" \
    | awk '
      {x=$1; n++; s+=x; ss+=x*x; if(n==1||x<m)x=m=x; if(n==1||x>M)M=x;}
      END{
        if(n==0){print "0 0 0 0 0"; exit}
        mu=s/n; v=(ss/n)-(mu*mu); if(v<0)v=0; sd=sqrt(v);
        printf "%d %.9f %.9f %.9f %.9f\n", n, mu, sd, m, M
      }'
}

draw_header() {
  pr_at 0 0 "$(printf "%s  | COL=%d  FOLLOW=%d  fs=%s  lines=%d  width=%d" \
    "$TITLE" "$COL" "$FOLLOW" \
    "$( ((FS_READY)) && awk -v f="$FS_EST" 'BEGIN{printf("%.3f Hz",f)}' || echo "?")" \
    "$N" "$WIDTH" )"
  # underline
  pr_at 1 0 "$(printf '%*s' "$WIDTH" '' | tr ' ' '-')"
}

draw_pager() {
  # Decide the end index to show
  if (( FOLLOW )); then CUR=$(( N>0 ? N-1 : 0 )); fi
  local end=$CUR
  local start=$(( end - PAGE + 1 )); (( start<0 )) && start=0
  local r
  clear_region 2 0 $((1+PAGE)) $((WIDTH-1))
  r=2
  local i
  for (( i=start; i<=end && r < 2+PAGE; i++, r++ )); do
    # Compose one row: time + selected column value (and evt if COL!=4)
    local t="${T_[$i]:-}"
    local val
    case "$COL" in
      2) val="${Y_[$i]:-}";;
      3) val="${E_[$i]:-}";;
      4) val="${V_[$i]:-}";;
      *) val="0";;
    esac
    local evt="${V_[$i]:-}"
    local line
    if (( COL==4 )); then
      line=$(printf "%-12.6f  %s" "$t" "$val")
    else
      line=$(printf "%-12.6f  % .9f  evt=%s" "$t" "$val" "$evt")
    fi
    pr_at $((r)) 0 "${line:0:$(($WIDTH-1))}"
  done
}

draw_stats() {
  # bottom box spanning last 6 lines
  local r1=$(( PAGE+3 ))
  local r2=$(( HEIGHT-1 ))
  local c1=0 c2=$(( WIDTH-1 ))
  draw_box "$r1" "$c1" "$r2" "$c2"
  local row=$(( r1+1 ))
  pr_at "$row" $((c1+2)) "Active column: $COL   Windows (s): $(echo "$WINS" | tr ',' ' ')"
  ((row++))
  if (( N==0 )); then
    pr_at "$row" $((c1+2)) "Waiting for data…"
    return
  fi
  # Determine i0 for each window and print stats
  local tcur="${T_[$CUR]}"
  local w
  IFS=',' read -r -a _W <<<"$WINS"
  for w in "${_W[@]}"; do
    local i0
    i0=$(find_window_start_idx "$w")
    local s
    s=$(stats_for_window "$i0" "$CUR" "$COL")
    # s: n mean sd min max
    pr_at "$row" $((c1+2)) "$(printf "t∈[%.3fs, %.3fs]  n=%-7s  μ=% .9f  σ=% .9f  min=% .9f  max=% .9f" \
      "$(awk -v a="$tcur" -v w="$w" 'BEGIN{print a-w}')" "$tcur" \
      $(echo "$s" | awk '{printf "%s %s %s %s %s",$1,$2,$3,$4,$5}'))"
    ((row++))
  done
  # Global stats over buffer
  local sg
  sg=$(stats_for_window 0 $((N-1)) "$COL")
  pr_at "$row" $((c1+2)) "$(printf "GLOBAL            n=%-7s  μ=% .9f  σ=% .9f  min=% .9f  max=% .9f" \
    $(echo "$sg" | awk '{printf "%s %s %s %s %s",$1,$2,$3,$4,$5}'))"
}

handle_key() {
  local k="$1"
  case "$k" in
    q) return 1;;
    f) FOLLOW=$((1-FOLLOW));;
    g) CUR=0; FOLLOW=0;;
    G) CUR=$(( N>0 ? N-1 : 0 )); FOLLOW=1;;
    k) (( CUR>0 )) && CUR=$((CUR-1)); FOLLOW=0;;
    A) (( CUR>0 )) && CUR=$((CUR-1)); FOLLOW=0;;      # up (ESC [ A)
    j) (( CUR<N-1 )) && CUR=$((CUR+1)); FOLLOW=0;;
    B) (( CUR<N-1 )) && CUR=$((CUR+1)); FOLLOW=0;;    # down
    b) # page up
       local step=$(( PAGE-1 )); (( step<1 )) && step=1
       CUR=$(( CUR - step )); (( CUR<0 )) && CUR=0; FOLLOW=0;;
    ' ') # page down
       local step=$(( PAGE-1 )); (( step<1 )) && step=1
       CUR=$(( CUR + step )); (( CUR>N-1 )) && CUR=$((N-1)); FOLLOW=0;;
    5) : ;; # placeholder
    6) : ;;
    y|2) COL=2;;
    e|3) COL=3;;
    v|4) COL=4;;
    r) estimate_fs;;
  esac
  return 0
}

read_key_nonblocking() {
  RETKEY=""
  # read from the controlling terminal explicitly
  if IFS= read -rsn1 -t 0.03 ch < /dev/tty; then
    if [[ "$ch" == $'\x1b' ]]; then
      IFS= read -rsn1 -t 0.001 ch1 < /dev/tty || { RETKEY=""; return 0; }
      if [[ "$ch1" == "[" ]]; then
        IFS= read -rsn1 -t 0.001 ch2 < /dev/tty || { RETKEY=""; return 0; }
        case "$ch2" in
          A|B|C|D|5|6) RETKEY="$ch2";;
          *) RETKEY="";;
        esac
        if [[ "$ch2" == "5" || "$ch2" == "6" ]]; then
          IFS= read -rsn1 -t 0.001 _ < /dev/tty || true
          RETKEY=$([[ "$ch2" == "5" ]] && echo b || echo ' ')
        fi
      fi
    else
      RETKEY="$ch"
    fi
    return 0
  else
    return 1
  fi
}

# ---------- main loop ----------
last_lines_seen=0
while :; do
  parse_new_lines
  if (( !FS_READY )); then estimate_fs; fi
  draw_header
  draw_pager
  draw_stats
  # Key handling
  if read_key_nonblocking; then
    if ! handle_key "$RETKEY"; then break; fi
  fi
done

exit 0
