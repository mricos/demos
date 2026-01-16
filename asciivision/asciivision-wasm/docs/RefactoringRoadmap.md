# Refactoring Roadmap

## Priority 1: Shared Math Module

Extract common math operations used across all systems.

**Current state:**
- PlasmaVision: `plasmavision/math/vec3.js`, `mat4.js`
- DivGraphics: inline calculations
- VectorVision: inline in SpriteRenderer

**Target:**
```
shared/
  math/
    vec3.js       # 3D vector ops
    mat4.js       # 4x4 matrix ops
    quat.js       # Quaternion (optional)
    projection.js # Perspective/ortho helpers
    index.js
```

**Tasks:**
- [ ] Move PlasmaVision math to shared location
- [ ] Create IIFE bundle for non-module systems
- [ ] Add `cssPerspectiveToFov()` to projection.js
- [ ] Update imports in PlasmaVision

---

## Priority 2: Camera Module

Unified camera abstraction that works with all renderers.

**Current state:**
- PlasmaVision: `renderer.camera` object + `setRotation()`
- DivGraphics: `APP.CameraController` class
- VectorVision: `renderer.camera` object

**Target:**
```javascript
// shared/Camera.js
class Camera {
    position = { x: 0, y: 0, z: 5 };
    target = { x: 0, y: 0, z: 0 };
    up = { x: 0, y: 1, z: 0 };
    fov = 60;  // degrees

    // Orbit controls
    pitch = 0;
    yaw = 0;
    distance = 5;

    getViewMatrix() { }
    getProjectionMatrix(aspect) { }

    // CSS 3D compat
    toCssTransform() { }
    toCssPerspective() { }

    // Sync helpers
    syncFromCss(rotX, rotY, rotZ, zoom, perspective) { }
    syncToCss() { }
}
```

**Tasks:**
- [ ] Create shared Camera class
- [ ] Add CSS <-> WebGL conversion methods
- [ ] Update PlasmaRenderer to use shared Camera
- [ ] Create CameraSync helper for overlay mode

---

## Priority 3: ECS Foundation (v99 pattern)

Adopt Entity-Component-System from v99 for scene management.

**Current state:**
- PlasmaVision: `wireframes[]`, `field.masses[]`
- DivGraphics: `APP.SceneManager.objects`
- VectorVision: `sprites` Map

**Target:**
```javascript
// shared/ecs/
Entity.js       # Base entity with id, transform, children
Component.js    # Component base class
System.js       # System base class (update loop)

// Components
Transform.js    # Position, rotation, scale
Renderable.js   # Visual representation
Physics.js      # Mass, velocity (optional)

// PlasmaVision components
PlasmaGlow.js   # Glow parameters
PlasmaMass.js   # Gravitational influence
```

**Tasks:**
- [ ] Create minimal Entity/Component classes
- [ ] Port PlasmaWireframe to Entity + Renderable
- [ ] Port PlasmaMass to Entity + Physics
- [ ] Add scene graph traversal

---

## Priority 4: Effect Pipeline

Separate CRT effects from core rendering.

**Current state:**
- PlasmaVision: phosphor/bloom/scanline in PlasmaRenderer

**Target:**
```javascript
// plasmavision/effects/
PostProcess.js      # Base class
PhosphorDecay.js    # Temporal blur
Bloom.js            # Gaussian bloom
Scanlines.js        # CRT scanlines
EffectChain.js      # Composable pipeline

// Usage
const effects = new EffectChain([
    new PhosphorDecay({ decay: 0.92 }),
    new Bloom({ intensity: 0.3 }),
    new Scanlines({ intensity: 0.15 })
]);
renderer.setEffectChain(effects);
```

**Tasks:**
- [ ] Extract phosphor to separate class
- [ ] Extract bloom to separate class
- [ ] Create EffectChain compositor
- [ ] Make effects toggleable

---

## Priority 5: Unified Controls

Shared slider/control components with vector styling.

**Current state:**
- PlasmaVision: inline CSS in test pages
- DivGraphics: `css/components/*.css`

**Target:**
```
shared/
  ui/
    vector-controls.css   # Minimal vector slider styles
    VectorSlider.js       # Custom element <vector-slider>
    VectorSelect.js       # Custom element <vector-select>
    ControlPanel.js       # Container with data binding
```

**Tasks:**
- [ ] Extract vector slider CSS to shared file
- [ ] Create VectorSlider custom element
- [ ] Add two-way data binding
- [ ] Port test pages to use shared controls

---

## Priority 6: World Module

Implement shared world space from CoordinateSystem.md.

**Target:**
```javascript
// shared/World.js
export const World = {
    PLASMA_SCALE: 1,
    DIV_SCALE: 100,

    convert(pos, from, to) { },

    // Factories for common objects
    createSphere(radius, system) { },
    createCube(size, system) { }
};
```

---

## File Structure After Refactoring

```
asciivision-wasm/
  www/
    js/
      shared/                    # NEW: shared modules
        math/
          vec3.js
          mat4.js
          projection.js
          index.js
        Camera.js
        World.js
        ecs/
          Entity.js
          Component.js
        ui/
          vector-controls.css
          VectorSlider.js

      plasmavision/
        PlasmaRenderer.js        # Uses shared/math, shared/Camera
        PlasmaGlow.js
        effects/
          PhosphorDecay.js
          Bloom.js
          Scanlines.js
        index.js

      vectorvision/
        SpriteRenderer.js        # Uses shared/math
        Sprite.js
        index.js

      compositor/
        Layer.js
        Compositor.js
```

---

## Migration Order

1. **Math** - low risk, no API changes
2. **Camera** - medium risk, abstraction layer
3. **Controls** - CSS only, safe
4. **Effects** - internal to PlasmaVision
5. **ECS** - larger change, optional
6. **World** - coordination layer, last

---

## Quick Wins (Do Now)

- [x] Extract PlasmaVision math module
- [x] Create CoordinateSystem.md spec
- [x] Vector slider CSS
- [ ] Copy math module to shared/
- [ ] Create projection.js with CSS<->FOV conversion
- [ ] Bundle IIFE version for DivGraphics
