/**
 * CUI Token Commands
 * Commands for viewing design tokens and switching themes
 */

(function() {
  'use strict';

  CUI.register('commands-tokens', ['core', 'command-manager', 'tokens'], function(CUI) {
    CUI.log('Token commands initializing...');

    // ========================================================================
    // Tokens Command
    // ========================================================================

    CUI.CommandManager.register('tokens', (args, context) => {
      const category = args[0] ? args[0].toLowerCase() : null;

      if (!category) {
        // Show all categories
        let output = '\n';
        output += 'Design Tokens:\n\n';
        output += 'Categories:\n';
        output += '  colors    - Color palette and semantic colors\n';
        output += '  spacing   - Spacing scale\n';
        output += '  radius    - Border radius values\n';
        output += '  shadows   - Shadow styles\n';
        output += '  typo      - Typography settings\n';
        output += '\n';
        output += 'Usage: tokens <category>\n';
        output += 'Example: tokens colors\n';
        output += '\n';
        return { output, type: 'info' };
      }

      // Show specific category
      switch (category) {
        case 'colors':
        case 'color':
          return showColors();

        case 'spacing':
        case 'space':
          return showSpacing();

        case 'radius':
          return showRadius();

        case 'shadows':
        case 'shadow':
          return showShadows();

        case 'typo':
        case 'typography':
          return showTypography();

        default:
          return {
            output: `Unknown category: ${category}. Try: colors, spacing, radius, shadows, typo`,
            type: 'error'
          };
      }
    }, {
      description: 'View design tokens (colors, spacing, radius, etc.)',
      syntax: 'tokens [category]',
      examples: ['tokens', 'tokens colors', 'tokens spacing']
    });

    // ========================================================================
    // Theme Command
    // ========================================================================

    CUI.CommandManager.register('theme', (args, context) => {
      const themeName = args[0];

      if (!themeName) {
        // List available themes
        const themes = Object.keys(CUI.Tokens.themes);
        let output = '\n';
        output += 'Available themes:\n';
        themes.forEach(name => {
          output += `  ${name}\n`;
        });
        output += '\n';
        output += 'Usage: theme <name>\n';
        output += 'Example: theme light\n';
        output += '\n';
        return { output, type: 'info' };
      }

      // Apply theme
      if (CUI.Tokens.themes[themeName]) {
        CUI.Tokens.applyTheme(themeName);
        return {
          output: `Theme "${themeName}" applied`,
          type: 'success'
        };
      } else {
        return {
          output: `Theme "${themeName}" not found`,
          type: 'error'
        };
      }
    }, {
      description: 'Switch between themes',
      syntax: 'theme [name]',
      examples: ['theme', 'theme light', 'theme dark']
    });

    // ========================================================================
    // Token Display Functions
    // ========================================================================

    function showColors() {
      let output = '\n';
      output += 'Color Tokens:\n\n';

      // Palette colors
      output += 'Palette:\n';
      Object.entries(CUI.Tokens.colors.palette).forEach(([name, value]) => {
        // Create a simple text-based color indicator
        output += `  ${name.padEnd(12)} ${value}\n`;
      });

      output += '\n';

      // Semantic colors
      output += 'Semantic:\n';
      Object.entries(CUI.Tokens.colors.semantic).forEach(([name, value]) => {
        output += `  ${name.padEnd(16)} ${value}\n`;
      });

      output += '\n';

      // Component: could return rich component with actual color swatches
      // For now, returning text. Terminal will support components later.
      return { output, type: 'info' };
    }

    function showSpacing() {
      let output = '\n';
      output += 'Spacing Tokens:\n\n';

      Object.entries(CUI.Tokens.spacing).forEach(([name, value]) => {
        const bar = '█'.repeat(parseInt(value) / 2); // Visual representation
        output += `  ${name.padEnd(6)} ${value.padEnd(6)} ${bar}\n`;
      });

      output += '\n';
      return { output, type: 'info' };
    }

    function showRadius() {
      let output = '\n';
      output += 'Border Radius Tokens:\n\n';

      Object.entries(CUI.Tokens.radius).forEach(([name, value]) => {
        output += `  ${name.padEnd(6)} ${value.padEnd(8)}\n`;
      });

      output += '\n';
      output += 'Note: Using minimal rounding (2px-8px) for sharp aesthetic\n';
      output += '\n';
      return { output, type: 'info' };
    }

    function showShadows() {
      let output = '\n';
      output += 'Shadow Tokens:\n\n';

      Object.entries(CUI.Tokens.shadows).forEach(([name, value]) => {
        output += `  ${name.padEnd(6)} ${value}\n`;
      });

      output += '\n';
      return { output, type: 'info' };
    }

    function showTypography() {
      let output = '\n';
      output += 'Typography Tokens:\n\n';

      output += `Font Family:\n  ${CUI.Tokens.typography.fontFamily}\n\n`;

      output += 'Font Sizes:\n';
      Object.entries(CUI.Tokens.typography.fontSize).forEach(([name, value]) => {
        output += `  ${name.padEnd(8)} ${value}\n`;
      });

      output += '\n';

      output += 'Line Heights:\n';
      Object.entries(CUI.Tokens.typography.lineHeight).forEach(([name, value]) => {
        output += `  ${name.padEnd(8)} ${value}\n`;
      });

      output += '\n';
      return { output, type: 'info' };
    }

    CUI.log('Token commands loaded');
  });

})();
