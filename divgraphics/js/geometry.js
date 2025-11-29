/**
 * DivGraphics - Geometry Registry
 * Central registry of all geometry types for scene serialization
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    // Geometry type registry
    // Maps type names to constructors for serialization/deserialization
    APP.Geometry = {
        // Populated after modules load
    };

    // Register a geometry type
    APP.registerGeometry = function(name, constructor) {
        APP.Geometry[name] = constructor;
    };

    // Initialize registry after all modules loaded
    APP.initGeometryRegistry = function() {
        if (APP.Cylinder) APP.Geometry.Cylinder = APP.Cylinder;
        if (APP.Curve) APP.Geometry.Curve = APP.Curve;
        // Add future geometry types here
    };

})(window.APP);
