/**
 * CUI Behaviors
 * Reusable UI behavior library (sliders, buttons, dropdowns, etc.)
 */

(function() {
  'use strict';

  CUI.register('behaviors', ['core', 'lifecycle'], function(CUI) {
    CUI.log('Behaviors module initializing...');

    // ========================================================================
    // Slider Behavior
    // ========================================================================

    CUI.Slider = {
      /**
       * Create a parameter slider with live value display
       *
       * @param {Object} config
       * @param {string} config.id - Slider element ID (without _val suffix)
       * @param {Function} config.onChange - Callback(value)
       * @param {Function} config.format - Value formatter (default: identity)
       * @param {*} config.initialValue - Initial value (default: from HTML)
       */
      create(config) {
        const {
          id,
          onChange,
          format = (v) => v,
          initialValue
        } = config;

        const slider = CUI.DOM.$(id);
        const valueDisplay = CUI.DOM.$(id + '_val');

        if (!slider) {
          CUI.error(`Slider #${id} not found`);
          return null;
        }

        const instance = {
          id,
          slider,
          valueDisplay,
          format,
          onChange
        };

        // Set initial value if provided
        if (initialValue !== undefined) {
          slider.value = initialValue;
        }

        // Update display
        updateValue(instance);

        // Attach listener
        slider.addEventListener('input', () => {
          updateValue(instance);
          if (onChange) {
            onChange(getValue(instance));
          }
        });

        return instance;
      },

      /**
       * Batch create sliders from config object
       */
      createMany(configs) {
        const instances = {};
        Object.entries(configs).forEach(([id, config]) => {
          instances[id] = CUI.Slider.create({ id, ...config });
        });
        return instances;
      }
    };

    function updateValue(instance) {
      const value = getValue(instance);
      if (instance.valueDisplay) {
        instance.valueDisplay.textContent = instance.format(value);
      }
    }

    function getValue(instance) {
      const { slider } = instance;
      // Auto-detect type based on step
      const step = parseFloat(slider.step) || 1;
      if (step % 1 === 0) {
        return parseInt(slider.value, 10);
      } else {
        return parseFloat(slider.value);
      }
    }

    // ========================================================================
    // Button Grid Behavior
    // ========================================================================

    CUI.ButtonGrid = {
      /**
       * Create a selectable button grid
       *
       * @param {Object} config
       * @param {string} config.containerId - Container element ID
       * @param {Array} config.buttons - Button definitions
       * @param {Function} config.onSelect - Callback(button)
       * @param {boolean} config.multiSelect - Allow multiple selection (default: false)
       */
      create(config) {
        const {
          containerId,
          buttons,
          onSelect,
          multiSelect = false
        } = config;

        const container = CUI.DOM.$(containerId);
        if (!container) {
          CUI.error(`Container #${containerId} not found`);
          return null;
        }

        const selectedButtons = new Set();

        const instance = {
          containerId,
          buttons,
          container,
          selectedButtons,
          onSelect
        };

        // Build buttons
        buttons.forEach(btnConfig => {
          const btn = CUI.DOM.create('button', {
            class: 'grid-btn',
            'data-btn-id': btnConfig.id,
            onclick: () => selectButton(instance, btnConfig, multiSelect)
          }, btnConfig.label);

          container.appendChild(btn);
          btnConfig._element = btn;
        });

        function selectButton(instance, btnConfig, multi) {
          if (!multi) {
            // Clear all selections
            instance.buttons.forEach(b => {
              if (b._element) {
                b._element.classList.remove('selected');
              }
            });
            instance.selectedButtons.clear();
          }

          // Toggle this button
          const isSelected = instance.selectedButtons.has(btnConfig.id);
          if (isSelected) {
            btnConfig._element.classList.remove('selected');
            instance.selectedButtons.delete(btnConfig.id);
          } else {
            btnConfig._element.classList.add('selected');
            instance.selectedButtons.add(btnConfig.id);
          }

          if (instance.onSelect) {
            instance.onSelect(btnConfig, !isSelected);
          }
        }

        return instance;
      }
    };

    // ========================================================================
    // Dropdown/Combo Box Behavior
    // ========================================================================

    CUI.Dropdown = {
      /**
       * Create a dropdown/combo box
       *
       * @param {Object} config
       * @param {string} config.triggerId - Trigger button ID
       * @param {string} config.dropdownId - Dropdown menu ID
       * @param {Array} config.options - Option definitions
       * @param {Function} config.onSelect - Callback(option)
       * @param {boolean} config.closeOnSelect - Close after select (default: true)
       */
      create(config) {
        const {
          triggerId,
          dropdownId,
          options,
          onSelect,
          closeOnSelect = true
        } = config;

        const trigger = CUI.DOM.$(triggerId);
        const dropdown = CUI.DOM.$(dropdownId);

        if (!trigger || !dropdown) {
          CUI.error(`Dropdown elements not found: ${triggerId}, ${dropdownId}`);
          return null;
        }

        let selectedOption = null;

        const instance = {
          triggerId,
          dropdownId,
          trigger,
          dropdown,
          options,
          selectedOption,
          isOpen: false,
          onSelect
        };

        // Build options
        options.forEach(opt => {
          const optEl = CUI.DOM.create('button', {
            class: 'combo-option',
            onclick: () => selectOption(instance, opt)
          }, opt.label);

          dropdown.appendChild(optEl);
          opt._element = optEl;
        });

        // Trigger click
        trigger.addEventListener('click', (e) => {
          e.stopPropagation();
          instance.isOpen ? close(instance) : open(instance);
        });

        // Click outside to close
        document.addEventListener('click', () => {
          if (instance.isOpen) {
            close(instance);
          }
        });

        function selectOption(instance, opt) {
          // Update selected
          instance.options.forEach(o => {
            if (o._element) {
              o._element.classList.remove('selected');
            }
          });

          opt._element.classList.add('selected');
          instance.selectedOption = opt;

          // Update trigger text
          instance.trigger.querySelector('.combo-btn-text')?.remove();
          const textSpan = CUI.DOM.create('span', { class: 'combo-btn-text' }, opt.label);
          instance.trigger.insertBefore(textSpan, instance.trigger.firstChild);

          // Callback
          if (instance.onSelect) {
            instance.onSelect(opt);
          }

          // Close if configured
          if (closeOnSelect) {
            close(instance);
          }
        }

        function open(instance) {
          instance.dropdown.classList.add('open');
          instance.trigger.classList.add('open');
          instance.isOpen = true;
        }

        function close(instance) {
          instance.dropdown.classList.remove('open');
          instance.trigger.classList.remove('open');
          instance.isOpen = false;
        }

        instance.open = () => open(instance);
        instance.close = () => close(instance);
        instance.select = (optId) => {
          const opt = instance.options.find(o => o.id === optId);
          if (opt) selectOption(instance, opt);
        };

        return instance;
      }
    };

    // ========================================================================
    // Parameter Binding
    // ========================================================================

    CUI.ParamBinder = {
      /**
       * Bind a parameter to a slider and sync with a params object
       *
       * @param {Object} config
       * @param {string} config.id - Slider ID
       * @param {Object} config.params - Params object to sync with
       * @param {string} config.key - Key in params object (default: id)
       * @param {Function} config.onChange - Additional callback
       * @param {Function} config.format - Value formatter
       */
      bind(config) {
        const {
          id,
          params,
          key = id,
          onChange,
          format
        } = config;

        return CUI.Slider.create({
          id,
          format,
          onChange: (value) => {
            params[key] = value;
            if (onChange) onChange(value, key);
            CUI.Events.emit('cui:param:changed', { key, value });
          }
        });
      },

      /**
       * Batch bind multiple parameters
       */
      bindMany(keys, params, options = {}) {
        const bindings = {};
        keys.forEach(key => {
          bindings[key] = CUI.ParamBinder.bind({
            id: key,
            params,
            format: options.format?.[key],
            onChange: options.onChange
          });
        });
        return bindings;
      }
    };

    // ========================================================================
    // Animation Helpers
    // ========================================================================

    CUI.Animate = {
      /**
       * Fade in element
       */
      fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.transition = `opacity ${duration}ms ease`;
        element.style.display = 'block';

        requestAnimationFrame(() => {
          element.style.opacity = '1';
        });

        return new Promise(resolve => {
          setTimeout(resolve, duration);
        });
      },

      /**
       * Fade out element
       */
      fadeOut(element, duration = 300) {
        element.style.transition = `opacity ${duration}ms ease`;
        element.style.opacity = '0';

        return new Promise(resolve => {
          setTimeout(() => {
            element.style.display = 'none';
            resolve();
          }, duration);
        });
      },

      /**
       * Slide down element
       */
      slideDown(element, duration = 300) {
        element.style.height = '0';
        element.style.overflow = 'hidden';
        element.style.transition = `height ${duration}ms ease`;
        element.style.display = 'block';

        const targetHeight = element.scrollHeight;

        requestAnimationFrame(() => {
          element.style.height = targetHeight + 'px';
        });

        return new Promise(resolve => {
          setTimeout(() => {
            element.style.height = 'auto';
            element.style.overflow = '';
            resolve();
          }, duration);
        });
      },

      /**
       * Slide up element
       */
      slideUp(element, duration = 300) {
        element.style.height = element.scrollHeight + 'px';
        element.style.overflow = 'hidden';
        element.style.transition = `height ${duration}ms ease`;

        requestAnimationFrame(() => {
          element.style.height = '0';
        });

        return new Promise(resolve => {
          setTimeout(() => {
            element.style.display = 'none';
            element.style.overflow = '';
            resolve();
          }, duration);
        });
      }
    };

    // ========================================================================
    // Form Helpers
    // ========================================================================

    CUI.Form = {
      /**
       * Serialize form data to object
       */
      serialize(formElement) {
        const formData = new FormData(formElement);
        const data = {};
        for (const [key, value] of formData.entries()) {
          data[key] = value;
        }
        return data;
      },

      /**
       * Populate form from object
       */
      populate(formElement, data) {
        Object.entries(data).forEach(([key, value]) => {
          const input = formElement.elements[key];
          if (input) {
            input.value = value;
          }
        });
      }
    };

    CUI.log('Behaviors module loaded');
  });

})();
