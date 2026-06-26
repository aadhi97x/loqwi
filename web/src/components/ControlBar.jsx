import { useState } from 'react';
import { Send, BookOpen, ListChecks, Languages, Activity } from 'lucide-react';
import { Pill, Switch, Input, Button } from './ui/primitives';
import MicButton from './MicButton';

const MODE_BUTTONS = [
  { key: 'concept', label: 'Concept', icon: BookOpen },
  { key: 'quiz', label: 'Quiz', icon: ListChecks },
  { key: 'translate', label: 'Translate', icon: Languages },
  { key: 'activity', label: 'Activity', icon: Activity },
];

export default function ControlBar({ micState, handsFree, micSupported, onToggleMic, onToggleHandsFree, onClickMode, onSubmitTyped }) {
  const [typed, setTyped] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!typed.trim()) return;
    onSubmitTyped(typed.trim());
    setTyped('');
  }

  return (
    <footer className="flex flex-wrap items-center gap-3 border-t border-surface-700 bg-surface-900/80 px-5 py-3.5 backdrop-blur">
      <div className="flex gap-1.5">
        {MODE_BUTTONS.map(({ key, label, icon: Icon }) => (
          <Pill key={key} onClick={() => onClickMode(key)}>
            <Icon size={14} />
            {label}
          </Pill>
        ))}
      </div>

      <MicButton state={micState} disabled={handsFree || !micSupported} onClick={onToggleMic} />

      <Switch checked={handsFree} onChange={onToggleHandsFree} label="Hands-free" />

      <form onSubmit={handleSubmit} className="flex min-w-[220px] flex-1 gap-2">
        <Input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder='Type a command… e.g. "samjhao photosynthesis"'
          className="flex-1"
        />
        <Button type="submit" variant="primary">
          <Send size={16} />
        </Button>
      </form>
    </footer>
  );
}
