import { useCallback, useEffect, useRef, useState } from 'react';
import * as speech from '../lib/speech';
import { classifyLocal, hasWakeWord, stripWakeWord, parseSpokenOption, CONTROL_WORDS } from '../lib/intents';
import { runStructured, getConfig, setConfig as persistConfig } from '../lib/api';
import { toast } from '../lib/toast';

const MODE_LABELS = { idle: 'Idle', concept: 'Concept', quiz: 'Quiz', translate: 'Translate', activity: 'Activity' };
export function modeLabel(mode) {
  return MODE_LABELS[mode] || mode;
}

export function useLoqwi() {
  const [cfg, setCfg] = useState(getConfig());
  const [mode, setModeState] = useState('idle');
  const [micState, setMicStateRaw] = useState('idle');
  const [handsFree, setHandsFree] = useState(false);
  const [caption, setCaptionState] = useState({ text: '', interim: false });
  const [smartBoard, setSmartBoard] = useState(() => localStorage.getItem('loqwi:smartboard') === '1');

  const [concept, setConcept] = useState(null);
  const [quiz, setQuiz] = useState(null); // { questions, index, score, awaitingAnswer, revealed, finished }
  const [translateState, setTranslateState] = useState(null); // { buffer, result, targetLangHint }
  const [activity, setActivity] = useState(null); // { data, index, secondsLeft, totalSeconds, paused }

  const busyRef = useRef(false);
  const handsFreeRef = useRef(false);
  const pendingModeRef = useRef(null);
  const modeRef = useRef('idle');
  const quizRef = useRef(null);
  const activityRef = useRef(null);
  const translateRef = useRef(null);
  const activityTimerRef = useRef(null);
  const listenerRef = useRef(null);

  useEffect(() => {
    handsFreeRef.current = handsFree;
  }, [handsFree]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    quizRef.current = quiz;
  }, [quiz]);
  useEffect(() => {
    activityRef.current = activity;
  }, [activity]);
  useEffect(() => {
    translateRef.current = translateState;
  }, [translateState]);

  // ---------- mic / mode chrome ----------

  const setMicState = useCallback((s) => {
    busyRef.current = s === 'thinking' || s === 'speaking';
    setMicStateRaw(s);
  }, []);

  const idleMicState = useCallback(() => (handsFreeRef.current ? 'listening' : 'idle'), []);

  const setMode = useCallback((m) => {
    if (modeRef.current === 'activity' && m !== 'activity') clearActivityTimer();
    modeRef.current = m;
    setModeState(m);
  }, []);

  function clearActivityTimer() {
    if (activityTimerRef.current) clearInterval(activityTimerRef.current);
    activityTimerRef.current = null;
  }

  const speakAndWait = useCallback(
    async (text) => {
      setMicState('speaking');
      await speech.speak(text, { voiceNamePrefs: { hi: cfg.voiceHi, en: cfg.voiceEn } });
      setMicState(idleMicState());
    },
    [cfg.voiceHi, cfg.voiceEn, idleMicState, setMicState]
  );

  const handleError = useCallback(
    (err) => {
      console.error(err);
      setMicState(idleMicState());
      toast(err?.message || 'Kuch gadbad hui. Dobara try karein.', { type: 'error' });
    },
    [idleMicState, setMicState]
  );

  const exitToIdle = useCallback(() => {
    clearActivityTimer();
    setQuiz(null);
    setTranslateState(null);
    setActivity(null);
    setConcept(null);
    setMode('idle');
  }, [setMode]);

  // ---------- Concept ----------

  const startConceptFlow = useCallback(
    async (topic) => {
      if (!topic || !topic.trim()) {
        toast('Kis topic ko samjhana hai? Jaise: "samjhao gravity"', { type: 'warn' });
        return;
      }
      setMode('concept');
      setConcept(null);
      setMicState('thinking');
      try {
        const data = await runStructured('explain_concept', `Topic: ${topic}`);
        setConcept({ data, topic });
        await speakAndWait(data.speech);
      } catch (err) {
        handleError(err);
      }
    },
    [handleError, setMode, setMicState, speakAndWait]
  );

  // ---------- Quiz ----------

  const presentQuizQuestion = useCallback(
    async (questions, index, score) => {
      setQuiz({ questions, index, score, awaitingAnswer: false, revealed: null, finished: false });
      await speakAndWait(questions[index].question_speech);
      setQuiz((prev) => (prev ? { ...prev, awaitingAnswer: true } : prev));
    },
    [speakAndWait]
  );

  const startQuizFlow = useCallback(
    async (topic, numQuestions) => {
      if (!topic || !topic.trim()) {
        toast('Kis topic par quiz chahiye? Jaise: "quiz on fractions paanch sawaal"', { type: 'warn' });
        return;
      }
      setMode('quiz');
      setQuiz(null);
      setMicState('thinking');
      try {
        const data = await runStructured('generate_quiz', `Topic: ${topic}. Number of questions: ${numQuestions || 5}.`);
        await speakAndWait(data.intro_speech);
        await presentQuizQuestion(data.questions, 0, 0);
      } catch (err) {
        handleError(err);
      }
    },
    [handleError, presentQuizQuestion, setMode, setMicState, speakAndWait]
  );

  const submitQuizAnswer = useCallback(
    async (selectedIndex) => {
      const q = quizRef.current;
      if (!q || !q.awaitingAnswer) return;
      const question = q.questions[q.index];
      const correct = selectedIndex === question.correct_index;
      const nextScore = q.score + (correct ? 1 : 0);
      setQuiz({ ...q, awaitingAnswer: false, score: nextScore, revealed: { selectedIndex, correctIndex: question.correct_index } });
      await speakAndWait((correct ? 'Sahi jawab! ' : 'Galat jawab. ') + question.explanation_speech);
    },
    [speakAndWait]
  );

  const finishQuiz = useCallback(
    async (score, total) => {
      setQuiz({ questions: [], index: 0, score, awaitingAnswer: false, revealed: null, finished: true, total });
      await speakAndWait(`Quiz khatam ho gaya. Aapne ${score} mein se ${total} sawaal sahi kiye.`);
      setMode('idle');
    },
    [setMode, speakAndWait]
  );

  const advanceQuiz = useCallback(async () => {
    const q = quizRef.current;
    if (!q || q.finished) return;
    if (q.awaitingAnswer) {
      const question = q.questions[q.index];
      setQuiz({ ...q, awaitingAnswer: false, revealed: { selectedIndex: -1, correctIndex: question.correct_index } });
      await speakAndWait(`Chhod diya. Sahi jawab tha option ${String.fromCharCode(65 + question.correct_index)}.`);
    }
    const current = quizRef.current;
    if (!current || current.finished) return;
    const nextIndex = current.index + 1;
    if (nextIndex >= current.questions.length) {
      await finishQuiz(current.score, current.questions.length);
    } else {
      await presentQuizQuestion(current.questions, nextIndex, current.score);
    }
  }, [finishQuiz, presentQuizQuestion, speakAndWait]);

  // ---------- Translate ----------

  const startTranslateFlow = useCallback(
    (initialText, targetLangHint) => {
      setMode('translate');
      setTranslateState({ buffer: initialText || '', result: null, targetLangHint: targetLangHint || null });
    },
    [setMode]
  );

  const appendTranslateDictation = useCallback((text) => {
    setTranslateState((prev) => (prev ? { ...prev, buffer: prev.buffer ? `${prev.buffer} ${text}` : text } : prev));
  }, []);

  const clearTranslate = useCallback(() => {
    setTranslateState((prev) => (prev ? { ...prev, buffer: '', result: null } : prev));
  }, []);

  const translateNow = useCallback(async () => {
    const t = translateRef.current;
    const text = t?.buffer?.trim();
    if (!text) {
      toast('Pehle kuch bolen ya type karein, phir translate karein.', { type: 'warn' });
      return;
    }
    setMicState('thinking');
    try {
      const hint = t.targetLangHint ? `\n(Preferred target language: ${t.targetLangHint})` : '';
      const data = await runStructured('translate_text', text + hint);
      setTranslateState((prev) => (prev ? { ...prev, result: data } : prev));
      await speakAndWait(data.translated_text);
    } catch (err) {
      handleError(err);
    }
  }, [handleError, setMicState, speakAndWait]);

  // ---------- Activity ----------

  const runActivityStep = useCallback(
    async (data, index) => {
      clearActivityTimer();
      setActivity({ data, index, secondsLeft: 0, totalSeconds: 0, paused: false });
      await speakAndWait(data.steps[index].instruction_speech);
      if (!activityRef.current) return;
      const duration = data.steps[index].duration_seconds;
      setActivity({ data, index, secondsLeft: duration, totalSeconds: duration, paused: false });
      activityTimerRef.current = setInterval(() => {
        setActivity((prev) => {
          if (!prev || prev.paused) return prev;
          const secondsLeft = prev.secondsLeft - 1;
          if (secondsLeft <= 0) {
            clearActivityTimer();
            queueMicrotask(() => activityNextStepRef.current());
            return { ...prev, secondsLeft: 0 };
          }
          return { ...prev, secondsLeft };
        });
      }, 1000);
    },
    [speakAndWait]
  );

  const startActivityFlow = useCallback(
    async (topic) => {
      if (!topic || !topic.trim()) {
        toast('Kis topic par activity chahiye?', { type: 'warn' });
        return;
      }
      setMode('activity');
      setActivity(null);
      setMicState('thinking');
      try {
        const data = await runStructured('generate_activity', `Topic: ${topic}`);
        await runActivityStep(data, 0);
      } catch (err) {
        handleError(err);
      }
    },
    [handleError, runActivityStep, setMode, setMicState]
  );

  const finishActivity = useCallback(async () => {
    if (!activityRef.current) return;
    clearActivityTimer();
    await speakAndWait('Activity poori ho gayi. Bahut badhiya!');
    setActivity(null);
    setMode('idle');
  }, [setMode, speakAndWait]);

  const activityNextStep = useCallback(() => {
    const a = activityRef.current;
    if (!a) return;
    clearActivityTimer();
    const nextIndex = a.index + 1;
    if (nextIndex >= a.data.steps.length) finishActivity();
    else runActivityStep(a.data, nextIndex);
  }, [finishActivity, runActivityStep]);

  const activityNextStepRef = useRef(activityNextStep);
  useEffect(() => {
    activityNextStepRef.current = activityNextStep;
  }, [activityNextStep]);

  const activityPrevStep = useCallback(() => {
    const a = activityRef.current;
    if (!a) return;
    clearActivityTimer();
    runActivityStep(a.data, Math.max(0, a.index - 1));
  }, [runActivityStep]);

  const activityTogglePause = useCallback(() => {
    setActivity((prev) => (prev ? { ...prev, paused: !prev.paused } : prev));
  }, []);

  // ---------- Dispatch ----------

  const dispatchByMode = useCallback(
    (m, text) => {
      switch (m) {
        case 'concept':
          return startConceptFlow(text);
        case 'quiz':
          return startQuizFlow(text, 5);
        case 'translate':
          return startTranslateFlow(text);
        case 'activity':
          return startActivityFlow(text);
        default:
          return undefined;
      }
    },
    [startActivityFlow, startConceptFlow, startQuizFlow, startTranslateFlow]
  );

  const dispatchUnclear = useCallback(
    async (text) => {
      if (!text || !text.trim()) {
        toast('Kuch sunai nahi diya. Dobara boliye.', { type: 'warn' });
        return;
      }
      setMicState('thinking');
      try {
        const result = await runStructured('classify_intent', text);
        setMicState(idleMicState());
        if (!result.mode || result.mode === 'unknown') {
          toast(`Samajh nahi aaya: "${text}". Dobara try karein.`, { type: 'warn' });
          return;
        }
        dispatchByMode(result.mode, result.topic || text);
      } catch (err) {
        handleError(err);
      }
    },
    [dispatchByMode, handleError, idleMicState, setMicState]
  );

  const dispatchLocal = useCallback(
    (local) => {
      switch (local.mode) {
        case 'concept':
          return startConceptFlow(local.topic);
        case 'quiz':
          return startQuizFlow(local.topic, local.numQuestions || 5);
        case 'translate':
          return startTranslateFlow(local.topic, local.targetLang);
        case 'activity':
          return startActivityFlow(local.topic);
        default:
          return dispatchUnclear(local.topic);
      }
    },
    [dispatchUnclear, startActivityFlow, startConceptFlow, startQuizFlow, startTranslateFlow]
  );

  const routeUtterance = useCallback(
    (text, { explicit }) => {
      if (!text || !text.trim()) return;

      if (busyRef.current) {
        if (CONTROL_WORDS.stop.test(text)) {
          speech.stopSpeaking();
          setMicState(idleMicState());
        }
        return;
      }

      if (pendingModeRef.current) {
        const m = pendingModeRef.current;
        pendingModeRef.current = null;
        dispatchByMode(m, stripWakeWord(text));
        return;
      }

      const curQuiz = quizRef.current;
      if (modeRef.current === 'quiz' && curQuiz && !curQuiz.finished) {
        if (curQuiz.awaitingAnswer) {
          const optIdx = parseSpokenOption(text);
          if (optIdx != null) {
            submitQuizAnswer(optIdx);
            return;
          }
        }
        if (CONTROL_WORDS.next.test(text)) {
          advanceQuiz();
          return;
        }
        if (CONTROL_WORDS.stop.test(text)) {
          exitToIdle();
          return;
        }
      }

      const curActivity = activityRef.current;
      if (modeRef.current === 'activity' && curActivity) {
        if (CONTROL_WORDS.next.test(text)) {
          activityNextStep();
          return;
        }
        if (CONTROL_WORDS.back.test(text)) {
          activityPrevStep();
          return;
        }
        if (CONTROL_WORDS.pause.test(text)) {
          activityTogglePause();
          return;
        }
        if (CONTROL_WORDS.resume.test(text)) {
          if (curActivity.paused) activityTogglePause();
          return;
        }
        if (CONTROL_WORDS.stop.test(text)) {
          exitToIdle();
          return;
        }
      }

      const curTranslate = translateRef.current;
      if (modeRef.current === 'translate' && curTranslate) {
        const wordCount = text.trim().split(/\s+/).length;
        if (/\b(translate|anuvad|tarjuma|अनुवाद)\b/i.test(text) && wordCount <= 6) {
          translateNow();
          return;
        }
        if (CONTROL_WORDS.stop.test(text)) {
          exitToIdle();
          return;
        }
        appendTranslateDictation(text);
        return;
      }

      if (!explicit && !hasWakeWord(text)) return;

      const cleaned = stripWakeWord(text);
      const local = classifyLocal(cleaned);
      if (local.confident) dispatchLocal(local);
      else dispatchUnclear(cleaned);
    },
    [
      activityNextStep,
      activityPrevStep,
      activityTogglePause,
      advanceQuiz,
      appendTranslateDictation,
      dispatchByMode,
      dispatchLocal,
      dispatchUnclear,
      exitToIdle,
      idleMicState,
      setMicState,
      submitQuizAnswer,
      translateNow,
    ]
  );

  // ---------- Listener wiring ----------

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
      onInterim: (text) => setCaptionState({ text, interim: true }),
      onFinal: (text) => {
        setCaptionState({ text, interim: false });
        routeUtterance(text, { explicit: !handsFreeRef.current });
      },
      onError: (e) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          toast('Mic permission denied hai. Browser settings mein microphone allow karein.', { type: 'error' });
        }
      },
    });
    listenerRef.current = listener;
    return () => listener.abort();
    // Recreated only when recognitionLang changes (handled via setLang below for the
    // common case); routeUtterance is intentionally read fresh via refs each call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    listenerRef.current?.setLang(cfg.recognitionLang);
  }, [cfg.recognitionLang]);

  // routeUtterance changes identity across renders (it closes over many
  // callbacks); keep the listener's handlers reading the latest version
  // without recreating the SpeechRecognition instance itself.
  const routeRef = useRef(routeUtterance);
  useEffect(() => {
    routeRef.current = routeUtterance;
  }, [routeUtterance]);

  useEffect(() => {
    if (!listenerRef.current) return;
    listenerRef.current.onFinal = (text) => {
      setCaptionState({ text, interim: false });
      routeRef.current(text, { explicit: !handsFreeRef.current });
    };
  }, [routeUtterance]);

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
          toast('Hands-free mode ON — "Hey Loqwi" bolkar command shuru karein.', { type: 'info' });
        } else {
          listener.stop();
          setMicStateRaw('idle');
        }
      }
      return next;
    });
  }, []);

  const submitTyped = useCallback(
    (text) => {
      if (!text || !text.trim()) return;
      setCaptionState({ text, interim: false });
      routeUtterance(text, { explicit: true });
    },
    [routeUtterance]
  );

  const clickModeButton = useCallback((m) => {
    pendingModeRef.current = m;
    toast(`Topic boliye ya type karein (${modeLabel(m)})`, { type: 'info' });
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

  const cycleRecognitionLang = useCallback(() => {
    const next = cfg.recognitionLang === 'hi-IN' ? 'en-IN' : 'hi-IN';
    setCfg(persistConfig({ recognitionLang: next }));
  }, [cfg.recognitionLang]);

  const saveSettings = useCallback((partial) => {
    setCfg(persistConfig(partial));
    toast('Settings saved.', { type: 'success' });
  }, []);

  return {
    cfg,
    mode,
    micState,
    handsFree,
    caption,
    smartBoard,
    concept,
    quiz,
    translateState,
    activity,
    listenerSupported: speech.SpeechSupport.stt,
    ttsSupported: speech.SpeechSupport.tts,
    actions: {
      toggleMic,
      toggleHandsFree,
      submitTyped,
      clickModeButton,
      toggleSmartBoard,
      cycleRecognitionLang,
      saveSettings,
      submitQuizAnswer,
      advanceQuiz,
      exitToIdle,
      translateNow,
      clearTranslate,
      activityPrevStep,
      activityNextStep,
      activityTogglePause,
    },
  };
}
