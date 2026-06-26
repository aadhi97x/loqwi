// toast.js — minimal pub/sub toast store so any module (including the
// non-component useLoqwi hook logic) can fire a toast without prop drilling
// or needing a React context at the call site.

let listeners = [];
let idCounter = 0;

export function subscribeToasts(fn) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

export function toast(message, { type = 'info', duration = 4200 } = {}) {
  const id = ++idCounter;
  const item = { id, message, type, duration };
  listeners.forEach((fn) => fn(item));
  return id;
}
