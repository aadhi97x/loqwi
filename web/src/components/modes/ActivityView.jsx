import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Activity as ActivityIcon, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { Button } from '../ui/primitives';

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ActivityView({ activity, onPrev, onNext, onTogglePause }) {
  if (!activity) return null;
  const { data, index, secondsLeft, totalSeconds, paused } = activity;
  const fraction = totalSeconds > 0 ? Math.max(0, Math.min(1, secondsLeft / totalSeconds)) : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-full max-w-3xl">
      <div className="mb-4 flex items-center gap-3 text-brand-300">
        <ActivityIcon size={26} />
        <h2 className="text-2xl font-bold text-white">{data.title}</h2>
      </div>

      <p className="mb-6 text-sm text-slate-400">
        <strong className="text-slate-300">Materials:</strong> {data.materials.join(', ')}
      </p>

      <div className="mb-7 flex items-center gap-7">
        <div className="relative h-28 w-28 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="#262c41" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke="#818cf8"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
              className="transition-[stroke-dashoffset] duration-300 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white">
            {Math.max(0, Math.ceil(secondsLeft))}s
          </div>
        </div>
        <p className="flex-1 text-xl font-semibold leading-relaxed text-white">{data.steps[index].instruction_text}</p>
      </div>

      <div className="mb-6 flex flex-col gap-2.5">
        {data.steps.map((step, i) => (
          <div
            key={i}
            className={clsx(
              'flex items-center gap-3 rounded-xl border px-4 py-2.5 transition-colors',
              i === index
                ? 'border-brand-400 bg-brand-500/10 text-white'
                : i < index
                ? 'border-surface-700 text-slate-500 opacity-60'
                : 'border-surface-700 text-slate-400'
            )}
          >
            <span
              className={clsx(
                'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold',
                i === index ? 'bg-brand-500 text-white' : 'bg-surface-700 text-slate-300'
              )}
            >
              {i + 1}
            </span>
            <span>{step.instruction_text}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button onClick={onPrev}>
          <ChevronLeft size={16} /> Peeche
        </Button>
        <Button onClick={onTogglePause}>
          {paused ? <Play size={16} /> : <Pause size={16} />}
          {paused ? 'Resume' : 'Pause'}
        </Button>
        <Button onClick={onNext}>
          Agla <ChevronRight size={16} />
        </Button>
      </div>
    </motion.div>
  );
}
