import { GenerationScope, GenerationPlan, PlannedArtifact } from './artifact-types';

export function planContent(scope: GenerationScope): GenerationPlan {
  const artifacts: PlannedArtifact[] = scope.requiredArtifacts.map((artifact, index) => ({
    path: artifact,
    title: artifact.split('/').pop() ?? artifact,
    sections: ['Resumo', 'Objetivo', 'Implementação', 'Checklist', 'Prompts'],
    priority: index === 0 ? 'high' : 'medium',
    generated: false,
  }));

  const declaredPaths = new Set(scope.requiredArtifacts);
  const allExpected = detectExpectedArtifacts(scope);
  const missingArtifacts = allExpected.filter(a => !declaredPaths.has(a));

  return {
    scope,
    artifacts,
    missingArtifacts,
  };
}

export function detectExpectedArtifacts(scope: GenerationScope): string[] {
  const expected: string[] = [];

  if (scope.productType === 'cli') {
    expected.push('docs/cli/commands.md');
    expected.push('docs/cli/usage.md');
  } else if (scope.productType === 'extension') {
    expected.push('docs/extension/commands.md');
    expected.push('docs/extension/configuration.md');
  }

  expected.push('docs/architecture/overview.md');
  expected.push('docs/development/setup.md');

  return expected.filter(a => !scope.requiredArtifacts.includes(a));
}
