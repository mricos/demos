/**
 * Module Loader for Vecterm
 *
 * Simple directory-based module system where each module is a directory
 * with a manifest.json defining commands, completions, and entry point.
 *
 * Module Structure:
 * /modules/{module-name}/
 *   manifest.json - Module metadata and registration
 *   index.js - Entry point
 *   ... other files
 */

export class ModuleLoader {
  constructor(store) {
    this.store = store;
    this.modules = new Map();
    this.commandRegistry = new Map();
    this.completionRegistry = new Map();
    this.contextRegistry = new Map();
  }

  /**
   * Register a module
   * @param {Object} manifest - Module manifest
   * @param {Object} moduleExports - Module exports (functions, classes, etc.)
   */
  async registerModule(manifest, moduleExports) {
    const { name, version, commands, completions, contexts, entrypoint } = manifest;

    if (this.modules.has(name)) {
      console.warn(`Module ${name} is already registered. Skipping.`);
      return false;
    }

    const moduleInfo = {
      name,
      version,
      manifest,
      exports: moduleExports,
      initialized: false
    };

    // Register commands
    if (commands && Array.isArray(commands)) {
      commands.forEach(cmd => {
        const fullCommand = cmd.namespace ? `${cmd.namespace}.${cmd.name}` : cmd.name;
        this.commandRegistry.set(fullCommand, {
          module: name,
          handler: cmd.handler,
          description: cmd.description,
          args: cmd.args || [],
          examples: cmd.examples || []
        });
      });
    }

    // Register completions
    if (completions && Array.isArray(completions)) {
      completions.forEach(comp => {
        this.completionRegistry.set(comp.pattern, {
          module: name,
          options: comp.options,
          dynamic: comp.dynamic || false,
          generator: comp.generator
        });
      });
    }

    // Register contexts
    if (contexts && Array.isArray(contexts)) {
      contexts.forEach(ctx => {
        this.contextRegistry.set(ctx.name, {
          module: name,
          enterCommand: ctx.enterCommand,
          exitCommand: ctx.exitCommand || 'exit',
          prompt: ctx.prompt,
          subcontexts: ctx.subcontexts || []
        });
      });
    }

    this.modules.set(name, moduleInfo);
    console.log(`✓ Module registered: ${name} v${version}`);
    return true;
  }

  /**
   * Initialize a module (call its init function)
   */
  async initializeModule(moduleName) {
    const moduleInfo = this.modules.get(moduleName);
    if (!moduleInfo) {
      throw new Error(`Module ${moduleName} not found`);
    }

    if (moduleInfo.initialized) {
      console.warn(`Module ${moduleName} already initialized`);
      return;
    }

    // Call module's init function if it exists
    if (moduleInfo.exports && moduleInfo.exports.init) {
      await moduleInfo.exports.init(this.store);
      moduleInfo.initialized = true;
      console.log(`✓ Module initialized: ${moduleName}`);
    }
  }

  /**
   * Initialize all registered modules
   */
  async initializeAll() {
    console.log('Initializing modules...');
    for (const [name, moduleInfo] of this.modules) {
      if (!moduleInfo.initialized) {
        await this.initializeModule(name);
      }
    }
    console.log('✓ All modules initialized');
  }

  /**
   * Get command handler by command name
   */
  getCommandHandler(commandName) {
    return this.commandRegistry.get(commandName);
  }

  /**
   * Get all commands (optionally filtered by module or context)
   */
  getAllCommands(filter = {}) {
    const commands = [];
    for (const [cmdName, cmdInfo] of this.commandRegistry) {
      if (filter.module && cmdInfo.module !== filter.module) continue;
      if (filter.context && cmdInfo.context !== filter.context) continue;
      commands.push({ name: cmdName, ...cmdInfo });
    }
    return commands;
  }

  /**
   * Get completion options for a command prefix
   */
  getCompletions(prefix, context = null) {
    const completions = [];

    // Exact matches
    for (const [pattern, compInfo] of this.completionRegistry) {
      if (pattern.startsWith(prefix)) {
        if (compInfo.dynamic && compInfo.generator) {
          // Dynamic completions (e.g., game names, file names)
          const dynamicOptions = compInfo.generator(this.store.getState());
          completions.push(...dynamicOptions);
        } else {
          completions.push(...compInfo.options);
        }
      }
    }

    // Command completions
    for (const [cmdName, cmdInfo] of this.commandRegistry) {
      if (cmdName.startsWith(prefix)) {
        completions.push({
          value: cmdName,
          description: cmdInfo.description,
          module: cmdInfo.module
        });
      }
    }

    return completions;
  }

  /**
   * Get context information
   */
  getContext(contextName) {
    return this.contextRegistry.get(contextName);
  }

  /**
   * Get all registered contexts
   */
  getAllContexts() {
    return Array.from(this.contextRegistry.entries()).map(([name, info]) => ({
      name,
      ...info
    }));
  }

  /**
   * Get module info
   */
  getModule(moduleName) {
    return this.modules.get(moduleName);
  }

  /**
   * Get all registered modules
   */
  getAllModules() {
    return Array.from(this.modules.values());
  }

  /**
   * Unregister a module (for hot reloading)
   */
  unregisterModule(moduleName) {
    const moduleInfo = this.modules.get(moduleName);
    if (!moduleInfo) return false;

    // Remove commands
    for (const [cmdName, cmdInfo] of this.commandRegistry) {
      if (cmdInfo.module === moduleName) {
        this.commandRegistry.delete(cmdName);
      }
    }

    // Remove completions
    for (const [pattern, compInfo] of this.completionRegistry) {
      if (compInfo.module === moduleName) {
        this.completionRegistry.delete(pattern);
      }
    }

    // Remove contexts
    for (const [ctxName, ctxInfo] of this.contextRegistry) {
      if (ctxInfo.module === moduleName) {
        this.contextRegistry.delete(ctxName);
      }
    }

    // Call module's cleanup if it exists
    if (moduleInfo.exports && moduleInfo.exports.cleanup) {
      moduleInfo.exports.cleanup();
    }

    this.modules.delete(moduleName);
    console.log(`✓ Module unregistered: ${moduleName}`);
    return true;
  }

  /**
   * Reload a module (for development)
   */
  async reloadModule(moduleName, manifest, moduleExports) {
    this.unregisterModule(moduleName);
    await this.registerModule(manifest, moduleExports);
    await this.initializeModule(moduleName);
  }
}

// Global module loader instance (will be set during boot)
export let moduleLoader = null;

export function setModuleLoader(loader) {
  moduleLoader = loader;
}
