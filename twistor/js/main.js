/**
 * Main Entry Point: Penrose Twistor Theory Science Exploration Tool
 * Orchestrates all components and initializes the complete system
 */

class TwistorExplorationTool {
    constructor() {
        this.sceneManager = null;
        this.isInitialized = false;
        
        this.config = {
            canvasId: 'twistorCanvas',
            controlsId: 'twistorControls'
        };
    }
    
    async initialize() {
        if (this.isInitialized) return;
        
        console.log('Initializing Penrose Twistor Exploration Tool...');
        
        try {
            // Create scene manager
            this.sceneManager = new SceneManager({
                viewCanvasId: this.config.canvasId,
                controlsContainerId: this.config.controlsId
            });
            
            // Register all scenes
            this.registerScenes();
            
            // Setup additional interactions
            this.setupGlobalInteractions();
            
            // Setup resize handling
            this.setupResizeHandler();
            
            this.isInitialized = true;
            console.log('Twistor Exploration Tool initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Twistor Exploration Tool:', error);
            this.showErrorMessage(error);
        }
    }
    
    registerScenes() {
        // Create and register Scene 1: Fundamentals
        const fundamentalsScene = new FundamentalsScene();
        this.sceneManager.registerScene(fundamentalsScene);
        
        // Create and register Scene 2: Fibering
        const fiberingScene = new FiberingScene();
        this.sceneManager.registerScene(fiberingScene);
        
        // Create and register Scene 3: Transform
        const transformScene = new TransformScene();
        this.sceneManager.registerScene(transformScene);
        
        // Create and register Scene 4: Tool Guide
        const toolGuideScene = new ToolGuideScene();
        this.sceneManager.registerScene(toolGuideScene);
        
        console.log('All scenes registered successfully');
    }
    
    setupGlobalInteractions() {
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcut(e);
        });
        
        // Global mouse interactions for enhanced cursor system
        document.addEventListener('mouseover', (e) => {
            if (e.target.classList.contains('twistor-term')) {
                this.showTermTooltip(e.target);
            }
        });
        
        document.addEventListener('mouseout', (e) => {
            if (e.target.classList.contains('twistor-term')) {
                this.hideTermTooltip();
            }
        });
        
        // Enhanced section header interactions
        this.setupEnhancedNavigation();
    }
    
    setupEnhancedNavigation() {
        document.querySelectorAll('.section-header').forEach(header => {
            // Add scene transition effects
            header.addEventListener('mouseenter', () => {
                header.style.transform = 'translateY(-2px)';
                header.style.boxShadow = '0 4px 12px rgba(52, 152, 219, 0.3)';
            });
            
            header.addEventListener('mouseleave', () => {
                header.style.transform = '';
                header.style.boxShadow = '';
            });
        });
    }
    
    handleKeyboardShortcut(e) {
        // Global keyboard shortcuts for power users
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case '1':
                    e.preventDefault();
                    this.switchToScene('fundamentals');
                    break;
                case '2':
                    e.preventDefault();
                    this.switchToScene('fibering');
                    break;
                case '3':
                    e.preventDefault();
                    this.switchToScene('transform');
                    break;
                case '4':
                    e.preventDefault();
                    this.switchToScene('tool-guide');
                    break;
                case 'r':
                    e.preventDefault();
                    this.resetCurrentScene();
                    break;
                case ' ':
                    e.preventDefault();
                    this.togglePause();
                    break;
            }
        }
        
        // Escape key to deactivate all cursors
        if (e.key === 'Escape') {
            this.sceneManager?.cursorManager?.deactivateAll();
        }
    }
    
    switchToScene(sceneId) {
        if (this.sceneManager) {
            this.sceneManager.switchToScene(sceneId);
        }
    }
    
    resetCurrentScene() {
        const currentScene = this.sceneManager?.getCurrentScene();
        if (currentScene) {
            currentScene.reset();
        }
    }
    
    togglePause() {
        const currentScene = this.sceneManager?.getCurrentScene();
        if (currentScene) {
            currentScene.togglePause();
        }
    }
    
    showTermTooltip(element) {
        const highlightKey = element.getAttribute('data-highlight');
        if (!highlightKey) return;
        
        // Create or update tooltip
        let tooltip = document.getElementById('twistor-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'twistor-tooltip';
            tooltip.className = 'twistor-tooltip';
            document.body.appendChild(tooltip);
        }
        
        // Set tooltip content based on highlight key
        const tooltipContent = this.getTooltipContent(highlightKey);
        tooltip.innerHTML = tooltipContent;
        
        // Position tooltip
        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + 'px';
        tooltip.style.top = (rect.bottom + 10) + 'px';
        tooltip.style.display = 'block';
    }
    
    hideTermTooltip() {
        const tooltip = document.getElementById('twistor-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }
    
    getTooltipContent(highlightKey) {
        const tooltips = {
            'twistor-objects': 'Geometric objects encoding spin and momentum of massless particles',
            'spinor-geometry': 'Two-component spinor structure fundamental to quantum field theory',
            'positive-freq': 'Positive frequency modes corresponding to particles (+ω)',
            'negative-freq': 'Negative frequency modes corresponding to antiparticles (-ω)',
            'frequency-split': 'Fundamental splitting of spinor fields into ±ω components',
            'clifford-hopf': 'Geometric fibering connecting spinor space to projective twistor space',
            'null-flags': 'Geometric structures in spinor space representing null directions',
            'holomorphic-transforms': 'Complex analytic transformations in twistor space',
            'penrose-transform': 'Mathematical bridge between twistor functions and spacetime fields',
            'twistor-functions': 'Holomorphic functions living in projective twistor space',
            'bi-twistors': 'Extended twistor structures for more general field configurations',
            'split-octonions': 'Algebraic structures underlying twistor geometry'
        };
        
        return tooltips[highlightKey] || 'Click to explore this concept';
    }
    
    setupResizeHandler() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (this.sceneManager) {
                    this.sceneManager.handleResize();
                }
            }, 250);
        });
    }
    
    showErrorMessage(error) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <h3>Initialization Error</h3>
            <p>Failed to load the Twistor Exploration Tool: ${error.message}</p>
            <p>Please refresh the page and try again.</p>
        `;
        
        document.body.insertBefore(errorDiv, document.body.firstChild);
    }
    
    // Utility method to get current status
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            sceneManager: this.sceneManager?.getStatus() || null,
            version: '1.0.0'
        };
    }
    
    // Method to export current state for sharing/bookmarking
    exportState() {
        if (!this.sceneManager) return null;
        
        const currentScene = this.sceneManager.getCurrentScene();
        const state = {
            sceneId: currentScene?.id || null,
            parameters: currentScene?.controls?.getAllValues() || {},
            timestamp: Date.now()
        };
        
        return btoa(JSON.stringify(state));
    }
    
    // Method to import state from exported string
    importState(stateString) {
        try {
            const state = JSON.parse(atob(stateString));
            
            if (state.sceneId) {
                this.switchToScene(state.sceneId);
                
                // Wait for scene to initialize, then set parameters
                setTimeout(() => {
                    const currentScene = this.sceneManager.getCurrentScene();
                    if (currentScene && currentScene.controls) {
                        currentScene.controls.setValues(state.parameters);
                    }
                }, 500);
            }
            
            return true;
        } catch (error) {
            console.error('Failed to import state:', error);
            return false;
        }
    }
    
    // Cleanup method
    destroy() {
        if (this.sceneManager) {
            this.sceneManager.destroy();
        }
        
        // Remove global event listeners
        document.removeEventListener('keydown', this.handleKeyboardShortcut);
        
        // Remove tooltip
        const tooltip = document.getElementById('twistor-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
        
        this.isInitialized = false;
    }
}

// Global instance
let twistorTool;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        twistorTool = new TwistorExplorationTool();
        await twistorTool.initialize();
        
        // Make tool globally accessible for debugging
        window.twistorTool = twistorTool;
        
        // Add keyboard shortcut help
        console.log(`
Twistor Exploration Tool - Keyboard Shortcuts:
• Ctrl/Cmd + 1-4: Switch between scenes
• Ctrl/Cmd + R: Reset current scene
• Ctrl/Cmd + Space: Toggle pause
• Escape: Deactivate all cursors
        `);
        
    } catch (error) {
        console.error('Failed to start Twistor Exploration Tool:', error);
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (twistorTool) {
        twistorTool.destroy();
    }
});