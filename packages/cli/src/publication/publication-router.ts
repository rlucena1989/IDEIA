import { PublicationPlan, PublicationResult } from './publication-types';
import { validatePublication } from './publication-validator';
import { DEFAULT_CONTEXT_POLICY } from '../context/context-policy';

export function routePublication(plan: PublicationPlan): PublicationResult {
  if (DEFAULT_CONTEXT_POLICY.requireValidationBeforePublish) {
    const validation = validatePublication(plan);
    if (!validation.ok) {
      return {
        plan,
        publishedAt: new Date().toISOString(),
        ok: false,
        target: plan.target.kind,
      };
    }
  }

  return {
    plan: { ...plan, validated: true },
    publishedAt: new Date().toISOString(),
    ok: true,
    target: plan.target.kind,
  };
}
