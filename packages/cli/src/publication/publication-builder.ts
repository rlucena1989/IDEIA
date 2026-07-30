import { PublicationPlan, PublicationPayload } from './publication-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('publication-builder');

export function buildPublicationPlan(
  title: string,
  summary: string,
  content: string,
  targetKind: PublicationPlan['target']['kind'],
  metadata?: Record<string, string | number | boolean>
): PublicationPlan {
  const payload: PublicationPayload = {
    title,
    summary,
    content,
    metadata: {
      generatedAt: new Date().toISOString(),
      ...(metadata ?? {}),
    },
  };

  return {
    target: { kind: targetKind },
    payload,
    validated: false,
  };
}
