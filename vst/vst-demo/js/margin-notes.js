/**
 * MARGIN-NOTES.JS
 * Right gutter margin notes system with click-to-reveal
 */

class MarginNotesSystem {
    constructor() {
        this.container = null;
        this.activeNotes = new Map();
        this.graph = null;
    }

    /**
     * Initialize the margin notes system
     */
    init() {
        this.container = document.getElementById('margin-notes');
        this.graph = window.vstKnowledgeGraph;

        if (!this.container) {
            console.error('[MarginNotes] Container not found');
            return;
        }

        console.log('[MarginNotes] Initialized');
    }

    /**
     * Show a margin note for a concept
     * @param {string} conceptId - Concept identifier
     * @param {Object} noteData - Note data from knowledge graph
     */
    showNote(conceptId, noteData) {
        // Remove placeholder if it exists
        const placeholder = this.container.querySelector('.placeholder');
        if (placeholder) {
            placeholder.remove();
        }

        // Check if note already exists
        let noteElement = this.activeNotes.get(conceptId);

        if (noteElement) {
            // Note exists - highlight it and scroll to it
            this.highlightNote(noteElement);
            this.scrollToNote(noteElement);
            return;
        }

        // Create new note
        noteElement = this.createNoteElement(conceptId, noteData);
        this.activeNotes.set(conceptId, noteElement);

        // Add to container
        this.container.appendChild(noteElement);

        // Trigger entrance animation
        setTimeout(() => {
            noteElement.classList.add('active');
        }, 10);

        // Scroll to note
        this.scrollToNote(noteElement);
    }

    /**
     * Create a note DOM element
     * @param {string} conceptId - Concept identifier
     * @param {Object} noteData - Note content
     * @returns {HTMLElement}
     */
    createNoteElement(conceptId, noteData) {
        const note = document.createElement('div');
        note.className = 'margin-note';
        note.dataset.conceptId = conceptId;

        // Title
        if (noteData.title) {
            const title = document.createElement('h4');
            title.textContent = noteData.title;
            note.appendChild(title);
        }

        // Content
        if (noteData.content) {
            const content = document.createElement('p');
            content.textContent = noteData.content;
            note.appendChild(content);
        }

        // Math block
        if (noteData.math) {
            const mathBlock = document.createElement('div');
            mathBlock.className = 'math-block';
            mathBlock.textContent = `$$${noteData.math}$$`;
            note.appendChild(mathBlock);

            // Render math if KaTeX is available
            if (window.katex) {
                setTimeout(() => {
                    window.renderMathInElement(mathBlock, {
                        delimiters: [
                            {left: "$$", right: "$$", display: true},
                            {left: "$", right: "$", display: false}
                        ]
                    });
                }, 50);
            }
        }

        // Visualization
        if (noteData.viz) {
            const vizContainer = document.createElement('div');
            vizContainer.className = 'viz-container small';
            vizContainer.id = `viz-${conceptId}-${Date.now()}`;
            note.appendChild(vizContainer);

            // Render viz after note is in DOM
            setTimeout(() => {
                if (this.graph) {
                    this.graph.renderChart(vizContainer.id, noteData.viz);
                }
            }, 100);
        }

        // Related links
        if (noteData.links && noteData.links.length > 0) {
            const linksContainer = document.createElement('div');
            linksContainer.className = 'note-links';

            const linksLabel = document.createElement('strong');
            linksLabel.textContent = 'Related: ';
            linksContainer.appendChild(linksLabel);

            noteData.links.forEach((linkId, index) => {
                const linkBtn = document.createElement('button');
                linkBtn.className = 'link-button';
                linkBtn.textContent = linkId;
                linkBtn.onclick = () => this.showRelatedNote(linkId);

                linksContainer.appendChild(linkBtn);

                if (index < noteData.links.length - 1) {
                    linksContainer.appendChild(document.createTextNode(', '));
                }
            });

            note.appendChild(linksContainer);
        }

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'note-close';
        closeBtn.innerHTML = '×';
        closeBtn.setAttribute('aria-label', 'Close note');
        closeBtn.onclick = () => this.hideNote(conceptId);
        note.appendChild(closeBtn);

        return note;
    }

    /**
     * Show note for a related concept
     * @param {string} conceptId - Related concept ID
     */
    showRelatedNote(conceptId) {
        if (!this.graph) return;

        const notes = this.graph.getNotes(conceptId);
        if (notes && notes.length > 0) {
            this.showNote(conceptId, notes[0]);

            // Also highlight the concept in equations
            if (window.Symbolizer) {
                window.Symbolizer.highlightAllInstances(conceptId, 'pulse');
            }
        }
    }

    /**
     * Hide a specific note
     * @param {string} conceptId - Concept identifier
     */
    hideNote(conceptId) {
        const noteElement = this.activeNotes.get(conceptId);
        if (!noteElement) return;

        // Fade out
        noteElement.classList.remove('active');

        // Remove from DOM after animation
        setTimeout(() => {
            noteElement.remove();
            this.activeNotes.delete(conceptId);

            // Show placeholder if no notes left
            if (this.activeNotes.size === 0) {
                this.showPlaceholder();
            }
        }, 300);
    }

    /**
     * Hide all notes
     */
    hideAll() {
        this.activeNotes.forEach((_, conceptId) => {
            this.hideNote(conceptId);
        });
    }

    /**
     * Highlight a note temporarily
     * @param {HTMLElement} noteElement - Note to highlight
     */
    highlightNote(noteElement) {
        noteElement.style.outline = '2px solid var(--accent-primary)';
        noteElement.style.outlineOffset = '2px';

        setTimeout(() => {
            noteElement.style.outline = '';
            noteElement.style.outlineOffset = '';
        }, 1000);
    }

    /**
     * Scroll to a note in the gutter
     * @param {HTMLElement} noteElement - Note to scroll to
     */
    scrollToNote(noteElement) {
        noteElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }

    /**
     * Show placeholder text
     */
    showPlaceholder() {
        const placeholder = document.createElement('div');
        placeholder.className = 'margin-note placeholder';

        const hint = document.createElement('p');
        hint.className = 'note-hint';
        hint.textContent = 'Click on equation elements to explore relationships and see detailed explanations here.';

        placeholder.appendChild(hint);
        this.container.appendChild(placeholder);
    }

    /**
     * Create and show a custom note programmatically
     * @param {string} conceptId - Concept ID
     * @param {Object} data - Note data {title, content, math, viz, links}
     */
    addCustomNote(conceptId, data) {
        this.showNote(conceptId, data);
    }

    /**
     * Check if a note is currently shown
     * @param {string} conceptId - Concept ID
     * @returns {boolean}
     */
    isNoteShown(conceptId) {
        return this.activeNotes.has(conceptId);
    }

    /**
     * Get all currently shown notes
     * @returns {Array<string>} Array of concept IDs
     */
    getActiveNotes() {
        return Array.from(this.activeNotes.keys());
    }
}

// Add styles for note links (inject into document)
const linkStyles = document.createElement('style');
linkStyles.textContent = `
    .note-links {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--border-color);
        font-size: 13px;
    }

    .link-button {
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        padding: 4px 10px;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
        font-family: 'Courier New', monospace;
        color: var(--accent-primary);
    }

    .link-button:hover {
        background: var(--accent-primary);
        color: white;
        border-color: var(--accent-primary);
    }

    .note-close {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 28px;
        height: 28px;
        border: none;
        background: transparent;
        font-size: 24px;
        line-height: 1;
        cursor: pointer;
        color: var(--text-secondary);
        transition: all 0.2s;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
    }

    .note-close:hover {
        background: var(--bg-tertiary);
        color: var(--text-primary);
    }

    .margin-note {
        position: relative;
        padding-right: 36px; /* Space for close button */
    }
`;
document.head.appendChild(linkStyles);

// Create global singleton
window.MarginNotes = new MarginNotesSystem();
