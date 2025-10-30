/**
 * CUI Built-in Commands
 * Standard commands available in all terminals
 */

(function() {
  'use strict';

  CUI.register('commands-builtin', ['core', 'command-manager'], function(CUI) {
    CUI.log('Built-in commands initializing...');

    // ========================================================================
    // Help Command
    // ========================================================================

    CUI.CommandManager.register('help', (args, context) => {
      const cmdName = args[0];

      // Help for specific command
      if (cmdName) {
        const metadata = CUI.CommandManager.getMetadata(cmdName);

        if (metadata) {
          let output = '\n';
          output += `Command: ${cmdName}\n`;
          output += `  ${metadata.description}\n`;
          if (metadata.syntax) {
            output += `  Syntax: ${metadata.syntax}\n`;
          }
          if (metadata.examples && metadata.examples.length > 0) {
            output += '  Examples:\n';
            metadata.examples.forEach(ex => {
              output += `    ${ex}\n`;
            });
          }
          output += '\n';
          return { output, type: 'info' };
        } else if (CUI.CommandManager.commands[cmdName]) {
          return {
            output: `Command: ${cmdName} (no description available)`,
            type: 'info'
          };
        } else {
          return {
            output: `Unknown command: ${cmdName}`,
            type: 'error'
          };
        }
      }

      // List all commands by category
      let output = '\n';
      output += 'Available commands:\n\n';

      // Group commands
      const allCommands = CUI.CommandManager.list();
      const builtinCommands = ['help', 'clear', 'history', 'echo', 'version', 'modules'];
      const metaCommands = ['layout', 'semantics', 'architecture', 'meta', 'mapping'];
      const tokenCommands = ['tokens', 'theme'];

      const customCommands = allCommands.filter(
        cmd => !builtinCommands.includes(cmd) &&
               !metaCommands.includes(cmd) &&
               !tokenCommands.includes(cmd)
      );

      // Built-in commands
      const builtinPresent = allCommands.filter(cmd => builtinCommands.includes(cmd));
      if (builtinPresent.length > 0) {
        output += 'Built-in Commands:\n';
        builtinPresent.forEach(cmd => {
          const meta = CUI.CommandManager.getMetadata(cmd);
          const desc = meta ? ` - ${meta.description}` : '';
          output += `  ${cmd.padEnd(16)}${desc}\n`;
        });
        output += '\n';
      }

      // Meta commands
      const metaPresent = allCommands.filter(cmd => metaCommands.includes(cmd));
      if (metaPresent.length > 0) {
        output += 'Meta Commands (framework documentation):\n';
        metaPresent.forEach(cmd => {
          const meta = CUI.CommandManager.getMetadata(cmd);
          const desc = meta ? ` - ${meta.description}` : '';
          output += `  ${cmd.padEnd(16)}${desc}\n`;
        });
        output += '\n';
      }

      // Token/theme commands
      const tokenPresent = allCommands.filter(cmd => tokenCommands.includes(cmd));
      if (tokenPresent.length > 0) {
        output += 'Design System Commands:\n';
        tokenPresent.forEach(cmd => {
          const meta = CUI.CommandManager.getMetadata(cmd);
          const desc = meta ? ` - ${meta.description}` : '';
          output += `  ${cmd.padEnd(16)}${desc}\n`;
        });
        output += '\n';
      }

      // Custom commands
      if (customCommands.length > 0) {
        output += 'Custom Commands:\n';
        customCommands.forEach(cmd => {
          const meta = CUI.CommandManager.getMetadata(cmd);
          const desc = meta ? ` - ${meta.description}` : '';
          output += `  ${cmd.padEnd(16)}${desc}\n`;
        });
        output += '\n';
      }

      output += 'Type "help <command>" for detailed info on a specific command.\n';
      output += '\n';

      return { output, type: 'info' };
    }, {
      description: 'Show available commands or help for a specific command',
      syntax: 'help [command]',
      examples: ['help', 'help theme', 'help tokens']
    });

    // ========================================================================
    // Clear Command
    // ========================================================================

    CUI.CommandManager.register('clear', (args, context) => {
      // Terminal-specific: clear the display
      if (context.terminal && context.terminal.clear) {
        context.terminal.clear();
        return { output: '', type: 'info' };
      }

      return {
        output: 'Clear command requires terminal context',
        type: 'error'
      };
    }, {
      description: 'Clear the terminal screen',
      syntax: 'clear',
      examples: ['clear']
    });

    // ========================================================================
    // History Command
    // ========================================================================

    CUI.CommandManager.register('history', (args, context) => {
      // Terminal-specific: show command history
      if (context.terminal && context.terminal.history) {
        let output = 'Command history:\n';
        context.terminal.history.forEach((cmd, i) => {
          output += `  ${String(i + 1).padStart(3)}  ${cmd}\n`;
        });
        return { output, type: 'info' };
      }

      return {
        output: 'History command requires terminal context',
        type: 'error'
      };
    }, {
      description: 'Show command history',
      syntax: 'history',
      examples: ['history']
    });

    // ========================================================================
    // Echo Command
    // ========================================================================

    CUI.CommandManager.register('echo', (args, context) => {
      return {
        output: args.join(' '),
        type: 'info'
      };
    }, {
      description: 'Echo arguments to output',
      syntax: 'echo <message>',
      examples: ['echo Hello world', 'echo $CUI_VERSION']
    });

    // ========================================================================
    // Version Command
    // ========================================================================

    CUI.CommandManager.register('version', (args, context) => {
      return {
        output: `CUI v${CUI.VERSION} (${CUI.BUILD_DATE})`,
        type: 'info'
      };
    }, {
      description: 'Show CUI framework version',
      syntax: 'version',
      examples: ['version']
    });

    // ========================================================================
    // Modules Command
    // ========================================================================

    CUI.CommandManager.register('modules', (args, context) => {
      let output = 'Loaded modules:\n';
      CUI.listModules().forEach(mod => {
        const module = CUI.getModule(mod);
        const status = module.loaded ? '✓' : '⏳';
        output += `  ${status} ${mod}\n`;
      });
      return { output, type: 'info' };
    }, {
      description: 'List all loaded CUI modules',
      syntax: 'modules',
      examples: ['modules']
    });

    CUI.log('Built-in commands loaded');
  });

})();
