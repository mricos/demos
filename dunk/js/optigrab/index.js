/**
 * Optigrab - Webcam-based detection system with plugin brain modules
 *
 * Modular architecture:
 *   - core.js       : Webcam capture, frame delivery, brain orchestration
 *   - brains.js     : FlashBrain, RegionBrain, ColorBrain, MotionBrain
 *   - compositor.js : Layer management and blending
 *   - marker.js     : Detection marker with PDF visualization
 *   - calibrator.js : LED position detection & virtual controller builder
 *
 * Usage (browser):
 *   <script src="js/optigrab/index.js"></script>
 *   const og = Optigrab.create();
 *   og.mount('#container');
 *   og.addBrain('flash', Optigrab.FlashBrain.create());
 *   og.start();
 *
 * Usage (modules):
 *   import { OptigrabCore, FlashBrain } from './optigrab/index.js';
 */

// For browser globals, load dependencies
(function(global) {
  'use strict';

  // Check if we're in a module context
  const isModule = typeof module !== 'undefined' && module.exports;

  // In browser, these will be loaded via script tags
  // In Node/bundler, they'd be required

  const Optigrab = {
    // Factory
    create(config) {
      if (typeof OptigrabCore !== 'undefined') {
        return OptigrabCore.create(config);
      }
      throw new Error('OptigrabCore not loaded. Include core.js first.');
    },

    // Re-export components
    get Core() {
      return typeof OptigrabCore !== 'undefined' ? OptigrabCore : null;
    },

    get Compositor() {
      return typeof Compositor !== 'undefined' ? Compositor : null;
    },

    get DetectionMarker() {
      return typeof DetectionMarker !== 'undefined' ? DetectionMarker : null;
    },

    get Calibrator() {
      return typeof OptigrabCalibrator !== 'undefined' ? OptigrabCalibrator : null;
    },

    // Brains
    get FlashBrain() {
      return typeof Brains !== 'undefined' ? Brains.FlashBrain :
             typeof FlashBrain !== 'undefined' ? FlashBrain : null;
    },

    get RegionBrain() {
      return typeof Brains !== 'undefined' ? Brains.RegionBrain :
             typeof RegionBrain !== 'undefined' ? RegionBrain : null;
    },

    get ColorBrain() {
      return typeof Brains !== 'undefined' ? Brains.ColorBrain :
             typeof ColorBrain !== 'undefined' ? ColorBrain : null;
    },

    get MotionBrain() {
      return typeof Brains !== 'undefined' ? Brains.MotionBrain :
             typeof MotionBrain !== 'undefined' ? MotionBrain : null;
    },

    // Version
    version: '2.0.0'
  };

  // Export
  if (isModule) {
    module.exports = Optigrab;
  } else {
    global.Optigrab = Optigrab;
  }

})(typeof window !== 'undefined' ? window : this);
