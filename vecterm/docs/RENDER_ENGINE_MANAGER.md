# Render Engine Manager - Architecture & Implementation Plan

## Overview

Create a centralized Render Engine Manager to abstract rendering away from game logic, enable renderer hot-swapping, and provide runtime introspection.

## Goals

1. **Decouple**: Separate game logic from rendering
2. **Abstract**: Games describe WHAT to render, not HOW
3. **Flexible**: Switch renderers at runtime
4. **Observable**: Track active renderer, performance metrics
5. **Extensible**: Easy to add new renderers

## Proposed Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────┐
│                    GAME INSTANCE                        │
│  - Owns ECS, entities, game logic                      │
│  - NO rendering code                                    │
│  - Emits render events                                 │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓ (entities, camera)
┌─────────────────────────────────────────────────────────┐
│              RENDER ENGINE MANAGER                      │
│  - Registry of available renderers                     │
│  - Active renderer selection                           │
│  - Renderer lifecycle (init, update, destroy)          │
│  - Performance tracking                                │
│  - Footer status updates                               │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓ (delegated rendering)
      ┌────────────┼────────────┬─────────────┐
      ↓            ↓            ↓             ↓
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Canvas2D │ │  WebGL   │ │ VScope   │ │PixelVec  │
│ Renderer │ │ Renderer │ │ Renderer │ │ Renderer │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

## File Structure

```
core/
  rendering/
    RenderEngineManager.js    # Main manager class
    BaseRenderer.js            # Abstract base class for renderers
    Canvas2DRenderer.js        # Canvas 2D implementation
    WebGLRenderer.js           # WebGL/3D implementation
    VScopeRenderer.js          # Terminal-style scanlines
    PixelVectorRenderer.js     # Retro CRT aesthetic

games/
  QuadrapongGame.js            # Updated to use renderer
```

## Implementation

### 1. BaseRenderer (Abstract Class)

```javascript
// core/rendering/BaseRenderer.js

/**
 * Abstract base class for all renderers
 * Defines the interface that all renderers must implement
 */
class BaseRenderer {
  constructor(canvas) {
    if (new.target === BaseRenderer) {
      throw new Error('BaseRenderer is abstract');
    }
    this.canvas = canvas;
    this.name = 'BaseRenderer';
    this.capabilities = {
      supports3D: false,
      supportsPostProcessing: false,
      supportsParticles: false
    };
  }

  /**
   * Initialize renderer (setup context, shaders, etc.)
   * @returns {Promise<void>}
   */
  async init() {
    throw new Error('init() must be implemented');
  }

  /**
   * Render a frame
   * @param {Array} entities - Entities with renderable components
   * @param {Camera} camera - Camera for transforms
   * @param {Object} options - Renderer-specific options
   */
  render(entities, camera, options = {}) {
    throw new Error('render() must be implemented');
  }

  /**
   * Cleanup resources
   */
  destroy() {
    throw new Error('destroy() must be implemented');
  }

  /**
   * Get renderer info for status display
   * @returns {Object} { name, fps, drawCalls, etc. }
   */
  getInfo() {
    return {
      name: this.name,
      type: this.constructor.name,
      capabilities: this.capabilities
    };
  }

  /**
   * Handle resize
   */
  resize(width, height) {
    // Default: do nothing
  }
}

export { BaseRenderer };
```

### 2. Canvas2DRenderer (Concrete Implementation)

```javascript
// core/rendering/Canvas2DRenderer.js

import { BaseRenderer } from './BaseRenderer.js';

class Canvas2DRenderer extends BaseRenderer {
  constructor(canvas) {
    super(canvas);
    this.name = 'Canvas 2D';
    this.ctx = null;
    this.frameCount = 0;
    this.lastFpsUpdate = 0;
    this.fps = 0;
  }

  async init() {
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) {
      throw new Error('Failed to get 2D context');
    }
    console.log('[Canvas2DRenderer] Initialized');
  }

  render(entities, camera, options = {}) {
    const ctx = this.ctx;
    const { width, height } = this.canvas;

    // Clear
    ctx.fillStyle = options.backgroundColor || '#000000';
    ctx.fillRect(0, 0, width, height);

    // Apply camera transform
    camera.applyTransform(ctx);

    // Draw grid (if enabled)
    if (options.showGrid) {
      this.drawGrid(ctx, camera);
    }

    // Render entities
    entities.forEach(entity => {
      if (!entity.renderable || !entity.renderable.visible) return;

      ctx.fillStyle = entity.renderable.color;

      if (entity.renderable.type === 'rect') {
        const w = entity.aabb ? entity.aabb.width : 0.1;
        const h = entity.aabb ? entity.aabb.height : 0.1;
        ctx.fillRect(entity.position.x, entity.position.y, w, h);
      } else if (entity.renderable.type === 'circle') {
        const radius = entity.ball ? entity.ball.size / 2 : 0.05;
        ctx.beginPath();
        ctx.arc(
          entity.position.x + radius,
          entity.position.y + radius,
          radius,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    });

    // Restore transform
    camera.restoreTransform(ctx);

    // Update FPS
    this.updateFPS();
  }

  drawGrid(ctx, camera) {
    const gridLines = 10;
    const step = 2 / gridLines;

    ctx.strokeStyle = 'rgba(79, 195, 247, 0.1)';
    ctx.lineWidth = 0.01;

    for (let i = 0; i <= gridLines; i++) {
      const x = -1 + i * step;
      ctx.beginPath();
      ctx.moveTo(x, -1);
      ctx.lineTo(x, 1);
      ctx.stroke();

      const y = -1 + i * step;
      ctx.beginPath();
      ctx.moveTo(-1, y);
      ctx.lineTo(1, y);
      ctx.stroke();
    }
  }

  updateFPS() {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }

  getInfo() {
    return {
      ...super.getInfo(),
      fps: this.fps,
      context: '2d'
    };
  }

  destroy() {
    this.ctx = null;
    console.log('[Canvas2DRenderer] Destroyed');
  }
}

export { Canvas2DRenderer };
```

### 3. RenderEngineManager

```javascript
// core/rendering/RenderEngineManager.js

/**
 * Central manager for all rendering engines
 * Handles registration, selection, and lifecycle
 */
class RenderEngineManager {
  constructor() {
    this.renderers = new Map();  // name → RendererClass
    this.activeRenderer = null;
    this.canvas = null;
    this.footerElement = null;
  }

  /**
   * Register a renderer
   */
  register(name, RendererClass) {
    this.renderers.set(name, RendererClass);
    console.log(`[RenderEngineManager] Registered: ${name}`);
  }

  /**
   * Initialize with a specific renderer
   */
  async init(canvas, rendererName = 'canvas2d') {
    this.canvas = canvas;
    this.footerElement = document.getElementById('footer-engine');

    const RendererClass = this.renderers.get(rendererName);
    if (!RendererClass) {
      throw new Error(`Renderer not found: ${rendererName}`);
    }

    // Destroy old renderer if exists
    if (this.activeRenderer) {
      this.activeRenderer.destroy();
    }

    // Create and init new renderer
    this.activeRenderer = new RendererClass(canvas);
    await this.activeRenderer.init();

    // Update footer
    this.updateFooter();

    console.log(`[RenderEngineManager] Active renderer: ${rendererName}`);
    return this.activeRenderer;
  }

  /**
   * Switch to a different renderer at runtime
   */
  async switchRenderer(rendererName) {
    return this.init(this.canvas, rendererName);
  }

  /**
   * Render a frame (delegates to active renderer)
   */
  render(entities, camera, options = {}) {
    if (!this.activeRenderer) {
      throw new Error('No active renderer');
    }
    this.activeRenderer.render(entities, camera, options);
  }

  /**
   * Get list of available renderers
   */
  getAvailable() {
    return Array.from(this.renderers.keys());
  }

  /**
   * Get active renderer info
   */
  getInfo() {
    return this.activeRenderer ? this.activeRenderer.getInfo() : null;
  }

  /**
   * Update footer status bar
   */
  updateFooter() {
    if (!this.footerElement || !this.activeRenderer) return;

    const info = this.activeRenderer.getInfo();
    this.footerElement.textContent = `${info.name} (${info.fps || 0} FPS)`;
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.activeRenderer) {
      this.activeRenderer.destroy();
      this.activeRenderer = null;
    }
  }
}

// Global singleton
const renderManager = new RenderEngineManager();

export { RenderEngineManager, renderManager };
```

### 4. Updated Game Integration

```javascript
// games/QuadrapongGame.js (UPDATED)

import { renderManager } from '../core/rendering/RenderEngineManager.js';

class Game {
  constructor(store, canvas) {
    this.store = store;
    this.canvas = canvas;
    // NO MORE: this.ctx = canvas.getContext('2d');

    // Initialize render manager
    this.renderOptions = {
      showGrid: true,
      backgroundColor: '#000000'
    };
  }

  async initialize() {
    // Setup renderer
    await renderManager.init(this.canvas, 'canvas2d');

    // ... create entities, systems ...

    return this;
  }

  render() {
    // Get renderable entities
    const renderables = this.ecs.query('renderable', 'position');

    // Delegate to render manager
    renderManager.render(renderables, this.camera, this.renderOptions);

    // Update footer with latest FPS
    renderManager.updateFooter();
  }

  stop() {
    // Cleanup
    renderManager.destroy();
    // ... rest of cleanup ...
  }
}
```

### 5. Bootstrap & Registration

```javascript
// core/rendering/index.js

import { renderManager } from './RenderEngineManager.js';
import { Canvas2DRenderer } from './Canvas2DRenderer.js';
import { WebGLRenderer } from './WebGLRenderer.js';
import { VScopeRenderer } from './VScopeRenderer.js';

// Register all available renderers
renderManager.register('canvas2d', Canvas2DRenderer);
renderManager.register('webgl', WebGLRenderer);
renderManager.register('vscope', VScopeRenderer);

console.log('[Rendering] Registered renderers:', renderManager.getAvailable());

export { renderManager };
```

## Enhanced Footer Display

### Dynamic Status Updates

```javascript
// Update footer every frame or every second
setInterval(() => {
  renderManager.updateFooter();
}, 1000);

// Or in game loop:
render() {
  renderManager.render(entities, camera, options);
  renderManager.updateFooter();  // Shows current FPS
}
```

### Expanded Footer Info

```html
<!-- index.html (Enhanced) -->
<div class="footer-section">
  <span class="footer-label">RENDER ENGINE</span>
  <span class="footer-value" id="footer-engine">Canvas 2D (60 FPS)</span>
</div>
<div class="footer-section">
  <span class="footer-label">ENTITIES</span>
  <span class="footer-value" id="footer-entities">5</span>
</div>
<div class="footer-section">
  <span class="footer-label">CAMERA</span>
  <span class="footer-value" id="footer-camera">2D (zoom: 1.0x)</span>
</div>
```

### CLI Commands for Renderer Control

```javascript
// cli/command-processor.js

case 'renderer.list':
  const available = renderManager.getAvailable();
  cliLog('Available renderers:');
  available.forEach(name => cliLog(`  - ${name}`));
  break;

case 'renderer.switch':
  const newRenderer = args[0];
  await renderManager.switchRenderer(newRenderer);
  cliLog(`Switched to: ${newRenderer}`);
  break;

case 'renderer.info':
  const info = renderManager.getInfo();
  cliLog(JSON.stringify(info, null, 2));
  break;
```

## Implementation Phases

### Phase 1: Core Infrastructure (Priority)
- [ ] Create `BaseRenderer` abstract class
- [ ] Create `Canvas2DRenderer` (extract from QuadrapongGame)
- [ ] Create `RenderEngineManager`
- [ ] Update footer to show dynamic renderer info
- [ ] Test with Quadrapong

### Phase 2: Game Integration
- [ ] Update QuadrapongGame to use renderManager
- [ ] Move grid rendering to renderer
- [ ] Move entity rendering to renderer
- [ ] Test renderer lifecycle (init, render, destroy)

### Phase 3: Additional Renderers
- [ ] Implement `WebGLRenderer` (basic 3D)
- [ ] Implement `VScopeRenderer` (terminal effects)
- [ ] Implement `PixelVectorRenderer` (CRT aesthetic)
- [ ] Test renderer hot-swapping

### Phase 4: Advanced Features
- [ ] Add CLI commands (renderer.list, renderer.switch, renderer.info)
- [ ] Performance monitoring (frame time, draw calls)
- [ ] Renderer-specific options/settings
- [ ] Renderer fallback mechanism (WebGL → Canvas2D)

### Phase 5: Polish
- [ ] Enhanced footer display (FPS, entities, camera)
- [ ] Renderer selection in UI
- [ ] Per-renderer quality settings
- [ ] Documentation and examples

## Benefits

✅ **Separation of Concerns**: Game logic ≠ rendering
✅ **Flexibility**: Switch renderers without touching game code
✅ **Observable**: Live FPS, renderer stats in footer
✅ **Extensible**: Add new renderers easily
✅ **Testable**: Mock renderers for unit tests
✅ **Performance**: Easy to compare renderer performance
✅ **Future-Proof**: Ready for WebGPU, OffscreenCanvas, etc.

## Migration Path

### Before (Current)
```javascript
class Game {
  this.ctx = canvas.getContext('2d');

  render() {
    this.ctx.fillRect(...);  // Direct canvas calls
  }
}
```

### After (Proposed)
```javascript
class Game {
  // No canvas context!

  render() {
    renderManager.render(entities, camera, options);
  }
}
```

## Next Steps

1. **Create** `core/rendering/` directory
2. **Implement** BaseRenderer, Canvas2DRenderer, RenderEngineManager
3. **Update** QuadrapongGame to use renderManager
4. **Test** rendering still works
5. **Enhance** footer to show live FPS
6. **Add** CLI commands for renderer control
7. **Document** renderer API for future developers
