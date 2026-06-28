import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowUp, BookOpen, ListChecks, Languages, Activity } from 'lucide-react';
import { Switch } from './ui/primitives';
import MicButton from './MicButton';
import type { Mode, MicState } from '../types';

const MODE_BUTTONS: { key: Mode; label: string; icon: typeof BookOpen }[] = [
  { key: 'concept', label: 'Concept', icon: BookOpen },
  { key: 'quiz', label: 'Quiz', icon: ListChecks },
  { key: 'translate', label: 'Translate', icon: Languages },
  { key: 'activity', label: 'Activity', icon: Activity },
];

interface ControlBarProps {
  micState: MicState;
  handsFree: boolean;
  micSupported: boolean;
  prefill?: { text: string; token: number } | null;
  onToggleMic: () => void;
  onToggleHandsFree: () => void;
  onClickMode: (mode: Mode) => void;
  onSubmitTyped: (text: string) => void;
}

export default function ControlBar({
  micState,
  handsFree,
  micSupported,
  prefill,
  onToggleMic,
  onToggleHandsFree,
  onClickMode,
  onSubmitTyped,
}: ControlBarProps) {
  const [typed, setTyped] = useState('');
  const [seenPrefillToken, setSeenPrefillToken] = useState<number | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  // A new prefill (mode button click) should overwrite whatever's typed —
  // derived during render rather than an effect so it lands in the same
  // commit instead of causing an extra render pass.
  if (prefill && prefill.token !== seenPrefillToken) {
    setSeenPrefillToken(prefill.token);
    setTyped(prefill.text);
  }

  useEffect(() => {
    if (seenPrefillToken === undefined) return;
    inputRef.current?.focus();
    const len = inputRef.current?.value.length ?? 0;
    inputRef.current?.setSelectionRange(len, len);
  }, [seenPrefillToken]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!typed.trim()) return;
    onSubmitTyped(typed.trim());
    setTyped('');
  }

  return (
    <footer className="border-t border-surface-700 bg-surface-900/80 px-4 py-4 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {MODE_BUTTONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => onClickMode(key)}
              className="inline-flex items-center gap-1.5 rounded-full border border-surface-600 bg-surface-800/70 px-3.5 py-1.5 text-sm font-medium text-ink-700 transition-colors hover:border-brand-400 hover:text-ink-900"
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-surface-600" />
          <Switch checked={handsFree} onChange={onToggleHandsFree} label="Hands-free" />
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 rounded-2xl border border-surface-600 bg-surface-800/80 p-2 pl-4 shadow-lg shadow-black/20"
        >
          <input
            ref={inputRef}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder='Type a command… e.g. "samjhao photosynthesis"'
            className="flex-1 bg-transparent text-ink-900 placeholder:text-ink-500 outline-none"
          />
          <MicButton
            state={micState}
            disabled={handsFree || !micSupported}
            onClick={onToggleMic}
            size="sm"
          />
          <button
            type="submit"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-900/40 transition-transform active:scale-90 disabled:opacity-40"
            disabled={!typed.trim()}
          >
            <ArrowUp size={18} />
          </button>
        </form>
      </div>
    </footer>
  );
}
