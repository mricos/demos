/**
 * TwistorCursor: Advanced multicursor system for highlighting and state management
 * Supports cross-referencing between text, UI, and canvas elements
 */
class TwistorCursor {
    constructor(id, highlightKey, config = {}) {
        this.id = id;
        this.highlightKey = highlightKey;
        this.subscribers = new Set();
        this.visualHighlights = {
            canvas: [],
            ui: [],
            text: []
        };
        this.isActive = false;
        this.config = {
            autoAdjust: true,
            highlightDuration: 2000,
            ...config
        };
    }
    
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.unsubscribe(callback);
    }
    
    unsubscribe(callback) {
        this.subscribers.delete(callback);
    }
    
    activate(settings = {}) {
        this.isActive = true;
        this.settings = { ...this.config, ...settings };
        this.notify('activate');
        
        // Auto-deactivate after duration if specified
        if (this.settings.highlightDuration > 0) {
            this.deactivateTimer = setTimeout(() => {
                this.deactivate();
            }, this.settings.highlightDuration);
        }
    }
    
    deactivate() {
        if (this.deactivateTimer) {
            clearTimeout(this.deactivateTimer);
            this.deactivateTimer = null;
        }
        
        this.isActive = false;
        this.notify('deactivate');
    }
    
    notify(action, data = {}) {
        this.subscribers.forEach(callback => callback(this, action, data));
    }
    
    addHighlight(type, element) {
        if (!this.visualHighlights[type]) {
            this.visualHighlights[type] = [];
        }
        this.visualHighlights[type].push(element);
    }
    
    getHighlights(type) {
        return this.visualHighlights[type] || [];
    }
}

/**
 * CursorManager: Centralized pub-sub system for managing all cursors
 * Supports multiple active cursors and complex interaction patterns
 */
class CursorManager {
    constructor() {
        this.cursors = new Map();
        this.activeCursors = new Set();
        this.globalSubscribers = new Set();
        this.exclusiveMode = true; // Only one cursor active at a time by default
    }
    
    createCursor(id, highlightKey, config = {}) {
        const cursor = new TwistorCursor(id, highlightKey, config);
        this.cursors.set(id, cursor);
        
        // Subscribe to cursor events
        cursor.subscribe((cursor, action, data) => {
            this.handleCursorEvent(cursor, action, data);
        });
        
        return cursor;
    }
    
    getCursor(id) {
        return this.cursors.get(id);
    }
    
    activateCursor(id, settings = {}) {
        const cursor = this.getCursor(id);
        if (!cursor) return;
        
        // In exclusive mode, deactivate other cursors
        if (this.exclusiveMode) {
            this.deactivateAll();
        }
        
        this.activeCursors.add(cursor);
        cursor.activate(settings);
        
        this.notifyGlobal('cursorActivated', { cursor, settings });
    }
    
    deactivateCursor(id) {
        const cursor = this.getCursor(id);
        if (!cursor) return;
        
        this.activeCursors.delete(cursor);
        cursor.deactivate();
        
        this.notifyGlobal('cursorDeactivated', { cursor });
    }
    
    deactivateAll() {
        const cursorsToDeactivate = Array.from(this.activeCursors);
        cursorsToDeactivate.forEach(cursor => {
            this.activeCursors.delete(cursor);
            cursor.deactivate();
        });
        
        this.notifyGlobal('allCursorsDeactivated', {});
    }
    
    toggleCursor(id, settings = {}) {
        const cursor = this.getCursor(id);
        if (!cursor) return;
        
        if (cursor.isActive) {
            this.deactivateCursor(id);
        } else {
            this.activateCursor(id, settings);
        }
    }
    
    setExclusiveMode(exclusive) {
        this.exclusiveMode = exclusive;
        if (exclusive && this.activeCursors.size > 1) {
            // Keep only the first active cursor
            const firstCursor = this.activeCursors.values().next().value;
            this.deactivateAll();
            this.activeCursors.add(firstCursor);
            firstCursor.activate();
        }
    }
    
    handleCursorEvent(cursor, action, data) {
        // Handle cursor-specific logic here
        this.notifyGlobal(`cursor${action.charAt(0).toUpperCase() + action.slice(1)}`, 
            { cursor, action, data });
    }
    
    subscribeGlobal(callback) {
        this.globalSubscribers.add(callback);
        return () => this.globalSubscribers.delete(callback);
    }
    
    notifyGlobal(event, data) {
        this.globalSubscribers.forEach(callback => callback(event, data));
    }
    
    getActiveCursors() {
        return Array.from(this.activeCursors);
    }
    
    isActive(id) {
        const cursor = this.getCursor(id);
        return cursor ? cursor.isActive : false;
    }
    
    // Utility method to create cursors from configuration
    createCursorsFromConfig(configs) {
        configs.forEach(config => {
            this.createCursor(config.id, config.highlightKey, config.options || {});
        });
    }
    
    destroy() {
        this.deactivateAll();
        this.cursors.clear();
        this.globalSubscribers.clear();
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TwistorCursor, CursorManager };
}