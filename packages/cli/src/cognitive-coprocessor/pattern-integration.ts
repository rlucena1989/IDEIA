import { PatternDetector, LlmLearningEngine } from '@ideia/memory-store';
import { createLogger } from '@ideia/logger';
import type { DetectedPattern, LearningRecommendation } from '@ideia/memory-store';
import type { CognitiveContext } from './types';
const logger = createLogger('pattern-integration');

export interface PatternEnrichedContext {
  patterns: DetectedPattern[];
  recommendations: LearningRecommendation[];
  suggestions: string[];
}

export class PatternIntegration {
  private detector: PatternDetector;
  private learningEngine: LlmLearningEngine;

  constructor(detector?: PatternDetector, learningEngine?: LlmLearningEngine) {
    this.detector = detector ?? new PatternDetector();
    this.learningEngine = learningEngine ?? new LlmLearningEngine();
  }

  getDetector(): PatternDetector {
    return this.detector;
  }

  getLearningEngine(): LlmLearningEngine {
    return this.learningEngine;
  }

  recordInteraction(text: string, metadata?: Record<string, unknown>): void {
    this.detector.record(text, metadata);
  }

  async enrichContext(input: CognitiveContext, inputText?: string): Promise<PatternEnrichedContext> {
    const patterns = this.detector.getPatterns();
    const freshPatterns = patterns.length === 0 ? this.detector.detect() : patterns;

    const inputForLearning = inputText ?? JSON.stringify(input.normalizedInput ?? input.metrics ?? {});
    const recommendations = await this.learningEngine.generateRecommendations(
      freshPatterns.map(p => ({ name: p.name, type: p.source ?? 'statistical', confidence: p.confidence })),
      inputForLearning,
    );

    const suggestions = this.detector.getPatterns().map((p: any) =>
      `[${p.confidence > 0.7 ? 'high' : 'medium'}] ${p.name}: ${p.description || ''}`
    );

    return { patterns: freshPatterns, recommendations, suggestions };
  }

  async detectAndLearn(text: string, metadata?: Record<string, unknown>): Promise<PatternEnrichedContext> {
    this.detector.record(text, metadata);
    const patterns = await this.detector.detectAll();
    const recommendations = await this.learningEngine.generateRecommendations(
      patterns.map(p => ({ name: p.name, type: p.source ?? 'statistical', confidence: p.confidence })),
      text,
    );
    const suggestions = this.detector.getPatterns().map((p: any) =>
      `[${p.confidence > 0.7 ? 'high' : 'medium'}] ${p.name}: ${p.description || ''}`
    );
    return { patterns, recommendations, suggestions };
  }
}
