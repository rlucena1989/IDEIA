import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';
import { createLogger } from '@ideia/logger';

/**
 * Testa matrix.
 * @param module - Valor module.
 * @param options - Valor options.
 */
export function testMatrix(module: string, options: GeneratorOptions): void {
  const vars = buildVars(module);
  const files: FileEntry[] = [
    {
      path: '.ai/testing/matrices/{{name_kebab}}-matrix.md',
      content: `# Test Matrix: {{Name}}

## Unit Tests
| # | Test Case | Type | Priority | Status |
|---|-----------|------|----------|--------|
| UT-001 | [Description] | Unit | High | Pending |

## Integration Tests
| # | Test Case | Type | Priority | Status |
|---|-----------|------|----------|--------|
| IT-001 | [Description] | Integration | High | Pending |

## E2E Tests
| # | Test Case | Type | Priority | Status |
|---|-----------|------|----------|--------|
| E2E-001 | [Description] | E2E | Medium | Pending |

## Coverage Goals
- Unit: 80%+
- Integration: 60%+
- E2E: 30%+
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Test Matrix: ${module}`, result, options.dryRun);
}
