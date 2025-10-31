// Ipa.js
// IPA Keyboard UI Component

class IpaKeyboard {
  constructor(containerSelector, ipaToVoder, voderControl) {
    this.container = typeof containerSelector === 'string'
      ? document.querySelector(containerSelector)
      : containerSelector;

    this.ipaToVoder = ipaToVoder;
    this.voderControl = voderControl;
    this.listeners = {};
    this.activePhoneme = null;
  }

  // Initialize and render the keyboard
  async init() {
    if (!this.ipaToVoder.phonemeDB) {
      await this.ipaToVoder.loadPhonemeDB();
    }

    this.render();
    this._attachEventListeners();
  }

  // Main render method
  render() {
    this.container.innerHTML = '';

    // Create main sections
    const vowelSection = this._createSection('Vowels', 'vowel-section');
    const consonantSection = this._createSection('Consonants', 'consonant-section');

    // Render vowel chart
    const vowelChart = this._renderVowelChart();
    vowelSection.appendChild(vowelChart);

    // Render consonants (if any exist in DB)
    const consonants = this.ipaToVoder.getPhonemesByCategory('consonant');
    if (consonants.length > 0) {
      const consonantGrid = this._renderConsonantGrid();
      consonantSection.appendChild(consonantGrid);
    } else {
      consonantSection.innerHTML += '<p class="placeholder">Consonants coming soon...</p>';
    }

    this.container.appendChild(vowelSection);
    this.container.appendChild(consonantSection);
  }

  // Create a section container
  _createSection(title, className) {
    const section = document.createElement('div');
    section.className = `ipa-section ${className}`;

    const heading = document.createElement('h3');
    heading.textContent = title;
    section.appendChild(heading);

    return section;
  }

  // Render vowel chart (organized by height and backness)
  _renderVowelChart() {
    const vowelChart = this.ipaToVoder.getVowelChart();
    const chartEl = document.createElement('div');
    chartEl.className = 'vowel-chart';

    // Create table-like structure
    const table = document.createElement('div');
    table.className = 'vowel-table';

    // Header row
    const headerRow = this._createRow(['', 'Front', 'Central', 'Back'], 'header');
    table.appendChild(headerRow);

    // Data rows
    ['high', 'mid', 'low'].forEach(height => {
      const row = document.createElement('div');
      row.className = 'vowel-row';

      // Height label
      const label = document.createElement('div');
      label.className = 'vowel-row-label';
      label.textContent = height.charAt(0).toUpperCase() + height.slice(1);
      row.appendChild(label);

      // Front, Central, Back cells
      ['front', 'central', 'back'].forEach(backness => {
        const cell = document.createElement('div');
        cell.className = 'vowel-cell';

        const vowels = vowelChart[height][backness];
        vowels.forEach(vowel => {
          const button = this._createPhonemeButton(vowel);
          cell.appendChild(button);
        });

        row.appendChild(cell);
      });

      table.appendChild(row);
    });

    chartEl.appendChild(table);
    return chartEl;
  }

  // Create a row helper
  _createRow(cells, className = '') {
    const row = document.createElement('div');
    row.className = `vowel-row ${className}`;

    cells.forEach(content => {
      const cell = document.createElement('div');
      cell.className = className === 'header' ? 'vowel-header-cell' : 'vowel-cell';
      cell.textContent = content;
      row.appendChild(cell);
    });

    return row;
  }

  // Render consonant grid (organized by manner and place)
  _renderConsonantGrid() {
    const consonantChart = this.ipaToVoder.getConsonantChart();
    const gridEl = document.createElement('div');
    gridEl.className = 'consonant-grid';

    Object.keys(consonantChart).forEach(manner => {
      const mannerSection = document.createElement('div');
      mannerSection.className = 'consonant-manner-section';

      const mannerLabel = document.createElement('div');
      mannerLabel.className = 'consonant-manner-label';
      mannerLabel.textContent = manner.charAt(0).toUpperCase() + manner.slice(1);
      mannerSection.appendChild(mannerLabel);

      const placeRow = document.createElement('div');
      placeRow.className = 'consonant-place-row';

      Object.keys(consonantChart[manner]).forEach(place => {
        const consonants = consonantChart[manner][place];

        if (consonants.length > 0) {
          const placeGroup = document.createElement('div');
          placeGroup.className = 'consonant-place-group';

          consonants.forEach(consonant => {
            const button = this._createPhonemeButton(consonant);
            placeGroup.appendChild(button);
          });

          placeRow.appendChild(placeGroup);
        }
      });

      mannerSection.appendChild(placeRow);
      gridEl.appendChild(mannerSection);
    });

    return gridEl;
  }

  // Create a phoneme button
  _createPhonemeButton(phoneme) {
    const button = document.createElement('button');
    button.className = 'ipa-key';
    button.dataset.ipa = phoneme.ipa;
    button.dataset.category = phoneme.category;
    button.dataset.voiced = phoneme.voiced;

    // IPA symbol (large)
    const symbol = document.createElement('div');
    symbol.className = 'ipa-symbol';
    symbol.textContent = phoneme.ipa;
    button.appendChild(symbol);

    // Example word (small)
    const example = document.createElement('div');
    example.className = 'ipa-example';
    example.textContent = phoneme.examples ? phoneme.examples[0] : '';
    button.appendChild(example);

    // Filter indicator (visual bars showing active filters)
    const filterIndicator = document.createElement('div');
    filterIndicator.className = 'ipa-filter-indicator';

    const filters = phoneme.filters || [];
    for (let i = 0; i < 10; i++) {
      const bar = document.createElement('div');
      bar.className = 'filter-bar';

      if (filters.includes(i)) {
        bar.classList.add('active');
        const gain = phoneme.gains ? phoneme.gains[filters.indexOf(i)] : 1.0;
        bar.style.opacity = gain;
      }

      filterIndicator.appendChild(bar);
    }

    button.appendChild(filterIndicator);

    // Voiced/unvoiced indicator
    if (phoneme.voiced) {
      button.classList.add('voiced');
    } else {
      button.classList.add('unvoiced');
    }

    return button;
  }

  // Attach event listeners to phoneme buttons
  _attachEventListeners() {
    this.container.addEventListener('click', (e) => {
      const button = e.target.closest('.ipa-key');
      if (!button) return;

      const ipa = button.dataset.ipa;
      this._handlePhonemeClick(ipa, button);
    });
  }

  // Handle phoneme button click
  async _handlePhonemeClick(ipa, buttonEl) {
    // Visual feedback
    this._setActiveButton(buttonEl);

    // Translate IPA to Voder settings
    const voderSettings = this.ipaToVoder.translate(ipa);

    // Emit event
    this.emit('phoneme', voderSettings);

    // Play phoneme
    try {
      await this.voderControl.playPhoneme(voderSettings);
    } catch (error) {
      console.error('Error playing phoneme:', error);
    }

    // Clear active state
    setTimeout(() => {
      this._clearActiveButton();
    }, voderSettings.duration);
  }

  // Visual feedback for active button
  _setActiveButton(button) {
    // Clear previous active
    const prevActive = this.container.querySelector('.ipa-key.active');
    if (prevActive) {
      prevActive.classList.remove('active');
    }

    button.classList.add('active');
    this.activePhoneme = button.dataset.ipa;
  }

  _clearActiveButton() {
    const active = this.container.querySelector('.ipa-key.active');
    if (active) {
      active.classList.remove('active');
    }
    this.activePhoneme = null;
  }

  // Event system
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => callback(data));
  }

  // Programmatically trigger a phoneme
  async playPhoneme(ipa) {
    const button = this.container.querySelector(`[data-ipa="${ipa}"]`);
    if (button) {
      await this._handlePhonemeClick(ipa, button);
    }
  }
}
