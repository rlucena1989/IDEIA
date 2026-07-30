import path from 'node:path';
import { LawsConfig, ProjectManifest, Target, TARGETS } from './compile-types';
import { readLaws, readManifest, readGlobalRules, readPolicies } from './compile-readers';
import { COMPILERS, TARGET_PATHS } from './compile-compilers';

interface PathScopedOutput {
  path: string;
  content: string;
}

function getPathScopedOutputs(root: string, manifest: ProjectManifest, laws: LawsConfig, globalRules: string[], policies: string[]): PathScopedOutput[] {
  const outputs: PathScopedOutput[] = [];
  if (laws.path_scoped_rules) {
    for (const [globPath, rules] of Object.entries(laws.path_scoped_rules)) {
      outputs.push({
        path: path.join(root, globPath),
        content: rules.map(r => `- ${r}`).join('\n'),
      });
    }
  }
  return outputs;
}

export function compileAll(root: string, targets?: Target[]): Array<{ target: Target; path: string; content: string }> {
  const laws = readLaws(root);
  const manifest = readManifest(root);
  const globalRules = readGlobalRules(root);
  const policies = readPolicies(root);
  const selected = targets || [...TARGETS];

  return selected.map(target => ({
    target,
    path: path.join(root, TARGET_PATHS[target]),
    content: COMPILERS[target](manifest, laws, globalRules, policies),
  }));
}

export { getPathScopedOutputs };
