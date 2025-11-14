/**
 * CUI Controls
 * Data-driven control system with reactive state binding
 */

(function() {
  'use strict';

  CUI.register('controls', ['core'], function(CUI) {
    CUI.log('Controls module initializing...');

    // ========================================================================
    // Controls Manager
    // ========================================================================

    CUI.Controls = {
      instances: {},

      /**
       * Create controls from configuration
       *
       * @param {Object} config
       * @param {string} config.containerId - Container element ID
       * @param {Array} config.controls - Array of control definitions
       * @param {boolean} config.useRedux - Use Redux for state management (default: false)
       * @param {Function} config.onChange - Global change handler
       *
       * Control definition:
       * {
       *   type: 'range' | 'number' | 'select' | 'checkbox',
       *   id: 'paramId',
       *   label: 'Parameter Name',
       *   min: 0,
       *   max: 100,
       *   step: 1,
       *   value: 50,
       *   unit: 'px',
       *   format: (value) => value.toFixed(2),
       *   onChange: (value) => {},
       *   reduxAction: 'UPDATE_PARAM' // Optional Redux integration
       * }
       */
      create(config) {
        const {
          containerId,
          controls,
          useRedux = false,
          onChange
        } = config;

        const container = CUI.DOM.$(containerId);
        if (!container) {
          CUI.error(`Controls container #${containerId} not found`);
          return null;
        }

        const instance = {
          containerId,
          controls: [],
          useRedux,
          onChange
        };

        // Build each control
        controls.forEach(controlConfig => {
          const control = buildControl(controlConfig, instance);
          if (control) {
            container.appendChild(control.element);
            instance.controls.push(control);

            // Bind to state
            CUI.Controls.bind(controlConfig.id, controlConfig.stateKey || controlConfig.id);
          }
        });

        CUI.Controls.instances[containerId] = instance;
        CUI.log(`Controls created: ${controls.length} controls in #${containerId}`);

        return instance;
      },

      /**
       * Bind control to state (two-way)
       */
      bind(controlId, stateKey) {
        const control = CUI.DOM.$(controlId);
        if (!control) return;

        // State → Control
        CUI.State.subscribe(stateKey, (newValue) => {
          if (control.type === 'checkbox') {
            control.checked = newValue;
          } else {
            control.value = newValue;
          }

          // Update display if exists
          const display = CUI.DOM.$(controlId + '_val');
          if (display) {
            display.textContent = formatControlValue(controlId, newValue);
          }
        });

        // Control → State (on input event)
        control.addEventListener('input', (e) => {
          let value;
          if (control.type === 'checkbox') {
            value = e.target.checked;
          } else if (control.type === 'number' || control.type === 'range') {
            value = parseFloat(e.target.value);
          } else {
            value = e.target.value;
          }

          CUI.State.set(stateKey, value);
        });

        CUI.log(`Control #${controlId} bound to state key: ${stateKey}`);
      },

      /**
       * Get control value
       */
      getValue(controlId) {
        const control = CUI.DOM.$(controlId);
        if (!control) return null;

        if (control.type === 'checkbox') {
          return control.checked;
        } else if (control.type === 'number' || control.type === 'range') {
          return parseFloat(control.value);
        }
        return control.value;
      },

      /**
       * Set control value
       */
      setValue(controlId, value) {
        const control = CUI.DOM.$(controlId);
        if (!control) return;

        if (control.type === 'checkbox') {
          control.checked = value;
        } else {
          control.value = value;
        }

        // Update display
        const display = CUI.DOM.$(controlId + '_val');
        if (display) {
          display.textContent = formatControlValue(controlId, value);
        }

        // Trigger change event
        control.dispatchEvent(new Event('input', { bubbles: true }));
      },

      /**
       * Update multiple controls at once
       */
      setValues(values) {
        Object.keys(values).forEach(controlId => {
          CUI.Controls.setValue(controlId, values[controlId]);
        });
      }
    };

    // ========================================================================
    // Private Functions
    // ========================================================================

    function buildControl(config, instance) {
      const {
        type,
        id,
        label,
        min,
        max,
        step,
        value,
        unit = '',
        format,
        onChange,
        reduxAction,
        options // For select
      } = config;

      // Create row container
      const row = CUI.DOM.create('div', { class: 'row' });

      // Create label
      const labelEl = CUI.DOM.create('label', {}, label);
      row.appendChild(labelEl);

      // Create input based on type
      let input;
      switch (type) {
        case 'range':
        case 'number':
          input = CUI.DOM.create('input', {
            id,
            type,
            min,
            max,
            step,
            value
          });
          break;

        case 'checkbox':
          input = CUI.DOM.create('input', {
            id,
            type: 'checkbox',
            checked: value ? 'checked' : undefined
          });
          break;

        case 'select':
          input = CUI.DOM.create('select', { id });
          if (options) {
            options.forEach(opt => {
              const option = CUI.DOM.create('option', {
                value: opt.value,
                selected: opt.value === value ? 'selected' : undefined
              }, opt.label);
              input.appendChild(option);
            });
          }
          break;

        default:
          input = CUI.DOM.create('input', {
            id,
            type: 'text',
            value
          });
      }

      row.appendChild(input);

      // Create value display (for range/number)
      let display;
      if (type === 'range' || type === 'number') {
        const formattedValue = format ? format(value) : value;
        const displayText = unit ? `${formattedValue}${unit}` : formattedValue;

        display = CUI.DOM.create('div', {
          class: 'val',
          id: id + '_val'
        }, displayText);
        row.appendChild(display);
      }

      // Attach event handlers
      input.addEventListener('input', (e) => {
        let newValue;
        if (type === 'checkbox') {
          newValue = e.target.checked;
        } else if (type === 'number' || type === 'range') {
          newValue = parseFloat(e.target.value);
        } else {
          newValue = e.target.value;
        }

        // Update display
        if (display) {
          const formattedValue = format ? format(newValue) : newValue;
          const displayText = unit ? `${formattedValue}${unit}` : formattedValue;
          display.textContent = displayText;
        }

        // Set state
        CUI.State.set(config.stateKey || id, newValue);

        // Call individual onChange
        if (onChange) {
          onChange(newValue);
        }

        // Call global onChange
        if (instance.onChange) {
          instance.onChange(id, newValue);
        }

        // Redux integration
        if (instance.useRedux && reduxAction) {
          CUI.Redux.dispatch({
            type: reduxAction,
            payload: { [id]: newValue }
          });
        }

        // Emit event
        CUI.Events.emit('cui:control:changed', { id, value: newValue });
      });

      return {
        id,
        element: row,
        input,
        display,
        config
      };
    }

    function formatControlValue(controlId, value) {
      // Check if there's a formatter in the instance
      Object.values(CUI.Controls.instances).forEach(instance => {
        const control = instance.controls.find(c => c.id === controlId);
        if (control && control.config.format) {
          const formatted = control.config.format(value);
          const unit = control.config.unit || '';
          value = unit ? `${formatted}${unit}` : formatted;
        } else if (control && control.config.unit) {
          value = `${value}${control.config.unit}`;
        }
      });

      return value;
    }

    CUI.log('Controls module loaded');
  });

})();
