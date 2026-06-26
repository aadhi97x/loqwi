import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useLoqwi } from './hooks/useLoqwi';
import TopBar from './components/TopBar';
import CaptionBar from './components/CaptionBar';
import ControlBar from './components/ControlBar';
import SettingsDialog from './components/SettingsDialog';
import Toaster from './components/ui/Toaster';
import Welcome from './components/modes/Welcome';
import ConceptView from './components/modes/ConceptView';
import QuizView from './components/modes/QuizView';
import TranslateView from './components/modes/TranslateView';
import ActivityView from './components/modes/ActivityView';

export default function App() {
  const loqwi = useLoqwi();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { mode, micState, handsFree, caption, smartBoard, concept, quiz, translateState, activity, cfg, actions, listenerSupported } = loqwi;

  let stage;
  if (mode === 'concept' && concept) stage = <ConceptView key="concept" concept={concept} />;
  else if (mode === 'quiz' && quiz) stage = <QuizView key="quiz" quiz={quiz} onSelect={actions.submitQuizAnswer} />;
  else if (mode === 'translate' && translateState)
    stage = (
      <TranslateView
        key="translate"
        translateState={translateState}
        onTranslateNow={actions.translateNow}
        onClear={actions.clearTranslate}
      />
    );
  else if (mode === 'activity' && activity)
    stage = (
      <ActivityView
        key="activity"
        activity={activity}
        onPrev={actions.activityPrevStep}
        onNext={actions.activityNextStep}
        onTogglePause={actions.activityTogglePause}
      />
    );
  else stage = <Welcome key="welcome" />;

  return (
    <div className="flex h-screen flex-col bg-surface-950 text-slate-100">
      <TopBar
        mode={mode}
        recognitionLang={cfg.recognitionLang}
        onCycleLang={actions.cycleRecognitionLang}
        smartBoard={smartBoard}
        onToggleSmartBoard={actions.toggleSmartBoard}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {!listenerSupported ? (
        <div className="border-b border-amber-700/40 bg-amber-500/10 px-5 py-2 text-center text-sm text-amber-300">
          Yeh browser voice input support nahi karta. Chrome ya Edge istemal karein, ya neeche type karein.
        </div>
      ) : null}

      <CaptionBar text={caption.text} interim={caption.interim} />

      <main className="flex flex-1 flex-col overflow-y-auto px-6 py-8">
        <AnimatePresence mode="wait">{stage}</AnimatePresence>
      </main>

      <ControlBar
        micState={micState}
        handsFree={handsFree}
        micSupported={listenerSupported}
        onToggleMic={actions.toggleMic}
        onToggleHandsFree={actions.toggleHandsFree}
        onClickMode={actions.clickModeButton}
        onSubmitTyped={actions.submitTyped}
      />

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} cfg={cfg} onSave={actions.saveSettings} />
      <Toaster />
    </div>
  );
}
