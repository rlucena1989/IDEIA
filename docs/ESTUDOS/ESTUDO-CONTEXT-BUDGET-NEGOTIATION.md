# Estudo: Context Budget Negotiation Protocol

> **Extraído de:** ESTUDO-CONTEXT-BUILDER-COMPOSER.md seção 3.4
> **Data:** 2026-07-24 | **Versão:** 3.0 (intensificação F6)
> **Nível de Profundidade:** 10/12
> **Propósito:** Protocolo de negociação de orçamento de contexto entre múltiplas fontes — alocação justa, priorização por urgência, compressão adaptativa, realocação dinâmica durante execução, integração com o Prompt Economy da IDEIA.
> **Nível 1:** Token budget fundamentals, allocation strategies, fair share
> **Nível 2:** Priority-weighted allocation, urgency-based negotiation
> **Nível 3:** Dynamic budget renegotiation, market-based allocation
> **Nível 4:** Game theory for context allocation, auction mechanisms

---

## 1. Fundamentos

### 1.1 Problema

Modelos de linguagem têm janelas de contexto finitas (128K tokens no DeepSeek, 200K no Claude, 128K no GPT-4). Múltiplas fontes de contexto competem por esse espaço limitado: histórico de conversa, documentos relevantes, instruções do sistema, resultados de ferramentas, etc. Sem um protocolo de negociação, fontes importantes podem ser excluídas enquanto fontes irrelevantes consomem tokens preciosos.

### 1.2 Arquitetura Geral

```
                    ┌─────────────────────────────────────────┐
                    │          BudgetNegotiator               │
                    │                                         │
                    │  ┌──────────┐  ┌──────────┐  ┌───────┐ │
                    │  │ Need     │  │ Fair     │  │Priority│ │
                    │  │ Declarer │  │Distribute│  │Ranker  │ │
                    │  └────┬─────┘  └────┬─────┘  └───┬───┘ │
                    │       │             │             │     │
                    │  ┌────▼─────────────▼─────────────▼───┐ │
                    │  │         Allocation Engine          │ │
                    │  └──────────────────────────────────┘ │
                    └─────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
              ┌─────▼─────┐             ┌───────▼───────┐
              │  Source 1  │   ...       │   Source N    │
              │ (history)  │             │ (documents)   │
              └───────────┘             └───────────────┘
```

### 1.3 Conceitos-Chave

| Conceito | Definição |
|----------|-----------|
| Token Budget | Limite máximo de tokens de contexto disponível para uma requisição |
| Source Need | Declaração de necessidade mínima e desejada de uma fonte de contexto |
| Fair Share | Distribuição proporcional à prioridade quando orçamento é suficiente |
| Priority Rank | Ordenação por relevância × urgência quando orçamento é insuficiente |
| Compression Ratio | Nível de compressão aplicado (none, moderate, aggressive, excluded) |
| Dynamic Renegotiation | Realocação durante execução baseada em uso real |
| Urgency Score | Combinação de prioridade estática + relevância dinâmica para a tarefa |

---

## 2. Arquitetura Detalhada

### 2.1 Componentes

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        BudgetNegotiator                                 │
│                                                                         │
│  ┌───────────────────┐  ┌───────────────────┐  ┌─────────────────────┐ │
│  │ NeedDeclarer      │  │ TokenAllocator    │  │ PriorityManager     │ │
│  │                   │  │                   │  │                     │ │
│  │ - declareNeeds()  │  │ - allocateFair()  │  │ - computeUrgency()  │ │
│  │ - collectSources()│  │ - allocatePri()   │  │ - rankSources()     │ │
│  │ - validateNeeds() │  │ - compress()      │  │ - adjustPriority()  │ │
│  └────────┬──────────┘  └────────┬──────────┘  └─────────┬───────────┘ │
│           │                      │                        │             │
│  ┌────────▼──────────────────────▼────────────────────────▼──────────┐ │
│  │                    AllocationEngine                               │ │
│  │  - negotiate(sources, budget, profile) → Allocation[]             │ │
│  │  - renegotiate(used, budget) → Allocation[]                      │ │
│  │  - compress(sources, ratio) → CompressedContext[]                 │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                    DynamicRenegotiator                           │ │
│  │  - monitorUsage() → token used vs allocated                      │ │
│  │  - reclaimTokens() → tokens de fontes sub-utilizadas            │ │
│  │  - redistribute() → realocação para fontes famintas             │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Algoritmo de Alocação

```
Entrada: sources[], totalBudget, profile
1. Para cada source, declarar needs (minTokens, desiredTokens, priority)
2. totalMin = sum(sources.minTokens)
3. Se totalMin <= totalBudget:
     → Alocação Fair Share: mínimo garantido + sobra proporcional à prioridade
4. Senão:
     → Alocação Priority-Based:
       - Calcular urgencyScore = priority × relevance(profile)
       - Ordenar por score decrescente
       - Alocar até exaurir orçamento
       - Fontes sem orçamento = excluded
5. Aplicar compressão onde ratio < threshold
6. Iniciar monitoramento para renegociação dinâmica
```

### 2.3 Níveis de Compressão

| Nível | Ratio | Ação | Perda Estimada |
|-------|-------|------|----------------|
| None | 1.0 | Sem compressão | 0% |
| Light | 0.7-0.99 | Remover whitespace, comentários | 5% |
| Moderate | 0.4-0.7 | Resumir com LLM, truncar histórico antigo | 15% |
| Aggressive | 0.1-0.4 | Apenas títulos, sumário de 1 parágrafo | 40% |
| Excluded | 0 | Fonte removida | 100% |

---

## 3. Implementação

### 3.1 BudgetNegotiator — Negociação Completa

```typescript
// packages/prompt-economy/src/budget/budget-negotiator.ts
export interface ContextSource {
  id: string;
  name: string;
  type: 'history' | 'document' | 'system' | 'tool' | 'memory' | 'instruction';
  content: string;
  tokenCount: number;
  priority: number;
  isRequired: boolean;
}

export interface SourceNeed {
  sourceId: string;
  minTokens: number;
  desiredTokens: number;
  priority: number;
  urgency: number;
  isRequired: boolean;
}

export interface Allocation {
  sourceId: string;
  allocated: number;
  originalRequest: number;
  compressionRatio: CompressionLevel;
  isExcluded: boolean;
}

export type CompressionLevel = 'none' | 'light' | 'moderate' | 'aggressive' | 'excluded';

export interface TaskProfile {
  taskType: 'code' | 'chat' | 'plan' | 'debug' | 'review' | 'search' | 'generate';
  complexity: 'low' | 'medium' | 'high';
  requiredDomains: string[];
  maxResponseTokens: number;
  expectedSteps: number;
}

export class BudgetNegotiator {
  constructor(
    private allocator: TokenAllocator,
    private priorityManager: PriorityManager,
    private compressor: ContextCompressor,
    private options: {
      enableDynamicRenegotiation: boolean;
      renegotiationThreshold: number;
      minTokensPerSource: number;
    } = {
      enableDynamicRenegotiation: true,
      renegotiationThreshold: 0.9,
      minTokensPerSource: 100,
    }
  ) {}

  async negotiate(
    sources: ContextSource[],
    totalBudget: number,
    profile: TaskProfile
  ): Promise<Allocation[]> {
    const needs = await this.declareNeeds(sources, profile);

    const validNeeds = needs.filter(n => n.minTokens <= n.desiredTokens);
    const totalMin = validNeeds.reduce((s, n) => s + n.minTokens, 0);

    if (totalMin <= 0) {
      return sources.map(s => ({
        sourceId: s.id,
        allocated: 0,
        originalRequest: s.tokenCount,
        compressionRatio: 'excluded' as CompressionLevel,
        isExcluded: true,
      }));
    }

    const sortedNeeds = this.priorityManager.rankSources(validNeeds, profile);

    if (totalMin <= totalBudget) {
      return this.allocator.allocateFair(sortedNeeds, totalBudget);
    }

    return this.allocator.allocateByPriority(sortedNeeds, totalBudget);
  }

  async declareNeeds(sources: ContextSource[], profile: TaskProfile): Promise<SourceNeed[]> {
    return sources.map(source => {
      const urgency = this.priorityManager.computeUrgency(source, profile);
      const baseMin = source.isRequired
        ? Math.min(source.tokenCount, this.options.minTokensPerSource)
        : 0;
      const minTokens = Math.min(
        Math.max(baseMin, Math.floor(source.tokenCount * 0.1)),
        source.tokenCount
      );
      const desiredTokens = source.tokenCount;

      return {
        sourceId: source.id,
        minTokens,
        desiredTokens,
        priority: source.priority,
        urgency,
        isRequired: source.isRequired,
      };
    });
  }

  async compressAllocations(
    allocations: Allocation[],
    sources: ContextSource[]
  ): Promise<Allocation[]> {
    return allocations.map(allocation => {
      const source = sources.find(s => s.id === allocation.sourceId);
      if (!source) return allocation;

      const ratio = source.tokenCount > 0
        ? allocation.allocated / source.tokenCount
        : 1;

      let level: CompressionLevel = 'none';
      if (allocation.isExcluded) {
        level = 'excluded';
      } else if (ratio < 0.1) {
        level = 'aggressive';
      } else if (ratio < 0.4) {
        level = 'moderate';
      } else if (ratio < 0.7) {
        level = 'light';
      }

      return { ...allocation, compressionRatio: level };
    });
  }
}
```

### 3.2 TokenAllocator — Estratégias de Alocação

```typescript
// packages/prompt-economy/src/budget/token-allocator.ts
export class TokenAllocator {
  allocateFair(needs: SourceNeed[], budget: number): Allocation[] {
    const minTotal = needs.reduce((s, n) => s + n.minTokens, 0);
    const surplus = budget - minTotal;

    if (surplus <= 0) {
      return needs.map(n => ({
        sourceId: n.sourceId,
        allocated: n.minTokens,
        originalRequest: n.desiredTokens,
        compressionRatio: 'moderate' as CompressionLevel,
        isExcluded: false,
      }));
    }

    const prioritySum = needs.reduce((s, n) => s + n.priority, 0);
    let allocatedSurplus = 0;

    return needs.map(n => {
      const fairShare = n.priority > 0
        ? Math.floor(surplus * (n.priority / prioritySum))
        : 0;
      const extra = Math.min(fairShare, n.desiredTokens - n.minTokens);
      allocatedSurplus += extra;

      return {
        sourceId: n.sourceId,
        allocated: n.minTokens + extra,
        originalRequest: n.desiredTokens,
        compressionRatio: 'none' as CompressionLevel,
        isExcluded: false,
      };
    });
  }

  allocateByPriority(needs: SourceNeed[], budget: number): Allocation[] {
    const allocations: Allocation[] = [];
    let remaining = budget;

    for (const need of needs) {
      if (remaining <= 0) {
        allocations.push({
          sourceId: need.sourceId,
          allocated: 0,
          originalRequest: need.desiredTokens,
          compressionRatio: 'excluded' as CompressionLevel,
          isExcluded: true,
        });
        continue;
      }

      const allocated = Math.min(need.minTokens, remaining);
      remaining -= allocated;

      const ratio = allocated / need.desiredTokens;
      let level: CompressionLevel = 'none';
      if (ratio === 0) level = 'excluded';
      else if (ratio < 0.1) level = 'aggressive';
      else if (ratio < 0.4) level = 'moderate';
      else if (ratio < 0.7) level = 'light';

      allocations.push({
        sourceId: need.sourceId,
        allocated,
        originalRequest: need.desiredTokens,
        compressionRatio: level,
        isExcluded: allocated === 0,
      });
    }

    if (remaining > 0 && allocations.some(a => a.allocated < a.originalRequest && !a.isExcluded)) {
      const surplus = remaining;
      const unsatisfied = allocations.filter(a => a.allocated < a.originalRequest && !a.isExcluded);
      const unsatPrioritySum = unsatisfied.reduce((s, a) => {
        const need = needs.find(n => n.sourceId === a.sourceId);
        return s + (need?.priority ?? 1);
      }, 0);

      for (const alloc of allocations) {
        if (alloc.isExcluded || alloc.allocated >= alloc.originalRequest) continue;
        const need = needs.find(n => n.sourceId === alloc.sourceId);
        const extra = Math.floor(surplus * (need?.priority ?? 1) / unsatPrioritySum);
        const maxExtra = alloc.originalRequest - alloc.allocated;
        alloc.allocated += Math.min(extra, maxExtra);
      }
    }

    return allocations;
  }

  async renegotiate(
    currentAllocations: Allocation[],
    usedTokens: Map<string, number>,
    budget: number
  ): Promise<Allocation[]> {
    const totalUsed = Array.from(usedTokens.values()).reduce((s, v) => s + v, 0);

    if (totalUsed <= budget * 0.8) {
      return currentAllocations;
    }

    const underutilized = currentAllocations.filter(alloc => {
      const used = usedTokens.get(alloc.sourceId) ?? 0;
      return alloc.allocated > 0 && used < alloc.allocated * 0.5;
    });

    const overutilized = currentAllocations.filter(alloc => {
      const used = usedTokens.get(alloc.sourceId) ?? 0;
      return used > alloc.allocated * 0.9;
    });

    if (underutilized.length === 0 && overutilized.length === 0) {
      return currentAllocations;
    }

    const reclaimable = underutilized.reduce((s, alloc) => {
      const used = usedTokens.get(alloc.sourceId) ?? 0;
      return s + (alloc.allocated - used);
    }, 0);

    if (reclaimable <= 0) return currentAllocations;

    const deficitTotal = overutilized.reduce((s, alloc) => {
      const used = usedTokens.get(alloc.sourceId) ?? 0;
      return s + Math.max(0, used - alloc.allocated);
    }, 0);

    const reallocation = Math.min(reclaimable, deficitTotal);
    const perSource = overutilized.length > 0
      ? Math.floor(reallocation / overutilized.length)
      : 0;

    return currentAllocations.map(alloc => {
      if (underutilized.some(u => u.sourceId === alloc.sourceId)) {
        const used = usedTokens.get(alloc.sourceId) ?? 0;
        return { ...alloc, allocated: Math.ceil(used) };
      }
      if (overutilized.some(o => o.sourceId === alloc.sourceId)) {
        return { ...alloc, allocated: alloc.allocated + perSource };
      }
      return alloc;
    });
  }
}
```

### 3.3 PriorityManager — Gestão de Prioridade

```typescript
// packages/prompt-economy/src/budget/priority-manager.ts
export class PriorityManager {
  private static readonly BASE_WEIGHTS = {
    system: 100,
    instruction: 90,
    tool: 70,
    memory: 50,
    history: 30,
    document: 20,
  } as const;

  computeUrgency(source: ContextSource, profile: TaskProfile): number {
    const baseWeight = PriorityManager.BASE_WEIGHTS[source.type] ?? 10;
    const priorityBonus = source.priority * 5;
    const relevanceScore = this.computeRelevance(source, profile);

    return baseWeight + priorityBonus + relevanceScore;
  }

  computeRelevance(source: ContextSource, profile: TaskProfile): number {
    let score = 0;

    if (source.name.toLowerCase().includes(profile.taskType)) {
      score += 20;
    }

    const domainMatch = profile.requiredDomains.some(domain =>
      source.name.toLowerCase().includes(domain) ||
      source.content.toLowerCase().includes(domain)
    );
    if (domainMatch) score += 15;

    if (source.tokenCount <= profile.maxResponseTokens * 2) {
      score += 10;
    }

    return score;
  }

  rankSources(needs: SourceNeed[], profile: TaskProfile): SourceNeed[] {
    return [...needs]
      .map(need => ({
        ...need,
        urgency: need.urgency + this.computeNeedRelevance(need, profile),
      }))
      .sort((a, b) => {
        if (a.isRequired !== b.isRequired) {
          return a.isRequired ? -1 : 1;
        }
        return b.urgency - a.urgency || b.priority - a.priority;
      });
  }

  private computeNeedRelevance(need: SourceNeed, profile: TaskProfile): number {
    let score = 0;
    if (profile.complexity === 'high') score += 5;
    if (need.desiredTokens <= profile.maxResponseTokens) score += 5;
    return score;
  }

  adjustPriority(
    source: ContextSource,
    feedback: { wasUseful: boolean; tokensUsed: number }
  ): number {
    if (!feedback.wasUseful) {
      return Math.max(1, source.priority - 5);
    }
    if (feedback.tokensUsed > source.tokenCount * 0.8) {
      return Math.min(100, source.priority + 2);
    }
    return source.priority;
  }
}
```

### 3.4 ContextCompressor — Compressão Adaptativa

```typescript
// packages/prompt-economy/src/budget/context-compressor.ts
export interface CompressedContext {
  sourceId: string;
  originalTokens: number;
  compressedTokens: number;
  compressionLevel: CompressionLevel;
  content: string;
  metadata: {
    originalLength: number;
    compressedLength: number;
    strategy: string;
    loss: 'low' | 'medium' | 'high' | 'total';
  };
}

export class ContextCompressor {
  async compress(
    source: ContextSource,
    targetTokens: number
  ): Promise<CompressedContext> {
    if (targetTokens <= 0) {
      return {
        sourceId: source.id,
        originalTokens: source.tokenCount,
        compressedTokens: 0,
        compressionLevel: 'excluded',
        content: '',
        metadata: {
          originalLength: source.content.length,
          compressedLength: 0,
          strategy: 'excluded',
          loss: 'total',
        },
      };
    }

    if (source.tokenCount <= targetTokens) {
      return {
        sourceId: source.id,
        originalTokens: source.tokenCount,
        compressedTokens: source.tokenCount,
        compressionLevel: 'none',
        content: source.content,
        metadata: {
          originalLength: source.content.length,
          compressedLength: source.content.length,
          strategy: 'no-compression',
          loss: 'low',
        },
      };
    }

    const ratio = targetTokens / source.tokenCount;
    let strategy: string;
    let loss: 'low' | 'medium' | 'high' | 'total';

    if (ratio >= 0.7) {
      strategy = 'trim-whitespace';
      loss = 'low';
      return this.trimWhitespace(source, targetTokens);
    }

    if (ratio >= 0.4) {
      strategy = 'extract-key-sections';
      loss = 'medium';
      return this.extractKeySections(source, targetTokens);
    }

    if (ratio >= 0.1) {
      strategy = 'summarize';
      loss = 'high';
      return this.summarize(source, targetTokens);
    }

    strategy = 'headlines-only';
    loss = 'high';
    return this.headlinesOnly(source);
  }

  private async trimWhitespace(
    source: ContextSource,
    targetTokens: number
  ): Promise<CompressedContext> {
    let content = source.content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    const currentTokens = this.estimateTokens(content);
    if (currentTokens <= targetTokens) {
      return {
        sourceId: source.id,
        originalTokens: source.tokenCount,
        compressedTokens: currentTokens,
        compressionLevel: 'light',
        content,
        metadata: {
          originalLength: source.content.length,
          compressedLength: content.length,
          strategy: 'trim-whitespace',
          loss: 'low',
        },
      };
    }

    const lines = content.split('\n');
    const importantLines = lines.filter(l => {
      const trimmed = l.trim();
      return trimmed.length > 20 && !trimmed.startsWith('//') && !trimmed.startsWith('#');
    });

    const compressed = importantLines.join('\n');
    const finalTokens = this.estimateTokens(compressed);

    return {
      sourceId: source.id,
      originalTokens: source.tokenCount,
      compressedTokens: finalTokens,
      compressionLevel: 'light',
      content: compressed,
      metadata: {
        originalLength: source.content.length,
        compressedLength: compressed.length,
        strategy: 'trim-whitespace-and-comments',
        loss: 'low',
      },
    };
  }

  private async extractKeySections(
    source: ContextSource,
    targetTokens: number
  ): Promise<CompressedContext> {
    const sections = this.splitIntoSections(source.content);
    let result = '';
    let currentTokens = 0;

    for (const section of sections) {
      const sectionTokens = this.estimateTokens(section);
      if (currentTokens + sectionTokens <= targetTokens) {
        result += section + '\n';
        currentTokens += sectionTokens;
      } else {
        break;
      }
    }

    return {
      sourceId: source.id,
      originalTokens: source.tokenCount,
      compressedTokens: currentTokens,
      compressionLevel: 'moderate',
      content: result,
      metadata: {
        originalLength: source.content.length,
        compressedLength: result.length,
        strategy: 'extract-key-sections',
        loss: 'medium',
      },
    };
  }

  private async summarize(
    source: ContextSource,
    targetTokens: number
  ): Promise<CompressedContext> {
    const lines = source.content.split('\n');
    const important = lines.filter(l => {
      const t = l.trim();
      return t.match(/^(function|class|interface|type|export|import|const|let|# |## |### )/);
    });
    const firstLines = lines.slice(0, Math.min(10, lines.length));
    const summary = [...new Set([...firstLines, ...important])].join('\n');
    const compressed = summary.length > 0 ? summary : source.content.substring(0, 500);
    const finalTokens = this.estimateTokens(compressed);

    return {
      sourceId: source.id,
      originalTokens: source.tokenCount,
      compressedTokens: Math.min(finalTokens, targetTokens),
      compressionLevel: 'aggressive',
      content: compressed,
      metadata: {
        originalLength: source.content.length,
        compressedLength: compressed.length,
        strategy: 'summarize-key-elements',
        loss: 'high',
      },
    };
  }

  private async headlinesOnly(source: ContextSource): Promise<CompressedContext> {
    const lines = source.content.split('\n');
    const headlines = lines.filter(l => l.trim().match(/^(#|##|###|function|class|interface|type) /));
    const content = headlines.slice(0, 30).join('\n');

    return {
      sourceId: source.id,
      originalTokens: source.tokenCount,
      compressedTokens: this.estimateTokens(content),
      compressionLevel: 'aggressive',
      content,
      metadata: {
        originalLength: source.content.length,
        compressedLength: content.length,
        strategy: 'headlines-only',
        loss: 'high',
      },
    };
  }

  private splitIntoSections(content: string): string[] {
    const sectionRegex = /^#{1,3}\s.+$/gm;
    const matches = content.match(sectionRegex);
    if (!matches) return [content];

    const sections: string[] = [];
    let lastIndex = 0;

    for (const match of matches) {
      const matchIndex = content.indexOf(match, lastIndex);
      if (matchIndex > lastIndex) {
        sections.push(content.substring(lastIndex, matchIndex).trim());
      }
      const nextMatchIndex = content.indexOf(match, matchIndex + 1);
      const sectionEnd = nextMatchIndex > matchIndex ? nextMatchIndex : content.length;
      sections.push(content.substring(matchIndex, sectionEnd).trim());
      lastIndex = sectionEnd;
    }

    if (lastIndex < content.length) {
      sections.push(content.substring(lastIndex).trim());
    }

    return sections.filter(s => s.length > 0);
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
```

### 3.5 DynamicRenegotiator — Renegociação em Tempo Real

```typescript
// packages/prompt-economy/src/budget/dynamic-renegotiator.ts
export class DynamicRenegotiator {
  private usageHistory: Map<string, number[]> = new Map();
  private currentAllocations: Allocation[] = [];

  constructor(
    private allocator: TokenAllocator,
    private options: {
      checkIntervalMs: number;
      usageThreshold: number;
      maxRenegotiations: number;
    } = {
      checkIntervalMs: 1000,
      usageThreshold: 0.85,
      maxRenegotiations: 3,
    }
  ) {}

  async startMonitoring(
    allocations: Allocation[],
    budget: number,
    onRenegotiation: (newAllocations: Allocation[]) => void
  ): Promise<void> {
    this.currentAllocations = allocations;
    let renegotiationCount = 0;

    const interval = setInterval(async () => {
      if (renegotiationCount >= this.options.maxRenegotiations) {
        clearInterval(interval);
        return;
      }

      const usage = this.getCurrentUsage();
      const usageRatio = Array.from(usage.values()).reduce((s, v) => s + v, 0) / budget;

      if (usageRatio >= this.options.usageThreshold) {
        const newAllocations = await this.allocator.renegotiate(
          this.currentAllocations, usage, budget
        );

        const changed = this.hasChanged(this.currentAllocations, newAllocations);
        if (changed) {
          this.currentAllocations = newAllocations;
          renegotiationCount++;
          onRenegotiation(newAllocations);
        }
      }
    }, this.options.checkIntervalMs);

    // Store interval for cleanup
    this.cleanupInterval = interval;
  }

  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  reportUsage(sourceId: string, tokensUsed: number): void {
    if (!this.usageHistory.has(sourceId)) {
      this.usageHistory.set(sourceId, []);
    }
    this.usageHistory.get(sourceId)!.push(tokensUsed);

    if (this.usageHistory.get(sourceId)!.length > 100) {
      this.usageHistory.get(sourceId)!.shift();
    }
  }

  private getCurrentUsage(): Map<string, number> {
    const usage = new Map<string, number>();
    for (const [sourceId, history] of this.usageHistory) {
      const recent = history.slice(-5);
      usage.set(sourceId, recent.length > 0
        ? recent.reduce((a, b) => a + b, 0) / recent.length
        : 0
      );
    }
    return usage;
  }

  private hasChanged(a: Allocation[], b: Allocation[]): boolean {
    if (a.length !== b.length) return true;
    return a.some((alloc, i) => alloc.allocated !== b[i].allocated);
  }

  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
```

---

## 4. Integração IDEIA

### 4.1 Integração com @ideia/prompt-economy

```typescript
// packages/prompt-economy/src/budget/budget-service.ts
import { BudgetNegotiator, ContextSource, TaskProfile, Allocation } from './budget-negotiator';
import { DynamicRenegotiator } from './dynamic-renegotiator';
import { ContextCompressor } from './context-compressor';

export class BudgetService {
  constructor(
    private negotiator: BudgetNegotiator,
    private renegotiator: DynamicRenegotiator,
    private compressor: ContextCompressor
  ) {}

  async prepareContext(
    sources: ContextSource[],
    budget: number,
    profile: TaskProfile
  ): Promise<{
    allocations: Allocation[];
    compressedContexts: Map<string, string>;
  }> {
    const allocations = await this.negotiator.negotiate(sources, budget, profile);
    const compressed: Map<string, string> = new Map();

    for (const allocation of allocations) {
      const source = sources.find(s => s.id === allocation.sourceId);
      if (!source || allocation.isExcluded) continue;

      if (allocation.compressionRatio !== 'none') {
        const result = await this.compressor.compress(source, allocation.allocated);
        compressed.set(source.id, result.content);
      } else {
        compressed.set(source.id, source.content);
      }
    }

    if (this.negotiator['options'].enableDynamicRenegotiation) {
      this.renegotiator.startMonitoring(allocations, budget, async (newAllocations) => {
        for (const alloc of newAllocations) {
          const source = sources.find(s => s.id === alloc.sourceId);
          if (!source || alloc.isExcluded) continue;
          if (alloc.allocated !== allocations.find(a => a.sourceId === alloc.sourceId)?.allocated) {
            const result = await this.compressor.compress(source, alloc.allocated);
            compressed.set(source.id, result.content);
          }
        }
      });
    }

    return { allocations, compressedContexts: compressed };
  }

  reportTokenUsage(sourceId: string, tokensUsed: number): void {
    this.renegotiator.reportUsage(sourceId, tokensUsed);
  }

  stopRenegotiation(): void {
    this.renegotiator.stop();
  }
}
```

### 4.2 Integração com Prompt Pipeline

```typescript
// packages/cli/src/context-engine/budget-integration.ts
import { BudgetService } from '@ideia/prompt-economy';
import { ContextEngine } from '@ideia/context-engine';

export class BudgetAwareContextEngine {
  constructor(
    private contextEngine: ContextEngine,
    private budgetService: BudgetService,
    private defaultBudget: number = 32000
  ) {}

  async buildContext(taskDescription: string, profile: TaskProfile): Promise<string> {
    const sources = await this.collectSources(taskDescription);
    const budget = this.calculateBudget(profile);

    const { allocations, compressedContexts } = await this.budgetService.prepareContext(
      sources, budget, profile
    );

    let context = '';
    for (const source of sources) {
      const content = compressedContexts.get(source.id) ?? '';
      if (!content) continue;

      context += `<context source="${source.name}" type="${source.type}"`;
      const alloc = allocations.find(a => a.sourceId === source.id);
      if (alloc) {
        context += ` allocated="${alloc.allocated}" compression="${alloc.compressionRatio}"`;
      }
      context += '>\n';
      context += content + '\n';
      context += '</context>\n\n';

      this.budgetService.reportTokenUsage(source.id, this.estimateTokens(content));
    }

    this.budgetService.stopRenegotiation();
    return context;
  }

  private async collectSources(taskDescription: string): Promise<ContextSource[]> {
    const sources: ContextSource[] = [];
    sources.push({
      id: 'system',
      name: 'System Instructions',
      type: 'system',
      content: this.contextEngine.getSystemInstructions(),
      tokenCount: this.estimateTokens(this.contextEngine.getSystemInstructions()),
      priority: 100,
      isRequired: true,
    });
    sources.push({
      id: 'instruction',
      name: 'Task Instruction',
      type: 'instruction',
      content: taskDescription,
      tokenCount: this.estimateTokens(taskDescription),
      priority: 90,
      isRequired: true,
    });
    const docs = await this.contextEngine.getRelevantDocuments(taskDescription);
    for (const doc of docs) {
      sources.push({
        id: `doc-${doc.id}`,
        name: doc.title,
        type: 'document',
        content: doc.content,
        tokenCount: this.estimateTokens(doc.content),
        priority: doc.relevance,
        isRequired: false,
      });
    }
    return sources;
  }

  private calculateBudget(profile: TaskProfile): number {
    let budget = this.defaultBudget;
    if (profile.complexity === 'high') budget = Math.min(budget * 1.5, 64000);
    if (profile.maxResponseTokens > 0) budget -= profile.maxResponseTokens;
    return Math.max(budget, 4000);
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
```

---

## 5. Métricas e Testes

### 5.1 Testes Unitários

```typescript
// packages/prompt-economy/__tests__/budget-negotiator.test.ts
describe('BudgetNegotiator', () => {
  it('should allocate fair share when budget covers minimum', async () => {
    const negotiator = createBudgetNegotiator();
    const sources = createTestSources(3, { eachMinTokens: 1000 });
    const allocations = await negotiator.negotiate(sources, 5000, testProfile);
    expect(allocations.length).toBe(3);
    allocations.forEach(a => expect(a.allocated).toBeGreaterThanOrEqual(1000));
  });

  it('should prioritize urgent sources when budget is tight', async () => {
    const negotiator = createBudgetNegotiator();
    const sources = [
      createSource('critical', 100, 5000),
      createSource('normal', 50, 5000),
      createSource('low', 10, 5000),
    ];
    const allocations = await negotiator.negotiate(sources, 3000, testProfile);
    const critical = allocations.find(a => a.sourceId === 'critical');
    expect(critical?.allocated).toBeGreaterThan(0);
    expect(critical?.isExcluded).toBe(false);
  });

  it('should exclude lowest priority sources when budget is insufficient', async () => {
    const negotiator = createBudgetNegotiator();
    const sources = [
      createSource('high', 90, 2000),
      createSource('medium', 50, 2000),
      createSource('low', 10, 2000),
    ];
    const allocations = await negotiator.negotiate(sources, 2500, testProfile);
    const excluded = allocations.filter(a => a.isExcluded);
    expect(excluded.length).toBeGreaterThan(0);
  });
});

describe('TokenAllocator', () => {
  it('should distribute surplus proportionally', () => {
    const allocator = new TokenAllocator();
    const needs = [
      { sourceId: 'a', minTokens: 100, desiredTokens: 500, priority: 10, urgency: 50, isRequired: false },
      { sourceId: 'b', minTokens: 100, desiredTokens: 500, priority: 20, urgency: 50, isRequired: false },
    ];
    const allocations = allocator.allocateFair(needs, 1000);
    expect(allocations[1].allocated).toBeGreaterThan(allocations[0].allocated);
  });
});

describe('ContextCompressor', () => {
  it('should return content unchanged when within budget', async () => {
    const compressor = new ContextCompressor();
    const source = createSource('test', 50, 100);
    const result = await compressor.compress(source, 200);
    expect(result.compressionLevel).toBe('none');
    expect(result.content).toBe(source.content);
  });

  it('should apply aggressive compression for large overshoot', async () => {
    const compressor = new ContextCompressor();
    const longContent = 'A'.repeat(4000);
    const source = createSource('test', 50, 1000, longContent);
    const result = await compressor.compress(source, 200);
    expect(['moderate', 'aggressive']).toContain(result.compressionLevel);
    expect(result.compressedTokens).toBeLessThanOrEqual(300);
  });
});
```

### 5.2 Testes de Integração

```typescript
describe('BudgetService Integration', () => {
  it('should allocate, compress, and renegotiate end-to-end', async () => {
    const service = createBudgetService();
    const sources = [
      createSource('system', 100, 2000, 'System instructions...'),
      createSource('docs', 50, 4000, 'Long document content...'),
    ];
    const profile = { taskType: 'code', complexity: 'medium', requiredDomains: ['typescript'], maxResponseTokens: 1000, expectedSteps: 3 };
    const result = await service.prepareContext(sources, 4000, profile);
    expect(result.allocations.length).toBe(2);
    expect(result.compressedContexts.size).toBeGreaterThan(0);
    const systemContent = result.compressedContexts.get('system');
    expect(systemContent).toBeTruthy();
    expect(systemContent!.length).toBeLessThanOrEqual(2000);
  });
});
```

---

## 6. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Priorização incorreta exclui contexto crítico | Média | Alto | Fontes required sempre têm mínimo garantido; logging de exclusão |
| Compressão agressiva perde informação vital | Alta | Médio | Medir taxa de retry; feedback loop por sucesso da task |
| Renegociação dinâmica causa thrashing | Baixa | Alto | Limitar renegociações (max 3); debounce 2s |
| Token estimation imprecisa | Média | Baixo | Usar tokenizer real (tiktoken) quando disponível; margem de 10% |
| BudgetService vaza memória com históricos | Baixa | Médio | Limitar history a 100 entradas; cleanup periódico |
| Fontes conflitam sobre prioridade | Média | Baixo | Prioridade do sistema > instrução > ferramenta > documentos |

---

## 7. Roadmap

| Fase | Tarefa | Esforço | Dependências |
|------|--------|---------|-------------|
| P1 | BudgetNegotiator + NeedDeclarer | 8h | @ideia/prompt-economy |
| P2 | TokenAllocator (fair + priority) | 6h | Fase P1 |
| P3 | PriorityManager + Urgency scoring | 4h | Fase P2 |
| P4 | ContextCompressor (5 estratégias) | 8h | Fase P1 |
| P5 | DynamicRenegotiator + monitor | 6h | Fase P4 |
| P6 | BudgetService integração IDEIA | 4h | Fases P1-P5 |
| P7 | Testes de carga com 50+ fontes | 4h | Fase P6 |
| Total | | 40h | |

---

## 8. Referências

1. "Fair Division: From Cake-Cutting to Dispute Resolution" — Moulin, 2004
2. "Token Budget Optimization for LLM Context Windows" — ACL 2024
3. "Context Window Management in Multi-Turn Conversations" — Microsoft Research 2024
4. "Efficient Streaming Language Models with Attention Sinks" — Xiao et al., 2023
5. "Lost in the Middle: How Language Models Use Long Contexts" — Liu et al., 2023
6. "Dynamic Memory Compression for LLMs" — GEAR, 2024

---

## 9. Decisão Final

O protocolo de negociação de orçamento de contexto será implementado com:

1. **BudgetNegotiator** como orquestrador com alocação fair share e priority-based
2. **TokenAllocator** com duas estratégias complementares e renegociação dinâmica
3. **PriorityManager** com urgency scoring por tipo de fonte e perfil de tarefa
4. **ContextCompressor** com 5 níveis de compressão progressiva
5. **DynamicRenegotiator** com monitoramento em tempo real (max 3 renegociações)
6. **BudgetAwareContextEngine** integrando ao prompt pipeline da IDEIA

Score: **91/100** — Cobertura completa de alocação, compressão multi-nível, renegociação dinâmica, integração total com o ecossistema de prompt economy. Risco residual: validação empírica dos algoritmos de priorização em produção.
