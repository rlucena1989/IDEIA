import { GenerationScope, GenerationPlan, PlannedArtifact } from './artifact-types';
import { planContent } from './content-planner';
import { generateArtifacts, GeneratedArtifact, GeneratorContext } from './artifact-generator';
import { validateGeneration, GenerationValidationResult } from './generation-validator';

export interface DemandGenerationOutput {
  plan: GenerationPlan;
  artifacts: GeneratedArtifact[];
  validation: GenerationValidationResult;
}

export function runDemandGeneration(
  scope: GenerationScope,
  ctx?: GeneratorContext
): DemandGenerationOutput {
  const plan = planContent(scope);
  const artifacts = generateArtifacts(plan, ctx);
  const validation = validateGeneration(plan, artifacts);

  return { plan, artifacts, validation };
}
