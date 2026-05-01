import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  BookOpen,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  FileSearch,
  Home,
  List,
  MapPin,
  MessageSquareText,
  PhoneCall,
  Play,
  RotateCcw,
  Scale,
  Search,
  ShieldQuestion,
  SkipForward,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react';
import episodeData from '../data/episode-01.json';
import {
  applyEffects,
  addUnique,
  canRunInteraction,
  createInitialState,
  hasAllFlags,
  loadSavedState,
  saveState,
} from './gameLogic';
import { soundEngine, type SoundCue } from './sound';
import type { Character, DeductionQuestion, Ending, EndingScene, Episode, Evidence, GameState, InspectAction, Location, OpeningScene, Talk, ViewMode } from './types';

const episode = episodeData as Episode;
const SOUND_STORAGE_KEY = 'midnight-will:sound:v1';
const locationsById = new Map(episode.locations.map((location) => [location.id, location]));
const charactersById = new Map(episode.characters.map((character) => [character.id, character]));
const evidenceById = new Map(episode.evidence.map((item) => [item.id, item]));
const ATLAS = {
  locations: '/assets/locations-atlas.png',
  evidence: '/assets/evidence-atlas.png',
  characters: '/assets/characters-atlas.png',
};

const commandItems: Array<{ mode: ViewMode; label: string; icon: typeof MapPin }> = [
  { mode: 'move', label: '移動', icon: MapPin },
  { mode: 'inspect', label: '調べる', icon: Search },
  { mode: 'talk', label: '話す', icon: MessageSquareText },
  { mode: 'present', label: '見せる', icon: FileSearch },
  { mode: 'deduction', label: '推理する', icon: ShieldQuestion },
  { mode: 'evidence', label: '証拠品', icon: Briefcase },
  { mode: 'log', label: 'ログ', icon: List },
];

function App() {
  const [gameState, setGameState] = useState<GameState>(() => loadSavedState(episode) ?? createInitialState(episode));
  const [selectedCharacterId, setSelectedCharacterId] = useState(episode.characters[0]?.id ?? '');
  const [selectedEvidenceId, setSelectedEvidenceId] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [soundEnabled, setSoundEnabled] = useState(() => window.localStorage.getItem(SOUND_STORAGE_KEY) !== 'off');

  const openingScenes = episode.opening.scenes;
  const baseLocation = locationsById.get(gameState.currentLocationId) ?? episode.locations[0];
  const finalUnlocked = gameState.flags.includes('final_unlocked');
  const hasEvidence = gameState.evidenceIds.length > 0;
  const openingSceneIndex = clampIndex(gameState.openingSceneIndex ?? 0, openingScenes.length);
  const activeOpeningScene = gameState.mode === 'opening' ? openingScenes[openingSceneIndex] : undefined;
  const successEnding = episode.endings.success;
  const endingSceneIndex = clampIndex(gameState.endingSceneIndex ?? 0, successEnding.scenes.length);
  const activeEndingScene =
    gameState.mode === 'ending' && gameState.endingId === 'success' ? successEnding.scenes[endingSceneIndex] : undefined;
  const activeStoryScene = activeOpeningScene ?? activeEndingScene;
  const sceneLocation = activeStoryScene?.locationId ? locationsById.get(activeStoryScene.locationId) : undefined;
  const currentLocation = sceneLocation ?? baseLocation;
  const storyTitle = activeStoryScene?.title ?? currentLocation.name;
  const storyNarrative = activeStoryScene?.text ?? gameState.narrative;
  const storySpeaker = activeStoryScene?.speakerId
    ? charactersById.get(activeStoryScene.speakerId)
    : gameState.activeSpeakerId
      ? charactersById.get(gameState.activeSpeakerId)
      : undefined;
  const isOpening = gameState.mode === 'opening';
  const openingComplete = isOpening && openingSceneIndex >= openingScenes.length - 1;
  const isEnding = gameState.mode === 'ending' && gameState.endingId === 'success';
  const endingComplete = isEnding && endingSceneIndex >= successEnding.scenes.length - 1;
  const statusLabel = endingComplete
    ? '第1話 完'
    : isEnding
      ? '真相解明中'
      : openingComplete
        ? '調査開始前'
        : isOpening
          ? '導入'
          : finalUnlocked
            ? '最終推理可能'
            : '調査継続';

  useEffect(() => {
    saveState(gameState);
  }, [gameState]);

  useEffect(() => {
    window.localStorage.setItem(SOUND_STORAGE_KEY, soundEnabled ? 'on' : 'off');
    if (!soundEnabled) {
      soundEngine.disable();
    }
  }, [soundEnabled]);

  function updateState(updater: (state: GameState) => GameState) {
    setGameState((current) => updater(current));
  }

  function playSound(cue: SoundCue) {
    if (!soundEnabled) return;
    void soundEngine.enable().then(() => soundEngine.play(cue));
  }

  function startGame() {
    const firstScene = openingScenes[0];
    if (!firstScene) {
      beginInvestigation();
      return;
    }
    playSound('opening');
    updateState((state) => ({
      ...state,
      started: true,
      currentLocationId: firstScene.locationId ?? episode.initialLocationId,
      visitedLocationIds: addUnique(state.visitedLocationIds, [firstScene.locationId ?? episode.initialLocationId]),
      narrative: firstScene.text,
      log: [...state.log, '午前0時過ぎ、所長から緊急の連絡を受けた。'],
      activeSpeakerId: firstScene.speakerId,
      mode: 'opening',
      openingSceneIndex: 0,
      endingId: undefined,
      endingSceneIndex: undefined,
    }));
  }

  function beginInvestigation() {
    playSound('start');
    updateState((state) => ({
      ...state,
      started: true,
      currentLocationId: episode.initialLocationId,
      visitedLocationIds: addUnique(state.visitedLocationIds, [episode.initialLocationId]),
      narrative: episode.opening.startText,
      log: [...state.log, '調査開始。午前0時18分、事務所に到着した。'],
      activeSpeakerId: undefined,
      mode: 'scene',
      openingSceneIndex: undefined,
      endingId: undefined,
      endingSceneIndex: undefined,
    }));
  }

  function resetGame() {
    playSound('reset');
    window.localStorage.removeItem('midnight-will:save:v1');
    setAnswers({});
    setSelectedCharacterId(episode.characters[0]?.id ?? '');
    setSelectedEvidenceId('');
    setGameState(createInitialState(episode));
  }

  function setMode(mode: ViewMode) {
    playSound('command');
    updateState((state) => ({ ...state, mode, openingSceneIndex: undefined, endingId: undefined, endingSceneIndex: undefined }));
  }

  function moveTo(locationId: string) {
    playSound('move');
    updateState((state) => {
      const location = locationsById.get(locationId);
      if (!location) return state;
      const visited = state.visitedLocationIds.includes(locationId);
      return {
        ...state,
        currentLocationId: locationId,
        visitedLocationIds: visited ? state.visitedLocationIds : [...state.visitedLocationIds, locationId],
        narrative: visited ? location.description : location.firstDescription,
        log: [...state.log, `${location.name}へ移動した。`],
        activeSpeakerId: undefined,
        mode: 'scene',
        openingSceneIndex: undefined,
        endingId: undefined,
        endingSceneIndex: undefined,
      };
    });
  }

  function runInspect(action: InspectAction) {
    playSound(action.addEvidence?.length ? 'evidence' : 'inspect');
    updateState((state) =>
      applyEffects(
        state,
        {
          narrative: action.text,
          addEvidence: action.addEvidence,
          setFlags: action.setFlags,
          log: action.log,
          activeSpeakerId: undefined,
          mode: 'scene',
        },
        episode,
      ),
    );
  }

  function runTalk(talk: Talk) {
    playSound(talk.addEvidence?.length ? 'evidence' : 'talk');
    updateState((state) =>
      applyEffects(
        state,
        {
          narrative: talk.text,
          addEvidence: talk.addEvidence,
          setFlags: talk.setFlags,
          log: talk.log,
          activeSpeakerId: talk.characterId,
          mode: 'scene',
        },
        episode,
      ),
    );
  }

  function presentEvidence() {
    if (!selectedCharacterId || !selectedEvidenceId) return;
    playSound('present');
    const character = charactersById.get(selectedCharacterId);
    const evidence = evidenceById.get(selectedEvidenceId);
    const reaction = findPresentReaction(selectedCharacterId, selectedEvidenceId, gameState);
    const text =
      reaction?.text ??
      `${character?.name ?? '相手'}に${evidence?.name ?? '証拠'}を示した。今のところ、決定的な反応はない。`;
    updateState((state) =>
      applyEffects(
        state,
        {
          narrative: text,
          addEvidence: reaction?.addEvidence,
          setFlags: reaction?.setFlags,
          log: reaction?.log ?? `${character?.name ?? '相手'}に「${evidence?.name ?? '証拠'}」を示した。`,
          activeSpeakerId: selectedCharacterId,
          mode: 'scene',
        },
        episode,
      ),
    );
  }

  function submitDeduction() {
    const correct = episode.deduction.questions.every((question) => answers[question.id] === question.answer);
    playSound(correct ? 'reveal' : 'failure');
    if (correct) {
      updateState((state) => applySuccessEnding(state, episode.endings.success));
      return;
    }
    updateState((state) => applyDeductionFailure(state, episode.endings.failure));
  }

  function showOpeningScene(index: number) {
    const nextIndex = clampIndex(index, openingScenes.length);
    const nextScene = openingScenes[nextIndex];
    if (!nextScene) return;
    playSound(nextScene.kind === 'start' ? 'start' : 'command');
    updateState((state) => applyOpeningScene(state, nextScene, nextIndex));
  }

  function showEndingScene(index: number) {
    const nextIndex = clampIndex(index, successEnding.scenes.length);
    const nextScene = successEnding.scenes[nextIndex];
    if (!nextScene) return;
    playSound(nextScene.kind === 'clear' ? 'clear' : 'command');
    updateState((state) => applyEndingScene(state, nextScene, nextIndex));
  }

  function retryDeduction() {
    playSound('command');
    updateState((state) => ({
      ...state,
      mode: 'deduction',
      endingId: undefined,
      endingSceneIndex: undefined,
      activeSpeakerId: undefined,
      narrative: '推理を組み直す。金庫ではなく、会議室で起きた数分をもう一度整理する。',
    }));
  }

  function returnToInvestigation() {
    playSound('command');
    updateState((state) => ({
      ...state,
      mode: 'scene',
      endingId: undefined,
      endingSceneIndex: undefined,
      activeSpeakerId: undefined,
      narrative: currentLocation.description,
    }));
  }

  function restartInvestigation() {
    playSound('start');
    window.localStorage.removeItem('midnight-will:save:v1');
    setAnswers({});
    setSelectedCharacterId(episode.characters[0]?.id ?? '');
    setSelectedEvidenceId('');
    setGameState({
      ...createInitialState(episode),
      started: true,
      narrative: episode.opening.startText,
      log: ['調査開始。午前0時18分、事務所に到着した。'],
    });
  }

  function toggleSound() {
    setSoundEnabled((current) => {
      const next = !current;
      if (next) {
        void soundEngine.enable().then(() => soundEngine.play('start'));
      } else {
        soundEngine.disable();
      }
      return next;
    });
  }

  if (!gameState.started) {
    return <TitleScreen soundEnabled={soundEnabled} onStart={startGame} onToggleSound={toggleSound} />;
  }

  return (
    <main className="app-shell">
      <Header
        currentLocationName={currentLocation.name}
        evidenceCount={gameState.evidenceIds.length}
        statusLabel={statusLabel}
        soundEnabled={soundEnabled}
        onReset={resetGame}
        onToggleSound={toggleSound}
      />
      <section className="workspace" aria-label="ゲーム画面">
        <section
          className={isEnding ? 'story-panel ending-story-panel' : isOpening ? 'story-panel opening-story-panel' : 'story-panel'}
          aria-live="polite"
        >
          <div className="case-strip">
            <Scale aria-hidden="true" size={18} />
            <span>{isEnding ? '終章' : isOpening ? '導入' : '第1話'}</span>
          </div>
          {isOpening ? <OpeningBanner scene={activeOpeningScene} index={openingSceneIndex} total={openingScenes.length} /> : null}
          {isEnding ? <EndingBanner scene={activeEndingScene} index={endingSceneIndex} total={successEnding.scenes.length} /> : null}
          <h1>{storyTitle}</h1>
          <LocationArt location={currentLocation} />
          <NarrativeText
            text={storyNarrative}
            speaker={storySpeaker}
            soundEnabled={soundEnabled}
          />
        </section>

        <aside className={isEnding || isOpening ? 'command-panel ending-command-panel' : 'command-panel'}>
          {isOpening ? (
            <OpeningProgressPanel
              scenes={openingScenes}
              currentIndex={openingSceneIndex}
              onPrevious={() => showOpeningScene(openingSceneIndex - 1)}
              onNext={() => showOpeningScene(openingSceneIndex + 1)}
              onSkip={beginInvestigation}
              onStart={beginInvestigation}
            />
          ) : isEnding ? (
            <EndingProgressPanel
              ending={successEnding}
              currentIndex={endingSceneIndex}
              onPrevious={() => showEndingScene(endingSceneIndex - 1)}
              onNext={() => showEndingScene(endingSceneIndex + 1)}
              onReset={resetGame}
              onRestart={restartInvestigation}
            />
          ) : (
            <>
              <CommandBar
                mode={gameState.mode}
                finalUnlocked={finalUnlocked}
                hasEvidence={hasEvidence}
                onSelect={setMode}
              />
              <ActionPane
                state={gameState}
                mode={gameState.mode}
                currentLocation={currentLocation}
                acquiredEvidenceIds={gameState.evidenceIds}
                selectedCharacterId={selectedCharacterId}
                selectedEvidenceId={selectedEvidenceId}
                answers={answers}
                deductionFailed={gameState.mode === 'deduction' && gameState.endingId === 'failure'}
                failureScene={episode.endings.failure.scenes[0]}
                onMove={moveTo}
                onInspect={runInspect}
                onTalk={runTalk}
                onCharacterChange={setSelectedCharacterId}
                onEvidenceChange={setSelectedEvidenceId}
                onPresent={presentEvidence}
                onAnswer={setAnswers}
                onSubmitDeduction={submitDeduction}
                onRetryDeduction={retryDeduction}
                onReturnToInvestigation={returnToInvestigation}
              />
            </>
          )}
        </aside>
      </section>
      <footer className="status-bar">
        <span>証拠 {gameState.evidenceIds.length} / {episode.evidence.length}</span>
        <span>ログ {gameState.log.length}</span>
        <span>{statusLabel}</span>
      </footer>
    </main>
  );
}

function TitleScreen({
  soundEnabled,
  onStart,
  onToggleSound,
}: {
  soundEnabled: boolean;
  onStart: () => void;
  onToggleSound: () => void;
}) {
  const SoundIcon = soundEnabled ? Volume2 : VolumeX;

  return (
    <main className="title-screen">
      <section className="title-frame">
        <button
          className={soundEnabled ? 'icon-button title-sound sound-on' : 'icon-button title-sound'}
          type="button"
          onClick={onToggleSound}
          aria-label={soundEnabled ? '音をオフにする' : '音をオンにする'}
        >
          <SoundIcon size={18} />
        </button>
        <div className="title-mark" aria-hidden="true">
          <Scale size={42} />
          <BookOpen size={38} />
        </div>
        <p className="case-number">第1話</p>
        <h1>{episode.title}</h1>
        <p className="subtitle">{episode.subtitle}</p>
        <div className="title-art" aria-hidden="true">
          <div className="title-location-strip" />
          <div className="title-character-lineup">
            {episode.characters.map((character) => (
              <CharacterSprite key={character.id} character={character} size="medium" />
            ))}
          </div>
        </div>
        <div className="opening-text">
          {episode.opening.lines.slice(0, 3).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <button className="primary-button title-button" type="button" onClick={onStart}>
          <FileSearch size={19} />
          調査を始める
        </button>
      </section>
    </main>
  );
}

function Header({
  currentLocationName,
  evidenceCount,
  statusLabel,
  soundEnabled,
  onReset,
  onToggleSound,
}: {
  currentLocationName: string;
  evidenceCount: number;
  statusLabel: string;
  soundEnabled: boolean;
  onReset: () => void;
  onToggleSound: () => void;
}) {
  const SoundIcon = soundEnabled ? Volume2 : VolumeX;

  return (
    <header className="topbar">
      <div className="brand">
        <Scale size={22} aria-hidden="true" />
        <span>{episode.title}</span>
      </div>
      <div className="topbar-meta" aria-label="進行状況">
        <span>{currentLocationName}</span>
        <span>証拠 {evidenceCount}/{episode.evidence.length}</span>
        <span>{statusLabel}</span>
      </div>
      <div className="topbar-actions">
        <button
          className={soundEnabled ? 'icon-button sound-on' : 'icon-button'}
          type="button"
          onClick={onToggleSound}
          aria-label={soundEnabled ? '音をオフにする' : '音をオンにする'}
        >
          <SoundIcon size={18} />
        </button>
        <button className="icon-button" type="button" onClick={onReset} aria-label="進行をリセット">
          <RotateCcw size={18} />
        </button>
      </div>
    </header>
  );
}

function CommandBar({
  mode,
  finalUnlocked,
  hasEvidence,
  onSelect,
}: {
  mode: ViewMode;
  finalUnlocked: boolean;
  hasEvidence: boolean;
  onSelect: (mode: ViewMode) => void;
}) {
  return (
    <nav className="command-grid" aria-label="コマンド">
      {commandItems.map((item) => {
        const Icon = item.icon;
        const disabled = (item.mode === 'deduction' && !finalUnlocked) || (item.mode === 'present' && !hasEvidence);
        return (
          <button
            key={item.mode}
            className={mode === item.mode ? 'command active' : 'command'}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(item.mode)}
          >
            <Icon size={18} aria-hidden="true" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function OpeningBanner({ scene, index, total }: { scene?: OpeningScene; index: number; total: number }) {
  return (
    <div className={scene?.kind === 'start' ? 'opening-banner start' : 'opening-banner'}>
      <span>事件導入</span>
      <strong>{String(index + 1).padStart(2, '0')}</strong>
      <span>{total}幕</span>
    </div>
  );
}

function OpeningProgressPanel({
  scenes,
  currentIndex,
  onPrevious,
  onNext,
  onSkip,
  onStart,
}: {
  scenes: OpeningScene[];
  currentIndex: number;
  onPrevious: () => void;
  onNext: () => void;
  onSkip: () => void;
  onStart: () => void;
}) {
  const atStart = currentIndex <= 0;
  const atEnd = currentIndex >= scenes.length - 1;

  return (
    <div className="action-stack opening-progress">
      <h2>オープニング進行</h2>
      <div className="opening-case-card">
        <PhoneCall size={20} aria-hidden="true" />
        <div>
          <span>緊急連絡</span>
          <strong>午前0時18分までの導入</strong>
        </div>
      </div>
      <ol className="opening-steps">
        {scenes.map((scene, index) => (
          <li key={`${scene.title}-${index}`} className={index === currentIndex ? 'active' : index < currentIndex ? 'done' : ''}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            {scene.title}
          </li>
        ))}
      </ol>
      <div className="opening-actions">
        <button className="secondary-button compact" type="button" disabled={atStart} onClick={onPrevious}>
          <ChevronLeft size={18} />
          前へ
        </button>
        {!atEnd ? (
          <button className="primary-button compact" type="button" onClick={onNext}>
            次へ
            <ChevronRight size={18} />
          </button>
        ) : (
          <button className="primary-button compact" type="button" onClick={onStart}>
            <Play size={18} />
            調査開始
          </button>
        )}
        {!atEnd ? (
          <button className="secondary-button compact skip-opening-button" type="button" onClick={onSkip}>
            <SkipForward size={18} />
            導入をスキップ
          </button>
        ) : null}
      </div>
    </div>
  );
}

function EndingBanner({ scene, index, total }: { scene?: EndingScene; index: number; total: number }) {
  const label = scene?.kind === 'clear' ? '第1話 完' : '真相解明';

  return (
    <div className={scene?.kind === 'clear' ? 'ending-banner clear' : 'ending-banner'}>
      <span>{label}</span>
      <strong>{String(index + 1).padStart(2, '0')}</strong>
      <span>{total}幕</span>
    </div>
  );
}

function EndingProgressPanel({
  ending,
  currentIndex,
  onPrevious,
  onNext,
  onReset,
  onRestart,
}: {
  ending: Ending;
  currentIndex: number;
  onPrevious: () => void;
  onNext: () => void;
  onReset: () => void;
  onRestart: () => void;
}) {
  const atStart = currentIndex <= 0;
  const atEnd = currentIndex >= ending.scenes.length - 1;

  return (
    <div className="action-stack ending-progress">
      <h2>エンディング進行</h2>
      <div className="ending-case-card">
        <Scale size={20} aria-hidden="true" />
        <div>
          <span>事件解決</span>
          <strong>午前0時の遺言書</strong>
        </div>
      </div>
      <ol className="ending-steps">
        {ending.scenes.map((scene, index) => (
          <li key={`${scene.title}-${index}`} className={index === currentIndex ? 'active' : index < currentIndex ? 'done' : ''}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            {scene.title}
          </li>
        ))}
      </ol>
      <div className="ending-actions">
        <button className="secondary-button compact" type="button" disabled={atStart} onClick={onPrevious}>
          <ChevronLeft size={18} />
          前へ
        </button>
        {!atEnd ? (
          <button className="primary-button compact" type="button" onClick={onNext}>
            次へ
            <ChevronRight size={18} />
          </button>
        ) : (
          <>
            <button className="secondary-button compact" type="button" onClick={onReset}>
              <Home size={18} />
              タイトルへ
            </button>
            <button className="primary-button compact restart-button" type="button" onClick={onRestart}>
              <RotateCcw size={18} />
              もう一度調査する
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ActionPane({
  state,
  mode,
  currentLocation,
  acquiredEvidenceIds,
  selectedCharacterId,
  selectedEvidenceId,
  answers,
  deductionFailed,
  failureScene,
  onMove,
  onInspect,
  onTalk,
  onCharacterChange,
  onEvidenceChange,
  onPresent,
  onAnswer,
  onSubmitDeduction,
  onRetryDeduction,
  onReturnToInvestigation,
}: {
  state: GameState;
  mode: ViewMode;
  currentLocation: NonNullable<ReturnType<typeof locationsById.get>>;
  acquiredEvidenceIds: string[];
  selectedCharacterId: string;
  selectedEvidenceId: string;
  answers: Record<string, string>;
  deductionFailed: boolean;
  failureScene?: EndingScene;
  onMove: (locationId: string) => void;
  onInspect: (action: InspectAction) => void;
  onTalk: (talk: Talk) => void;
  onCharacterChange: (id: string) => void;
  onEvidenceChange: (id: string) => void;
  onPresent: () => void;
  onAnswer: (answers: Record<string, string>) => void;
  onSubmitDeduction: () => void;
  onRetryDeduction: () => void;
  onReturnToInvestigation: () => void;
}) {
  if (mode === 'move') return <MoveActions currentLocationId={state.currentLocationId} onMove={onMove} />;
  if (mode === 'inspect') return <InspectActions state={state} actions={currentLocation.inspectActions} onInspect={onInspect} />;
  if (mode === 'talk') return <TalkActions state={state} currentLocationId={currentLocation.id} onTalk={onTalk} />;
  if (mode === 'present') {
    return (
      <PresentActions
        acquiredEvidenceIds={acquiredEvidenceIds}
        selectedCharacterId={selectedCharacterId}
        selectedEvidenceId={selectedEvidenceId}
        onCharacterChange={onCharacterChange}
        onEvidenceChange={onEvidenceChange}
        onPresent={onPresent}
      />
    );
  }
  if (mode === 'evidence') return <EvidenceList acquiredEvidenceIds={acquiredEvidenceIds} />;
  if (mode === 'log') return <LogList log={state.log} />;
  if (mode === 'deduction') {
    if (deductionFailed && failureScene) {
      return (
        <DeductionFailurePanel
          scene={failureScene}
          onRetry={onRetryDeduction}
          onReturnToInvestigation={onReturnToInvestigation}
        />
      );
    }
    return <DeductionPanel answers={answers} onAnswer={onAnswer} onSubmit={onSubmitDeduction} />;
  }

  return <SceneSummary state={state} currentLocation={currentLocation} />;
}

function MoveActions({ currentLocationId, onMove }: { currentLocationId: string; onMove: (locationId: string) => void }) {
  return (
    <div className="action-stack">
      <h2>移動</h2>
      {episode.locations.map((location) => (
        <button
          key={location.id}
          className={location.id === currentLocationId ? 'list-button selected' : 'list-button'}
          type="button"
          disabled={location.id === currentLocationId}
          onClick={() => onMove(location.id)}
        >
          <LocationThumb location={location} />
          <MapPin size={18} />
          <span>{location.name}</span>
        </button>
      ))}
    </div>
  );
}

function InspectActions({
  state,
  actions,
  onInspect,
}: {
  state: GameState;
  actions: InspectAction[];
  onInspect: (action: InspectAction) => void;
}) {
  const availableActions = actions.filter((action) => hasAllFlags(state, action.requiresFlags));

  return (
    <div className="action-stack">
      <h2>調べる</h2>
      {availableActions.map((action) => (
        <button key={action.id} className="list-button" type="button" onClick={() => onInspect(action)}>
          <Search size={18} />
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}

function TalkActions({
  state,
  currentLocationId,
  onTalk,
}: {
  state: GameState;
  currentLocationId: string;
  onTalk: (talk: Talk) => void;
}) {
  const availableTalks = episode.talks.filter(
    (talk) =>
      (!talk.availableAt?.length || talk.availableAt.includes(currentLocationId)) &&
      canRunInteraction(state, talk),
  );

  if (!availableTalks.length) {
    return <EmptyState icon={MessageSquareText} text="ここで話せる相手はいない。" />;
  }

  return (
    <div className="action-stack">
      <h2>話す</h2>
      {availableTalks.map((talk) => {
        const character = charactersById.get(talk.characterId);
        return (
          <button key={talk.id} className="list-button vertical" type="button" onClick={() => onTalk(talk)}>
            <span className="talk-row">
              {character ? <CharacterSprite character={character} size="small" /> : null}
              <span>
                <span className="button-title">{character?.name}</span>
                <span>{talk.label}</span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PresentActions({
  acquiredEvidenceIds,
  selectedCharacterId,
  selectedEvidenceId,
  onCharacterChange,
  onEvidenceChange,
  onPresent,
}: {
  acquiredEvidenceIds: string[];
  selectedCharacterId: string;
  selectedEvidenceId: string;
  onCharacterChange: (id: string) => void;
  onEvidenceChange: (id: string) => void;
  onPresent: () => void;
}) {
  const evidenceOptions = acquiredEvidenceIds.map((id) => evidenceById.get(id)).filter(Boolean);
  const selectedEvidence = selectedEvidenceId || evidenceOptions[0]?.id || '';

  useEffect(() => {
    if (!selectedEvidenceId && selectedEvidence) onEvidenceChange(selectedEvidence);
  }, [onEvidenceChange, selectedEvidence, selectedEvidenceId]);

  return (
    <div className="action-stack">
      <h2>証拠を見せる</h2>
      <label className="field-label" htmlFor="character-select">相手</label>
      <div className="selected-visual">
        {charactersById.get(selectedCharacterId) ? (
          <CharacterSprite character={charactersById.get(selectedCharacterId)!} size="medium" />
        ) : null}
      </div>
      <select id="character-select" value={selectedCharacterId} onChange={(event) => onCharacterChange(event.target.value)}>
        {episode.characters.map((character) => (
          <option key={character.id} value={character.id}>
            {character.name}
          </option>
        ))}
      </select>
      <label className="field-label" htmlFor="evidence-select">証拠</label>
      <div className="selected-visual">
        {evidenceById.get(selectedEvidence) ? <EvidenceIcon item={evidenceById.get(selectedEvidence)!} size="large" /> : null}
      </div>
      <select id="evidence-select" value={selectedEvidence} onChange={(event) => onEvidenceChange(event.target.value)}>
        {evidenceOptions.map((item) => (
          <option key={item!.id} value={item!.id}>
            {item!.name}
          </option>
        ))}
      </select>
      <button className="primary-button compact" type="button" onClick={onPresent} disabled={!selectedEvidence}>
        <FileSearch size={18} />
        突きつける
      </button>
    </div>
  );
}

function EvidenceList({ acquiredEvidenceIds }: { acquiredEvidenceIds: string[] }) {
  if (!acquiredEvidenceIds.length) {
    return <EmptyState icon={Briefcase} text="証拠品はまだない。" />;
  }

  return (
    <div className="action-stack evidence-list">
      <h2>証拠品</h2>
      {acquiredEvidenceIds.map((id) => {
        const item = evidenceById.get(id);
        if (!item) return null;
        return (
          <article key={item.id} className={item.isKey ? 'evidence-row key' : 'evidence-row'}>
            <EvidenceIcon item={item} size="medium" />
            <div>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
            </div>
            {item.isKey ? <CheckCircle2 size={20} aria-label="重要証拠" /> : null}
          </article>
        );
      })}
    </div>
  );
}

function LogList({ log }: { log: string[] }) {
  if (!log.length) return <EmptyState icon={List} text="ログはまだない。" />;

  return (
    <div className="action-stack log-list">
      <h2>ログ</h2>
      {log.map((item, index) => (
        <p key={`${item}-${index}`}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          {item}
        </p>
      ))}
    </div>
  );
}

function DeductionFailurePanel({
  scene,
  onRetry,
  onReturnToInvestigation,
}: {
  scene: EndingScene;
  onRetry: () => void;
  onReturnToInvestigation: () => void;
}) {
  return (
    <div className="action-stack deduction-failure-panel">
      <div className="failure-mark">
        <XCircle size={22} aria-hidden="true" />
        <span>推理不成立</span>
      </div>
      <h2>{scene.title}</h2>
      <p>{scene.text}</p>
      <div className="failure-actions">
        <button className="primary-button compact" type="button" onClick={onRetry}>
          <ShieldQuestion size={18} />
          推理に戻る
        </button>
        <button className="secondary-button compact" type="button" onClick={onReturnToInvestigation}>
          <Search size={18} />
          調査に戻る
        </button>
      </div>
    </div>
  );
}

function DeductionPanel({
  answers,
  onAnswer,
  onSubmit,
}: {
  answers: Record<string, string>;
  onAnswer: (answers: Record<string, string>) => void;
  onSubmit: () => void;
}) {
  const complete = episode.deduction.questions.every((question) => answers[question.id]);

  return (
    <div className="action-stack deduction-panel">
      <h2>最終推理</h2>
      {episode.deduction.questions.map((question) => (
        <DeductionQuestionView key={question.id} question={question} answers={answers} onAnswer={onAnswer} />
      ))}
      <button className="primary-button compact" type="button" disabled={!complete} onClick={onSubmit}>
        <ShieldQuestion size={18} />
        結論を出す
      </button>
    </div>
  );
}

function DeductionQuestionView({
  question,
  answers,
  onAnswer,
}: {
  question: DeductionQuestion;
  answers: Record<string, string>;
  onAnswer: (answers: Record<string, string>) => void;
}) {
  return (
    <fieldset className="deduction-question">
      <legend>{question.prompt}</legend>
      {question.choices.map((choice) => (
        <label key={choice.id} className={answers[question.id] === choice.id ? 'choice selected' : 'choice'}>
          <input
            type="radio"
            name={question.id}
            value={choice.id}
            checked={answers[question.id] === choice.id}
            onChange={() => onAnswer({ ...answers, [question.id]: choice.id })}
          />
          {choice.label}
        </label>
      ))}
    </fieldset>
  );
}

function SceneSummary({
  state,
  currentLocation,
}: {
  state: GameState;
  currentLocation: NonNullable<ReturnType<typeof locationsById.get>>;
}) {
  const suspects = episode.characters.map((character) => character.name).join(' / ');

  return (
    <div className="scene-summary">
      <h2>状況</h2>
      <div className="suspect-strip" aria-label="登場人物">
        {episode.characters.map((character) => (
          <div key={character.id} className="suspect-token" title={`${character.name} / ${character.role}`}>
            <CharacterSprite character={character} size="small" />
            <span>{character.name}</span>
          </div>
        ))}
      </div>
      <p>{currentLocation.description}</p>
      <dl>
        <div>
          <dt>容疑者</dt>
          <dd>{suspects}</dd>
        </div>
        <div>
          <dt>進行</dt>
          <dd>{state.flags.includes('theory_shifted') ? '封筒すり替えの線が浮上' : '金庫から消えた原本を調査中'}</dd>
        </div>
      </dl>
    </div>
  );
}

function NarrativeText({
  text,
  speaker,
  soundEnabled,
}: {
  text: string;
  speaker?: Character;
  soundEnabled: boolean;
}) {
  const pages = useMemo(() => splitMessagePages(text), [text]);
  const [pageIndex, setPageIndex] = useState(0);
  const currentPage = pages[pageIndex] ?? '';
  const [visibleCount, setVisibleCount] = useState(currentPage.length);
  const timerRef = useRef<number | null>(null);
  const isTyping = visibleCount < currentPage.length;
  const hasNextPage = pageIndex < pages.length - 1;
  const visibleText = currentPage.slice(0, visibleCount);
  const paragraphs = visibleText.split(/\n{2,}/);

  useEffect(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setPageIndex(0);
    setVisibleCount(prefersReducedMotion ? (pages[0]?.length ?? 0) : 0);
  }, [pages, text]);

  useEffect(() => {
    if (visibleCount >= currentPage.length) return undefined;

    const currentChar = currentPage[visibleCount] ?? '';
    timerRef.current = window.setTimeout(() => {
      setVisibleCount((current) => {
        const next = Math.min(currentPage.length, current + 1);
        const typedChar = currentPage[next - 1] ?? '';
        if (soundEnabled && shouldPlayTypeSound(typedChar, next)) {
          soundEngine.play('type');
        }
        return next;
      });
    }, getTypeDelay(currentChar));

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentPage, soundEnabled, visibleCount]);

  function advanceMessage() {
    if (isTyping) {
      setVisibleCount(currentPage.length);
      return;
    }
    if (hasNextPage) {
      const nextPageIndex = pageIndex + 1;
      setPageIndex(nextPageIndex);
      setVisibleCount(0);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      advanceMessage();
    }
  }

  return (
    <div className={speaker ? 'dialogue-stage with-speaker' : 'dialogue-stage'}>
      {speaker ? (
        <div className="speaker-cutin" aria-hidden="true">
          <CharacterSprite character={speaker} size="medium" />
        </div>
      ) : null}
      <div
        className={isTyping ? 'narrative typing' : 'narrative'}
        onPointerDown={advanceMessage}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <div className="speaker-name">{speaker?.name ?? '調査メモ'}</div>
        {paragraphs.map((paragraph, index) => (
          <p key={`${pageIndex}-${index}-${paragraph.slice(0, 12)}`}>
            {paragraph}
            {isTyping && index === paragraphs.length - 1 ? <span className="type-cursor" aria-hidden="true" /> : null}
          </p>
        ))}
        {!isTyping && hasNextPage ? <span className="page-cue" aria-hidden="true">▼</span> : null}
      </div>
    </div>
  );
}

function getTypeDelay(char: string) {
  if (char === '\n') return 120;
  if (char === '…') return 220;
  if ('。！？!?'.includes(char)) return 150;
  if ('、，,'.includes(char)) return 90;
  return 18;
}

function shouldPlayTypeSound(char: string, visibleCount: number) {
  return visibleCount % 2 === 0 && !/\s|[。、，,.！？!?「」]/.test(char);
}

function splitMessagePages(text: string) {
  const maxChars = 76;
  const normalized = text.trim();
  if (!normalized) return [''];

  const pages: string[] = [];
  let page = '';

  for (const char of normalized) {
    page += char;
    const canBreak = /[。！？!?」]/.test(char) || page.length >= maxChars;
    if (page.length >= maxChars && canBreak) {
      pages.push(page.trim());
      page = '';
    }
  }

  if (page.trim()) pages.push(page.trim());
  return pages.length ? pages : [''];
}

function LocationArt({ location }: { location: Location }) {
  return (
    <div
      className="location-art"
      style={{
        backgroundImage: `url("${ATLAS.locations}")`,
        backgroundPosition: spritePosition(location.artIndex, 5),
      }}
      role="img"
      aria-label={`${location.name}の場面絵`}
    />
  );
}

function LocationThumb({ location }: { location: Location }) {
  return (
    <span
      className="location-thumb"
      style={{
        backgroundImage: `url("${ATLAS.locations}")`,
        backgroundPosition: spritePosition(location.artIndex, 5),
      }}
      aria-hidden="true"
    />
  );
}

function CharacterSprite({ character, size }: { character: Character; size: 'small' | 'medium' }) {
  return (
    <span
      className={`character-sprite ${size}`}
      style={{
        backgroundImage: `url("${ATLAS.characters}")`,
        backgroundPosition: spritePosition(character.artIndex, 5),
      }}
      aria-hidden="true"
    />
  );
}

function EvidenceIcon({ item, size }: { item: Evidence; size: 'medium' | 'large' }) {
  return (
    <span
      className={`evidence-icon ${size}`}
      style={{
        backgroundImage: `url("${ATLAS.evidence}")`,
        backgroundPosition: spritePosition(item.artIndex, 7),
      }}
      aria-hidden="true"
    />
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof XCircle; text: string }) {
  return (
    <div className="empty-state">
      <Icon size={24} />
      <p>{text}</p>
    </div>
  );
}

function spritePosition(index: number, total: number) {
  if (total <= 1) return '50% 50%';
  const clamped = Math.max(0, Math.min(total - 1, index));
  return `${(clamped / (total - 1)) * 100}% 50%`;
}

function findPresentReaction(characterId: string, evidenceId: string, state: GameState) {
  const reactions = episode.presentReactions.filter(
    (reaction) =>
      reaction.characterId === characterId &&
      reaction.evidenceId === evidenceId &&
      canRunInteraction(state, reaction),
  );
  return reactions.slice().sort(
    (a, b) =>
      (b.requiresFlags?.length ?? 0) +
      (b.requiresEvidence?.length ?? 0) -
      ((a.requiresFlags?.length ?? 0) + (a.requiresEvidence?.length ?? 0)),
  )[0];
}

function clampIndex(index: number, total: number) {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(total - 1, index));
}

function applySuccessEnding(state: GameState, ending: Ending): GameState {
  const scene = ending.scenes[0];
  return {
    ...applyEndingScene(state, scene, 0),
    flags: addUnique(state.flags, ending.setFlags),
    log: [...state.log, '真相に到達した。'],
    mode: 'ending',
    endingId: 'success',
  };
}

function applyDeductionFailure(state: GameState, ending: Ending): GameState {
  const scene = ending.scenes[0];
  return {
    ...state,
    narrative: scene?.text ?? '推理はまだ成立していない。',
    flags: addUnique(state.flags, ending.setFlags),
    log: [...state.log, '推理をやり直す必要がある。'],
    mode: 'deduction',
    endingId: 'failure',
    endingSceneIndex: undefined,
    activeSpeakerId: scene?.speakerId,
  };
}

function applyOpeningScene(state: GameState, scene: OpeningScene | undefined, openingSceneIndex: number): GameState {
  const locationId = scene?.locationId ?? state.currentLocationId;
  return {
    ...state,
    currentLocationId: locationId,
    visitedLocationIds: addUnique(state.visitedLocationIds, [locationId]),
    narrative: scene?.text ?? state.narrative,
    activeSpeakerId: scene?.speakerId,
    mode: 'opening',
    openingSceneIndex,
    endingId: undefined,
    endingSceneIndex: undefined,
  };
}

function applyEndingScene(state: GameState, scene: EndingScene | undefined, endingSceneIndex: number): GameState {
  const locationId = scene?.locationId ?? state.currentLocationId;
  return {
    ...state,
    currentLocationId: locationId,
    visitedLocationIds: addUnique(state.visitedLocationIds, [locationId]),
    narrative: scene?.text ?? state.narrative,
    activeSpeakerId: scene?.speakerId,
    mode: 'ending',
    endingId: 'success',
    endingSceneIndex,
  };
}

export default App;
