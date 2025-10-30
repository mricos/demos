/**
 * Parameter Mapper Module
 * Maps gamepad inputs to game parameters with curve modulation
 */

window.FP = window.FP || {};

window.FP.ParameterMapper = (function() {
    'use strict';

    const Logger = window.FP.Logger;
    const CurveMapper = window.FP.CurveMapper;

    // Parameter mappings
    const mappings = new Map();

    /**
     * Parameter target types
     */
    const TARGET_TYPES = {
        CONFIG_PARAM: 'config_param',      // Config.params.*
        CONFIG_STATE: 'config_state',      // Config.state.*
        PARTICLE_CONFIG: 'particle_config', // Config.particleConfig.*
        CUSTOM: 'custom'                   // Custom function
    };

    /**
     * Create a parameter mapping
     */
    function createMapping(id, config) {
        const mapping = {
            id,
            enabled: config.enabled ?? true,

            // Source (gamepad input)
            source: {
                type: config.source.type,           // 'axis' or 'button'
                index: config.source.index,         // Axis/button index
                gamepadType: config.source.gamepadType || null // Filter by gamepad type
            },

            // Target (game parameter)
            target: {
                type: config.target.type,           // TARGET_TYPES
                path: config.target.path,           // e.g. 'frequency' or 'editingElementIndex'
                min: config.target.min ?? 0,
                max: config.target.max ?? 1,
                transform: config.target.transform || null // Optional custom transform function
            },

            // Curve modulation (optional)
            curve: config.curve || null,            // CurveMapper ID

            // Deadzone for axes
            deadzone: config.deadzone ?? 0.1,

            // Invert input
            invert: config.invert ?? false,

            // Metadata
            name: config.name || id,
            description: config.description || '',
            category: config.category || 'general'
        };

        mappings.set(id, mapping);

        if (Logger) {
            Logger.debug('ParameterMapper', `Created mapping: ${id}`, mapping);
        }

        return mapping;
    }

    /**
     * Process gamepad input and update mapped parameters
     */
    function processGamepad(gamepad, gamepadType = 'generic') {
        if (!gamepad) return;

        mappings.forEach((mapping, id) => {
            if (!mapping.enabled) return;

            // Filter by gamepad type if specified
            if (mapping.source.gamepadType && mapping.source.gamepadType !== gamepadType) {
                return;
            }

            let rawValue = 0;

            // Get source value
            if (mapping.source.type === 'axis') {
                rawValue = gamepad.axes[mapping.source.index] || 0;

                // Apply deadzone
                if (Math.abs(rawValue) < mapping.deadzone) {
                    rawValue = 0;
                } else {
                    // Scale to account for deadzone
                    const sign = Math.sign(rawValue);
                    rawValue = sign * ((Math.abs(rawValue) - mapping.deadzone) / (1 - mapping.deadzone));
                }
            } else if (mapping.source.type === 'button') {
                const button = gamepad.buttons[mapping.source.index];
                rawValue = button ? (button.value || (button.pressed ? 1 : 0)) : 0;
            }

            // Invert if needed
            if (mapping.invert) {
                rawValue = -rawValue;
            }

            // Normalize to 0-1
            let normalized = (rawValue + 1) / 2;

            // Apply curve if specified
            if (mapping.curve && CurveMapper) {
                normalized = CurveMapper.applyCurve(mapping.curve, normalized);
            }

            // Map to target range
            const targetValue = mapping.target.min + (normalized * (mapping.target.max - mapping.target.min));

            // Apply to target
            applyToTarget(mapping, targetValue);
        });
    }

    /**
     * Apply value to target parameter
     */
    function applyToTarget(mapping, value) {
        const Config = window.FP.Config;
        if (!Config) return;

        // Apply custom transform if provided
        const finalValue = mapping.target.transform
            ? mapping.target.transform(value)
            : value;

        try {
            switch (mapping.target.type) {
                case TARGET_TYPES.CONFIG_PARAM:
                    Config.params[mapping.target.path] = finalValue;
                    break;

                case TARGET_TYPES.CONFIG_STATE:
                    Config.state[mapping.target.path] = finalValue;
                    break;

                case TARGET_TYPES.PARTICLE_CONFIG:
                    Config.particleConfig[mapping.target.path] = finalValue;
                    break;

                case TARGET_TYPES.CUSTOM:
                    // Custom handling - path should be a function
                    if (typeof mapping.target.path === 'function') {
                        mapping.target.path(finalValue);
                    }
                    break;
            }
        } catch (error) {
            if (Logger) {
                Logger.error('ParameterMapper', `Failed to apply mapping ${mapping.id}`, error);
            }
        }
    }

    /**
     * Update mapping
     */
    function updateMapping(id, updates) {
        const mapping = mappings.get(id);
        if (!mapping) return false;

        Object.assign(mapping, updates);
        return true;
    }

    /**
     * Delete mapping
     */
    function deleteMapping(id) {
        return mappings.delete(id);
    }

    /**
     * Get mapping
     */
    function getMapping(id) {
        return mappings.get(id);
    }

    /**
     * Get all mappings
     */
    function getAllMappings() {
        return Array.from(mappings.values());
    }

    /**
     * Get mappings by category
     */
    function getMappingsByCategory(category) {
        return Array.from(mappings.values()).filter(m => m.category === category);
    }

    /**
     * Enable/disable mapping
     */
    function setMappingEnabled(id, enabled) {
        const mapping = mappings.get(id);
        if (mapping) {
            mapping.enabled = enabled;
            return true;
        }
        return false;
    }

    /**
     * Clear all mappings
     */
    function clearMappings() {
        mappings.clear();
        if (Logger) {
            Logger.info('ParameterMapper', 'All mappings cleared');
        }
    }

    /**
     * Save mappings to localStorage
     */
    function saveMappings() {
        const data = Array.from(mappings.entries()).map(([id, mapping]) => {
            // Don't save transform functions
            const cleaned = { ...mapping };
            if (cleaned.target.transform) {
                delete cleaned.target.transform;
            }
            return [id, cleaned];
        });

        localStorage.setItem('phaseFieldParameterMappings', JSON.stringify(data));

        if (Logger) {
            Logger.info('ParameterMapper', `Saved ${data.length} mappings`);
        }
    }

    /**
     * Load mappings from localStorage
     */
    function loadMappings() {
        const saved = localStorage.getItem('phaseFieldParameterMappings');
        if (!saved) return false;

        try {
            const data = JSON.parse(saved);
            mappings.clear();

            data.forEach(([id, mapping]) => {
                mappings.set(id, mapping);
            });

            if (Logger) {
                Logger.info('ParameterMapper', `Loaded ${data.length} mappings`);
            }

            return true;
        } catch (error) {
            if (Logger) {
                Logger.error('ParameterMapper', 'Failed to load mappings', error);
            }
            return false;
        }
    }

    /**
     * Export mappings as JSON
     */
    function exportMappings() {
        const data = Array.from(mappings.entries());
        return JSON.stringify(data, null, 2);
    }

    /**
     * Import mappings from JSON
     */
    function importMappings(json) {
        try {
            const data = JSON.parse(json);
            mappings.clear();

            data.forEach(([id, mapping]) => {
                mappings.set(id, mapping);
            });

            if (Logger) {
                Logger.info('ParameterMapper', `Imported ${data.length} mappings`);
            }

            return true;
        } catch (error) {
            if (Logger) {
                Logger.error('ParameterMapper', 'Failed to import mappings', error);
            }
            return false;
        }
    }

    return {
        createMapping,
        processGamepad,
        updateMapping,
        deleteMapping,
        getMapping,
        getAllMappings,
        getMappingsByCategory,
        setMappingEnabled,
        clearMappings,
        saveMappings,
        loadMappings,
        exportMappings,
        importMappings,
        TARGET_TYPES
    };
})();
