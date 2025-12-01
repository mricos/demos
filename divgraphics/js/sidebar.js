/**
 * DivGraphics - Sidebar Module
 * Collapsible sidebar with section management
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.Sidebar = {
        sidebar: null,
        isCollapsed: true,   // Start collapsed by default

        init() {
            this.sidebar = document.getElementById('sidebar');
            if (!this.sidebar) return;

            this._bindEvents();
            this._restoreState();
        },

        _bindEvents() {
            // Toggle sidebar visibility
            const toggle = document.getElementById('sidebarToggle');
            if (toggle) {
                toggle.addEventListener('click', () => this.toggle());
            }

            // FAB toggle (visible when sidebar collapsed)
            const fabToggle = document.getElementById('fabToggle');
            if (fabToggle) {
                fabToggle.addEventListener('click', () => this.show());
            }

            // Hide sidebar button
            const hideBtn = document.getElementById('sidebarHideBtn');
            if (hideBtn) {
                hideBtn.addEventListener('click', () => this.hide());
            }

            // Collapse all sections
            const collapseAll = document.getElementById('collapseAllBtn');
            if (collapseAll) {
                collapseAll.addEventListener('click', () => this.collapseAll());
            }

            // Expand all sections
            const expandAll = document.getElementById('expandAllBtn');
            if (expandAll) {
                expandAll.addEventListener('click', () => this.expandAll());
            }

            // Keyboard shortcut: Escape to toggle sidebar
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !e.target.matches('input, select, textarea')) {
                    this.toggle();
                }
            });
        },

        toggle() {
            this.isCollapsed = !this.isCollapsed;
            this.sidebar.classList.toggle('collapsed', this.isCollapsed);
            document.body.classList.toggle('sidebar-collapsed', this.isCollapsed);
            this._saveState();
        },

        show() {
            this.isCollapsed = false;
            this.sidebar.classList.remove('collapsed');
            document.body.classList.remove('sidebar-collapsed');
            this._saveState();
        },

        hide() {
            this.isCollapsed = true;
            this.sidebar.classList.add('collapsed');
            document.body.classList.add('sidebar-collapsed');
            this._saveState();
        },

        collapseAll() {
            document.querySelectorAll('.control-section').forEach(section => {
                section.classList.add('collapsed');
            });
            document.querySelectorAll('.control-subsection.collapsible').forEach(subsection => {
                subsection.classList.add('collapsed');
            });
            this._saveSectionStates();
        },

        expandAll() {
            document.querySelectorAll('.control-section').forEach(section => {
                section.classList.remove('collapsed');
            });
            document.querySelectorAll('.control-subsection.collapsible').forEach(subsection => {
                subsection.classList.remove('collapsed');
            });
            this._saveSectionStates();
        },

        // Toggle a specific section by index or id
        toggleSection(identifier) {
            let section;
            if (typeof identifier === 'number') {
                section = document.querySelectorAll('.control-section')[identifier];
            } else {
                section = document.querySelector(`.control-section[data-section="${identifier}"]`);
            }
            if (section) {
                section.classList.toggle('collapsed');
                this._saveSectionStates();
            }
        },

        _saveState() {
            localStorage.setItem('divgraphics-sidebar-collapsed', this.isCollapsed);
        },

        _restoreState() {
            // Restore sidebar visibility (default: collapsed)
            const collapsed = localStorage.getItem('divgraphics-sidebar-collapsed');
            if (collapsed === 'false') {
                // Only open if explicitly saved as open
                this.isCollapsed = false;
                this.sidebar.classList.remove('collapsed');
                document.body.classList.remove('sidebar-collapsed');
            } else {
                // Default to collapsed
                this.isCollapsed = true;
                this.sidebar.classList.add('collapsed');
                document.body.classList.add('sidebar-collapsed');
            }

            // Restore individual section states
            const sectionStates = localStorage.getItem('divgraphics-section-states');
            if (sectionStates) {
                try {
                    const states = JSON.parse(sectionStates);
                    document.querySelectorAll('.control-section').forEach((section, i) => {
                        if (states[i]) {
                            section.classList.add('collapsed');
                        }
                    });
                } catch (e) {
                    // Ignore parse errors
                }
            }
        },

        _saveSectionStates() {
            const states = [];
            document.querySelectorAll('.control-section').forEach(section => {
                states.push(section.classList.contains('collapsed'));
            });
            localStorage.setItem('divgraphics-section-states', JSON.stringify(states));
        }
    };

})(window.APP);
