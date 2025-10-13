/**
 * Scene 1: Twistor Fundamentals & Two-Component Spinors
 * Focus: Basic concepts, spinor structure, and frequency splitting
 */
class FundamentalsScene extends TwistorScene {
    constructor() {
        super('fundamentals', {
            name: 'Twistor Fundamentals & Two-Component Spinors',
            description: 'Explore the fundamental concepts of twistor theory and two-component spinors',
            
            // Scene-specific rotor dynamics
            rotationSpeed: 0.006, // Slower for educational clarity
            
            // View configuration for fundamentals
            viewConfig: {
                showAxes: true,
                showGrid: false,
                backgroundColor: '#f8f9fa',
                cameraDistance: 350
            },
            
            // Controls specific to fundamentals
            controlsConfig: [
                {
                    type: 'knob',
                    id: 'spinorPhase',
                    label: 'Two-Component Phase (+ω):',
                    min: -6.28,
                    max: 6.28,
                    step: 0.1,
                    defaultValue: 1.0,
                    precision: 2,
                    unit: ' rad',
                    twistorTerm: 'positive-freq'
                },
                {
                    type: 'range',
                    id: 'frequencySplit',
                    label: 'Frequency Range (±ω):',
                    min: -3,
                    max: 3,
                    defaultValue: { min: -0.5, max: 0.5 },
                    unit: ' Hz',
                    twistorTerm: 'frequency-split'
                },
                {
                    type: 'slider',
                    id: 'spinorAmplitude',
                    label: 'Spinor Field Amplitude:',
                    min: 0,
                    max: 2,
                    step: 0.05,
                    defaultValue: 1.0,
                    precision: 2,
                    unit: '',
                    twistorTerm: 'spinor-components'
                },
                {
                    type: 'color',
                    id: 'positiveFreqColor',
                    label: 'Positive Frequency Color:',
                    defaultValue: '#3498db',
                    twistorTerm: 'positive-freq'
                },
                {
                    type: 'color',
                    id: 'negativeFreqColor',
                    label: 'Negative Frequency Color:',
                    defaultValue: '#e74c3c',
                    twistorTerm: 'negative-freq'
                },
                {
                    type: 'stepper',
                    id: 'complexityLevel',
                    label: 'Spinor Complexity:',
                    min: 1,
                    max: 8,
                    step: 1,
                    defaultValue: 3,
                    twistorTerm: 'spinor-components'
                },
                {
                    type: 'select',
                    id: 'visualizationMode',
                    label: 'Visualization Mode:',
                    options: [
                        { value: 'both', label: 'Both Components' },
                        { value: 'positive', label: 'Positive Frequency Only' },
                        { value: 'negative', label: 'Negative Frequency Only' },
                        { value: 'split', label: 'Split View' },
                        { value: 'overlay', label: 'Superposition' }
                    ],
                    defaultValue: 'both',
                    twistorTerm: 'spinor-geometry'
                },
                {
                    type: 'multihandle',
                    id: 'harmonics',
                    label: 'Harmonic Components:',
                    min: 0,
                    max: 100,
                    defaultValue: [20, 60, 80],
                    twistorTerm: 'frequency-patterns'
                }
            ],
            
            // Cursors for fundamentals scene
            cursors: [
                {
                    id: 'twistor-objects',
                    highlightKey: 'twistor-objects',
                    options: { autoAdjust: true, highlightDuration: 0 }
                },
                {
                    id: 'spinor-geometry',
                    highlightKey: 'spinor-geometry', 
                    options: { autoAdjust: true, highlightDuration: 0 }
                },
                {
                    id: 'positive-freq',
                    highlightKey: 'positive-freq',
                    options: { autoAdjust: true, highlightDuration: 0 }
                },
                {
                    id: 'negative-freq',
                    highlightKey: 'negative-freq',
                    options: { autoAdjust: true, highlightDuration: 0 }
                },
                {
                    id: 'frequency-split',
                    highlightKey: 'frequency-split',
                    options: { autoAdjust: true, highlightDuration: 0 }
                },
                {
                    id: 'spinor-components',
                    highlightKey: 'spinor-components',
                    options: { autoAdjust: true, highlightDuration: 0 }
                }
            ]
        });
        
        // Scene-specific parameters
        this.spinorPhase = 1.0;
        this.frequencySplit = 0.5;
        this.spinorAmplitude = 1.0;
        this.visualizationMode = 'both';
        
        // Geometry objects
        this.twoComponentSpinor = null;
        this.coordinateAxes = null;
        this.frequencyIndicators = null;
    }
    
    // Initialize scene-specific content
    async initializeScene() {
        console.log('Initializing Fundamentals Scene...');
        
        // Create the two-component spinor visualization
        this.twoComponentSpinor = new TwoComponentSpinor({
            position: { x: 0, y: 0, z: 0 },
            scale: 1.2,
            spinorPhase: this.spinorPhase,
            frequency: this.frequencySplit
        });
        this.twoComponentSpinor.type = 'two-component-spinor';
        
        console.log('Fundamentals Scene initialized successfully');
    }
    
    // Setup parameter listeners specific to fundamentals
    setupParameterListeners() {
        // Two-component phase control
        this.controls.addEventListener('spinorPhase', (value) => {
            this.spinorPhase = value;
            if (this.twoComponentSpinor) {
                this.twoComponentSpinor.spinorPhase = value;
            }
        });
        
        // Frequency splitting control
        this.controls.addEventListener('frequencySplit', (value) => {
            this.frequencySplit = value;
            if (this.twoComponentSpinor) {
                this.twoComponentSpinor.frequency = value;
            }
        });
        
        // Spinor amplitude control
        this.controls.addEventListener('spinorAmplitude', (value) => {
            this.spinorAmplitude = value;
            if (this.twoComponentSpinor) {
                this.twoComponentSpinor.scale = value;
            }
        });
        
        // Visualization mode control
        this.controls.addEventListener('visualizationMode', (value) => {
            this.visualizationMode = value;
            this.updateVisualizationMode();
        });
    }
    
    // Update visualization based on mode selection
    updateVisualizationMode() {
        // This will be used by the rendering system
        this.view.updateConfig({
            visualizationMode: this.visualizationMode
        });
    }
    
    // Handle cursor events specific to fundamentals
    onCursorActivated(cursor) {
        super.onCursorActivated(cursor);
        
        switch (cursor.highlightKey) {
            case 'twistor-objects':
                this.highlightTwistorObjects();
                break;
            case 'spinor-geometry':
                this.highlightSpinorGeometry();
                break;
            case 'positive-freq':
                this.emphasizePositiveFrequency();
                break;
            case 'negative-freq':
                this.emphasizeNegativeFrequency();
                break;
            case 'frequency-split':
                this.demonstrateFrequencySplitting();
                break;
            case 'spinor-components':
                this.highlightSpinorComponents();
                break;
        }
    }
    
    // Cursor action handlers
    highlightTwistorObjects() {
        if (this.twoComponentSpinor) {
            this.twoComponentSpinor.setHighlight(true);
        }
        
        // Adjust visualization to show twistor nature
        this.controls.animateToValue('spinorAmplitude', 1.5, 1000);
    }
    
    highlightSpinorGeometry() {
        // Show the geometric structure more clearly
        this.view.updateConfig({ showAxes: true });
        
        if (this.twoComponentSpinor) {
            this.twoComponentSpinor.setHighlight(true);
        }
        
        this.controls.animateToValue('spinorPhase', Math.PI, 1500);
    }
    
    emphasizePositiveFrequency() {
        this.controls.setValue('visualizationMode', 'positive');
        this.controls.animateToValue('frequencySplit', 2.0, 1000);
    }
    
    emphasizeNegativeFrequency() {
        this.controls.setValue('visualizationMode', 'negative');
        this.controls.animateToValue('frequencySplit', -2.0, 1000);
    }
    
    demonstrateFrequencySplitting() {
        this.controls.setValue('visualizationMode', 'split');
        
        // Animate frequency splitting
        this.controls.animateToValue('frequencySplit', 0, 500)
            .then(() => this.controls.animateToValue('frequencySplit', 2, 1000))
            .then(() => this.controls.animateToValue('frequencySplit', -2, 1000))
            .then(() => this.controls.animateToValue('frequencySplit', 0.5, 1000));
    }
    
    highlightSpinorComponents() {
        this.controls.setValue('visualizationMode', 'both');
        
        // Show both components with phase animation
        this.controls.animateToValue('spinorPhase', 0, 500)
            .then(() => this.controls.animateToValue('spinorPhase', Math.PI/2, 1000))
            .then(() => this.controls.animateToValue('spinorPhase', Math.PI, 1000))
            .then(() => this.controls.animateToValue('spinorPhase', 1.0, 1000));
    }
    
    // Clean up cursor highlighting
    onCursorDeactivated(cursor) {
        super.onCursorDeactivated(cursor);
        
        // Remove highlighting
        if (this.twoComponentSpinor) {
            this.twoComponentSpinor.setHighlight(false);
        }
        
        // Reset visualization mode if it was changed
        if (this.visualizationMode !== 'both') {
            this.controls.setValue('visualizationMode', 'both');
        }
    }
    
    // Populate scene with objects
    populateScene() {
        this.view.clearObjects();
        
        if (this.twoComponentSpinor) {
            this.view.addObject(this.twoComponentSpinor);
        }
    }
    
    // Custom rotor update for fundamentals
    updateRotor(deltaTime) {
        // Create angular velocity based on spinor parameters
        const w1 = Math.sin(this.spinorPhase) * this.spinorAmplitude;
        const w2 = this.frequencySplit * Math.cos(this.animationTime * 0.1);
        const w3 = Math.cos(this.spinorPhase * 0.5) * this.spinorAmplitude;
        
        const angularVelocity = new Bivector(w1, w2, w3);
        const deltaRotor = angularVelocity.toRotor(deltaTime * this.config.rotationSpeed);
        
        this.rotor = this.rotor.multiply(deltaRotor);
        this.rotor.normalize();
    }
    
    // Scene-specific reset
    onReset() {
        super.onReset();
        
        // Reset scene parameters
        this.spinorPhase = 1.0;
        this.frequencySplit = 0.5;
        this.spinorAmplitude = 1.0;
        this.visualizationMode = 'both';
        
        // Reset visualization mode
        this.updateVisualizationMode();
        
        // Reset object properties
        if (this.twoComponentSpinor) {
            this.twoComponentSpinor.spinorPhase = this.spinorPhase;
            this.twoComponentSpinor.frequency = this.frequencySplit;
            this.twoComponentSpinor.scale = this.spinorAmplitude;
            this.twoComponentSpinor.setHighlight(false);
        }
    }
    
    // Scene activation
    onActivate() {
        super.onActivate();
        console.log('Fundamentals scene is now active');
        
        // Setup scene-specific view configuration
        this.view.updateConfig({
            showAxes: true,
            axisLength: 80,
            backgroundColor: '#f8f9fa'
        });
    }
    
    // Scene deactivation
    onDeactivate() {
        super.onDeactivate();
        
        // Clean up any active animations
        if (this.twoComponentSpinor) {
            this.twoComponentSpinor.setHighlight(false);
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FundamentalsScene;
}