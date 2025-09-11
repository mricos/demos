/**
 * Bivector class representing angular velocity in Clifford algebra
 * Bivectors represent oriented plane segments and are used for rotations
 */
class Bivector {
    constructor(xy, xz, yz) {
        this.xy = xy; // Rotation in xy-plane (around z-axis)
        this.xz = xz; // Rotation in xz-plane (around y-axis)
        this.yz = yz; // Rotation in yz-plane (around x-axis)
    }
    
    // Create bivector from axis-vector representation
    static fromAxis(axis) {
        return new Bivector(axis.z, -axis.y, axis.x);
    }
    
    // Create zero bivector
    static zero() {
        return new Bivector(0, 0, 0);
    }
    
    // Add bivectors
    add(other) {
        return new Bivector(
            this.xy + other.xy,
            this.xz + other.xz,
            this.yz + other.yz
        );
    }
    
    // Subtract bivectors
    subtract(other) {
        return new Bivector(
            this.xy - other.xy,
            this.xz - other.xz,
            this.yz - other.yz
        );
    }
    
    // Scale bivector
    scale(scalar) {
        return new Bivector(
            this.xy * scalar,
            this.xz * scalar,
            this.yz * scalar
        );
    }
    
    // Get magnitude squared
    magnitudeSquared() {
        return this.xy * this.xy + this.xz * this.xz + this.yz * this.yz;
    }
    
    // Get magnitude
    magnitude() {
        return Math.sqrt(this.magnitudeSquared());
    }
    
    // Normalize bivector
    normalize() {
        const mag = this.magnitude();
        if (mag > 1e-10) {
            this.xy /= mag;
            this.xz /= mag;
            this.yz /= mag;
        }
        return this;
    }
    
    // Get normalized copy
    normalized() {
        const copy = new Bivector(this.xy, this.xz, this.yz);
        return copy.normalize();
    }
    
    // Convert bivector to rotor using exponential map
    // This creates a rotor that represents rotation by this bivector
    toRotor(scale = 1.0) {
        const scaledBivector = this.scale(scale);
        const angle = scaledBivector.magnitude();
        
        if (angle < 1e-10) {
            return new Rotor(1, 0, 0, 0);
        }
        
        const cosHalf = Math.cos(angle * 0.5);
        const sinHalf = Math.sin(angle * 0.5) / angle;
        
        return new Rotor(
            cosHalf,
            scaledBivector.xy * sinHalf,
            scaledBivector.xz * sinHalf,
            scaledBivector.yz * sinHalf
        );
    }
    
    // Geometric product with another bivector
    geometricProduct(other) {
        // Returns a multivector (scalar + bivector parts)
        const scalar = -(this.xy * other.xy + this.xz * other.xz + this.yz * other.yz);
        
        const bivector = new Bivector(
            this.xz * other.yz - this.yz * other.xz,
            this.yz * other.xy - this.xy * other.yz,
            this.xy * other.xz - this.xz * other.xy
        );
        
        return { scalar, bivector };
    }
    
    // Commutator product (useful for angular velocity composition)
    commutator(other) {
        return new Bivector(
            this.xz * other.yz - this.yz * other.xz,
            this.yz * other.xy - this.xy * other.yz,
            this.xy * other.xz - this.xz * other.xy
        );
    }
    
    // Convert to axis-angle representation
    toAxisAngle() {
        const magnitude = this.magnitude();
        
        if (magnitude < 1e-10) {
            return { axis: {x: 1, y: 0, z: 0}, angle: 0 };
        }
        
        return {
            axis: {
                x: this.yz / magnitude,
                y: -this.xz / magnitude,
                z: this.xy / magnitude
            },
            angle: magnitude
        };
    }
    
    // Linear interpolation between bivectors
    static lerp(b1, b2, t) {
        return new Bivector(
            b1.xy + t * (b2.xy - b1.xy),
            b1.xz + t * (b2.xz - b1.xz),
            b1.yz + t * (b2.yz - b1.yz)
        );
    }
    
    // Create bivector from frequency and phase parameters
    static fromFrequencyPhase(freq, phase, amplitude = 1) {
        return new Bivector(
            amplitude * Math.cos(phase) * freq,
            amplitude * Math.sin(phase) * freq,
            amplitude * Math.cos(phase + Math.PI/3) * freq
        );
    }
    
    // Create oscillating bivector (useful for frequency splitting visualization)
    static oscillating(time, positiveFreq, negativeFreq, phase = 0) {
        const posComponent = Math.cos(positiveFreq * time + phase);
        const negComponent = Math.sin(negativeFreq * time + phase);
        
        return new Bivector(
            posComponent + negComponent,
            posComponent - negComponent,
            Math.cos((positiveFreq - negativeFreq) * time + phase)
        );
    }
    
    // Apply twistor-like transformation
    twistorTransform(twistorParam, nullFlagParam) {
        const transformed = new Bivector(
            this.xy * Math.cos(twistorParam) - this.xz * Math.sin(twistorParam),
            this.xy * Math.sin(twistorParam) + this.xz * Math.cos(twistorParam),
            this.yz * (1 + nullFlagParam)
        );
        
        return transformed;
    }
    
    // Create copy
    clone() {
        return new Bivector(this.xy, this.xz, this.yz);
    }
    
    // String representation
    toString() {
        return `Bivector(${this.xy.toFixed(3)}, ${this.xz.toFixed(3)}, ${this.yz.toFixed(3)})`;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Bivector;
}