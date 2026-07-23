/**
 * intent-classifier.ts — Classificador de Intenção via LLM (Item 4)
 *
 * Substitui o switch-case de 6 palavras-chave por classificação semântica
 * real usando LLM local (Ollama). Fallback para keyword matching se LLM
 * indisponível. Suporte a multi-intent.
 *
 * Uso:
 *   const classifier = new IntentClassifier();
 *   const result = await classifier.classify("Create unit tests for the auth module");
 *   // { primary: 'tests', confidence: 0.94, alternatives: [...], entities: [...] }
 */

import type { PlannerTaskType } from './types';

export interface IntentResult {
  primary: PlannerTaskType;
  confidence: number;
  alternatives: Array<{ type: PlannerTaskType; score: number }>;
  entities: Array<{ type: string; value: string }>;
  method: 'llm' | 'keyword';
}

const KEYWORD_MAP: Array<{ patterns: RegExp[]; type: PlannerTaskType }> = [
  { patterns: [/test/i, /coverage/i, /spec/i, /assert/i, /jest/i, /vitest/i, /mocha/i], type: 'tests' },
  { patterns: [/refactor/i, /refator/i, /clean/i, /extract/i, /simplif/i, /reestrutur/i], type: 'refactor' },
  { patterns: [/audit/i, /auditoria/i, /review/i, /inspec/i, /check/i, /verify/i], type: 'audit' },
  { patterns: [/doc/i, /document/i, /readme/i, /manual/i, /guide/i, /tutorial/i, /comment/i], type: 'documentation' },
  { patterns: [/strategy/i, /roadmap/i, /planejamento/i, /plan/i, /objetivo/i, /goal/i, /milestone/i], type: 'strategy' },
  { patterns: [/maint/i, /manuten/i, /fix/i, /bug/i, /corrig/i, /upgrade/i, /update/i, /patch/i, /security/i], type: 'maintenance' },
  { patterns: [/implement/i, /criar/i, /create/i, /add/i, /feature/i, /funcionalidade/i, /build/i, /develop/i], type: 'execution' },
  { patterns: [/deploy/i, /release/i, /publicar/i, /publish/i, /ship/i, /rollback/i, /CI|CD/i], type: 'deploy' },
  { patterns: [/design/i, /arquitet/i, /arch/i, /estrutur/i, /component/i, /modul/i, /schema/i, /database/i], type: 'design' },
  { patterns: [/perform/i, /otimiz/i, /optimiz/i, /benchmark/i, /profiling/i, /latenc/i, /throughput/i], type: 'performance' },
  { patterns: [/config/i, /setup/i, /bootstrap/i, /init/i, /instal/i, /environment/i, /env/i], type: 'configuration' },
  { patterns: [/migrat/i, /migrac/i, /convert/i, /transform/i, /transpil/i, /port/i, /version/i], type: 'migration' },
];

const ENTITY_PATTERNS: Array<{ regex: RegExp; type: string }> = [
  { regex: /(?:path|file|arquivo|diretorio|dir|folder)\s+["']?([^\s,"']+\.\w+)["']?/i, type: 'file' },
  { regex: /(?:module|modulo|package|pacote|componente|component)\s+["']?([^\s,"']+)["']?/i, type: 'module' },
  { regex: /(?:language|linguagem|framework)\s+["']?([^\s,"']+)["']?/i, type: 'technology' },
  { regex: /(?:endpoint|api|route|rota)\s+["']?([^\s,"']+)["']?/i, type: 'api' },
  { regex: /(?:user|usuario|usuário|role|papel|permissão|permission)\s+["']?([^\s,"']+)["']?/i, type: 'entity' },
];

const LLM_SYSTEM_PROMPT = `Classify the user's development request into a task type and extract key entities.
Respond with JSON only:
{
  "primary": "one of: tests, refactor, audit, documentation, strategy, maintenance, execution, deploy, design, performance, configuration, migration",
  "confidence": 0.0-1.0,
  "alternatives": [{"type": "...", "score": 0.0}],
  "entities": [{"type": "file|module|technology|api|entity", "value": "..."}]
}`;

export class IntentClassifier {
  private llmAvailable: boolean | null = null;

  async classify(input: string): Promise<IntentResult> {
    try {
      return await this.classifyWithLLM(input);
    } catch {
      return this.classifyWithKeywords(input);
    }
  }

  private async classifyWithLLM(input: string): Promise<IntentResult> {
    const response = await fetch('http://127.0.0.1:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'phi-4-mini',
        messages: [
          { role: 'system', content: LLM_SYSTEM_PROMPT },
          { role: 'user', content: input.slice(0, 1000) },
        ],
        stream: false,
        options: { temperature: 0.1, num_predict: 256 },
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) throw new Error('LLM unavailable');

    const data = await response.json() as { message?: { content?: string } };
    const content = data?.message?.content || '';

    try {
      const parsed = JSON.parse(content);
      return {
        primary: this.validateType(parsed.primary),
        confidence: parsed.confidence ?? 0.5,
        alternatives: (parsed.alternatives || []).map((a: { type: string; score: number }) => ({
          type: this.validateType(a.type), score: a.score,
        })),
        entities: (parsed.entities || []).filter((e: { type: string }) => ['file', 'module', 'technology', 'api', 'entity'].includes(e.type)),
        method: 'llm',
      };
    } catch {
      return this.classifyWithKeywords(input);
    }
  }

  private classifyWithKeywords(input: string): IntentResult {
    const scores = new Map<PlannerTaskType, number>();

    for (const entry of KEYWORD_MAP) {
      let score = 0;
      for (const pattern of entry.patterns) {
        const matches = input.match(pattern);
        if (matches) score += matches.length;
      }
      if (score > 0) {
        scores.set(entry.type, score);
      }
    }

    const sorted = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
    const alternatives = sorted.map(([type, score]) => ({ type, score }));
    const total = sorted.reduce((sum, [, s]) => sum + s, 0) || 1;
    const primaryType = sorted[0]?.[0] || 'execution';

    const entities: Array<{ type: string; value: string }> = [];
    for (const pattern of ENTITY_PATTERNS) {
      const match = input.match(pattern.regex);
      if (match && match[1]) {
        entities.push({ type: pattern.type, value: match[1] });
      }
    }

    return {
      primary: primaryType as PlannerTaskType,
      confidence: sorted[0] ? sorted[0]![1] / total : 0.3,
      alternatives,
      entities,
      method: 'keyword',
    };
  }

  private validateType(type: string): PlannerTaskType {
    const valid: PlannerTaskType[] = ['tests', 'refactor', 'audit', 'documentation', 'strategy', 'maintenance', 'execution', 'deploy', 'design', 'performance', 'configuration', 'migration'];
    if (valid.includes(type as PlannerTaskType)) return type as PlannerTaskType;
    return 'execution';
  }
}
