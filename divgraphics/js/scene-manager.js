/**
 * DivGraphics - Scene Manager
 * Object registry, lifecycle management, and serialization
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.SceneManager = {
        objects: new Map(),
        container: null,

        init(container) {
            this.container = container || document.getElementById('scene');
        },

        // Add object to scene
        add(id, object) {
            if (this.objects.has(id)) {
                console.warn(`SceneManager: Object "${id}" already exists, replacing`);
                this.remove(id);
            }

            this.objects.set(id, object);

            if (object.generate) {
                const el = object.generate();
                if (el && this.container) {
                    this.container.appendChild(el);
                }
            } else if (object.container && this.container) {
                this.container.appendChild(object.container);
            }

            return object;
        },

        // Remove object from scene
        remove(id) {
            const object = this.objects.get(id);
            if (!object) return false;

            if (object.destroy) {
                object.destroy();
            } else if (object.container?.parentNode) {
                object.container.parentNode.removeChild(object.container);
            }

            this.objects.delete(id);
            return true;
        },

        // Get object by id
        get(id) {
            return this.objects.get(id);
        },

        // Check if object exists
        has(id) {
            return this.objects.has(id);
        },

        // List all object ids
        list() {
            return Array.from(this.objects.keys());
        },

        // Clear all objects
        clear() {
            for (const id of this.objects.keys()) {
                this.remove(id);
            }
        },

        // Get object count
        count() {
            return this.objects.size;
        },

        // Export scene to JSON
        toJSON() {
            const objects = [];

            for (const [id, obj] of this.objects) {
                // Determine type from constructor name or stored type
                const type = obj.constructor?.name || obj._type || 'Unknown';

                // Extract serializable properties
                const props = {};
                const skipKeys = ['container', '_type'];

                for (const [key, value] of Object.entries(obj)) {
                    if (skipKeys.includes(key)) continue;
                    if (typeof value === 'function') continue;
                    if (value instanceof HTMLElement) continue;

                    props[key] = value;
                }

                objects.push({ id, type, props });
            }

            return {
                version: 1,
                camera: APP.Camera ? {
                    rotation: { ...APP.Camera.rotation },
                    zoom: APP.Camera.zoom,
                    pitchClamp: APP.Camera.pitchClamp
                } : null,
                objects
            };
        },

        // Import scene from JSON
        fromJSON(data) {
            if (!data || data.version !== 1) {
                console.error('SceneManager: Invalid scene data');
                return false;
            }

            // Clear existing
            this.clear();

            // Restore camera
            if (data.camera && APP.Camera) {
                APP.Camera.setRotation(
                    data.camera.rotation.x,
                    data.camera.rotation.y,
                    data.camera.rotation.z
                );
                APP.Camera.zoom = data.camera.zoom;
                APP.Camera.pitchClamp = data.camera.pitchClamp;
            }

            // Restore objects
            for (const { id, type, props } of data.objects) {
                const Constructor = APP.Geometry?.[type] || APP[type];

                if (!Constructor) {
                    console.warn(`SceneManager: Unknown type "${type}", skipping`);
                    continue;
                }

                const object = new Constructor(props);
                this.add(id, object);
            }

            return true;
        },

        // Save to localStorage
        save(key = 'divgraphics-scene') {
            const json = this.toJSON();
            localStorage.setItem(key, JSON.stringify(json));
            return json;
        },

        // Load from localStorage
        load(key = 'divgraphics-scene') {
            const data = localStorage.getItem(key);
            if (!data) return false;

            try {
                return this.fromJSON(JSON.parse(data));
            } catch (e) {
                console.error('SceneManager: Failed to parse saved scene', e);
                return false;
            }
        }
    };

})(window.APP);
