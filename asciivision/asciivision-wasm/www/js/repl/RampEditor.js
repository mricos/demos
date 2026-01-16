/**
 * RampEditor - Character ramp preset selector
 * Quick selection of character ramps with preview
 */

import { CharacterRamps, getGeometryConfig } from '../GeometryConfig.js';

export class RampEditor {
    constructor(options = {}) {
        this.onClose = options.onClose || null;
        this.visible = false;
        this.geometry = getGeometryConfig();
        this.selectedIndex = 0;
        this.rampNames = Object.keys(CharacterRamps);

        this._createDOM();
        this._bindEvents();
    }

    _createDOM() {
        this.element = document.createElement('div');
        this.element.className = 'ramp-editor';
        this.element.innerHTML = `
            <div class="re-header">
                <span class="re-title">Character Ramps</span>
                <span class="re-hint">↑↓ select  Enter apply  Esc close</span>
            </div>
            <div class="re-list"></div>
            <div class="re-preview">
                <div class="re-preview-bar"></div>
                <div class="re-preview-info"></div>
            </div>
        `;

        // Cache elements
        this.els = {
            list: this.element.querySelector('.re-list'),
            previewBar: this.element.querySelector('.re-preview-bar'),
            previewInfo: this.element.querySelector('.re-preview-info')
        };

        document.body.appendChild(this.element);
        this._injectStyles();
    }

    _renderList() {
        const currentName = this.geometry.charmap.rampName;
        this.els.list.innerHTML = this.rampNames.map((name, i) => {
            const ramp = CharacterRamps[name];
            const selected = i === this.selectedIndex ? ' selected' : '';
            const current = name === currentName ? ' current' : '';
            const preview = ramp.slice(0, 15) + (ramp.length > 15 ? '...' : '');
            return `<div class="re-item${selected}${current}" data-idx="${i}">
                <span class="re-name">${name}</span>
                <span class="re-chars">${preview}</span>
            </div>`;
        }).join('');
    }

    _injectStyles() {
        if (document.getElementById('ramp-editor-styles')) return;

        const style = document.createElement('style');
        style.id = 'ramp-editor-styles';
        style.textContent = `
            .ramp-editor {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #0a0a0a;
                border: 1px solid #0a0;
                font-family: 'Courier New', monospace;
                font-size: 11px;
                color: #0f0;
                z-index: 2100;
                min-width: 320px;
                display: none;
                box-shadow: 0 4px 20px rgba(0,255,0,0.3);
            }
            .ramp-editor.visible { display: block; }

            .re-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                background: #111;
                border-bottom: 1px solid #333;
            }
            .re-title { font-weight: bold; }
            .re-hint { color: #444; font-size: 9px; }

            .re-list {
                max-height: 200px;
                overflow-y: auto;
            }

            .re-item {
                display: flex;
                justify-content: space-between;
                padding: 6px 12px;
                cursor: pointer;
                border-bottom: 1px solid #1a1a1a;
            }
            .re-item:hover { background: #1a1a1a; }
            .re-item.selected {
                background: #0a0;
                color: #000;
            }
            .re-item.current .re-name::after {
                content: ' ●';
                color: #0f0;
            }
            .re-item.selected.current .re-name::after {
                color: #000;
            }
            .re-name { font-weight: bold; }
            .re-chars {
                color: #666;
                font-size: 10px;
            }
            .re-item.selected .re-chars { color: #030; }

            .re-preview {
                background: #111;
                border-top: 1px solid #333;
                padding: 10px 12px;
            }
            .re-preview-bar {
                display: flex;
                font-size: 16px;
                letter-spacing: 1px;
                margin-bottom: 4px;
                justify-content: space-between;
            }
            .re-preview-info {
                font-size: 9px;
                color: #666;
                text-align: center;
            }
        `;
        document.head.appendChild(style);
    }

    _bindEvents() {
        // Click on item
        this.els.list.addEventListener('click', (e) => {
            const item = e.target.closest('.re-item');
            if (!item) return;
            this.selectedIndex = parseInt(item.dataset.idx, 10);
            this._renderList();
            this._updatePreview();
        });

        // Double-click to apply
        this.els.list.addEventListener('dblclick', (e) => {
            const item = e.target.closest('.re-item');
            if (item) this._apply();
        });

        // Keyboard
        this.element.addEventListener('keydown', (e) => {
            e.stopPropagation();
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    this.selectedIndex = (this.selectedIndex + 1) % this.rampNames.length;
                    this._renderList();
                    this._updatePreview();
                    this._scrollToSelected();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.selectedIndex = (this.selectedIndex - 1 + this.rampNames.length) % this.rampNames.length;
                    this._renderList();
                    this._updatePreview();
                    this._scrollToSelected();
                    break;
                case 'Enter':
                    e.preventDefault();
                    this._apply();
                    break;
                case 'Escape':
                    this.hide();
                    break;
            }
        });

        // Click outside to close
        document.addEventListener('mousedown', (e) => {
            if (this.visible && !this.element.contains(e.target)) {
                this.hide();
            }
        });
    }

    _scrollToSelected() {
        const item = this.els.list.querySelector('.re-item.selected');
        if (item) item.scrollIntoView({ block: 'nearest' });
    }

    _updatePreview() {
        const name = this.rampNames[this.selectedIndex];
        const ramp = CharacterRamps[name];
        const bar = this.els.previewBar;
        const info = this.els.previewInfo;

        // Create gradient preview - show all chars
        bar.innerHTML = '';
        for (let i = 0; i < ramp.length; i++) {
            const char = ramp[i];
            const brightness = Math.floor((i / (ramp.length - 1)) * 155) + 100;
            const span = document.createElement('span');
            span.textContent = char;
            span.style.color = `rgb(0,${brightness},0)`;
            bar.appendChild(span);
        }

        info.textContent = `"${name}" - ${ramp.length} characters`;
    }

    _apply() {
        const name = this.rampNames[this.selectedIndex];
        this.geometry.setCharRamp(name);
        this.hide();
    }

    /**
     * Show the editor
     */
    show() {
        this.visible = true;
        this.element.classList.add('visible');

        // Find current ramp index
        const currentName = this.geometry.charmap.rampName;
        const idx = this.rampNames.indexOf(currentName);
        this.selectedIndex = idx >= 0 ? idx : 0;

        this._renderList();
        this._updatePreview();
        this._scrollToSelected();

        // Focus for keyboard
        this.element.setAttribute('tabindex', '0');
        this.element.focus();
    }

    /**
     * Hide the editor
     */
    hide() {
        this.visible = false;
        this.element.classList.remove('visible');
        if (this.onClose) this.onClose();
    }

    /**
     * Destroy and cleanup
     */
    destroy() {
        this.element.remove();
    }
}
