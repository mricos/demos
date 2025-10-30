from __future__ import annotations
import os, sys, re, json, shlex, subprocess, base64, platform, shutil, glob
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Dict, List, Optional, Any, Tuple
from string import Template

# ---------- Config via ENV ----------
E = os.environ
DOC_URLS            = E.get("DOC_URLS","").split()
DOC_TITLE           = E.get("DOC_TITLE","Untitled")
DOC_SUBTITLE        = E.get("DOC_SUBTITLE","")
DOC_AUTHOR          = E.get("DOC_AUTHOR","Unknown")
DOC_TERM            = E.get("DOC_TERM","")
DOC_DATE            = E.get("DOC_DATE","")
DOC_NOTES_SOURCE    = E.get("DOC_NOTES_SOURCE","")
DOC_ENGINE          = E.get("DOC_ENGINE","pdflatex")
DOC_OUTDIR          = Path(E.get("DOC_OUTDIR","./build")).resolve()
DOC_CACHE           = Path(E.get("DOC_CACHE","./cache")).resolve()
DOC_TUFTE_MARGIN    = E.get("DOC_TUFTE_MARGIN","1") == "1"
DOC_MARGINPAR_WIDTH = int(E.get("DOC_MARGINPAR_WIDTH","55"))
DOC_INCLUDE_TIKZ    = E.get("DOC_INCLUDE_TIKZ","1") == "1"
DOC_VERBOSE         = E.get("DOC_VERBOSE","1") == "1"
HAS_PANDOC          = E.get("HAS_PANDOC","1") == "1"
PDFTOTEXT_FLAGS     = shlex.split(E.get("PDFTOTEXT_FLAGS","-layout -nopgbrk"))
OCR_ENABLE          = E.get("OCR_ENABLE","1") == "1"
OCR_LANGS           = E.get("OCR_LANGS","eng")
OPENAI_API_KEY      = E.get("OPENAI_API_KEY","")
LLM_MODEL           = E.get("LLM_MODEL","gpt-5")
LLM_MODE            = E.get("LLM_MODE","auto")          # auto|image|text
LLM_PAGE_DPI        = int(E.get("LLM_PAGE_DPI","300"))
DOC_OUTPUT          = E.get("DOC_OUTPUT","pdf").lower() # pdf|tex|html|md

DOC_OUTDIR.mkdir(parents=True, exist_ok=True)
DOC_CACHE.mkdir(parents=True, exist_ok=True)

# ---------- Writer-like context ----------
@dataclass
class Ctx:
    log: List[str] = field(default_factory=list)
    kv: Dict[str, Any] = field(default_factory=dict)
    artifacts: Dict[str, Any] = field(default_factory=dict)
    def write(self, msg: str) -> None:
        if DOC_VERBOSE: print(f"[pipeline] {msg}", file=sys.stderr)
        self.log.append(msg)

# ---------- Task abstraction ----------
@dataclass
class TaskResult:
    ok: bool
    msg: str = ""
    out: Dict[str, Any] = field(default_factory=dict)

@dataclass
class Task:
    name: str
    fn: Callable[[Ctx], TaskResult]
    requires: List[str] = field(default_factory=list)
    on_success: Optional[str] = None
    on_failure: Optional[str] = None
    meta: Dict[str, Any] = field(default_factory=dict)

@dataclass
class Pipeline:
    tasks: Dict[str, Task]
    start: str
    ctx: Ctx = field(default_factory=Ctx)
    executed: List[str] = field(default_factory=list)
    def run(self) -> None:
        agenda = [self.start]
        seen: set[str] = set()
        while agenda:
            tname = agenda.pop(0)
            if tname in seen:
                continue
            seen.add(tname)
            t = self.tasks[tname]
            # deps
            for dep in t.requires:
                if dep not in self.executed:
                    agenda.insert(0, tname)
                    agenda.insert(0, dep)
                    break
            else:
                self.ctx.write(f"RUN {tname}")
                r = t.fn(self.ctx)
                self.ctx.kv[tname] = r.out
                self.executed.append(tname)
                self.ctx.write(f"{tname}: {'OK' if r.ok else 'FAIL'} — {r.msg}")
                nxt = t.on_success if r.ok else t.on_failure
                if nxt:
                    agenda.insert(0, nxt)

# ---------- Utilities ----------
def run(cmd: List[str], cwd: Optional[Path]=None) -> Tuple[int,str,str]:
    p = subprocess.Popen(cmd, cwd=str(cwd) if cwd else None,
                         stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    out, err = p.communicate()
    return p.returncode, out, err

def exists(cmd: str) -> bool:
    return shutil.which(cmd) is not None

# ---------- LaTeX emitters ----------
def emit_preamble() -> str:
    if DOC_TUFTE_MARGIN:
        geom = (
            "letterpaper,top=24mm,bottom=28mm,inner=28mm,"
            f"outer={DOC_MARGINPAR_WIDTH}mm,marginparwidth={DOC_MARGINPAR_WIDTH}mm,marginparsep=8mm"
        )
        margin_block = "\\usepackage{marginnote}\n\\renewcommand*{\\marginfont}{\\footnotesize}\n"
    else:
        geom = "letterpaper,margin=25mm"
        margin_block = ""
    tikz_block = "\\usepackage{tikz}\n\\usetikzlibrary{arrows.meta,calc,positioning}\n" if DOC_INCLUDE_TIKZ else ""
    tpl = Template(r"""
\documentclass[11pt]{report}
\usepackage[$GEOM$]{geometry}
\usepackage{microtype,parskip,setspace}
\setstretch{1.07}
\usepackage{amsmath,amssymb,mathtools,bm}
\usepackage{siunitx}
\usepackage{hyperref}
$TIKZ$
\usepackage[most]{tcolorbox}
\tcbset{colback=white,colframe=black,sharp corners,boxsep=4pt,top=3pt,bottom=3pt,left=5pt,right=5pt}
\usepackage{caption}
\captionsetup{labelfont=bf,font=small}
$MARGIN$
\usepackage{fancyhdr}
\pagestyle{fancy}
\fancyhf{}
\lhead{$TITLE$}
\rhead{$AUTHOR$}
\cfoot{\thepage}
\newcommand{\kb}{k_{\mathrm B}}
\newcommand{\Z}{\mathcal{Z}}
\newcommand{\defeq}{\vcentcolon=}
\newtcolorbox{keyeq}{enhanced,breakable,colback=white,colframe=black!70,
  title={Key Equation},attach boxed title to top left={yshift=-2mm,xshift=2mm},
  boxed title style={sharp corners,colback=white}}
""")
    return tpl.substitute(
        GEOM=geom, TIKZ=tikz_block, MARGIN=margin_block,
        TITLE=DOC_TITLE, AUTHOR=DOC_AUTHOR,
    )

def emit_title() -> str:
    tpl = Template(r"""
\title{\vspace{-8mm}\textbf{$TITLE$}\\
\large $SUBTITLE$\\[2mm]
\large $TERM$}
\author{$AUTHOR$}
\date{$DATE$}
\begin{document}
\maketitle
\vspace*{-8mm}
\begin{center}\small
$NOTES$
\end{center}
\vspace{2mm}
\tableofcontents
""")
    return tpl.substitute(
        TITLE=DOC_TITLE, SUBTITLE=DOC_SUBTITLE, TERM=DOC_TERM,
        AUTHOR=DOC_AUTHOR, DATE=DOC_DATE, NOTES=DOC_NOTES_SOURCE,
    )

# ---------- Tasks ----------
def t_prereqs(ctx: Ctx) -> TaskResult:
    missing: List[str] = []
    need = ["curl","pdftotext","pdftoppm"]
    if OCR_ENABLE:
        need += ["ocrmypdf","tesseract","gs"]
    if DOC_OUTPUT == "pdf":
        need.append(DOC_ENGINE)
    if DOC_OUTPUT in ("html","md") and HAS_PANDOC:
        if not exists("pandoc"):
            missing.append("pandoc")
    for n in need:
        if not exists(n) and n not in missing:
            missing.append(n)
    # engine auto-detect if missing and pdf
    if DOC_OUTPUT == "pdf" and DOC_ENGINE in missing:
        for c in ["/Library/TeX/texbin/pdflatex",
                  *glob.glob("/usr/local/texlive/*/bin/*/pdflatex"),
                  "/Library/TeX/tex/texbin/pdflatex",
                  "/opt/local/bin/pdflatex"]:
            if os.path.isfile(c) and os.access(c, os.X_OK):
                globals()["DOC_ENGINE"] = c  # overwrite
                missing = [m for m in missing if m != E.get("DOC_ENGINE","pdflatex")]
                break
    if missing:
        return TaskResult(False, f"Missing: {', '.join(missing)}. Install required tools.")
    return TaskResult(True, "prereqs ok")

def t_fetch(ctx: Ctx) -> TaskResult:
    if not DOC_URLS:
        return TaskResult(False, "DOC_URLS empty")
    paths = []
    for i, url in enumerate(DOC_URLS):
        pdf = DOC_CACHE / f"{i:08d}_{Path(url).name}"
        code, _, err = run(["curl","-fsSL",url,"-o",str(pdf)])
        if code != 0:
            return TaskResult(False, f"curl failed: {err.strip()}")
        paths.append(str(pdf))
    return TaskResult(True, f"fetched {len(paths)}", {"pdfs": paths})

def t_pdftotext(ctx: Ctx) -> TaskResult:
    pdfs: List[str] = ctx.kv["t_fetch"]["pdfs"]
    txts: List[str] = []
    for p in pdfs:
        out = Path(p).with_suffix(".txt").as_posix()
        code, _, _ = run(["pdftotext", *PDFTOTEXT_FLAGS, p, out])
        if code != 0:
            return TaskResult(False, f"pdftotext failed on {p}")
        txts.append(out)
    return TaskResult(True, "extracted text", {"txts": txts})

def t_ocr_if_needed(ctx: Ctx) -> TaskResult:
    if not OCR_ENABLE:
        return TaskResult(True, "OCR disabled")
    pdfs: List[str] = ctx.kv["t_fetch"]["pdfs"]
    txts: List[str] = ctx.kv["t_pdftotext"]["txts"]
    fixed: List[str] = []
    for p, t in zip(pdfs, txts):
        if Path(t).exists() and Path(t).stat().st_size > 0:
            fixed.append(t); continue
        ocr_pdf = Path(p).with_suffix(".ocr.pdf").as_posix()
        code, out, err = run(["ocrmypdf","--language",OCR_LANGS,"--deskew","--optimize","3", p, ocr_pdf])
        if code != 0:
            return TaskResult(False, f"ocrmypdf failed: {err or out}")
        code, _, _ = run(["pdftotext", *PDFTOTEXT_FLAGS, ocr_pdf, t])
        if code != 0 or not Path(t).exists() or Path(t).stat().st_size == 0:
            return TaskResult(False, f"pdftotext after OCR failed on {p}")
        fixed.append(t)
    return TaskResult(True, "OCR pass complete", {"txts": fixed})

def t_rasterize(ctx: Ctx) -> TaskResult:
    pdfs: List[str] = ctx.kv["t_fetch"]["pdfs"]
    all_pages: Dict[str,List[str]] = {}
    for p in pdfs:
        prefix = DOC_CACHE / (Path(p).stem + "_page")
        code, out, err = run(["pdftoppm","-png","-r",str(LLM_PAGE_DPI), p, str(prefix)])
        if code != 0:
            return TaskResult(False, f"pdftoppm failed: {err or out}")
        pages = sorted([str(x) for x in prefix.parent.glob(prefix.name + "-*.png")])
        if not pages:
            return TaskResult(False, f"no pages rasterized for {p}")
        all_pages[p] = pages
    return TaskResult(True, "rasterized", {"pages": all_pages})

def _data_uri_png(path: str) -> str:
    b64 = base64.b64encode(Path(path).read_bytes()).decode("ascii")
    return f"data:image/png;base64,{b64}"

def _call_llm_image_to_latex(img_path: str) -> str:
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY not set")
    body = {
      "model": LLM_MODEL,
      "messages": [
        {"role":"system","content":[
          {"type":"input_text","text":(
            "Convert scientific page images into clean LaTeX. "
            "Use \\section*{} for headings; inline math $...$; display math \\[...\\]. "
            "Standardize S,U,N,V,T,k_B, beta=1/(k_B T), Z. Output LaTeX only."
          )}
        ]},
        {"role":"user","content":[
          {"type":"input_text","text":"Convert this page to LaTeX."},
          {"type":"input_image","image_url": _data_uri_png(img_path)}
        ]}
      ]
    }
    proc = subprocess.run(
        ["curl","-sS","https://api.openai.com/v1/chat/completions",
         "-H",f"Authorization: Bearer {OPENAI_API_KEY}",
         "-H","Content-Type: application/json",
         "-d", json.dumps(body)],
        capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"curl failed: {proc.stderr}")
    resp = json.loads(proc.stdout)
    return resp["choices"][0]["message"]["content"]

def t_llm_pages(ctx: Ctx) -> TaskResult:
    pages: Dict[str,List[str]] = ctx.kv["t_rasterize"]["pages"]
    out = DOC_OUTDIR / "body_llm.tex"
    with out.open("w", encoding="utf-8") as w:
        for pdf, plist in pages.items():
            for p in plist:
                ctx.write(f"LLM on {Path(p).name}")
                try:
                    latex = _call_llm_image_to_latex(p)
                except Exception as e:
                    return TaskResult(False, f"LLM call failed: {e}")
                w.write(f"% --- {Path(p).name} ---\n{latex.strip()}\n\n")
    return TaskResult(True, "LLM pages → LaTeX", {"body_tex": str(out)})

def t_text_to_latex(ctx: Ctx) -> TaskResult:
    txts: List[str] = ctx.kv["t_ocr_if_needed"]["txts"]
    out = DOC_OUTDIR / "body_text.tex"
    with out.open("w", encoding="utf-8") as w:
        for t in txts:
            if HAS_PANDOC and exists("pandoc"):
                proc = subprocess.run(["pandoc","-f","plain","-t","latex",t], capture_output=True, text=True)
                if proc.returncode != 0:
                    return TaskResult(False, f"pandoc failed: {proc.stderr}")
                w.write(proc.stdout + "\n")
            else:
                s = Path(t).read_text(encoding="utf-8", errors="ignore")
                s = (s.replace("\\","\\textbackslash{}")
                       .replace("{","\\{").replace("}","\\}")
                       .replace("%","\\%").replace("&","\\&")
                       .replace("$","\\$").replace("#","\\#")
                       .replace("_","\\_").replace("^","\\^{}")
                       .replace("~","\\textasciitilde{}"))
                w.write(s + "\n\n")
    return TaskResult(True, "plain text → LaTeX", {"body_tex": str(out)})

def t_choose_body(ctx: Ctx) -> TaskResult:
    if LLM_MODE in ("image","auto") and "t_llm_pages" in ctx.kv and "body_tex" in ctx.kv["t_llm_pages"]:
        return TaskResult(True, "using LLM body", {"body_tex": ctx.kv["t_llm_pages"]["body_tex"]})
    return TaskResult(True, "using text body", {"body_tex": ctx.kv["t_text_to_latex"]["body_tex"]})

def t_assemble(ctx: Ctx) -> TaskResult:
    body = Path(ctx.kv["t_choose_body"]["body_tex"])
    pre  = DOC_OUTDIR/"preamble.tex"
    tit  = DOC_OUTDIR/"title.tex"
    main = DOC_OUTDIR/"main.tex"
    pre.write_text(emit_preamble(), encoding="utf-8")
    tit.write_text(emit_title(), encoding="utf-8")
    with main.open("w", encoding="utf-8") as w:
        w.write("\\input{preamble}\n\\input{title}\n")
        w.write(f"\\input{{{body.name}}}\n")
        w.write("\\end{document}\n")
    return TaskResult(True, "assembled", {"main_tex": str(main)})

def t_export(ctx: Ctx) -> TaskResult:
    main = Path(ctx.kv["t_assemble"]["main_tex"])
    if DOC_OUTPUT == "tex":
        return TaskResult(True, f"OK: {main}", {"artifact": str(main)})
    if DOC_OUTPUT == "pdf":
        for _ in (1,2):
            code, _, err = run([DOC_ENGINE,"-interaction=nonstopmode",main.name], cwd=main.parent)
            if code != 0:
                return TaskResult(False, f"latex error: {err[:200]}")
        pdf = main.with_suffix(".pdf")
        if not pdf.exists():
            return TaskResult(False, "no PDF produced")
        return TaskResult(True, f"OK: {pdf}", {"artifact": str(pdf)})
    if DOC_OUTPUT in ("html","md"):
        if not exists("pandoc"):
            return TaskResult(False, "pandoc not found for HTML/MD export")
        if DOC_OUTPUT == "html":
            out = main.with_suffix(".html")
            code, _, err = run(["pandoc","-f","latex","-t","html5","--standalone","--mathjax","-o",out.name, main.name], cwd=main.parent)
            if code != 0:
                return TaskResult(False, f"pandoc html error: {err[:200]}")
        else:
            out = main.with_suffix(".md")
            code, _, err = run(["pandoc","-f","latex","-t","gfm","--standalone","-o",out.name, main.name], cwd=main.parent)
            if code != 0:
                return TaskResult(False, f"pandoc md error: {err[:200]}")
        return TaskResult(True, f"OK: {out}", {"artifact": str(out)})
    return TaskResult(False, f"Unsupported DOC_OUTPUT='{DOC_OUTPUT}'")

# ---------- Wire tasks ----------
def make_pipeline(llm: bool=True) -> Pipeline:
    tasks: Dict[str, Task] = {
        "t_prereqs": Task("t_prereqs", t_prereqs, [] , "t_fetch", None),
        "t_fetch":   Task("t_fetch",   t_fetch,   ["t_prereqs"], "t_pdftotext", None),
        "t_pdftotext": Task("t_pdftotext", t_pdftotext, ["t_fetch"], "t_ocr_if_needed", None),
        "t_ocr_if_needed": Task("t_ocr_if_needed", t_ocr_if_needed, ["t_pdftotext"],
                                "t_rasterize" if llm else "t_text_to_latex", None),
        "t_rasterize": Task("t_rasterize", t_rasterize, ["t_ocr_if_needed"],
                            "t_llm_pages" if llm else None, None),
        "t_llm_pages": Task("t_llm_pages", t_llm_pages, ["t_rasterize"], "t_text_to_latex", None),
        "t_text_to_latex": Task("t_text_to_latex", t_text_to_latex, ["t_ocr_if_needed"], "t_choose_body", None),
        "t_choose_body": Task("t_choose_body", t_choose_body, ["t_text_to_latex"], "t_assemble", None),
        "t_assemble": Task("t_assemble", t_assemble, ["t_choose_body"], "t_export", None),
        "t_export": Task("t_export", t_export, ["t_assemble"], None, None),
    }
    return Pipeline(tasks=tasks, start="t_prereqs")

# ---------- CLI ----------
def main(argv: List[str]) -> int:
    if len(argv) >= 2 and argv[1] == "graph":
        p = make_pipeline(llm=(LLM_MODE in ("image","auto")))
        for name, t in p.tasks.items():
            print(f"{name}: requires={t.requires} -> on_success={t.on_success} on_failure={t.on_failure}")
        return 0
    p = make_pipeline(llm=(LLM_MODE in ("image","auto")))
    p.run()
    (DOC_OUTDIR / "pipeline.log").write_text("\n".join(p.ctx.log), encoding="utf-8")
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv))
