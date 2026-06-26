import clsx from 'clsx';

export function Button({ variant = 'secondary', size = 'md', className, children, ...props }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-950';
  const variants = {
    primary:
      'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-900/40 hover:from-brand-400 hover:to-brand-600 active:scale-[0.97]',
    secondary:
      'bg-surface-700/80 text-slate-100 border border-surface-500/60 hover:bg-surface-600 active:scale-[0.97]',
    ghost: 'text-slate-300 hover:bg-surface-700/60 active:scale-[0.97]',
    outline: 'border border-surface-500 text-slate-200 hover:border-brand-400 hover:text-white',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-base',
  };
  return (
    <button className={clsx(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}

export function IconButton({ className, active, children, ...props }) {
  return (
    <button
      className={clsx(
        'inline-flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
        active
          ? 'border-brand-400 bg-brand-500/20 text-brand-200'
          : 'border-surface-500/70 bg-surface-700/60 text-slate-300 hover:border-brand-400 hover:text-white',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Pill({ className, active, children, ...props }) {
  return (
    <button
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-brand-400 bg-brand-500/20 text-brand-100'
          : 'border-surface-500/70 bg-surface-700/60 text-slate-300 hover:border-brand-400 hover:text-white',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({ className, tone = 'default', children }) {
  const tones = {
    default: 'bg-surface-700 text-slate-200 border-surface-500',
    brand: 'bg-brand-500/15 text-brand-200 border-brand-500/40',
    good: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    bad: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
  };
  return (
    <span className={clsx('inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold', tones[tone], className)}>
      {children}
    </span>
  );
}

export function Card({ className, children, ...props }) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-surface-600/70 bg-surface-800/70 p-5 shadow-xl shadow-black/20 backdrop-blur-sm',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-slate-300">
      <span className="font-medium text-slate-300">{label}</span>
      {children}
      {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function Input({ className, ...props }) {
  return (
    <input
      className={clsx(
        'rounded-lg border border-surface-500 bg-surface-900 px-3 py-2 text-slate-100 outline-none transition-colors focus:border-brand-400',
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }) {
  return (
    <select
      className={clsx(
        'rounded-lg border border-surface-500 bg-surface-900 px-3 py-2 text-slate-100 outline-none transition-colors focus:border-brand-400',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Switch({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none text-sm text-slate-300">
      <span
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          checked ? 'bg-brand-500' : 'bg-surface-600'
        )}
      >
        <span
          className={clsx(
            'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5'
          )}
        />
      </span>
      {label}
    </label>
  );
}
