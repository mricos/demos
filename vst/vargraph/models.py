"""
Data models for Vargraph
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any


@dataclass
class Symbol:
    """Represents a mathematical symbol, variable, function, parameter, or concept"""
    id: str
    name: str
    type: str  # variable, function, parameter, concept
    latex: str
    description: str
    color: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type,
            'latex': self.latex,
            'description': self.description,
            'color': self.color
        }


@dataclass
class Connection:
    """Represents a relationship between two symbols"""
    from_id: str
    to_id: str
    relationship: str  # uses, parameterized-by, derives, depends-on, varies-with, etc.

    def to_dict(self) -> Dict[str, Any]:
        return {
            'from': self.from_id,
            'to': self.to_id,
            'relationship': self.relationship
        }


@dataclass
class MarginNote:
    """Represents an explanatory note that appears in the right margin"""
    symbol_id: str
    title: str
    content: str
    math: Optional[str] = None
    related: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'symbol_id': self.symbol_id,
            'title': self.title,
            'content': self.content,
            'math': self.math,
            'related': self.related
        }


@dataclass
class Occurrence:
    """Represents a single occurrence of a symbol in the document"""
    type: str  # equation, inline-math, control, margin-note, text
    section: str
    equation_id: Optional[str] = None
    paragraph: Optional[int] = None
    line: Optional[int] = None
    control_id: Optional[str] = None
    control_type: Optional[str] = None
    note_id: Optional[str] = None
    context: Optional[str] = None  # Surrounding text snippet

    def to_dict(self) -> Dict[str, Any]:
        return {
            'type': self.type,
            'section': self.section,
            'equation_id': self.equation_id,
            'paragraph': self.paragraph,
            'line': self.line,
            'control_id': self.control_id,
            'control_type': self.control_type,
            'note_id': self.note_id,
            'context': self.context
        }


@dataclass
class SymbolIndex:
    """Complete index of a symbol with all its occurrences"""
    symbol: Symbol
    occurrences: List[Occurrence] = field(default_factory=list)
    connected_to: List[str] = field(default_factory=list)
    sections: List[str] = field(default_factory=list)

    @property
    def occurrence_count(self) -> int:
        return len(self.occurrences)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'definition': self.symbol.to_dict(),
            'occurrences': [occ.to_dict() for occ in self.occurrences],
            'connected_to': self.connected_to,
            'sections': self.sections,
            'occurrence_count': self.occurrence_count
        }


@dataclass
class KnowledgeGraph:
    """Complete knowledge graph for a paper"""
    paper_id: str
    title: str
    symbols: Dict[str, Symbol] = field(default_factory=dict)
    connections: List[Connection] = field(default_factory=list)
    margin_notes: Dict[str, List[MarginNote]] = field(default_factory=dict)
    meta: Dict[str, Any] = field(default_factory=dict)

    def get_symbol(self, symbol_id: str) -> Optional[Symbol]:
        return self.symbols.get(symbol_id)

    def get_connections_for(self, symbol_id: str) -> List[Connection]:
        """Get all connections where symbol is either from or to"""
        return [
            conn for conn in self.connections
            if conn.from_id == symbol_id or conn.to_id == symbol_id
        ]

    def get_related_symbols(self, symbol_id: str) -> List[str]:
        """Get IDs of all symbols connected to this symbol"""
        related = set()
        for conn in self.connections:
            if conn.from_id == symbol_id:
                related.add(conn.to_id)
            elif conn.to_id == symbol_id:
                related.add(conn.from_id)
        return list(related)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'paper_id': self.paper_id,
            'title': self.title,
            'symbols': {k: v.to_dict() for k, v in self.symbols.items()},
            'connections': [c.to_dict() for c in self.connections],
            'margin_notes': {
                k: [n.to_dict() for n in notes]
                for k, notes in self.margin_notes.items()
            },
            'meta': self.meta
        }
