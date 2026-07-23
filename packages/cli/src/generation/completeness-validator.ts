import { GeneratedDocument } from './artifact-content-generator';
import { ProductPlan } from './product-model';

export interface CompletenessCheck {
  ok: boolean;
  missing: string[];
  insufficient: string[];
}

export function validateCompleteness(
  plan: ProductPlan,
  documents: GeneratedDocument[]
): CompletenessCheck {
  const missing: string[] = [];
  const insufficient: string[] = [];

  for (const artifact of plan.artifacts) {
    const found = documents.find((doc) => doc.path === artifact.path);

    if (!found) {
      missing.push(artifact.path);
      continue;
    }

    if (found.content.length < 120) {
      insufficient.push(artifact.path);
    }
  }

  return {
    ok: missing.length === 0 && insufficient.length === 0,
    missing,
    insufficient,
  };
}
