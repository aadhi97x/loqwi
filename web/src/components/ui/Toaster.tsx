import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import clsx from 'clsx';
import { subscribeToasts } from '../../lib/toast';
import type { ToastItem, ToastType } from '../../types';

const ICONS: Record<ToastType, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  warn: AlertTriangle,
  info: Info,
};
const TONES: Record<ToastType, string> = {
  success: 'border-emerald-500/50 text-[var(--good-ink)]',
  error: 'border-rose-500/50 text-[var(--bad-ink)]',
  warn: 'border-amber-500/50 text-[var(--warn-ink)]',
  info: 'border-brand-400/50 text-[var(--accent-ink)]',
};

export default function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    return subscribeToasts((item) => {
      setItems((prev) => [...prev, item]);
      setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
      }, item.duration);
    });
  }, []);

  function dismiss(id: number) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="pointer-events-none fixed bottom-28 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {items.map((item) => {
          const Icon = ICONS[item.type] || Info;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              onClick={() => dismiss(item.id)}
              role="button"
              title="Click to dismiss"
              className={clsx(
                'pointer-events-auto flex w-full cursor-pointer items-start gap-2.5 rounded-xl border bg-surface-800/95 px-4 py-3 text-sm font-medium text-ink-900 shadow-2xl shadow-black/40 backdrop-blur',
                TONES[item.type] || TONES.info
              )}
            >
              <Icon size={18} className="mt-0.5 flex-shrink-0" />
              <span className="flex-1">{item.message}</span>
              <X size={14} className="mt-0.5 flex-shrink-0 opacity-50" />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
