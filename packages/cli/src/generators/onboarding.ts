import { FileEntry, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';
import { createLogger } from '@ideia/logger';

/**
 * Processa onboarding.
 * @param _options - Valor _options.
 */
export function onboarding(_options: GeneratorOptions): void {
  const files: FileEntry[] = [
    {
      path: `.ai/checklists/onboarding-checklist.md`,
      content: `# Developer Onboarding Checklist

## Environment Setup
- [ ] Clone repository
- [ ] Install Node.js >= 18
- [ ] Run \`npm install\`
- [ ] Run \`npm run build\`
- [ ] Run \`npm run ai:doctor\`

## Project Structure
- [ ] Review \`.ai/\` governance files
- [ ] Review ADRs in \`.ai/architecture/adr/\`
- [ ] Review project manifest

## First Tasks
- [ ] Run \`npm run ai:status\` to see project state
- [ ] Pick a task from \`.ai/tasks/\`
- [ ] Create first PR

## Tools
- [ ] Install AI-Devkit CLI: \`npm install -g ai-devkit\`
- [ ] Install VSCode Extension
- [ ] Configure \`settings.json\` for ai-devkit path

## Contacts
- Tech Lead: [name]
- Project Manager: [name]
- Slack/Discord: [channel]
`,
    },
    {
      path: `CONTRIBUTING.md`,
      content: `# Contributing to {{Name}}

## Development Setup
1. Clone the repo
2. Run \`npm install\`
3. Run \`npm run ai:doctor\`

## Code Standards
- Follow Clean Architecture
- All public functions must have JSDoc
- Test coverage minimum 80%

## PR Process
1. Create feature branch
2. Implement changes
3. Run \`npm run ai:quality:gate\`
4. Create PR against main

## Need Help?
- Check \`.ai/checklists/onboarding-checklist.md\`
- Ask in [#dev-channel]
`,
    },
  ];

  const result = generateFiles(files, {}, { ..._options, dryRun: _options.dryRun, force: _options.force });
  printGeneratorResult('Onboarding Checklist', result, _options.dryRun);
}
