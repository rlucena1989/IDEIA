import { GenerationScope } from './artifact-types';
import { createLogger } from '@ideia/logger';
import { interpretScope } from './scope-interpreter';
import { planArtifacts } from './artifact-planner';
import { generateDocuments, GeneratedDocument } from './artifact-content-generator';
import { validateCompleteness, CompletenessCheck } from './completeness-validator';
import { ProductPlan } from './product-model';
const logger = createLogger('generation-orchestrator');

export interface OrchestrationResult {
  plan: ProductPlan;
  documents: GeneratedDocument[];
  completeness: CompletenessCheck;
}

export function orchestrateGeneration(scope: GenerationScope): OrchestrationResult {
  const productScope = interpretScope(scope);
  const plan = planArtifacts(productScope);
  const documents = generateDocuments(plan);
  const completeness = validateCompleteness(plan, documents);
  return { plan, documents, completeness };
}
