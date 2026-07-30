import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve('f:/PROJETOS/ai-devkit-workspace/IDEIA');
const tsconfigPath = join(ROOT, 'tsconfig.json');

const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));

const hasLlmProvider = tsconfig.references.some((ref: any) => ref.path === 'packages/llm-provider');

if (!hasLlmProvider) {
  tsconfig.references.push({ path: 'packages/llm-provider' });
  writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n', 'utf8');
  console.log('Added llm-provider to root tsconfig.json');
} else {
  console.log('llm-provider already in root tsconfig.json');
}
