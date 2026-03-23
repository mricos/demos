// Shared application state
const $ = id => document.getElementById(id);

const state = {
  nn: null,
  signal: null,
  signalMeta: null,
  lossHistory: [],
  accHistory: [],
  networkSnapshots: [],
  experiments: [],
  selectedExperiments: [],
  trainingState: 'idle',  // 'idle' | 'running' | 'paused'
  targetEpochs: 0,
  currentEpoch: 0,
  playInterval: null,
  networkStale: false,
  batches: [],
  currentBatchIdx: 0,
  smoothedLoss: null,
  probes: null,
  probeHistory: [],
  kDistTracker: [],
  testResults: [],
  filteredTests: [],
  currentTestIdx: 0,
  sidebarExpIdx: null,
  autoStopState: { smoothedLoss: null, prevSmoothed: null, plateauCount: 0 },
  appState: { tab: 'signal', training: false, epoch: 0, totalEpochs: 0, loss: 0, currentK: 0, autoStopped: false, probeResults: null, mode: 'fft-simulator' }
};

export { $, state };
