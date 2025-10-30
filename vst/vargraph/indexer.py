"""
HTML Indexer for Vargraph
Parses HTML and builds comprehensive symbol occurrence index
"""

from bs4 import BeautifulSoup
from pathlib import Path
from typing import Dict, List
from .models import Occurrence, SymbolIndex, KnowledgeGraph
import re


class HTMLIndexer:
    """Parses HTML and builds symbol occurrence index"""

    def __init__(self, graph: KnowledgeGraph):
        self.graph = graph

    def index_html(self, html_path: Path) -> Dict[str, SymbolIndex]:
        """
        Parse HTML and build complete index of symbol occurrences
        Returns: Dict[symbol_id, SymbolIndex]
        """
        with open(html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()

        soup = BeautifulSoup(html_content, 'html.parser')

        # Initialize index for all symbols
        index = {}
        for symbol_id, symbol in self.graph.symbols.items():
            index[symbol_id] = SymbolIndex(
                symbol=symbol,
                connected_to=self.graph.get_related_symbols(symbol_id)
            )

        # Find all sections
        sections = soup.find_all('section', class_='content-section')

        for section in sections:
            section_id = section.get('id', 'unknown')

            # 1. Index <var-symbol> tags
            self._index_var_symbols(section, section_id, index)

            # 2. Index <equation> tags
            self._index_equations(section, section_id, index)

            # 3. Index <margin-anchor> tags
            self._index_margin_anchors(section, section_id, index)

            # 4. Index inline math (class="math-inline")
            self._index_inline_math(section, section_id, index)

            # 5. Index context controls
            self._index_controls(section, section_id, index)

        # Add sections list to each symbol
        for symbol_id, symbol_index in index.items():
            sections_set = {occ.section for occ in symbol_index.occurrences}
            symbol_index.sections = sorted(list(sections_set))

        return index

    def _index_var_symbols(self, section, section_id: str, index: Dict[str, SymbolIndex]):
        """Find all <var-symbol> tags"""
        var_symbols = section.find_all('var-symbol')

        for var_symbol in var_symbols:
            symbol_id = var_symbol.get('id')
            if not symbol_id or symbol_id not in index:
                continue

            # Get context (surrounding text)
            parent = var_symbol.parent
            context = parent.get_text()[:100] if parent else None

            occurrence = Occurrence(
                type='var-symbol',
                section=section_id,
                context=context,
                line=None  # Could be added with line number tracking
            )

            index[symbol_id].occurrences.append(occurrence)

    def _index_equations(self, section, section_id: str, index: Dict[str, SymbolIndex]):
        """Find all <equation> tags and their referenced variables"""
        equations = section.find_all('equation')

        for equation in equations:
            equation_id = equation.get('id')
            vars_attr = equation.get('vars', '')

            if not vars_attr:
                continue

            # Parse comma-separated list of variable IDs
            var_ids = [v.strip() for v in vars_attr.split(',')]

            # Get equation content for context
            eq_text = equation.get_text()[:150]

            for var_id in var_ids:
                if var_id not in index:
                    continue

                occurrence = Occurrence(
                    type='equation',
                    section=section_id,
                    equation_id=equation_id,
                    context=eq_text
                )

                index[var_id].occurrences.append(occurrence)

    def _index_margin_anchors(self, section, section_id: str, index: Dict[str, SymbolIndex]):
        """Find all <margin-anchor> tags"""
        margin_anchors = section.find_all('margin-anchor')

        for anchor in margin_anchors:
            note_id = anchor.get('note')
            if not note_id or note_id not in index:
                continue

            context = anchor.get_text()

            occurrence = Occurrence(
                type='margin-anchor',
                section=section_id,
                note_id=note_id,
                context=context
            )

            index[note_id].occurrences.append(occurrence)

    def _index_inline_math(self, section, section_id: str, index: Dict[str, SymbolIndex]):
        """Find all inline math with data-var attribute"""
        inline_math = section.find_all(class_='math-inline')

        for math_span in inline_math:
            var_id = math_span.get('data-var')
            if not var_id or var_id not in index:
                continue

            # Get parent paragraph for context
            paragraph = math_span.find_parent('p')
            para_text = paragraph.get_text()[:100] if paragraph else None

            occurrence = Occurrence(
                type='inline-math',
                section=section_id,
                context=para_text
            )

            index[var_id].occurrences.append(occurrence)

    def _index_controls(self, section, section_id: str, index: Dict[str, SymbolIndex]):
        """Find all controls that manipulate variables"""
        # Find input elements with data-var or id matching symbols
        controls = section.find_all(['input', 'button', 'select'])

        for control in controls:
            # Check for data-var attribute
            var_id = control.get('data-var') or control.get('id')

            if not var_id or var_id not in index:
                continue

            control_type = control.name
            control_id = control.get('id', f'{var_id}-control')

            occurrence = Occurrence(
                type='control',
                section=section_id,
                control_id=control_id,
                control_type=control_type
            )

            index[var_id].occurrences.append(occurrence)

    def get_occurrence_stats(self, index: Dict[str, SymbolIndex]) -> Dict:
        """Generate statistics about symbol occurrences"""
        stats = {
            'total_symbols': len(index),
            'total_occurrences': sum(si.occurrence_count for si in index.values()),
            'by_type': {},
            'by_section': {},
            'most_used': []
        }

        # Count by type
        for symbol_index in index.values():
            for occ in symbol_index.occurrences:
                stats['by_type'][occ.type] = stats['by_type'].get(occ.type, 0) + 1
                stats['by_section'][occ.section] = stats['by_section'].get(occ.section, 0) + 1

        # Most used symbols
        sorted_symbols = sorted(
            index.items(),
            key=lambda x: x[1].occurrence_count,
            reverse=True
        )
        stats['most_used'] = [
            {'id': sid, 'count': si.occurrence_count}
            for sid, si in sorted_symbols[:10]
        ]

        return stats
