// useAssistantCore.js — shared engine used by all four mode hooks: mic/TTS
// plumbing, settings, theme, smart-board scaling, the discard-confirmation
// dialog, and the "who routed this" badge. Mode hooks (useConceptMode etc.)
// receive this as `core` and never touch SpeechRecognition/synthesis directly.
import { useCallback, useEffect, useRef, useState } from 'react';
import * as speech from '../lib/speech';
import { getConfig, setConfig as persistConfig } from '../lib/api';
import { toast } from '../lib/toast';
import type {
  AppConfig,
  Caption,
  ConfirmRequest,
  Mode,
  MicState,
  RouteSource,
  Theme,
} from '../types';

const MODE_LABELS: Record<Mode, string> = {
  idle: 'Idle',
  concept: 'Concept',
  quiz: 'Quiz',
  translate: 'Translate',
  activity: 'Activity',
};
export function modeLabel(mode: Mode | string): string {
  return MODE_LABELS[mode as Mode] || mode;
}

export type RouteHandler = (text: string, opts: { explicit: boolean }) => void;

export function useAssistantCore() {
  const [cfg, setCfg] = useState<AppConfig>(getConfig());
  const [mode, setModeState] = useState<Mode>('idle');
  const [micState, setMicStateRaw] = useState<MicState>('idle');
  const [handsFree, setHandsFree] = useState(false);
  const [caption, setCaptionState] = useState<Caption>({
    text: '',
    interim: false,
    speaker: 'user',
  });
  const [smartBoard, setSmartBoard] = useState(
    () => localStorage.getItem('loqwi:smartboard') === '1'
  );
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('loqwi:theme') as Theme) || 'dark'
  );
  const [routeSource, setRouteSource] = useState<RouteSource>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const busyRef = useRef(false);
  const handsFreeRef = useRef(false);
  const modeRef = useRef<Mode>('idle');
  const pendingModeRef = useRef<Mode | null>(null);
  const listenerRef = useRef<speech.Listener | null>(null);
  const onFinalRef = useRef<RouteHandler>(() => {});

  useEffect(() => {
    handsFreeRef.current = handsFree;
  }, [handsFree]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const setMicState = useCallback((s: MicState) => {
    busyRef.current = s === 'thinking' || s === 'speaking';
    setMicStateRaw(s);
  }, []);

  const idleMicState = useCallback(
    (): MicState => (handsFreeRef.current ? 'listening' : 'idle'),
    []
  );

  const setMode = useCallback((m: Mode) => {
    modeRef.current = m;
    setModeState(m);
  }, []);

  const speakAndWait = useCallback(
    async (text: string) => {
      setMicState('speaking');
      setCaptionState({ text, interim: false, speaker: 'ai' });
      await speech.speak(text, { voiceNamePrefs: { hi: cfg.voiceHi, en: cfg.voiceEn } });
      setMicState(idleMicState());
    },
    [cfg.voiceHi, cfg.voiceEn, idleMicState, setMicState]
  );

  const handleError = useCallback(
    (err: unknown) => {
      console.error(err);
      setMicState(idleMicState());
      const message =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      toast(message, { type: 'error' });
    },
    [idleMicState, setMicState]
  );

  const requestConfirm = useCallback((message: string, onConfirm: () => void) => {
    setConfirm({ message, onConfirm });
  }, []);

  const resolveConfirm = useCallback((confirmed: boolean) => {
    setConfirm((current) => {
      if (confirmed && current) current.onConfirm();
      return null;
    });
  }, []);

  // ---------- Listener wiring (recognition instance created once) ----------

  useEffect(() => {
    const listener = new speech.Listener({
      lang: cfg.recognitionLang,
      continuous: false,
      onStart: () => {
        if (!busyRef.current) setMicStateRaw('listening');
      },
      onEnd: () => {
        if (!busyRef.current) setMicStateRaw('idle');
      },
      onInterim: (text) => setCaptionState({ text, interim: true, speaker: 'user' }),
      onFinal: (text) => {
        setCaptionState({ text, interim: false, speaker: 'user' });
        onFinalRef.current(text, { explicit: !handsFreeRef.current });
      },
      onError: (e) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          toast(
            'Microphone permission denied. Please allow microphone access in browser settings.',
            { type: 'error' }
          );
        }
      },
    });
    listenerRef.current = listener;
    return () => listener.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    listenerRef.current?.setLang(cfg.recognitionLang);
  }, [cfg.recognitionLang]);

  /** Mode hooks/orchestrator register the routing function here once it's defined. */
  const setRouteHandler = useCallback((fn: RouteHandler) => {
    onFinalRef.current = fn;
  }, []);

  // ---------- public actions ----------

  const toggleMic = useCallback(() => {
    const listener = listenerRef.current;
    if (!listener || handsFree || !listener.isSupported()) return;
    if (listener.isActive()) listener.stop();
    else listener.start();
  }, [handsFree]);

  const toggleHandsFree = useCallback(() => {
    setHandsFree((prev) => {
      const next = !prev;
      handsFreeRef.current = next;
      const listener = listenerRef.current;
      if (listener) {
        listener.setContinuous(next);
        if (next) {
          listener.start();
          toast('Hands-free mode ON — say "Hey Loqwi" to start a command.', { type: 'info' });
        } else {
          listener.stop();
          setMicStateRaw('idle');
        }
      }
      return next;
    });
  }, []);

  const submitTyped = useCallback((text: string) => {
    if (!text || !text.trim()) return;
    setCaptionState({ text, interim: false, speaker: 'user' });
    onFinalRef.current(text, { explicit: true });
  }, []);

  const clickModeButton = useCallback((m: Mode) => {
    pendingModeRef.current = m;
    toast(`Say or type the topic (${modeLabel(m)})`, { type: 'info' });
  }, []);

  /** Reads and clears the mode a button click is waiting on, in one step —
   * callers never poke pendingModeRef directly, so it stays this hook's to
   * own (its mutation rules are enforced by the React Compiler ESLint rule). */
  const consumePendingMode = useCallback((): Mode | null => {
    const m = pendingModeRef.current;
    pendingModeRef.current = null;
    return m;
  }, []);

  const toggleSmartBoard = useCallback(() => {
    setSmartBoard((prev) => {
      const next = !prev;
      localStorage.setItem('loqwi:smartboard', next ? '1' : '0');
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = smartBoard ? '20px' : '';
  }, [smartBoard]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'daylight' : 'dark';
      localStorage.setItem('loqwi:theme', next);
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const cycleRecognitionLang = useCallback(() => {
    setCfg((prev) =>
      persistConfig({ recognitionLang: prev.recognitionLang === 'hi-IN' ? 'en-IN' : 'hi-IN' })
    );
  }, []);

  const saveSettings = useCallback((partial: Partial<AppConfig>) => {
    setCfg(persistConfig(partial));
    toast('Settings saved.', { type: 'success' });
  }, []);

  return {
    cfg,
    mode,
    modeRef,
    setMode,
    micState,
    setMicState,
    idleMicState,
    busyRef,
    handsFree,
    handsFreeRef,
    caption,
    setCaption: setCaptionState,
    smartBoard,
    theme,
    routeSource,
    setRouteSource,
    confirm,
    requestConfirm,
    resolveConfirm,
    consumePendingMode,
    listenerRef,
    setRouteHandler,
    speakAndWait,
    handleError,
    listenerSupported: speech.SpeechSupport.stt,
    ttsSupported: speech.SpeechSupport.tts,
    actions: {
      toggleMic,
      toggleHandsFree,
      submitTyped,
      clickModeButton,
      toggleSmartBoard,
      toggleTheme,
      cycleRecognitionLang,
      saveSettings,
      resolveConfirm,
    },
  };
}

export type AssistantCore = ReturnType<typeof useAssistantCore>;
