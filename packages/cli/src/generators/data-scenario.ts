import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';

/**
 * Processa scenario.
 * @param name - Valor name.
 * @param options - Valor options.
 */
export function dataScenario(name: string, options: GeneratorOptions): void {
  const vars = buildVars(name);
  const files: FileEntry[] = [
    {
      path: '.ai/testing/data-scenarios/{{name_kebab}}.yaml',
      content: `# Data Scenario: {{Name}}
version: 1
description: "Scenario data for {{name}}"

entities:
  - name: {{Name}}
    count: 5
    attributes:
      - name: id
        type: uuid
      - name: status
        type: enum
        values: [active, inactive, pending]
      - name: createdAt
        type: date

relationships: []

seed:
  count: 10
  strategy: random
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Data Scenario: ${name}`, result, options.dryRun);
}
