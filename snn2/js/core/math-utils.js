/**
 * math-utils.js
 * Re-exports from /shared/math.js — single source of truth for math primitives.
 */
export {
  gaussianRandom,
  choleskyDecomposition,
  matrixPower,
  frobeniusNorm,
  determinant4x4,
  sigmoid,
  softmax,
  argmax
} from '/shared/math.js';
