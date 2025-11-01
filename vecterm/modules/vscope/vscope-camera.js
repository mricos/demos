/**
 * VScope Camera System
 *
 * Manages dual camera system:
 * - Field camera: User-controlled viewport of the field canvas
 * - Scope camera: Auto-controlled viewport for terminal display (follows entities)
 *
 * Wraps VectermMath.Camera and provides high-level controls
 */

// VectermMath classes are available on window
const { Camera, Vector3, Matrix4 } = window.VectermMath || {};

export class VscopeCamera {
  constructor(cameraState) {
    // Create field and scope cameras
    this.field = this.createCamera(cameraState.field);
    this.scope = this.createCamera(cameraState.scope);

    // Track which camera is active for user control
    this.active = cameraState.active || 'field';

    // Store projection modes
    this.fieldProjection = cameraState.field.projection || 'perspective';
    this.scopeProjection = cameraState.scope.projection || 'perspective';
  }

  /**
   * Create a camera from state
   */
  createCamera(state) {
    const position = new Vector3(
      state.position?.x || 0,
      state.position?.y || 0,
      state.position?.z || 10
    );

    const target = new Vector3(
      state.target?.x || 0,
      state.target?.y || 0,
      state.target?.z || 0
    );

    const camera = new Camera(position, target);
    camera.fov = (state.fov || 60) * Math.PI / 180; // Convert to radians
    camera.aspect = 1.0; // Will be updated based on viewport

    return camera;
  }

  /**
   * Get active camera
   */
  getActive() {
    return this.active === 'field' ? this.field : this.scope;
  }

  /**
   * Set active camera
   */
  setActive(camera) {
    if (camera === 'field' || camera === 'scope') {
      this.active = camera;
    }
  }

  /**
   * Pan camera by delta
   */
  pan(camera, deltaX, deltaY) {
    const cam = camera === 'field' ? this.field : this.scope;

    // Get camera's right and up vectors
    const forward = cam.target.sub(cam.position).normalize();
    const right = forward.cross(cam.up).normalize();
    const up = right.cross(forward).normalize();

    // Move camera and target
    const offset = right.mul(deltaX).add(up.mul(deltaY));
    cam.position = cam.position.add(offset);
    cam.target = cam.target.add(offset);
  }

  /**
   * Zoom camera (move toward/away from target)
   */
  zoom(camera, factor) {
    const cam = camera === 'field' ? this.field : this.scope;

    const direction = cam.target.sub(cam.position);
    const distance = direction.length();

    // Scale distance by factor (zoom in = factor > 1, zoom out = factor < 1)
    const newDistance = distance / factor;

    // Move camera along direction
    cam.position = cam.target.sub(direction.normalize().mul(newDistance));
  }

  /**
   * Orbit camera around target
   */
  orbit(camera, deltaAzimuth, deltaElevation) {
    const cam = camera === 'field' ? this.field : this.scope;
    cam.orbit(deltaAzimuth, deltaElevation);
  }

  /**
   * Set camera position
   */
  setPosition(camera, x, y, z) {
    const cam = camera === 'field' ? this.field : this.scope;
    cam.position = new Vector3(x, y, z);
  }

  /**
   * Set camera target
   */
  setTarget(camera, x, y, z) {
    const cam = camera === 'field' ? this.field : this.scope;
    cam.target = new Vector3(x, y, z);
  }

  /**
   * Set camera zoom (by adjusting distance from target)
   */
  setZoom(camera, zoomLevel) {
    const cam = camera === 'field' ? this.field : this.scope;

    const direction = cam.target.sub(cam.position);
    const baseDistance = 10; // Base distance
    const newDistance = baseDistance / zoomLevel;

    cam.position = cam.target.sub(direction.normalize().mul(newDistance));
  }

  /**
   * Set camera field of view
   */
  setFOV(camera, fovDegrees) {
    const cam = camera === 'field' ? this.field : this.scope;
    cam.fov = fovDegrees * Math.PI / 180;
  }

  /**
   * Set camera aspect ratio
   */
  setAspect(camera, aspect) {
    const cam = camera === 'field' ? this.field : this.scope;
    cam.aspect = aspect;
  }

  /**
   * Set camera projection mode
   */
  setProjection(camera, mode) {
    if (camera === 'field') {
      this.fieldProjection = mode;
    } else {
      this.scopeProjection = mode;
    }
  }

  /**
   * Get camera projection mode
   */
  getProjection(camera) {
    return camera === 'field' ? this.fieldProjection : this.scopeProjection;
  }

  /**
   * Get view matrix for camera
   */
  getViewMatrix(camera) {
    const cam = camera === 'field' ? this.field : this.scope;
    return cam.getViewMatrix();
  }

  /**
   * Get projection matrix for camera
   */
  getProjectionMatrix(camera) {
    const cam = camera === 'field' ? this.field : this.scope;
    const projection = this.getProjection(camera);

    // Handle isometric as special case of orthographic
    if (projection === 'isometric') {
      // Set camera to isometric angles (45° azimuth, 35.264° elevation)
      const isoAzimuth = Math.PI / 4; // 45 degrees
      const isoElevation = Math.atan(1 / Math.sqrt(2)); // ~35.264 degrees

      const distance = cam.target.sub(cam.position).length();

      cam.position = new Vector3(
        cam.target.x + distance * Math.sin(isoAzimuth) * Math.cos(isoElevation),
        cam.target.y + distance * Math.sin(isoElevation),
        cam.target.z + distance * Math.cos(isoAzimuth) * Math.cos(isoElevation)
      );

      return cam.getProjectionMatrix('orthographic');
    }

    return cam.getProjectionMatrix(projection);
  }

  /**
   * Reset camera to default position
   */
  reset(camera) {
    const cam = camera === 'field' ? this.field : this.scope;

    cam.position = new Vector3(0, 0, 10);
    cam.target = new Vector3(0, 0, 0);
    cam.up = new Vector3(0, 1, 0);
    cam.fov = Math.PI / 4; // 45 degrees
  }

  /**
   * Update from Redux state
   */
  updateFromState(cameraState) {
    // Update field camera
    if (cameraState.field) {
      const state = cameraState.field;
      if (state.position) {
        this.field.position = new Vector3(state.position.x, state.position.y, state.position.z);
      }
      if (state.target) {
        this.field.target = new Vector3(state.target.x, state.target.y, state.target.z);
      }
      if (state.fov !== undefined) {
        this.field.fov = state.fov * Math.PI / 180;
      }
      if (state.projection) {
        this.fieldProjection = state.projection;
      }
    }

    // Update scope camera
    if (cameraState.scope) {
      const state = cameraState.scope;
      if (state.position) {
        this.scope.position = new Vector3(state.position.x, state.position.y, state.position.z);
      }
      if (state.target) {
        this.scope.target = new Vector3(state.target.x, state.target.y, state.target.z);
      }
      if (state.fov !== undefined) {
        this.scope.fov = state.fov * Math.PI / 180;
      }
      if (state.projection) {
        this.scopeProjection = state.projection;
      }
    }

    // Update active camera
    if (cameraState.active) {
      this.active = cameraState.active;
    }
  }

  /**
   * Serialize camera state
   */
  toState() {
    return {
      field: {
        position: {
          x: this.field.position.x,
          y: this.field.position.y,
          z: this.field.position.z
        },
        target: {
          x: this.field.target.x,
          y: this.field.target.y,
          z: this.field.target.z
        },
        zoom: 1.0,
        fov: this.field.fov * 180 / Math.PI,
        projection: this.fieldProjection
      },
      scope: {
        position: {
          x: this.scope.position.x,
          y: this.scope.position.y,
          z: this.scope.position.z
        },
        target: {
          x: this.scope.target.x,
          y: this.scope.target.y,
          z: this.scope.target.z
        },
        zoom: 1.0,
        fov: this.scope.fov * 180 / Math.PI,
        projection: this.scopeProjection
      },
      active: this.active
    };
  }
}
