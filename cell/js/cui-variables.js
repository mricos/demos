/**
 * CUI Variables
 * Variable definition and binding system with LaTeX support
 */

(function() {
  'use strict';

  CUI.register('variables', ['core'], function(CUI) {
    CUI.log('Variables module initializing...');

    // ========================================================================
    // Variables Manager
    // ========================================================================

    CUI.Variables = {
      definitions: {},
      bindings: [],

      /**
       * Define a variable
       *
       * @param {string} id - Variable ID
       * @param {Object} config
       * @param {string} config.latex - LaTeX notation
       * @param {*} config.value - Initial value
       * @param {Function} config.format - Value formatter
       * @param {string} config.unit - Unit (e.g., 'px', 'm/s')
       * @param {string} config.description - Description
       */
      define(id, config) {
        const {
          latex = id,
          value = null,
          format = null,
          unit = '',
          description = ''
        } = config;

        CUI.Variables.definitions[id] = {
          id,
          latex,
          value,
          format,
          unit,
          description
        };

        // Store in state
        if (value !== null) {
          CUI.State.set(`var.${id}`, value);
        }

        CUI.log(`Variable defined: ${id} (${latex})`);

        // Emit event
        CUI.Events.emit('cui:variable:defined', { id, config });
      },

      /**
       * Get variable definition
       */
      get(id) {
        return CUI.Variables.definitions[id];
      },

      /**
       * Get variable value from state
       */
      getValue(id) {
        return CUI.State.get(`var.${id}`);
      },

      /**
       * Set variable value in state
       */
      setValue(id, value) {
        CUI.State.set(`var.${id}`, value);
      },

      /**
       * Scan DOM for variable definitions and register them
       * Looks for elements with data-var-def attribute
       */
      scanDefinitions() {
        const defs = CUI.DOM.$$('[data-var-def]');
        let count = 0;

        defs.forEach(el => {
          const id = el.dataset.varDef;
          const latex = el.dataset.latex || id;
          const value = el.dataset.value ? parseFloat(el.dataset.value) : null;
          const unit = el.dataset.unit || '';
          const description = el.textContent.trim();

          CUI.Variables.define(id, {
            latex,
            value,
            unit,
            description
          });

          count++;
        });

        CUI.log(`Scanned ${count} variable definitions from DOM`);
        return count;
      },

      /**
       * Bind all variable references in DOM to state
       * Looks for elements with data-var-ref or data-var-bind
       */
      bindAll() {
        // Bind references (one-way: state → DOM)
        const refs = CUI.DOM.$$('[data-var-ref]');
        refs.forEach(el => {
          const varId = el.dataset.varRef;
          const format = el.dataset.format; // 'latex', 'plain', 'value'

          CUI.Variables.bindReference(el, varId, format);
        });

        // Bind inputs (two-way: state ↔ DOM)
        const binds = CUI.DOM.$$('[data-var-bind]');
        binds.forEach(el => {
          const varId = el.dataset.varBind;
          CUI.Variables.bindInput(el, varId);
        });

        CUI.log(`Bound ${refs.length} variable references and ${binds.length} inputs`);
      },

      /**
       * Bind a single element to a variable (one-way: state → DOM)
       */
      bindReference(element, varId, format = 'plain') {
        const varDef = CUI.Variables.get(varId);
        if (!varDef) {
          CUI.warn(`Variable ${varId} not defined`);
          return;
        }

        // Initial render
        updateReference(element, varId, format);

        // Subscribe to changes
        const unsubscribe = CUI.State.subscribe(`var.${varId}`, () => {
          updateReference(element, varId, format);
        });

        // Store binding
        CUI.Variables.bindings.push({
          element,
          varId,
          format,
          type: 'reference',
          unsubscribe
        });

        // Mark element as bound
        element.classList.add('var-ref');
        if (format === 'latex') {
          element.classList.add('var-latex');
        }
      },

      /**
       * Bind an input element to a variable (two-way: state ↔ DOM)
       */
      bindInput(element, varId) {
        const varDef = CUI.Variables.get(varId);
        if (!varDef) {
          CUI.warn(`Variable ${varId} not defined`);
          return;
        }

        // State → Input
        const unsubscribe = CUI.State.subscribe(`var.${varId}`, (newValue) => {
          if (element.type === 'checkbox') {
            element.checked = newValue;
          } else {
            element.value = newValue;
          }
        });

        // Input → State
        element.addEventListener('input', (e) => {
          let value;
          if (element.type === 'checkbox') {
            value = e.target.checked;
          } else if (element.type === 'number' || element.type === 'range') {
            value = parseFloat(e.target.value);
          } else {
            value = e.target.value;
          }

          CUI.Variables.setValue(varId, value);
        });

        // Store binding
        CUI.Variables.bindings.push({
          element,
          varId,
          type: 'input',
          unsubscribe
        });

        // Mark element as bound
        element.classList.add('var-binding');

        // Set initial value
        const initialValue = CUI.Variables.getValue(varId);
        if (initialValue !== null && initialValue !== undefined) {
          if (element.type === 'checkbox') {
            element.checked = initialValue;
          } else {
            element.value = initialValue;
          }
        }
      },

      /**
       * Render a variable as text (formatted)
       */
      render(varId, options = {}) {
        const {
          format = 'plain',
          includeUnit = true
        } = options;

        const varDef = CUI.Variables.get(varId);
        if (!varDef) return '';

        const value = CUI.Variables.getValue(varId);

        if (format === 'latex' && CUI.LaTeX) {
          return CUI.LaTeX.render(varDef.latex, true);
        } else if (format === 'value') {
          let formatted = value;
          if (varDef.format) {
            formatted = varDef.format(value);
          }
          if (includeUnit && varDef.unit) {
            formatted = `${formatted} ${varDef.unit}`;
          }
          return formatted;
        } else {
          // Plain text
          return varDef.latex;
        }
      },

      /**
       * Unbind all variable bindings
       */
      unbindAll() {
        CUI.Variables.bindings.forEach(binding => {
          binding.unsubscribe();
        });
        CUI.Variables.bindings = [];
        CUI.log('All variable bindings cleared');
      },

      /**
       * Auto-initialize: scan definitions and bind all
       */
      init() {
        CUI.Variables.scanDefinitions();
        CUI.Variables.bindAll();
        CUI.log('Variables system initialized');
      }
    };

    // ========================================================================
    // Private Functions
    // ========================================================================

    function updateReference(element, varId, format) {
      const varDef = CUI.Variables.get(varId);
      const value = CUI.Variables.getValue(varId);

      let content = '';

      if (format === 'latex') {
        // LaTeX notation
        if (CUI.LaTeX) {
          content = CUI.LaTeX.render(varDef.latex, true);
        } else {
          content = varDef.latex;
        }
      } else if (format === 'value') {
        // Formatted value
        content = value;
        if (varDef.format) {
          content = varDef.format(value);
        }
        if (varDef.unit) {
          content = `${content} ${varDef.unit}`;
        }
      } else if (format === 'both') {
        // LaTeX + value
        const latexPart = CUI.LaTeX ? CUI.LaTeX.render(varDef.latex, true) : varDef.latex;
        let valuePart = value;
        if (varDef.format) {
          valuePart = varDef.format(value);
        }
        if (varDef.unit) {
          valuePart = `${valuePart} ${varDef.unit}`;
        }
        content = `${latexPart} = ${valuePart}`;
      } else {
        // Plain text (just the latex notation as text)
        content = varDef.latex;
      }

      // Update element
      if (format === 'latex' || format === 'both') {
        element.innerHTML = content;
      } else {
        element.textContent = content;
      }
    }

    CUI.log('Variables module loaded');
  });

})();
