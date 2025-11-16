/**
 * ECS Components Library
 * Reusable component factory functions for game entities
 */

const Components = {
  // ==========================================
  // SPATIAL COMPONENTS
  // ==========================================

  /**
   * Unified Transform Component (supports both 2D and 3D)
   * @param {Object} options - Transform options
   * @param {boolean} options.is3D - Whether this is a 3D transform
   * @param {Object} options.position - Position (x,y for 2D or Vector3 for 3D)
   * @param {Object} options.rotation - Rotation (angle for 2D or Vector3 for 3D)
   * @param {Object} options.scale - Scale (x,y for 2D or Vector3 for 3D)
   */
  Transform: ({ is3D = false, position, rotation, scale } = {}) => {
    if (is3D) {
      // 3D transform using VectermMath.Vector3
      return {
        is3D: true,
        position: position || (typeof VectermMath !== 'undefined'
          ? new VectermMath.Vector3(0, 0, 0)
          : { x: 0, y: 0, z: 0 }),
        rotation: rotation || (typeof VectermMath !== 'undefined'
          ? new VectermMath.Vector3(0, 0, 0)
          : { x: 0, y: 0, z: 0 }),
        scale: scale || (typeof VectermMath !== 'undefined'
          ? new VectermMath.Vector3(1, 1, 1)
          : { x: 1, y: 1, z: 1 })
      };
    } else {
      // 2D transform
      return {
        is3D: false,
        position: position || { x: 0, y: 0 },
        rotation: rotation || 0,  // angle in radians
        scale: scale || { x: 1, y: 1 }
      };
    }
  },

  /**
   * Legacy 2D Position component (for backward compatibility)
   */
  Position: (x, y) => ({ x, y }),

  /**
   * Velocity component (works for both 2D and 3D)
   */
  Velocity: (vx, vy, vz = 0) => ({ vx, vy, vz }),

  /**
   * Size component (2D dimensions)
   */
  Size: (width, height) => ({ width, height }),

  /**
   * AABB (Axis-Aligned Bounding Box) for collision detection
   */
  AABB: (width, height, depth = 0) => ({ width, height, depth }),

  // ==========================================
  // RENDERING COMPONENTS
  // ==========================================

  /**
   * Renderable component
   * @param {string} type - Render type: 'rect', 'circle', 'mesh', 'sprite'
   * @param {string} color - Color hex string
   * @param {string} mode - Rendering mode: '2d' or '3d'
   */
  Renderable: (type, color, mode = '2d') => ({
    type,
    color,
    mode,
    visible: true
  }),

  /**
   * 3D Mesh component
   * @param {Object} mesh - Vecterm.Mesh instance
   * @param {string} color - Color hex string
   */
  Mesh3D: (mesh, color) => ({
    mesh: mesh,
    color: color || '#00ff00'
  }),

  /**
   * Trail effect component
   * @param {number} maxLength - Maximum trail length
   */
  Trail: (maxLength = 10) => ({
    points: [],
    maxLength
  }),

  // ==========================================
  // BEHAVIOR COMPONENTS
  // ==========================================

  /**
   * Rotation Behavior - controls entity rotation
   * @param {Object} options - Rotation options
   * @param {number} options.speed - Rotation speed (radians per second)
   * @param {Object} options.axis - Rotation axis {x, y, z} (booleans for 3D)
   * @param {boolean} options.enabled - Whether rotation is enabled
   */
  RotationBehavior: ({ speed = 1.0, axis = { x: false, y: true, z: false }, enabled = true } = {}) => ({
    speed,
    axis,
    enabled,
    // Current accumulated rotation
    current: { x: 0, y: 0, z: 0 }
  }),

  /**
   * AI Controlled component
   * @param {number} trackingSpeed - Speed multiplier for AI tracking (0-1)
   */
  AIControlled: (trackingSpeed = 1.0) => ({
    trackingSpeed,
    enabled: true
  }),

  /**
   * Player Controlled component
   * @param {number} playerNumber - Player number (1-4)
   * @param {string} upKey - Key for moving up/left
   * @param {string} downKey - Key for moving down/right
   */
  PlayerControlled: (playerNumber, upKey, downKey) => ({
    playerNumber,
    upKey: upKey.toLowerCase(),
    downKey: downKey.toLowerCase(),
    upPressed: false,
    downPressed: false
  }),

  // ==========================================
  // GAME-SPECIFIC COMPONENTS
  // ==========================================

  /**
   * Paddle component (for pong-style games)
   * NORMALIZED COORDINATES: speed in normalized units per second
   */
  Paddle: (side, length, thickness) => ({
    side,
    length,
    thickness,
    speed: 1.5  // normalized units per second (responsive movement)
  }),

  /**
   * Ball component
   */
  Ball: (size, speed) => ({
    size,
    baseSpeed: speed,
    currentSpeed: speed
  }),

  /**
   * Score component
   */
  Score: () => ({ value: 0 }),

  /**
   * Tags component (for categorizing entities)
   */
  Tags: (...tags) => ({ tags: new Set(tags) }),

  // ==========================================
  // PARAMETER SYSTEM COMPONENTS
  // ==========================================

  /**
   * ParameterSet - Per-entity controllable parameters
   * @param {Object} parameters - Parameter definitions
   * Example:
   * {
   *   rotationSpeed: { value: 1.0, min: 0, max: 5, label: "Rotation Speed" },
   *   size: { value: 1.0, min: 0.5, max: 3, label: "Size" }
   * }
   */
  ParameterSet: (parameters = {}) => ({
    parameters: { ...parameters },
    // Track which sliders/controls are connected
    connections: {}
  }),

  /**
   * ViewMode component - tracks which view modes this entity supports
   * @param {Array} supportedModes - Array of supported modes: ['2d', '3d']
   * @param {Object} geometryMap - Mapping of mode to geometry type
   * Example: { '2d': 'square', '3d': 'cube' }
   */
  ViewMode: (supportedModes = ['2d', '3d'], geometryMap = {}) => ({
    supportedModes,
    geometryMap,
    currentMode: supportedModes[0] || '2d'
  }),

  // ==========================================
  // CAMERA & NAMESPACE
  // ==========================================

  /**
   * Camera3D component
   */
  Camera3D: (fov, near, far) => ({
    fov: fov || Math.PI / 4,
    near: near || 0.1,
    far: far || 1000
  }),

  /**
   * Namespace component (for multiplayer/instance isolation)
   */
  Namespace: (id) => ({ id }),

  // ==========================================
  // LEGACY 3D COMPONENTS (for backward compat)
  // ==========================================

  /**
   * Legacy Transform3D component
   * Use Transform({ is3D: true }) instead
   */
  Transform3D: (position, rotation, scale) => ({
    position: position || (typeof VectermMath !== 'undefined'
      ? new VectermMath.Vector3(0, 0, 0)
      : { x: 0, y: 0, z: 0 }),
    rotation: rotation || (typeof VectermMath !== 'undefined'
      ? new VectermMath.Vector3(0, 0, 0)
      : { x: 0, y: 0, z: 0 }),
    scale: scale || (typeof VectermMath !== 'undefined'
      ? new VectermMath.Vector3(1, 1, 1)
      : { x: 1, y: 1, z: 1 })
  })
};

// Export for both browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Components;
} else {
  window.Components = Components;
}
