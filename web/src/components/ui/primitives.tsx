import {
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import clsx from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-950';
  const variants: Record<ButtonVariant, string> = {
    primary:
      'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-900/40 hover:from-brand-400 hover:to-brand-600 active:scale-[0.97]',
    secondary:
      'bg-surface-700/80 text-ink-900 border border-surface-500/60 hover:bg-surface-600 active:scale-[0.97]',
    ghost: 'text-ink-700 hover:bg-surface-700/60 active:scale-[0.97]',
    outline: 'border border-surface-500 text-ink-800 hover:border-brand-400 hover:text-ink-900',
  };
  const sizes: Record<ButtonSize, string> = {
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

interface ToggleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function IconButton({ className, active, children, ...props }: ToggleButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
        active
          ? 'border-brand-400 bg-brand-500/20 text-[var(--accent-ink)]'
          : 'border-surface-500/70 bg-surface-700/60 text-ink-700 hover:border-brand-400 hover:text-ink-900',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Pill({ className, active, children, ...props }: ToggleButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-brand-400 bg-brand-500/20 text-[var(--accent-ink)]'
          : 'border-surface-500/70 bg-surface-700/60 text-ink-700 hover:border-brand-400 hover:text-ink-900',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

type BadgeTone = 'default' | 'brand' | 'good' | 'bad';

interface BadgeProps {
  className?: string;
  tone?: BadgeTone;
  children: ReactNode;
  title?: string;
}

export function Badge({ className, tone = 'default', children, ...props }: BadgeProps) {
  const tones: Record<BadgeTone, string> = {
    default: 'bg-surface-700 text-ink-800 border-surface-500',
    brand: 'bg-brand-500/15 text-[var(--accent-ink)] border-brand-500/40',
    good: 'bg-emerald-500/15 text-[var(--good-ink)] border-emerald-500/40',
    bad: 'bg-rose-500/15 text-[var(--bad-ink)] border-rose-500/40',
  };
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold',
        tones[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

interface CardProps {
  className?: string;
  spotlight?: boolean;
  children: ReactNode;
}

/** A glass card with a mouse-tracked spotlight glow on hover (21st.dev
 * "Spotlight Card" pattern) — purely decorative via a CSS variable updated
 * on mousemove, no extra deps. Set spotlight={false} to opt out. */
export function Card({ className, spotlight = true, children, ...props }: CardProps) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!spotlight || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    ref.current.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
    ref.current.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={clsx(
        'group relative overflow-hidden rounded-2xl border border-surface-600/70 bg-surface-800/70 p-5 shadow-xl shadow-black/20 backdrop-blur-sm',
        className
      )}
      {...props}
    >
      {spotlight ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              'radial-gradient(circle at var(--spot-x, 50%) var(--spot-y, 50%), color-mix(in srgb, var(--accent-ink) 22%, transparent), transparent 60%)',
          }}
        />
      ) : null}
      <div className="relative">{children}</div>
    </div>
  );
}

interface GradientBorderProps {
  className?: string;
  children: ReactNode;
  rounded?: string;
}

const GRADIENT_BORDER_BG =
  'conic-gradient(from var(--gradient-angle, 0deg), var(--accent-ink), #818cf8, var(--accent-ink-soft), var(--accent-ink))';

/** Animated conic-gradient border (21st.dev-style "Animated Gradient
 * Border") for small decorative accents — used sparingly so it reads as
 * polish, not distraction, in a tool meant to stay calm during class. */
export function GradientBorder({
  className,
  children,
  rounded = 'rounded-xl',
}: GradientBorderProps) {
  return (
    <div className={clsx('relative isolate', rounded, className)}>
      <div
        className={clsx('absolute -inset-[1.5px] animate-spin-slow', rounded)}
        style={{ background: GRADIENT_BORDER_BG }}
      />
      <div className={clsx('relative h-full w-full bg-surface-900', rounded)}>{children}</div>
    </div>
  );
}

interface FieldProps {
  label: string;
  children: ReactNode;
  hint?: string;
}

export function Field({ label, children, hint }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-ink-700">
      <span className="font-medium text-ink-700">{label}</span>
      {children}
      {hint ? <span className="text-xs text-ink-500">{hint}</span> : null}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        'rounded-lg border border-surface-500 bg-surface-900 px-3 py-2 text-ink-900 outline-none transition-colors focus:border-brand-400',
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx(
        'rounded-lg border border-surface-500 bg-surface-900 px-3 py-2 text-ink-900 outline-none transition-colors focus:border-brand-400',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none text-sm text-ink-700">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
          checked ? 'bg-brand-500' : 'bg-surface-600'
        )}
      >
        <span
          className={clsx(
            'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5'
          )}
        />
      </button>
      {label}
    </label>
  );
}
