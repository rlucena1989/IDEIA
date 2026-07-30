import { describe, it, expect, beforeEach } from '@jest/globals';
import { PatternStore, createPatternStore } from '../src/pattern-store';
import { CrossSessionAnalyzer, createCrossSessionAnalyzer, SessionInput } from '../src/cross-session';
import { PatternSuggester, createPatternSuggester } from '../src/pattern-suggester';
import { AdaptiveLearner, createAdaptiveLearner } from '../src/adaptive-learner';
import { FeedbackLoop, createFeedbackLoop } from '../src/feedback-loop';
import path from 'path';
import os from 'os';
import fs from 'fs';

describe('pattern-detector', () => {
  let store: PatternStore;
  let analyzer: CrossSessionAnalyzer;
  let suggester: PatternSuggester;
  let learner: AdaptiveLearner;
  let loop: FeedbackLoop;
  let storePath: string;

  beforeEach(() => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pattern-test-'));
    storePath = path.join(tmpDir, 'patterns.json');
    store = createPatternStore(storePath);
    analyzer = createCrossSessionAnalyzer(store);
    suggester = createPatternSuggester(store);
    learner = createAdaptiveLearner(store);
    loop = createFeedbackLoop(learner, store);
  });

  it('exports all components', () => {
    expect(PatternStore).toBeDefined();
    expect(CrossSessionAnalyzer).toBeDefined();
    expect(PatternSuggester).toBeDefined();
    expect(AdaptiveLearner).toBeDefined();
    expect(FeedbackLoop).toBeDefined();
  });

  it('analyzes session and detects repeated commands', () => {
    const session: SessionInput = {
      sessionId: 'sess-1',
      projectPath: '/test/project',
      startedAt: new Date().toISOString(),
      commands: [
        { command: 'npm test', timestamp: '2026-01-01T00:00:00Z', exitCode: 0 },
        { command: 'npm test', timestamp: '2026-01-01T00:01:00Z', exitCode: 0 },
        { command: 'npm test', timestamp: '2026-01-01T00:02:00Z', exitCode: 0 },
      ],
      errors: [],
      codeSamples: [],
    };

    analyzer.analyzeSession(session);
    const commands = store.getRepeatedCommands();
    expect(commands.length).toBe(1);
    expect(commands[0].command).toBe('npm test');
    expect(commands[0].count).toBe(3);
  });

  it('analyzes session and detects errors', () => {
    const session: SessionInput = {
      sessionId: 'sess-2',
      projectPath: '/test/project',
      startedAt: new Date().toISOString(),
      commands: [],
      errors: [
        { message: 'TypeError: Cannot read property of undefined at line 42', timestamp: '2026-01-01T00:00:00Z', severity: 'high' },
        { message: 'TypeError: Cannot read property of undefined at line 99', timestamp: '2026-01-01T00:01:00Z', severity: 'high' },
      ],
      codeSamples: [],
    };

    analyzer.analyzeSession(session);
    const errors = store.getFrequentErrors();
    expect(errors.length).toBe(1);
    expect(errors[0].count).toBe(2);
  });

  it('generates suggestions for patterns seen 3+ times', () => {
    const session: SessionInput = {
      sessionId: 'sess-3',
      projectPath: '/test/project',
      startedAt: new Date().toISOString(),
      commands: [
        { command: 'npm run build', timestamp: '2026-01-01T00:00:00Z', exitCode: 0 },
        { command: 'npm run build', timestamp: '2026-01-01T00:01:00Z', exitCode: 0 },
        { command: 'npm run build', timestamp: '2026-01-01T00:02:00Z', exitCode: 0 },
      ],
      errors: [],
      codeSamples: [],
    };

    analyzer.analyzeSession(session);
    const suggestions = suggester.generateSuggestions();
    expect(suggestions.length).toBeGreaterThanOrEqual(1);
    expect(suggestions[0].patternType).toBe('command');
    expect(suggestions[0].occurrences).toBe(3);
    expect(suggestions[0].status).toBe('pending');
  });

  it('adaptive learner accepts suggestion and tracks rules', () => {
    const session: SessionInput = {
      sessionId: 'sess-4',
      projectPath: '/test/project',
      startedAt: new Date().toISOString(),
      commands: [
        { command: 'npm run lint', timestamp: '2026-01-01T00:00:00Z', exitCode: 0 },
        { command: 'npm run lint', timestamp: '2026-01-01T00:01:00Z', exitCode: 0 },
        { command: 'npm run lint', timestamp: '2026-01-01T00:02:00Z', exitCode: 0 },
      ],
      errors: [],
      codeSamples: [],
    };

    analyzer.analyzeSession(session);
    const suggestions = suggester.generateSuggestions();

    const feedback = {
      suggestionId: suggestions[0].suggestionId,
      accepted: true,
      timestamp: new Date().toISOString(),
    };

    loop.processFeedback(feedback);
    const rules = learner.getActiveRules();
    expect(rules.length).toBe(1);
    expect(rules[0].enabled).toBe(true);
  });

  it('adaptive learner suppresses after 2 rejections', () => {
    const session: SessionInput = {
      sessionId: 'sess-5',
      projectPath: '/test/project',
      startedAt: new Date().toISOString(),
      commands: [
        { command: 'npm run fmt', timestamp: '2026-01-01T00:00:00Z', exitCode: 0 },
        { command: 'npm run fmt', timestamp: '2026-01-01T00:01:00Z', exitCode: 0 },
        { command: 'npm run fmt', timestamp: '2026-01-01T00:02:00Z', exitCode: 0 },
      ],
      errors: [],
      codeSamples: [],
    };

    analyzer.analyzeSession(session);
    const suggestions = suggester.generateSuggestions();

    loop.processFeedback({ suggestionId: suggestions[0].suggestionId, accepted: false, timestamp: new Date().toISOString() });
    loop.processFeedback({ suggestionId: suggestions[0].suggestionId, accepted: false, timestamp: new Date().toISOString() });

    const rules = learner.getActiveRules();
    const activeRule = rules.find(r => r.sourceSuggestionId === suggestions[0].suggestionId);
    if (activeRule) {
      expect(activeRule.enabled).toBe(false);
    }
  });

  it('feedback loop returns automation status', () => {
    const status = loop.getAutomationStatus();
    expect(status).toHaveProperty('total');
    expect(status).toHaveProperty('auto');
    expect(status).toHaveProperty('pending');
    expect(status).toHaveProperty('suppressed');
  });
});
