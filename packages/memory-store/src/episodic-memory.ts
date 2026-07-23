/**
 * episodic-memory.ts — Episodic Memory (Item 40)
 *
 * Bridge entre ContextStore e MemoryStore para eventos específicos
 * com contexto temporal. Armazena episódios completos com causa e efeito.
 */

export interface Episode {
  id: string;
  trigger: string;
  action: string;
  context: Record<string, unknown>;
  result: string;
  duration: number;
  timestamp: string;
  tags: string[];
}

export class EpisodicMemory {
  private episodes: Episode[] = [];
  private maxEpisodes = 500;

  record(trigger: string, action: string, context: Record<string, unknown>, result: string, duration: number, tags: string[] = []): Episode {
    if (this.episodes.length >= this.maxEpisodes) this.episodes.shift();
    const episode: Episode = {
      id: `ep-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      trigger, action, context, result, duration,
      timestamp: new Date().toISOString(), tags,
    };
    this.episodes.push(episode);
    return episode;
  }

  query(options: { trigger?: string; tag?: string; since?: string; limit?: number }): Episode[] {
    return this.episodes.filter(e => {
      if (options.trigger && !e.trigger.includes(options.trigger)) return false;
      if (options.tag && !e.tags.includes(options.tag)) return false;
      if (options.since && new Date(e.timestamp) < new Date(options.since)) return false;
      return true;
    }).slice(0, options.limit || 50);
  }

  getSimilar(episode: Episode, threshold = 0.3): Episode[] {
    return this.episodes.filter(e => {
      if (e.id === episode.id) return false;
      const tagOverlap = episode.tags.filter(t => e.tags.includes(t)).length / Math.max(episode.tags.length, 1);
      return tagOverlap >= threshold;
    }).slice(0, 5);
  }
}
