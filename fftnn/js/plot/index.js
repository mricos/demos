// Barrel re-export — consumers keep importing from './plot.js'
export { COLORS, sizeCanvas, plot, plotMulti, plotEnsemble, plotHistogram } from './plot-core.js';
export { plotHeatmap, plotConfusion, plotActivationHeatmap } from './plot-heatmap.js';
export { plotNetwork, plotWeightWaveforms, plotProbeEvolution } from './plot-network.js';
export { plotBandSNR, plotTestSignalActivations, plotClassOutput } from './plot-stats.js';
