// Re-export from split plot modules — keeps existing imports working
export { COLORS, sizeCanvas, plot, plotMulti, plotEnsemble, plotHistogram } from './plot/plot-core.js';
export { plotHeatmap, plotConfusion, plotActivationHeatmap } from './plot/plot-heatmap.js';
export { plotNetwork, plotWeightWaveforms, plotProbeEvolution } from './plot/plot-network.js';
export { plotBandSNR, plotTestSignalActivations, plotClassOutput } from './plot/plot-stats.js';
