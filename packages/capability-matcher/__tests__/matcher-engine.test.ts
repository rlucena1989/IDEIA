import { CapabilityMatcher } from '../src/matcher-engine';
import { ProjectNeed, MatchingProfile } from '../src/types';

describe('CapabilityMatcher', () => {
  let matcher: CapabilityMatcher;

  beforeEach(() => {
    matcher = new CapabilityMatcher();
  });

  it('should match a simple need against known capabilities', () => {
    const need: ProjectNeed = {
      id: 'need-1',
      description: 'need pub sub messaging for event driven communication',
      priority: 'high',
      keywords: ['pub', 'sub', 'messaging']
    };
    const result = matcher.computeMatch(need);
    expect(result.topMatch).not.toBeNull();
    expect(result.topMatch!.capabilityName).toBe('pub-sub');
    expect(result.topMatch!.score).toBeGreaterThan(0);
    expect(result.matches.length).toBeGreaterThan(0);
  });

  it('should match profile with multiple needs', () => {
    const needs: ProjectNeed[] = [
      {
        id: 'crud',
        description: 'need to scaffold crud rest api endpoint',
        priority: 'high',
        keywords: ['scaffold', 'rest', 'api']
      },
      {
        id: 'auth',
        description: 'need policy evaluation for authentication and authorization',
        priority: 'critical',
        keywords: ['policy', 'auth', 'permission']
      },
      {
        id: 'deploy',
        description: 'delivery pipeline with gitops and canary deploy',
        priority: 'medium',
        keywords: ['deploy', 'pipeline', 'gitops']
      }
    ];
    const profile: MatchingProfile = {
      name: 'test-profile',
      version: '1.0',
      needs
    };
    const report = matcher.matchProfile(profile);
    expect(report.results).toHaveLength(3);
    expect(report.matchedCapabilities.length).toBeGreaterThanOrEqual(3);
    expect(report.overallCoverage).toBeGreaterThan(0);
    expect(report.timestamp).toBeTruthy();
  });

  it('should generate suggestions based on needs', () => {
    const needs: ProjectNeed[] = [
      {
        id: 'test-need',
        description: 'run test suite with coverage and mutation',
        priority: 'high',
        keywords: ['test', 'coverage', 'mutation']
      }
    ];
    const suggestions = matcher.generateSuggestions(needs);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].relevance).toBeGreaterThan(0);
    expect(['agent', 'workflow', 'context-pack', 'tutorial', 'blueprint']).toContain(suggestions[0].type);
  });

  it('should find gaps for needs with no matches', () => {
    const needs: ProjectNeed[] = [
      {
        id: 'gap-need',
        description: 'quantum computing optimization for hyperdimensional space',
        priority: 'low',
        keywords: ['quantum', 'hyperdimensional', 'quantum-computing']
      },
      {
        id: 'normal-need',
        description: 'cli command for terminal interaction',
        priority: 'medium',
        keywords: ['cli', 'terminal']
      }
    ];
    const profile: MatchingProfile = {
      name: 'gap-profile',
      version: '1.0',
      needs
    };
    const gaps = matcher.findGaps(profile);
    expect(gaps).toContain('gap-need');
    expect(gaps).not.toContain('normal-need');
  });

  it('should calculate overall coverage correctly', () => {
    const needs: ProjectNeed[] = [
      {
        id: 'covered-1',
        description: 'event streaming with nats',
        priority: 'high',
        keywords: ['event', 'stream']
      },
      {
        id: 'covered-2',
        description: 'cli tool commands',
        priority: 'medium',
        keywords: ['cli']
      },
      {
        id: 'uncovered',
        description: 'quantum gravity simulation engine',
        priority: 'low',
        keywords: ['quantum', 'gravity']
      }
    ];
    const profile: MatchingProfile = {
      name: 'coverage-test',
      version: '1.0',
      needs
    };
    const coverage = matcher.getCoverage(profile);
    expect(coverage).toBeCloseTo(2 / 3, 1);
  });

  it('should register a new capability and match against it', () => {
    matcher.registerCapability(
      'quantum-simulator',
      ['quantum', 'simulation', 'simulator', 'qbit'],
      'scientific',
      'Quantum circuit simulation engine',
      'qiskit'
    );
    const need: ProjectNeed = {
      id: 'quantum-need',
      description: 'need quantum simulation',
      priority: 'medium',
      keywords: ['quantum', 'simulation']
    };
    const result = matcher.computeMatch(need);
    expect(result.topMatch).not.toBeNull();
    expect(result.topMatch!.capabilityName).toBe('quantum-simulator');
    expect(result.topMatch!.score).toBeGreaterThan(0.3);
  });

  it('should improve coverage after registering a new capability', () => {
    const needs: ProjectNeed[] = [
      {
        id: 'crypto-need',
        description: 'blockchain cryptographic verification',
        priority: 'high',
        keywords: ['blockchain', 'crypto', 'cryptographic']
      }
    ];
    const profile: MatchingProfile = {
      name: 'crypto-profile',
      version: '1.0',
      needs
    };
    const beforeCoverage = matcher.getCoverage(profile);
    matcher.registerCapability(
      'crypto-verification',
      ['blockchain', 'crypto', 'cryptographic', 'verification'],
      'security',
      'Blockchain cryptographic verification engine',
      'core'
    );
    const afterCoverage = matcher.getCoverage(profile);
    expect(afterCoverage).toBeGreaterThanOrEqual(beforeCoverage);
  });

  it('should handle empty needs array', () => {
    const profile: MatchingProfile = {
      name: 'empty',
      version: '1.0',
      needs: []
    };
    const report = matcher.matchProfile(profile);
    expect(report.results).toHaveLength(0);
    expect(report.overallCoverage).toBe(0);
    expect(report.suggestions).toHaveLength(0);
    expect(report.matchedCapabilities).toHaveLength(0);
    expect(report.unmatchedNeeds).toHaveLength(0);

    const coverage = matcher.getCoverage(profile);
    expect(coverage).toBe(1);

    const gaps = matcher.findGaps(profile);
    expect(gaps).toHaveLength(0);
  });

  it('should handle need with no matching keywords', () => {
    const need: ProjectNeed = {
      id: 'no-match',
      description: 'xylophone zebra quantum yellow submarine',
      priority: 'low',
      keywords: ['xylophone', 'zebra', 'submarine']
    };
    const result = matcher.computeMatch(need);
    expect(result.topMatch).toBeNull();
    expect(result.matches).toHaveLength(0);
    expect(result.coverage).toBe(0);
    expect(result.gaps).toContain('no-match');
  });

  it('should find alternative capabilities above a threshold', () => {
    const need: ProjectNeed = {
      id: 'security-need',
      description: 'security scanning and output validation',
      priority: 'critical',
      keywords: ['security', 'scan', 'validation', 'guard']
    };
    const alternatives = matcher.findAlternativeCapabilities(need, 0.2);
    expect(alternatives.length).toBeGreaterThanOrEqual(2);
    for (const alt of alternatives) {
      expect(alt.score).toBeGreaterThanOrEqual(0.2);
    }
  });

  it('should handle fuzzy keyword matching', () => {
    const need: ProjectNeed = {
      id: 'fuzzy-match',
      description: 'orchestrate agents across workflows',
      priority: 'high',
      keywords: ['orchestrator', 'agent', 'workflow']
    };
    const result = matcher.computeMatch(need);
    expect(result.topMatch).not.toBeNull();
    expect(result.topMatch!.capabilityName).toBe('agent-orchestration');
    expect(result.topMatch!.score).toBeGreaterThan(0);
  });
});
