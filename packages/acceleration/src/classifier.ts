import { ComplexityLevel } from './types';

interface ClassificationHint {
  keywords: string[];
  domain: string[];
  weight: number;
}

const HINTS: ClassificationHint[] = [
  { keywords: ['add', 'sum', 'total', 'count'], domain: ['arithmetic'], weight: 0.3 },
  { keywords: ['mean', 'average', 'median', 'stddev', 'variance', 'correlation'], domain: ['statistics'], weight: 1.0 },
  { keywords: ['derivative', 'integral', 'limit', 'function', 'equation'], domain: ['calculus'], weight: 2.0 },
  { keywords: ['velocity', 'kinetic', 'gravity', 'newton', 'friction', 'momentum', 'torque', 'force', 'mass', 'acceleration', 'physics'], domain: ['physics'], weight: 1.5 },
  { keywords: ['matrix', 'vector', 'linear', 'algebra'], domain: ['linear-algebra'], weight: 2.0 },
  { keywords: ['compile', 'build', 'deploy', 'pipeline', 'ci'], domain: ['devops'], weight: 0.8 },
  { keywords: ['vulnerability', 'cve', 'exploit', 'injection', 'xss', 'csrf', 'owasp'], domain: ['security'], weight: 1.2 },
  { keywords: ['refactor', 'architecture', 'module', 'dependency', 'pattern', 'encapsulation', 'abstraction'], domain: ['software-engineering'], weight: 1.2 },
  { keywords: ['typescript', 'interface', 'namespace', 'generic', 'decorator', 'async', 'await'], domain: ['typescript'], weight: 1.0 },
  { keywords: ['refactor', 'optimize', 'performance'], domain: ['engineering'], weight: 1.5 },
];

export function classifyComplexity(input: string): { complexity: ComplexityLevel; domain: string[]; confidence: number } {
  const lower = input.toLowerCase();
  const matched = new Set<string>();
  let totalWeight = 0;

  for (const hint of HINTS) {
    if (hint.keywords.some(k => lower.includes(k))) {
      hint.domain.forEach(d => matched.add(d));
      totalWeight += hint.weight;
    }
  }

  const length = input.length;
  const hasCode = /[{}()[\];]/.test(input);
  const hasNumbers = /\d+/.test(input);

  let complexity: ComplexityLevel;
  let confidence: number;

  if (length < 20 && !hasCode) {
    complexity = 'trivial';
    confidence = 0.95;
  } else if (length < 100 && !hasCode && totalWeight < 1) {
    complexity = 'simple';
    confidence = 0.9;
  } else if (length < 500 && totalWeight < 2) {
    complexity = 'moderate';
    confidence = 0.8;
  } else if (length < 2000 || totalWeight < 4) {
    complexity = 'hard';
    confidence = 0.7;
  } else {
    complexity = 'extreme';
    confidence = 0.6;
  }

  if (hasCode && complexity === 'trivial') { complexity = 'simple'; confidence = 0.85; }
  if (hasNumbers && totalWeight > 2) confidence = Math.min(confidence + 0.1, 0.95);

  return {
    complexity,
    domain: Array.from(matched),
    confidence: Math.round(confidence * 100) / 100
  };
}

export function complexityToDepth(c: ComplexityLevel): number {
  const map: Record<ComplexityLevel, number> = {
    trivial: 1, simple: 2, moderate: 3, hard: 5, extreme: 8
  };
  return map[c];
}
