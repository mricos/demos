/**
 * Prompt Manager - Compound Context-Aware CLI Prompts
 *
 * Manages the vecterm prompt system with support for:
 * - User context: vecterm[demo-user]>
 * - Appliance context: vecterm[demo-user x midi]>
 * - Nested subcontexts via tab selection
 *
 * Prompt Evolution:
 *   vecterm>
 *   vecterm[demo-user]>
 *   vecterm[demo-user x midi]>
 *   vecterm[demo-user x midi:learn]>
 */

export class PromptManager {
  constructor(store) {
    this.store = store;
    this.username = null;
    this.applianceContext = null;
    this.subContext = null;
    this.contextStack = [];
  }

  /**
   * Initialize prompt manager
   */
  initialize() {
    // Get username from auth state
    const state = this.store.getState();
    this.username = state.auth?.username || null;

    // Subscribe to context changes
    this.store.subscribe(this.handleStateChange.bind(this));
  }

  /**
   * Set username (from auth)
   */
  setUsername(username) {
    this.username = username;
    this.updatePrompt();
  }

  /**
   * Enter appliance context
   */
  enterContext(contextName) {
    this.applianceContext = contextName;
    this.subContext = null;
    this.updatePrompt();
    console.log(`✓ Entered ${contextName} context`);
  }

  /**
   * Enter subcontext
   */
  enterSubContext(subContextName) {
    if (!this.applianceContext) {
      console.error('Cannot enter subcontext without an appliance context');
      return false;
    }
    this.subContext = subContextName;
    this.updatePrompt();
    console.log(`✓ Entered ${subContextName} subcontext`);
    return true;
  }

  /**
   * Exit current context
   */
  exitContext() {
    if (this.subContext) {
      // Exit subcontext first
      this.subContext = null;
      this.updatePrompt();
      console.log('✓ Exited subcontext');
    } else if (this.applianceContext) {
      // Exit appliance context
      this.applianceContext = null;
      this.updatePrompt();
      console.log('✓ Exited appliance context');
    } else {
      console.log('Already at root context');
    }
  }

  /**
   * Exit all contexts (return to root)
   */
  exitAll() {
    this.applianceContext = null;
    this.subContext = null;
    this.updatePrompt();
    console.log('✓ Returned to root context');
  }

  /**
   * Get current context path
   */
  getContextPath() {
    const parts = ['vecterm'];

    if (this.username) {
      parts.push(`[${this.username}]`);
    }

    if (this.applianceContext) {
      if (this.username) {
        parts[parts.length - 1] = `[${this.username} x ${this.applianceContext}]`;
      } else {
        parts.push(`[${this.applianceContext}]`);
      }
    }

    if (this.subContext) {
      parts.push(`:${this.subContext}`);
    }

    return parts.join('');
  }

  /**
   * Build the prompt string
   */
  buildPrompt() {
    return this.getContextPath() + '> ';
  }

  /**
   * Update the prompt in the DOM
   */
  updatePrompt() {
    const promptEl = document.getElementById('cli-prompt-text');
    if (promptEl) {
      promptEl.textContent = this.buildPrompt();
    }

    // Update state
    this.store.dispatch({
      type: 'PROMPT_UPDATE',
      payload: {
        username: this.username,
        appliance: this.applianceContext,
        subcontext: this.subContext
      }
    });
  }

  /**
   * Handle Redux state changes
   */
  handleStateChange() {
    const state = this.store.getState();

    // Sync with auth state
    const username = state.auth?.username;
    if (username !== this.username) {
      this.username = username;
      this.updatePrompt();
    }

    // Handle legacy cliPrompt.mode (for backward compatibility)
    const mode = state.cliPrompt?.mode;
    const fieldId = state.cliPrompt?.fieldId;
    const contextId = state.cliPrompt?.contextId;

    if (mode === 'field' && fieldId) {
      // Game field mode
      if (this.applianceContext !== 'game') {
        this.enterContext('game');
      }
      if (this.subContext !== fieldId) {
        this.enterSubContext(fieldId);
      }
    } else if (mode === 'context' && contextId) {
      // Context edit mode
      if (this.applianceContext !== 'context') {
        this.enterContext('context');
      }
      if (this.subContext !== contextId) {
        this.enterSubContext(contextId);
      }
    } else if (mode === 'idle') {
      // Root mode
      if (this.applianceContext !== null || this.subContext !== null) {
        this.exitAll();
      }
    }
  }

  /**
   * Get available commands for current context
   */
  getContextCommands() {
    if (this.applianceContext) {
      // Get commands from module loader if available
      if (window.Vecterm?.ModuleLoader) {
        const context = window.Vecterm.ModuleLoader.getContext(this.applianceContext);
        if (context) {
          return context.commands || [];
        }
      }

      // Fallback: hardcoded context commands
      return this.getHardcodedContextCommands();
    }

    return []; // Root context shows all commands
  }

  /**
   * Fallback hardcoded context commands
   */
  getHardcodedContextCommands() {
    const contextCommands = {
      midi: [
        'status', 'map', 'unmap', 'learn', 'ui', 'reset',
        'play', 'stop', 'record', 'preset', 'exit'
      ],
      tines: [
        'status', 'play', 'stop', 'bpm', 'volume', 'pan',
        'mute', 'solo', 'drone', 'bells', 'adsr', 'delay',
        'pitch', 'preset', 'exit'
      ],
      vecterm: [
        'demo', 'spawn', 'camera', 'grid', 'config', 'exit'
      ],
      game: [
        'pause', 'resume', 'restart', 'controls', 'player', 'exit'
      ],
      context: [
        'set', 'get', 'reset', 'preview', 'exit'
      ]
    };

    return contextCommands[this.applianceContext] || [];
  }

  /**
   * Get available subcontexts for current appliance
   */
  getAvailableSubContexts() {
    if (!this.applianceContext) return [];

    const subContexts = {
      midi: ['learn', 'map', 'record'],
      tines: ['pattern', 'mixer', 'adsr'],
      game: [] // Dynamic based on active games
    };

    return subContexts[this.applianceContext] || [];
  }

  /**
   * Get context info for display
   */
  getContextInfo() {
    return {
      username: this.username,
      appliance: this.applianceContext,
      subcontext: this.subContext,
      path: this.getContextPath(),
      prompt: this.buildPrompt(),
      availableCommands: this.getContextCommands(),
      availableSubContexts: this.getAvailableSubContexts()
    };
  }

  /**
   * Check if command is available in current context
   */
  isCommandAvailable(command) {
    const contextCommands = this.getContextCommands();

    // If no context restrictions, all commands available
    if (contextCommands.length === 0) return true;

    // Check if command in context's allowed commands
    return contextCommands.some(cmd => {
      if (cmd === command) return true;
      if (command.startsWith(cmd + '.')) return true; // Namespace match
      return false;
    });
  }
}

// Reducer for prompt state (to be added to Redux)
const initialPromptState = {
  username: null,
  appliance: null,
  subcontext: null
};

export function promptReducer(state = initialPromptState, action) {
  switch (action.type) {
    case 'PROMPT_UPDATE':
      return {
        ...state,
        ...action.payload
      };

    case 'PROMPT_SET_USERNAME':
      return {
        ...state,
        username: action.payload
      };

    case 'PROMPT_ENTER_CONTEXT':
      return {
        ...state,
        appliance: action.payload,
        subcontext: null
      };

    case 'PROMPT_ENTER_SUBCONTEXT':
      return {
        ...state,
        subcontext: action.payload
      };

    case 'PROMPT_EXIT_CONTEXT':
      if (state.subcontext) {
        return {
          ...state,
          subcontext: null
        };
      } else {
        return {
          ...state,
          appliance: null,
          subcontext: null
        };
      }

    case 'PROMPT_EXIT_ALL':
      return {
        ...state,
        appliance: null,
        subcontext: null
      };

    default:
      return state;
  }
}
