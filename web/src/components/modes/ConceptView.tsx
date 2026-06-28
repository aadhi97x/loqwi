import { motion } from 'framer-motion';
import { BookOpen, Lightbulb } from 'lucide-react';
import { Card } from '../ui/primitives';
import type { ConceptState } from '../../types';

interface ConceptViewProps {
  concept: ConceptState | null;
}

export default function ConceptView({ concept }: ConceptViewProps) {
  if (!concept) return null;
  const { data } = concept;
  const visual = data.visual || { title: '', type: 'steps', items: [] };
  const items = visual.items || [];
  const isSteps = visual.type === 'steps';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-4xl"
    >
      <div className="mb-6 flex items-center gap-3 text-[var(--accent-ink)]">
        <BookOpen size={26} />
        <h2 className="text-2xl font-bold text-ink-900">{visual.title || concept.topic}</h2>
      </div>

      {isSteps ? (
        <div className="flex flex-col gap-4">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-4"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-bold text-white shadow-lg shadow-brand-900/30">
                {i + 1}
              </div>
              <div>
                <div className="text-lg font-bold text-ink-900">{item.label}</div>
                <div className="text-ink-600">{item.detail}</div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={i === 0 && items.length > 2 ? 'sm:col-span-2' : ''}
            >
              <Card>
                <div className="mb-1.5 font-bold text-[var(--accent-ink)]">{item.label}</div>
                <div className="text-ink-600">{item.detail}</div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {visual.analogy_caption ? (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
          <Lightbulb size={22} className="mt-0.5 flex-shrink-0 text-[var(--warn-ink)]" />
          <p className="text-ink-900">{visual.analogy_caption}</p>
        </div>
      ) : null}
    </motion.div>
  );
}
