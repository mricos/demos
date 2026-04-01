// ── Hopfield Network Module ───────────────────
const $ = id => document.getElementById(id);

export const HN = 10;
export let hopGrid = new Int8Array(HN * HN);
export let hopWeights = null;
export let storedPatterns = [];

// ── Preset patterns (10x10) ──────────────────
const PATTERNS = {
  L: [
    0,0,0,0,0,0,0,0,0,0,
    0,1,0,0,0,0,0,0,0,0,
    0,1,0,0,0,0,0,0,0,0,
    0,1,0,0,0,0,0,0,0,0,
    0,1,0,0,0,0,0,0,0,0,
    0,1,0,0,0,0,0,0,0,0,
    0,1,0,0,0,0,0,0,0,0,
    0,1,1,1,1,1,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,
  ],
  T: [
    0,0,0,0,0,0,0,0,0,0,
    0,1,1,1,1,1,1,1,0,0,
    0,0,0,0,1,0,0,0,0,0,
    0,0,0,0,1,0,0,0,0,0,
    0,0,0,0,1,0,0,0,0,0,
    0,0,0,0,1,0,0,0,0,0,
    0,0,0,0,1,0,0,0,0,0,
    0,0,0,0,1,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,
  ],
  X: [
    0,0,0,0,0,0,0,0,0,0,
    0,1,0,0,0,0,0,1,0,0,
    0,0,1,0,0,0,1,0,0,0,
    0,0,0,1,0,1,0,0,0,0,
    0,0,0,0,1,0,0,0,0,0,
    0,0,0,1,0,1,0,0,0,0,
    0,0,1,0,0,0,1,0,0,0,
    0,1,0,0,0,0,0,1,0,0,
    0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,
  ],
  smiley: [
    0,0,0,0,0,0,0,0,0,0,
    0,0,0,1,1,1,1,0,0,0,
    0,0,1,0,0,0,0,1,0,0,
    0,1,0,1,0,0,1,0,1,0,
    0,1,0,0,0,0,0,0,1,0,
    0,1,0,1,0,0,1,0,1,0,
    0,1,0,0,1,1,0,0,1,0,
    0,0,1,0,0,0,0,1,0,0,
    0,0,0,1,1,1,1,0,0,0,
    0,0,0,0,0,0,0,0,0,0,
  ]
};

export function loadPattern(name) {
  const pat = PATTERNS[name];
  if (!pat) return;
  for (let i = 0; i < HN * HN; i++) hopGrid[i] = pat[i] ? 1 : -1;
}

export function initHopfield() {
  hopGrid.fill(-1);
  storedPatterns = [];
  hopWeights = new Float32Array(HN * HN * HN * HN);
}

export function storePattern() {
  storedPatterns.push(new Int8Array(hopGrid));
  const n = HN * HN;
  hopWeights = new Float32Array(n * n);
  for (const pat of storedPatterns)
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        const w = pat[i] * pat[j];
        hopWeights[i * n + j] += w;
        hopWeights[j * n + i] += w;
      }
}

export function addNoise(amount = 0.3) {
  for (let i = 0; i < HN * HN; i++)
    if (Math.random() < amount) hopGrid[i] *= -1;
}

// Single recall iteration, returns {changed, result}
export function recallStep(state) {
  const n = HN * HN;
  let changed = false;
  for (let i = 0; i < n; i++) {
    let h = 0;
    for (let j = 0; j < n; j++) h += hopWeights[i * n + j] * state[j];
    const newS = h >= 0 ? 1 : -1;
    if (newS !== state[i]) { state[i] = newS; changed = true; }
  }
  return { changed, state };
}

// Full recall (instant)
export function recallFull() {
  if (!hopWeights) return null;
  const result = new Int8Array(hopGrid);
  for (let iter = 0; iter < 100; iter++) {
    const { changed } = recallStep(result);
    if (!changed) break;
  }
  return result;
}

// Hopfield energy for a state
export function hopfieldEnergy(state) {
  if (!hopWeights) return 0;
  const n = HN * HN;
  let E = 0;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      E -= hopWeights[i * n + j] * state[i] * state[j];
  return E;
}

// ── Drawing (drag-to-paint) ──────────────────
export function drawHopGrid(canvas, data) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 300;
  canvas.width = cssW * dpr;
  canvas.height = cssW * dpr;
  ctx.scale(dpr, dpr);
  const W = cssW, cell = W / HN;
  for (let r = 0; r < HN; r++)
    for (let c = 0; c < HN; c++) {
      ctx.fillStyle = data[r * HN + c] === 1 ? '#60a5fa' : '#1e293b';
      ctx.fillRect(c * cell + 1, r * cell + 1, cell - 2, cell - 2);
    }
  ctx.strokeStyle = '#0a0f1a'; ctx.lineWidth = 1;
  for (let i = 0; i <= HN; i++) {
    ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, W); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(W, i * cell); ctx.stroke();
  }
}

function cellFromEvent(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  const cssW = canvas.clientWidth || 300;
  const cell = cssW / HN;
  const c = Math.floor((e.clientX - rect.left) / cell);
  const r = Math.floor((e.clientY - rect.top) / cell);
  return (r >= 0 && r < HN && c >= 0 && c < HN) ? { r, c } : null;
}

export function setupHopfieldDraw(canvas, onChange) {
  let painting = false;
  let paintVal = 1;
  let lastCell = null;

  function paint(e) {
    const pos = cellFromEvent(canvas, e);
    if (!pos) return;
    const key = pos.r * HN + pos.c;
    if (lastCell === key) return;
    lastCell = key;
    hopGrid[key] = paintVal;
    onChange();
  }

  canvas.addEventListener('mousedown', e => {
    const pos = cellFromEvent(canvas, e);
    if (!pos) return;
    painting = true;
    const key = pos.r * HN + pos.c;
    paintVal = hopGrid[key] === 1 ? -1 : 1;
    hopGrid[key] = paintVal;
    lastCell = key;
    onChange();
  });
  canvas.addEventListener('mousemove', e => { if (painting) paint(e); });
  document.addEventListener('mouseup', () => { painting = false; lastCell = null; });
}

export { PATTERNS };
