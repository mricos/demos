/**
 * CONTEXT-FAB.JS
 * Draggable Floating Action Button with context-aware controls
 */

class ContextFAB {
    constructor() {
        this.container = null;
        this.button = null;
        this.panel = null;
        this.content = null;
        this.title = null;

        this.isExpanded = false;
        this.isDragging = false;
        this.currentSection = 'introduction';

        this.dragOffset = { x: 0, y: 0 };
        this.position = { x: 32, y: 32 }; // Bottom-right offset

        this.controls = new Map();
        this.processor = null;
        this.graph = null;
    }

    /**
     * Initialize the FAB system
     */
    init() {
        this.container = document.getElementById('fab-container');
        this.button = document.getElementById('fab-button');
        this.panel = document.getElementById('fab-panel');
        this.content = document.getElementById('fab-content');
        this.title = document.getElementById('fab-title');

        this.processor = window.signalProcessor;
        this.graph = window.vstKnowledgeGraph;

        if (!this.container || !this.button || !this.panel) {
            console.error('[ContextFAB] Required elements not found');
            return;
        }

        this.setupEventListeners();
        this.defineContextControls();

        console.log('[ContextFAB] Initialized');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Toggle expand/collapse
        this.button.addEventListener('click', () => this.toggle());

        // Drag functionality
        const dragHandle = this.panel.querySelector('.fab-drag-handle');
        if (dragHandle) {
            dragHandle.addEventListener('mousedown', (e) => this.startDrag(e));
        }

        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.endDrag());

        // Section change detection
        this.setupSectionObserver();

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (this.isExpanded &&
                !this.container.contains(e.target) &&
                !e.target.closest('.math-element')) {
                this.collapse();
            }
        });
    }

    /**
     * Define controls for each section
     */
    defineContextControls() {
        // Section 2: Guitar Signal Model
        this.controls.set('problem', {
            title: 'Guitar Notes & Harmonics',
            controls: [
                {
                    type: 'header',
                    label: 'Low E String (E₂/F₂)'
                },
                {
                    type: 'range',
                    id: 'f1',
                    label: 'E₂ (Low E, open)',
                    min: 70,
                    max: 95,
                    value: 82.41,
                    step: 0.01,
                    onChange: (value) => this.updateParameter('f1', value)
                },
                {
                    type: 'range',
                    id: 'f2',
                    label: 'F₂ (Low E, 1st fret)',
                    min: 75,
                    max: 100,
                    value: 87.31,
                    step: 0.01,
                    onChange: (value) => this.updateParameter('f2', value)
                },
                {
                    type: 'checkbox',
                    id: 'tie-f2-f1',
                    label: 'Tie F₂ to E₂ (chromatic)',
                    checked: true,
                    onChange: (value) => this.updateParameter('tieF2toF1', value)
                },
                {
                    type: 'header',
                    label: 'High E String (E₄/F₄)'
                },
                {
                    type: 'range',
                    id: 'f3',
                    label: 'E₄ (High E, open)',
                    min: 300,
                    max: 360,
                    value: 329.63,
                    step: 0.01,
                    onChange: (value) => this.updateParameter('f3', value)
                },
                {
                    type: 'range',
                    id: 'f4',
                    label: 'F₄ (High E, 1st fret)',
                    min: 320,
                    max: 380,
                    value: 349.23,
                    step: 0.01,
                    onChange: (value) => this.updateParameter('f4', value)
                },
                {
                    type: 'checkbox',
                    id: 'tie-f4-f3',
                    label: 'Tie F₄ to E₄ (chromatic)',
                    checked: true,
                    onChange: (value) => this.updateParameter('tieF4toF3', value)
                },
                {
                    type: 'header',
                    label: 'Harmonic Content'
                },
                {
                    type: 'checkbox',
                    id: 'show-h1',
                    label: '🔴 Fundamental (h=1)',
                    checked: true,
                    onChange: (value) => this.updateParameter('showHarmonic1', value)
                },
                {
                    type: 'checkbox',
                    id: 'show-h2',
                    label: '🟠 2nd Harmonic (h=2)',
                    checked: true,
                    onChange: (value) => this.updateParameter('showHarmonic2', value)
                },
                {
                    type: 'checkbox',
                    id: 'show-h3',
                    label: '🟡 3rd Harmonic (h=3)',
                    checked: true,
                    onChange: (value) => this.updateParameter('showHarmonic3', value)
                },
                {
                    type: 'button',
                    id: 'generate-signal',
                    label: 'Regenerate Signal',
                    onClick: () => this.generateSignal()
                }
            ]
        });

        // Section 3: VST Formulation
        this.controls.set('formulation', {
            title: 'Transform Parameters',
            controls: [
                {
                    type: 'range',
                    id: 'alpha',
                    label: 'Scaling Exponent α',
                    min: 0.5,
                    max: 1.0,
                    value: 0.75,
                    step: 0.01,
                    onChange: (value) => this.updateParameter('alpha', value)
                },
                {
                    type: 'range',
                    id: 'q',
                    label: 'Quality Factor Q',
                    min: 5,
                    max: 50,
                    value: 15,
                    step: 1,
                    onChange: (value) => this.updateParameter('q', value)
                },
                {
                    type: 'range',
                    id: 'bins',
                    label: 'Bins per Octave',
                    min: 12,
                    max: 72,
                    value: 36,
                    step: 12,
                    onChange: (value) => this.updateParameter('bins', value)
                }
            ]
        });

        // Section 4: Scaling Functions
        this.controls.set('scaling', {
            title: 'Scaling Function',
            controls: [
                {
                    type: 'range',
                    id: 'alpha-scaling',
                    label: 'Exponent α',
                    min: 0.3,
                    max: 1.0,
                    value: 0.75,
                    step: 0.01,
                    onChange: (value) => this.updateScaling(value)
                },
                {
                    type: 'select',
                    id: 'preset',
                    label: 'Preset',
                    options: [
                        { value: '0.5', label: 'Strong Warping (α=0.5)' },
                        { value: '0.75', label: 'Moderate (α=0.75)' },
                        { value: '1.0', label: 'Linear (α=1.0)' }
                    ],
                    onChange: (value) => this.updateScaling(parseFloat(value))
                }
            ]
        });

        // Section 5: Comparison
        this.controls.set('comparison', {
            title: 'FFT vs VST',
            controls: [
                {
                    type: 'range',
                    id: 'fft-size',
                    label: 'FFT Size',
                    min: 1024,
                    max: 16384,
                    value: 4096,
                    step: 1024,
                    onChange: (value) => this.updateParameter('fftSize', value)
                },
                {
                    type: 'button',
                    id: 'compute-transforms',
                    label: 'Compute Transforms',
                    onClick: () => this.computeTransforms()
                }
            ]
        });
    }

    /**
     * Setup intersection observer to detect section changes
     */
    setupSectionObserver() {
        const sections = document.querySelectorAll('.content-section');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                    this.currentSection = entry.target.id;
                    this.updateContextControls();
                }
            });
        }, {
            threshold: [0.5]
        });

        sections.forEach(section => observer.observe(section));
    }

    /**
     * Update displayed controls based on current section
     */
    updateContextControls() {
        const contextConfig = this.controls.get(this.currentSection);

        if (!contextConfig) {
            // No specific controls for this section
            this.title.textContent = 'Controls';
            this.content.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No controls for this section</p>';
            return;
        }

        // Update title
        this.title.textContent = contextConfig.title;

        // Clear existing controls
        this.content.innerHTML = '';

        // Add context badge
        const badge = document.createElement('div');
        badge.className = 'context-badge';
        badge.textContent = `Section: ${this.currentSection}`;
        this.content.appendChild(badge);

        // Create controls
        contextConfig.controls.forEach(controlDef => {
            const group = this.createControlElement(controlDef);
            this.content.appendChild(group);
        });
    }

    /**
     * Create a control element
     * @param {Object} def - Control definition
     * @returns {HTMLElement}
     */
    createControlElement(def) {
        const group = document.createElement('div');
        group.className = 'control-group';

        if (def.type === 'header') {
            const header = document.createElement('h5');
            header.className = 'control-header';
            header.textContent = def.label;
            group.appendChild(header);
            return group;

        } else if (def.type === 'range') {
            const label = document.createElement('div');
            label.className = 'control-label';

            const name = document.createElement('span');
            name.className = 'control-name';
            name.textContent = def.label;

            const value = document.createElement('span');
            value.className = 'control-value';
            value.id = `${def.id}-value`;
            value.textContent = def.value.toFixed(def.step < 1 ? 2 : 0);

            label.appendChild(name);
            label.appendChild(value);
            group.appendChild(label);

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.id = def.id;
            slider.min = def.min;
            slider.max = def.max;
            slider.step = def.step;
            slider.value = def.value;

            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                value.textContent = val.toFixed(def.step < 1 ? 2 : 0);
                if (def.onChange) def.onChange(val);
            });

            group.appendChild(slider);

        } else if (def.type === 'select') {
            const label = document.createElement('label');
            label.textContent = def.label;
            label.className = 'control-label';
            group.appendChild(label);

            const select = document.createElement('select');
            select.id = def.id;

            def.options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.label;
                select.appendChild(option);
            });

            select.addEventListener('change', (e) => {
                if (def.onChange) def.onChange(e.target.value);
            });

            group.appendChild(select);

        } else if (def.type === 'button') {
            const button = document.createElement('button');
            button.className = 'control-button';
            button.textContent = def.label;
            button.addEventListener('click', def.onClick);
            group.appendChild(button);

        } else if (def.type === 'checkbox') {
            const checkGroup = document.createElement('div');
            checkGroup.className = 'checkbox-group';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = def.id;
            checkbox.checked = def.checked || false;

            const label = document.createElement('label');
            label.htmlFor = def.id;
            label.textContent = def.label;

            checkbox.addEventListener('change', (e) => {
                if (def.onChange) def.onChange(e.target.checked);
            });

            checkGroup.appendChild(checkbox);
            checkGroup.appendChild(label);
            group.appendChild(checkGroup);
        }

        return group;
    }

    /**
     * Expand FAB
     */
    expand() {
        this.isExpanded = true;
        this.container.classList.add('expanded');
        this.updateContextControls();
    }

    /**
     * Collapse FAB
     */
    collapse() {
        this.isExpanded = false;
        this.container.classList.remove('expanded');
    }

    /**
     * Toggle FAB state
     */
    toggle() {
        if (this.isExpanded) {
            this.collapse();
        } else {
            this.expand();
        }
    }

    /**
     * Start dragging
     * @param {MouseEvent} e
     */
    startDrag(e) {
        this.isDragging = true;
        this.container.classList.add('dragging');

        const rect = this.container.getBoundingClientRect();
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;

        e.preventDefault();
    }

    /**
     * Handle drag
     * @param {MouseEvent} e
     */
    drag(e) {
        if (!this.isDragging) return;

        const x = e.clientX - this.dragOffset.x;
        const y = e.clientY - this.dragOffset.y;

        // Constrain to viewport
        const maxX = window.innerWidth - this.container.offsetWidth;
        const maxY = window.innerHeight - this.container.offsetHeight;

        this.position.x = Math.max(0, Math.min(x, maxX));
        this.position.y = Math.max(0, Math.min(y, maxY));

        this.container.style.left = `${this.position.x}px`;
        this.container.style.top = `${this.position.y}px`;
        this.container.style.right = 'auto';
        this.container.style.bottom = 'auto';
    }

    /**
     * End dragging
     */
    endDrag() {
        if (!this.isDragging) return;

        this.isDragging = false;
        this.container.classList.remove('dragging');
    }

    /**
     * Update a parameter value
     * @param {string} param - Parameter name
     * @param {number} value - New value
     */
    updateParameter(param, value) {
        console.log(`[ContextFAB] Update ${param} = ${value}`);

        // Dispatch custom event
        const event = new CustomEvent('parameter-changed', {
            detail: { parameter: param, value }
        });
        document.dispatchEvent(event);
    }

    /**
     * Update scaling parameter
     * @param {number} alpha - Alpha value
     */
    updateScaling(alpha) {
        this.updateParameter('alpha', alpha);

        // Update chart if it exists
        if (this.graph && this.processor) {
            const data = this.processor.generateScalingData(2.0, 200, alpha);
            // TODO: Update Vega chart
        }
    }

    /**
     * Generate signal
     */
    generateSignal() {
        console.log('[ContextFAB] Generate signal');

        const event = new CustomEvent('generate-signal');
        document.dispatchEvent(event);
    }

    /**
     * Compute transforms
     */
    computeTransforms() {
        console.log('[ContextFAB] Compute transforms');

        const event = new CustomEvent('compute-transforms');
        document.dispatchEvent(event);
    }
}

// Create global singleton
window.ContextFAB = new ContextFAB();
