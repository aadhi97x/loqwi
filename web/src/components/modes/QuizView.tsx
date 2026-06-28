import { motion } from 'framer-motion';
import clsx from 'clsx';
import { ListChecks, Check, X, Trophy } from 'lucide-react';
import { Badge } from '../ui/primitives';
import type { QuizState } from '../../types';

interface QuizViewProps {
  quiz: QuizState | null;
  onSelect: (index: number) => void;
}

export default function QuizView({ quiz, onSelect }: QuizViewProps) {
  if (!quiz) return null;

  if (quiz.finished) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center text-center"
      >
        <Trophy size={48} className="mb-4 text-[var(--warn-ink)]" />
        <h2 className="mb-2 text-2xl font-bold text-ink-900">Quiz Complete!</h2>
        <div className="text-4xl font-extrabold text-[var(--accent-ink)]">
          {quiz.score} / {quiz.total}
        </div>
        <p className="mt-1 text-ink-600">correct answers</p>
      </motion.div>
    );
  }

  const q = quiz.questions[quiz.index];
  const total = quiz.questions.length;
  const revealed = quiz.revealed;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-3xl"
    >
      <div className="mb-5 flex items-center gap-3">
        <ListChecks size={26} className="text-[var(--accent-ink)]" />
        <h2 className="flex-1 text-2xl font-bold text-ink-900">
          Question {quiz.index + 1} / {total}
        </h2>
        <Badge tone="brand">Score: {quiz.score}</Badge>
      </div>

      <p className="mb-6 text-xl font-semibold text-ink-900">{q.question_text}</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {q.options.map((opt, i) => {
          const isCorrect = !!revealed && i === revealed.correctIndex;
          const isWrongPick =
            !!revealed && i === revealed.selectedIndex && i !== revealed.correctIndex;
          return (
            <button
              key={i}
              disabled={!!revealed}
              onClick={() => onSelect(i)}
              className={clsx(
                'flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-base transition-colors',
                isCorrect
                  ? 'border-emerald-500 bg-emerald-500/15 text-[var(--good-ink)]'
                  : isWrongPick
                    ? 'border-rose-500 bg-rose-500/15 text-[var(--bad-ink)]'
                    : 'border-surface-500 bg-surface-700/70 text-ink-900 hover:border-brand-400'
              )}
            >
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-900/60 font-bold">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{opt}</span>
              {isCorrect ? <Check size={18} /> : isWrongPick ? <X size={18} /> : null}
            </button>
          );
        })}
      </div>

      {revealed ? (
        <div
          className={clsx(
            'mt-5 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium',
            revealed.selectedIndex === revealed.correctIndex
              ? 'bg-emerald-500/15 text-[var(--good-ink)]'
              : 'bg-rose-500/15 text-[var(--bad-ink)]'
          )}
        >
          {revealed.selectedIndex === revealed.correctIndex ? <Check size={18} /> : <X size={18} />}
          <span>{q.explanation_speech}</span>
        </div>
      ) : (
        <p className="mt-5 text-sm text-ink-500">{'Say your answer: "A", "B", "C" or "D"'}</p>
      )}
    </motion.div>
  );
}
