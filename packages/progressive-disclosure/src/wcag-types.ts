export interface WCAGViolation {
  ruleId: string;
  level: 'A' | 'AA' | 'AAA';
  element: string;
  description: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  recommendation: string;
}

export interface A11yCheckResult {
  violations: WCAGViolation[];
  score: number;
  passed: boolean;
  timestamp: string;
}

export interface FocusTrapConfig {
  container: string;
  initialFocus?: string;
  returnFocus?: string;
  allowOutsideClick?: boolean;
}

export interface ScreenReaderAnnouncement {
  message: string;
  priority: 'polite' | 'assertive';
  id?: string;
}

export interface SkipNavLink {
  id: string;
  targetId: string;
  label: string;
}

export interface Rule {
  id: string;
  level: 'A' | 'AA' | 'AAA';
  check: (content: string) => WCAGViolation[];
}

function contrastRatio(c1: [number, number, number], c2: [number, number, number]): number {
  const l1 = relativeLuminance(c1);
  const l2 = relativeLuminance(c2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map(c => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

function findElements(content: string, tag: string, attr?: string): string[] {
  const elements: string[] = [];
  const regex = attr ? new RegExp(`<${tag}[^>]*${attr}=["']([^"']*)["'][^>]*>`, 'gi') : new RegExp(`<${tag}[^>]*>`, 'gi');
  let match;
  while ((match = regex.exec(content)) !== null) elements.push(match[1] || match[0]);
  return elements;
}

function findAttrValues(content: string, attr: string): string[] {
  const values: string[] = [];
  const regex = new RegExp(`${attr}=["']([^"']*)["']`, 'gi');
  let match;
  while ((match = regex.exec(content)) !== null) values.push(match[1]);
  return values;
}

export const RULES: Rule[] = [
  {
    id: 'color-contrast', level: 'AA',
    check: (content: string) => {
      const violations: WCAGViolation[] = [];
      const colorRegex = /color:\s*([#\w]+)/gi;
      const bgRegex = /background(?:-color)?:\s*([#\w]+)/gi;
      const colors = [...content.matchAll(colorRegex)].map(m => m[1]).filter((c): c is string => !!c && /^#[0-9a-f]{6}$/i.test(c));
      const backgrounds = [...content.matchAll(bgRegex)].map(m => m[1]).filter((c): c is string => !!c && /^#[0-9a-f]{6}$/i.test(c));
      for (let i = 0; i < Math.min(colors.length, backgrounds.length, 10); i++) {
        const fg = hexToRgb(colors[i] || '#000000');
        const bg = hexToRgb(backgrounds[i] || '#FFFFFF');
        const ratio = contrastRatio(fg, bg);
        if (ratio < 4.5) violations.push({ ruleId: 'color-contrast', level: 'AA', element: colors[i] || '', description: `Contrast ratio ${ratio.toFixed(2)}:1 is below AA minimum (4.5:1)`, impact: 'serious', recommendation: 'Increase contrast between text and background colors' });
      }
      return violations;
    },
  },
  {
    id: 'image-alt', level: 'A',
    check: (content: string) => {
      const violations: WCAGViolation[] = [];
      const imgs = findElements(content, 'img');
      const alts = findAttrValues(content, 'alt');
      for (let i = 0; i < imgs.length; i++) {
        if (!alts[i] && alts[i] !== '') violations.push({ ruleId: 'image-alt', level: 'A', element: imgs[i] || '', description: 'Image missing alt text', impact: 'critical', recommendation: 'Add alt attribute to describe the image' });
      }
      return violations;
    },
  },
  {
    id: 'heading-order', level: 'A',
    check: (content: string) => {
      const violations: WCAGViolation[] = [];
      const headings = content.match(/<h[1-6][^>]*>/gi) || [];
      let lastLevel = 0;
      for (const h of headings) {
        const level = parseInt(h[2]);
        if (level - lastLevel > 1) violations.push({ ruleId: 'heading-order', level: 'A', element: h, description: `Heading jumps from h${lastLevel} to h${level}`, impact: 'moderate', recommendation: `Use h${lastLevel + 1} instead of h${level}` });
        lastLevel = level;
      }
      return violations;
    },
  },
  {
    id: 'label-input', level: 'A',
    check: (content: string) => {
      const violations: WCAGViolation[] = [];
      const inputs = content.match(/<input[^>]*>/gi) || [];
      const labels = content.match(/<label[^>]*>/gi) || [];
      const ariaLabels = findAttrValues(content, 'aria-label');
      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i] || '';
        if (input.includes('type="hidden"') || input.includes("type='hidden'")) continue;
        const hasId = /id=["']([^"']*)["']/.exec(input);
        const hasLabel = hasId ? labels.some(l => l.includes(hasId[1])) : false;
        if (!hasLabel && ariaLabels.length <= i) violations.push({ ruleId: 'label-input', level: 'A', element: input.substring(0, 60), description: 'Input field missing associated label', impact: 'serious', recommendation: 'Add a label element or aria-label attribute' });
      }
      return violations;
    },
  },
  {
    id: 'lang-attr', level: 'A',
    check: (content: string) => {
      if (!/lang=["']\w{2}(-?\w{2})?["']/i.test(content)) return [{ ruleId: 'lang-attr', level: 'A', element: '<html>', description: 'HTML tag missing lang attribute', impact: 'serious', recommendation: 'Add lang attribute to <html> tag' }];
      return [];
    },
  },
  {
    id: 'tabindex-values', level: 'A',
    check: (content: string) => {
      const violations: WCAGViolation[] = [];
      const tabindices = [...content.matchAll(/tabindex=["'](\d+)["']/g)];
      for (const match of tabindices) {
        const val = parseInt(match[1]);
        if (val > 0) violations.push({ ruleId: 'tabindex-values', level: 'A', element: match[0], description: `Positive tabindex value (${val}) disrupts natural tab order`, impact: 'moderate', recommendation: 'Use tabindex="0" or rely on DOM order' });
      }
      return violations;
    },
  },
  {
    id: 'link-text', level: 'A',
    check: (content: string) => {
      const violations: WCAGViolation[] = [];
      const links = [...content.matchAll(/<a[^>]*>([^<]*)<\/a>/gi)];
      for (const match of links) {
        const text = (match[1] || '').trim();
        if (text.toLowerCase() === 'click here' || text.toLowerCase() === 'read more' || text.toLowerCase() === 'more') violations.push({ ruleId: 'link-text', level: 'A', element: match[0].substring(0, 60), description: `Non-descriptive link text: "${text}"`, impact: 'moderate', recommendation: 'Use descriptive link text that indicates the link destination' });
      }
      return violations;
    },
  },
  {
    id: 'focus-visible', level: 'AA',
    check: (content: string) => {
      if (!content.includes(':focus') && !content.includes('outline')) return [{ ruleId: 'focus-visible', level: 'AA', element: 'CSS', description: 'No visible focus indicators found in styles', impact: 'serious', recommendation: 'Add :focus styles with visible outline for keyboard navigation' }];
      return [];
    },
  },
];
