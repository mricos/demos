/**
 * Strahl.Loop — Update/render loop with fixed timestep option
 *
 * Separates update (state, mod, physics) from render (DOM).
 * Calls mod system each tick automatically.
 */
(function(Strahl) {
    'use strict';

    /**
     * Create a loop bound to an engine instance
     * @param {object} engine - Strahl engine instance
     * @returns {object} Loop API
     */
    function create(engine) {
        let running = false;
        let lastTime = 0;
        let frameCount = 0;
        let fpsTime = 0;
        let fps = 60;
        let rafId = null;

        // User-registered update and render callbacks
        const updateCallbacks = [];
        const renderCallbacks = [];

        /**
         * Single tick — update then render
         * @param {number} dt - Delta time in seconds
         */
        function tick(dt) {
            // Modulation system
            const dtMs = dt * 1000;
            if (engine.mod) {
                engine.mod.lfo.update(dtMs);
                engine.mod.asr.update(dtMs);
                engine.mod.hub.update(dtMs);
            }

            // User update callbacks
            for (const fn of updateCallbacks) {
                fn(dt, engine);
            }

            // User render callbacks
            for (const fn of renderCallbacks) {
                fn(dt, engine);
            }

            // Emit frame event
            if (engine.events) {
                engine.events.emit(Strahl.Events.Names.FRAME, { dt, fps });
            }
        }

        /**
         * RAF callback
         */
        function frame(time) {
            if (!running) return;

            const dt = lastTime ? (time - lastTime) / 1000 : 1 / 60;
            lastTime = time;

            // FPS tracking
            frameCount++;
            fpsTime += dt;
            if (fpsTime >= 1) {
                fps = frameCount / fpsTime;
                frameCount = 0;
                fpsTime = 0;
            }

            tick(Math.min(dt, 0.1)); // Cap delta to avoid spiral of death

            rafId = requestAnimationFrame(frame);
        }

        return {
            /**
             * Start the animation loop
             */
            start() {
                if (running) return;
                running = true;
                lastTime = 0;
                rafId = requestAnimationFrame(frame);
                if (engine.events) {
                    engine.events.emit(Strahl.Events.Names.START);
                }
            },

            /**
             * Stop the animation loop
             */
            stop() {
                running = false;
                if (rafId) cancelAnimationFrame(rafId);
                rafId = null;
                if (engine.events) {
                    engine.events.emit(Strahl.Events.Names.STOP);
                }
            },

            /**
             * Manual tick (for headless or test use)
             */
            tick,

            /**
             * Register an update callback (called before render)
             * @param {function} fn - (dt, engine) => void
             */
            onUpdate(fn) {
                updateCallbacks.push(fn);
            },

            /**
             * Register a render callback (called after update)
             * @param {function} fn - (dt, engine) => void
             */
            onRender(fn) {
                renderCallbacks.push(fn);
            },

            /**
             * Current FPS
             */
            get fps() { return fps; },

            /**
             * Is loop running?
             */
            get running() { return running; }
        };
    }

    Strahl.Loop = { create };

})(window.Strahl);
