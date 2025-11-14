/**
 * CUI experiments Plugin
 * Experiment save/load/compare component for CUI framework
 * Version: 1.0.0
 */

(function() {
  'use strict';

  CUI.register('experiments', ['core'], function(CUI) {
    const instances = {};

    CUI.experiments = {
      /**
       * Create an experiments instance
       * @param {Object} config - Configuration object
       * @param {string} config.id - Unique identifier
       * @param {string} config.listId - ID of experiments list container
       * @param {string} config.storageKey - localStorage key for experiments
       * @param {Function} config.onSave - Called to get experiment data
       * @param {Function} config.onLoad - Called to restore experiment data
       * @param {Function} [config.onDelete] - Called when experiment is deleted
       * @param {Function} [config.renderThumbnail] - Custom thumbnail renderer (canvas, data) => void
       * @returns {Object} Experiments instance
       */
      create(config) {
        if (!config.id || !config.listId || !config.storageKey) {
          throw new Error('experiments.create requires id, listId, and storageKey');
        }

        const listEl = CUI.DOM.$(config.listId);
        if (!listEl) {
          throw new Error(`experiments list element '${config.listId}' not found`);
        }

        const instance = {
          id: config.id,
          listEl,
          storageKey: config.storageKey,
          onSave: config.onSave || (() => ({})),
          onLoad: config.onLoad || (() => {}),
          onDelete: config.onDelete || (() => {}),
          renderThumbnail: config.renderThumbnail || null,

          /**
           * Get all saved experiments
           * @returns {Object} Experiments object
           */
          getAll() {
            return JSON.parse(localStorage.getItem(instance.storageKey) || '{}');
          },

          /**
           * Save an experiment
           * @param {string} name - Experiment name
           * @param {Object} [data] - Optional data (uses onSave callback if not provided)
           * @returns {Object} Saved experiment data
           */
          save(name, data = null) {
            if (!name) {
              throw new Error('Experiment name is required');
            }

            const expData = data || instance.onSave();
            const experiment = {
              ...expData,
              name,
              timestamp: new Date().toISOString()
            };

            const saved = instance.getAll();
            saved[name] = experiment;
            localStorage.setItem(instance.storageKey, JSON.stringify(saved));

            CUI.log(`experiments: Saved '${name}'`);
            return experiment;
          },

          /**
           * Load an experiment
           * @param {string} name - Experiment name
           * @returns {Object|null} Experiment data or null if not found
           */
          load(name) {
            if (!name) {
              throw new Error('Experiment name is required');
            }

            const saved = instance.getAll();
            if (!saved[name]) {
              CUI.log(`experiments: Experiment '${name}' not found`, 'warn');
              return null;
            }

            instance.onLoad(saved[name]);
            CUI.log(`experiments: Loaded '${name}'`);
            return saved[name];
          },

          /**
           * Delete an experiment
           * @param {string} name - Experiment name
           * @returns {boolean} True if deleted, false if not found
           */
          delete(name) {
            if (!name) {
              throw new Error('Experiment name is required');
            }

            const saved = instance.getAll();
            if (!saved[name]) {
              return false;
            }

            delete saved[name];
            localStorage.setItem(instance.storageKey, JSON.stringify(saved));
            instance.onDelete(name);

            CUI.log(`experiments: Deleted '${name}'`);
            return true;
          },

          /**
           * List all experiment names
           * @returns {string[]} Array of experiment names
           */
          list() {
            return Object.keys(instance.getAll()).sort();
          },

          /**
           * Render experiments list in the UI
           * @param {Object} [options] - Render options
           * @param {Function} [options.onClick] - Click handler (name) => void
           * @param {Function} [options.renderItem] - Custom item renderer (name, data) => HTMLElement
           */
          render(options = {}) {
            const saved = instance.getAll();
            const names = Object.keys(saved).sort();

            if (names.length === 0) {
              listEl.innerHTML = `
                <div style="text-align:center; color:var(--muted); padding:20px;">
                  No experiments saved yet.
                </div>
              `;
              return;
            }

            listEl.innerHTML = '';

            names.forEach(name => {
              const exp = saved[name];

              // Use custom renderer if provided
              if (options.renderItem) {
                const item = options.renderItem(name, exp);
                if (item) {
                  listEl.appendChild(item);
                }
                return;
              }

              // Default renderer
              const item = document.createElement('div');
              item.className = 'experiment-item';

              // Thumbnail canvas
              if (instance.renderThumbnail) {
                const canvas = document.createElement('canvas');
                canvas.width = 50;
                canvas.height = 50;
                item.appendChild(canvas);

                // Render thumbnail after DOM insertion
                setTimeout(() => instance.renderThumbnail(canvas, exp), 0);
              }

              // Info div
              const infoDiv = document.createElement('div');
              infoDiv.style.flex = '1';

              const nameEl = document.createElement('div');
              nameEl.className = 'exp-name';
              nameEl.textContent = name;

              const paramsEl = document.createElement('div');
              paramsEl.className = 'exp-params';
              if (exp.curves) {
                const c = exp.curves;
                paramsEl.textContent = `R₀=${c.r0.toFixed(2)}, Rₜ=${c.rt.toFixed(2)}, τ=${c.t_peak.toFixed(1)}s`;
              }

              const timestampEl = document.createElement('div');
              timestampEl.className = 'exp-timestamp';
              const date = new Date(exp.timestamp);
              timestampEl.textContent = date.toLocaleString();

              infoDiv.appendChild(nameEl);
              infoDiv.appendChild(paramsEl);
              infoDiv.appendChild(timestampEl);
              item.appendChild(infoDiv);

              // Click handler
              item.onclick = () => {
                if (options.onClick) {
                  options.onClick(name, exp);
                } else {
                  instance.load(name);
                }
              };

              listEl.appendChild(item);
            });
          },

          /**
           * Export experiment to JSON file
           * @param {string} name - Experiment name
           */
          export(name) {
            const saved = instance.getAll();
            if (!saved[name]) {
              throw new Error(`Experiment '${name}' not found`);
            }

            const blob = new Blob([JSON.stringify(saved[name], null, 2)], {
              type: 'application/json'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `experiment_${name}_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);

            CUI.log(`experiments: Exported '${name}'`);
          },

          /**
           * Import experiment from JSON
           * @param {Object} data - Experiment data
           * @param {string} [name] - Optional name override
           */
          import(data, name = null) {
            const expName = name || data.name || `imported_${Date.now()}`;
            instance.save(expName, data);
            return expName;
          },

          /**
           * Clear all experiments
           */
          clear() {
            localStorage.removeItem(instance.storageKey);
            instance.render();
            CUI.log('experiments: Cleared all experiments');
          }
        };

        // Store instance
        instances[config.id] = instance;

        CUI.log(`experiments: Created instance '${config.id}'`);
        return instance;
      },

      /**
       * Get an experiments instance by ID
       * @param {string} id - Instance ID
       * @returns {Object|null} Experiments instance
       */
      get(id) {
        return instances[id] || null;
      },

      /**
       * Destroy an experiments instance
       * @param {string} id - Instance ID
       */
      destroy(id) {
        if (instances[id]) {
          delete instances[id];
          CUI.log(`experiments: Destroyed instance '${id}'`);
        }
      }
    };

    CUI.log('experiments plugin loaded');
  });
})();
