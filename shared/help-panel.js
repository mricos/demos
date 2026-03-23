/**
 * <help-panel> — Tabbed, resizable help/reference panel for demos.
 *
 * Extends the info-sidebar pattern with:
 *   - Configurable tabs (help, math, reference, or custom)
 *   - Built-in Wikipedia search tab with meta.json topic chips
 *   - KaTeX equation rendering in <eq-block> elements
 *   - Resizable via drag handle (right or left position)
 *   - Dockable: side (default) or bottom
 *   - Toggle visibility with .toggle() or keyboard shortcut
 *
 * Usage:
 *   <script src="/shared/help-panel.js"></script>
 *
 *   <help-panel width="320" position="right" meta="meta.json" tabs="help,math,reference">
 *     <help-tab name="help" label="Help" active>
 *       <h3>Quick Start</h3>
 *       <p>Some help content...</p>
 *       <help-section title="Details" open>
 *         <p>Expandable section content.</p>
 *       </help-section>
 *     </help-tab>
 *     <help-tab name="math" label="Math">
 *       <h3>Equations</h3>
 *       <eq-block>x^2 + y^2 = r^2</eq-block>
 *     </help-tab>
 *     <!-- reference tab is auto-generated from meta.json -->
 *   </help-panel>
 *
 * Attributes:
 *   width      — initial width in px (default: 320)
 *   height     — initial height in px, used when dock="bottom" (default: 260)
 *   position   — "right" (default) or "left"
 *   dock       — "side" (default) or "bottom"
 *   meta       — path to meta.json for auto-populating reference tab
 *   tabs       — comma-separated tab names to show (default: all declared)
 *   hidden     — start collapsed
 *   hotkey     — keyboard shortcut to toggle (default: "?")
 *
 * Events:
 *   "panel-resize"  — detail: { width } or { height }
 *   "panel-toggle"  — detail: { open }
 *   "tab-change"    — detail: { tab }
 *
 * CSS custom properties (inherits from dark-theme.css or set on host):
 *   --sidebar-bg, --sidebar-border, --sidebar-text,
 *   --sidebar-muted, --sidebar-dim, --sidebar-accent
 */

// ════════════════════════════════════════════════════════
// Styles (shared across shadow DOMs)
// ════════════════════════════════════════════════════════

const PANEL_STYLES = `
  :host {
    display: contents;
    --_bg: var(--sidebar-bg, #111827);
    --_bd: var(--sidebar-border, #1e293b);
    --_tx: var(--sidebar-text, #e2e8f0);
    --_tm: var(--sidebar-muted, #94a3b8);
    --_td: var(--sidebar-dim, #64748b);
    --_ac: var(--sidebar-accent, #3b82f6);
    --_ag: rgba(59,130,246,.15);
  }

  /* ── Handle (vertical for side, horizontal for bottom) ── */
  .handle {
    background: var(--_bd);
    display: flex; align-items: center; justify-content: center;
    user-select: none; flex-shrink: 0;
  }
  .handle:hover, .handle.active { background: #475569; }
  .handle-side {
    width: 6px; cursor: col-resize;
  }
  .handle-side::after {
    content: ''; display: block;
    width: 2px; height: 32px;
    border-left: 1px solid #64748b;
    border-right: 1px solid #64748b;
  }
  .handle-bottom {
    height: 6px; cursor: row-resize;
  }
  .handle-bottom::after {
    content: ''; display: block;
    width: 32px; height: 2px;
    border-top: 1px solid #64748b;
    border-bottom: 1px solid #64748b;
  }

  /* ── Panel container ── */
  .panel {
    background: var(--_bg);
    overflow: hidden;
    flex-shrink: 0;
    font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
    color: var(--_tx);
    font-size: 13px;
    line-height: 1.6;
    display: flex;
    flex-direction: column;
  }
  .panel-side {
    border-left: 1px solid var(--_bd);
  }
  .panel-side-left {
    border-left: none;
    border-right: 1px solid var(--_bd);
  }
  .panel-bottom {
    border-top: 1px solid var(--_bd);
  }

  /* ── Tab bar ── */
  .tab-bar {
    display: flex;
    border-bottom: 1px solid var(--_bd);
    background: #0d1117;
    flex-shrink: 0;
  }
  .tab {
    flex: 1;
    padding: 9px 8px;
    text-align: center;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--_td);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: color 0.15s, border-color 0.15s;
  }
  .tab:hover { color: var(--_tm); }
  .tab.active { color: var(--_ac); border-bottom-color: var(--_ac); }

  /* ── Scrollable content area ── */
  .content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    min-height: 0;
  }
  .content::-webkit-scrollbar { width: 6px; }
  .content::-webkit-scrollbar-track { background: var(--_bg); }
  .content::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }

  /* ── Tab panes ── */
  .pane { display: none; }
  .pane.active { display: block; }

  /* ── Content typography ── */
  .content h3 {
    font-size: 13px; color: var(--_tx); margin: 16px 0 8px;
    padding-bottom: 4px; border-bottom: 1px solid var(--_bd);
  }
  .content h3:first-child { margin-top: 0; }
  .content p, .content li {
    font-size: 12px; line-height: 1.7; color: var(--_tm);
    margin: 4px 0;
  }
  .content ul { padding-left: 16px; margin: 4px 0; }
  .content code {
    background: #0d1117; padding: 1px 5px; border-radius: 3px;
    font-family: 'JetBrains Mono', monospace; font-size: 11px;
    color: var(--_ac);
  }
  .content a {
    color: var(--_ac); text-decoration: none;
  }
  .content a:hover { text-decoration: underline; }

  /* ── Equation blocks ── */
  .eq-block, ::slotted(eq-block) {
    display: block;
    background: #0d1117; border: 1px solid var(--_bd);
    border-radius: 6px; padding: 12px 16px; margin: 8px 0;
    text-align: center; overflow-x: auto;
  }

  /* ── Parameter definitions ── */
  .param-def, ::slotted(.param-def) {
    display: flex; gap: 8px; margin: 4px 0; font-size: 12px;
  }
  ::slotted(.sym), .sym {
    color: var(--_ac);
    font-family: 'JetBrains Mono', monospace;
    min-width: 24px;
  }

  /* ── Collapsible details ── */
  .content details {
    border: 1px solid var(--_bd); border-radius: 4px;
    margin: 8px 0; background: #0d1117;
  }
  .content details summary {
    padding: 8px 12px; cursor: pointer; font-size: 12px;
    color: var(--_tm); list-style: none;
  }
  .content details summary::before { content: '\\25b8 '; color: var(--_td); font-size: 10px; }
  .content details[open] summary::before { content: '\\25be '; }
  .content details > div, .content details > p {
    padding: 4px 12px 8px;
  }

  /* ── Wiki search ── */
  .wiki-bar { display: flex; gap: 6px; margin-bottom: 12px; }
  .wiki-bar input {
    flex: 1; background: #0d1117; border: 1px solid var(--_bd);
    border-radius: 4px; padding: 6px 10px; color: var(--_tx);
    font-size: 12px; font-family: inherit;
  }
  .wiki-bar input:focus { outline: none; border-color: var(--_ac); }
  .wiki-bar button {
    background: var(--_ag); border: 1px solid var(--_ac); color: var(--_ac);
    padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px;
    white-space: nowrap;
  }
  .wiki-bar button:hover { background: var(--_ac); color: #0a0f1a; }

  .wiki-topics { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px; }
  .wiki-chip {
    padding: 3px 10px; background: #0d1117; border: 1px solid var(--_bd);
    border-radius: 12px; font-size: 11px; color: var(--_tm);
    cursor: pointer; transition: all 0.15s;
  }
  .wiki-chip:hover { border-color: var(--_ac); color: var(--_ac); }

  .wiki-result {
    background: #0d1117; border: 1px solid var(--_bd);
    border-radius: 6px; padding: 12px; margin-bottom: 8px;
  }
  .wiki-result h4 { font-size: 13px; margin: 0 0 4px; color: var(--_tx); }
  .wiki-result p { font-size: 12px; line-height: 1.6; color: var(--_tm); margin: 4px 0; }
  .wiki-result img { max-width: 100%; border-radius: 4px; margin-bottom: 8px; }
  .wiki-result a { color: var(--_ac); font-size: 11px; text-decoration: none; }
  .wiki-result a:hover { text-decoration: underline; }
`;

// ════════════════════════════════════════════════════════
// <help-panel>
// ════════════════════════════════════════════════════════

class HelpPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._dragging = false;
    this._width = 320;
    this._height = 260;
    this._activeTab = null;
    this._tabs = [];
  }

  static get observedAttributes() {
    return ["width", "height", "hidden", "dock"];
  }

  connectedCallback() {
    this._width = parseInt(this.getAttribute("width")) || 320;
    this._height = parseInt(this.getAttribute("height")) || 260;
    this._dock = this.getAttribute("dock") || "side";

    // Discover tabs from child <help-tab> elements
    this._discoverTabs();
    this._render();
    this._setupResize();
    this._setupTabs();
    this._setupHotkey();

    const metaPath = this.getAttribute("meta");
    if (metaPath) this._loadMeta(metaPath);

    // Render KaTeX equations after a tick (allow KaTeX to load)
    setTimeout(() => this._renderEquations(), 300);

    // Listen for wiki-fetch events from light DOM
    this.addEventListener("wiki-fetch", (e) => {
      const topic = e.detail?.topic;
      if (topic) {
        this.switchTab("reference");
        const input = this.shadowRoot.getElementById("wikiInput");
        if (input) { input.value = topic.replace(/_/g, " "); }
        this._fetchWiki(topic);
      }
    });
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === "width" && !this._dragging) {
      this._width = parseInt(newVal) || 320;
      const panel = this.shadowRoot?.querySelector(".panel");
      if (panel && this._dock === "side") panel.style.width = this._width + "px";
    }
    if (name === "height" && !this._dragging) {
      this._height = parseInt(newVal) || 260;
      const panel = this.shadowRoot?.querySelector(".panel");
      if (panel && this._dock === "bottom") panel.style.height = this._height + "px";
    }
    if (name === "hidden") {
      const panel = this.shadowRoot?.querySelector(".panel");
      const handle = this.shadowRoot?.querySelector(".handle");
      const isHidden = this.hasAttribute("hidden");
      if (panel) panel.style.display = isHidden ? "none" : "";
      if (handle) handle.style.display = isHidden ? "none" : "";
    }
    if (name === "dock") {
      this._dock = newVal || "side";
      // Re-render if dock mode changes
      if (this.shadowRoot?.querySelector(".panel")) {
        this._render();
        this._setupResize();
        this._setupTabs();
      }
    }
  }

  /** Toggle panel visibility */
  toggle() {
    if (this.hasAttribute("hidden")) this.removeAttribute("hidden");
    else this.setAttribute("hidden", "");
    this.dispatchEvent(new CustomEvent("panel-toggle", {
      detail: { open: !this.hasAttribute("hidden") }, bubbles: true
    }));
  }

  /** Switch to a named tab */
  switchTab(name) {
    this._activeTab = name;
    this.shadowRoot.querySelectorAll(".tab").forEach(t =>
      t.classList.toggle("active", t.dataset.tab === name));
    this.shadowRoot.querySelectorAll(".pane").forEach(p =>
      p.classList.toggle("active", p.dataset.pane === name));
    this.dispatchEvent(new CustomEvent("tab-change", {
      detail: { tab: name }, bubbles: true
    }));
  }

  /** Set dock mode: "side" or "bottom" */
  setDock(mode) {
    this.setAttribute("dock", mode);
  }

  // ── Private ──

  _discoverTabs() {
    this._tabs = [];
    this.querySelectorAll("help-tab").forEach(el => {
      this._tabs.push({
        name: el.getAttribute("name") || "tab",
        label: el.getAttribute("label") || el.getAttribute("name") || "Tab",
        active: el.hasAttribute("active"),
        element: el
      });
    });

    // Auto-add reference tab if meta attribute is present and no reference tab declared
    if (this.getAttribute("meta") && !this._tabs.find(t => t.name === "reference")) {
      this._tabs.push({ name: "reference", label: "Reference", active: false, element: null });
    }

    // Set active tab
    const active = this._tabs.find(t => t.active) || this._tabs[0];
    if (active) this._activeTab = active.name;
  }

  _render() {
    const pos = this.getAttribute("position") || "right";
    const isLeft = pos === "left";
    const isBottom = this._dock === "bottom";

    const handleClass = isBottom ? "handle handle-bottom" : "handle handle-side";
    const panelClass = isBottom ? "panel panel-bottom"
      : isLeft ? "panel panel-side panel-side-left" : "panel panel-side";

    const panelStyle = isBottom
      ? `height: ${this._height}px; width: 100%;`
      : `width: ${this._width}px;`;

    // Build tab bar
    const tabsHtml = this._tabs.map(t =>
      `<div class="tab ${t.name === this._activeTab ? 'active' : ''}" data-tab="${t.name}">${t.label}</div>`
    ).join("");

    // Build panes: slotted tabs + built-in reference
    let panesHtml = "";
    for (const t of this._tabs) {
      if (t.name === "reference") {
        panesHtml += `
          <div class="pane ${t.name === this._activeTab ? 'active' : ''}" data-pane="reference">
            <div class="wiki-bar">
              <input type="text" id="wikiInput" placeholder="Search Wikipedia...">
              <button id="wikiBtn">Fetch</button>
            </div>
            <div class="wiki-topics" id="wikiTopics"></div>
            <div id="wikiResults"></div>
          </div>`;
      } else {
        panesHtml += `
          <div class="pane ${t.name === this._activeTab ? 'active' : ''}" data-pane="${t.name}">
            <slot name="${t.name}"></slot>
          </div>`;
      }
    }

    const handleOrder = isBottom ? "" : isLeft ? "order: 2;" : "order: 1;";
    const panelOrder = isBottom ? "" : isLeft ? "order: 1;" : "order: 2;";

    this.shadowRoot.innerHTML = `
      <style>${PANEL_STYLES}</style>
      <div class="${handleClass}" part="handle" style="${handleOrder}"></div>
      <div class="${panelClass}" part="panel" style="${panelStyle}${panelOrder}">
        <div class="tab-bar">${tabsHtml}</div>
        <div class="content">${panesHtml}</div>
      </div>
    `;

    // Setup wiki search if reference tab exists
    const wikiBtn = this.shadowRoot.getElementById("wikiBtn");
    const wikiInput = this.shadowRoot.getElementById("wikiInput");
    if (wikiBtn && wikiInput) {
      wikiBtn.addEventListener("click", () => this._fetchWiki(wikiInput.value.trim()));
      wikiInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this._fetchWiki(e.target.value.trim());
      });
    }
  }

  _setupTabs() {
    this.shadowRoot.querySelectorAll(".tab").forEach(tab => {
      tab.addEventListener("click", () => this.switchTab(tab.dataset.tab));
    });
  }

  _setupResize() {
    const handle = this.shadowRoot.querySelector(".handle");
    const panel = this.shadowRoot.querySelector(".panel");
    if (!handle || !panel) return;
    const pos = this.getAttribute("position") || "right";
    const isBottom = this._dock === "bottom";

    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this._dragging = true;
      handle.classList.add("active");
      document.body.style.cursor = isBottom ? "row-resize" : "col-resize";
      document.body.style.userSelect = "none";
    });

    this._onMouseMove = (e) => {
      if (!this._dragging) return;
      if (isBottom) {
        const rect = this.getBoundingClientRect();
        const h = rect.bottom - e.clientY;
        const clamped = Math.max(120, Math.min(h, window.innerHeight * 0.6));
        this._height = clamped;
        panel.style.height = clamped + "px";
        this.dispatchEvent(new CustomEvent("panel-resize", {
          detail: { height: clamped }, bubbles: true
        }));
      } else {
        const rect = this.getBoundingClientRect();
        let w;
        if (pos === "left") w = e.clientX - rect.left;
        else w = rect.right - e.clientX;
        w = Math.max(180, Math.min(w, window.innerWidth * 0.5));
        this._width = w;
        panel.style.width = w + "px";
        this.dispatchEvent(new CustomEvent("panel-resize", {
          detail: { width: w }, bubbles: true
        }));
      }
    };

    this._onMouseUp = () => {
      if (!this._dragging) return;
      this._dragging = false;
      handle.classList.remove("active");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    // Remove old listeners if re-rendering
    if (this._boundMove) {
      window.removeEventListener("mousemove", this._boundMove);
      window.removeEventListener("mouseup", this._boundUp);
    }
    this._boundMove = this._onMouseMove;
    this._boundUp = this._onMouseUp;
    window.addEventListener("mousemove", this._boundMove);
    window.addEventListener("mouseup", this._boundUp);
  }

  _setupHotkey() {
    const hotkey = this.getAttribute("hotkey") || "?";
    window.addEventListener("keydown", (e) => {
      // Don't trigger when typing in inputs
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      if (e.target.isContentEditable) return;
      if (e.key === hotkey) {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  _fetchWiki(title) {
    if (!title) return;
    const box = this.shadowRoot.getElementById("wikiResults");
    if (!box) return;
    box.innerHTML = '<div style="color:var(--_td);font-size:12px;font-style:italic">Loading...</div>';
    const encoded = encodeURIComponent(title.replace(/ /g, "_"));
    fetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + encoded)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(d => {
        let h = '<div class="wiki-result">';
        if (d.thumbnail) h += '<img src="' + d.thumbnail.source + '" alt="">';
        h += '<h4>' + d.title + '</h4>';
        h += '<p>' + (d.extract || "No summary available.") + '</p>';
        if (d.content_urls)
          h += '<a href="' + d.content_urls.desktop.page + '" target="_blank">Read on Wikipedia</a>';
        h += '</div>';
        box.innerHTML = h;
      })
      .catch(e => {
        box.innerHTML = '<div style="color:#ef4444;font-size:12px">Could not load "' + title + '": ' + e.message + '</div>';
      });
  }

  _loadMeta(path) {
    fetch(path)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(meta => {
        if (!meta.sidebar || meta.sidebar.length === 0) return;
        const box = this.shadowRoot.getElementById("wikiTopics");
        if (!box) return;
        meta.sidebar.forEach(topic => {
          const chip = document.createElement("span");
          chip.className = "wiki-chip";
          chip.textContent = topic.replace(/_/g, " ")
            .replace(/%27/g, "'")
            .replace(/%E2%80%93/g, "\u2013");
          chip.addEventListener("click", () => {
            const input = this.shadowRoot.getElementById("wikiInput");
            if (input) input.value = topic.replace(/_/g, " ");
            this._fetchWiki(topic);
          });
          box.appendChild(chip);
        });
      })
      .catch(() => { /* meta.json not found — no-op */ });
  }

  /** Render <eq-block> elements using KaTeX if available */
  _renderEquations() {
    if (typeof katex === "undefined") {
      // Retry a few times
      if (!this._eqRetries) this._eqRetries = 0;
      if (this._eqRetries++ < 10) setTimeout(() => this._renderEquations(), 500);
      return;
    }
    // Find all <eq-block> in light DOM children
    this.querySelectorAll("eq-block").forEach(el => {
      if (el._rendered) return;
      const tex = el.textContent.trim();
      if (!tex) return;
      try {
        katex.render(tex, el, { displayMode: true, throwOnError: false });
        el._rendered = true;
      } catch (e) { /* leave raw text */ }
    });
  }

  disconnectedCallback() {
    if (this._boundMove) window.removeEventListener("mousemove", this._boundMove);
    if (this._boundUp) window.removeEventListener("mouseup", this._boundUp);
  }
}

// ════════════════════════════════════════════════════════
// <help-tab> — Named tab content container
// ════════════════════════════════════════════════════════

/**
 * <help-tab name="help" label="Help" active>
 *   <h3>Title</h3>
 *   <p>Content...</p>
 * </help-tab>
 *
 * Attributes:
 *   name   — tab identifier (used in tabs="..." and switchTab())
 *   label  — display text in tab bar
 *   active — this tab is shown initially
 *
 * Must be set slot="name" to match the named slot in help-panel.
 * This is done automatically in connectedCallback.
 */
class HelpTab extends HTMLElement {
  connectedCallback() {
    // Auto-set slot to match name attribute for shadow DOM slot routing
    const name = this.getAttribute("name");
    if (name && !this.getAttribute("slot")) {
      this.setAttribute("slot", name);
    }
  }
}

// ════════════════════════════════════════════════════════
// <help-section> — Collapsible section inside help-tab
// ════════════════════════════════════════════════════════

/**
 * <help-section title="Details" open>
 *   <p>Expandable content.</p>
 * </help-section>
 */
class HelpSection extends HTMLElement {
  connectedCallback() {
    const title = this.getAttribute("title") || "Section";
    const isOpen = this.hasAttribute("open");
    const children = this.innerHTML;
    this.innerHTML = `
      <details ${isOpen ? "open" : ""}>
        <summary>${title}</summary>
        <div>${children}</div>
      </details>
    `;
  }
}

// ════════════════════════════════════════════════════════
// <eq-block> — KaTeX equation container
// ════════════════════════════════════════════════════════

/**
 * <eq-block>\\ddot{x} + 2\\zeta\\omega_n\\dot{x} = 0</eq-block>
 *
 * Rendered by help-panel when KaTeX is available.
 * Falls back to displaying raw LaTeX if KaTeX isn't loaded.
 */
class EqBlock extends HTMLElement {
  connectedCallback() {
    this.style.display = "block";
    this.style.background = "#0d1117";
    this.style.border = "1px solid var(--sidebar-border, #1e293b)";
    this.style.borderRadius = "6px";
    this.style.padding = "12px 16px";
    this.style.margin = "8px 0";
    this.style.textAlign = "center";
    this.style.overflowX = "auto";
    this.style.fontFamily = "'JetBrains Mono', monospace";
    this.style.fontSize = "12px";
    this.style.color = "var(--sidebar-muted, #94a3b8)";
  }
}

// ════════════════════════════════════════════════════════
// Register all elements
// ════════════════════════════════════════════════════════

customElements.define("help-panel", HelpPanel);
customElements.define("help-tab", HelpTab);
customElements.define("help-section", HelpSection);
customElements.define("eq-block", EqBlock);
