/**
 * Rotor class for 3D rotations using Clifford algebra
 * Represents even elements in Cl(3,0) for rotation operations
 */
class Rotor {
    constructor(s, xy, xz, yz) {
        this.s = s;   // Scalar part
        this.xy = xy; // e12 bivector component
        this.xz = xz; // e13 bivector component  
        this.yz = yz; // e23 bivector component
    }
    
    // Create rotor from axis-angle representation
    static fromAxisAngle(axis, angle) {
        const halfAngle = angle * 0.5;
        const cosHalf = Math.cos(halfAngle);
        const sinHalf = Math.sin(halfAngle);
        
        return new Rotor(
            cosHalf,
            axis.x * sinHalf, // yz component maps to x-axis rotation
            axis.y * sinHalf, // xz component maps to y-axis rotation  
            axis.z * sinHalf  // xy component maps to z-axis rotation
        );
    }
    
    // Create identity rotor
    static identity() {
        return new Rotor(1, 0, 0, 0);
    }
    
    // Create rotor from Euler angles
    static fromEuler(x, y, z) {
        const rx = Rotor.fromAxisAngle({x: 1, y: 0, z: 0}, x);
        const ry = Rotor.fromAxisAngle({x: 0, y: 1, z: 0}, y);
        const rz = Rotor.fromAxisAngle({x: 0, y: 0, z: 1}, z);
        
        return rz.multiply(ry).multiply(rx);
    }
    
    // Multiply two rotors (compose rotations)
    multiply(other) {
        return new Rotor(
            this.s * other.s - this.xy * other.xy - this.xz * other.xz - this.yz * other.yz,
            this.s * other.xy + this.xy * other.s + this.xz * other.yz - this.yz * other.xz,
            this.s * other.xz - this.xy * other.yz + this.xz * other.s + this.yz * other.xy,
            this.s * other.yz + this.xy * other.xz - this.xz * other.xy + this.yz * other.s
        );
    }
    
    // Get conjugate (reverse rotation)
    conjugate() {
        return new Rotor(this.s, -this.xy, -this.xz, -this.yz);
    }
    
    // Normalize the rotor
    normalize() {
        const norm = Math.sqrt(this.s * this.s + this.xy * this.xy + this.xz * this.xz + this.yz * this.yz);
        if (norm > 1e-10) {
            this.s /= norm;
            this.xy /= norm;
            this.xz /= norm;
            this.yz /= norm;
        }
        return this;
    }
    
    // Get normalized copy
    normalized() {
        const copy = new Rotor(this.s, this.xy, this.xz, this.yz);
        return copy.normalize();
    }
    
    // Rotate a 3D vector using this rotor
    rotateVector(v) {
        // Convert to quaternion format for rotation
        const w = this.s;
        const x = this.yz;  // Bivector to quaternion mapping
        const y = -this.xz;
        const z = this.xy;
        
        // Quaternion rotation formula: q * v * q_conj
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
    
    // Linear interpolation between rotors
    static lerp(r1, r2, t) {
        const result = new Rotor(
            r1.s + t * (r2.s - r1.s),
            r1.xy + t * (r2.xy - r1.xy),
            r1.xz + t * (r2.xz - r1.xz),
            r1.yz + t * (r2.yz - r1.yz)
        );
        return result.normalize();
    }
    
    // Spherical linear interpolation between rotors
    static slerp(r1, r2, t) {
        let dot = r1.s * r2.s + r1.xy * r2.xy + r1.xz * r2.xz + r1.yz * r2.yz;
        
        // Handle negative dot product
        let r2_adj = r2;
        if (dot < 0) {
            dot = -dot;
            r2_adj = new Rotor(-r2.s, -r2.xy, -r2.xz, -r2.yz);
        }
        
        if (dot > 0.9995) {
            // Use linear interpolation for very close rotors
            return Rotor.lerp(r1, r2_adj, t);
        }
        
        const angle = Math.acos(Math.abs(dot));
        const sinAngle = Math.sin(angle);
        const factor1 = Math.sin((1 - t) * angle) / sinAngle;
        const factor2 = Math.sin(t * angle) / sinAngle;
        
        return new Rotor(
            factor1 * r1.s + factor2 * r2_adj.s,
            factor1 * r1.xy + factor2 * r2_adj.xy,
            factor1 * r1.xz + factor2 * r2_adj.xz,
            factor1 * r1.yz + factor2 * r2_adj.yz
        );
    }
    
    // Convert to matrix representation
    toMatrix() {
        const w = this.s, x = this.yz, y = -this.xz, z = this.xy;
        
        return [
            [1 - 2*y*y - 2*z*z, 2*x*y - 2*w*z, 2*x*z + 2*w*y],
            [2*x*y + 2*w*z, 1 - 2*x*x - 2*z*z, 2*y*z - 2*w*x],
            [2*x*z - 2*w*y, 2*y*z + 2*w*x, 1 - 2*x*x - 2*y*y]
        ];
    }
    
    // Get rotation angle
    getAngle() {
        return 2 * Math.acos(Math.abs(this.s));
    }
    
    // Get rotation axis
    getAxis() {
        const sinHalfAngle = Math.sqrt(this.xy*this.xy + this.xz*this.xz + this.yz*this.yz);
        
        if (sinHalfAngle < 1e-10) {
            return {x: 1, y: 0, z: 0}; // Arbitrary axis for zero rotation
        }
        
        return {
            x: this.yz / sinHalfAngle,
            y: -this.xz / sinHalfAngle,
            z: this.xy / sinHalfAngle
        };
    }
    
    // Create copy
    clone() {
        return new Rotor(this.s, this.xy, this.xz, this.yz);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Rotor;
}