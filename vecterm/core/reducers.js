// ==========================================
// REDUCERS
// ==========================================

import * as ActionTypes from './actions.js';
import { midiReducer, initialMidiState, MIDI_ACTIONS } from '../modules/midi/midi-context.js';
import { vscopeReducer, initialVscopeState, vscopeActions } from '../modules/vscope/index.js';

export const initialState = {
  // Legacy state
  auth: {
    isLoggedIn: false,
    username: null
  },
  path: '/home/demo.md',
  canvasItems: [],

  // Scene editor state (demo namespace)
  entities: [],

  // Game Management (immutable game definitions)
  games: {
    registry: {
      quadrapong: {
        id: 'quadrapong',
        name: 'Quadrapong',
        description: '4-player pong with ECS architecture and VT100 effects',
        version: '1.0.0',
        loaded: false,
        bounds: { x: 0, y: 0, width: 1920, height: 1080 }
      },
      'spinning-cube': {
        id: 'spinning-cube',
        name: 'Spinning Cube',
        description: '3D wireframe cube demo for VScope terminal visualization',
        version: '1.0.0',
        loaded: false,
        bounds: { x: 0, y: 0, width: 1920, height: 1080 }
      }
    },
    instances: {},         // Running game instances
    activeGame: null,      // Currently loaded game ID
    previewGame: null      // Game being previewed
  },

  // Contexts (game configurations in lobby before spawning fields)
  contexts: {},

  // World Registry (platonic simulation spaces - metadata only, not live instances)
  worlds: {
    // worldId → world metadata
    // Live World instances stored in fieldRegistry, not Redux
    // Example:
    // 'quadrapong_main': {
    //   id: 'quadrapong_main',
    //   name: 'Quadrapong Main World',
    //   fieldId: 'field_123',  // Parent field
    //   bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    //   entityCount: 6,
    //   scenes: ['main', 'debug'],
    //   created: '2025-10-31T14:00:00Z'
    // }
  },

  // Field Registry (running game instances - metadata only)
  fields: {
    instances: {},         // fieldId → field metadata
    nextInstanceNumber: {} // gameId → next instance number
    // Example:
    // instances: {
    //   'field_123': {
    //     id: 'field_123',
    //     name: 'epic-battle',
    //     gameSpec: 'quadrapong',
    //     worldId: 'quadrapong_main',
    //     status: 'running',  // 'stopped' | 'running' | 'paused'
    //     mode: '3d',        // '2d' | '3d'
    //     tick: 1234,
    //     created: '2025-10-31T14:05:00Z',
    //     surfaces: ['main', 'terminal']  // Bound surface IDs
    //   }
    // }
  },

  // Surface Registry (rendering targets - metadata only)
  surfaces: {
    // surfaceId → surface metadata
    // Example:
    // 'main': {
    //   id: 'main',
    //   name: 'Main Canvas',
    //   type: 'Canvas2D',
    //   canvasId: 'main-canvas',
    //   bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    //   viewports: ['vp_main']
    // },
    // 'terminal': {
    //   id: 'terminal',
    //   name: 'VT100 Terminal',
    //   type: 'VT100',
    //   canvasId: 'vt100-canvas',
    //   bounds: { x: 0, y: 0, width: 800, height: 600 },
    //   cols: 80,
    //   rows: 24,
    //   viewports: ['vp_q1', 'vp_q2', 'vp_q3', 'vp_q4']
    // }
    main: {
      id: 'main',
      name: 'Main Canvas',
      type: 'Canvas2D',
      canvasId: 'main-canvas',
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      viewports: []
    },
    terminal: {
      id: 'terminal',
      name: 'VT100 Terminal',
      type: 'VT100',
      canvasId: 'vt100-canvas',
      bounds: { x: 0, y: 0, width: 800, height: 600 },
      cols: 80,
      rows: 24,
      viewports: []
    }
  },

  // Viewport Registry
  viewports: {
    // viewportId → viewport metadata
    // Example:
    // 'vp_q1': {
    //   id: 'vp_q1',
    //   name: 'Quadrant 1',
    //   surfaceId: 'terminal',
    //   rect: { x: 0, y: 0, width: 40, height: 12 },
    //   camera: { x: 0, y: 0, zoom: 1.0 },
    //   fieldId: 'field_123'  // Which field this viewport shows
    // }
  },

  // Namespace-aware entities
  namespaces: {
    demo: {
      entities: [],
      layers: [
        { id: 'layer-0', name: 'Background', visible: true, locked: false, zIndex: 0 },
        { id: 'layer-1', name: 'Entities', visible: true, locked: false, zIndex: 1 },
        { id: 'layer-2', name: 'UI', visible: true, locked: false, zIndex: 2 }
      ],
      activeLayerId: 'layer-1'
    },
    reduxCanvasDemo: {
      entities: [],
      layers: [
        { id: 'layer-1', name: 'Demo Entities', visible: true, locked: false, zIndex: 1 }
      ],
      activeLayerId: 'layer-1'
    }
  },

  selectedEntityIds: [],
  activeTool: 'select',
  grid: {
    enabled: true,
    size: 32,
    snapToGrid: true
  },
  camera: {
    x: 0,
    y: 0,
    zoom: 1
  },

  // UI State
  uiState: {
    sidebarCollapsed: false,
    sectionsCollapsed: {},
    subsectionsCollapsed: {},
    mode: 'idle',              // 'idle' | '2d' | '3d' | 'game'
    cliContext: 'vecterm',     // Context name shown in prompt (deprecated, use cliPrompt)
    cliLabel: null             // Optional label (deprecated, use cliPrompt)
  },

  // CLI Prompt State (context stack for prompt display)
  cliPrompt: {
    // Context stack: [@fieldId|vscope:#entityId|^surfaceId:viewportId]
    fieldId: null,           // Active field (@qp)
    vscopeTarget: null,      // VScope viewing target (vscope:#ball or vscope:query:name)
    surfaceId: null,         // Active surface (^terminal)
    viewportId: null,        // Active viewport (q1)
    username: null           // Username if logged in
  },

  // Multiplayer Network State
  network: {
    connected: false,
    playerId: null,
    playerName: null,
    currentLobby: null,
    lobbies: [],
    players: {}
  },
  // Example:
  // {
  //   instances: {
  //     'epic-battle': {
  //       id: 'epic-battle',
  //       contextId: 'quadrapong',
  //       gameId: 'quadrapong',
  //       instance: { /* actual game instance */ },
  //       status: 'running',  // 'running' | 'paused' | 'stopped'
  //       mode: '2d',        // '2d' | '3d'
  //       startedAt: '2025-10-31T14:05:00Z'
  //     }
  //   },
  //   nextInstanceNumber: {
  //     'quadrapong': 2
  //   }
  // }

  // S3 Connection State
  s3: {
    connected: false,
    bucket: 'vecterm-games',
    region: 'nyc3',
    endpoint: 'nyc3.digitaloceanspaces.com'
  },

  // Gamepad Input State
  gamepad: {
    connected: null,           // Gamepad info object or null
    enabled: true,             // Whether gamepad input is enabled
    activePreset: 'xbox',      // Active mapping preset name
    mappings: null,            // Loaded mappings (will be set from JSON)
    deadzone: 0.15             // Analog stick deadzone threshold
  },

  // Audio Engine State (tines.js)
  audio: {
    initialized: false,        // Whether audio engine is initialized
    bpm: 120,                  // Beats per minute
    masterVolume: 0.7,         // Master volume (0-1)
    playing: false,            // Whether clock is playing
    patterns: {},              // Active patterns by ID
    channels: {                // Channel states
      drone: { volume: 1.0, muted: false },
      synth: { volume: 1.0, muted: false },
      bells: { volume: 1.0, muted: false },
      drums: { volume: 1.0, muted: false }
    },
    config: {                  // Engine configuration
      maxVoices: 16,
      swing: 0,
      subdivision: 16,
      // Instrument defaults
      drone: {
        waveform: 'sawtooth',
        detune: 10,
        voices: 3,
        filterFreq: 2000,
        filterQ: 1,
        lfoRate: 0.2,
        lfoDepth: 0.3,
        volume: 0.5,
        attack: 2.0,
        release: 2.0
      }
    },
    presets: {}                // Saved pattern presets
  },

  // MIDI Controller State
  midi: initialMidiState,

  // VScope State
  vscope: initialVscopeState,

  // Vecterm 3D rendering state
  vecterm: {
    entities: {},
    camera: {
      position: { x: 5, y: 5, z: 10 },
      target: { x: 0, y: 0, z: 0 },
      fov: 60,
      near: 0.1,
      far: 1000
    },
    layers: {
      'default': { id: 'default', zIndex: 0, visible: true }
    },
    config: {
      phosphorColor: '#00ff00',
      backgroundColor: '#000000',
      lineWidth: 1,
      glowIntensity: 0.3,
      scanlineIntensity: 0.15,
      scanlineSpeed: 8,
      rasterWave: {
        enabled: false,
        amplitude: 2,
        frequency: 0.5
      },
      hiddenLineRemoval: true,
      backfaceCulling: true
    },
    grid: {
      // Character grid (terminal/ASCII awareness)
      character: {
        enabled: false,
        cols: 80,              // Terminal columns
        rows: 24,              // Terminal rows
        charWidth: 10,         // Pixels per character width
        charHeight: 20,        // Pixels per character height
        visible: false,        // Show character grid overlay
        color: '#003300',      // Grid line color
        snapToGrid: false      // Snap coordinates to character boundaries
      },
      // Square grid (canvas alignment)
      square: {
        enabled: false,        // Not default, but first-class
        size: 32,              // Grid cell size in pixels
        visible: false,        // Show square grid overlay
        color: '#1a1a1a',      // Grid line color
        snapToGrid: false,     // Snap coordinates to grid boundaries
        subdivisions: 1        // Sub-grid divisions (for finer control)
      },
      // Active grid type ('character' | 'square' | 'none')
      activeType: 'none'
    },
    // Grid-aware line segments (populated during rendering)
    lineSegments: [],          // Array of { p1, p2, gridCells: [...] }
    animation: {
      running: false,
      startTime: null,
      frameCount: 0
    }
  },

  // Global view mode (2D vs 3D rendering)
  viewMode: '2d',  // '2d' | '3d'

  // Parameter Connection Tracking
  // Tracks which entity parameters are connected to UI sliders, quick menus, and MIDI
  parameterConnections: {
    // Example:
    // 'entity:cube1:rotationSpeed': {
    //   entityId: 'cube1',
    //   parameter: 'rotationSpeed',
    //   cliSlider: { visible: true, position: { x: 100, y: 100 } },
    //   quickMenu: 2,  // Which quick menu (1 or 2)
    //   midiCC: { device: 'Launch Control', cc: 16 }
    // }
  }
};

let nextEntityId = 1;
let nextLayerId = 3;

export function rootReducer(state = initialState, action) {
  switch (action.type) {
    // Legacy actions (LOGIN and LOGOUT are now handled at the end with cliPrompt integration)

    case ActionTypes.SET_PATH:
      return {
        ...state,
        path: action.payload
      };

    case ActionTypes.ADD_CANVAS_ITEM:
      return {
        ...state,
        canvasItems: [...state.canvasItems, action.payload]
      };

    // Entity actions
    case ActionTypes.ADD_ENTITY: {
      // Check if action specifies a namespace
      if (action.namespace && state.namespaces[action.namespace]) {
        const ns = state.namespaces[action.namespace];
        return {
          ...state,
          namespaces: {
            ...state.namespaces,
            [action.namespace]: {
              ...ns,
              entities: [...ns.entities, {
                id: `entity-${nextEntityId++}`,
                layerId: ns.activeLayerId,
                ...action.payload
              }]
            }
          }
        };
      }
      // Default: add to top-level entities
      return {
        ...state,
        entities: [...state.entities, {
          id: `entity-${nextEntityId++}`,
          layerId: state.activeLayerId,
          ...action.payload
        }]
      };
    }

    case ActionTypes.UPDATE_ENTITY: {
      // Check if action specifies a namespace
      if (action.namespace && state.namespaces[action.namespace]) {
        const ns = state.namespaces[action.namespace];
        return {
          ...state,
          namespaces: {
            ...state.namespaces,
            [action.namespace]: {
              ...ns,
              entities: ns.entities.map(e =>
                e.id === action.payload.id
                  ? { ...e, ...action.payload.updates }
                  : e
              )
            }
          }
        };
      }
      // Default: update top-level entities
      return {
        ...state,
        entities: state.entities.map(e =>
          e.id === action.payload.id
            ? { ...e, ...action.payload.updates }
            : e
        )
      };
    }

    case ActionTypes.DELETE_ENTITY:
      return {
        ...state,
        entities: state.entities.filter(e => e.id !== action.payload),
        selectedEntityIds: state.selectedEntityIds.filter(id => id !== action.payload)
      };

    case ActionTypes.SELECT_ENTITY:
      return {
        ...state,
        selectedEntityIds: action.payload ? [action.payload] : []
      };

    // Layer actions (operate on demo namespace)
    case ActionTypes.ADD_LAYER:
      const demoNs = state.namespaces.demo || { entities: [], layers: [], activeLayerId: null };
      return {
        ...state,
        namespaces: {
          ...state.namespaces,
          demo: {
            ...demoNs,
            layers: [...demoNs.layers, {
              id: `layer-${nextLayerId++}`,
              name: action.payload,
              visible: true,
              locked: false,
              zIndex: demoNs.layers.length
            }]
          }
        }
      };

    case ActionTypes.TOGGLE_LAYER_VISIBILITY:
      const demoNsToggle = state.namespaces.demo || { entities: [], layers: [], activeLayerId: null };
      return {
        ...state,
        namespaces: {
          ...state.namespaces,
          demo: {
            ...demoNsToggle,
            layers: demoNsToggle.layers.map(l =>
              l.id === action.payload
                ? { ...l, visible: !l.visible }
                : l
            )
          }
        }
      };

    case ActionTypes.SET_ACTIVE_LAYER:
      const demoNsActive = state.namespaces.demo || { entities: [], layers: [], activeLayerId: null };
      return {
        ...state,
        namespaces: {
          ...state.namespaces,
          demo: {
            ...demoNsActive,
            activeLayerId: action.payload
          }
        }
      };

    // Tool actions
    case ActionTypes.SET_TOOL:
      return {
        ...state,
        activeTool: action.payload
      };

    // Grid actions
    case ActionTypes.TOGGLE_GRID:
      return {
        ...state,
        grid: { ...state.grid, enabled: !state.grid.enabled }
      };

    case ActionTypes.SET_GRID_SIZE:
      return {
        ...state,
        grid: { ...state.grid, size: action.payload }
      };

    // UI State actions
    case ActionTypes.TOGGLE_SIDEBAR:
      return {
        ...state,
        uiState: {
          ...state.uiState,
          sidebarCollapsed: !state.uiState.sidebarCollapsed
        }
      };

    case ActionTypes.TOGGLE_SECTION:
      return {
        ...state,
        uiState: {
          ...state.uiState,
          sectionsCollapsed: {
            ...state.uiState.sectionsCollapsed,
            [action.payload]: !state.uiState.sectionsCollapsed[action.payload]
          }
        }
      };

    case ActionTypes.TOGGLE_SUBSECTION:
      return {
        ...state,
        uiState: {
          ...state.uiState,
          subsectionsCollapsed: {
            ...state.uiState.subsectionsCollapsed,
            [action.payload]: !state.uiState.subsectionsCollapsed[action.payload]
          }
        }
      };

    case ActionTypes.SET_CLI_CONTEXT:
      return {
        ...state,
        uiState: {
          ...state.uiState,
          cliContext: action.payload.context,
          cliLabel: action.payload.label || null
        }
      };

    case ActionTypes.SET_MODE:
      return {
        ...state,
        uiState: {
          ...state.uiState,
          mode: action.payload
        }
      };

    case ActionTypes.LOAD_STATE:
      return {
        ...state,
        uiState: {
          ...state.uiState,
          ...action.payload
        }
      };

    case ActionTypes.SAVE_CONFIG:
      // Save entire state to localStorage
      try {
        localStorage.setItem('redux-demo-full-state', JSON.stringify(state));
      } catch (e) {
        console.error('Failed to save config:', e);
      }
      return state;

    case ActionTypes.LOAD_CONFIG:
      // Load full state from localStorage
      try {
        const savedState = localStorage.getItem('redux-demo-full-state');
        if (savedState) {
          return { ...state, ...JSON.parse(savedState) };
        }
      } catch (e) {
        console.error('Failed to load config:', e);
      }
      return state;

    // Game Management actions
    case ActionTypes.LOAD_GAME: {
      const { gameId, namespace } = action.payload;
      return {
        ...state,
        games: {
          ...state.games,
          registry: {
            ...state.games.registry,
            [gameId]: {
              ...state.games.registry[gameId],
              loaded: true
            }
          }
        },
        namespaces: {
          ...state.namespaces,
          [namespace || gameId]: {
            entities: [],
            layers: [],
            activeLayerId: null
          }
        }
      };
    }

    case ActionTypes.UNLOAD_GAME:
      const unloadGameId = action.payload;
      const newNamespaces = { ...state.namespaces };
      delete newNamespaces[unloadGameId];
      return {
        ...state,
        games: {
          ...state.games,
          registry: {
            ...state.games.registry,
            [unloadGameId]: {
              ...state.games.registry[unloadGameId],
              loaded: false
            }
          },
          instances: {
            ...state.games.instances,
            [unloadGameId]: undefined
          },
          activeGame: state.games.activeGame === unloadGameId ? null : state.games.activeGame,
          previewGame: state.games.previewGame === unloadGameId ? null : state.games.previewGame
        },
        namespaces: newNamespaces
      };

    case ActionTypes.SET_PREVIEW_GAME:
      return {
        ...state,
        games: {
          ...state.games,
          previewGame: action.payload
        }
      };

    case ActionTypes.SET_ACTIVE_GAME:
      return {
        ...state,
        games: {
          ...state.games,
          activeGame: action.payload
        }
      };

    case ActionTypes.UPDATE_GAME_INSTANCE:
      return {
        ...state,
        games: {
          ...state.games,
          instances: {
            ...state.games.instances,
            [action.payload.gameId]: action.payload.instance
          }
        }
      };

    // Vecterm Entity actions
    case ActionTypes.VECTERM_ADD_ENTITY:
      const newEntity = {
        id: action.payload.id || `vecterm-entity-${Date.now()}`,
        type: 'mesh',
        visible: true,
        layerId: 'default',
        ...action.payload
      };
      return {
        ...state,
        vecterm: {
          ...state.vecterm,
          entities: {
            ...state.vecterm.entities,
            [newEntity.id]: newEntity
          }
        }
      };

    case ActionTypes.VECTERM_UPDATE_ENTITY:
      const { id: updateId, updates } = action.payload;
      if (!state.vecterm.entities[updateId]) return state;
      return {
        ...state,
        vecterm: {
          ...state.vecterm,
          entities: {
            ...state.vecterm.entities,
            [updateId]: {
              ...state.vecterm.entities[updateId],
              ...updates
            }
          }
        }
      };

    case ActionTypes.VECTERM_REMOVE_ENTITY:
      const removeId = action.payload;
      const { [removeId]: removed, ...remainingEntities } = state.vecterm.entities;
      return {
        ...state,
        vecterm: {
          ...state.vecterm,
          entities: remainingEntities
        }
      };

    case ActionTypes.VECTERM_TOGGLE_VISIBLE:
      const toggleId = action.payload;
      if (!state.vecterm.entities[toggleId]) return state;
      return {
        ...state,
        vecterm: {
          ...state.vecterm,
          entities: {
            ...state.vecterm.entities,
            [toggleId]: {
              ...state.vecterm.entities[toggleId],
              visible: !state.vecterm.entities[toggleId].visible
            }
          }
        }
      };

    // Vecterm Transform actions
    case ActionTypes.VECTERM_SET_POSITION:
      const { id: posId, position } = action.payload;
      if (!state.vecterm.entities[posId]) return state;
      return {
        ...state,
        vecterm: {
          ...state.vecterm,
          entities: {
            ...state.vecterm.entities,
            [posId]: {
              ...state.vecterm.entities[posId],
              transform: {
                ...state.vecterm.entities[posId].transform,
                position
              }
            }
          }
        }
      };

    case ActionTypes.VECTERM_SET_ROTATION:
      const { id: rotId, rotation } = action.payload;
      if (!state.vecterm.entities[rotId]) return state;
      return {
        ...state,
        vecterm: {
          ...state.vecterm,
          entities: {
            ...state.vecterm.entities,
            [rotId]: {
              ...state.vecterm.entities[rotId],
              transform: {
                ...state.vecterm.entities[rotId].transform,
                rotation
              }
            }
          }
        }
      };

    case ActionTypes.VECTERM_SET_SCALE:
      const { id: scaleId, scale } = action.payload;
      if (!state.vecterm.entities[scaleId]) return state;
      return {
        ...state,
        vecterm: {
          ...state.vecterm,
          entities: {
            ...state.vecterm.entities,
            [scaleId]: {
              ...state.vecterm.entities[scaleId],
              transform: {
                ...state.vecterm.entities[scaleId].transform,
                scale
              }
            }
          }
        }
      };

    case ActionTypes.VECTERM_UPDATE_TRANSFORM:
      const { id: transId, transform } = action.payload;
      if (!state.vecterm.entities[transId]) return state;
      return {
        ...state,
        vecterm: {
          ...state.vecterm,
          entities: {
            ...state.vecterm.entities,
            [transId]: {
              ...state.vecterm.entities[transId],
              transform
            }
          }
        }
      };

    // Vecterm Camera actions
    case ActionTypes.VECTERM_SET_CAMERA:
      return {
        ...state,
        vecterm: {
          ...state.vecterm,
          camera: {
            ...state.vecterm.camera,
            ...action.payload
          }
        }
      };

    case ActionTypes.VECTERM_ORBIT_CAMERA:
      const { azimuth, elevation } = action.payload;
      const camera = state.vecterm.camera;
      const radius = Math.sqrt(
        Math.pow(camera.position.x - camera.target.x, 2) +
        Math.pow(camera.position.y - camera.target.y, 2) +
        Math.pow(camera.position.z - camera.target.z, 2)
      );

      // Calculate current angles
      const dx = camera.position.x - camera.target.x;
      const dz = camera.position.z - camera.target.z;
      const dy = camera.position.y - camera.target.y;
      const currentAzimuth = Math.atan2(dz, dx);
      const currentElevation = Math.asin(dy / radius);

      // Apply deltas
      const newAzimuth = currentAzimuth + azimuth;
      const newElevation = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, currentElevation + elevation));

      // Convert back to Cartesian
      const newPosition = {
        x: camera.target.x + radius * Math.cos(newElevation) * Math.cos(newAzimuth),
        y: camera.target.y + radius * Math.sin(newElevation),
        z: camera.target.z + radius * Math.cos(newElevation) * Math.sin(newAzimuth)
      };

      return {
        ...state,
        vecterm: {
          ...state.vecterm,
          camera: {
            ...camera,
            position: newPosition
          }
        }
      };

    case ActionTypes.VECTERM_ZOOM_CAMERA:
      const factor = action.payload;
      const cam = state.vecterm.camera;
      const dir = {
        x: cam.position.x - cam.target.x,
        y: cam.position.y - cam.target.y,
        z: cam.position.z - cam.target.z
      };

      return {
        ...state,
        vecterm: {
          ...state.vecterm,
          camera: {
            ...cam,
            position: {
              x: cam.target.x + dir.x * factor,
              y: cam.target.y + dir.y * factor,
              z: cam.target.z + dir.z * factor
            }
          }
        }
      };

    // Vecterm Layer actions
    case ActionTypes.VECTERM_ADD_LAYER:
      const { id: layerId, zIndex: layerZIndex } = action.payload;
      return {
        ...state,
        vecterm: {
          ...state.vecterm,
          layers: {
            ...state.vecterm.layers,
            [layerId]: {
              id: layerId,
              zIndex: layerZIndex || 0,
              visible: true
            }
          }
        }
      };

    case ActionTypes.VECTERM_REMOVE_LAYER:
      const removeLayerId = action.payload;
      const { [removeLayerId]: removedLayer, ...remainingLayers } = state.vecterm.layers;
      return {
        ...state,
        vecterm: {
          ...state.vecterm,
          layers: remainingLayers
        }
      };

    case ActionTypes.VECTERM_SET_LAYER_VISIBLE:
      const { id: visLayerId, visible } = action.payload;
      if (!state.vecterm.layers[visLayerId]) return state;
      return {
        ...state,
        vecterm: {
          ...state.vecterm,
          layers: {
            ...state.vecterm.layers,
            [visLayerId]: {
              ...state.vecterm.layers[visLayerId],
              visible
            }
          }
        }
      };

    case ActionTypes.VECTERM_SET_ENTITY_LAYER:
      const { entityId, layerId: entLayerId } = action.payload;
      if (!state.vecterm.entities[entityId]) return state;
      return {
        ...state,
        vecterm: {
          ...state.vecterm,
          entities: {
            ...state.vecterm.entities,
            [entityId]: {
              ...state.vecterm.entities[entityId],
              layerId: entLayerId
            }
          }
        }
      };

    // Vecterm Config actions
    case ActionTypes.VECTERM_SET_CONFIG:
      return {
        ...state,
        vecterm: {
          ...state.vecterm,
          config: {
            ...state.vecterm.config,
            ...action.payload
          }
        }
      };

    case ActionTypes.VECTERM_RESET_CONFIG:
      return {
        ...state,
        vecterm: {
          ...state.vecterm,
          config: initialState.vecterm.config
        }
      };

    // Vecterm Animation actions
    case ActionTypes.VECTERM_START_ANIMATION:
      return {
        ...state,
        vecterm: {
          ...state.vecterm,
          animation: {
            running: true,
            startTime: Date.now(),
            frameCount: 0
          }
        }
      };

    case ActionTypes.VECTERM_STOP_ANIMATION:
      return {
        ...state,
        vecterm: {
          ...state.vecterm,
          animation: {
            running: false,
            startTime: null,
            frameCount: state.vecterm.animation.frameCount
          }
        }
      };

    case ActionTypes.VECTERM_TICK:
      return {
        ...state,
        vecterm: {
          ...state.vecterm,
          animation: {
            ...state.vecterm.animation,
            frameCount: state.vecterm.animation.frameCount + 1
          }
        }
      };

    // Vecterm Grid actions
    case ActionTypes.VECTERM_SET_GRID_TYPE:
      const gridType = action.payload; // 'character' | 'square' | 'none'
      return {
        ...state,
        vecterm: {
          ...state.vecterm,
          grid: {
            ...state.vecterm.grid,
            activeType: gridType,
            // Auto-enable the selected grid
            [gridType]: gridType !== 'none' ? {
              ...state.vecterm.grid[gridType],
              enabled: true
            } : state.vecterm.grid[gridType]
          }
        }
      };

    case ActionTypes.VECTERM_SET_GRID_CONFIG:
      const { gridType: configGridType, config: gridConfig } = action.payload;
      if (configGridType !== 'character' && configGridType !== 'square') return state;
      return {
        ...state,
        vecterm: {
          ...state.vecterm,
          grid: {
            ...state.vecterm.grid,
            [configGridType]: {
              ...state.vecterm.grid[configGridType],
              ...gridConfig
            }
          }
        }
      };

    case ActionTypes.VECTERM_TOGGLE_GRID_VISIBLE:
      const toggleGridType = action.payload;
      if (toggleGridType !== 'character' && toggleGridType !== 'square') return state;
      return {
        ...state,
        vecterm: {
          ...state.vecterm,
          grid: {
            ...state.vecterm.grid,
            [toggleGridType]: {
              ...state.vecterm.grid[toggleGridType],
              visible: !state.vecterm.grid[toggleGridType].visible
            }
          }
        }
      };

    case ActionTypes.VECTERM_SET_CHARACTER_GRID:
      return {
        ...state,
        vecterm: {
          ...state.vecterm,
          grid: {
            ...state.vecterm.grid,
            character: {
              ...state.vecterm.grid.character,
              ...action.payload
            }
          }
        }
      };

    case ActionTypes.VECTERM_SET_SQUARE_GRID:
      return {
        ...state,
        vecterm: {
          ...state.vecterm,
          grid: {
            ...state.vecterm.grid,
            square: {
              ...state.vecterm.grid.square,
              ...action.payload
            }
          }
        }
      };

    // Context Management actions
    case ActionTypes.CREATE_CONTEXT: {
      const { contextId, gameId, customName } = action.payload;
      return {
        ...state,
        contexts: {
          ...state.contexts,
          [contextId]: {
            id: contextId,
            gameId,
            customName,
            customizations: {},
            createdAt: new Date().toISOString()
          }
        }
      };
    }

    case ActionTypes.UPDATE_CONTEXT:
      const { contextId: updateContextId, updates: contextUpdates } = action.payload;
      if (!state.contexts[updateContextId]) return state;
      return {
        ...state,
        contexts: {
          ...state.contexts,
          [updateContextId]: {
            ...state.contexts[updateContextId],
            customizations: {
              ...state.contexts[updateContextId].customizations,
              ...contextUpdates
            }
          }
        }
      };

    case ActionTypes.DELETE_CONTEXT:
      const deleteContextId = action.payload;
      const { [deleteContextId]: deletedContext, ...remainingContexts } = state.contexts;
      return {
        ...state,
        contexts: remainingContexts
      };

    case ActionTypes.ENTER_CONTEXT_EDIT:
      return {
        ...state,
        cliPrompt: {
          ...state.cliPrompt,
          mode: 'context',
          contextId: action.payload
        }
      };

    case ActionTypes.EXIT_CONTEXT_EDIT:
      return {
        ...state,
        cliPrompt: {
          ...state.cliPrompt,
          mode: 'toplevel',
          contextId: null
        }
      };

    // Field Management actions
    case ActionTypes.CREATE_FIELD: {
      const { fieldId, contextId: fieldContextId, gameId: fieldGameId, customName: fieldCustomName } = action.payload;
      return {
        ...state,
        fields: {
          ...state.fields,
          instances: {
            ...state.fields.instances,
            [fieldId]: {
              id: fieldId,
              contextId: fieldContextId,
              gameId: fieldGameId,
              customName: fieldCustomName,
              instance: null,  // Will be set by game manager
              status: 'running',
              mode: '3d',      // Default to 3D (2D is isometric projection)
              startedAt: new Date().toISOString()
            }
          },
          nextInstanceNumber: {
            ...state.fields.nextInstanceNumber,
            [fieldGameId]: (state.fields.nextInstanceNumber[fieldGameId] || 1) + 1
          }
        }
      };
    }

    case ActionTypes.UPDATE_FIELD:
      const { fieldId: updateFieldId, updates: fieldUpdates } = action.payload;
      if (!state.fields.instances[updateFieldId]) return state;
      return {
        ...state,
        fields: {
          ...state.fields,
          instances: {
            ...state.fields.instances,
            [updateFieldId]: {
              ...state.fields.instances[updateFieldId],
              ...fieldUpdates
            }
          }
        }
      };

    case ActionTypes.STOP_FIELD:
      const stopFieldId = action.payload;
      const { [stopFieldId]: stoppedField, ...remainingFields } = state.fields.instances;
      return {
        ...state,
        fields: {
          ...state.fields,
          instances: remainingFields
        },
        // Exit field if we're in it
        cliPrompt: state.cliPrompt.fieldId === stopFieldId
          ? { ...state.cliPrompt, mode: 'toplevel', fieldId: null, fieldState: null }
          : state.cliPrompt
      };

    case ActionTypes.ENTER_FIELD:
      return {
        ...state,
        cliPrompt: {
          ...state.cliPrompt,
          mode: 'field',
          fieldId: action.payload,
          contextId: null  // Clear context when entering field
        }
      };

    case ActionTypes.EXIT_FIELD:
      return {
        ...state,
        cliPrompt: {
          ...state.cliPrompt,
          mode: 'toplevel',
          fieldId: null,
          fieldState: null
        }
      };

    // CLI Prompt State actions
    case ActionTypes.SET_CLI_PROMPT_STATE:
      return {
        ...state,
        cliPrompt: {
          ...state.cliPrompt,
          ...action.payload
        }
      };

    // S3 Connection actions
    case ActionTypes.S3_CONNECT:
      return {
        ...state,
        s3: {
          ...state.s3,
          connected: true
        },
        cliPrompt: {
          ...state.cliPrompt,
          username: action.payload
        }
      };

    case ActionTypes.S3_DISCONNECT:
      return {
        ...state,
        s3: {
          ...state.s3,
          connected: false
        },
        cliPrompt: {
          ...state.cliPrompt,
          username: null
        }
      };

    // LOGIN action now also sets cliPrompt username
    case ActionTypes.LOGIN:
      return {
        ...state,
        auth: {
          isLoggedIn: true,
          username: action.payload
        },
        cliPrompt: {
          ...state.cliPrompt,
          username: action.payload
        },
        s3: {
          ...state.s3,
          connected: true
        }
      };

    // LOGOUT action now also clears cliPrompt username
    case ActionTypes.LOGOUT:
      return {
        ...state,
        auth: {
          isLoggedIn: false,
          username: null
        },
        cliPrompt: {
          ...state.cliPrompt,
          username: null
        },
        s3: {
          ...state.s3,
          connected: false
        }
      };

    // Gamepad Input actions
    case ActionTypes.GAMEPAD_CONNECTED:
      return {
        ...state,
        gamepad: {
          ...state.gamepad,
          connected: action.payload
        }
      };

    case ActionTypes.GAMEPAD_DISCONNECTED:
      return {
        ...state,
        gamepad: {
          ...state.gamepad,
          connected: null
        }
      };

    case ActionTypes.TOGGLE_GAMEPAD_ENABLED:
      return {
        ...state,
        gamepad: {
          ...state.gamepad,
          enabled: !state.gamepad.enabled
        }
      };

    case ActionTypes.LOAD_GAMEPAD_PRESET:
      return {
        ...state,
        gamepad: {
          ...state.gamepad,
          activePreset: action.payload
        }
      };

    case ActionTypes.SET_GAMEPAD_MAPPING: {
      const { buttonIndex, action: buttonAction, mode } = action.payload;
      const preset = state.gamepad.activePreset;
      const currentMappings = state.gamepad.mappings || {};
      const presetMappings = currentMappings[preset] || {};
      const modeMappings = presetMappings[mode] || {};
      const buttonMappings = modeMappings.buttons || {};

      return {
        ...state,
        gamepad: {
          ...state.gamepad,
          mappings: {
            ...currentMappings,
            [preset]: {
              ...presetMappings,
              [mode]: {
                ...modeMappings,
                buttons: {
                  ...buttonMappings,
                  [buttonIndex]: buttonAction
                }
              }
            }
          }
        }
      };
    }

    case ActionTypes.SET_GAMEPAD_CONFIG:
      return {
        ...state,
        gamepad: {
          ...state.gamepad,
          ...action.payload
        }
      };

    // Camera Control actions (triggered by gamepad or CLI)
    case ActionTypes.CAMERA_ORBIT: {
      const { horizontal, vertical } = action.payload;
      const vCamera = state.vecterm.camera;
      const vRadius = Math.sqrt(
        Math.pow(vCamera.position.x - vCamera.target.x, 2) +
        Math.pow(vCamera.position.y - vCamera.target.y, 2) +
        Math.pow(vCamera.position.z - vCamera.target.z, 2)
      );

      const vDx = vCamera.position.x - vCamera.target.x;
      const vDz = vCamera.position.z - vCamera.target.z;
      const vDy = vCamera.position.y - vCamera.target.y;
      const vCurrentAzimuth = Math.atan2(vDz, vDx);
      const vCurrentElevation = Math.asin(vDy / vRadius);

      const vNewAzimuth = vCurrentAzimuth + horizontal;
      const vNewElevation = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, vCurrentElevation + vertical));

      const vNewPosition = {
        x: vCamera.target.x + vRadius * Math.cos(vNewElevation) * Math.cos(vNewAzimuth),
        y: vCamera.target.y + vRadius * Math.sin(vNewElevation),
        z: vCamera.target.z + vRadius * Math.cos(vNewElevation) * Math.sin(vNewAzimuth)
      };

      return {
        ...state,
        vecterm: {
          ...state.vecterm,
          camera: {
            ...vCamera,
            position: vNewPosition
          }
        }
      };
    }

    case ActionTypes.CAMERA_ZOOM: {
      const zDelta = action.payload.delta !== undefined ? action.payload.delta : action.payload;
      const zCam = state.vecterm.camera;
      const zDir = {
        x: zCam.position.x - zCam.target.x,
        y: zCam.position.y - zCam.target.y,
        z: zCam.position.z - zCam.target.z
      };

      // Calculate current distance
      const zCurrentDist = Math.sqrt(zDir.x * zDir.x + zDir.y * zDir.y + zDir.z * zDir.z);

      // Apply zoom delta (negative = zoom in, positive = zoom out)
      const zNewDist = Math.max(1, zCurrentDist + zDelta);
      const zScale = zNewDist / zCurrentDist;

      return {
        ...state,
        vecterm: {
          ...state.vecterm,
          camera: {
            ...zCam,
            position: {
              x: zCam.target.x + zDir.x * zScale,
              y: zCam.target.y + zDir.y * zScale,
              z: zCam.target.z + zDir.z * zScale
            }
          }
        }
      };
    }

    case ActionTypes.CAMERA_RESET:
      return {
        ...state,
        vecterm: {
          ...state.vecterm,
          camera: {
            ...state.vecterm.camera,
            position: initialState.vecterm.camera.position,
            target: initialState.vecterm.camera.target,
            fov: initialState.vecterm.camera.fov
          }
        }
      };

    case ActionTypes.GRID_TOGGLE: {
      const currentType = state.vecterm.grid.activeType;
      // Cycle through grid types: none -> character -> square -> none
      const nextType = currentType === 'none' ? 'character'
                     : currentType === 'character' ? 'square'
                     : 'none';

      return {
        ...state,
        vecterm: {
          ...state.vecterm,
          grid: {
            ...state.vecterm.grid,
            activeType: nextType,
            [nextType]: nextType !== 'none' ? {
              ...state.vecterm.grid[nextType],
              enabled: true,
              visible: true
            } : state.vecterm.grid[nextType]
          }
        }
      };
    }

    // Player Input (for game mode - no state change needed, handled by game)
    case ActionTypes.PLAYER_INPUT:
    case ActionTypes.GAMEPAD_INPUT:
    case ActionTypes.GAMEPAD_ANALOG_MOVEMENT:
    case ActionTypes.GAMEPAD_ANALOG_AIM:
      // These actions are handled by the game instance, not Redux state
      // They're dispatched for middleware/game systems to listen to
      return state;

    // Network actions
    case 'NETWORK_CONNECTED':
      return {
        ...state,
        network: {
          ...state.network,
          connected: true,
          playerId: action.payload.playerId,
          playerName: action.payload.playerName
        }
      };

    case 'NETWORK_DISCONNECTED':
      return {
        ...state,
        network: {
          ...state.network,
          connected: false,
          currentLobby: null
        }
      };

    case 'NETWORK_LOBBY_LIST':
      return {
        ...state,
        network: {
          ...state.network,
          lobbies: action.payload
        }
      };

    case 'NETWORK_LOBBY_CREATED':
    case 'NETWORK_LOBBY_JOINED':
      return {
        ...state,
        network: {
          ...state.network,
          currentLobby: action.payload
        }
      };

    case 'NETWORK_LOBBY_LEFT':
      return {
        ...state,
        network: {
          ...state.network,
          currentLobby: null
        }
      };

    case 'NETWORK_PLAYER_JOINED':
    case 'NETWORK_PLAYER_LEFT':
    case 'NETWORK_PLAYER_DISCONNECTED':
      return {
        ...state,
        network: {
          ...state.network,
          currentLobby: action.payload.lobby
        }
      };

    case 'NETWORK_GAME_STARTED':
      return {
        ...state,
        network: {
          ...state.network,
          currentLobby: action.payload.lobby
        }
      };

    case 'NETWORK_PLAYER_INPUT':
      // Store remote player inputs for game logic to consume
      return {
        ...state,
        network: {
          ...state.network,
          players: {
            ...state.network.players,
            [action.payload.playerId]: {
              ...state.network.players[action.payload.playerId],
              input: action.payload.input,
              lastUpdate: Date.now()
            }
          }
        }
      };

    // Audio Engine actions
    case ActionTypes.AUDIO_INIT:
      return {
        ...state,
        audio: {
          ...state.audio,
          initialized: true
        }
      };

    case ActionTypes.AUDIO_DISPOSE:
      return {
        ...state,
        audio: {
          ...initialState.audio,
          initialized: false
        }
      };

    case ActionTypes.AUDIO_PLAY_PATTERN:
      const patternId = `${action.payload.channel}_${Date.now()}`;
      return {
        ...state,
        audio: {
          ...state.audio,
          patterns: {
            ...state.audio.patterns,
            [patternId]: {
              id: patternId,
              channel: action.payload.channel,
              pattern: action.payload.pattern,
              params: action.payload.params,
              playing: true
            }
          }
        }
      };

    case ActionTypes.AUDIO_STOP_PATTERN: {
      const { [action.payload]: removedPattern, ...remainingPatterns } = state.audio.patterns;
      return {
        ...state,
        audio: {
          ...state.audio,
          patterns: remainingPatterns
        }
      };
    }

    case ActionTypes.AUDIO_STOP_ALL:
      return {
        ...state,
        audio: {
          ...state.audio,
          patterns: {},
          playing: false
        }
      };

    case ActionTypes.AUDIO_STOP_CHANNEL:
      const channelPatterns = Object.fromEntries(
        Object.entries(state.audio.patterns)
          .filter(([id, p]) => p.channel !== action.payload)
      );
      return {
        ...state,
        audio: {
          ...state.audio,
          patterns: channelPatterns
        }
      };

    case ActionTypes.AUDIO_SET_BPM:
      return {
        ...state,
        audio: {
          ...state.audio,
          bpm: action.payload
        }
      };

    case ActionTypes.AUDIO_SET_MASTER_VOLUME:
      return {
        ...state,
        audio: {
          ...state.audio,
          masterVolume: action.payload
        }
      };

    case ActionTypes.AUDIO_SET_CHANNEL_VOLUME:
      return {
        ...state,
        audio: {
          ...state.audio,
          channels: {
            ...state.audio.channels,
            [action.payload.channel]: {
              ...state.audio.channels[action.payload.channel],
              volume: action.payload.volume
            }
          }
        }
      };

    case ActionTypes.AUDIO_SET_CHANNEL_MUTE:
      return {
        ...state,
        audio: {
          ...state.audio,
          channels: {
            ...state.audio.channels,
            [action.payload.channel]: {
              ...state.audio.channels[action.payload.channel],
              muted: action.payload.muted
            }
          }
        }
      };

    case ActionTypes.AUDIO_SET_CONFIG:
      return {
        ...state,
        audio: {
          ...state.audio,
          config: {
            ...state.audio.config,
            ...action.payload
          }
        }
      };

    case ActionTypes.AUDIO_CLOCK_START:
      return {
        ...state,
        audio: {
          ...state.audio,
          playing: true
        }
      };

    case ActionTypes.AUDIO_CLOCK_STOP:
      return {
        ...state,
        audio: {
          ...state.audio,
          playing: false
        }
      };

    case ActionTypes.AUDIO_CLOCK_PAUSE:
      return {
        ...state,
        audio: {
          ...state.audio,
          playing: false
        }
      };

    case ActionTypes.AUDIO_CLOCK_RESUME:
      return {
        ...state,
        audio: {
          ...state.audio,
          playing: true
        }
      };

    case ActionTypes.AUDIO_LOAD_PRESET:
      return {
        ...state,
        audio: {
          ...state.audio,
          ...state.audio.presets[action.payload]
        }
      };

    // MIDI Controller actions - delegate to midiReducer
    case MIDI_ACTIONS.MIDI_DEVICES_DETECTED:
    case MIDI_ACTIONS.MIDI_DEVICE_CONNECTED:
    case MIDI_ACTIONS.MIDI_DEVICE_DISCONNECTED:
    case MIDI_ACTIONS.MIDI_DEVICE_SELECT:
    case MIDI_ACTIONS.MIDI_VISUAL_TOGGLE:
    case MIDI_ACTIONS.MIDI_VISUAL_MOVE:
    case MIDI_ACTIONS.MIDI_VISUAL_RESIZE:
    case MIDI_ACTIONS.MIDI_CONTROL_CHANGE:
    case MIDI_ACTIONS.MIDI_BUTTON_PRESS:
    case MIDI_ACTIONS.MIDI_BUTTON_RELEASE:
    case MIDI_ACTIONS.MIDI_MAP_CONTROL:
    case MIDI_ACTIONS.MIDI_UNMAP_CONTROL:
    case MIDI_ACTIONS.MIDI_RESET_MAPPINGS:
    case MIDI_ACTIONS.MIDI_LEARN_START:
    case MIDI_ACTIONS.MIDI_LEARN_COMPLETE:
    case MIDI_ACTIONS.MIDI_LEARN_CANCEL:
    case MIDI_ACTIONS.MIDI_TRANSPORT_PLAY:
    case MIDI_ACTIONS.MIDI_TRANSPORT_STOP:
    case MIDI_ACTIONS.MIDI_TRANSPORT_RECORD:
    case MIDI_ACTIONS.MIDI_TRANSPORT_TEMPO:
      return {
        ...state,
        midi: midiReducer(state.midi, action)
      };

    // VScope Actions
    case 'VSCOPE_ENABLE':
    case 'VSCOPE_DISABLE':
    case 'VSCOPE_SET_CONTEXT':
    case 'VSCOPE_SET_ACTIVE_CAMERA':
    case 'VSCOPE_UPDATE_CAMERA':
    case 'VSCOPE_RESET_CAMERA':
    case 'VSCOPE_TRACK_ENTITY':
    case 'VSCOPE_TRACK_ENTITIES':
    case 'VSCOPE_TRACK_REGION':
    case 'VSCOPE_RESET_TRACKING':
    case 'VSCOPE_UPDATE_TRACKING':
    case 'VSCOPE_SET_FIELD_MODE':
    case 'VSCOPE_UPDATE_FIELD_REGION':
    case 'VSCOPE_UPDATE_EFFECT':
    case 'VSCOPE_SET_QUADRANT':
    case 'VSCOPE_SET_UPDATE_RATE':
    case 'VSCOPE_SET_PROJECTION_ALGORITHM':
    case 'VSCOPE_SET_PROJECTION_FLATTEN':
    case 'VSCOPE_TOGGLE_BORDER_BOX':
    case 'VSCOPE_TOGGLE_CONNECTION_LINES':
    case 'VSCOPE_SET_PIXEL_GRID_RESOLUTION':
      return {
        ...state,
        vscope: vscopeReducer(state.vscope, action)
      };

    // View Mode actions
    case ActionTypes.SET_VIEW_MODE:
      return {
        ...state,
        viewMode: action.payload  // '2d' | '3d'
      };

    case ActionTypes.TOGGLE_VIEW_MODE:
      return {
        ...state,
        viewMode: state.viewMode === '2d' ? '3d' : '2d'
      };

    // Parameter Connection actions
    case ActionTypes.CONNECT_PARAMETER: {
      const { connectionId, entityId, parameter, connectionType, connectionData } = action.payload;
      const existingConnection = state.parameterConnections[connectionId] || {
        entityId,
        parameter
      };

      return {
        ...state,
        parameterConnections: {
          ...state.parameterConnections,
          [connectionId]: {
            ...existingConnection,
            [connectionType]: connectionData
          }
        }
      };
    }

    case ActionTypes.DISCONNECT_PARAMETER: {
      const { connectionId, connectionType } = action.payload;

      if (!state.parameterConnections[connectionId]) return state;

      if (connectionType) {
        // Disconnect specific type (cliSlider, quickMenu, or midiCC)
        const { [connectionType]: removed, ...remainingConnection } = state.parameterConnections[connectionId];

        // If no connections remain, remove the entire entry
        const hasConnections = Object.keys(remainingConnection).some(
          key => key !== 'entityId' && key !== 'parameter' && remainingConnection[key]
        );

        if (!hasConnections) {
          const { [connectionId]: removedEntry, ...remainingConnections } = state.parameterConnections;
          return {
            ...state,
            parameterConnections: remainingConnections
          };
        }

        return {
          ...state,
          parameterConnections: {
            ...state.parameterConnections,
            [connectionId]: remainingConnection
          }
        };
      } else {
        // Remove entire connection
        const { [connectionId]: removed, ...remainingConnections } = state.parameterConnections;
        return {
          ...state,
          parameterConnections: remainingConnections
        };
      }
    }

    case ActionTypes.UPDATE_PARAMETER_CONNECTION: {
      const { connectionId, updates } = action.payload;

      if (!state.parameterConnections[connectionId]) return state;

      return {
        ...state,
        parameterConnections: {
          ...state.parameterConnections,
          [connectionId]: {
            ...state.parameterConnections[connectionId],
            ...updates
          }
        }
      };
    }

    default:
      return state;
  }
}
