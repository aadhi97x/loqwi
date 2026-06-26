import { motion } from 'framer-motion';
import { BookOpen, Lightbulb } from 'lucide-react';
import { Card } from '../ui/primitives';

export default function ConceptView({ concept }) {
  if (!concept) return null;
  const { data } = concept;
  const visual = data.visual || {};
  const items = visual.items || [];
  const isSteps = visual.type === 'steps';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-full max-w-4xl">
      <div className="mb-6 flex items-center gap-3 text-brand-300">
        <BookOpen size={26} />
        <h2 className="text-2xl font-bold text-white">{visual.title || concept.topic}</h2>
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
                <div className="text-lg font-bold text-white">{item.label}</div>
                <div className="text-slate-400">{item.detail}</div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {items.map((item, i) => (
            <Card key={i}>
              <div className="mb-1.5 font-bold text-brand-300">{item.label}</div>
              <div className="text-slate-400">{item.detail}</div>
            </Card>
          ))}
        </div>
      )}

      {visual.analogy_caption ? (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
          <Lightbulb size={22} className="mt-0.5 flex-shrink-0 text-amber-300" />
          <p className="text-amber-100">{visual.analogy_caption}</p>
        </div>
      ) : null}
    </motion.div>
  );
}
