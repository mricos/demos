/**
 * ScrollPhase.js - Global view orchestrator for scroll-based visual transitions
 *
 * Implements ASDR-style envelope transitions for scrolling content:
 * - Attack: Item enters viewport
 * - Sustain: Item is in full view
 * - Decay: Item begins to exit
 * - Release: Item leaves viewport
 *
 * @author mricos
 * @version 1.0.0
 */

class ScrollPhase {
  constructor(options = {}) {
    this.options = {
      // Default ASDR thresholds (0.0 to 1.0)
      envelope: {
        attackEnd: 0.2,    // End of attack phase
        sustainStart: 0.4, // Start of sustain (full view)
        sustainEnd: 0.6,   // End of sustain
        decayEnd: 0.8      // End of decay phase
      },

      // Visual state presets
      states: {
        entering: { size: 'small', opacity: 0.3, pinned: null },
        rising: { size: 'small', opacity: 1, pinned: null },
        full: { size: 'full', opacity: 1, pinned: null },
        fading: { size: 'full', opacity: 0.6, pinned: null },
        exiting: { size: 'small', opacity: 0.3, pinned: null },
        pinnedTop: { size: 'small', opacity: 0.8, pinned: 'top' },
        pinnedBottom: { size: 'small', opacity: 0.8, pinned: 'bottom' }
      },

      // Callback hooks
      onStateChange: null,
      onPin: null,
      onUnpin: null,

      // Performance
      throttleMs: 16, // ~60fps
      useIntersectionObserver: true,

      // Debug
      debug: false,

      ...options
    };

    this.items = new Map(); // item ID -> item data
    this.rafId = null;
    this.lastScrollTime = 0;
    this.observers = new Map();

    this.init();
  }

  init() {
    if (this.options.useIntersectionObserver) {
      this.setupIntersectionObserver();
    } else {
      this.setupScrollListener();
    }

    if (this.options.debug) {
      this.injectDebugPanel();
    }
  }

  /**
   * Register an item for scroll phase tracking
   * @param {string} id - Unique identifier
   * @param {HTMLElement} element - DOM element to track
   * @param {object} customEnvelope - Optional custom ASDR envelope
   */
  register(id, element, customEnvelope = null) {
    const item = {
      id,
      element,
      envelope: customEnvelope || this.options.envelope,
      currentState: null,
      previousState: null,
      scrollRatio: 0,
      isVisible: false,
      isPinned: false
    };

    this.items.set(id, item);

    // Set initial state
    this.updateItemState(item);
    this.applyState(item);

    if (this.options.debug) {
      console.log(`[ScrollPhase] Registered: ${id}`, item);
    }

    return item;
  }

  /**
   * Unregister an item
   */
  unregister(id) {
    const item = this.items.get(id);
    if (item) {
      this.items.delete(id);
      if (this.observers.has(id)) {
        this.observers.get(id).disconnect();
        this.observers.delete(id);
      }
    }
  }

  /**
   * Setup IntersectionObserver for efficient viewport detection
   */
  setupIntersectionObserver() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const id = entry.target.dataset.scrollPhaseId;
          const item = this.items.get(id);
          if (item) {
            item.isVisible = entry.isIntersecting;
            if (entry.isIntersecting) {
              this.updateItemState(item);
              this.applyState(item);
            }
          }
        });
      },
      {
        root: null,
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
      }
    );

    this.globalObserver = observer;
  }

  /**
   * Setup fallback scroll listener
   */
  setupScrollListener() {
    const handleScroll = () => {
      const now = Date.now();
      if (now - this.lastScrollTime < this.options.throttleMs) {
        return;
      }
      this.lastScrollTime = now;

      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
      }

      this.rafId = requestAnimationFrame(() => {
        this.updateAllItems();
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    // Initial update
    this.updateAllItems();
  }

  /**
   * Update all registered items
   */
  updateAllItems() {
    this.items.forEach(item => {
      this.updateItemState(item);
      this.applyState(item);
    });
  }

  /**
   * Calculate scroll ratio and determine state for an item
   */
  updateItemState(item) {
    const rect = item.element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // Calculate center of item relative to viewport
    const itemCenter = rect.top + rect.height / 2;
    const scrollRatio = itemCenter / viewportHeight;

    item.scrollRatio = scrollRatio;
    item.previousState = item.currentState;

    // Determine state based on ASDR envelope
    const env = item.envelope;
    let newState = null;

    if (scrollRatio < 0) {
      // Above viewport - pinned top or exiting
      newState = scrollRatio < -0.5 ? 'exiting' : 'pinnedTop';
    } else if (scrollRatio <= env.attackEnd) {
      newState = 'entering';
    } else if (scrollRatio <= env.sustainStart) {
      newState = 'rising';
    } else if (scrollRatio <= env.sustainEnd) {
      newState = 'full';
    } else if (scrollRatio <= env.decayEnd) {
      newState = 'fading';
    } else if (scrollRatio <= 1.2) {
      newState = 'exiting';
    } else {
      // Below viewport - pinned bottom
      newState = 'pinnedBottom';
    }

    item.currentState = newState;

    // Check if state changed
    if (item.previousState !== item.currentState) {
      this.onItemStateChange(item);
    }

    return item;
  }

  /**
   * Apply visual state to item element
   */
  applyState(item) {
    const state = this.options.states[item.currentState];
    if (!state) return;

    const el = item.element;

    // Clear all state classes
    el.classList.remove('sp-entering', 'sp-rising', 'sp-full', 'sp-fading',
                        'sp-exiting', 'sp-pinned-top', 'sp-pinned-bottom');
    el.classList.remove('sp-size-full', 'sp-size-small');
    el.classList.remove('sp-pinned');

    // Add current state class
    el.classList.add(`sp-${item.currentState.toLowerCase().replace(/([A-Z])/g, '-$1').toLowerCase()}`);

    // Add size class
    el.classList.add(`sp-size-${state.size}`);

    // Handle opacity via CSS custom property
    el.style.setProperty('--sp-opacity', state.opacity);

    // Handle pinning
    if (state.pinned) {
      el.classList.add('sp-pinned', `sp-pinned-${state.pinned}`);
      if (!item.isPinned) {
        item.isPinned = true;
        if (this.options.onPin) {
          this.options.onPin(item, state.pinned);
        }
      }
    } else {
      if (item.isPinned) {
        item.isPinned = false;
        if (this.options.onUnpin) {
          this.options.onUnpin(item);
        }
      }
    }
  }

  /**
   * Handle state change event
   */
  onItemStateChange(item) {
    if (this.options.debug) {
      console.log(`[ScrollPhase] State change: ${item.id}`, {
        from: item.previousState,
        to: item.currentState,
        ratio: item.scrollRatio.toFixed(2)
      });
    }

    if (this.options.onStateChange) {
      this.options.onStateChange(item, item.previousState, item.currentState);
    }
  }

  /**
   * Get current state of an item
   */
  getState(id) {
    const item = this.items.get(id);
    return item ? {
      state: item.currentState,
      ratio: item.scrollRatio,
      isPinned: item.isPinned,
      isVisible: item.isVisible
    } : null;
  }

  /**
   * Manually set state for an item (override scroll calculation)
   */
  setState(id, stateName) {
    const item = this.items.get(id);
    if (item && this.options.states[stateName]) {
      item.currentState = stateName;
      this.applyState(item);
    }
  }

  /**
   * Update envelope thresholds for a specific item
   */
  setEnvelope(id, envelope) {
    const item = this.items.get(id);
    if (item) {
      item.envelope = { ...item.envelope, ...envelope };
      this.updateItemState(item);
      this.applyState(item);
    }
  }

  /**
   * Inject debug panel for development
   */
  injectDebugPanel() {
    const panel = document.createElement('div');
    panel.id = 'scroll-phase-debug';
    panel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.9);
      color: #0f0;
      padding: 10px;
      font-family: monospace;
      font-size: 11px;
      z-index: 10000;
      max-width: 300px;
      max-height: 400px;
      overflow-y: auto;
      border: 1px solid #0f0;
      border-radius: 4px;
    `;
    document.body.appendChild(panel);

    const updateDebug = () => {
      let html = '<strong>ScrollPhase Debug</strong><br>';
      html += `Items: ${this.items.size}<br><br>`;

      this.items.forEach(item => {
        html += `<div style="margin-bottom: 8px; padding: 4px; background: rgba(0, 255, 0, 0.1);">`;
        html += `<strong>${item.id}</strong><br>`;
        html += `State: ${item.currentState}<br>`;
        html += `Ratio: ${item.scrollRatio.toFixed(3)}<br>`;
        html += `Pinned: ${item.isPinned}<br>`;
        html += `Visible: ${item.isVisible}`;
        html += `</div>`;
      });

      panel.innerHTML = html;
    };

    // Update debug panel regularly
    setInterval(updateDebug, 100);
  }

  /**
   * Destroy instance and cleanup
   */
  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }

    if (this.globalObserver) {
      this.globalObserver.disconnect();
    }

    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.items.clear();

    const debugPanel = document.getElementById('scroll-phase-debug');
    if (debugPanel) {
      debugPanel.remove();
    }
  }
}

/**
 * Generate default CSS for ScrollPhase states
 * Call this once to inject base styles into your page
 */
ScrollPhase.injectCSS = function() {
  if (document.getElementById('scroll-phase-styles')) {
    return; // Already injected
  }

  const style = document.createElement('style');
  style.id = 'scroll-phase-styles';
  style.textContent = `
    /* ScrollPhase Base Styles */
    [data-scroll-phase] {
      transition: transform 0.3s ease-out,
                  opacity 0.3s ease-out,
                  filter 0.3s ease-out;
      opacity: var(--sp-opacity, 1);
    }

    /* Size variants */
    .sp-size-small {
      transform: scale(0.75);
    }

    .sp-size-full {
      transform: scale(1);
    }

    /* State-specific styles */
    .sp-entering {
      filter: blur(2px);
    }

    .sp-rising {
      filter: blur(0px);
    }

    .sp-full {
      filter: blur(0px);
    }

    .sp-fading {
      filter: blur(1px);
    }

    .sp-exiting {
      filter: blur(2px);
    }

    /* Pinning */
    .sp-pinned {
      position: sticky;
      z-index: 100;
    }

    .sp-pinned-top {
      top: 0;
    }

    .sp-pinned-bottom {
      bottom: 0;
    }

    /* Smooth scrolling */
    html {
      scroll-behavior: smooth;
    }
  `;

  document.head.appendChild(style);
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScrollPhase;
}
