/**
 * CUI Tabs
 * Generic tab and sub-tab system
 */

(function() {
  'use strict';

  CUI.register('tabs', ['core', 'lifecycle'], function(CUI) {
    CUI.log('Tabs module initializing...');

    // ========================================================================
    // Tab Manager
    // ========================================================================

    CUI.Tabs = {
      /**
       * Create a tab system
       *
       * @param {Object} config
       * @param {string} config.containerId - Container element ID
       * @param {Array} config.tabs - Array of tab definitions
       * @param {Function} config.onChange - Callback when tab changes
       * @param {boolean} config.multiLevel - Enable sub-tabs (default: false)
       *
       * Tab definition:
       * {
       *   id: 'tab1',
       *   label: 'Tab 1',
       *   content: HTMLElement or string,
       *   subtabs: [...] // Optional sub-tabs
       * }
       */
      create(config) {
        const {
          containerId,
          tabs,
          onChange,
          multiLevel = false
        } = config;

        const container = CUI.DOM.$(containerId);
        if (!container) {
          CUI.error(`Container #${containerId} not found`);
          return null;
        }

        const instance = {
          tabs,
          activeTab: null,
          activeSubtab: null,
          onChange,
          elements: {
            container,
            tabBar: null,
            contentArea: null
          }
        };

        // Build UI
        buildTabUI(instance, multiLevel);

        // Activate first tab
        if (tabs.length > 0) {
          instance.activate(tabs[0].id);
        }

        return instance;
      }
    };

    // ========================================================================
    // Tab UI Builder
    // ========================================================================

    function buildTabUI(instance, multiLevel) {
      const { container, tabs } = instance;

      // Create tab bar
      const tabBar = CUI.DOM.create('div', { class: 'tabs' });

      tabs.forEach(tab => {
        const tabEl = CUI.DOM.create('button', {
          class: 'tab',
          'data-tab-id': tab.id,
          'aria-selected': 'false',
          onclick: () => instance.activate(tab.id)
        }, tab.label);

        tabBar.appendChild(tabEl);
        tab.element = tabEl;
      });

      instance.elements.tabBar = tabBar;

      // Create sub-tab container (if multi-level)
      if (multiLevel) {
        const subtabContainer = CUI.DOM.create('div', { class: 'subtabs' });
        instance.elements.subtabContainer = subtabContainer;
      }

      // Create content area
      const contentArea = CUI.DOM.create('div', { class: 'tab-content-area' });
      instance.elements.contentArea = contentArea;

      // Append to container
      container.appendChild(tabBar);
      if (multiLevel && instance.elements.subtabContainer) {
        container.appendChild(instance.elements.subtabContainer);
      }
      container.appendChild(contentArea);

      // Add activate method
      instance.activate = function(tabId, subtabId) {
        activateTab(instance, tabId, subtabId);
      };

      // Add get active method
      instance.getActive = function() {
        return {
          tab: instance.activeTab,
          subtab: instance.activeSubtab
        };
      };
    }

    // ========================================================================
    // Tab Activation
    // ========================================================================

    function activateTab(instance, tabId, subtabId) {
      const tab = instance.tabs.find(t => t.id === tabId);
      if (!tab) {
        CUI.warn(`Tab "${tabId}" not found`);
        return;
      }

      // Deactivate all tabs
      instance.tabs.forEach(t => {
        if (t.element) {
          t.element.setAttribute('aria-selected', 'false');
        }
      });

      // Activate this tab
      tab.element.setAttribute('aria-selected', 'true');
      instance.activeTab = tab;

      // Handle sub-tabs
      if (tab.subtabs && tab.subtabs.length > 0) {
        buildSubtabs(instance, tab);

        // Activate subtab if specified, otherwise first subtab
        const targetSubtabId = subtabId || tab.subtabs[0].id;
        activateSubtab(instance, tab, targetSubtabId);
      } else {
        // No subtabs, clear subtab container
        if (instance.elements.subtabContainer) {
          instance.elements.subtabContainer.innerHTML = '';
          instance.elements.subtabContainer.classList.remove('active');
        }

        // Show tab content
        showContent(instance, tab.content);
      }

      // Fire onChange callback
      if (instance.onChange) {
        instance.onChange({
          tab: tab.id,
          subtab: instance.activeSubtab ? instance.activeSubtab.id : null
        });
      }

      CUI.Events.emit('cui:tab:changed', { tabId, subtabId });
    }

    // ========================================================================
    // Sub-tab Management
    // ========================================================================

    function buildSubtabs(instance, parentTab) {
      const subtabContainer = instance.elements.subtabContainer;
      if (!subtabContainer) return;

      CUI.DOM.empty(subtabContainer);
      subtabContainer.classList.add('active');

      parentTab.subtabs.forEach(subtab => {
        const subtabEl = CUI.DOM.create('button', {
          class: 'subtab',
          'data-subtab-id': subtab.id,
          'aria-selected': 'false',
          onclick: () => activateSubtab(instance, parentTab, subtab.id)
        }, subtab.label);

        subtabContainer.appendChild(subtabEl);
        subtab.element = subtabEl;
      });
    }

    function activateSubtab(instance, parentTab, subtabId) {
      const subtab = parentTab.subtabs.find(st => st.id === subtabId);
      if (!subtab) {
        CUI.warn(`Subtab "${subtabId}" not found`);
        return;
      }

      // Deactivate all subtabs
      parentTab.subtabs.forEach(st => {
        if (st.element) {
          st.element.setAttribute('aria-selected', 'false');
        }
      });

      // Activate this subtab
      subtab.element.setAttribute('aria-selected', 'true');
      instance.activeSubtab = subtab;

      // Show subtab content
      showContent(instance, subtab.content);

      // Fire onChange callback
      if (instance.onChange) {
        instance.onChange({
          tab: parentTab.id,
          subtab: subtab.id
        });
      }

      CUI.Events.emit('cui:subtab:changed', { tabId: parentTab.id, subtabId });
    }

    // ========================================================================
    // Content Display
    // ========================================================================

    function showContent(instance, content) {
      const contentArea = instance.elements.contentArea;
      CUI.DOM.empty(contentArea);

      if (typeof content === 'string') {
        contentArea.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        contentArea.appendChild(content);
      } else if (typeof content === 'function') {
        const result = content();
        if (typeof result === 'string') {
          contentArea.innerHTML = result;
        } else if (result instanceof HTMLElement) {
          contentArea.appendChild(result);
        }
      }
    }

    // ========================================================================
    // Preset Tab System (for common patterns)
    // ========================================================================

    /**
     * Create preset tab system (Scenario/Init pattern from SIR)
     */
    CUI.Tabs.createPresetTabs = function(config) {
      const {
        containerId,
        groups, // { regimes: [...], patterns: [...], exploration: [...] }
        onSelect // callback when preset is selected
      } = config;

      const container = CUI.DOM.$(containerId);
      if (!container) {
        CUI.error(`Container #${containerId} not found`);
        return null;
      }

      let activeGroup = null;

      // Create tab buttons for each group
      const tabContainer = CUI.DOM.create('div', { class: 'preset-tabs' });

      Object.entries(groups).forEach(([groupName, presets]) => {
        const tabBtn = CUI.DOM.create('button', {
          class: 'preset-tab',
          'data-group': groupName,
          onclick: () => toggleGroup(groupName)
        }, capitalize(groupName));

        tabContainer.appendChild(tabBtn);
        groups[groupName]._button = tabBtn;
      });

      container.appendChild(tabContainer);

      // Create content areas for each group
      Object.entries(groups).forEach(([groupName, presets]) => {
        const contentDiv = CUI.DOM.create('div', {
          class: 'preset-content',
          'data-group': groupName
        });

        const buttonGrid = CUI.DOM.create('div', { class: 'button-grid' });

        presets.forEach(preset => {
          const btn = CUI.DOM.create('button', {
            class: 'grid-btn',
            onclick: () => {
              if (onSelect) onSelect(preset, groupName);
              CUI.Events.emit('cui:preset:selected', { preset, group: groupName });
            }
          }, preset.label || preset.name);

          buttonGrid.appendChild(btn);
        });

        contentDiv.appendChild(buttonGrid);
        container.appendChild(contentDiv);
        groups[groupName]._content = contentDiv;
      });

      // Toggle function
      function toggleGroup(groupName) {
        if (activeGroup === groupName) {
          // Close
          groups[groupName]._button.classList.remove('active');
          groups[groupName]._content.classList.remove('open');
          activeGroup = null;
        } else {
          // Close all
          Object.entries(groups).forEach(([name, group]) => {
            group._button.classList.remove('active');
            group._content.classList.remove('open');
          });

          // Open this one
          groups[groupName]._button.classList.add('active');
          groups[groupName]._content.classList.add('open');
          activeGroup = groupName;
        }
      }

      return {
        toggleGroup,
        getActive: () => activeGroup
      };
    };

    // Helper: capitalize
    function capitalize(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    }

    CUI.log('Tabs module loaded');
  });

})();
