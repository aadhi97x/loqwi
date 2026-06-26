import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { IconButton } from './primitives';

export default function Dialog({ open, onClose, title, children, footer }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-surface-600 bg-surface-800 shadow-2xl"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.18 }}
          >
            <div className="flex items-center justify-between border-b border-surface-600 px-5 py-4">
              <h2 className="text-lg font-bold text-white">{title}</h2>
              <IconButton onClick={onClose} aria-label="Close">
                <X size={18} />
              </IconButton>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer ? <div className="border-t border-surface-600 px-5 py-4">{footer}</div> : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
