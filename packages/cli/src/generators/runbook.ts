import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';

/**
 * Processa runbook.
 * @param scenario - Valor scenario.
 * @param options - Valor options.
 */
export function runbook(scenario: string, options: GeneratorOptions): void {
  const vars = buildVars(scenario);
  const files: FileEntry[] = [
    {
      path: `.ai/runbooks/{{name_kebab}}.md`,
      content: `# Runbook: {{Name}}

## Scenario
{{Name}} failure/incident response

## Severity
- Impact: [Critical/High/Medium/Low]
- Response SLA: [time]

## Diagnosis Steps
1. Check logs: \`journalctl -u {{name_kebab}} --since "5 min ago"\`
2. Check health endpoint: \`curl /health\`
3. Check metrics: [dashboard URL]

## Recovery Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Escalation
- L1: [team/contact]
- L2: [team/contact]
- L3: [team/contact]

## Post-Mortem
- [ ] Document root cause
- [ ] Create prevention task
- [ ] Update runbook
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Runbook: ${scenario}`, result, options.dryRun);
}
