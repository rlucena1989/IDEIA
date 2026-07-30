import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve('f:/PROJETOS/ai-devkit-workspace/IDEIA');
const tsconfigPath = join(ROOT, 'tsconfig.json');

const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));

const hasLlmProvider = tsconfig.references.some((ref: any) => ref.path === 'packages/llm-provider');

if (hasLlmProvider) {
  console.log('llm-provider IS in root tsconfig.json');
} else {
  console.log('llm-provider NOT in root tsconfig.json');
}
