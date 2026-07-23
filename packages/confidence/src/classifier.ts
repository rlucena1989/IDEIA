import { ClassificationResult } from './types';

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  'web-development': ['react', 'vue', 'angular', 'html', 'css', 'http', 'rest', 'api', 'endpoint'],
  'backend': ['server', 'database', 'sql', 'nosql', 'queue', 'cache', 'middleware', 'service'],
  'devops': ['deploy', 'ci', 'cd', 'pipeline', 'docker', 'kubernetes', 'terraform', 'monitoring'],
  'security': ['auth', 'oauth', 'jwt', 'encryption', 'vulnerability', 'cve', 'owasp', 'xss', 'csrf'],
  'data-science': ['ml', 'ai', 'model', 'training', 'inference', 'dataset', 'feature', 'prediction'],
  'architecture': ['pattern', 'module', 'dependency', 'microservice', 'event', 'cqrs', 'saga'],
};

const COMPLEXITY_KEYWORDS: Record<string, string[]> = {
  simple: ['crud', 'list', 'form', 'basic', 'simple', 'hello'],
  moderate: ['integration', 'auth', 'cache', 'queue', 'async', 'pipeline', 'middleware'],
  complex: ['distributed', 'consensus', 'realtime', 'crdt', 'optimization', 'scalability'],
};

export class SemanticClassifier {
  classify(input: string): ClassificationResult {
    const lower = input.toLowerCase();
    const words = lower.split(/[\s,._-]+/);

    const matchedKeywords: string[] = [];
    const matchedDomains = new Set<string>();

    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      for (const kw of keywords) {
        if (lower.includes(kw) || words.includes(kw)) {
          matchedKeywords.push(kw);
          matchedDomains.add(domain);
        }
      }
    }

    let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
    for (const [level, keywords] of Object.entries(COMPLEXITY_KEYWORDS)) {
      for (const kw of keywords) {
        if (lower.includes(kw) || words.includes(kw)) {
          matchedKeywords.push(kw);
          if (level === 'complex') complexity = 'complex';
          else if (level === 'moderate' && complexity !== 'complex') complexity = 'moderate';
        }
      }
    }

    const confidence = Math.min(1, matchedKeywords.length / 10);
    const uniqueKeywords = [...new Set(matchedKeywords)];

    return {
      domain: [...matchedDomains],
      complexity,
      confidence: Math.round(confidence * 100) / 100,
      keywords: uniqueKeywords.slice(0, 15),
    };
  }
}

export function createClassifier(): SemanticClassifier {
  return new SemanticClassifier();
}
