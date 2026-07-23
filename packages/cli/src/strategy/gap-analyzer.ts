import { TargetState } from './target-state';

export interface GapItem {
  gapId: string;
  category: 'functional' | 'structural' | 'operational' | 'governance' | 'observability' | 'distribution' | 'autonomy';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export function analyzeGaps(target: TargetState, currentCapabilities: string[]): GapItem[] {
  return target.capabilities
    .filter(cap => cap.required && !currentCapabilities.includes(cap.id))
    .map(cap => ({
      gapId: `gap-${cap.id}`,
      category: 'functional' as const,
      description: `Missing capability: ${cap.name}`,
      severity: target.riskLevel === 'critical' ? 'critical' as const : 'high' as const,
    }));
}
