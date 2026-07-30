import { A11yRule, A11yViolation, WCAGLevel } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('a11y-checker');

export interface CheckerOptions {
  json?: boolean;
  ci?: boolean;
  wcagLevel?: WCAGLevel;
}

export interface ComplianceSummary {
  passed: number;
  failed: number;
  warnings: number;
  notApplicable: number;
}

export interface ComplianceReport {
  totalRules: number;
  violations: A11yViolation[];
  summary: ComplianceSummary;
  score: number;
  passed: boolean;
  timestamp: string;
  durationMs: number;
}

export interface ARIARequiredAttribute {
  role: string;
  requiredAttrs: string[];
  description: string;
}

export interface ColorContrastPair {
  foreground: string;
  background: string;
  contrastRatio: number;
  passesAA: boolean;
  passesAAA: boolean;
  element?: string;
}

const ARIA_REQUIRED_ATTRIBUTES: ARIARequiredAttribute[] = [
  { role: 'checkbox', requiredAttrs: ['aria-checked'], description: 'Checkbox requires aria-checked' },
  { role: 'combobox', requiredAttrs: ['aria-expanded', 'aria-controls'], description: 'Combobox requires aria-expanded and aria-controls' },
  { role: 'slider', requiredAttrs: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'], description: 'Slider requires aria-valuenow, aria-valuemin, aria-valuemax' },
  { role: 'spinbutton', requiredAttrs: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'], description: 'Spinbutton requires aria-valuenow, aria-valuemin, aria-valuemax' },
  { role: 'progressbar', requiredAttrs: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'], description: 'Progressbar requires aria-valuenow, aria-valuemin, aria-valuemax' },
  { role: 'scrollbar', requiredAttrs: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax', 'aria-controls'], description: 'Scrollbar requires aria-valuenow, aria-valuemin, aria-valuemax, aria-controls' },
  { role: 'dialog', requiredAttrs: ['aria-label', 'aria-labelledby'], description: 'Dialog requires aria-label or aria-labelledby' },
  { role: 'alertdialog', requiredAttrs: ['aria-label', 'aria-labelledby'], description: 'Alertdialog requires aria-label or aria-labelledby' },
  { role: 'tabpanel', requiredAttrs: ['aria-labelledby'], description: 'Tabpanel requires aria-labelledby' },
  { role: 'treeitem', requiredAttrs: ['aria-expanded'], description: 'Treeitem with children requires aria-expanded' },
  { role: 'option', requiredAttrs: ['aria-selected'], description: 'Option in listbox requires aria-selected' },
  { role: 'menuitemcheckbox', requiredAttrs: ['aria-checked'], description: 'Menuitemcheckbox requires aria-checked' },
  { role: 'menuitemradio', requiredAttrs: ['aria-checked'], description: 'Menuitemradio requires aria-checked' },
  { role: 'switch', requiredAttrs: ['aria-checked'], description: 'Switch requires aria-checked' },
  { role: 'heading', requiredAttrs: ['aria-level'], description: 'Heading role requires aria-level' },
];

const LUMINANCE_THRESHOLD = 0.03928;
const GAMMA = 2.4;

export function relativeLuminance(hex: string): number {
  const raw = hex.replace('#', '');
  let r: number; let g: number; let b: number;
  if (raw.length === 3) {
    r = parseInt(raw[0] + raw[0], 16) / 255;
    g = parseInt(raw[1] + raw[1], 16) / 255;
    b = parseInt(raw[2] + raw[2], 16) / 255;
  } else {
    r = parseInt(raw.slice(0, 2), 16) / 255;
    g = parseInt(raw.slice(2, 4), 16) / 255;
    b = parseInt(raw.slice(4, 6), 16) / 255;
  }
  const toLinear = (c: number): number => c <= LUMINANCE_THRESHOLD ? c / 12.92 : Math.pow((c + 0.055) / 1.055, GAMMA);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function parseHexColor(cssColor: string): string | null {
  const match = cssColor.match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/);
  return match ? `#${match[1].toLowerCase()}` : null;
}

export class A11yChecker {
  private rules: A11yRule[];
  private rulesMap: Map<string, A11yRule>;

  constructor(customRules?: A11yRule[]) {
    this.rules = customRules || [];
    this.rulesMap = new Map(this.rules.map(r => [r.id, r]));
  }

  checkARIARequired(content: string, filePath?: string): A11yViolation[] {
    const violations: A11yViolation[] = [];
    for (const def of ARIA_REQUIRED_ATTRIBUTES) {
      const roleRegex = new RegExp(`role=["']${def.role}["']`, 'gi');
      let match: RegExpExecArray | null;
      while ((match = roleRegex.exec(content)) !== null) {
        const lineStart = content.lastIndexOf('\n', match.index) + 1;
        const lineEnd = content.indexOf('\n', match.index);
        const line = lineEnd > 0 ? content.slice(lineStart, lineEnd) : content.slice(lineStart);
        const lineNum = content.slice(0, match.index).split('\n').length;

        for (const attr of def.requiredAttrs) {
          if (!line.includes(attr)) {
            violations.push({
              ruleId: `aria-required-${def.role}`,
              ruleName: `Required ARIA attribute: ${def.role}`,
              filePath: filePath || 'inline',
              line: lineNum,
              message: `Element with role="${def.role}" is missing required attribute "${attr}"`,
              severity: 'critical',
              wcagLevel: 'A',
              suggestion: `Add ${attr}="${attr === 'aria-checked' || attr === 'aria-expanded' || attr === 'aria-selected' ? 'false' : ''}" to the element with role="${def.role}"`,
            });
          }
        }
      }
    }
    return violations;
  }

  checkColorContrast(content: string, filePath?: string): A11yViolation[] {
    const violations: A11yViolation[] = [];
    const pairs = this.extractColorPairs(content);
    for (const pair of pairs) {
      if (!pair.passesAA) {
        const lineNum = content.slice(0, content.indexOf(pair.foreground)).split('\n').length;
        violations.push({
          ruleId: 'color-contrast-aa',
          ruleName: 'Color contrast (AA)',
          filePath: filePath || 'inline',
          line: lineNum,
          message: `Color contrast ratio ${pair.contrastRatio.toFixed(2)}:1 is below AA minimum (4.5:1) for ${pair.foreground} on ${pair.background}`,
          severity: 'serious',
          wcagLevel: 'AA',
          suggestion: `Use a darker foreground or lighter background to achieve at least 4.5:1 contrast ratio`,
        });
      }
    }
    return violations;
  }

  checkKeyboardSupport(content: string, filePath?: string): A11yViolation[] {
    const violations: A11yViolation[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      if (/onClick=\{/.test(line) && !/onKey(?:Down|Up|Press)=\{/.test(line) && !/\btabIndex\b/.test(line) && !/role=["'](?:button|link)["']/.test(line)) {
        violations.push({
          ruleId: 'keyboard-support-click',
          ruleName: 'Keyboard support for click handler',
          filePath: filePath || 'inline',
          line: lineNum,
          message: 'Click event handler without keyboard equivalent',
          severity: 'serious',
          wcagLevel: 'A',
          suggestion: 'Add onKeyDown handler for Enter/Space, or use a <button> element instead',
        });
      }

      if (/onMouseOver=\{/.test(line) && !/onFocus=\{/.test(line)) {
        violations.push({
          ruleId: 'keyboard-support-hover',
          ruleName: 'Keyboard support for hover',
          filePath: filePath || 'inline',
          line: lineNum,
          message: 'MouseOver event without Focus equivalent',
          severity: 'serious',
          wcagLevel: 'A',
          suggestion: 'Add onFocus handler to match the onMouseOver behavior',
        });
      }

      if (/onMouseOut=\{/.test(line) && !/onBlur=\{/.test(line)) {
        violations.push({
          ruleId: 'keyboard-support-blur',
          ruleName: 'Keyboard support for blur',
          filePath: filePath || 'inline',
          line: lineNum,
          message: 'MouseOut event without Blur equivalent',
          severity: 'moderate',
          wcagLevel: 'A',
          suggestion: 'Add onBlur handler to match the onMouseOut behavior',
        });
      }

      if (/tabIndex=\{?-1\}?/.test(line) && /<(div|span)[^>]*tabIndex=\{?-1\}?[^>]*>/.test(line) && !/aria-hidden/.test(line)) {
        violations.push({
          ruleId: 'keyboard-support-tabindex-neg',
          ruleName: 'Negative tabIndex on non-interactive element',
          filePath: filePath || 'inline',
          line: lineNum,
          message: 'Element with tabIndex={-1} may be unreachable by keyboard',
          severity: 'moderate',
          wcagLevel: 'A',
          suggestion: 'Ensure tabIndex={-1} is only used for elements that become focusable via script',
        });
      }

      if (/tabIndex=\{0\}?/.test(line) && /<(div|span)[^>]*tabIndex=\{?0\}?[^>]*>/.test(line) && !/role=["']/.test(line)) {
        violations.push({
          ruleId: 'keyboard-support-tabindex-zero',
          ruleName: 'tabIndex=0 without ARIA role',
          filePath: filePath || 'inline',
          line: lineNum,
          message: 'Focusable element with tabIndex=0 is missing ARIA role',
          severity: 'moderate',
          wcagLevel: 'A',
          suggestion: 'Add role="button" or appropriate role to the focusable element',
        });
      }
    }
    return violations;
  }

  async check(content: string, options?: CheckerOptions): Promise<ComplianceReport> {
    const start = Date.now();
    const violations: A11yViolation[] = [
      ...this.checkARIARequired(content),
      ...this.checkColorContrast(content),
      ...this.checkKeyboardSupport(content),
    ];

    const summary: ComplianceSummary = {
      passed: 0, failed: 0, warnings: 0, notApplicable: 0,
    };

    for (const v of violations) {
      if (v.severity === 'critical' || v.severity === 'serious') summary.failed++;
      else if (v.severity === 'moderate') summary.warnings++;
      else summary.passed++;
    }

    if (violations.length === 0) summary.passed = ARIA_REQUIRED_ATTRIBUTES.length + 15;

    const penalty = violations.reduce((sum, v) => {
      const weights = { critical: 20, serious: 10, moderate: 5, minor: 2 };
      return sum + (weights[v.severity] ?? 5);
    }, 0);
    const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));

    const report: ComplianceReport = {
      totalRules: ARIA_REQUIRED_ATTRIBUTES.length + 3,
      violations,
      summary,
      score,
      passed: options?.ci ? score >= 80 : score >= 60,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - start,
    };

    if (options?.json && options?.ci && !report.passed) {
      throw new Error(`CI check failed: score ${score} below threshold 80`);
    }

    return report;
  }

  private extractColorPairs(content: string): ColorContrastPair[] {
    const pairs: ColorContrastPair[] = [];
    const colorDecls = content.matchAll(/(?:color|background(?:-color)?)\s*:\s*(#[0-9a-fA-F]{3,8})\b/gi);
    const colors: { type: string; value: string }[] = [];

    for (const match of colorDecls) {
      const prop = match[0].split(':')[0].trim();
      const hex = parseHexColor(match[0]);
      if (hex) {
        colors.push({
          type: prop.startsWith('background') ? 'background' : 'foreground',
          value: hex,
        });
      }
    }

    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const fg = colors[i].type === 'foreground' ? colors[i] : colors[j];
        const bg = colors[i].type === 'background' ? colors[i] : colors[j];
        if (fg && bg && fg.type !== bg.type) {
          const ratio = contrastRatio(fg.value, bg.value);
          pairs.push({
            foreground: fg.value,
            background: bg.value,
            contrastRatio: Math.round(ratio * 100) / 100,
            passesAA: ratio >= 4.5,
            passesAAA: ratio >= 7.0,
          });
        }
      }
    }

    return pairs;
  }

  toJSON(report: ComplianceReport): string {
    return JSON.stringify(report, null, 2);
  }
}
