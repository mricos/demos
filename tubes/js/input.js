// TUBES.input - Keyboard and Mouse Input Management
(function(TUBES) {
    'use strict';

    // Key mappings
    const mappings = {
        'click': 'select',
        'shift+click': 'toggle-selection',
        'ctrl+shift+click': 'multi-select'
    };

    const actions = {
        'select': 'Select single cylinder (clears others)',
        'toggle-selection': 'Toggle cylinder in selection',
        'multi-select': 'Add cylinder to multi-selection',
        'deselect': 'Deselect all',
        'none': 'No action'
    };

    const currentKeys = {
        shift: false,
        ctrl: false,
        alt: false
    };

    TUBES.input = {
        mappings,
        actions,
        currentKeys,

        init() {
            this.setupKeyListeners();
            this.load();
            console.log('TUBES.input: initialized');
        },

        setupKeyListeners() {
            window.addEventListener('keydown', (e) => {
                currentKeys.shift = e.shiftKey;
                currentKeys.ctrl = e.ctrlKey || e.metaKey;
                currentKeys.alt = e.altKey;

                // Global keyboard shortcuts
                if (e.key === 'Delete' || e.key === 'Backspace') {
                    if (TUBES.cylinder) {
                        TUBES.cylinder.deleteSelected();
                    }
                }

                if (e.key === 'Escape') {
                    if (TUBES.cylinder) {
                        TUBES.cylinder.deselectAll();
                    }
                }

                if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    if (TUBES.cylinder) {
                        TUBES.cylinder.selectAll();
                    }
                }
            });

            window.addEventListener('keyup', (e) => {
                currentKeys.shift = e.shiftKey;
                currentKeys.ctrl = e.ctrlKey || e.metaKey;
                currentKeys.alt = e.altKey;
            });

            window.addEventListener('blur', () => {
                currentKeys.shift = false;
                currentKeys.ctrl = false;
                currentKeys.alt = false;
            });
        },

        getClickType(event) {
            const shift = event.shiftKey;
            const ctrl = event.ctrlKey || event.metaKey;
            const alt = event.altKey;

            if (ctrl && shift) return 'ctrl+shift+click';
            if (shift) return 'shift+click';
            if (ctrl) return 'ctrl+click';
            if (alt) return 'alt+click';
            return 'click';
        },

        getAction(clickType) {
            return mappings[clickType] || 'select';
        },

        setMapping(clickType, action) {
            mappings[clickType] = action;
            this.save();
            TUBES.events.publish('input:mapping-changed', { clickType, action });
        },

        handleCylinderClick(cylinder, event) {
            const clickType = this.getClickType(event);
            const action = this.getAction(clickType);

            switch(action) {
                case 'select':
                    TUBES.cylinder.selectSingle(cylinder.id);
                    break;
                case 'toggle-selection':
                    TUBES.cylinder.toggleSelection(cylinder.id);
                    break;
                case 'multi-select':
                    TUBES.cylinder.addToSelection(cylinder.id);
                    break;
                case 'deselect':
                    TUBES.cylinder.deselectAll();
                    break;
                case 'none':
                    break;
            }
        },

        save() {
            try {
                localStorage.setItem('tubes_keymappings', JSON.stringify(mappings));
            } catch (error) {
                console.error('TUBES.input: save failed', error);
            }
        },

        load() {
            try {
                const stored = localStorage.getItem('tubes_keymappings');
                if (stored) {
                    Object.assign(mappings, JSON.parse(stored));
                }
            } catch (error) {
                console.error('TUBES.input: load failed', error);
            }
        },

        reset() {
            Object.assign(mappings, {
                'click': 'select',
                'shift+click': 'toggle-selection',
                'ctrl+shift+click': 'multi-select'
            });
            this.save();
            TUBES.events.publish('input:mapping-changed', null);
        }
    };
})(window.TUBES);
