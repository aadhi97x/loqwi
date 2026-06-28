import { motion } from 'framer-motion';
import { Languages } from 'lucide-react';
import { Card, Button } from '../ui/primitives';
import type { TranslateState } from '../../types';

interface TranslateViewProps {
  translateState: TranslateState | null;
  onTranslateNow: () => void;
  onClear: () => void;
}

export default function TranslateView({
  translateState,
  onTranslateNow,
  onClear,
}: TranslateViewProps) {
  if (!translateState) return null;
  const { buffer, result } = translateState;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-5xl"
    >
      <div className="mb-6 flex items-center gap-3 text-[var(--accent-ink)]">
        <Languages size={26} />
        <h2 className="text-2xl font-bold text-ink-900">Dictation &amp; Translation</h2>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card className="min-h-[200px]">
          <div className="mb-3 text-sm font-bold text-[var(--accent-ink)]">
            Source (what was said)
          </div>
          <p className="whitespace-pre-wrap text-lg leading-relaxed text-ink-900">{buffer}</p>
        </Card>
        <Card className="min-h-[200px]">
          <div className="mb-3 text-sm font-bold text-[var(--accent-ink)]">
            {result
              ? result.target_lang === 'hi'
                ? 'Hindi Translation'
                : 'English Translation'
              : 'Translation'}
          </div>
          <p className="whitespace-pre-wrap text-lg leading-relaxed text-ink-900">
            {result?.translated_text}
          </p>
        </Card>
      </div>

      <div className="mt-5 flex gap-3">
        <Button variant="primary" onClick={onTranslateNow}>
          Translate Now
        </Button>
        <Button variant="secondary" onClick={onClear}>
          Clear
        </Button>
      </div>
      <p className="mt-3 text-sm text-ink-500">
        {'Start speaking, then say "translate karo" or use the button above.'}
      </p>
    </motion.div>
  );
}
