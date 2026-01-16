(function () {
  class PJAIframer {
    constructor(opts) {
      this.opts = opts;
      this._handlers = new Map();
      this.iframe = null;
      this.root = null;
      this.cliInput = null;
      this.cliLog = null;
      this._cliVisible = true;
    }

    on(ev, fn) {
      if (!this._handlers.has(ev)) this._handlers.set(ev, []);
      this._handlers.get(ev).push(fn);
    }

    _emit(ev, ...args) {
      const hs = this._handlers.get(ev) || [];
      for (const h of hs) { try { h(...args); } catch (_) {} }
    }

    render(container) {
      const wrap = document.createElement('div');
      wrap.style.display = 'grid';
      wrap.style.gridTemplateRows = '36px 1fr 180px';
      wrap.style.height = '100vh';

      const bar = document.createElement('div');
      bar.style.display = 'flex';
      bar.style.alignItems = 'center';
      bar.style.gap = '10px';
      bar.style.padding = '0 10px';
      bar.style.borderBottom = '1px solid rgba(255,255,255,0.08)';
      bar.style.userSelect = 'none';

      const title = document.createElement('div');
      title.textContent = `${this.opts.icon || ''} ${this.opts.title || this.opts.id}`;
      title.style.fontFamily = 'var(--pja-font-mono, monospace)';

      const btn = (name, onClick) => {
        const b = document.createElement('button');
        b.textContent = name;
        b.style.background = 'transparent';
        b.style.border = '1px solid rgba(255,255,255,0.12)';
        b.style.color = 'inherit';
        b.style.padding = '4px 8px';
        b.style.cursor = 'pointer';
        b.onclick = onClick;
        return b;
      };

      bar.appendChild(title);
      const buttons = this.opts.buttons || [];

      if (buttons.includes('reload')) bar.appendChild(btn('reload', () => this.reload()));
      if (buttons.includes('cli')) bar.appendChild(btn('cli', () => this.toggleCLI()));
      if (buttons.includes('launch')) bar.appendChild(btn('launch', () => window.open(this.opts.src, '_blank')));
      if (buttons.includes('info')) bar.appendChild(btn('info', () => this.logCLI('info', `src=${this.opts.src}`)));

      const iframe = document.createElement('iframe');
      iframe.id = this.opts.id;
      iframe.src = this.opts.src;
      iframe.style.border = '0';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.onload = () => this._emit('ready');

      const cli = document.createElement('div');
      cli.style.display = 'grid';
      cli.style.gridTemplateRows = '1fr 32px';
      cli.style.borderTop = '1px solid rgba(255,255,255,0.08)';
      cli.style.background = 'rgba(0,0,0,0.35)';

      const log = document.createElement('div');
      log.style.overflow = 'auto';
      log.style.padding = '8px';
      log.style.fontFamily = 'var(--pja-font-mono, monospace)';
      log.style.fontSize = '12px';
      log.style.whiteSpace = 'pre-wrap';

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'cli> (try: crt-help)';
      input.style.width = '100%';
      input.style.boxSizing = 'border-box';
      input.style.border = '0';
      input.style.outline = 'none';
      input.style.padding = '6px 8px';
      input.style.fontFamily = 'var(--pja-font-mono, monospace)';
      input.style.background = 'rgba(0,0,0,0.6)';
      input.style.color = 'inherit';

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const cmd = input.value.trim();
          if (!cmd) return;
          input.value = '';
          this.logCLI('cmd', cmd);
          this.executeCLICommand(cmd);
        }
      });

      cli.appendChild(log);
      cli.appendChild(input);

      wrap.appendChild(bar);
      wrap.appendChild(iframe);
      wrap.appendChild(cli);

      container.innerHTML = '';
      container.appendChild(wrap);

      this.iframe = iframe;
      this.root = wrap;
      this.cliInput = input;
      this.cliLog = log;

      this.logCLI('info', 'PJAIframer ready');
      this._emit('ready');
    }

    reload() {
      if (this.iframe) this.iframe.src = this.iframe.src;
    }

    toggleCLI() {
      const rows = this.root.style.gridTemplateRows.split(' ');
      this._cliVisible = !this._cliVisible;
      this.root.style.gridTemplateRows = this._cliVisible ? '36px 1fr 180px' : '36px 1fr 0px';
      if (!this._cliVisible) this.logCLI('info', 'CLI hidden');
    }

    executeCLICommand(command) {
      // Default built-ins; host overrides to add CRT commands
      const c = command.trim().toLowerCase();
      if (c === 'help') {
        this.logCLI('info', 'Built-ins: help|clear|ping');
        return;
      }
      if (c === 'clear') {
        this.cliLog.textContent = '';
        return;
      }
      if (c === 'ping') {
        this.logCLI('info', 'pong');
        return;
      }
      this.logCLI('error', `Unknown command: ${command}`);
    }

    logCLI(level, msg) {
      const line = `[${level}] ${msg}\n`;
      this.cliLog.textContent += line;
      this.cliLog.scrollTop = this.cliLog.scrollHeight;
      if (this.opts.logMessages) console.log(line.trim());
    }
  }

  window.PJAIframer = PJAIframer;
})();

