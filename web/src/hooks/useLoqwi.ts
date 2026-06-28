import { useCallback } from 'react';
import * as speech from '../lib/speech';
import {
  classifyLocal,
  hasWakeWord,
  stripWakeWord,
  parseSpokenOption,
  CONTROL_WORDS,
  TRANSLATE_NOW_RE,
  FOLLOWUP_RE,
} from '../lib/intents';
import { runStructured } from '../lib/api';
import { toast } from '../lib/toast';
import { useAssistantCore, modeLabel } from './useAssistantCore';
import { useConceptMode } from './useConceptMode';
import { useQuizMode } from './useQuizMode';
import { useTranslateMode } from './useTranslateMode';
import { useActivityMode } from './useActivityMode';
import type { Mode, DispatchOptions } from '../types';

export { modeLabel };

export function useLoqwi() {
  const core = useAssistantCore();
  const conceptApi = useConceptMode(core);
  const quizApi = useQuizMode(core);
  const translateApi = useTranslateMode(core);
  const activityApi = useActivityMode(core);

  const exitToIdle = useCallback(() => {
    quizApi.resetQuiz();
    translateApi.resetTranslate();
    activityApi.resetActivity();
    conceptApi.resetConcept();
    core.setMode('idle');
  }, [activityApi, conceptApi, core, quizApi, translateApi]);

  const dispatchByMode = useCallback(
    (m: Mode, text: string, opts: DispatchOptions = {}) => {
      switch (m) {
        case 'concept':
          return conceptApi.startConceptFlow(text);
        case 'quiz':
          return quizApi.startQuizFlow(text, opts.numQuestions || 5);
        case 'translate':
          return translateApi.startTranslateFlow(text, opts.targetLang);
        case 'activity':
          return activityApi.startActivityFlow(text);
        default:
          return undefined;
      }
    },
    [activityApi, conceptApi, quizApi, translateApi]
  );

  /** Anything that switches modes goes through here so an in-progress quiz or
   * activity is never silently discarded by a stray command for a different
   * feature — the teacher has to confirm leaving it first. */
  const requestModeSwitch = useCallback(
    (m: Mode, text: string, opts?: DispatchOptions) => {
      const q = quizApi.quizRef.current;
      const a = activityApi.activityRef.current;
      const inProgress = q && !q.finished ? 'quiz' : a ? 'activity' : null;
      if (inProgress && core.modeRef.current !== m) {
        core.requestConfirm(
          `You have a ${inProgress} in progress. Leave it and start ${modeLabel(m)}?`,
          () => dispatchByMode(m, text, opts)
        );
        return;
      }
      dispatchByMode(m, text, opts);
    },
    [activityApi.activityRef, core, dispatchByMode, quizApi.quizRef]
  );

  const dispatchUnclear = useCallback(
    async (text: string) => {
      if (!text || !text.trim()) {
        toast("Didn't catch that. Please try again.", { type: 'warn' });
        return;
      }
      core.setMicState('thinking');
      try {
        const result = await runStructured('classify_intent', text);
        core.setMicState(core.idleMicState());
        if (!result.mode || result.mode === 'unknown') {
          toast(`Didn't understand: "${text}". Please try again.`, { type: 'warn' });
          return;
        }
        core.setRouteSource('ai');
        requestModeSwitch(result.mode, result.topic || text, {
          numQuestions: result.num_questions,
          targetLang: result.target_lang,
        });
      } catch (err) {
        core.handleError(err);
      }
    },
    [core, requestModeSwitch]
  );

  const routeUtterance = useCallback(
    (text: string, { explicit }: { explicit: boolean }) => {
      if (!text || !text.trim()) return;

      if (core.busyRef.current) {
        if (CONTROL_WORDS.stop.test(text)) {
          speech.stopSpeaking();
          core.setMicState(core.idleMicState());
        }
        return;
      }

      const pendingMode = core.consumePendingMode();
      if (pendingMode) {
        core.setRouteSource('manual');
        requestModeSwitch(pendingMode, stripWakeWord(text));
        return;
      }

      const curQuiz = quizApi.quizRef.current;
      if (core.modeRef.current === 'quiz' && curQuiz && !curQuiz.finished) {
        if (curQuiz.awaitingAnswer) {
          const optIdx = parseSpokenOption(text);
          if (optIdx != null) {
            quizApi.submitQuizAnswer(optIdx);
            return;
          }
        }
        if (CONTROL_WORDS.next.test(text)) {
          quizApi.advanceQuiz();
          return;
        }
        if (CONTROL_WORDS.stop.test(text)) {
          exitToIdle();
          return;
        }
      }

      const curActivity = activityApi.activityRef.current;
      if (core.modeRef.current === 'activity' && curActivity) {
        if (CONTROL_WORDS.next.test(text)) {
          activityApi.activityNextStep();
          return;
        }
        if (CONTROL_WORDS.back.test(text)) {
          activityApi.activityPrevStep();
          return;
        }
        if (CONTROL_WORDS.pause.test(text)) {
          activityApi.activityTogglePause();
          return;
        }
        if (CONTROL_WORDS.resume.test(text)) {
          if (curActivity.paused) activityApi.activityTogglePause();
          return;
        }
        if (CONTROL_WORDS.stop.test(text)) {
          exitToIdle();
          return;
        }
      }

      const curConcept = conceptApi.conceptRef.current;
      if (core.modeRef.current === 'concept' && curConcept && FOLLOWUP_RE.test(text)) {
        conceptApi.followUpConcept(text);
        return;
      }

      const curTranslate = translateApi.translateRef.current;
      if (core.modeRef.current === 'translate' && curTranslate) {
        if (TRANSLATE_NOW_RE.test(text)) {
          translateApi.translateNow();
          return;
        }
        if (CONTROL_WORDS.stop.test(text)) {
          exitToIdle();
          return;
        }
        translateApi.appendTranslateDictation(text);
        return;
      }

      if (!explicit && !hasWakeWord(text)) return;

      const cleaned = stripWakeWord(text);
      const local = classifyLocal(cleaned);
      if (local.confident) {
        core.setRouteSource('local');
        requestModeSwitch(local.mode as Mode, local.topic, {
          numQuestions: local.numQuestions ?? undefined,
          targetLang: local.targetLang,
        });
      } else {
        dispatchUnclear(cleaned);
      }
    },
    [
      activityApi,
      conceptApi,
      core,
      dispatchUnclear,
      exitToIdle,
      quizApi,
      requestModeSwitch,
      translateApi,
    ]
  );

  core.setRouteHandler(routeUtterance);

  return {
    cfg: core.cfg,
    mode: core.mode,
    micState: core.micState,
    handsFree: core.handsFree,
    caption: core.caption,
    smartBoard: core.smartBoard,
    theme: core.theme,
    routeSource: core.routeSource,
    confirm: core.confirm,
    prefill: core.prefill,
    concept: conceptApi.concept,
    quiz: quizApi.quiz,
    translateState: translateApi.translateState,
    activity: activityApi.activity,
    listenerSupported: core.listenerSupported,
    ttsSupported: core.ttsSupported,
    actions: {
      ...core.actions,
      submitQuizAnswer: quizApi.submitQuizAnswer,
      advanceQuiz: quizApi.advanceQuiz,
      exitToIdle,
      translateNow: translateApi.translateNow,
      clearTranslate: translateApi.clearTranslate,
      activityPrevStep: activityApi.activityPrevStep,
      activityNextStep: activityApi.activityNextStep,
      activityTogglePause: activityApi.activityTogglePause,
    },
  };
}
