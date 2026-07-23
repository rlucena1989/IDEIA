import { FinalVerdict, SystemConsolidation } from './consolidation-types';

export function createFinalVerdict(consolidation: SystemConsolidation): FinalVerdict {
  if (consolidation.healthStatus === 'blocked') {
    return {
      verdictId: `verdict-${Date.now()}`,
      decidedAt: new Date().toISOString(),
      status: 'blocked',
      reason: 'System is blocked due to severe penalties.',
      allowAutonomy: false,
    };
  }

  if (consolidation.healthStatus === 'critical') {
    return {
      verdictId: `verdict-${Date.now()}`,
      decidedAt: new Date().toISOString(),
      status: 'requires-human-review',
      reason: 'Critical status requires human review.',
      allowAutonomy: false,
    };
  }

  if (consolidation.score >= 90) {
    return {
      verdictId: `verdict-${Date.now()}`,
      decidedAt: new Date().toISOString(),
      status: 'ready-for-autonomy',
      reason: 'High confidence for assisted autonomy.',
      allowAutonomy: true,
    };
  }

  return {
    verdictId: `verdict-${Date.now()}`,
    decidedAt: new Date().toISOString(),
    status: consolidation.healthStatus,
    reason: 'System can continue under supervision.',
    allowAutonomy: false,
  };
}
