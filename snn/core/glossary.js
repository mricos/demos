/**
 * glossary.js
 *
 * Central glossary for neuroscience and SNN terms.
 * Provides consistent terminology, colors, and LaTeX across all figures and documentation.
 */

// Global namespace
const SNN = window.SNN || {};
window.SNN = SNN;

SNN.GLOSSARY = {
  // ====================
  // Biological Components
  // ====================

  'dendrite': {
    symbol: 'D',
    latex: 'D',
    name: 'Dendrite',
    color: '#4aa3ff',
    definition: 'Branch-like structures that receive signals from other neurons via synapses.',
    category: 'structure',
    plural: 'dendrites'
  },

  'soma': {
    symbol: 'S',
    latex: 'S',
    name: 'Soma',
    color: '#4aa3ff',
    definition: 'Cell body containing the nucleus. Integrates incoming signals from dendrites.',
    category: 'structure',
    aliases: ['cell body']
  },

  'axon': {
    symbol: 'A',
    latex: 'A',
    name: 'Axon',
    color: '#9fb2c6',
    definition: 'Long fiber that transmits action potentials away from the soma to other neurons.',
    category: 'structure'
  },

  'axon-hillock': {
    symbol: 'AH',
    latex: '\\text{AH}',
    name: 'Axon Hillock',
    color: '#f7b955',
    definition: 'Region where axon originates from soma. Site of spike initiation (highest density of voltage-gated channels).',
    category: 'structure'
  },

  'synapse': {
    symbol: 'Syn',
    latex: '\\text{Syn}',
    name: 'Synapse',
    color: '#9fb2c6',
    definition: 'Junction between two neurons where neurotransmitters are released.',
    category: 'structure',
    plural: 'synapses'
  },

  // ====================
  // Ions & Channels
  // ====================

  'sodium': {
    symbol: 'Na⁺',
    latex: '\\text{Na}^+',
    name: 'Sodium Ion',
    color: '#ff6b6b',
    definition: 'Positively charged ion. Influx depolarizes membrane during action potential.',
    category: 'ion'
  },

  'potassium': {
    symbol: 'K⁺',
    latex: '\\text{K}^+',
    name: 'Potassium Ion',
    color: '#4aa3ff',
    definition: 'Positively charged ion. Efflux repolarizes membrane after spike.',
    category: 'ion'
  },

  'calcium': {
    symbol: 'Ca²⁺',
    latex: '\\text{Ca}^{2+}',
    name: 'Calcium Ion',
    color: '#29d398',
    definition: 'Divalent cation. Triggers neurotransmitter release and modulates plasticity.',
    category: 'ion'
  },

  'neurotransmitter': {
    symbol: 'NT',
    latex: '\\text{NT}',
    name: 'Neurotransmitter',
    color: '#f7b955',
    definition: 'Chemical messenger released at synapses to transmit signals between neurons.',
    category: 'chemical',
    plural: 'neurotransmitters'
  },

  // ====================
  // Electrical Properties
  // ====================

  'membrane': {
    symbol: 'V',
    latex: 'V(t)',
    name: 'Membrane Potential',
    unit: 'mV',
    color: '#4aa3ff',
    definition: 'Voltage difference across the neuron membrane. Integrates inputs over time.',
    category: 'electrical'
  },

  'threshold': {
    symbol: 'Vth',
    latex: 'V_{\\text{th}}',
    name: 'Threshold Voltage',
    unit: 'mV',
    color: '#f7b955',
    definition: 'Critical voltage at which an action potential is triggered. Typically -55 mV to -50 mV.',
    category: 'electrical'
  },

  'resting-potential': {
    symbol: 'Vrest',
    latex: 'V_{\\text{rest}}',
    name: 'Resting Potential',
    unit: 'mV',
    color: '#9fb2c6',
    definition: 'Membrane potential when neuron is at rest, typically -70 mV.',
    category: 'electrical'
  },

  'spike': {
    symbol: 'AP',
    latex: '\\text{AP}',
    name: 'Action Potential',
    unit: 'mV',
    color: '#ff6b6b',
    definition: 'Brief electrical pulse (~100 mV, ~2 ms) that propagates along axon. Also called "spike".',
    category: 'electrical',
    aliases: ['action potential', 'action potentials', 'spikes']
  },

  'depolarization': {
    symbol: 'Δ+V',
    latex: '\\Delta^+ V',
    name: 'Depolarization',
    color: '#ff6b6b',
    definition: 'Increase in membrane potential (becoming less negative). Moves toward threshold.',
    category: 'electrical'
  },

  'repolarization': {
    symbol: 'Δ-V',
    latex: '\\Delta^- V',
    name: 'Repolarization',
    color: '#4aa3ff',
    definition: 'Decrease in membrane potential (becoming more negative). Returns to resting state.',
    category: 'electrical'
  },

  // ====================
  // Model Parameters
  // ====================

  'tau': {
    symbol: 'τ',
    latex: '\\tau',
    name: 'Time Constant',
    unit: 'ms',
    color: '#f7b955',
    definition: 'Membrane time constant. Determines how quickly voltage decays. τ = RC (resistance × capacitance).',
    category: 'parameter'
  },

  'tau-m': {
    symbol: 'τm',
    latex: '\\tau_m',
    name: 'Membrane Time Constant',
    unit: 'ms',
    color: '#f7b955',
    definition: 'Time constant for passive membrane decay. Typically 10-30 ms.',
    category: 'parameter'
  },

  'input-current': {
    symbol: 'I(t)',
    latex: 'I(t)',
    name: 'Input Current',
    unit: 'pA',
    color: '#29d398',
    definition: 'External current injected into neuron or received from synapses.',
    category: 'parameter'
  },

  'leak': {
    symbol: 'gleak',
    latex: 'g_{\\text{leak}}',
    name: 'Leak Conductance',
    unit: 'nS',
    color: '#9fb2c6',
    definition: 'Passive membrane conductance that causes voltage decay toward resting potential.',
    category: 'parameter'
  },

  'gamma': {
    symbol: 'γ',
    latex: '\\gamma',
    name: 'Recovery Rate',
    unit: '1/s',
    color: '#29d398',
    definition: 'Rate at which neurons recover. In epidemic models, rate at which infected recover.',
    category: 'parameter'
  },

  // ====================
  // Spike Coding
  // ====================

  'spike-train': {
    symbol: 'S(t)',
    latex: 'S(t)',
    name: 'Spike Train',
    color: '#ff6b6b',
    definition: 'Temporal sequence of action potentials. Encodes information in timing patterns.',
    category: 'coding'
  },

  'firing-rate': {
    symbol: 'r',
    latex: 'r(t)',
    name: 'Firing Rate',
    unit: 'Hz',
    color: '#f7b955',
    definition: 'Number of spikes per unit time. Rate coding uses spike frequency to encode information.',
    category: 'coding'
  },

  'ttfs': {
    symbol: 'tspike',
    latex: 't_{\\text{spike}}',
    name: 'Time to First Spike',
    unit: 'ms',
    color: '#29d398',
    definition: 'Time of first spike relative to stimulus onset. Used for temporal coding.',
    category: 'coding'
  },

  'isi': {
    symbol: 'ISI',
    latex: '\\text{ISI}',
    name: 'Inter-Spike Interval',
    unit: 'ms',
    color: '#9fb2c6',
    definition: 'Time between consecutive spikes. Inverse of instantaneous firing rate.',
    category: 'coding'
  },

  'refractory-period': {
    symbol: 'tref',
    latex: 't_{\\text{ref}}',
    name: 'Refractory Period',
    unit: 'ms',
    color: '#ff6b6b',
    definition: 'Brief period after spike during which neuron cannot fire again. Typically 1-5 ms.',
    category: 'temporal'
  },

  // ====================
  // Learning & Plasticity
  // ====================

  'stdp': {
    symbol: 'STDP',
    latex: '\\text{STDP}',
    name: 'Spike-Timing-Dependent Plasticity',
    color: '#29d398',
    definition: 'Learning rule where synaptic strength changes based on relative timing of pre/post spikes.',
    category: 'learning'
  },

  'weight': {
    symbol: 'w',
    latex: 'w_{ij}',
    name: 'Synaptic Weight',
    color: '#4aa3ff',
    definition: 'Strength of connection between neurons i and j. Modified during learning.',
    category: 'learning'
  },

  'learning-rate': {
    symbol: 'η',
    latex: '\\eta',
    name: 'Learning Rate',
    color: '#f7b955',
    definition: 'Step size for weight updates during training. Controls speed of learning.',
    category: 'learning'
  },

  // ====================
  // Models
  // ====================

  'lif': {
    symbol: 'LIF',
    latex: '\\text{LIF}',
    name: 'Leaky Integrate-and-Fire',
    color: '#4aa3ff',
    definition: 'Simplified neuron model: integrates input, leaks toward rest, fires when reaching threshold.',
    category: 'model'
  },

  'lif-equation': {
    symbol: 'dV/dt',
    latex: '\\tau_m \\frac{dV}{dt} = -(V - V_{\\text{rest}}) + R I(t)',
    name: 'LIF Differential Equation',
    color: '#4aa3ff',
    definition: 'Governs membrane potential dynamics in leaky integrate-and-fire model.',
    category: 'model'
  }
};

/**
 * Get term by ID or alias
 */
SNN.getTerm = function(id) {
  const term = SNN.GLOSSARY[id];
  if (term) return term;

  // Search aliases
  for (const [key, value] of Object.entries(SNN.GLOSSARY)) {
    if (value.aliases?.includes(id)) {
      return value;
    }
  }

  return null;
}

/**
 * Get all terms in a category
 */
SNN.getTermsByCategory = function(category) {
  return Object.entries(SNN.GLOSSARY)
    .filter(([_, term]) => term.category === category)
    .reduce((acc, [id, term]) => ({ ...acc, [id]: term }), {});
}

/**
 * Get term color (for consistent styling)
 */
SNN.getTermColor = function(termId) {
  const term = SNN.getTerm(termId);
  return term?.color || '#9fb2c6';
}

/**
 * Get term LaTeX
 */
SNN.getTermLatex = function(termId) {
  const term = SNN.getTerm(termId);
  return term?.latex || termId;
}
