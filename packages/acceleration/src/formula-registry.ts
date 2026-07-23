export interface Formula {
  name: string;
  category: string;
  params: string[];
  eval: (...args: number[]) => number;
}

const formulas: Map<string, Formula> = new Map();

export function registerFormula(f: Formula): void {
  formulas.set(f.name, f);
}

export function getFormula(name: string): Formula | undefined {
  return formulas.get(name);
}

export function listFormulas(category?: string): Formula[] {
  const all = Array.from(formulas.values());
  return category ? all.filter(f => f.category === category) : all;
}

export function evaluateFormula(name: string, ...args: number[]): number | null {
  const f = formulas.get(name);
  if (!f) return null;
  return f.eval(...args);
}

registerFormula({ name: 'bmi', category: 'health', params: ['weight', 'height'], eval: (w, h) => w / (h * h) });
registerFormula({ name: 'discount', category: 'finance', params: ['price', 'percent'], eval: (p, d) => p * (1 - d / 100) });
registerFormula({ name: 'circle_area', category: 'geometry', params: ['radius'], eval: (r) => Math.PI * r * r });
registerFormula({ name: 'pythagorean', category: 'geometry', params: ['a', 'b'], eval: (a, b) => Math.sqrt(a * a + b * b) });
registerFormula({ name: 'simple_interest', category: 'finance', params: ['principal', 'rate', 'time'], eval: (p, r, t) => p * (1 + r / 100 * t) });
registerFormula({ name: 'celsius_to_fahrenheit', category: 'conversion', params: ['c'], eval: (c) => c * 9 / 5 + 32 });
