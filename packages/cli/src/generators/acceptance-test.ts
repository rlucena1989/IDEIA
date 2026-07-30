import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';
import { createLogger } from '@ideia/logger';

/**
 * Processa test.
 * @param feature - Valor feature.
 * @param options - Valor options.
 */
export function acceptanceTest(feature: string, options: GeneratorOptions): void {
  const vars = buildVars(feature);
  const files: FileEntry[] = [
    {
      path: '.ai/testing/acceptance/{{name_kebab}}.feature',
      content: `Feature: {{Name}}
  As a [stakeholder]
  I want [goal]
  So that [reason]

  Background:
    Given the system is ready

  Scenario: Basic {{Name}} flow
    Given [precondition]
    When [action]
    Then [expected result]

  Scenario: {{Name}} error handling
    Given [invalid precondition]
    When [action]
    Then [error expected]
`,
    },
    {
      path: '.ai/testing/acceptance/{{name_kebab}}-steps.ts',
      content: `import { Given, When, Then } from '@cucumber/cucumber';

Given('the system is ready', () => {
  // Setup
});

When('the {{name}} action is performed', () => {
  // Action
});

Then('the expected result for {{name}} is achieved', () => {
  // Assertion
});
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Acceptance Test: ${feature}`, result, options.dryRun);
}
