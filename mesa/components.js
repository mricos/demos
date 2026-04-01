/**
 * mesa/components.js — Custom elements for interactive scientific demos
 *
 * All components use light DOM (no shadow DOM) so mesa.css themes apply directly.
 * Components bind to the mesa state store via `bind` attribute.
 *
 * Components:
 *   <mesa-slider bind="model.lr" min="0" max="1" step="0.01" label="Learning Rate">
 *   <mesa-btn-group bind="model.reg" options="none,l1,l2" label="Regularization">
 *   <mesa-stats> <mesa-stat bind="metrics.loss" label="Loss" fmt=".3f"> </mesa-stats>
 *   <mesa-tabs active="bias"> <mesa-tab name="bias" key="1">Label</mesa-tab> </mesa-tabs>
 *   <mesa-pane tab="bias"> ...content... </mesa-pane>
 *   <mesa-canvas id="cv" height="350">
 *   <mesa-progress bind="training.progress">
 */

import { state } from './state.js';

// ── Formatting helper ───────────────────────────────
function fmt(value, format) {
  if (value == null || value === '') return '—';
  if (!format) {
    if (typeof value === 'number') {
      if (Number.isInteger(value)) return value.toString();
      return Math.abs(value) >= 100 ? value.toFixed(0) :
             Math.abs(value) >= 1 ? value.toFixed(2) : value.toFixed(3);
    }
    return String(value);
  }
  if (typeof value !== 'number') return String(value);
  // format: ".3f", ".0f", ".1%", etc.
  const m = format.match(/^\.(\d+)(f|%)$/);
  if (m) {
    const decimals = parseInt(m[1]);
    if (m[2] === '%') return (value * 100).toFixed(decimals) + '%';
    return value.toFixed(decimals);
  }
  return value.toString();
}

// ════════════════════════════════════════════════════
// <mesa-slider>
// ════════════════════════════════════════════════════
class MesaSlider extends HTMLElement {
  connectedCallback() {
    const bind  = this.getAttribute('bind');
    const label = this.getAttribute('label') || bind;
    const min   = this.getAttribute('min') || '0';
    const max   = this.getAttribute('max') || '1';
    const step  = this.getAttribute('step') || '0.01';
    const hint  = this.getAttribute('hint') || '';
    const format = this.getAttribute('fmt');

    // Initial value from state or attribute
    let initial = state.get(bind);
    if (initial == null) {
      initial = parseFloat(this.getAttribute('value') || min);
      state.set(bind, initial);
    }

    this.classList.add('mesa-ctrl');
    this.innerHTML = `
      <label>${label}: <span class="mesa-slider-val">${fmt(initial, format)}</span></label>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${initial}">
      ${hint ? `<div class="mesa-ctrl-hint">${hint}</div>` : ''}
    `;

    const input = this.querySelector('input');
    const valSpan = this.querySelector('.mesa-slider-val');

    // Input → state
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      valSpan.textContent = fmt(v, format);
      state.set(bind, v);
    });

    // State → input (for programmatic updates)
    this._unsub = state.on(bind, (v) => {
      input.value = v;
      valSpan.textContent = fmt(v, format);
    });
  }

  disconnectedCallback() { this._unsub?.(); }
}

// ════════════════════════════════════════════════════
// <mesa-btn-group>
// ════════════════════════════════════════════════════
class MesaBtnGroup extends HTMLElement {
  connectedCallback() {
    const bind    = this.getAttribute('bind');
    const options = (this.getAttribute('options') || '').split(',').map(s => s.trim());
    const labels  = (this.getAttribute('labels') || '').split(',').map(s => s.trim());

    let current = state.get(bind);
    if (current == null) {
      current = options[0];
      state.set(bind, current);
    }

    this.classList.add('mesa-btn-row');
    this.innerHTML = options.map((opt, i) => {
      const lbl = labels[i] || opt;
      const cls = opt === current ? 'mesa-btn on' : 'mesa-btn';
      return `<button class="${cls}" data-opt="${opt}">${lbl}</button>`;
    }).join('');

    // Click → state
    this.addEventListener('click', e => {
      const btn = e.target.closest('[data-opt]');
      if (!btn) return;
      this.querySelectorAll('.mesa-btn').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      state.set(bind, btn.dataset.opt);
    });

    // State → buttons
    this._unsub = state.on(bind, (v) => {
      this.querySelectorAll('.mesa-btn').forEach(b => {
        b.classList.toggle('on', b.dataset.opt === v);
      });
    });
  }

  disconnectedCallback() { this._unsub?.(); }
}

// ════════════════════════════════════════════════════
// <mesa-stat>
// ════════════════════════════════════════════════════
class MesaStat extends HTMLElement {
  connectedCallback() {
    const bind   = this.getAttribute('bind');
    const label  = this.getAttribute('label') || bind;
    const format = this.getAttribute('fmt');
    const initial = state.get(bind);

    this.innerHTML = `
      <div class="mesa-stat-val">${fmt(initial, format)}</div>
      <div class="mesa-stat-lbl">${label}</div>
    `;

    if (bind) {
      const valEl = this.querySelector('.mesa-stat-val');
      this._unsub = state.on(bind, v => { valEl.textContent = fmt(v, format); });
    }
  }

  disconnectedCallback() { this._unsub?.(); }
}

// ════════════════════════════════════════════════════
// <mesa-stats> — just a flex container, styled in CSS
// ════════════════════════════════════════════════════
// No JS needed — CSS handles layout via mesa-stats selector

// ════════════════════════════════════════════════════
// <mesa-tabs> + <mesa-tab> + <mesa-pane>
// ════════════════════════════════════════════════════
class MesaTabs extends HTMLElement {
  connectedCallback() {
    this.classList.add('mesa-tabs');
    const active = this.getAttribute('active');

    // Activate default tab
    requestAnimationFrame(() => {
      if (active) this._activate(active);

      // Keyboard shortcuts
      this._keyHandler = e => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        const tab = this.querySelector(`mesa-tab[key="${e.key}"]`);
        if (tab) this._activate(tab.getAttribute('name'));
      };
      document.addEventListener('keydown', this._keyHandler);
    });

    // Click delegation
    this.addEventListener('click', e => {
      const tab = e.target.closest('mesa-tab');
      if (tab) this._activate(tab.getAttribute('name'));
    });
  }

  disconnectedCallback() {
    if (this._keyHandler) document.removeEventListener('keydown', this._keyHandler);
  }

  _activate(name) {
    // Update tab buttons
    this.querySelectorAll('mesa-tab').forEach(t => {
      t.classList.toggle('on', t.getAttribute('name') === name);
    });
    // Update panes — search siblings + document
    const panes = document.querySelectorAll(`mesa-pane`);
    panes.forEach(p => {
      p.classList.toggle('on', p.getAttribute('tab') === name);
    });
    // Also handle plain div panes
    document.querySelectorAll('.mesa-pane').forEach(p => {
      p.classList.toggle('on', p.dataset.tab === name);
    });
    // Notify state
    state.set('_tab', name);
  }
}

class MesaTab extends HTMLElement {
  connectedCallback() {
    const key = this.getAttribute('key');
    if (key) {
      // Append keyboard hint
      if (!this.querySelector('.mesa-kbd')) {
        const kbd = document.createElement('span');
        kbd.className = 'mesa-kbd';
        kbd.textContent = key;
        this.appendChild(kbd);
      }
    }
  }
}

class MesaPane extends HTMLElement {
  // Visibility handled by CSS + MesaTabs._activate
}

// ════════════════════════════════════════════════════
// <mesa-canvas>
// ════════════════════════════════════════════════════
class MesaCanvas extends HTMLElement {
  connectedCallback() {
    const h = this.getAttribute('height') || '300';
    const canvas = document.createElement('canvas');
    canvas.height = parseInt(h);
    canvas.id = this.id ? this.id + '-cv' : '';
    this.appendChild(canvas);
    this._canvas = canvas;

    // ResizeObserver for responsive redraw
    this._ro = new ResizeObserver(() => {
      if (this._drawFn) this._drawFn();
    });
    this._ro.observe(this);
  }

  disconnectedCallback() { this._ro?.disconnect(); }

  /** Get the inner canvas element */
  get canvas() { return this._canvas; }

  /** Register a draw function that auto-fires on resize */
  onDraw(fn) { this._drawFn = fn; }

  /** Set up DPI-aware context. Returns { ctx, w, h } */
  setup() {
    const canvas = this._canvas;
    const dpr = window.devicePixelRatio || 1;
    const rect = this.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height || parseInt(this.getAttribute('height')) || 300;

    canvas.style.height = h + 'px';
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }
}

// ════════════════════════════════════════════════════
// <mesa-progress>
// ════════════════════════════════════════════════════
class MesaProgress extends HTMLElement {
  connectedCallback() {
    const bind = this.getAttribute('bind');
    this.classList.add('mesa-progress');
    this.innerHTML = '<div class="mesa-progress-fill"></div>';

    if (bind) {
      this._unsub = state.on(bind, v => {
        this.querySelector('.mesa-progress-fill').style.width = (v * 100) + '%';
      });
    }
  }

  disconnectedCallback() { this._unsub?.(); }

  /** Programmatic set (0-1) */
  set value(v) {
    this.querySelector('.mesa-progress-fill').style.width = (v * 100) + '%';
  }
}

// ════════════════════════════════════════════════════
// <mesa-status>
// ════════════════════════════════════════════════════
class MesaStatus extends HTMLElement {
  connectedCallback() {
    this.classList.add('mesa-status');
  }

  show(msg, type = 'ok') {
    this.textContent = msg;
    this.className = `mesa-status show ${type}`;
  }

  hide() {
    this.classList.remove('show');
  }
}

// ════════════════════════════════════════════════════
// <mesa-drag> — resizable column handle
// ════════════════════════════════════════════════════
class MesaDrag extends HTMLElement {
  connectedCallback() {
    this.classList.add('mesa-drag');
    const target = this.getAttribute('target');
    const side = this.getAttribute('side') || 'left';
    let dragging = false;

    this.addEventListener('mousedown', e => { dragging = true; e.preventDefault(); });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      const panel = document.querySelector(target);
      if (!panel) return;
      const maxW = window.innerWidth * 0.4;
      if (side === 'left') {
        panel.style.width = Math.max(180, Math.min(maxW, e.clientX)) + 'px';
      } else {
        panel.style.width = Math.max(180, Math.min(maxW, window.innerWidth - e.clientX)) + 'px';
      }
    });
    document.addEventListener('mouseup', () => { dragging = false; });
  }
}

// ════════════════════════════════════════════════════
// Register all components
// ════════════════════════════════════════════════════
export function registerComponents() {
  const defs = [
    ['mesa-slider',    MesaSlider],
    ['mesa-btn-group', MesaBtnGroup],
    ['mesa-stat',      MesaStat],
    ['mesa-tabs',      MesaTabs],
    ['mesa-tab',       MesaTab],
    ['mesa-pane',      MesaPane],
    ['mesa-canvas',    MesaCanvas],
    ['mesa-progress',  MesaProgress],
    ['mesa-status',    MesaStatus],
    ['mesa-drag',      MesaDrag],
  ];

  for (const [name, cls] of defs) {
    if (!customElements.get(name)) {
      customElements.define(name, cls);
    }
  }
}
