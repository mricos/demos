/**
 * World - ECS World/Registry that manages entities and systems
 */

import { Entity } from './Entity.js';

export class World {
    constructor() {
        this.entities = new Map();       // id -> Entity
        this.systems = [];               // Sorted by priority
        this.componentIndex = new Map(); // ComponentClass -> Set<Entity>
        this.tagIndex = new Map();       // tag -> Set<Entity>

        this._pendingAdd = [];
        this._pendingRemove = [];
        this._updating = false;
    }

    /**
     * Create and add a new entity
     * @param {string} name - Optional entity name
     * @returns {Entity}
     */
    createEntity(name = null) {
        const entity = new Entity(name);
        this.addEntity(entity);
        return entity;
    }

    /**
     * Add an existing entity to the world
     * @param {Entity} entity
     * @returns {Entity}
     */
    addEntity(entity) {
        if (this._updating) {
            this._pendingAdd.push(entity);
            return entity;
        }

        if (this.entities.has(entity.id)) {
            console.warn(`Entity ${entity.id} already in world`);
            return entity;
        }

        entity.world = this;
        this.entities.set(entity.id, entity);

        // Index components
        for (const [Type, component] of entity.components) {
            this._indexComponent(entity, Type);
        }

        // Index tags
        for (const tag of entity.tags) {
            this._indexTag(entity, tag);
        }

        return entity;
    }

    /**
     * Remove an entity from the world
     * @param {Entity} entity
     */
    removeEntity(entity) {
        if (this._updating) {
            this._pendingRemove.push(entity);
            return;
        }

        if (!this.entities.has(entity.id)) return;

        // Remove from component index
        for (const [Type, component] of entity.components) {
            this._unindexComponent(entity, Type);
        }

        // Remove from tag index
        for (const tag of entity.tags) {
            this._unindexTag(entity, tag);
        }

        entity.world = null;
        this.entities.delete(entity.id);
    }

    /**
     * Get entity by ID
     * @param {number} id
     * @returns {Entity|null}
     */
    getEntity(id) {
        return this.entities.get(id) || null;
    }

    /**
     * Get entity by name
     * @param {string} name
     * @returns {Entity|null}
     */
    getEntityByName(name) {
        for (const entity of this.entities.values()) {
            if (entity.name === name) return entity;
        }
        return null;
    }

    /**
     * Get all entities with specified components
     * @param {...Function} ComponentClasses
     * @returns {Array<Entity>}
     */
    getEntitiesWith(...ComponentClasses) {
        if (ComponentClasses.length === 0) {
            return Array.from(this.entities.values());
        }

        // Start with smallest set for efficiency
        let smallestSet = null;
        let smallestSize = Infinity;

        for (const C of ComponentClasses) {
            const set = this.componentIndex.get(C);
            if (!set) return [];  // No entities have this component
            if (set.size < smallestSize) {
                smallestSet = set;
                smallestSize = set.size;
            }
        }

        // Filter entities that have ALL required components
        const result = [];
        for (const entity of smallestSet) {
            if (entity.hasComponents(...ComponentClasses)) {
                result.push(entity);
            }
        }

        return result;
    }

    /**
     * Get all entities with a specific tag
     * @param {string} tag
     * @returns {Array<Entity>}
     */
    getEntitiesWithTag(tag) {
        const set = this.tagIndex.get(tag);
        return set ? Array.from(set) : [];
    }

    /**
     * Add a system to the world
     * @param {System} system
     * @returns {System}
     */
    addSystem(system) {
        system.world = this;
        this.systems.push(system);
        this.systems.sort((a, b) => a.priority - b.priority);

        if (system.onAttach) {
            system.onAttach();
        }

        return system;
    }

    /**
     * Remove a system from the world
     * @param {System} system
     */
    removeSystem(system) {
        const idx = this.systems.indexOf(system);
        if (idx !== -1) {
            if (system.onDetach) {
                system.onDetach();
            }
            system.world = null;
            this.systems.splice(idx, 1);
        }
    }

    /**
     * Get a system by class
     * @param {Function} SystemClass
     * @returns {System|null}
     */
    getSystem(SystemClass) {
        return this.systems.find(s => s instanceof SystemClass) || null;
    }

    /**
     * Update all systems
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        this._updating = true;

        for (const system of this.systems) {
            if (system.enabled) {
                system.update(dt);
            }
        }

        this._updating = false;

        // Process pending entity changes
        this._processPending();
    }

    /**
     * Process pending entity additions/removals
     */
    _processPending() {
        // Add pending entities
        for (const entity of this._pendingAdd) {
            this.addEntity(entity);
        }
        this._pendingAdd.length = 0;

        // Remove pending entities
        for (const entity of this._pendingRemove) {
            this.removeEntity(entity);
        }
        this._pendingRemove.length = 0;
    }

    /**
     * Called when a component is added to an entity
     * @internal
     */
    _onComponentAdded(entity, component) {
        this._indexComponent(entity, component.constructor);
    }

    /**
     * Called when a component is removed from an entity
     * @internal
     */
    _onComponentRemoved(entity, component) {
        this._unindexComponent(entity, component.constructor);
    }

    /**
     * Called when a tag is added to an entity
     * @internal
     */
    _onTagAdded(entity, tag) {
        this._indexTag(entity, tag);
    }

    /**
     * Called when a tag is removed from an entity
     * @internal
     */
    _onTagRemoved(entity, tag) {
        this._unindexTag(entity, tag);
    }

    /**
     * Add entity to component index
     */
    _indexComponent(entity, ComponentClass) {
        if (!this.componentIndex.has(ComponentClass)) {
            this.componentIndex.set(ComponentClass, new Set());
        }
        this.componentIndex.get(ComponentClass).add(entity);
    }

    /**
     * Remove entity from component index
     */
    _unindexComponent(entity, ComponentClass) {
        const set = this.componentIndex.get(ComponentClass);
        if (set) {
            set.delete(entity);
            if (set.size === 0) {
                this.componentIndex.delete(ComponentClass);
            }
        }
    }

    /**
     * Add entity to tag index
     */
    _indexTag(entity, tag) {
        if (!this.tagIndex.has(tag)) {
            this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag).add(entity);
    }

    /**
     * Remove entity from tag index
     */
    _unindexTag(entity, tag) {
        const set = this.tagIndex.get(tag);
        if (set) {
            set.delete(entity);
            if (set.size === 0) {
                this.tagIndex.delete(tag);
            }
        }
    }

    /**
     * Get statistics about the world
     */
    getStats() {
        const componentCounts = {};
        for (const [C, set] of this.componentIndex) {
            componentCounts[C.name] = set.size;
        }

        const tagCounts = {};
        for (const [tag, set] of this.tagIndex) {
            tagCounts[tag] = set.size;
        }

        return {
            entityCount: this.entities.size,
            systemCount: this.systems.length,
            componentCounts,
            tagCounts
        };
    }

    /**
     * Clear all entities and systems
     */
    clear() {
        // Remove all systems
        for (const system of [...this.systems]) {
            this.removeSystem(system);
        }

        // Destroy all entities
        for (const entity of [...this.entities.values()]) {
            entity.destroy();
        }

        this.entities.clear();
        this.componentIndex.clear();
        this.tagIndex.clear();
        this._pendingAdd.length = 0;
        this._pendingRemove.length = 0;
    }

    /**
     * Serialize world state
     */
    toJSON() {
        return {
            entities: Array.from(this.entities.values()).map(e => e.toJSON())
        };
    }
}

export default World;
