import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useLoqwi } from './hooks/useLoqwi';
import { subscribeOnline } from './lib/api';
import AmbientBackground from './components/AmbientBackground';
import TopBar from './components/TopBar';
import CaptionBar from './components/CaptionBar';
import ControlBar from './components/ControlBar';
import SettingsDialog from './components/SettingsDialog';
import ConfirmDialog from './components/ConfirmDialog';
import OnboardingOverlay from './components/OnboardingOverlay';
import Toaster from './components/ui/Toaster';
import Welcome from './components/modes/Welcome';
import ConceptView from './components/modes/ConceptView';
import QuizView from './components/modes/QuizView';
import TranslateView from './components/modes/TranslateView';
import ActivityView from './components/modes/ActivityView';

const ONBOARDING_KEY = 'loqwi:onboarded';

export default function App() {
  const loqwi = useLoqwi();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(
    () => localStorage.getItem(ONBOARDING_KEY) !== '1'
  );
  const [online, setOnline] = useState(true);

  useEffect(() => subscribeOnline(setOnline), []);

  const {
    mode,
    micState,
    handsFree,
    caption,
    smartBoard,
    theme,
    routeSource,
    confirm,
    concept,
    quiz,
    translateState,
    activity,
    cfg,
    actions,
    listenerSupported,
  } = loqwi;

  function dismissOnboarding() {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setShowOnboarding(false);
  }

  let stage: ReactNode;
  if (mode === 'concept' && concept) stage = <ConceptView key="concept" concept={concept} />;
  else if (mode === 'quiz' && quiz)
    stage = <QuizView key="quiz" quiz={quiz} onSelect={actions.submitQuizAnswer} />;
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
    <div className="relative flex h-screen flex-col bg-surface-950 text-ink-900">
      <AmbientBackground />
      <TopBar
        mode={mode}
        recognitionLang={cfg.recognitionLang}
        onCycleLang={actions.cycleRecognitionLang}
        smartBoard={smartBoard}
        onToggleSmartBoard={actions.toggleSmartBoard}
        theme={theme}
        onToggleTheme={actions.toggleTheme}
        routeSource={routeSource}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {!online ? (
        <div className="border-b border-rose-700/40 bg-rose-500/10 px-5 py-2 text-center text-sm text-[var(--bad-ink)]">
          You&rsquo;re offline. Voice input still works, but AI features need a connection to come
          back.
        </div>
      ) : !listenerSupported ? (
        <div className="border-b border-amber-700/40 bg-amber-500/10 px-5 py-2 text-center text-sm text-[var(--warn-ink)]">
          This browser doesn&rsquo;t support voice input. Please use Chrome or Edge, or type your
          command below.
        </div>
      ) : null}

      <CaptionBar text={caption.text} interim={caption.interim} speaker={caption.speaker} />

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

      <SettingsDialog
        key={settingsOpen ? 'settings-open' : 'settings-closed'}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        cfg={cfg}
        onSave={actions.saveSettings}
      />
      <ConfirmDialog confirm={confirm} onResolve={actions.resolveConfirm} />
      {showOnboarding ? <OnboardingOverlay onDismiss={dismissOnboarding} /> : null}
      <Toaster />
    </div>
  );
}
