import * as fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import * as path from 'node:path';

export interface ADRInput {
  title: string;
  context: string;
  decision: string;
  consequences: string;
  status?: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
}

export interface ADRResult {
  number: number;
  title: string;
  filePath: string;
  fullPath: string;
}

export class ADRGenerator {
  private docsAdrDir: string;

  constructor(docsAdrDir?: string) {
    this.docsAdrDir = docsAdrDir ?? path.join(process.cwd(), 'docs', 'adr');
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.docsAdrDir)) {
      fs.mkdirSync(this.docsAdrDir, { recursive: true });
    }
  }

  private getNextNumber(): number {
    this.ensureDir();
    let maxNum = 0;
    try {
      const files = fs.readdirSync(this.docsAdrDir);
      for (const file of files) {
        const match = file.match(/^ADR-(\d{3})-/);
        if (match) {
          const num = parseInt(match[1] ?? '0', 10);
          if (num > maxNum) maxNum = num;
        }
      }
    } catch {}
    return maxNum + 1;
  }

  private sanitizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
  }

  generateADR(input: ADRInput): ADRResult {
    const number = this.getNextNumber();
    const paddedNum = String(number).padStart(3, '0');
    const slug = this.sanitizeTitle(input.title);
    const fileName = `ADR-${paddedNum}-${slug}.md`;
    const fullPath = path.join(this.docsAdrDir, fileName);

    const today = new Date().toISOString().split('T')[0];
    const status = input.status || 'proposed';

    const content = `# ADR-${paddedNum}: ${input.title}

## Status

${status}

## Date

${today}

## Context

${input.context}

## Decision

${input.decision}

## Consequences

${input.consequences}
`;

    this.ensureDir();
    fs.writeFileSync(fullPath, content, 'utf-8');

    return {
      number,
      title: input.title,
      filePath: path.relative(process.cwd(), fullPath),
      fullPath,
    };
  }

  listADRs(): ADRResult[] {
    this.ensureDir();
    const results: ADRResult[] = [];
    try {
      const files = fs.readdirSync(this.docsAdrDir);
      for (const file of files) {
        const match = file.match(/^ADR-(\d{3})-(.+)\.md$/);
        if (match) {
          results.push({
            number: parseInt(match[1] ?? '0', 10),
            title: (match[2] ?? '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            filePath: `docs/adr/${file}`,
            fullPath: path.join(this.docsAdrDir, file),
          });
        }
      }
    } catch {}
    return results.sort((a, b) => a.number - b.number);
  }

  getADR(number: number): string | null {
    this.ensureDir();
    try {
      const files = fs.readdirSync(this.docsAdrDir);
      const file = files.find(f => f.startsWith(`ADR-${String(number).padStart(3, '0')}-`));
      if (file) {
        return fs.readFileSync(path.join(this.docsAdrDir, file), 'utf-8');
      }
    } catch {}
    return null;
  }

  getADRTemplates(): string[] {
    return [
      'technology-adoption',
      'architecture-change',
      'api-change',
      'tool-creation',
    ];
  }

  generateFromTemplate(templateName: string, variables: Record<string, string>): ADRResult {
    const templates: Record<string, string> = {
      'technology-adoption': `# ADR-{number}: {title}

## Status

proposed

## Date

{date}

## Context

We are considering adopting {technology} for {purpose}.

## Decision

We will adopt {technology} because: {reasons}.

## Consequences

{consequences}`,
      'architecture-change': `# ADR-{number}: {title}

## Status

proposed

## Date

{date}

## Context

{context}

## Decision

{decision}

## Consequences

{consequences}`,
      'api-change': `# ADR-{number}: {title}

## Status

proposed

## Date

{date}

## Context

{context}

## Decision

{decision}

## Consequences

{consequences}`,
      'tool-creation': `# ADR-{number}: {title}

## Status

proposed

## Date

{date}

## Context

{context}

## Decision

{decision}

## Consequences

{consequences}`,
    };

    const template = templates[templateName];
    if (!template) throw new Error(`Unknown template: ${templateName}`);

    let content = template;
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }

    const number = this.getNextNumber();
    const paddedNum = String(number).padStart(3, '0');
    const title = variables.title || 'Untitled Decision';
    const slug = this.sanitizeTitle(title);
    const fileName = `ADR-${paddedNum}-${slug}.md`;
    const fullPath = path.join(this.docsAdrDir, fileName);

    this.ensureDir();
    fs.writeFileSync(fullPath, content, 'utf-8');

    return {
      number,
      title,
      filePath: path.relative(process.cwd(), fullPath),
      fullPath,
    };
  }

  validateADR(number: number): { valid: boolean; missingSections: string[]; errors: string[] } {
    const content = this.getADR(number);
    if (!content) return { valid: false, missingSections: [], errors: ['ADR not found'] };

    const requiredSections = ['## Status', '## Date', '## Context', '## Decision', '## Consequences'];
    const missingSections = requiredSections.filter(s => !content.includes(s));

    return {
      valid: missingSections.length === 0,
      missingSections,
      errors: missingSections.map(s => `Missing section: ${s}`),
    };
  }

  validateAllADRs(): Array<{ number: number; title: string; valid: boolean; errors: string[] }> {
    return this.listADRs().map(adr => ({
      number: adr.number,
      title: adr.title,
      ...this.validateADR(adr.number),
    }));
  }
}

export function createADRGenerator(docsAdrDir?: string): ADRGenerator {
  return new ADRGenerator(docsAdrDir);
}
