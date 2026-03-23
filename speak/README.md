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
