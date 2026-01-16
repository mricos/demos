// TUBES.hud - Head-Up Display
(function(TUBES) {
    'use strict';

    let container = null;
    let statsElement = null;
    let modeElement = null;

    TUBES.hud = {
        init() {
            container = document.getElementById('hud');
            if (!container) {
                container = document.createElement('div');
                container.id = 'hud';
                document.body.appendChild(container);
            }

            this.createElements();
            this.setupSubscriptions();

            console.log('TUBES.hud: initialized');
        },

        createElements() {
            container.innerHTML = `
                <div class="hud-stats">
                    <span id="hud-cylinder-count">Cylinders: 0</span>
                    <span id="hud-selected-count">Selected: 0</span>
                </div>
                <div class="hud-mode" id="hud-mode">Draw Mode</div>
                <div class="hud-hints">
                    <div>Left click + drag: Draw stroke</div>
                    <div>Right click + drag: Rotate camera</div>
                    <div>Scroll: Zoom</div>
                    <div>Click: Select cylinder</div>
                    <div>Shift+Click: Toggle selection</div>
                    <div>Delete: Remove selected</div>
                </div>
            `;

            statsElement = container.querySelector('.hud-stats');
            modeElement = container.querySelector('#hud-mode');
        },

        setupSubscriptions() {
            TUBES.events.subscribe('cylinder:created', () => this.updateStats());
            TUBES.events.subscribe('cylinder:deleted', () => this.updateStats());
            TUBES.events.subscribe('cylinders:deleted', () => this.updateStats());
            TUBES.events.subscribe('scene:cleared', () => this.updateStats());
            TUBES.events.subscribe('cylinder:selected', () => this.updateStats());
            TUBES.events.subscribe('cylinder:deselected', () => this.updateStats());
            TUBES.events.subscribe('selection:cleared', () => this.updateStats());
        },

        updateStats() {
            const cylinderCount = document.getElementById('hud-cylinder-count');
            const selectedCount = document.getElementById('hud-selected-count');

            if (cylinderCount && TUBES.cylinder) {
                cylinderCount.textContent = `Cylinders: ${TUBES.cylinder.cylinders.length}`;
            }

            if (selectedCount && TUBES.cylinder) {
                selectedCount.textContent = `Selected: ${TUBES.cylinder.selectedCylinders.length}`;
            }
        },

        setMode(mode) {
            if (modeElement) {
                modeElement.textContent = mode;
            }
        },

        show() {
            if (container) {
                container.style.display = 'block';
            }
        },

        hide() {
            if (container) {
                container.style.display = 'none';
            }
        }
    };
})(window.TUBES);
