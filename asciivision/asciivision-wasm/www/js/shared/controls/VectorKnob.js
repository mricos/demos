/**
 * VectorKnob - Rotary knob control with CRT styling
 * <vector-knob min="0" max="100" value="50" label="Gain"></vector-knob>
 */

export class VectorKnob extends HTMLElement {
    static get observedAttributes() {
        return ['min', 'max', 'value', 'step', 'label', 'disabled', 'size'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this._min = 0;
        this._max = 100;
        this._value = 50;
        this._step = 1;
        this._size = 48;
        this._dragging = false;
        this._startY = 0;
        this._startValue = 0;

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

    get size() { return this._size; }
    set size(v) { this._size = parseInt(v) || 48; this._updateUI(); }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { v ? this.setAttribute('disabled', '') : this.removeAttribute('disabled'); }

    connectedCallback() {
        this._updateFromAttributes();
    }

    attributeChangedCallback() {
        this._updateFromAttributes();
    }

    _updateFromAttributes() {
        this._min = parseFloat(this.getAttribute('min')) || 0;
        this._max = parseFloat(this.getAttribute('max')) || 100;
        this._step = parseFloat(this.getAttribute('step')) || 1;
        this._size = parseInt(this.getAttribute('size')) || 48;
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
                    align-items: center;
                    gap: 4px;
                    font-family: 'Courier New', monospace;
                    --knob-bg: #111;
                    --knob-ring: #333;
                    --knob-indicator: #0f0;
                    --knob-glow: rgba(0, 255, 0, 0.5);
                    --text-color: #0f0;
                }

                :host([disabled]) {
                    opacity: 0.5;
                    pointer-events: none;
                }

                .label {
                    font-size: 10px;
                    color: var(--text-color);
                    text-shadow: 0 0 4px var(--knob-glow);
                }

                .knob-container {
                    position: relative;
                    cursor: grab;
                }

                .knob-container:active {
                    cursor: grabbing;
                }

                .knob {
                    width: var(--size);
                    height: var(--size);
                    border-radius: 50%;
                    background: var(--knob-bg);
                    border: 2px solid var(--knob-ring);
                    position: relative;
                    box-shadow:
                        inset 0 2px 4px rgba(255, 255, 255, 0.1),
                        0 0 10px var(--knob-glow);
                }

                .indicator {
                    position: absolute;
                    top: 15%;
                    left: 50%;
                    width: 3px;
                    height: 35%;
                    background: var(--knob-indicator);
                    transform-origin: bottom center;
                    transform: translateX(-50%);
                    box-shadow: 0 0 6px var(--knob-glow);
                    border-radius: 2px;
                }

                .tick-marks {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                }

                .tick {
                    position: absolute;
                    top: 2px;
                    left: 50%;
                    width: 1px;
                    height: 4px;
                    background: var(--knob-ring);
                    transform-origin: bottom center;
                    transform: translateX(-50%);
                }

                .value-display {
                    font-size: 10px;
                    color: var(--text-color);
                    text-shadow: 0 0 4px var(--knob-glow);
                }

                .knob-container:focus {
                    outline: none;
                }

                .knob-container:focus .knob {
                    border-color: var(--knob-indicator);
                }
            </style>

            <span class="label">${this.getAttribute('label') || ''}</span>

            <div class="knob-container" tabindex="0">
                <div class="knob" style="--size: ${this._size}px">
                    <div class="tick-marks"></div>
                    <div class="indicator"></div>
                </div>
            </div>

            <span class="value-display"></span>
        `;
    }

    _attachEvents() {
        const container = this.shadowRoot.querySelector('.knob-container');

        // Mouse
        container.addEventListener('mousedown', (e) => this._startDrag(e));
        document.addEventListener('mousemove', (e) => this._onDrag(e));
        document.addEventListener('mouseup', () => this._endDrag());

        // Touch
        container.addEventListener('touchstart', (e) => this._startDrag(e.touches[0]));
        document.addEventListener('touchmove', (e) => {
            if (this._dragging) {
                e.preventDefault();
                this._onDrag(e.touches[0]);
            }
        }, { passive: false });
        document.addEventListener('touchend', () => this._endDrag());

        // Wheel
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -this._step : this._step;
            this.value = this._quantize(this._value + delta * 5);
        }, { passive: false });

        // Keyboard
        container.addEventListener('keydown', (e) => this._onKeyDown(e));
    }

    _startDrag(e) {
        if (this.disabled) return;
        this._dragging = true;
        this._startY = e.clientY;
        this._startValue = this._value;
    }

    _onDrag(e) {
        if (!this._dragging) return;

        // Vertical drag changes value
        const deltaY = this._startY - e.clientY;
        const range = this._max - this._min;
        const sensitivity = range / 100;  // 100px for full range

        const newVal = this._startValue + deltaY * sensitivity;
        this.value = this._quantize(newVal);
    }

    _endDrag() {
        this._dragging = false;
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
        const indicator = this.shadowRoot.querySelector('.indicator');
        const display = this.shadowRoot.querySelector('.value-display');
        const label = this.shadowRoot.querySelector('.label');
        const knob = this.shadowRoot.querySelector('.knob');

        if (!indicator) return;

        // Rotation: -135deg at min, +135deg at max (270 degree range)
        const ratio = (this._value - this._min) / (this._max - this._min);
        const angle = -135 + ratio * 270;

        indicator.style.transform = `translateX(-50%) rotate(${angle}deg)`;

        if (knob) {
            knob.style.setProperty('--size', `${this._size}px`);
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

if (!customElements.get('vector-knob')) {
    customElements.define('vector-knob', VectorKnob);
}

export default VectorKnob;
