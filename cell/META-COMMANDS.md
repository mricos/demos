# CUI Meta Commands Guide

## What is Meta Mode?

The CUI framework now includes **self-documentation** through the terminal. Type meta commands to explore the framework's architecture, semantic naming conventions, and module dependencies without leaving the app.

---

## Quick Start

1. Open `test.html` in your browser
2. Look at the terminal in the left card
3. Type these commands:

```bash
$ help              # See all available commands
$ layout            # Show CUI layout architecture
$ semantics         # View semantic naming system
$ architecture      # Display module dependencies
$ meta              # Learn about meta documentation
```

---

## Available Meta Commands

### `layout [view]`

Display ASCII architecture diagrams of the CUI framework.

**Usage:**
```bash
$ layout              # Default: overview diagram
$ layout overview     # Main layout with left/right viewports
$ layout zstack       # Z-index stacking (FABs, drawers, panels)
$ layout hierarchy    # Semantic class hierarchy tree
```

**Example Output:**
```
┌─────────────────────────────────────────────────────────┐
│                    HEADER BAR                           │
│  ┌──────────┐                    ┌────────────────┐    │
│  │  .title  │                    │    .stats      │    │
│  └──────────┘                    └────────────────┘    │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┬─────────────────────────────┐     │
│  │  PRIMARY VIEW   │  SECONDARY VIEW             │     │
│  │  (left)         │  (right)                    │     │
│  └─────────────────┴─────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

---

### `semantics [area]`

View semantic naming conventions for CUI components.

**Usage:**
```bash
$ semantics           # Show all areas (left, right, overlay)
$ semantics left      # Left viewport semantic names
$ semantics right     # Right viewport semantic names
$ semantics overlay   # Overlay stack semantic names
```

**Example Output:**
```
═══ LEFT SEMANTICS ═══

Purpose:  Main simulation/field visualization
Priority: Primary user focus
Content:  Agent field, particle systems, spatial data

Current:  .card (first-child)
Proposed:
  • .cui-view-primary
  • .cui-simulation-view
  • .cui-field-canvas
  • .cui-workspace-main
```

---

### `architecture`

Display module architecture and dependency graph.

**Usage:**
```bash
$ architecture
```

**Example Output:**
```
═══ CUI MODULE ARCHITECTURE ═══

✓ cui-core.js
   Foundation layer - namespace, state, events, utilities
   Deps: []
   Provides: CUI namespace, State, Events, DOM utils, Utils

✓ cui-lifecycle.js
   IIFE module registration and dependency resolution
   Deps: [core]
   Provides: CUI.register(), CUI.ready(), Hot reload

✓ cui-tabs.js
   Generic tab and sub-tab system
   Deps: [core, lifecycle]
   Provides: CUI.Tabs, Multi-level tabs
```

---

### `mapping`

Show current class names → proposed semantic class names.

**Usage:**
```bash
$ mapping
```

**Example Output:**
```
═══ CURRENT → SEMANTIC CLASS MAPPING ═══

.wrap
  → .cui-app-container
    Top-level wrapper

.card:first-child
  → .cui-view-primary
    Left viewport

.fab-row
  → .cui-fab-group
    FAB cluster
```

---

### `meta`

Learn about the meta documentation system itself.

**Usage:**
```bash
$ meta
```

Shows information about the meta system, available commands, and how to use them.

---

## Enhanced Help System

The `help` command now shows categorized commands with descriptions:

```bash
$ help                  # List all commands by category
$ help layout           # Detailed help for specific command
$ help semantics        # Show syntax, examples, description
```

**Output:**
```
Available commands:

Meta Commands (framework documentation):
  architecture     - Display module architecture and dependencies
  layout           - Display CUI layout architecture diagrams
  mapping          - Show current → semantic class mappings
  meta             - Show meta documentation system info
  semantics        - Show semantic naming for CUI components

Built-in Commands:
  help
  clear
  history
  echo
  version
  modules

Custom Commands:
  test
  hello
  theme

Type "help <command>" for detailed info on a specific command.
```

---

## Data-Driven Command System

Commands are now configured with metadata in `CUI.Meta.commands`:

```javascript
CUI.Meta.commands = {
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
  // ... more commands
}
```

This enables:
- ✅ Contextual help (`help layout`)
- ✅ Command categorization
- ✅ Auto-generated documentation
- ✅ Consistent command metadata

---

## Programmatic Access

Access meta data from JavaScript:

```javascript
// ASCII diagrams
CUI.Meta.layouts.overview
CUI.Meta.layouts.zstack
CUI.Meta.layouts.hierarchy

// Semantic naming info
CUI.Meta.semantics.leftSide
CUI.Meta.semantics.rightSide
CUI.Meta.semantics.overlay

// Module architecture
CUI.Meta.modules.core
CUI.Meta.modules.terminal
CUI.Meta.modules.meta

// Command definitions
CUI.Meta.commands.layout
CUI.Meta.commands.semantics
```

---

## Use Cases

### 1. **Learning the Framework**
```bash
$ layout              # See how CUI is structured
$ architecture        # Understand module dependencies
$ help layout         # Learn command syntax
```

### 2. **Planning Refactoring**
```bash
$ semantics           # Review proposed semantic names
$ mapping             # See current → semantic mappings
$ semantics left      # Focus on specific area
```

### 3. **Debugging Layout Issues**
```bash
$ layout zstack       # Check z-index layers
$ layout hierarchy    # Verify class hierarchy
```

### 4. **Documenting Your Work**
```bash
$ architecture        # Copy module structure for docs
$ layout overview     # Include ASCII diagram in README
```

---

## Adding Custom Meta Commands

You can extend the meta system with your own commands:

```javascript
// Add command metadata
CUI.Meta.commands.mycommand = {
  syntax: 'mycommand <arg>',
  description: 'My custom command',
  examples: ['mycommand foo', 'mycommand bar']
};

// Add command handler
CUI.Meta.handlers.mycommand = function(args, term) {
  term.log('My command executed!', 'success');
  term.log(`Args: ${args.join(', ')}`, 'info');
};

// Re-register with terminal
CUI.Meta.registerCommands(terminal);
```

---

## Best Practices

1. **Explore First:** Use `help` to see what's available
2. **Get Details:** Use `help <command>` for syntax and examples
3. **Start Simple:** Try `layout` and `semantics` first
4. **Use Filters:** Commands support arguments (e.g., `layout zstack`)
5. **Copy Output:** ASCII diagrams can be copied from terminal

---

## Terminal Tips

- **Arrow Up/Down:** Navigate command history
- **Tab:** (Future) Auto-complete commands
- **Clear:** Type `clear` to reset terminal
- **History:** Type `history` to see past commands

---

## What Makes This Special?

**Self-Documenting Framework:**
- Documentation lives *inside* the framework
- No need to switch to external docs
- Always up-to-date with code
- Interactive exploration

**Data-Driven:**
- Commands configured with metadata
- Easy to extend and customize
- Consistent help system
- Generated documentation

**Hot-Reloadable:**
- Update `cui-meta.js`
- Paste in console
- New commands available instantly
- No page reload needed

---

## Next Steps

Try these commands in `test.html`:

```bash
$ help              # See all commands
$ layout            # View main architecture
$ layout zstack     # See overlay stacking
$ semantics left    # Check left viewport naming
$ architecture      # Review module deps
$ mapping           # See semantic mappings
$ meta              # Learn about meta system
```

**The framework documents itself!** 🎉
