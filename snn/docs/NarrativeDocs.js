/**
 * NarrativeDocs.js
 *
 * Controller for narrative documentation pages that combine scrolling text content
 * with synchronized interactive figures. Manages:
 * - Section visibility tracking via Intersection Observer
 * - Figure switching based on active section
 * - Figure lifecycle (mount/unmount) coordination
 * - Control panel generation for active figures
 *
 * Architecture:
 * - Each doc section has data-section and data-figure attributes
 * - Scrolling activates sections → triggers figure changes
 * - Uses ActiveFigure registry for figure lifecycle management
 * - Integrates with FigureBridge for enhanced event handling
 */

class NarrativeDocs {
    constructor(config = {}) {
        this.config = {
            contentSelector: config.contentSelector || '.content-area',
            sectionSelector: config.sectionSelector || '.doc-section',
            figureContainer: config.figureContainer || 'figureContainer',
            figureTitleEl: config.figureTitleEl || 'figureTitle',
            figureDescEl: config.figureDescEl || 'figureDescription',
            figureControlsEl: config.figureControlsEl || 'figureControls',
            intersectionThreshold: config.intersectionThreshold || 0.5
        };

        this.sections = [];
        this.currentSection = null;
        this.currentFigure = null;
        this.figureInstances = new Map(); // figureId -> ActiveFigure instance

        this.init();
    }

    init() {
        // Find all sections
        this.sections = Array.from(document.querySelectorAll(this.config.sectionSelector));

        if (this.sections.length === 0) {
            console.warn('NarrativeDocs: No sections found');
            return;
        }

        // Setup intersection observer for scroll tracking
        this.setupIntersectionObserver();

        // Initialize with first section
        const firstSection = this.sections[0];
        if (firstSection) {
            this.activateSection(firstSection);
        }

        console.log(`NarrativeDocs initialized with ${this.sections.length} sections`);
    }

    setupIntersectionObserver() {
        const options = {
            root: null,
            rootMargin: '-40% 0px -40% 0px', // Trigger when section is in middle third
            threshold: 0
        };

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.activateSection(entry.target);
                }
            });
        }, options);

        // Observe all sections
        this.sections.forEach(section => this.observer.observe(section));
    }

    activateSection(sectionEl) {
        const sectionId = sectionEl.dataset.section;
        const figureId = sectionEl.dataset.figure;

        // Skip if already active
        if (this.currentSection === sectionId) return;

        console.log(`NarrativeDocs: Activating section "${sectionId}" with figure "${figureId}"`);

        // Update section styling
        this.sections.forEach(s => s.classList.remove('active'));
        sectionEl.classList.add('active');

        this.currentSection = sectionId;

        // Switch figure if needed
        if (figureId && figureId !== this.currentFigure) {
            this.switchFigure(figureId, sectionEl);
        }

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('narrative:section-change', {
            detail: { section: sectionId, figure: figureId }
        }));
    }

    async switchFigure(figureId, sectionEl) {
        // Hide current figure
        if (this.currentFigure) {
            await this.hideFigure(this.currentFigure);
        }

        // Show new figure
        await this.showFigure(figureId, sectionEl);

        this.currentFigure = figureId;
    }

    async hideFigure(figureId) {
        const instance = this.figureInstances.get(figureId);
        if (!instance) return;

        console.log(`NarrativeDocs: Hiding figure "${figureId}"`);

        // Call lifecycle hook
        if (typeof instance.onHide === 'function') {
            instance.onHide();
        }

        // Optionally unmount (comment out to keep in memory)
        // instance.unmount();
        // this.figureInstances.delete(figureId);
    }

    async showFigure(figureId, sectionEl) {
        let instance = this.figureInstances.get(figureId);

        // Create instance if doesn't exist
        if (!instance) {
            instance = await this.createFigureInstance(figureId);
            if (!instance) {
                console.error(`NarrativeDocs: Failed to create figure "${figureId}"`);
                return;
            }
            this.figureInstances.set(figureId, instance);
        }

        console.log(`NarrativeDocs: Showing figure "${figureId}"`);

        // Update UI elements
        this.updateFigureUI(instance, sectionEl);

        // Call lifecycle hook
        if (typeof instance.onShow === 'function') {
            instance.onShow();
        }

        // Start animation if figure has start method
        if (typeof instance.start === 'function' && !instance.isRunning) {
            instance.start();
        }
    }

    async createFigureInstance(figureId) {
        // Look up figure class from ActiveFigure registry
        const FigureClass = ActiveFigure.getFigureClass(figureId);

        if (!FigureClass) {
            console.error(`NarrativeDocs: No figure class registered for "${figureId}"`);
            console.log('Available figures:', Array.from(ActiveFigure.registry.keys()));
            return null;
        }

        // Create container element
        const container = document.getElementById(this.config.figureContainer);
        if (!container) {
            console.error(`NarrativeDocs: Figure container "${this.config.figureContainer}" not found`);
            return null;
        }

        // Clear container
        container.innerHTML = '';

        // Instantiate figure - pass container ID, not canvas ID
        // ActiveFigure will create its own canvas inside the container
        const instance = new FigureClass(container.id);

        // Mount figure
        instance.mount();

        console.log(`NarrativeDocs: Created instance of "${figureId}"`);

        return instance;
    }

    updateFigureUI(instance, sectionEl) {
        // Update title
        const titleEl = document.getElementById(this.config.figureTitleEl);
        if (titleEl) {
            titleEl.textContent = instance.config.title || 'Interactive Figure';
        }

        // Update description
        const descEl = document.getElementById(this.config.figureDescEl);
        if (descEl) {
            const desc = instance.config.description || '';
            descEl.textContent = desc;
        }

        // Update controls
        this.updateControls(instance);
    }

    updateControls(instance) {
        const controlsEl = document.getElementById(this.config.figureControlsEl);
        if (!controlsEl) return;

        // Clear existing controls
        controlsEl.innerHTML = '';

        // Add play/pause button
        const playBtn = this.createControlButton(
            instance.isRunning ? 'Pause' : 'Play',
            () => {
                if (instance.isRunning) {
                    instance.stop();
                    playBtn.textContent = 'Play';
                } else {
                    instance.start();
                    playBtn.textContent = 'Pause';
                }
            }
        );
        controlsEl.appendChild(playBtn);

        // Add reset button
        const resetBtn = this.createControlButton('Reset', () => {
            instance.reset();
        });
        controlsEl.appendChild(resetBtn);

        // Add renderer toggle if available
        if (instance.renderers && instance.renderers.length > 1) {
            instance.renderers.forEach((renderer, idx) => {
                const name = renderer.name || `Style ${idx + 1}`;
                const btn = this.createControlButton(name, () => {
                    instance.setRenderer(idx);
                    // Update active state
                    controlsEl.querySelectorAll('.renderer-btn').forEach(b =>
                        b.classList.remove('active')
                    );
                    btn.classList.add('active');
                });
                btn.classList.add('renderer-btn');
                if (idx === 0) btn.classList.add('active');
                controlsEl.appendChild(btn);
            });
        }

        // Add custom controls if figure defines them
        if (typeof instance.getControls === 'function') {
            const customControls = instance.getControls();
            customControls.forEach(control => {
                const btn = this.createControlButton(
                    control.label,
                    control.callback
                );
                controlsEl.appendChild(btn);
            });
        }
    }

    createControlButton(label, callback) {
        const btn = document.createElement('button');
        btn.className = 'figure-btn';
        btn.textContent = label;
        btn.addEventListener('click', callback);
        return btn;
    }

    // Public API for programmatic section navigation
    goToSection(sectionId) {
        const section = this.sections.find(s => s.dataset.section === sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    getCurrentSection() {
        return this.currentSection;
    }

    getCurrentFigure() {
        return this.currentFigure;
    }

    getFigureInstance(figureId) {
        return this.figureInstances.get(figureId);
    }

    destroy() {
        // Cleanup
        if (this.observer) {
            this.observer.disconnect();
        }

        this.figureInstances.forEach(instance => {
            if (instance.isRunning) instance.stop();
            instance.unmount();
        });

        this.figureInstances.clear();
    }
}
