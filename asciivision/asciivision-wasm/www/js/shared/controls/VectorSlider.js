/**
 * VectorSlider - Custom element for vector value input
 * <vector-slider min="0" max="100" value="50" label="Volume"></vector-slider>
 *
 * Features:
 * - CRT/retro styling
 * - Keyboard, mouse, and touch input
 * - Value change events
 * - Label and value display
 */

export class VectorSlider extends HTMLElement {
    static get observedAttributes() {
        return ['min', 'max', 'value', 'step', 'label', 'disabled', 'vertical'];
    }

    constructor() {
        super();

        this.attachShadow({ mode: 'open' });

        // Internal state
        this._min = 0;
        this._max = 100;
        this._value = 50;
        this._step = 1;
        this._dragging = false;

        this._render();
        this._attachEvents();
    }

    // Properties
    get min() { return this._min; }
    set min(v) { this._min = parseFloat(v); this._updateUI(); }

    get max() { return this._max; }
    set max(v) { this._max = parseFloat(v); this._updateUI(); }

    get value() { return this._value; }
    set value(v) {
        const newVal = this._clamp(parseFloat(v));
        if (newVal !== this._value) {
            this._value = newVal;
            this._updateUI();
            this._dispatchChange();
        }
    }

    get step() { return this._step; }
    set step(v) { this._step = parseFloat(v) || 1; }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { v ? this.setAttribute('disabled', '') : this.removeAttribute('disabled'); }

    get vertical() { return this.hasAttribute('vertical'); }
    set vertical(v) { v ? this.setAttribute('vertical', '') : this.removeAttribute('vertical'); }

    // Lifecycle
    connectedCallback() {
        this._updateFromAttributes();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        this._updateFromAttributes();
    }

    _updateFromAttributes() {
        this._min = parseFloat(this.getAttribute('min')) || 0;
        this._max = parseFloat(this.getAttribute('max')) || 100;
        this._step = parseFloat(this.getAttribute('step')) || 1;
        const val = parseFloat(this.getAttribute('value'));
        if (!isNaN(val)) this._value = this._clamp(val);
        this._updateUI();
    }

    _clamp(val) {
        return Math.max(this._min, Math.min(this._max, val));
    }

    _quantize(val) {
        return Math.round(val / this._step) * this._step;
    }

    _render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: inline-flex;
                    flex-direction: column;
                    gap: 4px;
                    font-family: 'Courier New', monospace;
                    --slider-bg: #111;
                    --slider-track: #333;
                    --slider-fill: #0f0;
                    --slider-thumb: #0f0;
                    --slider-glow: rgba(0, 255, 0, 0.5);
                    --text-color: #0f0;
                }

                :host([vertical]) {
                    flex-direction: row;
                    writing-mode: vertical-rl;
                }

                :host([disabled]) {
                    opacity: 0.5;
                    pointer-events: none;
                }

                .label-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 10px;
                    color: var(--text-color);
                    text-shadow: 0 0 4px var(--slider-glow);
                }

                .slider-container {
                    position: relative;
                    width: 120px;
                    height: 16px;
                    background: var(--slider-bg);
                    border: 1px solid var(--slider-track);
                    cursor: pointer;
                }

                :host([vertical]) .slider-container {
                    width: 16px;
                    height: 120px;
                }

                .track {
                    position: absolute;
                    top: 2px;
                    left: 2px;
                    right: 2px;
                    bottom: 2px;
                    background: var(--slider-track);
                }

                .fill {
                    position: absolute;
                    top: 0;
                    left: 0;
                    bottom: 0;
                    background: var(--slider-fill);
                    box-shadow: 0 0 6px var(--slider-glow);
                    transition: width 0.05s;
                }

                :host([vertical]) .fill {
                    top: auto;
                    left: 0;
                    right: 0;
                    transition: height 0.05s;
                }

                .thumb {
                    position: absolute;
                    top: 50%;
                    width: 4px;
                    height: 100%;
                    background: var(--slider-thumb);
                    box-shadow: 0 0 8px var(--slider-glow);
                    transform: translate(-50%, -50%);
                    transition: left 0.05s;
                }

                :host([vertical]) .thumb {
                    top: auto;
                    left: 50%;
                    width: 100%;
                    height: 4px;
                    transform: translate(-50%, 50%);
                    transition: bottom 0.05s;
                }

                .slider-container:focus {
                    outline: 1px solid var(--slider-fill);
                    outline-offset: 2px;
                }

                /* Scanline effect */
                .slider-container::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: repeating-linear-gradient(
                        0deg,
                        transparent,
                        transparent 1px,
                        rgba(0, 0, 0, 0.1) 1px,
                        rgba(0, 0, 0, 0.1) 2px
                    );
                    pointer-events: none;
                }
            </style>

            <div class="label-row">
                <span class="label">${this.getAttribute('label') || ''}</span>
                <span class="value-display"></span>
            </div>

            <div class="slider-container" tabindex="0">
                <div class="track">
                    <div class="fill"></div>
                </div>
                <div class="thumb"></div>
            </div>
        `;
    }

    _attachEvents() {
        const container = this.shadowRoot.querySelector('.slider-container');

        // Mouse events
        container.addEventListener('mousedown', (e) => this._startDrag(e));
        document.addEventListener('mousemove', (e) => this._onDrag(e));
        document.addEventListener('mouseup', () => this._endDrag());

        // Touch events
        container.addEventListener('touchstart', (e) => this._startDrag(e.touches[0]));
        document.addEventListener('touchmove', (e) => {
            if (this._dragging) {
                e.preventDefault();
                this._onDrag(e.touches[0]);
            }
        }, { passive: false });
        document.addEventListener('touchend', () => this._endDrag());

        // Keyboard
        container.addEventListener('keydown', (e) => this._onKeyDown(e));

        // Click to set
        container.addEventListener('click', (e) => this._onClick(e));
    }

    _startDrag(e) {
        if (this.disabled) return;
        this._dragging = true;
        this._setValueFromEvent(e);
    }

    _onDrag(e) {
        if (!this._dragging) return;
        this._setValueFromEvent(e);
    }

    _endDrag() {
        this._dragging = false;
    }

    _onClick(e) {
        if (this.disabled) return;
        this._setValueFromEvent(e);
    }

    _setValueFromEvent(e) {
        const container = this.shadowRoot.querySelector('.slider-container');
        const rect = container.getBoundingClientRect();

        let ratio;
        if (this.vertical) {
            ratio = 1 - (e.clientY - rect.top) / rect.height;
        } else {
            ratio = (e.clientX - rect.left) / rect.width;
        }

        ratio = Math.max(0, Math.min(1, ratio));
        const newVal = this._min + ratio * (this._max - this._min);
        this.value = this._quantize(newVal);
    }

    _onKeyDown(e) {
        if (this.disabled) return;

        let delta = 0;
        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowUp':
                delta = this._step;
                break;
            case 'ArrowLeft':
            case 'ArrowDown':
                delta = -this._step;
                break;
            case 'PageUp':
                delta = (this._max - this._min) * 0.1;
                break;
            case 'PageDown':
                delta = -(this._max - this._min) * 0.1;
                break;
            case 'Home':
                this.value = this._min;
                return;
            case 'End':
                this.value = this._max;
                return;
            default:
                return;
        }

        e.preventDefault();
        this.value = this._quantize(this._value + delta);
    }

    _updateUI() {
        const fill = this.shadowRoot.querySelector('.fill');
        const thumb = this.shadowRoot.querySelector('.thumb');
        const display = this.shadowRoot.querySelector('.value-display');
        const label = this.shadowRoot.querySelector('.label');

        if (!fill || !thumb) return;

        const ratio = (this._value - this._min) / (this._max - this._min);
        const percent = ratio * 100;

        if (this.vertical) {
            fill.style.width = '';
            fill.style.height = `${percent}%`;
            thumb.style.left = '';
            thumb.style.bottom = `${percent}%`;
        } else {
            fill.style.height = '';
            fill.style.width = `${percent}%`;
            thumb.style.bottom = '';
            thumb.style.left = `${percent}%`;
        }

        if (display) {
            display.textContent = this._formatValue(this._value);
        }

        if (label) {
            label.textContent = this.getAttribute('label') || '';
        }
    }

    _formatValue(val) {
        if (this._step >= 1) {
            return Math.round(val).toString();
        }
        const decimals = Math.max(0, -Math.floor(Math.log10(this._step)));
        return val.toFixed(decimals);
    }

    _dispatchChange() {
        this.dispatchEvent(new CustomEvent('change', {
            detail: { value: this._value },
            bubbles: true
        }));

        this.dispatchEvent(new CustomEvent('input', {
            detail: { value: this._value },
            bubbles: true
        }));
    }
}

// Register custom element
if (!customElements.get('vector-slider')) {
    customElements.define('vector-slider', VectorSlider);
}

export default VectorSlider;
