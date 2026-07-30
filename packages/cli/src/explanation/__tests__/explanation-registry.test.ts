import { describe, it, expect } from '@jest/globals';
import { ExplanationRegistry } from '../explanation-registry';
import { DecisionTrace, Explanation, EvidenceLink } from '../explanation-types';
import { Rationale } from '../rationale-builder';

describe('explanation-registry', () => {
  const makeTrace = (type: string, outcome: string): DecisionTrace => ({
    traceId: `t-${Date.now()}`, decisionType: type, context: `ctx-${type}`,
    signals: ['sig1'], policyApplied: 'p1', outcome, createdAt: new Date().toISOString(),
  });

  const makeEvidence = (): EvidenceLink => ({
    evidenceId: 'ev1', sourceType: 'metric', sourceRef: 'ref', description: 'desc',
  });

  it('should register and list traces', () => {
    const reg = new ExplanationRegistry();
    reg.registerTrace(makeTrace('block', 'blocked'));
    expect(reg.listTraces()).toHaveLength(1);
  });

  it('should register and list explanations', () => {
    const reg = new ExplanationRegistry();
    const exp: Explanation = {
      explanationId: 'e1', title: 'Exp', summary: '', details: [],
      evidenceIds: [], confidence: 1, createdAt: '',
    };
    reg.registerExplanation(exp);
    expect(reg.listExplanations()).toHaveLength(1);
  });

  it('should register and list evidence', () => {
    const reg = new ExplanationRegistry();
    reg.registerEvidence(makeEvidence());
    expect(reg.listEvidence()).toHaveLength(1);
  });

  it('should register and list rationales', () => {
    const reg = new ExplanationRegistry();
    const rat: Rationale = {
      rationaleId: 'r1', title: 'Rat', summary: '', facts: [],
      inferences: [], createdAt: '',
    };
    reg.registerRationale(rat);
    expect(reg.listRationales()).toHaveLength(1);
  });

  it('should find traces by decision type', () => {
    const reg = new ExplanationRegistry();
    reg.registerTrace(makeTrace('block', 'blocked'));
    reg.registerTrace(makeTrace('allow', 'approved'));
    expect(reg.findTraceByType('block')).toHaveLength(1);
    expect(reg.findTraceByType('allow')).toHaveLength(1);
    expect(reg.findTraceByType('unknown')).toHaveLength(0);
  });

  it('should find traces by outcome (case-insensitive)', () => {
    const reg = new ExplanationRegistry();
    reg.registerTrace(makeTrace('action1', 'Blocked'));
    reg.registerTrace(makeTrace('action2', 'APPROVED'));
    reg.registerTrace(makeTrace('action3', 'deferred'));
    expect(reg.findTraceByOutcome('block')).toHaveLength(1);
    expect(reg.findTraceByOutcome('approved')).toHaveLength(1);
    expect(reg.findTraceByOutcome('deferred')).toHaveLength(1);
  });

  it('should search traces by context and signals', () => {
    const reg = new ExplanationRegistry();
    reg.registerTrace({
      traceId: 't1', decisionType: 'gen', context: 'production deploy',
      signals: ['risk:high', 'urgent'], policyApplied: 'p1',
      outcome: 'approved', createdAt: '',
    });
    expect(reg.searchTraces('production')).toHaveLength(1);
    expect(reg.searchTraces('urgent')).toHaveLength(1);
    expect(reg.searchTraces('nonexistent')).toHaveLength(0);
  });

  it('should count all entries', () => {
    const reg = new ExplanationRegistry();
    reg.registerTrace(makeTrace('gen', 'ok'));
    reg.registerTrace(makeTrace('sync', 'ok'));
    reg.registerExplanation({ explanationId: 'e1', title: '', summary: '', details: [], evidenceIds: [], confidence: 0, createdAt: '' });
    const c = reg.count();
    expect(c.traces).toBe(2);
    expect(c.explanations).toBe(1);
    expect(c.evidence).toBe(0);
    expect(c.rationales).toBe(0);
  });

  it('should clear all data', () => {
    const reg = new ExplanationRegistry();
    reg.registerTrace(makeTrace('gen', 'ok'));
    reg.registerEvidence(makeEvidence());
    reg.clear();
    const c = reg.count();
    expect(c.traces).toBe(0);
    expect(c.evidence).toBe(0);
  });

  it('should return copies from list methods', () => {
    const reg = new ExplanationRegistry();
    reg.registerTrace(makeTrace('gen', 'ok'));
    const list = reg.listTraces();
    list.push(makeTrace('hack', 'injected'));
    expect(reg.listTraces()).toHaveLength(1);
  });
});
