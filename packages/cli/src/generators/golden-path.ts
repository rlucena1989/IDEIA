import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';
import { createLogger } from '@ideia/logger';

/**
 * Processa path.
 * @param stack - Valor stack.
 * @param options - Valor options.
 */
export function goldenPath(stack: string, options: GeneratorOptions): void {
  const vars = buildVars(stack);
  const files: FileEntry[] = [
    {
      path: `.ai/testing/golden-paths/{{name_kebab}}-golden-path.ts`,
      content: `/**
 * Golden Path Test: {{Name}}
 * Esta suite testa o fluxo completo e mais comum da stack {{name}}.
 * Deve passar sempre que a aplicacao estiver saudavel.
 */

describe('{{Name}} Golden Path', () => {
  beforeAll(() => {
    // Setup: ensure app is running
  });

  afterAll(() => {
    // Teardown
  });

  it('should initialize without errors', () => {
    // App starts successfully
    expect(true).toBe(true);
  });

  it('should handle a basic request', () => {
    // Basic request/response works
    expect(true).toBe(true);
  });

  it('should handle errors gracefully', () => {
    // Error handling works
    expect(true).toBe(true);
  });
});
`,
    },
    {
      path: `.ai/testing/golden-paths/{{name_kebab}}-golden-path.md`,
      content: `# Golden Path: {{Name}}

## Purpose
Test the most critical user journey for {{name}} stack.

## Steps
1. App initialization
2. User authentication (if applicable)
3. Core feature execution
4. Error handling

## Success Criteria
- All golden path tests pass
- Response times within SLA
- Error states are handled gracefully

## Run
\`\`\`bash
npx jest .ai/testing/golden-paths/{{name_kebab}}-golden-path.ts
\`\`\`
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Golden Path: ${stack}`, result, options.dryRun);
}
