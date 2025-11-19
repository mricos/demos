// Responsive Layout Manager
// Handles panel stacking for desktop and mobile viewports

class LayoutManager {
  constructor() {
    this.breakpoints = {
      mobile: 768,
      tablet: 1024,
      desktop: 1440
    };
    this.currentLayout = null;
    this.init();
  }

  init() {
    this.updateLayout();
    window.addEventListener('resize', () => this.updateLayout());
  }

  getViewportWidth() {
    return window.innerWidth;
  }

  getLayoutType() {
    const width = this.getViewportWidth();
    if (width < this.breakpoints.mobile) return 'mobile';
    if (width < this.breakpoints.tablet) return 'tablet';
    if (width < this.breakpoints.desktop) return 'desktop';
    return 'wide';
  }

  updateLayout() {
    const newLayout = this.getLayoutType();
    if (newLayout === this.currentLayout) return;

    this.currentLayout = newLayout;
    document.body.classList.remove('layout-mobile', 'layout-tablet', 'layout-desktop', 'layout-wide');
    document.body.classList.add(`layout-${newLayout}`);

    this.applyGridLayout(newLayout);
  }

  applyGridLayout(layoutType) {
    const main = document.getElementById('main');
    if (!main) return;

    // Define grid templates for different layouts
    const layouts = {
      mobile: {
        columns: '1fr',
        areas: `
          "data"
          "controls"
          "network"
          "metrics"
        `
      },
      tablet: {
        columns: '1fr',
        areas: `
          "data"
          "controls"
          "network"
          "metrics"
        `
      },
      desktop: {
        columns: '400px 1fr',
        areas: `
          "controls data"
          "network network"
          "metrics metrics"
        `
      },
      wide: {
        columns: '350px 1fr 450px',
        areas: `
          "controls data metrics"
          "network network network"
        `
      }
    };

    const layout = layouts[layoutType];
    main.style.gridTemplateColumns = layout.columns;
    main.style.gridTemplateAreas = layout.areas;

    // Assign grid areas to panels
    this.assignGridAreas();
  }

  assignGridAreas() {
    const panels = {
      dataPanel: 'data',
      controlsPanel: 'controls',
      networkPanel: 'network',
      metricsPanel: 'metrics'
    };

    for (const [id, area] of Object.entries(panels)) {
      const panel = document.getElementById(id);
      if (panel) {
        panel.style.gridArea = area;
      }
    }
  }

  // Method to collapse/expand panels on mobile
  makePanelCollapsible(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel) return;

    const header = panel.querySelector('h2');
    if (!header) return;

    header.style.cursor = 'pointer';
    header.addEventListener('click', () => {
      panel.classList.toggle('collapsed');
    });
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  window.layoutManager = new LayoutManager();

  // Make panels collapsible on mobile
  ['dataPanel', 'controlsPanel', 'networkPanel', 'metricsPanel'].forEach(id => {
    window.layoutManager.makePanelCollapsible(id);
  });
});
