// Lightweight event bus for decoupled module communication
const listeners = {};

function on(event, fn) {
  (listeners[event] ??= []).push(fn);
}

function off(event, fn) {
  const list = listeners[event];
  if (list) listeners[event] = list.filter(f => f !== fn);
}

function emit(event, data) {
  const list = listeners[event];
  if (list) for (const fn of list) fn(data);
}

export { on, off, emit };
