import { GeneratedArtifact } from './artifact-generator';
import { GenerationPlan } from './artifact-types';

export interface GenerationValidationResult {
  ok: boolean;
  issues: string[];
}

export function validateGeneration(
  plan: GenerationPlan,
  artifacts: GeneratedArtifact[]
): GenerationValidationResult {
  const issues: string[] = [];

  for (const expected of plan.artifacts) {
    const found = artifacts.find(artifact => artifact.path === expected.path);
    if (!found) {
      issues.push(`Artefato ausente: ${expected.path}`);
      continue;
    }

    if (found.content.length < 50) {
      issues.push(`Conteúdo insuficiente: ${expected.path}`);
    }
  }

  for (const missing of plan.missingArtifacts) {
    const found = artifacts.find(artifact => artifact.path === missing);
    if (!found) {
      issues.push(`Artefato esperado ausente: ${missing}`);
    }
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}
