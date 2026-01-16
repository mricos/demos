(function () {
  class PJAThemeManager {
    constructor() {
      this.setTheme('dark');
    }
    setTheme(name) {
      document.documentElement.setAttribute('data-theme', name);
    }
  }
  window.PJAThemeManager = PJAThemeManager;
})();

