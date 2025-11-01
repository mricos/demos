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
      store.dispatch(vscopeActions.disable());
      vscope.disable();
      console.log('✓ VScope disabled');
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

    // Status
    status: () => {
      const state = store.getState().vscope;
      console.log('VScope Status:');
      console.log(`  Enabled: ${state.enabled ? 'yes' : 'no'}`);
      console.log(`  Context: ${state.context}`);
      console.log(`  Active camera: ${state.camera.active}`);
      console.log(`  Field mode: ${state.field.mode}`);
      console.log(`  Tracking: ${state.track.mode}`);
      if (state.track.mode === 'entity' && state.track.entityId) {
        console.log(`    Entity: ${state.track.entityId}`);
      } else if (state.track.mode === 'multi-entity' && state.track.entityIds.length > 0) {
        console.log(`    Entities: ${state.track.entityIds.join(', ')}`);
      }
      console.log(`  Terminal quadrant: ${state.scope.targetQuadrant === 0 ? 'full' : state.scope.targetQuadrant}`);
      console.log(`  Update rate: ${state.scope.updateRate} FPS`);
      console.log(`  Effects:`);
      console.log(`    Glow: ${state.field.effects.glow.enabled ? 'on' : 'off'} (${state.field.effects.glow.intensity})`);
      console.log(`    Bloom: ${state.field.effects.bloom.enabled ? 'on' : 'off'} (${state.field.effects.bloom.intensity})`);
      console.log(`    Scanlines: ${state.field.effects.scanlines.enabled ? 'on' : 'off'} (${state.field.effects.scanlines.intensity})`);
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
