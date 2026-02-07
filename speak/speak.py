#!/usr/bin/env python3
import sounddevice as sd
import numpy as np
import argparse
import sys
import os
import json
import threading
import queue

DEFAULT_MODEL = "tts_models/en/ljspeech/tacotron2-DDC"
CACHE_FILE = os.path.expanduser("~/.cache/speak_models.json")

def log(msg):
    print(msg, file=sys.stderr)

def get_nlp():
    import spacy
    nlp = spacy.blank("en")
    nlp.add_pipe("sentencizer")
    return nlp

def clean_for_tts(text, strip_commas=True):
    import re
    # Normalize quotes to simple quotes
    text = re.sub(r'["""]', '"', text)
    text = re.sub(r"[''']", "'", text)
    # Remove stray quotes
    text = re.sub(r'\s*"\s*$', '', text)
    text = re.sub(r'^\s*"\s*', '', text)
    # Remove commas to reduce pauses
    if strip_commas:
        text = text.replace(',', '')
    # Collapse whitespace
    text = ' '.join(text.split())
    return text.strip()

def split_sentences(text, nlp, strip_commas=True):
    text = ' '.join(text.split())
    doc = nlp(text)
    sentences = []
    for sent in doc.sents:
        s = clean_for_tts(sent.text, strip_commas)
        # Skip if no actual words
        if not s or not any(c.isalnum() for c in s):
            continue
        # Merge short fragments with previous
        if len(s) < 10 and sentences:
            sentences[-1] += ' ' + s
        else:
            sentences.append(s)
    return sentences

def fetch_models():
    from TTS.api import TTS
    manager = TTS().list_models()
    return list(manager.list_tts_models())

def get_models(refresh=False):
    if not refresh and os.path.exists(CACHE_FILE):
        with open(CACHE_FILE) as f:
            return json.load(f)
    log("Fetching model list...")
    models = fetch_models()
    os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
    with open(CACHE_FILE, 'w') as f:
        json.dump(models, f)
    return models

def list_models(refresh=False):
    models = get_models(refresh)
    print("Available models:")
    for i, model in enumerate(models):
        print(f"  [{i}] {model}")

def resolve_model(model_arg):
    if model_arg.isdigit():
        models = get_models()
        idx = int(model_arg)
        if 0 <= idx < len(models):
            return models[idx]
        log(f"Invalid model index: {idx}")
        sys.exit(1)
    return model_arg

def speak(text, model, offset=0, strip_commas=True, batch_size=1, lookahead=3):
    log("Loading spaCy...")
    nlp = get_nlp()

    sentences = split_sentences(text, nlp, strip_commas)

    # Batch sentences together for better flow
    if batch_size > 1:
        batched = []
        for i in range(0, len(sentences), batch_size):
            batched.append(' '.join(sentences[i:i+batch_size]))
        sentences = batched

    sentences = sentences[offset:]
    print(f"Total chunks: {len(sentences) + offset}, starting at: {offset}")

    log(f"Loading TTS model: {model}")
    from TTS.api import TTS
    tts = TTS(model_name=model)
    log("Ready.")

    audio_queue = queue.Queue(maxsize=lookahead)
    done_generating = threading.Event()

    def generate():
        for i, sentence in enumerate(sentences, start=offset):
            try:
                wav = tts.tts(text=sentence)
                audio_queue.put((i, sentence, np.array(wav)))
            except Exception as e:
                log(f"Skipping chunk {i}: {e}")
        done_generating.set()

    def play():
        while not (done_generating.is_set() and audio_queue.empty()):
            try:
                i, sentence, wav = audio_queue.get(timeout=0.1)
                print(f"[{i}] {sentence}")
                sd.play(wav, samplerate=22050)
                sd.wait()
            except queue.Empty:
                continue

    gen_thread = threading.Thread(target=generate)
    play_thread = threading.Thread(target=play)

    gen_thread.start()
    play_thread.start()

    gen_thread.join()
    play_thread.join()

def main():
    parser = argparse.ArgumentParser(description="Text-to-speech with sentence boundaries")
    parser.add_argument("file", nargs="?", help="Input file (use - or omit for stdin)")
    parser.add_argument("-o", "--offset", type=int, default=0, help="Start at sentence N")
    parser.add_argument("-m", "--model", default=DEFAULT_MODEL, help="TTS model name or index")
    parser.add_argument("-l", "--list", action="store_true", help="List available models")
    parser.add_argument("--refresh", action="store_true", help="Refresh cached model list")
    parser.add_argument("--keep-commas", action="store_true", help="Keep commas (default: strip for flow)")
    parser.add_argument("-b", "--batch", type=int, default=1, help="Batch N sentences together")
    parser.add_argument("-a", "--ahead", type=int, default=3, help="Lookahead buffer size (default: 3)")

    args = parser.parse_args()

    if args.list:
        list_models(args.refresh)
        return

    if args.file and args.file != "-":
        with open(args.file) as f:
            text = f.read()
    else:
        text = sys.stdin.read()

    if not text.strip():
        log("No input text provided")
        sys.exit(1)

    model = resolve_model(args.model)
    speak(text, model, args.offset,
          strip_commas=not args.keep_commas,
          batch_size=args.batch,
          lookahead=args.ahead)

if __name__ == "__main__":
    main()
