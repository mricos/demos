/**
 * DivGraphics - Hardware UI Helpers
 * Shared UI rendering for hardware adapters (MIDI, Gamepad, etc.)
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.HardwareUI = {
        /**
         * Render device select dropdown
         * @param {HTMLSelectElement} selectEl - The select element
         * @param {Array} devices - Array of device objects
         * @param {string|null} currentName - Currently selected device name
         * @param {string} valueProp - Property to use as option value (default: 'id')
         */
        renderDeviceList(selectEl, devices, currentName, valueProp = 'id') {
            if (!selectEl) return;

            selectEl.innerHTML = '<option value="">Select device...</option>';
            devices.forEach(device => {
                const opt = document.createElement('option');
                opt.value = device[valueProp];
                opt.textContent = device.name || device[valueProp];
                selectEl.appendChild(opt);
            });

            if (currentName) {
                const match = devices.find(d => d.name === currentName);
                if (match) selectEl.value = match[valueProp];
            }
        },

        /**
         * Update connection status indicator
         * @param {HTMLElement} indicator - Status indicator element
         * @param {HTMLElement} textEl - Status text element
         * @param {boolean} isConnected - Connection state
         */
        renderStatus(indicator, textEl, isConnected) {
            if (indicator) indicator.classList.toggle('connected', isConnected);
            if (textEl) textEl.textContent = isConnected ? 'Connected' : 'Disconnected';
        },

        /**
         * Sync checkbox state with State and bind change event
         * @param {HTMLInputElement} checkbox - Checkbox element
         * @param {string} stateKey - State path (e.g., 'display.midiToasts')
         */
        syncToastsCheckbox(checkbox, stateKey) {
            if (!checkbox) return;
            checkbox.checked = APP.State.select(stateKey);
        }
    };

})(window.APP);
