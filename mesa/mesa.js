/**
 * mesa.js — Mesa UI framework for interactive scientific demos
 *
 * Barrel export + auto-registration of components.
 *
 * Usage:
 *   <link rel="stylesheet" href="../mesa/mesa.css">
 *   <script type="module">
 *     import { state, bus } from '../mesa/mesa.js';
 *     import { setupCanvas, coords, drawLine, drawGrid, COLORS } from '../mesa/mesa.js';
 *
 *     state.set('model.degree', 3);
 *     state.on('model.*', () => redraw());
 *   </script>
 */

// Re-export state management
export { Bus, Store, bus, state } from './state.js';

// Re-export visualization
export {
  COLORS, PALETTE, EEG_BAND_COLORS, STATE_COLORS,
  setupCanvas, watchResize,
  coords, drawGrid, drawLine, drawFn, drawDots, drawBars,
  drawVLine, drawHLine, drawAnnotation, drawBands,
  drawSpectrogram,
} from './viz.js';

// Register components
import { registerComponents } from './components.js';
registerComponents();
