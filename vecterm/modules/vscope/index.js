/**
 * VScope Module - Main Entry Point
 *
 * Vectorscope system for visual mapping between field canvas and VT100 terminal.
 *
 * Features:
 * - Dual camera system (field + scope)
 * - Entity tracking with auto-framing
 * - Multiple rendering modes (vector, grid, pixel)
 * - Effect pipeline (bloom, glow, scanlines)
 * - Coordinate mapping with aspect-ratio preservation
 * - Visual feedback (border boxes, connection lines)
 */

import { VScope } from './vscope-core.js';

// Module-level instances
let vscope = null;
let store = null;

/**
 * Initial vscope state
 */
export const initialVscopeState = {
  enabled: false,
  context: 'vscope',

  camera: {
    field: {
      position: { x: 0, y: 0, z: 10 },
      target: { x: 0, y: 0, z: 0 },
      zoom: 1.0,
      fov: 60,
      projection: 'perspective' // 'perspective' | 'orthographic' | 'isometric'
    },
    scope: {
      position: { x: 0, y: 0, z: 10 },
      target: { x: 0, y: 0, z: 0 },
      zoom: 1.0,
      fov: 60,
      projection: 'perspective'
    },
    active: 'field' // 'field' | 'scope'
  },

  track: {
    mode: 'static', // 'static' | 'entity' | 'multi-entity'
    entityId: null,
    entityIds: [],
    smoothing: 0.1,
    offset: { x: 0, y: 0 },
    autoZoom: true,
    bounds: null
  },

  field: {
    mode: 'vector', // 'vector' | 'grid' | 'pixel'
    region: { x: 0, y: 0, width: 1920, height: 1080 },
    effects: {
      glow: { enabled: true, intensity: 0.3, radius: 10 },
      bloom: { enabled: true, radius: 5, intensity: 0.5, threshold: 0.5 },
      scanlines: { enabled: true, intensity: 0.15, speed: 8 }
    }
  },

  scope: {
    targetQuadrant: 1, // 0=full terminal, 1-4=quadrants
    updateRate: 30     // FPS
  },

  projection: {
    algorithm: 'dda',           // 'dda' | 'bresenham'
    flatten: 'perspective'      // 'perspective' | 'orthographic' | 'isometric'
  },

  overlay: {
    borderBox: true,
    connectionLines: true
  },

  pixelGrid: {
    resolution: 100,
    vectorTracking: true
  }
};

/**
 * VScope actions
 */
export const vscopeActions = {
  enable: () => ({ type: 'VSCOPE_ENABLE' }),
  disable: () => ({ type: 'VSCOPE_DISABLE' }),
  setContext: (context) => ({ type: 'VSCOPE_SET_CONTEXT', payload: context }),

  // Camera
  setActiveCamera: (camera) => ({ type: 'VSCOPE_SET_ACTIVE_CAMERA', payload: camera }),
  updateCamera: (camera, updates) => ({ type: 'VSCOPE_UPDATE_CAMERA', payload: { camera, updates } }),
  resetCamera: (camera) => ({ type: 'VSCOPE_RESET_CAMERA', payload: camera }),

  // Tracking
  trackEntity: (entityId) => ({ type: 'VSCOPE_TRACK_ENTITY', payload: entityId }),
  trackEntities: (entityIds) => ({ type: 'VSCOPE_TRACK_ENTITIES', payload: entityIds }),
  trackRegion: (region) => ({ type: 'VSCOPE_TRACK_REGION', payload: region }),
  resetTracking: () => ({ type: 'VSCOPE_RESET_TRACKING' }),
  updateTracking: (updates) => ({ type: 'VSCOPE_UPDATE_TRACKING', payload: updates }),

  // Field
  setFieldMode: (mode) => ({ type: 'VSCOPE_SET_FIELD_MODE', payload: mode }),
  updateFieldRegion: (region) => ({ type: 'VSCOPE_UPDATE_FIELD_REGION', payload: region }),
  updateEffect: (effect, updates) => ({ type: 'VSCOPE_UPDATE_EFFECT', payload: { effect, updates } }),

  // Scope
  setQuadrant: (quadrant) => ({ type: 'VSCOPE_SET_QUADRANT', payload: quadrant }),
  setUpdateRate: (rate) => ({ type: 'VSCOPE_SET_UPDATE_RATE', payload: rate }),

  // Projection
  setProjectionAlgorithm: (algorithm) => ({ type: 'VSCOPE_SET_PROJECTION_ALGORITHM', payload: algorithm }),
  setProjectionFlatten: (flatten) => ({ type: 'VSCOPE_SET_PROJECTION_FLATTEN', payload: flatten }),

  // Overlay
  toggleBorderBox: () => ({ type: 'VSCOPE_TOGGLE_BORDER_BOX' }),
  toggleConnectionLines: () => ({ type: 'VSCOPE_TOGGLE_CONNECTION_LINES' }),

  // Pixel Grid
  setPixelGridResolution: (resolution) => ({ type: 'VSCOPE_SET_PIXEL_GRID_RESOLUTION', payload: resolution })
};

/**
 * VScope reducer
 */
export function vscopeReducer(state = initialVscopeState, action) {
  switch (action.type) {
    case 'VSCOPE_ENABLE':
      return { ...state, enabled: true };

    case 'VSCOPE_DISABLE':
      return { ...state, enabled: false };

    case 'VSCOPE_SET_CONTEXT':
      return { ...state, context: action.payload };

    case 'VSCOPE_SET_ACTIVE_CAMERA':
      return {
        ...state,
        camera: { ...state.camera, active: action.payload }
      };

    case 'VSCOPE_UPDATE_CAMERA':
      return {
        ...state,
        camera: {
          ...state.camera,
          [action.payload.camera]: {
            ...state.camera[action.payload.camera],
            ...action.payload.updates
          }
        }
      };

    case 'VSCOPE_RESET_CAMERA':
      return {
        ...state,
        camera: {
          ...state.camera,
          [action.payload]: initialVscopeState.camera[action.payload]
        }
      };

    case 'VSCOPE_TRACK_ENTITY':
      return {
        ...state,
        track: {
          ...state.track,
          mode: 'entity',
          entityId: action.payload,
          entityIds: []
        }
      };

    case 'VSCOPE_TRACK_ENTITIES':
      return {
        ...state,
        track: {
          ...state.track,
          mode: 'multi-entity',
          entityId: null,
          entityIds: action.payload
        }
      };

    case 'VSCOPE_TRACK_REGION':
      return {
        ...state,
        track: {
          ...state.track,
          mode: 'static'
        },
        field: {
          ...state.field,
          region: action.payload
        }
      };

    case 'VSCOPE_RESET_TRACKING':
      return {
        ...state,
        track: initialVscopeState.track,
        field: {
          ...state.field,
          region: initialVscopeState.field.region
        }
      };

    case 'VSCOPE_UPDATE_TRACKING':
      return {
        ...state,
        track: { ...state.track, ...action.payload }
      };

    case 'VSCOPE_SET_FIELD_MODE':
      return {
        ...state,
        field: { ...state.field, mode: action.payload }
      };

    case 'VSCOPE_UPDATE_FIELD_REGION':
      return {
        ...state,
        field: { ...state.field, region: action.payload }
      };

    case 'VSCOPE_UPDATE_EFFECT':
      return {
        ...state,
        field: {
          ...state.field,
          effects: {
            ...state.field.effects,
            [action.payload.effect]: {
              ...state.field.effects[action.payload.effect],
              ...action.payload.updates
            }
          }
        }
      };

    case 'VSCOPE_SET_QUADRANT':
      return {
        ...state,
        scope: { ...state.scope, targetQuadrant: action.payload }
      };

    case 'VSCOPE_SET_UPDATE_RATE':
      return {
        ...state,
        scope: { ...state.scope, updateRate: action.payload }
      };

    case 'VSCOPE_SET_PROJECTION_ALGORITHM':
      return {
        ...state,
        projection: { ...state.projection, algorithm: action.payload }
      };

    case 'VSCOPE_SET_PROJECTION_FLATTEN':
      return {
        ...state,
        projection: { ...state.projection, flatten: action.payload }
      };

    case 'VSCOPE_TOGGLE_BORDER_BOX':
      return {
        ...state,
        overlay: { ...state.overlay, borderBox: !state.overlay.borderBox }
      };

    case 'VSCOPE_TOGGLE_CONNECTION_LINES':
      return {
        ...state,
        overlay: { ...state.overlay, connectionLines: !state.overlay.connectionLines }
      };

    case 'VSCOPE_SET_PIXEL_GRID_RESOLUTION':
      return {
        ...state,
        pixelGrid: { ...state.pixelGrid, resolution: action.payload }
      };

    default:
      return state;
  }
}

/**
 * Initialize vscope module
 */
export async function init(reduxStore) {
  store = reduxStore;

  console.log('Initializing vscope module...');

  // Create vscope instance
  vscope = new VScope(store);

  // Initialize vscope system
  await vscope.initialize();

  // Set up global API
  setupGlobalAPI();

  console.log('✓ VScope module initialized');
}

/**
 * Set up global API at window.Vecterm.VScope
 */
function setupGlobalAPI() {
  if (!window.Vecterm) {
    window.Vecterm = {};
  }

  window.Vecterm.VScope = {
    // Core
    enable: () => {
      store.dispatch(vscopeActions.enable());
      vscope.enable();
      console.log('✓ VScope enabled');
    },

    disable: () => {
      console.log('[VScope API] DISABLING - forcing full shutdown');
      store.dispatch(vscopeActions.disable());
      if (vscope) {
        vscope.disable();
      }
      console.log('✓ VScope disabled');
    },

    // EMERGENCY KILL SWITCH
    kill: () => {
      console.log('[VScope API] ========== EMERGENCY KILL ==========');

      // Set global kill switch
      window.VSCOPE_DISABLE_ALL = true;

      if (vscope) {
        vscope.enabled = false;

        // Cancel animation
        if (vscope.animationId) {
          cancelAnimationFrame(vscope.animationId);
          vscope.animationId = null;
        }

        // Clear all renderers
        if (vscope.renderer) {
          vscope.renderer.clear();
        }
        if (vscope.overlay) {
          vscope.overlay.clear();
        }
        if (vscope.pixelGrid) {
          vscope.pixelGrid.clear();
        }

        // Clear VT100 canvas entirely
        if (vscope.vt100Renderer && vscope.vt100Renderer.canvas) {
          const ctx = vscope.vt100Renderer.canvas.getContext('2d');
          ctx.clearRect(0, 0, vscope.vt100Renderer.canvas.width, vscope.vt100Renderer.canvas.height);
        }

        // Clear main canvas (in case overlay drew on it)
        if (vscope.mainCanvas && vscope.mainCtx) {
          vscope.mainCtx.clearRect(0, 0, vscope.mainCanvas.width, vscope.mainCanvas.height);
        }
      }

      store.dispatch(vscopeActions.disable());
      console.log('✓ VScope KILLED - all rendering stopped');
      console.log('  To re-enable: window.VSCOPE_DISABLE_ALL = false; Vecterm.VScope.enable()');
    },

    getState: () => store.getState().vscope,

    // Camera
    camera: {
      field: () => {
        store.dispatch(vscopeActions.setActiveCamera('field'));
        store.dispatch(vscopeActions.setContext('vscope.camera.field'));
        console.log('✓ Switched to field camera');
      },

      scope: () => {
        store.dispatch(vscopeActions.setActiveCamera('scope'));
        store.dispatch(vscopeActions.setContext('vscope.camera.scope'));
        console.log('✓ Switched to scope camera');
      },

      pan: (x, y) => {
        const state = store.getState().vscope;
        const camera = state.camera.active;
        const current = state.camera[camera].position;
        store.dispatch(vscopeActions.updateCamera(camera, {
          position: { ...current, x: current.x + x, y: current.y + y }
        }));
      },

      zoom: (factor) => {
        const state = store.getState().vscope;
        const camera = state.camera.active;
        store.dispatch(vscopeActions.updateCamera(camera, { zoom: factor }));
        console.log(`✓ ${camera} camera zoom: ${factor}x`);
      },

      projection: (mode) => {
        const state = store.getState().vscope;
        const camera = state.camera.active;
        store.dispatch(vscopeActions.updateCamera(camera, { projection: mode }));
        console.log(`✓ ${camera} camera projection: ${mode}`);
      },

      reset: () => {
        const state = store.getState().vscope;
        const camera = state.camera.active;
        store.dispatch(vscopeActions.resetCamera(camera));
        console.log(`✓ ${camera} camera reset`);
      }
    },

    // Field modes
    field: {
      vector: () => {
        store.dispatch(vscopeActions.setFieldMode('vector'));
        store.dispatch(vscopeActions.setContext('vscope.field.vector'));
        console.log('✓ Field mode: vector');
      },

      grid: () => {
        store.dispatch(vscopeActions.setFieldMode('grid'));
        store.dispatch(vscopeActions.setContext('vscope.field.grid'));
        console.log('✓ Field mode: grid');
      },

      pixel: () => {
        store.dispatch(vscopeActions.setFieldMode('pixel'));
        store.dispatch(vscopeActions.setContext('vscope.field.pixel'));
        console.log('✓ Field mode: pixel');
      }
    },

    // Tracking
    track: {
      entity: (entityId) => {
        store.dispatch(vscopeActions.trackEntity(entityId));
        vscope.setTrackingTarget(entityId);
        console.log(`✓ Tracking entity: ${entityId}`);
      },

      entities: (entityIds) => {
        const ids = Array.isArray(entityIds) ? entityIds : entityIds.split(',');
        store.dispatch(vscopeActions.trackEntities(ids));
        vscope.setTrackingTargets(ids);
        console.log(`✓ Tracking entities: ${ids.join(', ')}`);
      },

      region: (x, y, width, height) => {
        const region = { x, y, width, height };
        store.dispatch(vscopeActions.trackRegion(region));
        vscope.setTrackingRegion(region);
        console.log(`✓ Tracking region: ${x},${y} ${width}×${height}`);
      },

      reset: () => {
        store.dispatch(vscopeActions.resetTracking());
        vscope.resetTracking();
        console.log('✓ Tracking reset to full field');
      }
    },

    // Display
    quadrant: (q) => {
      const quadrant = parseInt(q);
      if (quadrant < 0 || quadrant > 4) {
        console.error('Quadrant must be 0-4 (0=full terminal, 1-4=quadrants)');
        return;
      }
      store.dispatch(vscopeActions.setQuadrant(quadrant));
      console.log(`✓ Terminal quadrant: ${quadrant === 0 ? 'full' : quadrant}`);
    },

    updaterate: (fps) => {
      const rate = parseInt(fps);
      if (rate < 1 || rate > 60) {
        console.error('Update rate must be 1-60 FPS');
        return;
      }
      store.dispatch(vscopeActions.setUpdateRate(rate));
      vscope.setUpdateRate(rate);
      console.log(`✓ Update rate: ${rate} FPS`);
    },

    // Debug mapping - prints all mapping info for debugging
    debug: () => {
      const state = store.getState().vscope;
      const output = [];

      output.push('=== VSCOPE DEBUG INFO ===');
      output.push('');
      output.push('VSCOPE STATE:');
      output.push(`  enabled: ${vscope?.enabled}`);
      output.push(`  initialized: ${vscope?.initialized}`);
      output.push(`  animationId: ${vscope?.animationId}`);
      output.push('');

      output.push('GAME INSTANCE:');
      output.push(`  connected: ${!!vscope?.gameInstance}`);
      if (vscope?.gameInstance) {
        output.push(`  has getLineSegments: ${typeof vscope.gameInstance.getLineSegments === 'function'}`);
        if (typeof vscope.gameInstance.getLineSegments === 'function') {
          const lines = vscope.gameInstance.getLineSegments();
          output.push(`  line count: ${lines.length}`);
        }
      }
      output.push('');

      output.push('VT100 RENDERER:');
      output.push(`  exists: ${!!vscope?.vt100Renderer}`);
      if (vscope?.vt100Renderer) {
        output.push(`  canvas: ${vscope.vt100Renderer.canvas?.id}`);
        output.push(`  canvas size: ${vscope.vt100Renderer.canvas?.width}x${vscope.vt100Renderer.canvas?.height}`);
        output.push(`  cols: ${vscope.vt100Renderer.cols}`);
        output.push(`  rows: ${vscope.vt100Renderer.rows}`);
      }
      output.push('');

      if (vscope?.mapper) {
        const sourceRegion = vscope.mapper.getSourceRegion();
        const targetRegion = vscope.mapper.getTargetRegion();
        const transform = vscope.mapper.getTransform();

        output.push('MAPPER - SOURCE REGION (Canvas):');
        output.push(`  x: ${sourceRegion.x}`);
        output.push(`  y: ${sourceRegion.y}`);
        output.push(`  width: ${sourceRegion.width}`);
        output.push(`  height: ${sourceRegion.height}`);
        output.push(`  aspect: ${(sourceRegion.width / sourceRegion.height).toFixed(3)}`);
        output.push('');

        output.push('MAPPER - TARGET REGION (Terminal):');
        output.push(`  col: ${targetRegion.col}`);
        output.push(`  row: ${targetRegion.row}`);
        output.push(`  cols: ${targetRegion.cols}`);
        output.push(`  rows: ${targetRegion.rows}`);
        output.push(`  aspect: ${(targetRegion.cols / targetRegion.rows).toFixed(3)}`);
        output.push('');

        output.push('MAPPER - TRANSFORM:');
        output.push(`  scale.x: ${transform.scale.x.toFixed(6)}`);
        output.push(`  scale.y: ${transform.scale.y.toFixed(6)}`);
        output.push(`  offset.x: ${transform.offset.x.toFixed(3)}`);
        output.push(`  offset.y: ${transform.offset.y.toFixed(3)}`);
        output.push('');

        // Test a few points
        output.push('MAPPER - TEST MAPPINGS:');
        const testPoints = [
          { x: 0, y: 0, label: 'Origin' },
          { x: 960, y: 540, label: 'Center' },
          { x: 1920, y: 1080, label: 'Bottom-right' }
        ];
        testPoints.forEach(pt => {
          const mapped = vscope.mapper.canvasToTerminal(pt.x, pt.y);
          output.push(`  ${pt.label} (${pt.x}, ${pt.y}) → (col ${mapped.col}, row ${mapped.row})`);
        });
      }

      output.push('');
      output.push('=== END DEBUG INFO ===');

      // Print to console
      output.forEach(line => console.log(line));

      // Also return as string for copying
      return output.join('\n');
    },

    // Status - returns status data for CLI display
    status: () => {
      console.log('[VScope.status] CALLED');
      const state = store.getState().vscope;
      console.log('[VScope.status] state:', state);
      const lines = [];

      lines.push('VScope Status:');
      lines.push(`  Enabled: ${state.enabled ? 'yes' : 'no'}`);
      lines.push(`  Context: ${state.context}`);
      lines.push(`  Active camera: ${state.camera.active}`);
      lines.push(`  Field mode: ${state.field.mode}`);
      lines.push(`  Tracking: ${state.track.mode}`);
      if (state.track.mode === 'entity' && state.track.entityId) {
        lines.push(`    Entity: ${state.track.entityId}`);
      } else if (state.track.mode === 'multi-entity' && state.track.entityIds.length > 0) {
        lines.push(`    Entities: ${state.track.entityIds.join(', ')}`);
      }
      lines.push(`  Terminal quadrant: ${state.scope.targetQuadrant === 0 ? 'full' : state.scope.targetQuadrant}`);
      lines.push(`  Update rate: ${state.scope.updateRate} FPS`);
      lines.push(`  Effects:`);
      lines.push(`    Glow: ${state.field.effects.glow.enabled ? 'on' : 'off'} (${state.field.effects.glow.intensity})`);
      lines.push(`    Bloom: ${state.field.effects.bloom.enabled ? 'on' : 'off'} (${state.field.effects.bloom.intensity})`);
      lines.push(`    Scanlines: ${state.field.effects.scanlines.enabled ? 'on' : 'off'} (${state.field.effects.scanlines.intensity})`);

      // MAPPING DETAILS
      if (vscope && vscope.mapper) {
        lines.push('');
        lines.push('Mapping Details:');

        const sourceRegion = vscope.mapper.getSourceRegion();
        lines.push('  Source Region (Canvas):');
        lines.push(`    Position: (${sourceRegion.x}, ${sourceRegion.y})`);
        lines.push(`    Size: ${sourceRegion.width} × ${sourceRegion.height}`);
        lines.push(`    Aspect: ${(sourceRegion.width / sourceRegion.height).toFixed(3)}`);

        const targetRegion = vscope.mapper.getTargetRegion();
        lines.push('  Target Region (Terminal):');
        lines.push(`    Position: col ${targetRegion.col}, row ${targetRegion.row}`);
        lines.push(`    Size: ${targetRegion.cols} cols × ${targetRegion.rows} rows`);
        lines.push(`    Aspect: ${(targetRegion.cols / targetRegion.rows).toFixed(3)}`);

        const transform = vscope.mapper.getTransform();
        lines.push('  Transform:');
        lines.push(`    Scale: x=${transform.scale.x.toFixed(6)}, y=${transform.scale.y.toFixed(6)}`);
        lines.push(`    Offset: x=${transform.offset.x.toFixed(3)}, y=${transform.offset.y.toFixed(3)}`);

        // Show example mappings
        lines.push('  Example Mappings:');
        const testPoints = [
          { x: sourceRegion.x, y: sourceRegion.y, label: 'Top-left' },
          { x: sourceRegion.x + sourceRegion.width, y: sourceRegion.y, label: 'Top-right' },
          { x: sourceRegion.x + sourceRegion.width / 2, y: sourceRegion.y + sourceRegion.height / 2, label: 'Center' },
          { x: sourceRegion.x, y: sourceRegion.y + sourceRegion.height, label: 'Bottom-left' },
          { x: sourceRegion.x + sourceRegion.width, y: sourceRegion.y + sourceRegion.height, label: 'Bottom-right' }
        ];

        testPoints.forEach(pt => {
          const term = vscope.mapper.canvasToTerminal(pt.x, pt.y);
          lines.push(`    ${pt.label}: canvas(${pt.x.toFixed(0)}, ${pt.y.toFixed(0)}) → terminal(col ${term.col}, row ${term.row})`);
        });
      } else {
        lines.push('');
        lines.push('Mapping Details: Not available (VScope not fully initialized)');
      }

      // Output to CLI - use command processor's cliLog directly
      // Import it from the global scope where command processor put it
      const cliLog = window.Vecterm?.CLI?.log;

      if (cliLog) {
        lines.forEach(line => cliLog(line, 'success'));
      } else {
        // Fallback: output to console AND try to find cliLog another way
        console.warn('[VScope.status] CLI.log not available, using console fallback');
        console.log('=== VScope Status ===');
        lines.forEach(line => console.log(line));
        console.log('======================');

        // Try to output via terminal.js directly
        import('../cli/terminal.js').then(terminal => {
          if (terminal.cliLog) {
            lines.forEach(line => terminal.cliLog(line, 'success'));
          }
        }).catch(err => {
          console.error('Could not import terminal.js:', err);
        });
      }

      console.log('[VScope.status] Returning lines:', lines);
      return lines;
    },

    // Connect to running game/field
    connectToGame: (gameId) => {
      const state = store.getState();
      const gameData = state.games.instances[gameId];

      if (!gameData || !gameData.instance) {
        console.error(`Game ${gameId} not found or not running`);
        return false;
      }

      vscope.setGameInstance(gameData.instance);
      console.log(`✓ VScope connected to game: ${gameId}`);
      return true;
    },

    // Connect to running field instance
    connectToField: (fieldId) => {
      const state = store.getState();
      const field = state.fields.instances[fieldId];

      if (!field || !field.instance) {
        console.error(`Field ${fieldId} not found or not running`);
        return false;
      }

      vscope.setGameInstance(field.instance);
      console.log(`✓ VScope connected to field: ${fieldId}`);
      return true;
    },

    // Auto-connect to any running field
    autoConnect: () => {
      const state = store.getState();
      const fields = Object.values(state.fields.instances);

      if (fields.length === 0) {
        console.error('No fields running. Start a field first: play quadrapong');
        return false;
      }

      const field = fields[0];
      vscope.setGameInstance(field.instance);
      console.log(`✓ VScope auto-connected to field: ${field.id}`);
      return true;
    },

    // Direct access to setGameInstance (for game-manager.js)
    setGameInstance: (instance) => {
      if (vscope) {
        vscope.setGameInstance(instance);
        return true;
      }
      return false;
    }
  };
}

/**
 * Cleanup function
 */
export function cleanup() {
  if (vscope) {
    vscope.cleanup();
  }
  console.log('✓ VScope module cleaned up');
}

/**
 * Export for module loader
 */
export default {
  init,
  cleanup,
  reducer: vscopeReducer,
  initialState: initialVscopeState,
  actions: vscopeActions
};
