import { ProductScope } from './product-model';
import { GenerationScope } from './artifact-types';

export function interpretScope(source: GenerationScope): ProductScope {
  return {
    productName: source.productName,
    productType: mapType(source.productType),
    goal: source.goals[0] ?? 'Gerar artefatos operacionais',
    summary: `Produto ${source.productName} do tipo ${source.productType}`,
    priorities: source.requiredArtifacts.map((_, i) => i === 0 ? 'high' : 'medium'),
    constraints: [],
  };
}

function mapType(t: GenerationScope['productType']): ProductScope['productType'] {
  if (t === 'workspace') return 'platform';
  return t as ProductScope['productType'];
}
