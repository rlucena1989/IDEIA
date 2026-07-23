import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';

/**
 * Processa contract.
 * @param feature - Valor feature.
 * @param options - Valor options.
 */
export function uxContract(feature: string, options: GeneratorOptions): void {
  const vars = buildVars(feature);
  const files: FileEntry[] = [
    {
      path: `.ai/design/ux-contracts/{{name_kebab}}.yaml`,
      content: `# UX Contract: {{Name}}

events:
  - name: "{{name_kebab}}:init"
    payload:
      type: object
      properties: {}
    description: "Initializes the {{name}} feature"

  - name: "{{name_kebab}}:submit"
    payload:
      type: object
      properties:
        data:
          type: object
    description: "User submits {{name}} form"

  - name: "{{name_kebab}}:error"
    payload:
      type: object
      properties:
        code:
          type: string
        message:
          type: string
    description: "Error occurred in {{name}}"

states:
  - name: loading
    description: "Initial loading state"
  - name: empty
    description: "No data available"
  - name: error
    description: "Error state"
  - name: success
    description: "Data loaded successfully"

ui_components:
  - name: "{{Name}}Form"
    description: "Form component for {{name}}"
    events:
      - submit
      - cancel
  - name: "{{Name}}List"
    description: "List component for {{name}} items"
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`UX Contract: ${feature}`, result, options.dryRun);
}
