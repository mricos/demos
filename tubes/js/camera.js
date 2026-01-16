// TUBES.camera - 3D Camera with Orbit Controls
(function(TUBES) {
    'use strict';

    let camera = null;

    const controls = {
        isRotating: false,
        lastX: 0,
        lastY: 0,
        rotationX: 0,
        rotationY: 0,
        distance: 15,
        target: null
    };

    TUBES.camera = {
        get camera() { return camera; },
        get controls() { return controls; },

        init() {
            controls.target = new THREE.Vector3(0, 0, 0);

            camera = new THREE.PerspectiveCamera(
                75,
                window.innerWidth / window.innerHeight,
                0.1,
                1000
            );

            this.updatePosition();
            this.setupControls();

            console.log('TUBES.camera: initialized');
        },

        setupControls() {
            const canvas = TUBES.config.canvas.drawing;

            canvas.addEventListener('mousedown', (e) => {
                if (e.button === 2) { // Right click
                    controls.isRotating = true;
                    controls.lastX = e.clientX;
                    controls.lastY = e.clientY;
                    e.preventDefault();
                }
            });

            canvas.addEventListener('mousemove', (e) => {
                if (controls.isRotating) {
                    const deltaX = e.clientX - controls.lastX;
                    const deltaY = e.clientY - controls.lastY;

                    controls.rotationY += deltaX * 0.005;
                    controls.rotationX += deltaY * 0.005;

                    controls.rotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, controls.rotationX));

                    controls.lastX = e.clientX;
                    controls.lastY = e.clientY;

                    this.updatePosition();
                }
            });

            canvas.addEventListener('mouseup', (e) => {
                if (e.button === 2) {
                    controls.isRotating = false;
                }
            });

            canvas.addEventListener('wheel', (e) => {
                e.preventDefault();
                controls.distance += e.deltaY * 0.01;
                controls.distance = Math.max(5, Math.min(50, controls.distance));
                this.updatePosition();
            });

            canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        },

        updatePosition() {
            const x = controls.distance * Math.sin(controls.rotationY) * Math.cos(controls.rotationX);
            const y = controls.distance * Math.sin(controls.rotationX);
            const z = controls.distance * Math.cos(controls.rotationY) * Math.cos(controls.rotationX);

            camera.position.set(
                controls.target.x + x,
                controls.target.y + y,
                controls.target.z + z
            );

            camera.lookAt(controls.target);

            TUBES.events.publish('camera:moved', {
                position: camera.position,
                rotation: { x: controls.rotationX, y: controls.rotationY },
                distance: controls.distance
            });
        }
    };
})(window.TUBES);
