/**
 * GlossaryRenderer.js
 *
 * Simple glossary term highlighter for narrative documentation.
 * Scans text content and wraps glossary terms in styled spans.
 */

class GlossaryRenderer {
    constructor(glossary) {
        this.glossary = glossary;
    }

    /**
     * Highlight all glossary terms in a container
     */
    highlightTerms(container) {
        if (!container) {
            console.error('GlossaryRenderer: No container provided');
            return;
        }

        // Get all text nodes
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    // Skip if parent already has glossary-term class
                    if (node.parentElement.classList.contains('glossary-term')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    // Skip script and style elements
                    const parent = node.parentElement;
                    if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        // Process each text node
        textNodes.forEach(textNode => {
            this.highlightTermsInNode(textNode);
        });

        console.log(`GlossaryRenderer: Highlighted terms in ${container.tagName}`);
    }

    highlightTermsInNode(textNode) {
        const text = textNode.textContent;
        let html = text;
        let hasMatch = false;

        // Sort terms by length (longest first) to avoid partial matches
        const terms = Object.keys(this.glossary).sort((a, b) => b.length - a.length);

        // Replace each term with styled span
        terms.forEach(term => {
            const regex = new RegExp(`\\b(${term})\\b`, 'gi');
            if (regex.test(html)) {
                html = html.replace(regex, (match) => {
                    hasMatch = true;
                    return `<span class="glossary-term" data-term="${term.toLowerCase()}">${match}</span>`;
                });
            }
        });

        // If we found matches, replace the text node with HTML
        if (hasMatch) {
            const span = document.createElement('span');
            span.innerHTML = html;
            textNode.parentElement.replaceChild(span, textNode);

            // Unwrap the temporary span
            while (span.firstChild) {
                span.parentElement.insertBefore(span.firstChild, span);
            }
            span.remove();
        }
    }

    /**
     * Get term definition
     */
    getDefinition(term) {
        const termData = this.glossary[term.toLowerCase()];
        return termData ? termData.definition : null;
    }

    /**
     * Get term color
     */
    getColor(term) {
        const termData = this.glossary[term.toLowerCase()];
        return termData ? termData.color : '#4a9eff';
    }
}
