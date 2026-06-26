import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function Welcome() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center text-center"
    >
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-xl shadow-brand-900/40">
        <Sparkles size={32} />
      </div>
      <h2 className="mb-3 text-2xl font-bold text-white">Loqwi tayyar hai</h2>
      <p className="text-base leading-relaxed text-slate-400">
        Mic dabaayein ya neeche type karein. Try:
        <br />
        <span className="text-slate-300">"samjhao photosynthesis"</span> ·{' '}
        <span className="text-slate-300">"quiz on fractions paanch sawaal"</span> ·{' '}
        <span className="text-slate-300">"is paragraph ka translate karo"</span> ·{' '}
        <span className="text-slate-300">"activity shuru karo fraction addition ke liye"</span>
      </p>
    </motion.div>
  );
}
