export interface EquivalenceResult {
  sourceA: string;
  sourceB: string;
  structuralSimilarity: number;
  semanticSimilarity: number;
  overallSimilarity: number;
  equivalent: boolean;
  differences: string[];
  confidence: number;
}

export interface EquivalenceConfig {
  structuralThreshold: number;
  semanticThreshold: number;
  overallThreshold: number;
}

export const DEFAULT_EQUIVALENCE_CONFIG: EquivalenceConfig = {
  structuralThreshold: 0.7,
  semanticThreshold: 0.5,
  overallThreshold: 0.65,
};

const IGNORED_TOKENS = new Set([' ', '\n', '\t', '\r', ';', ',', '(', ')', '{', '}', '[', ']', ':', '.']);

const KEYWORDS = new Set([
  'if', 'else', 'for', 'while', 'return', 'class', 'function',
  'async', 'await', 'try', 'catch', 'import', 'export',
  'const', 'let', 'var', 'new', 'type', 'interface', 'enum',
  'extends', 'implements', 'throw',
]);

function tokenize(code: string): string[] {
  return code
    .split(/(\s+|(?=[{}()[\];,:.])(?<! )|(?<=[{}()[\];,:.])(?! ))/)
    .filter(t => t.trim().length > 0 && !IGNORED_TOKENS.has(t));
}

function normalizeIdentifiers(tokens: string[]): string[] {
  let counter = 0;
  const map = new Map<string, string>();
  return tokens.map(t => {
    if (/^[a-z_]\w*$/i.test(t) && !KEYWORDS.has(t)) {
      if (!map.has(t)) map.set(t, `ID${counter++}`);
      return map.get(t)!;
    }
    return t;
  });
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  const intersection = new Set([...a].filter(x => b.has(x)));
  const union = new Set([...a, ...b]);
  return union.size === 0 ? 1 : intersection.size / union.size;
}

function ngramSimilarity(tokensA: string[], tokensB: string[], n: number = 3): number {
  const ngramsA = new Set<string>();
  const ngramsB = new Set<string>();
  for (let i = 0; i <= tokensA.length - n; i++) ngramsA.add(tokensA.slice(i, i + n).join('|'));
  for (let i = 0; i <= tokensB.length - n; i++) ngramsB.add(tokensB.slice(i, i + n).join('|'));
  return jaccardSimilarity(ngramsA, ngramsB);
}

function keywordSet(tokens: string[]): Set<string> {
  return new Set(tokens.filter(t => KEYWORDS.has(t)));
}

export function detectEquivalence(
  sourceA: string,
  sourceB: string,
  config?: Partial<EquivalenceConfig>
): EquivalenceResult {
  const cfg = { ...DEFAULT_EQUIVALENCE_CONFIG, ...config };
  const tokensA = tokenize(sourceA);
  const tokensB = tokenize(sourceB);

  const normA = normalizeIdentifiers(tokensA);
  const normB = normalizeIdentifiers(tokensB);

  const structuralSimilarity = ngramSimilarity(normA, normB, 3) * 0.6 + ngramSimilarity(normA, normB, 2) * 0.4;

  const kwA = keywordSet(tokensA);
  const kwB = keywordSet(tokensB);
  const semanticSimilarity = jaccardSimilarity(kwA, kwB);

  const overallSimilarity = structuralSimilarity * 0.7 + semanticSimilarity * 0.3;
  const equivalent = overallSimilarity >= cfg.overallThreshold;

  const differences: string[] = [];
  if (!equivalent) {
    if (structuralSimilarity < cfg.structuralThreshold) {
      differences.push(`Similaridade estrutural (${(structuralSimilarity * 100).toFixed(0)}%) abaixo do threshold ${(cfg.structuralThreshold * 100).toFixed(0)}%`);
    }
    if (semanticSimilarity < cfg.semanticThreshold) {
      differences.push(`Similaridade semantica (${(semanticSimilarity * 100).toFixed(0)}%) abaixo do threshold ${(cfg.semanticThreshold * 100).toFixed(0)}%`);
    }
  }

  const confidence = equivalent ? Math.min(1, overallSimilarity * 1.1) : overallSimilarity;

  return {
    sourceA: sourceA.substring(0, 50),
    sourceB: sourceB.substring(0, 50),
    structuralSimilarity: Math.round(structuralSimilarity * 1000) / 1000,
    semanticSimilarity: Math.round(semanticSimilarity * 1000) / 1000,
    overallSimilarity: Math.round(overallSimilarity * 1000) / 1000,
    equivalent,
    differences,
    confidence: Math.round(confidence * 1000) / 1000,
  };
}
