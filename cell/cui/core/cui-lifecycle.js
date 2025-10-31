/**
 * CUI Lifecycle
 * IIFE module registration, dependency resolution, and hot-reload support
 */

(function() {
  'use strict';

  if (!window.CUI) {
    console.error('[CUI Lifecycle] CUI core not found. Load cui-core.js first.');
    return;
  }

  console.log('[CUI] Lifecycle module loading...');

  // ==========================================================================
  // Module Registry
  // ==========================================================================

  const registry = new Map(); // moduleName -> { deps, factory, loaded, exports }
  const readyCallbacks = [];
  let allModulesReady = false;

  // ==========================================================================
  // CUI.register() - Module Registration
  // ==========================================================================

  /**
   * Register a module with dependencies
   *
   * @param {string} name - Module name
   * @param {string[]} deps - Array of dependency module names
   * @param {Function} factory - Factory function that receives CUI as argument
   *
   * Example:
   *   CUI.register('tabs', ['core', 'lifecycle'], function(CUI) {
   *     CUI.Tabs = { ... };
   *   });
   */
  CUI.register = function(name, deps = [], factory) {
    // Allow simpler syntax: register(name, factory) with no deps
    if (typeof deps === 'function') {
      factory = deps;
      deps = [];
    }

    // Check if re-registering (hot-reload)
    const isReload = registry.has(name);

    registry.set(name, {
      name,
      deps,
      factory,
      loaded: false,
      exports: null
    });

    if (isReload) {
      CUI.log(`Module "${name}" re-registered (hot-reload)`);
      CUI.Events.emit('cui:module:reloaded', { name });
    } else {
      CUI.log(`Module "${name}" registered with deps: [${deps.join(', ')}]`);
      CUI.Events.emit('cui:module:registered', { name, deps });
    }

    // Try to resolve and execute modules
    tryExecuteModules();
  };

  // ==========================================================================
  // Dependency Resolution & Execution
  // ==========================================================================

  /**
   * Try to execute all registered modules in dependency order
   */
  function tryExecuteModules() {
    let executed = false;

    for (const [name, module] of registry.entries()) {
      if (!module.loaded && canExecute(module)) {
        executeModule(module);
        executed = true;
      }
    }

    // If we executed something, try again (recursive resolution)
    if (executed) {
      tryExecuteModules();
    }

    // Check if all modules are ready
    checkAllReady();
  }

  /**
   * Check if a module's dependencies are satisfied
   */
  function canExecute(module) {
    // Core is always available (it's not in registry)
    const coreDeps = ['core', 'lifecycle', 'tokens'];

    return module.deps.every(dep => {
      // Core deps are always satisfied
      if (coreDeps.includes(dep)) return true;

      // Check if dep is loaded
      const depModule = registry.get(dep);
      return depModule && depModule.loaded;
    });
  }

  /**
   * Execute a module's factory function
   */
  function executeModule(module) {
    try {
      CUI.log(`Executing module "${module.name}"...`);

      // Call factory function with CUI as argument
      const exports = module.factory(CUI);

      // Mark as loaded
      module.loaded = true;
      module.exports = exports;

      // Store in CUI.modules
      CUI.modules[module.name] = module;

      CUI.log(`Module "${module.name}" loaded`);
      CUI.Events.emit('cui:module:loaded', { name: module.name, exports });

    } catch (err) {
      CUI.error(`Failed to execute module "${module.name}":`, err);
      CUI.Events.emit('cui:module:error', { name: module.name, error: err });
    }
  }

  /**
   * Check if all registered modules are loaded
   */
  function checkAllReady() {
    const allLoaded = Array.from(registry.values()).every(m => m.loaded);

    if (allLoaded && !allModulesReady) {
      allModulesReady = true;
      CUI.log('All modules loaded ✓');
      CUI.Events.emit('cui:ready');

      // Execute ready callbacks
      readyCallbacks.forEach(callback => {
        try {
          callback(CUI);
        } catch (err) {
          CUI.error('Error in ready callback:', err);
        }
      });

      // Clear callbacks
      readyCallbacks.length = 0;
    }
  }

  // ==========================================================================
  // CUI.ready() - Initialization Hook
  // ==========================================================================

  /**
   * Register a callback to run when all modules are loaded
   *
   * @param {Function} callback - Function to call when ready
   *
   * Example:
   *   CUI.ready(function(CUI) {
   *     CUI.init({ physics: 'sir' });
   *   });
   */
  CUI.ready = function(callback) {
    if (allModulesReady) {
      // Already ready, execute immediately
      try {
        callback(CUI);
      } catch (err) {
        CUI.error('Error in ready callback:', err);
      }
    } else {
      // Queue for later
      readyCallbacks.push(callback);
    }
  };

  // ==========================================================================
  // Hot Reload Support
  // ==========================================================================

  /**
   * Reload a module by name (useful for development)
   */
  CUI.reload = function(moduleName) {
    const module = registry.get(moduleName);
    if (!module) {
      CUI.warn(`Module "${moduleName}" not found`);
      return;
    }

    CUI.log(`Reloading module "${moduleName}"...`);

    // Re-execute
    module.loaded = false;
    tryExecuteModules();
  };

  /**
   * Get module info
   */
  CUI.getModule = function(name) {
    return registry.get(name);
  };

  /**
   * List all registered modules
   */
  CUI.listModules = function() {
    return Array.from(registry.keys());
  };

  /**
   * Get module dependency graph
   */
  CUI.getDependencyGraph = function() {
    const graph = {};
    for (const [name, module] of registry.entries()) {
      graph[name] = {
        deps: module.deps,
        loaded: module.loaded
      };
    }
    return graph;
  };

  // ==========================================================================
  // Helpful Debug Commands
  // ==========================================================================

  /**
   * Print module status to console
   */
  CUI.moduleStatus = function() {
    console.log('=== CUI Module Status ===');
    for (const [name, module] of registry.entries()) {
      const status = module.loaded ? '✓' : '⏳';
      const deps = module.deps.length ? `[${module.deps.join(', ')}]` : '[]';
      console.log(`${status} ${name} ${deps}`);
    }
    console.log(`\nTotal: ${registry.size} modules`);
    console.log(`Ready: ${allModulesReady ? 'Yes' : 'No'}`);
  };

  // ==========================================================================
  // Auto-register lifecycle as a module (meta!)
  // ==========================================================================

  CUI.register('lifecycle', [], function(CUI) {
    CUI.log('Lifecycle module self-registered');
  });

  // Signal lifecycle module is ready
  CUI.Events.emit('cui:lifecycle:ready');
  CUI.log('Lifecycle module ready');

  // Expose for console debugging
  window.CUIDebug = {
    modules: () => CUI.listModules(),
    status: () => CUI.moduleStatus(),
    graph: () => CUI.getDependencyGraph(),
    reload: (name) => CUI.reload(name)
  };

  console.log('[CUI] Use CUIDebug object for module debugging');

})();
