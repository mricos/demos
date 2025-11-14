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

    // R₀ targeting mode
    r0Mode: 'computed',  // 'computed' or 'manual'

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
        stats: { S: 0, I: 0, R: 0, r0: 0, rt: 0 },
        params: {
          N: 400,
          i0: 5,
          speed: 90,
          radius: 8,
          p: 0.22,
          gamma: 0.02,
          noise: 0,  // ±% variation on infectivity
          horizon: 120,  // chart time window in seconds
          initPattern: 'random'  // initialization pattern
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

      // Store Actions for use in methods
      this.Actions = Actions;

      // Wire up UI
      this.setupUI();

      // Setup Cli
      this.setupCli();

      // Setup Experiments
      this.setupExperiments();

      // Setup chart view tabs
      this.setupChartTabs();

      // Initialize with default state
      this.resetSimulation();

      // Auto-start simulation
      CUI.dispatch({ type: this.Actions.START });

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
      const pauseBtn = CUI.DOM.$('pauseBtn');
      pauseBtn.addEventListener('click', () => {
        const state = CUI.getState('sir');
        if (state.running) {
          CUI.dispatch({ type: this.Actions.PAUSE });
          pauseBtn.textContent = 'Resume';
        } else {
          CUI.dispatch({ type: this.Actions.START });
          pauseBtn.textContent = 'Pause';
        }
      });

      CUI.DOM.$('resetBtn').addEventListener('click', () => {
        // Reset with new random seed
        this.resetSimulation({ randomize: true });
        CUI.dispatch({ type: this.Actions.RESET });
      });

      // Parameter sliders
      ['N', 'i0', 'speed', 'radius', 'p', 'gamma', 'noise', 'horizon'].forEach(param => {
        const slider = CUI.DOM.$(param);
        const display = CUI.DOM.$(param + '_val');

        slider.addEventListener('input', (e) => {
          const value = parseFloat(e.target.value);
          display.textContent = param === 'p' ? value.toFixed(2) :
                               param === 'gamma' ? value.toFixed(3) :
                               param === 'noise' ? value + '%' :
                               param === 'horizon' ? value :
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

          // If in manual R₀ mode and a relevant param changed, re-adjust p
          if (this.r0Mode === 'manual' && ['N', 'speed', 'radius', 'gamma'].includes(param)) {
            const r0Target = parseFloat(CUI.DOM.$('r0Target').value);
            if (r0Target > 0) {
              this.adjustPforR0(r0Target);
            }
          }
        });
      });

      // R₀ target slider (special handling for dual mode)
      const r0TargetSlider = CUI.DOM.$('r0Target');
      const r0TargetVal = CUI.DOM.$('r0Target_val');

      r0TargetSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);

        if (value === 0) {
          // Computed mode
          this.r0Mode = 'computed';
          r0TargetVal.textContent = 'computed';
          this.updateStats();  // Recalculate R₀ from current p
        } else {
          // Manual targeting mode
          this.r0Mode = 'manual';
          r0TargetVal.textContent = value.toFixed(1);
          this.adjustPforR0(value);
        }
      });

      // Initialization pattern buttons
      const initButtons = document.querySelectorAll('[data-pattern]');
      initButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const pattern = e.target.dataset.pattern;

          // Update button selection state
          initButtons.forEach(b => b.classList.remove('selected'));
          e.target.classList.add('selected');

          // Update Redux state
          CUI.dispatch({
            type: this.Actions.UPDATE_PARAMS,
            payload: { initPattern: pattern }
          });

          // Reset simulation with new pattern (if not running)
          const state = CUI.getState('sir');
          if (!state.running) {
            this.resetSimulation();
          }
        });
      });
    },

    setupCli() {
      // Check if CUI.cli is loaded
      if (!CUI.cli) {
        CUI.log('cli plugin not loaded, skipping Cli setup', 'warn');
        return;
      }

      // Create Cli instance
      this.cli = CUI.cli.create({
        id: 'sir-cli',
        inputId: 'cliInput',
        outputId: 'cliOutput',
        commands: {
          save: {
            handler: (args, cli) => {
              const name = args[0];
              if (!name) {
                cli.print('Usage: save [name]', cli.colors.error);
                return;
              }
              // Use experiments to save
              if (this.experiments) {
                this.experiments.save(name);
                const exp = this.experiments.getAll()[name];
                const c = exp.curves;
                cli.print(`Saved '${name}': R₀=${c.r0.toFixed(2)}, Rₜ=${c.rt.toFixed(2)}`, cli.colors.success);
              } else {
                cli.print('Experiments plugin not loaded', cli.colors.error);
              }
            },
            meta: {
              description: 'Save current params + curve summary',
              usage: 'save [name]'
            }
          },

          load: {
            handler: (args, cli) => {
              const name = args[0];
              if (!name) {
                cli.print('Usage: load [name]', cli.colors.error);
                return;
              }
              if (this.experiments) {
                const loaded = this.experiments.load(name);
                if (loaded) {
                  cli.print(`Loaded '${name}'`, cli.colors.success);
                } else {
                  cli.print(`Experiment '${name}' not found`, cli.colors.error);
                }
              } else {
                cli.print('Experiments plugin not loaded', cli.colors.error);
              }
            },
            meta: {
              description: 'Load saved experiment',
              usage: 'load [name]'
            }
          },

          rm: {
            handler: (args, cli) => {
              const name = args[0];
              if (!name) {
                cli.print('Usage: rm [name]', cli.colors.error);
                return;
              }
              if (this.experiments) {
                if (this.experiments.delete(name)) {
                  cli.print(`Removed '${name}'`, cli.colors.warning);
                  this.experiments.render();
                } else {
                  cli.print(`Experiment '${name}' not found`, cli.colors.error);
                }
              } else {
                cli.print('Experiments plugin not loaded', cli.colors.error);
              }
            },
            meta: {
              description: 'Remove saved experiment',
              usage: 'rm [name]'
            }
          },

          ls: {
            handler: (args, cli) => {
              if (this.experiments) {
                const names = this.experiments.list();
                if (names.length === 0) {
                  cli.print('No saved experiments', cli.colors.info);
                  return;
                }
                cli.print(`Saved experiments (${names.length}):`, cli.colors.prompt);
                const saved = this.experiments.getAll();
                names.forEach(name => {
                  const c = saved[name].curves;
                  cli.print(`  ${name}: R₀=${c.r0.toFixed(2)}, Rₜ=${c.rt.toFixed(2)}`, cli.colors.info);
                });
              } else {
                cli.print('Experiments plugin not loaded', cli.colors.error);
              }
            },
            meta: {
              description: 'List saved experiments',
              usage: 'ls'
            }
          },

          export: {
            handler: (args, cli) => {
              const type = args[0];
              if (type === 'field') {
                this.exportCanvas(this.fieldCtx.canvas, 'field');
                cli.print('Exported field as PNG', cli.colors.success);
              } else if (type === 'chart') {
                this.exportCanvas(this.chartCtx.canvas, 'chart');
                cli.print('Exported chart as PNG', cli.colors.success);
              } else if (type === 'data') {
                this.exportData();
                cli.print('Exported data as JSON', cli.colors.success);
              } else {
                cli.print('Usage: export [field|chart|data]', cli.colors.error);
              }
            },
            meta: {
              description: 'Export field/chart/data',
              usage: 'export [field|chart|data]'
            }
          },

          curves: {
            handler: (args, cli) => {
              const curves = this.characterizeCurve();
              cli.print('Current curve parameters:', cli.colors.prompt);
              cli.print(`  R₀ = ${curves.r0.toFixed(2)} (basic reproduction number)`, cli.colors.info);
              cli.print(`  Rₜ = ${curves.rt.toFixed(2)} (effective reproduction number)`, cli.colors.info);
              cli.print(`  τ  = ${curves.t_peak.toFixed(1)}s (time to peak infection)`, cli.colors.info);
              cli.print(`  I_max = ${curves.I_max} (peak infections)`, cli.colors.info);
              cli.print(`  α  = ${(curves.attack_rate*100).toFixed(1)}% (attack rate)`, cli.colors.info);
              cli.print(`  Duration = ${curves.duration.toFixed(1)}s (to 95% recovered)`, cli.colors.info);
              cli.print(`  AUC(I) = ${curves.auc_I.toFixed(0)} (total infection-days)`, cli.colors.info);
            },
            meta: {
              description: 'Show current curve parameters',
              usage: 'curves'
            }
          }
        }
      });

      CUI.log('Cli setup complete');
    },

    setupExperiments() {
      // Check if CUI.experiments is loaded
      if (!CUI.experiments) {
        CUI.log('experiments plugin not loaded, skipping experiments setup', 'warn');
        return;
      }

      // Create experiments instance
      this.experiments = CUI.experiments.create({
        id: 'sir-experiments',
        listId: 'experimentsList',
        storageKey: 'sir_experiments',

        // Called when saving
        onSave: () => {
          const state = CUI.getState('sir');
          return {
            params: state.params,
            curves: this.characterizeCurve()
          };
        },

        // Called when loading
        onLoad: (exp) => {
          // Apply params
          if (exp.params) {
            CUI.dispatch({
              type: this.Actions.UPDATE_PARAMS,
              payload: exp.params
            });
          }
          // Reset simulation with loaded params
          this.resetSimulation();
        },

        // Custom thumbnail renderer
        renderThumbnail: (canvas, exp) => {
          this.drawThumbnailCurve(canvas, exp.curves, exp.params);
        }
      });

      CUI.log('Experiments setup complete');
    },

    setupChartTabs() {
      const timeSeriesTab = CUI.DOM.$('timeSeriesTab');
      const experimentsTab = CUI.DOM.$('experimentsTab');
      const timeSeriesView = CUI.DOM.$('timeSeriesView');
      const experimentsView = CUI.DOM.$('experimentsView');

      if (!timeSeriesTab || !experimentsTab) {
        return;
      }

      const switchView = (view) => {
        if (view === 'timeseries') {
          timeSeriesTab.classList.add('active');
          experimentsTab.classList.remove('active');
          timeSeriesView.style.display = 'block';
          experimentsView.style.display = 'none';
        } else {
          timeSeriesTab.classList.remove('active');
          experimentsTab.classList.add('active');
          timeSeriesView.style.display = 'none';
          experimentsView.style.display = 'block';

          // Render experiments list when switching to experiments view
          if (this.experiments) {
            this.experiments.render({
              onClick: (name) => {
                this.experiments.load(name);
                switchView('timeseries');
              }
            });
          }
        }
      };

      timeSeriesTab.addEventListener('click', () => switchView('timeseries'));
      experimentsTab.addEventListener('click', () => switchView('experiments'));
    },

    // Draw thumbnail curve for experiment
    drawThumbnailCurve(canvas, curves, params) {
      const ctx = canvas.getContext('2d');
      const W = canvas.width;
      const H = canvas.height;

      // Clear
      ctx.fillStyle = '#0a0f16';
      ctx.fillRect(0, 0, W, H);

      // Generate synthetic curve data
      const N = params.N;
      const steps = 40;
      const duration = curves.duration * 1.2;
      const t_peak = curves.t_peak;
      const I_max = curves.I_max;
      const R_final = curves.R_final;

      const S = [], I = [], R = [];

      for (let i = 0; i < steps; i++) {
        const t = (i / (steps - 1)) * duration;

        // Infected curve: Gaussian-like peak
        const sigma = t_peak / 2.5;
        const I_t = I_max * Math.exp(-Math.pow(t - t_peak, 2) / (2 * sigma * sigma));
        I.push(I_t);

        // Recovered curve: Logistic growth
        const k = 4 / curves.duration;
        const R_t = R_final / (1 + Math.exp(-k * (t - curves.duration / 2)));
        R.push(R_t);

        // Susceptible curve
        const S_t = N - I_t - R_t;
        S.push(Math.max(0, S_t));
      }

      // Draw curves
      const maxVal = Math.max(...S, ...I, ...R, N);
      const xScale = (x) => (x / (steps - 1)) * W;
      const yScale = (y) => H - (y / maxVal) * H;

      const drawLine = (data, color) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(xScale(0), yScale(data[0]));
        for (let i = 1; i < data.length; i++) {
          ctx.lineTo(xScale(i), yScale(data[i]));
        }
        ctx.stroke();
      };

      drawLine(S, '#4aa3ff');
      drawLine(I, '#ff6b6b');
      drawLine(R, '#29d398');
    },

    // Apply initialization pattern to seed initial infections
    seedInfections(pattern, i0) {
      const W = 800, H = 600;

      switch (pattern) {
        case 'random':
          // Random selection - existing behavior
          for (let i = 0; i < this.agents.length; i++) {
            if (i < i0) {
              this.agents[i].state = 'I';
              this.agents[i].tInfected = 0;
            }
          }
          break;

        case 'cluster':
          // Center cluster - infect agents nearest to center
          const cx = W / 2, cy = H / 2;
          const sorted = this.agents.map((a, i) => ({
            idx: i,
            dist: Math.sqrt((a.x - cx) * (a.x - cx) + (a.y - cy) * (a.y - cy))
          }));
          sorted.sort((a, b) => a.dist - b.dist);
          for (let i = 0; i < Math.min(i0, sorted.length); i++) {
            const agent = this.agents[sorted[i].idx];
            agent.state = 'I';
            agent.tInfected = 0;
          }
          break;

        case 'line':
          // Horizontal line at center
          const sortedH = this.agents.map((a, i) => ({
            idx: i,
            dist: Math.abs(a.y - H / 2)
          }));
          sortedH.sort((a, b) => a.dist - b.dist);
          for (let i = 0; i < Math.min(i0, sortedH.length); i++) {
            const agent = this.agents[sortedH[i].idx];
            agent.state = 'I';
            agent.tInfected = 0;
          }
          break;

        case 'vertical':
          // Vertical line at center
          const sortedV = this.agents.map((a, i) => ({
            idx: i,
            dist: Math.abs(a.x - W / 2)
          }));
          sortedV.sort((a, b) => a.dist - b.dist);
          for (let i = 0; i < Math.min(i0, sortedV.length); i++) {
            const agent = this.agents[sortedV[i].idx];
            agent.state = 'I';
            agent.tInfected = 0;
          }
          break;

        case 'grid':
          // Grid pattern
          const gridSize = Math.ceil(Math.sqrt(i0));
          const centers = [];
          for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
              if (centers.length >= i0) break;
              centers.push({
                x: (W / (gridSize + 1)) * (col + 1),
                y: (H / (gridSize + 1)) * (row + 1)
              });
            }
          }
          // For each agent, find nearest center
          const agentCenters = this.agents.map((a, i) => {
            let minDist = Infinity;
            let nearestCenter = 0;
            centers.forEach((c, ci) => {
              const d = Math.sqrt((a.x - c.x) * (a.x - c.x) + (a.y - c.y) * (a.y - c.y));
              if (d < minDist) {
                minDist = d;
                nearestCenter = ci;
              }
            });
            return { idx: i, center: nearestCenter, dist: minDist };
          });
          // Infect one agent per center (closest to each center)
          centers.forEach((c, ci) => {
            const candidates = agentCenters.filter(a => a.center === ci);
            if (candidates.length > 0) {
              candidates.sort((a, b) => a.dist - b.dist);
              const agent = this.agents[candidates[0].idx];
              agent.state = 'I';
              agent.tInfected = 0;
            }
          });
          break;

        case 'corners':
          // Four corners pattern
          const perCorner = Math.ceil(i0 / 4);
          const corners = [
            { x: W * 0.25, y: H * 0.25 },
            { x: W * 0.75, y: H * 0.25 },
            { x: W * 0.25, y: H * 0.75 },
            { x: W * 0.75, y: H * 0.75 }
          ];

          let infected = 0;
          corners.forEach(corner => {
            if (infected >= i0) return;
            const sorted = this.agents.map((a, i) => ({
              idx: i,
              dist: Math.sqrt((a.x - corner.x) * (a.x - corner.x) + (a.y - corner.y) * (a.y - corner.y))
            }));
            sorted.sort((a, b) => a.dist - b.dist);
            for (let i = 0; i < Math.min(perCorner, sorted.length) && infected < i0; i++, infected++) {
              const agent = this.agents[sorted[i].idx];
              if (agent.state !== 'I') {  // Don't double-infect
                agent.state = 'I';
                agent.tInfected = 0;
              }
            }
          });
          break;
      }
    },

    resetSimulation(options = {}) {
      const state = CUI.getState('sir');
      const { N, i0, speed, initPattern } = state.params;

      // Optionally reseed RNG
      if (options.randomize) {
        this.rng = mulberry32(((Math.random() * (2**31)) | 0) ^ (Date.now()>>>0));
      }

      // Create agents (all susceptible initially)
      const W = 800, H = 600;
      this.agents = [];

      for (let i = 0; i < N; i++) {
        this.agents.push({
          x: randIn(8, W - 8, this.rng),
          y: randIn(8, H - 8, this.rng),
          vx: randIn(-1, 1, this.rng),
          vy: randIn(-1, 1, this.rng),
          state: 'S',
          tInfected: -1
        });
      }

      // Apply initialization pattern
      this.seedInfections(initPattern, i0);

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

      // Effective reproduction number: R₀ scaled by susceptible fraction
      const rt = r0 * (S / Math.max(1, N));

      CUI.dispatch({
        type: this.Actions.UPDATE_STATS,
        payload: {
          time: this.lastTime,
          stats: { S, I, R, r0, rt }
        }
      });
    },

    // Adjust infectivity p to hit target R₀
    adjustPforR0(targetR0) {
      const { N, speed, radius, gamma } = CUI.getState('sir').params;
      const A = 800 * 600;
      const rho = N / A;
      const k = 2 * radius * speed * rho;

      // Solve for p: R₀ = (k × p) / γ  =>  p = (R₀ × γ) / k
      const newP = (targetR0 * gamma) / Math.max(1e-6, k);
      const clampedP = Math.max(0.02, Math.min(0.9, newP));

      // Update p slider and state
      CUI.dispatch({
        type: this.Actions.UPDATE_PARAMS,
        payload: { p: clampedP }
      });

      // Update stats to reflect new R₀
      this.updateStats();
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
      CUI.DOM.$('rtVal').textContent = stats.rt.toFixed(2);

      // Update variable system for live documentation
      if (CUI.Variables) {
        CUI.Variables.setValue('S', stats.S);
        CUI.Variables.setValue('I', stats.I);
        CUI.Variables.setValue('R', stats.R);
        CUI.Variables.setValue('R0', stats.r0);
        CUI.Variables.setValue('Rt', stats.rt);
      }
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
                               key === 'horizon' ? params[key] :
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
        const currentState = CUI.getState('sir');
        const { S, I, R } = currentState.stats;
        const { horizon } = currentState.params;
        this.chartData.t.push(this.lastTime);
        this.chartData.S.push(S);
        this.chartData.I.push(I);
        this.chartData.R.push(R);

        // Keep data within horizon window
        while (this.chartData.t.length && (this.lastTime - this.chartData.t[0]) > horizon) {
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

    // Characterize current epidemic curve
    characterizeCurve() {
      const state = CUI.getState('sir');
      const { r0, rt } = state.stats;
      const { N } = state.params;
      const data = this.chartData;

      // Find peak infection
      let I_max = 0, t_peak = 0;
      for (let i = 0; i < data.I.length; i++) {
        if (data.I[i] > I_max) {
          I_max = data.I[i];
          t_peak = data.t[i];
        }
      }

      // Final recovered
      const R_final = data.R[data.R.length - 1] || 0;
      const attack_rate = R_final / Math.max(1, N);

      // Time to 95% recovered
      const target95 = N * 0.95;
      let duration = data.t[data.t.length - 1] || 0;
      for (let i = 0; i < data.R.length; i++) {
        if (data.R[i] >= target95) {
          duration = data.t[i];
          break;
        }
      }

      // Area under I curve (infection-days)
      let auc_I = 0;
      for (let i = 1; i < data.I.length; i++) {
        auc_I += (data.I[i] + data.I[i-1]) * (data.t[i] - data.t[i-1]) / 2;
      }

      return { r0, rt, t_peak, I_max, R_final, attack_rate, duration, auc_I };
    },

    // Export canvas to PNG
    exportCanvas(canvas, name) {
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sir_${name}_${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      });
    },

    // Export simulation data to JSON
    exportData() {
      const state = CUI.getState('sir');
      const data = {
        params: state.params,
        stats: state.stats,
        curves: this.characterizeCurve(),
        series: this.chartData,
        timestamp: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sir_data_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
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
