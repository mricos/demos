/**
 * CUI Command Manager
 * Global command registry and executor
 * Commands can be invoked from terminal, UI, keyboard shortcuts, or code
 */

(function() {
  'use strict';

  CUI.register('command-manager', ['core', 'lifecycle'], function(CUI) {
    CUI.log('CommandManager module initializing...');

    // ========================================================================
    // Command Manager
    // ========================================================================

    CUI.CommandManager = {
      // Command registry
      commands: {},

      /**
       * Register a command
       *
       * @param {string} name - Command name
       * @param {Function} handler - Handler function(args, context) => result
       * @param {Object} metadata - Optional help metadata
       */
      register(name, handler, metadata = null) {
        name = name.toLowerCase();
        CUI.CommandManager.commands[name] = handler;

        if (metadata) {
          CUI.CommandManager.help.register('commands', name, metadata);
        }

        CUI.log(`Command "${name}" registered`);
        CUI.Events.emit('cui:command:registered', { name, metadata });
      },

      /**
       * Unregister a command
       */
      unregister(name) {
        name = name.toLowerCase();
        delete CUI.CommandManager.commands[name];
        delete CUI.CommandManager.help.topics.commands[name];
        CUI.log(`Command "${name}" unregistered`);
      },

      /**
       * Execute a command
       *
       * @param {string} cmdString - Command string (e.g., "theme light")
       * @param {Object} context - Execution context { terminal, source, ... }
       * @returns {Object} Result object { output, type, component }
       */
      execute(cmdString, context = {}) {
        const parts = cmdString.trim().split(/\s+/);
        const cmdName = parts[0].toLowerCase();
        const args = parts.slice(1);

        CUI.Events.emit('cui:command:execute', {
          command: cmdName,
          args,
          context
        });

        // Find command
        const handler = CUI.CommandManager.commands[cmdName];
        if (!handler) {
          return {
            output: `Unknown command: ${cmdName}. Type "help" for available commands.`,
            type: 'error'
          };
        }

        // Execute command
        try {
          const result = handler(args, context);

          // Normalize result
          if (typeof result === 'string') {
            return { output: result, type: 'info' };
          } else if (result && typeof result === 'object') {
            return result;
          } else {
            return { output: '', type: 'info' };
          }
        } catch (err) {
          CUI.error(`Command "${cmdName}" failed:`, err);
          return {
            output: `Error: ${err.message}`,
            type: 'error'
          };
        }
      },

      /**
       * List all registered commands
       */
      list() {
        return Object.keys(CUI.CommandManager.commands).sort();
      },

      /**
       * Get command metadata
       */
      getMetadata(name) {
        return CUI.CommandManager.help.topics.commands[name.toLowerCase()];
      },

      // ======================================================================
      // Help System
      // ======================================================================

      help: {
        topics: {
          commands: {},   // Command help
          concepts: {},   // Framework concepts
          modules: {}     // Module documentation
        },

        /**
         * Register help topic
         *
         * @param {string} type - Topic type: 'commands', 'concepts', 'modules'
         * @param {string} name - Topic name
         * @param {Object} data - Topic data
         */
        register(type, name, data) {
          if (!CUI.CommandManager.help.topics[type]) {
            CUI.warn(`Unknown help topic type: ${type}`);
            return;
          }

          CUI.CommandManager.help.topics[type][name] = data;
          CUI.log(`Help topic registered: ${type}/${name}`);
        },

        /**
         * Get help topic
         */
        get(type, name) {
          if (!CUI.CommandManager.help.topics[type]) {
            return null;
          }
          return CUI.CommandManager.help.topics[type][name];
        },

        /**
         * List all topics of a type
         */
        list(type) {
          if (!CUI.CommandManager.help.topics[type]) {
            return [];
          }
          return Object.keys(CUI.CommandManager.help.topics[type]).sort();
        },

        /**
         * Search help topics
         */
        search(query) {
          const results = {
            commands: [],
            concepts: [],
            modules: []
          };

          query = query.toLowerCase();

          Object.entries(CUI.CommandManager.help.topics).forEach(([type, topics]) => {
            Object.entries(topics).forEach(([name, data]) => {
              const searchText = JSON.stringify(data).toLowerCase();
              if (name.toLowerCase().includes(query) || searchText.includes(query)) {
                results[type].push(name);
              }
            });
          });

          return results;
        }
      }
    };

    CUI.log('CommandManager module loaded');
  });

})();
