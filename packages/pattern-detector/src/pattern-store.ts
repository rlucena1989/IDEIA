import { PatternStoreEntry, SessionMetadata, RepeatedCommand, FrequentError, CodePattern, PatternSuggestion } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('pattern-store');

export class PatternStore {
  private store: PatternStoreEntry = {
    sessions: [],
    repeatedCommands: [],
    frequentErrors: [],
    codePatterns: [],
    suggestions: [],
    lastAnalyzed: '',
  };
  private persistencePath: string;

  constructor(persistencePath: string) {
    this.persistencePath = persistencePath;
    this.load();
  }

  addSession(session: SessionMetadata): void {
    this.store.sessions.push(session);
    this.persist();
  }

  addRepeatedCommand(cmd: RepeatedCommand): void {
    const existing = this.store.repeatedCommands.findIndex(c => c.command === cmd.command);
    if (existing >= 0) {
      this.store.repeatedCommands[existing] = cmd;
    } else {
      this.store.repeatedCommands.push(cmd);
    }
    this.persist();
  }

  addFrequentError(err: FrequentError): void {
    const existing = this.store.frequentErrors.findIndex(e => e.errorPattern === err.errorPattern);
    if (existing >= 0) {
      this.store.frequentErrors[existing] = err;
    } else {
      this.store.frequentErrors.push(err);
    }
    this.persist();
  }

  addCodePattern(pattern: CodePattern): void {
    const existing = this.store.codePatterns.findIndex(p => p.patternId === pattern.patternId);
    if (existing >= 0) {
      this.store.codePatterns[existing] = pattern;
    } else {
      this.store.codePatterns.push(pattern);
    }
    this.persist();
  }

  addSuggestion(suggestion: PatternSuggestion): void {
    this.store.suggestions.push(suggestion);
    this.persist();
  }

  updateSuggestion(suggestionId: string, updates: Partial<PatternSuggestion>): PatternSuggestion | null {
    const idx = this.store.suggestions.findIndex(s => s.suggestionId === suggestionId);
    if (idx < 0) return null;
    this.store.suggestions[idx] = { ...this.store.suggestions[idx], ...updates };
    this.persist();
    return this.store.suggestions[idx];
  }

  getSessions(): SessionMetadata[] {
    return [...this.store.sessions];
  }

  getRepeatedCommands(): RepeatedCommand[] {
    return [...this.store.repeatedCommands];
  }

  getFrequentErrors(): FrequentError[] {
    return [...this.store.frequentErrors];
  }

  getCodePatterns(): CodePattern[] {
    return [...this.store.codePatterns];
  }

  getSuggestions(): PatternSuggestion[] {
    return [...this.store.suggestions];
  }

  getSuggestionsByStatus(status: PatternSuggestion['status']): PatternSuggestion[] {
    return this.store.suggestions.filter(s => s.status === status);
  }

  setLastAnalyzed(timestamp: string): void {
    this.store.lastAnalyzed = timestamp;
    this.persist();
  }

  getLastAnalyzed(): string {
    return this.store.lastAnalyzed;
  }

  getAllEntries(): PatternStoreEntry {
    return { ...this.store };
  }

  private load(): void {
    try {
      const fs = require('fs');
      if (fs.existsSync(this.persistencePath)) {
        const data = fs.readFileSync(this.persistencePath, 'utf-8');
        const parsed = JSON.parse(data) as PatternStoreEntry;
        this.store = {
          sessions: parsed.sessions ?? [],
          repeatedCommands: parsed.repeatedCommands ?? [],
          frequentErrors: parsed.frequentErrors ?? [],
          codePatterns: parsed.codePatterns ?? [],
          suggestions: parsed.suggestions ?? [],
          lastAnalyzed: parsed.lastAnalyzed ?? '',
        };
      }
    } catch {
      this.store = {
        sessions: [],
        repeatedCommands: [],
        frequentErrors: [],
        codePatterns: [],
        suggestions: [],
        lastAnalyzed: '',
      };
    }
  }

  private persist(): void {
    try {
      const fs = require('fs');
      fs.writeFileSync(this.persistencePath, JSON.stringify(this.store, null, 2), 'utf-8');
    } catch {
      // Silently fail persistence
    }
  }
}

export function createPatternStore(persistencePath: string): PatternStore {
  return new PatternStore(persistencePath);
}
