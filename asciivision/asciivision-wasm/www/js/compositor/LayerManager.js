/**
 * LayerManager - Manages a stack of visual layers with CSS z-ordering
 * Supports BroadcastChannel control via Tetra/controldeck protocol
 */
export class LayerManager {
    constructor(containerElement, options = {}) {
        this.container = containerElement;
        this.layers = new Map();  // id -> Layer
        this.layerOrder = [];     // Sorted by zIndex

        // BroadcastChannel for control
        this.channel = null;
        this.channelName = options.channelName || 'controldeck-default';

        // Grid dimensions
        this.cols = options.cols || 120;
        this.rows = options.rows || 40;

        // Font sizing
        this.fontSize = 10;
    }

    /**
     * Initialize BroadcastChannel for layer control
     */
    initChannel() {
        if (typeof BroadcastChannel === 'undefined') return;

        this.channel = new BroadcastChannel(this.channelName);
        this.channel.onmessage = (e) => this._handleMessage(e.data);
    }

    /**
     * Add a layer to the manager
     */
    addLayer(layer) {
        this.layers.set(layer.id, layer);
        this._sortLayers();
        this._updateZIndices();

        // Add DOM element to container if not already there
        if (layer.element && !layer.element.parentElement) {
            this.container.appendChild(layer.element);
        }

        layer.resize(this.cols, this.rows);
        layer.applyEffects();

        return layer;
    }

    /**
     * Remove a layer by ID
     */
    removeLayer(id) {
        const layer = this.layers.get(id);
        if (layer) {
            if (layer.element && layer.element.parentElement) {
                layer.element.parentElement.removeChild(layer.element);
            }
            this.layers.delete(id);
            this._sortLayers();
        }
    }

    /**
     * Get a layer by ID
     */
    getLayer(id) {
        return this.layers.get(id);
    }

    /**
     * Get all layer IDs in z-order
     */
    getLayerIds() {
        return this.layerOrder.map(l => l.id);
    }

    /**
     * Resize all layers
     */
    resize(cols, rows) {
        this.cols = cols;
        this.rows = rows;
        this.layers.forEach(layer => layer.resize(cols, rows));
        this._updateFontSize();
    }

    /**
     * Calculate font size to fit container
     */
    _updateFontSize() {
        const rect = this.container.getBoundingClientRect();
        const charAspect = 0.6;
        const fontByWidth = rect.width / (this.cols * charAspect);
        const fontByHeight = rect.height / this.rows;
        this.fontSize = Math.floor(Math.min(fontByWidth, fontByHeight));

        // Apply to text-based layers
        this.layers.forEach(layer => {
            if (layer.element && layer.element.tagName !== 'CANVAS') {
                layer.element.style.fontSize = `${this.fontSize}px`;
                layer.element.style.lineHeight = '1.0';
            }
        });
    }

    /**
     * Sort layers by zIndex
     */
    _sortLayers() {
        this.layerOrder = Array.from(this.layers.values())
            .sort((a, b) => a.zIndex - b.zIndex);
    }

    /**
     * Update CSS z-index values for DOM elements
     */
    _updateZIndices() {
        this.layerOrder.forEach((layer, i) => {
            if (layer.element) {
                layer.element.style.zIndex = i + 1;
            }
        });
    }

    /**
     * Handle BroadcastChannel messages for layer control
     * Protocol: { control: 'layer.{id}.{property}', value: N }
     */
    _handleMessage(msg) {
        if (!msg || !msg.control) return;

        // Parse layer control messages
        const match = msg.control.match(/^layer\.([^.]+)\.(.+)$/);
        if (!match) return;

        const [, layerId, prop] = match;
        const layer = this.layers.get(layerId);
        if (!layer) return;

        if (prop === 'visible') {
            layer.setVisible(msg.value > 0.5 || msg.value === true);
        } else if (prop === 'toggle') {
            layer.toggle();
        } else if (prop in layer.effects) {
            layer.setEffect(prop, msg.value);
        }
    }

    /**
     * Broadcast current layer state
     */
    broadcastState() {
        if (!this.channel) return;

        const state = {};
        this.layers.forEach((layer, id) => {
            state[id] = {
                visible: layer.visible,
                zIndex: layer.zIndex,
                effects: layer.getEffects()
            };
        });

        this.channel.postMessage({
            _src: 'controldeck',
            _v: 1,
            _t: performance.now(),
            source: 'asciivision',
            type: 'state',
            control: 'layers',
            value: state
        });
    }

    /**
     * Iterate over visible layers in z-order
     */
    forEachVisible(callback) {
        this.layerOrder.forEach(layer => {
            if (layer.visible) callback(layer);
        });
    }

    /**
     * Iterate over all layers in z-order
     */
    forEach(callback) {
        this.layerOrder.forEach(callback);
    }

    /**
     * Toggle layer visibility by ID
     * @returns {boolean|null} New visibility state or null if layer not found
     */
    toggleLayer(id) {
        const layer = this.layers.get(id);
        if (layer) {
            return layer.toggle();
        }
        return null;
    }

    /**
     * Set layer effect by ID
     */
    setLayerEffect(id, effectName, value) {
        const layer = this.layers.get(id);
        if (layer) {
            layer.setEffect(effectName, value);
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this.channel) {
            this.channel.close();
            this.channel = null;
        }
        this.layers.forEach(layer => {
            if (layer.element && layer.element.parentElement) {
                layer.element.parentElement.removeChild(layer.element);
            }
        });
        this.layers.clear();
        this.layerOrder = [];
    }
}
