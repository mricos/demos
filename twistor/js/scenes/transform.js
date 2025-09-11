/**
 * Scene 3: The Penrose Transform & Physical Interpretation
 * Focus: Advanced geometry, holomorphic mapping, complete picture
 */
class TransformScene extends TwistorScene {
    constructor() {
        super('transform', {
            name: 'The Penrose Transform & Physical Interpretation',
            description: 'Explore the complete mapping between twistor functions and spacetime fields',
            
            rotationSpeed: 0.005, // Balanced for complex visualization
            
            viewConfig: {
                showAxes: true,
                showGrid: false,
                backgroundColor: '#f0f4f8',
                cameraDistance: 500
            },
            
            controlsConfig: [
                {
                    type: 'slider',
                    id: 'transformComplexity',
                    label: 'Transform Complexity:',
                    min: 0.5,
                    max: 3.0,
                    step: 0.1,
                    defaultValue: 1.0,
                    precision: 2,
                    twistorTerm: 'penrose-transform'
                },
                {
                    type: 'slider',
                    id: 'holomorphicDepth',
                    label: 'Holomorphic Depth:',
                    min: 1,
                    max: 6,
                    step: 1,
                    defaultValue: 4,
                    precision: 0,
                    unit: ' layers',
                    twistorTerm: 'twistor-functions'
                },
                {
                    type: 'slider',
                    id: 'spacetimeMapping',
                    label: 'Spacetime Mapping:',
                    min: 0,
                    max: 2,
                    step: 0.05,
                    defaultValue: 1.0,
                    precision: 2,
                    twistorTerm: 'geometric-evolution'
                },
                {
                    type: 'select',
                    id: 'transformView',
                    label: 'Transform View:',
                    options: [
                        { value: 'unified', label: 'Unified View' },
                        { value: 'spacetime-to-twistor', label: 'Spacetime → Twistor' },
                        { value: 'twistor-to-spacetime', label: 'Twistor → Spacetime' },
                        { value: 'bidirectional', label: 'Bidirectional' }
                    ],
                    defaultValue: 'unified'
                }
            ],
            
            cursors: [
                {
                    id: 'penrose-transform',
                    highlightKey: 'penrose-transform',
                    options: { autoAdjust: true, highlightDuration: 0 }
                },
                {
                    id: 'twistor-functions',
                    highlightKey: 'twistor-functions',
                    options: { autoAdjust: true, highlightDuration: 0 }
                },
                {
                    id: 'geometric-evolution',
                    highlightKey: 'geometric-evolution',
                    options: { autoAdjust: true, highlightDuration: 0 }
                }
            ]
        });
        
        this.transformComplexity = 1.0;
        this.holomorphicDepth = 4;
        this.spacetimeMapping = 1.0;
        this.transformView = 'unified';
        
        this.penroseTransform = null;
        this.twistorSpaceProjection = null;
    }
    
    async initializeScene() {
        this.penroseTransform = new PenroseTransform({
            position: { x: 0, y: 0, z: 0 },
            transformComplexity: this.transformComplexity
        });
        
        this.twistorSpaceProjection = new TwistorSpaceProjection({
            position: { x: 0, y: 0, z: 0 },
            projectionIntensity: this.spacetimeMapping
        });
    }
    
    setupParameterListeners() {
        this.controls.addEventListener('transformComplexity', (value) => {
            this.transformComplexity = value;
            if (this.penroseTransform) {
                this.penroseTransform.transformComplexity = value;
            }
        });
        
        this.controls.addEventListener('holomorphicDepth', (value) => {
            this.holomorphicDepth = value;
        });
        
        this.controls.addEventListener('spacetimeMapping', (value) => {
            this.spacetimeMapping = value;
            if (this.twistorSpaceProjection) {
                this.twistorSpaceProjection.projectionIntensity = value;
            }
        });
        
        this.controls.addEventListener('transformView', (value) => {
            this.transformView = value;
            this.updateTransformView();
        });
    }
    
    updateTransformView() {
        this.view.updateConfig({
            transformView: this.transformView
        });
    }
    
    onCursorActivated(cursor) {
        super.onCursorActivated(cursor);
        
        switch (cursor.highlightKey) {
            case 'penrose-transform':
                this.demonstratePenroseTransform();
                break;
            case 'twistor-functions':
                this.showTwistorFunctions();
                break;
            case 'geometric-evolution':
                this.animateGeometricEvolution();
                break;
        }
    }
    
    demonstratePenroseTransform() {
        if (this.penroseTransform) {
            this.penroseTransform.setHighlight(true);
        }
        
        this.controls.setValue('transformView', 'bidirectional');
        this.controls.animateToValue('transformComplexity', 2.5, 2000);
    }
    
    showTwistorFunctions() {
        if (this.penroseTransform) {
            this.penroseTransform.setHighlight(true);
        }
        
        this.controls.animateToValue('holomorphicDepth', 6, 1500);
        this.controls.animateToValue('transformComplexity', 2.0, 1000);
    }
    
    animateGeometricEvolution() {
        if (this.twistorSpaceProjection) {
            this.twistorSpaceProjection.setHighlight(true);
        }
        
        this.controls.animateToValue('spacetimeMapping', 0, 800)
            .then(() => this.controls.animateToValue('spacetimeMapping', 2, 2000))
            .then(() => this.controls.animateToValue('spacetimeMapping', 1, 1000));
    }
    
    onCursorDeactivated(cursor) {
        super.onCursorDeactivated(cursor);
        
        if (this.penroseTransform) {
            this.penroseTransform.setHighlight(false);
        }
        if (this.twistorSpaceProjection) {
            this.twistorSpaceProjection.setHighlight(false);
        }
    }
    
    populateScene() {
        this.view.clearObjects();
        
        if (this.penroseTransform) {
            this.view.addObject(this.penroseTransform);
        }
        if (this.twistorSpaceProjection) {
            this.view.addObject(this.twistorSpaceProjection);
        }
    }
    
    updateRotor(deltaTime) {
        const transformInfluence = this.transformComplexity * Math.sin(this.animationTime * 0.2);
        const mappingInfluence = this.spacetimeMapping * Math.cos(this.animationTime * 0.15);
        
        const w1 = transformInfluence * 0.7;
        const w2 = mappingInfluence * 0.5;
        const w3 = Math.sin(this.animationTime * 0.1) * this.transformComplexity * 0.4;
        
        const angularVelocity = new Bivector(w1, w2, w3);
        const deltaRotor = angularVelocity.toRotor(deltaTime * this.config.rotationSpeed);
        
        this.rotor = this.rotor.multiply(deltaRotor);
        this.rotor.normalize();
    }
    
    onReset() {
        super.onReset();
        
        this.transformComplexity = 1.0;
        this.holomorphicDepth = 4;
        this.spacetimeMapping = 1.0;
        this.transformView = 'unified';
        
        if (this.penroseTransform) {
            this.penroseTransform.transformComplexity = this.transformComplexity;
            this.penroseTransform.setHighlight(false);
        }
        if (this.twistorSpaceProjection) {
            this.twistorSpaceProjection.projectionIntensity = this.spacetimeMapping;
            this.twistorSpaceProjection.setHighlight(false);
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TransformScene;
}