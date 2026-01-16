/**
 * Camera3D - Unified 3D camera for both CSS and WebGL rendering
 * Provides consistent camera behavior across rendering systems
 *
 * Coordinate System:
 * - Right-handed coordinate system
 * - +X = right, +Y = up, +Z = toward viewer
 * - Origin (0,0,0) is world center
 */

import { vec3 } from './math/vec3.js';
import { mat4 } from './math/mat4.js';
import { quat } from './math/quat.js';

export class Camera3D {
    constructor(options = {}) {
        // Position and orientation
        this.position = vec3.clone(options.position || vec3.create(0, 0, 5));
        this.target = vec3.clone(options.target || vec3.ZERO);
        this.up = vec3.clone(options.up || vec3.UP);

        // Projection parameters
        this.fov = options.fov ?? 60;  // degrees
        this.near = options.near ?? 0.1;
        this.far = options.far ?? 100;
        this.aspect = options.aspect ?? 16 / 9;

        // Orbit controls state
        this.orbitRadius = options.orbitRadius ?? vec3.distance(this.position, this.target);
        this.orbitPitch = options.orbitPitch ?? 0;  // radians, rotation around X
        this.orbitYaw = options.orbitYaw ?? 0;      // radians, rotation around Y

        // Cached matrices
        this._viewMatrix = mat4.create();
        this._projectionMatrix = mat4.create();
        this._viewProjectionMatrix = mat4.create();
        this._inverseViewMatrix = mat4.create();
        this._dirty = true;

        // Update matrices
        this._updateMatrices();
    }

    /**
     * Set camera position directly
     */
    setPosition(x, y, z) {
        if (typeof x === 'object') {
            this.position = vec3.clone(x);
        } else {
            this.position = vec3.create(x, y, z);
        }
        this.orbitRadius = vec3.distance(this.position, this.target);
        this._dirty = true;
        return this;
    }

    /**
     * Set camera target (look-at point)
     */
    setTarget(x, y, z) {
        if (typeof x === 'object') {
            this.target = vec3.clone(x);
        } else {
            this.target = vec3.create(x, y, z);
        }
        this.orbitRadius = vec3.distance(this.position, this.target);
        this._dirty = true;
        return this;
    }

    /**
     * Set field of view in degrees
     */
    setFOV(fov) {
        this.fov = fov;
        this._dirty = true;
        return this;
    }

    /**
     * Set aspect ratio
     */
    setAspect(aspect) {
        this.aspect = aspect;
        this._dirty = true;
        return this;
    }

    /**
     * Set near/far clipping planes
     */
    setClipping(near, far) {
        this.near = near;
        this.far = far;
        this._dirty = true;
        return this;
    }

    /**
     * Orbit camera around target
     * @param {number} deltaYaw - Horizontal rotation (radians)
     * @param {number} deltaPitch - Vertical rotation (radians)
     */
    orbit(deltaYaw, deltaPitch) {
        this.orbitYaw += deltaYaw;
        this.orbitPitch += deltaPitch;

        // Clamp pitch to avoid gimbal lock
        const maxPitch = Math.PI / 2 - 0.01;
        this.orbitPitch = Math.max(-maxPitch, Math.min(maxPitch, this.orbitPitch));

        this._updatePositionFromOrbit();
        this._dirty = true;
        return this;
    }

    /**
     * Set orbit angles directly
     */
    setOrbit(yaw, pitch, radius = null) {
        this.orbitYaw = yaw;
        this.orbitPitch = pitch;
        if (radius !== null) this.orbitRadius = radius;

        const maxPitch = Math.PI / 2 - 0.01;
        this.orbitPitch = Math.max(-maxPitch, Math.min(maxPitch, this.orbitPitch));

        this._updatePositionFromOrbit();
        this._dirty = true;
        return this;
    }

    /**
     * Zoom camera (change orbit radius)
     */
    zoom(delta) {
        this.orbitRadius = Math.max(0.1, this.orbitRadius + delta);
        this._updatePositionFromOrbit();
        this._dirty = true;
        return this;
    }

    /**
     * Set zoom level directly
     */
    setZoom(radius) {
        this.orbitRadius = Math.max(0.1, radius);
        this._updatePositionFromOrbit();
        this._dirty = true;
        return this;
    }

    /**
     * Pan camera (move target and position together)
     */
    pan(deltaX, deltaY) {
        // Get right and up vectors from view matrix
        const right = this.getRight();
        const up = this.getUp();

        const panOffset = vec3.add(
            vec3.scale(right, -deltaX),
            vec3.scale(up, deltaY)
        );

        this.position = vec3.add(this.position, panOffset);
        this.target = vec3.add(this.target, panOffset);
        this._dirty = true;
        return this;
    }

    /**
     * Update position from orbit parameters
     */
    _updatePositionFromOrbit() {
        this.position = vec3.create(
            this.target.x + this.orbitRadius * Math.sin(this.orbitYaw) * Math.cos(this.orbitPitch),
            this.target.y + this.orbitRadius * Math.sin(this.orbitPitch),
            this.target.z + this.orbitRadius * Math.cos(this.orbitYaw) * Math.cos(this.orbitPitch)
        );
    }

    /**
     * Update cached matrices
     */
    _updateMatrices() {
        if (!this._dirty) return;

        // View matrix
        mat4.lookAt(this.position, this.target, this.up, this._viewMatrix);

        // Projection matrix
        const fovRad = this.fov * Math.PI / 180;
        mat4.perspective(fovRad, this.aspect, this.near, this.far, this._projectionMatrix);

        // Combined view-projection
        mat4.multiply(this._projectionMatrix, this._viewMatrix, this._viewProjectionMatrix);

        // Inverse view (for world space operations)
        mat4.invert(this._viewMatrix, this._inverseViewMatrix);

        this._dirty = false;
    }

    /**
     * Get view matrix (world -> camera space)
     */
    getViewMatrix() {
        this._updateMatrices();
        return this._viewMatrix;
    }

    /**
     * Get projection matrix (camera -> clip space)
     */
    getProjectionMatrix() {
        this._updateMatrices();
        return this._projectionMatrix;
    }

    /**
     * Get combined view-projection matrix
     */
    getViewProjectionMatrix() {
        this._updateMatrices();
        return this._viewProjectionMatrix;
    }

    /**
     * Get inverse view matrix (camera -> world space)
     */
    getInverseViewMatrix() {
        this._updateMatrices();
        return this._inverseViewMatrix;
    }

    /**
     * Get camera forward direction (normalized)
     */
    getForward() {
        return vec3.normalize(vec3.sub(this.target, this.position));
    }

    /**
     * Get camera right direction (normalized)
     */
    getRight() {
        return vec3.normalize(vec3.cross(this.getForward(), this.up));
    }

    /**
     * Get camera up direction (normalized)
     */
    getUp() {
        const forward = this.getForward();
        const right = this.getRight();
        return vec3.cross(right, forward);
    }

    /**
     * Project world point to normalized device coordinates [-1, 1]
     */
    projectToNDC(worldPoint) {
        this._updateMatrices();
        return mat4.transformPoint(this._viewProjectionMatrix, worldPoint);
    }

    /**
     * Project world point to screen coordinates
     * @param {Object} worldPoint - {x, y, z}
     * @param {number} screenWidth
     * @param {number} screenHeight
     * @returns {Object} {x, y, z} where z is depth (0-1)
     */
    projectToScreen(worldPoint, screenWidth, screenHeight) {
        const ndc = this.projectToNDC(worldPoint);
        return {
            x: (ndc.x + 1) * 0.5 * screenWidth,
            y: (1 - ndc.y) * 0.5 * screenHeight,  // Y flipped for screen coords
            z: (ndc.z + 1) * 0.5
        };
    }

    /**
     * Unproject screen point to world ray
     * @param {number} screenX
     * @param {number} screenY
     * @param {number} screenWidth
     * @param {number} screenHeight
     * @returns {Object} {origin: vec3, direction: vec3}
     */
    screenToRay(screenX, screenY, screenWidth, screenHeight) {
        // Convert to NDC
        const ndcX = (screenX / screenWidth) * 2 - 1;
        const ndcY = 1 - (screenY / screenHeight) * 2;

        this._updateMatrices();

        // Near and far points in NDC
        const nearPoint = { x: ndcX, y: ndcY, z: -1 };
        const farPoint = { x: ndcX, y: ndcY, z: 1 };

        // Invert projection to get camera space points
        const invProj = mat4.invert(this._projectionMatrix);
        const nearCamera = mat4.transformPoint(invProj, nearPoint);
        const farCamera = mat4.transformPoint(invProj, farPoint);

        // Transform to world space
        const nearWorld = mat4.transformPoint(this._inverseViewMatrix, nearCamera);
        const farWorld = mat4.transformPoint(this._inverseViewMatrix, farCamera);

        return {
            origin: nearWorld,
            direction: vec3.normalize(vec3.sub(farWorld, nearWorld))
        };
    }

    /**
     * Get CSS transform string for DOM-based 3D rendering
     * Useful for synchronizing CSS 3D transforms with WebGL camera
     */
    getCSSPerspective() {
        // CSS perspective distance (approximation)
        const perspectiveDist = 1 / Math.tan((this.fov * Math.PI / 180) / 2);
        return `${perspectiveDist * 500}px`;
    }

    /**
     * Get CSS transform matrix for an element at world position
     */
    getCSSTransform(worldPosition) {
        const screen = this.projectToScreen(worldPosition, 1, 1);
        const scale = 1 / (screen.z * this.orbitRadius);
        return `translate3d(${screen.x * 100}%, ${screen.y * 100}%, 0) scale(${scale})`;
    }

    /**
     * Clone this camera
     */
    clone() {
        return new Camera3D({
            position: this.position,
            target: this.target,
            up: this.up,
            fov: this.fov,
            near: this.near,
            far: this.far,
            aspect: this.aspect,
            orbitRadius: this.orbitRadius,
            orbitPitch: this.orbitPitch,
            orbitYaw: this.orbitYaw
        });
    }

    /**
     * Copy state from another camera
     */
    copyFrom(other) {
        this.position = vec3.clone(other.position);
        this.target = vec3.clone(other.target);
        this.up = vec3.clone(other.up);
        this.fov = other.fov;
        this.near = other.near;
        this.far = other.far;
        this.aspect = other.aspect;
        this.orbitRadius = other.orbitRadius;
        this.orbitPitch = other.orbitPitch;
        this.orbitYaw = other.orbitYaw;
        this._dirty = true;
        return this;
    }

    /**
     * Serialize to plain object
     */
    toJSON() {
        return {
            position: vec3.toArray(this.position),
            target: vec3.toArray(this.target),
            up: vec3.toArray(this.up),
            fov: this.fov,
            near: this.near,
            far: this.far,
            aspect: this.aspect,
            orbitRadius: this.orbitRadius,
            orbitPitch: this.orbitPitch,
            orbitYaw: this.orbitYaw
        };
    }

    /**
     * Deserialize from plain object
     */
    static fromJSON(json) {
        return new Camera3D({
            position: vec3.fromArray(json.position),
            target: vec3.fromArray(json.target),
            up: vec3.fromArray(json.up),
            fov: json.fov,
            near: json.near,
            far: json.far,
            aspect: json.aspect,
            orbitRadius: json.orbitRadius,
            orbitPitch: json.orbitPitch,
            orbitYaw: json.orbitYaw
        });
    }
}

export default Camera3D;
