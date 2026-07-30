import { Tutorial, TutorialId, Difficulty } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('registry');

export class TutorialRegistry {
  private tutorials: Map<TutorialId, Tutorial> = new Map();
  private categories: Map<Difficulty, TutorialId[]> = new Map();

  register(tutorial: Tutorial): void {
    this.tutorials.set(tutorial.id, tutorial);
    const cat = this.categories.get(tutorial.difficulty) || [];
    if (!cat.includes(tutorial.id)) {
      cat.push(tutorial.id);
      this.categories.set(tutorial.difficulty, cat);
    }
  }

  get(id: TutorialId): Tutorial {
    const t = this.tutorials.get(id);
    if (!t) throw new Error(`Tutorial not found: ${id}`);
    return t;
  }

  list(filter?: Partial<Pick<Tutorial, 'difficulty' | 'tags'>>): Tutorial[] {
    let all = Array.from(this.tutorials.values());
    if (filter) {
      if (filter.difficulty) {
        all = all.filter(t => t.difficulty === filter.difficulty);
      }
      const tags = filter.tags;
      if (tags && tags.length > 0) {
        all = all.filter(t => tags.some(tag => t.tags.includes(tag)));
      }
    }
    return all;
  }

  findByDifficulty(difficulty: Difficulty): Tutorial[] {
    const ids = this.categories.get(difficulty) || [];
    return ids.map(id => this.tutorials.get(id)).filter(Boolean) as Tutorial[];
  }

  search(query: string): Tutorial[] {
    const q = query.toLowerCase();
    return Array.from(this.tutorials.values()).filter(
      t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q))
    );
  }

  getNextTutorial(completed: TutorialId[]): Tutorial | undefined {
    const available = Array.from(this.tutorials.values())
      .filter(t => !completed.includes(t.id))
      .filter(t => t.prerequisites.every(p => completed.includes(p)))
      .sort((a, b) => {
        const order: Record<Difficulty, number> = { beginner: 0, intermediate: 1, advanced: 2, expert: 3 };
        return order[a.difficulty] - order[b.difficulty];
      });
    return available[0];
  }
}
