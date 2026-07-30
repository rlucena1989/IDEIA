import { OperationalPattern } from './pattern-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('recommendation-engine');

export interface Recommendation {
  action: 'generate' | 'repair' | 'sync' | 'review' | 'block' | 'defer';
  reason: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export function recommendActions(patterns: OperationalPattern[]): Recommendation[] {
  if (patterns.length === 0) {
    return [{
      action: 'sync',
      reason: 'No patterns detected. System is stable.',
      confidence: 0.95,
      priority: 'low',
    }];
  }

  return patterns.map(pattern => ({
    action: pattern.recommendedAction,
    reason: pattern.description,
    confidence: pattern.confidence,
    priority: pattern.impact === 'critical' ? 'critical' : pattern.impact === 'high' ? 'high' : 'medium',
  }));
}
