#!/usr/bin/env bash
# ascii_scope.sh — tiny ASCII oscilloscope (stdin or demo). q=quit, a=autoscale
set -euo pipefail

# --- init ---
TTY=$(stty -g); trap 'stty "$TTY"; tput rmcup 2>/dev/null || true; tput cnorm 2>/dev/null || true' EXIT INT TERM
tput smcup 2>/dev/null || true; tput civis 2>/dev/null || true
stty -echo -icanon time 0 min 0
FPS=30; FRAME_US=$(awk -v f=$FPS 'BEGIN{printf "%.0f",1e6/f}')
AUTO=1; GAIN=1
declare -a B=(); N=0; MAXN=8192
DEMO=0; [[ -t 0 ]] && DEMO=1
phase=0

# --- helpers ---
R(){ perl -e 'select undef,undef,undef,shift/1e6' "$1"; }
SZ(){ COLS=$(tput cols 2>/dev/null||echo 80); LNS=$(tput lines 2>/dev/null||echo 24); }
PXY(){ printf '\033[%d;%dH' "$1" "$2"; }
READ1(){ dd bs=1 count=1 status=none 2>/dev/null; }
push(){ B[N++]="$1"; ((N>MAXN)) && { B=("${B[@]:N-MAXN}"); N=$MAXN; }; }

# --- io ---
demo(){ phase=$(awk -v p="$phase" 'BEGIN{print p+0.25}'); awk -v p="$phase" 'BEGIN{printf "%.6f\n",sin(p)+0.33*sin(0.7*p)}'; }
ingest(){
  if (( DEMO )); then for((i=0;i<COLS;i++)); do push "$(demo)"; done
  else
    local line c=0
    while IFS= read -r -t 0.0 line; do [[ -z "$line" ]] && continue; push "$(awk -v g="$GAIN" -v v="$line" 'BEGIN{printf "%.6f",g*v}')"; ((++c>=COLS)) && break; done
  fi
}

# --- draw ---
draw(){
  SZ; local W=$((COLS-2)); local H=$((LNS-3)); ((W<10||H<5)) && return
  printf '\033[2J'; PXY 1 1; printf "ascii-scope  AUTO:%d  GAIN:%.2f" "$AUTO" "$GAIN"
  local start=$(( N>W ? N-W : 0 )); local mn=-1 mx=1
  if (( AUTO && N-start>1 )); then
    mn=1e9; mx=-1e9
    for((i=start;i<N;i++));{ v=${B[i]}; awk -v x="$v" -v m="$mn" 'BEGIN{if(x<m)print 1;else print 0}'|grep -q 1 && mn=$v
                               awk -v x="$v" -v M="$mx" 'BEGIN{if(x>M)print 1;else print 0}'|grep -q 1 && mx=$v; }
    awk -v a="$mn" -v b="$mx" 'BEGIN{if(b-a<1e-6){m=(a+b)/2; a=m-0.5; b=m+0.5} printf ""}';
  fi
  local span; span=$(awk -v a="$mn" -v b="$mx" 'BEGIN{print b-a}')
  for((y=0;y<H;y++)); do PXY $((y+2)) 1; printf "|"; PXY $((y+2)) $((W+2)); printf "|"; done
  PXY $((H+2)) 1; printf "+%*s+" "$W" "$(printf '%*s' "$W" "" | tr ' ' '-')"
  for((x=0;x<W && start+x<N;x++)); do
    v=${B[start+x]}
    py=$(awk -v v="$v" -v mn="$mn" -v sp="$span" -v H="$H" 'BEGIN{n=(v-mn)/sp; if(n<0)n=0; if(n>1)n=1; y=int((1-n)*(H-1)); print y}')
    PXY $((2+py)) $((2+x)); printf "*"
  done
  PXY $((LNS)) 1; printf "y:[%.3f,%.3f] n:%d  q=quit a=autoscale +/-=gain\n" "$mn" "$mx" "$N"
}

# --- keys ---
key(){
  k="$(READ1 || true)"; [[ -z "${k:-}" ]] && return
  case "$k" in
    q) exit 0 ;;
    a) ((AUTO=1-AUTO)) ;;
    +) GAIN=$(awk -v g="$GAIN" 'BEGIN{print g*1.1111}') ;;
    -) GAIN=$(awk -v g="$GAIN" 'BEGIN{print g*0.9}') ;;
    *) : ;;
  esac
}

# --- loop ---
while :; do t0=$(perl -MTime::HiRes=time -e 'printf "%.0f",time()*1e6')
  ingest; draw; key
  t1=$(perl -MTime::HiRes=time -e 'printf "%.0f",time()*1e6'); dt=$((FRAME_US-(t1-t0))); ((dt>0)) && R "$dt"
done
