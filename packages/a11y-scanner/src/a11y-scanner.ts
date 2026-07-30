import * as fs from 'fs';
import { createLogger } from '@ideia/logger';
import * as path from 'path';
import { A11yReport, A11yRule, A11yViolation, ScanOptions } from './types';

const WCAG_RULES: A11yRule[] = [
  {
    id: 'img-alt',
    name: 'Image alt text',
    description: 'Images must have alt attributes',
    wcagLevel: 'A',
    wcagCriterion: '1.1.1',
    category: 'perceivable',
    severity: 'critical',
  },
  {
    id: 'input-label',
    name: 'Input label',
    description: 'Form inputs must have accessible labels',
    wcagLevel: 'A',
    wcagCriterion: '1.3.1',
    category: 'perceivable',
    severity: 'serious',
  },
  {
    id: 'heading-order',
    name: 'Heading order',
    description: 'Headings must follow a logical order',
    wcagLevel: 'A',
    wcagCriterion: '2.4.10',
    category: 'operable',
    severity: 'moderate',
  },
  {
    id: 'color-contrast',
    name: 'Color contrast',
    description: 'Text must have sufficient color contrast',
    wcagLevel: 'AA',
    wcagCriterion: '1.4.3',
    category: 'perceivable',
    severity: 'serious',
  },
  {
    id: 'keyboard-nav',
    name: 'Keyboard navigation',
    description: 'Interactive elements must be keyboard accessible',
    wcagLevel: 'A',
    wcagCriterion: '2.1.1',
    category: 'operable',
    severity: 'critical',
  },
  {
    id: 'aria-role',
    name: 'ARIA role',
    description: 'Elements with ARIA roles must have required attributes',
    wcagLevel: 'A',
    wcagCriterion: '4.1.2',
    category: 'robust',
    severity: 'serious',
  },
  {
    id: 'focus-order',
    name: 'Focus order',
    description: 'Focusable elements must be in logical tab order',
    wcagLevel: 'A',
    wcagCriterion: '2.4.3',
    category: 'operable',
    severity: 'moderate',
  },
  {
    id: 'lang-attr',
    name: 'HTML lang attribute',
    description: 'Page must have lang attribute',
    wcagLevel: 'A',
    wcagCriterion: '3.1.1',
    category: 'understandable',
    severity: 'moderate',
  },
  {
    id: 'link-text',
    name: 'Link text',
    description: 'Links must have descriptive text',
    wcagLevel: 'A',
    wcagCriterion: '2.4.4',
    category: 'operable',
    severity: 'serious',
  },
  {
    id: 'error-id',
    name: 'Error identification',
    description: 'Input errors must be identified and described',
    wcagLevel: 'A',
    wcagCriterion: '3.3.1',
    category: 'understandable',
    severity: 'moderate',
  },
  {
    id: 'focus-visible',
    name: 'Focus visible',
    description: 'Focus indicator must be visible',
    wcagLevel: 'AA',
    wcagCriterion: '2.4.7',
    category: 'operable',
    severity: 'serious',
  },
  {
    id: 'landmark',
    name: 'Landmarks',
    description: 'Page must use semantic landmarks',
    wcagLevel: 'A',
    wcagCriterion: '1.3.1',
    category: 'robust',
    severity: 'moderate',
  },
];

export class A11yScanner {
  private rules: A11yRule[];
  private rulesMap: Map<string, A11yRule>;

  constructor(customRules?: A11yRule[]) {
    this.rules = [...WCAG_RULES, ...(customRules || [])];
    this.rulesMap = new Map(this.rules.map((r) => [r.id, r]));
  }

  scanFile(filePath: string): A11yViolation[] {
    if (!fs.existsSync(filePath)) return [];
    const ext = path.extname(filePath).toLowerCase();
    if (!['.tsx', '.jsx', '.html', '.vue', '.svelte', '.astro'].includes(ext)) return [];

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const violations: A11yViolation[] = [];
    let lastHeadingLevel = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (this.rulesMap.has('img-alt') && /<img[^>]+src=["'][^"']+["'][^>]*>/.test(line) && !/alt=["']/.test(line)) {
        violations.push(
          this.createViolation('img-alt', filePath, i + 1, 'Image missing alt attribute', 'Add alt="description" to the image tag'),
        );
      }

      if (
        this.rulesMap.has('input-label') &&
        /<(input|select|textarea)[^>]*>/.test(line) &&
        !/aria-label=["']/.test(line) &&
        !/aria-labelledby=["']/.test(line)
      ) {
        violations.push(
          this.createViolation('input-label', filePath, i + 1, 'Input missing accessible label', 'Add aria-label or use a label element'),
        );
      }

      if (this.rulesMap.has('heading-order') && /<h([1-6])[^>]*>/.test(line)) {
        const match = line.match(/<h([1-6])/);
        if (match) {
          const level = parseInt(match[1], 10);
          if (level > lastHeadingLevel + 1) {
            violations.push(
              this.createViolation(
                'heading-order',
                filePath,
                i + 1,
                `Skipped heading level from h${lastHeadingLevel} to h${level}`,
                `Use h${lastHeadingLevel + 1} instead of h${level}`,
              ),
            );
          }
          lastHeadingLevel = level;
        }
      }

      if (
        this.rulesMap.has('keyboard-nav') &&
        /onClick=\{/.test(line) &&
        !/onKey(?:Down|Up|Press)=\{/.test(line) &&
        !/tabIndex/.test(line)
      ) {
        violations.push(
          this.createViolation(
            'keyboard-nav',
            filePath,
            i + 1,
            'Click handler without keyboard handler',
            'Add onKeyDown handler or tabIndex={0}',
          ),
        );
      }

      if (this.rulesMap.has('link-text') && /<a[^>]*href=["'][^"']*["'][^>]*>\s*<\/a>/.test(line)) {
        violations.push(this.createViolation('link-text', filePath, i + 1, 'Link with empty text', 'Add descriptive text to the link'));
      }

      if (
        this.rulesMap.has('aria-role') &&
        /role=["'](?:button|link|checkbox|listbox)["'][^>]*>/.test(line) &&
        !/aria-label|aria-labelledby/.test(line)
      ) {
        violations.push(
          this.createViolation(
            'aria-role',
            filePath,
            i + 1,
            'Interactive role without accessible name',
            'Add aria-label to the element with role',
          ),
        );
      }

      if (this.rulesMap.has('lang-attr') && i < 10 && /<html[^>]*>/.test(line) && !/lang=["']/.test(line)) {
        violations.push(
          this.createViolation('lang-attr', filePath, i + 1, 'HTML tag missing lang attribute', 'Add lang="en" or appropriate language'),
        );
      }
    }

    return violations;
  }

  scanContent(content: string, fileName: string): A11yViolation[] {
    const filePath = fileName;
    const lines = content.split('\n');
    const violations: A11yViolation[] = [];
    let lastHeadingLevel = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (this.rulesMap.has('img-alt') && /<img[^>]+src=["'][^"']+["'][^>]*>/.test(line) && !/alt=["']/.test(line)) {
        violations.push(
          this.createViolation('img-alt', filePath, i + 1, 'Image missing alt attribute', 'Add alt="description" to the image tag'),
        );
      }

      if (
        this.rulesMap.has('input-label') &&
        /<(input|select|textarea)[^>]*>/.test(line) &&
        !/aria-label=["']/.test(line) &&
        !/aria-labelledby=["']/.test(line)
      ) {
        violations.push(
          this.createViolation('input-label', filePath, i + 1, 'Input missing accessible label', 'Add aria-label or use a label element'),
        );
      }

      if (this.rulesMap.has('heading-order') && /<h([1-6])[^>]*>/.test(line)) {
        const match = line.match(/<h([1-6])/);
        if (match) {
          const level = parseInt(match[1], 10);
          if (level > lastHeadingLevel + 1) {
            violations.push(
              this.createViolation(
                'heading-order',
                filePath,
                i + 1,
                `Skipped heading level from h${lastHeadingLevel} to h${level}`,
                `Use h${lastHeadingLevel + 1} instead of h${level}`,
              ),
            );
          }
          lastHeadingLevel = level;
        }
      }

      if (
        this.rulesMap.has('keyboard-nav') &&
        /onClick=\{/.test(line) &&
        !/onKey(?:Down|Up|Press)=\{/.test(line) &&
        !/tabIndex/.test(line)
      ) {
        violations.push(
          this.createViolation(
            'keyboard-nav',
            filePath,
            i + 1,
            'Click handler without keyboard handler',
            'Add onKeyDown handler or tabIndex={0}',
          ),
        );
      }

      if (this.rulesMap.has('link-text') && /<a[^>]*href=["'][^"']*["'][^>]*>\s*<\/a>/.test(line)) {
        violations.push(this.createViolation('link-text', filePath, i + 1, 'Link with empty text', 'Add descriptive text to the link'));
      }

      if (
        this.rulesMap.has('aria-role') &&
        /role=["'](?:button|link|checkbox|listbox)["'][^>]*>/.test(line) &&
        !/aria-label|aria-labelledby/.test(line)
      ) {
        violations.push(
          this.createViolation(
            'aria-role',
            filePath,
            i + 1,
            'Interactive role without accessible name',
            'Add aria-label to the element with role',
          ),
        );
      }

      if (this.rulesMap.has('lang-attr') && i < 10 && /<html[^>]*>/.test(line) && !/lang=["']/.test(line)) {
        violations.push(
          this.createViolation('lang-attr', filePath, i + 1, 'HTML tag missing lang attribute', 'Add lang="en" or appropriate language'),
        );
      }
    }

    return violations;
  }

  scanDirectory(rootDir: string, options?: ScanOptions): A11yReport {
    const allViolations: A11yViolation[] = [];
    const exclude = options?.exclude || ['node_modules', 'dist', '.git', 'build'];

    const include = options?.include || ['src', 'packages', 'app'];
    let hasAnyDir = false;

    for (const dir of include) {
      const fullPath = path.join(rootDir, dir);
      if (fs.existsSync(fullPath)) {
        hasAnyDir = true;
        this.walkDir(fullPath, exclude, allViolations);
      }
    }

    if (!hasAnyDir) {
      this.walkDir(rootDir, exclude, allViolations);
    }

    return this.buildReport(allViolations);
  }

  getRules(): A11yRule[] {
    return [...this.rules];
  }

  private walkDir(dir: string, exclude: string[], violations: A11yViolation[]): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!exclude.includes(entry.name)) this.walkDir(fullPath, exclude, violations);
      } else if (entry.isFile()) {
        violations.push(...this.scanFile(fullPath));
      }
    }
  }

  private createViolation(ruleId: string, filePath: string, line: number, message: string, suggestion?: string): A11yViolation {
    const rule = this.rulesMap.get(ruleId);
    return {
      ruleId,
      ruleName: rule?.name ?? 'unknown',
      filePath,
      line,
      message,
      severity: rule?.severity ?? 'minor',
      wcagLevel: rule?.wcagLevel ?? 'AA',
      suggestion,
    };
  }

  private buildReport(violations: A11yViolation[]): A11yReport {
    const bySeverity: Record<string, number> = {};
    const byWCAGLevel: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const v of violations) {
      bySeverity[v.severity] = (bySeverity[v.severity] || 0) + 1;
      byWCAGLevel[v.wcagLevel] = (byWCAGLevel[v.wcagLevel] || 0) + 1;
      const rule = this.rulesMap.get(v.ruleId);
      if (rule) byCategory[rule.category] = (byCategory[rule.category] || 0) + 1;
    }

    const maxScore = this.rules.length * 10;
    const penalty = violations.reduce((sum, v) => {
      const p = v.severity === 'critical' ? 10 : v.severity === 'serious' ? 5 : v.severity === 'moderate' ? 3 : 1;
      return sum + p;
    }, 0);
    const score = Math.max(0, Math.min(100, Math.round((1 - penalty / maxScore) * 100)));

    return { totalViolations: violations.length, bySeverity, byWCAGLevel, byCategory, violations, score };
  }
}

export function createA11yScanner(customRules?: A11yRule[]): A11yScanner {
  return new A11yScanner(customRules);
}
