/**
 * CUI Design Tokens
 * Design system tokens and CSS variable injection
 */

(function() {
  'use strict';

  if (!window.CUI) {
    console.error('[CUI Tokens] CUI core not found. Load cui-core.js first.');
    return;
  }

  console.log('[CUI] Tokens module loading...');

  // ==========================================================================
  // Design Tokens Definition
  // ==========================================================================

  CUI.Tokens = {
    colors: {
      // Base palette
      palette: {
        blue: '#4aa3ff',
        red: '#ff6b6b',
        green: '#29d398',
        yellow: '#f7b955',
        darkBg: '#0b0f14',
        darkPanel: '#11161d',
        mutedText: '#9fb2c6',
        lightText: '#dbe7f3',
        gridLine: '#1a2230'
      },

      // Semantic colors (map to CSS variables)
      semantic: {
        bg: 'var(--cui-bg)',
        panel: 'var(--cui-panel)',
        muted: 'var(--cui-muted)',
        text: 'var(--cui-text)',
        accent: 'var(--cui-accent)',
        accent2: 'var(--cui-accent-2)',
        good: 'var(--cui-good)',
        warn: 'var(--cui-warn)',
        grid: 'var(--cui-grid)',

        // Terminal semantic colors
        terminalBg: 'var(--cui-terminal-bg)',
        terminalText: 'var(--cui-terminal-text)',
        terminalPrompt: 'var(--cui-terminal-prompt)',
        terminalInfo: 'var(--cui-terminal-info)',
        terminalSuccess: 'var(--cui-terminal-success)',
        terminalWarning: 'var(--cui-terminal-warning)',
        terminalError: 'var(--cui-terminal-error)',
        terminalCommand: 'var(--cui-terminal-command)'
      }
    },

    spacing: {
      xs: '4px',
      sm: '8px',
      md: '12px',
      lg: '18px',
      xl: '24px',
      xxl: '32px'
    },

    radius: {
      sm: '2px',
      md: '4px',
      lg: '6px',
      xl: '8px',
      xxl: '8px',
      full: '999px'
    },

    transitions: {
      fast: '0.12s ease',
      base: '0.15s ease',
      slow: '0.25s ease'
    },

    zIndex: {
      base: 1,
      overlay: 10,
      drawer: 20,
      fab: 30,
      modal: 40
    },

    typography: {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, "Helvetica Neue", Arial',
      fontSize: {
        xs: '11px',
        sm: '12px',
        base: '14px',
        md: '16px',
        lg: '18px',
        xl: '20px'
      },
      lineHeight: {
        tight: 1.2,
        base: 1.4,
        relaxed: 1.6
      }
    },

    shadows: {
      sm: '0 2px 8px rgba(0, 0, 0, 0.15)',
      md: '0 4px 16px rgba(0, 0, 0, 0.2)',
      lg: '0 10px 24px rgba(0, 0, 0, 0.25)',
      xl: '0 10px 28px rgba(0, 0, 0, 0.5)'
    }
  };

  // ==========================================================================
  // CSS Variable Injection
  // ==========================================================================

  /**
   * Inject design tokens as CSS variables into :root
   */
  CUI.Tokens.inject = function(customTokens = {}) {
    const tokens = CUI.Utils.merge(CUI.Utils.clone(CUI.Tokens), customTokens);
    const root = document.documentElement;

    // Colors
    root.style.setProperty('--cui-bg', tokens.colors.palette.darkBg);
    root.style.setProperty('--cui-panel', tokens.colors.palette.darkPanel);
    root.style.setProperty('--cui-muted', tokens.colors.palette.mutedText);
    root.style.setProperty('--cui-text', tokens.colors.palette.lightText);
    root.style.setProperty('--cui-accent', tokens.colors.palette.blue);
    root.style.setProperty('--cui-accent-2', tokens.colors.palette.red);
    root.style.setProperty('--cui-good', tokens.colors.palette.green);
    root.style.setProperty('--cui-warn', tokens.colors.palette.yellow);
    root.style.setProperty('--cui-grid', tokens.colors.palette.gridLine);

    // Terminal colors (default: green CRT theme)
    root.style.setProperty('--cui-terminal-bg', '#0a0e0f');
    root.style.setProperty('--cui-terminal-text', '#00ff88');
    root.style.setProperty('--cui-terminal-prompt', '#00ff88');
    root.style.setProperty('--cui-terminal-info', '#88ccff');
    root.style.setProperty('--cui-terminal-success', '#00ff88');
    root.style.setProperty('--cui-terminal-warning', '#ffdd00');
    root.style.setProperty('--cui-terminal-error', '#ff6666');
    root.style.setProperty('--cui-terminal-command', '#00ff88');

    // Spacing
    Object.entries(tokens.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--cui-space-${key}`, value);
    });

    // Border radius
    Object.entries(tokens.radius).forEach(([key, value]) => {
      root.style.setProperty(`--cui-radius-${key}`, value);
    });

    // Transitions
    Object.entries(tokens.transitions).forEach(([key, value]) => {
      root.style.setProperty(`--cui-transition-${key}`, value);
    });

    // Z-index
    Object.entries(tokens.zIndex).forEach(([key, value]) => {
      root.style.setProperty(`--cui-z-${key}`, value);
    });

    CUI.log('Design tokens injected');
    CUI.Events.emit('cui:tokens:injected', tokens);
  };

  /**
   * Get computed CSS variable value
   */
  CUI.Tokens.get = function(variableName) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(variableName).trim();
  };

  /**
   * Set CSS variable dynamically
   */
  CUI.Tokens.set = function(variableName, value) {
    document.documentElement.style.setProperty(variableName, value);
  };

  /**
   * Create theme variant
   */
  CUI.Tokens.createTheme = function(name, overrides) {
    const theme = CUI.Utils.merge(CUI.Utils.clone(CUI.Tokens), overrides);
    CUI.Tokens.themes = CUI.Tokens.themes || {};
    CUI.Tokens.themes[name] = theme;
    CUI.log(`Theme "${name}" created`);
    return theme;
  };

  /**
   * Apply theme by name
   */
  CUI.Tokens.applyTheme = function(name) {
    if (!CUI.Tokens.themes || !CUI.Tokens.themes[name]) {
      CUI.warn(`Theme "${name}" not found`);
      return;
    }
    CUI.Tokens.inject(CUI.Tokens.themes[name]);
    CUI.log(`Theme "${name}" applied`);
  };

  // ==========================================================================
  // Predefined Themes (Optional)
  // ==========================================================================

  CUI.Tokens.themes = {
    dark: CUI.Utils.clone(CUI.Tokens), // Default

    light: {
      colors: {
        palette: {
          darkBg: '#f5f7fa',
          darkPanel: '#ffffff',
          mutedText: '#6b7280',
          lightText: '#111827',
          blue: '#3b82f6',
          red: '#ef4444',
          green: '#10b981',
          yellow: '#f59e0b',
          gridLine: '#e5e7eb'
        }
      }
    }
  };

  // Signal tokens module is ready
  CUI.Events.emit('cui:tokens:ready');
  CUI.log('Tokens module ready');

})();
