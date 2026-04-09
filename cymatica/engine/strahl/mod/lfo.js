/**
 * Strahl.Mod.LFO — Low Frequency Oscillator engine
 * Multiple waveforms, BPM sync, phase control.
 * No external dependencies.
 */
(function(Strahl) {
    'use strict';

    const Waveforms = {
        sine:    (phase) => (Math.sin(phase * Math.PI * 2) + 1) / 2,
        triangle:(phase) => { const t = phase % 1; return t < 0.5 ? t * 2 : 2 - t * 2; },
        square:  (phase) => (phase % 1) < 0.5 ? 1 : 0,
        saw:     (phase) => phase % 1,
        sawDown: (phase) => 1 - (phase % 1),
        random:  (phase, rt) => {
            const cycle = Math.floor(phase);
            if (cycle !== rt._lastCycle) { rt._lastCycle = cycle; rt._randomValue = Math.random(); }
            return rt._randomValue ?? 0.5;
        },
        noise:   () => Math.random()
    };

    function create() {
        const runtimes = {};
        const configs = {};
        let running = false;
        let _nextId = 1;

        return {
            /**
             * Register an LFO
             */
            add(options = {}) {
                const id = options.id || 'lfo_' + (_nextId++);
                const config = {
                    id,
                    enabled: options.enabled ?? true,
                    waveform: options.waveform || 'sine',
                    frequency: options.frequency ?? 1.0,
                    amplitude: options.amplitude ?? 1.0,
                    offset: options.offset ?? 0.5,
                    phase: options.phase ?? 0,
                    sync: options.sync ?? false,
                    syncDiv: options.syncDiv ?? 1
                };
                configs[id] = config;
                runtimes[id] = {
                    _currentPhase: (config.phase || 0) / 360,
                    _lastCycle: -1,
                    _randomValue: 0.5,
                    currentValue: 0.5
                };
                return config;
            },

            /**
             * Update all LFOs
             * @param {number} deltaMs - Frame delta in milliseconds
             * @param {number} [bpm] - Optional BPM for sync
             */
            update(deltaMs, bpm) {
                if (!running) return;
                const dt = deltaMs / 1000;

                for (const id in configs) {
                    const cfg = configs[id];
                    if (!cfg.enabled) continue;

                    const rt = runtimes[id];
                    if (!rt) continue;

                    let freq = cfg.frequency;
                    if (cfg.sync && bpm) freq = (bpm / 60) / cfg.syncDiv;

                    rt._currentPhase += freq * dt;

                    const fn = Waveforms[cfg.waveform] || Waveforms.sine;
                    let value = fn(rt._currentPhase, rt);
                    value = cfg.offset + (value - 0.5) * cfg.amplitude;
                    rt.currentValue = Math.max(0, Math.min(1, value));
                }
            },

            getValue(id)   { return runtimes[id]?.currentValue ?? 0.5; },
            getPhase(id)   { return runtimes[id] ? (runtimes[id]._currentPhase % 1) : 0; },
            getConfig(id)  { return configs[id] || null; },
            getAll()       { return configs; },

            configure(id, opts) {
                if (configs[id]) Object.assign(configs[id], opts);
            },

            remove(id) {
                delete configs[id];
                delete runtimes[id];
            },

            clear() {
                for (const k in configs) delete configs[k];
                for (const k in runtimes) delete runtimes[k];
            },

            start()       { running = true; },
            stop()        { running = false; },
            get running() { return running; },

            /** Available waveform names */
            get waveforms() { return Object.keys(Waveforms); }
        };
    }

    Strahl.Mod = Strahl.Mod || {};
    Strahl.Mod.LFO = { create, Waveforms };

})(window.Strahl);
