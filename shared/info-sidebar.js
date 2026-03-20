/**
 * <info-sidebar> — Reusable resizable reference sidebar with Wikipedia fetch.
 *
 * Usage:
 *   <script src="/shared/info-sidebar.js"></script>
 *
 *   <info-sidebar width="300" position="right">
 *     <sidebar-section title="Overview" open>
 *       <p>Some content here.</p>
 *       <wiki-link topic="Bayesian_inference">Bayesian inference</wiki-link>
 *     </sidebar-section>
 *     <sidebar-section title="API Reference">
 *       <p>More content.</p>
 *     </sidebar-section>
 *   </info-sidebar>
 *
 * Attributes:
 *   width    — initial sidebar width in px (default: 300)
 *   position — "right" (default) or "left"
 *   hidden   — start collapsed
 *
 * Events:
 *   "sidebar-resize" — detail: { width }
 *   "sidebar-toggle" — detail: { open }
 *
 * CSS custom properties (set on host or ancestor):
 *   --sidebar-bg       (default: #111827)
 *   --sidebar-border   (default: #1e293b)
 *   --sidebar-text     (default: #e2e8f0)
 *   --sidebar-muted    (default: #94a3b8)
 *   --sidebar-dim      (default: #64748b)
 *   --sidebar-accent   (default: #3b82f6)
 */

class InfoSidebar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._dragging = false;
    this._width = 300;
  }

  static get observedAttributes() {
    return ["width", "hidden"];
  }

  connectedCallback() {
    this._width = parseInt(this.getAttribute("width")) || 300;
    this._render();
    this._setupResize();
    this._setupWikiDelegation();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === "width" && !this._dragging) {
      this._width = parseInt(newVal) || 300;
      const panel = this.shadowRoot.querySelector(".panel");
      if (panel) panel.style.width = this._width + "px";
    }
    if (name === "hidden") {
      const panel = this.shadowRoot.querySelector(".panel");
      const handle = this.shadowRoot.querySelector(".handle");
      if (panel) panel.style.display = this.hasAttribute("hidden") ? "none" : "";
      if (handle) handle.style.display = this.hasAttribute("hidden") ? "none" : "";
    }
  }

  toggle() {
    if (this.hasAttribute("hidden")) this.removeAttribute("hidden");
    else this.setAttribute("hidden", "");
    this.dispatchEvent(new CustomEvent("sidebar-toggle", {
      detail: { open: !this.hasAttribute("hidden") }, bubbles: true
    }));
  }

  _render() {
    const pos = this.getAttribute("position") || "right";
    const isLeft = pos === "left";

    this.shadowRoot.innerHTML = `
<style>
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
  .handle {
    width: 6px;
    background: var(--_bd);
    cursor: col-resize;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    flex-shrink: 0;
    order: ${isLeft ? 2 : 1};
  }
  .handle:hover, .handle.active { background: #475569; }
  .handle::after {
    content: '';
    display: block;
    width: 2px;
    height: 32px;
    border-left: 1px solid #64748b;
    border-right: 1px solid #64748b;
  }
  .panel {
    width: ${this._width}px;
    background: var(--_bg);
    border-${isLeft ? "right" : "left"}: 1px solid var(--_bd);
    overflow-y: auto;
    padding: 16px;
    flex-shrink: 0;
    order: ${isLeft ? 1 : 2};
    font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
    color: var(--_tx);
    font-size: 13px;
    line-height: 1.6;
  }
  .panel::-webkit-scrollbar { width: 6px; }
  .panel::-webkit-scrollbar-track { background: var(--_bg); }
  .panel::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }

  /* ── Dark sliders ── */
  ::slotted(input[type="range"]), input[type="range"] {
    -webkit-appearance: none; appearance: none;
    width: 100%; height: 6px; background: #1e293b;
    border-radius: 3px; outline: none; cursor: pointer;
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
  .wiki-result {
    background: #0d1117; border: 1px solid var(--_bd); border-radius: 6px;
    padding: 12px; margin-bottom: 8px;
  }
  .wiki-result h4 { font-size: 13px; margin-bottom: 4px; }
  .wiki-result p { font-size: 12px; line-height: 1.6; color: var(--_tm); }
  .wiki-result img { max-width: 100%; border-radius: 4px; margin-bottom: 8px; }
  .wiki-result .wl { display: inline-block; margin-top: 6px; font-size: 11px; color: var(--_ac); text-decoration: none; }
  .wiki-result .wl:hover { text-decoration: underline; }
  .wiki-loading { color: var(--_td); font-size: 12px; font-style: italic; }
  .wiki-error { color: #ef4444; font-size: 12px; }

  /* ── Section header ── */
  .side-h {
    font-size: 11px; color: var(--_td); text-transform: uppercase;
    letter-spacing: 1px; margin-bottom: 12px;
    font-family: 'JetBrains Mono', 'Courier New', monospace;
  }
</style>

<div class="handle" part="handle"></div>
<div class="panel" part="panel">
  <div class="side-h">Reference</div>
  <div class="wiki-bar">
    <input type="text" id="wikiInput" placeholder="Search Wikipedia...">
    <button id="wikiBtn">Fetch</button>
  </div>
  <div id="wikiResults"></div>
  <slot></slot>
</div>
`;
  }

  _setupResize() {
    const handle = this.shadowRoot.querySelector(".handle");
    const panel = this.shadowRoot.querySelector(".panel");
    const pos = this.getAttribute("position") || "right";

    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this._dragging = true;
      handle.classList.add("active");
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    });

    window.addEventListener("mousemove", (e) => {
      if (!this._dragging) return;
      const rect = this.getBoundingClientRect();
      let w;
      if (pos === "left") {
        w = e.clientX - rect.left;
      } else {
        w = rect.right - e.clientX;
      }
      w = Math.max(180, Math.min(w, window.innerWidth * 0.5));
      this._width = w;
      panel.style.width = w + "px";
      this.dispatchEvent(new CustomEvent("sidebar-resize", {
        detail: { width: w }, bubbles: true
      }));
    });

    window.addEventListener("mouseup", () => {
      if (!this._dragging) return;
      this._dragging = false;
      handle.classList.remove("active");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    });
  }

  _setupWikiDelegation() {
    const input = this.shadowRoot.getElementById("wikiInput");
    const btn = this.shadowRoot.getElementById("wikiBtn");
    const box = this.shadowRoot.getElementById("wikiResults");

    btn.addEventListener("click", () => this._fetchWiki(input.value.trim()));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this._fetchWiki(input.value.trim());
    });

    // Listen for wiki-link clicks from light DOM
    this.addEventListener("wiki-fetch", (e) => {
      const topic = e.detail?.topic;
      if (topic) {
        input.value = topic.replace(/_/g, " ");
        this._fetchWiki(topic);
      }
    });
  }

  _fetchWiki(title) {
    if (!title) return;
    const box = this.shadowRoot.getElementById("wikiResults");
    box.innerHTML = '<div class="wiki-loading">Loading...</div>';
    const encoded = encodeURIComponent(title.replace(/ /g, "_"));
    fetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + encoded)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(d => {
        let h = '<div class="wiki-result">';
        if (d.thumbnail) h += '<img src="' + d.thumbnail.source + '" alt="">';
        h += '<h4>' + d.title + '</h4>';
        h += '<p>' + (d.extract || "No summary available.") + '</p>';
        if (d.content_urls) h += '<a class="wl" href="' + d.content_urls.desktop.page + '" target="_blank">Read on Wikipedia</a>';
        h += '</div>';
        box.innerHTML = h;
      })
      .catch(e => {
        box.innerHTML = '<div class="wiki-error">Could not load "' + title + '": ' + e.message + '</div>';
      });
  }
}

/**
 * <sidebar-section> — Collapsible section inside <info-sidebar>
 *
 * Attributes:
 *   title — section heading
 *   open  — start expanded
 */
class SidebarSection extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    const title = this.getAttribute("title") || "Section";
    const isOpen = this.hasAttribute("open");

    this.shadowRoot.innerHTML = `
<style>
  :host {
    display: block;
    border-bottom: 1px solid var(--sidebar-border, #1e293b);
    padding: 8px 0;
  }
  details summary {
    cursor: pointer; font-weight: 500;
    color: var(--sidebar-muted, #94a3b8);
    padding: 6px 0; list-style: none;
    font-size: 13px; transition: color .15s;
    font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
  }
  details summary:hover { color: var(--sidebar-text, #e2e8f0); }
  details summary::before { content: '\\25b8 '; color: var(--sidebar-dim, #64748b); font-size: 10px; }
  details[open] summary::before { content: '\\25be '; }
  .body {
    padding: 8px 0 4px;
    color: var(--sidebar-muted, #94a3b8);
    font-size: 12px; line-height: 1.7;
    font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
  }
  ::slotted(a), ::slotted(wiki-link) {
    color: var(--sidebar-accent, #3b82f6);
    text-decoration: none; cursor: pointer;
  }
</style>
<details ${isOpen ? "open" : ""}>
  <summary>${title}</summary>
  <div class="body"><slot></slot></div>
</details>
`;
  }
}

/**
 * <wiki-link> — Inline clickable link that triggers Wikipedia fetch in parent sidebar
 *
 * Attributes:
 *   topic — Wikipedia article title (underscores or spaces)
 *
 * Usage:
 *   <wiki-link topic="Bayesian_inference">Bayesian inference</wiki-link>
 */
class WikiLink extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
<style>
  :host { cursor: pointer; }
  a {
    color: var(--sidebar-accent, #3b82f6);
    text-decoration: none; font-size: inherit;
  }
  a:hover { text-decoration: underline; }
</style>
<a href="#"><slot></slot></a>
`;
    this.shadowRoot.querySelector("a").addEventListener("click", (e) => {
      e.preventDefault();
      const topic = this.getAttribute("topic");
      if (topic) {
        this.dispatchEvent(new CustomEvent("wiki-fetch", {
          detail: { topic }, bubbles: true, composed: true
        }));
      }
    });
  }
}

customElements.define("info-sidebar", InfoSidebar);
customElements.define("sidebar-section", SidebarSection);
customElements.define("wiki-link", WikiLink);
