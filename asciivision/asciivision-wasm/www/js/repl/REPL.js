/**
 * REPL - Read-Eval-Print-Loop with tab-completion and parameter editor
 * Uses ParamRegistry for data-driven parameter management
 */

import { ParamRegistry } from './ParamRegistry.js';
import { ParamEditor } from './ParamEditor.js';
import { RampEditor } from './RampEditor.js';

export class REPL {
    /**
     * @param {ParamRegistry} registry - Parameter registry
     * @param {Object} [options] - Options
     * @param {HTMLElement} [options.container] - Container element (uses existing DOM if provided)
     * @param {boolean} [options.visible=true] - Initial visibility
     */
    constructor(registry, options = {}) {
        this.registry = registry;
        this.visible = options.visible !== false;

        // DOM elements
        this.container = null;
        this.input = null;
        this.output = null;
        this.autocomplete = null;
        this.autocompleteGrid = null;

        // State
        this.history = [];
        this.historyIdx = -1;
        this.matches = [];
        this.selectedIdx = 0;
        this.activeParam = null;
        this.mode = 'params';  // 'namespaces' | 'params'
        this.currentNamespace = null;

        // Parameter editor popup
        this.paramEditor = new ParamEditor({
            registry: this.registry,
            onClose: () => this.input?.focus()
        });

        // Ramp editor popup
        this.rampEditor = new RampEditor({
            onClose: () => this.input?.focus()
        });

        // Bind methods
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onInput = this._onInput.bind(this);
        this._onAutocompleteClick = this._onAutocompleteClick.bind(this);

        // Attach to existing DOM if provided
        if (options.container) {
            this.attachToDOM(options.container);
        }
    }

    /**
     * Attach to existing DOM elements
     * @param {HTMLElement} container - Container element
     */
    attachToDOM(container) {
        this.container = container;

        // Find elements
        this.input = container.querySelector('#repl-input') ||
                     container.querySelector('input[type="text"]');
        this.output = container.querySelector('#repl-output');

        // Find or create autocomplete
        this.autocomplete = document.getElementById('autocomplete');
        if (this.autocomplete) {
            this.autocompleteGrid = this.autocomplete.querySelector('#autocomplete-grid');
        }

        // Attach event listeners
        if (this.input) {
            this.input.addEventListener('keydown', this._onKeyDown);
            this.input.addEventListener('input', this._onInput);
        }
        if (this.autocomplete) {
            this.autocomplete.addEventListener('click', this._onAutocompleteClick);
        }

        // Initial visibility
        if (!this.visible && this.container) {
            this.container.style.display = 'none';
        }
    }

    /**
     * Create REPL DOM elements dynamically
     * @param {HTMLElement} parent - Parent element
     */
    createDOM(parent) {
        // Create container
        this.container = document.createElement('div');
        this.container.id = 'repl-container';
        this.container.innerHTML = `
            <div id="repl-input-container">
                <span id="repl-prompt">&gt;</span>
                <input type="text" id="repl-input" placeholder="type param, tab to complete..." autocomplete="off">
            </div>
            <div id="repl-output"></div>
        `;
        parent.appendChild(this.container);

        // Create autocomplete popup
        this.autocomplete = document.createElement('div');
        this.autocomplete.id = 'autocomplete';
        this.autocomplete.innerHTML = '<div id="autocomplete-grid"></div>';
        document.body.appendChild(this.autocomplete);
        this.autocompleteGrid = this.autocomplete.querySelector('#autocomplete-grid');

        // Cache elements
        this.input = document.getElementById('repl-input');
        this.output = document.getElementById('repl-output');

        // Attach event listeners
        this.input.addEventListener('keydown', this._onKeyDown);
        this.input.addEventListener('input', this._onInput);
        this.autocomplete.addEventListener('click', this._onAutocompleteClick);

        // Initial visibility
        if (!this.visible) {
            this.container.style.display = 'none';
        }

        this._injectStyles();
    }

    /**
     * Inject CSS styles
     */
    _injectStyles() {
        if (document.getElementById('repl-styles')) return;

        const style = document.createElement('style');
        style.id = 'repl-styles';
        style.textContent = `
            #repl-container {
                width: 100%;
                background: #0a0a0a;
                font-family: 'Courier New', monospace;
                border: 1px solid #1a1a1a;
            }
            #repl-input-container {
                display: flex;
                align-items: center;
                padding: 4px 8px;
                border-bottom: 1px solid #1a1a1a;
            }
            #repl-prompt { color: #0a0; margin-right: 4px; }
            #repl-input {
                flex: 1;
                background: transparent;
                border: none;
                color: #0f0;
                font-family: inherit;
                font-size: 12px;
                outline: none;
            }
            #repl-output {
                max-height: 80px;
                overflow-y: auto;
                padding: 4px 8px;
                font-size: 11px;
                color: #080;
            }
            #autocomplete {
                position: fixed;
                background: #111;
                border: 1px solid #333;
                z-index: 1000;
                display: none;
                padding: 4px;
                max-height: 200px;
                overflow-y: auto;
            }
            #autocomplete-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                gap: 2px;
            }
            .autocomplete-item {
                padding: 3px 6px;
                cursor: pointer;
                font-size: 11px;
                font-family: 'Courier New', monospace;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                border-radius: 2px;
                display: flex;
                justify-content: space-between;
                gap: 8px;
            }
            .autocomplete-item:hover,
            .autocomplete-item.selected {
                background: #0a0;
                color: #000;
            }
            .autocomplete-item .param-type {
                width: 12px;
                text-align: center;
                color: #0a0;
                flex-shrink: 0;
            }
            .autocomplete-item.selected .param-type { color: #030; }
            .autocomplete-item .param-name { flex: 1; }
            .autocomplete-item .param-value {
                color: #666;
                font-size: 10px;
            }
            .autocomplete-item.selected .param-value { color: #030; }
            .autocomplete-item .param-readonly {
                color: #666;
                font-size: 9px;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Handle keydown events
     */
    _onKeyDown(e) {
        switch (e.key) {
            case 'Tab':
                e.preventDefault();
                this._handleTab();
                break;

            case 'ArrowDown':
                if (this.matches.length > 0) {
                    e.preventDefault();
                    this.selectedIdx = (this.selectedIdx + 1) % this.matches.length;
                    this._renderAutocomplete();
                } else if (this.historyIdx < this.history.length - 1) {
                    // History navigation
                    this.historyIdx++;
                    this.input.value = this.history[this.historyIdx] || '';
                }
                break;

            case 'ArrowUp':
                if (this.matches.length > 0) {
                    e.preventDefault();
                    this.selectedIdx = (this.selectedIdx - 1 + this.matches.length) % this.matches.length;
                    this._renderAutocomplete();
                } else if (this.historyIdx > 0) {
                    // History navigation
                    this.historyIdx--;
                    this.input.value = this.history[this.historyIdx];
                } else if (this.historyIdx === 0) {
                    this.historyIdx = -1;
                    this.input.value = '';
                }
                break;

            case 'Enter':
                if (this.matches.length > 0 && this.autocomplete?.style.display !== 'none') {
                    e.preventDefault();
                    this._selectAutocomplete();
                } else {
                    this._execute();
                }
                break;

            case 'Escape':
                this._hideAutocomplete();
                this._hideSlider();
                this.input.blur();
                break;

            case 'Backspace':
                // Go up one level if in hierarchical mode and input ends with "."
                if (this.mode === 'namespaces' && this.input.value.endsWith('.')) {
                    e.preventDefault();
                    const parts = this.input.value.slice(0, -1).split('.');
                    parts.pop();  // Remove last segment
                    const newPrefix = parts.length > 0 ? parts.join('.') + '.' : '';
                    this.input.value = newPrefix;
                    this.matches = this._getHierarchicalMatches(newPrefix);
                    this.selectedIdx = 0;
                    if (this.matches.length > 0) {
                        this._renderAutocomplete();
                    } else {
                        this._hideAutocomplete();
                    }
                }
                break;
        }
    }

    /**
     * Get hierarchical matches for a prefix
     * Returns namespaces if there are sub-levels, or params if at leaf level
     */
    _getHierarchicalMatches(prefix) {
        const prefixDepth = prefix ? prefix.split('.').length : 0;
        const nextLevel = new Map();  // name -> { count, hasSubLevels }

        for (const [name, param] of this.registry.params) {
            if (prefix && !name.startsWith(prefix)) continue;

            const suffix = prefix ? name.slice(prefix.length) : name;
            const parts = suffix.split('.');
            const nextPart = parts[0];

            if (!nextLevel.has(nextPart)) {
                nextLevel.set(nextPart, { count: 0, hasSubLevels: false, param: null });
            }

            const entry = nextLevel.get(nextPart);
            entry.count++;

            // Check if this is a leaf (no more dots after this part)
            if (parts.length > 1) {
                entry.hasSubLevels = true;
            } else {
                entry.param = param;
            }
        }

        // Build matches array
        const matches = [];
        for (const [name, info] of nextLevel) {
            const fullName = prefix ? prefix + name : name;

            if (info.hasSubLevels || info.count > 1) {
                // This is a namespace (has sub-levels or multiple items)
                matches.push({
                    name: fullName,
                    displayName: name,
                    isNamespace: true,
                    count: info.count
                });
            } else if (info.param) {
                // This is a leaf param
                matches.push({
                    name: fullName,
                    displayName: name,
                    param: info.param
                });
            }
        }

        return matches.sort((a, b) => a.displayName.localeCompare(b.displayName));
    }

    /**
     * Handle tab key
     */
    _handleTab() {
        const query = this.input.value.trim();

        if (query === '' || query.endsWith('.')) {
            // Show hierarchical namespaces for current prefix
            this.mode = 'namespaces';
            this.currentNamespace = query || null;

            this.matches = this._getHierarchicalMatches(query);
            this.selectedIdx = 0;
            this._renderAutocomplete();
        } else if (this.mode === 'namespaces' && this.matches.length > 0) {
            // Drill into namespace
            this._selectAutocomplete();
        } else if (this.matches.length > 0) {
            // Complete selection
            this._selectAutocomplete();
        }
    }

    /**
     * Select current autocomplete item
     */
    _selectAutocomplete() {
        if (this.matches.length === 0) return;

        const match = this.matches[this.selectedIdx];

        if (match.isNamespace) {
            // Drill into namespace - show next level
            this.mode = 'namespaces';
            this.currentNamespace = match.name;
            this.input.value = match.name + '.';

            this.matches = this._getHierarchicalMatches(match.name + '.');
            this.selectedIdx = 0;
            this._renderAutocomplete();
        } else {
            // Select parameter
            this.input.value = match.name;
            this._showSlider(match.name);
            this._hideAutocomplete();
            this.mode = 'params';
            this.currentNamespace = null;
        }
    }

    /**
     * Handle input changes
     */
    _onInput() {
        const query = this.input.value.trim();

        if (query.length === 0) {
            this._hideAutocomplete();
            return;
        }

        // Don't autocomplete if contains = (assignment)
        if (query.includes('=')) {
            this._hideAutocomplete();
            return;
        }

        // Use hierarchical mode when query ends with "."
        if (query.endsWith('.')) {
            this.mode = 'namespaces';
            this.matches = this._getHierarchicalMatches(query);
            this.selectedIdx = 0;

            if (this.matches.length > 0) {
                this._renderAutocomplete();
            } else {
                this._hideAutocomplete();
            }
            return;
        }

        // Search for matches (flat search for partial names)
        this.mode = 'params';
        this.matches = this.registry.search(query);
        this.selectedIdx = 0;

        if (this.matches.length > 0) {
            this._renderAutocomplete();
        } else {
            this._hideAutocomplete();
        }
    }

    /**
     * Handle autocomplete item click
     */
    _onAutocompleteClick(e) {
        const item = e.target.closest('.autocomplete-item');
        if (!item) return;

        const idx = parseInt(item.dataset.idx, 10);
        if (isNaN(idx)) return;

        this.selectedIdx = idx;
        this._selectAutocomplete();
        this.input.focus();
    }

    /**
     * Render autocomplete dropdown
     */
    _renderAutocomplete() {
        if (!this.autocomplete || !this.autocompleteGrid) return;

        const rect = this.input.getBoundingClientRect();
        this.autocomplete.style.left = `${rect.left}px`;
        this.autocomplete.style.top = `${rect.bottom + 2}px`;
        this.autocomplete.style.display = 'block';

        if (this.mode === 'namespaces') {
            // Render namespace/param list with short names
            this.autocompleteGrid.innerHTML = this.matches.map((match, i) => {
                const selected = i === this.selectedIdx ? ' selected' : '';
                const displayName = match.displayName || match.name;

                if (match.isNamespace) {
                    return `<div class="autocomplete-item${selected}" data-idx="${i}">
                        <span class="param-type">◈</span>
                        <span class="param-name">${displayName}/</span>
                        <span class="param-value">(${match.count})</span>
                    </div>`;
                } else {
                    // Leaf param at this level
                    const display = match.param.getDisplay();
                    const typeIcon = this._getTypeIcon(match.param);
                    return `<div class="autocomplete-item${selected}" data-idx="${i}">
                        <span class="param-type">${typeIcon}</span>
                        <span class="param-name">${displayName}</span>
                        <span class="param-value">${display}</span>
                    </div>`;
                }
            }).join('');
        } else {
            // Render parameter list
            this.autocompleteGrid.innerHTML = this.matches.map((match, i) => {
                const { name, param } = match;
                const display = param.getDisplay();
                const readonly = param.spec.readonly ? ' [ro]' : '';
                const typeIcon = this._getTypeIcon(param);
                const selected = i === this.selectedIdx ? ' selected' : '';

                return `<div class="autocomplete-item${selected}" data-idx="${i}">
                    <span class="param-type">${typeIcon}</span>
                    <span class="param-name">${name}</span>
                    <span class="param-value">${display}${readonly}</span>
                </div>`;
            }).join('');
        }
    }

    /**
     * Get type icon for a parameter
     */
    _getTypeIcon(param) {
        const type = param?.spec?.type || 'number';
        switch (type) {
            case 'boolean': return '◉';
            case 'enum': return '▼';
            case 'trigger': return '▶';
            default: return '─';
        }
    }

    /**
     * Hide autocomplete
     */
    _hideAutocomplete() {
        if (this.autocomplete) {
            this.autocomplete.style.display = 'none';
        }
        this.matches = [];
        this.selectedIdx = 0;
        this.mode = 'params';
        this.currentNamespace = null;
    }

    /**
     * Show parameter editor for parameter
     */
    _showSlider(name) {
        const param = this.registry.get(name);
        if (!param || param.spec.readonly) {
            this._hideSlider();
            return;
        }

        this.activeParam = param;

        // Use new ParamEditor
        this.paramEditor.show(param, this.input);
    }

    /**
     * Hide parameter editor
     */
    _hideSlider() {
        this.paramEditor.hide();
        this.activeParam = null;
    }

    /**
     * Execute command
     */
    _execute() {
        const cmd = this.input.value.trim();
        if (!cmd) return;

        // Add to history
        if (this.history[this.history.length - 1] !== cmd) {
            this.history.push(cmd);
        }
        this.historyIdx = this.history.length;

        // Parse and execute
        try {
            if (cmd === 'help' || cmd === '?') {
                this._showHelp();
            } else if (cmd === 'list' || cmd === 'ls') {
                this._listParams();
            } else if (cmd === 'reset') {
                this.registry.resetAll();
                this._log('All parameters reset to defaults');
            } else if (cmd.startsWith('reset ')) {
                const pattern = cmd.slice(6).trim();
                const matches = this.registry.match(pattern);
                matches.forEach(({ param }) => param.reset());
                this._log(`Reset ${matches.length} parameters`);
            } else if (cmd === 'ramp' || cmd === 'ramps') {
                this.rampEditor.show();
            } else if (cmd.startsWith('vv.') || cmd === 'vv') {
                this._handleVVCommand(cmd);
            } else if (cmd.includes('=')) {
                // Assignment: param = value
                const eqIdx = cmd.indexOf('=');
                const name = cmd.slice(0, eqIdx).trim();
                const valueStr = cmd.slice(eqIdx + 1).trim();

                const param = this.registry.get(name);
                if (param) {
                    if (param.spec.readonly) {
                        this._log(`${name} is read-only`);
                    } else {
                        param.setFromString(valueStr);
                        this._log(`${name} = ${param.getDisplay()}`);
                    }
                } else {
                    this._log(`Unknown: ${name}`);
                }
            } else {
                // Query: param
                const param = this.registry.get(cmd);
                if (param) {
                    const info = param.getInfo();
                    this._log(`${cmd} = ${param.getDisplay()}`);
                    if (info.description) {
                        this._log(`  ${info.description}`);
                    }
                    if (param.spec.type === 'number') {
                        this._log(`  range: ${info.min} - ${info.max}`);
                    }
                    if (param.spec.choices) {
                        this._log(`  choices: ${param.spec.choices.join(', ')}`);
                    }
                } else {
                    // Try pattern match
                    const matches = this.registry.match(cmd + '*');
                    if (matches.length > 0) {
                        matches.forEach(({ name, param }) => {
                            this._log(`${name} = ${param.getDisplay()}`);
                        });
                    } else {
                        this._log(`Unknown: ${cmd}. Try 'help' or 'list'`);
                    }
                }
            }
        } catch (e) {
            this._log(`Error: ${e.message}`);
        }

        this.input.value = '';
        this._hideAutocomplete();
        this._hideSlider();
    }

    /**
     * Handle VectorVision commands
     */
    _handleVVCommand(cmd) {
        // Access VectorVision layer via window.vv() (set up by main.js)
        const vv = window.vv?.();
        if (!vv) {
            this._log('VectorVision not available');
            return;
        }

        const parts = cmd.split(/\s+/);
        const subcmd = parts[0].slice(3);  // Remove 'vv.' prefix

        switch (subcmd) {
            case '':  // Just 'vv'
            case 'help':
                this._log('VectorVision commands:');
                this._log('  vv.list        List active sprites');
                this._log('  vv.builtins    List built-in sprites');
                this._log('  vv.add <name>  Add built-in sprite');
                this._log('  vv.remove <id> Remove sprite');
                this._log('  vv.clear       Remove all sprites');
                this._log('  vv.demo        Toggle demo mode');
                break;

            case 'list':
                const sprites = vv.getSpriteList();
                if (sprites.length === 0) {
                    this._log('No active sprites');
                } else {
                    this._log(`Active sprites (${sprites.length}):`);
                    sprites.forEach(id => this._log(`  ${id}`));
                }
                break;

            case 'builtins':
                const builtins = vv.getBuiltInNames();
                this._log(`Built-in sprites: ${builtins.join(', ')}`);
                break;

            case 'add':
                const spriteName = parts[1];
                if (!spriteName) {
                    this._log('Usage: vv.add <sprite-name> [id]');
                    this._log(`Available: ${vv.getBuiltInNames().join(', ')}`);
                    return;
                }
                const spriteId = parts[2] || spriteName;
                const sprite = vv.addSprite(spriteId, spriteName);
                if (sprite) {
                    sprite.setScale(0.3);
                    this._log(`Added sprite "${spriteId}" (${spriteName})`);
                } else {
                    this._log(`Unknown sprite: ${spriteName}`);
                    this._log(`Available: ${vv.getBuiltInNames().join(', ')}`);
                }
                break;

            case 'remove':
                const removeId = parts[1];
                if (!removeId) {
                    this._log('Usage: vv.remove <sprite-id>');
                    return;
                }
                if (vv.getSprite(removeId)) {
                    vv.removeSprite(removeId);
                    this._log(`Removed sprite "${removeId}"`);
                } else {
                    this._log(`Sprite not found: ${removeId}`);
                }
                break;

            case 'clear':
                const count = vv.getSpriteList().length;
                vv.clearSprites();
                this._log(`Cleared ${count} sprites`);
                break;

            case 'demo':
                if (vv.autoRotate) {
                    vv.stopDemo();
                    this._log('Demo stopped');
                } else {
                    vv.startDemo();
                    this._log('Demo started (rotating cube)');
                }
                break;

            default:
                this._log(`Unknown vv command: ${subcmd}`);
                this._log('Type "vv" for help');
        }
    }

    /**
     * Show help
     */
    _showHelp() {
        this._log('REPL Commands:');
        this._log('  <param>           Query value');
        this._log('  <param> = <val>   Set value');
        this._log('  list / ls         List all params');
        this._log('  reset             Reset all to defaults');
        this._log('  reset <pattern>   Reset matching params');
        this._log('  ramp              Open character ramp selector');
        this._log('  vv                VectorVision sprite commands');
        this._log('  Tab               Show autocomplete');
        this._log('  Arrow keys        Navigate autocomplete/history');
        this._log('  Esc               Close and blur');
    }

    /**
     * List all parameters by namespace
     */
    _listParams() {
        const namespaces = this.registry.getNamespaces();
        for (const ns of namespaces) {
            const params = this.registry.getNamespace(ns);
            const names = params.map(({ param }) => param.shortName);
            this._log(`[${ns}] ${names.join(', ')}`);
        }
        this._log(`Total: ${this.registry.size} parameters`);
    }

    /**
     * Log message to output
     */
    _log(msg) {
        if (!this.output) {
            console.log('[REPL]', msg);
            return;
        }

        const line = document.createElement('div');
        line.textContent = msg;
        this.output.appendChild(line);
        this.output.scrollTop = this.output.scrollHeight;

        // Limit output lines
        while (this.output.children.length > 100) {
            this.output.removeChild(this.output.firstChild);
        }
    }

    /**
     * Clear output
     */
    clearOutput() {
        if (this.output) {
            this.output.innerHTML = '';
        }
    }

    /**
     * Toggle visibility
     * @returns {boolean} New visibility state
     */
    toggle() {
        this.visible = !this.visible;
        if (this.container) {
            this.container.style.display = this.visible ? '' : 'none';
        }
        return this.visible;
    }

    /**
     * Show REPL
     */
    show() {
        this.visible = true;
        if (this.container) {
            this.container.style.display = '';
        }
    }

    /**
     * Hide REPL
     */
    hide() {
        this.visible = false;
        if (this.container) {
            this.container.style.display = 'none';
        }
        this._hideAutocomplete();
        this._hideSlider();
    }

    /**
     * Focus input
     */
    focus() {
        if (this.input) {
            this.input.focus();
        }
    }

    /**
     * Blur input
     */
    blur() {
        if (this.input) {
            this.input.blur();
        }
        this._hideAutocomplete();
        this._hideSlider();
    }

    /**
     * Destroy REPL and clean up
     */
    destroy() {
        // Remove event listeners
        if (this.input) {
            this.input.removeEventListener('keydown', this._onKeyDown);
            this.input.removeEventListener('input', this._onInput);
        }
        if (this.autocomplete) {
            this.autocomplete.removeEventListener('click', this._onAutocompleteClick);
            this.autocomplete.remove();
        }

        // Clean up ParamEditor
        if (this.paramEditor) {
            this.paramEditor.destroy();
        }

        // Clean up RampEditor
        if (this.rampEditor) {
            this.rampEditor.destroy();
        }

        this.activeParam = null;
        this.matches = [];
    }
}
