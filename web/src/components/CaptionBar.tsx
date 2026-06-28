import clsx from 'clsx';
import type { Speaker } from '../types';

interface CaptionBarProps {
  text: string;
  interim: boolean;
  speaker: Speaker;
}

export default function CaptionBar({ text, interim, speaker }: CaptionBarProps) {
  if (!text) return null;
  return (
    <div
      className={clsx(
        'flex items-baseline justify-center gap-2 border-b border-surface-700 bg-surface-900/60 px-5 py-2.5 text-center text-base',
        interim ? 'italic text-[var(--accent-ink)]' : 'text-ink-700'
      )}
    >
      <span className="flex-shrink-0 text-xs font-semibold uppercase tracking-wide text-ink-500">
        {speaker === 'ai' ? 'Loqwi' : 'You'}
      </span>
      <span>{text}</span>
    </div>
  );
}
