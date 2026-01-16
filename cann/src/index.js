/**
 * CANN - Neural Cellular Automata Network
 *
 * A Vanilla JS module for neural network-inspired cellular automata
 * with competing loss functions and flexible state evolution dynamics.
 *
 * Core Concepts:
 * - NCA (Neural Cellular Automata): Transition rules as learnable neural networks
 * - Dual Loss: Local (neighborhood) + Global (population) objective functions
 * - Evolution Modes: Markovian (memoryless) vs SSM (state space with hidden state)
 * - Dimensional Abstraction: Hidden 2D ↔ 3D projection
 * - Scale Awareness: Resolution-relative computations
 */

export { Cann } from './core/Cann.js';
export { Grid } from './core/Grid.js';
export { Cell } from './core/Cell.js';
export { Evolver } from './core/Evolver.js';
export { Loss } from './core/Loss.js';
export { Perception } from './core/Perception.js';

// Evolution strategies
export { MarkovianEvolver } from './evolvers/MarkovianEvolver.js';
export { SSMEvolver } from './evolvers/SSMEvolver.js';

// Loss functions
export { LocalLoss } from './loss/LocalLoss.js';
export { GlobalLoss } from './loss/GlobalLoss.js';
export { CompositeLoss } from './loss/CompositeLoss.js';

// Renderers
export { CanvasRenderer } from './renderers/CanvasRenderer.js';
export { WebGLRenderer } from './renderers/WebGLRenderer.js';

// Presets
export { presets } from './presets/index.js';

// Version
export const VERSION = '0.1.0';
