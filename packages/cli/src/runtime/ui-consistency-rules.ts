/** Interface que define a estrutura de u i consistency rule. */
export interface UIConsistencyRule {
  id: string;
  name: string;
  description: string;
  category: 'spacing' | 'typography' | 'color' | 'layout' | 'component' | 'accessibility';
  severity: 'error' | 'warning' | 'info';
  check: (content: string, filePath: string) => UIConsistencyViolation[];
}

/** Interface que define a estrutura de u i consistency violation. */
export interface UIConsistencyViolation {
  ruleId: string;
  ruleName: string;
  filePath: string;
  line: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  suggestion: string;
}

/** Interface que define a estrutura de validation report. */
export interface ValidationReport {
  violations: UIConsistencyViolation[];
  total: number;
  errors: number;
  warnings: number;
  infos: number;
  score: number;
}

const SPACING_PATTERNS = [
  { pattern: /padding:\s*\d+px/g, suggestion: 'Use spacing tokens instead of raw px values' },
  { pattern: /margin:\s*\d+px/g, suggestion: 'Use margin tokens instead of raw px values' },
  { pattern: /gap:\s*\d+px/g, suggestion: 'Use gap tokens instead of raw px values' },
];

const COLOR_PATTERNS = [
  { pattern: /color:\s*#[0-9a-fA-F]{3,6}/g, suggestion: 'Use color tokens instead of raw hex values' },
  { pattern: /background(?:-color)?:\s*#[0-9a-fA-F]{3,6}/g, suggestion: 'Use background tokens instead of raw hex values' },
  { pattern: /border(?:-color)?:\s*#[0-9a-fA-F]{3,6}/g, suggestion: 'Use border color tokens instead of raw hex values' },
];

const FONT_PATTERNS = [
  { pattern: /font-size:\s*\d+px/g, suggestion: 'Use typography scale tokens' },
  { pattern: /font-weight:\s*\d+/g, suggestion: 'Use font weight tokens (400/500/600/700)' },
  { pattern: /line-height:\s*\d+px/g, suggestion: 'Use line height from type scale' },
];

const INLINE_STYLE_PATTERN = /style=\{[^}]*\}/g;
const A11Y_MISSING_ALT = /<img[^>]*(?!alt=)[^>]*\/?>/gi;
const A11Y_MISSING_LABEL = /<input[^>]*(?!aria-label)[^>]*\/?>/gi;

/** Processa e f a u l t_ c o n s i s t e n c y_ r u l e s. */
export const DEFAULT_CONSISTENCY_RULES: UIConsistencyRule[] = [
  {
    id: 'spacing-raw-px', name: 'Raw px spacing', description: 'Use spacing tokens instead of raw px values', category: 'spacing', severity: 'warning',
    check: (content: string, filePath: string) => {
      const violations: UIConsistencyViolation[] = [];
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        for (const sp of SPACING_PATTERNS) {
          const matches = lines[i]!.match(sp.pattern);
          if (matches) {
            violations.push({ ruleId: 'spacing-raw-px', ruleName: 'Raw px spacing', filePath, line: i + 1, message: `Raw px value found: "${matches[0]}"`, severity: 'warning', suggestion: sp.suggestion });
          }
        }
      }
      return violations;
    },
  },
  {
    id: 'color-raw-hex', name: 'Raw hex colors', description: 'Use color tokens instead of raw hex values', category: 'color', severity: 'warning',
    check: (content: string, filePath: string) => {
      const violations: UIConsistencyViolation[] = [];
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        for (const cp of COLOR_PATTERNS) {
          const matches = lines[i]!.match(cp.pattern);
          if (matches) {
            violations.push({ ruleId: 'color-raw-hex', ruleName: 'Raw hex colors', filePath, line: i + 1, message: `Raw hex color: "${matches[0]}"`, severity: 'warning', suggestion: cp.suggestion });
          }
        }
      }
      return violations;
    },
  },
  {
    id: 'typography-raw', name: 'Raw typography values', description: 'Use typography scale tokens', category: 'typography', severity: 'warning',
    check: (content: string, filePath: string) => {
      const violations: UIConsistencyViolation[] = [];
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        for (const fp of FONT_PATTERNS) {
          const matches = lines[i]!.match(fp.pattern);
          if (matches) {
            violations.push({ ruleId: 'typography-raw', ruleName: 'Raw typography values', filePath, line: i + 1, message: `Raw typography: "${matches[0]}"`, severity: 'warning', suggestion: fp.suggestion });
          }
        }
      }
      return violations;
    },
  },
  {
    id: 'inline-styles', name: 'Inline styles', description: 'Avoid inline styles, use CSS classes', category: 'component', severity: 'warning',
    check: (content: string, filePath: string) => {
      const violations: UIConsistencyViolation[] = [];
      let match: RegExpExecArray | null;
      const re = new RegExp(INLINE_STYLE_PATTERN.source, 'g');
      while ((match = re.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        violations.push({ ruleId: 'inline-styles', ruleName: 'Inline styles', filePath, line, message: 'Inline style detected', severity: 'warning', suggestion: 'Extract to CSS classes or style tokens' });
      }
      return violations;
    },
  },
  {
    id: 'a11y-img-alt', name: 'Missing alt text', description: 'Images must have alt text', category: 'accessibility', severity: 'error',
    check: (content: string, filePath: string) => {
      const violations: UIConsistencyViolation[] = [];
      let match: RegExpExecArray | null;
      const re = new RegExp(A11Y_MISSING_ALT.source, 'gi');
      while ((match = re.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        violations.push({ ruleId: 'a11y-img-alt', ruleName: 'Missing alt text', filePath, line, message: 'Image missing alt attribute', severity: 'error', suggestion: 'Add alt text for accessibility' });
      }
      return violations;
    },
  },
  {
    id: 'a11y-input-label', name: 'Missing input label', description: 'Inputs must have accessible labels', category: 'accessibility', severity: 'error',
    check: (content: string, filePath: string) => {
      const violations: UIConsistencyViolation[] = [];
      let match: RegExpExecArray | null;
      const re = new RegExp(A11Y_MISSING_LABEL.source, 'gi');
      while ((match = re.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        violations.push({ ruleId: 'a11y-input-label', ruleName: 'Missing input label', filePath, line, message: 'Input missing aria-label', severity: 'error', suggestion: 'Add aria-label for accessibility' });
      }
      return violations;
    },
  },
];

/** Classe responsável por processa i consistency validator. */
export class UIConsistencyValidator {
  private rules: UIConsistencyRule[];

  constructor(rules: UIConsistencyRule[] = DEFAULT_CONSISTENCY_RULES) {
    this.rules = rules;
  }

  validate(content: string, filePath: string): ValidationReport {
    const allViolations: UIConsistencyViolation[] = [];
    for (const rule of this.rules) {
      const violations = rule.check(content, filePath);
      allViolations.push(...violations);
    }

    const errors = allViolations.filter(v => v.severity === 'error').length;
    const warnings = allViolations.filter(v => v.severity === 'warning').length;
    const infos = allViolations.filter(v => v.severity === 'info').length;

    const totalIssues = errors + warnings + infos;
    const score = totalIssues > 0
      ? Math.round(Math.max(0, 100 - (errors * 15 + warnings * 5 + infos * 1)) * 100) / 100
      : 100;

    return { violations: allViolations, total: allViolations.length, errors, warnings, infos, score };
  }
}
