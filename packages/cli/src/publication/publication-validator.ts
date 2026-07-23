import { PublicationPlan } from './publication-types';

export interface PublicationValidationResult {
  ok: boolean;
  issues: string[];
}

export function validatePublication(plan: PublicationPlan): PublicationValidationResult {
  const issues: string[] = [];

  if (!plan.payload.title.trim()) issues.push('Missing title');
  if (!plan.payload.summary.trim()) issues.push('Missing summary');
  if (!plan.payload.content.trim()) issues.push('Missing content');
  if (plan.payload.title.length > 120) issues.push('Title too long (max 120 chars)');

  return {
    ok: issues.length === 0,
    issues,
  };
}
