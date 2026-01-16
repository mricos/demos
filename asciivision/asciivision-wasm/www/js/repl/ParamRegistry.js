/**
 * ParamRegistry - Central registry for all parameters
 * Supports namespacing, bulk operations, serialization, and change tracking
 */

import { Param } from './Param.js';
import { ParamSpec } from './ParamSpec.js';

export class ParamRegistry {
    constructor() {
        /** @type {Map<string, Param>} fullName -> Param */
        this.params = new Map();

        /** @type {Map<string, Set<string>>} namespace -> Set of param names */
        this.namespaces = new Map();

        /** @type {Map<string, Set<string>>} group -> Set of param names */
        this.groups = new Map();

        /** @type {Array<Function>} Global change listeners */
        this._globalListeners = [];
    }

    /**
     * Define a single parameter
     * @param {string} name - Full parameter name (e.g., 'layer.camera.opacity')
     * @param {Object|ParamSpec} spec - Parameter specification
     * @param {Object} [target] - Object containing value
     * @param {string|Object} [key] - Property key or {get, set}
     * @returns {Param} The created parameter
     */
    define(name, spec, target = null, key = null) {
        // Create param
        const param = new Param(name, spec, target, key);

        // Store in registry
        this.params.set(name, param);

        // Track by namespace
        const ns = param.namespace || 'root';
        if (!this.namespaces.has(ns)) {
            this.namespaces.set(ns, new Set());
        }
        this.namespaces.get(ns).add(name);

        // Track by group
        const group = param.spec.group || 'default';
        if (!this.groups.has(group)) {
            this.groups.set(group, new Set());
        }
        this.groups.get(group).add(name);

        // Subscribe to changes for global notification
        param.onChange((newVal, oldVal, p) => {
            this._notifyGlobal(p, newVal, oldVal);
        });

        return param;
    }

    /**
     * Define multiple parameters with a shared prefix
     * @param {string} prefix - Namespace prefix (e.g., 'layer.camera')
     * @param {Object} specs - Object of name -> spec
     * @param {Object} [target] - Shared target object
     * @returns {Object} Object of name -> Param
     */
    defineMany(prefix, specs, target = null) {
        const params = {};
        for (const [name, spec] of Object.entries(specs)) {
            const fullName = prefix ? `${prefix}.${name}` : name;
            const key = spec.key || name;
            params[name] = this.define(fullName, spec, target, key);
        }
        return params;
    }

    /**
     * Define parameters bound to an object's properties
     * @param {string} prefix - Namespace prefix
     * @param {Object} target - Target object
     * @param {Object} specs - Object of propertyName -> spec
     * @returns {Object} Object of name -> Param
     */
    bindObject(prefix, target, specs) {
        const params = {};
        for (const [propName, spec] of Object.entries(specs)) {
            const fullName = prefix ? `${prefix}.${propName}` : propName;
            params[propName] = this.define(fullName, spec, target, propName);
        }
        return params;
    }

    /**
     * Define parameters with custom getters/setters
     * @param {string} prefix - Namespace prefix
     * @param {Object} defs - Object of name -> { spec, get, set }
     * @returns {Object} Object of name -> Param
     */
    defineComputed(prefix, defs) {
        const params = {};
        for (const [name, def] of Object.entries(defs)) {
            const fullName = prefix ? `${prefix}.${name}` : name;
            const spec = { ...def.spec, readonly: !def.set };
            params[name] = this.define(fullName, spec, null, {
                get: def.get,
                set: def.set
            });
        }
        return params;
    }

    /**
     * Get a parameter by name
     * @param {string} name - Full parameter name
     * @returns {Param|undefined}
     */
    get(name) {
        return this.params.get(name);
    }

    /**
     * Get parameter value
     * @param {string} name - Full parameter name
     * @returns {*} Value or undefined
     */
    getValue(name) {
        const param = this.params.get(name);
        return param ? param.get() : undefined;
    }

    /**
     * Set parameter value
     * @param {string} name - Full parameter name
     * @param {*} value - New value
     * @returns {boolean} True if value changed
     */
    setValue(name, value) {
        const param = this.params.get(name);
        return param ? param.set(value) : false;
    }

    /**
     * Check if parameter exists
     * @param {string} name - Full parameter name
     * @returns {boolean}
     */
    has(name) {
        return this.params.has(name);
    }

    /**
     * Remove a parameter
     * @param {string} name - Full parameter name
     * @returns {boolean} True if removed
     */
    remove(name) {
        const param = this.params.get(name);
        if (!param) return false;

        // Remove from namespace tracking
        const ns = param.namespace || 'root';
        this.namespaces.get(ns)?.delete(name);

        // Remove from group tracking
        const group = param.spec.group || 'default';
        this.groups.get(group)?.delete(name);

        // Remove from registry
        this.params.delete(name);
        return true;
    }

    /**
     * Get all parameters matching a pattern
     * @param {string} pattern - Glob-like pattern with * wildcards
     * @returns {Array<{name: string, param: Param}>}
     */
    match(pattern) {
        const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
        const results = [];
        for (const [name, param] of this.params) {
            if (regex.test(name)) {
                results.push({ name, param });
            }
        }
        return results;
    }

    /**
     * Search parameters by name substring
     * @param {string} query - Search query
     * @returns {Array<{name: string, param: Param}>}
     */
    search(query) {
        const q = query.toLowerCase();
        const results = [];
        for (const [name, param] of this.params) {
            if (name.toLowerCase().includes(q)) {
                results.push({ name, param });
            }
        }
        // Sort: prefer prefix matches, then alphabetical
        results.sort((a, b) => {
            const aStarts = a.name.toLowerCase().startsWith(q);
            const bStarts = b.name.toLowerCase().startsWith(q);
            if (aStarts !== bStarts) return bStarts - aStarts;
            return a.name.localeCompare(b.name);
        });
        return results;
    }

    /**
     * Get all parameters in a namespace
     * @param {string} ns - Namespace
     * @returns {Array<{name: string, param: Param}>}
     */
    getNamespace(ns) {
        const names = this.namespaces.get(ns);
        if (!names) return [];
        return Array.from(names).map(name => ({
            name,
            param: this.params.get(name)
        }));
    }

    /**
     * Get all namespace names
     * @returns {string[]}
     */
    getNamespaces() {
        return Array.from(this.namespaces.keys()).sort();
    }

    /**
     * Get all parameters in a group
     * @param {string} group - Group name
     * @returns {Array<{name: string, param: Param}>}
     */
    getGroup(group) {
        const names = this.groups.get(group);
        if (!names) return [];
        return Array.from(names).map(name => ({
            name,
            param: this.params.get(name)
        }));
    }

    /**
     * Get all group names
     * @returns {string[]}
     */
    getGroups() {
        return Array.from(this.groups.keys()).sort();
    }

    /**
     * Get all parameters as array
     * @returns {Array<{name: string, param: Param}>}
     */
    all() {
        return Array.from(this.params.entries())
            .map(([name, param]) => ({ name, param }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    /**
     * Iterate over all parameters
     * @param {Function} fn - Callback (param, name) => void
     */
    forEach(fn) {
        this.params.forEach((param, name) => fn(param, name));
    }

    /**
     * Subscribe to any parameter change
     * @param {Function} fn - Callback (param, newValue, oldValue) => void
     * @returns {Function} Unsubscribe function
     */
    onAnyChange(fn) {
        this._globalListeners.push(fn);
        return () => {
            this._globalListeners = this._globalListeners.filter(f => f !== fn);
        };
    }

    /**
     * Notify global listeners
     */
    _notifyGlobal(param, newValue, oldValue) {
        for (const fn of this._globalListeners) {
            try {
                fn(param, newValue, oldValue);
            } catch (e) {
                console.warn('ParamRegistry global listener error:', e);
            }
        }
    }

    /**
     * Serialize all parameters to object
     * @param {Object} [options] - Options
     * @param {string} [options.namespace] - Only serialize params in namespace
     * @param {string} [options.group] - Only serialize params in group
     * @param {boolean} [options.skipDefaults=false] - Skip params at default value
     * @returns {Object} Serialized values
     */
    serialize(options = {}) {
        const obj = {};
        const params = options.namespace
            ? this.getNamespace(options.namespace)
            : options.group
                ? this.getGroup(options.group)
                : this.all();

        for (const { name, param } of params) {
            if (param.spec.readonly) continue;
            const value = param.get();
            if (options.skipDefaults && value === param.spec.default) continue;
            obj[name] = value;
        }
        return obj;
    }

    /**
     * Deserialize and apply values
     * @param {Object} obj - Object of name -> value
     * @param {Object} [options] - Options
     * @param {boolean} [options.strict=false] - Throw on unknown params
     */
    deserialize(obj, options = {}) {
        for (const [name, value] of Object.entries(obj)) {
            const param = this.params.get(name);
            if (param) {
                param.set(value);
            } else if (options.strict) {
                throw new Error(`Unknown parameter: ${name}`);
            }
        }
    }

    /**
     * Reset all parameters to defaults
     * @param {Object} [options] - Options
     * @param {string} [options.namespace] - Only reset params in namespace
     * @param {string} [options.group] - Only reset params in group
     */
    resetAll(options = {}) {
        const params = options.namespace
            ? this.getNamespace(options.namespace)
            : options.group
                ? this.getGroup(options.group)
                : this.all();

        for (const { param } of params) {
            param.reset();
        }
    }

    /**
     * Get info for all parameters (for UI/debugging)
     * @returns {Array<Object>}
     */
    getInfo() {
        return this.all().map(({ param }) => param.getInfo());
    }

    /**
     * Clear all parameters
     */
    clear() {
        this.params.clear();
        this.namespaces.clear();
        this.groups.clear();
    }

    /**
     * Get registry size
     * @returns {number}
     */
    get size() {
        return this.params.size;
    }
}

// Singleton instance for global use
let _globalRegistry = null;

/**
 * Get or create global registry
 * @returns {ParamRegistry}
 */
export function getGlobalRegistry() {
    if (!_globalRegistry) {
        _globalRegistry = new ParamRegistry();
    }
    return _globalRegistry;
}

/**
 * Set global registry (for testing/reset)
 * @param {ParamRegistry} registry
 */
export function setGlobalRegistry(registry) {
    _globalRegistry = registry;
}
