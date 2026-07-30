import { describe, it, expect, beforeEach } from '@jest/globals';
import { CapabilityMatcher } from '../src/matcher-engine';
import { ProjectNeed, MatchingProfile } from '../src/types';

describe('CapabilityMatcher', () => {
  let matcher: CapabilityMatcher;

  beforeEach(() => {
    matcher = new CapabilityMatcher();
  });

  describe('constructor', () => {
    it('should create matcher with builtin capabilities', () => {
      expect(matcher).toBeInstanceOf(CapabilityMatcher);
    });
  });

  describe('registerCapability', () => {
    it('should register custom capability', () => {
      matcher.registerCapability(
        'test-cap',
        ['test', 'custom'],
        'test-category',
        'Test capability description',
        'test-provider'
      );
    });
  });

  describe('analyzeKeywords', () => {
    it('should extract keywords from text', () => {
      const keywords = matcher.analyzeKeywords('I need agent orchestration for my project');
      expect(keywords).toContain('agent');
      expect(keywords).toContain('orchestration');
    });

    it('should filter stop words', () => {
      const keywords = matcher.analyzeKeywords('the system is a test');
      expect(keywords).not.toContain('the');
      expect(keywords).not.toContain('is');
      expect(keywords).not.toContain('a');
    });

    it('should return empty array for empty text', () => {
      const keywords = matcher.analyzeKeywords('');
      expect(keywords).toEqual([]);
    });
  });

  describe('computeMatch', () => {
    it('should compute match for project need', () => {
      const need: ProjectNeed = {
        id: 'need-1',
        description: 'I need agent orchestration',
        priority: 'high',
        keywords: ['agent', 'orchestration'],
      };
      const result = matcher.computeMatch(need);
      expect(result).toBeDefined();
      expect(result.need).toEqual(need);
      expect(result.matches).toBeDefined();
      expect(Array.isArray(result.matches)).toBe(true);
    });

    it('should find top match', () => {
      const need: ProjectNeed = {
        id: 'need-1',
        description: 'I need agent orchestration',
        priority: 'high',
        keywords: ['agent', 'orchestration'],
      };
      const result = matcher.computeMatch(need);
      expect(result.topMatch).toBeDefined();
      expect(result.topMatch?.capabilityName).toBeDefined();
    });

    it('should calculate coverage', () => {
      const need: ProjectNeed = {
        id: 'need-1',
        description: 'I need agent orchestration',
        priority: 'high',
        keywords: ['agent', 'orchestration'],
      };
      const result = matcher.computeMatch(need);
      expect(typeof result.coverage).toBe('number');
    });

    it('should identify gaps when no match found', () => {
      const need: ProjectNeed = {
        id: 'need-1',
        description: 'I need something completely different',
        priority: 'medium',
        keywords: ['xyz', 'abc'],
      };
      const result = matcher.computeMatch(need);
      expect(result.gaps).toContain('need-1');
    });
  });

  describe('matchProfile', () => {
    it('should match profile with multiple needs', () => {
      const profile: MatchingProfile = {
        name: 'test-profile',
        version: '1.0.0',
        needs: [
          {
            id: 'need-1',
            description: 'I need agent orchestration',
            priority: 'high',
            keywords: ['agent', 'orchestration'],
          },
          {
            id: 'need-2',
            description: 'I need pub-sub messaging',
            priority: 'medium',
            keywords: ['pub', 'sub', 'messaging'],
          },
        ],
      };
      const report = matcher.matchProfile(profile);
      expect(report).toBeDefined();
      expect(report.profile).toEqual(profile);
      expect(report.results).toHaveLength(2);
      expect(report.overallCoverage).toBeDefined();
    });

    it('should calculate overall coverage', () => {
      const profile: MatchingProfile = {
        name: 'test-profile',
        version: '1.0.0',
        needs: [
          {
            id: 'need-1',
            description: 'I need agent orchestration',
            priority: 'high',
            keywords: ['agent', 'orchestration'],
          },
        ],
      };
      const report = matcher.matchProfile(profile);
      expect(typeof report.overallCoverage).toBe('number');
    });

    it('should list matched capabilities', () => {
      const profile: MatchingProfile = {
        name: 'test-profile',
        version: '1.0.0',
        needs: [
          {
            id: 'need-1',
            description: 'I need agent orchestration',
            priority: 'high',
            keywords: ['agent', 'orchestration'],
          },
        ],
      };
      const report = matcher.matchProfile(profile);
      expect(Array.isArray(report.matchedCapabilities)).toBe(true);
    });

    it('should list unmatched needs', () => {
      const profile: MatchingProfile = {
        name: 'test-profile',
        version: '1.0.0',
        needs: [
          {
            id: 'need-1',
            description: 'I need something unknown',
            priority: 'low',
            keywords: ['unknown'],
          },
        ],
      };
      const report = matcher.matchProfile(profile);
      expect(report.unmatchedNeeds).toContain('need-1');
    });

    it('should generate suggestions', () => {
      const profile: MatchingProfile = {
        name: 'test-profile',
        version: '1.0.0',
        needs: [
          {
            id: 'need-1',
            description: 'I need agent orchestration',
            priority: 'high',
            keywords: ['agent', 'orchestration'],
          },
        ],
      };
      const report = matcher.matchProfile(profile);
      expect(Array.isArray(report.suggestions)).toBe(true);
    });

    it('should include timestamp', () => {
      const profile: MatchingProfile = {
        name: 'test-profile',
        version: '1.0.0',
        needs: [],
      };
      const report = matcher.matchProfile(profile);
      expect(report.timestamp).toBeDefined();
    });
  });

  describe('generateSuggestions', () => {
    it('should generate suggestions from needs', () => {
      const needs: ProjectNeed[] = [
        {
          id: 'need-1',
          description: 'I need agent orchestration',
          priority: 'high',
          keywords: ['agent', 'orchestration'],
        },
      ];
      const suggestions = (matcher as any).generateSuggestions(needs);
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should return empty array for no needs', () => {
      const suggestions = (matcher as any).generateSuggestions([]);
      expect(suggestions).toEqual([]);
    });
  });
});
