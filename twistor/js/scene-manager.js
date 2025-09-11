/**
 * Scene Management System: Coordinates View, Controls, and Cursor interactions
 * Each scene represents a different aspect of twistor theory with unique geometry and controls
 */

/**
 * Base Scene class - all scenes extend this
 */
class TwistorScene {
    constructor(id, config = {}) {
        this.id = id;
        this.name = config.name || id;
        this.description = config.description || '';
        
        // Scene state
        this.isActive = false;
        this.isInitialized = false;
        this.animationTime = 0;
        this.parameters = new Map();
        
        // Components (will be injected by scene manager)
        this.view = null;
        this.controls = null;
        this.cursorManager = null;
        
        // Scene-specific configuration
        this.config = {
            // Default rotor dynamics
            rotationEnabled: true,
            rotationSpeed: 0.008,
            
            // View configuration
            viewConfig: {
                showAxes: true,
                showGrid: false,
                backgroundColor: '#f8f9fa',
                cameraDistance: 400
            },
            
            // Controls configuration
            controlsConfig: [],
            
            // Cursor configuration
            cursors: [],
            
            ...config
        };
        
        // Rotor for 3D transformations
        this.rotor = new Rotor(1, 0, 0, 0);
        
        // Animation state
        this.lastTime = 0;
        this.animationId = null;
    }
    
    // Initialize the scene (called when first activated)
    async initialize(view, controls, cursorManager) {
        if (this.isInitialized) return;
        
        this.view = view;
        this.controls = controls;
        this.cursorManager = cursorManager;
        
        // Setup view configuration
        this.view.updateConfig(this.config.viewConfig);
        
        // Setup controls
        this.setupControls();
        
        // Setup cursors
        this.setupCursors();
        
        // Initialize scene-specific content
        await this.initializeScene();
        
        this.isInitialized = true;
    }
    
    // Setup controls for this scene
    setupControls() {
        console.log(`Setting up controls for scene: ${this.id}`);
        console.log(`Controls config:`, this.config.controlsConfig);
        
        // Load scene-specific controls
        if (this.config.controlsConfig.length > 0) {
            this.controls.loadControlsConfig(this.config.controlsConfig);
        }
        
        // Setup base control listeners
        this.controls.addEventListener('rotationToggle', (value) => {
            this.config.rotationEnabled = value;
        });
        
        this.controls.addEventListener('resetBtn', () => {
            this.reset();
        });
        
        this.controls.addEventListener('pauseBtn', () => {
            this.togglePause();
        });
        
        // Setup parameter listeners for this scene
        this.setupParameterListeners();
    }
    
    // Setup cursors for this scene
    setupCursors() {
        // Create scene-specific cursors
        this.config.cursors.forEach(cursorConfig => {
            const cursor = this.cursorManager.createCursor(
                cursorConfig.id, 
                cursorConfig.highlightKey, 
                cursorConfig.options
            );
            
            // Subscribe to cursor events for this scene
            cursor.subscribe((cursor, action) => {
                this.handleCursorEvent(cursor, action);
            });
        });
    }
    
    // Handle cursor events (override in subclasses)
    handleCursorEvent(cursor, action) {
        if (action === 'activate') {
            this.onCursorActivated(cursor);
        } else if (action === 'deactivate') {
            this.onCursorDeactivated(cursor);
        }
    }
    
    // Scene-specific initialization (override in subclasses)
    async initializeScene() {
        // Override in subclasses
    }
    
    // Setup parameter listeners (override in subclasses)
    setupParameterListeners() {
        // Override in subclasses to add specific parameter handling
    }
    
    // Cursor event handlers (override in subclasses)
    onCursorActivated(cursor) {
        // Override in subclasses
        console.log(`Cursor activated in scene ${this.id}:`, cursor.highlightKey);
    }
    
    onCursorDeactivated(cursor) {
        // Override in subclasses
        console.log(`Cursor deactivated in scene ${this.id}:`, cursor.highlightKey);
    }
    
    // Activate this scene
    async activate() {
        if (this.isActive) return;
        
        console.log(`Activating scene: ${this.id}`);
        this.isActive = true;
        
        // Reload controls for this scene
        if (this.controls && this.config.controlsConfig.length > 0) {
            console.log(`Reloading controls for scene: ${this.id}`);
            this.controls.loadControlsConfig(this.config.controlsConfig);
            this.setupParameterListeners();
        }
        
        // Update view with scene objects
        this.view.clearObjects();
        this.populateScene();
        
        // Update view configuration
        this.view.updateConfig(this.config.viewConfig);
        
        // Start animation loop
        this.startAnimation();
        
        // Notify scene activation
        this.onActivate();
    }
    
    // Deactivate this scene
    async deactivate() {
        if (!this.isActive) return;
        
        this.isActive = false;
        
        // Stop animation
        this.stopAnimation();
        
        // Deactivate all cursors
        this.cursorManager.deactivateAll();
        
        // Notify scene deactivation
        this.onDeactivate();
    }
    
    // Scene activation hook (override in subclasses)
    onActivate() {
        console.log(`Scene ${this.id} activated`);
    }
    
    // Scene deactivation hook (override in subclasses)
    onDeactivate() {
        console.log(`Scene ${this.id} deactivated`);
    }
    
    // Populate scene with objects (override in subclasses)
    populateScene() {
        // Override in subclasses to add scene-specific objects
    }
    
    // Update scene animation
    updateAnimation(deltaTime) {
        if (!this.config.rotationEnabled) return;
        
        // Update time
        this.animationTime += deltaTime * this.config.rotationSpeed;
        
        // Update rotor based on scene-specific logic
        this.updateRotor(deltaTime);
        
        // Update view rotor
        this.view.setRotor(this.rotor);
        this.view.updateAnimation(this.animationTime);
    }
    
    // Update rotor (override in subclasses for different rotation dynamics)
    updateRotor(deltaTime) {
        // Default rotation behavior - override in subclasses
        const angularVelocity = new Bivector(0.5, 0.3, 1.0);
        const deltaRotor = angularVelocity.toRotor(deltaTime * 0.5);
        this.rotor = this.rotor.multiply(deltaRotor);
        this.rotor.normalize();
    }
    
    // Render scene
    render() {
        if (!this.isActive) return;
        
        const parameters = this.controls.getAllValues();
        this.view.render(parameters);
    }
    
    // Start animation loop
    startAnimation() {
        if (this.animationId) return;
        
        const animate = (currentTime) => {
            if (!this.isActive) return;
            
            const deltaTime = (currentTime - this.lastTime) * 0.001; // Convert to seconds
            this.lastTime = currentTime;
            
            if (deltaTime > 0 && deltaTime < 0.1) { // Prevent large jumps
                this.updateAnimation(deltaTime);
            }
            
            this.render();
            
            this.animationId = requestAnimationFrame(animate);
        };
        
        this.lastTime = performance.now();
        this.animationId = requestAnimationFrame(animate);
    }
    
    // Stop animation loop
    stopAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    // Reset scene
    reset() {
        this.animationTime = 0;
        this.rotor = new Rotor(1, 0, 0, 0);
        this.controls.reset();
        this.cursorManager.deactivateAll();
        
        // Reset scene-specific state
        this.onReset();
    }
    
    // Scene reset hook (override in subclasses)
    onReset() {
        console.log(`Scene ${this.id} reset`);
    }
    
    // Toggle pause
    togglePause() {
        this.config.rotationEnabled = !this.config.rotationEnabled;
        this.controls.setValue('rotationToggle', this.config.rotationEnabled);
        
        const pauseBtn = this.controls.getElement('pauseBtn');
        if (pauseBtn) {
            pauseBtn.textContent = this.config.rotationEnabled ? 'Pause' : 'Resume';
        }
    }
    
    // Get scene information
    getInfo() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            isActive: this.isActive,
            isInitialized: this.isInitialized
        };
    }
    
    // Cleanup scene
    destroy() {
        this.deactivate();
        
        if (this.controls) {
            this.controls.destroy();
        }
        
        this.view = null;
        this.controls = null;
        this.cursorManager = null;
    }
}

/**
 * SceneManager: Manages multiple scenes and transitions between them
 */
class SceneManager {
    constructor(config = {}) {
        this.config = {
            viewCanvasId: 'twistorCanvas',
            controlsContainerId: 'twistorControls',
            transitionDuration: 500,
            ...config
        };
        
        this.scenes = new Map();
        this.currentScene = null;
        this.isTransitioning = false;
        
        // Initialize core components
        this.initializeComponents();
        
        // Setup scene navigation
        this.setupNavigation();
    }
    
    // Initialize core components
    initializeComponents() {
        // Initialize cursor manager
        this.cursorManager = new CursorManager();
        
        // Initialize view
        this.view = new TwistorView(this.config.viewCanvasId);
        
        // Initialize controls
        this.controls = new TwistorControls(this.config.controlsContainerId);
        
        // Setup twistor term interactions
        this.setupTwistorTerms();
    }
    
    // Setup twistor term click interactions
    setupTwistorTerms() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('twistor-term')) {
                const highlightKey = e.target.getAttribute('data-highlight');
                if (highlightKey) {
                    this.cursorManager.toggleCursor(highlightKey);
                }
            }
        });
    }
    
    // Setup scene navigation
    setupNavigation() {
        // Use setTimeout to ensure DOM elements are ready
        setTimeout(() => {
            document.querySelectorAll('.section-header').forEach(header => {
                header.addEventListener('click', (e) => {
                    const sectionId = header.getAttribute('data-section');
                    console.log('Section header clicked:', sectionId);
                    
                    if (sectionId && this.scenes.has(sectionId)) {
                        this.switchToScene(sectionId);
                    }
                    
                    // Toggle section visibility
                    this.toggleSection(header);
                });
            });
        }, 50);
    }
    
    // Toggle collapsible section
    toggleSection(header) {
        const content = header.nextElementSibling;
        const icon = header.querySelector('.collapse-icon');
        
        if (content && icon) {
            if (content.classList.contains('collapsed')) {
                content.classList.remove('collapsed');
                header.classList.remove('collapsed');
                icon.textContent = '▼';
            } else {
                content.classList.add('collapsed');
                header.classList.add('collapsed');
                icon.textContent = '▶';
            }
        }
    }
    
    // Register a scene
    registerScene(scene) {
        this.scenes.set(scene.id, scene);
        
        // Initialize scene if it's the first one
        if (this.scenes.size === 1 && !this.currentScene) {
            // Use setTimeout to ensure DOM is ready
            setTimeout(() => {
                this.switchToScene(scene.id);
            }, 100);
        }
    }
    
    // Unregister a scene
    unregisterScene(sceneId) {
        const scene = this.scenes.get(sceneId);
        if (scene) {
            if (this.currentScene === scene) {
                this.currentScene = null;
            }
            
            scene.destroy();
            this.scenes.delete(sceneId);
        }
    }
    
    // Switch to a different scene
    async switchToScene(sceneId) {
        if (this.isTransitioning) return;
        
        const targetScene = this.scenes.get(sceneId);
        if (!targetScene) {
            console.warn(`Scene '${sceneId}' not found`);
            return;
        }
        
        if (this.currentScene === targetScene) return;
        
        this.isTransitioning = true;
        
        try {
            console.log(`Switching from ${this.currentScene?.id || 'none'} to ${sceneId}`);
            
            // Deactivate current scene
            if (this.currentScene) {
                await this.currentScene.deactivate();
            }
            
            // Initialize target scene if needed
            if (!targetScene.isInitialized) {
                console.log(`Initializing scene: ${sceneId}`);
                await targetScene.initialize(this.view, this.controls, this.cursorManager);
            }
            
            // Activate target scene
            console.log(`Activating scene: ${sceneId}`);
            await targetScene.activate();
            
            // Update current scene reference
            this.currentScene = targetScene;
            
            // Update navigation UI
            this.updateNavigationUI(sceneId);
            
            console.log(`Scene switch complete: ${sceneId}`);
            
        } catch (error) {
            console.error('Error switching scenes:', error);
        } finally {
            this.isTransitioning = false;
        }
    }
    
    // Update navigation UI to reflect current scene
    updateNavigationUI(activeSceneId) {
        document.querySelectorAll('.section-header').forEach(header => {
            const sectionId = header.getAttribute('data-section');
            
            if (sectionId === activeSceneId) {
                header.classList.add('active');
            } else {
                header.classList.remove('active');
            }
        });
    }
    
    // Get current scene
    getCurrentScene() {
        return this.currentScene;
    }
    
    // Get all scenes
    getScenes() {
        return Array.from(this.scenes.values());
    }
    
    // Get scene by ID
    getScene(sceneId) {
        return this.scenes.get(sceneId);
    }
    
    // Check if a scene exists
    hasScene(sceneId) {
        return this.scenes.has(sceneId);
    }
    
    // Handle window resize
    handleResize() {
        if (this.view) {
            this.view.resize();
        }
    }
    
    // Get manager status
    getStatus() {
        return {
            currentScene: this.currentScene?.getInfo() || null,
            totalScenes: this.scenes.size,
            isTransitioning: this.isTransitioning,
            scenes: this.getScenes().map(scene => scene.getInfo())
        };
    }
    
    // Cleanup manager and all scenes
    destroy() {
        // Destroy all scenes
        this.scenes.forEach(scene => scene.destroy());
        this.scenes.clear();
        
        // Cleanup components
        if (this.cursorManager) {
            this.cursorManager.destroy();
        }
        
        if (this.controls) {
            this.controls.destroy();
        }
        
        this.currentScene = null;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TwistorScene, SceneManager };
}