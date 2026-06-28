import { useCallback, useRef, useState } from 'react';
import { runStructured } from '../lib/api';
import { toast } from '../lib/toast';
import type { AssistantCore } from './useAssistantCore';
import type { ConceptState } from '../types';

export function useConceptMode(core: AssistantCore) {
  const [concept, setConcept] = useState<ConceptState | null>(null);
  const conceptRef = useRef<ConceptState | null>(null);

  const set = useCallback((value: ConceptState | null) => {
    conceptRef.current = value;
    setConcept(value);
  }, []);

  const startConceptFlow = useCallback(
    async (topic: string) => {
      if (!topic || !topic.trim()) {
        toast('Which topic should I explain? e.g. "samjhao gravity"', { type: 'warn' });
        return;
      }
      core.setMode('concept');
      set(null);
      core.setMicState('thinking');
      try {
        const data = await runStructured('explain_concept', `Topic: ${topic}`);
        set({ data, topic });
        await core.speakAndWait(data.speech);
      } catch (err) {
        core.handleError(err);
      }
    },
    [core, set]
  );

  /** "make it simpler" / "one more example" — reuses the same task with the
   * prior explanation folded into the prompt as context, instead of starting
   * from a blank topic. */
  const followUpConcept = useCallback(
    async (instruction: string) => {
      const prev = conceptRef.current;
      if (!prev) return;
      core.setMicState('thinking');
      try {
        const data = await runStructured(
          'explain_concept',
          `Topic: ${prev.topic}\nThe teacher already heard this explanation: "${prev.data.speech}"\nFollow-up request: ${instruction}\nBuild on the previous explanation rather than repeating it verbatim.`
        );
        set({ data, topic: prev.topic });
        await core.speakAndWait(data.speech);
      } catch (err) {
        core.handleError(err);
      }
    },
    [core, set]
  );

  const resetConcept = useCallback(() => set(null), [set]);

  return { concept, conceptRef, startConceptFlow, followUpConcept, resetConcept };
}
