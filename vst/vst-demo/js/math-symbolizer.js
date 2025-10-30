/**
 * MATH-SYMBOLIZER.JS
 * Automatically parse KaTeX-rendered math and make elements interactive
 * window.Symbolizer provides the global interface
 */

class MathSymbolizer {
    constructor() {
        this.elements = new Map(); // Track all interactive math elements
        this.selected = new Set(); // Currently selected elements
        this.graph = null; // Reference to knowledge graph
        this.animator = null; // Reference to equation animator
        this.marginNotes = null; // Reference to margin notes system
    }

    /**
     * Initialize the Symbolizer system
     * Call this after KaTeX has rendered
     */
    init() {
        console.log('[Symbolizer] Initializing...');

        // Get references to other systems
        this.graph = window.vstKnowledgeGraph;
        this.animator = window.EquationAnimator;
        this.marginNotes = window.MarginNotes;

        // Process all equation blocks
        this.processEquationBlocks();

        // Process inline math
        this.processInlineMath();

        // Setup event listeners
        this.setupEventListeners();

        console.log(`[Symbolizer] Initialized with ${this.elements.size} interactive elements`);
    }

    /**
     * Process all equation blocks and make math elements clickable
     */
    processEquationBlocks() {
        const blocks = document.querySelectorAll('.equation-block .katex');

        blocks.forEach((katexElement, index) => {
            const equationBlock = katexElement.closest('.equation-block');
            const equationId = equationBlock?.dataset.eqId || `eq-${index}`;

            // Find all math identifiers (mord, mbin, mop, etc.)
            this.processMathElements(katexElement, equationId);
        });
    }

    /**
     * Process inline math elements
     */
    processInlineMath() {
        const inlineMath = document.querySelectorAll('.math-inline');

        inlineMath.forEach(element => {
            const varName = element.dataset.var;
            if (!varName) return;

            // Make entire inline math clickable
            element.classList.add('math-element');
            element.dataset.mathId = `inline-${varName}`;
            element.dataset.type = this.detectType(varName);

            this.elements.set(element.dataset.mathId, {
                element,
                varName,
                type: element.dataset.type,
                context: 'inline'
            });

            // Add click handler
            element.addEventListener('click', (e) => this.handleElementClick(e, element));
        });
    }

    /**
     * Process math elements within a KaTeX-rendered container
     * @param {HTMLElement} container - KaTeX container
     * @param {string} equationId - Equation identifier
     */
    processMathElements(container, equationId) {
        // Target specific KaTeX classes that represent symbols/identifiers
        const targets = container.querySelectorAll('.mord, .mbin, .mop, .mrel, .mopen, .mclose');

        targets.forEach((element, index) => {
            const text = element.textContent.trim();

            // Skip if empty, whitespace, or brackets/parens
            if (!text || text.length === 0 || /^[\(\)\[\]\{\}]$/.test(text)) {
                return;
            }

            // Check if it's a variable/symbol we care about
            if (this.isInterestingSymbol(text)) {
                const mathId = `${equationId}-${text}-${index}`;
                const varType = this.detectType(text);

                // Wrap in interactive span if not already wrapped
                if (!element.classList.contains('math-element')) {
                    element.classList.add('math-element');
                    element.dataset.mathId = mathId;
                    element.dataset.type = varType;
                    element.dataset.symbol = text;

                    this.elements.set(mathId, {
                        element,
                        varName: text,
                        type: varType,
                        equationId,
                        context: 'equation'
                    });

                    // Add click handler
                    element.addEventListener('click', (e) => this.handleElementClick(e, element));
                }
            }
        });
    }

    /**
     * Determine if a symbol is interesting (worth making interactive)
     * @param {string} text - Symbol text
     * @returns {boolean}
     */
    isInterestingSymbol(text) {
        // Greek letters, common variables, functions
        const greekLetters = /^[α-ωΑ-Ω]$/;
        const latinVars = /^[a-zA-Z]$/;
        const special = /^[λσωΔ∫∂]$/;

        // Also check for common multi-char symbols
        const multiChar = ['lambda', 'alpha', 'beta', 'gamma', 'delta', 'omega', 'Delta'];

        return greekLetters.test(text) ||
               latinVars.test(text) ||
               special.test(text) ||
               multiChar.includes(text);
    }

    /**
     * Detect type of mathematical symbol
     * @param {string} symbol - Symbol text
     * @returns {string} Type category
     */
    detectType(symbol) {
        // Time-related
        if (/^[tT]$/.test(symbol) || symbol.includes('time')) {
            return 'time';
        }

        // Frequency-related
        if (/^[fωΩ]$/.test(symbol) || symbol.includes('freq') || symbol.includes('omega')) {
            return 'frequency';
        }

        // Parameters
        if (/^[αβγλσ]$/.test(symbol) || ['alpha', 'beta', 'gamma', 'lambda'].includes(symbol)) {
            return 'parameter';
        }

        // Functions
        if (/^[a-z]+$/.test(symbol) && symbol.length > 1) {
            return 'function';
        }

        return 'variable';
    }

    /**
     * Handle click on interactive math element
     * @param {Event} e - Click event
     * @param {HTMLElement} element - Clicked element
     */
    handleElementClick(e, element) {
        e.stopPropagation();

        const mathId = element.dataset.mathId;
        const data = this.elements.get(mathId);

        if (!data) return;

        console.log('[Symbolizer] Clicked:', data.varName);

        // Toggle selection
        if (this.selected.has(mathId)) {
            this.deselectElement(mathId);
        } else {
            // Multi-select with Ctrl/Cmd, single select otherwise
            if (!e.ctrlKey && !e.metaKey) {
                this.clearSelection();
            }
            this.selectElement(mathId);
        }

        // Show margin note for this concept
        if (this.marginNotes && this.graph) {
            const varName = this.normalizeVarName(data.varName);
            const notes = this.graph.getNotes(varName);

            if (notes && notes.length > 0) {
                this.marginNotes.showNote(varName, notes[0]);
            }
        }

        // Highlight related elements
        this.highlightRelated(data.varName);

        // Trigger animation
        if (this.animator) {
            this.animator.emphasize(element);
        }
    }

    /**
     * Select an element
     * @param {string} mathId - Element ID
     */
    selectElement(mathId) {
        const data = this.elements.get(mathId);
        if (!data) return;

        this.selected.add(mathId);
        data.element.classList.add('selected');
    }

    /**
     * Deselect an element
     * @param {string} mathId - Element ID
     */
    deselectElement(mathId) {
        const data = this.elements.get(mathId);
        if (!data) return;

        this.selected.delete(mathId);
        data.element.classList.remove('selected');
    }

    /**
     * Clear all selections
     */
    clearSelection() {
        this.selected.forEach(mathId => {
            const data = this.elements.get(mathId);
            if (data) {
                data.element.classList.remove('selected', 'related');
            }
        });
        this.selected.clear();
    }

    /**
     * Highlight all elements related to a given symbol
     * @param {string} symbol - Symbol to find related elements for
     */
    highlightRelated(symbol) {
        // Clear previous related highlighting
        document.querySelectorAll('.math-element.related').forEach(el => {
            el.classList.remove('related');
        });

        // Get related concepts from knowledge graph
        if (!this.graph) return;

        const normalized = this.normalizeVarName(symbol);
        const related = this.graph.getRelated(normalized);

        // Highlight all instances of related symbols
        this.elements.forEach((data, mathId) => {
            const dataSymbol = this.normalizeVarName(data.varName);

            if (related.includes(dataSymbol) && !this.selected.has(mathId)) {
                data.element.classList.add('related');

                // Animate related elements
                if (this.animator) {
                    this.animator.pulse(data.element);
                }
            }
        });
    }

    /**
     * Normalize variable names for knowledge graph lookup
     * Maps display names to canonical names
     * @param {string} varName - Variable name
     * @returns {string} Normalized name
     */
    normalizeVarName(varName) {
        const mapping = {
            'λ': 'lambda',
            'α': 'alpha',
            'β': 'beta',
            'γ': 'gamma',
            'σ': 'sigma',
            'ω': 'omega',
            'Δ': 'Delta',
            'δ': 'delta',
            't': 't',
            'f': 'f',
            'Q': 'q',
            'T': 'T',
            'N': 'N',
            's': 's'
        };

        return mapping[varName] || varName.toLowerCase();
    }

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Deselect when clicking outside math
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.math-element') &&
                !e.target.closest('.equation-block') &&
                !e.target.closest('.margin-note')) {
                this.clearSelection();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // ESC to clear selection
            if (e.key === 'Escape') {
                this.clearSelection();
                if (this.marginNotes) {
                    this.marginNotes.hideAll();
                }
            }
        });
    }

    /**
     * Find all instances of a variable across all equations
     * @param {string} varName - Variable name
     * @returns {Array<Object>} Array of element data
     */
    findAllInstances(varName) {
        const normalized = this.normalizeVarName(varName);
        const instances = [];

        this.elements.forEach((data, mathId) => {
            if (this.normalizeVarName(data.varName) === normalized) {
                instances.push(data);
            }
        });

        return instances;
    }

    /**
     * Highlight all instances of a variable
     * @param {string} varName - Variable name
     * @param {string} animationClass - CSS animation class to apply
     */
    highlightAllInstances(varName, animationClass = 'pulse') {
        const instances = this.findAllInstances(varName);

        instances.forEach(data => {
            if (this.animator) {
                this.animator.applyAnimation(data.element, animationClass);
            }
        });
    }
}

// Create global singleton
window.Symbolizer = new MathSymbolizer();
