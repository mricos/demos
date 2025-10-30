/**
 * VARGRAPH.JS
 * Client-side library for querying Vargraph-tagged HTML documents
 * Uses the vg- prefix DOM schema
 */

class VargraphClient {
    constructor() {
        this.symbols = new Map();
        this.equations = new Map();
        this.paragraphs = new Map();
        this.sections = new Map();

        this.index();
    }

    /**
     * Index the entire document
     */
    index() {
        // Index sections
        document.querySelectorAll('.vg-section').forEach(section => {
            this.sections.set(section.id, {
                id: section.id,
                type: section.dataset.vgType,
                element: section
            });
        });

        // Index paragraphs
        document.querySelectorAll('.vg-paragraph').forEach(para => {
            this.paragraphs.set(para.id, {
                id: para.id,
                section: para.dataset.vgSection,
                element: para
            });
        });

        // Index symbols/variables
        document.querySelectorAll('.vg-var, .vg-data').forEach(el => {
            const id = el.dataset.vgId;
            if (!id) return;

            if (!this.symbols.has(id)) {
                this.symbols.set(id, {
                    id: id,
                    type: el.dataset.vgType,
                    value: el.dataset.vgValue,
                    unit: el.dataset.vgUnit,
                    occurrences: []
                });
            }

            this.symbols.get(id).occurrences.push({
                element: el,
                section: this.getParentSection(el)?.id,
                paragraph: this.getParentParagraph(el)?.id,
                context: this.getContext(el)
            });
        });

        // Index equations
        document.querySelectorAll('.vg-equation').forEach(eq => {
            const vars = (eq.dataset.vgVars || '').split(',').map(v => v.trim()).filter(Boolean);

            this.equations.set(eq.id, {
                id: eq.id,
                type: eq.dataset.vgType,
                number: eq.dataset.vgNumber,
                variables: vars,
                element: eq
            });

            // Add equation occurrences to symbols
            vars.forEach(varId => {
                if (!this.symbols.has(varId)) {
                    this.symbols.set(varId, {
                        id: varId,
                        occurrences: []
                    });
                }
                this.symbols.get(varId).occurrences.push({
                    type: 'equation',
                    equation: eq.id,
                    element: eq
                });
            });
        });
    }

    /**
     * Get all information about a symbol
     */
    getSymbol(symbolId) {
        return this.symbols.get(symbolId);
    }

    /**
     * Get all symbols
     */
    getAllSymbols() {
        return Array.from(this.symbols.values());
    }

    /**
     * Get equations that use a symbol
     */
    getEquationsUsing(symbolId) {
        return Array.from(this.equations.values())
            .filter(eq => eq.variables.includes(symbolId));
    }

    /**
     * Highlight all occurrences of a symbol
     */
    highlight(symbolId) {
        this.clearHighlights();

        const symbol = this.symbols.get(symbolId);
        if (!symbol) return;

        symbol.occurrences.forEach(occ => {
            if (occ.element) {
                occ.element.classList.add('vg-highlighted');
            }
        });
    }

    /**
     * Clear all highlights
     */
    clearHighlights() {
        document.querySelectorAll('.vg-highlighted').forEach(el => {
            el.classList.remove('vg-highlighted');
        });
    }

    /**
     * Get LLM-ready text for a section
     */
    getLLMText(sectionId) {
        const section = this.sections.get(sectionId);
        if (!section) return null;

        let text = '';

        // Get all paragraphs in this section
        const paras = section.element.querySelectorAll('.vg-paragraph');
        paras.forEach(para => {
            // Clone to avoid modifying DOM
            const clone = para.cloneNode(true);

            // Remove UI-only elements
            clone.querySelectorAll('.vg-ui-only').forEach(el => el.remove());

            // Convert equations to LaTeX
            clone.querySelectorAll('.vg-equation').forEach(eq => {
                const latex = eq.textContent.trim();
                eq.textContent = `\n${latex}\n`;
            });

            text += clone.textContent.trim() + '\n\n';
        });

        return text;
    }

    /**
     * Get parent section of an element
     */
    getParentSection(el) {
        return el.closest('.vg-section');
    }

    /**
     * Get parent paragraph of an element
     */
    getParentParagraph(el) {
        return el.closest('.vg-paragraph');
    }

    /**
     * Get surrounding context (50 chars before/after)
     */
    getContext(el, chars = 50) {
        const para = this.getParentParagraph(el);
        if (!para) return null;

        const text = para.textContent;
        const elText = el.textContent;
        const index = text.indexOf(elText);

        if (index === -1) return text.substring(0, 100);

        const start = Math.max(0, index - chars);
        const end = Math.min(text.length, index + elText.length + chars);

        return text.substring(start, end);
    }

    /**
     * Build dependency graph (symbol → equations → related symbols)
     */
    buildDependencyGraph() {
        const graph = {
            nodes: [],
            edges: []
        };

        // Add symbol nodes
        this.symbols.forEach((symbol, id) => {
            graph.nodes.push({
                id: id,
                type: symbol.type || 'symbol',
                label: id,
                count: symbol.occurrences.length
            });
        });

        // Add equation nodes
        this.equations.forEach((eq, id) => {
            graph.nodes.push({
                id: id,
                type: 'equation',
                label: eq.number || id
            });

            // Connect symbols to equations
            eq.variables.forEach(varId => {
                graph.edges.push({
                    source: varId,
                    target: id,
                    type: 'used-in'
                });
            });
        });

        return graph;
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            symbols: this.symbols.size,
            equations: this.equations.size,
            paragraphs: this.paragraphs.size,
            sections: this.sections.size,
            total_occurrences: Array.from(this.symbols.values())
                .reduce((sum, s) => sum + s.occurrences.length, 0)
        };
    }
}

// Auto-initialize on DOM ready
if (typeof window !== 'undefined') {
    window.vg = null;

    document.addEventListener('DOMContentLoaded', () => {
        window.vg = new VargraphClient();
        console.log('[Vargraph] Indexed:', window.vg.getStats());
    });
}
