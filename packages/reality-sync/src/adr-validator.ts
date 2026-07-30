import * as fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import * as path from 'node:path';

export interface ADRValidationResult {
  file: string;
  number: number;
  valid: boolean;
  missingSections: string[];
  errors: string[];
  warnings: string[];
}

export const REQUIRED_SECTIONS = ['Status', 'Date', 'Context', 'Decision', 'Consequences'];

export const SECTION_PATTERNS = {
  Status: /^##\s*Status/im,
  Date: /^##\s*Date/i,
  Context: /^##\s*Context/i,
  Decision: /^##\s*Decision/i,
  Consequences: /^##\s*Consequences/im,
};

export class ADRValidator {
  private docsAdrDir: string;

  constructor(docsAdrDir?: string) {
    this.docsAdrDir = docsAdrDir ?? path.join(process.cwd(), 'docs', 'adr');
  }

  validateAll(): ADRValidationResult[] {
    const results: ADRValidationResult[] = [];
    if (!fs.existsSync(this.docsAdrDir)) return results;

    const files = fs.readdirSync(this.docsAdrDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const result = this.validateOne(file);
      results.push(result);
    }
    return results;
  }

  validateOne(filename: string): ADRValidationResult {
    const filePath = path.join(this.docsAdrDir, filename);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const numMatch = filename.match(/^ADR-(\d{3})-/);
    const number = numMatch ? parseInt(numMatch[1] ?? '0', 10) : 0;

    const missingSections: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const section of REQUIRED_SECTIONS) {
      const pattern = SECTION_PATTERNS[section as keyof typeof SECTION_PATTERNS];
      if (!pattern.test(content)) {
        missingSections.push(section);
        errors.push(`Missing required section: ${section}`);
      }
    }

    if (lines.length < 10) {
      warnings.push('ADR file is too short (< 10 lines)');
    }

    const hasTitle = lines.some(l => l.startsWith('# ADR-'));
    if (!hasTitle) {
      errors.push('Missing ADR title (line starting with "# ADR-")');
    }

    if (number === 0 && !numMatch) {
      errors.push('Filename does not match ADR-XXX-* pattern');
    }

    const validStatuses = ['proposed', 'accepted', 'deprecated', 'superseded'];
    const hasValidStatus = validStatuses.some(s => content.toLowerCase().includes(s));
    if (!hasValidStatus) {
      warnings.push('No valid status found (expected: proposed, accepted, deprecated, superseded)');
    }

    return {
      file: filename,
      number,
      valid: errors.length === 0,
      missingSections,
      errors,
      warnings,
    };
  }

  getStatusSummary(): { total: number; valid: number; invalid: number; warnings: number } {
    const results = this.validateAll();
    return {
      total: results.length,
      valid: results.filter(r => r.valid).length,
      invalid: results.filter(r => !r.valid).length,
      warnings: results.reduce((sum, r) => sum + r.warnings.length, 0),
    };
  }
}

export function createADRValidator(docsAdrDir?: string): ADRValidator {
  return new ADRValidator(docsAdrDir);
}
