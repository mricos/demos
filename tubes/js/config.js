// TUBES.config - Configuration and Canvas References
(function(TUBES) {
    'use strict';

    TUBES.config = {
        canvas: {
            drawing: null,
            renderer: null
        },
        settings: {
            radius: 0.5,
            depth: 1.0,
            segments: 16,
            curvePoints: 100,
            smoothing: 0.5,
            interpolation: 'catmull-rom',
            color: '#e94560',
            metalness: 0.3,
            roughness: 0.4,
            singleWidthMode: true
        },
        debug: false,

        init() {
            this.canvas.drawing = document.getElementById('drawing-canvas');
            this.canvas.renderer = document.getElementById('renderer-canvas');
            console.log('TUBES.config: initialized');
        }
    };
})(window.TUBES);
