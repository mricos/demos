/**
 * Controls - Data-driven keyboard control setup
 * Uses keybindings.js for configuration
 */

import { keybindings, createKeyHandler } from './keybindings.js';

/**
 * Setup keyboard controls for the application
 * @param {Object} app - Application instance with registry
 */
export function setupControls(app) {
    const handler = createKeyHandler(app, keybindings);
    document.addEventListener('keydown', handler);

    // Return cleanup function
    return () => {
        document.removeEventListener('keydown', handler);
    };
}
