/**
 * nn.js — Neural network for fftnn demo
 *
 * Wraps shared/nn.js createNetwork() in a class-compatible API.
 * The NN class delegates to the shared network for all computation
 * while preserving the original interface (constructor, methods, properties).
 */
import { createNetwork } from '/shared/nn.js';
import { random } from './rng.js';

class NN {
  constructor(sizes, activation, outputActivation = 'linear') {
    this.sizes = sizes;
    this.activation = activation;
    this.outputActivation = outputActivation;

    // Create shared network using the project's seeded RNG
    const net = createNetwork(sizes, {
      activation,
      outputActivation,
      initMethod: 'xavier',
      rng: random,
    });
    this._net = net;
    this.layers = net.layers;
  }

  countParams() {
    return this._net.countParams();
  }

  clone() {
    const c = new NN(this.sizes, this.activation, this.outputActivation);
    this.layers.forEach((l, i) => {
      c.layers[i].W = l.W.map(r => [...r]);
      c.layers[i].b = [...l.b];
    });
    c._net.layers = c.layers;
    return c;
  }

  forward(input) {
    return this._net.forward(input);
  }

  forwardWithInput(rawInput, fftInput, mode) {
    let input;
    if (mode === 'hybrid') input = rawInput.concat(fftInput);
    else if (mode === 'fft-only') input = fftInput;
    else input = rawInput;
    return this.forward(input);
  }

  backward(acts, pres, target, lr) {
    this._net.backward(acts, pres, target, lr);
  }

  train(inputs, targets, lr) {
    return this._net.train(inputs, targets, lr);
  }

  predict(input) {
    return this._net.predict(input);
  }

  predictWithInput(rawInput, fftInput, mode) {
    const { acts } = this.forwardWithInput(rawInput, fftInput, mode);
    return acts[this.layers.length];
  }

  getActivations(input) {
    return this._net.getActivations(input);
  }
}

export { NN };
