/**
 * Logger Module
 * Sophisticated logging system with filtering, levels, and persistence
 */

window.FP = window.FP || {};

window.FP.Logger = (function() {
    'use strict';

    const LEVELS = {
        DEBUG: { value: 0, name: 'DEBUG', color: '#00D4FF', icon: '🔍' },
        INFO: { value: 1, name: 'INFO', color: '#00FF64', icon: 'ℹ️' },
        WARN: { value: 2, name: 'WARN', color: '#FFB800', icon: '⚠️' },
        ERROR: { value: 3, name: 'ERROR', color: '#FF3366', icon: '❌' },
        CRITICAL: { value: 4, name: 'CRITICAL', color: '#FF0000', icon: '🔥' }
    };

    let currentLevel = LEVELS.INFO;
    let logs = [];
    let maxLogs = 1000;
    let logToConsole = true;
    let logToUI = false;
    let uiElement = null;
    let filters = [];

    /**
     * Log a message
     */
    function log(level, module, message, data = null) {
        if (level.value < currentLevel.value) {
            return;
        }

        // Check filters
        if (filters.length > 0 && !filters.includes(module)) {
            return;
        }

        const entry = {
            timestamp: Date.now(),
            level: level.name,
            module,
            message,
            data,
            formatted: formatLogEntry(level, module, message, data)
        };

        // Store log
        logs.push(entry);
        if (logs.length > maxLogs) {
            logs.shift();
        }

        // Output to console
        if (logToConsole) {
            const style = `color: ${level.color}; font-weight: bold;`;
            console.log(
                `%c[${level.name}]%c [${module}] ${message}`,
                style,
                'color: inherit',
                data || ''
            );
        }

        // Output to UI
        if (logToUI && uiElement) {
            appendToUI(entry);
        }

        return entry;
    }

    /**
     * Format log entry for display
     */
    function formatLogEntry(level, module, message, data) {
        const time = new Date().toISOString().split('T')[1].split('.')[0];
        let formatted = `[${time}] ${level.icon} ${level.name.padEnd(8)} [${module.padEnd(15)}] ${message}`;

        if (data) {
            formatted += `\n  → ${JSON.stringify(data)}`;
        }

        return formatted;
    }

    /**
     * Append to UI element
     */
    function appendToUI(entry) {
        if (!uiElement) return;

        const logLine = document.createElement('div');
        logLine.className = 'log-entry log-' + entry.level.toLowerCase();
        logLine.textContent = entry.formatted;

        uiElement.appendChild(logLine);

        // Auto-scroll to bottom
        uiElement.scrollTop = uiElement.scrollHeight;

        // Limit UI entries
        while (uiElement.children.length > 100) {
            uiElement.removeChild(uiElement.firstChild);
        }
    }

    /**
     * Convenience methods
     */
    function debug(module, message, data) {
        return log(LEVELS.DEBUG, module, message, data);
    }

    function info(module, message, data) {
        return log(LEVELS.INFO, module, message, data);
    }

    function warn(module, message, data) {
        return log(LEVELS.WARN, module, message, data);
    }

    function error(module, message, data) {
        return log(LEVELS.ERROR, module, message, data);
    }

    function critical(module, message, data) {
        return log(LEVELS.CRITICAL, module, message, data);
    }

    /**
     * Set log level
     */
    function setLevel(levelName) {
        const level = LEVELS[levelName.toUpperCase()];
        if (level) {
            currentLevel = level;
            info('Logger', `Log level set to ${level.name}`);
        }
    }

    /**
     * Set module filters (empty array = show all)
     */
    function setFilters(moduleNames) {
        filters = Array.isArray(moduleNames) ? moduleNames : [moduleNames];
        info('Logger', `Filters set to: ${filters.join(', ') || 'ALL'}`);
    }

    /**
     * Clear filters
     */
    function clearFilters() {
        filters = [];
        info('Logger', 'Filters cleared');
    }

    /**
     * Set UI element for log output
     */
    function setUIElement(element) {
        uiElement = element;
        logToUI = !!element;
    }

    /**
     * Clear all logs
     */
    function clear() {
        logs = [];
        if (uiElement) {
            uiElement.innerHTML = '';
        }
        info('Logger', 'Logs cleared');
    }

    /**
     * Get logs
     */
    function getLogs(filterOptions = {}) {
        let filtered = [...logs];

        if (filterOptions.level) {
            const minLevel = LEVELS[filterOptions.level.toUpperCase()];
            if (minLevel) {
                filtered = filtered.filter(log => {
                    const logLevel = LEVELS[log.level];
                    return logLevel.value >= minLevel.value;
                });
            }
        }

        if (filterOptions.module) {
            filtered = filtered.filter(log => log.module === filterOptions.module);
        }

        if (filterOptions.since) {
            filtered = filtered.filter(log => log.timestamp >= filterOptions.since);
        }

        return filtered;
    }

    /**
     * Export logs as JSON
     */
    function exportLogs() {
        const data = {
            exported: Date.now(),
            logs: logs
        };
        return JSON.stringify(data, null, 2);
    }

    /**
     * Download logs as file
     */
    function downloadLogs() {
        const data = exportLogs();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `phasefield-logs-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        info('Logger', 'Logs downloaded');
    }

    /**
     * Get statistics
     */
    function getStats() {
        const stats = {
            total: logs.length,
            byLevel: {},
            byModule: {}
        };

        logs.forEach(log => {
            // Count by level
            stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;

            // Count by module
            stats.byModule[log.module] = (stats.byModule[log.module] || 0) + 1;
        });

        return stats;
    }

    return {
        // Logging methods
        debug,
        info,
        warn,
        error,
        critical,

        // Configuration
        setLevel,
        setFilters,
        clearFilters,
        setUIElement,

        // Management
        clear,
        getLogs,
        getStats,
        exportLogs,
        downloadLogs,

        // Constants
        LEVELS
    };
})();
