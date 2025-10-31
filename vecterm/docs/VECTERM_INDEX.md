# Vecterm Documentation Index

## Overview

This directory contains comprehensive documentation and analysis of **Vecterm**, a 3D vector graphics rendering engine with hidden-line removal, integrated into a Redux-based interactive visualization platform.

## Documents

### 1. VECTERM_SUMMARY.md (7.6 KB)
**Quick-start reference for Vecterm**

Ideal for:
- Getting a high-level overview
- Understanding the dual REPL/game engine architecture
- Learning the 6-stage rendering pipeline
- Quick lookup of commands and integration points

**Key Sections**:
- What is the rotating cube
- Architecture overview
- Rendering pipeline explanation
- Configuration semantics
- Integration points with Redux/CLI
- Performance characteristics

**When to read**: First stop for understanding what Vecterm does

---

### 2. VECTERM_ANALYSIS.md (32 KB, 951 lines)
**Complete technical analysis and deep dive**

Ideal for:
- Detailed understanding of implementation
- Mathematical foundations
- Code walkthroughs
- Extension and customization
- Complete rendering semantics

**Key Sections**:
- Part 1: The Rotating Cube (what, where, how)
- Part 2: Vecterm Architecture (classes, pipeline)
- Part 3: REPL and Game Engine modes
- Part 4: Rendering semantics and models
- Part 5: Entity rendering patterns
- Part 6: Integration points
- Part 7: Pattern matrix
- Part 8: Technical deep dives (matrices, projection, culling)
- Part 9: Conclusions and semantics summary

**When to read**: When you need to understand how things work

---

## Source Code Organization

```
/Users/mricos/src/mricos/demos/redux/

Core Files:
├── Vecterm.js                    # Main renderer + Mesh class (381 lines)
├── VectermMath.js                # Math library (331 lines)
└── vecterm/
    └── vecterm-demo.js           # CLI demo manager (107 lines)

Integration:
├── app.js                        # Application setup (151 lines)
├── cli/
│   └── command-processor.js      # CLI commands (550+ lines)
└── games/
    └── game-manager.js           # Game mode support (195 lines)

Testing:
└── test-vecterm.html             # Standalone test (62 lines)

Documentation:
├── VECTERM_INDEX.md              # This file
├── VECTERM_SUMMARY.md            # Quick reference
└── VECTERM_ANALYSIS.md           # Complete analysis
```

---

## Quick Start Guide

### 1. Understanding the Basics (5 minutes)

Read: `VECTERM_SUMMARY.md` - Sections 1-3
Focus on:
- What the rotating cube is
- The 3 core modules
- How the dual-role architecture works

### 2. Learning the Pipeline (10 minutes)

Read: `VECTERM_ANALYSIS.md` - Part 2
Focus on:
- System architecture overview
- The 6 rendering stages
- Core classes and their purposes

### 3. Usage Patterns (10 minutes)

Read: `VECTERM_SUMMARY.md` - "Object Rendering Patterns" section
AND `VECTERM_ANALYSIS.md` - Part 5
Focus on:
- How to render meshes
- How to use the camera
- How to integrate with Redux

### 4. Complete Implementation (30+ minutes)

Read: Full `VECTERM_ANALYSIS.md`
Focus on:
- Technical details
- Mathematical foundations
- Integration patterns
- Complete rendering flow

### 5. Hands-on Testing

1. Open `test-vecterm.html` in browser
2. Open `index.html` and type `vecterm.demo` in CLI
3. Try: `vecterm.camera.orbit 0.1 0.05`
4. Try: `vecterm.camera.zoom 1`

---

## Key Concepts Quick Reference

### The Rendering Pipeline

```
Input (Mesh + Transform + Camera)
    ↓
1. MVP Transform (Model × View × Projection)
    ↓
2. Screen Space Projection (Normalize to canvas size)
    ↓
3. Back-Face Culling (Cross-product test)
    ↓
4. Edge Collection (Visible edges only)
    ↓
5. Depth Sort (Painter's Algorithm)
    ↓
6. Rasterization (Draw lines + VT100 effects)
    ↓
Output (2D canvas with 3D visualization)
```

### The Three Core Classes

**VectermMath.Vector3**
- Represents 3D points and directions
- Operations: add, sub, scale, dot, cross, normalize, distanceTo

**VectermMath.Matrix4**
- 4x4 transformation matrices (column-major order)
- Operations: multiply, transformPoint, transformDirection
- Factories: translation, rotation, scale, lookAt, perspective

**VectermMath.Camera**
- 3D camera with position, target, field-of-view
- Methods: getViewMatrix(), getProjectionMatrix(), orbit(), zoom()

### The Two Rendering Classes

**Mesh**
- Wireframe geometry (vertices, edges, faces)
- Factories: cube(), box(), sphere()

**Vecterm**
- Main renderer
- Method: render(meshes, camera, deltaTime)
- Configuration: config object with 10+ parameters

---

## Command Reference

### Vecterm CLI Commands

```bash
vecterm.demo                      # Start spinning cube demo
vecterm.stop                      # Stop the demo
vecterm.camera.orbit <az> <el>    # Orbit camera (radians)
vecterm.camera.zoom <delta>       # Zoom in/out
```

### Game Commands (3D Mode)

```bash
play3d <game>                     # Play game in 3D mode
play <game> 3d                    # Alternative syntax
```

---

## Architecture Diagrams

### REPL Architecture (CLI)

```
┌─────────────────────────────────────┐
│       #cli-panel (Terminal)         │
├─────────────────────────────────────┤
│ Input:  #cli-input                  │
│ Output: #cli-output (log)           │
│ Render: #cli-vecterm (canvas)       │
│                                     │
│ Contains Vecterm instance rendering │
│ a spinning cube with VT100 effects  │
└─────────────────────────────────────┘
```

### Game Architecture (Full-Screen)

```
┌──────────────────────────────────────┐
│      #main-canvas (1920x1080)       │
├──────────────────────────────────────┤
│  Vecterm renders 3D game content    │
│  with full-screen display           │
│  Redux state manages game lifecycle │
└──────────────────────────────────────┘
```

### Redux Integration

```
Redux Store
    ↓
Store.subscribe()
    ↓
Render function triggered
    ↓
Update canvas via Vecterm or ReduxCanvas
```

---

## File Dependency Graph

```
REPL/Game Execution
    ├─ app.js (orchestrator)
    │   ├─ vecterm-demo.js (CLI spinning cube)
    │   │   ├─ Vecterm.js (renderer)
    │   │   │   └─ VectermMath.js (math lib)
    │   │   └─ command-processor.js (CLI commands)
    │   ├─ game-manager.js (game lifecycle)
    │   │   └─ May use Vecterm for 3D mode
    │   └─ ui/renderer.js (canvas render)
    │       └─ ui/canvas-renderer.js (2D drawing)
```

---

## Configuration Parameters

All accessible via `vecterm.setConfig(key, value)`:

**Visual**:
- `phosphorColor` - Line color (default: '#00ff00')
- `backgroundColor` - Clear color (default: '#000000')
- `lineWidth` - Line thickness (default: 1)
- `glowIntensity` - Shadow blur (default: 0.3)

**Effects**:
- `scanlineIntensity` - Scanline darkness (default: 0.15)
- `scanlineSpeed` - Animation speed (default: 8)
- `rasterWave.enabled` - Wave effect (default: false)
- `rasterWave.amplitude` - Wave height (default: 2)
- `rasterWave.frequency` - Wave frequency (default: 0.5)

**Behavior**:
- `hiddenLineRemoval` - Depth sorting (default: true)
- `backfaceCulling` - Face visibility (default: true)

---

## Mathematical Concepts

### Transformation Order (TRS)

```
T × Rz × Ry × Rx × S
Applied right-to-left: Scale → Rotate → Translate
```

### Perspective Projection

Maps 3D frustum to 2D viewport with depth perception
Formula: `x' = (x+1)*W/2, y' = (1-y)*H/2, z' = depth`

### Back-Face Culling

Cross product of face edges in screen space:
- If `cross < 0`: Face is front-facing (visible)
- If `cross > 0`: Face is back-facing (hidden)

### Painter's Algorithm

Sort edges by Z-depth and draw far-to-near for correct occlusion without z-buffer

---

## Common Tasks

### Render a Spinning Cube

```javascript
const vecterm = new Vecterm(canvas);
const camera = new VectermMath.Camera(...);
const mesh = VectermMesh.cube(2);
let rotation = 0;

function animate() {
  rotation += 0.01;
  vecterm.render([{
    mesh: mesh,
    transform: {
      position: VectermMath.Vector3.zero(),
      rotation: new VectermMath.Vector3(rotation, rotation*0.7, 0),
      scale: VectermMath.Vector3.one()
    },
    color: '#00ff88'
  }], camera, 0.016);
  requestAnimationFrame(animate);
}
animate();
```

### Orbit the Camera

```javascript
const camera = new VectermMath.Camera(...);
camera.orbit(0.1, 0.05);  // Azimuth, Elevation in radians
```

### Change Rendering Style

```javascript
vecterm.setConfig('phosphorColor', '#ff00ff');  // Purple
vecterm.setConfig('glowIntensity', 0.8);        // Brighter
vecterm.setConfig('scanlineIntensity', 0.3);    // More scanlines
```

### Multiple Objects

```javascript
const meshes = [
  { mesh: VectermMesh.cube(1), transform: t1, color: '#ff0088' },
  { mesh: VectermMesh.sphere(1.5), transform: t2, color: '#00ff88' }
];
vecterm.render(meshes, camera, deltaTime);
// Auto depth-sorted!
```

---

## Performance Considerations

**Time Complexity**:
- Rendering: O(n*m) - n meshes, m edges/mesh
- Depth sort: O(e log e) - e total edges
- Culling: O(e*f) - e edges, f faces

**Optimizations**:
- Back-face culling reduces edge count
- Configurable effect quality
- Canvas 2D API is native and fast

**Bottlenecks**:
- Large meshes (many edges)
- Complex scenes (many meshes)
- High effect intensity (scanlines)

---

## Extensions and Customization

**Current Constraints**:
- Wireframe only (no solid fills)
- Per-mesh color (not per-face)
- 2D canvas rendering
- No lighting/shading

**Possible Extensions**:
1. Solid polygon filling
2. Per-face/vertex coloring
3. Texture mapping
4. Real-time lighting
5. Normal mapping
6. Shadow rendering
7. Anti-aliasing

---

## Testing Resources

**Standalone Test**: `test-vecterm.html`
- Minimal dependencies
- Tests core rendering
- Good for debugging

**Browser Demo**: `index.html`
- Full integrated demo
- CLI commands available
- Redux integration
- Game mode support

**CLI Commands** (in browser console):
```
vecterm.demo                    # Test rendering
vecterm.camera.orbit 0.1 0.05   # Test camera
vecterm.camera.zoom 0.5         # Test zoom
```

---

## References

### Source Code
- `Vecterm.js` - Main renderer (start here)
- `VectermMath.js` - Math library
- `vecterm-demo.js` - CLI integration
- `test-vecterm.html` - Simple example

### Documentation
- `VECTERM_SUMMARY.md` - Overview
- `VECTERM_ANALYSIS.md` - Detailed analysis
- `README.md` - Feature documentation

### Related Files
- `app.js` - Application setup
- `command-processor.js` - CLI integration
- `game-manager.js` - Game mode

---

## Troubleshooting

**Cube not rendering**:
- Check canvas element exists (`#cli-vecterm` or `#main-canvas`)
- Check VectermMath and Vecterm are loaded
- Check browser console for errors

**Camera not responding**:
- Ensure `getVectermCamera()` returns non-null
- Check command syntax: `vecterm.camera.orbit <azimuth> <elevation>`
- Angles are in radians, not degrees

**Performance issues**:
- Reduce mesh complexity
- Disable effects: `setConfig('scanlineIntensity', 0)`
- Limit number of meshes
- Use `backfaceCulling: true`

---

## Summary

**Vecterm is a complete 3D graphics engine** that:
- Renders wireframe 3D geometry
- Uses hidden-line removal for realism
- Works as both CLI REPL and full-screen game engine
- Integrates with Redux state management
- Provides VT100 phosphor aesthetics
- Uses proper 3D math (vectors, matrices, cameras)

**Key files**: Vecterm.js, VectermMath.js, vecterm-demo.js
**Key documentation**: VECTERM_SUMMARY.md, VECTERM_ANALYSIS.md
**Quick start**: Run `vecterm.demo` in CLI or open `test-vecterm.html`

---

**Last Updated**: October 30, 2025
**Status**: Complete implementation with comprehensive documentation
