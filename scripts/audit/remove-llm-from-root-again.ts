import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve('f:/PROJETOS/ai-devkit-workspace/IDEIA');
const tsconfigPath = join(ROOT, 'tsconfig.json');

const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));

const originalLength = tsconfig.references.length;
tsconfig.references = tsconfig.references.filter((ref: any) => ref.path !== 'packages/llm-provider');

if (tsconfig.references.length !== originalLength) {
  writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n', 'utf8');
  console.log('Removed llm-provider from root tsconfig.json');
} else {
  console.log('llm-provider not found in root tsconfig.json');
}
