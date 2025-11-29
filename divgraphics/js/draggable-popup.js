/**
 * DraggablePopup - Generic draggable, resizable popup factory
 * Creates reusable draggable popups for info buttons
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.DraggablePopup = {
        /**
         * Create a draggable popup instance
         * @param {Object} options - Configuration
         * @returns {Object} Popup controller
         */
        create(options) {
            const {
                id,
                title = 'Info',
                accentColor = '#00d4ff',
                initialPosition = { left: 20, bottom: 20 },
                initialSize = { width: 320, height: null },
                minSize = { width: 200, height: 100 },
                resizable = true
            } = options;

            const popup = {
                id,
                element: null,
                contentEl: null,
                visible: false,
                isDragging: false,
                isResizing: false,
                dragOffset: { x: 0, y: 0 },
                resizeStart: { x: 0, y: 0, width: 0, height: 0 },

                init(contentHtml) {
                    this._create(contentHtml);
                    this._bindDrag();
                    if (resizable) this._bindResize();
                    this._restore();
                    return this;
                },

                _create(contentHtml) {
                    this.element = document.createElement('div');
                    this.element.className = 'draggable-popup';
                    this.element.id = `popup-${id}`;
                    this.element.style.setProperty('--popup-accent', accentColor);

                    this.element.innerHTML = `
                        <div class="popup-header">
                            <span class="popup-title">${title}</span>
                            <button class="popup-close">&times;</button>
                        </div>
                        <div class="popup-content">${contentHtml}</div>
                        ${resizable ? '<div class="popup-resize-handle"></div>' : ''}
                    `;
                    this.element.style.display = 'none';
                    document.body.appendChild(this.element);

                    this.contentEl = this.element.querySelector('.popup-content');
                    this.element.querySelector('.popup-close')
                        .addEventListener('click', () => this.hide());
                },

                _bindDrag() {
                    const header = this.element.querySelector('.popup-header');

                    header.addEventListener('pointerdown', (e) => {
                        if (e.target.closest('.popup-close')) return;
                        this.isDragging = true;
                        const rect = this.element.getBoundingClientRect();
                        this.dragOffset.x = e.clientX - rect.left;
                        this.dragOffset.y = e.clientY - rect.top;
                        header.setPointerCapture(e.pointerId);
                    });

                    header.addEventListener('pointermove', (e) => {
                        if (!this.isDragging) return;
                        const x = e.clientX - this.dragOffset.x;
                        const y = e.clientY - this.dragOffset.y;
                        this._setPosition(x, y);
                    });

                    header.addEventListener('pointerup', (e) => {
                        if (!this.isDragging) return;
                        this.isDragging = false;
                        header.releasePointerCapture(e.pointerId);
                        this._save();
                    });
                },

                _bindResize() {
                    const handle = this.element.querySelector('.popup-resize-handle');
                    if (!handle) return;

                    handle.addEventListener('pointerdown', (e) => {
                        e.preventDefault();
                        this.isResizing = true;
                        const rect = this.element.getBoundingClientRect();
                        this.resizeStart = {
                            x: e.clientX,
                            y: e.clientY,
                            width: rect.width,
                            height: rect.height
                        };
                        handle.setPointerCapture(e.pointerId);
                    });

                    handle.addEventListener('pointermove', (e) => {
                        if (!this.isResizing) return;
                        const dx = e.clientX - this.resizeStart.x;
                        const dy = e.clientY - this.resizeStart.y;
                        const newWidth = Math.max(minSize.width, this.resizeStart.width + dx);
                        const newHeight = Math.max(minSize.height, this.resizeStart.height + dy);
                        this.element.style.width = `${newWidth}px`;
                        this.element.style.height = `${newHeight}px`;
                    });

                    handle.addEventListener('pointerup', (e) => {
                        if (!this.isResizing) return;
                        this.isResizing = false;
                        handle.releasePointerCapture(e.pointerId);
                        this._save();
                    });
                },

                _setPosition(x, y) {
                    // Bounds check
                    const maxX = window.innerWidth - this.element.offsetWidth;
                    const maxY = window.innerHeight - this.element.offsetHeight;
                    x = Math.max(0, Math.min(x, maxX));
                    y = Math.max(0, Math.min(y, maxY));

                    this.element.style.left = `${x}px`;
                    this.element.style.top = `${y}px`;
                    this.element.style.right = 'auto';
                    this.element.style.bottom = 'auto';
                },

                _restore() {
                    const saved = APP.State?.select(`ui.popups.${id}`);
                    if (saved) {
                        // Restore position
                        if (saved.left !== undefined) this.element.style.left = `${saved.left}px`;
                        if (saved.top !== undefined) this.element.style.top = `${saved.top}px`;
                        // Restore size
                        if (saved.width !== undefined) this.element.style.width = `${saved.width}px`;
                        if (saved.height !== undefined) this.element.style.height = `${saved.height}px`;
                        // Clear any initial position styles
                        this.element.style.right = 'auto';
                        this.element.style.bottom = 'auto';
                    } else {
                        // Apply initial position
                        Object.entries(initialPosition).forEach(([prop, val]) => {
                            this.element.style[prop] = `${val}px`;
                        });
                        // Apply initial size
                        if (initialSize.width) this.element.style.width = `${initialSize.width}px`;
                        if (initialSize.height) this.element.style.height = `${initialSize.height}px`;
                    }
                },

                _save() {
                    const rect = this.element.getBoundingClientRect();
                    APP.State?.dispatch({
                        type: `ui.popups.${id}`,
                        payload: {
                            left: rect.left,
                            top: rect.top,
                            width: rect.width,
                            height: rect.height
                        }
                    });
                },

                show() {
                    this.element.style.display = 'flex';
                    this.visible = true;
                },

                hide() {
                    this.element.style.display = 'none';
                    this.visible = false;
                },

                toggle() {
                    this.visible ? this.hide() : this.show();
                },

                updateContent(html) {
                    if (this.contentEl) this.contentEl.innerHTML = html;
                },

                getContentEl() {
                    return this.contentEl;
                },

                destroy() {
                    this.element?.remove();
                }
            };

            return popup;
        }
    };

})(window.APP);
