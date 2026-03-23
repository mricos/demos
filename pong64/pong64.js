/**
 * Pong64 - The ball is a 64-particle swarm
 *
 * Game mechanics:
 * - "Ball" is 64 particles with flocking behavior (Boids)
 * - Fantasy physics: particles coalesce near boundaries (looks like regular pong up close)
 * - Paddle erosion: each hit chips the paddle (8 segments, one lost per hit)
 * - Natural endgame: both paddles degrade, someone gets the last shot
 *
 * MIDI control: flock parameters controllable via tetra midi-mp (CC 50-57)
 */

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// --- Game State ---
const W = canvas.width;
const H = canvas.height;
const PARTICLE_COUNT = 64;
const PADDLE_SEGMENTS = 8;
const PADDLE_WIDTH = 12;
const PADDLE_SEGMENT_H = H / PADDLE_SEGMENTS / 1.5; // each segment height
const PADDLE_X_OFFSET = 30;

const state = {
  score: [0, 0],
  paddles: [
    { y: H / 2, segments: new Array(PADDLE_SEGMENTS).fill(true), vy: 0 },
    { y: H / 2, segments: new Array(PADDLE_SEGMENTS).fill(true), vy: 0 }
  ],
  particles: [],
  swarmCenter: { x: W / 2, y: H / 2 },
  swarmVelocity: { x: 4, y: 2 },
  serving: true,
  gameOver: false
};

// Flock parameters (MIDI-controllable)
const flock = {
  separation: 1.0,
  alignment: 1.0,
  cohesion: 1.0,
  coalescence: 0.5,  // boundary attraction (0=free swarm, 1=tight ball near walls)
  maxSpeed: 8,
  turbulence: 0.1,
  neighborRadius: 60
};

// --- Particle System ---
function initParticles() {
  state.particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const row = Math.floor(i / 8);
    const col = i % 8;
    state.particles.push({
      x: state.swarmCenter.x + (col - 3.5) * 6,
      y: state.swarmCenter.y + (row - 3.5) * 6,
      vx: state.swarmVelocity.x + (Math.random() - 0.5) * 2,
      vy: state.swarmVelocity.y + (Math.random() - 0.5) * 2
    });
  }
}

function updateSwarmCenter() {
  let cx = 0, cy = 0;
  for (const p of state.particles) {
    cx += p.x;
    cy += p.y;
  }
  state.swarmCenter.x = cx / PARTICLE_COUNT;
  state.swarmCenter.y = cy / PARTICLE_COUNT;
}

/**
 * Boids flocking with boundary coalescence
 * Near walls/paddles, separation drops and cohesion increases,
 * making the swarm look like a solid ball
 */
function updateParticles() {
  const distToWall = Math.min(
    state.swarmCenter.x,
    W - state.swarmCenter.x,
    state.swarmCenter.y,
    H - state.swarmCenter.y
  );
  const wallFactor = Math.max(0, 1 - distToWall / (W * 0.3));
  const effectiveCoalescence = flock.coalescence * wallFactor;

  // Adjusted weights: near walls, cohesion up, separation down
  const sepW = flock.separation * (1 - effectiveCoalescence * 0.8);
  const aliW = flock.alignment;
  const cohW = flock.cohesion * (1 + effectiveCoalescence * 2);

  for (let i = 0; i < state.particles.length; i++) {
    const p = state.particles[i];
    let sepX = 0, sepY = 0;
    let aliX = 0, aliY = 0;
    let cohX = 0, cohY = 0;
    let neighbors = 0;

    for (let j = 0; j < state.particles.length; j++) {
      if (i === j) continue;
      const other = state.particles[j];
      const dx = other.x - p.x;
      const dy = other.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < flock.neighborRadius && dist > 0) {
        // Separation: steer away from close neighbors
        sepX -= dx / dist;
        sepY -= dy / dist;
        // Alignment: match velocity
        aliX += other.vx;
        aliY += other.vy;
        // Cohesion: steer toward center of neighbors
        cohX += other.x;
        cohY += other.y;
        neighbors++;
      }
    }

    if (neighbors > 0) {
      aliX /= neighbors;
      aliY /= neighbors;
      cohX = cohX / neighbors - p.x;
      cohY = cohY / neighbors - p.y;
    }

    // Apply forces
    p.vx += sepX * sepW * 0.3 + aliX * aliW * 0.05 + cohX * cohW * 0.02;
    p.vy += sepY * sepW * 0.3 + aliY * aliW * 0.05 + cohY * cohW * 0.02;

    // Swarm drift (overall ball direction)
    p.vx += (state.swarmVelocity.x - p.vx) * 0.05;
    p.vy += (state.swarmVelocity.y - p.vy) * 0.05;

    // Turbulence
    p.vx += (Math.random() - 0.5) * flock.turbulence * 2;
    p.vy += (Math.random() - 0.5) * flock.turbulence * 2;

    // Speed limit
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (speed > flock.maxSpeed) {
      p.vx = (p.vx / speed) * flock.maxSpeed;
      p.vy = (p.vy / speed) * flock.maxSpeed;
    }

    // Move
    p.x += p.vx;
    p.y += p.vy;

    // Soft boundary (keep particles roughly on screen)
    if (p.y < 5) p.vy = Math.abs(p.vy) * 0.8;
    if (p.y > H - 5) p.vy = -Math.abs(p.vy) * 0.8;
  }

  updateSwarmCenter();
}

// --- Paddle Logic ---
function getPaddleTop(paddle) {
  const totalH = PADDLE_SEGMENTS * PADDLE_SEGMENT_H;
  return paddle.y - totalH / 2;
}

function getPaddleSegmentY(paddle, segIndex) {
  return getPaddleTop(paddle) + segIndex * PADDLE_SEGMENT_H;
}

function paddleAliveSegments(paddle) {
  return paddle.segments.filter(Boolean).length;
}

function hitPaddle(paddleIndex) {
  const paddle = state.paddles[paddleIndex];
  // Find a random alive segment to destroy
  const alive = [];
  paddle.segments.forEach((s, i) => { if (s) alive.push(i); });
  if (alive.length > 0) {
    const victim = alive[Math.floor(Math.random() * alive.length)];
    paddle.segments[victim] = false;
  }
}

// --- Collision & Scoring ---
function checkCollisions() {
  const cx = state.swarmCenter.x;
  const cy = state.swarmCenter.y;

  // Top/bottom bounce
  if (cy < 15 || cy > H - 15) {
    state.swarmVelocity.y *= -1;
  }

  // Left paddle collision
  const lp = state.paddles[0];
  const lpTop = getPaddleTop(lp);
  const lpBot = lpTop + PADDLE_SEGMENTS * PADDLE_SEGMENT_H;
  if (cx < PADDLE_X_OFFSET + PADDLE_WIDTH + 10 && cx > PADDLE_X_OFFSET) {
    // Check if swarm center hits an alive segment
    const segIndex = Math.floor((cy - lpTop) / PADDLE_SEGMENT_H);
    if (segIndex >= 0 && segIndex < PADDLE_SEGMENTS && lp.segments[segIndex]) {
      state.swarmVelocity.x = Math.abs(state.swarmVelocity.x);
      // Add angle based on where it hit
      state.swarmVelocity.y += (cy - lp.y) * 0.03;
      hitPaddle(0);
    } else if (cy >= lpTop && cy <= lpBot) {
      // Hit a gap in the paddle — ball passes through
    }
  }

  // Right paddle collision
  const rp = state.paddles[1];
  const rpTop = getPaddleTop(rp);
  const rpBot = rpTop + PADDLE_SEGMENTS * PADDLE_SEGMENT_H;
  if (cx > W - PADDLE_X_OFFSET - PADDLE_WIDTH - 10 && cx < W - PADDLE_X_OFFSET) {
    const segIndex = Math.floor((cy - rpTop) / PADDLE_SEGMENT_H);
    if (segIndex >= 0 && segIndex < PADDLE_SEGMENTS && rp.segments[segIndex]) {
      state.swarmVelocity.x = -Math.abs(state.swarmVelocity.x);
      state.swarmVelocity.y += (cy - rp.y) * 0.03;
      hitPaddle(1);
    }
  }

  // Scoring (ball past paddles)
  if (cx < 0) {
    state.score[1]++;
    resetBall(1);
  } else if (cx > W) {
    state.score[0]++;
    resetBall(0);
  }
}

function resetBall(direction) {
  state.swarmCenter.x = W / 2;
  state.swarmCenter.y = H / 2;
  state.swarmVelocity.x = direction === 0 ? -4 : 4;
  state.swarmVelocity.y = (Math.random() - 0.5) * 4;
  initParticles();

  // Check game over (both paddles dead)
  if (paddleAliveSegments(state.paddles[0]) === 0 && paddleAliveSegments(state.paddles[1]) === 0) {
    state.gameOver = true;
  }
}

// --- Input ---
const keys = {};
document.addEventListener('keydown', e => { keys[e.key] = true; });
document.addEventListener('keyup', e => { keys[e.key] = false; });

function handleInput() {
  const speed = 6;
  // Player 1: W/S
  if (keys['w'] || keys['W']) state.paddles[0].y -= speed;
  if (keys['s'] || keys['S']) state.paddles[0].y += speed;
  // Player 2: Arrow Up/Down
  if (keys['ArrowUp']) state.paddles[1].y -= speed;
  if (keys['ArrowDown']) state.paddles[1].y += speed;

  // Clamp
  for (const p of state.paddles) {
    p.y = Math.max(60, Math.min(H - 60, p.y));
  }
}

// --- Rendering ---
function render() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  // Center line
  ctx.setLineDash([8, 8]);
  ctx.strokeStyle = '#222';
  ctx.beginPath();
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);
  ctx.stroke();
  ctx.setLineDash([]);

  // Paddles
  for (let pi = 0; pi < 2; pi++) {
    const paddle = state.paddles[pi];
    const px = pi === 0 ? PADDLE_X_OFFSET : W - PADDLE_X_OFFSET - PADDLE_WIDTH;

    for (let si = 0; si < PADDLE_SEGMENTS; si++) {
      if (!paddle.segments[si]) continue;
      const sy = getPaddleSegmentY(paddle, si);
      const health = paddleAliveSegments(paddle) / PADDLE_SEGMENTS;
      const r = Math.floor(255 * (1 - health));
      const g = Math.floor(255 * health);
      ctx.fillStyle = `rgb(${r}, ${g}, 100)`;
      ctx.fillRect(px, sy, PADDLE_WIDTH, PADDLE_SEGMENT_H - 2);
    }
  }

  // Particles
  const distToWall = Math.min(
    state.swarmCenter.x,
    W - state.swarmCenter.x
  );
  const spread = Math.min(1, distToWall / (W * 0.25));

  for (const p of state.particles) {
    const alpha = 0.5 + spread * 0.5;
    const size = 2 + (1 - spread) * 2; // bigger when coalesced
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
  }

  // Paddle health display
  updateHealthDisplay();
}

function updateHealthDisplay() {
  for (let pi = 0; pi < 2; pi++) {
    const el = document.getElementById(`p${pi + 1}-health`);
    const paddle = state.paddles[pi];
    let bar = '';
    for (let si = 0; si < PADDLE_SEGMENTS; si++) {
      bar += paddle.segments[si] ? '█' : '░';
    }
    el.textContent = bar;
  }
  document.getElementById('p1-score').textContent = state.score[0];
  document.getElementById('p2-score').textContent = state.score[1];
}

// --- Game Loop ---
let lastTime = 0;
let frameCount = 0;

function gameLoop(timestamp) {
  frameCount++;

  if (!state.gameOver) {
    handleInput();
    updateParticles();
    checkCollisions();
  }

  render();

  if (state.gameOver) {
    ctx.fillStyle = '#fff';
    ctx.font = '48px Monaco, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', W / 2, H / 2);
    ctx.font = '18px Monaco, Consolas, monospace';
    ctx.fillText(`${state.score[0]} - ${state.score[1]}`, W / 2, H / 2 + 40);
  }

  requestAnimationFrame(gameLoop);
}

// FPS counter
setInterval(() => {
  document.getElementById('fps').textContent = `${frameCount} fps`;
  frameCount = 0;
}, 1000);

// --- UI Controls ---
function initControls() {
  const controls = {
    separation: { el: 'separation', val: 'sep-val', key: 'separation' },
    alignment: { el: 'alignment', val: 'ali-val', key: 'alignment' },
    cohesion: { el: 'cohesion', val: 'coh-val', key: 'cohesion' },
    coalescence: { el: 'coalescence', val: 'coal-val', key: 'coalescence' },
    turbulence: { el: 'turbulence', val: 'turb-val', key: 'turbulence' }
  };

  Object.values(controls).forEach(c => {
    const input = document.getElementById(c.el);
    if (!input) return;
    input.addEventListener('input', e => {
      const v = parseFloat(e.target.value);
      flock[c.key] = v;
      document.getElementById(c.val).textContent = v.toFixed(2);
    });
  });
}

// --- WebSocket (optional, for MIDI control) ---
let ws = null;

function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  try {
    ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      document.getElementById('ws-dot').className = 'dot on';
    };
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'parameter') {
          const { parameter, value } = msg.data;
          if (flock.hasOwnProperty(parameter)) {
            flock[parameter] = value;
          }
        }
      } catch (e) { /* ignore */ }
    };
    ws.onclose = () => {
      document.getElementById('ws-dot').className = 'dot off';
      setTimeout(initWebSocket, 3000);
    };
  } catch (e) {
    // No server, running standalone — that's fine
  }
}

// --- Init ---
function init() {
  initParticles();
  initControls();
  initWebSocket();
  requestAnimationFrame(gameLoop);
}

init();
