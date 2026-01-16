/**
 * ParamEditor - Enhanced parameter editor popup
 * Supports tabbing through min/slider/max, different types, and mapping modes
 */

import { Mappings as ParamMappings, InverseMappings } from './ParamSpec.js';

// Unified mapping interface: wraps ParamSpec mappings
export const Mappings = {
    lin: {
        toSlider: (value, min, max) => InverseMappings.lin(value, min, max),
        fromSlider: (t, min, max) => ParamMappings.lin(t, min, max)
    },
    log: {
        toSlider: (value, min, max) => InverseMappings.log(value, min, max),
        fromSlider: (t, min, max) => ParamMappings.log(t, min, max)
    },
    exp: {
        toSlider: (value, min, max) => InverseMappings.exp(value, min, max),
        fromSlider: (t, min, max) => ParamMappings.exp(t, min, max)
    },
    pow2: {
        toSlider: (value, min, max) => InverseMappings.pow2(value, min, max),
        fromSlider: (t, min, max) => ParamMappings.pow2(t, min, max)
    },
    pow3: {
        toSlider: (value, min, max) => InverseMappings.pow3(value, min, max),
        fromSlider: (t, min, max) => ParamMappings.pow3(t, min, max)
    },
    sqrt: {
        toSlider: (value, min, max) => InverseMappings.sqrt(value, min, max),
        fromSlider: (t, min, max) => ParamMappings.sqrt(t, min, max)
    },
    scurve: {
        toSlider: (value, min, max) => InverseMappings.scurve(value, min, max),
        fromSlider: (t, min, max) => ParamMappings.scurve(t, min, max)
    }
};

const STORAGE_KEY = 'asciivision-param-overrides';

export class ParamEditor {
    constructor(options = {}) {
        this.registry = options.registry || null;
        this.onClose = options.onClose || null;

        // Current state
        this.param = null;
        this.visible = false;
        this.focusIndex = 1;  // 0=min, 1=slider, 2=max
        this.mapping = 'lin';

        // Editable min/max (can differ from spec)
        this.editMin = 0;
        this.editMax = 1;

        // Load overrides from localStorage
        this.overrides = this._loadOverrides();

        // Create DOM
        this._createDOM();
        this._bindEvents();
    }

    /**
     * Load param overrides from localStorage
     */
    _loadOverrides() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch {
            return {};
        }
    }

    /**
     * Save param overrides to localStorage
     */
    _saveOverrides() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.overrides));
        } catch {
            // localStorage not available
        }
    }

    /**
     * Get override for a param, or null if none
     */
    _getOverride(paramName) {
        return this.overrides[paramName] || null;
    }

    /**
     * Set override for a param
     */
    _setOverride(paramName, min, max, mapping) {
        this.overrides[paramName] = { min, max, mapping };
        this._saveOverrides();
    }

    /**
     * Clear override for a param (reset to spec defaults)
     */
    _clearOverride(paramName) {
        delete this.overrides[paramName];
        this._saveOverrides();
    }

    _createDOM() {
        this.element = document.createElement('div');
        this.element.className = 'param-editor';
        this.element.innerHTML = `
            <div class="pe-header">
                <span class="pe-name"></span>
                <span class="pe-type"></span>
            </div>
            <div class="pe-body pe-slider-type">
                <div class="pe-row pe-controls">
                    <input type="text" class="pe-min" tabindex="0">
                    <input type="range" class="pe-slider" min="0" max="1" step="0.001" tabindex="0">
                    <input type="text" class="pe-max" tabindex="0">
                </div>
                <div class="pe-row pe-info">
                    <span class="pe-value"></span>
                    <span class="pe-unit"></span>
                    <button class="pe-reset" tabindex="0" title="Reset to spec defaults">R</button>
                    <select class="pe-mapping" tabindex="0">
                        <option value="lin">lin</option>
                        <option value="log">log</option>
                        <option value="exp">exp</option>
                        <option value="pow2">pow2</option>
                        <option value="pow3">pow3</option>
                        <option value="sqrt">sqrt</option>
                        <option value="scurve">scurve</option>
                    </select>
                </div>
            </div>
            <div class="pe-body pe-bool-type" style="display:none">
                <button class="pe-toggle" tabindex="0">OFF</button>
            </div>
            <div class="pe-footer">
                <span class="pe-hint">Tab:cycle  ↑↓:adjust  Enter:close  Esc:cancel</span>
            </div>
        `;

        // Cache elements
        this.els = {
            name: this.element.querySelector('.pe-name'),
            type: this.element.querySelector('.pe-type'),
            sliderBody: this.element.querySelector('.pe-slider-type'),
            boolBody: this.element.querySelector('.pe-bool-type'),
            min: this.element.querySelector('.pe-min'),
            slider: this.element.querySelector('.pe-slider'),
            max: this.element.querySelector('.pe-max'),
            value: this.element.querySelector('.pe-value'),
            unit: this.element.querySelector('.pe-unit'),
            reset: this.element.querySelector('.pe-reset'),
            mapping: this.element.querySelector('.pe-mapping'),
            toggle: this.element.querySelector('.pe-toggle')
        };

        // Add to document
        document.body.appendChild(this.element);

        // Inject styles
        this._injectStyles();
    }

    _injectStyles() {
        if (document.getElementById('param-editor-styles')) return;

        const style = document.createElement('style');
        style.id = 'param-editor-styles';
        style.textContent = `
            .param-editor {
                position: fixed;
                background: #0a0a0a;
                border: 1px solid #0a0;
                font-family: 'Courier New', monospace;
                font-size: 11px;
                color: #0f0;
                z-index: 2000;
                min-width: 280px;
                display: none;
                box-shadow: 0 4px 12px rgba(0,255,0,0.2);
            }
            .param-editor.visible { display: block; }

            .pe-header {
                display: flex;
                justify-content: space-between;
                padding: 6px 10px;
                background: #111;
                border-bottom: 1px solid #333;
            }
            .pe-name { color: #0f0; font-weight: bold; }
            .pe-type {
                color: #666;
                font-size: 9px;
                padding: 2px 6px;
                background: #1a1a1a;
                border-radius: 3px;
            }

            .pe-body { padding: 10px; }

            .pe-row {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
            }
            .pe-row:last-child { margin-bottom: 0; }

            .pe-controls {
                display: flex;
                gap: 6px;
            }

            .pe-min, .pe-max {
                width: 50px;
                background: #111;
                border: 1px solid #333;
                color: #0a0;
                font-family: inherit;
                font-size: 11px;
                padding: 4px 6px;
                text-align: center;
                border-radius: 3px;
            }
            .pe-min:focus, .pe-max:focus {
                border-color: #0f0;
                outline: none;
                background: #1a1a1a;
            }

            .pe-slider {
                flex: 1;
                height: 6px;
                -webkit-appearance: none;
                background: #222;
                border-radius: 3px;
                cursor: pointer;
            }
            .pe-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 14px;
                height: 14px;
                background: #0f0;
                border-radius: 50%;
                cursor: pointer;
            }
            .pe-slider:focus {
                outline: 2px solid #0f0;
                outline-offset: 2px;
            }

            .pe-info {
                justify-content: space-between;
            }
            .pe-value {
                color: #0f0;
                font-size: 12px;
                font-weight: bold;
            }
            .pe-mapping {
                background: #111;
                border: 1px solid #333;
                color: #0a0;
                font-family: inherit;
                font-size: 10px;
                padding: 2px 4px;
                cursor: pointer;
            }
            .pe-mapping:focus {
                border-color: #0f0;
                outline: none;
            }

            .pe-toggle {
                width: 100%;
                padding: 10px;
                background: #1a1a1a;
                border: 2px solid #333;
                color: #666;
                font-family: inherit;
                font-size: 14px;
                font-weight: bold;
                cursor: pointer;
                border-radius: 4px;
                transition: all 0.15s;
            }
            .pe-toggle:hover { border-color: #0a0; }
            .pe-toggle:focus { outline: 2px solid #0f0; outline-offset: 2px; }
            .pe-toggle.on {
                background: #0a0;
                border-color: #0f0;
                color: #000;
            }

            .pe-unit {
                color: #666;
                font-size: 10px;
                margin-left: 4px;
            }
            .pe-reset {
                background: #1a1a1a;
                border: 1px solid #333;
                color: #666;
                font-family: inherit;
                font-size: 10px;
                padding: 2px 6px;
                cursor: pointer;
                border-radius: 3px;
                margin-left: auto;
            }
            .pe-reset:hover {
                border-color: #f80;
                color: #f80;
            }
            .pe-reset:focus {
                outline: 1px solid #f80;
            }

            .pe-footer {
                padding: 6px 10px;
                background: #111;
                border-top: 1px solid #222;
            }
            .pe-hint {
                color: #444;
                font-size: 9px;
            }
        `;
        document.head.appendChild(style);
    }

    _bindEvents() {
        // Slider input
        this.els.slider.addEventListener('input', () => this._onSliderChange());

        // Min/Max input - use 'blur' instead of 'change' for more reliable updates
        this.els.min.addEventListener('blur', () => this._onMinChange());
        this.els.max.addEventListener('blur', () => this._onMaxChange());
        this.els.min.addEventListener('keydown', (e) => {
            e.stopPropagation();
            this._onMinMaxKey(e, 'min');
        });
        this.els.max.addEventListener('keydown', (e) => {
            e.stopPropagation();
            this._onMinMaxKey(e, 'max');
        });

        // Mapping change
        this.els.mapping.addEventListener('change', () => this._onMappingChange());

        // Reset button
        this.els.reset.addEventListener('click', () => this._onReset());

        // Toggle button
        this.els.toggle.addEventListener('click', () => this._onToggle());

        // Keyboard navigation
        this.element.addEventListener('keydown', (e) => this._onKeyDown(e));

        // Click outside to close
        document.addEventListener('mousedown', (e) => {
            if (this.visible && !this.element.contains(e.target)) {
                this.hide();
            }
        });
    }

    /**
     * Show editor for a parameter
     */
    show(param, anchor = null) {
        if (!param) return;

        this.param = param;
        this.visible = true;

        // Determine type
        const spec = param.spec;
        const isBoolean = spec.type === 'boolean';

        // Setup based on type
        if (isBoolean) {
            this.els.sliderBody.style.display = 'none';
            this.els.boolBody.style.display = 'block';
            this._updateToggle();
        } else {
            this.els.sliderBody.style.display = 'block';
            this.els.boolBody.style.display = 'none';

            // Load saved overrides or use spec defaults
            const override = this._getOverride(param.name);
            if (override) {
                this.editMin = override.min;
                this.editMax = override.max;
                this.mapping = override.mapping || spec.mapping || 'lin';
            } else {
                this.editMin = spec.min ?? 0;
                this.editMax = spec.max ?? 1;
                this.mapping = spec.mapping || 'lin';
            }

            this.els.min.value = this.editMin;
            this.els.max.value = this.editMax;
            this.els.mapping.value = this.mapping;

            // Show unit
            this.els.unit.textContent = spec.unit || '';

            this._updateSlider();
        }

        // Update header
        this.els.name.textContent = param.name;
        this.els.type.textContent = isBoolean ? 'bool' :
            `${spec.unit || 'num'} [${this.mapping}]`;

        // Position
        this._position(anchor);

        // Show and focus
        this.element.classList.add('visible');
        this.focusIndex = isBoolean ? 0 : 1;
        this._focusCurrent();
    }

    /**
     * Hide editor
     */
    hide() {
        this.visible = false;
        this.element.classList.remove('visible');
        this.param = null;
        if (this.onClose) this.onClose();
    }

    /**
     * Position relative to anchor
     */
    _position(anchor) {
        if (!anchor) {
            // Center on screen
            this.element.style.left = '50%';
            this.element.style.top = '50%';
            this.element.style.transform = 'translate(-50%, -50%)';
            return;
        }

        const rect = anchor.getBoundingClientRect();
        const elRect = this.element.getBoundingClientRect();

        let left = rect.left;
        let top = rect.bottom + 4;

        // Clamp to viewport
        if (left + 280 > window.innerWidth) {
            left = window.innerWidth - 290;
        }
        if (top + 150 > window.innerHeight) {
            top = rect.top - 150 - 4;
        }

        this.element.style.left = `${Math.max(10, left)}px`;
        this.element.style.top = `${Math.max(10, top)}px`;
        this.element.style.transform = '';
    }

    /**
     * Update slider from param value
     */
    _updateSlider() {
        if (!this.param) return;

        const value = this.param.get();
        const map = Mappings[this.mapping] || Mappings.lin;
        const t = map.toSlider(value, this.editMin, this.editMax);

        this.els.slider.value = Math.max(0, Math.min(1, t));
        this.els.value.textContent = this._formatValue(value);
    }

    /**
     * Handle slider change
     */
    _onSliderChange() {
        if (!this.param) return;

        const t = parseFloat(this.els.slider.value);
        const map = Mappings[this.mapping] || Mappings.lin;
        const value = map.fromSlider(t, this.editMin, this.editMax);

        this.param.set(value);
        this.els.value.textContent = this._formatValue(value);
    }

    /**
     * Handle min change - updates range and saves to localStorage
     */
    _onMinChange() {
        const val = parseFloat(this.els.min.value);
        if (!isNaN(val) && val < this.editMax) {
            this.editMin = val;
            this._persistOverride();
        } else {
            this.els.min.value = this.editMin;
        }
    }

    /**
     * Handle max change - updates range and saves to localStorage
     */
    _onMaxChange() {
        const val = parseFloat(this.els.max.value);
        if (!isNaN(val) && val > this.editMin) {
            this.editMax = val;
            this._persistOverride();
        } else {
            this.els.max.value = this.editMax;
        }
    }

    /**
     * Handle arrow keys on min/max - changes range and saves
     */
    _onMinMaxKey(e, which) {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();
        e.stopPropagation();

        const step = e.shiftKey ? 10 : 1;
        const delta = e.key === 'ArrowUp' ? step : -step;

        if (which === 'min') {
            const newMin = this.editMin + delta;
            if (newMin < this.editMax) {
                this.editMin = newMin;
                this.els.min.value = this.editMin;
                this._persistOverride();
            }
        } else {
            const newMax = this.editMax + delta;
            if (newMax > this.editMin) {
                this.editMax = newMax;
                this.els.max.value = this.editMax;
                this._persistOverride();
            }
        }
    }

    /**
     * Handle mapping change - saves to localStorage
     */
    _onMappingChange() {
        this.mapping = this.els.mapping.value;
        this.els.type.textContent = `${this.param?.spec.unit || 'num'} [${this.mapping}]`;
        this._persistOverride();
    }

    /**
     * Save current min/max/mapping to localStorage
     */
    _persistOverride() {
        if (!this.param) return;
        this._setOverride(this.param.name, this.editMin, this.editMax, this.mapping);
    }

    /**
     * Reset to spec defaults and clear localStorage override
     */
    _onReset() {
        if (!this.param) return;

        const spec = this.param.spec;
        this.editMin = spec.min ?? 0;
        this.editMax = spec.max ?? 1;
        this.mapping = spec.mapping || 'lin';

        this.els.min.value = this.editMin;
        this.els.max.value = this.editMax;
        this.els.mapping.value = this.mapping;
        this.els.type.textContent = `${spec.unit || 'num'} [${this.mapping}]`;

        this._clearOverride(this.param.name);
        this._updateSlider();
    }

    /**
     * Handle boolean toggle
     */
    _onToggle() {
        if (!this.param) return;
        this.param.toggle();
        this._updateToggle();
    }

    /**
     * Update toggle button state
     */
    _updateToggle() {
        if (!this.param) return;
        const val = this.param.get();
        this.els.toggle.textContent = val ? 'ON' : 'OFF';
        this.els.toggle.classList.toggle('on', val);
    }

    /**
     * Handle keyboard navigation
     */
    _onKeyDown(e) {
        // Stop all key events from bubbling to REPL
        e.stopPropagation();

        const isBoolean = this.param?.spec.type === 'boolean';

        switch (e.key) {
            case 'Tab':
                e.preventDefault();
                this._cycleTab(e.shiftKey);
                break;

            case 'Enter':
                // Don't close if in text field
                if (document.activeElement === this.els.min ||
                    document.activeElement === this.els.max) {
                    return;
                }
                this.hide();
                break;

            case 'Escape':
                this.hide();
                break;

            case 'ArrowLeft':
            case 'ArrowRight':
                if (document.activeElement === this.els.slider) {
                    e.preventDefault();
                    this._nudgeSlider(e.key === 'ArrowRight' ? 1 : -1, e.shiftKey);
                }
                break;

            case ' ':
                if (isBoolean) {
                    e.preventDefault();
                    this._onToggle();
                }
                break;
        }
    }

    /**
     * Cycle tab focus
     */
    _cycleTab(reverse) {
        const isBoolean = this.param?.spec.type === 'boolean';

        if (isBoolean) {
            // Only toggle button
            return;
        }

        // Focus order: min(0), slider(1), max(2), mapping(3)
        const maxIdx = 3;
        if (reverse) {
            this.focusIndex = (this.focusIndex - 1 + maxIdx + 1) % (maxIdx + 1);
        } else {
            this.focusIndex = (this.focusIndex + 1) % (maxIdx + 1);
        }
        this._focusCurrent();
    }

    /**
     * Focus current element
     */
    _focusCurrent() {
        const isBoolean = this.param?.spec.type === 'boolean';

        if (isBoolean) {
            this.els.toggle.focus();
            return;
        }

        switch (this.focusIndex) {
            case 0: this.els.min.focus(); this.els.min.select(); break;
            case 1: this.els.slider.focus(); break;
            case 2: this.els.max.focus(); this.els.max.select(); break;
            case 3: this.els.mapping.focus(); break;
        }
    }

    /**
     * Nudge slider value
     */
    _nudgeSlider(direction, fine) {
        const step = fine ? 0.001 : 0.01;
        const t = parseFloat(this.els.slider.value) + direction * step;
        this.els.slider.value = Math.max(0, Math.min(1, t));
        this._onSliderChange();
    }

    /**
     * Format value for display
     */
    _formatValue(value) {
        if (typeof value === 'number') {
            if (Number.isInteger(value)) return value.toString();
            return value.toFixed(3).replace(/\.?0+$/, '');
        }
        return String(value);
    }

    /**
     * Destroy and cleanup
     */
    destroy() {
        this.element.remove();
    }
}
