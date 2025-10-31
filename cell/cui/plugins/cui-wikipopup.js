/**
 * CUI WikiPopUp
 * Modal popup for displaying Wikipedia article summaries
 */

(function() {
  'use strict';

  CUI.register('wikipopup', ['core', 'lifecycle'], function(CUI) {
    CUI.log('WikiPopUp module initializing...');

    // ========================================================================
    // WikiPopUp Manager
    // ========================================================================

    CUI.WikiPopUp = {
      instances: {},
      activePopup: null,

      /**
       * Create a WikiPopUp instance
       *
       * @param {Object} config
       * @param {string} config.id - Popup ID
       * @param {Function} config.onClose - Callback when popup closes
       */
      create(config = {}) {
        const {
          id = 'wikiPopup_' + CUI.Utils.uid(),
          onClose
        } = config;

        // Create popup structure
        const overlay = CUI.DOM.create('div', {
          class: 'cui-wiki-overlay',
          id: id + '_overlay'
        });

        const popup = CUI.DOM.create('div', {
          class: 'cui-wiki-popup',
          id: id
        });

        const header = CUI.DOM.create('div', {
          class: 'cui-wiki-header'
        });

        const title = CUI.DOM.create('h3', {
          class: 'cui-wiki-title'
        }, 'Wikipedia');

        const closeBtn = CUI.DOM.create('button', {
          class: 'cui-wiki-close',
          'aria-label': 'Close'
        }, '×');

        const body = CUI.DOM.create('div', {
          class: 'cui-wiki-body'
        });

        const footer = CUI.DOM.create('div', {
          class: 'cui-wiki-footer'
        });

        // Assemble
        header.appendChild(title);
        header.appendChild(closeBtn);
        popup.appendChild(header);
        popup.appendChild(body);
        popup.appendChild(footer);
        overlay.appendChild(popup);

        // Create instance
        const instance = {
          id,
          overlay,
          popup,
          title,
          body,
          footer,
          closeBtn,
          onClose,
          visible: false
        };

        // Setup close handlers
        closeBtn.addEventListener('click', () => CUI.WikiPopUp.close(id));
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) {
            CUI.WikiPopUp.close(id);
          }
        });

        // Add to DOM (hidden)
        document.body.appendChild(overlay);

        // Store instance
        CUI.WikiPopUp.instances[id] = instance;

        CUI.log(`WikiPopUp "${id}" created`);
        return instance;
      },

      /**
       * Open popup and fetch Wikipedia article
       *
       * @param {string} id - Popup ID
       * @param {string} articleTitle - Wikipedia article title
       */
      async open(id, articleTitle) {
        const instance = CUI.WikiPopUp.instances[id];
        if (!instance) {
          CUI.error(`WikiPopUp "${id}" not found`);
          return;
        }

        // Close any active popup
        if (CUI.WikiPopUp.activePopup && CUI.WikiPopUp.activePopup !== id) {
          CUI.WikiPopUp.close(CUI.WikiPopUp.activePopup);
        }

        // Show popup with loading state
        instance.title.textContent = 'Loading...';
        instance.body.innerHTML = '<div class="cui-wiki-loading">Fetching Wikipedia data...</div>';
        instance.footer.innerHTML = '';
        instance.overlay.classList.add('visible');
        instance.visible = true;
        CUI.WikiPopUp.activePopup = id;

        CUI.Events.emit('cui:wikipopup:opening', { id, articleTitle });

        try {
          // Fetch Wikipedia article summary
          const data = await fetchWikipediaSummary(articleTitle);

          // Update popup content
          instance.title.textContent = data.title;
          instance.body.innerHTML = renderArticle(data);
          instance.footer.innerHTML = `
            <a href="${data.content_urls.desktop.page}"
               target="_blank"
               class="cui-wiki-link">
              Read full article on Wikipedia →
            </a>
          `;

          CUI.Events.emit('cui:wikipopup:loaded', { id, data });
        } catch (err) {
          CUI.error('Failed to fetch Wikipedia article:', err);
          instance.title.textContent = 'Error';
          instance.body.innerHTML = `
            <div class="cui-wiki-error">
              <p>Failed to load Wikipedia article "${articleTitle}"</p>
              <p>${err.message}</p>
            </div>
          `;
          instance.footer.innerHTML = '';
          CUI.Events.emit('cui:wikipopup:error', { id, error: err });
        }
      },

      /**
       * Close popup
       */
      close(id) {
        const instance = CUI.WikiPopUp.instances[id];
        if (!instance) return;

        instance.overlay.classList.remove('visible');
        instance.visible = false;

        if (CUI.WikiPopUp.activePopup === id) {
          CUI.WikiPopUp.activePopup = null;
        }

        if (instance.onClose) {
          instance.onClose();
        }

        CUI.Events.emit('cui:wikipopup:closed', { id });
      },

      /**
       * Remove popup instance
       */
      destroy(id) {
        const instance = CUI.WikiPopUp.instances[id];
        if (!instance) return;

        if (instance.visible) {
          CUI.WikiPopUp.close(id);
        }

        instance.overlay.remove();
        delete CUI.WikiPopUp.instances[id];
        CUI.log(`WikiPopUp "${id}" destroyed`);
      }
    };

    // ========================================================================
    // Wikipedia API
    // ========================================================================

    /**
     * Fetch Wikipedia article summary
     * Uses the Wikipedia REST API v1
     */
    async function fetchWikipediaSummary(title) {
      const encodedTitle = encodeURIComponent(title);
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.type === 'disambiguation') {
        throw new Error('This is a disambiguation page. Please be more specific.');
      }

      return data;
    }

    // ========================================================================
    // Rendering
    // ========================================================================

    function renderArticle(data) {
      let html = '';

      // Thumbnail image
      if (data.thumbnail) {
        html += `
          <div class="cui-wiki-image">
            <img src="${data.thumbnail.source}" alt="${data.title}" />
          </div>
        `;
      }

      // Extract (summary text)
      if (data.extract_html) {
        html += `
          <div class="cui-wiki-extract">
            ${data.extract_html}
          </div>
        `;
      } else if (data.extract) {
        html += `
          <div class="cui-wiki-extract">
            <p>${data.extract}</p>
          </div>
        `;
      }

      // Metadata
      if (data.description) {
        html += `
          <div class="cui-wiki-description">
            <em>${data.description}</em>
          </div>
        `;
      }

      return html;
    }

    // ========================================================================
    // Keyboard Shortcuts
    // ========================================================================

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && CUI.WikiPopUp.activePopup) {
        CUI.WikiPopUp.close(CUI.WikiPopUp.activePopup);
      }
    });

    CUI.log('WikiPopUp module loaded');
  });

})();
