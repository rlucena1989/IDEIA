import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';

/**
 * Processa privacy.
 * @param feature - Valor feature.
 * @param options - Valor options.
 */
export function privacy(feature: string, options: GeneratorOptions): void {
  const vars = buildVars(feature);
  const files: FileEntry[] = [
    {
      path: `.ai/privacy/{{name_kebab}}-lgpd-checklist.md`,
      content: `# LGPD/GDPR Checklist: {{Name}}

## Data Mapping
- [ ] Identify personal data collected by {{name}}
- [ ] Document data flow (collection → storage → processing → deletion)
- [ ] Classify data sensitivity level

## Consent
- [ ] Implement consent collection mechanism
- [ ] Store consent records with timestamp
- [ ] Provide consent withdrawal option

## Rights
- [ ] Right to access: API endpoint GET /api/{{name_kebab}}/data
- [ ] Right to rectification: API endpoint PUT /api/{{name_kebab}}/data
- [ ] Right to deletion: API endpoint DELETE /api/{{name_kebab}}/data
- [ ] Right to portability: Export in JSON format

## Security
- [ ] Encrypt personal data at rest
- [ ] Encrypt personal data in transit
- [ ] Implement access logging
- [ ] Data retention policy: [days]

## Breach Notification
- [ ] Document breach notification process
- [ ] Set up monitoring and alerting
`,
    },
    {
      path: `src/{{name_kebab}}/privacy/PrivacyService.ts`,
      content: `export interface PersonalData {
  userId: string;
  data: Record<string, unknown>;
  collectedAt: Date;
  consentGiven: boolean;
}

export class PrivacyService {
  private store: Map<string, PersonalData> = new Map();

  async getData(userId: string): Promise<PersonalData | null> {
    return this.store.get(userId) ?? null;
  }

  async deleteData(userId: string): Promise<void> {
    this.store.delete(userId);
  }

  async exportData(userId: string): Promise<Record<string, unknown> | null> {
    const data = this.store.get(userId);
    return data ? { ...data.data, exportedAt: new Date().toISOString() } : null;
  }
}
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Privacy/LGPD: ${feature}`, result, options.dryRun);
}
