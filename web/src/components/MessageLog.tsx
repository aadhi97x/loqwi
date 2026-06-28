import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { IconButton } from './ui/primitives';
import { subscribeToastLog } from '../lib/toast';
import type { ToastItem, ToastType } from '../types';

const ICONS: Record<ToastType, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  warn: AlertTriangle,
  info: Info,
};
const TONES: Record<ToastType, string> = {
  success: 'text-emerald-400',
  error: 'text-rose-400',
  warn: 'text-amber-400',
  info: 'text-[var(--accent-ink)]',
};

/** A small glance-able history of recent toasts, for a teacher who looked
 * away from the screen when one appeared and missed it. */
export default function MessageLog() {
  const [log, setLog] = useState<ToastItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeToastLog(setLog), []);

  return (
    <div className="relative">
      <IconButton onClick={() => setOpen((v) => !v)} aria-label="Recent messages" active={open}>
        <Bell size={16} />
      </IconButton>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute right-0 top-full z-40 mt-2 w-72 rounded-xl border border-surface-600 bg-surface-800 p-2 shadow-2xl"
          >
            {log.length === 0 ? (
              <p className="p-3 text-center text-sm text-ink-500">No messages yet.</p>
            ) : (
              <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
                {log.map((item) => {
                  const Icon = ICONS[item.type] || Info;
                  return (
                    <li
                      key={item.id}
                      className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm"
                    >
                      <Icon size={15} className={clsx('mt-0.5 flex-shrink-0', TONES[item.type])} />
                      <span className="flex-1 text-ink-800">{item.message}</span>
                      <span className="flex-shrink-0 text-xs text-ink-500">
                        {new Date(item.at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
