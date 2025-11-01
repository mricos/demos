/**
 * FigureBridge.js
 *
 * Bridges ActiveFigure events to global event bus (CUI.Events or standalone).
 * Enables loose coupling between figures and documentation/UI components.
 *
 * Usage:
 *   const figure = new LIFNeuronFigure({ id: 'lif-bio', ... });
 *   FigureBridge.connect('lif-bio', figure);
 *
 *   // Elsewhere:
 *   CUI.Events.on('figure:lif-bio:spike', (data) => { ... });
 */

class FigureBridge {
  static connections = new Map();

  /**
   * Connect a figure to the event bus
   * @param {string} figureId - Unique identifier for the figure
   * @param {ActiveFigure} figure - Figure instance
   * @param {object} options - Bridge options
   */
  static connect(figureId, figure, options = {}) {
    const eventBus = this._getEventBus();
    if (!eventBus) {
      console.warn('[FigureBridge] No event bus available (CUI.Events not found)');
      return;
    }

    // Check if already connected
    if (this.connections.has(figureId)) {
      console.warn(`[FigureBridge] Figure ${figureId} already connected`);
      return;
    }

    const eventMap = options.eventMap || this._getDefaultEventMap();
    const prefix = options.prefix || 'figure';
    const unsubscribers = [];

    // Forward each figure event to event bus
    Object.entries(eventMap).forEach(([figureEvent, busEventName]) => {
      const handler = (data) => {
        const globalEvent = `${prefix}:${figureId}:${busEventName}`;
        eventBus.emit(globalEvent, {
          figureId,
          source: figure,
          ...data
        });
      };

      figure.on(figureEvent, handler);

      // Store unsubscriber
      unsubscribers.push(() => figure.off(figureEvent, handler));
    });

    // Store connection
    this.connections.set(figureId, {
      figure,
      unsubscribers
    });

    console.log(`[FigureBridge] Connected figure: ${figureId}`);
  }

  /**
   * Disconnect a figure from the event bus
   * @param {string} figureId - Figure identifier
   */
  static disconnect(figureId) {
    const connection = this.connections.get(figureId);
    if (!connection) {
      console.warn(`[FigureBridge] Figure ${figureId} not connected`);
      return;
    }

    // Unsubscribe all handlers
    connection.unsubscribers.forEach(unsub => unsub());

    // Remove connection
    this.connections.delete(figureId);

    console.log(`[FigureBridge] Disconnected figure: ${figureId}`);
  }

  /**
   * Disconnect all figures
   */
  static disconnectAll() {
    const figureIds = Array.from(this.connections.keys());
    figureIds.forEach(id => this.disconnect(id));
  }

  /**
   * Get default event mapping
   * Maps ActiveFigure event names to global event names
   * @private
   */
  static _getDefaultEventMap() {
    return {
      // Lifecycle events
      'initialized': 'initialized',
      'destroyed': 'destroyed',
      'show': 'show',
      'hide': 'hide',
      'focus': 'focus',
      'blur': 'blur',

      // Playback events
      'play': 'play',
      'pause': 'pause',
      'seek': 'seek',
      'ended': 'ended',
      'speedchange': 'speedchange',

      // Animation events
      'frame': 'frame',
      'timeupdate': 'timeupdate',
      'statechange': 'statechange',

      // Domain events (if figure emits them)
      'spike': 'spike',
      'threshold-reached': 'threshold-reached',
      'bitdetected': 'bitdetected',
      'term-highlight': 'term-highlight'
    };
  }

  /**
   * Enable auto-connect mode (stub for compatibility)
   */
  static enableAutoConnect() {
    console.log('FigureBridge: Auto-connect mode enabled');
    // In future: automatically connect all registered figures
  }

  /**
   * Get event bus (CUI.Events or fallback)
   * @private
   */
  static _getEventBus() {
    // Try CUI.Events first
    if (typeof window !== 'undefined' && window.CUI && window.CUI.Events) {
      return window.CUI.Events;
    }

    // Fallback to simple event bus
    if (!this._fallbackBus) {
      this._fallbackBus = this._createFallbackBus();
    }
    return this._fallbackBus;
  }

  /**
   * Create a simple fallback event bus
   * @private
   */
  static _createFallbackBus() {
    const listeners = {};

    return {
      on(event, callback) {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(callback);
      },

      off(event, callback) {
        if (!listeners[event]) return;
        listeners[event] = listeners[event].filter(cb => cb !== callback);
      },

      emit(event, data) {
        if (!listeners[event]) return;
        listeners[event].forEach(callback => callback(data));
      },

      once(event, callback) {
        const wrapper = (data) => {
          callback(data);
          this.off(event, wrapper);
        };
        this.on(event, wrapper);
      }
    };
  }
}

/**
 * Helper: Connect multiple figures at once
 * @param {object} figures - Map of { figureId: figureInstance }
 * @param {object} options - Bridge options
 */
FigureBridge.connectFigures = function(figures, options) {
  Object.entries(figures).forEach(([id, figure]) => {
    FigureBridge.connect(id, figure, options);
  });
}

/**
 * Helper: Create a specific event listener for a figure
 * @param {string} figureId - Figure identifier
 * @param {string} event - Event name (without prefix)
 * @param {function} callback - Event handler
 * @returns {function} Unsubscribe function
 */
FigureBridge.onFigureEvent = function(figureId, event, callback) {
  const eventBus = FigureBridge._getEventBus();
  const globalEvent = `figure:${figureId}:${event}`;

  eventBus.on(globalEvent, callback);

  // Return unsubscribe function
  return () => eventBus.off(globalEvent, callback);
}

// Make globally available
window.FigureBridge = FigureBridge;
