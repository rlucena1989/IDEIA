import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';
import { createLogger } from '@ideia/logger';

/**
 * Processa example.
 * @param feature - Valor feature.
 * @param options - Valor options.
 */
export function example(feature: string, options: GeneratorOptions): void {
  const vars = buildVars(feature);
  const files: FileEntry[] = [
    {
      path: `examples/{{name_kebab}}/README.md`,
      content: `# {{Name}} Example

## Quick Start
\`\`\`bash
npm install
npm run dev
\`\`\`

## Usage
\`\`\`typescript
import { {{Name}} } from './{{Name}}';

const instance = new {{Name}}();
instance.run();
\`\`\`

## API
| Method | Description |
|--------|-------------|
| run() | Executes the {{name}} example |

## Expected Output
\`\`\`
{{Name}} executed successfully
\`\`\`
`,
    },
    {
      path: `examples/{{name_kebab}}/{{Name}}.ts`,
      content: `export class {{Name}} {
  async run(): Promise<void> {
    logger.info('{{Name}} example running...');
    // Implementar logica de exemplo especifica para {{Name}} (substituir por caso real)
    logger.info('{{Name}} example completed');
  }
}

// Run directly
if (require.main === module) {
  new {{Name}}().run();
}
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Example: ${feature}`, result, options.dryRun);
}
