// TwistorCursor: Multicursor system for highlighting and state management
class TwistorCursor {
    constructor(id, highlightKey) {
        this.id = id;
        this.highlightKey = highlightKey;
        this.subscribers = new Set();
        this.visualHighlights = {
            canvas: [],
            ui: [],
            text: []
        };
        this.isActive = false;
    }
    
    subscribe(callback) {
        this.subscribers.add(callback);
    }
    
    unsubscribe(callback) {
        this.subscribers.delete(callback);
    }
    
    activate(settings = {}) {
        this.isActive = true;
        this.settings = settings;
        this.notify('activate');
    }
    
    deactivate() {
        this.isActive = false;
        this.notify('deactivate');
    }
    
    notify(action) {
        this.subscribers.forEach(callback => callback(this, action));
    }
    
    addHighlight(type, element) {
        this.visualHighlights[type].push(element);
    }
}

// Cursor Manager: Pub-Sub system for managing all cursors
class CursorManager {
    constructor() {
        this.cursors = new Map();
        this.activeCursors = new Set();
    }
    
    createCursor(id, highlightKey) {
        const cursor = new TwistorCursor(id, highlightKey);
        this.cursors.set(id, cursor);
        return cursor;
    }
    
    getCursor(id) {
        return this.cursors.get(id);
    }
    
    activateCursor(id, settings) {
        const cursor = this.getCursor(id);
        if (cursor) {
            this.activeCursors.add(cursor);
            cursor.activate(settings);
        }
    }
    
    deactivateCursor(id) {
        const cursor = this.getCursor(id);
        if (cursor) {
            this.activeCursors.delete(cursor);
            cursor.deactivate();
        }
    }
    
    deactivateAll() {
        this.activeCursors.forEach(cursor => {
            cursor.deactivate();
        });
        this.activeCursors.clear();
    }
}

class PenroseTwistorVisualization {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Twistor parameters (mapped from conceptual controls)
        this.spinorPhase = 1.0;        // Two-component phase
        this.frequencySplit = 0.5;     // Â±Ï‰ frequency splitting
        this.twistorCouple = 2.0;      // Twistor coupling strength
        this.cliffordHopf = 0.1;       // Clifford-Hopf parameter
        this.nullFlags = 0.3;          // Null flag orientation
        
        // Animation state
        this.time = 0;
        this.rotationEnabled = true;
        this.rotationSpeed = 0.008;    // Slower when enabled
        this.pauseSpeed = 0.016;       // Original speed for comparison
        
        // Visual elements for highlighting
        this.visualElements = {
            'rotation-axes': [],
            'frequency-patterns': [],
            'geometric-evolution': [],
            'twistor-objects': [],
            'spinor-geometry': [],
            'positive-freq': [],
            'negative-freq': []
        };
        
        // Rotor for 3D rotations
        this.rotor = new Rotor(1, 0, 0, 0);
        
        // Initialize cursor system
        this.cursorManager = new CursorManager();
        this.initializeCursors();
        
        this.setupControls();
        this.setupCollapsibleSections();
        this.setupTwistorTerms();
        this.animate();
    }
    
    initializeCursors() {
        // Create cursors for different twistor concepts
        const cursorConfigs = [
            'twistor-objects', 'spinor-geometry', 'spinor-space', 'spacetime', 
            'projective-twistor', 'spinor-components', 'positive-freq', 'negative-freq',
            'frequency-split', 'clifford-hopf', 'holomorphic-transforms', 'null-flags',
            'bi-twistors', 'split-octonions', 'penrose-transform', 'twistor-functions',
            'rotation-axes', 'frequency-patterns', 'geometric-evolution'
        ];
        
        cursorConfigs.forEach(key => {
            const cursor = this.cursorManager.createCursor(key, key);
            cursor.subscribe((cursor, action) => this.handleCursorEvent(cursor, action));
        });
    }
    
    handleCursorEvent(cursor, action) {
        if (action === 'activate') {
            this.highlightElements(cursor.highlightKey, true);
            this.adjustVisualizationForCursor(cursor);
        } else if (action === 'deactivate') {
            this.highlightElements(cursor.highlightKey, false);
        }
    }
    
    highlightElements(highlightKey, highlight) {
        // Highlight text elements
        document.querySelectorAll(`[data-highlight="${highlightKey}"]`).forEach(el => {
            if (highlight) {
                el.classList.add('highlighted');
            } else {
                el.classList.remove('highlighted');
            }
        });
        
        // Store canvas highlighting state for next render
        this.canvasHighlights = this.canvasHighlights || {};
        this.canvasHighlights[highlightKey] = highlight;
    }
    
    adjustVisualizationForCursor(cursor) {
        // Adjust visualization parameters based on cursor activation
        const adjustments = {
            'positive-freq': { spinorPhase: 3.14 },
            'negative-freq': { spinorPhase: -3.14 },
            'frequency-split': { frequencySplit: 2.0 },
            'clifford-hopf': { cliffordHopf: 1.0 },
            'twistor-objects': { twistorCouple: 4.0 },
            'null-flags': { nullFlags: 0.8 }
        };
        
        const adjustment = adjustments[cursor.highlightKey];
        if (adjustment && cursor.settings.autoAdjust !== false) {
            Object.keys(adjustment).forEach(param => {
                this[param] = adjustment[param];
                this.updateControlDisplay(param);
            });
        }
    }
    
    updateControlDisplay(param) {
        const controlMap = {
            'spinorPhase': 'spinorPhase',
            'frequencySplit': 'frequencySplit', 
            'twistorCouple': 'twistorCouple',
            'cliffordHopf': 'spacetimeProjection',
            'nullFlags': 'nullFlags'
        };
        
        const controlId = controlMap[param];
        if (controlId) {
            const slider = document.getElementById(controlId);
            const valueSpan = document.getElementById(controlId + '-value');
            if (slider && valueSpan) {
                slider.value = this[param];
                valueSpan.textContent = parseFloat(this[param]).toFixed(2);
            }
        }
    }
    
    setupTwistorTerms() {
        document.querySelectorAll('.twistor-term').forEach(term => {
            term.addEventListener('click', (e) => {
                const highlightKey = e.target.getAttribute('data-highlight');
                if (highlightKey) {
                    // Toggle cursor activation
                    const cursor = this.cursorManager.getCursor(highlightKey);
                    if (cursor) {
                        if (cursor.isActive) {
                            this.cursorManager.deactivateCursor(highlightKey);
                        } else {
                            this.cursorManager.deactivateAll(); // Only one active at a time
                            this.cursorManager.activateCursor(highlightKey, { autoAdjust: true });
                        }
                    }
                }
            });
        });
    }
    
    setupCollapsibleSections() {
        document.querySelectorAll('.section-header').forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                const icon = header.querySelector('.collapse-icon');
                
                if (content.classList.contains('collapsed')) {
                    content.classList.remove('collapsed');
                    header.classList.remove('collapsed');
                    icon.textContent = 'â–¼';
                } else {
                    content.classList.add('collapsed');
                    header.classList.add('collapsed');
                    icon.textContent = 'â–¶';
                }
            });
        });
    }
    
    setupControls() {
        // Rotation toggle
        const rotationToggle = document.getElementById('rotationToggle');
        rotationToggle.addEventListener('change', (e) => {
            this.rotationEnabled = e.target.checked;
        });
        
        // Conceptual sliders
        const controls = ['spinorPhase', 'frequencySplit', 'twistorCouple', 'spacetimeProjection', 'nullFlags'];
        controls.forEach(control => {
            const slider = document.getElementById(control);
            const valueSpan = document.getElementById(control + '-value');
            
            slider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                valueSpan.textContent = value.toFixed(2);
                
                // Map control to internal parameter
                const paramMap = {
                    'spinorPhase': 'spinorPhase',
                    'frequencySplit': 'frequencySplit',
                    'twistorCouple': 'twistorCouple', 
                    'spacetimeProjection': 'cliffordHopf',
                    'nullFlags': 'nullFlags'
                };
                
                this[paramMap[control]] = value;
            });
        });
        
        // Buttons
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
    }
    
    reset() {
        this.time = 0;
        this.rotor = new Rotor(1, 0, 0, 0);
        this.cursorManager.deactivateAll();
        
        // Reset parameters
        this.spinorPhase = 1.0;
        this.frequencySplit = 0.5;
        this.twistorCouple = 2.0;
        this.cliffordHopf = 0.1;
        this.nullFlags = 0.3;
        
        // Reset UI
        document.getElementById('spinorPhase').value = 1.0;
        document.getElementById('frequencySplit').value = 0.5;
        document.getElementById('twistorCouple').value = 2.0;
        document.getElementById('spacetimeProjection').value = 0.1;
        document.getElementById('nullFlags').value = 0.3;
        
        ['spinorPhase', 'frequencySplit', 'twistorCouple', 'spacetimeProjection', 'nullFlags'].forEach(id => {
            document.getElementById(id + '-value').textContent = document.getElementById(id).value;
        });
    }
    
    togglePause() {
        this.rotationEnabled = !this.rotationEnabled;
        const btn = document.getElementById('pauseBtn');
        btn.textContent = this.rotationEnabled ? 'Pause' : 'Resume';
        document.getElementById('rotationToggle').checked = this.rotationEnabled;
    }
    
    updateRotor(dt) {
        if (!this.rotationEnabled) return;
        
        // Create angular velocity bivector with twistor-influenced components
        const w1 = this.spinorPhase + this.nullFlags * Math.sin(this.cliffordHopf * this.time);
        const w2 = this.frequencySplit + this.nullFlags * Math.cos(this.cliffordHopf * this.time);  
        const w3 = this.twistorCouple * Math.sin(this.spinorPhase * this.time * 0.1);
        
        const angularVelocity = new Bivector(w1, w2, w3);
        const deltaRotor = angularVelocity.toRotor(dt * 0.5);
        this.rotor = this.rotor.multiply(deltaRotor);
        this.rotor.normalize();
        
        this.time += dt;
    }
    
    rotatePoint(point) {
        return this.rotor.rotateVector(point);
    }
    
    project3D(point) {
        const distance = 400;
        const scale = distance / (distance + point.z);
        return {
            x: this.width / 2 + point.x * scale,
            y: this.height / 2 - point.y * scale
        };
    }
    
    drawTwistorVisualization() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw coordinate system with highlighting
        this.drawCoordinateSystem();
        
        // Draw twistor object (enhanced spinning top)
        this.drawTwistorObject();
        
        // Draw frequency patterns
        this.drawFrequencyPatterns();
        
        // Draw spinor field visualizations
        this.drawSpinorFields();
    }
    
    drawCoordinateSystem() {
        const axisLength = 100;
        const axes = [
            {point: {x: axisLength, y: 0, z: 0}, color: '#e74c3c', label: 'x'}, 
            {point: {x: 0, y: axisLength, z: 0}, color: '#27ae60', label: 'y'}, 
            {point: {x: 0, y: 0, z: axisLength}, color: '#3498db', label: 'z'}  
        ];
        
        const center = this.project3D({x: 0, y: 0, z: 0});
        
        axes.forEach(axis => {
            const rotated = this.rotatePoint(axis.point);
            const projected = this.project3D(rotated);
            
            // Highlight if rotation-axes cursor is active
            const isHighlighted = this.canvasHighlights && this.canvasHighlights['rotation-axes'];
            
            this.ctx.strokeStyle = axis.color;
            this.ctx.lineWidth = isHighlighted ? 5 : 3;
            this.ctx.shadowBlur = isHighlighted ? 10 : 0;
            this.ctx.shadowColor = axis.color;
            
            this.ctx.beginPath();
            this.ctx.moveTo(center.x, center.y);
            this.ctx.lineTo(projected.x, projected.y);
            this.ctx.stroke();
            
            this.ctx.shadowBlur = 0;
        });
    }
    
    drawTwistorObject() {
        const topRadius = 80;
        const topHeight = 120;
        
        // Define twistor object geometry
        const vertices = [
            {x: 0, y: topHeight/2, z: 0},  // Apex
            {x: topRadius, y: -topHeight/2, z: 0},
            {x: 0, y: -topHeight/2, z: topRadius},
            {x: -topRadius, y: -topHeight/2, z: 0},
            {x: 0, y: -topHeight/2, z: -topRadius},
        ];
        
        const transformedVertices = vertices.map(v => {
            const rotated = this.rotatePoint(v);
            return this.project3D(rotated);
        });
        
        // Highlight if twistor-objects cursor is active
        const isHighlighted = this.canvasHighlights && this.canvasHighlights['twistor-objects'];
        
        this.ctx.strokeStyle = '#2c3e50';
        this.ctx.lineWidth = isHighlighted ? 4 : 2;
        this.ctx.fillStyle = isHighlighted ? 
            'rgba(52, 152, 219, 0.6)' : 'rgba(52, 152, 219, 0.3)';
        
        if (isHighlighted) {
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#3498db';
        }
        
        this.ctx.beginPath();
        this.ctx.moveTo(transformedVertices[0].x, transformedVertices[0].y);
        for (let i = 1; i < transformedVertices.length; i++) {
            this.ctx.lineTo(transformedVertices[i].x, transformedVertices[i].y);
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        this.ctx.shadowBlur = 0;
    }
    
    drawFrequencyPatterns() {
        const isPositiveHighlighted = this.canvasHighlights && this.canvasHighlights['positive-freq'];
        const isNegativeHighlighted = this.canvasHighlights && this.canvasHighlights['negative-freq'];
        const isFreqSplitHighlighted = this.canvasHighlights && this.canvasHighlights['frequency-split'];
        
        if (isPositiveHighlighted || isNegativeHighlighted || isFreqSplitHighlighted) {
            const center = this.project3D({x: 0, y: 0, z: 0});
            const radius = 150;
            
            // Draw positive frequency pattern
            if (isPositiveHighlighted || isFreqSplitHighlighted) {
                this.ctx.strokeStyle = '#27ae60';
                this.ctx.lineWidth = 3;
                this.ctx.setLineDash([10, 5]);
                this.ctx.beginPath();
                this.ctx.arc(center.x, center.y, radius + 20, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
            
            // Draw negative frequency pattern  
            if (isNegativeHighlighted || isFreqSplitHighlighted) {
                this.ctx.strokeStyle = '#e74c3c';
                this.ctx.lineWidth = 3;
                this.ctx.setLineDash([5, 10]);
                this.ctx.beginPath();
                this.ctx.arc(center.x, center.y, radius - 20, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        }
    }
    
    drawSpinorFields() {
        const isSpinorHighlighted = this.canvasHighlights && this.canvasHighlights['spinor-geometry'];
        const isNullFlagsHighlighted = this.canvasHighlights && this.canvasHighlights['null-flags'];
        
        if (isSpinorHighlighted || isNullFlagsHighlighted) {
            const center = this.project3D({x: 0, y: 0, z: 0});
            
            // Draw spinor field lines
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const length = 60;
                
                const fieldPoint = {
                    x: Math.cos(angle) * length,
                    y: Math.sin(angle) * length * this.nullFlags,
                    z: Math.sin(angle + this.spinorPhase) * length * 0.5
                };
                
                const rotated = this.rotatePoint(fieldPoint);
                const projected = this.project3D(rotated);
                
                this.ctx.strokeStyle = isSpinorHighlighted ? '#9b59b6' : '#95a5a6';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(center.x, center.y);
                this.ctx.lineTo(projected.x, projected.y);
                this.ctx.stroke();
            }
        }
    }
    
    animate() {
        const dt = this.rotationEnabled ? this.rotationSpeed : 0;
        this.updateRotor(dt);
        this.drawTwistorVisualization();
        requestAnimationFrame(() => this.animate());
    }
}

// Keep original Rotor and Bivector classes (unchanged)
class Rotor {
    constructor(s, xy, xz, yz) {
        this.s = s;   
        this.xy = xy; 
        this.xz = xz;  
        this.yz = yz; 
    }
    
    multiply(other) {
        return new Rotor(
            this.s * other.s - this.xy * other.xy - this.xz * other.xz - this.yz * other.yz,
            this.s * other.xy + this.xy * other.s + this.xz * other.yz - this.yz * other.xz,
            this.s * other.xz - this.xy * other.yz + this.xz * other.s + this.yz * other.xy,
            this.s * other.yz + this.xy * other.xz - this.xz * other.xy + this.yz * other.s
        );
    }
    
    normalize() {
        const norm = Math.sqrt(this.s * this.s + this.xy * this.xy + this.xz * this.xz + this.yz * this.yz);
        if (norm > 0) {
            this.s /= norm;
            this.xy /= norm;
            this.xz /= norm;
            this.yz /= norm;
        }
    }
    
    rotateVector(v) {
        const w = this.s;
        const x = this.yz;  
        const y = -this.xz;
        const z = this.xy;
        
        const qx = w * v.x + y * v.z - z * v.y;
        const qy = w * v.y + z * v.x - x * v.z;
        const qz = w * v.z + x * v.y - y * v.x;
        const qw = -x * v.x - y * v.y - z * v.z;
        
        return {
            x: qw * (-x) + qx * w + qy * (-z) - qz * (-y),
            y: qw * (-y) + qy * w + qz * (-x) - qx * (-z),
            z: qw * (-z) + qz * w + qx * (-y) - qy * (-x)
        };
    }
}

class Bivector {
    constructor(xy, xz, yz) {
        this.xy = xy; 
        this.xz = xz; 
        this.yz = yz; 
    }
    
    toRotor(scale = 1.0) {
        const angle = Math.sqrt(this.xy * this.xy + this.xz * this.xz + this.yz * this.yz) * scale;
        
        if (angle < 1e-10) {
            return new Rotor(1, 0, 0, 0);
        }
        
        const cosHalf = Math.cos(angle / 2);
        const sinHalf = Math.sin(angle / 2) / angle * scale;
        
        return new Rotor(cosHalf, this.xy * sinHalf, this.xz * sinHalf, this.yz * sinHalf);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new PenroseTwistorVisualization('spinnerCanvas');
});
