export type SelectorType = 'css' | 'xpath' | 'text' | 'aria' | 'coordinate';

export interface SelectorStrategy {
  type: SelectorType;
  build(original: string): string;
}

export const selectorFallbackChain: SelectorStrategy[] = [
  {
    type: 'css',
    build: (s: string) => s,
  },
  {
    type: 'xpath',
    build: (s: string) => {
      if (s.startsWith('//') || s.startsWith('(')) return s;
      if (s.startsWith('#')) return `//*[@id='${s.slice(1)}']`;
      if (s.startsWith('.')) return `//*[contains(@class, '${s.slice(1)}')]`;
      if (s.startsWith('[')) return `//*[${s.slice(1, -1)}]`;
      return `//${s}`;
    },
  },
  {
    type: 'text',
    build: (s: string) => `text=${s.replace(/^[#.]/, '')}`,
  },
  {
    type: 'aria',
    build: (s: string) => `aria-label=${s.replace(/^[#.]/, '')}`,
  },
  {
    type: 'coordinate',
    build: (s: string) => s,
  },
];

export interface ElementWaitOptions {
  state: 'visible' | 'attached' | 'stable';
  timeout: number;
}

export const defaultWaitOptions: ElementWaitOptions = {
  state: 'visible',
  timeout: 5000,
};

export function buildAlternativeSelectors(selector: string): string[] {
  return selectorFallbackChain.map((s) => s.build(selector));
}
