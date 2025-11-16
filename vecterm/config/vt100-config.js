/**
 * VT100 Effects Configuration
 *
 * Single source of truth for all VT100 CRT effects.
 * Used by:
 * - Quick Settings panel (right sidebar)
 * - VT100 hamburger menu overlay
 * - Settings panel
 * - CLI commands (vt100.*)
 * - Tab completion sliders
 * - MIDI mappings
 */

/**
 * VT100 Effect Parameter Definitions
 *
 * Each effect has:
 * - id: Internal identifier
 * - label: Display name
 * - min/max/step: Slider range
 * - default: Default value
 * - unit: Display unit ('', 's', 'px', etc.)
 * - description: Help text
 * - cssVar: CSS variable name (for CLI panel)
 * - category: Grouping for UI organization
 */
export const VT100_EFFECTS = [
  {
    id: 'glow',
    label: 'Phosphor Glow',
    min: 0,
    max: 2,
    step: 0.05,
    default: 0.3,
    unit: '',
    description: 'Phosphor glow intensity around text and graphics',
    cssVar: '--vt100-border-glow',
    category: 'visual'
  },
  {
    id: 'scanlines',
    label: 'Scanlines',
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.15,
    unit: '',
    description: 'Horizontal scanline darkness',
    cssVar: '--vt100-scanline-intensity',
    category: 'visual'
  },
  {
    id: 'scanspeed',
    label: 'Scan Speed',
    min: 0.5,
    max: 30,
    step: 0.5,
    default: 8,
    unit: 's',
    description: 'Scanline animation scroll speed',
    cssVar: '--vt100-scanline-speed',
    category: 'animation'
  },
  {
    id: 'wave',
    label: 'Raster Wave',
    min: 0,
    max: 30,
    step: 0.5,
    default: 2,
    unit: 'px',
    description: 'Horizontal raster wave amplitude (flyback distortion)',
    cssVar: '--vt100-wave-amplitude',
    category: 'distortion'
  },
  {
    id: 'wavespeed',
    label: 'Wave Speed',
    min: 1,
    max: 10,
    step: 0.5,
    default: 3,
    unit: 's',
    description: 'Raster wave oscillation speed',
    cssVar: '--vt100-wave-speed',
    category: 'animation'
  },
  {
    id: 'waveopacity',
    label: 'Wave Opacity',
    min: 0,
    max: 1,
    step: 0.05,
    default: 0.6,
    unit: '',
    description: 'Raster wave overlay opacity intensity',
    cssVar: '--vt100-wave-opacity',
    category: 'visual'
  },
  {
    id: 'border',
    label: 'Border Glow',
    min: 0,
    max: 2,
    step: 0.05,
    default: 0.4,
    unit: '',
    description: 'Terminal border glow intensity',
    cssVar: '--vt100-glow-intensity',
    category: 'visual'
  },
  {
    id: 'glowspeed',
    label: 'Glow Pulse Speed',
    min: 1,
    max: 10,
    step: 0.5,
    default: 2,
    unit: 's',
    description: 'Glow pulse animation speed',
    cssVar: '--vt100-glow-speed',
    category: 'animation'
  },
  {
    id: 'borderwidth',
    label: 'Border Width',
    min: 0,
    max: 5,
    step: 0.5,
    default: 1,
    unit: 'px',
    description: 'Terminal border width',
    cssVar: '--vt100-border-width',
    category: 'visual'
  },
  {
    id: 'poweronspeed',
    label: 'Power-On Speed',
    min: 0.2,
    max: 3,
    step: 0.1,
    default: 0.8,
    unit: 's',
    description: 'CRT power-on animation duration',
    cssVar: '--vt100-poweron-duration',
    category: 'animation'
  },
  {
    id: 'poweroffspeed',
    label: 'Power-Off Speed',
    min: 0.2,
    max: 3,
    step: 0.1,
    default: 0.6,
    unit: 's',
    description: 'CRT power-off animation duration',
    cssVar: '--vt100-poweroff-duration',
    category: 'animation'
  }
];

/**
 * Quick Settings Default Effects
 * These effects appear in Quick Settings panel by default
 */
export const QUICK_SETTINGS_DEFAULTS = [
  'glow',
  'scanlines',
  'scanspeed',
  'wave',
  'border'
];

/**
 * VT100 Hamburger Menu Effects
 * These appear in the VT100 overlay (hamburger menu)
 * Subset for most commonly adjusted effects
 */
export const VT100_MENU_EFFECTS = [
  'glow',
  'scanlines',
  'wave'
];

/**
 * Effect Categories
 */
export const EFFECT_CATEGORIES = {
  visual: {
    label: 'Visual Effects',
    description: 'Glow and scanline appearance'
  },
  animation: {
    label: 'Animation',
    description: 'Speed and timing of effects'
  },
  distortion: {
    label: 'Distortion',
    description: 'CRT geometry and wave effects'
  }
};

/**
 * Get effect config by ID
 */
export function getEffectConfig(id) {
  return VT100_EFFECTS.find(effect => effect.id === id);
}

/**
 * Get effects by category
 */
export function getEffectsByCategory(category) {
  return VT100_EFFECTS.filter(effect => effect.category === category);
}

/**
 * Get all effect IDs
 */
export function getAllEffectIds() {
  return VT100_EFFECTS.map(effect => effect.id);
}

/**
 * Create effect config map (id -> config)
 */
export function createEffectConfigMap() {
  const map = {};
  VT100_EFFECTS.forEach(effect => {
    map[effect.id] = effect;
  });
  return map;
}

/**
 * Format effect value for display
 */
export function formatEffectValue(effectId, value) {
  const config = getEffectConfig(effectId);
  if (!config) return String(value);

  const formatted = config.unit === ''
    ? value.toFixed(2)
    : value.toFixed(config.step < 1 ? 2 : 0);

  return `${formatted}${config.unit}`;
}

/**
 * Create tab completion config from effect definitions
 * Used by cli/tab-completion.js
 */
export function createTabCompletionConfig() {
  const config = {};
  VT100_EFFECTS.forEach(effect => {
    config[`vt100.${effect.id}`] = {
      min: effect.min,
      max: effect.max,
      step: effect.step,
      default: effect.default,
      unit: effect.unit
    };
  });
  return config;
}

/**
 * Create MIDI mapping config from effect definitions
 * Used by modules/midi/midi-mapping.js
 */
export function createMidiMappingConfig() {
  const config = {};
  VT100_EFFECTS.forEach(effect => {
    config[`vt100.${effect.id}`] = {
      min: effect.min,
      max: effect.max,
      step: effect.step,
      unit: effect.unit,
      type: 'continuous'
    };
  });
  return config;
}
