import { EngineMode, RouteDecision, HardwareProfile } from './types';
import { readHardwareProfile, tierFromHardware } from './hardware-profile';

export interface OptimizationSuggestion {
  parameter: string;
  currentValue: string;
  suggestedValue: string;
  reason: string;
  expectedImprovement: string;
}

export function suggestOptimizations(mode: EngineMode, recentDecisions: RouteDecision[]): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];
  const hw = readHardwareProfile();
  const tier = tierFromHardware(hw);

  if (tier === 'high' && mode === 'balanced') {
    suggestions.push({ parameter: 'mode', currentValue: 'balanced', suggestedValue: 'fast', reason: 'hardware can handle faster mode', expectedImprovement: '2x speed' });
  }

  if (tier === 'low' && mode === 'deep') {
    suggestions.push({ parameter: 'mode', currentValue: 'deep', suggestedValue: 'balanced', reason: 'hardware constrained for deep mode', expectedImprovement: 'reduce memory pressure' });
  }

  if (recentDecisions.length > 0) {
    const avgCost = recentDecisions.reduce((a, d) => a + d.estimatedCostUsd, 0) / recentDecisions.length;
    if (avgCost > 0.01) {
      suggestions.push({ parameter: 'provider', currentValue: 'remote', suggestedValue: 'local', reason: `high average cost per call ($${avgCost.toFixed(4)})`, expectedImprovement: 'cost reduction' });
    }
  }

  return suggestions;
}

export function optimizeMode(history: { avgQuality: number; avgDuration: number; successRate: number }): EngineMode {
  if (history.successRate > 0.95 && history.avgQuality > 85) return 'fast';
  if (history.successRate < 0.7 || history.avgQuality < 50) return 'deep';
  return 'balanced';
}

export function canRunLocally(hw: HardwareProfile, requiredRamGb: number): boolean {
  return hw.ramFreeGb >= requiredRamGb;
}
