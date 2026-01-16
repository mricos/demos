// TUBES.app - Animation Loop Driver
(function(TUBES) {
    'use strict';

    let isRunning = false;
    let lastTime = 0;
    let fps = 0;
    let frameCount = 0;
    let fpsTime = 0;

    TUBES.app = {
        get isRunning() { return isRunning; },
        get fps() { return fps; },

        init() {
            this.start();
            console.log('TUBES.app: initialized');
        },

        start() {
            if (isRunning) return;
            isRunning = true;
            lastTime = performance.now();
            this.loop();
        },

        stop() {
            isRunning = false;
        },

        loop() {
            if (!isRunning) return;

            const now = performance.now();
            const delta = (now - lastTime) / 1000;
            lastTime = now;

            // FPS calculation
            frameCount++;
            fpsTime += delta;
            if (fpsTime >= 1) {
                fps = Math.round(frameCount / fpsTime);
                frameCount = 0;
                fpsTime = 0;
            }

            // Update and render
            this.update(delta);
            this.render();

            requestAnimationFrame(() => this.loop());
        },

        update(delta) {
            // Animation updates go here
            TUBES.events.publish('app:update', { delta, fps });
        },

        render() {
            if (TUBES.renderer) {
                TUBES.renderer.render();
            }
        }
    };
})(window.TUBES);
