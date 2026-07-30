import { describe, it, expect } from '@jest/globals';
import { buildStrategyReport } from '../strategy-report';
import { TargetState } from '../target-state';
import { GapItem } from '../gap-analyzer';
import { Roadmap, RoadmapItem } from '../roadmap-types';
import { EvolutionPlan } from '../evolution-roadmap';

describe('strategy-report', () => {
  const target: TargetState = {
    targetId: 't1', name: 'V2.0', description: 'Next major',
    capabilities: [], successCriteria: [], constraints: [],
    dependencies: [], riskLevel: 'medium',
  };

  const gaps: GapItem[] = [{
    gapId: 'g1', category: 'functional', description: 'Missing auth', severity: 'high',
  }];

  const items: RoadmapItem[] = [{
    itemId: 'i1', title: 'Add auth', description: '', priority: 10,
    effort: 'medium', risk: 'high', dependencies: [], value: 'critical',
  }];

  const roadmap: Roadmap = {
    roadmapId: 'rm-1', createdAt: '', targetId: 't1', items,
  };

  const evolution: EvolutionPlan = {
    roadmap,
    gaps,
    nextActions: ['Resolve Missing auth'],
  };

  it('should build report with all fields', () => {
    const report = buildStrategyReport({ target, gaps, roadmap, evolution });
    expect(report.target.name).toBe('V2.0');
    expect(report.gaps).toHaveLength(1);
    expect(report.roadmap.items).toHaveLength(1);
    expect(report.evolution.nextActions).toHaveLength(1);
    expect(report.generatedAt).toBeDefined();
  });

  it('should generate summary', () => {
    const report = buildStrategyReport({ target, gaps, roadmap, evolution });
    expect(report.summary).toContain('Alvo: V2.0');
    expect(report.summary).toContain('1 gap(s) identificado(s)');
    expect(report.summary).toContain('1 item(ns) no roadmap');
    expect(report.summary).toContain('1 próxima(s) ação(ões)');
  });

  it('should handle empty gaps and items', () => {
    const emptyRoadmap: Roadmap = { roadmapId: 'rm-0', createdAt: '', targetId: 't1', items: [] };
    const emptyEvo: EvolutionPlan = { roadmap: emptyRoadmap, gaps: [], nextActions: [] };
    const report = buildStrategyReport({ target, gaps: [], roadmap: emptyRoadmap, evolution: emptyEvo });
    expect(report.gaps).toHaveLength(0);
    expect(report.roadmap.items).toHaveLength(0);
    expect(report.evolution.nextActions).toHaveLength(0);
  });

  it('should report high risk level from target', () => {
    const highRiskTarget: TargetState = { ...target, riskLevel: 'critical' };
    const report = buildStrategyReport({ target: highRiskTarget, gaps, roadmap, evolution });
    expect(report.target.riskLevel).toBe('critical');
  });

  it('should spread params correctly', () => {
    const report = buildStrategyReport({ target, gaps, roadmap, evolution });
    expect(report.target).toEqual(target);
    expect(report.gaps).toEqual(gaps);
    expect(report.roadmap).toEqual(roadmap);
    expect(report.evolution).toEqual(evolution);
  });
});
