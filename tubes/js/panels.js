// TUBES.panels - UI Panel Management
(function(TUBES) {
    'use strict';

    let container = null;
    let menu = null;
    let panelToggle = null;
    let isPanelVisible = true;
    const panelDefinitions = [];
    let panelOrder = [];

    TUBES.panels = {
        get panelDefinitions() { return panelDefinitions; },
        get panelOrder() { return panelOrder; },

        init() {
            container = document.getElementById('panels-container');
            menu = document.getElementById('panel-menu');
            panelToggle = document.getElementById('panel-toggle');

            this.definePanels();
            this.setupPanelToggle();
            this.setupMenu();
            this.render();

            console.log('TUBES.panels: initialized');
        },

        definePanels() {
            panelDefinitions.push({
                id: 'cylinder-settings',
                title: 'Cylinder Settings',
                collapsed: false,
                subPanels: [
                    { id: 'geometry', title: 'Geometry', collapsed: false },
                    { id: 'appearance', title: 'Appearance', collapsed: false },
                    { id: 'curve', title: 'Curve', collapsed: true }
                ]
            });

            panelDefinitions.push({
                id: 'registration',
                title: 'Registration',
                collapsed: true,
                subPanels: [
                    { id: 'z-mapping', title: 'Z-Mapping', collapsed: false },
                    { id: 'neural', title: 'Neural Hooks', collapsed: true }
                ]
            });

            panelDefinitions.push({
                id: 'selection',
                title: 'Selection',
                collapsed: false,
                subPanels: []
            });

            panelOrder = panelDefinitions.map(p => p.id);
        },

        setupPanelToggle() {
            if (panelToggle) {
                panelToggle.addEventListener('click', () => {
                    isPanelVisible = !isPanelVisible;
                    if (menu) {
                        menu.classList.toggle('hidden', !isPanelVisible);
                    }
                    panelToggle.textContent = isPanelVisible ? '◀' : '▶';
                });
            }
        },

        setupMenu() {
            // Menu setup for panel controls
        },

        render() {
            if (!container) return;

            container.innerHTML = '';

            panelOrder.forEach(panelId => {
                const def = panelDefinitions.find(p => p.id === panelId);
                if (def) {
                    const panel = this.createPanel(def);
                    container.appendChild(panel);
                }
            });
        },

        createPanel(definition) {
            const panel = document.createElement('div');
            panel.className = 'panel' + (definition.collapsed ? ' collapsed' : '');
            panel.id = `panel-${definition.id}`;

            const header = document.createElement('div');
            header.className = 'panel-header';
            header.innerHTML = `
                <span class="panel-title">${definition.title}</span>
                <span class="panel-toggle">${definition.collapsed ? '▶' : '▼'}</span>
            `;

            header.addEventListener('click', () => {
                definition.collapsed = !definition.collapsed;
                panel.classList.toggle('collapsed', definition.collapsed);
                header.querySelector('.panel-toggle').textContent = definition.collapsed ? '▶' : '▼';
                TUBES.storage.save();
            });

            panel.appendChild(header);

            const content = document.createElement('div');
            content.className = 'panel-content';

            if (definition.subPanels && definition.subPanels.length > 0) {
                definition.subPanels.forEach(subDef => {
                    const subPanel = this.createSubPanel(subDef, definition.id);
                    content.appendChild(subPanel);
                });
            } else {
                content.innerHTML = this.getPanelContent(definition.id);
            }

            panel.appendChild(content);

            return panel;
        },

        createSubPanel(definition, parentId) {
            const subPanel = document.createElement('div');
            subPanel.className = 'sub-panel' + (definition.collapsed ? ' collapsed' : '');
            subPanel.id = `panel-${parentId}-${definition.id}`;

            const header = document.createElement('div');
            header.className = 'sub-panel-header';
            header.innerHTML = `
                <span class="sub-panel-title">${definition.title}</span>
                <span class="sub-panel-toggle">${definition.collapsed ? '▶' : '▼'}</span>
            `;

            header.addEventListener('click', (e) => {
                e.stopPropagation();
                definition.collapsed = !definition.collapsed;
                subPanel.classList.toggle('collapsed', definition.collapsed);
                header.querySelector('.sub-panel-toggle').textContent = definition.collapsed ? '▶' : '▼';
                TUBES.storage.save();
            });

            subPanel.appendChild(header);

            const content = document.createElement('div');
            content.className = 'sub-panel-content';
            content.innerHTML = this.getSubPanelContent(parentId, definition.id);

            subPanel.appendChild(content);

            return subPanel;
        },

        getPanelContent(panelId) {
            switch(panelId) {
                case 'selection':
                    return `
                        <div class="control-group">
                            <label>Selected: <span id="selection-count">0</span></label>
                        </div>
                        <div class="button-group">
                            <button id="btn-delete-selected" class="btn btn-danger">Delete Selected</button>
                            <button id="btn-clear-scene" class="btn btn-warning">Clear Scene</button>
                        </div>
                    `;
                default:
                    return '<div class="control-group">Content here</div>';
            }
        },

        getSubPanelContent(panelId, subPanelId) {
            if (panelId === 'cylinder-settings') {
                if (subPanelId === 'geometry') {
                    return `
                        <div class="control-group">
                            <label>Radius</label>
                            <input type="range" id="setting-radius" min="0.1" max="2" step="0.1" value="${TUBES.config.settings.radius}">
                            <span class="value-display">${TUBES.config.settings.radius}</span>
                        </div>
                        <div class="control-group">
                            <label>Segments</label>
                            <input type="range" id="setting-segments" min="4" max="64" step="4" value="${TUBES.config.settings.segments}">
                            <span class="value-display">${TUBES.config.settings.segments}</span>
                        </div>
                    `;
                }
                if (subPanelId === 'appearance') {
                    return `
                        <div class="control-group">
                            <label>Color</label>
                            <input type="color" id="setting-color" value="${TUBES.config.settings.color}">
                        </div>
                        <div class="control-group">
                            <label>Metalness</label>
                            <input type="range" id="setting-metalness" min="0" max="1" step="0.1" value="${TUBES.config.settings.metalness}">
                            <span class="value-display">${TUBES.config.settings.metalness}</span>
                        </div>
                    `;
                }
            }
            return '<div class="control-group">Sub-panel content</div>';
        },

        updateSelectedCylinderPanel(cylinder) {
            const countEl = document.getElementById('selection-count');
            if (countEl) {
                if (!cylinder) {
                    countEl.textContent = '0';
                } else if (cylinder.isMultiSelection) {
                    countEl.textContent = cylinder.count;
                } else {
                    countEl.textContent = '1';
                }
            }
        },

        rebuild() {
            this.render();
        }
    };
})(window.TUBES);
