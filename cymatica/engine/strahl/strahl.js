/**
 * STRAHL — Vector beam engine
 *
 * A renderer-agnostic engine for 3D vector path visualization
 * with modulation synthesis. Named for the electron beam that
 * traces glowing paths on phosphor screens.
 *
 * Usage:
 *   const engine = Strahl.create({ width: 800, height: 600 });
 *   engine.scene.add(Strahl.pathNode({ paths: [...], x: 0, y: 0, z: 0 }));
 *   engine.mod.lfo.create({ id: 'wobble', waveform: 'sine', frequency: 0.5 });
 *   engine.mod.hub.route({ sourceId: 'wobble', target: 'nodes[0].rotation.y', min: -45, max: 45 });
 *   engine.start();
 */
(function(root) {
    'use strict';

    const VERSION = '0.1.0';

    /**
     * Create a new Strahl engine instance
     * @param {object} options
     * @param {number} options.width - Viewport width
     * @param {number} options.height - Viewport height
     * @returns {object} Engine instance
     */
    function create(options = {}) {
        const engine = {
            version: VERSION,
            state: null,
            scene: null,
            events: null,
            mod: null,
            loop: null,
            renderer: null
        };

        // Core systems — order matters
        engine.events = Strahl.Events.create();
        engine.state = Strahl.State.create(engine.events, options);
        engine.scene = Strahl.Scene.create();
        engine.mod = {
            mapper: Strahl.Mod.Mapper,
            lfo: Strahl.Mod.LFO.create(),
            asr: Strahl.Mod.ASR.create(),
            hub: Strahl.Mod.Hub.create(engine)
        };
        engine.loop = Strahl.Loop.create(engine);

        // Convenience
        engine.start = () => engine.loop.start();
        engine.stop = () => engine.loop.stop();
        engine.update = (dt) => engine.loop.tick(dt);

        return engine;
    }

    // Convenience node constructors
    function pathNode(config) {
        return Strahl.Scene.pathNode(config);
    }

    function groupNode(config) {
        return Strahl.Scene.groupNode(config);
    }

    // Global namespace
    const Strahl = {
        VERSION,
        create,
        pathNode,
        groupNode,
        // Subsystems attached by their own files:
        // Strahl.Math3D, Strahl.Scene, Strahl.State,
        // Strahl.Events, Strahl.Loop, Strahl.Renderer,
        // Strahl.Mod.Mapper, Strahl.Mod.LFO, Strahl.Mod.ASR, Strahl.Mod.Hub
        Mod: {}
    };

    root.Strahl = Strahl;

})(typeof window !== 'undefined' ? window : globalThis);
