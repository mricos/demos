// TUBES.scene - THREE.js Scene Setup
(function(TUBES) {
    'use strict';

    let scene = null;

    TUBES.scene = {
        get scene() { return scene; },

        init() {
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x1a1a2e);

            // Ambient light
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            scene.add(ambientLight);

            // Primary directional light
            const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight1.position.set(5, 10, 5);
            directionalLight1.castShadow = true;
            scene.add(directionalLight1);

            // Accent directional light
            const directionalLight2 = new THREE.DirectionalLight(0xe94560, 0.3);
            directionalLight2.position.set(-5, 5, -5);
            scene.add(directionalLight2);

            // Grid helper
            const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
            scene.add(gridHelper);

            console.log('TUBES.scene: initialized');
        },

        add(object) {
            scene.add(object);
        },

        remove(object) {
            scene.remove(object);
        },

        clear() {
            if (TUBES.cylinder) {
                TUBES.cylinder.clear();
            }
        }
    };
})(window.TUBES);
