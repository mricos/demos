/**
 * CUI FAB (Floating Action Buttons)
 * FAB components and drawer management
 */

(function() {
  'use strict';

  CUI.register('fab', ['core', 'lifecycle'], function(CUI) {
    CUI.log('FAB module initializing...');

    // ========================================================================
    // FAB Manager
    // ========================================================================

    CUI.FAB = {
      instances: {},

      /**
       * Create a FAB with associated drawer
       *
       * @param {Object} config
       * @param {string} config.id - Unique FAB ID
       * @param {string} config.icon - Icon character (emoji or text)
       * @param {string} config.type - 'doc' | 'sim' | 'custom'
       * @param {string} config.drawerId - Associated drawer element ID
       * @param {Function} config.onClick - Click handler (optional)
       * @param {boolean} config.closeOthers - Close other drawers when opening (default: true)
       */
      create(config) {
        const {
          id,
          icon,
          type = 'custom',
          drawerId,
          onClick,
          closeOthers = true
        } = config;

        const fabElement = CUI.DOM.$(id);
        const drawerElement = drawerId ? CUI.DOM.$(drawerId) : null;

        if (!fabElement) {
          CUI.error(`FAB element #${id} not found`);
          return null;
        }

        const instance = {
          id,
          icon,
          type,
          fabElement,
          drawerElement,
          isOpen: false,
          closeOthers,
          onClick
        };

        // Add click handler
        fabElement.addEventListener('click', () => {
          if (onClick) {
            onClick(instance);
          } else if (drawerElement) {
            instance.toggle();
          }
        });

        // Store instance
        CUI.FAB.instances[id] = instance;

        // Add methods
        instance.open = () => CUI.FAB.open(id);
        instance.close = () => CUI.FAB.close(id);
        instance.toggle = () => CUI.FAB.toggle(id);

        CUI.log(`FAB "${id}" created`);
        return instance;
      },

      /**
       * Open a FAB's drawer
       */
      open(id) {
        const instance = CUI.FAB.instances[id];
        if (!instance) return;

        // Close others if configured
        if (instance.closeOthers) {
          CUI.FAB.closeAll(id);
        }

        if (instance.drawerElement) {
          instance.drawerElement.classList.add('open');
          instance.isOpen = true;
          CUI.Events.emit('cui:fab:opened', { id });
        }
      },

      /**
       * Close a FAB's drawer
       */
      close(id) {
        const instance = CUI.FAB.instances[id];
        if (!instance) return;

        if (instance.drawerElement) {
          instance.drawerElement.classList.remove('open');
          instance.isOpen = false;
          CUI.Events.emit('cui:fab:closed', { id });
        }
      },

      /**
       * Toggle a FAB's drawer
       */
      toggle(id) {
        const instance = CUI.FAB.instances[id];
        if (!instance) return;

        if (instance.isOpen) {
          CUI.FAB.close(id);
        } else {
          CUI.FAB.open(id);
        }
      },

      /**
       * Close all FAB drawers except specified ID
       */
      closeAll(exceptId) {
        Object.keys(CUI.FAB.instances).forEach(id => {
          if (id !== exceptId) {
            CUI.FAB.close(id);
          }
        });
      },

      /**
       * Get FAB instance
       */
      get(id) {
        return CUI.FAB.instances[id];
      }
    };

    // ========================================================================
    // Drawer Builder
    // ========================================================================

    CUI.Drawer = {
      /**
       * Build a drawer with sections
       *
       * @param {Object} config
       * @param {string} config.id - Drawer element ID
       * @param {Array} config.sections - Array of section configs
       *
       * Section config:
       * {
       *   type: 'header' | 'controls' | 'presets' | 'actions' | 'custom',
       *   content: HTMLElement or string,
       *   className: 'optional-class'
       * }
       */
      build(config) {
        const { id, sections } = config;
        const drawer = CUI.DOM.$(id);

        if (!drawer) {
          CUI.error(`Drawer #${id} not found`);
          return null;
        }

        CUI.DOM.empty(drawer);

        sections.forEach(section => {
          const sectionEl = buildSection(section);
          if (sectionEl) {
            drawer.appendChild(sectionEl);
          }
        });

        return {
          element: drawer,
          addSection(section) {
            const sectionEl = buildSection(section);
            if (sectionEl) {
              drawer.appendChild(sectionEl);
            }
          },
          clear() {
            CUI.DOM.empty(drawer);
          }
        };
      }
    };

    function buildSection(config) {
      const { type, content, className = '' } = config;

      let sectionClass = '';
      switch (type) {
        case 'header':
          sectionClass = 'drawer-header';
          break;
        case 'controls':
          sectionClass = 'drawer-controls';
          break;
        case 'presets':
          sectionClass = 'presets-section';
          break;
        case 'actions':
          sectionClass = 'drawer-actions';
          break;
        default:
          sectionClass = className;
      }

      const section = CUI.DOM.create('div', { class: sectionClass });

      if (typeof content === 'string') {
        section.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        section.appendChild(content);
      } else if (typeof content === 'function') {
        const result = content();
        if (typeof result === 'string') {
          section.innerHTML = result;
        } else if (result instanceof HTMLElement) {
          section.appendChild(result);
        }
      }

      return section;
    }

    // ========================================================================
    // Document Panel (for markdown/docs)
    // ========================================================================

    CUI.DocPanel = {
      /**
       * Create a documentation panel
       *
       * @param {Object} config
       * @param {string} config.panelId - Panel element ID
       * @param {Array} config.tabs - Tab definitions with content
       */
      create(config) {
        const { panelId, tabs } = config;
        const panel = CUI.DOM.$(panelId);

        if (!panel) {
          CUI.error(`Doc panel #${panelId} not found`);
          return null;
        }

        // Create header with tabs
        const header = CUI.DOM.create('div', { class: 'dochead' });
        const tabContainer = CUI.DOM.create('div', { class: 'tabs' });

        tabs.forEach((tab, index) => {
          const tabBtn = CUI.DOM.create('button', {
            class: 'tab',
            'aria-selected': index === 0 ? 'true' : 'false',
            onclick: () => activateDocTab(index)
          }, tab.label);

          tabContainer.appendChild(tabBtn);
          tab._button = tabBtn;
        });

        header.appendChild(tabContainer);

        // Create body
        const body = CUI.DOM.create('div', { class: 'docbody' });

        tabs.forEach((tab, index) => {
          const section = CUI.DOM.create('section', {
            'data-tab-index': index,
            style: { display: index === 0 ? 'block' : 'none' }
          });

          if (typeof tab.content === 'string') {
            section.innerHTML = tab.content;
          } else if (tab.content instanceof HTMLElement) {
            section.appendChild(tab.content);
          }

          body.appendChild(section);
          tab._section = section;
        });

        // Clear and rebuild panel
        CUI.DOM.empty(panel);
        panel.appendChild(header);
        panel.appendChild(body);

        function activateDocTab(index) {
          tabs.forEach((tab, i) => {
            tab._button.setAttribute('aria-selected', i === index ? 'true' : 'false');
            tab._section.style.display = i === index ? 'block' : 'none';
          });
        }

        return {
          element: panel,
          activateTab: activateDocTab
        };
      }
    };

    // ========================================================================
    // Auto-setup from existing HTML
    // ========================================================================

    CUI.FAB.autoSetup = function() {
      // Find all elements with data-cui-fab attribute
      const fabs = CUI.DOM.$$('[data-cui-fab]');

      fabs.forEach(fabEl => {
        const id = fabEl.id;
        const type = fabEl.dataset.cuiFab || 'custom';
        const drawerId = fabEl.dataset.cuiDrawer;
        const icon = fabEl.textContent.trim();

        CUI.FAB.create({
          id,
          icon,
          type,
          drawerId
        });
      });

      CUI.log(`Auto-setup: ${fabs.length} FABs initialized`);
    };

    CUI.log('FAB module loaded');
  });

})();
