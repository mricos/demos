/**
 * CLUSTER • Panel Manager
 * Three display modes: closed, open, fullscreen
 * Drag, resize, persistence, FAB integration
 */

(function(global){
  'use strict';
  const NS = global.CLUSTER = global.CLUSTER || {};
  const U = NS.Utils;

  const MODES = {
    CLOSED: 'closed',
    OPEN: 'open',
    FULLSCREEN: 'fullscreen'
  };

  const PanelManager = {
    panels: new Map(),

    /* ---------- Panel Lifecycle ---------- */
    register(panel) {
      const id = panel.id;
      const moduleId = panel.getAttribute('data-module');

      const state = {
        id,
        moduleId,
        element: panel,
        mode: MODES.CLOSED,
        position: { x: 0, y: 0 },
        size: { w: 0, h: 0 },
        savedPosition: null, // For restoring from fullscreen
        fab: U.$(`[data-module="${moduleId}"]`)
      };

      this.panels.set(id, state);

      // Make draggable
      this._makeDraggable(state);

      // Make resizable
      this._makeResizable(state);

      // Make responsive (control panels only)
      this._makeResponsive(state);

      // Add mode controls to header
      this._addModeControls(state);

      // Load saved state
      this._loadState(state);

      // Initially set to closed
      if (state.mode === MODES.CLOSED) {
        this.setMode(id, MODES.CLOSED);
      }

      NS.Z.register(panel);

      return state;
    },

    /* ---------- Mode Management ---------- */
    setMode(panelId, mode) {
      const state = this.panels.get(panelId);
      if (!state) return;

      const panel = state.element;
      const oldMode = state.mode;
      state.mode = mode;

      // Remove all mode classes
      panel.classList.remove('panel--closed', 'panel--open', 'panel--fullscreen');

      switch(mode) {
        case MODES.CLOSED:
          panel.classList.add('panel--closed');
          panel.style.display = 'none';
          this._updateFAB(state, false);
          break;

        case MODES.OPEN:
          panel.classList.add('panel--open');
          panel.style.display = 'block';

          // Restore from fullscreen
          if (oldMode === MODES.FULLSCREEN && state.savedPosition) {
            panel.style.left = state.savedPosition.x + 'px';
            panel.style.top = state.savedPosition.y + 'px';
            panel.style.width = state.savedPosition.w + 'px';
            panel.style.height = state.savedPosition.h || 'auto';
            state.savedPosition = null;
          }

          this._updateFAB(state, true);
          NS.Z.bringToFront(panel);
          break;

        case MODES.FULLSCREEN:
          panel.classList.add('panel--fullscreen');
          panel.style.display = 'block';

          // Save current position
          const rect = panel.getBoundingClientRect();
          state.savedPosition = {
            x: parseInt(panel.style.left) || rect.left,
            y: parseInt(panel.style.top) || rect.top,
            w: parseInt(panel.style.width) || rect.width,
            h: parseInt(panel.style.height) || rect.height
          };

          // Fullscreen position
          panel.style.left = '20px';
          panel.style.top = '60px';
          panel.style.width = 'calc(100vw - 40px)';
          panel.style.height = 'calc(100vh - 80px)';

          this._updateFAB(state, true);
          NS.Z.bringToFront(panel);
          break;
      }

      this._saveState(state);
      NS.Bus.emit('panel:mode-changed', { panelId, mode, oldMode });
    },

    togglePanel(panelId) {
      const state = this.panels.get(panelId);
      if (!state) return;

      if (state.mode === MODES.CLOSED) {
        this.setMode(panelId, MODES.OPEN);
      } else {
        this.setMode(panelId, MODES.CLOSED);
      }
    },

    cycleModes(panelId) {
      const state = this.panels.get(panelId);
      if (!state) return;

      const cycle = {
        [MODES.CLOSED]: MODES.OPEN,
        [MODES.OPEN]: MODES.FULLSCREEN,
        [MODES.FULLSCREEN]: MODES.OPEN
      };

      this.setMode(panelId, cycle[state.mode]);
    },

    /* ---------- Dragging ---------- */
    _makeDraggable(state) {
      const panel = state.element;
      const header = panel.querySelector('.panel-header');
      if (!header) return;

      let ox = 0, oy = 0, dragging = false;

      const onDown = (e) => {
        // Don't drag if clicking buttons or in fullscreen
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
        if (state.mode === MODES.FULLSCREEN) return;

        const rect = panel.getBoundingClientRect();
        ox = e.clientX - rect.left;
        oy = e.clientY - rect.top;
        dragging = true;

        NS.Z.bringToFront(panel);

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      };

      const onMove = (e) => {
        if (!dragging) return;

        const x = Math.max(6, Math.min(window.innerWidth - 40, e.clientX - ox));
        const y = Math.max(46, Math.min(window.innerHeight - 40, e.clientY - oy));

        panel.style.left = x + 'px';
        panel.style.top = y + 'px';

        state.position.x = x;
        state.position.y = y;
      };

      const onUp = () => {
        if (dragging) {
          dragging = false;
          this._saveState(state);
        }
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      header.addEventListener('mousedown', onDown);
      // Note: Removed general mousedown Z-ordering to prevent flicker from gamepad input
      // Z-ordering handled by drag start, mode changes, and explicit FAB clicks
    },

    /* ---------- Resizing ---------- */
    _makeResizable(state) {
      const panel = state.element;

      // Add resize handle
      const handle = document.createElement('div');
      handle.className = 'panel-resize-handle';
      panel.appendChild(handle);

      let resizing = false;
      let startX = 0, startY = 0, startW = 0, startH = 0;

      const onDown = (e) => {
        if (state.mode === MODES.FULLSCREEN) return;

        e.stopPropagation();
        e.preventDefault();

        const rect = panel.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        startW = rect.width;
        startH = rect.height;
        resizing = true;

        NS.Z.bringToFront(panel);

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      };

      const onMove = (e) => {
        if (!resizing) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        // Read actual min constraints from element or use defaults
        const computedStyle = window.getComputedStyle(panel);
        const minWidth = parseInt(computedStyle.minWidth) || 320;
        const minHeight = parseInt(computedStyle.minHeight) || 200;

        // Apply constraints
        const newW = Math.max(minWidth, Math.min(window.innerWidth * 0.9, startW + dx));
        const newH = Math.max(minHeight, Math.min(window.innerHeight * 0.9, startH + dy));

        panel.style.width = newW + 'px';
        panel.style.height = newH + 'px';

        state.size.w = newW;
        state.size.h = newH;
      };

      const onUp = () => {
        if (resizing) {
          resizing = false;
          this._saveState(state);
        }
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      handle.addEventListener('mousedown', onDown);
    },

    /* ---------- Responsive Layout ---------- */
    _makeResponsive(state) {
      const panel = state.element;
      const moduleId = state.moduleId;

      // Only apply responsive layout to control panels
      if (!moduleId || !moduleId.startsWith('control')) return;

      const body = panel.querySelector('.panel-body');
      if (!body) return;

      let lastLayout = null;

      const observer = new ResizeObserver(entries => {
        for (const entry of entries) {
          const width = entry.contentRect.width;

          // Determine layout
          let newLayout;
          if (width >= 380) {
            newLayout = 'layout-wide';
          } else if (width >= 280) {
            newLayout = 'layout-narrow';
          } else {
            newLayout = 'layout-compact';
          }

          // Only update classes if layout actually changed
          if (newLayout !== lastLayout) {
            body.classList.remove('layout-wide', 'layout-narrow', 'layout-compact');
            body.classList.add(newLayout);
            lastLayout = newLayout;
          }
        }
      });

      observer.observe(body);
      state.resizeObserver = observer;
    },

    /* ---------- Mode Controls ---------- */
    _addModeControls(state) {
      const panel = state.element;
      const header = panel.querySelector('.panel-header');
      if (!header) return;

      let actions = header.querySelector('.panel-actions');
      if (!actions) {
        actions = document.createElement('div');
        actions.className = 'panel-actions';
        header.appendChild(actions);
      }

      // Replace old knob with new mode controls
      const oldKnob = actions.querySelector('.knob');
      if (oldKnob) oldKnob.remove();

      // Create maximize button (goes at beginning)
      const maximizeBtn = document.createElement('button');
      maximizeBtn.className = 'btn-mode btn-maximize';
      maximizeBtn.title = 'Fullscreen';
      maximizeBtn.setAttribute('data-mode', 'fullscreen');
      maximizeBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <rect x="2" y="2" width="8" height="8" stroke="currentColor" stroke-width="1.5" fill="none"/>
        </svg>
      `;

      // Create close button (goes at end)
      const closeBtn = document.createElement('button');
      closeBtn.className = 'btn-mode btn-close';
      closeBtn.title = 'Close panel';
      closeBtn.setAttribute('data-mode', 'closed');
      closeBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <line x1="3" y1="3" x2="9" y2="9" stroke="currentColor" stroke-width="1.5"/>
          <line x1="9" y1="3" x2="3" y2="9" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      `;

      // Insert maximize at beginning, close at end
      actions.insertBefore(maximizeBtn, actions.firstChild);
      actions.appendChild(closeBtn);

      // Wire up maximize button
      maximizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (state.mode === MODES.FULLSCREEN) {
          // Toggle back to open
          this.setMode(state.id, MODES.OPEN);
        } else {
          this.setMode(state.id, 'fullscreen');
        }
      });

      // Wire up close button
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setMode(state.id, 'closed');
      });
    },

    /* ---------- FAB Integration ---------- */
    _updateFAB(state, isActive) {
      if (!state.fab) return;

      if (isActive) {
        state.fab.classList.add('fab--active');
      } else {
        state.fab.classList.remove('fab--active');
      }
    },

    setupFABs() {
      U.$all('.fab[data-module]').forEach(fab => {
        const moduleId = fab.getAttribute('data-module');
        const panelId = `panel-${moduleId}`;

        fab.addEventListener('click', () => {
          this.togglePanel(panelId);
        });
      });
    },

    /* ---------- Persistence ---------- */
    _saveState(state) {
      NS.StateManager.savePanelState(state.id, {
        mode: state.mode,
        position: state.position,
        size: state.size
      });
    },

    _loadState(state) {
      const saved = NS.StateManager.loadPanelState(state.id);
      if (!saved) return;

      // Restore position
      if (saved.position) {
        state.element.style.left = saved.position.x + 'px';
        state.element.style.top = saved.position.y + 'px';
        state.position = saved.position;
      }

      // Restore size (both width and height)
      if (saved.size && saved.size.w) {
        // Respect min constraints from element
        const computedStyle = window.getComputedStyle(state.element);
        const minWidth = parseInt(computedStyle.minWidth) || 320;
        const minHeight = parseInt(computedStyle.minHeight) || 200;

        // Clamp to valid range
        const validW = Math.max(minWidth, saved.size.w);
        const validH = saved.size.h ? Math.max(minHeight, saved.size.h) : null;

        state.element.style.width = validW + 'px';
        if (validH) {
          state.element.style.height = validH + 'px';
        }
        state.size = { w: validW, h: validH || 0 };
      }

      // Restore mode
      if (saved.mode) {
        // Delay mode restoration to ensure layout is ready
        setTimeout(() => this.setMode(state.id, saved.mode), 50);
      }
    },

    /* ---------- Initialize ---------- */
    init() {
      // Register all panels
      U.$all('.panel').forEach(panel => {
        this.register(panel);
      });

      // Setup FABs
      this.setupFABs();

      // Legacy open buttons (keep for backwards compat)
      U.$all('[data-open]').forEach(btn => {
        btn.addEventListener('click', () => {
          const panelId = btn.getAttribute('data-open').replace('#', '');
          this.setMode(panelId, MODES.OPEN);
        });
      });

      NS.Bus.emit('panel-manager:ready');
    }
  };

  NS.PanelManager = PanelManager;

})(window);
