/**
 * CLUSTER • State Manager
 * Centralized localStorage persistence for UI & synth state
 */

(function(global){
  'use strict';
  const NS = global.CLUSTER = global.CLUSTER || {};
  const U = NS.Utils;

  const STATE_VERSION = 'v1';
  const KEYS = {
    PANELS: `cluster.panels.${STATE_VERSION}`,
    PARAMS: `cluster.params.${STATE_VERSION}`,
    TOKENS: `cluster.tokens.${STATE_VERSION}`,
    GAMEPAD: `cluster.gpmaps.v3` // Keep existing key
  };

  const StateManager = {
    /* ---------- Panel State ---------- */
    savePanelState(panelId, state) {
      const allPanels = this.loadPanelStates();
      allPanels[panelId] = {
        ...allPanels[panelId],
        ...state,
        lastUpdated: Date.now()
      };
      localStorage.setItem(KEYS.PANELS, JSON.stringify(allPanels));
    },

    loadPanelStates() {
      const raw = localStorage.getItem(KEYS.PANELS);
      if (!raw) return {};
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse panel states:', e);
        return {};
      }
    },

    loadPanelState(panelId) {
      const all = this.loadPanelStates();
      return all[panelId] || null;
    },

    /* ---------- Synth Parameters ---------- */
    saveParams() {
      const params = {};
      U.$all('[data-param]').forEach(el => {
        const name = el.getAttribute('data-param');
        params[name] = (el.type === 'range' || el.type === 'number') ? +el.value : el.value;
      });
      localStorage.setItem(KEYS.PARAMS, JSON.stringify(params));
      NS.Bus.emit('state:params-saved', params);
    },

    loadParams() {
      const raw = localStorage.getItem(KEYS.PARAMS);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse params:', e);
        return null;
      }
    },

    restoreParams() {
      const params = this.loadParams();
      if (!params) return false;

      Object.keys(params).forEach(name => {
        const el = U.$(`[data-param="${name}"]`);
        if (el) {
          el.value = params[name];
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });

      NS.Bus.emit('state:params-restored', params);
      return true;
    },

    /* ---------- Design Tokens ---------- */
    saveTokens() {
      const TOKEN_KEYS = [
        'color-bg', 'color-fg', 'color-muted', 'color-accent', 'color-ok', 'color-warn', 'color-err',
        'surface-0', 'surface-1', 'surface-2', 'surface-stroke',
        'radius', 'pad', 'gap', 'range-h', 'range-track', 'range-fill', 'thumb', 'thumb-focus', 'val'
      ];

      const out = {};
      TOKEN_KEYS.forEach(k => {
        out[k] = getComputedStyle(document.documentElement).getPropertyValue(`--${k}`).trim();
      });
      localStorage.setItem(KEYS.TOKENS, JSON.stringify(out));
    },

    loadTokens() {
      const raw = localStorage.getItem(KEYS.TOKENS);
      if (!raw) return;
      try {
        const obj = JSON.parse(raw);
        for (const k in obj) {
          document.documentElement.style.setProperty(`--${k}`, obj[k]);
        }
      } catch (e) {
        console.error('Failed to parse tokens:', e);
      }
    },

    resetTokens() {
      localStorage.removeItem(KEYS.TOKENS);
      location.reload();
    },

    /* ---------- Build Token Editor ---------- */
    buildTokenEditor() {
      const TOKEN_KEYS = [
        'color-bg', 'color-fg', 'color-muted', 'color-accent', 'color-ok', 'color-warn', 'color-err',
        'surface-0', 'surface-1', 'surface-2', 'surface-stroke',
        'radius', 'pad', 'gap', 'range-h', 'range-track', 'range-fill', 'thumb', 'thumb-focus', 'val'
      ];

      const grid = U.$('#tokens-grid');
      if (!grid) return;

      grid.innerHTML = '';
      TOKEN_KEYS.forEach(k => {
        const row = document.createElement('div');
        row.className = 'row';
        const val = getComputedStyle(document.documentElement).getPropertyValue(`--${k}`).trim();
        row.innerHTML = `<label>--${k}</label><input type="text" value="${val}" data-token="${k}"/>`;
        grid.appendChild(row);
      });

      grid.querySelectorAll('input[data-token]').forEach(inp => {
        inp.addEventListener('input', (e) => {
          const key = e.target.getAttribute('data-token');
          const v = e.target.value;
          document.documentElement.style.setProperty(`--${key}`, v);
          this.saveTokens();
        });
      });

      U.$('#tokens-reset')?.addEventListener('click', () => this.resetTokens());
    },

    /* ---------- Initialize ---------- */
    init() {
      // Load tokens on startup
      this.loadTokens();

      // Auto-save params on change (debounced)
      let saveTimeout = null;
      const autoSave = () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => this.saveParams(), 500);
      };

      U.$all('[data-param]').forEach(el => {
        el.addEventListener('input', autoSave);
      });

      // Listen for explicit save requests
      NS.Bus.on('state:save-params', () => this.saveParams());
    }
  };

  NS.StateManager = StateManager;

})(window);
