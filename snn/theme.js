/**
 * theme.js
 *
 * Shared color palette for neuron visualizations.
 * Provides consistent styling across all rendering components.
 */

export const theme = {
  // Core colors
  background: '#0c1219',

  // Biological elements
  neurotransmitter: '#29d398',
  calcium: '#4aa3ff',
  soma: '#4aa3ff',
  somaText: '#dbe7f3',
  sodium: '#ff6b6b',           // Red for Na⁺ and spikes
  potassium: '#4aa3ff',
  axon: '#1a2636',
  dendrite: '#1a2636',

  // LIF model elements
  threshold: '#f7b955',        // Yellow/gold for Vth
  membrane: '#4aa3ff',         // Blue for V (voltage/membrane potential)
  tau: '#9fb2c6',              // Gray-blue for τ

  // UI elements
  label: '#9fb2c6',
  infoBox: 'rgba(15, 21, 31, 0.85)',
  infoBoxBorder: 'rgba(74, 163, 255, 0.4)',

  // TTFS Binary detector colors
  bit0: '#9fb2c6',             // Gray (no spike)
  bit1: '#29d398',             // Green (early spike)
  bit0Uncertain: '#7a8fa3',    // Darker gray-blue (leaning toward 0)
  bit1Uncertain: '#52c9a0',    // Yellow-green (leaning toward 1)
  bitDetectorText: 'rgba(219, 231, 243, 0.9)'
};

export default theme;
