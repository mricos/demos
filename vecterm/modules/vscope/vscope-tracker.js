/**
 * VScope Tracker System
 *
 * Handles entity tracking and auto-framing:
 * - Track single entity (follow mode)
 * - Track multiple entities (auto-frame to include all)
 * - Static region tracking (microscope mode)
 * - Smooth camera following with damping
 * - Auto-zoom to fit entities
 */

// VectermMath classes are available on window
const { Vector3 } = window.VectermMath || {};

export class VscopeTracker {
  constructor(cameras, trackState) {
    this.cameras = cameras;
    this.gameInstance = null;

    // Tracking state
    this.mode = trackState.mode || 'static';
    this.entityId = trackState.entityId || null;
    this.entityIds = trackState.entityIds || [];
    this.smoothing = trackState.smoothing !== undefined ? trackState.smoothing : 0.1;
    this.offset = trackState.offset || { x: 0, y: 0 };
    this.autoZoom = trackState.autoZoom !== undefined ? trackState.autoZoom : true;

    // Tracked region (what gets rendered to terminal)
    this.trackedRegion = {
      x: 0,
      y: 0,
      width: 1920,
      height: 1080
    };

    // Smooth camera target (for damping)
    this.smoothTarget = { x: 0, y: 0, z: 0 };
    this.smoothZoom = 1.0;
  }

  /**
   * Set game instance for entity queries
   */
  setGameInstance(instance) {
    this.gameInstance = instance;
  }

  /**
   * Update tracking (called every frame)
   */
  update(gameInstance, trackState) {
    this.gameInstance = gameInstance;

    // Update state if changed
    if (trackState) {
      this.mode = trackState.mode;
      this.entityId = trackState.entityId;
      this.entityIds = trackState.entityIds;
      this.smoothing = trackState.smoothing;
      this.offset = trackState.offset;
      this.autoZoom = trackState.autoZoom;
    }

    switch (this.mode) {
      case 'entity':
        this.updateEntityTracking();
        break;

      case 'multi-entity':
        this.updateMultiEntityTracking();
        break;

      case 'static':
      default:
        // Region doesn't change in static mode
        break;
    }
  }

  /**
   * Update tracking for single entity
   */
  updateEntityTracking() {
    if (!this.gameInstance || !this.entityId) {
      return;
    }

    const entityPosition = this.getEntityPosition(this.entityId);
    if (!entityPosition) {
      return;
    }

    // Apply offset
    const targetX = entityPosition.x + this.offset.x;
    const targetY = entityPosition.y + this.offset.y;

    // Smooth camera following (lerp)
    this.smoothTarget.x += (targetX - this.smoothTarget.x) * this.smoothing;
    this.smoothTarget.y += (targetY - this.smoothTarget.y) * this.smoothing;

    // Update scope camera to follow entity
    this.cameras.setTarget('scope', this.smoothTarget.x, this.smoothTarget.y, 0);

    // Update tracked region (centered on entity)
    const regionWidth = 800;  // Default region size
    const regionHeight = 600;

    this.trackedRegion = {
      x: this.smoothTarget.x - regionWidth / 2,
      y: this.smoothTarget.y - regionHeight / 2,
      width: regionWidth,
      height: regionHeight
    };

    // Clamp to canvas bounds
    this.clampRegionToCanvas();
  }

  /**
   * Update tracking for multiple entities (auto-frame)
   */
  updateMultiEntityTracking() {
    if (!this.gameInstance || this.entityIds.length === 0) {
      return;
    }

    // Get all entity positions
    const positions = [];
    for (const entityId of this.entityIds) {
      const pos = this.getEntityPosition(entityId);
      if (pos) {
        positions.push(pos);
      }
    }

    if (positions.length === 0) {
      return;
    }

    // Calculate bounding box
    const bounds = this.calculateBounds(positions);

    // Calculate center with offset
    const centerX = (bounds.minX + bounds.maxX) / 2 + this.offset.x;
    const centerY = (bounds.minY + bounds.maxY) / 2 + this.offset.y;

    // Smooth camera following
    this.smoothTarget.x += (centerX - this.smoothTarget.x) * this.smoothing;
    this.smoothTarget.y += (centerY - this.smoothTarget.y) * this.smoothing;

    // Update scope camera
    this.cameras.setTarget('scope', this.smoothTarget.x, this.smoothTarget.y, 0);

    // Calculate region size to fit all entities
    let regionWidth = (bounds.maxX - bounds.minX) * 1.2; // 20% padding
    let regionHeight = (bounds.maxY - bounds.minY) * 1.2;

    // Minimum region size
    regionWidth = Math.max(regionWidth, 400);
    regionHeight = Math.max(regionHeight, 300);

    // Auto-zoom: adjust camera distance based on region size
    if (this.autoZoom) {
      const targetZoom = Math.max(regionWidth / 800, regionHeight / 600);
      this.smoothZoom += (targetZoom - this.smoothZoom) * this.smoothing;
      this.cameras.setZoom('scope', 1 / this.smoothZoom);
    }

    this.trackedRegion = {
      x: this.smoothTarget.x - regionWidth / 2,
      y: this.smoothTarget.y - regionHeight / 2,
      width: regionWidth,
      height: regionHeight
    };

    // Clamp to canvas bounds
    this.clampRegionToCanvas();
  }

  /**
   * Get entity position from game instance
   */
  getEntityPosition(entityId) {
    if (!this.gameInstance) {
      return null;
    }

    // Try different entity access patterns

    // 1. ECS pattern (like Quadrapong)
    if (this.gameInstance.ecs && typeof this.gameInstance.ecs.getComponent === 'function') {
      const position = this.gameInstance.ecs.getComponent(entityId, 'position');
      if (position) {
        return { x: position.x, y: position.y, z: position.z || 0 };
      }
    }

    // 2. Direct entity access
    if (this.gameInstance.entities && this.gameInstance.entities[entityId]) {
      const entity = this.gameInstance.entities[entityId];
      if (entity.position) {
        return { x: entity.position.x, y: entity.position.y, z: entity.position.z || 0 };
      }
      if (entity.x !== undefined && entity.y !== undefined) {
        return { x: entity.x, y: entity.y, z: entity.z || 0 };
      }
    }

    // 3. Named property access (e.g., ball, paddle)
    if (this.gameInstance[entityId]) {
      const entity = this.gameInstance[entityId];
      if (entity.position) {
        return { x: entity.position.x, y: entity.position.y, z: entity.position.z || 0 };
      }
      if (entity.x !== undefined && entity.y !== undefined) {
        return { x: entity.x, y: entity.y, z: entity.z || 0 };
      }
    }

    // 4. Special case: Quadrapong ballId
    if (this.gameInstance.ballId === entityId && this.gameInstance.ecs) {
      const position = this.gameInstance.ecs.getComponent(this.gameInstance.ballId, 'position');
      if (position) {
        return { x: position.x, y: position.y, z: 0 };
      }
    }

    console.warn(`Could not find entity position for: ${entityId}`);
    return null;
  }

  /**
   * Calculate bounding box for multiple positions
   */
  calculateBounds(positions) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const pos of positions) {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y);
    }

    return { minX, maxX, minY, maxY };
  }

  /**
   * Clamp tracked region to canvas bounds
   */
  clampRegionToCanvas() {
    const canvasWidth = 1920;
    const canvasHeight = 1080;

    // Clamp position
    this.trackedRegion.x = Math.max(0, Math.min(canvasWidth - this.trackedRegion.width, this.trackedRegion.x));
    this.trackedRegion.y = Math.max(0, Math.min(canvasHeight - this.trackedRegion.height, this.trackedRegion.y));

    // Clamp size
    this.trackedRegion.width = Math.min(canvasWidth, this.trackedRegion.width);
    this.trackedRegion.height = Math.min(canvasHeight, this.trackedRegion.height);
  }

  /**
   * Set single entity target
   */
  setTarget(entityId) {
    this.mode = 'entity';
    this.entityId = entityId;
    this.entityIds = [];

    // Initialize smooth target
    const pos = this.getEntityPosition(entityId);
    if (pos) {
      this.smoothTarget = { ...pos };
    }
  }

  /**
   * Set multiple entity targets
   */
  setTargets(entityIds) {
    this.mode = 'multi-entity';
    this.entityId = null;
    this.entityIds = entityIds;

    // Initialize smooth target to center of all entities
    const positions = [];
    for (const id of entityIds) {
      const pos = this.getEntityPosition(id);
      if (pos) {
        positions.push(pos);
      }
    }

    if (positions.length > 0) {
      const bounds = this.calculateBounds(positions);
      this.smoothTarget = {
        x: (bounds.minX + bounds.maxX) / 2,
        y: (bounds.minY + bounds.maxY) / 2,
        z: 0
      };
    }
  }

  /**
   * Set static region
   */
  setRegion(region) {
    this.mode = 'static';
    this.entityId = null;
    this.entityIds = [];
    this.trackedRegion = { ...region };

    // Clamp to canvas bounds
    this.clampRegionToCanvas();
  }

  /**
   * Reset tracking to full field
   */
  reset() {
    this.mode = 'static';
    this.entityId = null;
    this.entityIds = [];
    this.trackedRegion = {
      x: 0,
      y: 0,
      width: 1920,
      height: 1080
    };
    this.smoothTarget = { x: 960, y: 540, z: 0 };
    this.smoothZoom = 1.0;
  }

  /**
   * Get current tracked region
   */
  getTrackedRegion() {
    return { ...this.trackedRegion };
  }

  /**
   * Update from Redux state
   */
  updateFromState(trackState) {
    this.mode = trackState.mode;
    this.entityId = trackState.entityId;
    this.entityIds = trackState.entityIds || [];
    this.smoothing = trackState.smoothing;
    this.offset = trackState.offset || { x: 0, y: 0 };
    this.autoZoom = trackState.autoZoom;
  }
}
