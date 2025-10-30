(function () {
  function renderMatrix(container) {
    const card = document.createElement('div');
    card.className = 'card';
    const h = document.createElement('h3'); h.textContent = 'IPA Matrix (vowels demo)';
    const grid = document.createElement('div'); grid.className = 'grid';

    const list = EPM.ipaList();
    list.forEach(sym => {
      const enabled = EPM.isWestern(sym);
      const cell = document.createElement('div');
      cell.className = 'cell ' + (enabled ? 'enabled' : 'disabled');
      const s = document.createElement('div'); s.className = 'sym'; s.textContent = sym;
      cell.appendChild(s);
      if (enabled) {
        cell.addEventListener('click', () => {
          const ep = EPM.packetFor(sym);
          EventBus.emit('ep:play', ep);
        });
      }
      grid.appendChild(cell);
    });

    card.appendChild(h);
    card.appendChild(grid);
    container.appendChild(card);
  }

  window.IPAMatrix = { mount: renderMatrix };
})();

