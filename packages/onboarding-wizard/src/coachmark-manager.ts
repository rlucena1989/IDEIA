export interface Coachmark {
  id: string;
  target: string;
  title: string;
  description: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  feature: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface CoachmarkStorage {
  get(key: string): Coachmark | undefined;
  set(key: string, value: Coachmark): void;
  delete(key: string): boolean;
  list(): Coachmark[];
}

export class MemoryCoachmarkStorage implements CoachmarkStorage {
  private store = new Map<string, Coachmark>();

  get(key: string): Coachmark | undefined {
    return this.store.get(key);
  }

  set(key: string, value: Coachmark): void {
    this.store.set(key, value);
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  list(): Coachmark[] {
    return Array.from(this.store.values());
  }
}

export class CoachmarkManager {
  private coachmarks: Map<string, Coachmark> = new Map();
  private onShow?: (coachmark: Coachmark) => void;

  constructor(private storage: CoachmarkStorage = new MemoryCoachmarkStorage()) {
    this.loadFromStorage();
  }

  setOnShow(callback: (coachmark: Coachmark) => void): void {
    this.onShow = callback;
  }

  show(coachmark: Omit<Coachmark, 'completed' | 'createdAt'>): void {
    const existing = this.coachmarks.get(coachmark.id);
    if (existing && existing.completed) return;

    const entry: Coachmark = {
      ...coachmark,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    this.coachmarks.set(coachmark.id, entry);
    this.storage.set(coachmark.id, entry);

    if (this.onShow) {
      this.onShow(entry);
    }
  }

  dismiss(id: string): boolean {
    const coachmark = this.coachmarks.get(id);
    if (!coachmark) return false;

    coachmark.completed = true;
    coachmark.completedAt = new Date().toISOString();
    this.coachmarks.set(id, coachmark);
    this.storage.set(id, coachmark);
    return true;
  }

  isCompleted(id: string): boolean {
    const coachmark = this.coachmarks.get(id);
    return coachmark ? coachmark.completed : false;
  }

  reset(): void {
    this.coachmarks.clear();
    const stored = this.storage.list();
    for (const c of stored) {
      this.storage.delete(c.id);
    }
  }

  resetFeature(feature: string): void {
    for (const [id, coachmark] of this.coachmarks) {
      if (coachmark.feature === feature) {
        coachmark.completed = false;
        coachmark.completedAt = undefined;
        this.coachmarks.set(id, coachmark);
        this.storage.set(id, coachmark);
      }
    }
  }

  getPending(): Coachmark[] {
    return Array.from(this.coachmarks.values()).filter(c => !c.completed);
  }

  getAll(): Coachmark[] {
    return Array.from(this.coachmarks.values());
  }

  getById(id: string): Coachmark | undefined {
    return this.coachmarks.get(id);
  }

  getProgress(): { completed: number; total: number; percent: number; byFeature: Record<string, { completed: number; total: number }> } {
    const all = this.getAll();
    const completed = all.filter(c => c.completed).length;
    const total = all.length;
    const byFeature: Record<string, { completed: number; total: number }> = {};
    for (const c of all) {
      if (!byFeature[c.feature]) byFeature[c.feature] = { completed: 0, total: 0 };
      byFeature[c.feature].total++;
      if (c.completed) byFeature[c.feature].completed++;
    }
    return { completed, total, percent: total > 0 ? Math.round(completed / total * 100) : 0, byFeature };
  }

  getNextPending(): Coachmark | undefined {
    return Array.from(this.coachmarks.values()).find(c => !c.completed);
  }

  dismissAll(): void {
    const now = new Date().toISOString();
    for (const [id, coachmark] of this.coachmarks) {
      coachmark.completed = true;
      coachmark.completedAt = now;
      this.coachmarks.set(id, coachmark);
      this.storage.set(id, coachmark);
    }
  }

  getFeatureProgress(feature: string): { completed: number; total: number } {
    const all = this.getAll().filter(c => c.feature === feature);
    const completed = all.filter(c => c.completed).length;
    return { completed, total: all.length };
  }

  isAllCompleted(): boolean {
    return this.getAll().every(c => c.completed);
  }

  private loadFromStorage(): void {
    const stored = this.storage.list();
    for (const coachmark of stored) {
      this.coachmarks.set(coachmark.id, coachmark);
    }
  }
}
