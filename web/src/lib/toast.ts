// toast.js — minimal pub/sub toast store so any module (including the
// non-component useLoqwi hook logic) can fire a toast without prop drilling
// or needing a React context at the call site.
//
// Duration is adaptive by type: a teacher mid-class glancing at the screen
// needs longer to notice/read a warning or error than a quick success blip,
// so we don't use one flat timeout for everything. Every toast is also
// click-to-dismiss in the UI, and a rolling log of the last few messages is
// kept here so a teacher who looked away doesn't lose it entirely.
import type { ToastItem, ToastType } from '../types';

const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 3000,
  info: 4500,
  warn: 6500,
  error: 8000,
};

type ToastListener = (item: ToastItem) => void;
type LogListener = (log: ToastItem[]) => void;

let listeners: ToastListener[] = [];
let logListeners: LogListener[] = [];
let idCounter = 0;
const log: ToastItem[] = [];
const MAX_LOG = 12;

export function subscribeToasts(fn: ToastListener) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

export function subscribeToastLog(fn: LogListener) {
  logListeners.push(fn);
  fn(log);
  return () => {
    logListeners = logListeners.filter((l) => l !== fn);
  };
}

export function toast(
  message: string,
  { type = 'info', duration }: { type?: ToastType; duration?: number } = {}
) {
  const id = ++idCounter;
  const item: ToastItem = {
    id,
    message,
    type,
    duration: duration ?? DEFAULT_DURATIONS[type] ?? 4500,
    at: Date.now(),
  };
  listeners.forEach((fn) => fn(item));
  log.unshift(item);
  if (log.length > MAX_LOG) log.length = MAX_LOG;
  logListeners.forEach((fn) => fn(log));
  return id;
}
