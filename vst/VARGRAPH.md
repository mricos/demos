# Vargraph - Variable Knowledge Graph System

Interactive mathematical papers with full symbol/concept tracking where **HTML is the source of truth**.

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run server
python run.py

# Open in browser
http://localhost:5000/vst-demo
http://localhost:5000/vst-demo/graph
```

## DOM Schema

All Vargraph elements use the `vg-` prefix:

### Sections & Paragraphs
```html
<section id="sec-introduction" class="vg-section" data-vg-type="introduction">
  <p id="para-intro-1" class="vg-paragraph" data-vg-section="sec-introduction">
    ...
  </p>
</section>
```

### Variables & Symbols
```html
<!-- Math variable -->
<span class="vg-var" data-vg-id="lambda" data-vg-type="function">λ(t)</span>

<!-- Parameter with range -->
<span class="vg-var" data-vg-id="alpha" data-vg-type="parameter">α</span>

<!-- Data value -->
<span class="vg-data" data-vg-id="fs" data-vg-value="8000" data-vg-unit="Hz">8000 Hz</span>
```

### Equations
```html
<div id="eq-fourier-def"
     class="vg-equation"
     data-vg-vars="f,t"
     data-vg-number="(1)"
     data-vg-type="definition">
  $$X(f) = \int x(t) e^{-j2\pi ft} dt$$
</div>
```

### Concepts & Insights
```html
<!-- Domain concept -->
<span class="vg-concept" data-vg-id="semitone">semitones</span>

<!-- Insight (for margin notes) -->
<span class="vg-insight" data-vg-id="time-warping">time warping</span>
```

### Controls
```html
<input class="vg-control"
       data-vg-var="alpha"
       type="range"
       min="0.5" max="1.0">
```

## JavaScript API

```javascript
// Auto-initialized as window.vg
const vg = window.vg;

// Get symbol info
const lambda = vg.getSymbol('lambda');
// { id, type, value, occurrences: [...] }

// Get all symbols
const symbols = vg.getAllSymbols();

// Get equations using a symbol
const equations = vg.getEquationsUsing('lambda');

// Highlight all occurrences
vg.highlight('lambda');
vg.clearHighlights();

// Get LLM-ready text
const text = vg.getLLMText('sec-introduction');

// Build dependency graph
const graph = vg.buildDependencyGraph();
// { nodes: [...], edges: [...] }

// Get stats
const stats = vg.getStats();
// { symbols: 15, equations: 10, paragraphs: 42, ... }
```

## Flask API

### Read Endpoints
- `GET /api/{paper_id}/graph` - Knowledge graph JSON
- `GET /api/{paper_id}/index` - Symbol index with occurrences
- `GET /api/{paper_id}/symbol/{id}` - Single symbol details
- `GET /api/{paper_id}/content` - Raw HTML

### Write Endpoints
- `POST /api/{paper_id}/content` - Update HTML
- `POST /api/{paper_id}/graph` - Update graph.toml

## Features

✅ **Single Source of Truth** - HTML is authoritative
✅ **Auto-Generated Knowledge Graph** - No manual sync
✅ **Client-Side Queries** - Rich DOM querying
✅ **LLM-Ready Extraction** - Clean text for AI
✅ **Click-to-Highlight** - See all symbol occurrences
✅ **Interactive Graph Viewer** - Cytoscape.js visualization
✅ **Version Control Friendly** - HTML diffs show content changes

## Graph Viewer

Open `graph-viewer.html` in iframe or standalone to see:
- Force-directed graph of symbols and equations
- Node size = number of occurrences
- Click node → highlight in document
- Sidebar shows occurrence details

## Files

```
vst/
├── index.html          # Main paper (with vg- tags)
├── graph.toml          # Knowledge graph (auto-gen from HTML)
├── meta.toml           # Paper metadata
├── graph-viewer.html   # Standalone graph viewer
├── vargraph/
│   ├── server.py       # Flask app
│   ├── indexer.py      # HTML parser
│   ├── graph.py        # TOML loader
│   └── models.py       # Data models
├── static/js/
│   └── vargraph.js     # Client library
└── run.py              # Server launcher
```

## Example Usage

1. **Tag your HTML** with `vg-` classes
2. **Auto-index** on page load (vargraph.js)
3. **Query** symbols: `vg.getSymbol('lambda')`
4. **Visualize** graph: open `/graph-viewer.html`
5. **Extract** for LLM: `vg.getLLMText('sec-intro')`

## Philosophy

- HTML is the document
- Everything else is computed from HTML
- No manual knowledge graph maintenance
- Version control sees real content changes
- Progressive enhancement (works without JS)
