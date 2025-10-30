#!/usr/bin/env bash
set -euo pipefail

# =========================
# Environment (see .env)
# =========================
: "${DOC_URLS:?Space-separated PDF URLs required}"
: "${DOC_TITLE:=Untitled}"
: "${DOC_SUBTITLE:=}"
: "${DOC_AUTHOR:=Unknown}"
: "${DOC_TERM:=}"
: "${DOC_NOTES_SOURCE:=}"
: "${DOC_DATE:=$(date +%Y-%m-%d)}"
: "${DOC_SPLIT_REGEX:=^Lecture[[:space:]]+[0-9]+|^Chapter[[:space:]]+[0-9]+}"
: "${DOC_ENGINE:=pdflatex}"
: "${DOC_OUTDIR:=./build}"
: "${DOC_CACHE:=./cache}"
: "${DOC_TUFTE_MARGIN:=1}"
: "${DOC_MARGINPAR_WIDTH:=55}"
: "${DOC_INCLUDE_TIKZ:=1}"
: "${DOC_VERBOSE:=1}"

# Tools toggles
: "${HAS_PANDOC:=1}"          # 1=use pandoc, 0=escape plain text
: "${PDFTOTEXT_FLAGS:=-layout -nopgbrk}"
: "${OCR_ENABLE:=1}"          # 1=use OCR fallback when needed
: "${OCR_LANGS:=eng}"         # tesseract langs
: "${DOC_AUTO_INSTALL:=0}"    # macOS: attempt brew installs if missing (0=no)

# =========================
# Logging
# =========================
log() { [[ "${DOC_VERBOSE}" == "1" ]] && printf '[doc2tex] %s\n' "$*" >&2 || true; }
die() { printf '[doc2tex] ERROR: %s\n' "$*" >&2; exit 1; }

# =========================
# Prereq checks
# =========================
is_macos() { [[ "$(uname -s)" == "Darwin" ]]; }
have() { command -v "$1" >/dev/null 2>&1; }

brew_hint_install() {
  local pkg="$1"
  if [[ "${DOC_AUTO_INSTALL}" == "1" ]]; then
    log "brew install ${pkg}"
    brew install "${pkg}" || die "brew install ${pkg} failed"
  else
    printf '[doc2tex] Missing: %s (install: brew install %s)\n' "${pkg}" "${pkg}" >&2
  fi
}

check_prereqs_macos() {
  if ! have brew; then
    die "Homebrew not found. Install from https://brew.sh/"
  fi
  have curl      || brew_hint_install curl
  have pdftotext || brew_hint_install poppler
  have gs        || brew_hint_install ghostscript
  have tesseract || brew_hint_install tesseract
  have ocrmypdf  || brew_hint_install ocrmypdf
  [[ "${HAS_PANDOC}" == "1" ]] && have pandoc || true
  have "${DOC_ENGINE}" || brew_hint_install mactex-no-gui
}

check_prereqs_any() {
  have curl      || die "curl missing"
  have pdftotext || die "pdftotext (poppler) missing"
  [[ "${HAS_PANDOC}" == "1" ]] && have pandoc || true
  if [[ "${OCR_ENABLE}" == "1" ]]; then
    have ocrmypdf || die "ocrmypdf missing"
    have tesseract || die "tesseract missing"
    have gs || die "ghostscript missing"
  fi
  have "${DOC_ENGINE}" || die "LaTeX engine '${DOC_ENGINE}' missing"
}

# Optional flag: --check
if [[ "${1:-}" == "--check" ]]; then
  if is_macos; then check_prereqs_macos; else check_prereqs_any; fi
  echo "[doc2tex] prereqs OK"
  exit 0
fi

# Normal path: ensure prereqs
if is_macos; then check_prereqs_macos; else check_prereqs_any; fi

mkdir -p "$DOC_OUTDIR" "$DOC_CACHE"

# =========================
# Template emitters
# =========================
emit_preamble() {
  local tufte="$1" margin_w="$2" tikz="$3"
  cat <<TEX
\\documentclass[11pt]{report}
\\usepackage[letterpaper${tufte:+,top=24mm,bottom=28mm,inner=28mm,outer=${margin_w}mm,marginparwidth=${margin_w}mm,marginparsep=8mm}]{geometry}
\\usepackage{microtype,parskip,setspace}
\\setstretch{1.07}
\\usepackage{amsmath,amssymb,mathtools,bm}
\\usepackage{siunitx}
\\usepackage{hyperref}
${tikz:+\\usepackage{tikz}\\usetikzlibrary{arrows.meta,calc,positioning}}
\\usepackage[most]{tcolorbox}
\\tcbset{colback=white,colframe=black,sharp corners,boxsep=4pt,top=3pt,bottom=3pt,left=5pt,right=5pt}
\\usepackage{caption}
\\captionsetup{labelfont=bf,font=small}
${tufte:+\\usepackage{marginnote}\\renewcommand*{\\marginfont}{\\footnotesize}}
\\usepackage{fancyhdr}
\\pagestyle{fancy}
\\fancyhf{}
\\lhead{${DOC_TITLE}}
\\rhead{${DOC_AUTHOR}}
\\cfoot{\\thepage}
\\newcommand{\\kb}{k_{\\mathrm B}}
\\newcommand{\\Z}{\\mathcal{Z}}
\\newcommand{\\defeq}{\\vcentcolon=}
\\newtcolorbox{keyeq}{enhanced,breakable,colback=white,colframe=black!70,title={Key Equation},attach boxed title to top left={yshift=-2mm,xshift=2mm},boxed title style={sharp corners,colback=white}}
TEX
}

emit_titlepage() {
  cat <<TEX
\\title{\\vspace{-8mm}\\textbf{${DOC_TITLE}}\\\\
\\large ${DOC_SUBTITLE}\\\\[2mm]
\\large ${DOC_TERM}}
\\author{${DOC_AUTHOR}}
\\date{${DOC_DATE}}
\\begin{document}
\\maketitle
\\vspace*{-8mm}
\\begin{center}\\small
${DOC_NOTES_SOURCE}
\\end{center}
\\vspace{2mm}
\\tableofcontents
TEX
}

emit_enddoc() { echo "\\end{document}"; }

# =========================
# Conversion helpers
# =========================
tex_escape_stream() {
  sed \
    -e 's/\\/\\textbackslash{}/g' \
    -e 's/[{}]/\\&/g' \
    -e 's/%/\\%/g' \
    -e 's/&/\\&/g' \
    -e 's/\$/\\\$/g' \
    -e 's/#/\\#/g' \
    -e 's/_/\\_/g' \
    -e 's/\^/\\^{} /g' \
    -e 's/~/\\textasciitilde{}/g'
}

to_latex_body() {
  if [[ "$HAS_PANDOC" == "1" ]] && have pandoc; then
    pandoc -f plain -t latex
  else
    awk 'NF{print $0 "\n"}' | tex_escape_stream
  fi
}

normalize_text() {
  iconv -c -t UTF-8//TRANSLIT | sed -e 's/\r$//' -e 's/[ \t]\+$//'
}

split_by_regex_into_files() {
  local input="$1" regex="$2" prefix="$3"
  local n=0
  awk -v RS='\n' -v ORS='\n' -v re="$regex" -v pre="$prefix" '
    BEGIN{file=""; n=0}
    {
      if ($0 ~ re) {
        n++
        if (file!="") close(file)
        file=sprintf("%s%02d.tex", pre, n)
        print "\\chapter{" $0 "}" > file
      } else {
        if (file=="") {
          n=1
          file=sprintf("%s%02d.tex", pre, n)
          print "\\chapter{Document}" > file
        }
        print $0 >> file
      }
    }
  ' "$input"
  echo "$n"
}

# =========================
# Fetch → extract → OCR fallback
# =========================
chapter_files=()
chap_idx=0

for url in ${DOC_URLS}; do
  base="$(printf "%08d" $chap_idx)_$(basename "${url%%\?*}")"
  pdf="$DOC_CACHE/$base"
  txt="$DOC_CACHE/${base%.pdf}.txt"
  norm="$DOC_CACHE/${base%.pdf}.norm.txt"

  log "Fetch: $url -> $pdf"
  curl -fsSL "$url" -o "$pdf"

  log "Extract text via pdftotext"
  pdftotext $PDFTOTEXT_FLAGS "$pdf" "$txt" || true

  if [[ ! -s "$txt" && "${OCR_ENABLE}" == "1" ]]; then
    log "No text; OCR fallback with ocrmypdf (langs=${OCR_LANGS})"
    ocrmypdf --language "${OCR_LANGS}" --deskew --optimize 3 "$pdf" "${pdf%.pdf}.ocr.pdf"
    pdftotext $PDFTOTEXT_FLAGS "${pdf%.pdf}.ocr.pdf" "$txt" || true
  fi

  [[ -s "$txt" ]] || die "Empty text after extraction (and OCR, if enabled)."

  cat "$txt" | normalize_text > "$norm"

  outpre="$DOC_OUTDIR/chap_${chap_idx}_"
  count=$(split_by_regex_into_files "$norm" "$DOC_SPLIT_REGEX" "$outpre")

  if [[ "$count" -eq 0 ]]; then
    target="${outpre}01.tex"
    printf "\\chapter{Document}\n" > "$target"
    cat "$norm" | to_latex_body >> "$target"
    chapter_files+=("$target")
  else
    for f in "$DOC_OUTDIR"/chap_${chap_idx}_*.tex; do
      head -n 1 "$f" > "${f}.tmp"
      tail -n +2 "$f" | to_latex_body >> "${f}.tmp"
      mv "${f}.tmp" "$f"
      chapter_files+=("$f")
    done
  fi

  chap_idx=$((chap_idx+1))
done

# =========================
# Assemble and compile
# =========================
main="$DOC_OUTDIR/main.tex"
log "Emit preamble"
emit_preamble "${DOC_TUFTE_MARGIN:+1}" "${DOC_MARGINPAR_WIDTH:-55}" "${DOC_INCLUDE_TIKZ:+1}" > "$DOC_OUTDIR/preamble.tex"

log "Emit title page"
emit_titlepage > "$DOC_OUTDIR/title.tex"

log "Compose main.tex"
{
  echo "\\input{preamble}"
  echo "\\input{title}"
  for f in "${chapter_files[@]}"; do
    echo "\\input{$(basename "$f")}"
  done
  emit_enddoc
} > "$main"

log "Compile with ${DOC_ENGINE}"
( cd "$DOC_OUTDIR" && "${DOC_ENGINE}" -interaction=nonstopmode main.tex >/dev/null || true )
( cd "$DOC_OUTDIR" && "${DOC_ENGINE}" -interaction=nonstopmode main.tex >/dev/null || true )

[[ -f "$DOC_OUTDIR/main.pdf" ]] || die "LaTeX failed. Inspect $DOC_OUTDIR/main.log"
echo "[doc2tex] OK: $DOC_OUTDIR/main.pdf"
