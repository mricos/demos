// TUBES.renderer - THREE.js WebGL Renderer
(function(TUBES) {
    'use strict';

    let renderer = null;
    let width = 0;
    let height = 0;

    TUBES.renderer = {
        get renderer() { return renderer; },
        get width() { return width; },
        get height() { return height; },

        init() {
            width = window.innerWidth;
            height = window.innerHeight;

            renderer = new THREE.WebGLRenderer({
                canvas: TUBES.config.canvas.renderer,
                antialias: true,
                alpha: true
            });

            renderer.setSize(width, height);
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            renderer.outputEncoding = THREE.sRGBEncoding;
            renderer.toneMapping = THREE.ACESFilmicToneMapping;

            window.addEventListener('resize', () => this.resize());

            console.log('TUBES.renderer: initialized');
        },

        resize() {
            width = window.innerWidth;
            height = window.innerHeight;
            renderer.setSize(width, height);

            if (TUBES.camera && TUBES.camera.camera) {
                TUBES.camera.camera.aspect = width / height;
                TUBES.camera.camera.updateProjectionMatrix();
            }

            TUBES.config.canvas.drawing.width = width;
            TUBES.config.canvas.drawing.height = height;
        },

        render() {
            if (TUBES.scene && TUBES.camera) {
                renderer.render(TUBES.scene.scene, TUBES.camera.camera);
            }
        }
    };
})(window.TUBES);
