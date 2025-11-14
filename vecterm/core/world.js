/**
 * World - Platonic Simulation Space
 *
 * Container for entity graphs, component stores, and spatial metrics.
 * Independent of runtime (Field) and rendering (Surface).
 *
 * Responsibilities:
 * - Entity lifecycle (create, destroy, query)
 * - Component management
 * - Spatial indexing for fast queries
 * - Scene partitioning
 * - Label/tag indexing
 *
 * Does NOT own:
 * - Time/ticks (owned by Field)
 * - Rendering (owned by Surface)
 * - Input handling (owned by Field)
 */

export class World {
  constructor(config = {}) {
    this.id = config.id || this.generateId();
    this.name = config.name || 'unnamed';

    // Entity storage
    this.entities = new Map(); // id → entity object
    this.nextEntityId = 1;

    // Component storage (indexed by component name)
    this.components = new Map(); // componentName → Map(entityId → componentData)

    // Label indexing for fast queries
    this.labelIndex = new Map(); // labelKey → Map(labelValue → Set(entityId))

    // Spatial indexing (simple grid for now, can upgrade to quadtree)
    this.spatialGrid = new SpatialGrid(config.bounds || {
      x: 0, y: 0, width: 1920, height: 1080
    });

    // Scene management
    this.scenes = new Map(); // sceneName → Set(entityId)
    this.defaultScene = 'main';
    this.scenes.set(this.defaultScene, new Set());

    // Bounds
    this.bounds = config.bounds || { x: 0, y: 0, width: 1920, height: 1080 };

    // Metrics
    this.metrics = {
      entityCount: 0,
      componentCount: 0,
      sceneCount: 1
    };
  }

  generateId() {
    return `world_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a new entity
   * @param {Object} options - Entity options
   * @param {string} options.id - Optional custom ID
   * @param {Object} options.labels - Key-value labels for querying
   * @param {string} options.scene - Scene to add entity to
   * @returns {Entity} Entity object
   */
  createEntity(options = {}) {
    const id = options.id || `#entity_${this.nextEntityId++}`;

    if (this.entities.has(id)) {
      throw new Error(`Entity ${id} already exists`);
    }

    const entity = {
      id,
      labels: options.labels || {},
      components: new Set(),
      scene: options.scene || this.defaultScene
    };

    this.entities.set(id, entity);

    // Add to scene
    const scene = this.scenes.get(entity.scene);
    if (scene) {
      scene.add(id);
    }

    // Index labels
    this.indexLabels(id, entity.labels);

    this.metrics.entityCount++;

    return entity;
  }

  /**
   * Destroy an entity
   * @param {string} entityId - Entity ID
   */
  destroyEntity(entityId) {
    const entity = this.entities.get(entityId);
    if (!entity) return false;

    // Remove all components
    for (const componentName of entity.components) {
      this.removeComponent(entityId, componentName);
    }

    // Remove from scene
    const scene = this.scenes.get(entity.scene);
    if (scene) {
      scene.delete(entityId);
    }

    // Remove from label index
    this.unindexLabels(entityId, entity.labels);

    // Remove from spatial index
    this.spatialGrid.remove(entityId);

    // Remove entity
    this.entities.delete(entityId);
    this.metrics.entityCount--;

    return true;
  }

  /**
   * Get entity by ID
   * @param {string} entityId - Entity ID
   * @returns {Entity|undefined}
   */
  getEntity(entityId) {
    return this.entities.get(entityId);
  }

  /**
   * Get all entities
   * @returns {Array<Entity>}
   */
  getAllEntities() {
    return Array.from(this.entities.values());
  }

  /**
   * Add component to entity
   * @param {string} entityId - Entity ID
   * @param {string} componentName - Component name
   * @param {Object} componentData - Component data
   */
  addComponent(entityId, componentName, componentData) {
    const entity = this.entities.get(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    // Get or create component store
    if (!this.components.has(componentName)) {
      this.components.set(componentName, new Map());
      this.metrics.componentCount++;
    }

    const componentStore = this.components.get(componentName);
    componentStore.set(entityId, componentData);

    entity.components.add(componentName);

    // Update spatial index if this is a position component
    if (componentName === 'position' && componentData.x !== undefined && componentData.y !== undefined) {
      this.spatialGrid.insert(entityId, componentData.x, componentData.y);
    }
  }

  /**
   * Remove component from entity
   * @param {string} entityId - Entity ID
   * @param {string} componentName - Component name
   */
  removeComponent(entityId, componentName) {
    const entity = this.entities.get(entityId);
    if (!entity) return false;

    const componentStore = this.components.get(componentName);
    if (componentStore) {
      componentStore.delete(entityId);

      // Clean up empty component stores
      if (componentStore.size === 0) {
        this.components.delete(componentName);
        this.metrics.componentCount--;
      }
    }

    entity.components.delete(componentName);

    // Update spatial index if this was a position component
    if (componentName === 'position') {
      this.spatialGrid.remove(entityId);
    }

    return true;
  }

  /**
   * Get component data for entity
   * @param {string} entityId - Entity ID
   * @param {string} componentName - Component name
   * @returns {Object|undefined}
   */
  getComponent(entityId, componentName) {
    const componentStore = this.components.get(componentName);
    return componentStore ? componentStore.get(entityId) : undefined;
  }

  /**
   * Check if entity has component
   * @param {string} entityId - Entity ID
   * @param {string} componentName - Component name
   * @returns {boolean}
   */
  hasComponent(entityId, componentName) {
    const entity = this.entities.get(entityId);
    return entity ? entity.components.has(componentName) : false;
  }

  /**
   * Query entities by component names
   * @param {...string} componentNames - Component names
   * @returns {Array<Object>} Array of {entityId, entity, components}
   */
  queryComponents(...componentNames) {
    const results = [];

    for (const [entityId, entity] of this.entities) {
      // Check if entity has all requested components
      const hasAll = componentNames.every(name => entity.components.has(name));

      if (hasAll) {
        // Collect component data
        const components = {};
        for (const name of componentNames) {
          components[name] = this.getComponent(entityId, name);
        }

        results.push({
          entityId,
          entity,
          components
        });
      }
    }

    return results;
  }

  /**
   * Query entities by labels
   * @param {Object} selector - Label selector {key: value} or {key: /regex/}
   * @returns {Array<Entity>}
   */
  queryLabels(selector) {
    let results = null;

    // For each label constraint, get matching entity sets and intersect
    for (const [key, value] of Object.entries(selector)) {
      const labelMap = this.labelIndex.get(key);
      if (!labelMap) {
        return []; // No entities with this label key
      }

      let matchingIds = new Set();

      if (value instanceof RegExp) {
        // Regex match - check all values for this key
        for (const [labelValue, entityIds] of labelMap) {
          if (value.test(labelValue)) {
            for (const id of entityIds) {
              matchingIds.add(id);
            }
          }
        }
      } else {
        // Exact match
        const entityIds = labelMap.get(value);
        if (entityIds) {
          matchingIds = new Set(entityIds);
        }
      }

      // Intersect with previous results
      if (results === null) {
        results = matchingIds;
      } else {
        results = new Set([...results].filter(id => matchingIds.has(id)));
      }
    }

    // Convert IDs to entities
    return results ? Array.from(results).map(id => this.entities.get(id)) : [];
  }

  /**
   * Spatial query - find entities in region
   * @param {Object} region - {x, y, width, height}
   * @returns {Array<Entity>}
   */
  querySpatial(region) {
    const entityIds = this.spatialGrid.query(region);
    return entityIds.map(id => this.entities.get(id)).filter(Boolean);
  }

  /**
   * Index entity labels for fast queries
   */
  indexLabels(entityId, labels) {
    for (const [key, value] of Object.entries(labels)) {
      if (!this.labelIndex.has(key)) {
        this.labelIndex.set(key, new Map());
      }

      const labelMap = this.labelIndex.get(key);
      if (!labelMap.has(value)) {
        labelMap.set(value, new Set());
      }

      labelMap.get(value).add(entityId);
    }
  }

  /**
   * Remove entity from label index
   */
  unindexLabels(entityId, labels) {
    for (const [key, value] of Object.entries(labels)) {
      const labelMap = this.labelIndex.get(key);
      if (labelMap) {
        const entityIds = labelMap.get(value);
        if (entityIds) {
          entityIds.delete(entityId);
          if (entityIds.size === 0) {
            labelMap.delete(value);
          }
        }
      }
    }
  }

  /**
   * Create or get scene
   * @param {string} name - Scene name
   * @returns {Set<string>} Entity ID set
   */
  getScene(name) {
    if (!this.scenes.has(name)) {
      this.scenes.set(name, new Set());
      this.metrics.sceneCount++;
    }
    return this.scenes.get(name);
  }

  /**
   * Get all entities in scene
   * @param {string} name - Scene name
   * @returns {Array<Entity>}
   */
  queryScene(name) {
    const scene = this.scenes.get(name);
    if (!scene) return [];

    return Array.from(scene).map(id => this.entities.get(id)).filter(Boolean);
  }

  /**
   * Get metrics
   * @returns {Object}
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Serialize world state
   * @returns {Object}
   */
  serialize() {
    return {
      id: this.id,
      name: this.name,
      bounds: this.bounds,
      entities: Array.from(this.entities.entries()),
      components: Array.from(this.components.entries()).map(([name, store]) => [
        name,
        Array.from(store.entries())
      ]),
      scenes: Array.from(this.scenes.entries()).map(([name, ids]) => [
        name,
        Array.from(ids)
      ]),
      metrics: this.metrics
    };
  }

  /**
   * Deserialize world state
   * @param {Object} data - Serialized world data
   * @returns {World}
   */
  static deserialize(data) {
    const world = new World({
      id: data.id,
      name: data.name,
      bounds: data.bounds
    });

    // Restore entities
    for (const [id, entity] of data.entities) {
      world.entities.set(id, entity);
      world.indexLabels(id, entity.labels);
    }

    // Restore components
    for (const [name, entries] of data.components) {
      const store = new Map(entries);
      world.components.set(name, store);

      // Rebuild spatial index for position components
      if (name === 'position') {
        for (const [entityId, pos] of store) {
          world.spatialGrid.insert(entityId, pos.x, pos.y);
        }
      }
    }

    // Restore scenes
    for (const [name, ids] of data.scenes) {
      world.scenes.set(name, new Set(ids));
    }

    world.metrics = data.metrics;

    return world;
  }
}

/**
 * Simple spatial grid for fast 2D queries
 * Can be upgraded to quadtree for large worlds
 */
class SpatialGrid {
  constructor(bounds, cellSize = 100) {
    this.bounds = bounds;
    this.cellSize = cellSize;
    this.grid = new Map(); // "x,y" → Set(entityId)
    this.entityPositions = new Map(); // entityId → {x, y}
  }

  getCellKey(x, y) {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }

  insert(entityId, x, y) {
    // Remove from old position if exists
    this.remove(entityId);

    const key = this.getCellKey(x, y);
    if (!this.grid.has(key)) {
      this.grid.set(key, new Set());
    }

    this.grid.get(key).add(entityId);
    this.entityPositions.set(entityId, { x, y });
  }

  remove(entityId) {
    const pos = this.entityPositions.get(entityId);
    if (pos) {
      const key = this.getCellKey(pos.x, pos.y);
      const cell = this.grid.get(key);
      if (cell) {
        cell.delete(entityId);
        if (cell.size === 0) {
          this.grid.delete(key);
        }
      }
      this.entityPositions.delete(entityId);
    }
  }

  query(region) {
    const results = new Set();

    // Get cell range
    const minCellX = Math.floor(region.x / this.cellSize);
    const maxCellX = Math.floor((region.x + region.width) / this.cellSize);
    const minCellY = Math.floor(region.y / this.cellSize);
    const maxCellY = Math.floor((region.y + region.height) / this.cellSize);

    // Check all cells in range
    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        const key = `${cx},${cy}`;
        const cell = this.grid.get(key);
        if (cell) {
          for (const entityId of cell) {
            const pos = this.entityPositions.get(entityId);
            // Precise check if entity is actually in region
            if (pos &&
                pos.x >= region.x && pos.x < region.x + region.width &&
                pos.y >= region.y && pos.y < region.y + region.height) {
              results.add(entityId);
            }
          }
        }
      }
    }

    return Array.from(results);
  }
}

export { SpatialGrid };
