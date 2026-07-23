export interface ConflictResolution {
  resolutionId: string;
  conflictType: string;
  resolved: boolean;
  action: 'merge' | 'block' | 'review' | 'prefer-local' | 'prefer-remote';
  reason: string;
  resolvedAt: string;
}

export function resolveConflict(conflictType: string, severity: 'low' | 'medium' | 'high' | 'critical'): ConflictResolution {
  if (severity === 'critical') {
    return {
      resolutionId: `resolution-${Date.now()}`,
      conflictType,
      resolved: false,
      action: 'review',
      reason: 'Critical conflict requires human review.',
      resolvedAt: new Date().toISOString(),
    };
  }

  return {
    resolutionId: `resolution-${Date.now()}`,
    conflictType,
    resolved: true,
    action: severity === 'low' ? 'merge' : 'prefer-local',
    reason: 'Conflict resolved by policy.',
    resolvedAt: new Date().toISOString(),
  };
}
