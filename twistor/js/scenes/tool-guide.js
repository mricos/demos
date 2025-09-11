/**
 * Scene 4: Tool Guide & Meta-Explanation  
 * Focus: How to use the exploration tool and understand the interaction patterns
 */
class ToolGuideScene extends TwistorScene {
    constructor() {
        super('tool-guide', {
            name: 'Interactive Science Exploration Tool Guide',
            description: 'Learn how to navigate and interact with this twistor theory visualization system',
            
            rotationSpeed: 0.003, // Very slow for instructional clarity
            
            viewConfig: {
                showAxes: false,
                showGrid: false, 
                backgroundColor: '#fafbfc'
            },
            
            controlsConfig: [
                {
                    type: 'select',
                    id: 'guideSection',
                    label: 'Guide Section:',
                    options: [
                        { value: 'overview', label: 'System Overview' },
                        { value: 'cursors', label: 'Cursor System' },
                        { value: 'controls', label: 'Control Interactions' },
                        { value: 'scenes', label: 'Scene Navigation' },
                        { value: 'concepts', label: 'Concept Mapping' }
                    ],
                    defaultValue: 'overview'
                },
                {
                    type: 'toggle',
                    id: 'showDemoMode',
                    label: 'Demo Mode',
                    defaultValue: false
                }
            ],
            
            cursors: [
                {
                    id: 'system-overview',
                    highlightKey: 'system-overview',
                    options: { autoAdjust: false, highlightDuration: 0 }
                }
            ]
        });
        
        this.guideSection = 'overview';
        this.showDemoMode = false;
        this.demoStep = 0;
        this.demoSteps = [
            'Click on highlighted terms to activate cursors',
            'Use controls to adjust visualization parameters',
            'Navigate between scenes using section headers',
            'Observe how geometry changes with different concepts',
            'Reset anytime to return to default state'
        ];
    }
    
    async initializeScene() {
        // Create instructional visual elements
        this.createInstructionalElements();
    }
    
    createInstructionalElements() {
        // This scene uses custom rendering rather than geometry objects
        // to show instructional overlays and guides
    }
    
    setupParameterListeners() {
        this.controls.addEventListener('guideSection', (value) => {
            this.guideSection = value;
            this.updateGuideContent();
        });
        
        this.controls.addEventListener('showDemoMode', (value) => {
            this.showDemoMode = value;
            if (value) {
                this.startDemoMode();
            } else {
                this.stopDemoMode();
            }
        });
    }
    
    updateGuideContent() {
        const contentArea = document.getElementById('tool-guide-content');
        if (!contentArea) return;
        
        const content = this.getGuideContent(this.guideSection);
        contentArea.innerHTML = content;
    }
    
    getGuideContent(section) {
        const contents = {
            overview: `
                <h3>System Overview</h3>
                <p>This interactive tool explores <strong>Penrose twistor theory</strong> through modular scenes, each focusing on different mathematical concepts.</p>
                <h4>Key Features:</h4>
                <ul>
                    <li><strong>Scene-based exploration</strong>: Each section reveals different geometric aspects</li>
                    <li><strong>Cursor system</strong>: Click highlighted terms to see related visualizations</li>
                    <li><strong>Dynamic controls</strong>: Adjust parameters specific to each scene's focus</li>
                    <li><strong>Cross-referencing</strong>: Mathematical terms link to visual elements</li>
                </ul>
            `,
            cursors: `
                <h3>Cursor System</h3>
                <p>The <span class="twistor-term" data-highlight="system-overview">cursor system</span> creates connections between text and visualization:</p>
                <h4>How it Works:</h4>
                <ul>
                    <li><strong>Clickable terms</strong>: Blue highlighted terms are interactive</li>
                    <li><strong>Visual highlighting</strong>: Activates related geometric elements</li>
                    <li><strong>Parameter adjustment</strong>: Some cursors auto-adjust controls</li>
                    <li><strong>Single activation</strong>: Only one cursor active at a time for clarity</li>
                </ul>
                <p><em>Try clicking on any highlighted term to see it in action!</em></p>
            `,
            controls: `
                <h3>Control Interactions</h3>
                <p>Each scene has specialized controls that reveal different aspects:</p>
                <h4>Control Types:</h4>
                <ul>
                    <li><strong>Sliders</strong>: Adjust continuous parameters like phases and amplitudes</li>
                    <li><strong>Dropdowns</strong>: Switch between visualization modes</li>
                    <li><strong>Toggles</strong>: Enable/disable features like rotation</li>
                    <li><strong>Buttons</strong>: Reset state or pause animation</li>
                </ul>
                <p>Controls are <em>contextual</em> - they change meaning between scenes to focus on relevant concepts.</p>
            `,
            scenes: `
                <h3>Scene Navigation</h3>
                <p>Navigate through four interconnected scenes:</p>
                <h4>Scene Progression:</h4>
                <ol>
                    <li><strong>Fundamentals</strong>: Basic spinor structure and frequency splitting</li>
                    <li><strong>Fibering</strong>: Geometric connections and null flag structures</li>
                    <li><strong>Transform</strong>: Complete Penrose transform and physical interpretation</li>
                    <li><strong>Tool Guide</strong>: Understanding the exploration system itself</li>
                </ol>
                <p>Each scene builds on previous concepts while introducing new geometric representations.</p>
            `,
            concepts: `
                <h3>Concept Mapping</h3>
                <p>Mathematical concepts are mapped to visual and interactive elements:</p>
                <h4>Concept → Visualization Mapping:</h4>
                <ul>
                    <li><strong>Two-component spinors</strong> → Dual rotating structures</li>
                    <li><strong>Frequency splitting (±ω)</strong> → Oscillating patterns</li>
                    <li><strong>Clifford-Hopf fibering</strong> → Fiber bundle geometry</li>
                    <li><strong>Null flags</strong> → Oriented geometric flags</li>
                    <li><strong>Penrose transform</strong> → Holomorphic mapping visualization</li>
                </ul>
                <p>This mapping makes abstract mathematics <em>tangible and explorable</em>.</p>
            `
        };
        
        return contents[section] || contents.overview;
    }
    
    startDemoMode() {
        this.demoStep = 0;
        this.runDemoStep();
    }
    
    stopDemoMode() {
        // Stop any ongoing demo animations
        clearTimeout(this.demoTimeout);
    }
    
    runDemoStep() {
        if (this.demoStep >= this.demoSteps.length) {
            this.stopDemoMode();
            this.controls.setValue('showDemoMode', false);
            return;
        }
        
        const step = this.demoSteps[this.demoStep];
        this.showDemoInstruction(step);
        
        // Auto-advance to next step after delay
        this.demoTimeout = setTimeout(() => {
            this.demoStep++;
            this.runDemoStep();
        }, 3000);
    }
    
    showDemoInstruction(instruction) {
        // Show instruction overlay (would be implemented with actual UI)
        console.log(`Demo Step ${this.demoStep + 1}: ${instruction}`);
    }
    
    // Custom rendering for tool guide scene
    populateScene() {
        this.view.clearObjects();
        
        // This scene primarily uses text and UI rather than 3D geometry
        // The "geometry" here is instructional overlays
    }
    
    updateRotor(deltaTime) {
        // Very gentle rotation for the tool guide
        const w1 = Math.sin(this.animationTime * 0.1) * 0.2;
        const w2 = Math.cos(this.animationTime * 0.08) * 0.15;
        const w3 = Math.sin(this.animationTime * 0.12) * 0.1;
        
        const angularVelocity = new Bivector(w1, w2, w3);
        const deltaRotor = angularVelocity.toRotor(deltaTime * this.config.rotationSpeed);
        
        this.rotor = this.rotor.multiply(deltaRotor);
        this.rotor.normalize();
    }
    
    onActivate() {
        super.onActivate();
        
        // Setup tool guide specific content
        this.updateGuideContent();
        
        // Show instructional elements
        this.view.updateConfig({
            showAxes: false,
            backgroundColor: '#fafbfc'
        });
    }
    
    onReset() {
        super.onReset();
        
        this.guideSection = 'overview';
        this.showDemoMode = false;
        this.demoStep = 0;
        
        this.stopDemoMode();
        this.updateGuideContent();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ToolGuideScene;
}