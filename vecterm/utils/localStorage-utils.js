// ==========================================
// LOCALSTORAGE UTILITIES
// ==========================================

export function loadUIState() {
  try {
    const savedData = localStorage.getItem('redux-demo-ui-state');
    if (savedData) {
      return JSON.parse(savedData);
    }
  } catch (e) {
    console.error('Failed to load UI state:', e);
  }
  return null;
}

export function saveUIState(state) {
  try {
    localStorage.setItem('redux-demo-ui-state', JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save UI state:', e);
  }
}
