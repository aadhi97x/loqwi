import clsx from 'clsx';
import { Mic, Loader2, Volume2, MicOff } from 'lucide-react';

const STATE_STYLES = {
  idle: 'border-surface-500 bg-surface-700 text-brand-300',
  listening: 'border-brand-400 bg-brand-500 text-white animate-mic-pulse',
  thinking: 'border-amber-400 bg-amber-500 text-amber-950',
  speaking: 'border-emerald-400 bg-emerald-500 text-emerald-950',
  error: 'border-rose-400 bg-rose-500 text-rose-950',
};

export default function MicButton({ state, disabled, onClick, size = 'lg' }) {
  const Icon = state === 'thinking' ? Loader2 : state === 'speaking' ? Volume2 : disabled ? MicOff : Mic;
  const dim = size === 'lg' ? 'h-16 w-16' : 'h-12 w-12';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label="Push to talk"
      className={clsx(
        'flex items-center justify-center rounded-full border-2 transition-all duration-200 disabled:opacity-40',
        dim,
        STATE_STYLES[state] || STATE_STYLES.idle
      )}
    >
      <Icon size={size === 'lg' ? 28 : 22} className={state === 'thinking' ? 'animate-spin' : ''} />
    </button>
  );
}
