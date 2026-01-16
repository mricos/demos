/**
 * Entity - Base entity class for Entity-Component-System architecture
 * An entity is essentially a unique ID with attached components
 */

let nextEntityId = 0;

export class Entity {
    constructor(name = null) {
        this.id = nextEntityId++;
        this.name = name || `entity_${this.id}`;
        this.components = new Map();  // ComponentType -> Component instance
        this.tags = new Set();
        this.active = true;
        this.world = null;  // Set when added to World
    }

    /**
     * Add a component to this entity
     * @param {Component} component - Component instance to add
     * @returns {Entity} this (for chaining)
     */
    addComponent(component) {
        const type = component.constructor;
        if (this.components.has(type)) {
            console.warn(`Entity ${this.name} already has component ${type.name}`);
            return this;
        }

        component.entity = this;
        this.components.set(type, component);

        // Notify world if attached
        if (this.world) {
            this.world._onComponentAdded(this, component);
        }

        return this;
    }

    /**
     * Remove a component from this entity
     * @param {Function} ComponentClass - Component class to remove
     * @returns {Entity} this (for chaining)
     */
    removeComponent(ComponentClass) {
        const component = this.components.get(ComponentClass);
        if (component) {
            // Notify world before removal
            if (this.world) {
                this.world._onComponentRemoved(this, component);
            }

            component.entity = null;
            this.components.delete(ComponentClass);
        }
        return this;
    }

    /**
     * Get a component by class
     * @param {Function} ComponentClass - Component class to get
     * @returns {Component|null}
     */
    getComponent(ComponentClass) {
        return this.components.get(ComponentClass) || null;
    }

    /**
     * Check if entity has a component
     * @param {Function} ComponentClass - Component class to check
     * @returns {boolean}
     */
    hasComponent(ComponentClass) {
        return this.components.has(ComponentClass);
    }

    /**
     * Check if entity has all specified components
     * @param {...Function} ComponentClasses - Component classes to check
     * @returns {boolean}
     */
    hasComponents(...ComponentClasses) {
        return ComponentClasses.every(C => this.components.has(C));
    }

    /**
     * Add a tag to this entity
     * @param {string} tag
     * @returns {Entity} this
     */
    addTag(tag) {
        this.tags.add(tag);
        if (this.world) {
            this.world._onTagAdded(this, tag);
        }
        return this;
    }

    /**
     * Remove a tag from this entity
     * @param {string} tag
     * @returns {Entity} this
     */
    removeTag(tag) {
        if (this.tags.has(tag)) {
            this.tags.delete(tag);
            if (this.world) {
                this.world._onTagRemoved(this, tag);
            }
        }
        return this;
    }

    /**
     * Check if entity has a tag
     * @param {string} tag
     * @returns {boolean}
     */
    hasTag(tag) {
        return this.tags.has(tag);
    }

    /**
     * Set entity active state
     * Inactive entities are skipped by systems
     */
    setActive(active) {
        this.active = active;
        return this;
    }

    /**
     * Destroy this entity
     * Removes from world and cleans up components
     */
    destroy() {
        if (this.world) {
            this.world.removeEntity(this);
        }

        // Clean up components
        for (const component of this.components.values()) {
            if (component.onDestroy) {
                component.onDestroy();
            }
            component.entity = null;
        }

        this.components.clear();
        this.tags.clear();
        this.active = false;
    }

    /**
     * Clone this entity (creates new ID, copies components)
     * @returns {Entity}
     */
    clone() {
        const cloned = new Entity(`${this.name}_clone`);

        for (const [Type, component] of this.components) {
            if (component.clone) {
                cloned.addComponent(component.clone());
            } else {
                // Shallow clone component data
                const newComponent = new Type();
                Object.assign(newComponent, component);
                cloned.addComponent(newComponent);
            }
        }

        for (const tag of this.tags) {
            cloned.addTag(tag);
        }

        return cloned;
    }

    /**
     * Serialize entity to JSON
     */
    toJSON() {
        const components = {};
        for (const [Type, component] of this.components) {
            components[Type.name] = component.toJSON ? component.toJSON() : { ...component };
        }

        return {
            id: this.id,
            name: this.name,
            tags: [...this.tags],
            active: this.active,
            components
        };
    }
}

/**
 * Reset entity ID counter (useful for tests)
 */
export function resetEntityIdCounter() {
    nextEntityId = 0;
}

export default Entity;
