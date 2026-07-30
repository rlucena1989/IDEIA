import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';
import { createLogger } from '@ideia/logger';

/**
 * Processa event.
 * @param feature - Valor feature.
 * @param options - Valor options.
 */
export function analyticsEvent(feature: string, options: GeneratorOptions): void {
  const vars = buildVars(feature);
  const files: FileEntry[] = [
    {
      path: `.ai/analytics/{{name_kebab}}-events.yaml`,
      content: `# Analytics Events: {{Name}}

events:
  - name: "{{name_kebab}}_viewed"
    category: "engagement"
    description: "User viewed {{name}}"
    properties:
      - name: source
        type: string

  - name: "{{name_kebab}}_interacted"
    category: "engagement"
    description: "User interacted with {{name}}"
    properties:
      - name: action
        type: string
      - name: duration_ms
        type: number

  - name: "{{name_kebab}}_completed"
    category: "conversion"
    description: "User completed {{name}} flow"
    properties:
      - name: success
        type: boolean
      - name: time_spent_ms
        type: number

  - name: "{{name_kebab}}_error"
    category: "error"
    description: "Error in {{name}}""
    properties:
      - name: error_code
        type: string
      - name: error_message
        type: string
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Analytics Events: ${feature}`, result, options.dryRun);
}
