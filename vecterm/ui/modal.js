/**
 * Vecterm Modal System
 * Provides reusable, styled modal dialogs for the vecterm interface
 *
 * Usage:
 *   import { createModal, showConfirm } from './ui/modal.js';
 *
 *   // Simple confirm dialog
 *   const confirmed = await showConfirm('Delete this item?', 'Confirm Delete');
 *
 *   // Custom modal
 *   const modal = createModal({
 *     title: 'Custom Modal',
 *     body: 'Modal content here',
 *     buttons: [
 *       { label: 'Cancel', variant: 'default' },
 *       { label: 'OK', variant: 'primary' }
 *     ]
 *   });
 */

/**
 * Create and show a modal dialog
 * @param {Object} options - Modal configuration
 * @param {string} options.title - Modal title
 * @param {string} options.body - Modal body content (HTML string)
 * @param {Array} options.buttons - Array of button configs
 * @param {Function} options.onClose - Callback when modal closes
 * @returns {Object} Modal API with show/hide/destroy methods
 */
export function createModal({ title = 'Alert', body = '', buttons = [], onClose = null }) {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'vecterm-modal-overlay';

  // Create modal container
  const modal = document.createElement('div');
  modal.className = 'vecterm-modal';

  // Create header
  const header = document.createElement('div');
  header.className = 'vecterm-modal-header';
  const titleEl = document.createElement('h3');
  titleEl.className = 'vecterm-modal-title';
  titleEl.textContent = title;
  header.appendChild(titleEl);

  // Create body
  const bodyEl = document.createElement('div');
  bodyEl.className = 'vecterm-modal-body';
  bodyEl.innerHTML = body;

  // Create footer with buttons
  const footer = document.createElement('div');
  footer.className = 'vecterm-modal-footer';

  // Track button promise resolvers
  let resolvePromise = null;
  const modalPromise = new Promise(resolve => {
    resolvePromise = resolve;
  });

  // Create buttons
  buttons.forEach((btn, index) => {
    const button = document.createElement('button');
    button.className = `vecterm-modal-btn ${btn.variant || 'default'}`;
    button.textContent = btn.label || `Button ${index + 1}`;

    button.addEventListener('click', () => {
      if (btn.onClick) {
        btn.onClick();
      }

      // Resolve promise with button index
      if (resolvePromise) {
        resolvePromise(index);
      }

      hide();
    });

    footer.appendChild(button);
  });

  // Assemble modal
  modal.appendChild(header);
  modal.appendChild(bodyEl);
  modal.appendChild(footer);
  overlay.appendChild(modal);

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      if (resolvePromise) {
        resolvePromise(-1); // -1 indicates cancelled by clicking outside
      }
      hide();
    }
  });

  // Close on ESC key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      if (resolvePromise) {
        resolvePromise(-1); // -1 indicates cancelled by ESC
      }
      hide();
    }
  };

  // API methods
  function show() {
    document.body.appendChild(overlay);
    // Force display change before adding active class for animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.add('active');
      });
    });
    document.addEventListener('keydown', handleEscape);
    return modalPromise;
  }

  function hide() {
    overlay.classList.remove('active');
    document.removeEventListener('keydown', handleEscape);

    // Wait for animation before removing
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      if (onClose) {
        onClose();
      }
    }, 250);
  }

  function destroy() {
    document.removeEventListener('keydown', handleEscape);
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }

  return { show, hide, destroy, promise: modalPromise };
}

/**
 * Show a simple alert modal
 * @param {string} message - Alert message
 * @param {string} title - Modal title (default: 'Alert')
 * @returns {Promise} Resolves when OK is clicked
 */
export async function showAlert(message, title = 'Alert') {
  const modal = createModal({
    title,
    body: `<p>${message}</p>`,
    buttons: [
      { label: 'OK', variant: 'primary' }
    ]
  });

  await modal.show();
  return true;
}

/**
 * Show a confirmation modal
 * @param {string} message - Confirmation message
 * @param {string} title - Modal title (default: 'Confirm')
 * @param {Object} options - Additional options
 * @param {string} options.confirmLabel - Label for confirm button (default: 'Confirm')
 * @param {string} options.cancelLabel - Label for cancel button (default: 'Cancel')
 * @param {string} options.confirmVariant - Variant for confirm button (default: 'primary')
 * @returns {Promise<boolean>} Resolves to true if confirmed, false if cancelled
 */
export async function showConfirm(message, title = 'Confirm', options = {}) {
  const {
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    confirmVariant = 'primary'
  } = options;

  const modal = createModal({
    title,
    body: `<p>${message}</p>`,
    buttons: [
      { label: cancelLabel, variant: 'default' },
      { label: confirmLabel, variant: confirmVariant }
    ]
  });

  const result = await modal.show();
  // Button index 1 is confirm, 0 is cancel, -1 is dismissed
  return result === 1;
}

/**
 * Show a dangerous action confirmation modal (red theme)
 * @param {string} message - Warning message
 * @param {string} title - Modal title (default: 'Warning')
 * @param {Object} options - Additional options
 * @returns {Promise<boolean>} Resolves to true if confirmed, false if cancelled
 */
export async function showDangerConfirm(message, title = 'Warning', options = {}) {
  const {
    confirmLabel = 'Proceed',
    cancelLabel = 'Cancel'
  } = options;

  const modal = createModal({
    title,
    body: `<p>${message}</p>`,
    buttons: [
      { label: cancelLabel, variant: 'default' },
      { label: confirmLabel, variant: 'danger' }
    ]
  });

  const result = await modal.show();
  return result === 1;
}

/**
 * Show a prompt modal for text input
 * @param {string} message - Prompt message
 * @param {string} title - Modal title (default: 'Input')
 * @param {string} defaultValue - Default input value
 * @returns {Promise<string|null>} Resolves to input value if confirmed, null if cancelled
 */
export async function showPrompt(message, title = 'Input', defaultValue = '') {
  const inputId = 'vecterm-modal-input-' + Date.now();

  const modal = createModal({
    title,
    body: `
      <p>${message}</p>
      <input
        type="text"
        id="${inputId}"
        value="${defaultValue}"
        style="
          width: 100%;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid #4fc3f7;
          color: #4fc3f7;
          font-family: var(--font-code);
          font-size: var(--font-size-md);
          margin-top: 12px;
          border-radius: 4px;
        "
      >
    `,
    buttons: [
      { label: 'Cancel', variant: 'default' },
      { label: 'OK', variant: 'primary' }
    ]
  });

  const resultPromise = modal.show();

  // Auto-focus and select input after modal is shown
  setTimeout(() => {
    const input = document.getElementById(inputId);
    if (input) {
      input.focus();
      input.select();

      // Allow Enter to confirm
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          modal.hide();
        }
      });
    }
  }, 100);

  const result = await resultPromise;

  if (result === 1) {
    const input = document.getElementById(inputId);
    return input ? input.value : null;
  }

  return null;
}

// Export default API
export default {
  createModal,
  showAlert,
  showConfirm,
  showDangerConfirm,
  showPrompt
};
