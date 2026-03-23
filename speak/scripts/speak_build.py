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

