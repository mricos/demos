/**
 * VScope Core - Main Manager
 *
 * Orchestrates all vscope subsystems:
 * - Dual camera system
 * - Entity tracking
 * - Rendering pipeline
 * - Effect system
 * - Overlay visualization
 */

import { VscopeCamera } from './vscope-camera.js';
import { VscopeTracker } from './vscope-tracker.js';
import { VscopeRenderer } from './vscope-renderer.js';
import { VscopeMapper } from './vscope-mapper.js';
import { VscopePixelGrid } from './vscope-pixel-grid.js';
import { VscopeEffects } from './vscope-effects.js';
import { VscopeOverlay } from './vscope-overlay.js';

export class VScope {
  constructor(store) {
    this.store = store;
    this.enabled = false;
    this.initialized = false;

    // Subsystems (will be initialized)
    this.cameras = null;
    this.tracker = null;
    this.renderer = null;
    this.mapper = null;
    this.pixelGrid = null;
    this.effects = null;
    this.overlay = null;

    // Canvas and context references
    this.mainCanvas = null;
    this.mainCtx = null;
    this.vt100Renderer = null;

    // Animation
    this.animationId = null;
    this.lastUpdateTime = 0;
    this.updateInterval = 1000 / 30; // Default 30 FPS

    // Game/field integration
    this.gameInstance = null;

    // Bind methods
    this.update = this.update.bind(this);
  }

  /**
   * Initialize vscope system
   */
  async initialize() {
    console.log('VScope: Initializing subsystems...');

    // Get canvas and context
    this.mainCanvas = document.getElementById('main-canvas');
    if (!this.mainCanvas) {
      throw new Error('Main canvas not found');
    }
    this.mainCtx = this.mainCanvas.getContext('2d');

    // Get VT100 renderer
    this.vt100Renderer = window.Vecterm?.vt100Renderer;
    if (!this.vt100Renderer) {
      console.warn('VT100 renderer not found, will retry when enabling');
    }

    // Initialize subsystems
    const state = this.store.getState().vscope;

    // Camera system
    this.cameras = new VscopeCamera(state.camera);
    console.log('  ✓ Camera system initialized');

    // Tracker system
    this.tracker = new VscopeTracker(this.cameras, state.track);
    console.log('  ✓ Tracker system initialized');

    // Coordinate mapper
    this.mapper = new VscopeMapper(
      this.mainCanvas.width,
      this.mainCanvas.height,
      80, // Terminal columns
      24, // Terminal rows
      state.scope.targetQuadrant
    );
    console.log('  ✓ Coordinate mapper initialized');

    // Pixel grid system
    this.pixelGrid = new VscopePixelGrid(
      this.mainCanvas.width,
      this.mainCanvas.height,
      state.pixelGrid.resolution
    );
    console.log('  ✓ Pixel grid initialized');

    // Effect pipeline
    this.effects = new VscopeEffects(state.field.effects);
    console.log('  ✓ Effect pipeline initialized');

    // Renderer system
    this.renderer = new VscopeRenderer(
      this.vt100Renderer,
      this.mapper,
      this.pixelGrid,
      this.effects
    );
    console.log('  ✓ Renderer initialized');

    // Overlay system
    this.overlay = new VscopeOverlay(
      this.mainCanvas,
      this.mainCtx,
      this.mapper,
      state.overlay
    );
    console.log('  ✓ Overlay system initialized');

    // Subscribe to store changes
    this.store.subscribe(() => this.onStateChange());

    this.initialized = true;
    console.log('✓ VScope core initialized');
  }

  /**
   * Enable vscope system
   */
  enable() {
    if (!this.initialized) {
      console.error('VScope not initialized');
      return;
    }

    if (this.enabled) {
      console.warn('VScope already enabled');
      return;
    }

    // Retry getting VT100 renderer if it wasn't available during init
    if (!this.vt100Renderer) {
      this.vt100Renderer = window.Vecterm?.vt100Renderer;
      if (!this.vt100Renderer) {
        console.error('VT100 renderer still not available');
        return;
      }
      this.renderer.setVT100Renderer(this.vt100Renderer);
    }

    // Ensure CLI panel is visible
    const cliPanel = document.getElementById('cli-panel');
    if (cliPanel && cliPanel.classList.contains('hidden')) {
      cliPanel.classList.remove('hidden');
    }

    this.enabled = true;
    this.startAnimation();

    console.log('✓ VScope enabled');
  }

  /**
   * Disable vscope system
   */
  disable() {
    if (!this.enabled) {
      console.log('[VScope] Already disabled, skipping');
      return;
    }

    console.log('[VScope] Disabling...');

    // CRITICAL: Set enabled to false FIRST to stop animation loop
    this.enabled = false;

    // Stop the animation loop
    this.stopAnimation();

    // Clear all rendering artifacts
    if (this.overlay) {
      this.overlay.clear();
    }

    if (this.renderer) {
      this.renderer.clear();
    }

    // Clear pixel grid
    if (this.pixelGrid) {
      this.pixelGrid.clear();
    }

    console.log('✓ VScope disabled and cleared');
  }

  /**
   * Start animation loop
   */
  startAnimation() {
    if (this.animationId) {
      return;
    }

    this.lastUpdateTime = performance.now();
    this.animationId = requestAnimationFrame(this.update);
  }

  /**
   * Stop animation loop
   */
  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Main update loop
   */
  update(currentTime) {
    // GLOBAL KILL SWITCH - set window.VSCOPE_DISABLE_ALL = true in console
    if (window.VSCOPE_DISABLE_ALL) {
      console.warn('[VScope] KILLED BY GLOBAL SWITCH');
      this.enabled = false;
      this.animationId = null;
      return;
    }

    // EMERGENCY STOP: Check enabled flag multiple times
    if (!this.enabled) {
      console.log('[VScope] Update called but disabled - stopping animation');
      this.animationId = null;
      return;
    }

    // Safety check: if no renderer, stop
    if (!this.renderer || !this.vt100Renderer) {
      console.warn('[VScope] Missing renderer - disabling');
      this.disable();
      return;
    }

    // Throttle updates based on update rate
    const deltaTime = currentTime - this.lastUpdateTime;
    if (deltaTime < this.updateInterval) {
      this.animationId = requestAnimationFrame(this.update);
      return;
    }

    this.lastUpdateTime = currentTime;

    const state = this.store.getState().vscope;

    // Update tracker (entity following, auto-framing)
    if (this.gameInstance) {
      this.tracker.update(this.gameInstance, state.track);
    }

    // Get tracked region
    const trackedRegion = this.tracker.getTrackedRegion();

    // Update mapper with current region and quadrant
    this.mapper.setSourceRegion(trackedRegion);
    this.mapper.setTargetQuadrant(state.scope.targetQuadrant);

    // OVERLAY DISABLED ENTIRELY - debugging rendering issues
    // TODO: Re-enable once we figure out what's drawing game objects on canvas
    /*
    const shouldRenderOverlay = state.overlay.borderBox || state.overlay.connectionLines;
    if (shouldRenderOverlay && state.field.mode !== 'pixel') {
      this.overlay.render(trackedRegion, state.scope.targetQuadrant);
    }
    */

    // Render to terminal (samples canvas in pixel mode)
    this.renderToTerminal(state);

    // Clear overlay if we rendered it (so next frame doesn't capture it in pixel mode)
    // Actually, don't clear - let the game's render loop handle it
    // The game should be clearing/redrawing the canvas each frame

    // Continue animation only if still enabled
    if (this.enabled) {
      this.animationId = requestAnimationFrame(this.update);
    } else {
      this.animationId = null;
    }
  }

  /**
   * Render field content to terminal
   */
  renderToTerminal(state) {
    // Get scene data based on field mode
    let sceneData;

    switch (state.field.mode) {
      case 'vector':
        sceneData = this.getVectorData();
        break;

      case 'grid':
        sceneData = this.getGridData();
        break;

      case 'pixel':
        sceneData = this.getPixelData();
        break;

      default:
        console.warn(`Unknown field mode: ${state.field.mode}`);
        return;
    }

    // Render scene data to terminal
    this.renderer.render(sceneData, state);
  }

  /**
   * Get vector data from current field
   */
  getVectorData() {
    // If we have a game instance, get its line segments
    if (this.gameInstance && typeof this.gameInstance.getLineSegments === 'function') {
      const lines = this.gameInstance.getLineSegments();
      console.log('[VScope] Got', lines.length, 'lines from game');
      return {
        type: 'vectors',
        lines
      };
    }

    console.warn('[VScope] No game instance or getLineSegments method');

    // Otherwise, try to get from Vecterm if it's rendering 3D
    if (window.Vecterm && window.Vecterm.vecterm) {
      // TODO: Hook into Vecterm's rendering pipeline to capture line segments
      return {
        type: 'vectors',
        lines: []
      };
    }

    return {
      type: 'vectors',
      lines: []
    };
  }

  /**
   * Get grid overlay data
   */
  getGridData() {
    const state = this.store.getState().vscope;
    return {
      type: 'grid',
      gridSize: state.pixelGrid.resolution
    };
  }

  /**
   * Get pixel/raster data
   */
  getPixelData() {
    // Sample canvas pixels in tracked region
    const region = this.tracker.getTrackedRegion();

    // IMPORTANT: Ensure overlay is cleared before sampling to prevent feedback loop
    // The overlay draws on the same canvas, so if we sample after overlay rendering,
    // we'll capture the overlay artifacts and render them to terminal
    if (this.overlay) {
      this.overlay.clear();
    }

    try {
      const imageData = this.mainCtx.getImageData(
        region.x,
        region.y,
        region.width,
        region.height
      );

      return {
        type: 'pixels',
        imageData,
        region
      };
    } catch (error) {
      console.error('Error getting pixel data:', error);
      return {
        type: 'pixels',
        imageData: null,
        region
      };
    }
  }

  /**
   * Set game instance for tracking
   */
  setGameInstance(instance) {
    this.gameInstance = instance;
    this.tracker.setGameInstance(instance);
  }

  /**
   * Set tracking target (single entity)
   */
  setTrackingTarget(entityId) {
    this.tracker.setTarget(entityId);
  }

  /**
   * Set tracking targets (multiple entities)
   */
  setTrackingTargets(entityIds) {
    this.tracker.setTargets(entityIds);
  }

  /**
   * Set tracking region (static)
   */
  setTrackingRegion(region) {
    this.tracker.setRegion(region);
  }

  /**
   * Reset tracking to full field
   */
  resetTracking() {
    this.tracker.reset();
  }

  /**
   * Set update rate in FPS
   */
  setUpdateRate(fps) {
    this.updateInterval = 1000 / Math.max(1, Math.min(60, fps));
  }

  /**
   * Handle Redux state changes
   */
  onStateChange() {
    const state = this.store.getState().vscope;

    // Update subsystems with new state
    if (this.cameras) {
      this.cameras.updateFromState(state.camera);
    }

    if (this.tracker) {
      this.tracker.updateFromState(state.track);
    }

    if (this.effects) {
      this.effects.updateFromState(state.field.effects);
    }

    if (this.overlay) {
      this.overlay.updateFromState(state.overlay);
    }

    if (this.mapper && state.scope.targetQuadrant !== undefined) {
      this.mapper.setTargetQuadrant(state.scope.targetQuadrant);
    }

    if (this.pixelGrid && state.pixelGrid.resolution !== undefined) {
      this.pixelGrid.setResolution(state.pixelGrid.resolution);
    }
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.disable();

    if (this.overlay) {
      this.overlay.cleanup();
    }

    if (this.renderer) {
      this.renderer.cleanup();
    }

    console.log('✓ VScope cleaned up');
  }
}
