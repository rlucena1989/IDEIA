import { PlatformState, MaintenanceTask } from './platform-types';

export function planPlatformMaintenance(state: PlatformState): MaintenanceTask[] {
  const tasks: MaintenanceTask[] = [];

  if (state.healthScore < 80) {
    tasks.push({
      taskId: `task-health-${Date.now()}`,
      description: 'Revisar health score and restore operational thresholds.',
      priority: 'high',
    });
  }

  if (state.autonomyLevel === 'full') {
    tasks.push({
      taskId: `task-autonomy-${Date.now()}`,
      description: 'Review full autonomy controls and governance.',
      priority: 'medium',
    });
  }

  if (state.modules.length === 0) {
    tasks.push({
      taskId: `task-modules-${Date.now()}`,
      description: 'Register at least one active module.',
      priority: 'critical',
    });
  }

  return tasks;
}
