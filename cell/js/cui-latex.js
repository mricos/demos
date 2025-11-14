/**
 * CUI LaTeX
 * LaTeX rendering with KaTeX integration
 */

(function() {
  'use strict';

  CUI.register('latex', ['core'], function(CUI) {
    CUI.log('LaTeX module initializing...');

    // ========================================================================
    // LaTeX Manager
    // ========================================================================

    CUI.LaTeX = {
      ready: false,
      useKaTeX: false,

      /**
       * Initialize LaTeX rendering
       * Checks for KaTeX availability
       */
      init() {
        // Check if KaTeX is loaded
        if (typeof katex !== 'undefined') {
          CUI.LaTeX.useKaTeX = true;
          CUI.LaTeX.ready = true;
          CUI.log('LaTeX rendering with KaTeX enabled');
        } else {
          CUI.warn('KaTeX not found. Using simple text rendering. Load KaTeX from CDN: https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css and .js');
          CUI.LaTeX.ready = true;
        }

        // Auto-render all [data-latex] elements
        CUI.LaTeX.autoRenderAll();

        return CUI.LaTeX.useKaTeX;
      },

      /**
       * Render LaTeX string
       *
       * @param {string} latex - LaTeX string (e.g., "R_0", "\\beta", "\\frac{a}{b}")
       * @param {boolean} inline - Inline (true) or display mode (false)
       * @returns {string} HTML string
       */
      render(latex, inline = true) {
        if (!CUI.LaTeX.ready) {
          CUI.LaTeX.init();
        }

        if (CUI.LaTeX.useKaTeX) {
          try {
            return katex.renderToString(latex, {
              displayMode: !inline,
              throwOnError: false,
              output: 'html'
            });
          } catch (e) {
            CUI.error(`KaTeX render error: ${e.message}`);
            return CUI.LaTeX.renderSimple(latex);
          }
        } else {
          return CUI.LaTeX.renderSimple(latex);
        }
      },

      /**
       * Simple LaTeX-like rendering without KaTeX
       * Handles subscripts, superscripts, Greek letters
       */
      renderSimple(latex) {
        let text = latex;

        // Greek letters
        const greekMap = {
          'alpha': 'α', 'beta': 'β', 'gamma': 'γ', 'delta': 'δ',
          'epsilon': 'ε', 'zeta': 'ζ', 'eta': 'η', 'theta': 'θ',
          'iota': 'ι', 'kappa': 'κ', 'lambda': 'λ', 'mu': 'μ',
          'nu': 'ν', 'xi': 'ξ', 'pi': 'π', 'rho': 'ρ',
          'sigma': 'σ', 'tau': 'τ', 'upsilon': 'υ', 'phi': 'φ',
          'chi': 'χ', 'psi': 'ψ', 'omega': 'ω',
          'Gamma': 'Γ', 'Delta': 'Δ', 'Theta': 'Θ', 'Lambda': 'Λ',
          'Xi': 'Ξ', 'Pi': 'Π', 'Sigma': 'Σ', 'Phi': 'Φ',
          'Psi': 'Ψ', 'Omega': 'Ω'
        };

        // Replace \greek with Unicode
        Object.keys(greekMap).forEach(key => {
          text = text.replace(new RegExp(`\\\\${key}`, 'g'), greekMap[key]);
        });

        // Subscripts: x_0 → x₀
        text = text.replace(/([a-zA-Z])_([0-9]+)/g, (match, base, sub) => {
          return base + sub.split('').map(d => '₀₁₂₃₄₅₆₇₈₉'[d]).join('');
        });

        // Single character subscripts: x_t → xₜ
        const subscriptMap = {
          '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
          '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
          'a': 'ₐ', 'e': 'ₑ', 'i': 'ᵢ', 'o': 'ₒ', 'u': 'ᵤ',
          'x': 'ₓ', 't': 'ₜ', 'n': 'ₙ', 'r': 'ᵣ', 's': 'ₛ'
        };

        Object.keys(subscriptMap).forEach(key => {
          text = text.replace(new RegExp(`_${key}`, 'g'), subscriptMap[key]);
        });

        // Superscripts: x^2 → x²
        const superscriptMap = {
          '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
          '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
          '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
          'n': 'ⁿ', 'i': 'ⁱ'
        };

        Object.keys(superscriptMap).forEach(key => {
          text = text.replace(new RegExp(`\\^${key.replace(/[()]/g, '\\$&')}`, 'g'), superscriptMap[key]);
        });

        return text;
      },

      /**
       * Render LaTeX into a DOM element
       *
       * @param {HTMLElement} element - Target element
       * @param {string} latex - LaTeX string
       * @param {boolean} inline - Inline or display mode
       */
      renderInto(element, latex, inline = true) {
        const html = CUI.LaTeX.render(latex, inline);
        element.innerHTML = html;

        // Add class
        element.classList.add('latex-rendered');
        if (inline) {
          element.classList.add('latex-inline');
        } else {
          element.classList.add('latex-display');
        }
      },

      /**
       * Auto-render all elements with data-latex attribute
       */
      autoRenderAll() {
        // Inline LaTeX
        const inlineElements = CUI.DOM.$$('[data-latex-inline]');
        inlineElements.forEach(el => {
          const latex = el.dataset.latexInline || el.textContent.trim();
          CUI.LaTeX.renderInto(el, latex, true);
        });

        // Display LaTeX
        const displayElements = CUI.DOM.$$('[data-latex-display]');
        displayElements.forEach(el => {
          const latex = el.dataset.latexDisplay || el.textContent.trim();
          CUI.LaTeX.renderInto(el, latex, false);
        });

        // Generic data-latex (defaults to inline)
        const genericElements = CUI.DOM.$$('[data-latex]:not([data-latex-inline]):not([data-latex-display])');
        genericElements.forEach(el => {
          const latex = el.dataset.latex;
          const inline = el.dataset.latexMode !== 'display';
          CUI.LaTeX.renderInto(el, latex, inline);
        });

        CUI.log(`Auto-rendered ${inlineElements.length + displayElements.length + genericElements.length} LaTeX elements`);
      },

      /**
       * Create a LaTeX element
       *
       * @param {string} latex - LaTeX string
       * @param {boolean} inline - Inline or display mode
       * @returns {HTMLElement}
       */
      createElement(latex, inline = true) {
        const span = document.createElement(inline ? 'span' : 'div');
        CUI.LaTeX.renderInto(span, latex, inline);
        return span;
      }
    };

    // Auto-init when ready
    CUI.ready(() => {
      CUI.LaTeX.init();
    });

    CUI.log('LaTeX module loaded');
  });

})();
