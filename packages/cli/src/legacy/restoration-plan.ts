import { RestorationPlan } from './legacy-types';

export function buildRestorationPlan(reason: string, allowed: boolean): RestorationPlan {
  return {
    restorationId: `restore-${Date.now()}`,
    requestedAt: new Date().toISOString(),
    reason,
    allowed,
    steps: allowed
      ? ['Validate archive', 'Restore snapshot', 'Rehydrate policies', 'Resume assisted operation']
      : ['Request governance approval'],
  };
}

export function validateRestoration(plan: RestorationPlan): string[] {
  const issues: string[] = [];
  if (!plan.allowed) issues.push('Restoration not approved by governance.');
  if (!plan.reason) issues.push('No reason provided for restoration.');
  return issues;
}
