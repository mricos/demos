/**
 * Strahl.Scene — Scene graph with path nodes and groups
 *
 * Nodes have transforms (position, rotation, scale).
 * PathNodes hold SVG path data. GroupNodes hold children.
 * Scene is the root container.
 */
(function(Strahl) {
    'use strict';

    let _nextId = 1;

    /**
     * Create a PathNode — a leaf node holding SVG path strings
     * @param {object} config
     * @param {string[]} config.paths - Array of SVG path data strings
     * @param {string} [config.id] - Node identifier
     * @param {number} [config.x=0] - Position X
     * @param {number} [config.y=0] - Position Y
     * @param {number} [config.z=0] - Position Z
     * @param {number} [config.scale=1] - Scale factor
     * @param {{x:number, y:number, z:number}} [config.rotation] - Local rotation (degrees)
     * @param {number} [config.pathCenter=50] - Center offset for path coordinates
     * @param {object} [config.style] - Visual style overrides
     * @returns {object} PathNode
     */
    function pathNode(config = {}) {
        return {
            type: 'path',
            id: config.id || 'node_' + (_nextId++),
            paths: config.paths || [],
            x: config.x ?? 0,
            y: config.y ?? 0,
            z: config.z ?? 0,
            scale: config.scale ?? 1,
            rotation: {
                x: config.rotation?.x ?? 0,
                y: config.rotation?.y ?? 0,
                z: config.rotation?.z ?? 0
            },
            pathCenter: config.pathCenter ?? 50,
            visible: config.visible ?? true,
            style: {
                strokeWidth: config.style?.strokeWidth ?? null,
                color: config.style?.color ?? null,
                opacity: config.style?.opacity ?? null,
                glow: config.style?.glow ?? null,
                ...config.style
            },
            // User-attached data (for app-level concerns)
            data: config.data || null
        };
    }

    /**
     * Create a GroupNode — a branch node holding children
     * Children inherit the group's transform.
     * @param {object} config
     * @param {string} [config.id] - Node identifier
     * @param {number} [config.x=0] - Position X
     * @param {number} [config.y=0] - Position Y
     * @param {number} [config.z=0] - Position Z
     * @param {number} [config.scale=1] - Scale factor
     * @param {{x:number, y:number, z:number}} [config.rotation] - Local rotation
     * @param {object[]} [config.children] - Child nodes
     * @returns {object} GroupNode
     */
    function groupNode(config = {}) {
        return {
            type: 'group',
            id: config.id || 'group_' + (_nextId++),
            x: config.x ?? 0,
            y: config.y ?? 0,
            z: config.z ?? 0,
            scale: config.scale ?? 1,
            rotation: {
                x: config.rotation?.x ?? 0,
                y: config.rotation?.y ?? 0,
                z: config.rotation?.z ?? 0
            },
            visible: config.visible ?? true,
            children: config.children || [],
            data: config.data || null
        };
    }

    /**
     * Create a Scene — the root container and node manager
     */
    function createScene() {
        const nodes = [];     // top-level nodes
        const index = {};     // id → node lookup

        function _index(node) {
            index[node.id] = node;
            if (node.children) {
                node.children.forEach(_index);
            }
        }

        function _unindex(node) {
            delete index[node.id];
            if (node.children) {
                node.children.forEach(_unindex);
            }
        }

        return {
            /**
             * Add a node to the scene root
             */
            add(node) {
                nodes.push(node);
                _index(node);
                return node;
            },

            /**
             * Remove a node by id
             */
            remove(id) {
                const idx = nodes.findIndex(n => n.id === id);
                if (idx !== -1) {
                    _unindex(nodes[idx]);
                    nodes.splice(idx, 1);
                    return true;
                }
                // Search in groups
                for (const node of nodes) {
                    if (node.children) {
                        const cidx = node.children.findIndex(c => c.id === id);
                        if (cidx !== -1) {
                            _unindex(node.children[cidx]);
                            node.children.splice(cidx, 1);
                            return true;
                        }
                    }
                }
                return false;
            },

            /**
             * Get node by id
             */
            get(id) {
                return index[id] || null;
            },

            /**
             * Get all top-level nodes
             */
            getNodes() {
                return nodes;
            },

            /**
             * Iterate all nodes depth-first, yielding flattened path nodes
             * with accumulated world transforms
             * @returns {Array<{node: object, worldX: number, worldY: number, worldZ: number, worldScale: number}>}
             */
            flatten() {
                const result = [];

                function walk(node, px, py, pz, ps) {
                    if (!node.visible) return;

                    const wx = px + node.x * ps;
                    const wy = py + node.y * ps;
                    const wz = pz + node.z * ps;
                    const ws = ps * node.scale;

                    if (node.type === 'path') {
                        result.push({
                            node,
                            worldX: wx,
                            worldY: wy,
                            worldZ: wz,
                            worldScale: ws
                        });
                    }

                    if (node.children) {
                        node.children.forEach(child => walk(child, wx, wy, wz, ws));
                    }
                }

                nodes.forEach(n => walk(n, 0, 0, 0, 1));
                return result;
            },

            /**
             * Remove all nodes
             */
            clear() {
                nodes.length = 0;
                for (const key in index) delete index[key];
            },

            /**
             * Node count (top-level)
             */
            get count() {
                return nodes.length;
            }
        };
    }

    Strahl.Scene = {
        create: createScene,
        pathNode,
        groupNode
    };

})(window.Strahl);
