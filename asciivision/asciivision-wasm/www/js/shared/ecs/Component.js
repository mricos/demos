/**
 * Component - Base class for ECS components
 * Components are pure data containers attached to entities
 */

export class Component {
    constructor() {
        this.entity = null;  // Set when added to entity
    }

    /**
     * Called when component is added to an entity
     * Override in subclass if needed
     */
    onAttach() {}

    /**
     * Called when component is removed from entity
     * Override in subclass for cleanup
     */
    onDetach() {}

    /**
     * Called when entity is destroyed
     * Override in subclass for cleanup
     */
    onDestroy() {}

    /**
     * Clone this component
     * Override in subclass for deep copying
     */
    clone() {
        const cloned = new this.constructor();
        Object.assign(cloned, this);
        cloned.entity = null;
        return cloned;
    }

    /**
     * Serialize to JSON
     * Override in subclass for custom serialization
     */
    toJSON() {
        const json = {};
        for (const [key, value] of Object.entries(this)) {
            if (key !== 'entity') {
                json[key] = value;
            }
        }
        return json;
    }
}

// ============================================
// Common Built-in Components
// ============================================

/**
 * Transform component - position, rotation, scale
 */
export class TransformComponent extends Component {
    constructor(options = {}) {
        super();
        this.position = options.position || { x: 0, y: 0, z: 0 };
        this.rotation = options.rotation || { x: 0, y: 0, z: 0 };  // Euler angles
        this.scale = options.scale || { x: 1, y: 1, z: 1 };
    }

    setPosition(x, y, z) {
        if (typeof x === 'object') {
            this.position = { ...x };
        } else {
            this.position = { x, y, z };
        }
        return this;
    }

    setRotation(x, y, z) {
        if (typeof x === 'object') {
            this.rotation = { ...x };
        } else {
            this.rotation = { x, y, z };
        }
        return this;
    }

    setScale(x, y = x, z = x) {
        if (typeof x === 'object') {
            this.scale = { ...x };
        } else {
            this.scale = { x, y, z };
        }
        return this;
    }

    translate(dx, dy, dz) {
        this.position.x += dx;
        this.position.y += dy;
        this.position.z += dz;
        return this;
    }

    rotate(dx, dy, dz) {
        this.rotation.x += dx;
        this.rotation.y += dy;
        this.rotation.z += dz;
        return this;
    }
}

/**
 * Velocity component - for physics/movement
 */
export class VelocityComponent extends Component {
    constructor(options = {}) {
        super();
        this.linear = options.linear || { x: 0, y: 0, z: 0 };
        this.angular = options.angular || { x: 0, y: 0, z: 0 };
    }
}

/**
 * Renderable component - marks entity as renderable
 */
export class RenderableComponent extends Component {
    constructor(options = {}) {
        super();
        this.visible = options.visible !== false;
        this.layer = options.layer || 0;
        this.color = options.color || '#fff';
        this.opacity = options.opacity ?? 1.0;
    }
}

/**
 * Sprite component - for 2D/ASCII sprite rendering
 */
export class SpriteComponent extends Component {
    constructor(options = {}) {
        super();
        this.char = options.char || '*';
        this.width = options.width || 1;
        this.height = options.height || 1;
        this.data = options.data || null;  // For multi-char sprites
    }
}

/**
 * Mesh component - for 3D mesh rendering
 */
export class MeshComponent extends Component {
    constructor(options = {}) {
        super();
        this.vertices = options.vertices || [];
        this.edges = options.edges || [];
        this.faces = options.faces || [];
    }
}

/**
 * Collider component - for collision detection
 */
export class ColliderComponent extends Component {
    constructor(options = {}) {
        super();
        this.type = options.type || 'box';  // 'box', 'sphere', 'point'
        this.size = options.size || { x: 1, y: 1, z: 1 };
        this.radius = options.radius || 0.5;
        this.isTrigger = options.isTrigger || false;
    }
}

/**
 * Tag component - for grouping/querying entities
 */
export class TagComponent extends Component {
    constructor(tags = []) {
        super();
        this.tags = new Set(tags);
    }

    add(tag) {
        this.tags.add(tag);
        return this;
    }

    remove(tag) {
        this.tags.delete(tag);
        return this;
    }

    has(tag) {
        return this.tags.has(tag);
    }
}

/**
 * Parent component - for hierarchy
 */
export class ParentComponent extends Component {
    constructor(parentEntity = null) {
        super();
        this.parent = parentEntity;
    }
}

/**
 * Children component - for hierarchy
 */
export class ChildrenComponent extends Component {
    constructor() {
        super();
        this.children = [];
    }

    add(entity) {
        if (!this.children.includes(entity)) {
            this.children.push(entity);
        }
        return this;
    }

    remove(entity) {
        const idx = this.children.indexOf(entity);
        if (idx !== -1) {
            this.children.splice(idx, 1);
        }
        return this;
    }
}

export default Component;
