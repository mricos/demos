/**
 * Cann Presets - Example configurations
 *
 * Presets demonstrate different aspects of Neural CA:
 * - Classic CA rules (Game of Life, etc.)
 * - Neural pattern emergence
 * - Markovian vs SSM evolution
 * - Local vs Global loss balance
 */

export const presets = {
  /**
   * Classic Conway's Game of Life
   * Demonstrates rule-based evolution
   */
  gameOfLife: {
    name: "Game of Life",
    description: "Classic Conway's Game of Life with neural encoding",
    width: 64,
    height: 64,
    channels: 1,
    mode: 'markovian',
    scale: 1,
    perception: {
      radius: 1,
      type: 'moore',
      includeCenter: true
    },
    evolver: {
      hiddenDim: 32,
      activation: 'relu',
      useResidual: false
    },
    loss: {
      localWeight: 0.9,
      globalWeight: 0.1,
      local: {
        type: 'rule',
        rule: { birth: [3], survive: [2, 3] }
      },
      global: {
        type: 'stability'
      }
    },
    init: 'random'
  },

  /**
   * Neural Pattern Emergence
   * Random network weights produce emergent patterns
   */
  emergence: {
    name: "Emergence",
    description: "Neural network weights drive pattern emergence",
    width: 64,
    height: 64,
    channels: 4,
    mode: 'markovian',
    scale: 1,
    perception: {
      radius: 1,
      type: 'sobel',
      includeCenter: true
    },
    evolver: {
      hiddenDim: 64,
      activation: 'tanh',
      useResidual: true,
      updateRate: 0.5
    },
    loss: {
      localWeight: 0.5,
      globalWeight: 0.5,
      local: { type: 'smoothness' },
      global: { type: 'complexity', target: 0.5 }
    },
    init: 'center'
  },

  /**
   * State Space Model with Memory
   * Uses hidden state for temporal patterns
   */
  temporal: {
    name: "Temporal Memory",
    description: "SSM evolution with hidden state memory",
    width: 48,
    height: 48,
    channels: 4,
    mode: 'ssm',
    scale: 1,
    historyDepth: 8,
    perception: {
      radius: 1,
      type: 'moore',
      includeCenter: true
    },
    evolver: {
      hiddenDim: 64,
      activation: 'tanh',
      gateType: 'gru',
      useAttention: false
    },
    loss: {
      localWeight: 0.3,
      globalWeight: 0.7,
      local: { type: 'gradient' },
      global: { type: 'periodicity', target: 0.5 }
    },
    init: 'noise'
  },

  /**
   * Self-Organizing Patterns
   * Global constraints guide local dynamics
   */
  selfOrganize: {
    name: "Self-Organization",
    description: "Global constraints shape emergent structures",
    width: 64,
    height: 64,
    channels: 4,
    mode: 'markovian',
    scale: 1,
    perception: {
      radius: 2,
      type: 'moore',
      includeCenter: true
    },
    evolver: {
      hiddenDim: 128,
      activation: 'gelu',
      useResidual: true
    },
    loss: {
      localWeight: 0.3,
      globalWeight: 0.7,
      local: { type: 'symmetry' },
      global: { type: 'distribution' }
    },
    init: 'random'
  },

  /**
   * Wave Patterns
   * Oscillating patterns through SSM
   */
  waves: {
    name: "Wave Dynamics",
    description: "Oscillating wave patterns with temporal memory",
    width: 64,
    height: 64,
    channels: 4,
    mode: 'ssm',
    scale: 1,
    historyDepth: 4,
    perception: {
      radius: 1,
      type: 'vonneumann',
      includeCenter: true
    },
    evolver: {
      hiddenDim: 48,
      activation: 'sin',
      gateType: 'simple'
    },
    loss: {
      localWeight: 0.5,
      globalWeight: 0.5,
      local: { type: 'smoothness' },
      global: { type: 'entropy', target: 0.6 }
    },
    init: 'center'
  },

  /**
   * High Resolution (scale demonstration)
   * Shows scale-aware rendering
   */
  highRes: {
    name: "High Resolution",
    description: "Scale-aware multi-resolution patterns",
    width: 32,
    height: 32,
    channels: 4,
    mode: 'markovian',
    scale: 4, // Effective 128x128
    perception: {
      radius: 1,
      type: 'moore',
      includeCenter: true
    },
    evolver: {
      hiddenDim: 64,
      activation: 'relu',
      useResidual: true
    },
    loss: {
      localWeight: 0.6,
      globalWeight: 0.4,
      local: { type: 'edge' },
      global: { type: 'density', target: 0.3 }
    },
    init: 'noise'
  },

  /**
   * Minimal Configuration
   * Simplest possible setup
   */
  minimal: {
    name: "Minimal",
    description: "Simplest configuration for testing",
    width: 32,
    height: 32,
    channels: 1,
    mode: 'markovian'
  },

  /**
   * Reaction-Diffusion Style
   * Gray-Scott like patterns
   */
  reactionDiffusion: {
    name: "Reaction-Diffusion",
    description: "Turing pattern-like emergent structures",
    width: 64,
    height: 64,
    channels: 4,
    mode: 'markovian',
    scale: 1,
    perception: {
      radius: 1,
      type: 'moore',
      includeCenter: true,
      customKernel: [
        [0.05, 0.2, 0.05],
        [0.2, -1.0, 0.2],
        [0.05, 0.2, 0.05]
      ]
    },
    evolver: {
      hiddenDim: 32,
      activation: 'tanh',
      useResidual: true
    },
    loss: {
      localWeight: 0.4,
      globalWeight: 0.6,
      local: { type: 'smoothness' },
      global: { type: 'complexity', target: 0.6 }
    },
    init: 'noise'
  },

  /**
   * Attention-based Evolution
   * Uses temporal attention for long-range dependencies
   */
  attention: {
    name: "Temporal Attention",
    description: "Uses attention mechanism over history",
    width: 48,
    height: 48,
    channels: 4,
    mode: 'ssm',
    scale: 1,
    historyDepth: 8,
    perception: {
      radius: 1,
      type: 'sobel',
      includeCenter: true
    },
    evolver: {
      hiddenDim: 64,
      activation: 'gelu',
      gateType: 'gru',
      useAttention: true
    },
    loss: {
      localWeight: 0.4,
      globalWeight: 0.6,
      local: { type: 'gradient' },
      global: { type: 'stability' }
    },
    init: 'center'
  }
};

/**
 * Get preset by name
 */
export function getPreset(name) {
  return presets[name] || null;
}

/**
 * List all preset names
 */
export function listPresets() {
  return Object.keys(presets);
}

/**
 * Create Cann instance from preset
 */
export async function fromPreset(name, Cann) {
  const preset = getPreset(name);
  if (!preset) {
    throw new Error(`Unknown preset: ${name}`);
  }

  const cann = new Cann(preset);
  cann.seed(preset.init || 'random');
  return cann;
}
