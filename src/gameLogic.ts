import type { Episode, GameEvent, GameState } from './types';

export const SAVE_VERSION = 1;

// 第1話は既存プレイヤーのセーブを引き継ぐため従来キーのまま
export function storageKeyFor(episodeId: string) {
  return episodeId === 'episode_01' ? 'midnight-will:save:v1' : `midnight-will:save:${episodeId}:v1`;
}

export function createInitialState(episode: Episode): GameState {
  return {
    started: false,
    currentLocationId: episode.initialLocationId,
    visitedLocationIds: [episode.initialLocationId],
    evidenceIds: [],
    flags: [],
    consumedEventIds: [],
    log: [],
    narrative: episode.opening.lines.join('\n\n'),
    activeSpeakerId: undefined,
    mode: 'scene',
    openingSceneIndex: undefined,
    endingSceneIndex: undefined,
  };
}

export function hasAllFlags(state: Pick<GameState, 'flags'>, flags?: string[]) {
  if (!flags?.length) return true;
  const current = new Set(state.flags);
  return flags.every((flag) => current.has(flag));
}

export function hasAllEvidence(state: Pick<GameState, 'evidenceIds'>, evidenceIds?: string[]) {
  if (!evidenceIds?.length) return true;
  const current = new Set(state.evidenceIds);
  return evidenceIds.every((evidenceId) => current.has(evidenceId));
}

export function canRunInteraction(
  state: Pick<GameState, 'flags' | 'evidenceIds'>,
  interaction: { requiresFlags?: string[]; requiresEvidence?: string[] },
) {
  return hasAllFlags(state, interaction.requiresFlags) && hasAllEvidence(state, interaction.requiresEvidence);
}

export function addUnique(values: string[], additions?: string[]) {
  if (!additions?.length) return values;
  const next = new Set(values);
  for (const item of additions) next.add(item);
  return Array.from(next);
}

export function appendLog(log: string[], message?: string) {
  if (!message) return log;
  return [...log, message];
}

export function applyEffects(
  state: GameState,
  effects: {
    narrative?: string;
    addEvidence?: string[];
    setFlags?: string[];
    log?: string;
    activeSpeakerId?: string;
    mode?: GameState['mode'];
  },
  episode: Episode,
) {
  const withDirectEffects: GameState = {
    ...state,
    narrative: effects.narrative ?? state.narrative,
    evidenceIds: addUnique(state.evidenceIds, effects.addEvidence),
    flags: addUnique(state.flags, effects.setFlags),
    log: appendLog(state.log, effects.log),
    activeSpeakerId: effects.activeSpeakerId,
    mode: effects.mode ?? state.mode,
    openingSceneIndex: effects.mode === 'opening' ? state.openingSceneIndex : undefined,
    endingId: effects.mode === 'ending' ? state.endingId : undefined,
    endingSceneIndex: effects.mode === 'ending' ? state.endingSceneIndex : undefined,
  };

  return applyAutoEvents(withDirectEffects, episode);
}

export function applyAutoEvents(state: GameState, episode: Episode) {
  let next = state;
  let changed = true;

  while (changed) {
    changed = false;
    const event = episode.events.find((candidate) => shouldRunEvent(next, candidate));
    if (!event) continue;

    next = {
      ...next,
      narrative: event.text,
      flags: addUnique(next.flags, event.setFlags),
      consumedEventIds: addUnique(next.consumedEventIds, [event.id]),
      log: appendLog(next.log, event.log),
      activeSpeakerId: undefined,
      mode: 'scene',
      openingSceneIndex: undefined,
      endingId: undefined,
      endingSceneIndex: undefined,
    };
    changed = true;
  }

  return next;
}

function shouldRunEvent(state: GameState, event: GameEvent) {
  return !state.consumedEventIds.includes(event.id) && hasAllFlags(state, event.requiresFlags);
}

export function loadSavedState(episode: Episode): GameState | null {
  try {
    const raw = window.localStorage.getItem(storageKeyFor(episode.id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { version: number; state: GameState };
    if (parsed.version !== SAVE_VERSION) return null;
    if (!parsed.state || !episode.locations.some((location) => location.id === parsed.state.currentLocationId)) {
      return null;
    }
    return parsed.state;
  } catch {
    return null;
  }
}

export function saveState(episode: Episode, state: GameState) {
  window.localStorage.setItem(storageKeyFor(episode.id), JSON.stringify({ version: SAVE_VERSION, state }));
}

export function clearSavedState(episode: Episode) {
  window.localStorage.removeItem(storageKeyFor(episode.id));
}
