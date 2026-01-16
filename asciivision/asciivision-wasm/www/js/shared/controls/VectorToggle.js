/**
 * VectorToggle - Toggle button with CRT styling
 * <vector-toggle label="Enable" checked></vector-toggle>
 */

export class VectorToggle extends HTMLElement {
    static get observedAttributes() {
        return ['checked', 'label', 'disabled'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._render();
        this._attachEvents();
    }

    get checked() { return this.hasAttribute('checked'); }
    set checked(v) {
        if (v) {
            this.setAttribute('checked', '');
        } else {
            this.removeAttribute('checked');
        }
        this._updateUI();
        this._dispatchChange();
    }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { v ? this.setAttribute('disabled', '') : this.removeAttribute('disabled'); }

    connectedCallback() {
        this._updateUI();
    }

    attributeChangedCallback() {
        this._updateUI();
    }

    toggle() {
        if (!this.disabled) {
            this.checked = !this.checked;
        }
        return this.checked;
    }

    _render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    font-family: 'Courier New', monospace;
                    cursor: pointer;
                    --toggle-bg: #111;
                    --toggle-border: #333;
                    --toggle-on: #0f0;
                    --toggle-glow: rgba(0, 255, 0, 0.5);
                    --text-color: #0f0;
                }

                :host([disabled]) {
                    opacity: 0.5;
                    pointer-events: none;
                }

                .toggle-box {
                    width: 40px;
                    height: 20px;
                    background: var(--toggle-bg);
                    border: 1px solid var(--toggle-border);
                    position: relative;
                    transition: border-color 0.2s;
                }

                :host([checked]) .toggle-box {
                    border-color: var(--toggle-on);
                    box-shadow: 0 0 8px var(--toggle-glow);
                }

                .toggle-indicator {
                    position: absolute;
                    top: 2px;
                    left: 2px;
                    width: 14px;
                    height: 14px;
                    background: var(--toggle-border);
                    transition: all 0.2s;
                }

                :host([checked]) .toggle-indicator {
                    left: calc(100% - 16px);
                    background: var(--toggle-on);
                    box-shadow: 0 0 6px var(--toggle-glow);
                }

                .label {
                    font-size: 12px;
                    color: var(--text-color);
                    text-shadow: 0 0 4px var(--toggle-glow);
                    user-select: none;
                }

                :host(:focus) .toggle-box {
                    outline: 1px solid var(--toggle-on);
                    outline-offset: 2px;
                }

                /* Scanline */
                .toggle-box::after {
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

            <div class="toggle-box">
                <div class="toggle-indicator"></div>
            </div>
            <span class="label">${this.getAttribute('label') || ''}</span>
        `;
    }

    _attachEvents() {
        this.setAttribute('tabindex', '0');

        this.addEventListener('click', () => {
            if (!this.disabled) {
                this.toggle();
            }
        });

        this.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    _updateUI() {
        const label = this.shadowRoot.querySelector('.label');
        if (label) {
            label.textContent = this.getAttribute('label') || '';
        }
    }

    _dispatchChange() {
        this.dispatchEvent(new CustomEvent('change', {
            detail: { checked: this.checked },
            bubbles: true
        }));
    }
}

if (!customElements.get('vector-toggle')) {
    customElements.define('vector-toggle', VectorToggle);
}

export default VectorToggle;
