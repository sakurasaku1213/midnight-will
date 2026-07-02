import episode01Data from '../data/episode-01.json';
import episode02Data from '../data/episode-02.json';
import type { Character, Episode, Evidence, Location } from './types';

export type EpisodeBundle = {
  episode: Episode;
  locationsById: Map<string, Location>;
  charactersById: Map<string, Character>;
  evidenceById: Map<string, Evidence>;
};

export const EPISODES = [episode01Data, episode02Data] as Episode[];

const bundlesById = new Map<string, EpisodeBundle>(
  EPISODES.map((episode) => [
    episode.id,
    {
      episode,
      locationsById: new Map(episode.locations.map((location) => [location.id, location])),
      charactersById: new Map(episode.characters.map((character) => [character.id, character])),
      evidenceById: new Map(episode.evidence.map((item) => [item.id, item])),
    },
  ]),
);

export const DEFAULT_EPISODE_ID = EPISODES[0].id;

export function getEpisodeBundle(episodeId: string): EpisodeBundle {
  return bundlesById.get(episodeId) ?? bundlesById.get(DEFAULT_EPISODE_ID)!;
}

export function resolveInitialEpisodeId(search: string): string {
  const requested = new URLSearchParams(search).get('ep');
  if (requested && bundlesById.has(requested)) return requested;
  return DEFAULT_EPISODE_ID;
}
