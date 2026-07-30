import { PatternStore } from './pattern-store';
import { createLogger } from '@ideia/logger';
import { SessionMetadata, RepeatedCommand, FrequentError, CodePattern } from './types';
const logger = createLogger('cross-session');

export interface SessionCommand {
  command: string;
  timestamp: string;
  exitCode: number;
  output?: string;
}

export interface SessionError {
  message: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: string;
}

export interface SessionCodeSample {
  language: string;
  content: string;
  filePath: string;
  timestamp: string;
  category: CodePattern['category'];
}

export interface SessionInput {
  sessionId: string;
  projectPath: string;
  startedAt: string;
  commands: SessionCommand[];
  errors: SessionError[];
  codeSamples: SessionCodeSample[];
}

export class CrossSessionAnalyzer {
  private store: PatternStore;

  constructor(store: PatternStore) {
    this.store = store;
  }

  analyzeSession(input: SessionInput): void {
    const metadata: SessionMetadata = {
      sessionId: input.sessionId,
      startedAt: input.startedAt,
      commandCount: input.commands.length,
      errorCount: input.errors.length,
      projectPath: input.projectPath,
    };
    this.store.addSession(metadata);

    this.detectRepeatedCommands(input);
    this.detectFrequentErrors(input);
    this.detectCodePatterns(input);
    this.store.setLastAnalyzed(new Date().toISOString());
  }

  private detectRepeatedCommands(input: SessionInput): void {
    const commandGroups = new Map<string, SessionCommand[]>();
    for (const cmd of input.commands) {
      const key = this.normalizeCommand(cmd.command);
      const group = commandGroups.get(key) ?? [];
      group.push(cmd);
      commandGroups.set(key, group);
    }

    const allSessions = this.store.getSessions();
    const totalSessions = Math.max(allSessions.length, 1);

    for (const [command, occurrences] of commandGroups) {
      if (occurrences.length < 2) continue;

      const existing = this.store.getRepeatedCommands().find(c => c.command === command);
      const sessions = existing
        ? Array.from(new Set([...existing.sessions, input.sessionId]))
        : [input.sessionId];

      const repeatedCmd: RepeatedCommand = {
        command,
        count: (existing?.count ?? 0) + occurrences.length,
        frequency: (existing?.count ?? 0) + occurrences.length / totalSessions,
        firstSeen: existing?.firstSeen ?? occurrences[0].timestamp,
        lastSeen: occurrences[occurrences.length - 1].timestamp,
        sessions,
      };
      this.store.addRepeatedCommand(repeatedCmd);
    }
  }

  private detectFrequentErrors(input: SessionInput): void {
    for (const err of input.errors) {
      const pattern = this.extractErrorPattern(err.message);
      const existing = this.store.getFrequentErrors().find(e => e.errorPattern === pattern);
      const sessions = existing
        ? Array.from(new Set([...existing.sessions, input.sessionId]))
        : [input.sessionId];

      const freqErr: FrequentError = {
        errorPattern: pattern,
        count: (existing?.count ?? 0) + 1,
        firstSeen: existing?.firstSeen ?? err.timestamp,
        lastSeen: err.timestamp,
        sessions,
        severity: err.severity,
      };
      this.store.addFrequentError(freqErr);
    }
  }

  private detectCodePatterns(input: SessionInput): void {
    for (const sample of input.codeSamples) {
      const patternId = this.hashPattern(sample.content);
      const existing = this.store.getCodePatterns().find(p => p.patternId === patternId);
      const sessions = existing
        ? Array.from(new Set([...existing.sessions, input.sessionId]))
        : [input.sessionId];

      const codePattern: CodePattern = {
        patternId,
        description: `${sample.category} pattern in ${sample.language}: ${sample.filePath}`,
        language: sample.language,
        snippet: sample.content.substring(0, 200),
        frequency: (existing?.frequency ?? 0) + 1,
        sessions,
        firstSeen: existing?.firstSeen ?? sample.timestamp,
        lastSeen: sample.timestamp,
        category: sample.category,
      };
      this.store.addCodePattern(codePattern);
    }
  }

  private normalizeCommand(cmd: string): string {
    return cmd.replace(/\s+/g, ' ').trim().toLowerCase();
  }

  private extractErrorPattern(message: string): string {
    return message
      .replace(/\d+/g, 'N')
      .replace(/['"][^'"]*['"]/g, '"..."')
      .replace(/(\/[\w.-]+)+/g, '/path')
      .substring(0, 200);
  }

  private hashPattern(content: string): string {
    let hash = 0;
    for (let i = 0; i < Math.min(content.length, 100); i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `pat_${Math.abs(hash).toString(36)}_${content.length}`;
  }
}

export function createCrossSessionAnalyzer(store: PatternStore): CrossSessionAnalyzer {
  return new CrossSessionAnalyzer(store);
}
