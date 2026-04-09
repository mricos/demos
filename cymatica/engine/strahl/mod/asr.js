/**
 * Strahl.Mod.ASR — Attack-Sustain-Release envelope generator
 * Impulse-triggered envelopes for modulation.
 */
(function(Strahl) {
    'use strict';

    const Phase = { IDLE: 0, ATTACK: 1, SUSTAIN: 2, RELEASE: 3 };

    function create() {
        const runtimes = {};
        const configs = {};
        let _nextId = 1;

        return {
            Phase,

            /**
             * Register an ASR envelope
             */
            add(options = {}) {
                const id = options.id || 'asr_' + (_nextId++);
                const config = {
                    id,
                    enabled: options.enabled ?? true,
                    attack: options.attack ?? 0.1,
                    sustain: options.sustain ?? 1.0,
                    release: options.release ?? 0.3,
                    holdTime: options.holdTime ?? 0,
                    curve: options.curve ?? 'linear',
                    triggerChannel: options.triggerChannel || null
                };
                configs[id] = config;
                runtimes[id] = {
                    phase: Phase.IDLE, value: 0, time: 0,
                    sustainStart: 0, startValue: 0, releaseStart: 0
                };
                return config;
            },

            /**
             * Trigger note-on or note-off
             */
            trigger(id, pressed) {
                const cfg = configs[id];
                if (!cfg?.enabled) return;

                let rt = runtimes[id];
                if (!rt) {
                    rt = runtimes[id] = {
                        phase: Phase.IDLE, value: 0, time: 0,
                        sustainStart: 0, startValue: 0, releaseStart: 0
                    };
                }

                if (pressed) {
                    rt.phase = Phase.ATTACK;
                    rt.time = 0;
                    rt.startValue = rt.value;
                } else if (rt.phase === Phase.ATTACK || rt.phase === Phase.SUSTAIN) {
                    rt.phase = Phase.RELEASE;
                    rt.time = 0;
                    rt.releaseStart = rt.value;
                }
            },

            /**
             * Update all envelopes
             * @param {number} deltaMs
             */
            update(deltaMs) {
                const dt = deltaMs / 1000;

                for (const id in configs) {
                    const cfg = configs[id];
                    if (!cfg.enabled) continue;

                    const rt = runtimes[id];
                    if (!rt) continue;

                    rt.time += dt;

                    switch (rt.phase) {
                        case Phase.ATTACK:
                            if (cfg.attack <= 0) {
                                rt.value = 1;
                                rt.phase = Phase.SUSTAIN;
                                rt.sustainStart = performance.now();
                            } else {
                                const t = rt.time / cfg.attack;
                                rt.value = cfg.curve === 'exponential'
                                    ? rt.startValue + (1 - rt.startValue) * (1 - Math.exp(-t * 5))
                                    : rt.startValue + (1 - rt.startValue) * Math.min(1, t);
                                if (rt.value >= 0.999) {
                                    rt.value = 1;
                                    rt.phase = Phase.SUSTAIN;
                                    rt.sustainStart = performance.now();
                                }
                            }
                            break;

                        case Phase.SUSTAIN:
                            rt.value = cfg.sustain;
                            if (cfg.holdTime > 0) {
                                const held = (performance.now() - rt.sustainStart) / 1000;
                                if (held >= cfg.holdTime) {
                                    rt.phase = Phase.RELEASE;
                                    rt.time = 0;
                                    rt.releaseStart = rt.value;
                                }
                            }
                            break;

                        case Phase.RELEASE:
                            if (cfg.release <= 0) {
                                rt.value = 0;
                                rt.phase = Phase.IDLE;
                            } else {
                                const t = rt.time / cfg.release;
                                rt.value = cfg.curve === 'exponential'
                                    ? rt.releaseStart * Math.exp(-t * 5)
                                    : rt.releaseStart * Math.max(0, 1 - t);
                                if (rt.value <= 0.001) {
                                    rt.value = 0;
                                    rt.phase = Phase.IDLE;
                                }
                            }
                            break;

                        default:
                            rt.value = 0;
                    }
                }
            },

            getValue(id)  { return runtimes[id]?.value ?? 0; },
            getPhase(id)  { return runtimes[id]?.phase ?? Phase.IDLE; },
            isActive(id)  { return this.getPhase(id) !== Phase.IDLE; },
            getConfig(id) { return configs[id] || null; },
            getAll()      { return configs; },

            remove(id) { delete configs[id]; delete runtimes[id]; },
            clear()    { for (const k in configs) delete configs[k]; for (const k in runtimes) delete runtimes[k]; }
        };
    }

    Strahl.Mod = Strahl.Mod || {};
    Strahl.Mod.ASR = { create, Phase };

})(window.Strahl);
