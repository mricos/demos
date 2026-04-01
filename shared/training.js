/**
 * shared/training.js — Training loop orchestration for neural networks
 *
 * Provides a createTrainer factory that unifies epoch-based (async) and
 * step-based (manual) training patterns. Uses EventBus for decoupled
 * progress reporting.
 *
 * Extracted from fftnn/js/train.js and snn2/js/snn/training.js patterns.
 *
 * Usage:
 *   import { createTrainer } from '/shared/training.js';
 *   import { createNetwork } from '/shared/nn.js';
 *
 *   const net = createNetwork([4, 16, 3]);
 *   const trainer = createTrainer(net, { batchSize: 32, lr: 0.01 });
 *   trainer.on('epoch', ({ epoch, loss }) => console.log(epoch, loss));
 *   await trainer.run(dataset);
 */

import { EventBus } from './eventbus.js';

/**
 * Shuffle an array in-place (Fisher-Yates)
 * @param {Array} arr
 * @returns {Array} The same array, shuffled
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Create a training loop manager
 * @param {Object} network - Network from createNetwork() with .train() or .forward()/.backward()
 * @param {Object} [config] - Training configuration
 * @param {number} [config.batchSize=32] - Mini-batch size
 * @param {number} [config.epochs=100] - Number of epochs for run()
 * @param {number} [config.lr=0.01] - Learning rate
 * @param {boolean} [config.shuffle=true] - Shuffle data each epoch
 * @param {number} [config.validationSplit=0] - Fraction of data for validation (0-1)
 * @param {Object} [config.earlyStop] - Early stopping config
 * @param {number} [config.earlyStop.patience=30] - Epochs without improvement before stopping
 * @param {number} [config.earlyStop.minDelta=0.00005] - Minimum improvement threshold
 * @param {number} [config.earlyStop.smoothing=0.1] - EMA smoothing factor for loss
 * @param {Function} [config.lossFn] - Custom loss function(predicted, target) → number
 * @param {Function} [config.accFn] - Custom accuracy function(predicted, target) → number (0-1)
 * @returns {Object} Trainer with step(), run(), stop(), on(), state
 */
export function createTrainer(network, config = {}) {
  const {
    batchSize = 32,
    epochs = 100,
    lr = 0.01,
    shuffle: doShuffle = true,
    validationSplit = 0,
    earlyStop = null,
    lossFn = null,
    accFn = null,
  } = config;

  const bus = EventBus();

  const state = {
    epoch: 0,
    step: 0,
    loss: null,
    valLoss: null,
    accuracy: null,
    running: false,
    autoStopped: false,
    lossHistory: [],
    accHistory: [],
  };

  // Early stopping state
  const es = earlyStop ? {
    patience: earlyStop.patience || 30,
    minDelta: earlyStop.minDelta || 0.00005,
    smoothing: earlyStop.smoothing || 0.1,
    smoothedLoss: null,
    prevSmoothed: null,
    plateauCount: 0,
  } : null;

  /**
   * Train one step on a batch of (input, target) pairs
   * @param {number[][]} inputs - Batch inputs
   * @param {number[][]} targets - Batch targets
   * @param {number} [stepLr] - Override learning rate for this step
   * @returns {{ loss: number }} Step result
   */
  function step(inputs, targets, stepLr) {
    const useLr = stepLr ?? lr;
    let loss;

    if (network.train) {
      loss = network.train(inputs, targets, useLr);
    } else {
      // Manual forward/backward
      loss = 0;
      for (let i = 0; i < inputs.length; i++) {
        const { acts, pres } = network.forward(inputs[i]);
        const out = acts[acts.length - 1];
        loss += lossFn ? lossFn(out, targets[i]) :
          out.reduce((s, o, j) => s + (o - targets[i][j]) ** 2, 0) / out.length;
        network.backward(acts, pres, targets[i], useLr);
      }
      loss /= inputs.length;
    }

    state.step++;
    state.loss = loss;
    bus.emit('step', { step: state.step, loss });
    return { loss };
  }

  /**
   * Run training for configured number of epochs
   * @param {Object} dataset - { inputs: number[][], targets: number[][] }
   * @param {Object} [runOpts] - Override config for this run
   * @param {number} [runOpts.epochs] - Override epoch count
   * @param {number} [runOpts.lr] - Override learning rate
   * @returns {Promise<Object>} Final state
   */
  async function run(dataset, runOpts = {}) {
    const runEpochs = runOpts.epochs ?? epochs;
    const runLr = runOpts.lr ?? lr;

    let trainInputs = dataset.inputs;
    let trainTargets = dataset.targets;
    let valInputs = null, valTargets = null;

    // Split validation set
    if (validationSplit > 0) {
      const splitIdx = Math.floor(trainInputs.length * (1 - validationSplit));
      valInputs = trainInputs.slice(splitIdx);
      valTargets = trainTargets.slice(splitIdx);
      trainInputs = trainInputs.slice(0, splitIdx);
      trainTargets = trainTargets.slice(0, splitIdx);
    }

    state.running = true;
    state.autoStopped = false;

    for (let e = 0; e < runEpochs && state.running; e++) {
      // Shuffle training data
      if (doShuffle) {
        const indices = Array.from({ length: trainInputs.length }, (_, i) => i);
        shuffle(indices);
        trainInputs = indices.map(i => trainInputs[i]);
        trainTargets = indices.map(i => trainTargets[i]);
      }

      // Train in mini-batches
      let epochLoss = 0;
      let batchCount = 0;
      for (let b = 0; b < trainInputs.length; b += batchSize) {
        const batchIn = trainInputs.slice(b, b + batchSize);
        const batchTgt = trainTargets.slice(b, b + batchSize);
        const { loss } = step(batchIn, batchTgt, runLr);
        epochLoss += loss;
        batchCount++;
      }
      epochLoss /= batchCount;

      // Compute accuracy if accFn provided
      let accuracy = null;
      if (accFn) {
        let correct = 0;
        for (let i = 0; i < trainInputs.length; i++) {
          correct += accFn(network.predict(trainInputs[i]), trainTargets[i]);
        }
        accuracy = correct / trainInputs.length;
      }

      // Validation loss
      let valLoss = null;
      if (valInputs) {
        valLoss = 0;
        for (let i = 0; i < valInputs.length; i++) {
          const pred = network.predict(valInputs[i]);
          valLoss += lossFn ? lossFn(pred, valTargets[i]) :
            pred.reduce((s, o, j) => s + (o - valTargets[i][j]) ** 2, 0) / pred.length;
        }
        valLoss /= valInputs.length;
      }

      state.epoch++;
      state.loss = epochLoss;
      state.valLoss = valLoss;
      state.accuracy = accuracy;
      state.lossHistory.push(epochLoss);
      if (accuracy !== null) state.accHistory.push(accuracy);

      bus.emit('epoch', {
        epoch: state.epoch,
        loss: epochLoss,
        valLoss,
        accuracy,
      });

      // Early stopping check
      if (es) {
        const checkLoss = valLoss ?? epochLoss;
        if (es.smoothedLoss === null) {
          es.smoothedLoss = checkLoss;
        } else {
          es.smoothedLoss = es.smoothing * checkLoss + (1 - es.smoothing) * es.smoothedLoss;
        }
        if (es.prevSmoothed !== null && state.epoch > 20) {
          const improvement = (es.prevSmoothed - es.smoothedLoss) / (es.prevSmoothed || 1);
          if (improvement < es.minDelta) es.plateauCount++;
          else es.plateauCount = 0;
          if (es.plateauCount >= es.patience) {
            state.autoStopped = true;
            break;
          }
        }
        es.prevSmoothed = es.smoothedLoss;
      }

      // Yield to renderer
      await new Promise(r => setTimeout(r, 0));
    }

    state.running = false;
    bus.emit('done', {
      reason: state.autoStopped ? 'early-stop' : 'complete',
      epoch: state.epoch,
      loss: state.loss,
      valLoss: state.valLoss,
      accuracy: state.accuracy,
    });

    return { ...state };
  }

  /** Stop the training loop */
  function stop() {
    state.running = false;
  }

  /** Reset trainer state (does not reset network weights) */
  function reset() {
    state.epoch = 0;
    state.step = 0;
    state.loss = null;
    state.valLoss = null;
    state.accuracy = null;
    state.running = false;
    state.autoStopped = false;
    state.lossHistory = [];
    state.accHistory = [];
    if (es) {
      es.smoothedLoss = null;
      es.prevSmoothed = null;
      es.plateauCount = 0;
    }
  }

  return {
    step,
    run,
    stop,
    reset,
    on: bus.on,
    off: bus.off,
    once: bus.once,
    state,
  };
}
