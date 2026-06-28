import { useCallback, useRef, useState } from 'react';
import { runStructured } from '../lib/api';
import { toast } from '../lib/toast';
import type { AssistantCore } from './useAssistantCore';
import type { TranslateState } from '../types';

type Updater<T> = T | ((prev: T) => T);

export function useTranslateMode(core: AssistantCore) {
  const [translateState, setTranslateState] = useState<TranslateState | null>(null);
  const translateRef = useRef<TranslateState | null>(null);

  const set = useCallback((value: Updater<TranslateState | null>) => {
    translateRef.current =
      typeof value === 'function'
        ? (value as (prev: TranslateState | null) => TranslateState | null)(translateRef.current)
        : value;
    setTranslateState(translateRef.current);
  }, []);

  const startTranslateFlow = useCallback(
    (initialText: string, targetLangHint?: string | null) => {
      core.setMode('translate');
      set({ buffer: initialText || '', result: null, targetLangHint: targetLangHint || null });
    },
    [core, set]
  );

  const appendTranslateDictation = useCallback(
    (text: string) => {
      set((prev) =>
        prev ? { ...prev, buffer: prev.buffer ? `${prev.buffer} ${text}` : text } : prev
      );
    },
    [set]
  );

  const clearTranslate = useCallback(() => {
    set((prev) => (prev ? { ...prev, buffer: '', result: null } : prev));
  }, [set]);

  const translateNow = useCallback(async () => {
    const t = translateRef.current;
    const text = t?.buffer?.trim();
    if (!text) {
      toast('Say or type something first, then translate.', { type: 'warn' });
      return;
    }
    core.setMicState('thinking');
    try {
      const hint = t?.targetLangHint ? `\n(Preferred target language: ${t.targetLangHint})` : '';
      const data = await runStructured('translate_text', text + hint);
      set((prev) => (prev ? { ...prev, result: data } : prev));
      await core.speakAndWait(data.translated_text);
    } catch (err) {
      core.handleError(err);
    }
  }, [core, set]);

  const resetTranslate = useCallback(() => set(null), [set]);

  return {
    translateState,
    translateRef,
    startTranslateFlow,
    translateNow,
    clearTranslate,
    appendTranslateDictation,
    resetTranslate,
  };
}
