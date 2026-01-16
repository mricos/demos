/**
 * System - Base class for ECS systems
 * Systems contain the logic that operates on entities with specific components
 */

export class System {
    constructor(priority = 0) {
        this.priority = priority;  // Lower = runs first
        this.world = null;         // Set when added to World
        this.enabled = true;
        this.name = this.constructor.name;
    }

    /**
     * Define which components this system requires
     * Override in subclass
     * @returns {Array<Function>} Array of Component classes
     */
    get requiredComponents() {
        return [];
    }

    /**
     * Called when system is added to world
     * Override for initialization
     */
    onAttach() {}

    /**
     * Called when system is removed from world
     * Override for cleanup
     */
    onDetach() {}

    /**
     * Called every frame before update
     * Override for pre-update logic
     */
    preUpdate(dt) {}

    /**
     * Process a single entity
     * Override in subclass
     * @param {Entity} entity
     * @param {number} dt - Delta time in seconds
     */
    processEntity(entity, dt) {}

    /**
     * Called every frame after all entities processed
     * Override for post-update logic
     */
    postUpdate(dt) {}

    /**
     * Main update method - processes all matching entities
     * Usually don't override this
     */
    update(dt) {
        if (!this.enabled || !this.world) return;

        this.preUpdate(dt);

        // Get entities matching our component requirements
        const entities = this.world.getEntitiesWith(...this.requiredComponents);

        for (const entity of entities) {
            if (entity.active) {
                this.processEntity(entity, dt);
            }
        }

        this.postUpdate(dt);
    }

    /**
     * Enable/disable this system
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        return this;
    }
}

// ============================================
// Common Built-in Systems
// ============================================

import { TransformComponent, VelocityComponent } from './Component.js';

/**
 * MovementSystem - Updates transform based on velocity
 */
export class MovementSystem extends System {
    constructor(priority = 0) {
        super(priority);
    }

    get requiredComponents() {
        return [TransformComponent, VelocityComponent];
    }

    processEntity(entity, dt) {
        const transform = entity.getComponent(TransformComponent);
        const velocity = entity.getComponent(VelocityComponent);

        // Update position
        transform.position.x += velocity.linear.x * dt;
        transform.position.y += velocity.linear.y * dt;
        transform.position.z += velocity.linear.z * dt;

        // Update rotation
        transform.rotation.x += velocity.angular.x * dt;
        transform.rotation.y += velocity.angular.y * dt;
        transform.rotation.z += velocity.angular.z * dt;
    }
}

/**
 * Abstract RenderSystem - Base for rendering systems
 */
export class RenderSystem extends System {
    constructor(priority = 100) {
        super(priority);
        this.renderer = null;
    }

    setRenderer(renderer) {
        this.renderer = renderer;
        return this;
    }

    preUpdate(dt) {
        if (this.renderer && this.renderer.clear) {
            this.renderer.clear();
        }
    }
}

export default System;
