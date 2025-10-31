/**
 * SIR Epidemic Model
 * Agent-based simulation using Cell-UI framework with Redux-lite
 */

(function() {
  'use strict';

  const DPR = window.devicePixelRatio || 1;

  // Seeded RNG - Mulberry32
  function mulberry32(a) {
    return function() {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t>>>15, t | 1);
      t ^= t + Math.imul(t ^ t>>>7, t | 61);
      return ((t ^ t>>>14) >>> 0) / 4294967296;
    };
  }

  // Helper functions
  function randIn(min, max, rng) { return min + (max - min) * rng(); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function shuffleInPlace(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (rng() * (i + 1)) | 0;
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
  }

  window.SIRApp = {
    // Canvas contexts
    fieldCtx: null,
    chartCtx: null,

    // Animation
    animationId: null,
    lastTime: 0,
    accumulator: 0,

    // Agents array
    agents: [],

    // Chart data
    chartData: { t: [], S: [], I: [], R: [] },

    // World state with RNG
    rng: mulberry32((Date.now()>>>0) ^ 0x9E3779B9),

    // Initialize the app
    init() {
      CUI.log('SIR App initializing...');

      // Setup canvases
      this.setupCanvases();

      // Define action types
      const Actions = {
        START: 'SIR/START',
        PAUSE: 'SIR/PAUSE',
        RESET: 'SIR/RESET',
        UPDATE_STATS: 'SIR/UPDATE_STATS',
        UPDATE_PARAMS: 'SIR/UPDATE_PARAMS',
        SET_AGENTS: 'SIR/SET_AGENTS'
      };

      // Initial state
      const initialState = {
        running: false,
        time: 0,
        stats: { S: 0, I: 0, R: 0, r0: 0 },
        params: {
          N: 400,
          i0: 5,
          speed: 90,
          radius: 8,
          p: 0.22,
          gamma: 0.02,
          noise: 0  // ±% variation on infectivity
        }
      };

      // Register reducer
      CUI.Redux.reducer('sir', (state = initialState, action) => {
        switch (action.type) {
          case Actions.START:
            return { ...state, running: true };

          case Actions.PAUSE:
            return { ...state, running: false };

          case Actions.RESET:
            return {
              ...initialState,
              params: state.params // Preserve params
            };

          case Actions.UPDATE_STATS:
            return {
              ...state,
              time: action.payload.time,
              stats: action.payload.stats
            };

          case Actions.UPDATE_PARAMS:
            return {
              ...state,
              params: { ...state.params, ...action.payload }
            };

          default:
            return state;
        }
      }, initialState);

      // Subscribe to state changes
      CUI.Redux.subscribe((state, prevState) => {
        const sir = state.sir;
        const prevSir = prevState.sir;

        // Update stats display
        if (sir.stats !== prevSir.stats) {
          this.updateStatsDisplay(sir.stats);
        }

        // Handle running state change
        if (sir.running !== prevSir.running) {
          if (sir.running) {
            this.startSimulation();
          } else {
            this.stopSimulation();
          }
        }

        // Handle reset
        if (sir.time < prevSir.time) {
          this.resetSimulation();
        }

        // Handle param changes (when not running)
        if (!sir.running && sir.params !== prevSir.params) {
          this.updateParamDisplays(sir.params);
        }
      });

      // Wire up UI
      this.setupUI();

      // Initialize with default state
      this.resetSimulation();
      this.Actions = Actions;

      CUI.log('SIR App ready');
    },

    setupCanvases() {
      const field = CUI.DOM.$('field');
      const chart = CUI.DOM.$('chart');

      field.width = 800 * DPR;
      field.height = 600 * DPR;
      field.style.width = '800px';
      field.style.height = '600px';

      chart.width = 800 * DPR;
      chart.height = 600 * DPR;
      chart.style.width = '800px';
      chart.style.height = '600px';

      this.fieldCtx = field.getContext('2d');
      this.chartCtx = chart.getContext('2d');
    },

    setupUI() {
      // FAB drawer
      CUI.FAB.create({
        id: 'fab',
        drawerId: 'drawer',
        closeOthers: true
      });

      // Buttons
      CUI.DOM.$('startBtn').addEventListener('click', () => {
        CUI.dispatch({ type: this.Actions.START });
      });

      CUI.DOM.$('pauseBtn').addEventListener('click', () => {
        CUI.dispatch({ type: this.Actions.PAUSE });
      });

      CUI.DOM.$('resetBtn').addEventListener('click', () => {
        // Reset with new random seed
        this.resetSimulation({ randomize: true });
        CUI.dispatch({ type: this.Actions.RESET });
      });

      CUI.DOM.$('closeDrawer').addEventListener('click', () => {
        CUI.FAB.close('fab');
      });

      // Parameter sliders
      ['N', 'i0', 'speed', 'radius', 'p', 'gamma', 'noise'].forEach(param => {
        const slider = CUI.DOM.$(param);
        const display = CUI.DOM.$(param + '_val');

        slider.addEventListener('input', (e) => {
          const value = parseFloat(e.target.value);
          display.textContent = param === 'p' ? value.toFixed(2) :
                               param === 'gamma' ? value.toFixed(3) :
                               param === 'noise' ? value + '%' :
                               value;

          const state = CUI.getState('sir');

          // Update Redux state
          CUI.dispatch({
            type: this.Actions.UPDATE_PARAMS,
            payload: { [param]: value }
          });

          // If running and N or i0 changed, adjust live
          if (state.running && (param === 'N' || param === 'i0')) {
            this.onParamChanged(param, value);
          }
        });
      });
    },

    resetSimulation(options = {}) {
      const state = CUI.getState('sir');
      const { N, i0, speed } = state.params;

      // Optionally reseed RNG
      if (options.randomize) {
        this.rng = mulberry32(((Math.random() * (2**31)) | 0) ^ (Date.now()>>>0));
      }

      // Create agents
      const W = 800, H = 600;
      this.agents = [];

      for (let i = 0; i < N; i++) {
        this.agents.push({
          x: randIn(8, W - 8, this.rng),
          y: randIn(8, H - 8, this.rng),
          vx: randIn(-1, 1, this.rng),
          vy: randIn(-1, 1, this.rng),
          state: i < i0 ? 'I' : 'S',
          tInfected: i < i0 ? 0 : -1
        });
      }

      // Reset chart data and timing
      this.chartData = { t: [], S: [], I: [], R: [] };
      this.lastTime = 0;
      this.accumulator = 0;

      // Update stats
      this.updateStats();
      this.render();
    },

    updateStats() {
      const S = this.agents.filter(a => a.state === 'S').length;
      const I = this.agents.filter(a => a.state === 'I').length;
      const R = this.agents.filter(a => a.state === 'R').length;

      const { N, speed, radius, p, gamma } = CUI.getState('sir').params;
      const A = 800 * 600;
      const rho = N / A;
      const k = 2 * radius * speed * rho;
      const r0 = (k * p) / Math.max(1e-6, gamma);

      CUI.dispatch({
        type: this.Actions.UPDATE_STATS,
        payload: {
          time: this.lastTime,
          stats: { S, I, R, r0 }
        }
      });
    },

    // Live parameter adjustment functions
    adjustPopulation(targetN) {
      const W = 800, H = 600;
      const curr = this.agents.length;
      const delta = targetN - curr;

      if (delta > 0) {
        // Add susceptible agents
        for (let i = 0; i < delta; i++) {
          this.agents.push({
            x: randIn(8, W - 8, this.rng),
            y: randIn(8, H - 8, this.rng),
            vx: randIn(-1, 1, this.rng),
            vy: randIn(-1, 1, this.rng),
            state: 'S',
            tInfected: -1
          });
        }
      } else if (delta < 0) {
        // Remove random agents (unbiased across S/I/R)
        const removeCount = -delta;
        for (let i = 0; i < removeCount; i++) {
          if (!this.agents.length) break;
          const idx = (this.agents.length * this.rng()) | 0;
          this.agents.splice(idx, 1);
        }
      }
    },

    adjustI0(targetI) {
      // Count current states
      const infectedIdx = [];
      const susceptibleIdx = [];
      const recoveredIdx = [];

      for (let i = 0; i < this.agents.length; i++) {
        const st = this.agents[i].state;
        if (st === 'I') infectedIdx.push(i);
        else if (st === 'S') susceptibleIdx.push(i);
        else recoveredIdx.push(i);
      }

      const I = infectedIdx.length;

      if (targetI > I) {
        // Need more infected - promote susceptibles first, then recovered
        let need = targetI - I;
        shuffleInPlace(susceptibleIdx, this.rng);
        shuffleInPlace(recoveredIdx, this.rng);

        for (let j = 0; j < susceptibleIdx.length && need > 0; j++, need--) {
          const a = this.agents[susceptibleIdx[j]];
          a.state = 'I';
          a.tInfected = this.lastTime;
        }

        for (let j = 0; j < recoveredIdx.length && need > 0; j++, need--) {
          const a = this.agents[recoveredIdx[j]];
          a.state = 'I';
          a.tInfected = this.lastTime;
        }
      } else if (targetI < I) {
        // Need fewer infected - demote to susceptible
        let need = I - targetI;
        shuffleInPlace(infectedIdx, this.rng);

        for (let j = 0; j < infectedIdx.length && need > 0; j++, need--) {
          const a = this.agents[infectedIdx[j]];
          a.state = 'S';
          a.tInfected = -1;
        }
      }
    },

    onParamChanged(param, newValue) {
      if (param === 'N') {
        this.adjustPopulation(newValue);
        // Ensure i0 doesn't exceed new N
        const state = CUI.getState('sir');
        if (state.params.i0 > newValue) {
          CUI.dispatch({
            type: this.Actions.UPDATE_PARAMS,
            payload: { i0: Math.min(state.params.i0, newValue) }
          });
        }
      } else if (param === 'i0') {
        this.adjustI0(newValue);
      }

      // Update stats to reflect changes
      this.updateStats();
    },

    updateStatsDisplay(stats) {
      CUI.DOM.$('sVal').textContent = stats.S;
      CUI.DOM.$('iVal').textContent = stats.I;
      CUI.DOM.$('rVal').textContent = stats.R;
      CUI.DOM.$('r0Val').textContent = stats.r0.toFixed(2);
    },

    updateParamDisplays(params) {
      Object.keys(params).forEach(key => {
        const slider = CUI.DOM.$(key);
        const display = CUI.DOM.$(key + '_val');
        if (slider && display) {
          slider.value = params[key];
          display.textContent = key === 'p' ? params[key].toFixed(2) :
                               key === 'gamma' ? params[key].toFixed(3) :
                               key === 'noise' ? params[key] + '%' :
                               params[key];
        }
      });
    },

    startSimulation() {
      if (this.animationId) return;

      const FIXED_DT = 1/60; // 60Hz substeps

      const step = (timestamp) => {
        const state = CUI.getState('sir');
        if (!state.running) {
          this.stopSimulation();
          return;
        }

        // Calculate frame time (cap at 50ms to prevent spiral of death)
        const frameDt = Math.min((timestamp - (this.lastFrameTime || timestamp)) / 1000, 0.05);
        this.lastFrameTime = timestamp;

        // Accumulate time for fixed-step physics
        this.accumulator += frameDt;

        // Process fixed timesteps
        while (this.accumulator > 1e-6) {
          const stepDt = Math.min(FIXED_DT, this.accumulator);
          this.updatePhysics(stepDt);
          this.lastTime += stepDt;
          this.accumulator -= stepDt;
        }

        // Update stats after physics steps
        this.updateStats();

        // Update chart data
        const { S, I, R } = state.sir.stats;
        this.chartData.t.push(this.lastTime);
        this.chartData.S.push(S);
        this.chartData.I.push(I);
        this.chartData.R.push(R);

        // Keep last 120 seconds
        while (this.chartData.t.length && (this.lastTime - this.chartData.t[0]) > 120) {
          this.chartData.t.shift();
          this.chartData.S.shift();
          this.chartData.I.shift();
          this.chartData.R.shift();
        }

        // Render
        this.render();

        this.animationId = requestAnimationFrame(step);
      };

      this.lastFrameTime = performance.now();
      this.animationId = requestAnimationFrame(step);
    },

    stopSimulation() {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    },

    updatePhysics(dt) {
      const { speed, radius, p, gamma, noise } = CUI.getState('sir').params;
      const W = 800, H = 600;
      const r2 = radius * radius;

      // Calculate infection probability with noise
      const noiseFrac = noise / 100;
      const pStep = clamp(p * (1 + (this.rng() * 2 - 1) * noiseFrac), 0, 1);

      // Move agents (random walk with angle jitter)
      for (const a of this.agents) {
        const theta = Math.atan2(a.vy, a.vx) + (this.rng() * 2 - 1) * 0.25;
        a.vx = Math.cos(theta) * speed;
        a.vy = Math.sin(theta) * speed;
        a.x += a.vx * dt;
        a.y += a.vy * dt;

        // Bounce off walls with padding
        if (a.x < 4) { a.x = 4; a.vx = Math.abs(a.vx); }
        if (a.x > W - 4) { a.x = W - 4; a.vx = -Math.abs(a.vx); }
        if (a.y < 4) { a.y = 4; a.vy = Math.abs(a.vy); }
        if (a.y > H - 4) { a.y = H - 4; a.vy = -Math.abs(a.vy); }
      }

      // Infection contacts (per-substep Bernoulli sampling)
      // Build index of infected agents
      const idxI = [];
      for (let i = 0; i < this.agents.length; i++) {
        if (this.agents[i].state === 'I') idxI.push(i);
      }

      // Check each susceptible against infected
      for (let i = 0; i < this.agents.length; i++) {
        const a = this.agents[i];
        if (a.state !== 'S') continue;

        for (let j = 0; j < idxI.length; j++) {
          const b = this.agents[idxI[j]];
          const dx = a.x - b.x;
          const dy = a.y - b.y;

          if (dx * dx + dy * dy <= r2) {
            // Per-substep Bernoulli trial with noise
            if (this.rng() < pStep) {
              a.state = 'I';
              a.tInfected = this.lastTime;
              break;
            }
          }
        }
      }

      // Recoveries (Poisson hazard)
      for (const a of this.agents) {
        if (a.state === 'I' && this.rng() < gamma * dt) {
          a.state = 'R';
        }
      }
    },

    render() {
      this.renderField();
      this.renderChart();
    },

    renderField() {
      const ctx = this.fieldCtx;
      const W = 800, H = 600;

      ctx.save();
      ctx.scale(DPR, DPR);

      // Background
      ctx.fillStyle = '#0d141d';
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = '#122033';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      const grid = 40;
      for (let x = 0; x < W; x += grid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += grid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Agents
      this.agents.forEach(a => {
        const color = a.state === 'S' ? '#4aa3ff' :
                     a.state === 'I' ? '#ff6b6b' : '#29d398';
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(a.x, a.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    },

    renderChart() {
      const ctx = this.chartCtx;
      const W = 800, H = 600;
      const pad = 40;

      ctx.save();
      ctx.scale(DPR, DPR);

      // Background
      ctx.fillStyle = '#0d131b';
      ctx.fillRect(0, 0, W, H);

      if (this.chartData.t.length < 2) {
        ctx.restore();
        return;
      }

      const N = CUI.getState('sir').params.N;
      const tMin = Math.min(...this.chartData.t);
      const tMax = Math.max(...this.chartData.t);
      const tRange = tMax - tMin || 1;

      // Draw lines
      const drawSeries = (data, color) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        data.forEach((val, i) => {
          const t = this.chartData.t[i];
          const x = pad + ((t - tMin) / tRange) * (W - 2 * pad);
          const y = H - pad - (val / N) * (H - 2 * pad);

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });

        ctx.stroke();
      };

      drawSeries(this.chartData.S, '#4aa3ff');
      drawSeries(this.chartData.I, '#ff6b6b');
      drawSeries(this.chartData.R, '#29d398');

      // Axes
      ctx.strokeStyle = '#dbe7f3';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad, H - pad);
      ctx.lineTo(W - pad, H - pad);
      ctx.lineTo(W - pad, pad);
      ctx.stroke();

      ctx.restore();
    }
  };

  CUI.log('SIR App module loaded');

})();
