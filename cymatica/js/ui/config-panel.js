/**
 * CYMATICA Config Panel Module
 * Draggable, collapsible configuration panel
 */
(function(CYMATICA) {
    'use strict';

    const CymaticaConfigPanel = {
        panel: null,
        fab: null,
        isOpen: false,
        position: { x: null, y: null },
        collapsedSections: new Set(),

        /**
         * Initialize config panel
         */
        init: function() {
            this.panel = document.getElementById('config-panel');
            this.fab = document.getElementById('config-fab');

            if (!this.panel && !this.fab) {
                // Create FAB if not present and TUT is loaded
                if (window.TERRAIN?.TUT) {
                    // TUT handles its own FAB
                    return;
                }
            }

            this.restoreState();
            this.bindEvents();
            console.log('[CYMATICA.ConfigPanel] Initialized');
        },

        /**
         * Bind event listeners
         */
        bindEvents: function() {
            // FAB click
            if (this.fab) {
                this.fab.addEventListener('click', () => this.toggle());
            }

            // Panel header drag
            if (this.panel) {
                const header = this.panel.querySelector('.panel-header, .config-panel-header');
                if (header) {
                    this.makeDraggable(header);
                }

                // Section collapse
                this.panel.querySelectorAll('.section-header').forEach(header => {
                    header.addEventListener('click', () => this.toggleSection(header));
                });

                // Close button
                const closeBtn = this.panel.querySelector('.close-btn, [data-action="close"]');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => this.close());
                }
            }

            // Escape to close
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.close();
                }
            });
        },

        /**
         * Toggle panel visibility
         */
        toggle: function() {
            if (this.isOpen) {
                this.close();
            } else {
                this.open();
            }
        },

        /**
         * Open panel
         */
        open: function() {
            if (this.panel) {
                this.panel.classList.add('active');
                this.isOpen = true;

                if (CYMATICA.events) {
                    CYMATICA.events.emit(CYMATICA.Events.PANEL_OPEN);
                }
            }
        },

        /**
         * Close panel
         */
        close: function() {
            if (this.panel) {
                this.panel.classList.remove('active');
                this.isOpen = false;

                if (CYMATICA.events) {
                    CYMATICA.events.emit(CYMATICA.Events.PANEL_CLOSE);
                }
            }
        },

        /**
         * Make element draggable
         */
        makeDraggable: function(header) {
            let isDragging = false;
            let startX, startY, initialX, initialY;

            const panel = this.panel;
            const self = this;

            header.addEventListener('mousedown', (e) => {
                if (e.target.closest('.section-toggle, button, input')) return;

                isDragging = true;
                header.style.cursor = 'grabbing';

                const rect = panel.getBoundingClientRect();
                initialX = rect.left;
                initialY = rect.top;
                startX = e.clientX;
                startY = e.clientY;

                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;

                const dx = e.clientX - startX;
                const dy = e.clientY - startY;

                const newX = initialX + dx;
                const newY = initialY + dy;

                panel.style.position = 'fixed';
                panel.style.left = newX + 'px';
                panel.style.top = newY + 'px';
                panel.style.right = 'auto';
                panel.style.bottom = 'auto';

                self.position = { x: newX, y: newY };
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    header.style.cursor = 'grab';
                    self.saveState();
                }
            });

            header.style.cursor = 'grab';
        },

        /**
         * Toggle section collapse
         */
        toggleSection: function(header) {
            const content = header.nextElementSibling;
            const icon = header.querySelector('.section-toggle, .collapse-icon');

            if (content) {
                content.classList.toggle('collapsed');

                const sectionId = header.dataset.section || header.textContent.trim();

                if (content.classList.contains('collapsed')) {
                    this.collapsedSections.add(sectionId);
                } else {
                    this.collapsedSections.delete(sectionId);
                }

                if (icon) {
                    icon.classList.toggle('collapsed');
                }

                this.saveState();
            }
        },

        /**
         * Collapse all sections
         */
        collapseAll: function() {
            if (this.panel) {
                this.panel.querySelectorAll('.section-content').forEach(content => {
                    content.classList.add('collapsed');
                });
                this.panel.querySelectorAll('.section-toggle, .collapse-icon').forEach(icon => {
                    icon.classList.add('collapsed');
                });
            }
        },

        /**
         * Expand all sections
         */
        expandAll: function() {
            if (this.panel) {
                this.panel.querySelectorAll('.section-content').forEach(content => {
                    content.classList.remove('collapsed');
                });
                this.panel.querySelectorAll('.section-toggle, .collapse-icon').forEach(icon => {
                    icon.classList.remove('collapsed');
                });
            }
        },

        /**
         * Save panel state
         */
        saveState: function() {
            if (CYMATICA.Persistence?.savePanelState) {
                CYMATICA.Persistence.savePanelState({
                    position: this.position,
                    collapsedSections: Array.from(this.collapsedSections)
                });
            }
        },

        /**
         * Restore panel state
         */
        restoreState: function() {
            const saved = CYMATICA.Persistence?.loadPanelState?.();

            if (saved) {
                // Restore position
                if (saved.position && saved.position.x !== null && this.panel) {
                    this.panel.style.position = 'fixed';
                    this.panel.style.left = saved.position.x + 'px';
                    this.panel.style.top = saved.position.y + 'px';
                    this.panel.style.right = 'auto';
                    this.panel.style.bottom = 'auto';
                    this.position = saved.position;
                }

                // Restore collapsed sections
                if (saved.collapsedSections && this.panel) {
                    saved.collapsedSections.forEach(sectionId => {
                        this.collapsedSections.add(sectionId);
                        const header = this.panel.querySelector(`[data-section="${sectionId}"]`) ||
                                       Array.from(this.panel.querySelectorAll('.section-header'))
                                            .find(h => h.textContent.trim() === sectionId);
                        if (header) {
                            const content = header.nextElementSibling;
                            const icon = header.querySelector('.section-toggle, .collapse-icon');
                            if (content) content.classList.add('collapsed');
                            if (icon) icon.classList.add('collapsed');
                        }
                    });
                }
            }
        }
    };

    CYMATICA.ConfigPanel = CymaticaConfigPanel;

})(window.CYMATICA);
