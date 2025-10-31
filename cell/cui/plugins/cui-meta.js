/**
 * CUI Meta Documentation
 * Framework self-documentation and meta commands
 */

(function() {
  'use strict';

  CUI.register('meta', ['core', 'lifecycle'], function(CUI) {
    CUI.log('Meta documentation module initializing...');

    // ========================================================================
    // Meta Documentation Storage
    // ========================================================================

    CUI.Meta = {
      version: CUI.VERSION,
      buildDate: CUI.BUILD_DATE,

      // ASCII Layouts
      layouts: {
        overview: `
┌─────────────────────────────────────────────────────────────────────┐
│                         HEADER BAR                                   │
│  ┌──────────────┐                              ┌─────────────────┐  │
│  │   .title     │                              │    .stats       │  │
│  │  (branding)  │                              │  (stat pills)   │  │
│  └──────────────┘                              └─────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────┬────────────────────────────────┐  │
│  │                             │                                 │  │
│  │    PRIMARY VIEWPORT         │     SECONDARY VIEWPORT          │  │
│  │    (left .card)             │     (right .card)               │  │
│  │                             │                                 │  │
│  │  Semantic Name:             │  Semantic Name:                 │  │
│  │  • .cui-field-view          │  • .cui-analytics-view          │  │
│  │  • .cui-simulation-canvas   │  • .cui-metrics-canvas          │  │
│  │  • .cui-viewport-primary    │  • .cui-viewport-secondary      │  │
│  │                             │                                 │  │
│  │  ┌─────────────────────┐   │  ┌──────────────────────────┐  │  │
│  │  │  Canvas Area        │   │  │  Canvas Area             │  │  │
│  │  │  <canvas id="...">  │   │  │  <canvas id="...">       │  │  │
│  │  │                     │   │  │                          │  │  │
│  │  │  .overlay-note      │   │  │  .axis-label             │  │  │
│  │  └─────────────────────┘   │  └──────────────────────────┘  │  │
│  │                             │                                 │  │
│  └─────────────────────────────┴────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘`,

        zstack: `
RIGHT OVERLAY Z-INDEX STACK (bottom to top):

z-drawer (20)  ┌─────────────────────────┐
               │   .docpanel             │
               │   (Documentation)        │
               │                         │
               │ • .dochead (sticky)     │
               │ • .tabs                 │
               │ • .subtabs              │
               │ • .docbody              │
               │                         │
               │ Semantic: .cui-docs-panel│
               └─────────────────────────┘

z-modal (40)   ┌─────────────────────────┐
               │   .drawer               │
               │   (Controls/Params)      │
               │                         │
               │ • .drawer-header        │
               │   └─ .control-tabs      │
               │ • .drawer-controls      │
               │   └─ .control-section   │
               │ • .presets-section      │
               │ • .drawer-actions       │
               │                         │
               │ Semantic: .cui-controls-drawer│
               └─────────────────────────┘

z-fab (30)     ┌───┐  ┌───┐
               │ ? │  │ ⚙ │  .fab-row
               └───┘  └───┘
               .doc   .sim

               Semantic: .cui-fab-group`,

        hierarchy: `
CUI SEMANTIC HIERARCHY:

.cui-app-container (body)
  │
  ├─ .cui-header
  │    ├─ .cui-branding
  │    └─ .cui-status-bar
  │
  ├─ .cui-workspace
  │    ├─ .cui-view-primary (left)
  │    │    └─ canvas.cui-canvas-field
  │    └─ .cui-view-secondary (right)
  │         └─ canvas.cui-canvas-chart
  │
  └─ .cui-overlay-stack
       ├─ .cui-fab-group
       │    ├─ .cui-fab-docs
       │    └─ .cui-fab-controls
       ├─ .cui-docs-panel
       └─ .cui-controls-drawer
            ├─ .cui-drawer-header
            ├─ .cui-drawer-params
            ├─ .cui-drawer-presets
            └─ .cui-drawer-actions`
      },

      // Semantic mappings
      semantics: {
        leftSide: {
          current: '.card (first-child)',
          proposed: [
            '.cui-view-primary',
            '.cui-simulation-view',
            '.cui-field-canvas',
            '.cui-workspace-main'
          ],
          purpose: 'Main simulation/field visualization',
          priority: 'Primary user focus',
          content: 'Agent field, particle systems, spatial data'
        },

        rightSide: {
          current: '.card (last-child)',
          proposed: [
            '.cui-view-secondary',
            '.cui-analytics-view',
            '.cui-chart-canvas',
            '.cui-workspace-metrics'
          ],
          purpose: 'Analytics, metrics, time series',
          priority: 'Supporting data visualization',
          content: 'Charts, graphs, order parameters'
        },

        overlay: {
          current: '.fab-row, .drawer, .docpanel',
          proposed: [
            '.cui-overlay-right',
            '.cui-control-stack',
            '.cui-interaction-layer'
          ],
          purpose: 'User interaction layer',
          priority: 'On-demand access, doesn\'t obscure views',
          content: 'FABs, drawers, docs, params'
        }
      },

      // Module architecture
      modules: {
        core: {
          name: 'cui-core.js',
          deps: [],
          provides: ['CUI namespace', 'State', 'Events', 'DOM utils', 'Utils'],
          description: 'Foundation layer - namespace, state, events, utilities'
        },
        tokens: {
          name: 'cui-tokens.js',
          deps: ['core'],
          provides: ['Design tokens', 'CSS injection', 'Theming'],
          description: 'Design system tokens and CSS variable injection'
        },
        lifecycle: {
          name: 'cui-lifecycle.js',
          deps: ['core'],
          provides: ['CUI.register()', 'CUI.ready()', 'Hot reload'],
          description: 'IIFE module registration and dependency resolution'
        },
        tabs: {
          name: 'cui-tabs.js',
          deps: ['core', 'lifecycle'],
          provides: ['CUI.Tabs', 'Multi-level tabs'],
          description: 'Generic tab and sub-tab system'
        },
        fab: {
          name: 'cui-fab.js',
          deps: ['core', 'lifecycle'],
          provides: ['CUI.FAB', 'CUI.Drawer', 'CUI.DocPanel'],
          description: 'FAB components and drawer management'
        },
        terminal: {
          name: 'cui-terminal.js',
          deps: ['core', 'lifecycle'],
          provides: ['CUI.Terminal', 'CLI', 'Command routing'],
          description: 'Terminal component with CLI and CRT effects'
        },
        behaviors: {
          name: 'cui-behaviors.js',
          deps: ['core', 'lifecycle'],
          provides: ['CUI.Slider', 'CUI.ButtonGrid', 'CUI.Dropdown', 'CUI.Animate'],
          description: 'Reusable UI behaviors library'
        },
        meta: {
          name: 'cui-meta.js',
          deps: ['core', 'lifecycle'],
          provides: ['CUI.Meta', 'Self-documentation'],
          description: 'Framework self-documentation and meta commands'
        }
      },

      // Command definitions with metadata
      commands: {
        layout: {
          syntax: 'layout [overview|zstack|hierarchy]',
          description: 'Display CUI layout architecture diagrams',
          examples: [
            'layout',
            'layout overview',
            'layout zstack',
            'layout hierarchy'
          ]
        },
        semantics: {
          syntax: 'semantics [left|right|overlay]',
          description: 'Show semantic naming for CUI components',
          examples: [
            'semantics',
            'semantics left',
            'semantics right',
            'semantics overlay'
          ]
        },
        architecture: {
          syntax: 'architecture',
          description: 'Display module architecture and dependencies',
          examples: ['architecture']
        },
        meta: {
          syntax: 'meta',
          description: 'Show meta documentation system info',
          examples: ['meta']
        }
      }
    };

    // ========================================================================
    // Meta Command Handlers
    // ========================================================================

    CUI.Meta.handlers = {
      layout(args, term) {
        const view = args[0] || 'overview';
        const layouts = CUI.Meta.layouts;

        if (layouts[view]) {
          term.log('', 'info');
          term.log(`CUI LAYOUT: ${view.toUpperCase()}`, 'info');
          term.log('', 'info');
          layouts[view].split('\n').forEach(line => {
            term.log(line, 'info');
          });
          term.log('', 'info');
        } else {
          term.log(`Unknown layout view: ${view}`, 'error');
          term.log('Available views: overview, zstack, hierarchy', 'info');
        }
      },

      semantics(args, term) {
        const area = args[0];
        const semantics = CUI.Meta.semantics;

        if (!area) {
          // Show all
          term.log('', 'info');
          term.log('CUI SEMANTIC NAMING', 'info');
          term.log('', 'info');

          ['leftSide', 'rightSide', 'overlay'].forEach(key => {
            const section = semantics[key];
            term.log(`${key.toUpperCase()}:`, 'info');
            term.log(`  Purpose: ${section.purpose}`, 'info');
            term.log(`  Current: ${section.current}`, 'info');
            term.log(`  Proposed:`, 'info');
            section.proposed.forEach(name => {
              term.log(`    • ${name}`, 'info');
            });
            term.log('', 'info');
          });
        } else {
          // Show specific area
          const key = area + 'Side';
          const section = semantics[key] || semantics[area];

          if (section) {
            term.log('', 'info');
            term.log(`${area.toUpperCase()} SEMANTICS`, 'info');
            term.log('', 'info');
            term.log(`Purpose:  ${section.purpose}`, 'info');
            term.log(`Priority: ${section.priority}`, 'info');
            term.log(`Content:  ${section.content}`, 'info');
            term.log('', 'info');
            term.log(`Current:  ${section.current}`, 'info');
            term.log('Proposed:', 'info');
            section.proposed.forEach(name => {
              term.log(`  • ${name}`, 'info');
            });
            term.log('', 'info');
          } else {
            term.log(`Unknown area: ${area}`, 'error');
            term.log('Available areas: left, right, overlay', 'info');
          }
        }
      },

      architecture(args, term) {
        const modules = CUI.Meta.modules;

        term.log('', 'info');
        term.log('CUI MODULE ARCHITECTURE', 'info');
        term.log('', 'info');

        Object.entries(modules).forEach(([key, mod]) => {
          const status = CUI.getModule(key) ? '✓' : '○';
          term.log(`${status} ${mod.name}`, 'info');
          term.log(`   ${mod.description}`, 'info');
          term.log(`   Deps: [${mod.deps.join(', ')}]`, 'info');
          term.log(`   Provides: ${mod.provides.join(', ')}`, 'info');
          term.log('', 'info');
        });
      },

      meta(args, term) {
        term.log('', 'info');
        term.log('CUI META DOCUMENTATION SYSTEM', 'info');
        term.log('', 'info');
        term.log('The meta system provides self-documentation for the CUI framework.', 'info');
        term.log('', 'info');
        term.log('Available meta commands:', 'info');
        term.log('', 'info');

        Object.entries(CUI.Meta.commands).forEach(([name, cmd]) => {
          term.log(`  ${name}`, 'info');
          term.log(`    ${cmd.description}`, 'info');
          term.log(`    Syntax: ${cmd.syntax}`, 'info');
          if (cmd.examples.length > 0) {
            term.log(`    Examples: ${cmd.examples.join(', ')}`, 'info');
          }
          term.log('', 'info');
        });

        term.log('Type any command name to execute it.', 'info');
        term.log('', 'info');
      },

      mapping(args, term) {
        term.log('', 'info');
        term.log('CURRENT → SEMANTIC CLASS MAPPING', 'info');
        term.log('', 'info');

        const mappings = [
          ['.wrap', '.cui-app-container', 'Top-level wrapper'],
          ['header', '.cui-header', 'App header bar'],
          ['.title', '.cui-branding', 'App title/name'],
          ['.stats', '.cui-status-bar', 'Live metrics display'],
          ['.grid', '.cui-workspace', 'Main content grid'],
          ['.card:first-child', '.cui-view-primary', 'Left viewport'],
          ['.card:last-child', '.cui-view-secondary', 'Right viewport'],
          ['.fab-row', '.cui-fab-group', 'FAB cluster'],
          ['.fab.doc', '.cui-fab-docs', 'Documentation FAB'],
          ['.fab.sim', '.cui-fab-controls', 'Controls FAB'],
          ['.drawer', '.cui-drawer-controls', 'Controls drawer'],
          ['.docpanel', '.cui-drawer-docs', 'Docs drawer'],
          ['canvas#field', 'canvas.cui-canvas-field', 'Simulation canvas'],
          ['canvas#chart', 'canvas.cui-canvas-chart', 'Chart canvas']
        ];

        mappings.forEach(([current, semantic, purpose]) => {
          term.log(`${current}`, 'info');
          term.log(`  → ${semantic}`, 'info');
          term.log(`    ${purpose}`, 'info');
          term.log('', 'info');
        });
      }
    };

    // ========================================================================
    // Auto-register Meta Commands
    // ========================================================================

    CUI.Meta.registerCommands = function(terminal) {
      Object.entries(CUI.Meta.handlers).forEach(([name, handler]) => {
        terminal.register(name, handler);
      });

      CUI.log(`Meta commands registered: ${Object.keys(CUI.Meta.handlers).join(', ')}`);
    };

    CUI.log('Meta documentation module loaded');
  });

})();
