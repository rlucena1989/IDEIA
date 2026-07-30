import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';
import { createLogger } from '@ideia/logger';

/**
 * Processa reproduction.
 * @param id - Valor id.
 * @param options - Valor options.
 */
export function bugReproduction(id: string, options: GeneratorOptions): void {
  const vars = buildVars(id);
  const files: FileEntry[] = [
    {
      path: `.ai/bugs/BUG-{{NAME}}-reproduction.md`,
      content: `# Bug Reproduction: BUG-{{NAME}}

## Metadata
- ID: BUG-{{NAME}}
- Reported: ${new Date().toISOString().split('T')[0]}
- Status: open

## Description
[Describe the bug]

## Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- OS: [e.g., Windows 11]
- Node: [e.g., 18.0.0]
- Browser: [e.g., Chrome 120]

## Reproduction Code
\`\`\`typescript
// Minimal reproduction
\`\`\`

## Logs
\`\`\`
[Relevant logs]
\`\`\`

## Possible Fix
[Optional: suggested fix]
`,
    },
    {
      path: `.ai/bugs/BUG-{{NAME}}-test.ts`,
      content: `/**
 * Reproduction test for BUG-{{NAME}}
 * Run: npx jest .ai/bugs/BUG-{{NAME}}-test.ts --no-coverage
 */
describe('BUG-{{NAME}}', () => {
    it('should reproduce the bug', () => {
    // Implementar codigo minimo que reproduz o bug descrito
    expect(true).toBe(false);
  });

  it('should apply the fix', () => {
    // Implementar verificacao de que o fix corrige o bug sem regredir
    expect(true).toBe(true);
  });
});
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Bug Reproduction: ${id}`, result, options.dryRun);
}
