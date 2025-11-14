/**
 * CUI DocPanel Enhanced
 * HTML-based tab/subtab system for documentation panels
 * Extends CUI.DocPanel with convention-based HTML structure
 */

(function() {
  'use strict';

  CUI.register('docpanel-enhanced', ['core', 'fab'], function(CUI) {
    CUI.log('DocPanel Enhanced module initializing...');

    // ========================================================================
    // Enhanced DocPanel
    // ========================================================================

    /**
     * Create DocPanel from HTML structure
     * Scans for [data-tab] and [data-subtab] elements
     *
     * @param {string} panelId - Panel element ID
     * @param {Object} options
     * @param {boolean} options.autoInit - Auto-activate first tab (default: true)
     * @returns {Object} DocPanel instance
     */
    CUI.DocPanel.createFromHTML = function(panelId, options = {}) {
      const { autoInit = true } = options;

      const panel = CUI.DOM.$(panelId);
      if (!panel) {
        CUI.error(`DocPanel #${panelId} not found`);
        return null;
      }

      // Find dochead and docbody
      let dochead = panel.querySelector('.dochead');
      let docbody = panel.querySelector('.docbody');

      // Create them if they don't exist
      if (!dochead) {
        dochead = CUI.DOM.create('div', { class: 'dochead' });
        panel.insertBefore(dochead, panel.firstChild);
      }

      if (!docbody) {
        docbody = CUI.DOM.create('div', { class: 'docbody' });
        panel.appendChild(docbody);
      }

      // Scan for tab sections
      const tabSections = docbody.querySelectorAll('[data-tab]');
      if (tabSections.length === 0) {
        CUI.warn(`No [data-tab] elements found in #${panelId}`);
        return null;
      }

      // Build tab structure
      const tabs = [];
      tabSections.forEach((section, index) => {
        const tabId = section.dataset.tab;
        const label = section.dataset.label || tabId;

        // Scan for subtabs within this tab
        const subtabElements = section.querySelectorAll('[data-subtab]');
        const subtabs = [];

        subtabElements.forEach((subtabEl, subIndex) => {
          const subtabId = subtabEl.dataset.subtab;
          const subtabLabel = subtabEl.dataset.label || subtabId;

          subtabs.push({
            id: subtabId,
            label: subtabLabel,
            element: subtabEl,
            index: subIndex
          });

          // Hide subtabs initially
          subtabEl.style.display = 'none';
          subtabEl.dataset.subtabIndex = subIndex;
        });

        tabs.push({
          id: tabId,
          label,
          section,
          subtabs,
          index
        });

        // Mark section with index
        section.dataset.tabIndex = index;
        section.style.display = 'none'; // Hide initially
      });

      // Build tab navigation
      const tabsContainer = CUI.DOM.create('div', { class: 'tabs' });

      tabs.forEach((tab, index) => {
        const tabBtn = CUI.DOM.create('button', {
          class: 'tab',
          'data-tab-id': tab.id,
          'aria-selected': index === 0 ? 'true' : 'false'
        }, tab.label);

        tabBtn.addEventListener('click', () => {
          activateTab(index);
        });

        tabsContainer.appendChild(tabBtn);
        tab.button = tabBtn;
      });

      // Clear and rebuild dochead
      CUI.DOM.empty(dochead);
      dochead.appendChild(tabsContainer);

      // Build subtab navigation (if any tabs have subtabs)
      const hasSubtabs = tabs.some(tab => tab.subtabs.length > 0);
      let subtabsContainer;

      if (hasSubtabs) {
        subtabsContainer = CUI.DOM.create('div', { class: 'subtabs' });
        dochead.appendChild(subtabsContainer);
      }

      // Activation functions
      function activateTab(tabIndex) {
        const tab = tabs[tabIndex];

        // Update tab buttons
        tabs.forEach((t, i) => {
          t.button.setAttribute('aria-selected', i === tabIndex ? 'true' : 'false');
          t.section.style.display = i === tabIndex ? 'block' : 'none';
        });

        // Build/show subtabs for this tab
        if (tab.subtabs.length > 0 && subtabsContainer) {
          CUI.DOM.empty(subtabsContainer);
          subtabsContainer.classList.add('active');

          tab.subtabs.forEach((subtab, subIndex) => {
            const subtabBtn = CUI.DOM.create('button', {
              class: 'subtab',
              'data-subtab-id': subtab.id,
              'aria-selected': subIndex === 0 ? 'true' : 'false'
            }, subtab.label);

            subtabBtn.addEventListener('click', () => {
              activateSubtab(tabIndex, subIndex);
            });

            subtabsContainer.appendChild(subtabBtn);
            subtab.button = subtabBtn;
          });

          // Activate first subtab
          activateSubtab(tabIndex, 0);
        } else if (subtabsContainer) {
          subtabsContainer.classList.remove('active');
        }

        // Emit event
        CUI.Events.emit('cui:docpanel:tab-changed', {
          panelId,
          tabId: tab.id,
          tabIndex
        });
      }

      function activateSubtab(tabIndex, subtabIndex) {
        const tab = tabs[tabIndex];
        const subtab = tab.subtabs[subtabIndex];

        // Update subtab buttons
        tab.subtabs.forEach((st, i) => {
          st.button.setAttribute('aria-selected', i === subtabIndex ? 'true' : 'false');
          st.element.style.display = i === subtabIndex ? 'block' : 'none';
        });

        // Emit event
        CUI.Events.emit('cui:docpanel:subtab-changed', {
          panelId,
          tabId: tab.id,
          subtabId: subtab.id,
          subtabIndex
        });
      }

      // Auto-activate first tab
      if (autoInit && tabs.length > 0) {
        activateTab(0);
      }

      const instance = {
        panelId,
        element: panel,
        tabs,
        activateTab,
        activateSubtab,
        getActiveTab() {
          return tabs.find(t => t.button.getAttribute('aria-selected') === 'true');
        }
      };

      CUI.log(`DocPanel created from HTML: ${tabs.length} tabs, ${tabs.reduce((sum, t) => sum + t.subtabs.length, 0)} subtabs`);

      return instance;
    };

    /**
     * Auto-setup all docpanels with data-cui-docpanel attribute
     */
    CUI.DocPanel.autoSetupHTML = function() {
      const panels = CUI.DOM.$$('[data-cui-docpanel]');

      panels.forEach(panel => {
        const panelId = panel.id;
        if (panelId) {
          CUI.DocPanel.createFromHTML(panelId);
        }
      });

      CUI.log(`Auto-setup: ${panels.length} DocPanels initialized from HTML`);
    };

    CUI.log('DocPanel Enhanced module loaded');
  });

})();
