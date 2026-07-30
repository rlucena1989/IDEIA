import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';
import { createLogger } from '@ideia/logger';

/**
 * Processa blueprint.
 * @param name - Valor name.
 * @param options - Valor options.
 */
export function featureBlueprint(name: string, options: GeneratorOptions): void {
  const vars = buildVars(name);
  const files: FileEntry[] = [
    {
      path: '.ai/features/{{name_kebab}}/blueprint.md',
      content: `# Feature: {{Name}}

## Metadata
- ID: FTR-{{NAME}}
- Name: {{Name}}
- Status: draft
- Created: ${new Date().toISOString().split('T')[0]}

## Objective
[Describe the business objective of {{Name}}]

## Requirements
- [ ] REQ-001: [Requirement description]

## Acceptance Criteria
- [ ] AC-001: [Criterion description]

## Risks
- [ ] Risk: [Description]

## Dependencies
- None

## Technical Notes
[Implementation notes for {{Name}}]
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Feature Blueprint: ${name}`, result, options.dryRun);
}
