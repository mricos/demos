/**
 * CUI Terminal
 * Terminal display + embedded CLI
 * Uses CommandManager for command execution
 * Supports component-based interactive output
 */

(function() {
  'use strict';

  CUI.register('terminal', ['core', 'lifecycle', 'command-manager'], function(CUI) {
    CUI.log('Terminal module initializing...');

    // ========================================================================
    // Terminal Manager
    // ========================================================================

    CUI.terminal = {
      instances: {},

      /**
       * Create a terminal instance
       *
       * @param {Object} config
       * @param {string} config.id - Terminal container ID
       * @param {number} config.maxLines - Max scrollback lines (default: 1000)
       * @param {string} config.prompt - Prompt string (default: '$')
       * @param {boolean} config.crtEffects - Enable CRT scanlines/flicker (default: true)
       * @param {Object} config.commands - Additional commands to register
       */
      create(config) {
        const {
          id,
          maxLines = 1000,
          prompt = '$',
          crtEffects = true,
          commands = {}
        } = config;

        const container = CUI.DOM.$(id);
        if (!container) {
          CUI.error(`Terminal container #${id} not found`);
          return null;
        }

        // Build terminal UI with semantic classes
        const outputEl = CUI.DOM.create('div', { class: 'cui-terminal-output' });
        const inputArea = CUI.DOM.create('div', { class: 'cui-terminal-input' });
        const promptEl = CUI.DOM.create('span', { class: 'cui-terminal-prompt' }, prompt + ' ');
        const inputEl = CUI.DOM.create('input', {
          type: 'text',
          class: 'cui-terminal-input-field',
          placeholder: 'Type "help" for commands...'
        });

        inputArea.appendChild(promptEl);
        inputArea.appendChild(inputEl);

        container.innerHTML = '';
        container.appendChild(outputEl);
        container.appendChild(inputArea);

        // Add semantic classes
        container.classList.add('cui-terminal');
        if (crtEffects) {
          container.classList.add('cui-crt-effects');
        }

        // Create instance
        const instance = {
          id,
          container,
          outputEl,
          inputEl,
          promptEl,
          maxLines,
          prompt,
          history: [],
          historyIndex: -1,
          buffer: []
        };

        // Set up input handlers
        setupInputHandlers(instance);

        // Store instance
        CUI.terminal.instances[id] = instance;

        // Add instance methods
        instance.log = (content, type = 'info') => log(instance, content, type);
        instance.clear = () => clear(instance);
        instance.exec = (cmd) => executeCommand(instance, cmd);
        instance.register = (name, handler, metadata) => {
          CUI.CommandManager.register(name, handler, metadata);
        };

        // Register custom commands
        Object.entries(commands).forEach(([name, handler]) => {
          CUI.CommandManager.register(name, handler);
        });

        CUI.log(`Terminal "${id}" created`);
        CUI.Events.emit('cui:terminal:created', { id });

        return instance;
      },

      /**
       * Get terminal instance
       */
      get(id) {
        return CUI.terminal.instances[id];
      }
    };

    // ========================================================================
    // Input Handlers
    // ========================================================================

    function setupInputHandlers(instance) {
      const { inputEl } = instance;

      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const cmd = inputEl.value.trim();
          if (cmd) {
            // Add to history
            instance.history.push(cmd);
            instance.historyIndex = instance.history.length;

            // Log command
            log(instance, `${instance.prompt} ${cmd}`, 'command');

            // Execute command
            executeCommand(instance, cmd);

            inputEl.value = '';
          }
        }
        // Up arrow - previous command
        else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (instance.historyIndex > 0) {
            instance.historyIndex--;
            inputEl.value = instance.history[instance.historyIndex];
          }
        }
        // Down arrow - next command
        else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (instance.historyIndex < instance.history.length - 1) {
            instance.historyIndex++;
            inputEl.value = instance.history[instance.historyIndex];
          } else {
            instance.historyIndex = instance.history.length;
            inputEl.value = '';
          }
        }
      });

      // Focus input on container click
      instance.container.addEventListener('click', () => {
        inputEl.focus();
      });

      // Auto-focus on creation
      inputEl.focus();
    }

    // ========================================================================
    // Command Execution (uses CommandManager)
    // ========================================================================

    function executeCommand(instance, cmdString) {
      // Execute via CommandManager
      const result = CUI.CommandManager.execute(cmdString, {
        terminal: instance,
        source: 'terminal'
      });

      // Render result
      if (result.component) {
        // Component-based output
        logComponent(instance, result.component, result.type || 'info');
      } else if (result.output) {
        // String output
        log(instance, result.output, result.type || 'info');
      }

      CUI.Events.emit('cui:terminal:command', {
        id: instance.id,
        command: cmdString,
        result
      });
    }

    // ========================================================================
    // Logging (String and Component-based)
    // ========================================================================

    function log(instance, message, type = 'info') {
      const { outputEl, maxLines } = instance;

      // Handle multi-line messages
      const lines = String(message).split('\n');

      lines.forEach(lineText => {
        const line = CUI.DOM.create('div', {
          class: `cui-terminal-line ${type}`
        }, lineText || ' '); // Use space for empty lines to maintain height

        outputEl.appendChild(line);
        instance.buffer.push(line);

        // Limit scrollback
        if (instance.buffer.length > maxLines) {
          const removed = instance.buffer.shift();
          removed.remove();
        }
      });

      // Auto-scroll to bottom
      outputEl.scrollTop = outputEl.scrollHeight;

      CUI.Events.emit('cui:terminal:log', {
        id: instance.id,
        message,
        type
      });
    }

    function logComponent(instance, component, type = 'info') {
      const { outputEl, maxLines } = instance;

      // Create component wrapper
      const wrapper = CUI.DOM.create('div', {
        class: `cui-terminal-component ${type}`
      });

      // Render component
      if (component.render) {
        if (typeof component.render === 'function') {
          wrapper.innerHTML = component.render();
        } else {
          wrapper.innerHTML = component.render;
        }
      } else if (component.element) {
        wrapper.appendChild(component.element);
      }

      // Attach event handlers
      if (component.onClick) {
        wrapper.addEventListener('click', component.onClick);
        wrapper.classList.add('interactive');
      }

      if (component.handlers) {
        Object.entries(component.handlers).forEach(([selector, handler]) => {
          const elements = wrapper.querySelectorAll(selector);
          elements.forEach(el => {
            el.addEventListener('click', handler);
          });
        });
      }

      outputEl.appendChild(wrapper);
      instance.buffer.push(wrapper);

      // Limit scrollback
      if (instance.buffer.length > maxLines) {
        const removed = instance.buffer.shift();
        removed.remove();
      }

      // Auto-scroll to bottom
      outputEl.scrollTop = outputEl.scrollHeight;

      CUI.Events.emit('cui:terminal:component', {
        id: instance.id,
        component,
        type
      });
    }

    function clear(instance) {
      instance.outputEl.innerHTML = '';
      instance.buffer = [];
      CUI.Events.emit('cui:terminal:cleared', { id: instance.id });
    }

    CUI.log('Terminal module loaded');
  });

})();
