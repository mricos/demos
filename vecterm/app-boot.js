/**
 * Redux Demo - Boot-Managed Application Entry Point
 *
 * This version uses BootManager to handle initialization properly.
 * All systems initialize in the correct order with proper async handling.
 */

import { bootApplication, BootPhase } from './core/boot-manager.js';

// Optional: Show boot progress in UI
function showBootProgress(phase) {
  const bootIndicator = document.getElementById('boot-indicator');
  if (bootIndicator) {
    bootIndicator.textContent = `Initializing: ${phase}`;
    bootIndicator.style.display = 'block';
  }
}

function hideBootProgress() {
  const bootIndicator = document.getElementById('boot-indicator');
  if (bootIndicator) {
    bootIndicator.style.display = 'none';
  }
}

// Listen for boot phase changes
document.addEventListener('boot-phase-change', (e) => {
  const { phase } = e.detail;
  console.log(`Boot phase: ${phase}`);

  if (phase === BootPhase.READY) {
    hideBootProgress();
  } else if (phase === BootPhase.ERROR) {
    console.error('Boot failed');
  } else {
    showBootProgress(phase);
  }
});

// Main entry point
async function main() {
  try {
    console.log('Starting vecterm application...');

    const manager = await bootApplication();

    console.log('Application ready!');
    console.log('Available systems:', Object.keys(manager.systems));

    // Initial render
    manager.systems.render();

  } catch (error) {
    console.error('Failed to start application:', error);

    // Show error UI
    const bootIndicator = document.getElementById('boot-indicator');
    if (bootIndicator) {
      bootIndicator.textContent = `Boot failed: ${error.message}`;
      bootIndicator.style.color = 'var(--error)';
    }
  }
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}

// Export for debugging (use window.__bootManager() from app.js instead)
