import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { subscribeToasts } from '../../lib/toast';

const ICONS = { success: CheckCircle2, error: XCircle, warn: AlertTriangle, info: Info };
const TONES = {
  success: 'border-emerald-500/50 text-emerald-300',
  error: 'border-rose-500/50 text-rose-300',
  warn: 'border-amber-500/50 text-amber-300',
  info: 'border-brand-400/50 text-brand-200',
};

export default function Toaster() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    return subscribeToasts((item) => {
      setItems((prev) => [...prev, item]);
      setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
      }, item.duration);
    });
  }, []);

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
              className={clsx(
                'pointer-events-auto flex w-full items-start gap-2.5 rounded-xl border bg-surface-800/95 px-4 py-3 text-sm font-medium text-slate-100 shadow-2xl shadow-black/40 backdrop-blur',
                TONES[item.type] || TONES.info
              )}
            >
              <Icon size={18} className="mt-0.5 flex-shrink-0" />
              <span>{item.message}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
