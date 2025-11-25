// Respond.js
const Respond = (() => {
  const observerStack = [];

  function responsive(initial) {
    const subs = new Map();
    return new Proxy(initial, {
      get(target, key) {
        const current = observerStack[observerStack.length - 1];
        if (current) {
          let dep = subs.get(key);
          if (!dep) {
            dep = new Set();
            subs.set(key, dep);
          }
          dep.add(current);
        }
        return target[key];
      },
      set(target, key, value) {
        if (target[key] === value) return true;
        target[key] = value;
        const dep = subs.get(key);
        if (dep) dep.forEach(fn => fn());
        return true;
      }
    });
  }

  function observe(fn) {
    const runner = () => {
      observerStack.push(runner);
      try {
        fn();
      } finally {
        observerStack.pop();
      }
    };
    runner();
    return runner;
  }

  function computed(fn) {
    const box = responsive({ value: undefined });
    observe(() => { box.value = fn(); });
    return box;
  }

  const bindingHandlers = {
    text(el, f) {
      observe(() => { el.textContent = f(); });
    },
    html(el, f) {
      observe(() => { el.innerHTML = f(); });
    },
    class(el, f) {
      observe(() => { el.className = f(); });
    },
    style(el, f) {
      observe(() => {
        const s = f();
        if (!s) {
          el.removeAttribute('style');
          return;
        }
        if (typeof s === 'string') {
          el.style.cssText = s;
          return;
        }
        for (const [k, v] of Object.entries(s)) el.style[k] = v;
      });
    },
    visible(el, f) {
      observe(() => { el.style.display = f() ? '' : 'none'; });
    },
    value(el, f) {
      observe(() => {
        const v = f();
        if (el.value !== v) el.value = v;
      });
    }
  };

  function bind(el, bindings) {
    for (const [key, val] of Object.entries(bindings)) {
      if (key.startsWith('on')) {
        el.addEventListener(key.slice(2).toLowerCase(), val);
        continue;
      }
      const f = typeof val === 'function' ? val : () => val;
      const handler = bindingHandlers[key];
      if (handler) {
        handler(el, f);
      } else {
        observe(() => { el[key] = f(); });
      }
    }
    return el;
  }

  function el(tag, bindings = {}, children = []) {
    const node = document.createElement(tag);
    bind(node, bindings);
    for (const child of children) {
      node.append(child instanceof Node ? child : document.createTextNode(child));
    }
    return node;
  }

  function mount(root, container) {
    const target = typeof container === 'string'
      ? document.querySelector(container)
      : container;
    target.appendChild(typeof root === 'function' ? root() : root);
  }

  return { responsive, observe, computed, bind, el, mount };
})();

Object.assign(window, Respond);

// Trace.js
const Trace = (() => {
  const clone = obj => JSON.parse(JSON.stringify(obj));

  function createStore(reducer, initialState) {
    const state = Respond.responsive({ ...initialState });
    const history = [clone(initialState)];
    let historyIndex = 0;

    function dispatch(action) {
      const changes = reducer(state, action);
      if (changes && typeof changes === 'object') {
        Object.assign(state, changes);
        history.splice(historyIndex + 1);
        history.push(clone(state));
        historyIndex = history.length - 1;
      }
      return state;
    }

    function undo() {
      if (historyIndex === 0) return;
      historyIndex -= 1;
      Object.assign(state, clone(history[historyIndex]));
    }

    function redo() {
      if (historyIndex >= history.length - 1) return;
      historyIndex += 1;
      Object.assign(state, clone(history[historyIndex]));
    }

    function getHistory() {
      return history;
    }

    return { state, dispatch, undo, redo, getHistory };
  }

  return { createStore };
})();

// html() helper for template snippets
function html(strings, ...values) {
  const tpl = document.createElement('template');
  let raw = '';
  for (let i = 0; i < strings.length; i++) {
    raw += strings[i];
    if (i < values.length) raw += values[i];
  }
  tpl.innerHTML = raw.trim();
  return tpl.content.firstElementChild;
}

// Diffusion demo + UI
const { observe, bind, el, mount } = Respond;

// Small UI helpers
function Card(title, children = []) {
  const card = el('div', { class: 'card' }, []);
  if (title) {
    card.appendChild(el('h2', {}, [title]));
  }
  children.forEach(child => card.appendChild(child));
  return card;
}

function EquationBlock(labelText, equationHtml) {
  const eq = el('div', { class: 'equation' }, []);
  if (labelText) {
    const label = el('span', {
      style: 'color: var(--color-text-muted); display:block; margin-bottom: var(--space-2)'
    }, [labelText]);
    eq.appendChild(label);
  }
  const expr = el('span', {});
  expr.innerHTML = equationHtml;
  eq.appendChild(expr);
  return eq;
}

function Step(index, color, title, desc) {
  const num = el('div', { class: `step-num ${color}` }, [String(index + 1)]);
  const titleP = el('p', {}, [title]);
  const descP = el('p', {}, [desc]);
  const textBox = el('div', {}, [titleP, descP]);
  return el('div', { class: 'step' }, [num, textBox]);
}

// Diffusion constants
const T = 100;

const getAlphaBar = t => {
  const s = 0.008;
  const f_t = Math.cos(((t / T + s) / (1 + s)) * Math.PI / 2) ** 2;
  const f_0 = Math.cos((s / (1 + s)) * Math.PI / 2) ** 2;
  return f_t / f_0;
};

const sqrtAB = t => Math.sqrt(getAlphaBar(t));
const sqrtOMab = t => Math.sqrt(1 - getAlphaBar(t));

const seededRandom = seed => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const originalPoints = Array.from({ length: 200 }, (_, i) => {
  const cluster = i % 2;
  const cx = cluster === 0 ? 0.3 : 0.7;
  const cy = cluster === 0 ? 0.3 : 0.7;
  return {
    x: cx + (seededRandom(i * 4 + 1) - 0.5) * 0.15,
    y: cy + (seededRandom(i * 4 + 2) - 0.5) * 0.15
  };
});

// Store
const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_TAB':
      return { tab: action.payload };
    case 'SET_TIMESTEP':
      return { timestep: action.payload };
    case 'START_GENERATION':
      return { isGenerating: true, genStep: 0 };
    case 'GENERATION_TICK':
      return { genStep: Math.min(state.genStep + 2, T) };
    case 'STOP_GENERATION':
      return { isGenerating: false };
    default:
      return null;
  }
};

const store = Trace.createStore(reducer, {
  tab: 'forward',
  timestep: 50,
  genStep: 0,
  isGenerating: false
});

const { state, dispatch } = store;

const actions = {
  setTab: tab => dispatch({ type: 'SET_TAB', payload: tab }),
  setTimestep: t => dispatch({ type: 'SET_TIMESTEP', payload: t }),
  startGeneration: () => dispatch({ type: 'START_GENERATION' }),
  tick: () => dispatch({ type: 'GENERATION_TICK' }),
  stopGeneration: () => dispatch({ type: 'STOP_GENERATION' })
};

// Canvas renderers
function drawForward(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  observe(() => {
    const t = state.timestep;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    const sab = sqrtAB(t);
    const somab = sqrtOMab(t);

    ctx.globalAlpha = 0.6;
    originalPoints.forEach((p, i) => {
      const u1 = seededRandom(i * 2 + 1);
      const u2 = seededRandom(i * 2 + 2);
      const r = Math.sqrt(-2 * Math.log(u1)) * 0.15;
      const nx = r * Math.cos(2 * Math.PI * u2);
      const ny = r * Math.sin(2 * Math.PI * u2);

      const x_t = sab * p.x + somab * nx + 0.5 * (1 - sab);
      const y_t = sab * p.y + somab * ny + 0.5 * (1 - sab);

      ctx.fillStyle = 'rgba(74,158,255,0.2)';
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(x_t * w, y_t * h, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`t = ${t}`, 10, 25);
    ctx.fillText(`√ᾱₜ = ${sab.toFixed(3)}`, 10, 45);
    ctx.fillText(`√(1-ᾱₜ) = ${somab.toFixed(3)}`, 10, 65);
  });
}

function drawGeneration(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  observe(() => {
    const step = state.genStep;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    const progress = 1 - Math.pow(1 - step / T, 2);

    ctx.globalAlpha = 0.7;
    for (let i = 0; i < 200; i++) {
      const cluster = i < 100 ? 0 : 1;
      const tx = cluster === 0 ? 0.3 : 0.7;
      const ty = cluster === 0 ? 0.3 : 0.7;

      const u1 = seededRandom(i * 2 + 1);
      const u2 = seededRandom(i * 2 + 2);
      const r = Math.sqrt(-2 * Math.log(u1)) * 0.2;
      const nx = 0.5 + r * Math.cos(2 * Math.PI * u2);
      const ny = 0.5 + r * Math.sin(2 * Math.PI * u2);

      const cn = seededRandom(i * 3) * 0.15 - 0.075;
      const x = nx * (1 - progress) + (tx + cn) * progress;
      const y = ny * (1 - progress) + (ty + cn) * progress;

      ctx.fillStyle = `hsl(${200 + step * 1.5}, 70%, 60%)`;
      ctx.beginPath();
      ctx.arc(x * w, y * h, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`Denoising step: ${step}/${T}`, 10, 25);
    ctx.fillText(`t: ${T - step} → ${Math.max(0, T - step - 1)}`, 10, 45);
  });
}

function drawSchedule(svg) {
  let path1 = 'M 40 30';
  let path2 = 'M 40 130';
  for (let i = 0; i <= 100; i++) {
    const x = 40 + (i / 100) * 340;
    path1 += ` L ${x} ${130 - sqrtAB(i) * 100}`;
    path2 += ` L ${x} ${130 - sqrtOMab(i) * 100}`;
  }
  svg.innerHTML = `
    <line x1="40" y1="130" x2="380" y2="130" stroke="#444"/>
    <line x1="40" y1="20" x2="40" y2="130" stroke="#444"/>
    <path d="${path1}" fill="none" stroke="#4ade80" stroke-width="2"/>
    <path d="${path2}" fill="none" stroke="#f87171" stroke-width="2"/>
    <text x="200" y="145" fill="#888" font-size="10" text-anchor="middle">timestep t</text>
    <text x="340" y="50" fill="#4ade80" font-size="10">√ᾱₜ (signal)</text>
    <text x="340" y="115" fill="#f87171" font-size="10">√(1-ᾱₜ) (noise)</text>
  `;
}

// Generation animation
let genInterval = null;

observe(() => {
  if (state.isGenerating && !genInterval) {
    genInterval = setInterval(() => {
      if (state.genStep >= T) {
        clearInterval(genInterval);
        genInterval = null;
        actions.stopGeneration();
      } else {
        actions.tick();
      }
    }, 50);
  }
  if (!state.isGenerating && genInterval && state.genStep >= T) {
    clearInterval(genInterval);
    genInterval = null;
  }
});

// Tabs
const TabButton = (name, label) =>
  bind(el('button', {}, [label]), {
    class: () => 'tab-btn' + (state.tab === name ? ' active' : ''),
    onClick: () => actions.setTab(name)
  });

const ForwardTab = () => {
  const eqHtml = `
    <span class="blue">x</span><sub class="yellow">t</sub> =
    <span class="green">√ᾱ</span><sub class="yellow">t</sub> ·
    <span class="blue">x</span><sub>0</sub> +
    <span class="red">√(1-ᾱ</span><sub class="yellow">t</sub><span class="red">)</span> ·
    <span class="red">ε</span>
  `;

  const eqBlock = EquationBlock(null, eqHtml);

  const legend = html`
    <div class="legend">
      <div class="legend-item blue-bg">
        <span class="blue"><b>x₀</b></span>: Original clean data
      </div>
      <div class="legend-item yellow-bg">
        <span class="yellow"><b>t</b></span>: Timestep (0 to T)
      </div>
      <div class="legend-item green-bg">
        <span class="green"><b>√ᾱₜ</b></span>: Signal scaling (decreases)
      </div>
      <div class="legend-item red-bg">
        <span class="red"><b>ε</b></span>: Gaussian noise ~ N(0, I)
      </div>
    </div>
  `;

  const keyP = el('p', { style: 'color: var(--color-text-muted)' }, []);
  keyP.appendChild(el('b', {}, ['Key insight: ']));
  keyP.appendChild(
    document.createTextNode('At any timestep t, we can jump directly from x₀ to xₜ using this linear equation.')
  );

  const card1 = Card('The Forward Process as a Linear Transformation', [
    eqBlock,
    legend,
    keyP
  ]);

  const card2 = html`
    <div class="card">
      <h3 style="margin-bottom: var(--space-4)">Interactive Visualization</h3>
      <p class="info" style="margin-bottom: var(--space-4)">
        Blue (faded) = original, Red = noised
      </p>
      <canvas class="forward-canvas" width="500" height="300"></canvas>
      <div class="slider-row">
        <span>t = 0</span>
        <input class="forward-slider" type="range" min="0" max="100" />
        <span>t = 100</span>
      </div>
      <p class="info forward-info"></p>
    </div>
  `;

  const canvas = card2.querySelector('.forward-canvas');
  const slider = card2.querySelector('.forward-slider');
  const info = card2.querySelector('.forward-info');

  bind(slider, {
    value: () => state.timestep,
    onInput: e => actions.setTimestep(+e.target.value)
  });

  bind(info, {
    text: () => {
      const t = state.timestep;
      const sig = (sqrtAB(t) * 100).toFixed(1);
      const noise = (sqrtOMab(t) * 100).toFixed(1);
      return `At t=${t}: Signal is ${sig}% preserved, Noise is ${noise}% magnitude`;
    }
  });

  drawForward(canvas);

  return el('div', {}, [card1, card2]);
};

const MathTab = () => {
  const root = html`
    <div>
      <div class="card">
        <h2>State Space Representation</h2>
        <div class="math-box blue-bg">
          <p class="label blue">State Equation (Forward):</p>
          <p>xₜ = Aₜ x₀ + Bₜ ε</p>
          <p class="hint">where Aₜ = √ᾱₜ I, Bₜ = √(1-ᾱₜ) I</p>
        </div>
        <div class="math-box green-bg">
          <p class="label green">Markov Form:</p>
          <p>xₜ = √αₜ xₜ₋₁ + √(1-αₜ) εₜ</p>
          <p class="hint">Single step transition (αₜ is per-step, ᾱₜ is cumulative)</p>
        </div>
        <div class="math-box purple-bg">
          <p class="label purple">Noise Schedule (Cosine):</p>
          <p>ᾱₜ = f(t)/f(0), where f(t) = cos²((t/T + s)/(1+s) · π/2)</p>
        </div>
        <div style="background: var(--color-surface-alt); border-radius: var(--radius-md); padding: var(--space-4)">
          <h4 class="yellow" style="margin-bottom: var(--space-2)">Why State Space?</h4>
          <ul style="color:#d1d5db;font-size:var(--text-sm);list-style:none">
            <li>• Linear: Forward process is matrix multiplication + noise</li>
            <li>• Closed form: Jump to any timestep without iteration</li>
            <li>• Tractable: q(xₜ|x₀) is Gaussian with known mean/variance</li>
            <li>• Efficient: Sample random t, compute loss directly</li>
          </ul>
        </div>
      </div>
      <div class="card">
        <h3 style="margin-bottom: var(--space-4)">Coefficient Schedule</h3>
        <div class="chart">
          <svg class="schedule-svg" viewBox="0 0 400 150" style="width:100%;height:100%"></svg>
        </div>
        <p class="info">Signal decreases, noise increases over time</p>
      </div>
    </div>
  `;

  const svg = root.querySelector('.schedule-svg');
  drawSchedule(svg);

  return root;
};

const trainingSteps = [
  ['blue',   'Sample training data', 'Get x₀ from your dataset'],
  ['blue',   'Sample random timestep t ~ Uniform(1, T)', 'Train on all noise levels'],
  ['blue',   'Sample noise ε ~ N(0, I)', 'Ground truth to predict'],
  ['green',  'Compute xₜ = √ᾱₜ x₀ + √(1-ᾱₜ) ε', 'State space equation - no iteration'],
  ['purple', 'Predict noise ε̂ = εθ(xₜ, t)', 'Neural net takes noisy input + timestep'],
  ['red',    'Compute loss ‖ε - ε̂‖²', 'Simple MSE']
];

const TrainingTab = () => {
  const eq = EquationBlock(
    'Loss function:',
    'L = E<sub>t,x₀,ε</sub>[ ‖ε - ε<sub>θ</sub>(xₜ, t)‖² ]'
  );

  const card = Card('Training: Learn to Predict the Noise', [eq]);

  trainingSteps.forEach(([color, title, desc], idx) => {
    card.appendChild(Step(idx, color, title, desc));
  });

  const insight = html`
    <div class="insight">
      <h3>Key Insight</h3>
      <p style="color:#d1d5db">
        The <b>linear state space</b> lets us:
      </p>
      <ul style="color:#d1d5db;margin-top:var(--space-2);list-style:none">
        <li>• Jump to any noise level in one step</li>
        <li>• Train on random timesteps (not sequential)</li>
        <li>• Use one network for all noise levels</li>
      </ul>
    </div>
  `;

  return el('div', {}, [card, insight]);
};

const GenerateTab = () => {
  const eq = EquationBlock(
    'Reverse sampling:',
    `
    x<sub>t-1</sub> =
    (1/√α<sub>t</sub>)(x<sub>t</sub> -
    β<sub>t</sub>/√(1-ᾱ<sub>t</sub>) ε<sub>θ</sub>) +
    σ<sub>t</sub> z
    `
  );

  const genCard = Card('Generation: Reverse the Process', [eq]);

  const canvasSlot = el('div', { class: 'generate-canvas-slot' }, []);
  const btnSlot = el('div', { class: 'generate-button-slot' }, []);
  genCard.appendChild(canvasSlot);
  genCard.appendChild(btnSlot);

  const algoBlock = html`
    <div class="grid-2">
      <div class="card">
        <h3 style="margin-bottom:var(--space-2)">Algorithm</h3>
        <ol style="font-size:var(--text-sm);color:#d1d5db;padding-left:20px;line-height:1.8">
          <li>x<sub>T</sub> ~ N(0, I)</li>
          <li>For t = T → 1:</li>
          <li style="padding-left:16px">Predict ε<sub>θ</sub>(x<sub>t</sub>, t)</li>
          <li style="padding-left:16px">Compute x<sub>t-1</sub></li>
          <li>Return x<sub>0</sub></li>
        </ol>
      </div>
      <div class="card">
        <h3 style="margin-bottom:var(--space-2)">Why Iterative?</h3>
        <p style="font-size:var(--text-sm);color:#d1d5db">
          Forward is linear, but <b>reverse is nonlinear</b>.
          The neural network ε<sub>θ</sub> requires small steps
          to stay near the learned data manifold.
        </p>
      </div>
    </div>
  `;

  const canvas = el('canvas', { width: 500, height: 300 });
  const btn = el('button', { class: 'gen-btn' });

  bind(btn, {
    text: () =>
      state.isGenerating
        ? `Generating... ${state.genStep}/${T}`
        : 'Start Generation',
    disabled: () => state.isGenerating,
    onClick: () => actions.startGeneration()
  });

  drawGeneration(canvas);
  canvasSlot.appendChild(canvas);
  btnSlot.appendChild(btn);

  return el('div', {}, [genCard, algoBlock]);
};

const tabs = {
  forward: ForwardTab,
  math: MathTab,
  training: TrainingTab,
  generate: GenerateTab
};

function App() {
  const content = el('div');

  observe(() => {
    content.innerHTML = '';
    const view = tabs[state.tab];
    if (view) content.appendChild(view());
  });

  return el('div', {}, [
    el('div', { class: 'tabs' }, [
      TabButton('forward', '1. Forward'),
      TabButton('math', '2. Math'),
      TabButton('training', '3. Training'),
      TabButton('generate', '4. Generate')
    ]),
    content,
    el('p', { class: 'footer' }, ['Based on DDPM (Ho et al., 2020)'])
  ]);
}

document.addEventListener('DOMContentLoaded', () => {
  mount(App, '#app');
});
