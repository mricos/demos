# Pipeline outputs

## Select output type
Set `DOC_OUTPUT` in `.env`:
- `pdf`: compile LaTeX to PDF via `${DOC_ENGINE}` (default: `pdflatex`).
- `tex`: stop after LaTeX assembly and emit `build/main.tex`.
- `html`: convert LaTeX→HTML5 via `pandoc --mathjax`.
- `md`: convert LaTeX→GitHub-Flavored Markdown via pandoc.

Example:
```bash
export DOC_OUTPUT=html
export HAS_PANDOC=1
bash scripts/run_pipeline.sh
