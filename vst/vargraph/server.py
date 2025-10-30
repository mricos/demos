"""
Vargraph Flask Server
Main server application for Variable Knowledge Graph system
"""

from flask import Flask, jsonify, send_from_directory, request, render_template_string
from pathlib import Path
import json
from .graph import load_paper_graph, load_paper_meta, GraphLoader
from .indexer import HTMLIndexer

# Initialize Flask app
app = Flask(__name__, static_folder='../static', template_folder='../templates')

# Configuration
PAPERS_DIR = Path(__file__).parent.parent
CURRENT_PAPER = "vst-demo"  # Default paper


def get_paper_path(paper_id: str = None) -> Path:
    """Get the path to a paper directory"""
    pid = paper_id or CURRENT_PAPER
    return PAPERS_DIR / pid


@app.route('/')
def index():
    """List all papers"""
    papers = []
    # For now, just return the current paper
    papers.append({
        'id': CURRENT_PAPER,
        'title': 'Variable Scale Transform Demo',
        'url': f'/{CURRENT_PAPER}'
    })

    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Vargraph Papers</title>
        <style>
            body { font-family: Georgia, serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            h1 { color: #0066cc; }
            .paper { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
            .paper h2 { margin-top: 0; }
            a { color: #0066cc; text-decoration: none; }
            a:hover { text-decoration: underline; }
        </style>
    </head>
    <body>
        <h1>Vargraph Papers</h1>
        <div class="papers">
            {% for paper in papers %}
            <div class="paper">
                <h2><a href="{{ paper.url }}">{{ paper.title }}</a></h2>
                <p>ID: {{ paper.id }}</p>
                <div class="links">
                    <a href="{{ paper.url }}/graph">View Graph</a> |
                    <a href="{{ paper.url }}/index">View Index</a>
                </div>
            </div>
            {% endfor %}
        </div>
    </body>
    </html>
    """

    return render_template_string(html, papers=papers)


@app.route('/<paper_id>')
def view_paper(paper_id):
    """Serve the main paper HTML"""
    paper_path = get_paper_path(paper_id)
    html_path = paper_path / "index.html"

    if not html_path.exists():
        return f"Paper '{paper_id}' not found", 404

    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()

    return html_content


@app.route('/<paper_id>/graph')
def view_graph(paper_id):
    """Interactive graph viewer"""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Knowledge Graph - {{ paper_id }}</title>
        <script src="https://d3js.org/d3.v7.min.js"></script>
        <style>
            body { margin: 0; overflow: hidden; font-family: sans-serif; }
            #graph { width: 100vw; height: 100vh; }
            .node { cursor: pointer; }
            .node:hover { opacity: 0.8; }
            .link { stroke: #999; stroke-opacity: 0.6; }
            .sidebar {
                position: absolute; right: 0; top: 0; bottom: 0; width: 300px;
                background: white; border-left: 1px solid #ddd;
                padding: 20px; overflow-y: auto;
            }
            .sidebar h3 { margin-top: 0; }
            .occurrence { margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 4px; }
            .occurrence-type { font-weight: bold; color: #0066cc; }
        </style>
    </head>
    <body>
        <svg id="graph"></svg>
        <div class="sidebar" id="sidebar">
            <h3>Symbol Info</h3>
            <p>Click a node to see occurrences</p>
        </div>

        <script>
            // Fetch graph data
            fetch('/api/{{ paper_id }}/graph')
                .then(r => r.json())
                .then(data => {
                    renderGraph(data);
                });

            function renderGraph(graphData) {
                const width = window.innerWidth - 300;
                const height = window.innerHeight;

                const svg = d3.select('#graph')
                    .attr('width', width)
                    .attr('height', height);

                // Transform data for D3
                const nodes = Object.values(graphData.symbols);
                const links = graphData.connections.map(c => ({
                    source: c.from,
                    target: c.to,
                    relationship: c.relationship
                }));

                // Create simulation
                const simulation = d3.forceSimulation(nodes)
                    .force('link', d3.forceLink(links).id(d => d.id).distance(100))
                    .force('charge', d3.forceManyBody().strength(-300))
                    .force('center', d3.forceCenter(width / 2, height / 2));

                // Draw links
                const link = svg.append('g')
                    .selectAll('line')
                    .data(links)
                    .join('line')
                    .attr('class', 'link')
                    .attr('stroke-width', 2);

                // Draw nodes
                const node = svg.append('g')
                    .selectAll('circle')
                    .data(nodes)
                    .join('circle')
                    .attr('class', 'node')
                    .attr('r', 8)
                    .attr('fill', d => d.color)
                    .call(drag(simulation))
                    .on('click', (event, d) => showSymbolInfo(d.id));

                // Labels
                const labels = svg.append('g')
                    .selectAll('text')
                    .data(nodes)
                    .join('text')
                    .text(d => d.name)
                    .attr('font-size', 12)
                    .attr('dx', 12)
                    .attr('dy', 4);

                simulation.on('tick', () => {
                    link
                        .attr('x1', d => d.source.x)
                        .attr('y1', d => d.source.y)
                        .attr('x2', d => d.target.x)
                        .attr('y2', d => d.target.y);

                    node
                        .attr('cx', d => d.x)
                        .attr('cy', d => d.y);

                    labels
                        .attr('x', d => d.x)
                        .attr('y', d => d.y);
                });

                function drag(simulation) {
                    function dragstarted(event) {
                        if (!event.active) simulation.alphaTarget(0.3).restart();
                        event.subject.fx = event.subject.x;
                        event.subject.fy = event.subject.y;
                    }

                    function dragged(event) {
                        event.subject.fx = event.x;
                        event.subject.fy = event.y;
                    }

                    function dragended(event) {
                        if (!event.active) simulation.alphaTarget(0);
                        event.subject.fx = null;
                        event.subject.fy = null;
                    }

                    return d3.drag()
                        .on('start', dragstarted)
                        .on('drag', dragged)
                        .on('end', dragended);
                }
            }

            function showSymbolInfo(symbolId) {
                fetch(`/api/{{ paper_id }}/symbol/${symbolId}`)
                    .then(r => r.json())
                    .then(data => {
                        const sidebar = document.getElementById('sidebar');
                        const symbol = data.definition;
                        const occs = data.occurrences;

                        let html = `
                            <h3>${symbol.name}</h3>
                            <p><strong>Type:</strong> ${symbol.type}</p>
                            <p><strong>Description:</strong> ${symbol.description}</p>
                            <p><strong>Occurrences:</strong> ${data.occurrence_count}</p>
                            <hr>
                            <h4>Found in:</h4>
                        `;

                        occs.forEach(occ => {
                            html += `
                                <div class="occurrence">
                                    <div class="occurrence-type">${occ.type}</div>
                                    <div>Section: ${occ.section}</div>
                                    ${occ.context ? `<div style="font-size: 12px; color: #666; margin-top: 5px;">${occ.context}</div>` : ''}
                                </div>
                            `;
                        });

                        sidebar.innerHTML = html;
                    });
            }
        </script>
    </body>
    </html>
    """

    return render_template_string(html, paper_id=paper_id)


@app.route('/<paper_id>/index')
def view_index(paper_id):
    """Symbol index viewer"""
    # This will be a simple table view of all symbols and their occurrence counts
    # Will implement more sophisticated version later
    return jsonify({"message": "Index viewer coming soon"})


@app.route('/<paper_id>/<path:filename>')
def serve_paper_static(paper_id, filename):
    """Serve static files (CSS, JS, images) from paper directory"""
    paper_path = get_paper_path(paper_id)
    return send_from_directory(paper_path, filename)


# ============================================================================
# API ROUTES
# ============================================================================

@app.route('/api/<paper_id>/graph')
def api_get_graph(paper_id):
    """Get the knowledge graph as JSON"""
    paper_path = get_paper_path(paper_id)
    graph = load_paper_graph(paper_path)

    if not graph:
        return jsonify({"error": "Graph not found"}), 404

    return jsonify(graph.to_dict())


@app.route('/api/<paper_id>/index')
def api_get_index(paper_id):
    """Get the complete symbol index"""
    paper_path = get_paper_path(paper_id)
    graph = load_paper_graph(paper_path)

    if not graph:
        return jsonify({"error": "Graph not found"}), 404

    # Index the HTML
    html_path = paper_path / "index.html"
    if not html_path.exists():
        return jsonify({"error": "HTML not found"}), 404

    indexer = HTMLIndexer(graph)
    index = indexer.index_html(html_path)

    # Convert to JSON
    index_dict = {k: v.to_dict() for k, v in index.items()}

    # Add stats
    stats = indexer.get_occurrence_stats(index)

    return jsonify({
        'index': index_dict,
        'stats': stats
    })


@app.route('/api/<paper_id>/symbol/<symbol_id>')
def api_get_symbol(paper_id, symbol_id):
    """Get a single symbol with all its occurrences"""
    paper_path = get_paper_path(paper_id)
    graph = load_paper_graph(paper_path)

    if not graph:
        return jsonify({"error": "Graph not found"}), 404

    # Build index
    html_path = paper_path / "index.html"
    indexer = HTMLIndexer(graph)
    index = indexer.index_html(html_path)

    if symbol_id not in index:
        return jsonify({"error": "Symbol not found"}), 404

    return jsonify(index[symbol_id].to_dict())


@app.route('/api/<paper_id>/content', methods=['GET'])
def api_get_content(paper_id):
    """Get raw HTML content"""
    paper_path = get_paper_path(paper_id)
    html_path = paper_path / "index.html"

    if not html_path.exists():
        return jsonify({"error": "HTML not found"}), 404

    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()

    return jsonify({'content': content})


@app.route('/api/<paper_id>/content', methods=['POST'])
def api_update_content(paper_id):
    """Update HTML content"""
    paper_path = get_paper_path(paper_id)
    html_path = paper_path / "index.html"

    data = request.json
    new_content = data.get('content')

    if not new_content:
        return jsonify({"error": "No content provided"}), 400

    # Save the updated content
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

    return jsonify({"success": True})


@app.route('/api/<paper_id>/graph', methods=['POST'])
def api_update_graph(paper_id):
    """Update the knowledge graph"""
    paper_path = get_paper_path(paper_id)
    graph_path = paper_path / "graph.toml"

    # For now, just accept raw TOML content
    data = request.json
    toml_content = data.get('toml')

    if not toml_content:
        return jsonify({"error": "No TOML content provided"}), 400

    with open(graph_path, 'w', encoding='utf-8') as f:
        f.write(toml_content)

    return jsonify({"success": True})


def run_server(host='0.0.0.0', port=5000, debug=True):
    """Run the Flask development server"""
    app.run(host=host, port=port, debug=debug)


if __name__ == '__main__':
    run_server()
