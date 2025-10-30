/**
 * CUI Meta Commands
 * Framework self-documentation commands
 */

(function() {
  'use strict';

  CUI.register('commands-meta', ['core', 'command-manager', 'meta'], function(CUI) {
    CUI.log('Meta commands initializing...');

    // ========================================================================
    // Layout Command
    // ========================================================================

    CUI.CommandManager.register('layout', (args, context) => {
      const view = args[0] || 'overview';
      const layouts = CUI.Meta.layouts;

      if (layouts[view]) {
        let output = '\n';
        output += `CUI LAYOUT: ${view.toUpperCase()}\n\n`;
        output += layouts[view];
        output += '\n';
        return { output, type: 'info' };
      } else {
        let output = `Unknown layout view: ${view}\n`;
        output += 'Available views: overview, zstack, hierarchy';
        return { output, type: 'error' };
      }
    }, CUI.Meta.commands.layout);

    // ========================================================================
    // Semantics Command
    // ========================================================================

    CUI.CommandManager.register('semantics', (args, context) => {
      const area = args[0];
      const semantics = CUI.Meta.semantics;

      if (!area) {
        // Show all
        let output = '\n';
        output += 'CUI SEMANTIC NAMING\n\n';

        ['leftSide', 'rightSide', 'overlay'].forEach(key => {
          const section = semantics[key];
          output += `${key.toUpperCase()}:\n`;
          output += `  Purpose: ${section.purpose}\n`;
          output += `  Current: ${section.current}\n`;
          output += `  Proposed:\n`;
          section.proposed.forEach(name => {
            output += `    • ${name}\n`;
          });
          output += '\n';
        });

        return { output, type: 'info' };
      } else {
        // Show specific area
        const key = area + 'Side';
        const section = semantics[key] || semantics[area];

        if (section) {
          let output = '\n';
          output += `${area.toUpperCase()} SEMANTICS\n\n`;
          output += `Purpose:  ${section.purpose}\n`;
          output += `Priority: ${section.priority}\n`;
          output += `Content:  ${section.content}\n\n`;
          output += `Current:  ${section.current}\n`;
          output += 'Proposed:\n';
          section.proposed.forEach(name => {
            output += `  • ${name}\n`;
          });
          output += '\n';
          return { output, type: 'info' };
        } else {
          let output = `Unknown area: ${area}\n`;
          output += 'Available areas: left, right, overlay';
          return { output, type: 'error' };
        }
      }
    }, CUI.Meta.commands.semantics);

    // ========================================================================
    // Architecture Command
    // ========================================================================

    CUI.CommandManager.register('architecture', (args, context) => {
      const modules = CUI.Meta.modules;

      let output = '\n';
      output += 'CUI MODULE ARCHITECTURE\n\n';

      Object.entries(modules).forEach(([key, mod]) => {
        const status = CUI.getModule(key) ? '✓' : '○';
        output += `${status} ${mod.name}\n`;
        output += `   ${mod.description}\n`;
        output += `   Deps: [${mod.deps.join(', ')}]\n`;
        output += `   Provides: ${mod.provides.join(', ')}\n\n`;
      });

      return { output, type: 'info' };
    }, CUI.Meta.commands.architecture);

    // ========================================================================
    // Meta Command
    // ========================================================================

    CUI.CommandManager.register('meta', (args, context) => {
      let output = '\n';
      output += 'CUI META DOCUMENTATION SYSTEM\n\n';
      output += 'The meta system provides self-documentation for the CUI framework.\n\n';
      output += 'Available meta commands:\n\n';

      Object.entries(CUI.Meta.commands).forEach(([name, cmd]) => {
        output += `  ${name}\n`;
        output += `    ${cmd.description}\n`;
        output += `    Syntax: ${cmd.syntax}\n`;
        if (cmd.examples.length > 0) {
          output += `    Examples: ${cmd.examples.join(', ')}\n`;
        }
        output += '\n';
      });

      output += 'Type any command name to execute it.\n\n';

      return { output, type: 'info' };
    }, CUI.Meta.commands.meta);

    // ========================================================================
    // Mapping Command
    // ========================================================================

    CUI.CommandManager.register('mapping', (args, context) => {
      let output = '\n';
      output += 'CURRENT → SEMANTIC CLASS MAPPING\n\n';

      const mappings = [
        ['.wrap', '.cui-app-container', 'Top-level wrapper'],
        ['header', '.cui-header', 'App header bar'],
        ['.title', '.cui-branding', 'App title/name'],
        ['.stats', '.cui-status-bar', 'Live metrics display'],
        ['.grid', '.cui-workspace', 'Main content grid'],
        ['.card:first-child', '.cui-view-primary', 'Left viewport'],
        ['.card:last-child', '.cui-view-secondary', 'Right viewport'],
        ['.fab-row', '.cui-fab-group', 'FAB cluster'],
        ['.fab.doc', '.cui-fab-docs', 'Documentation FAB'],
        ['.fab.sim', '.cui-fab-controls', 'Controls FAB'],
        ['.drawer', '.cui-drawer-controls', 'Controls drawer'],
        ['.docpanel', '.cui-drawer-docs', 'Docs drawer'],
        ['canvas#field', 'canvas.cui-canvas-field', 'Simulation canvas'],
        ['canvas#chart', 'canvas.cui-canvas-chart', 'Chart canvas']
      ];

      mappings.forEach(([current, semantic, purpose]) => {
        output += `${current}\n`;
        output += `  → ${semantic}\n`;
        output += `    ${purpose}\n\n`;
      });

      return { output, type: 'info' };
    }, {
      syntax: 'mapping',
      description: 'Show current to semantic class name mappings',
      examples: ['mapping']
    });

    CUI.log('Meta commands loaded');
  });

})();
