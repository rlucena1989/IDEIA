import { randomUUID } from 'crypto';
import { FeedbackEntry, FeedbackSubmission, MemoryEntry, Recommendation } from './types';

export interface PatternDetectorAdapter {
  record(text: string, metadata?: Record<string, unknown>): void;
  getPatterns(): Array<{ name: string; frequency: number; confidence: number; relatedPatterns: string[] }>;
}

export class FeedbackPipeline {
  private feedbacks: Map<string, FeedbackEntry> = new Map();
  private recommendations: Map<string, Recommendation> = new Map();
  private memory: Map<string, MemoryEntry> = new Map();
  private patternDetector: PatternDetectorAdapter | null = null;

  submit(submission: FeedbackSubmission): FeedbackEntry {
    const entry: FeedbackEntry = {
      id: randomUUID(),
      type: submission.type,
      source: submission.source,
      targetType: submission.targetType,
      targetId: submission.targetId,
      content: submission.content,
      severity: submission.severity ?? 'info',
      decision: 'pending',
      createdAt: new Date().toISOString(),
      createdBy: submission.createdBy,
      tags: submission.tags ?? [],
    };

    this.feedbacks.set(entry.id, entry);
    return entry;
  }

  process(feedbackId: string): Recommendation | null {
    const feedback = this.feedbacks.get(feedbackId);
    if (!feedback) return null;

    const recommendation = this.generateRecommendation(feedback);
    this.recommendations.set(recommendation.id, recommendation);

    const memory = this.generateMemoryEntry(feedback, recommendation);
    this.memory.set(memory.id, memory);

    return recommendation;
  }

  processAll(): Recommendation[] {
    const results: Recommendation[] = [];
    for (const [id] of this.feedbacks) {
      const rec = this.process(id);
      if (rec) results.push(rec);
    }
    return results;
  }

  getFeedback(id: string): FeedbackEntry | undefined {
    return this.feedbacks.get(id);
  }

  getAllFeedback(): FeedbackEntry[] {
    return Array.from(this.feedbacks.values());
  }

  getRecommendation(id: string): Recommendation | undefined {
    return this.recommendations.get(id);
  }

  getAllRecommendations(): Recommendation[] {
    return Array.from(this.recommendations.values());
  }

  getMemory(id: string): MemoryEntry | undefined {
    return this.memory.get(id);
  }

  getAllMemory(): MemoryEntry[] {
    return Array.from(this.memory.values());
  }

  getFeedbackByTarget(targetType: string, targetId: string): FeedbackEntry[] {
    return Array.from(this.feedbacks.values())
      .filter(f => f.targetType === targetType && f.targetId === targetId);
  }

  private generateRecommendation(feedback: FeedbackEntry): Recommendation {
    const typeMap: Record<string, Recommendation['type']> = {
      approval: 'improvement',
      rejection: 'fix',
      suggestion: 'improvement',
      question: 'investigate',
      comment: 'refactor',
      issue: 'fix',
    };

    return {
      id: randomUUID(),
      sourceFeedbackId: feedback.id,
      type: typeMap[feedback.type] || 'investigate',
      title: `Based on ${feedback.type}: ${feedback.content.slice(0, 80)}${feedback.content.length > 80 ? '...' : ''}`,
      description: feedback.content,
      priority: feedback.severity === 'critical' ? 'high' : feedback.severity === 'error' ? 'high' : feedback.severity === 'warning' ? 'medium' : 'low',
      targetType: feedback.targetType,
      targetId: feedback.targetId,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
  }

  private generateMemoryEntry(feedback: FeedbackEntry, recommendation: Recommendation): MemoryEntry {
    const memoryTypeMap: Record<string, MemoryEntry['type']> = {
      approval: 'decision',
      rejection: 'pitfall',
      suggestion: 'convention',
      question: 'pattern',
      comment: 'preference',
      issue: 'pitfall',
    };

    const severityTags: Record<string, string> = {
      critical: 'blocking',
      error: 'important',
      warning: 'notable',
      info: 'informational',
    };

    return {
      id: randomUUID(),
      sourceFeedbackId: feedback.id,
      sourceRecommendationId: recommendation.id,
      type: memoryTypeMap[feedback.type] || 'pattern',
      title: `${feedback.type}: ${feedback.content.slice(0, 60)}`,
      description: feedback.content,
      tags: [...feedback.tags, severityTags[feedback.severity] || 'general', feedback.type, feedback.source],
      sessionOrigin: feedback.createdBy || feedback.source,
      timestamp: feedback.createdAt,
    };
  }

  integrateWithPatternDetector(patternDetector: PatternDetectorAdapter): void {
    this.patternDetector = patternDetector;
    for (const feedback of this.feedbacks.values()) {
      patternDetector.record(
        `[${feedback.type}] ${feedback.content}`,
        { source: feedback.source, targetType: feedback.targetType, severity: feedback.severity }
      );
    }
  }

  getRecommendations(limit = 10): Recommendation[] {
    const all = this.getAllRecommendations()
      .filter(r => r.status === 'open')
      .sort((a, b) => {
        const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
        return (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);
      });

    const result: Recommendation[] = [];
    if (this.patternDetector) {
      const patterns = this.patternDetector.getPatterns();
      const topPatterns = patterns.slice(0, 3);
      for (const pattern of topPatterns) {
        const matchingRecs = all.filter(r =>
          r.description.toLowerCase().includes(pattern.name.toLowerCase()) ||
          pattern.relatedPatterns.some(rp => r.description.toLowerCase().includes(rp.toLowerCase()))
        );
        for (const rec of matchingRecs) {
          if (!result.find(r => r.id === rec.id)) {
            result.push({ ...rec, priority: 'high' });
          }
        }
      }
    }
    for (const rec of all) {
      if (!result.find(r => r.id === rec.id)) {
        result.push(rec);
      }
      if (result.length >= limit) break;
    }
    return result.slice(0, limit);
  }

  count(): { feedbacks: number; recommendations: number; memory: number } {
    return {
      feedbacks: this.feedbacks.size,
      recommendations: this.recommendations.size,
      memory: this.memory.size,
    };
  }
}

export function createFeedbackPipeline(): FeedbackPipeline {
  return new FeedbackPipeline();
}
