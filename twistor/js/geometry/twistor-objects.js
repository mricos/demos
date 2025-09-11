/**
 * TwistorObjects: Various geometric representations for different scenes
 * Each object type represents different aspects of twistor theory
 */

/**
 * Base TwistorObject class
 */
class TwistorObject {
    constructor(config = {}) {
        this.position = config.position || { x: 0, y: 0, z: 0 };
        this.scale = config.scale || 1.0;
        this.color = config.color || '#3498db';
        this.highlighted = false;
        this.animationPhase = 0;
    }
    
    setHighlight(highlighted) {
        this.highlighted = highlighted;
    }
    
    updateAnimation(time, params) {
        this.animationPhase = time;
    }
    
    getVertices(rotor) {
        throw new Error('getVertices must be implemented by subclass');
    }
    
    render(ctx, projectionFn, rotor, params = {}) {
        const vertices = this.getVertices(rotor);
        this.drawGeometry(ctx, vertices, params);
    }
    
    drawGeometry(ctx, vertices, params) {
        // Default implementation - override in subclasses
        ctx.strokeStyle = this.highlighted ? '#f39c12' : this.color;
        ctx.lineWidth = this.highlighted ? 3 : 2;
        
        if (this.highlighted) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
        }
        
        ctx.beginPath();
        vertices.forEach((vertex, i) => {
            if (i === 0) ctx.moveTo(vertex.x, vertex.y);
            else ctx.lineTo(vertex.x, vertex.y);
        });
        ctx.stroke();
        
        ctx.shadowBlur = 0;
    }
}

/**
 * Two-Component Spinor visualization
 * Represents the fundamental spinor structure
 */
class TwoComponentSpinor extends TwistorObject {
    constructor(config = {}) {
        super(config);
        this.spinorPhase = config.spinorPhase || 0;
        this.frequency = config.frequency || 1;
    }
    
    updateAnimation(time, params) {
        super.updateAnimation(time, params);
        this.spinorPhase = params.spinorPhase || this.spinorPhase;
        this.frequency = params.frequencySplit || this.frequency;
    }
    
    getVertices(rotor) {
        const vertices = [];
        const radius = 60 * this.scale;
        const numPoints = 16;
        
        // Create undotted spinor component (positive helicity)
        for (let i = 0; i <= numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const point = {
                x: Math.cos(angle + this.spinorPhase) * radius,
                y: Math.sin(angle + this.spinorPhase) * radius * 0.5,
                z: Math.cos(angle * 2 + this.animationPhase * this.frequency) * 20
            };
            
            const rotated = rotor.rotateVector(point);
            vertices.push(rotated);
        }
        
        return vertices;
    }
    
    render(ctx, projectionFn, rotor, params = {}) {
        const vertices = this.getVertices(rotor);
        const projectedVertices = vertices.map(projectionFn);
        
        // Draw undotted spinor (positive frequency)
        ctx.strokeStyle = this.highlighted ? '#f39c12' : '#27ae60';
        ctx.lineWidth = this.highlighted ? 4 : 2;
        ctx.setLineDash([]);
        
        if (this.highlighted) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#27ae60';
        }
        
        ctx.beginPath();
        projectedVertices.forEach((vertex, i) => {
            if (i === 0) ctx.moveTo(vertex.x, vertex.y);
            else ctx.lineTo(vertex.x, vertex.y);
        });
        ctx.stroke();
        
        // Draw dotted spinor (negative frequency) - phase shifted
        const dottedVertices = [];
        for (let i = 0; i <= 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const point = {
                x: Math.cos(angle - this.spinorPhase) * 40 * this.scale,
                y: Math.sin(angle - this.spinorPhase) * 40 * this.scale,
                z: Math.sin(angle * 2 - this.animationPhase * this.frequency) * 15
            };
            
            const rotated = rotor.rotateVector(point);
            dottedVertices.push(projectionFn(rotated));
        }
        
        ctx.strokeStyle = this.highlighted ? '#f39c12' : '#e74c3c';
        ctx.setLineDash([5, 5]);
        
        ctx.beginPath();
        dottedVertices.forEach((vertex, i) => {
            if (i === 0) ctx.moveTo(vertex.x, vertex.y);
            else ctx.lineTo(vertex.x, vertex.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.shadowBlur = 0;
    }
}

/**
 * Clifford-Hopf Fibering visualization
 * Shows the geometric bridge between spaces
 */
class CliffordHopfFiber extends TwistorObject {
    constructor(config = {}) {
        super(config);
        this.fiberParam = config.fiberParam || 0.1;
        this.numFibers = config.numFibers || 8;
    }
    
    updateAnimation(time, params) {
        super.updateAnimation(time, params);
        this.fiberParam = params.cliffordHopf || this.fiberParam;
    }
    
    render(ctx, projectionFn, rotor, params = {}) {
        const center = projectionFn({ x: 0, y: 0, z: 0 });
        
        // Draw fiber bundle structure
        for (let i = 0; i < this.numFibers; i++) {
            const baseAngle = (i / this.numFibers) * Math.PI * 2;
            const fiberVertices = [];
            
            // Create fiber path
            for (let t = 0; t <= 1; t += 0.1) {
                const radius = 80 * this.scale;
                const height = t * 60;
                
                const point = {
                    x: Math.cos(baseAngle + t * this.fiberParam * Math.PI) * radius * (1 - t * 0.3),
                    y: Math.sin(baseAngle + t * this.fiberParam * Math.PI) * radius * (1 - t * 0.3),
                    z: height - 30 + Math.sin(this.animationPhase + baseAngle) * 10
                };
                
                const rotated = rotor.rotateVector(point);
                fiberVertices.push(projectionFn(rotated));
            }
            
            // Draw fiber
            ctx.strokeStyle = this.highlighted ? '#f39c12' : '#9b59b6';
            ctx.lineWidth = this.highlighted ? 3 : 2;
            ctx.globalAlpha = 0.7;
            
            if (this.highlighted) {
                ctx.shadowBlur = 8;
                ctx.shadowColor = '#9b59b6';
            }
            
            ctx.beginPath();
            fiberVertices.forEach((vertex, i) => {
                if (i === 0) ctx.moveTo(vertex.x, vertex.y);
                else ctx.lineTo(vertex.x, vertex.y);
            });
            ctx.stroke();
        }
        
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }
}

/**
 * Null Flag Structure visualization
 * Shows the geometric relationship in spinor space
 */
class NullFlagStructure extends TwistorObject {
    constructor(config = {}) {
        super(config);
        this.flagOrientation = config.flagOrientation || 0.3;
        this.numFlags = config.numFlags || 6;
    }
    
    updateAnimation(time, params) {
        super.updateAnimation(time, params);
        this.flagOrientation = params.nullFlags || this.flagOrientation;
    }
    
    render(ctx, projectionFn, rotor, params = {}) {
        // Draw null flags at various orientations
        for (let i = 0; i < this.numFlags; i++) {
            const angle = (i / this.numFlags) * Math.PI * 2;
            const flagVertices = [];
            
            // Create flag geometry
            const flagSize = 40 * this.scale;
            const flagPoints = [
                { x: 0, y: 0, z: 0 },
                { 
                    x: Math.cos(angle) * flagSize, 
                    y: Math.sin(angle) * flagSize * this.flagOrientation,
                    z: Math.sin(this.animationPhase + angle) * 15
                },
                {
                    x: Math.cos(angle + Math.PI/3) * flagSize * 0.7,
                    y: Math.sin(angle + Math.PI/3) * flagSize * this.flagOrientation * 0.7,
                    z: Math.cos(this.animationPhase + angle + Math.PI/3) * 10
                }
            ];
            
            flagPoints.forEach(point => {
                const rotated = rotor.rotateVector(point);
                flagVertices.push(projectionFn(rotated));
            });
            
            // Draw flag triangle
            ctx.strokeStyle = this.highlighted ? '#f39c12' : '#e67e22';
            ctx.fillStyle = this.highlighted ? 
                'rgba(243, 156, 18, 0.3)' : 'rgba(230, 126, 34, 0.2)';
            ctx.lineWidth = this.highlighted ? 3 : 1;
            
            if (this.highlighted) {
                ctx.shadowBlur = 6;
                ctx.shadowColor = '#e67e22';
            }
            
            ctx.beginPath();
            ctx.moveTo(flagVertices[0].x, flagVertices[0].y);
            ctx.lineTo(flagVertices[1].x, flagVertices[1].y);
            ctx.lineTo(flagVertices[2].x, flagVertices[2].y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        
        ctx.shadowBlur = 0;
    }
}

/**
 * Twistor Space Projection visualization
 * Shows the mapping between spaces
 */
class TwistorSpaceProjection extends TwistorObject {
    constructor(config = {}) {
        super(config);
        this.projectionIntensity = config.projectionIntensity || 1.0;
    }
    
    updateAnimation(time, params) {
        super.updateAnimation(time, params);
        this.projectionIntensity = params.twistorCouple || this.projectionIntensity;
    }
    
    render(ctx, projectionFn, rotor, params = {}) {
        const center = projectionFn({ x: 0, y: 0, z: 0 });
        
        // Draw projection lines between different spaces
        const numProjections = 12;
        
        for (let i = 0; i < numProjections; i++) {
            const angle = (i / numProjections) * Math.PI * 2;
            
            // Point in "real" space
            const realPoint = {
                x: Math.cos(angle) * 70 * this.scale,
                y: Math.sin(angle) * 70 * this.scale,
                z: 0
            };
            
            // Corresponding point in "twistor" space
            const twistorPoint = {
                x: Math.cos(angle + this.projectionIntensity) * 100 * this.scale,
                y: Math.sin(angle + this.projectionIntensity) * 50 * this.scale,
                z: Math.sin(angle * 2 + this.animationPhase) * 30
            };
            
            const rotatedReal = rotor.rotateVector(realPoint);
            const rotatedTwistor = rotor.rotateVector(twistorPoint);
            
            const projectedReal = projectionFn(rotatedReal);
            const projectedTwistor = projectionFn(rotatedTwistor);
            
            // Draw projection line
            ctx.strokeStyle = this.highlighted ? '#f39c12' : '#3498db';
            ctx.lineWidth = this.highlighted ? 2 : 1;
            ctx.globalAlpha = 0.6;
            ctx.setLineDash([3, 3]);
            
            if (this.highlighted) {
                ctx.shadowBlur = 5;
                ctx.shadowColor = '#3498db';
            }
            
            ctx.beginPath();
            ctx.moveTo(projectedReal.x, projectedReal.y);
            ctx.lineTo(projectedTwistor.x, projectedTwistor.y);
            ctx.stroke();
            
            // Draw points
            ctx.setLineDash([]);
            ctx.fillStyle = this.highlighted ? '#f39c12' : '#2c3e50';
            
            ctx.beginPath();
            ctx.arc(projectedReal.x, projectedReal.y, 3, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(projectedTwistor.x, projectedTwistor.y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.globalAlpha = 1;
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
    }
}

/**
 * Penrose Transform visualization
 * Shows the holomorphic mapping
 */
class PenroseTransform extends TwistorObject {
    constructor(config = {}) {
        super(config);
        this.transformComplexity = config.transformComplexity || 1.0;
    }
    
    updateAnimation(time, params) {
        super.updateAnimation(time, params);
        // Use multiple parameters for complex visualization
        this.transformComplexity = (params.twistorCouple || 1) * 
                                  (params.cliffordHopf || 0.1) * 10;
    }
    
    render(ctx, projectionFn, rotor, params = {}) {
        // Draw complex holomorphic structure
        const numLayers = 4;
        const pointsPerLayer = 8;
        
        for (let layer = 0; layer < numLayers; layer++) {
            const layerRadius = (layer + 1) * 20 * this.scale;
            const layerHeight = (layer - numLayers/2) * 15;
            
            for (let i = 0; i < pointsPerLayer; i++) {
                const angle = (i / pointsPerLayer) * Math.PI * 2 + 
                             layer * Math.PI / 4 + 
                             this.animationPhase * this.transformComplexity;
                
                const point = {
                    x: Math.cos(angle) * layerRadius,
                    y: Math.sin(angle) * layerRadius,
                    z: layerHeight + Math.sin(angle * 3 + this.animationPhase) * 8
                };
                
                const rotated = rotor.rotateVector(point);
                const projected = projectionFn(rotated);
                
                // Draw holomorphic structure elements
                ctx.fillStyle = this.highlighted ? '#f39c12' : 
                    `hsl(${(layer * 60 + i * 20) % 360}, 70%, 50%)`;
                ctx.globalAlpha = 0.8;
                
                if (this.highlighted) {
                    ctx.shadowBlur = 4;
                    ctx.shadowColor = ctx.fillStyle;
                }
                
                ctx.beginPath();
                ctx.arc(projected.x, projected.y, 4 - layer, 0, Math.PI * 2);
                ctx.fill();
                
                // Connect adjacent points in layer
                if (i > 0) {
                    const prevAngle = ((i-1) / pointsPerLayer) * Math.PI * 2 + 
                                     layer * Math.PI / 4 + 
                                     this.animationPhase * this.transformComplexity;
                    
                    const prevPoint = {
                        x: Math.cos(prevAngle) * layerRadius,
                        y: Math.sin(prevAngle) * layerRadius,
                        z: layerHeight + Math.sin(prevAngle * 3 + this.animationPhase) * 8
                    };
                    
                    const rotatedPrev = rotor.rotateVector(prevPoint);
                    const projectedPrev = projectionFn(rotatedPrev);
                    
                    ctx.strokeStyle = this.highlighted ? '#f39c12' : ctx.fillStyle;
                    ctx.lineWidth = 1;
                    ctx.globalAlpha = 0.4;
                    
                    ctx.beginPath();
                    ctx.moveTo(projectedPrev.x, projectedPrev.y);
                    ctx.lineTo(projected.x, projected.y);
                    ctx.stroke();
                }
            }
        }
        
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TwistorObject,
        TwoComponentSpinor,
        CliffordHopfFiber,
        NullFlagStructure,
        TwistorSpaceProjection,
        PenroseTransform
    };
}