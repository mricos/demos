/**
 * tines.js - Variable System
 * Global and pattern-local variable storage and resolution
 */

/**
 * Variable store for pattern variables
 */
class VariableStore {
  constructor() {
    this.global = new Map();
    this.scopes = new Map(); // pattern-local scopes
  }

  /**
   * Set a global variable
   * @param {string} name - Variable name
   * @param {any} value - Variable value
   */
  setGlobal(name, value) {
    this.global.set(name, value);
    console.log(`[variables] Set global ${name} = ${value}`);
  }

  /**
   * Get a global variable
   * @param {string} name - Variable name
   * @returns {any} Variable value or undefined
   */
  getGlobal(name) {
    return this.global.get(name);
  }

  /**
   * Set a pattern-local variable
   * @param {string} scopeId - Scope identifier (usually pattern ID)
   * @param {string} name - Variable name
   * @param {any} value - Variable value
   */
  setLocal(scopeId, name, value) {
    if (!this.scopes.has(scopeId)) {
      this.scopes.set(scopeId, new Map());
    }
    this.scopes.get(scopeId).set(name, value);
  }

  /**
   * Get a variable (checks local scope first, then global)
   * @param {string} name - Variable name
   * @param {string} scopeId - Optional scope identifier
   * @returns {any} Variable value or undefined
   */
  get(name, scopeId = null) {
    // Check local scope first
    if (scopeId && this.scopes.has(scopeId)) {
      const localValue = this.scopes.get(scopeId).get(name);
      if (localValue !== undefined) {
        return localValue;
      }
    }

    // Fall back to global
    return this.global.get(name);
  }

  /**
   * Clear a scope
   * @param {string} scopeId - Scope identifier
   */
  clearScope(scopeId) {
    this.scopes.delete(scopeId);
  }

  /**
   * List all variables
   * @returns {Object} Object with global and scoped variables
   */
  list() {
    const result = {
      global: Object.fromEntries(this.global),
      scopes: {}
    };

    this.scopes.forEach((scope, id) => {
      result.scopes[id] = Object.fromEntries(scope);
    });

    return result;
  }

  /**
   * Clear all variables
   */
  clear() {
    this.global.clear();
    this.scopes.clear();
    console.log('[variables] All variables cleared');
  }
}

/**
 * Resolve variable references in a string
 * @param {string} str - String potentially containing $variable references
 * @param {VariableStore} store - Variable store
 * @param {string} scopeId - Optional scope identifier
 * @returns {string} String with variables resolved
 */
export function resolveVariables(str, store, scopeId = null) {
  if (typeof str !== 'string') return str;

  // Match $varname or ${varname}
  return str.replace(/\$\{?(\w+)\}?/g, (match, varName) => {
    const value = store.get(varName, scopeId);
    if (value === undefined) {
      console.warn(`[variables] Undefined variable: ${varName}`);
      return match; // Keep original if not found
    }
    return String(value);
  });
}

/**
 * Parse and evaluate arithmetic expressions
 * Supports: +, -, *, /, ()
 * @param {string} expr - Expression to evaluate
 * @returns {number} Result
 */
export function evaluateExpression(expr) {
  try {
    // Safety check - only allow numbers, operators, and parentheses
    if (!/^[\d\s+\-*/.()]+$/.test(expr)) {
      throw new Error('Invalid expression');
    }

    // Use Function constructor for safe evaluation
    // eslint-disable-next-line no-new-func
    return new Function(`return ${expr}`)();
  } catch (error) {
    console.error(`[variables] Expression evaluation error: ${expr}`, error);
    return NaN;
  }
}

// Global variable store instance
export const globalVariables = new VariableStore();

// Export class for custom instances
export { VariableStore };
