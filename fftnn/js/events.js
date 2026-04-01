/**
 * events.js — Event bus for fftnn demo
 *
 * Re-exports from shared/eventbus.js, maintaining the same on/off/emit API.
 */
import { EventBus } from '/shared/eventbus.js';

const bus = EventBus();

export const on = bus.on;
export const off = bus.off;
export const emit = bus.emit;
