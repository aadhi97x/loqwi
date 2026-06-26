import { useEffect, useState } from 'react';
import { Settings, Maximize2, Languages, Sparkles } from 'lucide-react';
import { IconButton, Pill, Badge } from './ui/primitives';
import { modeLabel } from '../hooks/useLoqwi';

export default function TopBar({ mode, recognitionLang, onCycleLang, smartBoard, onToggleSmartBoard, onOpenSettings }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-700 bg-surface-900/80 px-5 py-3 backdrop-blur">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-lg shadow-brand-900/40">
          <Sparkles size={18} />
        </div>
        <div className="leading-tight">
          <div className="text-lg font-extrabold tracking-tight text-white">Loqwi</div>
          <div className="text-xs text-slate-400">Voice AI Teaching Assistant</div>
        </div>
      </div>

      <Badge tone="brand">{modeLabel(mode)}</Badge>

      <div className="flex items-center gap-2">
        <span className="hidden font-mono text-sm text-slate-400 sm:inline">
          {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <Pill onClick={onCycleLang} title="Recognition language">
          <Languages size={14} />
          {recognitionLang === 'hi-IN' ? 'हिं/EN' : 'EN/हिं'}
        </Pill>
        <Pill onClick={onToggleSmartBoard} active={smartBoard} title="Bigger text for projector distance">
          <Maximize2 size={14} />
          Smart Board
        </Pill>
        <IconButton onClick={onOpenSettings} aria-label="Settings">
          <Settings size={18} />
        </IconButton>
      </div>
    </header>
  );
}
