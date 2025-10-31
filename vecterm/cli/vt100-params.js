/**
 * VT100 Parameter Controls
 *
 * Hamburger menu-triggered overlay for adjusting VT100 effects in real-time
 * Managed by Vecterm, positioned center screen when visible
 */

let paramsVisible = false; // Start hidden

/**
 * Initialize VT100 parameter controls
 */
function initVT100Params() {
  const paramsPanel = document.getElementById('vt100-params');
  const hamburger = document.getElementById('vt100-menu-toggle');

  if (!paramsPanel) return;

  // Start hidden
  paramsPanel.classList.add('hidden');

  // Hamburger menu toggles parameter controls
  if (hamburger) {
    hamburger.addEventListener('click', (e) => {
      e.preventDefault();
      toggleParams();
    });
  }

  // Escape key hides parameters
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && paramsVisible) {
      hideParams();
    }
  });

  // Scanline intensity slider
  const scanlineSlider = document.getElementById('param-scanline');
  if (scanlineSlider) {
    scanlineSlider.addEventListener('input', (e) => {
      const value = e.target.value / 100;
      document.documentElement.style.setProperty('--vt100-scanline-intensity', value);
      updateParamValue('param-scanline', value.toFixed(2));
    });
  }

  // Glow intensity slider
  const glowSlider = document.getElementById('param-glow');
  if (glowSlider) {
    glowSlider.addEventListener('input', (e) => {
      const value = e.target.value / 100;
      document.documentElement.style.setProperty('--vt100-glow-intensity', value);
      updateParamValue('param-glow', value.toFixed(2));
    });
  }

  // Wave amplitude slider
  const waveSlider = document.getElementById('param-wave');
  if (waveSlider) {
    waveSlider.addEventListener('input', (e) => {
      const value = e.target.value;
      document.documentElement.style.setProperty('--vt100-wave-amplitude', value + 'px');
      updateParamValue('param-wave', value + 'px');
    });
  }
}

/**
 * Toggle parameter panel visibility
 */
function toggleParams() {
  const hamburger = document.getElementById('vt100-menu-toggle');

  if (paramsVisible) {
    hideParams();
    if (hamburger) hamburger.classList.remove('active');
  } else {
    showParams();
    if (hamburger) hamburger.classList.add('active');
  }
}

/**
 * Show parameter panel
 */
function showParams() {
  const paramsPanel = document.getElementById('vt100-params');
  if (paramsPanel) {
    paramsPanel.classList.remove('hidden');
    paramsVisible = true;
  }
}

/**
 * Hide parameter panel
 */
function hideParams() {
  const paramsPanel = document.getElementById('vt100-params');
  const hamburger = document.getElementById('vt100-menu-toggle');

  if (paramsPanel) {
    paramsPanel.classList.add('hidden');
    paramsVisible = false;
  }

  if (hamburger) {
    hamburger.classList.remove('active');
  }
}

/**
 * Update parameter value display
 */
function updateParamValue(sliderId, value) {
  const slider = document.getElementById(sliderId);
  if (!slider) return;

  const valueSpan = slider.parentElement.querySelector('.param-val');
  if (valueSpan) {
    valueSpan.textContent = value;
  }
}

export { initVT100Params };
