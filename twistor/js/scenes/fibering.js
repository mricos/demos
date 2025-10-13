/**
 * Scene 2: Clifford-Hopf Fibering & Geometric Connections
 * Focus: Geometric bridge between spaces, null flags, and fiber bundle structure
 */
class FiberingScene extends TwistorScene {
    constructor() {
        super('fibering', {
            name: 'Clifford-Hopf Fibering & Geometric Connections',
            description: 'Explore the geometric bridge connecting spinor space to projective twistor space',
            
            // Scene-specific rotor dynamics - more complex for fiber visualization
            rotationSpeed: 0.004, // Even slower for complex geometry
            
            // View configuration for fibering
            viewConfig: {
                showAxes: true,
                showGrid: true,
                backgroundColor: '#f5f6fa',
                cameraDistance: 450,
                gridSize: 15
            },
            
            // Controls specific to fibering scene
            controlsConfig: [
                {
                    type: 'knob',
                    id: 'fiberParam',
                    label: 'Clifford-Hopf Parameter:',
                    min: 0,
                    max: 2,
                    step: 0.02,
                    defaultValue: 0.5,
                    precision: 3,
                    unit: '',
                    twistorTerm: 'clifford-hopf'
                },
                {
                    type: 'range',
                    id: 'nullFlagRange',
                    label: 'Null Flag Range:',
                    min: 0,
                    max: 1,
                    defaultValue: { min: 0.2, max: 0.8 },
                    twistorTerm: 'null-flags'
                },
                {
                    type: 'stepper',
                    id: 'fiberDensity',
                    label: 'Fiber Bundle Density:',
                    min: 4,
                    max: 16,
                    step: 1,
                    defaultValue: 8,
                    unit: ' fibers',
                    twistorTerm: 'holomorphic-transforms'
                },
                {
                    type: 'slider',
                    id: 'geometricTension',
                    label: 'Geometric Coupling:',
                    min: 0,
                    max: 3,
                    step: 0.1,
                    defaultValue: 1.2,
                    precision: 2,
                    unit: '',
                    twistorTerm: 'bi-twistors'
                },
                {
                    type: 'color',
                    id: 'fiberColor',
                    label: 'Fiber Bundle Color:',
                    defaultValue: '#27ae60',
                    twistorTerm: 'clifford-hopf'
                },
                {
                    type: 'color',
                    id: 'flagColor',
                    label: 'Null Flag Color:',
                    defaultValue: '#f39c12',
                    twistorTerm: 'null-flags'
                },
                {
                    type: 'multihandle',
                    id: 'twistorLevels',
                    label: 'Twistor Space Levels:',
                    min: 0,
                    max: 100,
                    defaultValue: [25, 50, 75],
                    twistorTerm: 'bi-twistors'
                },
                {
                    type: 'select',
                    id: 'fiberVisualization',
                    label: 'Fiber Visualization:',
                    options: [
                        { value: 'full', label: 'Complete Bundle' },
                        { value: 'individual', label: 'Individual Fibers' },
                        { value: 'cross-section', label: 'Cross Section' },
                        { value: 'animated', label: 'Animated Flow' },
                        { value: 'holomorphic', label: 'Holomorphic View' }
                    ],
                    defaultValue: 'full',
                    twistorTerm: 'clifford-hopf'
                }
            ],
            
            // Cursors for fibering scene
            cursors: [
                {
                    id: 'clifford-hopf',
                    highlightKey: 'clifford-hopf',
                    options: { autoAdjust: true, highlightDuration: 0 }
                },
                {
                    id: 'null-flags',
                    highlightKey: 'null-flags',
                    options: { autoAdjust: true, highlightDuration: 0 }
                },
                {
                    id: 'holomorphic-transforms',
                    highlightKey: 'holomorphic-transforms',
                    options: { autoAdjust: true, highlightDuration: 0 }
                },
                {
                    id: 'bi-twistors',
                    highlightKey: 'bi-twistors',
                    options: { autoAdjust: true, highlightDuration: 0 }
                },
                {
                    id: 'split-octonions',
                    highlightKey: 'split-octonions',
                    options: { autoAdjust: true, highlightDuration: 0 }
                }
            ]
        });
        
        // Scene-specific parameters
        this.fiberParam = 0.5;
        this.nullFlags = 0.3;
        this.fiberDensity = 8;
        this.geometricTension = 1.2;
        this.fiberVisualization = 'full';
        
        // Geometry objects
        this.cliffordHopfFiber = null;
        this.nullFlagStructure = null;
    }
    
    // Initialize scene-specific content
    async initializeScene() {
        console.log('Initializing Fibering Scene...');
        
        // Create Clifford-Hopf fiber bundle
        this.cliffordHopfFiber = new CliffordHopfFiber({
            position: { x: 0, y: 0, z: 0 },
            scale: 1.0,
            fiberParam: this.fiberParam,
            numFibers: this.fiberDensity
        });
        this.cliffordHopfFiber.type = 'clifford-hopf-fiber';
        
        // Create null flag structure
        this.nullFlagStructure = new NullFlagStructure({
            position: { x: 0, y: 0, z: 0 },
            scale: 0.8,
            flagOrientation: this.nullFlags,
            numFlags: 6
        });
        this.nullFlagStructure.type = 'null-flag-structure';
        
        console.log('Fibering Scene initialized successfully');
    }
    
    // Setup parameter listeners specific to fibering
    setupParameterListeners() {
        // Clifford-Hopf parameter control
        this.controls.addEventListener('fiberParam', (value) => {
            this.fiberParam = value;
            if (this.cliffordHopfFiber) {
                this.cliffordHopfFiber.fiberParam = value;
            }
        });
        
        // Null flags orientation control
        this.controls.addEventListener('nullFlags', (value) => {
            this.nullFlags = value;
            if (this.nullFlagStructure) {
                this.nullFlagStructure.flagOrientation = value;
            }
        });
        
        // Fiber density control
        this.controls.addEventListener('fiberDensity', (value) => {
            this.fiberDensity = value;
            if (this.cliffordHopfFiber) {
                this.cliffordHopfFiber.numFibers = value;
            }
        });
        
        // Geometric tension control
        this.controls.addEventListener('geometricTension', (value) => {
            this.geometricTension = value;
            // This affects the overall geometric coupling
        });
        
        // Fiber visualization mode control
        this.controls.addEventListener('fiberVisualization', (value) => {
            this.fiberVisualization = value;
            this.updateFiberVisualization();
        });
    }
    
    // Update fiber visualization based on mode
    updateFiberVisualization() {
        this.view.updateConfig({
            fiberVisualization: this.fiberVisualization
        });
        
        // Adjust object visibility based on mode
        if (this.fiberVisualization === 'individual') {
            // Show individual fibers more distinctly
            if (this.cliffordHopfFiber) {
                this.cliffordHopfFiber.numFibers = Math.min(this.fiberDensity, 4);
            }
        } else if (this.fiberVisualization === 'cross-section') {
            // Show cross-sectional view
            this.view.updateConfig({ showGrid: true });
        } else {
            // Full bundle view
            if (this.cliffordHopfFiber) {
                this.cliffordHopfFiber.numFibers = this.fiberDensity;
            }
        }
    }
    
    // Handle cursor events specific to fibering
    onCursorActivated(cursor) {
        super.onCursorActivated(cursor);
        
        switch (cursor.highlightKey) {
            case 'clifford-hopf':
                this.demonstrateCliffordHopfFibering();
                break;
            case 'null-flags':
                this.highlightNullFlags();
                break;
            case 'holomorphic-transforms':
                this.showHolomorphicTransforms();
                break;
            case 'bi-twistors':
                this.demonstrateBiTwistors();
                break;
            case 'split-octonions':
                this.exploreSplitOctonions();
                break;
        }
    }
    
    // Cursor action handlers
    demonstrateCliffordHopfFibering() {
        if (this.cliffordHopfFiber) {
            this.cliffordHopfFiber.setHighlight(true);
        }
        
        // Animate fiber parameter to show fibering structure
        this.controls.setValue('fiberVisualization', 'animated');
        this.controls.animateToValue('fiberParam', 0, 500)
            .then(() => this.controls.animateToValue('fiberParam', 1.5, 2000))
            .then(() => this.controls.animateToValue('fiberParam', 0.5, 1000));
    }
    
    highlightNullFlags() {
        if (this.nullFlagStructure) {
            this.nullFlagStructure.setHighlight(true);
        }
        
        // Show how null flags relate to the geometric structure
        this.controls.setValue('fiberVisualization', 'cross-section');
        this.controls.animateToValue('nullFlags', 0, 800)
            .then(() => this.controls.animateToValue('nullFlags', 1, 1500))
            .then(() => this.controls.animateToValue('nullFlags', 0.3, 800));
    }
    
    showHolomorphicTransforms() {
        // Emphasize the holomorphic nature of the transformations
        this.controls.setValue('fiberVisualization', 'full');
        
        if (this.cliffordHopfFiber) {
            this.cliffordHopfFiber.setHighlight(true);
        }
        
        // Animate to show transformation flow
        this.controls.animateToValue('fiberDensity', 12, 1000);
        this.controls.animateToValue('geometricTension', 2.5, 1500);
    }
    
    demonstrateBiTwistors() {
        // Show the bi-twistor structure
        this.controls.setValue('fiberVisualization', 'individual');
        
        if (this.cliffordHopfFiber) {
            this.cliffordHopfFiber.setHighlight(true);
        }
        if (this.nullFlagStructure) {
            this.nullFlagStructure.setHighlight(true);
        }
        
        // Complex animation showing bi-twistor relationships
        this.controls.animateToValue('fiberParam', 1.0, 1000);
        this.controls.animateToValue('geometricTension', 2.0, 1500);
    }
    
    exploreSplitOctonions() {
        // Show connection to split-octonion geometry
        this.view.updateConfig({ 
            showGrid: true,
            gridSize: 20
        });
        
        this.controls.setValue('fiberVisualization', 'full');
        this.controls.animateToValue('fiberDensity', 8, 800);
        
        // Create octonionic pattern in the fiber structure
        if (this.cliffordHopfFiber) {
            this.cliffordHopfFiber.setHighlight(true);
            // Special octonionic arrangement would be implemented in the object
        }
    }
    
    // Clean up cursor highlighting
    onCursorDeactivated(cursor) {
        super.onCursorDeactivated(cursor);
        
        // Remove highlighting
        if (this.cliffordHopfFiber) {
            this.cliffordHopfFiber.setHighlight(false);
        }
        if (this.nullFlagStructure) {
            this.nullFlagStructure.setHighlight(false);
        }
        
        // Reset visualization mode if it was changed
        if (this.fiberVisualization !== 'full') {
            this.controls.setValue('fiberVisualization', 'full');
        }
    }
    
    // Populate scene with objects
    populateScene() {
        this.view.clearObjects();
        
        if (this.cliffordHopfFiber) {
            this.view.addObject(this.cliffordHopfFiber);
        }
        
        if (this.nullFlagStructure) {
            this.view.addObject(this.nullFlagStructure);
        }
    }
    
    // Custom rotor update for fibering scene
    updateRotor(deltaTime) {
        // Create angular velocity based on fiber bundle parameters
        const fiberInfluence = Math.sin(this.animationTime * this.fiberParam);
        const nullFlagInfluence = this.nullFlags * Math.cos(this.animationTime * 0.3);
        const geometricCoupling = this.geometricTension * Math.sin(this.animationTime * 0.1);
        
        const w1 = fiberInfluence * 0.8;
        const w2 = nullFlagInfluence + geometricCoupling * 0.3;
        const w3 = Math.cos(this.animationTime * this.fiberParam * 0.5) * 0.6;
        
        const angularVelocity = new Bivector(w1, w2, w3);
        const deltaRotor = angularVelocity.toRotor(deltaTime * this.config.rotationSpeed);
        
        this.rotor = this.rotor.multiply(deltaRotor);
        this.rotor.normalize();
    }
    
    // Scene-specific reset
    onReset() {
        super.onReset();
        
        // Reset scene parameters
        this.fiberParam = 0.5;
        this.nullFlags = 0.3;
        this.fiberDensity = 8;
        this.geometricTension = 1.2;
        this.fiberVisualization = 'full';
        
        // Reset visualization mode
        this.updateFiberVisualization();
        
        // Reset object properties
        if (this.cliffordHopfFiber) {
            this.cliffordHopfFiber.fiberParam = this.fiberParam;
            this.cliffordHopfFiber.numFibers = this.fiberDensity;
            this.cliffordHopfFiber.setHighlight(false);
        }
        
        if (this.nullFlagStructure) {
            this.nullFlagStructure.flagOrientation = this.nullFlags;
            this.nullFlagStructure.setHighlight(false);
        }
    }
    
    // Scene activation
    onActivate() {
        super.onActivate();
        console.log('Fibering scene is now active');
        
        // Setup scene-specific view configuration
        this.view.updateConfig({
            showAxes: true,
            showGrid: true,
            axisLength: 90,
            backgroundColor: '#f5f6fa',
            gridSize: 15
        });
    }
    
    // Scene deactivation
    onDeactivate() {
        super.onDeactivate();
        
        // Clean up any active animations
        if (this.cliffordHopfFiber) {
            this.cliffordHopfFiber.setHighlight(false);
        }
        if (this.nullFlagStructure) {
            this.nullFlagStructure.setHighlight(false);
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FiberingScene;
}