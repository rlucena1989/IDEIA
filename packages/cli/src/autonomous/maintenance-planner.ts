import { DriftSignal, TrendSignal } from './autonomous-types';

export interface MaintenancePlan {
  planId: string;
  createdAt: string;
  actions: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export function buildMaintenancePlan(drifts: DriftSignal[], trends: TrendSignal[]): MaintenancePlan {
  const priority: MaintenancePlan['priority'] =
    drifts.some(d => d.severity === 'critical') ? 'critical' :
    drifts.some(d => d.severity === 'high') ? 'high' : 'medium';

  const actions = [
    ...drifts.map(d => `Investigate drift in ${d.dimension}`),
    ...trends.filter(t => t.direction === 'degrading').map(t => `Stabilize trend in ${t.dimension}`),
  ];

  return {
    planId: `maintenance-${Date.now()}`,
    createdAt: new Date().toISOString(),
    actions,
    priority,
  };
}
