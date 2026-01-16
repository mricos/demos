import { Layer } from '../Layer.js';

/**
 * VectarLayer - Renders 3D vector graphics as ASCII via C/WASM Vectar engine
 * Can run as a game overlay or standalone vectorvision display
 */
export class VectarLayer extends Layer {
    constructor(element, options = {}) {
        super('vectar', {
            element,
            zIndex: options.zIndex || 5,
            color: options.color || '#0f0',
            ...options
        });
        this.gamePtr = null;
        this.Module = null;
        this._ready = false;
    }

    /**
     * Initialize Vectar with Emscripten Module
     * @param {Object} Module - Emscripten WASM module
     */
    async init(Module) {
        this.Module = Module;
        this.gamePtr = Module._game_create(this.width || 100, this.height || 40);
        if (!this.gamePtr) {
            throw new Error('Failed to create Vectar game');
        }
        this._ready = true;
    }

    /**
     * Check if vectar is initialized
     */
    get ready() {
        return this._ready;
    }

    /**
     * Resize vectar buffer
     */
    resize(width, height) {
        super.resize(width, height);
        if (this._ready && this.Module) {
            this.Module._game_resize(this.gamePtr, width, height);
        }
    }

    /**
     * Update game state
     * @param {number} dt - Delta time
     * @param {number} steerX - Horizontal steering (-1 to 1)
     * @param {number} steerY - Vertical steering (-1 to 1)
     * @param {number} throttle - Throttle (0 to 1)
     * @param {number} twist - Twist/rotation input
     */
    update(dt, steerX = 0, steerY = 0, throttle = 0, twist = 0) {
        if (!this._ready) return;
        this.Module._game_update(this.gamePtr, dt, steerX, steerY, throttle, twist);
    }

    /**
     * Render vectar output
     * @returns {string} ASCII output
     */
    render() {
        if (!this.visible || !this._ready) return '';

        this.Module._game_render(this.gamePtr);
        const output = this.Module.UTF8ToString(
            this.Module._game_get_output(this.gamePtr)
        );

        if (this.element) {
            this.element.textContent = output;
        }

        return output;
    }

    /**
     * Get raw character buffer pointer (for compositing)
     */
    getBufferPtr() {
        if (!this._ready) return null;
        return this.Module._game_get_buffer(this.gamePtr);
    }

    /**
     * Poll game events
     * @returns {Array} Array of { type, value } events
     */
    pollEvents() {
        if (!this._ready) return [];
        const events = [];
        while (this.Module._game_event_count(this.gamePtr) > 0) {
            events.push({
                type: this.Module._game_poll_event_type(this.gamePtr),
                value: this.Module._game_poll_event_value(this.gamePtr)
            });
            this.Module._game_pop_event(this.gamePtr);
        }
        return events;
    }

    /**
     * Fire projectile
     */
    shoot() {
        if (this._ready) {
            this.Module._game_shoot(this.gamePtr);
        }
    }

    /**
     * Reset game state
     */
    reset() {
        if (this._ready) {
            this.Module._game_reset(this.gamePtr);
        }
    }

    /**
     * Set game parameter via REPL
     */
    setParam(name, value) {
        if (!this._ready) return;
        const namePtr = this.Module.allocateUTF8(name);
        this.Module._game_set_param(this.gamePtr, namePtr, value);
        this.Module._free(namePtr);
    }

    /**
     * Get game parameter
     */
    getParam(name) {
        if (!this._ready) return 0;
        const namePtr = this.Module.allocateUTF8(name);
        const value = this.Module._game_get_param(this.gamePtr, namePtr);
        this.Module._free(namePtr);
        return value;
    }

    /**
     * Clean up WASM resources
     */
    destroy() {
        if (this._ready && this.Module && this.gamePtr) {
            this.Module._game_free(this.gamePtr);
            this.gamePtr = null;
            this._ready = false;
        }
    }

    /**
     * Clear display
     */
    clear() {
        if (this.element) {
            this.element.textContent = '';
        }
    }
}
