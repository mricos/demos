// Neural Network class
import { random } from './rng.js';

class NN {
  constructor(sizes, activation, outputActivation = 'linear') {
    this.sizes = sizes;
    this.activation = activation;
    this.outputActivation = outputActivation;
    this.layers = [];
    for (let i = 0; i < sizes.length - 1; i++) {
      const [fanIn, fanOut] = [sizes[i], sizes[i+1]];
      const scale = Math.sqrt(2 / (fanIn + fanOut));
      const W = [], b = [];
      for (let j = 0; j < fanOut; j++) {
        W[j] = [];
        for (let k = 0; k < fanIn; k++) W[j][k] = (random() - 0.5) * 2 * scale;
        b[j] = 0;
      }
      this.layers.push({ W, b });
    }
  }

  countParams() {
    return this.layers.reduce((sum, l) => sum + l.W.length * l.W[0].length + l.b.length, 0);
  }

  clone() {
    const c = new NN(this.sizes, this.activation, this.outputActivation);
    this.layers.forEach((l, i) => {
      c.layers[i].W = l.W.map(r => [...r]);
      c.layers[i].b = [...l.b];
    });
    return c;
  }

  act(x) {
    if (this.activation === 'relu') return Math.max(0, x);
    if (this.activation === 'tanh') return Math.tanh(x);
    return x;
  }

  actDeriv(x) {
    if (this.activation === 'relu') return x > 0 ? 1 : 0;
    if (this.activation === 'tanh') { const t = Math.tanh(x); return 1 - t*t; }
    return 1;
  }

  applySigmoid(arr) {
    return arr.map(v => 1 / (1 + Math.exp(-v)));
  }

  applySoftmax(arr) {
    const max = Math.max(...arr);
    const exps = arr.map(v => Math.exp(v - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => e / sum);
  }

  applyOutputActivation(z) {
    if (this.outputActivation === 'sigmoid') return this.applySigmoid(z);
    if (this.outputActivation === 'softmax') return this.applySoftmax(z);
    return [...z]; // linear
  }

  forward(input) {
    const acts = [input.slice()], pres = [input.slice()];
    let a = input.slice();
    for (let l = 0; l < this.layers.length; l++) {
      const { W, b } = this.layers[l];
      const z = W.map((row, j) => row.reduce((s, w, k) => s + w * a[k], b[j]));
      pres.push([...z]);
      if (l === this.layers.length - 1) {
        a = this.applyOutputActivation(z);
      } else {
        a = z.map(v => this.act(v));
      }
      acts.push([...a]);
    }
    return { acts, pres };
  }

  // Forward with flexible input modes
  forwardWithInput(rawInput, fftInput, mode) {
    let input;
    if (mode === 'hybrid') {
      input = rawInput.concat(fftInput);
    } else if (mode === 'fft-only') {
      input = fftInput;
    } else {
      input = rawInput;
    }
    return this.forward(input);
  }

  backward(acts, pres, target, lr) {
    const L = this.layers.length;
    const deltas = [];

    // Output layer delta depends on output activation
    if (this.outputActivation === 'sigmoid') {
      deltas[L-1] = acts[L].map((o, i) => (o - target[i]) * o * (1 - o));
    } else if (this.outputActivation === 'softmax') {
      // For softmax + cross-entropy, gradient simplifies to (output - target)
      deltas[L-1] = acts[L].map((o, i) => o - target[i]);
    } else {
      deltas[L-1] = acts[L].map((o, i) => o - target[i]);
    }

    for (let l = L-2; l >= 0; l--) {
      const Wn = this.layers[l+1].W;
      deltas[l] = this.layers[l].W.map((_, j) => {
        const s = Wn.reduce((sum, row, k) => sum + row[j] * deltas[l+1][k], 0);
        return s * this.actDeriv(pres[l+1][j]);
      });
    }
    for (let l = 0; l < L; l++) {
      const { W, b } = this.layers[l];
      const a = acts[l], d = deltas[l];
      for (let j = 0; j < W.length; j++) {
        for (let k = 0; k < W[j].length; k++) {
          W[j][k] -= lr * Math.max(-1, Math.min(1, d[j] * a[k]));
        }
        b[j] -= lr * Math.max(-1, Math.min(1, d[j]));
      }
    }
  }

  train(inputs, targets, lr) {
    let loss = 0;
    for (let i = 0; i < inputs.length; i++) {
      const { acts, pres } = this.forward(inputs[i]);
      const out = acts[acts.length - 1];
      loss += out.reduce((s, o, j) => s + (o - targets[i][j])**2, 0) / out.length;
      this.backward(acts, pres, targets[i], lr);
    }
    return loss / inputs.length;
  }

  predict(input) {
    return this.forward(input).acts[this.layers.length];
  }

  predictWithInput(rawInput, fftInput, mode) {
    const { acts } = this.forwardWithInput(rawInput, fftInput, mode);
    return acts[this.layers.length];
  }

  getActivations(input) {
    const { acts } = this.forward(input);
    return acts.slice(1, -1); // hidden layer activations only
  }
}

export { NN };
