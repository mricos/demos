# PixelVector Rendering System - Implementation Plan

## Current Status (Post-Refactor)

### ✅ Completed Architecture
1. **QuadrapongGame Refactor** (games/QuadrapongGame.js:1-473)
   - Clean IIFE pattern using shared core ECS
   - Public API: `QuadrapongGame.create(store, canvas)`
   - Self-contained game loop, rendering, ECS integration
   - In-game CLI terminal (help, pause, reset, stop commands)
   - **All tabs working:** Entities, Components, Systems, CLI, Scores

2. **Core ECS Shared Modules** (core/*.js)
   - window.ECS - Entity Component System
   - window.Components - Component factory functions
   - window.Systems - System update functions
   - ~800 lines of duplicate code eliminated

3. **Redux Flow Animation Fix** (event-handlers.js:26-29)
   - Force `animationEnabled = false` on page load
   - Prevents 250ms throttling on every Redux action
   - Smooth gameplay and tab switching

4. **Game Shortcut Handler** (command-processor.js:1674-1722)
   - Type `quadrapong` to auto-load and play
   - One-click game start

5. **PixelVector Renderer Core** (ui/pixel-vector-renderer.js - DISABLED)
   - Jet-field physics model implemented
   - Vector primitives extraction (circles → line segments)
   - Distance-based cell activation with exponential falloff
   - Gauge parameter controls laser spread
   - **Currently commented out in index.html to prevent errors**

---

## 🔧 Issues to Fix

### HIGH PRIORITY

#### 1. QuadrapongGame Not Loading
**Problem:** Game manager is calling `QuadrapongGame.create()` but the old `Quadrapong.js` (748 lines) still exists
**Files:**
- `/games/Quadrapong.js` (old IIFE with VT100, 3D rendering)
- `/games/QuadrapongGame.js` (new clean version)
- `game-manager.js:68, 163` - References `QuadrapongGame`

**Solution:**
- [ ] Remove or rename `Quadrapong.js` → `Quadrapong.legacy.js`
- [ ] Verify `QuadrapongGame.js` is loaded first in `index.html`
- [ ] Test game loads with `quadrapong` command

#### 2. Enable PixelVector Renderer
**Problem:** Script is commented out, no integration with QuadrapongGame
**Files:**
- `index.html:1212` - Commented out: `<!-- <script src="ui/pixel-vector-renderer.js"></script> -->`
- `QuadrapongGame.js:170-220` - Standard 2D rendering only

**Solution:**
- [ ] Uncomment PixelVector renderer script
- [ ] Add view mode support to QuadrapongGame
- [ ] Add `setViewMode(mode)` method
- [ ] Add `updatePixelVectorConfig(config)` method
- [ ] Add `renderPixelVector()` method using the renderer
- [ ] Test switching modes: `view pixelvector`

---

## 📋 Feature Implementation Plan

### Phase 1: PixelVector Integration (2-3 hours)

#### Step 1.1: Add View Mode to QuadrapongGame
```javascript
// In QuadrapongGame.js constructor
this.viewMode = null; // null (standard), 'pixelvector'
this.pixelVectorRenderer = null;

if (typeof PixelVectorRenderer !== 'undefined') {
  this.pixelVectorRenderer = new PixelVectorRenderer();
}
```

#### Step 1.2: Modify Render Method
```javascript
render() {
  const ctx = this.ctx;
  const { width, height } = this.canvas;

  // Clear canvas
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // Get renderables
  const renderables = this.ecs.query('renderable', 'position');

  // Choose renderer based on viewMode
  if (this.viewMode === 'pixelvector' && this.pixelVectorRenderer) {
    this.pixelVectorRenderer.render(ctx, this.canvas, renderables);
  } else {
    // Standard rendering
    this.renderStandard(ctx, renderables);
  }
}
```

#### Step 1.3: Add Public API Methods
```javascript
// Add to Game class
setViewMode(mode) {
  const validModes = [null, 'pixelvector'];
  if (validModes.includes(mode)) {
    this.viewMode = mode;
    return this;
  }
  console.warn(`Invalid view mode: ${mode}`);
  return this;
}

updatePixelVectorConfig(config) {
  if (this.pixelVectorRenderer) {
    this.pixelVectorRenderer.updateConfig(config);
    return this;
  }
  console.warn('PixelVector renderer not available');
  return this;
}
```

### Phase 2: CLI Commands (30 min)

#### Add to command-processor.js (after line 1512)
```javascript
} else if (cmd === 'view' && parts.length === 2 && parts[1] !== 'vt100') {
  // Set view mode: view <mode>
  const mode = parts[1].toLowerCase();
  const validModes = ['2d', 'pixelvector'];

  if (validModes.includes(mode)) {
    const state = store.getState();
    const gameId = state.games?.activeGame;

    if (!gameId) {
      cliLog('No active game. Start a game first.', 'error');
      return;
    }

    const gameInstance = state.games.instances[gameId]?.instance;
    if (gameInstance && typeof gameInstance.setViewMode === 'function') {
      const actualMode = mode === '2d' ? null : mode;
      gameInstance.setViewMode(actualMode);
      cliLog(`View mode: ${mode}`, 'success');
    }
  } else {
    cliLog('Available modes: 2d, pixelvector', 'error');
  }

} else if (cmd === 'topology') {
  // Topology commands for PixelVector mode
  const state = store.getState();
  const gameId = state.games?.activeGame;
  const gameInstance = state.games.instances[gameId]?.instance;

  if (!gameInstance || typeof gameInstance.updatePixelVectorConfig !== 'function') {
    cliLog('Game does not support topology parameters', 'error');
    return;
  }

  const param = cmdPath[1];

  if (!param || param === 'help') {
    cliLog('=== Topology Parameters ===', 'success');
    cliLog('  topology.gauge <value>   - Laser gauge (0.01-20)', 'info');
    cliLog('  topology.grid <size>     - Grid size (4-64 pixels)', 'info');
  } else if (param === 'gauge' && args.length === 1) {
    const value = parseFloat(args[0]);
    if (value >= 0.01 && value <= 20) {
      gameInstance.updatePixelVectorConfig({ gauge: value });
      cliLog(`Topology gauge: ${value}`, 'success');
    }
  } else if (param === 'grid' && args.length === 1) {
    const value = parseInt(args[0]);
    if (value >= 4 && value <= 64) {
      gameInstance.updatePixelVectorConfig({ gridSize: value });
      cliLog(`Grid size: ${value}px`, 'success');
    }
  }

} else if (cmd === 'view' && cmdPath[1] === 'vt100') {
```

### Phase 3: Topology UI Tab (1-2 hours)

#### Add to index.html Game Panel
```html
<!-- After Tines tab -->
<button class="game-tab" data-game="quadrapong" data-tab="topology">
  Topology
</button>

<!-- Add tab content -->
<div class="game-tab-content" data-tab-content="topology">
  <div class="topology-controls">
    <div class="control-group">
      <label>Gauge (laser beam size)</label>
      <input type="range" id="topology-gauge" min="0.01" max="20" step="0.01" value="1">
      <span id="topology-gauge-value">1.00</span>
    </div>

    <div class="control-group">
      <label>Grid Size (pixels)</label>
      <input type="range" id="topology-grid" min="4" max="64" step="2" value="16">
      <span id="topology-grid-value">16</span>
    </div>

    <p class="topology-help">
      <strong>Physical Model:</strong><br>
      • Low gauge (0.1-0.5): Sharp laser - tangent kiss activation<br>
      • High gauge (5-20): Broad disturbance field - neighbor influence
    </p>
  </div>
</div>
```

#### Add Event Handlers in event-handlers.js
```javascript
// Topology slider controls
const gaugeSlider = document.getElementById('topology-gauge');
const gaugeValue = document.getElementById('topology-gauge-value');
const gridSlider = document.getElementById('topology-grid');
const gridValue = document.getElementById('topology-grid-value');

if (gaugeSlider && gaugeValue) {
  gaugeSlider.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    gaugeValue.textContent = value.toFixed(2);

    const state = store.getState();
    const gameId = state.games?.activeGame;
    const gameInstance = state.games.instances[gameId]?.instance;

    if (gameInstance?.updatePixelVectorConfig) {
      gameInstance.updatePixelVectorConfig({ gauge: value });
    }
  });
}

if (gridSlider && gridValue) {
  gridSlider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    gridValue.textContent = value;

    const state = store.getState();
    const gameId = state.games?.activeGame;
    const gameInstance = state.games.instances[gameId]?.instance;

    if (gameInstance?.updatePixelVectorConfig) {
      gameInstance.updatePixelVectorConfig({ gridSize: value });
    }
  });
}
```

### Phase 4: Grid Dynamics (2-3 hours)

**Create:** `rendering/grid-dynamics.js` (~500 lines)

#### 4.1 Parallax Layers
Multi-depth grid slicing through 3D field space:

```javascript
class GridDynamics {
  constructor(config = {}) {
    this.parallaxLayers = config.parallaxLayers || 1;
    this.parallaxDepth = config.parallaxDepth || 0;
    this.layers = [];
    this.initializeLayers();
  }

  initializeLayers() {
    this.layers = [];
    for (let i = 0; i < this.parallaxLayers; i++) {
      this.layers.push({
        z: i * this.parallaxDepth,
        offset: { x: 0, y: 0 },
        opacity: 1 - (i * 0.2) // Back layers fade
      });
    }
  }

  updateParallax(cameraZ, cameraX, cameraY) {
    // Calculate offset for each layer based on depth
    this.layers.forEach(layer => {
      const parallaxFactor = layer.z / (cameraZ + layer.z);
      layer.offset.x = cameraX * parallaxFactor;
      layer.offset.y = cameraY * parallaxFactor;
    });
  }

  renderLayeredGrid(ctx, canvas, primitives, baseRenderer) {
    this.layers.forEach(layer => {
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.translate(layer.offset.x, layer.offset.y);

      // Render this depth layer
      baseRenderer.render(ctx, canvas, primitives);

      ctx.restore();
    });
  }
}
```

**Parameters:**
- `parallaxLayers` (1-5): Number of depth slices
- `parallaxDepth` (0-100): Z-spacing between layers

#### 4.2 Tile Displacement (Organic Grid Deformation)
Perlin noise-based displacement field:

```javascript
class DisplacementField {
  constructor(config = {}) {
    this.amount = config.displacementAmount || 0; // pixels
    this.frequency = config.displacementFrequency || 0.1;
    this.speed = config.displacementSpeed || 0;
    this.time = 0;
    this.noiseCache = new Map();
  }

  // Simplified 2D Perlin noise
  perlin2D(x, y) {
    // Use a noise library or implement basic Perlin
    // For now, simplified version:
    const seed = Math.sin(x * this.frequency) * Math.cos(y * this.frequency);
    return Math.sin(seed * 100) * 0.5 + 0.5; // Normalize to 0-1
  }

  getCellDisplacement(cellX, cellY, gameEvents) {
    this.time += this.speed * 0.016; // ~60fps

    // Base noise displacement
    let dx = this.perlin2D(cellX + this.time, cellY) * this.amount;
    let dy = this.perlin2D(cellX, cellY + this.time) * this.amount;

    // Game event influence (ball position creates local distortion)
    if (gameEvents.ballPosition) {
      const distToBall = Math.hypot(
        cellX - gameEvents.ballPosition.x,
        cellY - gameEvents.ballPosition.y
      );
      const influence = Math.max(0, 1 - distToBall / 100);
      dx += influence * 10 * Math.cos(this.time * 2);
      dy += influence * 10 * Math.sin(this.time * 2);
    }

    return { dx, dy };
  }

  applyToGrid(gridCells, gameEvents) {
    return gridCells.map(cell => {
      const { dx, dy } = this.getCellDisplacement(cell.x, cell.y, gameEvents);
      return {
        ...cell,
        renderX: cell.x + dx,
        renderY: cell.y + dy
      };
    });
  }
}
```

**Parameters:**
- `displacementAmount` (0-50): Max tile offset in pixels
- `displacementFrequency` (0.1-5): Noise frequency
- `displacementSpeed` (0-2): Animation speed

#### 4.3 Voronoi/Organic Cells
Blend square grid → organic cells:

```javascript
class VoronoiGrid {
  constructor(config = {}) {
    this.voronoiFactor = config.voronoiFactor || 0; // 0 = square, 1 = full Voronoi
    this.cellGrowth = config.cellGrowth || 1; // Size variation
    this.sites = [];
  }

  generateSites(gridCols, gridRows, cellSize) {
    this.sites = [];
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const baseX = col * cellSize + cellSize / 2;
        const baseY = row * cellSize + cellSize / 2;

        // Add random jitter based on voronoiFactor
        const jitterX = (Math.random() - 0.5) * cellSize * this.voronoiFactor;
        const jitterY = (Math.random() - 0.5) * cellSize * this.voronoiFactor;

        this.sites.push({
          x: baseX + jitterX,
          y: baseY + jitterY,
          growth: 0.8 + Math.random() * 0.4 * this.cellGrowth
        });
      }
    }
  }

  renderOrganicCell(ctx, site, color, intensity) {
    // Calculate Voronoi cell boundaries (expensive, cache if needed)
    // For performance, approximate with circles
    const radius = site.growth * this.cellSize * 0.5;

    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${intensity})`;
    ctx.beginPath();
    ctx.arc(site.x, site.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
```

**Parameters:**
- `voronoiFactor` (0-1): Square (0) to organic (1)
- `cellGrowth` (0.5-2): Cell size variation

#### 4.4 Wave Propagation
2D wave simulation for collision events:

```javascript
class WaveField {
  constructor(gridCols, gridRows) {
    this.cols = gridCols;
    this.rows = gridRows;

    // Wave height map (2D array)
    this.current = new Float32Array(gridCols * gridRows);
    this.previous = new Float32Array(gridCols * gridRows);

    this.waveSpeed = 10; // units/second
    this.waveAmplitude = 20; // pixels
    this.waveDamping = 0.99; // Energy loss per frame
  }

  createWave(x, y, amplitude, frequency) {
    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);
    const idx = row * this.cols + col;

    if (idx >= 0 && idx < this.current.length) {
      this.current[idx] = amplitude;
    }
  }

  propagate(deltaTime) {
    const c = this.waveSpeed * deltaTime; // Wave speed constant

    for (let row = 1; row < this.rows - 1; row++) {
      for (let col = 1; col < this.cols - 1; col++) {
        const idx = row * this.cols + col;

        // 2D wave equation (simplified)
        const left = this.current[idx - 1];
        const right = this.current[idx + 1];
        const up = this.current[idx - this.cols];
        const down = this.current[idx + this.cols];
        const center = this.current[idx];

        // Laplacian approximation
        const laplacian = (left + right + up + down - 4 * center);

        // Wave equation: d²u/dt² = c² ∇²u
        const newValue = 2 * center - this.previous[idx] + c * c * laplacian;

        // Store in temp, apply damping
        this.previous[idx] = center;
        this.current[idx] = newValue * this.waveDamping;
      }
    }
  }

  getDisplacement(cellX, cellY) {
    const col = Math.floor(cellX);
    const row = Math.floor(cellY);
    const idx = row * this.cols + col;

    if (idx >= 0 && idx < this.current.length) {
      return this.current[idx] * this.waveAmplitude;
    }
    return 0;
  }
}
```

**Parameters:**
- `waveSpeed` (0-10): Ripple propagation speed
- `waveAmplitude` (0-20): Displacement amount
- `waveDamping` (0.8-1): Energy loss per frame

#### 4.5 Integration with PixelVector Renderer

Modify `PixelVectorRenderer` to use dynamics:

```javascript
// In pixel-vector-renderer.js
import { GridDynamics } from '../rendering/grid-dynamics.js';

class PixelVectorRendererClass {
  constructor(config = {}) {
    // ... existing code ...

    this.dynamics = new GridDynamics({
      parallaxLayers: config.parallaxLayers || 1,
      parallaxDepth: config.parallaxDepth || 0,
      displacementAmount: config.displacementAmount || 0,
      displacementFrequency: config.displacementFrequency || 0.1,
      displacementSpeed: config.displacementSpeed || 0,
      voronoiFactor: config.voronoiFactor || 0,
      cellGrowth: config.cellGrowth || 1,
      waveSpeed: config.waveSpeed || 10,
      waveAmplitude: config.waveAmplitude || 20,
      waveDamping: config.waveDamping || 0.99
    });
  }

  render(ctx, canvas, entities, gameEvents = {}) {
    // Apply dynamics before rendering
    const displacedGrid = this.dynamics.applyDisplacement(this.gridCells, gameEvents);
    const wavesApplied = this.dynamics.applyWaves(displacedGrid);

    // Render with dynamics
    this.renderDynamicGrid(ctx, canvas, entities, wavesApplied);
  }
}
```

### Phase 5: ECS Integration for Wave Triggers (1 hour)

**Goal:** Game events trigger field disturbances

#### 5.1 Add TopologyInfluence Component

In `core/components.js`:

```javascript
// Add to Components object
TopologyInfluence: (waveStrength = 1.0, rippleRadius = 50) => ({
  waveStrength,      // How much this entity disturbs the field
  rippleRadius,      // Radius of influence
  lastCollisionTime: 0
}),
```

#### 5.2 Modify Collision System to Trigger Waves

In `core/systems.js` - Update `Systems.Collision`:

```javascript
// Inside collision handler (when ball hits paddle)
if (collision detected) {
  // ... existing collision logic ...

  // TOPOLOGY INTEGRATION: Create wave at collision point
  if (ball.topologyInfluence && window.gridDynamics) {
    const collisionX = ball.position.x + ball.aabb.width / 2;
    const collisionY = ball.position.y + ball.aabb.height / 2;

    window.gridDynamics.createWave(
      collisionX,
      collisionY,
      ball.topologyInfluence.waveStrength * 10, // Amplitude
      1.0 // Frequency
    );

    ball.topologyInfluence.lastCollisionTime = performance.now();
  }

  // Play collision sound
  // ... existing sound code ...
}
```

#### 5.3 Add Ball Wake Trail (Continuous Influence)

Create a new system in `core/systems.js`:

```javascript
// Add to Systems object
TopologyWake: (entities, deltaTime, canvas) => {
  // Query entities that influence topology
  const influencers = entities.filter(e =>
    e.topologyInfluence && e.velocity && e.position
  );

  influencers.forEach(entity => {
    if (!window.gridDynamics) return;

    const { x, y } = entity.position;
    const speed = Math.hypot(entity.velocity.vx, entity.velocity.vy);

    // Faster movement = stronger wake
    const wakeStrength = entity.topologyInfluence.waveStrength * speed * 0.1;

    if (wakeStrength > 0.1) {
      window.gridDynamics.createWave(
        x + (entity.aabb?.width || 0) / 2,
        y + (entity.aabb?.height || 0) / 2,
        wakeStrength,
        0.5 // Subtle, continuous ripple
      );
    }
  });
}
```

#### 5.4 Register TopologyWake System

In `QuadrapongGame.js`:

```javascript
initialize() {
  // ... create entities ...

  // Add TopologyInfluence to ball
  const ballEntity = this.ecs.entities.get(this.entities.ball);
  ballEntity.topologyInfluence = window.Components.TopologyInfluence(2.0, 80);

  // Register systems
  this.ecs.addSystem(Systems.Movement);
  this.ecs.addSystem(Systems.PaddleAI);
  this.ecs.addSystem(Systems.Collision);
  this.ecs.addSystem(Systems.Scoring);
  this.ecs.addSystem(Systems.TopologyWake); // NEW: Field disturbance system

  console.log('[QUADRAPONG] Game initialized with ECS + Topology');
  return this;
}
```

#### 5.5 Connect Grid Dynamics to Game

In `QuadrapongGame.js`:

```javascript
constructor(store, canvas) {
  // ... existing code ...

  // Initialize grid dynamics (if PixelVector renderer available)
  if (typeof PixelVectorRenderer !== 'undefined') {
    this.pixelVectorRenderer = new PixelVectorRenderer();

    // Make grid dynamics globally accessible for systems
    window.gridDynamics = this.pixelVectorRenderer.dynamics;
  }
}

// In render method - pass game events
render() {
  // ... existing code ...

  if (this.viewMode === 'pixelvector' && this.pixelVectorRenderer) {
    // Get ball entity for game events
    const ballEntity = this.ecs.entities.get(this.entities.ball);

    const gameEvents = {
      ballPosition: ballEntity?.position,
      ballVelocity: ballEntity?.velocity,
      deltaTime: this.lastDeltaTime
    };

    this.pixelVectorRenderer.render(ctx, this.canvas, renderables, gameEvents);
  } else {
    // Standard rendering
    this.renderStandard(ctx, renderables);
  }
}
```

#### Event Triggers Summary

**Ball Collision → Large Ripple:**
- When ball hits paddle
- Wave amplitude = `topologyInfluence.waveStrength * 10`
- Visible shockwave emanates from impact point

**Ball Movement → Wake Trail:**
- Continuous while ball is moving
- Wake strength ∝ ball speed
- Subtle ripples follow ball trajectory

**Score Event → Field Distortion:**
```javascript
// In Systems.Scoring - when score changes
if (scoreChanged) {
  // Create massive wave from scoring edge
  window.gridDynamics?.createWave(
    edgeX, edgeY,
    50, // Large amplitude
    2.0 // High frequency
  );
}
```

---

## 🎯 Immediate Next Steps

1. **Fix Game Loading**
   ```bash
   # Rename old file
   mv games/Quadrapong.js games/Quadrapong.legacy.js

   # Test
   quadrapong  # Should load new QuadrapongGame
   ```

2. **Enable PixelVector Renderer**
   ```html
   <!-- Uncomment in index.html:1212 -->
   <script src="ui/pixel-vector-renderer.js"></script>
   ```

3. **Add View Mode Support**
   - Modify `QuadrapongGame.js` (Steps 1.1, 1.2, 1.3 above)
   - Test: `view pixelvector`

4. **Add CLI Commands**
   - Add to `command-processor.js` (Phase 2)
   - Test: `topology.gauge 2`, `topology.grid 24`

5. **Add Topology Tab** (optional for MVP)
   - Add HTML UI
   - Add event handlers
   - Test real-time slider updates

---

## 🧪 Testing Checklist

- [ ] `quadrapong` loads game without flicker
- [ ] Tabs work (entities, components, systems, tines)
- [ ] Game plays smoothly (no Redux throttling)
- [ ] `view pixelvector` switches rendering mode
- [ ] `topology.gauge 0.3` makes sharp laser
- [ ] `topology.gauge 5.0` makes broad glow
- [ ] `topology.grid 8` makes fine grid
- [ ] `topology.grid 32` makes coarse grid
- [ ] Ball and paddles render as glowing pixel vectors
- [ ] Performance: 60fps with PixelVector mode

---

## 📝 Notes

**Physical Model Concept:**
- Grid is 2D slice (z=0) through 3D "global fiber" field
- Vector entities are laser jets (cylindrical beams)
- Tangent kiss: cylinder just touches cell → activation
- Gauge: controls cylinder radius and neighbor influence
- Normal distance: perpendicular from jet shell to cell center
- Exponential falloff: intensity = exp(-distance/radius * 3)

**Architecture:**
- QuadrapongGame: Clean ECS-based game (473 lines)
- PixelVectorRenderer: Jet-field physics renderer (264 lines)
- Command system: CLI controls for view mode and topology
- UI system: Real-time slider controls (future)
