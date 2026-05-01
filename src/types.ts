export type Character = {
  id: string;
  name: string;
  role: string;
  shortDescription: string;
  isCulprit: boolean;
  artIndex: number;
};

export type Evidence = {
  id: string;
  name: string;
  description: string;
  isKey: boolean;
  artIndex: number;
};

export type InspectAction = {
  id: string;
  label: string;
  text: string;
  requiresFlags?: string[];
  addEvidence?: string[];
  setFlags?: string[];
  log?: string;
};

export type Location = {
  id: string;
  name: string;
  artIndex: number;
  firstDescription: string;
  description: string;
  inspectActions: InspectAction[];
};

export type Talk = {
  id: string;
  characterId: string;
  label: string;
  text: string;
  availableAt?: string[];
  requiresFlags?: string[];
  requiresEvidence?: string[];
  addEvidence?: string[];
  setFlags?: string[];
  log?: string;
};

export type PresentReaction = {
  characterId: string;
  evidenceId: string;
  text: string;
  requiresFlags?: string[];
  requiresEvidence?: string[];
  addEvidence?: string[];
  setFlags?: string[];
  log?: string;
};

export type GameEvent = {
  id: string;
  kind: 'auto';
  requiresFlags?: string[];
  text: string;
  setFlags?: string[];
  log?: string;
};

export type DeductionQuestion = {
  id: string;
  prompt: string;
  choices: Array<{ id: string; label: string }>;
  answer: string;
};

export type Episode = {
  id: string;
  title: string;
  subtitle: string;
  estimatedMinutes: number;
  initialLocationId: string;
  opening: {
    lines: string[];
    startText: string;
    scenes: OpeningScene[];
  };
  characters: Character[];
  evidence: Evidence[];
  flags: string[];
  locations: Location[];
  talks: Talk[];
  presentReactions: PresentReaction[];
  events: GameEvent[];
  deduction: {
    requiresFlags?: string[];
    questions: DeductionQuestion[];
  };
  endings: {
    success: Ending;
    failure: Ending;
  };
};

export type Ending = {
  id: string;
  setFlags?: string[];
  scenes: EndingScene[];
};

export type EndingScene = {
  title: string;
  speakerId?: string;
  locationId?: string;
  text: string;
  kind?: 'reveal' | 'summary' | 'confrontation' | 'confession' | 'epilogue' | 'clear' | 'failure';
};

export type OpeningScene = {
  title: string;
  speakerId?: string;
  locationId?: string;
  text: string;
  kind?: 'phone' | 'case' | 'deadline' | 'arrival' | 'start';
};

export type ViewMode = 'scene' | 'opening' | 'move' | 'inspect' | 'talk' | 'present' | 'evidence' | 'log' | 'deduction' | 'ending';

export type GameState = {
  started: boolean;
  currentLocationId: string;
  visitedLocationIds: string[];
  evidenceIds: string[];
  flags: string[];
  consumedEventIds: string[];
  log: string[];
  narrative: string;
  activeSpeakerId?: string;
  mode: ViewMode;
  openingSceneIndex?: number;
  endingId?: 'success' | 'failure';
  endingSceneIndex?: number;
};
