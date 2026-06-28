import { useCallback, useRef, useState } from 'react';
import { runStructured } from '../lib/api';
import { toast } from '../lib/toast';
import type { AssistantCore } from './useAssistantCore';
import type { QuizQuestion, QuizState } from '../types';

export function useQuizMode(core: AssistantCore) {
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const quizRef = useRef<QuizState | null>(null);

  const set = useCallback((value: QuizState | null) => {
    quizRef.current = value;
    setQuiz(value);
  }, []);

  const presentQuizQuestion = useCallback(
    async (questions: QuizQuestion[], index: number, score: number) => {
      set({ questions, index, score, awaitingAnswer: false, revealed: null, finished: false });
      await core.speakAndWait(questions[index].question_speech);
      if (quizRef.current) set({ ...quizRef.current, awaitingAnswer: true });
    },
    [core, set]
  );

  const startQuizFlow = useCallback(
    async (topic: string, numQuestions: number) => {
      if (!topic || !topic.trim()) {
        toast('Which topic for the quiz? e.g. "quiz on fractions paanch sawaal"', { type: 'warn' });
        return;
      }
      core.setMode('quiz');
      set(null);
      core.setMicState('thinking');
      try {
        const data = await runStructured(
          'generate_quiz',
          `Topic: ${topic}. Number of questions: ${numQuestions || 5}.`
        );
        await core.speakAndWait(data.intro_speech);
        await presentQuizQuestion(data.questions, 0, 0);
      } catch (err) {
        core.handleError(err);
      }
    },
    [core, presentQuizQuestion, set]
  );

  const submitQuizAnswer = useCallback(
    async (selectedIndex: number) => {
      const q = quizRef.current;
      if (!q || !q.awaitingAnswer) return;
      const question = q.questions[q.index];
      const correct = selectedIndex === question.correct_index;
      const nextScore = q.score + (correct ? 1 : 0);
      set({
        ...q,
        awaitingAnswer: false,
        score: nextScore,
        revealed: { selectedIndex, correctIndex: question.correct_index },
      });
      await core.speakAndWait(
        (correct ? 'Sahi jawab! ' : 'Galat jawab. ') + question.explanation_speech
      );
    },
    [core, set]
  );

  const finishQuiz = useCallback(
    async (score: number, total: number) => {
      set({
        questions: [],
        index: 0,
        score,
        awaitingAnswer: false,
        revealed: null,
        finished: true,
        total,
      });
      await core.speakAndWait(
        `Quiz khatam ho gaya. Aapne ${score} mein se ${total} sawaal sahi kiye.`
      );
      core.setMode('idle');
    },
    [core, set]
  );

  const advanceQuiz = useCallback(async () => {
    const q = quizRef.current;
    if (!q || q.finished) return;
    if (q.awaitingAnswer) {
      const question = q.questions[q.index];
      set({
        ...q,
        awaitingAnswer: false,
        revealed: { selectedIndex: -1, correctIndex: question.correct_index },
      });
      await core.speakAndWait(
        `Chhod diya. Sahi jawab tha option ${String.fromCharCode(65 + question.correct_index)}.`
      );
    }
    const current = quizRef.current;
    if (!current || current.finished) return;
    const nextIndex = current.index + 1;
    if (nextIndex >= current.questions.length) {
      await finishQuiz(current.score, current.questions.length);
    } else {
      await presentQuizQuestion(current.questions, nextIndex, current.score);
    }
  }, [core, finishQuiz, presentQuizQuestion, set]);

  const resetQuiz = useCallback(() => set(null), [set]);

  return { quiz, quizRef, startQuizFlow, submitQuizAnswer, advanceQuiz, resetQuiz };
}
