import { useCallback, useEffect, useRef, useState } from 'react';
import { runStructured } from '../lib/api';
import { toast } from '../lib/toast';
import type { AssistantCore } from './useAssistantCore';
import type { ActivityGenerateResult, ActivityState } from '../types';

export function useActivityMode(core: AssistantCore) {
  const [activity, setActivity] = useState<ActivityState | null>(null);
  const activityRef = useRef<ActivityState | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextStepRef = useRef<() => void>(() => {});

  const set = useCallback((value: ActivityState | null) => {
    activityRef.current = value;
    setActivity(value);
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const runActivityStep = useCallback(
    async (data: ActivityGenerateResult, index: number) => {
      clearTimer();
      set({ data, index, secondsLeft: 0, totalSeconds: 0, paused: false });
      await core.speakAndWait(data.steps[index].instruction_speech);
      if (!activityRef.current) return;
      const duration = data.steps[index].duration_seconds;
      set({ data, index, secondsLeft: duration, totalSeconds: duration, paused: false });
      timerRef.current = setInterval(() => {
        setActivity((prev) => {
          if (!prev || prev.paused) return prev;
          const secondsLeft = prev.secondsLeft - 1;
          const next = { ...prev, secondsLeft };
          activityRef.current = next;
          if (secondsLeft <= 0) {
            clearTimer();
            queueMicrotask(() => nextStepRef.current());
            return { ...next, secondsLeft: 0 };
          }
          return next;
        });
      }, 1000);
    },
    [clearTimer, core, set]
  );

  const startActivityFlow = useCallback(
    async (topic: string) => {
      if (!topic || !topic.trim()) {
        toast('Which topic should the activity be about?', { type: 'warn' });
        return;
      }
      core.setMode('activity');
      set(null);
      core.setMicState('thinking');
      try {
        const data = await runStructured('generate_activity', `Topic: ${topic}`);
        await runActivityStep(data, 0);
      } catch (err) {
        core.handleError(err);
      }
    },
    [core, runActivityStep, set]
  );

  const finishActivity = useCallback(async () => {
    if (!activityRef.current) return;
    clearTimer();
    await core.speakAndWait('Activity poori ho gayi. Bahut badhiya!');
    set(null);
    core.setMode('idle');
  }, [clearTimer, core, set]);

  const activityNextStep = useCallback(() => {
    const a = activityRef.current;
    if (!a) return;
    clearTimer();
    const nextIndex = a.index + 1;
    if (nextIndex >= a.data.steps.length) finishActivity();
    else runActivityStep(a.data, nextIndex);
  }, [clearTimer, finishActivity, runActivityStep]);

  useEffect(() => {
    nextStepRef.current = activityNextStep;
  }, [activityNextStep]);

  const activityPrevStep = useCallback(() => {
    const a = activityRef.current;
    if (!a) return;
    clearTimer();
    runActivityStep(a.data, Math.max(0, a.index - 1));
  }, [clearTimer, runActivityStep]);

  const activityTogglePause = useCallback(() => {
    set(
      activityRef.current ? { ...activityRef.current, paused: !activityRef.current.paused } : null
    );
  }, [set]);

  const resetActivity = useCallback(() => {
    clearTimer();
    set(null);
  }, [clearTimer, set]);

  return {
    activity,
    activityRef,
    startActivityFlow,
    activityNextStep,
    activityPrevStep,
    activityTogglePause,
    resetActivity,
  };
}
