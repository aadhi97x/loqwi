import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const EXAMPLES = [
  'samjhao photosynthesis',
  'quiz on fractions paanch sawaal',
  'is paragraph ka translate karo',
  'activity shuru karo fraction addition ke liye',
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Welcome() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center text-center"
    >
      <motion.div
        animate={{ rotate: [0, 8, -8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="mb-6 text-brand-300"
      >
        <Sparkles size={40} strokeWidth={1.4} />
      </motion.div>

      <h2 className="mb-1 font-serif text-4xl italic tracking-tight text-white">
        {greeting()}, <span className="relative">
          Teacher
          <svg
            viewBox="0 0 120 8"
            className="absolute -bottom-1 left-0 w-full text-brand-400"
            preserveAspectRatio="none"
          >
            <path d="M2 5.5C30 1.5 90 1.5 118 5.5" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </svg>
        </span>
      </h2>
      <p className="mb-8 font-serif text-lg italic text-slate-400">Loqwi tayyar hai aapki class ke liye.</p>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {EXAMPLES.map((ex) => (
          <span
            key={ex}
            className="rounded-full border border-surface-600 bg-surface-800/70 px-3.5 py-1.5 text-sm text-slate-400"
          >
            "{ex}"
          </span>
        ))}
      </div>
    </motion.div>
  );
}
