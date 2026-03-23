#MULTICAT_START
# dir: ./scripts
# file: speak_build.py
# note: Offline builder: input text -> out/audio.wav + out/manifest.json with absolute time ranges per chunk.
#MULTICAT_END
#!/usr/bin/env python3
import argparse
import json
import os
import sys
import wave
import numpy as np

DEFAULT_MODEL = "tts_models/en/ljspeech/tacotron2-DDC"

def log(msg):
    print(msg, file=sys.stderr)

def get_nlp():
    import spacy
    nlp = spacy.blank("en")
    nlp.add_pipe("sentencizer")
    return nlp

def clean_for_tts(text, strip_commas=True):
    import re
    text = re.sub(r'["""]', '"', text)
    text = re.sub(r"[''']", "'", text)
    text = re.sub(r'\s*"\s*$', '', text)
    text = re.sub(r'^\s*"\s*', '', text)
    if strip_commas:
        text = text.replace(',', '')
    text = ' '.join(text.split())
    return text.strip()

def split_sentences(text, nlp, strip_commas=True):
    text = ' '.join(text.split())
    doc = nlp(text)
    sentences = []
    for sent in doc.sents:
        s = clean_for_tts(sent.text, strip_commas)
        if not s or not any(c.isalnum() for c in s):
            continue
        if len(s) < 10 and sentences:
            sentences[-1] += ' ' + s
        else:
            sentences.append(s)
    return sentences

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input", nargs="?", default="-", help="Text file (or - for stdin)")
    ap.add_argument("-m", "--model", default=DEFAULT_MODEL, help="Coqui TTS model name")
    ap.add_argument("-o", "--outdir", default="./out", help="Output directory")
    ap.add_argument("--keep-commas", action="store_true")
    ap.add_argument("-b", "--batch", type=int, default=1, help="Batch N sentences into one chunk")
    ap.add_argument("--sr", type=int, default=22050, help="Output sample rate")
    args = ap.parse_args()

    if args.input != "-" and os.path.isfile(args.input):
        text = open(args.input, "r", encoding="utf-8").read()
    else:
        text = sys.stdin.read()

    if not text.strip():
        log("empty input")
        return 2

    log("Loading spaCy...")
    nlp = get_nlp()
    sentences = split_sentences(text, nlp, strip_commas=not args.keep_commas)

    if args.batch > 1:
        batched = []
        for i in range(0, len(sentences), args.batch):
            batched.append(" ".join(sentences[i:i+args.batch]))
        sentences = batched

    log(f"Chunks: {len(sentences)}")
    log(f"Loading TTS model: {args.model}")
    from TTS.api import TTS
    tts = TTS(model_name=args.model)

    out_audio = os.path.join(args.outdir, "audio.wav")
    out_manifest = os.path.join(args.outdir, "manifest.json")

    pcm_all = []
    manifest = {
        "sample_rate": int(args.sr),
        "audio": "audio.wav",
        "chunks": []
    }

    cursor_samples = 0
    for i, chunk_text in enumerate(sentences):
        wav = tts.tts(text=chunk_text)
        pcm16 = (np.clip(np.asarray(wav, dtype=np.float32), -1.0, 1.0) * 32767.0).astype(np.int16)

        start = cursor_samples
        end = cursor_samples + int(pcm16.shape[0])
        cursor_samples = end

        pcm_all.append(pcm16)
        manifest["chunks"].append({
            "i": int(i),
            "t": chunk_text,
            "start_s": start / args.sr,
            "end_s": end / args.sr,
            "start_samples": int(start),
            "end_samples": int(end)
        })
        log(f"[{i}] {manifest['chunks'][-1]['start_s']:.3f}-{manifest['chunks'][-1]['end_s']:.3f}  {chunk_text}")

    pcm_cat = np.concatenate(pcm_all) if pcm_all else np.zeros((0,), dtype=np.int16)

    os.makedirs(args.outdir, exist_ok=True)
    with wave.open(out_audio, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(args.sr)
        wf.writeframes(pcm_cat.tobytes())

    with open(out_manifest, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    log(f"Wrote: {out_audio}")
    log(f"Wrote: {out_manifest}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())

#MULTICAT_START
# dir: ./web
# file: index.html
# note: Minimal Speechify-like reader: loads manifest.json + audio.wav; highlights active chunk; click-to-seek.
#MULTICAT_END
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Speak</title>
  <link rel="stylesheet" href="./style.css" />
</head>
<body>
  <header>
    <div class="row">
      <button id="btnPlay">Play</button>
      <button id="btnPause">Pause</button>
      <button id="btnStop">Stop</button>
      <label>Rate <input id="rate" type="range" min="0.5" max="2.0" value="1.0" step="0.05"></label>
      <span id="clock">0.000</span>
    </div>
  </header>

  <main>
    <audio id="audio" preload="auto"></audio>
    <div id="text" class="text"></div>
  </main>

  <script src="./app.js"></script>
</body>
</html>

#MULTICAT_START
# dir: ./web
# file: style.css
# note:
#MULTICAT_END
:root { color-scheme: dark; }
body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system; }
header { position: sticky; top: 0; background: #111; border-bottom: 1px solid #222; padding: 10px; }
.row { display: flex; gap: 10px; align-items: center; }
button { padding: 6px 10px; }
main { padding: 16px; }
.text { line-height: 1.6; font-size: 18px; }
.chunk { cursor: pointer; padding: 2px 4px; border-radius: 4px; }
.chunk:hover { outline: 1px solid #333; }
.chunk.active { background: #2a2a2a; outline: 1px solid #444; }

#MULTICAT_START
# dir: ./web
# file: app.js
# note: Loads ../out/manifest.json + ../out/audio.wav; highlights chunk by absolute time; click-to-seek.
#MULTICAT_END
"use strict";

const $ = (sel) => document.querySelector(sel);

const audio = $("#audio");
const textEl = $("#text");
const clockEl = $("#clock");
const btnPlay = $("#btnPlay");
const btnPause = $("#btnPause");
const btnStop = $("#btnStop");
const rate = $("#rate");

let manifest = null;
let activeIdx = -1;
let spans = [];

function setActive(i) {
  if (i === activeIdx) return;
  if (activeIdx >= 0 && spans[activeIdx]) spans[activeIdx].classList.remove("active");
  activeIdx = i;
  if (activeIdx >= 0 && spans[activeIdx]) {
    spans[activeIdx].classList.add("active");
    spans[activeIdx].scrollIntoView({ block: "nearest" });
  }
}

function findChunkIndexByTime(t) {
  const ch = manifest.chunks;
  for (let i = 0; i < ch.length; i++) {
    if (t >= ch[i].start_s && t < ch[i].end_s) return i;
  }
  if (ch.length && t >= ch[ch.length - 1].start_s) return ch.length - 1;
  return -1;
}

async function load() {
  manifest = await (await fetch("../out/manifest.json", { cache: "no-store" })).json();
  audio.src = "../out/" + manifest.audio;

  const frag = document.createDocumentFragment();
  spans = manifest.chunks.map((c, i) => {
    const s = document.createElement("span");
    s.className = "chunk";
    s.dataset.i = String(i);
    s.textContent = c.t + " ";
    s.addEventListener("click", () => {
      audio.currentTime = c.start_s;
      audio.play();
    });
    frag.appendChild(s);
    return s;
  });
  textEl.replaceChildren(frag);

  audio.playbackRate = Number(rate.value);
}

btnPlay.addEventListener("click", () => audio.play());
btnPause.addEventListener("click", () => audio.pause());
btnStop.addEventListener("click", () => {
  audio.pause();
  audio.currentTime = 0;
  setActive(-1);
});

rate.addEventListener("input", () => {
  audio.playbackRate = Number(rate.value);
});

audio.addEventListener("timeupdate", () => {
  const t = audio.currentTime;
  clockEl.textContent = t.toFixed(3);
  if (!manifest) return;
  setActive(findChunkIndexByTime(t));
});

audio.addEventListener("ended", () => setActive(-1));

load().catch((e) => {
  console.error(e);
  textEl.textContent = "Failed to load manifest/audio. See console.";
});

#MULTICAT_START
# dir: .
# file: README.md
# note: Build + run.
#MULTICAT_END
Build audio + manifest:

  python3 ./scripts/speak_build.py ./nondual.txt -o ./out

Serve:

  python3 -m http.server --directory ./web 8000

Open:

  http://localhost:8000/

Layout:

  ./web/            static app
  ./out/            build artifacts (audio.wav, manifest.json)

Notes:
- ./web/app.js fetches ../out/manifest.json relative to /web. Keep ./out as sibling of ./web.
- For long documents, replace linear scan in findChunkIndexByTime() with binary search.
