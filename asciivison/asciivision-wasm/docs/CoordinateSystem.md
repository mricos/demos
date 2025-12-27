# Unified Coordinate System Specification

## World Reference Point

All visualization systems share a common world origin at **(0, 0, 0)**.

```
        +Y (up)
         |
         |
         +------ +X (right)
        /
       /
     +Z (toward viewer)
```

**Handedness:** Right-handed coordinate system (OpenGL convention)

---

## System Comparison

| System | Rendering | Units | World Range | Origin | Projection |
|--------|-----------|-------|-------------|--------|------------|
| **PlasmaVision** | WebGL2 | units | -10 to +10 | center | perspective |
| **DivGraphics** | CSS 3D | pixels | -500 to +500 | center | perspective |
| **VectorVision** | ASCII grid | units | -5 to +5 | center | perspective |
| **ASCIIVision** | text buffer | chars | 0 to cols/rows | top-left | orthographic |

---

## PlasmaVision (WebGL2)

**Units:** Abstract units (typically 1 unit = ~100px at default zoom)

```javascript
// World space
position: { x: 0, y: 0, z: 0 }  // Center of scene
radius: 1.5                      // Sphere radius in units

// Camera
camera.position.z = 5            // Distance from origin
camera.fov = 60                  // Degrees
camera.near = 0.1
camera.far = 100

// Projection
mat4.perspective(fovRadians, aspect, near, far)
mat4.lookAt(eye, target, up)
```

**Conversion to screen:**
```
screenX = (ndcX + 1) * 0.5 * canvasWidth
screenY = (1 - ndcY) * 0.5 * canvasHeight  // Y flipped
```

---

## DivGraphics (CSS 3D)

**Units:** Pixels

```javascript
// World space (pixels)
radius: 100                      // 100px
position: { x: 0, y: 0, z: 0 }   // Center

// Camera (CSS transform)
perspective: 1000px              // Distance to z=0 plane
zoom: 1.0                        // Scale factor (0.3 - 3.0)
rotationX: 30                    // Degrees
rotationY: 45                    // Degrees

// Transform order
transform: rotateX() rotateY() rotateZ() scale() translate()
```

**CSS Perspective to FOV:**
```javascript
fovRadians = 2 * Math.atan(viewportHeight / 2 / perspectivePx)
```

**FOV to CSS Perspective:**
```javascript
perspectivePx = (viewportHeight / 2) / Math.tan(fovRadians / 2)
```

---

## VectorVision (ASCII 3D)

**Units:** Abstract units, rendered to character grid

```javascript
// World space
position: { x: 0, y: 0, z: 0 }   // Center
scale: 1.0                        // Size multiplier

// Camera
camera.distance = 10              // Z distance from origin
camera.fov = 45                   // Degrees
camera.zoom = 0.3                 // Viewport scale

// Grid
cols: 100                         // Characters wide
rows: 60                          // Characters tall
```

**Projection:**
```javascript
// 3D to NDC
zOffset = z + camera.distance
scale = camera.distance / zOffset
ndcX = x * scale * zoom / tan(fov/2)
ndcY = y * scale * zoom / tan(fov/2)

// NDC to grid
gridX = (ndcX + 1) * 0.5 * cols
gridY = (ndcY + 1) * 0.5 * rows
```

---

## ASCIIVision (2D Text Buffer)

**Units:** Characters (discrete)

```javascript
// Screen space (top-left origin)
col: 0 to width-1                 // X axis
row: 0 to height-1                // Y axis (down is positive)

// Resolution
width: 120                        // Characters
height: 40                        // Lines

// No projection (orthographic 2D)
```

**Conversion from world 3D:**
```javascript
// Assumes external projection to normalized 0-1 range
col = Math.floor(normalizedX * width)
row = Math.floor(normalizedY * height)
```

---

## Conversion Factors

### PlasmaVision ↔ DivGraphics

```javascript
// PlasmaVision units to DivGraphics pixels
const PLASMA_TO_DIV_SCALE = 100;  // 1 unit = 100px

function plasmaToDiv(plasmaPos) {
    return {
        x: plasmaPos.x * PLASMA_TO_DIV_SCALE,
        y: plasmaPos.y * PLASMA_TO_DIV_SCALE,
        z: plasmaPos.z * PLASMA_TO_DIV_SCALE
    };
}

function divToPlasma(divPos) {
    return {
        x: divPos.x / PLASMA_TO_DIV_SCALE,
        y: divPos.y / PLASMA_TO_DIV_SCALE,
        z: divPos.z / PLASMA_TO_DIV_SCALE
    };
}
```

### Camera Sync (PlasmaVision ↔ DivGraphics)

```javascript
function syncPlasmaFromDiv(plasma, divCamera) {
    // FOV conversion
    const viewportHeight = plasma.canvas.height / devicePixelRatio;
    const fovRad = 2 * Math.atan(viewportHeight / 2 / divCamera.perspective);
    plasma.camera.fov = fovRad * 180 / Math.PI;

    // Rotation (negate for WebGL convention)
    plasma.setRotation(
        -divCamera.rotationX * Math.PI / 180,
        -divCamera.rotationY * Math.PI / 180
    );

    // Zoom affects camera distance
    plasma.camera.position.z = 5 / divCamera.zoom;
}
```

### VectorVision ↔ PlasmaVision

```javascript
// VectorVision units ≈ PlasmaVision units (1:1 at default zoom)
// Main difference is zoom factor

const VV_TO_PLASMA_SCALE = 1.0;

function vectorToPlasma(vvPos) {
    return {
        x: vvPos.x * VV_TO_PLASMA_SCALE,
        y: vvPos.y * VV_TO_PLASMA_SCALE,
        z: vvPos.z * VV_TO_PLASMA_SCALE
    };
}
```

---

## Standard Scene Sizes

| Object | PlasmaVision | DivGraphics | VectorVision |
|--------|--------------|-------------|--------------|
| Unit sphere | r=1 | r=100px | r=1 |
| Hand landmark | ~2 units | ~200px | ~2 units |
| Viewport | 10x10 | 1000x1000px | 100x60 chars |

---

## Overlay Stacking

When compositing multiple systems:

```
┌─────────────────────────────────────────┐
│ ASCIIVision (text, z-index: 0)          │
├─────────────────────────────────────────┤
│ VectorVision (ASCII 3D, z-index: 5)     │
├─────────────────────────────────────────┤
│ DivGraphics (CSS 3D, z-index: 10)       │
├─────────────────────────────────────────┤
│ PlasmaVision (WebGL, z-index: 15)       │
│   mix-blend-mode: screen                │
└─────────────────────────────────────────┘
```

---

## Future: Shared World Module

```javascript
// Proposed: shared/World.js
export const World = {
    origin: { x: 0, y: 0, z: 0 },
    up: { x: 0, y: 1, z: 0 },
    forward: { x: 0, y: 0, z: -1 },
    right: { x: 1, y: 0, z: 0 },

    // Standard scales
    PLASMA_SCALE: 1,
    DIV_SCALE: 100,
    VV_SCALE: 1,

    // Converters
    toPlasma(pos, fromSystem) { ... },
    fromPlasma(pos, toSystem) { ... }
};
```
