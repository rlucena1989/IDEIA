import { AutonomousCycle } from './autonomous-types';

export function startCycle(): AutonomousCycle {
  return {
    cycleId: `cycle-${Date.now()}`,
    startedAt: new Date().toISOString(),
    status: 'running',
    notes: ['Autonomous cycle started.'],
  };
}

export function endCycle(cycle: AutonomousCycle, status: AutonomousCycle['status'], note: string): AutonomousCycle {
  return {
    ...cycle,
    endedAt: new Date().toISOString(),
    status,
    notes: [...cycle.notes, note],
  };
}
