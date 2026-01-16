/**
 * Keybindings - Data-driven keyboard control configuration
 *
 * Syntax:
 *   'param.name'      → toggle (for booleans) or show value
 *   'param.name++'    → increment by step
 *   'param.name--'    → decrement by step
 *   'param.name+=N'   → increment by N
 *   'param.name-=N'   → decrement by N
 *   'param.name=V'    → set to value V
 *   '@command'        → execute command (calibrate, reset, focus-repl, etc.)
 */

export const keybindings = {
    // REPL
    '`': '@focus-repl',
    '~': '@focus-repl',

    // Calibration & modifiers
    'k': '@calibrate',
    'K': '@calibrate',
    'm': 'app.reverse',
    'M': 'app.reverse',

    // Processor controls
    'b': 'proc.brightness--',
    'B': 'proc.brightness++',
    'c': 'proc.contrast--',
    'C': 'proc.contrast++',
    'r': '@toggle-ramp',
    'R': '@toggle-ramp',
    'i': 'proc.invert',
    'I': 'proc.invert',

    // Resolution (uses commands to maintain aspect ratio)
    '+': '@resolution-up',
    '=': '@resolution-up',
    '-': '@resolution-down',
    '_': '@resolution-down',
    '0': '@reset',

    // Layer toggles
    '1': 'layer.camera-ascii.visible',
    '2': 'layer.skeleton.visible',
    '3': 'layer.hud.visible',
    '4': 'layer.vectar.visible',

    // Skeleton effects
    's': 'layer.skeleton.visible',
    'S': 'layer.skeleton.visible',
    'g': 'layer.skeleton.glow+=2',
    'G': 'layer.camera-ascii.glow+=2',
    'o': 'layer.skeleton.opacity-=0.1',
    'O': 'layer.skeleton.opacity+=0.1',
    'u': 'layer.skeleton.blur--',
    'U': 'layer.skeleton.blur++',

    // HUD toggle
    'd': 'layer.hud.visible',
    'D': 'layer.hud.visible',

    // Broadcast
    't': 'app.broadcast',
    'T': 'app.broadcast',

    // Quit
    'q': '@stop',
    'Escape': '@blur-repl',
};

/**
 * Parse a keybinding action string
 * @param {string} action - Action string like 'param.name++' or '@command'
 * @returns {Object} Parsed action
 */
export function parseAction(action) {
    // Command
    if (action.startsWith('@')) {
        return { type: 'command', command: action.slice(1) };
    }

    // Assignment: param=value
    const eqMatch = action.match(/^(.+?)=([^=+-].*)$/);
    if (eqMatch) {
        return { type: 'set', param: eqMatch[1], value: parseFloat(eqMatch[2]) };
    }

    // Increment: param++ or param+=N
    const incMatch = action.match(/^(.+?)\+\+$/);
    if (incMatch) {
        return { type: 'increment', param: incMatch[1], step: 1 };
    }
    const incNMatch = action.match(/^(.+?)\+=(.+)$/);
    if (incNMatch) {
        return { type: 'increment', param: incNMatch[1], step: parseFloat(incNMatch[2]) };
    }

    // Decrement: param-- or param-=N
    const decMatch = action.match(/^(.+?)--$/);
    if (decMatch) {
        return { type: 'decrement', param: decMatch[1], step: 1 };
    }
    const decNMatch = action.match(/^(.+?)-=(.+)$/);
    if (decNMatch) {
        return { type: 'decrement', param: decNMatch[1], step: parseFloat(decNMatch[2]) };
    }

    // Just param name = toggle or query
    return { type: 'toggle', param: action };
}

/**
 * Execute a parsed action
 * @param {Object} action - Parsed action from parseAction
 * @param {Object} app - Application instance
 * @returns {*} Result of action
 */
export function executeAction(action, app) {
    const registry = app.registry;

    switch (action.type) {
        case 'command':
            return executeCommand(action.command, app);

        case 'toggle': {
            const param = registry.get(action.param);
            if (param) {
                const result = param.toggle();
                console.log(`${action.param}: ${param.getDisplay()}`);
                return result;
            }
            console.log(`Unknown param: ${action.param}`);
            return null;
        }

        case 'increment': {
            const param = registry.get(action.param);
            if (param) {
                // Use step from action or param spec
                const step = action.step !== 1 ? action.step : param.spec.step;
                param.increment(action.step / param.spec.step);
                console.log(`${action.param}: ${param.getDisplay()}`);
                return param.get();
            }
            console.log(`Unknown param: ${action.param}`);
            return null;
        }

        case 'decrement': {
            const param = registry.get(action.param);
            if (param) {
                const step = action.step !== 1 ? action.step : param.spec.step;
                param.decrement(action.step / param.spec.step);
                console.log(`${action.param}: ${param.getDisplay()}`);
                return param.get();
            }
            console.log(`Unknown param: ${action.param}`);
            return null;
        }

        case 'set': {
            const param = registry.get(action.param);
            if (param) {
                param.set(action.value);
                console.log(`${action.param}: ${param.getDisplay()}`);
                return param.get();
            }
            console.log(`Unknown param: ${action.param}`);
            return null;
        }

        default:
            console.log(`Unknown action type: ${action.type}`);
            return null;
    }
}

/**
 * Execute a command
 * @param {string} command - Command name
 * @param {Object} app - Application instance
 */
function executeCommand(command, app) {
    switch (command) {
        case 'focus-repl':
            app.focusREPL?.();
            return true;

        case 'blur-repl':
            app.repl?.blur?.();
            return true;

        case 'calibrate':
            const success = app.calibrate?.();
            console.log('Calibrate:', success ? 'OK' : 'No hand detected');
            return success;

        case 'reset':
            app.processor?.reset?.();
            app.setResolution?.(100, 60);
            console.log('Reset to defaults');
            return true;

        case 'resolution-up': {
            const cols = app.registry?.getValue('app.cols') || 100;
            const newCols = Math.min(200, cols + 20);
            const newRows = Math.round(newCols * 9 / 16);
            app.setResolution?.(newCols, newRows);
            console.log(`Resolution: ${newCols}x${newRows}`);
            return true;
        }

        case 'resolution-down': {
            const cols = app.registry?.getValue('app.cols') || 100;
            const newCols = Math.max(40, cols - 20);
            const newRows = Math.round(newCols * 9 / 16);
            app.setResolution?.(newCols, newRows);
            console.log(`Resolution: ${newCols}x${newRows}`);
            return true;
        }

        case 'toggle-ramp':
            app.processor?.toggle_ramp?.();
            console.log('Toggled ASCII ramp');
            return true;

        case 'stop':
            app.stop?.();
            return true;

        default:
            console.log(`Unknown command: ${command}`);
            return false;
    }
}

/**
 * Create keyboard event handler
 * @param {Object} app - Application instance
 * @param {Object} bindings - Keybindings object
 * @returns {Function} Event handler
 */
export function createKeyHandler(app, bindings = keybindings) {
    // Pre-parse all bindings
    const parsedBindings = {};
    for (const [key, action] of Object.entries(bindings)) {
        parsedBindings[key] = parseAction(action);
    }

    return function handleKeyDown(e) {
        // Don't capture when typing in REPL (except Escape)
        if (document.activeElement?.id === 'repl-input' && e.key !== 'Escape') {
            return;
        }

        const action = parsedBindings[e.key];
        if (action) {
            // Prevent default for special keys
            if (e.key === '`' || e.key === '~' || e.key === 'Escape') {
                e.preventDefault();
            }
            executeAction(action, app);
        }
    };
}
