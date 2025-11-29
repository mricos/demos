/**
 * BankSelectorUI - Bank selector buttons with long-press to learn bank-switch CC
 * Displays at top of Controls sidebar
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    const LONG_PRESS_DURATION = 500;

    APP.BankSelectorUI = {
        _pressTimer: null,
        _pressBank: null,
        _learningBank: null,
        _unsubscribeInput: null,

        init() {
            const container = document.querySelector('.bank-selector');
            if (!container) {
                console.warn('BankSelectorUI: .bank-selector container not found');
                return;
            }

            this._bindEvents(container);
            this._subscribe();
            this._render();
        },

        _bindEvents(container) {
            // Click = switch bank
            container.addEventListener('click', (e) => {
                const btn = e.target.closest('.bank-btn');
                if (!btn || this._learningBank) return;

                const bank = btn.dataset.bank;
                APP.State.dispatch({ type: 'input.activeBank', payload: bank });
            });

            // Long-press (500ms) = learn bank-switch CC
            container.addEventListener('pointerdown', (e) => {
                const btn = e.target.closest('.bank-btn');
                if (!btn) return;

                this._pressBank = btn.dataset.bank;
                this._pressTimer = setTimeout(() => {
                    this._startBankLearn(this._pressBank);
                }, LONG_PRESS_DURATION);
            });

            container.addEventListener('pointerup', () => this._cancelPress());
            container.addEventListener('pointerleave', () => this._cancelPress());
            container.addEventListener('pointercancel', () => this._cancelPress());

            // Cancel on movement
            container.addEventListener('pointermove', (e) => {
                if (this._pressTimer && e.pointerType !== 'touch') {
                    // Small movement tolerance for non-touch
                    this._cancelPress();
                }
            });
        },

        _cancelPress() {
            if (this._pressTimer) {
                clearTimeout(this._pressTimer);
                this._pressTimer = null;
            }
            this._pressBank = null;
        },

        _startBankLearn(bank) {
            this._learningBank = bank;
            this._render();
            APP.Toast?.info(`Move CC for Bank ${bank}...`);

            // Listen for next CC event via InputHub
            this._unsubscribeInput = APP.InputHub.on((event) => {
                // Only accept MIDI CC for bank switching
                if (!event.fullKey.startsWith('midi:cc:')) return false;

                // Assign this CC to bank switch
                const sourceType = APP.InputHub.getSourceType(event.source, event.key);
                APP.InputHub.setBankSwitchMap(bank, event.fullKey, sourceType, event.key);
                APP.Toast?.success(`Bank ${bank}: ${event.key}`);

                this._stopBankLearn();
                return true; // Consume event
            });

            // Auto-cancel after 10 seconds
            setTimeout(() => {
                if (this._learningBank === bank) {
                    APP.Toast?.info('Bank learn cancelled');
                    this._stopBankLearn();
                }
            }, 10000);
        },

        _stopBankLearn() {
            if (this._unsubscribeInput) {
                this._unsubscribeInput();
                this._unsubscribeInput = null;
            }
            this._learningBank = null;
            this._render();
        },

        _subscribe() {
            APP.State.subscribe('input.activeBank', () => this._render());
            APP.State.subscribe('input.bankSwitchMaps', () => this._render());
        },

        _render() {
            const activeBank = APP.State.select('input.activeBank') || 'A';
            const switchMaps = APP.State.select('input.bankSwitchMaps') || {};

            document.querySelectorAll('.bank-btn').forEach(btn => {
                const bank = btn.dataset.bank;

                // Active state
                btn.classList.toggle('active', bank === activeBank);

                // Learning state
                btn.classList.toggle('learning', bank === this._learningBank);

                // Show assigned CC if any
                const switchMap = switchMaps[bank];
                let indicator = btn.querySelector('.cc-indicator');

                if (switchMap?.source?.key) {
                    if (!indicator) {
                        indicator = document.createElement('span');
                        indicator.className = 'cc-indicator';
                        btn.appendChild(indicator);
                    }
                    // Extract just the CC number from key like 'cc:1:74'
                    const parts = switchMap.source.key.split(':');
                    indicator.textContent = parts[parts.length - 1];
                } else if (indicator) {
                    indicator.remove();
                }
            });
        },

        /**
         * Clear bank-switch assignment for a bank (called from context menu or double-click)
         */
        clearBankSwitch(bank) {
            APP.InputHub.clearBankSwitchMap(bank);
            APP.Toast?.info(`Bank ${bank} switch cleared`);
        }
    };

})(window.APP);
