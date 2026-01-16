/**
 * ECS Module - Entity Component System
 * Shared architecture for game/graphics applications
 */

export { Entity, resetEntityIdCounter } from './Entity.js';
export {
    Component,
    TransformComponent,
    VelocityComponent,
    RenderableComponent,
    SpriteComponent,
    MeshComponent,
    ColliderComponent,
    TagComponent,
    ParentComponent,
    ChildrenComponent
} from './Component.js';
export { System, MovementSystem, RenderSystem } from './System.js';
export { World } from './World.js';

// Default export
import { Entity } from './Entity.js';
import { Component } from './Component.js';
import { System } from './System.js';
import { World } from './World.js';

export default { Entity, Component, System, World };
