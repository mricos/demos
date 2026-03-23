/**
 * math-renderer.js — Load KaTeX on demand and render math expressions
 *
 * Usage:
 *   import { loadKaTeX, renderMath, renderAllMath } from '/shared/math-renderer.js';
 *
 *   // Option 1: Auto-render all elements with class="math" or data-math
 *   await renderAllMath();
 *
 *   // Option 2: Render a single expression into an element
 *   await renderMath(element, '\\int_0^1 f(x)\\,dx');
 *
 *   // Option 3: Just load KaTeX and use it directly
 *   const katex = await loadKaTeX();
 *   katex.render('E = mc^2', element);
 *
 * Conventions:
 *   <span class="math">\\alpha + \\beta</span>         → inline math
 *   <div class="math" data-display>\\sum_{i=1}^n</div> → display math
 *   <span data-math="\\gamma"></span>                   → from attribute
 */

const KATEX_VERSION = '0.16.9';
const CDN = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist`;

let _katexPromise = null;

/**
 * Load KaTeX CSS + JS from CDN. Returns the katex global object.
 * Subsequent calls return the same promise (loads only once).
 */
export function loadKaTeX() {
  if (_katexPromise) return _katexPromise;

  _katexPromise = new Promise(function(resolve, reject) {
    // Load CSS
    if (!document.querySelector(`link[href*="katex"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `${CDN}/katex.min.css`;
      document.head.appendChild(link);
    }

    // Load JS
    if (window.katex) {
      resolve(window.katex);
      return;
    }

    const script = document.createElement('script');
    script.src = `${CDN}/katex.min.js`;
    script.onload = function() { resolve(window.katex); };
    script.onerror = function() { reject(new Error('Failed to load KaTeX')); };
    document.head.appendChild(script);
  });

  return _katexPromise;
}

/**
 * Render a LaTeX expression into an element.
 * @param {HTMLElement} el — target element
 * @param {string} tex — LaTeX string
 * @param {Object} [opts] — passed to katex.render (displayMode, etc.)
 */
export async function renderMath(el, tex, opts) {
  const katex = await loadKaTeX();
  const displayMode = el.hasAttribute('data-display') || (opts && opts.displayMode);
  katex.render(tex, el, Object.assign({ throwOnError: false, displayMode }, opts));
}

/**
 * Find and render all math elements in the document (or a container).
 * Looks for: class="math", [data-math], <math-tex> elements.
 *
 * @param {HTMLElement} [root=document.body]
 */
export async function renderAllMath(root) {
  const katex = await loadKaTeX();
  const container = root || document.body;

  // class="math" — render textContent
  container.querySelectorAll('.math').forEach(function(el) {
    if (el.dataset.rendered) return;
    const tex = el.textContent.trim();
    const displayMode = el.hasAttribute('data-display') || el.tagName === 'DIV';
    katex.render(tex, el, { throwOnError: false, displayMode });
    el.dataset.rendered = '1';
  });

  // [data-math] — render from attribute
  container.querySelectorAll('[data-math]').forEach(function(el) {
    if (el.dataset.rendered) return;
    const tex = el.dataset.math;
    const displayMode = el.hasAttribute('data-display') || el.tagName === 'DIV';
    katex.render(tex, el, { throwOnError: false, displayMode });
    el.dataset.rendered = '1';
  });
}
