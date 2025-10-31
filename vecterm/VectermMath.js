/**
 * VECTERM MATH - 3D Vector Graphics Mathematics Library
 * Provides Vector3, Matrix4x4, and utility functions for 3D transformations
 */

// ==========================================
// VECTOR3 - 3D Vector Mathematics
// ==========================================

class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  // Vector addition
  add(v) {
    return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  // Vector subtraction
  sub(v) {
    return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  // Scalar multiplication
  scale(s) {
    return new Vector3(this.x * s, this.y * s, this.z * s);
  }

  // Dot product
  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  // Cross product
  cross(v) {
    return new Vector3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }

  // Vector length (magnitude)
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  // Normalize vector (unit vector)
  normalize() {
    const len = this.length();
    if (len === 0) return new Vector3(0, 0, 0);
    return this.scale(1 / len);
  }

  // Distance to another vector
  distanceTo(v) {
    return this.sub(v).length();
  }

  // Clone vector
  clone() {
    return new Vector3(this.x, this.y, this.z);
  }

  // Convert to array [x, y, z]
  toArray() {
    return [this.x, this.y, this.z];
  }

  // Static constructors
  static zero() {
    return new Vector3(0, 0, 0);
  }

  static one() {
    return new Vector3(1, 1, 1);
  }

  static up() {
    return new Vector3(0, 1, 0);
  }

  static right() {
    return new Vector3(1, 0, 0);
  }

  static forward() {
    return new Vector3(0, 0, 1);
  }
}

// ==========================================
// MATRIX4X4 - 4x4 Transformation Matrix
// ==========================================

class Matrix4 {
  constructor(elements) {
    // Column-major order (like OpenGL)
    this.m = elements || [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];
  }

  // Get element at row i, column j (0-indexed)
  get(i, j) {
    return this.m[j * 4 + i];
  }

  // Set element at row i, column j
  set(i, j, value) {
    this.m[j * 4 + i] = value;
  }

  // Matrix multiplication (this * other)
  multiply(other) {
    const result = new Matrix4();
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += this.get(i, k) * other.get(k, j);
        }
        result.set(i, j, sum);
      }
    }
    return result;
  }

  // Transform a Vector3 by this matrix (treats as point with w=1)
  transformPoint(v) {
    const x = v.x * this.get(0, 0) + v.y * this.get(0, 1) + v.z * this.get(0, 2) + this.get(0, 3);
    const y = v.x * this.get(1, 0) + v.y * this.get(1, 1) + v.z * this.get(1, 2) + this.get(1, 3);
    const z = v.x * this.get(2, 0) + v.y * this.get(2, 1) + v.z * this.get(2, 2) + this.get(2, 3);
    const w = v.x * this.get(3, 0) + v.y * this.get(3, 1) + v.z * this.get(3, 2) + this.get(3, 3);

    // Perspective divide
    if (w !== 0 && w !== 1) {
      return new Vector3(x / w, y / w, z / w);
    }
    return new Vector3(x, y, z);
  }

  // Transform a Vector3 by this matrix (treats as direction with w=0)
  transformDirection(v) {
    const x = v.x * this.get(0, 0) + v.y * this.get(0, 1) + v.z * this.get(0, 2);
    const y = v.x * this.get(1, 0) + v.y * this.get(1, 1) + v.z * this.get(1, 2);
    const z = v.x * this.get(2, 0) + v.y * this.get(2, 1) + v.z * this.get(2, 2);
    return new Vector3(x, y, z);
  }

  // Clone matrix
  clone() {
    return new Matrix4([...this.m]);
  }

  // Static factory methods

  static identity() {
    return new Matrix4();
  }

  static translation(x, y, z) {
    return new Matrix4([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      x, y, z, 1
    ]);
  }

  static scale(sx, sy, sz) {
    return new Matrix4([
      sx, 0,  0,  0,
      0,  sy, 0,  0,
      0,  0,  sz, 0,
      0,  0,  0,  1
    ]);
  }

  static rotationX(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Matrix4([
      1, 0,  0, 0,
      0, c,  s, 0,
      0, -s, c, 0,
      0, 0,  0, 1
    ]);
  }

  static rotationY(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Matrix4([
      c, 0, -s, 0,
      0, 1,  0, 0,
      s, 0,  c, 0,
      0, 0,  0, 1
    ]);
  }

  static rotationZ(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Matrix4([
      c,  s, 0, 0,
      -s, c, 0, 0,
      0,  0, 1, 0,
      0,  0, 0, 1
    ]);
  }

  // Look-at matrix (camera transformation)
  static lookAt(eye, target, up) {
    const z = eye.sub(target).normalize();  // Forward (away from target)
    const x = up.cross(z).normalize();      // Right
    const y = z.cross(x);                    // Up

    return new Matrix4([
      x.x, y.x, z.x, 0,
      x.y, y.y, z.y, 0,
      x.z, y.z, z.z, 0,
      -x.dot(eye), -y.dot(eye), -z.dot(eye), 1
    ]);
  }

  // Perspective projection matrix
  static perspective(fov, aspect, near, far) {
    const f = 1.0 / Math.tan(fov / 2);
    const rangeInv = 1.0 / (near - far);

    return new Matrix4([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (near + far) * rangeInv, -1,
      0, 0, near * far * rangeInv * 2, 0
    ]);
  }

  // Orthographic projection matrix
  static orthographic(left, right, bottom, top, near, far) {
    const w = right - left;
    const h = top - bottom;
    const d = far - near;

    return new Matrix4([
      2/w, 0,   0,    0,
      0,   2/h, 0,    0,
      0,   0,   -2/d, 0,
      -(right+left)/w, -(top+bottom)/h, -(far+near)/d, 1
    ]);
  }
}

// ==========================================
// CAMERA - 3D Camera
// ==========================================

class Camera {
  constructor(position = new Vector3(0, 0, 5), target = new Vector3(0, 0, 0)) {
    this.position = position;
    this.target = target;
    this.up = new Vector3(0, 1, 0);
    this.fov = Math.PI / 4;  // 45 degrees
    this.near = 0.1;
    this.far = 1000;
    this.aspect = 1;  // Will be set by renderer
  }

  // Get view matrix (world → camera space)
  getViewMatrix() {
    return Matrix4.lookAt(this.position, this.target, this.up);
  }

  // Get projection matrix (camera → clip space)
  getProjectionMatrix(projectionType = 'perspective') {
    if (projectionType === 'orthographic') {
      const size = 10;
      return Matrix4.orthographic(
        -size * this.aspect, size * this.aspect,
        -size, size,
        this.near, this.far
      );
    }
    return Matrix4.perspective(this.fov, this.aspect, this.near, this.far);
  }

  // Orbit around target
  orbit(deltaAzimuth, deltaElevation) {
    const offset = this.position.sub(this.target);
    const radius = offset.length();

    // Convert to spherical coordinates
    let azimuth = Math.atan2(offset.x, offset.z);
    let elevation = Math.asin(offset.y / radius);

    // Apply deltas
    azimuth += deltaAzimuth;
    elevation = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, elevation + deltaElevation));

    // Convert back to Cartesian
    this.position = new Vector3(
      this.target.x + radius * Math.sin(azimuth) * Math.cos(elevation),
      this.target.y + radius * Math.sin(elevation),
      this.target.z + radius * Math.cos(azimuth) * Math.cos(elevation)
    );
  }

  // Zoom (move closer/farther from target)
  zoom(delta) {
    const direction = this.target.sub(this.position).normalize();
    this.position = this.position.add(direction.scale(delta));
  }
}

// ==========================================
// EXPORTS
// ==========================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Vector3, Matrix4, Camera };
} else {
  window.VectermMath = { Vector3, Matrix4, Camera };
}
