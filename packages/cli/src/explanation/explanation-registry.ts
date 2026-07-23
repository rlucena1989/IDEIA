import { DecisionTrace, Explanation, EvidenceLink } from './explanation-types';
import { Rationale } from './rationale-builder';

export class ExplanationRegistry {
  private traces: DecisionTrace[] = [];
  private explanations: Explanation[] = [];
  private evidenceLinks: EvidenceLink[] = [];
  private rationales: Rationale[] = [];

  registerTrace(trace: DecisionTrace): void {
    this.traces.push(trace);
  }

  registerExplanation(explanation: Explanation): void {
    this.explanations.push(explanation);
  }

  registerEvidence(link: EvidenceLink): void {
    this.evidenceLinks.push(link);
  }

  registerRationale(rationale: Rationale): void {
    this.rationales.push(rationale);
  }

  listTraces(): DecisionTrace[] {
    return [...this.traces];
  }

  listExplanations(): Explanation[] {
    return [...this.explanations];
  }

  listEvidence(): EvidenceLink[] {
    return [...this.evidenceLinks];
  }

  listRationales(): Rationale[] {
    return [...this.rationales];
  }

  findTraceByType(decisionType: string): DecisionTrace[] {
    return this.traces.filter(t => t.decisionType === decisionType);
  }

  findTraceByOutcome(outcome: string): DecisionTrace[] {
    return this.traces.filter(t => t.outcome.toLowerCase().includes(outcome.toLowerCase()));
  }

  searchTraces(query: string): DecisionTrace[] {
    return this.traces.filter(t =>
      t.context.toLowerCase().includes(query.toLowerCase()) ||
      t.signals.some(s => s.toLowerCase().includes(query.toLowerCase()))
    );
  }

  count(): { traces: number; explanations: number; evidence: number; rationales: number } {
    return {
      traces: this.traces.length,
      explanations: this.explanations.length,
      evidence: this.evidenceLinks.length,
      rationales: this.rationales.length,
    };
  }

  clear(): void {
    this.traces = [];
    this.explanations = [];
    this.evidenceLinks = [];
    this.rationales = [];
  }
}
