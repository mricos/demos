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
    
    // Auto-activate cursor based on control interaction
    autoActivateCursorFromControl(controlId, controlValue) {
        // Map control IDs to related cursors
        const controlToCursorMap = {
            'spinorPhase': 'positive-freq',
            'frequencySplit': 'frequency-split',
            'spinorAmplitude': 'spinor-components',
            'positiveFreqColor': 'positive-freq',
            'negativeFreqColor': 'negative-freq',
            'complexityLevel': 'spinor-components',
            'harmonics': 'frequency-patterns',
            'fiberParam': 'clifford-hopf',
            'nullFlagRange': 'null-flags',
            'fiberDensity': 'holomorphic-transforms',
            'geometricTension': 'bi-twistors',
            'twistorLevels': 'bi-twistors',
            'transformComplexity': 'penrose-transform',
            'holomorphicDepth': 'twistor-functions',
            'spacetimeMapping': 'geometric-evolution',
            'projectionRange': 'holomorphic-transforms',
            'functionLevels': 'twistor-functions'
        };
        
        const relatedCursorKey = controlToCursorMap[controlId];
        if (relatedCursorKey) {
            // Briefly activate the related cursor to show connection
            this.activateCursor(relatedCursorKey, { highlightDuration: 1500 });
            
            // Auto-adjust related controls if applicable
            this.autoAdjustRelatedControls(controlId, controlValue, relatedCursorKey);
        }
    }
    
    // Auto-adjust related controls based on cursor activation
    autoAdjustRelatedControls(sourceControlId, sourceValue, cursorKey) {
        const currentScene = window.twistorTool?.sceneManager?.getCurrentScene();
        if (!currentScene || !currentScene.controls) return;
        
        // Define control relationships and adjustment logic
        const controlRelationships = {
            'spinorPhase': {
                'spinorAmplitude': (phaseValue) => Math.abs(Math.sin(phaseValue)) * 1.5,
                'complexityLevel': (phaseValue) => Math.floor(Math.abs(phaseValue) / Math.PI * 4) + 1
            },
            'frequencySplit': {
                'spinorPhase': (splitValue) => {
                    if (typeof splitValue === 'object') {
                        return (splitValue.max - splitValue.min) * Math.PI;
                    }
                    return splitValue * Math.PI;
                }
            },
            'fiberParam': {
                'geometricTension': (fiberValue) => fiberValue * 2.4,
                'fiberDensity': (fiberValue) => Math.floor(fiberValue * 8) + 4
            },
            'transformComplexity': {
                'holomorphicDepth': (complexityValue) => Math.floor(complexityValue * 2) + 2,
                'spacetimeMapping': (complexityValue) => complexityValue * 0.8
            }
        };
        
        const relationships = controlRelationships[sourceControlId];
        if (relationships) {
            Object.entries(relationships).forEach(([targetControlId, adjustmentFn]) => {
                const targetValue = adjustmentFn(sourceValue);
                
                // Animate to the new value with a small delay
                setTimeout(() => {
                    currentScene.controls.animateToValue(targetControlId, targetValue, 800);
                }, 300);
            });
        }
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
        // Handle visual highlighting based on cursor events
        if (action === 'activate') {
            this.highlightRelatedElements(cursor.highlightKey, true);
        } else if (action === 'deactivate') {
            this.highlightRelatedElements(cursor.highlightKey, false);
        }
        
        // Handle cursor-specific logic here
        this.notifyGlobal(`cursor${action.charAt(0).toUpperCase() + action.slice(1)}`, 
            { cursor, action, data });
    }
    
    highlightRelatedElements(highlightKey, highlight) {
        // Highlight text elements
        document.querySelectorAll(`[data-highlight="${highlightKey}"]`).forEach(el => {
            if (highlight) {
                el.classList.add('highlighted');
                this.addGlowEffect(el);
            } else {
                el.classList.remove('highlighted');
                this.removeGlowEffect(el);
            }
        });
        
        // Highlight related controls
        this.highlightRelatedControls(highlightKey, highlight);
        
        // Highlight scene objects
        this.highlightSceneObjects(highlightKey, highlight);
        
        // Create visual connections
        if (highlight) {
            this.createVisualConnections(highlightKey);
        } else {
            this.removeVisualConnections();
        }
    }
    
    highlightSceneObjects(highlightKey, highlight) {
        // Map highlight keys to scene object types (matching actual scene implementations)
        const objectMappings = {
            'twistor-objects': ['two-component-spinor', 'clifford-hopf-fiber', 'twistor-space-projection'],
            'spinor-geometry': ['two-component-spinor'],
            'positive-freq': ['two-component-spinor'], // positive frequency component
            'negative-freq': ['two-component-spinor'], // negative frequency component  
            'frequency-split': ['two-component-spinor'],
            'clifford-hopf': ['clifford-hopf-fiber'],
            'null-flags': ['null-flag-structure'],
            'spinor-components': ['two-component-spinor'],
            'holomorphic-transforms': ['twistor-space-projection'],
            'penrose-transform': ['twistor-space-projection', 'penrose-transform'],
            'twistor-functions': ['twistor-space-projection'],
            'bi-twistors': ['two-component-spinor', 'clifford-hopf-fiber'],
            'split-octonions': ['clifford-hopf-fiber', 'null-flag-structure'],
            'geometric-evolution': ['clifford-hopf-fiber', 'twistor-space-projection'],
            'rotation-axes': ['two-component-spinor', 'clifford-hopf-fiber'],
            'frequency-patterns': ['two-component-spinor'],
            'spacetime': ['twistor-space-projection'],
            'projective-twistor': ['twistor-space-projection'],
            'spinor-space': ['two-component-spinor']
        };
        
        const relatedObjects = objectMappings[highlightKey] || [];
        
        // Get current scene and highlight objects through view
        const currentScene = window.twistorTool?.sceneManager?.getCurrentScene();
        if (currentScene && currentScene.view) {
            currentScene.view.highlightObjects(relatedObjects, highlight);
        }
    }
    
    highlightRelatedControls(highlightKey, highlight) {
        // Enhanced mapping including new widget types
        const controlMappings = {
            'positive-freq': ['spinorPhase', 'positiveFreqColor', 'frequencySplit'],
            'negative-freq': ['negativeFreqColor', 'frequencySplit'],
            'frequency-split': ['frequencySplit', 'harmonics'],
            'clifford-hopf': ['fiberParam', 'fiberColor', 'twistorLevels'],
            'null-flags': ['nullFlagRange', 'flagColor'],
            'spinor-components': ['spinorPhase', 'spinorAmplitude', 'complexityLevel'],
            'twistor-objects': ['complexityLevel', 'twistorLevels'],
            'holomorphic-transforms': ['fiberDensity', 'projectionRange'],
            'penrose-transform': ['transformComplexity', 'transformView'],
            'twistor-functions': ['holomorphicDepth', 'functionLevels'],
            'geometric-evolution': ['spacetimeMapping', 'geometricTension'],
            'bi-twistors': ['geometricTension', 'twistorLevels'],
            'spacetime': ['spacetimeMapping', 'spacetimeColor'],
            'projective-twistor': ['twistorColor', 'projectionRange'],
            'spinor-space': ['spinorPhase', 'spinorAmplitude'],
            'frequency-patterns': ['harmonics', 'frequencySplit']
        };
        
        const relatedControls = controlMappings[highlightKey] || [];
        
        relatedControls.forEach(controlId => {
            // Find control element by searching all possible widget types
            const controlElement = this.findControlElement(controlId);
            const controlGroup = controlElement?.closest('.control-group');
            
            if (controlGroup) {
                if (highlight) {
                    controlGroup.classList.add('control-highlighted');
                    this.addControlGlow(controlGroup);
                    this.addControlPulse(controlGroup);
                } else {
                    controlGroup.classList.remove('control-highlighted');
                    this.removeControlGlow(controlGroup);
                    this.removeControlPulse(controlGroup);
                }
            }
        });
    }
    
    // Find control element across different widget types
    findControlElement(controlId) {
        // Try different possible selectors for new widget types
        const selectors = [
            `#${controlId}`,
            `[data-control-id="${controlId}"]`,
            `.control-group:has(#${controlId})`,
            `.control-group:has([data-control-id="${controlId}"])`
        ];
        
        for (const selector of selectors) {
            try {
                const element = document.querySelector(selector);
                if (element) return element;
            } catch (e) {
                // Skip invalid selectors
            }
        }
        
        // Fallback: search by control ID in any input, button, or select element
        return document.querySelector(`input[id="${controlId}"], select[id="${controlId}"], button[id="${controlId}"]`);
    }
    
    // Add pulsing animation to controls
    addControlPulse(controlGroup) {
        // Find the main interactive element (slider, knob, etc.)
        const interactiveElement = controlGroup.querySelector('input, .knob, .stepper-container, .multihandle-track');
        if (interactiveElement) {
            interactiveElement.style.animation = 'controlPulse 1.5s ease-in-out 3';
        }
    }
    
    // Remove pulsing animation
    removeControlPulse(controlGroup) {
        const interactiveElement = controlGroup.querySelector('input, .knob, .stepper-container, .multihandle-track');
        if (interactiveElement) {
            interactiveElement.style.animation = '';
        }
    }
    
    addGlowEffect(element) {
        element.style.boxShadow = '0 0 15px rgba(243, 156, 18, 0.6)';
        element.style.transform = 'scale(1.05)';
        element.style.zIndex = '1000';
    }
    
    removeGlowEffect(element) {
        element.style.boxShadow = '';
        element.style.transform = '';
        element.style.zIndex = '';
    }
    
    addControlGlow(controlGroup) {
        controlGroup.style.background = 'linear-gradient(135deg, rgba(52, 152, 219, 0.1), rgba(46, 204, 113, 0.1))';
        controlGroup.style.border = '2px solid #3498db';
        controlGroup.style.borderRadius = '8px';
        controlGroup.style.boxShadow = '0 4px 16px rgba(52, 152, 219, 0.3)';
        controlGroup.style.transform = 'translateY(-2px)';
        controlGroup.style.transition = 'all 0.3s ease';
    }
    
    removeControlGlow(controlGroup) {
        controlGroup.style.background = '';
        controlGroup.style.border = '';
        controlGroup.style.borderRadius = '';
        controlGroup.style.boxShadow = '';
        controlGroup.style.transform = '';
    }
    
    createVisualConnections(highlightKey) {
        // Create animated connection lines between text and controls
        this.removeVisualConnections(); // Clear existing
        
        const textElements = document.querySelectorAll(`[data-highlight="${highlightKey}"]`);
        const relatedControls = document.querySelectorAll('.control-highlighted');
        
        if (textElements.length > 0 && relatedControls.length > 0) {
            this.drawConnectionLines(textElements, relatedControls);
        }
    }
    
    removeVisualConnections() {
        const existingLines = document.querySelectorAll('.connection-line');
        existingLines.forEach(line => line.remove());
    }
    
    drawConnectionLines(textElements, controlElements) {
        // Create SVG overlay for connection lines
        let svgOverlay = document.getElementById('connection-overlay');
        if (!svgOverlay) {
            svgOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svgOverlay.id = 'connection-overlay';
            svgOverlay.style.position = 'fixed';
            svgOverlay.style.top = '0';
            svgOverlay.style.left = '0';
            svgOverlay.style.width = '100%';
            svgOverlay.style.height = '100%';
            svgOverlay.style.pointerEvents = 'none';
            svgOverlay.style.zIndex = '999';
            document.body.appendChild(svgOverlay);
        }
        
        // Draw lines between text elements and controls
        textElements.forEach(textEl => {
            controlElements.forEach(controlEl => {
                this.drawConnectionLine(svgOverlay, textEl, controlEl);
            });
        });
    }
    
    drawConnectionLine(svg, fromElement, toElement) {
        const fromRect = fromElement.getBoundingClientRect();
        const toRect = toElement.getBoundingClientRect();
        
        const fromX = fromRect.left + fromRect.width / 2;
        const fromY = fromRect.top + fromRect.height / 2;
        const toX = toRect.left + toRect.width / 2;
        const toY = toRect.top + toRect.height / 2;
        
        // Create animated line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.classList.add('connection-line');
        line.setAttribute('x1', fromX);
        line.setAttribute('y1', fromY);
        line.setAttribute('x2', toX);
        line.setAttribute('y2', toY);
        line.setAttribute('stroke', '#f39c12');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '5,5');
        line.style.opacity = '0.7';
        line.style.animation = 'connectionPulse 2s ease-in-out infinite';
        
        svg.appendChild(line);
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