import { PatternDetector, DetectedPattern } from '../src/pattern-detector';

describe('PatternDetector Cross-Session Analysis', () => {
  let detector: any;

  beforeEach(() => {
    detector = new PatternDetector({ minOccurrences: 2 });
  });

  describe('crossSessionAnalysis', () => {
    it('should merge patterns across sessions', () => {
      const sessionPatterns: DetectedPattern[] = [
        {
          id: 'pat-1',
          name: 'create component',
          frequency: 5,
          confidence: 0.8,
          firstSeen: '2024-01-01T00:00:00Z',
          lastSeen: '2024-01-02T00:00:00Z',
          relatedPatterns: [],
          source: 'statistical',
        },
      ];

      const result = detector.crossSessionAnalysis(sessionPatterns);

      expect(result).toHaveLength(1);
      expect(result[0].crossSession).toBe(false);
    });

    it('should mark existing patterns as cross-session', () => {
      const _existingPattern: DetectedPattern = {
        id: 'pat-1',
        name: 'create component',
        frequency: 3,
        confidence: 0.7,
        firstSeen: '2024-01-01T00:00:00Z',
        lastSeen: '2024-01-01T00:00:00Z',
        relatedPatterns: [],
        source: 'statistical',
      };

      detector.record('create component test');
      detector.record('create component test');
      detector.record('create component test');
      detector.detect();

      const sessionPatterns: DetectedPattern[] = [
        {
          id: 'pat-2',
          name: 'create component',
          frequency: 2,
          confidence: 0.75,
          firstSeen: '2024-01-02T00:00:00Z',
          lastSeen: '2024-01-02T00:00:00Z',
          relatedPatterns: [],
          source: 'statistical',
        },
      ];

      const result = detector.crossSessionAnalysis(sessionPatterns);

      expect(result).toHaveLength(1);
      expect(result[0].crossSession).toBe(true);
      expect(result[0].frequency).toBeGreaterThan(3);
    });

    it('should update confidence for cross-session patterns', () => {
      detector.record('test pattern');
      detector.record('test pattern');
      detector.record('test pattern');
      detector.detect();

      const sessionPatterns: DetectedPattern[] = [
        {
          id: 'pat-2',
          name: 'test pattern',
          frequency: 2,
          confidence: 0.8,
          firstSeen: '2024-01-02T00:00:00Z',
          lastSeen: '2024-01-02T00:00:00Z',
          relatedPatterns: [],
          source: 'statistical',
        },
      ];

      const result = detector.crossSessionAnalysis(sessionPatterns);

      expect(result[0].confidence).toBeGreaterThan(0.55);
    });
  });

  describe('suggestPatterns', () => {
    it('should suggest automation for high-frequency patterns', () => {
      for (let i = 0; i < 18; i++) {
        detector.record('create component');
      }
      detector.detect();

      const suggestions = detector.suggestPatterns();

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].action).toContain('Automate');
    });

    it('should suggest documentation for cross-session patterns', () => {
      // First session: add and detect to seed pattern
      detector.record('api call pattern');
      detector.record('api call pattern');
      detector.record('api call pattern');
      detector.detect();

      // Second session: cross-session analysis with matching pattern
      const sessionPatterns: DetectedPattern[] = [
        {
          id: 'pat-2',
          name: 'api call pattern',
          frequency: 4,
          confidence: 0.8,
          firstSeen: '2024-01-01T00:00:00Z',
          lastSeen: '2024-01-02T00:00:00Z',
          relatedPatterns: [],
          source: 'statistical',
        },
      ];

      detector.crossSessionAnalysis(sessionPatterns);
      const suggestions = detector.suggestPatterns();

      const docSuggestion = suggestions.find((s: any) => s.action.includes('Document'));
      expect(docSuggestion).toBeDefined();
    });

    it('should provide context-aware suggestions', () => {
      detector.record('create react component');
      detector.record('create react component');
      detector.record('create react component');
      detector.detect();

      const suggestions = detector.suggestPatterns('working on react');

      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should prioritize suggestions correctly', () => {
      detector.record('high frequency pattern');
      for (let i = 0; i < 15; i++) {
        detector.record('high frequency pattern');
      }
      detector.detect();

      const suggestions = detector.suggestPatterns();

      if (suggestions.length > 0) {
        expect(suggestions[0].priority).toBe('high');
      }
    });
  });
});
