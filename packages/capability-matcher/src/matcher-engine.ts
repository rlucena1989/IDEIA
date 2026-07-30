import { ProjectNeed, MatchScore, MatchResult, MatchingProfile, MatchingReport, Suggestion } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('matcher-engine');

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'it', 'to', 'and', 'or', 'of', 'in', 'for', 'on',
  'with', 'as', 'by', 'at', 'this', 'that', 'from', 'be', 'we', 'our', 'us',
  'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
  'did', 'will', 'would', 'can', 'could', 'should', 'may', 'might', 'shall',
  'not', 'no', 'nor', 'but', 'if', 'so', 'up', 'out', 'about', 'into',
  'over', 'after', 'before', 'between', 'under', 'above', 'each', 'which',
  'who', 'whom', 'what', 'when', 'where', 'why', 'how', 'all', 'any',
  'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'only',
  'own', 'same', 'too', 'very', 'just', 'also', 'now', 'here', 'there',
  'need', 'want', 'like', 'make', 'use', 'using', 'used', 'based', 'create',
  'project', 'system', 'application', 'feature', 'function', 'ability'
]);

const BUILTIN_CAPABILITIES: Array<{
  name: string;
  keywords: string[];
  category: string;
  description: string;
  provider: string;
}> = [
  {
    name: 'agent-orchestration',
    keywords: ['orchestration', 'agent', 'multiagent', 'workflow', 'coordination', 'orchestrate', 'multi-agent'],
    category: 'agent',
    description: 'Orquestração de múltiplos agentes para execução de tarefas complexas',
    provider: 'langgraph'
  },
  {
    name: 'pub-sub',
    keywords: ['pub', 'sub', 'messaging', 'event', 'broker', 'publish', 'subscribe', 'nats'],
    category: 'messaging',
    description: 'Comunicação publish-subscribe entre componentes',
    provider: 'nats'
  },
  {
    name: 'policy-evaluation',
    keywords: ['policy', 'rule', 'evaluation', 'guard', 'permission', 'authorization', 'access-control'],
    category: 'security',
    description: 'Avaliação de políticas e regras de autorização',
    provider: 'cedar'
  },
  {
    name: 'llm-completion',
    keywords: ['llm', 'completion', 'text', 'generation', 'prompt', 'language-model', 'inference'],
    category: 'ai',
    description: 'Geração de texto e completude via modelos de linguagem',
    provider: 'ollama'
  },
  {
    name: 'code-generation',
    keywords: ['code', 'generation', 'scaffold', 'blueprint', 'boilerplate', 'generate', 'template'],
    category: 'development',
    description: 'Geração automática de código a partir de descrições',
    provider: 'cli'
  },
  {
    name: 'memory-storage',
    keywords: ['memory', 'storage', 'vector', 'embedding', 'context', 'store', 'retrieval', 'semantic'],
    category: 'data',
    description: 'Armazenamento e recuperação de memórias e contexto',
    provider: 'mem0'
  },
  {
    name: 'workflow-engine',
    keywords: ['workflow', 'pipeline', 'step', 'sequence', 'chaining', 'automation'],
    category: 'execution',
    description: 'Motor de execução de workflows e pipelines automatizados',
    provider: 'langgraph'
  },
  {
    name: 'audit-trail',
    keywords: ['audit', 'trail', 'log', 'chain', 'traceability', 'logging', 'accountability'],
    category: 'security',
    description: 'Registro imutável de auditoria com encadeamento criptográfico',
    provider: 'core'
  },
  {
    name: 'event-bus',
    keywords: ['event', 'bus', 'streaming', 'messaging', 'stream', 'kafka', 'jetstream'],
    category: 'messaging',
    description: 'Barramento de eventos distribuído com suporte a streaming',
    provider: 'nats'
  },
  {
    name: 'security-scan',
    keywords: ['security', 'scan', 'vulnerability', 'secret', 'injection', 'owasp', 'pentest'],
    category: 'security',
    description: 'Escaneamento de vulnerabilidades de segurança e segredos',
    provider: 'core'
  },
  {
    name: 'output-validation',
    keywords: ['output', 'validation', 'guardrail', 'pii', 'sanitization', 'filter', 'validate'],
    category: 'security',
    description: 'Validação e sanitização de saídas para prevenir vazamento de dados',
    provider: 'core'
  },
  {
    name: 'project-scaffold',
    keywords: ['scaffold', 'project', 'init', 'template', 'boilerplate', 'start', 'setup'],
    category: 'development',
    description: 'Geração de estrutura inicial de projetos a partir de blueprints',
    provider: 'cli'
  },
  {
    name: 'dependency-injection',
    keywords: ['di', 'injection', 'container', 'inversify', 'ioc', 'dependency', 'inversifyjs'],
    category: 'architecture',
    description: 'Injeção de dependência e container IoC',
    provider: 'inversify'
  },
  {
    name: 'cli-command',
    keywords: ['cli', 'command', 'terminal', 'interactive', 'shell', 'console', 'command-line'],
    category: 'interface',
    description: 'Interface de linha de comando com comandos registrados e output estruturado',
    provider: 'core'
  },
  {
    name: 'test-orchestration',
    keywords: ['test', 'orchestration', 'suite', 'coverage', 'mutation', 'testing', 'runner'],
    category: 'quality',
    description: 'Orquestração de execução de testes unitários, integração e mutação',
    provider: 'jest'
  },
  {
    name: 'observability',
    keywords: ['observability', 'monitor', 'metric', 'trace', 'telemetry', 'monitoring', 'opentelemetry'],
    category: 'infrastructure',
    description: 'Observabilidade com métricas, tracing distribuído e telemetria',
    provider: 'opentelemetry'
  },
  {
    name: 'terminal-sandbox',
    keywords: ['sandbox', 'terminal', 'isolation', 'vm', 'exec', 'container', 'safe-execution'],
    category: 'security',
    description: 'Execução segura de comandos em ambiente isolado',
    provider: 'core'
  },
  {
    name: 'schema-registry',
    keywords: ['schema', 'registry', 'validation', 'contract', 'avro', 'protobuf', 'json-schema'],
    category: 'data',
    description: 'Registro e validação de schemas com suporte a múltiplos formatos',
    provider: 'core'
  },
  {
    name: 'prompt-security',
    keywords: ['prompt', 'security', 'injection', 'jailbreak', 'guard', 'llm-guard', 'alignment'],
    category: 'security',
    description: 'Proteção contra injeção de prompt e jailbreak em LLMs',
    provider: 'core'
  },
  {
    name: 'delivery-pipeline',
    keywords: ['delivery', 'deploy', 'pipeline', 'gitops', 'canary', 'rollback', 'continuous-delivery'],
    category: 'devops',
    description: 'Pipeline de entrega contínua com deploy canário e rollback automático',
    provider: 'argo'
  }
];

const SUGGESTION_TEMPLATES: Array<{
  matchPrefixes: string[];
  type: Suggestion['type'];
  name: string;
  description: string;
}> = [
  {
    matchPrefixes: ['agent', 'orchestrat', 'multiagent', 'workflow', 'coordination'],
    type: 'agent',
    name: 'Agent Workflow',
    description: 'Configure agentes autônomos para executar tarefas complexas'
  },
  {
    matchPrefixes: ['test', 'quality', 'coverage', 'mutation'],
    type: 'workflow',
    name: 'Quality Pipeline',
    description: 'Pipeline de qualidade com testes unitários, integração e mutação'
  },
  {
    matchPrefixes: ['memory', 'context', 'embedding', 'vector'],
    type: 'context-pack',
    name: 'Memory Context Pack',
    description: 'Contexto de memória para armazenamento e recuperação semântica'
  },
  {
    matchPrefixes: ['scaffold', 'blueprint', 'project', 'template'],
    type: 'blueprint',
    name: 'Project Scaffold Blueprint',
    description: 'Blueprint para scaffolding de novos projetos'
  },
  {
    matchPrefixes: ['cli', 'command', 'terminal'],
    type: 'tutorial',
    name: 'CLI Command Tutorial',
    description: 'Tutorial interativo de comandos CLI da IDEIA'
  },
  {
    matchPrefixes: ['deploy', 'delivery', 'pipeline', 'gitops'],
    type: 'workflow',
    name: 'Delivery Pipeline',
    description: 'Pipeline de entrega contínua com deploy canário e rollback'
  },
  {
    matchPrefixes: ['policy', 'security', 'permission'],
    type: 'context-pack',
    name: 'Security Policy Pack',
    description: 'Contexto de segurança com políticas de avaliação e controle de acesso'
  },
  {
    matchPrefixes: ['event', 'messaging', 'stream', 'pub'],
    type: 'context-pack',
    name: 'Event Bus Context Pack',
    description: 'Contexto de barramento de eventos e mensageria distribuída'
  }
];

export class CapabilityMatcher {
  private knownCapabilities: Map<string, { name: string; keywords: string[]; category: string; description: string; provider: string }>;

  constructor() {
    this.knownCapabilities = new Map();
    for (const cap of BUILTIN_CAPABILITIES) {
      this.knownCapabilities.set(cap.name, cap);
    }
  }

  registerCapability(name: string, keywords: string[], category: string, description: string, provider: string): void {
    this.knownCapabilities.set(name, { name, keywords: keywords.map(k => k.toLowerCase()), category, description, provider });
  }

  analyzeKeywords(text: string): string[] {
    const tokens = text
      .toLowerCase()
      .split(/[^a-zA-ZÀ-ÿ0-9_-]+/)
      .map(t => t.trim())
      .filter(t => t.length > 1 && !STOP_WORDS.has(t));
    return [...new Set(tokens)];
  }

  computeMatch(need: ProjectNeed): MatchResult {
    const needKeywords = new Set<string>();
    for (const kw of need.keywords) {
      needKeywords.add(kw.toLowerCase());
    }
    for (const kw of this.analyzeKeywords(need.description)) {
      needKeywords.add(kw);
    }

    const scores: MatchScore[] = [];

    for (const [capName, capability] of this.knownCapabilities) {
      const capKeywords = new Set(capability.keywords);
      let overlap = 0;
      const matchedTerms: string[] = [];

      for (const nkw of needKeywords) {
        if (capKeywords.has(nkw)) {
          overlap++;
          matchedTerms.push(nkw);
          continue;
        }
        for (const ckw of capKeywords) {
          if (ckw.length >= 5 && nkw.length >= 5 && (nkw.includes(ckw) || ckw.includes(nkw))) {
            overlap += 0.5;
            matchedTerms.push(`${nkw}~${ckw}`);
            break;
          }
        }
      }

      if (overlap === 0) continue;

      const _totalUnique = new Set([...needKeywords, ...capKeywords]).size;
      const score = Math.min(1, overlap / needKeywords.size);
      const confidence = Math.min(1, overlap / Math.min(needKeywords.size, capKeywords.size));
      const reasoning = `matched ${matchedTerms.length} term(s): ${matchedTerms.join(', ')}`;

      scores.push({
        capabilityName: capName,
        provider: capability.provider,
        score: Math.round(score * 100) / 100,
        confidence: Math.round(confidence * 100) / 100,
        reasoning
      });
    }

    scores.sort((a, b) => b.score - a.score || b.confidence - a.confidence);

    const topMatch = scores.length > 0 ? scores[0] : null;
    const coverage = scores.length > 0 ? scores[0].score : 0;
    const gaps = topMatch && topMatch.score > 0.3 ? [] : [need.id];

    return { need, matches: scores, topMatch, coverage, gaps };
  }

  matchProfile(profile: MatchingProfile): MatchingReport {
    const results = profile.needs.map(need => this.computeMatch(need));
    const overallCoverage = results.length > 0
      ? Math.round((results.filter(r => r.coverage > 0.3).length / results.length) * 100) / 100
      : 0;

    const matchedCapabilities = [...new Set(results.flatMap(r => r.matches.map(m => m.capabilityName)))];
    const unmatchedNeeds = results.filter(r => r.gaps.length > 0).map(r => r.need.id);
    const suggestions = this.generateSuggestions(profile.needs);

    return {
      profile,
      results,
      overallCoverage,
      suggestions,
      matchedCapabilities,
      unmatchedNeeds,
      timestamp: new Date().toISOString()
    };
  }

  generateSuggestions(needs: ProjectNeed[]): Suggestion[] {
    const allKeywords = new Set<string>();
    for (const need of needs) {
      for (const kw of need.keywords) {
        allKeywords.add(kw.toLowerCase());
      }
      for (const kw of this.analyzeKeywords(need.description)) {
        allKeywords.add(kw);
      }
    }

    const suggestions: Suggestion[] = [];
    const seen = new Set<string>();

    for (const template of SUGGESTION_TEMPLATES) {
      let relevance = 0;
      for (const prefix of template.matchPrefixes) {
        for (const kw of allKeywords) {
          if (kw.includes(prefix) || prefix.includes(kw)) {
            relevance += 0.25;
          }
        }
      }
      if (relevance > 0 && !seen.has(template.name)) {
        seen.add(template.name);
        suggestions.push({
          type: template.type,
          name: template.name,
          description: template.description,
          relevance: Math.min(1, Math.round(relevance * 100) / 100)
        });
      }
    }

    suggestions.sort((a, b) => b.relevance - a.relevance);
    return suggestions;
  }

  findGaps(profile: MatchingProfile): string[] {
    return profile.needs
      .filter(need => {
        const result = this.computeMatch(need);
        return !result.topMatch || result.topMatch.score <= 0.3;
      })
      .map(need => need.id);
  }

  getCoverage(profile: MatchingProfile): number {
    if (profile.needs.length === 0) return 1;
    const covered = profile.needs.filter(need => {
      const result = this.computeMatch(need);
      return result.topMatch !== null && result.topMatch.score > 0.3;
    });
    return Math.round((covered.length / profile.needs.length) * 100) / 100;
  }

  findAlternativeCapabilities(need: ProjectNeed, threshold: number = 0.3): MatchScore[] {
    const result = this.computeMatch(need);
    return result.matches.filter(m => m.score >= threshold);
  }
}
