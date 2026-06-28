import { useEffect, useState } from 'react';
import { Settings, Maximize2, Languages, Sparkles, Sun, Moon, Wand2 } from 'lucide-react';
import { IconButton, Pill, Badge, GradientBorder } from './ui/primitives';
import MessageLog from './MessageLog';
import { modeLabel } from '../hooks/useLoqwi';
import type { Mode, RouteSource, Theme } from '../types';

interface TopBarProps {
  mode: Mode;
  recognitionLang: string;
  onCycleLang: () => void;
  smartBoard: boolean;
  onToggleSmartBoard: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  routeSource: RouteSource;
  onOpenSettings: () => void;
}

export default function TopBar({
  mode,
  recognitionLang,
  onCycleLang,
  smartBoard,
  onToggleSmartBoard,
  theme,
  onToggleTheme,
  routeSource,
  onOpenSettings,
}: TopBarProps) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-700 bg-surface-900/80 px-5 py-3 backdrop-blur">
      <div className="flex items-center gap-2.5">
        <GradientBorder className="h-9 w-9" rounded="rounded-xl">
          <div className="flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-white">
            <Sparkles size={18} />
          </div>
        </GradientBorder>
        <div className="leading-tight">
          <div className="text-lg font-extrabold tracking-tight text-ink-900">Loqwi</div>
          <div className="text-xs text-ink-600">Voice AI Teaching Assistant</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge tone="brand">{modeLabel(mode)}</Badge>
        {routeSource === 'ai' ? (
          <Badge
            tone="default"
            title="This command was ambiguous, so an AI guess routed it — say a direct command next time to skip this step."
          >
            <Wand2 size={12} className="mr-1 inline" />
            AI routed
          </Badge>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden font-mono text-sm text-ink-600 sm:inline">
          {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <Pill onClick={onCycleLang} title="Recognition language">
          <Languages size={14} />
          {recognitionLang === 'hi-IN' ? 'HI/EN' : 'EN/HI'}
        </Pill>
        <Pill onClick={onToggleTheme} title="Switch between dark and daylight theme">
          {theme === 'daylight' ? <Sun size={14} /> : <Moon size={14} />}
          {theme === 'daylight' ? 'Daylight' : 'Dark'}
        </Pill>
        <Pill
          onClick={onToggleSmartBoard}
          active={smartBoard}
          title="Bigger text for projector distance"
        >
          <Maximize2 size={14} />
          Smart Board
        </Pill>
        <MessageLog />
        <IconButton onClick={onOpenSettings} aria-label="Settings">
          <Settings size={18} />
        </IconButton>
      </div>
    </header>
  );
}
