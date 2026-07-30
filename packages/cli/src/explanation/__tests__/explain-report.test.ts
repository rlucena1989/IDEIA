import { describe, it, expect } from '@jest/globals';
import { buildExplainReport } from '../explain-report';
import { DecisionTrace, Explanation, EvidenceLink } from '../explanation-types';
import { Rationale } from '../rationale-builder';

describe('explain-report', () => {
  it('should build report with all fields', () => {
    const traces: DecisionTrace[] = [{
      traceId: 't1', decisionType: 'block', context: 'ctx',
      signals: [], policyApplied: 'p1', outcome: 'blocked', createdAt: '',
    }];
    const explanations: Explanation[] = [{
      explanationId: 'e1', title: 'Exp', summary: '', details: [],
      evidenceIds: [], confidence: 0.9, createdAt: '',
    }];
    const evidence: EvidenceLink[] = [];
    const rationales: Rationale[] = [];
    const report = buildExplainReport({ traces, explanations, evidence, rationales });
    expect(report.totalTraces).toBe(1);
    expect(report.traces).toHaveLength(1);
    expect(report.explanations).toHaveLength(1);
    expect(report.generatedAt).toBeDefined();
  });

  it('should generate notes array', () => {
    const traces: DecisionTrace[] = [];
    const explanations: Explanation[] = [];
    const evidence: EvidenceLink[] = [{
      evidenceId: 'ev1', sourceType: 'alert', sourceRef: '', description: '',
    }];
    const rationales: Rationale[] = [];
    const report = buildExplainReport({ traces, explanations, evidence, rationales });
    expect(report.notes).toContain('0 decision trace(s)');
    expect(report.notes).toContain('1 evidence link(s)');
  });

  it('should handle empty data gracefully', () => {
    const report = buildExplainReport({
      traces: [], explanations: [], evidence: [], rationales: [],
    });
    expect(report.totalTraces).toBe(0);
    expect(report.notes).toHaveLength(4);
  });

  it('should preserve all input objects', () => {
    const rationales: Rationale[] = [{
      rationaleId: 'r1', title: 'Rat', summary: '', facts: ['fact1'],
      inferences: [], createdAt: '',
    }];
    const report = buildExplainReport({
      traces: [], explanations: [], evidence: [], rationales,
    });
    expect(report.rationales[0].facts).toEqual(['fact1']);
  });
});
