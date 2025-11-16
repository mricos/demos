/**
 * ECS - Entity Component System Core
 * Extracted from Quadrapong for reusable game architecture
 *
 * Performance Mode: Uses local entity cache for 60 FPS gameplay
 * Inspection Mode: Syncs to Redux for game panel tabs
 */

class ECS {
  constructor(store) {
    this.store = store;
    this.systems = [];
    this.nextEntityId = 1;

    // Local entity cache for performance
    this.entities = new Map();

    // Performance optimization: batch Redux updates
    this.performanceMode = true;
    this.syncInterval = 500; // Sync to Redux every 500ms for inspection (2 FPS)
    this.lastSync = 0;

    // ULTRA PERFORMANCE: Disable Redux sync entirely during gameplay
    // Set to false to completely skip Redux updates (60 FPS)
    this.enableReduxSync = false;
  }

  /**
   * Create a new entity with optional initial components
   * @param {Object} components - Initial component data
   * @returns {string} entityId - The created entity's ID
   */
  createEntity(components = {}) {
    const entityId = `entity-${this.nextEntityId++}`;

    // Store in local cache
    this.entities.set(entityId, {
      id: entityId,
      ...components
    });

    // Sync to Redux (will batch if performance mode)
    if (!this.performanceMode) {
      this.store.dispatch({
        type: 'ADD_ENTITY',
        payload: {
          id: entityId,
          ...components
        }
      });
    }

    return entityId;
  }

  /**
   * Add or update a component on an entity
   * @param {string} entityId - Target entity ID
   * @param {string} componentName - Component type name
   * @param {Object} componentData - Component data
   */
  addComponent(entityId, componentName, componentData) {
    // Update local cache
    const entity = this.entities.get(entityId);
    if (entity) {
      entity[componentName] = componentData;
    }

    // Sync to Redux only if not in performance mode
    if (!this.performanceMode) {
      this.store.dispatch({
        type: 'UPDATE_ENTITY',
        payload: {
          id: entityId,
          updates: {
            [componentName]: componentData
          }
        }
      });
    }
  }

  /**
   * Remove a component from an entity
   * @param {string} entityId - Target entity ID
   * @param {string} componentName - Component type to remove
   */
  removeComponent(entityId, componentName) {
    this.store.dispatch({
      type: 'UPDATE_ENTITY',
      payload: {
        id: entityId,
        updates: {
          [componentName]: undefined
        }
      }
    });
  }

  /**
   * Remove an entity completely
   * @param {string} entityId - Entity ID to remove
   */
  removeEntity(entityId) {
    this.store.dispatch({
      type: 'DELETE_ENTITY',
      payload: entityId
    });
  }

  /**
   * Query entities that have all specified components
   * @param {...string} componentNames - Component names to filter by
   * @returns {Array} Entities matching the query
   */
  query(...componentNames) {
    // Use local cache in performance mode
    if (this.performanceMode) {
      const results = [];
      for (const entity of this.entities.values()) {
        if (componentNames.every(name => entity[name] !== undefined)) {
          results.push(entity);
        }
      }
      return results;
    }

    // Fall back to Redux
    const state = this.store.getState();
    if (!state || !state.entities) return [];

    return state.entities.filter(entity =>
      componentNames.every(name => entity[name] !== undefined)
    );
  }

  /**
   * Query entities in a specific namespace
   * @param {string} namespace - Namespace ID
   * @param {...string} componentNames - Component names to filter by
   * @returns {Array} Entities in namespace matching the query
   */
  queryNamespace(namespace, ...componentNames) {
    const state = this.store.getState();
    if (!state || !state.entities) return [];

    return state.entities.filter(entity =>
      entity.namespace && entity.namespace.id === namespace &&
      componentNames.every(name => entity[name] !== undefined)
    );
  }

  /**
   * Get all entities in a namespace
   * @param {string} namespace - Namespace ID
   * @returns {Array} All entities in the namespace
   */
  getEntitiesInNamespace(namespace) {
    const state = this.store.getState();
    if (!state || !state.entities) return [];

    return state.entities.filter(entity =>
      entity.namespace && entity.namespace.id === namespace
    );
  }

  /**
   * Get entity by ID
   * @param {string} entityId - Entity ID
   * @returns {Object|null} Entity or null if not found
   */
  getEntityById(entityId) {
    // Use local cache in performance mode
    if (this.performanceMode) {
      return this.entities.get(entityId) || null;
    }

    // Fall back to Redux
    const state = this.store.getState();
    if (!state || !state.entities) return null;

    return state.entities.find(entity => entity.id === entityId) || null;
  }

  /**
   * Add a system to the ECS
   * @param {Object} system - System with execute(ecs, deltaTime, context) method
   */
  addSystem(system) {
    this.systems.push(system);
  }

  /**
   * Remove a system by reference or name
   * @param {Object|string} systemOrName - System object or name
   */
  removeSystem(systemOrName) {
    const name = typeof systemOrName === 'string' ? systemOrName : systemOrName.name;
    this.systems = this.systems.filter(s => s.name !== name);
  }

  /**
   * Update all systems
   * @param {number} deltaTime - Time since last update in seconds
   * @param {Object} context - Additional context (canvas, etc.)
   */
  update(deltaTime, context) {
    this.systems.forEach(system => {
      if (!system) {
        console.error('[ECS] Undefined system in systems array');
        return;
      }
      if (system.enabled !== false) {
        system.execute(this, deltaTime, context);
      }
    });

    // Sync to Redux periodically for inspection (2 FPS)
    if (this.performanceMode && this.enableReduxSync) {
      this.lastSync += deltaTime * 1000; // Convert to ms
      if (this.lastSync >= this.syncInterval) {
        this.syncToRedux();
        this.lastSync = 0;
      }
    }
  }

  /**
   * Sync local entity cache to Redux for inspection
   */
  syncToRedux() {
    // Skip if Redux sync is disabled (ultra performance mode)
    if (!this.enableReduxSync) return;

    // Only sync if there are entities to sync
    if (this.entities.size === 0) return;

    const entityArray = Array.from(this.entities.values());

    // Batch update all entities at once (silent - no action history logging)
    this.store.dispatch({
      type: 'ECS_SYNC',
      payload: entityArray,
      meta: { silent: true } // Hint to not log this action
    });
  }

  /**
   * Get all entities
   * @returns {Array} All entities
   */
  getAllEntities() {
    if (this.performanceMode) {
      return Array.from(this.entities.values());
    }

    const state = this.store.getState();
    return state.entities || [];
  }

  /**
   * Clear all entities (useful for game resets)
   */
  clear() {
    this.entities.clear();

    const state = this.store.getState();
    if (!state || !state.entities) return;

    state.entities.forEach(entity => {
      this.removeEntity(entity.id);
    });
  }
}

// Export for both browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ECS;
} else {
  window.ECS = ECS;
}
