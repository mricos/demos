/**
 * VectermCanvas.js - Redux-powered 3D wireframe rendering system
 * Part of the PJA (Project Jupiter Architecture) framework
 *
 * Provides:
 * - Redux state management for 3D mesh entities
 * - Layer system for organizing meshes
 * - Camera controls
 * - VT100 phosphor effects
 * - Unified API with ReduxCanvas (2D sibling)
 *
 * This is a wrapper around Vecterm.js that provides a ReduxCanvas-like API
 * but manages everything through Redux state.
 */

(function(global) {
  'use strict';

  // Namespace
  const PJA = global.PJA || (global.PJA = {});

  // Import Redux store (assumes it's available globally)
  const getStore = () => window.store;
  const getActions = () => window.vectermActions || {};

  /**
   * VectermCanvas - Redux-powered 3D rendering system
   *
   * Usage:
   *   const canvas3d = new PJA.VectermCanvas('cli-vecterm', store);
   *   const id = canvas3d.addEntity({ meshType: 'cube', size: 2, color: '#00ff88' });
   *   canvas3d.startAnimation();
   */
  class VectermCanvas {
    constructor(canvasId, store, config = {}) {
      this.canvasId = canvasId;
      this.canvas = document.getElementById(canvasId);

      if (!this.canvas) {
        throw new Error(`Canvas element '${canvasId}' not found`);
      }

      this.store = store || getStore();
      if (!this.store) {
        throw new Error('Redux store is required. Pass it as second argument or set window.store');
      }

      // Get action creators
      this.actions = getActions();

      // Create Vecterm renderer
      this.vecterm = new global.Vecterm(this.canvas);

      // Subscribe to Redux state
      this.unsubscribe = this.store.subscribe(() => {
        if (!this.animationRunning) {
          this.render();
        }
      });

      this.animationId = null;
      this.animationRunning = false;

      // Initialize camera if config provided
      if (config.camera) {
        this.setCamera(config.camera);
      }

      // Initialize config if provided
      if (config.vecterm) {
        this.setConfig(config.vecterm);
      }
    }

    /**
     * Entity management (mirrors ReduxCanvas API)
     */
    addEntity(entity) {
      if (!entity.id) {
        entity.id = `vecterm-entity-${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      const fullEntity = {
        type: 'mesh',
        meshType: entity.meshType || 'cube',
        meshParams: entity.meshParams || { size: entity.size || 1 },
        transform: entity.transform || {
          position: entity.position || { x: 0, y: 0, z: 0 },
          rotation: entity.rotation || { x: 0, y: 0, z: 0 },
          scale: entity.scale || { x: 1, y: 1, z: 1 }
        },
        color: entity.color || '#00ff88',
        visible: entity.visible !== undefined ? entity.visible : true,
        layerId: entity.layerId || 'default',
        ...entity
      };

      this.store.dispatch(this.actions.addEntity(fullEntity));
      return fullEntity.id;
    }

    getEntity(id) {
      const state = this.store.getState();
      return state.vecterm.entities[id];
    }

    updateEntity(id, updates) {
      this.store.dispatch(this.actions.updateEntity(id, updates));
      return this;
    }

    removeEntity(id) {
      this.store.dispatch(this.actions.removeEntity(id));
      return this;
    }

    toggleEntityVisible(id) {
      this.store.dispatch(this.actions.toggleVisible(id));
      return this;
    }

    /**
     * Transform shortcuts
     */
    setPosition(id, position) {
      this.store.dispatch(this.actions.setPosition(id, position));
      return this;
    }

    setRotation(id, rotation) {
      this.store.dispatch(this.actions.setRotation(id, rotation));
      return this;
    }

    setScale(id, scale) {
      this.store.dispatch(this.actions.setScale(id, scale));
      return this;
    }

    updateTransform(id, transform) {
      this.store.dispatch(this.actions.updateTransform(id, transform));
      return this;
    }

    /**
     * Layer management (mirrors ReduxCanvas API)
     */
    addLayer(id, zIndex = 0) {
      this.store.dispatch(this.actions.addLayer(id, zIndex));
      return this;
    }

    getLayer(id) {
      const state = this.store.getState();
      return state.vecterm.layers[id];
    }

    setLayerVisible(id, visible) {
      this.store.dispatch(this.actions.setLayerVisible(id, visible));
      return this;
    }

    setEntityLayer(entityId, layerId) {
      this.store.dispatch(this.actions.setEntityLayer(entityId, layerId));
      return this;
    }

    /**
     * Camera controls
     */
    setCamera(camera) {
      this.store.dispatch(this.actions.setCamera(camera));
      return this;
    }

    getCamera() {
      const state = this.store.getState();
      return state.vecterm.camera;
    }

    orbitCamera(azimuth, elevation) {
      this.store.dispatch(this.actions.orbitCamera(azimuth, elevation));
      return this;
    }

    zoomCamera(factor) {
      this.store.dispatch(this.actions.zoomCamera(factor));
      return this;
    }

    /**
     * Configuration (mirrors ReduxCanvas VT100 API)
     */
    setConfig(config) {
      this.store.dispatch(this.actions.setConfig(config));
      return this;
    }

    getConfig(key) {
      const state = this.store.getState();
      if (key) {
        const keys = key.split('.');
        let value = state.vecterm.config;
        for (const k of keys) {
          value = value[k];
        }
        return value;
      }
      return state.vecterm.config;
    }

    resetConfig() {
      this.store.dispatch(this.actions.resetConfig());
      return this;
    }

    /**
     * Rendering
     */
    clear() {
      if (this.vecterm) {
        this.vecterm.clear();
      }
      return this;
    }

    render() {
      if (!this.vecterm) return;

      const state = this.store.getState();
      const vectermState = state.vecterm;

      // Sync config
      Object.keys(vectermState.config).forEach(key => {
        this.vecterm.config[key] = vectermState.config[key];
      });

      // Build camera
      const camera = new VectermMath.Camera(
        new VectermMath.Vector3(
          vectermState.camera.position.x,
          vectermState.camera.position.y,
          vectermState.camera.position.z
        ),
        new VectermMath.Vector3(
          vectermState.camera.target.x,
          vectermState.camera.target.y,
          vectermState.camera.target.z
        )
      );

      // Build meshes from entities
      const meshes = [];
      Object.values(vectermState.entities).forEach(entity => {
        if (!entity.visible) return;

        let mesh;
        if (entity.meshType === 'cube') {
          mesh = VectermMesh.cube(entity.meshParams?.size || 1);
        } else if (entity.meshType === 'sphere') {
          mesh = VectermMesh.sphere(
            entity.meshParams?.radius || 1,
            entity.meshParams?.subdivisions || 1
          );
        } else if (entity.meshType === 'box') {
          const { width, height, depth } = entity.meshParams || { width: 1, height: 1, depth: 1 };
          mesh = VectermMesh.box(width, height, depth);
        } else if (entity.mesh) {
          mesh = entity.mesh;
        } else {
          return;
        }

        meshes.push({
          mesh,
          transform: entity.transform,
          color: entity.color || vectermState.config.phosphorColor
        });
      });

      // Render
      this.vecterm.render(meshes, camera, 0.016);
      return this;
    }

    /**
     * Animation (mirrors ReduxCanvas API)
     */
    startAnimation(callback) {
      this.store.dispatch(this.actions.startAnimation());
      this.animationRunning = true;

      const animate = (timestamp) => {
        // Render current state
        this.render();

        // User callback for game logic
        if (callback) {
          const deltaTime = 16; // ~60fps
          callback(deltaTime, timestamp);
        }

        this.animationId = requestAnimationFrame(animate);
      };

      this.animationId = requestAnimationFrame(animate);
      return this;
    }

    stopAnimation() {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }

      this.animationRunning = false;
      this.store.dispatch(this.actions.stopAnimation());
      return this;
    }

    /**
     * Cleanup
     */
    destroy() {
      this.stopAnimation();
      if (this.unsubscribe) {
        this.unsubscribe();
      }
    }

    /**
     * Helper: Get all entities
     */
    getAllEntities() {
      const state = this.store.getState();
      return Object.values(state.vecterm.entities);
    }

    /**
     * Helper: Count entities
     */
    getEntityCount() {
      const state = this.store.getState();
      return Object.keys(state.vecterm.entities).length;
    }
  }

  // Export to PJA namespace
  PJA.VectermCanvas = VectermCanvas;

  // Also make it available as a global for backwards compatibility
  global.VectermCanvas = VectermCanvas;

})(window);
