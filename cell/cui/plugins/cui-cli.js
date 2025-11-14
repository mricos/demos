/**
 * CUI cli Plugin
 * Command-line interface component for CUI framework
 * Version: 1.0.0
 */

(function() {
  'use strict';

  CUI.register('cli', ['core'], function(CUI) {
    const instances = {};

    CUI.cli = {
      /**
       * Create a CLI instance
       * @param {Object} config - Configuration object
       * @param {string} config.id - Unique identifier for this CLI instance
       * @param {string} config.inputId - ID of input element
       * @param {string} config.outputId - ID of output element
       * @param {Object} config.commands - Custom command handlers
       * @param {string} [config.prompt='>'] - Command prompt character
       * @param {Object} [config.colors] - Color scheme
       * @returns {Object} CLI instance
       */
      create(config) {
        if (!config.id || !config.inputId || !config.outputId) {
          throw new Error('cli.create requires id, inputId, and outputId');
        }

        const inputEl = CUI.DOM.$(config.inputId);
        const outputEl = CUI.DOM.$(config.outputId);

        if (!inputEl || !outputEl) {
          throw new Error('cli input or output element not found');
        }

        const colors = {
          prompt: config.colors?.prompt || '#4aa3ff',
          success: config.colors?.success || '#29d398',
          error: config.colors?.error || '#ff6b6b',
          warning: config.colors?.warning || '#f7b955',
          info: config.colors?.info || '#9fb2c6',
          ...config.colors
        };

        const instance = {
          id: config.id,
          inputEl,
          outputEl,
          history: [],
          historyIndex: -1,
          commands: {},
          colors,
          prompt: config.prompt || '>',

          /**
           * Print a line to the CLI output
           * @param {string} text - Text to print
           * @param {string} [color] - Text color (defaults to info color)
           */
          print(text, color = colors.info) {
            const line = document.createElement('div');
            line.style.color = color;
            line.textContent = text;
            outputEl.appendChild(line);
            outputEl.scrollTop = outputEl.scrollHeight;
          },

          /**
           * Clear the CLI output
           */
          clear() {
            outputEl.innerHTML = '';
          },

          /**
           * Register a command handler
           * @param {string} name - Command name
           * @param {Function} handler - Handler function (args, instance) => void
           * @param {Object} [meta] - Command metadata (description, usage, examples)
           */
          register(name, handler, meta = {}) {
            instance.commands[name] = {
              handler,
              description: meta.description || '',
              usage: meta.usage || `${name}`,
              examples: meta.examples || []
            };
          },

          /**
           * Execute a command
           * @param {string} cmd - Command string
           */
          execute(cmd) {
            cmd = cmd.trim();
            if (!cmd) return;

            // Add to history
            instance.history.push(cmd);
            instance.historyIndex = instance.history.length;

            // Print prompt + command
            instance.print(`${instance.prompt} ${cmd}`, colors.prompt);

            // Parse command
            const parts = cmd.split(/\s+/);
            const command = parts[0];
            const args = parts.slice(1);

            // Execute command
            if (instance.commands[command]) {
              try {
                instance.commands[command].handler(args, instance);
              } catch (err) {
                instance.print(`Error: ${err.message}`, colors.error);
              }
            } else {
              instance.print(`Unknown command: ${command}. Type 'help' for commands.`, colors.error);
            }
          },

          /**
           * Navigate command history
           * @param {number} direction - -1 for previous, 1 for next
           */
          navigateHistory(direction) {
            if (instance.history.length === 0) return;

            instance.historyIndex = Math.max(0, Math.min(
              instance.history.length,
              instance.historyIndex + direction
            ));

            if (instance.historyIndex < instance.history.length) {
              inputEl.value = instance.history[instance.historyIndex];
            } else {
              inputEl.value = '';
            }
          }
        };

        // Register built-in commands
        instance.register('help', (args, inst) => {
          inst.print('Available commands:', colors.prompt);
          Object.keys(inst.commands).sort().forEach(cmd => {
            const meta = inst.commands[cmd];
            const desc = meta.description || '';
            inst.print(`  ${meta.usage.padEnd(20)} ${desc}`, colors.info);
          });
        }, {
          description: 'Show available commands',
          usage: 'help'
        });

        instance.register('clear', (args, inst) => {
          inst.clear();
        }, {
          description: 'Clear output',
          usage: 'clear'
        });

        instance.register('history', (args, inst) => {
          if (inst.history.length === 0) {
            inst.print('No command history', colors.info);
            return;
          }
          inst.print('Command history:', colors.prompt);
          inst.history.forEach((cmd, i) => {
            inst.print(`  ${i + 1}. ${cmd}`, colors.info);
          });
        }, {
          description: 'Show command history',
          usage: 'history'
        });

        // Register custom commands
        if (config.commands) {
          Object.keys(config.commands).forEach(name => {
            const cmd = config.commands[name];
            if (typeof cmd === 'function') {
              instance.register(name, cmd);
            } else if (cmd.handler) {
              instance.register(name, cmd.handler, cmd.meta || {});
            }
          });
        }

        // Setup input event listeners
        inputEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const cmd = inputEl.value;
            inputEl.value = '';
            instance.execute(cmd);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            instance.navigateHistory(-1);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            instance.navigateHistory(1);
          }
        });

        // Store instance
        instances[config.id] = instance;

        CUI.log(`cli: Created instance '${config.id}'`);
        return instance;
      },

      /**
       * Get a CLI instance by ID
       * @param {string} id - Instance ID
       * @returns {Object|null} CLI instance
       */
      get(id) {
        return instances[id] || null;
      },

      /**
       * Destroy a CLI instance
       * @param {string} id - Instance ID
       */
      destroy(id) {
        if (instances[id]) {
          delete instances[id];
          CUI.log(`cli: Destroyed instance '${id}'`);
        }
      }
    };

    CUI.log('cli plugin loaded');
  });
})();
