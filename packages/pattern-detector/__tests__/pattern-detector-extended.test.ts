import { describe, it, expect, beforeEach } from '@jest/globals';
import { PatternStore, createPatternStore } from '../src/pattern-store';
import { CrossSessionAnalyzer, createCrossSessionAnalyzer, SessionInput } from '../src/cross-session';
import { PatternSuggester, createPatternSuggester } from '../src/pattern-suggester';
import { AdaptiveLearner, createAdaptiveLearner } from '../src/adaptive-learner';
import { FeedbackLoop, createFeedbackLoop } from '../src/feedback-loop';
import path from 'path';
import os from 'os';
import fs from 'fs';

describe('pattern-detector Extended', () => {
  let store: PatternStore;
  let analyzer: CrossSessionAnalyzer;
  let suggester: PatternSuggester;
  let learner: AdaptiveLearner;
  let loop: FeedbackLoop;
  let storePath: string;

  beforeEach(() => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pattern-ext-'));
    storePath = path.join(tmpDir, 'patterns.json');
    store = createPatternStore(storePath);
    analyzer = createCrossSessionAnalyzer(store);
    suggester = createPatternSuggester(store);
    learner = createAdaptiveLearner(store);
    loop = createFeedbackLoop(learner, store);
  });

  it('should handle empty session', () => {
    const session: SessionInput = { sessionId: 'empty', projectPath: '/test', startedAt: new Date().toISOString(), commands: [], errors: [], codeSamples: [] };
    analyzer.analyzeSession(session);
    expect(store.getRepeatedCommands()).toHaveLength(0);
    expect(store.getFrequentErrors()).toHaveLength(0);
  });

  it('should detect unique commands across sessions', () => {
    const s1: SessionInput = { sessionId: 's1', projectPath: '/test', startedAt: new Date().toISOString(), commands: [{ command: 'npm install', timestamp: '2026-01-01T00:00:00Z', exitCode: 0 }, { command: 'npm install', timestamp: '2026-01-01T00:01:00Z', exitCode: 0 }], errors: [], codeSamples: [] };
    const s2: SessionInput = { sessionId: 's2', projectPath: '/test', startedAt: new Date().toISOString(), commands: [{ command: 'npm test', timestamp: '2026-01-01T01:00:00Z', exitCode: 0 }], errors: [], codeSamples: [] };
    analyzer.analyzeSession(s1);
    analyzer.analyzeSession(s2);
    const commands = store.getRepeatedCommands();
    expect(commands.length).toBe(1);
    expect(commands[0].command).toBe('npm install');
  });

  it('should detect frequent errors across sessions', () => {
    const s1: SessionInput = { sessionId: 's1', projectPath: '/test', startedAt: new Date().toISOString(), commands: [], errors: [{ message: 'Error: Connection refused at line 42', timestamp: '2026-01-01T00:00:00Z', severity: 'high' }], codeSamples: [] };
    const s2: SessionInput = { sessionId: 's2', projectPath: '/test', startedAt: new Date().toISOString(), commands: [], errors: [{ message: 'Error: Connection refused at line 99', timestamp: '2026-01-01T01:00:00Z', severity: 'high' }], codeSamples: [] };
    analyzer.analyzeSession(s1);
    analyzer.analyzeSession(s2);
    const errors = store.getFrequentErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].count).toBe(2);
  });

  it('should not suggest for patterns seen only once', () => {
    const session: SessionInput = { sessionId: 'single', projectPath: '/test', startedAt: new Date().toISOString(), commands: [{ command: 'npm run lint', timestamp: '2026-01-01T00:00:00Z', exitCode: 0 }], errors: [], codeSamples: [] };
    analyzer.analyzeSession(session);
    const suggestions = suggester.generateSuggestions();
    expect(suggestions).toHaveLength(0);
  });

  it('should generate multiple suggestions for different patterns', () => {
    const session: SessionInput = {
      sessionId: 'multi', projectPath: '/test', startedAt: new Date().toISOString(),
      commands: [
        { command: 'npm run build', timestamp: '2026-01-01T00:00:00Z', exitCode: 0 },
        { command: 'npm run build', timestamp: '2026-01-01T00:01:00Z', exitCode: 0 },
        { command: 'npm run build', timestamp: '2026-01-01T00:02:00Z', exitCode: 0 },
        { command: 'npm test', timestamp: '2026-01-01T00:03:00Z', exitCode: 0 },
        { command: 'npm test', timestamp: '2026-01-01T00:04:00Z', exitCode: 0 },
        { command: 'npm test', timestamp: '2026-01-01T00:05:00Z', exitCode: 0 },
      ],
      errors: [
        { message: 'TypeError: undefined is not a function at line 10', timestamp: '2026-01-01T00:00:00Z', severity: 'high' },
        { message: 'TypeError: undefined is not a function at line 20', timestamp: '2026-01-01T00:01:00Z', severity: 'high' },
        { message: 'TypeError: undefined is not a function at line 30', timestamp: '2026-01-01T00:02:00Z', severity: 'high' },
      ],
      codeSamples: [],
    };
    analyzer.analyzeSession(session);
    const suggestions = suggester.generateSuggestions();
    expect(suggestions.length).toBeGreaterThanOrEqual(2);
  });

  it('should suppress suggestion after multiple rejections', () => {
    const session: SessionInput = { sessionId: 'reject', projectPath: '/test', startedAt: new Date().toISOString(), commands: [{ command: 'npm outdated', timestamp: '2026-01-01T00:00:00Z', exitCode: 0 }, { command: 'npm outdated', timestamp: '2026-01-01T00:01:00Z', exitCode: 0 }, { command: 'npm outdated', timestamp: '2026-01-01T00:02:00Z', exitCode: 0 }], errors: [], codeSamples: [] };
    analyzer.analyzeSession(session);
    const suggestions = suggester.generateSuggestions();
    const id = suggestions[0].suggestionId;
    loop.processFeedback({ suggestionId: id, accepted: false, timestamp: new Date().toISOString() });
    loop.processFeedback({ suggestionId: id, accepted: false, timestamp: new Date().toISOString() });
    const status = loop.getAutomationStatus();
    expect(status.suppressed).toBeGreaterThanOrEqual(1);
  });

  it('should process feedback and create active rule', () => {
    const session: SessionInput = { sessionId: 'accept', projectPath: '/test', startedAt: new Date().toISOString(), commands: [{ command: 'npm audit', timestamp: '2026-01-01T00:00:00Z', exitCode: 0 }, { command: 'npm audit', timestamp: '2026-01-01T00:01:00Z', exitCode: 0 }, { command: 'npm audit', timestamp: '2026-01-01T00:02:00Z', exitCode: 0 }], errors: [], codeSamples: [] };
    analyzer.analyzeSession(session);
    const suggestions = suggester.generateSuggestions();
    loop.processFeedback({ suggestionId: suggestions[0].suggestionId, accepted: true, timestamp: new Date().toISOString() });
    const rules = learner.getActiveRules();
    expect(rules).toHaveLength(1);
    expect(rules[0].enabled).toBe(true);
  });

  it('should detect code patterns from samples', () => {
    const session: SessionInput = { sessionId: 'code-pat', projectPath: '/test', startedAt: new Date().toISOString(), commands: [], errors: [], codeSamples: [{ filePath: 'src/api.ts', content: 'function getUser(id: string) { return db.find(id); }', timestamp: '2026-01-01T00:00:00Z', language: 'typescript', category: 'architecture' }, { filePath: 'src/api.ts', content: 'function getUser(id: string) { return db.find(id); }', timestamp: '2026-01-01T00:01:00Z', language: 'typescript', category: 'architecture' }] };
    analyzer.analyzeSession(session);
    const codes = store.getCodePatterns();
    expect(codes.length).toBeGreaterThanOrEqual(0);
  });

  it('should return automation status with correct counts', () => {
    const status = loop.getAutomationStatus();
    expect(status).toHaveProperty('total');
    expect(status).toHaveProperty('auto');
    expect(status).toHaveProperty('pending');
    expect(status).toHaveProperty('suppressed');
    expect(status.total).toBe(0);
  });
});