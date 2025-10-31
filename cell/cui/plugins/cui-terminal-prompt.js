/**
 * CUI Terminal Prompt Builder
 * Multi-segment contextual prompts with Redux integration
 * Inspired by tetra org REPL and vecterm CLI
 */

(function() {
  'use strict';

  CUI.register('terminal-prompt', ['core', 'lifecycle'], function(CUI) {
    CUI.log('Terminal Prompt module initializing...');

    CUI.TerminalPrompt = {

      /**
       * Build a multi-segment prompt string
       * @param {Object} config - Prompt configuration
       * @param {Object} state - Current Redux state
       * @returns {string} HTML-formatted prompt string
       */
      build(config, state) {
        if (!config || !config.segments) {
          return this.buildSimple(config);
        }

        const segments = typeof config.segments === 'function'
          ? config.segments(state)
          : config.segments;

        if (!segments || !Array.isArray(segments)) {
          return this.buildSimple(config);
        }

        const parts = [];

        // Build segments
        segments.forEach((segment, index) => {
          if (index > 0) {
            // Add separator
            const sep = config.separator || '×';
            const sepColor = config.separatorColor || 'muted';
            parts.push(this.colorize(` ${sep} `, sepColor));
          }

          // Add segment
          const text = segment.text || segment;
          const color = segment.color || 'text';
          parts.push(this.colorize(text, color));
        });

        // Add arrow
        const arrow = config.arrow || '▶';
        const arrowColor = config.arrowColor || 'accent';
        parts.push(' ');
        parts.push(this.colorize(arrow, arrowColor));
        parts.push(' ');

        return parts.join('');
      },

      /**
       * Build simple prompt (fallback)
       */
      buildSimple(config) {
        const prompt = config?.prompt || '$';
        const color = config?.promptColor || 'accent';
        return this.colorize(prompt + ' ', color);
      },

      /**
       * Colorize text using design tokens
       * @param {string} text - Text to colorize
       * @param {string} colorName - Color name from design tokens
       * @returns {string} HTML with inline styles
       */
      colorize(text, colorName) {
        // Map color names to CSS variables
        const colorMap = {
          'accent': 'var(--cui-accent)',
          'good': 'var(--cui-good)',
          'warn': 'var(--cui-warn)',
          'error': 'var(--cui-accent-2)',
          'text': 'var(--cui-text)',
          'muted': 'var(--cui-muted)',
          'bg': 'var(--cui-bg)',
          'panel': 'var(--cui-panel)'
        };

        const color = colorMap[colorName] || colorMap['text'];
        return `<span style="color: ${color}">${text}</span>`;
      },

      /**
       * Subscribe to Redux state changes and update prompt
       * @param {Object} terminal - Terminal instance
       * @param {string|Function} watchState - State path or getter function
       */
      watchState(terminal, watchState) {
        if (!CUI.Redux) {
          CUI.warn('Terminal Prompt: Redux not available, cannot watch state');
          return;
        }

        CUI.Redux.subscribe((state, prevState) => {
          // Get the state slice to watch
          const currentSlice = typeof watchState === 'function'
            ? watchState(state)
            : watchState ? state[watchState] : state;

          const prevSlice = typeof watchState === 'function'
            ? watchState(prevState)
            : watchState ? prevState[watchState] : prevState;

          // Only update if watched slice changed
          if (currentSlice !== prevSlice) {
            terminal.updatePrompt();
          }
        });
      },

      /**
       * Create a prompt builder function from config
       * @param {Object} config - Prompt configuration
       * @returns {Function} Prompt builder function
       */
      createBuilder(config) {
        return (state) => this.build(config, state);
      }
    };

    CUI.log('Terminal Prompt module loaded');
  });

})();
