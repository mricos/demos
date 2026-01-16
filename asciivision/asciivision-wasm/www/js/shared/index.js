/**
 * Shared Module - Central export for all shared utilities
 *
 * Usage:
 *   import { vec3, mat4, Camera3D, Entity } from './shared/index.js';
 *   // or
 *   import shared from './shared/index.js';
 */

// Math
export { vec3, mat4, quat } from './math/index.js';

// Camera
export { Camera3D } from './Camera3D.js';

// ECS
export {
    Entity,
    Component,
    TransformComponent,
    VelocityComponent,
    RenderableComponent,
    SpriteComponent,
    MeshComponent,
    ColliderComponent,
    System,
    MovementSystem,
    RenderSystem,
    World
} from './ecs/index.js';

// Effects
export {
    Effect,
    EffectChain,
    PhosphorEffect,
    BloomEffect,
    ScanlineEffect,
    GlowEffect,
    createCRTEffectChain
} from './effects/index.js';

// Controls
export {
    VectorSlider,
    VectorKnob,
    VectorToggle,
    registerVectorControls
} from './controls/index.js';

// World/Coordinates
export { CoordinateSystem, getCoordinateSystem } from './world/index.js';

// Default export with namespaced access
import * as math from './math/index.js';
import { Camera3D } from './Camera3D.js';
import * as ecs from './ecs/index.js';
import * as effects from './effects/index.js';
import * as controls from './controls/index.js';
import * as world from './world/index.js';

export default {
    math,
    Camera3D,
    ecs,
    effects,
    controls,
    world
};
