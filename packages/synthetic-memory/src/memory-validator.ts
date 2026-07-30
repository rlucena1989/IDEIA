import { createLogger } from '@ideia/logger';
import { Memory, ValidationResult, ValidationIssue } from './types';

const _logger = createLogger('synthetic-memory:validator');

export class MemoryValidator {
  private _faithfulnessThreshold: number;
  private _densityThreshold: number;
  private _coherenceThreshold: number;
  private _plausibilityThreshold: number;

  constructor(
    faithfulnessThreshold = 0.7,
    densityThreshold = 0.2,
    coherenceThreshold = 0.5,
    plausibilityThreshold = 0.5
  ) {
    this._faithfulnessThreshold = faithfulnessThreshold;
    this._densityThreshold = densityThreshold;
    this._coherenceThreshold = coherenceThreshold;
    this._plausibilityThreshold = plausibilityThreshold;
  }

  validate(memory: Memory): ValidationResult {
    const issues: ValidationIssue[] = [];

    const faithfulness = this._assessFaithfulness(memory);
    if (faithfulness < this._faithfulnessThreshold) {
      issues.push({
        type: 'faithfulness',
        severity: faithfulness < 0.4 ? 'high' : 'medium',
        description: `Faithfulness score ${faithfulness.toFixed(2)} below threshold ${this._faithfulnessThreshold}`,
      });
    }

    const informationDensity = this._assessInformationDensity(memory);
    if (informationDensity < this._densityThreshold) {
      issues.push({
        type: 'density',
        severity: 'low',
        description: `Information density ${informationDensity.toFixed(2)} below threshold ${this._densityThreshold}`,
      });
    }

    const coherence = this._assessCoherence(memory);
    if (coherence < this._coherenceThreshold) {
      issues.push({
        type: 'coherence',
        severity: coherence < 0.3 ? 'high' : 'medium',
        description: `Coherence score ${coherence.toFixed(2)} below threshold ${this._coherenceThreshold}`,
      });
    }

    const plausibility = this._assessPlausibility(memory);
    if (plausibility < this._plausibilityThreshold) {
      issues.push({
        type: 'plausibility',
        severity: plausibility < 0.3 ? 'high' : 'medium',
        description: `Plausibility score ${plausibility.toFixed(2)} below threshold ${this._plausibilityThreshold}`,
      });
    }

    const redundancyIssue = this._checkRedundancy(memory);
    if (redundancyIssue !== null) {
      issues.push(redundancyIssue);
    }

    const totalScore = this._computeScore(faithfulness, informationDensity, coherence, plausibility, issues);

    const passed = issues.filter(i => i.severity === 'high').length === 0 && totalScore >= 0.5;

    const result: ValidationResult = {
      memoryId: memory.id,
      passed,
      faithfulness: Math.round(faithfulness * 100) / 100,
      informationDensity: Math.round(informationDensity * 100) / 100,
      coherence: Math.round(coherence * 100) / 100,
      plausibility: Math.round(plausibility * 100) / 100,
      issues,
      score: Math.round(totalScore * 100) / 100,
    };

    _logger.info(`Memory ${result.passed ? 'passed' : 'failed'} validation`, { memoryId: memory.id, score: result.score });
    return result;
  }

  validateBatch(memories: Memory[]): ValidationResult[] {
    return memories.map(m => this.validate(m));
  }

  private _assessFaithfulness(memory: Memory): number {
    const hasProvenance = memory.provenance !== undefined;
    const faithfulSources = memory.provenance?.faithfulness ?? 0.5;
    const hasEmbedding = memory.embedding !== undefined;
    const hasContent = memory.content.length > 0;
    const hasSummary = memory.summary.length > 0;

    let score = 0;
    if (hasProvenance) score += 0.3;
    if (faithfulSources > 0.7) score += 0.3;
    if (hasEmbedding) score += 0.15;
    if (hasContent) score += 0.15;
    if (hasSummary) score += 0.1;

    return Math.min(1, score);
  }

  private _assessInformationDensity(memory: Memory): number {
    const content = memory.content;
    if (content.length === 0) {
      return 0;
    }

    const uniqueWords = new Set(content.toLowerCase().match(/\b\w+\b/g));
    const totalWords = content.split(/\s+/).length;
    const lexicalDiversity = totalWords > 0 ? uniqueWords.size / totalWords : 0;

    const tagInfo = memory.tags.length > 0 ? 0.2 : 0;
    const hasAbstraction = memory.abstraction !== undefined ? 0.15 : 0;
    const importanceInfo = memory.importance > 0.5 ? 0.1 : 0.05;
    const contentLength = Math.min(1, content.length / 500);

    return Math.min(1, lexicalDiversity * 0.4 + tagInfo + hasAbstraction + importanceInfo + contentLength * 0.1);
  }

  private _assessCoherence(memory: Memory): number {
    const content = memory.content;

    if (content.length < 10) {
      return 0.3;
    }

    const hasContradictions = this._detectContradictions(content);

    if (hasContradictions) {
      return 0.2;
    }

    const hasStructure = content.includes('.') || content.includes('\n');
    const hasTags = memory.tags.length > 0;
    const levelConsistent = this._levelImportanceConsistent(memory);

    let score = 0.4;
    if (hasStructure) score += 0.2;
    if (hasTags) score += 0.15;
    if (levelConsistent) score += 0.25;

    return Math.min(1, score);
  }

  private _levelImportanceConsistent(memory: Memory): boolean {
    if (memory.level === 'L4' && memory.importance < 0.7) return false;
    if (memory.level === 'L1' && memory.importance > 0.4) return false;
    return true;
  }

  private _detectContradictions(content: string): boolean {
    const lower = content.toLowerCase();
    const positivePatterns = ['always', 'must', 'never', 'always use'];
    const negativePatterns = ['sometimes', 'avoid', 'not always', 'rarely'];
    let positives = 0;
    let negatives = 0;
    for (const p of positivePatterns) {
      if (lower.includes(p)) positives++;
    }
    for (const n of negativePatterns) {
      if (lower.includes(n)) negatives++;
    }
    return positives > 1 && negatives > 0;
  }

  private _assessPlausibility(memory: Memory): number {
    const content = memory.content;

    if (content.length < 5) {
      return 0.2;
    }

    const lower = content.toLowerCase();
    const implausiblePatterns = ['impossible', 'always works', 'never fails', 'guaranteed', 'perfect'];
    let implausibleCount = 0;
    for (const p of implausiblePatterns) {
      if (lower.includes(p)) implausibleCount++;
    }

    const source = memory.source;
    const sourcePlausibility: Record<string, number> = {
      observation: 0.9,
      synthesis: 0.7,
      reflection: 0.75,
      gap_filler: 0.5,
      augmented: 0.65,
    };

    const basePlausibility = sourcePlausibility[source] ?? 0.5;
    const penalty = implausibleCount * 0.15;

    return Math.max(0.1, basePlausibility - penalty);
  }

  private _checkRedundancy(memory: Memory): ValidationIssue | null {
    const content = memory.content;
    const summary = memory.summary;

    if (content.length > 0 && summary.length > 0) {
      const contentWords = new Set(content.toLowerCase().split(/\s+/));
      const summaryWords = new Set(summary.toLowerCase().split(/\s+/));

      let overlap = 0;
      for (const word of summaryWords) {
        if (contentWords.has(word)) overlap++;
      }

      const redundancy = summaryWords.size > 0 ? overlap / summaryWords.size : 0;

      if (redundancy > 0.95) {
        return {
          type: 'redundancy',
          severity: 'low',
          description: 'Summary is nearly identical to content',
        };
      }
    }

    return null;
  }

  private _computeScore(
    faithfulness: number,
    density: number,
    coherence: number,
    plausibility: number,
    issues: ValidationIssue[]
  ): number {
    const baseScore = faithfulness * 0.3 + density * 0.2 + coherence * 0.25 + plausibility * 0.25;
    const penalty = issues.reduce((sum, issue) => {
      const severityPenalty = issue.severity === 'high' ? 0.2 : issue.severity === 'medium' ? 0.1 : 0.05;
      return sum + severityPenalty;
    }, 0);
    return Math.max(0, Math.min(1, baseScore - penalty));
  }
}
