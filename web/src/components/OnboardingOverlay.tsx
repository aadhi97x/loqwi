import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mic, Radio, Keyboard, ArrowRight } from 'lucide-react';
import { Button } from './ui/primitives';

const STEPS = [
  {
    icon: Mic,
    title: 'Push-to-talk',
    body: 'Click the mic button, say one command, and it stops listening automatically when you finish speaking.',
  },
  {
    icon: Radio,
    title: 'Hands-free mode',
    body: 'Toggle "Hands-free" and say "Hey Loqwi" before any command — Loqwi keeps listening the whole class without you touching anything.',
  },
  {
    icon: Keyboard,
    title: 'Typed fallback',
    body: 'If the mic mishears you or the room is noisy, just type the same command in the box at the bottom — it works exactly the same way.',
  },
];

interface OnboardingOverlayProps {
  onDismiss: () => void;
}

export default function OnboardingOverlay({ onDismiss }: OnboardingOverlayProps) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md rounded-2xl border border-surface-600 bg-surface-800 p-7 text-center shadow-2xl"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18 }}
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-900/40">
              <Icon size={26} />
            </div>
            <h2 className="mb-2 text-xl font-bold text-ink-900">{current.title}</h2>
            <p className="text-ink-600">{current.body}</p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex items-center justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-6 rounded-full ${i === step ? 'bg-brand-400' : 'bg-surface-600'}`}
            />
          ))}
        </div>

        <div className="mt-6 flex justify-center gap-3">
          <Button variant="ghost" onClick={onDismiss}>
            Skip
          </Button>
          <Button variant="primary" onClick={() => (isLast ? onDismiss() : setStep((s) => s + 1))}>
            {isLast ? 'Get started' : 'Next'} <ArrowRight size={16} />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
