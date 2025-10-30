/**
 * Storage Manager Module
 * Centralized localStorage management with versioning and migration
 */

window.FP = window.FP || {};

window.FP.StorageManager = (function() {
    'use strict';

    const Logger = window.FP.Logger;
    const STORAGE_VERSION = 2;
    const PREFIX = 'phaseField_v' + STORAGE_VERSION + '_';

    /**
     * Save data to localStorage
     */
    function save(key, data) {
        try {
            const prefixedKey = PREFIX + key;
            const serialized = JSON.stringify({
                version: STORAGE_VERSION,
                timestamp: Date.now(),
                data
            });

            localStorage.setItem(prefixedKey, serialized);

            if (Logger) {
                Logger.debug('StorageManager', `Saved: ${key}`);
            }

            return true;
        } catch (error) {
            if (Logger) {
                Logger.error('StorageManager', `Failed to save: ${key}`, error);
            }
            return false;
        }
    }

    /**
     * Load data from localStorage
     */
    function load(key, defaultValue = null) {
        try {
            const prefixedKey = PREFIX + key;
            const item = localStorage.getItem(prefixedKey);

            if (!item) {
                return defaultValue;
            }

            const parsed = JSON.parse(item);

            // Check version
            if (parsed.version !== STORAGE_VERSION) {
                if (Logger) {
                    Logger.warn('StorageManager', `Version mismatch for ${key}: ${parsed.version} vs ${STORAGE_VERSION}`);
                }
                return defaultValue;
            }

            if (Logger) {
                Logger.debug('StorageManager', `Loaded: ${key}`);
            }

            return parsed.data;
        } catch (error) {
            if (Logger) {
                Logger.error('StorageManager', `Failed to load: ${key}`, error);
            }
            return defaultValue;
        }
    }

    /**
     * Remove data from localStorage
     */
    function remove(key) {
        try {
            const prefixedKey = PREFIX + key;
            localStorage.removeItem(prefixedKey);

            if (Logger) {
                Logger.debug('StorageManager', `Removed: ${key}`);
            }

            return true;
        } catch (error) {
            if (Logger) {
                Logger.error('StorageManager', `Failed to remove: ${key}`, error);
            }
            return false;
        }
    }

    /**
     * Check if key exists
     */
    function has(key) {
        const prefixedKey = PREFIX + key;
        return localStorage.getItem(prefixedKey) !== null;
    }

    /**
     * Get all keys (without prefix)
     */
    function getAllKeys() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(PREFIX)) {
                keys.push(key.substring(PREFIX.length));
            }
        }
        return keys;
    }

    /**
     * Clear all app data
     */
    function clearAll() {
        const keys = getAllKeys();
        keys.forEach(key => remove(key));

        if (Logger) {
            Logger.info('StorageManager', `Cleared ${keys.length} items`);
        }

        return keys.length;
    }

    /**
     * Export all data
     */
    function exportAll() {
        const data = {};
        const keys = getAllKeys();

        keys.forEach(key => {
            data[key] = load(key);
        });

        return {
            version: STORAGE_VERSION,
            exported: Date.now(),
            data
        };
    }

    /**
     * Import data
     */
    function importAll(importData) {
        try {
            if (importData.version !== STORAGE_VERSION) {
                if (Logger) {
                    Logger.warn('StorageManager', `Import version mismatch: ${importData.version} vs ${STORAGE_VERSION}`);
                }
            }

            Object.entries(importData.data).forEach(([key, value]) => {
                save(key, value);
            });

            if (Logger) {
                Logger.info('StorageManager', `Imported ${Object.keys(importData.data).length} items`);
            }

            return true;
        } catch (error) {
            if (Logger) {
                Logger.error('StorageManager', 'Failed to import data', error);
            }
            return false;
        }
    }

    /**
     * Get storage usage info
     */
    function getStorageInfo() {
        const keys = getAllKeys();
        let totalSize = 0;
        const items = [];

        keys.forEach(key => {
            const prefixedKey = PREFIX + key;
            const item = localStorage.getItem(prefixedKey);
            const size = item ? item.length : 0;
            totalSize += size;
            items.push({ key, size });
        });

        // Estimate total localStorage size (typically 5MB limit)
        const estimatedLimit = 5 * 1024 * 1024; // 5MB in bytes (chars)
        const usagePercent = (totalSize / estimatedLimit) * 100;

        return {
            itemCount: keys.length,
            totalSize,
            totalSizeKB: (totalSize / 1024).toFixed(2),
            estimatedLimit,
            usagePercent: usagePercent.toFixed(2),
            items: items.sort((a, b) => b.size - a.size)
        };
    }

    /**
     * Download storage data as JSON file
     */
    function downloadBackup() {
        const data = exportAll();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `phasefield-backup-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (Logger) {
            Logger.info('StorageManager', 'Backup downloaded');
        }
    }

    return {
        save,
        load,
        remove,
        has,
        getAllKeys,
        clearAll,
        exportAll,
        importAll,
        getStorageInfo,
        downloadBackup
    };
})();
