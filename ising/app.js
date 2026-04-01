// ── Ising Model — app.js ──────────────────────
import { showHelp } from './help.js';
import {
  HN, hopGrid, hopWeights, storedPatterns, PATTERNS,
  initHopfield, storePattern, addNoise, recallStep, recallFull,
  hopfieldEnergy, drawHopGrid, setupHopfieldDraw, loadPattern
} from './hopfield.js';

const $ = id => document.getElementById(id);

// ── State ─────────────────────────────────────
let N = 32, J = 1, T = 2.27, speed = 1;
let grid, running = false, sweepCount = 0, animId = null;
let energyHistory = [], magHistory = [];
const MAX_HIST = 500;

// ── URL Params ────────────────────────────────
function readParams() {
  const p = new URLSearchParams(location.search);
  if (p.has('T'))   T = parseFloat(p.get('T'));
  if (p.has('N'))   N = parseInt(p.get('N'));
  if (p.has('J'))   J = parseFloat(p.get('J'));
  if (p.has('speed')) speed = parseInt(p.get('speed'));
  if (p.has('tab')) {
    const tab = p.get('tab');
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('on'));
    document.querySelectorAll('.pane').forEach(p => p.classList.remove('on'));
    const btn = document.querySelector(`.tab[data-tab="${tab}"]`);
    if (btn) { btn.classList.add('on'); $('tab-' + tab)?.classList.add('on'); }
  }
}

function syncParams() {
  const p = new URLSearchParams();
  if (T !== 2.27) p.set('T', T.toFixed(2));
  if (N !== 32) p.set('N', N);
  if (J !== 1) p.set('J', J.toFixed(1));
  if (speed !== 1) p.set('speed', speed);
  const activeTab = document.querySelector('.tab.on')?.dataset.tab;
  if (activeTab && activeTab !== 'lattice') p.set('tab', activeTab);
  const qs = p.toString();
  history.replaceState(null, '', qs ? '?' + qs : location.pathname);
}

// ── Grid ──────────────────────────────────────
function makeGrid(n, mode) {
  N = n;
  grid = new Int8Array(N * N);
  if (mode === 'up') grid.fill(1);
  else if (mode === 'down') grid.fill(-1);
  else for (let i = 0; i < N * N; i++) grid[i] = Math.random() < 0.5 ? 1 : -1;
  sweepCount = 0;
  energyHistory = [];
  magHistory = [];
}

function idx(r, c) { return r * N + c; }
function wrap(x) { return ((x % N) + N) % N; }

function calcEnergy() {
  let E = 0;
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      const s = grid[idx(r, c)];
      E -= J * s * grid[idx(wrap(r + 1), c)];
      E -= J * s * grid[idx(r, wrap(c + 1))];
    }
  return E;
}

function calcMag() {
  let m = 0;
  for (let i = 0; i < N * N; i++) m += grid[i];
  return m / (N * N);
}

function metropolisSweep() {
  for (let k = 0; k < N * N; k++) {
    const r = Math.floor(Math.random() * N);
    const c = Math.floor(Math.random() * N);
    const s = grid[idx(r, c)];
    const neighbors = grid[idx(wrap(r - 1), c)] + grid[idx(wrap(r + 1), c)]
                    + grid[idx(r, wrap(c - 1))] + grid[idx(r, wrap(c + 1))];
    const dE = 2 * J * s * neighbors;
    if (dE <= 0 || Math.random() < Math.exp(-dE / T)) grid[idx(r, c)] = -s;
  }
  sweepCount++;
}

// ── Retina Canvas Helper ──────────────────────
function hiDpiSize(canvas, w, h) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

// ── Lattice Rendering ─────────────────────────
const latticeCanvas = $('latticeCanvas');
let lctx = latticeCanvas.getContext('2d');

function resizeLatticeCanvas() {
  const container = latticeCanvas.parentElement;
  const size = Math.min(container.clientWidth - 8, 600, window.innerHeight - 200);
  lctx = hiDpiSize(latticeCanvas, size, size);
}

function getEdgeColors() {
  const cs = getComputedStyle(document.documentElement);
  return {
    sat: cs.getPropertyValue('--edge-sat').trim(),
    unsat: cs.getPropertyValue('--edge-unsat').trim(),
    up: cs.getPropertyValue('--spin-up').trim(),
    dn: cs.getPropertyValue('--spin-dn').trim(),
  };
}

function drawLattice() {
  const cssW = parseInt(latticeCanvas.style.width);
  const cell = cssW / N;
  lctx.clearRect(0, 0, cssW, cssW);
  const colors = getEdgeColors();
  const half = cell / 2;
  const lw = cell > 10 ? 2 : 1;

  // Edges (including wrap-around)
  lctx.globalAlpha = 0.45;
  lctx.lineWidth = lw;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const s = grid[idx(r, c)];
      const x = c * cell + half, y = r * cell + half;
      // right (wraps)
      const cr = wrap(c + 1);
      const xr = cr * cell + half;
      lctx.strokeStyle = (s === grid[idx(r, cr)]) ? colors.sat : colors.unsat;
      lctx.beginPath();
      if (cr > c) { lctx.moveTo(x, y); lctx.lineTo(xr, y); }
      else { lctx.moveTo(x, y); lctx.lineTo(cssW, y); lctx.moveTo(0, y); lctx.lineTo(xr, y); }
      lctx.stroke();
      // down (wraps)
      const rd = wrap(r + 1);
      const yd = rd * cell + half;
      lctx.strokeStyle = (s === grid[idx(rd, c)]) ? colors.sat : colors.unsat;
      lctx.beginPath();
      if (rd > r) { lctx.moveTo(x, y); lctx.lineTo(x, yd); }
      else { lctx.moveTo(x, y); lctx.lineTo(x, cssW); lctx.moveTo(x, 0); lctx.lineTo(x, yd); }
      lctx.stroke();
    }
  }
  lctx.globalAlpha = 1;

  // Spins
  const radius = Math.max(cell * 0.3, 2);
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const s = grid[idx(r, c)];
      const x = c * cell + half, y = r * cell + half;
      lctx.fillStyle = s === 1 ? colors.up : colors.dn;
      lctx.beginPath(); lctx.arc(x, y, radius, 0, Math.PI * 2); lctx.fill();
      if (cell > 8) {
        const al = radius * 0.8;
        lctx.strokeStyle = '#0a0f1a';
        lctx.lineWidth = Math.max(1, cell * 0.08);
        lctx.beginPath(); lctx.moveTo(x, y + s * al); lctx.lineTo(x, y - s * al); lctx.stroke();
        lctx.beginPath();
        lctx.moveTo(x, y - s * al); lctx.lineTo(x - al * 0.4, y - s * al * 0.4);
        lctx.moveTo(x, y - s * al); lctx.lineTo(x + al * 0.4, y - s * al * 0.4);
        lctx.stroke();
      }
    }
  }
}

// Click to flip
latticeCanvas.addEventListener('click', e => {
  const rect = latticeCanvas.getBoundingClientRect();
  const cssW = parseInt(latticeCanvas.style.width);
  const cell = cssW / N;
  const c = Math.floor((e.clientX - rect.left) * (cssW / rect.width) / cell);
  const r = Math.floor((e.clientY - rect.top) * (cssW / rect.height) / cell);
  if (r >= 0 && r < N && c >= 0 && c < N) {
    grid[idx(r, c)] *= -1;
    drawLattice();
    updateStats();
  }
});

// ── Charts ────────────────────────────────────
function drawChart(canvas, data, color) {
  const W = canvas.parentElement.clientWidth;
  const H = canvas.parentElement.clientHeight;
  const ctx = hiDpiSize(canvas, W, H);
  ctx.clearRect(0, 0, W, H);
  if (data.length < 2) return;

  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pad = { l: 46, r: 8, t: 8, b: 22 };

  ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (H - pad.t - pad.b) * i / 4;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
  }
  ctx.fillStyle = '#64748b'; ctx.font = '10px JetBrains Mono'; ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (H - pad.t - pad.b) * i / 4;
    ctx.fillText((max - range * i / 4).toFixed(1), pad.l - 5, y + 3);
  }
  ctx.textAlign = 'center'; ctx.fillText('Sweep', W / 2, H - 2);
  ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath();
  const dx = (W - pad.l - pad.r) / (data.length - 1);
  for (let i = 0; i < data.length; i++) {
    const x = pad.l + i * dx;
    const y = pad.t + (1 - (data[i] - min) / range) * (H - pad.t - pad.b);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
}

let lastPhaseData = null;
function drawPhaseChart(data) {
  lastPhaseData = data;
  const canvas = $('phaseChart');
  const W = canvas.parentElement.clientWidth;
  const H = canvas.parentElement.clientHeight;
  const ctx = hiDpiSize(canvas, W, H);
  ctx.clearRect(0, 0, W, H);
  if (data.length < 2) return;

  const pad = { l: 46, r: 8, t: 8, b: 26 };
  const temps = data.map(d => d.T), mags = data.map(d => Math.abs(d.M));

  ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (H - pad.t - pad.b) * i / 4;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
  }
  const tcX = pad.l + (2.269 - temps[0]) / (temps[temps.length - 1] - temps[0]) * (W - pad.l - pad.r);
  ctx.strokeStyle = '#fbbf2480'; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(tcX, pad.t); ctx.lineTo(tcX, H - pad.b); ctx.stroke();
  ctx.setLineDash([]); ctx.fillStyle = '#fbbf24'; ctx.font = '10px JetBrains Mono';
  ctx.textAlign = 'center'; ctx.fillText('Tc', tcX, pad.t - 2);
  ctx.fillStyle = '#64748b'; ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (H - pad.t - pad.b) * i / 4;
    ctx.fillText((1 - i / 4).toFixed(1), pad.l - 5, y + 3);
  }
  ctx.textAlign = 'center'; ctx.fillText('Temperature', W / 2, H - 2);
  for (let i = 0; i <= 4; i++) {
    const x = pad.l + (W - pad.l - pad.r) * i / 4;
    ctx.fillText((temps[0] + (temps[temps.length - 1] - temps[0]) * i / 4).toFixed(1), x, H - 13);
  }
  ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2; ctx.beginPath();
  const dx = (W - pad.l - pad.r) / (data.length - 1);
  for (let i = 0; i < data.length; i++) {
    const x = pad.l + i * dx;
    const y = pad.t + (1 - mags[i]) * (H - pad.t - pad.b);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
}

// ── Stats ─────────────────────────────────────
function updateStats() {
  const E = calcEnergy(), M = calcMag();
  $('sEnergy').textContent = (E / (N * N)).toFixed(2);
  $('sMag').textContent = M.toFixed(3);
  $('sTemp').textContent = T.toFixed(2);
  $('sSweep').textContent = sweepCount;
  energyHistory.push(E / (N * N));
  magHistory.push(M);
  if (energyHistory.length > MAX_HIST) { energyHistory.shift(); magHistory.shift(); }
}

// ── Main Loop ─────────────────────────────────
function step() {
  for (let i = 0; i < speed; i++) metropolisSweep();
  drawLattice();
  updateStats();
  if (document.querySelector('#tab-energy.on')) {
    drawChart($('energyChart'), energyHistory, '#ef4444');
    drawChart($('magChart'), magHistory, '#60a5fa');
  }
}

function animate() {
  if (!running) return;
  step();
  animId = requestAnimationFrame(animate);
}

function toggleRun() {
  running = !running;
  $('btnRun').textContent = running ? '\u23F8 Pause' : '\u25B6 Run';
  $('btnRun').classList.toggle('on', running);
  if (running) animate();
}

function doReset() {
  running = false;
  $('btnRun').textContent = '\u25B6 Run';
  $('btnRun').classList.remove('on');
  if (animId) cancelAnimationFrame(animId);
  makeGrid(N, 'random');
  resizeLatticeCanvas();
  drawLattice();
  updateStats();
}

// ── Controls ──────────────────────────────────
$('btnRun').addEventListener('click', toggleRun);
$('btnStep').addEventListener('click', () => { if (!running) step(); });
$('btnReset').addEventListener('click', doReset);

$('sliderTemp').addEventListener('input', e => {
  T = parseFloat(e.target.value);
  $('lblTemp').textContent = T.toFixed(2);
  $('sTemp').textContent = T.toFixed(2);
  syncParams();
});
$('sliderSize').addEventListener('input', e => {
  const n = parseInt(e.target.value);
  $('lblSize').textContent = n;
  makeGrid(n, 'random');
  resizeLatticeCanvas(); drawLattice(); updateStats();
  syncParams();
});
$('sliderJ').addEventListener('input', e => {
  J = parseFloat(e.target.value);
  $('lblJ').textContent = J.toFixed(2);
  syncParams();
});
$('sliderSpeed').addEventListener('input', e => {
  speed = parseInt(e.target.value);
  $('lblSpeed').textContent = speed;
  syncParams();
});

$('btnAllUp').addEventListener('click', () => { makeGrid(N, 'up'); drawLattice(); updateStats(); });
$('btnAllDn').addEventListener('click', () => { makeGrid(N, 'down'); drawLattice(); updateStats(); });
$('btnRand').addEventListener('click', () => { makeGrid(N, 'random'); drawLattice(); updateStats(); });

// Color-blind toggle
$('btnCB')?.addEventListener('click', () => {
  document.body.classList.toggle('cb-mode');
  $('btnCB').classList.toggle('on');
  drawLattice();
});

// ── Tabs ──────────────────────────────────────
function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('on'));
  document.querySelectorAll('.pane').forEach(p => p.classList.remove('on'));
  const btn = document.querySelector(`.tab[data-tab="${tabName}"]`);
  if (btn) btn.classList.add('on');
  $('tab-' + tabName)?.classList.add('on');
  if (tabName === 'energy') {
    drawChart($('energyChart'), energyHistory, '#ef4444');
    drawChart($('magChart'), magHistory, '#60a5fa');
  }
  syncParams();
}

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ── Temperature Sweep (non-blocking) ──────────
let sweeping = false;
$('btnSweep').addEventListener('click', () => {
  if (sweeping) return;
  sweeping = true;
  const btn = $('btnSweep');
  btn.disabled = true; btn.textContent = 'Sweeping...';
  const phaseData = [];
  const sweepN = 24;
  const origT = T, origN = N, origGrid = new Int8Array(grid);
  let ti = 0;

  function sweepTick() {
    const tempVal = 0.5 + ti * 0.1;
    T = tempVal;
    makeGrid(sweepN, 'random'); N = sweepN;
    for (let s = 0; s < 200; s++) metropolisSweep();
    let mSum = 0;
    for (let s = 0; s < 100; s++) { metropolisSweep(); mSum += calcMag(); }
    phaseData.push({ T: tempVal, M: mSum / 100 });
    $('sweepStatus').textContent = `T = ${tempVal.toFixed(1)} (${ti + 1}/41)`;
    drawPhaseChart(phaseData);
    ti++;
    if (ti <= 40) {
      requestAnimationFrame(sweepTick);
    } else {
      T = origT; N = origN;
      makeGrid(N, 'random');
      if (origGrid.length === N * N) grid = origGrid;
      drawLattice(); updateStats();
      btn.disabled = false; btn.textContent = 'Run Temperature Sweep';
      $('sweepStatus').textContent = 'Sweep complete';
      sweeping = false;
    }
  }
  requestAnimationFrame(sweepTick);
});

// ── Hopfield UI ───────────────────────────────
const hopCanvas = $('hopfieldCanvas');
const hopOut = $('hopfieldOut');

function refreshHopUI() {
  drawHopGrid(hopCanvas, hopGrid);
  updateHopStats();
}

function updateHopStats() {
  const el = $('hopStats');
  if (el) {
    const E = hopfieldEnergy(hopGrid);
    el.innerHTML = `Stored: <b>${storedPatterns.length}</b> &nbsp; Energy: <b>${E.toFixed(0)}</b>`;
  }
}

setupHopfieldDraw(hopCanvas, refreshHopUI);

$('btnStore').addEventListener('click', () => {
  storePattern();
  drawHopGrid(hopOut, hopGrid);
  updateHopStats();
});

$('btnNoise').addEventListener('click', () => { addNoise(); refreshHopUI(); });

// Animated recall
let recalling = false;
$('btnRecall').addEventListener('click', () => {
  if (!hopWeights || recalling) return;
  recalling = true;
  const result = new Int8Array(hopGrid);
  let iter = 0;
  function recallTick() {
    const { changed } = recallStep(result);
    drawHopGrid(hopOut, result);
    iter++;
    if (changed && iter < 100) {
      requestAnimationFrame(recallTick);
    } else {
      recalling = false;
      updateHopStats();
    }
  }
  requestAnimationFrame(recallTick);
});

$('btnClearHop').addEventListener('click', () => {
  initHopfield();
  drawHopGrid(hopCanvas, hopGrid);
  drawHopGrid(hopOut, hopGrid);
  updateHopStats();
});

// Pattern gallery
document.querySelectorAll('[data-pattern]').forEach(btn => {
  btn.addEventListener('click', () => {
    loadPattern(btn.dataset.pattern);
    refreshHopUI();
  });
});

// ── Resizable Panels ──────────────────────────
function setupDrag(handleId, panelId, side) {
  const handle = $(handleId), panel = $(panelId);
  if (!handle || !panel) return;

  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    const startX = e.clientX, startW = panel.offsetWidth;
    handle.classList.add('active');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = e => {
      const dx = e.clientX - startX;
      const newW = side === 'left' ? startW + dx : startW - dx;
      panel.style.width = Math.max(140, Math.min(window.innerWidth * 0.45, newW)) + 'px';
      resizeLatticeCanvas(); drawLattice();
    };
    const onUp = () => {
      handle.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

setupDrag('dragLeft', 'panelLeft', 'left');
setupDrag('dragRight', 'panelRight', 'right');

// ── Keyboard Shortcuts ────────────────────────
document.addEventListener('keydown', e => {
  // Don't capture if typing in input
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  switch (e.key) {
    case ' ': e.preventDefault(); toggleRun(); break;
    case 's': if (!running) step(); break;
    case 'r': doReset(); break;
    case '1': switchTab('lattice'); break;
    case '2': switchTab('energy'); break;
    case '3': switchTab('phase'); break;
    case '4': switchTab('hopfield'); break;
    case '?': $('kbdOverlay')?.classList.toggle('on'); break;
    case 'Escape': $('kbdOverlay')?.classList.remove('on'); break;
  }
});

$('btnKbd')?.addEventListener('click', () => $('kbdOverlay')?.classList.toggle('on'));
$('kbdOverlay')?.addEventListener('click', e => {
  if (e.target === $('kbdOverlay')) $('kbdOverlay').classList.remove('on');
});

// ── ResizeObserver for charts ─────────────────
const chartObserver = new ResizeObserver(() => {
  if (document.querySelector('#tab-energy.on')) {
    drawChart($('energyChart'), energyHistory, '#ef4444');
    drawChart($('magChart'), magHistory, '#60a5fa');
  }
  if (document.querySelector('#tab-phase.on') && lastPhaseData) {
    drawPhaseChart(lastPhaseData);
  }
});
['energyChart', 'magChart', 'phaseChart'].forEach(id => {
  const el = $(id)?.parentElement;
  if (el) chartObserver.observe(el);
});

// ── Init ──────────────────────────────────────
readParams();

// Sync controls to params
$('sliderTemp').value = T; $('lblTemp').textContent = T.toFixed(2);
$('sliderSize').value = N; $('lblSize').textContent = N;
$('sliderJ').value = J; $('lblJ').textContent = J.toFixed(2);
$('sliderSpeed').value = speed; $('lblSpeed').textContent = speed;

makeGrid(N, 'random');
resizeLatticeCanvas();
drawLattice();
updateStats();
initHopfield();
drawHopGrid(hopCanvas, hopGrid);
drawHopGrid(hopOut, hopGrid);
updateHopStats();

window.addEventListener('resize', () => { resizeLatticeCanvas(); drawLattice(); });

// KaTeX equations
function renderEquations() {
  if (typeof katex === 'undefined') return setTimeout(renderEquations, 200);
  const eqs = {
    'eqMain': 'E = -\\sum_{\\langle i,j \\rangle} J_{ij}\\, s_i \\, s_j',
    'eqHamiltonian': String.raw`\underbrace{E = -\sum_{i<j} w_{ij}\, s_i\, s_j - \sum_i b_i\, s_i}_{\text{Hopfield}} \;\longleftrightarrow\; \underbrace{E = -\sum_{\langle i,j\rangle} J_{ij}\, \sigma_i\, \sigma_j - H\sum_i \sigma_i}_{\text{Ising}}`,
    'eqBoltz': String.raw`P(\text{flip}) = \begin{cases} 1 & \Delta E \le 0 \\ e^{-\Delta E / T} & \Delta E > 0 \end{cases}`,
    'eqCoupling': String.raw`E_{ij} = -J\, s_i\, s_j \;\Rightarrow\; \text{same sign} \to \text{lower } E`,
    'eqHebb': String.raw`w_{ij} = \sum_{\mu=1}^{P} s_i^{(\mu)}\, s_j^{(\mu)}`,
    'eqEnergyStat': String.raw`\frac{E}{N^2} = \frac{-\sum_{\langle i,j\rangle} J\, s_i\, s_j}{N^2}`
  };
  for (const [id, tex] of Object.entries(eqs)) {
    const el = $(id);
    if (el) katex.render(tex, el, { displayMode: true });
  }
}
renderEquations();
