/**
 * View Component: Handles canvas rendering, 3D projection, and visual output
 * Modular component that can be configured for different scenes
 */
class TwistorView {
    constructor(canvasId, config = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas with id '${canvasId}' not found`);
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // View configuration
        this.config = {
            // Camera settings
            cameraDistance: 400,
            fieldOfView: Math.PI / 4,
            nearPlane: 0.1,
            farPlane: 1000,
            
            // Rendering settings
            backgroundColor: '#f8f9fa',
            showAxes: true,
            axisLength: 100,
            gridSize: 20,
            showGrid: false,
            
            // Animation settings
            enableAntialiasing: true,
            renderQuality: 'high', // 'low', 'medium', 'high'
            
            // Visual effects
            enableShadows: true,
            enableGlow: true,
            ambientLight: 0.3,
            
            ...config
        };
        
        // Rendering state
        this.rotor = new Rotor(1, 0, 0, 0);
        this.objects = [];
        this.highlightedObjects = new Set();
        this.animationTime = 0;
        
        // Camera state
        this.camera = {
            position: { x: 0, y: 0, z: this.config.cameraDistance },
            target: { x: 0, y: 0, z: 0 },
            up: { x: 0, y: 1, z: 0 }
        };
        
        // Setup canvas
        this.setupCanvas();
    }
    
    setupCanvas() {
        // Set up high DPI rendering
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        this.width = rect.width;
        this.height = rect.height;
        
        // Enable antialiasing based on config
        if (this.config.enableAntialiasing) {
            this.ctx.imageSmoothingEnabled = true;
            this.ctx.imageSmoothingQuality = this.config.renderQuality;
        }
    }
    
    // 3D to 2D projection
    project3D(point) {
        // Simple perspective projection
        const distance = this.config.cameraDistance;
        const scale = distance / (distance + point.z);
        
        return {
            x: this.width / 2 + point.x * scale,
            y: this.height / 2 - point.y * scale,
            z: point.z,
            scale: scale
        };
    }
    
    // Advanced projection with camera transformation
    projectWithCamera(point) {
        // Transform point relative to camera
        const transformed = {
            x: point.x - this.camera.position.x,
            y: point.y - this.camera.position.y,
            z: point.z - this.camera.position.z
        };
        
        // Apply perspective projection
        const distance = Math.sqrt(
            transformed.x * transformed.x + 
            transformed.y * transformed.y + 
            transformed.z * transformed.z
        );
        
        if (distance < this.config.nearPlane) return null;
        
        const scale = this.config.cameraDistance / (this.config.cameraDistance + transformed.z);
        
        return {
            x: this.width / 2 + transformed.x * scale,
            y: this.height / 2 - transformed.y * scale,
            z: transformed.z,
            scale: scale,
            distance: distance
        };
    }
    
    // Set camera position and orientation
    setCamera(position, target, up) {
        this.camera.position = position || this.camera.position;
        this.camera.target = target || this.camera.target;
        this.camera.up = up || this.camera.up;
    }
    
    // Update rotor for 3D transformations
    setRotor(rotor) {
        this.rotor = rotor;
    }
    
    // Add object to render
    addObject(object) {
        this.objects.push(object);
    }
    
    // Remove object from render
    removeObject(object) {
        const index = this.objects.indexOf(object);
        if (index > -1) {
            this.objects.splice(index, 1);
        }
    }
    
    // Clear all objects
    clearObjects() {
        this.objects = [];
        this.highlightedObjects.clear();
    }
    
    // Highlight specific objects
    highlightObjects(objectKeys, highlight = true) {
        this.objects.forEach(obj => {
            if (objectKeys.includes(obj.type) || objectKeys.includes(obj.id)) {
                obj.setHighlight(highlight);
                
                if (highlight) {
                    this.highlightedObjects.add(obj);
                } else {
                    this.highlightedObjects.delete(obj);
                }
            }
        });
    }
    
    // Clear canvas and prepare for drawing
    clear() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Set background
        this.ctx.fillStyle = this.config.backgroundColor;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Reset context state
        this.ctx.globalAlpha = 1;
        this.ctx.shadowBlur = 0;
        this.ctx.setLineDash([]);
    }
    
    // Draw coordinate axes
    drawAxes() {
        if (!this.config.showAxes) return;
        
        const axisLength = this.config.axisLength;
        const axes = [
            { 
                point: { x: axisLength, y: 0, z: 0 }, 
                color: '#e74c3c', 
                label: 'X'
            },
            { 
                point: { x: 0, y: axisLength, z: 0 }, 
                color: '#27ae60', 
                label: 'Y'
            },
            { 
                point: { x: 0, y: 0, z: axisLength }, 
                color: '#3498db', 
                label: 'Z'
            }
        ];
        
        const center = this.project3D({ x: 0, y: 0, z: 0 });
        
        axes.forEach(axis => {
            const rotated = this.rotor.rotateVector(axis.point);
            const projected = this.project3D(rotated);
            
            // Draw axis line
            this.ctx.strokeStyle = axis.color;
            this.ctx.lineWidth = 2;
            this.ctx.globalAlpha = 0.8;
            
            this.ctx.beginPath();
            this.ctx.moveTo(center.x, center.y);
            this.ctx.lineTo(projected.x, projected.y);
            this.ctx.stroke();
            
            // Draw axis label
            this.ctx.fillStyle = axis.color;
            this.ctx.font = 'bold 12px sans-serif';
            this.ctx.fillText(axis.label, projected.x + 5, projected.y - 5);
        });
        
        this.ctx.globalAlpha = 1;
    }
    
    // Draw grid
    drawGrid() {
        if (!this.config.showGrid) return;
        
        const gridSize = this.config.gridSize;
        const numLines = 10;
        
        this.ctx.strokeStyle = '#ecf0f1';
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 0.5;
        
        // Draw grid lines
        for (let i = -numLines; i <= numLines; i++) {
            const offset = i * gridSize;
            
            // X-direction lines
            const xStart = this.rotor.rotateVector({ x: -numLines * gridSize, y: offset, z: 0 });
            const xEnd = this.rotor.rotateVector({ x: numLines * gridSize, y: offset, z: 0 });
            
            const xStartProj = this.project3D(xStart);
            const xEndProj = this.project3D(xEnd);
            
            this.ctx.beginPath();
            this.ctx.moveTo(xStartProj.x, xStartProj.y);
            this.ctx.lineTo(xEndProj.x, xEndProj.y);
            this.ctx.stroke();
            
            // Y-direction lines
            const yStart = this.rotor.rotateVector({ x: offset, y: -numLines * gridSize, z: 0 });
            const yEnd = this.rotor.rotateVector({ x: offset, y: numLines * gridSize, z: 0 });
            
            const yStartProj = this.project3D(yStart);
            const yEndProj = this.project3D(yEnd);
            
            this.ctx.beginPath();
            this.ctx.moveTo(yStartProj.x, yStartProj.y);
            this.ctx.lineTo(yEndProj.x, yEndProj.y);
            this.ctx.stroke();
        }
        
        this.ctx.globalAlpha = 1;
    }
    
    // Update animation time
    updateAnimation(time) {
        this.animationTime = time;
    }
    
    // Render all objects
    renderObjects(params = {}) {
        // Sort objects by z-depth for proper rendering order
        const sortedObjects = [...this.objects].sort((a, b) => {
            const aCenter = this.rotor.rotateVector(a.position || { x: 0, y: 0, z: 0 });
            const bCenter = this.rotor.rotateVector(b.position || { x: 0, y: 0, z: 0 });
            return bCenter.z - aCenter.z; // Far to near
        });
        
        // Update object animations
        sortedObjects.forEach(obj => {
            if (obj.updateAnimation) {
                obj.updateAnimation(this.animationTime, params);
            }
        });
        
        // Render objects
        sortedObjects.forEach(obj => {
            if (obj.render) {
                obj.render(this.ctx, (point) => this.project3D(point), this.rotor, params);
            }
        });
    }
    
    // Main render method
    render(params = {}) {
        this.clear();
        
        // Draw background elements
        if (this.config.showGrid) {
            this.drawGrid();
        }
        
        if (this.config.showAxes) {
            this.drawAxes();
        }
        
        // Render all objects
        this.renderObjects(params);
        
        // Apply post-processing effects if enabled
        if (this.config.enableGlow && this.highlightedObjects.size > 0) {
            this.applyGlowEffect();
        }
    }
    
    // Apply glow effect to highlighted objects
    applyGlowEffect() {
        // This would implement a more sophisticated glow effect
        // For now, the glow is handled in individual object rendering
    }
    
    // Resize handler
    resize() {
        this.setupCanvas();
    }
    
    // Get canvas element for external manipulation
    getCanvas() {
        return this.canvas;
    }
    
    // Get rendering context
    getContext() {
        return this.ctx;
    }
    
    // Update configuration
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // Apply configuration changes that require immediate action
        if (newConfig.hasOwnProperty('enableAntialiasing') || 
            newConfig.hasOwnProperty('renderQuality')) {
            this.setupCanvas();
        }
    }
    
    // Export current frame as image
    exportFrame() {
        return this.canvas.toDataURL();
    }
    
    // Scene transition methods
    fadeIn(duration = 1000) {
        return new Promise(resolve => {
            const startTime = Date.now();
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                this.ctx.globalAlpha = progress;
                this.render();
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            animate();
        });
    }
    
    fadeOut(duration = 1000) {
        return new Promise(resolve => {
            const startTime = Date.now();
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                this.ctx.globalAlpha = 1 - progress;
                this.render();
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.ctx.globalAlpha = 1;
                    resolve();
                }
            };
            animate();
        });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TwistorView;
}