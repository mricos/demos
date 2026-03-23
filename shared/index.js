/**
 * shared/index.js — Barrel export for the shared module library
 *
 * Usage:
 *   import { EventBus, createCanvas, gaussianRandom } from '/shared/index.js';
 *
 * Or import individual modules for tree-shaking / clarity:
 *   import { EventBus } from '/shared/eventbus.js';
 *   import { createCanvas } from '/shared/canvas.js';
 *
 * Available modules:
 *   math.js           — RNG, linear algebra, activation fns, normalization
 *   synthetic-iris.js — Gaussian mixture dataset generator
 *   canvas.js         — DPI-aware canvas setup, resize, render loop
 *   eventbus.js       — on/off/emit/once event bus (optional cross-tab)
 *   databus.js        — Cross-demo data sharing (BroadcastChannel + localStorage)
 *   params.js         — URL search param ↔ state sync
 *   plot-axes.js      — SVG chart axis scaffolding
 *   math-renderer.js  — On-demand KaTeX loader
 *   dark-theme.css    — Shared CSS custom properties and reset
 *   dev.js            — Auto-reload during development (script tag, not ES module)
 *   help-panel.js     — Tabbed help web component
 *   info-sidebar.js   — Wikipedia search sidebar web component
 */

// Math & data
export {
  gaussianRandom, setSeed, seededRandom,
  choleskyDecomposition, matrixPower, frobeniusNorm, determinant4x4,
  zScoreNormalize, clamp, lerp, mapRange,
  sigmoid, softmax, argmax
} from './math.js';

export { generateIris, generateGMM } from './synthetic-iris.js';

// Canvas
export { createCanvas, resizeCanvas, canvasLoop, dpr } from './canvas.js';

// Events & communication
export { EventBus } from './eventbus.js';
export { DataBus } from './databus.js';

// State
export { Params } from './params.js';

// Math rendering (async — use import() or direct import)
export { loadKaTeX, renderMath, renderAllMath } from './math-renderer.js';
