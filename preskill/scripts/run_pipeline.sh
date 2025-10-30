#!/usr/bin/env bash
set -euo pipefail
: "${ENV_FILE:=.env}"
if [[ -f "$ENV_FILE" ]]; then
  set -a; source "$ENV_FILE"; set +a
else
  echo "[run] Missing $ENV_FILE; copy .env.example" >&2
  exit 1
fi
mkdir -p "${DOC_OUTDIR:-./build}" "${DOC_CACHE:-./cache}"
python3 ./py/pipeline.py
