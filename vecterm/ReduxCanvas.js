/**
 * ReduxCanvas.js - A modular Redux-powered canvas rendering system
 * Part of the PJA (Project Jupiter Architecture) framework
 *
 * Provides:
 * - Redux state management for canvas entities
 * - Layer system for organizing sprites/entities
 * - Grid and rendering utilities
 * - VT100 CRT effects integration
 */

(function(global) {
  'use strict';

  // Namespace
  const PJA = global.PJA || (global.PJA = {});

  /**
   * ReduxCanvas - Main canvas rendering system
   */
  class ReduxCanvas {
    constructor(canvasId, config = {}) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) {
        throw new Error(`Canvas element '${canvasId}' not found`);
      }

      this.ctx = this.canvas.getContext('2d');
      this.config = {
        width: config.width || 1920,
        height: config.height || 1080,
        backgroundColor: config.backgroundColor || '#0a0a0a',
        enableVT100: config.enableVT100 || false,
        ...config
      };

      // Set canvas dimensions
      this.canvas.width = this.config.width;
      this.canvas.height = this.config.height;

      // VT100 renderer (optional)
      this.vt100 = null;
      if (this.config.enableVT100 && global.VT100) {
        this.vt100 = new global.VT100(this.canvas);
      }

      // State
      this.layers = new Map();
      this.entities = new Map();
      this.grid = {
        enabled: false,
        size: 50,
        color: '#1a1a1a'
      };

      // Animation
      this.animationId = null;
      this.lastFrameTime = 0;
    }

    /**
     * Grid utilities
     */
    setGrid(enabled, size = 50, color = '#1a1a1a') {
      this.grid = { enabled, size, color };
    }

    drawGrid() {
      if (!this.grid.enabled) return;

      const { ctx, canvas, grid } = this;

      ctx.strokeStyle = grid.color;
      ctx.lineWidth = 1;
      ctx.beginPath();

      // Vertical lines
      for (let x = 0; x <= canvas.width; x += grid.size) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
      }

      // Horizontal lines
      for (let y = 0; y <= canvas.height; y += grid.size) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
      }

      ctx.stroke();
    }

    /**
     * Layer management
     */
    addLayer(id, zIndex = 0) {
      this.layers.set(id, {
        id,
        zIndex,
        visible: true,
        entities: []
      });
      return this;
    }

    getLayer(id) {
      return this.layers.get(id);
    }

    setLayerVisible(id, visible) {
      const layer = this.layers.get(id);
      if (layer) layer.visible = visible;
      return this;
    }

    /**
     * Entity management
     */
    addEntity(entity) {
      if (!entity.id) {
        entity.id = `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      this.entities.set(entity.id, {
        type: 'rect',
        x: 0,
        y: 0,
        width: 64,
        height: 64,
        color: '#4fc3f7',
        layerId: 'default',
        ...entity
      });

      // Add to layer
      const layer = this.getLayer(entity.layerId) || this.addLayer(entity.layerId).getLayer(entity.layerId);
      if (!layer.entities.includes(entity.id)) {
        layer.entities.push(entity.id);
      }

      return entity.id;
    }

    getEntity(id) {
      return this.entities.get(id);
    }

    updateEntity(id, updates) {
      const entity = this.entities.get(id);
      if (entity) {
        Object.assign(entity, updates);
      }
      return this;
    }

    removeEntity(id) {
      const entity = this.entities.get(id);
      if (entity) {
        // Remove from layer
        const layer = this.getLayer(entity.layerId);
        if (layer) {
          layer.entities = layer.entities.filter(eid => eid !== id);
        }
        this.entities.delete(id);
      }
      return this;
    }

    /**
     * Rendering
     */
    clear() {
      this.ctx.fillStyle = this.config.backgroundColor;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    renderEntity(entity) {
      const { ctx } = this;

      ctx.save();
      ctx.fillStyle = entity.color;

      switch (entity.type) {
        case 'rect':
          ctx.fillRect(entity.x, entity.y, entity.width, entity.height);
          break;
        case 'circle':
          ctx.beginPath();
          ctx.arc(entity.x + entity.width / 2, entity.y + entity.height / 2, entity.width / 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        default:
          console.warn(`Unknown entity type: ${entity.type}`);
      }

      ctx.restore();
    }

    render() {
      this.clear();

      // Draw grid
      this.drawGrid();

      // Get sorted layers by zIndex
      const sortedLayers = Array.from(this.layers.values())
        .filter(layer => layer.visible)
        .sort((a, b) => a.zIndex - b.zIndex);

      // Render entities layer by layer
      for (const layer of sortedLayers) {
        for (const entityId of layer.entities) {
          const entity = this.entities.get(entityId);
          if (entity) {
            this.renderEntity(entity);
          }
        }
      }

      // Apply VT100 effects
      if (this.vt100) {
        this.vt100.applyEffects(0.016); // ~60fps
      }
    }

    /**
     * Animation loop
     */
    startAnimation(callback) {
      const animate = (timestamp) => {
        const deltaTime = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;

        this.render();

        if (callback) {
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
      return this;
    }

    /**
     * VT100 controls
     */
    getVT100Config(key) {
      if (!this.vt100) return null;
      if (key) {
        const keys = key.split('.');
        let value = this.vt100.config;
        for (const k of keys) {
          value = value[k];
        }
        return value;
      }
      return this.vt100.config;
    }

    setVT100Config(key, value) {
      if (!this.vt100) return this;

      const keys = key.split('.');
      let obj = this.vt100.config;
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;

      return this;
    }
  }

  // Export to PJA namespace
  PJA.ReduxCanvas = ReduxCanvas;

  // Also make it available as a global for backwards compatibility
  global.ReduxCanvas = ReduxCanvas;

})(window);
