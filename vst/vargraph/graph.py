"""
Knowledge Graph loader for Vargraph
Loads graph.toml and constructs KnowledgeGraph objects
"""

import toml
from pathlib import Path
from typing import Optional
from .models import KnowledgeGraph, Symbol, Connection, MarginNote


class GraphLoader:
    """Loads and saves knowledge graphs from/to TOML files"""

    @staticmethod
    def load_from_toml(toml_path: Path) -> KnowledgeGraph:
        """Load a knowledge graph from a TOML file"""
        data = toml.load(toml_path)

        # Extract metadata
        meta = data.get('meta', {})
        paper_id = meta.get('paper_id', 'unknown')
        title = meta.get('title', 'Untitled')

        # Parse symbols
        symbols = {}
        for symbol_data in data.get('symbols', []):
            symbol = Symbol(
                id=symbol_data['id'],
                name=symbol_data['name'],
                type=symbol_data['type'],
                latex=symbol_data['latex'],
                description=symbol_data['description'],
                color=symbol_data['color']
            )
            symbols[symbol.id] = symbol

        # Parse connections
        connections = []
        for conn_data in data.get('connections', []):
            connection = Connection(
                from_id=conn_data['from'],
                to_id=conn_data['to'],
                relationship=conn_data['relationship']
            )
            connections.append(connection)

        # Parse margin notes
        margin_notes = {}
        for note_data in data.get('margin_notes', []):
            symbol_id = note_data['symbol_id']
            note = MarginNote(
                symbol_id=symbol_id,
                title=note_data['title'],
                content=note_data['content'],
                math=note_data.get('math'),
                related=note_data.get('related', [])
            )

            if symbol_id not in margin_notes:
                margin_notes[symbol_id] = []
            margin_notes[symbol_id].append(note)

        return KnowledgeGraph(
            paper_id=paper_id,
            title=title,
            symbols=symbols,
            connections=connections,
            margin_notes=margin_notes,
            meta=meta
        )

    @staticmethod
    def save_to_toml(graph: KnowledgeGraph, toml_path: Path):
        """Save a knowledge graph to a TOML file"""
        data = {
            'meta': graph.meta,
            'symbols': [symbol.to_dict() for symbol in graph.symbols.values()],
            'connections': [conn.to_dict() for conn in graph.connections],
            'margin_notes': []
        }

        # Flatten margin notes
        for notes_list in graph.margin_notes.values():
            for note in notes_list:
                data['margin_notes'].append(note.to_dict())

        with open(toml_path, 'w') as f:
            toml.dump(data, f)


def load_paper_graph(paper_dir: Path) -> Optional[KnowledgeGraph]:
    """Load the knowledge graph for a paper"""
    graph_path = paper_dir / "graph.toml"

    if not graph_path.exists():
        print(f"Warning: graph.toml not found in {paper_dir}")
        return None

    return GraphLoader.load_from_toml(graph_path)


def load_paper_meta(paper_dir: Path) -> dict:
    """Load paper metadata from meta.toml"""
    meta_path = paper_dir / "meta.toml"

    if not meta_path.exists():
        return {}

    return toml.load(meta_path)
