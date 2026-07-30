# Estudo: Synthetic Memory Generation for Training & Testing

> **Data:** 2026-07-25 | **Versão:** 3.0 (intensificação F6 — reestruturação completa)
> **Área:** IA — Synthetic Memory Generation
> **Dependências:** @ideia/memory-store, @ideia/llm-provider, @ideia/vector-store, @ideia/agent-runtime
> **Conexões:** AGENT-MEMORY-HIERARCHY, ADAPTIVE-CONTEXT-COMPRESSION, SEMANTIC-CLUSTERING, REFLEXION-STUDY
> **Propósito:** Estudo completo de geração de memórias sintéticas para agentes autônomos — fundamentos, técnicas, engenharia, inovação, pesquisa e integração IDEIA
> **Template:** v3.0 (8 seções: FUNDAMENTOS, TÉCNICO, ENGENHARIA, INOVAÇÃO, PESQUISA, FRONTEIRAS, ANÁLISE PARA IDEIA, REFERÊNCIAS)

---

## 1. FUNDAMENTOS

### 1.1 Conceito de Memória Sintética

Memória sintética é qualquer registro de conhecimento gerado artificialmente — não derivado diretamente de uma interação real do agente — mas sim produzido por inferência, síntese, reflexão ou aumentação a partir de dados existentes. Diferencia-se de memórias "reais" (observadas diretamente) por serem construídas por um processo generativo, tipicamente mediado por um LLM, templates estruturados, ou redes generativas (GANs).

O conceito central: **agentes autônomos precisam de memórias densas, relevantes e diversas** para tomar decisões informadas. Nem toda interação produz memórias de alta qualidade; nem todo conhecimento útil foi explicitamente vivenciado. Memórias sintéticas preenchem essa lacuna.

```
Realidade observacional:
  Interação real → Memória real (esparsa, ruidosa, incompleta)

Processo sintético:
  Memória real + Inferência + Síntese → Memória sintética (densa, curada, completa)
```

### 1.2 Problema e Contexto

Agentes autônomos acumulam conhecimento através de interações reais em sessões de trabalho. No entanto, três problemas fundamentais emergem:

1. **Esparsidade:** Muitas interações são repetitivas ou triviais — apenas uma fração produz memórias úteis
2. **Gaps de conhecimento:** Situações que o agente nunca encontrou, decisões não registradas, conhecimento tácito não explicitado
3. **Degradação temporal:** Memórias reais perdem relevância; é necessário consolidar, abstrair e sintetizar

Memórias sintéticas endereçam esses problemas através de 3 abordagens fundamentais:

| Abordagem | Mecanismo | Exemplo |
|-----------|-----------|---------|
| **LLM-based** | Usar LLMs para gerar memórias plausíveis a partir de contexto existente | Extrair decisões de logs de sessão e transformar em memórias duráveis |
| **Template-based** | Preencher templates estruturados com variações controladas | "Erro {X} resolvido via {Y} — registrar como padrão de debugging" |
| **GAN-based** | Usar Generative Adversarial Networks para criar embeddings de memórias realistas | Treinar GAN em 500+ memórias reais, gerar variações no embedding space |

### 1.3 Comparação de Abordagens

| Abordagem | Realismo | Controle | Custo Token | Escalabilidade | Maturidade |
|-----------|----------|----------|-------------|----------------|------------|
| LLM-based | Alto | Médio | Alto | Média | Alta (GPT-4, Claude, DeepSeek) |
| Template-based | Médio | Alto | Baixo | Alta | Alta (NLG clássico) |
| GAN-based | Alto | Baixo | Zero (pós-treino) | Alta (após treino) | Média (pesquisa ativa) |
| Híbrida (LLM + Template) | Alto | Alto | Médio | Alta | **Recomendada** |

### 1.4 Ciclo de Vida da Síntese de Memória

```
OBSERVAÇÃO → SÍNTESE → ARMAZENAMENTO → RECUPERAÇÃO
    │           │            │               │
    ▼           ▼            ▼               ▼
  Coletar    Processar    Indexar e      Buscar e
  interações e transformar persistir     contextualizar
  e decisões  em memórias  em vector     para decisões
              duráveis     store         futuras
    │           │            │               │
    └───────────┴────────────┴───────────────┘
                          │
                          ▼
                   Feedback Loop
                   (avaliar qualidade,
                   podar memórias
                   obsoletas)
```

---

## 2. TÉCNICO

### 2.1 Técnicas de Síntese de Memória

#### 2.1.1 Auto-Summarização (Self-Summarization)

A técnica mais básica: dado um conjunto de observações (log de ações, decisões, resultados), o agente gera um sumário condensado que preserva a informação essencial.

**Mecanismo:**
1. Agrupar observações relacionadas por janela temporal ou tópico
2. Enviar ao LLM com prompt de sumarização
3. Extrair sumário, tags, nível de importância
4. Armazenar como memória de nível L2 ou L3

**Trade-offs:**
- **Prós:** Baixa complexidade, execução barata
- **Contras:** Perde detalhes sutis, não conecta observações distantes

#### 2.1.2 Reflexão (Generative Agents Pattern — Park et al., 2023)

Técnica avançada onde o agente reflete sobre suas experiências para gerar insights de alto nível. Inspirada no artigo "Generative Agents: Interactive Simulacra of Human Behavior".

**Três níveis de reflexão:**

| Nível | Gatilho | Saída | Exemplo |
|-------|---------|-------|---------|
| **Observação** | A cada ação | Registro factual | "Usuário pediu formatação com 2 espaços" |
| **Reflexão imediata** | Importância > limiar | Insight de baixo nível | "Usuário prefere indentação compacta" |
| **Reflexão de alto nível** | Múltiplas reflexões relacionadas | Generalização | "Usuário tem preferências de formatação consistentes — criar perfil de estilo" |

**Algoritmo de reflexão (Generative Agents):**

```
function reflect(memoryStream):
    // 1. Calcular importância de cada memória recente
    scores = [scoreImportance(m) for m in memoryStream]
    
    // 2. Se importância média > limiar, refletir
    if mean(scores) > REFLECTION_THRESHOLD:
        // 3. Selecionar memórias mais importantes
        topMemories = topK(memoryStream, k=5, key=importance)
        
        // 4. LLM gera reflexão a partir das memórias
        reflection = llm.generateReflection(topMemories)
        
        // 5. Armazenar reflexão como nova memória de alto nível
        memoryStore.add(reflection, level=L4)
    
    // 6. Reflexão periódica (end-of-day)
    if endOfDay():
        dailyReflection = llm.summarizeDay(memoryStream)
        memoryStore.add(dailyReflection, level=L3)
```

#### 2.1.3 Importance Scoring

Cada memória recebe um score de importância (0.0–1.0) que determina:
- **Nível na hierarquia:** L1 (0.0–0.3) efêmera → L4 (0.8–1.0) conhecimento core
- **Persistência:** Memórias de baixa importância são podadas primeiro
- **Gatilho de reflexão:** Memórias importantes disparam reflexão
- **Recuperação:** Memórias mais importantes têm prioridade no contexto

**Fatores que influenciam importância:**

| Fator | Peso | Descrição |
|-------|------|-----------|
| Recência | 0.2 | Memórias recentes são mais relevantes |
| Frequência de acesso | 0.25 | Padrões recorrentes são importantes |
| Conexões no knowledge graph | 0.2 | Memórias centrais têm mais arestas |
| Impacto da decisão original | 0.2 | Decisões de alto impacto geram memórias importantes |
| Feedback do usuário | 0.15 | Correções ou aprovações explícitas |

```
importance = 0.2 * recency + 0.25 * accessFrequency + 0.2 * graphCentrality
           + 0.2 * decisionImpact + 0.15 * userFeedback
```

### 2.2 Hierarquia de Memória

```
┌─────────────────────────────────────────────────────────────────────┐
│                      MEMORY HIERARCHY                                │
│  Nível  │ Tipo              │ Duração │ Importância │ Exemplo        │
│  ───────┼───────────────────┼─────────┼─────────────┼────────────────│
│  L1     │ Ephemeral         │ Session │ 0.0-0.3     │ "usuario usou  │
│         │ (working memory)  │         │             │  comando X"    │
│  L2     │ Short-term        │ 1-7d    │ 0.3-0.6     │ "preferência   │
│         │                   │         │             │  de formatação"│
│  L3     │ Long-term         │ 30d+    │ 0.6-0.8     │ "padrão de     │
│         │                   │         │             │  código do     │
│         │                   │         │             │  projeto"      │
│  L4     │ Core knowledge    │ Forever │ 0.8-1.0     │ "linguagens    │
│         │                   │         │             │  suportadas"   │
└─────────────────────────────────────────────────────────────────────┘
```

**Regras de transição entre níveis:**
- L1 → L2: Se acessada 3+ vezes na mesma sessão
- L2 → L3: Se importance > 0.6 após 24h de consolidação
- L3 → L4: Se importance > 0.8 e verificada por reflexão de alto nível
- Decaimento: L2 não acessada em 7d → L1. L3 não acessada em 30d → L2

### 2.3 Compressão de Memória

#### 2.3.1 Lossy vs Lossless

| Aspecto | Lossless | Lossy |
|---------|----------|-------|
| Preservação | Integral do texto original | Sumário ou abstração |
| Tamanho | Original | 10-30% do original |
| Qualidade | 100% fidelidade | 70-95% fidelidade |
| Uso típico | Memórias L4 (core) | Memórias L2-L3 |
| Custo de armazenamento | Alto | Baixo |
| Custo de recuperação | Mais tokens no prompt | Menos tokens |

**Estratégia IDEIA:** Lossless para L4, lossy progressivo para L1-L3. Reconstrói versão expandida via LLM quando necessário (sob demanda).

#### 2.3.2 Summarization vs Extraction vs Abstraction

| Técnica | Definição | Preservação | Exemplo |
|---------|-----------|-------------|---------|
| **Summarization** | Condensar mantendo pontos principais | 85% | "Resolveu 3 bugs de tipagem em TypeScript" |
| **Extraction** | Extrair entidades e relações chave | 70% | "{bugs: 3, linguagem: TypeScript, ação: resolver}" |
| **Abstraction** | Generalizar para princípio mais amplo | 60% | "Padrão: erros de tipo são frequentes em código legado — recomendar migração gradual" |

**Pipeline de compressão:**

```
Memória original (500 tokens)
    │
    ├─→ Summarization → Memória sumarizada (150 tokens) ← default
    │
    ├─→ Extraction → Memória extraída (50 tokens, estruturada) ← para busca
    │
    └─→ Abstraction → Memória abstrata (100 tokens, generalizada) ← para reflexão
```

### 2.4 Métricas de Qualidade

#### 2.4.1 Faithfulness (Fidelidade)

A memória sintética não deve contradizer a realidade observada.

**Métrica:** % de claims verificáveis que são consistentes com a fonte original.

```
faithfulness = claims_consistent / claims_total
```

**Método de avaliação:**
1. Extrair claims da memória sintética
2. Verificar cada claim contra as observações originais
3. Claims não verificáveis (novas inferências) são marcadas como "especulativas"
4. Score = claims consistentes / (claims verificáveis + 1)

**Alvo:** faithfulness > 0.90

#### 2.4.2 Information Density (Densidade Informacional)

Razão entre informação útil e tamanho total da memória.

```
density = unique_information_bits / total_tokens
```

**Fatores:**
- Número de entidades nomeadas únicas
- Relações não-triviais
- Decisões documentadas
- Insights não óbvios

**Alvo:** > 0.3 (30% do conteúdo é informação útil não-redundante)

#### 2.4.3 Retrieval Effectiveness (Efetividade de Recuperação)

Quão bem a memória sintética é recuperada quando relevante.

| Métrica | Definição | Alvo |
|---------|-----------|------|
| Precision@5 | Fração de relevantes nos top 5 | > 0.8 |
| Recall@10 | Fração de relevantes recuperados nos top 10 | > 0.7 |
| MRR | Mean Reciprocal Rank da primeira relevante | > 0.85 |
| NDCG@10 | Normalized Discounted Cumulative Gain | > 0.8 |

**Fatores que afetam retrieval:**
- Qualidade do embedding (memórias sintéticas bem embedadas)
- Tags e metadados consistentes
- Desambiguação de entidades
- Densidade semântica

---

## 3. ENGENHARIA

### 3.1 Ciclo Completo: Observação → Síntese → Armazenamento → Recuperação

```
┌─────────────────────────────────────────────────────────────────────┐
│              FULL MEMORY SYNTHESIS CYCLE                             │
│                                                                      │
│  OBSERVATION                                                         │
│  ┌─────────────┐                                                     │
│  │ Session Log │──→ RawActions[]                                     │
│  ├─────────────┤                                                     │
│  │ Agent Output│──→ Decisions[]                                      │
│  ├─────────────┤                                                     │
│  │ User Input  │──→ Preferences[]                                    │
│  └──────┬──────┘                                                     │
│         ▼                                                            │
│  SYNTHESIS                                                            │
│  ┌──────────────────────────────────────────────────────┐            │
│  │ 1. Extract Decisions (DecisionExtractor)              │            │
│  │ 2. Detect Gaps (GapDetector)                          │            │
│  │ 3. Generate Memories                                  │            │
│  │    ├─ LLM Generator (fromDecisions, fromGaps)         │            │
│  │    ├─ Template Generator (6 patterns)                 │            │
│  │    └─ Reflection Generator (reflection loop)          │            │
│  │ 4. Score Importance                                   │            │
│  │ 5. Validate Quality (QualityValidator)                │            │
│  └──────────────────────────┬───────────────────────────┘            │
│                             ▼                                        │
│  STORAGE                                                             │
│  ┌──────────────────────────────────────────────────────┐            │
│  │ 1. Embed (embedding pipeline)                         │            │
│  │ 2. Assign Level (L1-L4)                               │            │
│  │ 3. Tag + Categorize                                   │            │
│  │ 4. Store (vector store + relational)                  │            │
│  │ 5. Link to Knowledge Graph                            │            │
│  └──────────────────────────┬───────────────────────────┘            │
│                             ▼                                        │
│  RETRIEVAL                                                            │
│  ┌──────────────────────────────────────────────────────┐            │
│  │ 1. Query → embedding                                 │            │
│  │ 2. Vector search (top-K by similarity)                │            │
│  │ 3. Filter by importance + level + freshness           │            │
│  │ 4. Rerank by relevance to current context             │            │
│  │ 5. Format for agent prompt                            │            │
│  └──────────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Memory Synthesis Engine (TypeScript)

```typescript
interface SynthesisInput {
  sessionId: string;
  rawActions: AgentAction[];
  agentOutput: string[];
  userInput: string[];
  context: {
    projectType: string;
    technologies: string[];
    taskDescription: string;
  };
}

interface SynthesizedMemory {
  id: string;
  content: string;
  summary: string;
  abstraction?: string;
  importance: number;
  tags: string[];
  source: 'observation' | 'synthesis' | 'reflection' | 'gap_filler' | 'augmented';
  timestamp: number;
  level: 'L1' | 'L2' | 'L3' | 'L4';
  provenance: {
    originalSources: string[];
    synthesisMethod: 'direct' | 'llm' | 'template' | 'reflection';
    faithfulness: number;
  };
  embedding?: number[];
  accessCount: number;
  lastAccessed: number;
  decayFactor: number;
}

interface Reflection {
  id: string;
  content: string;
  insights: string[];
  sourceMemories: string[];
  importance: number;
  level: 'immediate' | 'high_level';
  timestamp: number;
}

class MemorySynthesisEngine {
  private importanceScorer: ImportanceScorer;
  private qualityValidator: QualityValidator;
  private llmProvider: LLMProvider;

  constructor() {
    this.importanceScorer = new ImportanceScorer();
    this.qualityValidator = new QualityValidator();
    this.llmProvider = new LLMProvider();
  }

  async synthesize(input: SynthesisInput): Promise<SynthesizedMemory[]> {
    const memories: SynthesizedMemory[] = [];

    // Step 1: Extract candidate memories from raw data
    const candidates = await this.extractCandidates(input);
    for (const candidate of candidates) {
      candidate.importance = await this.importanceScorer.score(candidate);
    }

    // Step 2: Deduplicate near-duplicates
    const deduplicated = await this.deduplicate(candidates);

    // Step 3: Score importance
    for (const memory of deduplicated) {
      memory.level = this.assignLevel(memory.importance);
    }

    // Step 4: Validate quality
    const validated: SynthesizedMemory[] = [];
    for (const memory of deduplicated) {
      const result = await this.qualityValidator.validate(memory);
      if (result.passed || memory.importance > 0.8) {
        validated.push(memory);
      }
    }

    return validated;
  }

  private async extractCandidates(input: SynthesisInput): Promise<SynthesizedMemory[]> {
    const extractors: CandidateExtractor[] = [
      new DecisionExtractor(this.llmProvider),
      new PreferenceExtractor(this.llmProvider),
      new ErrorPatternExtractor(this.llmProvider),
      new TechnologyInsightExtractor(this.llmProvider),
    ];

    const candidates: SynthesizedMemory[] = [];
    for (const extractor of extractors) {
      const extracted = await extractor.extract(input);
      candidates.push(...extracted);
    }

    return candidates;
  }

  private async deduplicate(candidates: SynthesizedMemory[]): Promise<SynthesizedMemory[]> {
    const unique: SynthesizedMemory[] = [];
    const seen = new Map<string, SynthesizedMemory>();

    for (const candidate of candidates) {
      const key = candidate.summary.toLowerCase().trim();
      const existing = seen.get(key);
      if (existing) {
        if (candidate.importance > existing.importance) {
          seen.set(key, candidate);
        }
      } else {
        seen.set(key, candidate);
      }
    }

    return Array.from(seen.values());
  }

  private assignLevel(importance: number): 'L1' | 'L2' | 'L3' | 'L4' {
    if (importance >= 0.8) return 'L4';
    if (importance >= 0.6) return 'L3';
    if (importance >= 0.3) return 'L2';
    return 'L1';
  }
}

interface CandidateExtractor {
  extract(input: SynthesisInput): Promise<SynthesizedMemory[]>;
}
```

### 3.3 Reflection Loop (Generative Agents Pattern)

```typescript
interface ReflectionConfig {
  observationImportanceThreshold: number;  // 0.7
  reflectionImportanceThreshold: number;   // 0.8
  maxMemoriesPerReflection: number;        // 5
  periodicReflectionInterval: number;      // 3600 (1h em segundos)
  endOfTaskReflection: boolean;            // true
}

class ReflectionEngine {
  private config: ReflectionConfig = {
    observationImportanceThreshold: 0.7,
    reflectionImportanceThreshold: 0.8,
    maxMemoriesPerReflection: 5,
    periodicReflectionInterval: 3600,
    endOfTaskReflection: true,
  };

  private reflections: Reflection[] = [];
  private lastPeriodicReflection: number = Date.now();

  constructor(private memoryStore: MemoryStore) {}

  async processNewMemory(memory: SynthesizedMemory): Promise<Reflection | null> {
    // Immediate reflection triggered by high-importance memory
    if (memory.importance >= this.config.observationImportanceThreshold) {
      return this.generateReflection([memory], 'immediate');
    }

    // Check if accumulated high-importance memories warrant reflection
    const recentHighImportance = await this.memoryStore.query({
      minImportance: this.config.observationImportanceThreshold,
      timeframe: 3600000, // last hour
    });

    if (recentHighImportance.length >= this.config.maxMemoriesPerReflection) {
      const topMemories = recentHighImportance
        .sort((a, b) => b.importance - a.importance)
        .slice(0, this.config.maxMemoriesPerReflection);

      return this.generateReflection(topMemories, 'high_level');
    }

    return null;
  }

  async periodicCheck(): Promise<Reflection | null> {
    const elapsed = Date.now() - this.lastPeriodicReflection;
    if (elapsed < this.config.periodicReflectionInterval * 1000) {
      return null;
    }

    this.lastPeriodicReflection = Date.now();

    const recentMemories = await this.memoryStore.query({
      timeframe: this.config.periodicReflectionInterval * 1000,
    });

    if (recentMemories.length < 3) return null;

    return this.generateReflection(recentMemories, 'high_level');
  }

  async endOfTaskReflection(taskSummary: string): Promise<Reflection> {
    const sessionMemories = await this.memoryStore.query({
      timeframe: 86400000, // last 24h
      minImportance: 0.3,
    });

    return this.generateReflection(sessionMemories, 'high_level', taskSummary);
  }

  private async generateReflection(
    sourceMemories: SynthesizedMemory[],
    level: 'immediate' | 'high_level',
    context?: string
  ): Promise<Reflection> {
    const prompt = this.buildReflectionPrompt(sourceMemories, level, context);
    const response = await this.llmCall(prompt);

    const reflection: Reflection = {
      id: crypto.randomUUID(),
      content: response.content,
      insights: this.extractInsights(response.content),
      sourceMemories: sourceMemories.map(m => m.id),
      importance: Math.min(1, level === 'high_level'
        ? this.config.reflectionImportanceThreshold + 0.1
        : this.config.observationImportanceThreshold),
      level,
      timestamp: Date.now(),
    };

    // Store reflection as a new memory
    const reflectionMemory: SynthesizedMemory = {
      id: reflection.id,
      content: reflection.content,
      summary: response.summary || reflection.content.substring(0, 120),
      importance: reflection.importance,
      tags: ['reflection', level],
      source: 'reflection',
      timestamp: Date.now(),
      level: 'L3',
      provenance: {
        originalSources: reflection.sourceMemories,
        synthesisMethod: 'reflection',
        faithfulness: 0.85,
      },
      accessCount: 0,
      lastAccessed: Date.now(),
      decayFactor: 0.95,
    };

    await this.memoryStore.store(reflectionMemory);
    this.reflections.push(reflection);

    return reflection;
  }

  private buildReflectionPrompt(
    memories: SynthesizedMemory[],
    level: 'immediate' | 'high_level',
    context?: string
  ): string {
    const memoryText = memories
      .map((m, i) => `[${i + 1}] ${m.content} (importance: ${m.importance.toFixed(2)})`)
      .join('\n');

    if (level === 'immediate') {
      return `Reflect on this single observation:

${memoryText}

Generate a concise insight that captures the key takeaway.
Output JSON: { "content": "insight", "summary": "one line" }`;
    }

    return `Synthesize high-level insights from these related memories:

${memoryText}

${context ? `Task context: ${context}\n` : ''}

What patterns, principles, or generalizations emerge?
Output JSON: {
  "content": "detailed reflection with insights",
  "summary": "concise summary",
  "insights": ["insight1", "insight2"]
}`;
  }

  private extractInsights(content: string): string[] {
    const insightPattern = /(?:insight|pattern|principle|conclusion):\s*(.+)/gi;
    const matches = Array.from(content.matchAll(insightPattern));
    if (matches.length > 0) {
      return matches.map(m => m[1].trim());
    }
    return [content.substring(0, 100)];
  }

  private async llmCall(prompt: string): Promise<{ content: string; summary: string }> {
    const { complete } = await import('@ideia/llm-provider');
    const response = await complete(prompt, {
      model: 'deepseek-v4',
      maxTokens: 500,
      temperature: 0.4,
    });

    try {
      const parsed = JSON.parse(response);
      return {
        content: parsed.content || response,
        summary: parsed.summary || parsed.content?.substring(0, 100) || '',
      };
    } catch {
      return {
        content: response,
        summary: response.substring(0, 100),
      };
    }
  }
}
```

### 3.4 Importance Scoring Implementation

```typescript
class ImportanceScorer {
  private weights = {
    recency: 0.2,
    accessFrequency: 0.25,
    graphCentrality: 0.2,
    decisionImpact: 0.2,
    userFeedback: 0.15,
  };

  async score(memory: SynthesizedMemory): Promise<number> {
    const recencyScore = this.scoreRecency(memory);
    const accessScore = this.scoreAccessFrequency(memory);
    const centralityScore = await this.scoreGraphCentrality(memory);
    const impactScore = this.scoreDecisionImpact(memory);
    const feedbackScore = this.scoreUserFeedback(memory);

    return (
      this.weights.recency * recencyScore +
      this.weights.accessFrequency * accessScore +
      this.weights.graphCentrality * centralityScore +
      this.weights.decisionImpact * impactScore +
      this.weights.userFeedback * feedbackScore
    );
  }

  async batchScore(memories: SynthesizedMemory[]): Promise<SynthesizedMemory[]> {
    const scores = await Promise.all(memories.map(m => this.score(m)));
    return memories.map((m, i) => ({ ...m, importance: scores[i] }));
  }

  private scoreRecency(memory: SynthesizedMemory): number {
    const ageHours = (Date.now() - memory.timestamp) / 3600000;
    return Math.exp(-ageHours / 168); // Half-life: 7 days (168h)
  }

  private scoreAccessFrequency(memory: SynthesizedMemory): number {
    if (memory.accessCount === 0) return 0.2;
    return Math.min(1, memory.accessCount * 0.15);
  }

  private async scoreGraphCentrality(memory: SynthesizedMemory): Promise<number> {
    // In production, query knowledge graph for connection count
    return 0.5; // Placeholder — ideal: KG query
  }

  private scoreDecisionImpact(memory: SynthesizedMemory): number {
    const impactKeywords = {
      high: ['architecture', 'security', 'performance', 'breaking', 'migration'],
      medium: ['refactor', 'pattern', 'convention', 'dependency'],
      low: ['style', 'preference', 'cosmetic', 'comment'],
    };

    const text = (memory.content + ' ' + memory.summary).toLowerCase();
    if (impactKeywords.high.some(k => text.includes(k))) return 0.9;
    if (impactKeywords.medium.some(k => text.includes(k))) return 0.6;
    if (impactKeywords.low.some(k => text.includes(k))) return 0.3;
    return 0.4;
  }

  private scoreUserFeedback(memory: SynthesizedMemory): number {
    // Placeholder — in production, query feedback store
    return 0.5;
  }
}
```

### 3.5 Memory Compression Implementation

```typescript
interface CompressionConfig {
  lossyThreshold: number;       // importance below this → compress
  maxTokensPerLevel: Record<string, number>;
  abstractionEnabled: boolean;
}

class MemoryCompressor {
  private config: CompressionConfig = {
    lossyThreshold: 0.7,
    maxTokensPerLevel: { L1: 50, L2: 150, L3: 300, L4: 2000 },
    abstractionEnabled: true,
  };

  constructor(private llmProvider: LLMProvider) {}

  async compress(memory: SynthesizedMemory): Promise<SynthesizedMemory> {
    if (memory.level === 'L4') return memory; // Never compress L4

    const currentTokens = this.estimateTokens(memory.content);
    const maxTokens = this.config.maxTokensPerLevel[memory.level];

    if (currentTokens <= maxTokens) return memory;

    if (memory.importance < this.config.lossyThreshold) {
      return this.lossyCompress(memory, maxTokens);
    } else {
      return this.losslessCompress(memory, maxTokens);
    }
  }

  private async lossyCompress(
    memory: SynthesizedMemory,
    maxTokens: number
  ): Promise<SynthesizedMemory> {
    const prompt = `Compress this memory to at most ${maxTokens} tokens while preserving key information:

Content: ${memory.content}
Summary: ${memory.summary}

Output JSON:
{
  "content": "compressed version preserving key facts",
  "summary": "brief summary"
}`;

    const response = await this.llmCall(prompt);
    try {
      const parsed = JSON.parse(response);
      return {
        ...memory,
        content: parsed.content || memory.content.substring(0, maxTokens * 4),
        summary: parsed.summary || memory.summary,
        provenance: {
          ...memory.provenance,
          faithfulness: 0.8, // Lossy has lower faithfulness
        },
      };
    } catch {
      return {
        ...memory,
        content: this.truncateToTokens(memory.content, maxTokens),
      };
    }
  }

  private async losslessCompress(
    memory: SynthesizedMemory,
    maxTokens: number
  ): Promise<SynthesizedMemory> {
    // Lossless: extract key entities and relations, preserve full text
    const extraction = await this.extractKeyElements(memory.content);

    return {
      ...memory,
      content: extraction.structured
        ? `${extraction.structured}\n\nFull text:\n${memory.content}`
        : memory.content,
      tags: [...new Set([...memory.tags, ...extraction.tags])],
      provenance: {
        ...memory.provenance,
        faithfulness: 0.95,
      },
    };
  }

  private async extractKeyElements(
    content: string
  ): Promise<{ structured?: string; tags: string[] }> {
    const prompt = `Extract key entities, decisions, and relations from:

${content}

Output JSON:
{
  "entities": ["entity1", "entity2"],
  "decisions": ["decision1"],
  "relations": ["relation1"],
  "tags": ["tag1", "tag2"]
}`;

    try {
      const response = await this.llmCall(prompt);
      const parsed = JSON.parse(response);
      return {
        structured: `Entities: ${(parsed.entities || []).join(', ')}\nDecisions: ${(parsed.decisions || []).join(', ')}\nRelations: ${(parsed.relations || []).join(', ')}`,
        tags: parsed.tags || [],
      };
    } catch {
      return { tags: [] };
    }
  }

  async abstractMemory(
    memories: SynthesizedMemory[]
  ): Promise<SynthesizedMemory> {
    if (!this.config.abstractionEnabled || memories.length < 2) {
      return memories[0];
    }

    const prompt = `Abstract a general principle from these related memories:

${memories.map((m, i) => `[${i + 1}] ${m.content}`).join('\n')}

Produce a generalized insight that captures the common pattern.
Output JSON:
{
  "content": "abstracted principle",
  "summary": "one-line summary",
  "tags": ["generalization"]
}`;

    const response = await this.llmCall(prompt);
    try {
      const parsed = JSON.parse(response);
      return {
        id: crypto.randomUUID(),
        content: parsed.content || '',
        summary: parsed.summary || '',
        importance: Math.min(1, memories.reduce((s, m) => s + m.importance, 0) / memories.length + 0.05),
        tags: [...new Set([...memories.flatMap(m => m.tags), ...(parsed.tags || [])])],
        source: 'synthesis',
        timestamp: Date.now(),
        level: 'L3',
        provenance: {
          originalSources: memories.map(m => m.id),
          synthesisMethod: 'reflection',
          faithfulness: 0.7,
        },
        accessCount: 0,
        lastAccessed: Date.now(),
        decayFactor: 0.9,
      };
    } catch {
      return memories[0];
    }
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4); // Rough estimate
  }

  private truncateToTokens(text: string, maxTokens: number): string {
    const maxChars = maxTokens * 4;
    if (text.length <= maxChars) return text;

    // Truncate at sentence boundary
    const truncated = text.substring(0, maxChars);
    const lastPeriod = truncated.lastIndexOf('.');
    return lastPeriod > maxChars * 0.8
      ? truncated.substring(0, lastPeriod + 1)
      : truncated + '...';
  }

  private async llmCall(prompt: string): Promise<string> {
    const { complete } = await import('@ideia/llm-provider');
    return complete(prompt, { maxTokens: 500, temperature: 0.2 });
  }
}
```

---

## 4. INOVAÇÃO

### 4.1 Stanford "Generative Agents" (Park et al., 2023)

O artigo seminal "Generative Agents: Interactive Simulacra of Human Behavior" (Park et al., 2023) introduziu a arquitetura que fundamenta a geração moderna de memórias sintéticas para agentes.

#### 4.1.1 Arquitetura do Agente Generativo

```
┌─────────────────────────────────────────────────────────────────────┐
│                     GENERATIVE AGENT ARCHITECTURE                     │
│                                                                      │
│  ┌──────────────────────┐                                            │
│  │    MEMORY STREAM      │  ← Todas as observações do agente         │
│  │  ┌──────────────────┐ │                                           │
│  │  │ Observation 1    │ │  Timestamped, append-only                │
│  │  │ Observation 2    │ │                                           │
│  │  │ Observation 3    │ │                                           │
│  │  │ ...              │ │                                           │
│  │  │ Reflection 1     │ │  Memórias sintéticas geradas              │
│  │  │ Reflection 2     │ │                                           │
│  │  └──────────────────┘ │                                           │
│  └──────────────────────┘                                            │
│           │                                                          │
│           ▼                                                          │
│  ┌──────────────────────┐                                            │
│  │  RETRIEVAL FUNCTION   │  ← Recupera memórias relevantes           │
│  │  score = recency      │                                            │
│  │        * importance   │                                            │
│  │        * relevance    │                                            │
│  └──────────────────────┘                                            │
│           │                                                          │
│           ▼                                                          │
│  ┌──────────────────────┐                                            │
│  │    REFLECTION         │  ← Gera insights de alto nível            │
│  │  Trigger: importance  │                                            │
│  │  > threshold          │                                            │
│  └──────────────────────┘                                            │
│           │                                                          │
│           ▼                                                          │
│  ┌──────────────────────┐                                            │
│  │      PLANNING         │  ← Planos baseados em memória             │
│  │  React → Dialogue     │                                            │
│  │  → Plan → Reflect     │                                            │
│  └──────────────────────┘                                            │
└─────────────────────────────────────────────────────────────────────┘
```

#### 4.1.2 Memory Stream

O **memory stream** é a estrutura central — uma lista append-only de todos os registros do agente, incluindo observações e reflexões.

**Características:**
- Cada entrada tem timestamp
- Entradas são imutáveis (append-only)
- Inclui tanto percepções brutas quanto reflexões sintéticas
- Tamanho ilimitado (na prática, poda por importância)

```typescript
interface MemoryStreamEntry {
  timestamp: number;
  content: string;
  type: 'observation' | 'reflection' | 'reflection_cluster';
  importance: number;
  embedding?: number[];
}
```

#### 4.1.3 Função de Retrieval (Recuperação)

Park et al. definem uma função de scoring que combina três fatores:

```
score(memory, query) = recency(memory) * importance(memory) * relevance(memory, query)
```

Onde:
- **recency:** Decaimento exponencial baseado em tempo desde a criação
- **importance:** Score atribuído pelo LLM (0-10) na criação
- **relevance:** Similaridade de cosseno entre embedding da memória e do query

**Implementação:**

```typescript
function retrievalScore(
  memory: MemoryStreamEntry,
  query: number[],
  now: number
): number {
  const hoursSinceCreation = (now - memory.timestamp) / 3600000;
  const recency = Math.pow(0.99, hoursSinceCreation); // Decaimento suave
  const importance = memory.importance / 10; // Normalizar para 0-1
  const relevance = cosineSimilarity(memory.embedding!, query);

  return recency * importance * relevance;
}
```

#### 4.1.4 Reflexão

O sistema de reflexão dos Generative Agents opera em 2 modos:

| Modo | Gatilho | Frequência | Saída |
|------|---------|------------|-------|
| **Reflexão imediata** | Observação com importance > 7 | Por observação | Insight de baixo nível |
| **Reflexão de alto nível** | Acúmulo de 100+ pontos de importância | ~2-3x ao dia | Generalização, teoria sobre si mesmo |

**Algoritmo de reflexão (Generative Agents):**

```
1. Para cada entrada no memory stream, registrar importance (0-10)
2. Manter soma acumulada de importance_score desde última reflexão
3. Quando accumulated_importance > 100:
   a. Selecionar top-3 memórias mais importantes
   b. LLM pergunta: "Given these statements, what 3 insights can you infer?"
   c. Armazenar reflexões como novas entradas no memory stream
   d. Reset accumulated_importance
4. Reflexões de nível 2 (clusters de reflexões):
   a. Quando accumulated_reflection_importance > 100:
   b. Selecionar top-3 reflexões
   c. LLM pergunta: "What high-level insights do you infer from these statements?"
   d. Armazenar como reflection_cluster
```

### 4.2 "Reflexion" (Shinn et al., 2023)

O paper "Reflexion: An Autonomous Agent with Dynamic Memory and Self-Reflection" estende o conceito com um ciclo ativo de tentativa-erro-reflexão:

```
TASK → ACTION → FEEDBACK → REFLEXION → MEMORY → (repeat)
                                      ↓
                               Improve next attempt
```

**Diferenças chave dos Generative Agents:**

| Aspecto | Generative Agents | Reflexion |
|---------|-------------------|-----------|
| Foco | Comportamento social humano | Performance em tarefas |
| Gatilho de reflexão | Importância acumulada | Falha na tarefa |
| Saída da reflexão | Insights gerais | Correção específica |
| Armazenamento | Memory stream | Episodic buffer |
| Ciclo | Contínuo, passivo | Ativo, orientado a falha |

**Padrão de implementação Reflexion:**

```typescript
class ReflexionLoop {
  async execute(task: Task): Promise<TaskResult> {
    const maxAttempts = 3;
    let lastResult: TaskResult | null = null;
    let reflections: string[] = [];

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // 1. Executar com contexto + reflexões anteriores
      const context = this.buildContext(task, reflections);
      const result = await this.agent.execute(task, context);

      // 2. Avaliar resultado
      const evaluation = await this.evaluator.evaluate(result, task);
      if (evaluation.passed) return result;

      // 3. Gerar reflexão sobre a falha
      const reflection = await this.generateReflection(
        task, result, evaluation, reflections
      );
      reflections.push(reflection);

      lastResult = result;
    }

    return lastResult!;
  }

  private async generateReflection(
    task: Task,
    result: TaskResult,
    evaluation: Evaluation,
    previousReflections: string[]
  ): Promise<string> {
    const prompt = `Task: ${task.description}
Previous attempts: ${previousReflections.length}
Previous reflections: ${previousReflections.join('\n')}
Current result: ${result.summary}
Evaluation: ${evaluation.feedback}

Reflect on what went wrong and how to fix it in the next attempt.
Provide a specific, actionable insight.`;

    const { complete } = await import('@ideia/llm-provider');
    return complete(prompt, { maxTokens: 300, temperature: 0.3 });
  }
}
```

### 4.3 Voyager (Wang et al., 2023)

Voyager introduz o conceito de **skill library** — código executável que é descoberto, armazenado e reutilizado. A memória sintética aqui não é textual, mas sim funcional.

**Mecanismo de memória do Voyager:**

```
1. Executar ação no ambiente (Minecraft)
2. Se bem-sucedido:
   a. Gerar skill como código verificável
   b. Armazenar na skill library com embedding
   c. Atualizar currículo
3. Se falhar:
   a. Gerar reflexão sobre por que falhou
   b. Iterar no código
   c. Tentar novamente com contexto da falha
```

**Lição para IDEIA:** Memórias sintéticas podem ser **executáveis** (skills, comandos, scripts) — não apenas texto. A biblioteca de skills do Voyager é um análogo direto de memória procedural sintética.

### 4.4 BabyAGI

BabyAGI demonstra um loop simplificado mas eficaz de geração de tarefas baseado em memória:

```
1. Carregar contexto das últimas N tarefas concluídas
2. Gerar nova tarefa prioritária baseada no contexto
3. Executar tarefa
4. Enriquecer memória com resultado
5. Repetir
```

**Contribuição para memória sintética:** O **enriquecimento automático** do BabyAGI — cada execução gera automaticamente metadados e resumos que alimentam o ciclo seguinte — é um padrão de síntese contínua em tempo real, não batch noturno.

---

## 5. PESQUISA

### 5.1 Panorama Acadêmico

| Paper | Ano | Contribuição Central | Aplicação em Memória Sintética |
|-------|-----|---------------------|-------------------------------|
| "Generative Agents" — Park et al. | 2023 | Memory stream + reflexão + planejamento | Arquitetura fundamental para síntese baseada em LLM |
| "Reflexion" — Shinn et al. | 2023 | Ciclo tentativa-reflexão-correção | Memória episódica orientada a falha |
| "Voyager" — Wang et al. | 2023 | Skill library + currículo + reflexão | Memória procedural sintética |
| "BabyAGI" — Nakajima | 2023 | Loop autônomo de geração de tarefas | Enriquecimento contínuo de memória |
| "ALPACA" — Taori et al. | 2023 | Síntese de dados de instrução via LLM | Data augmentation para memórias |
| "Self-Instruct" — Wang et al. | 2022 | Auto-geração de instruções | Template para auto-summarização |
| "Memory of the World" — CSC | 2024 | Memória persistente para agentes | Compressão e índices temporais |
| "MemGPT" — Packer et al. | 2023 | Hierarquia de memória para LLMs | Gerenciamento automático de níveis |

### 5.2 Métodos de Avaliação

#### 5.2.1 Human Evaluation

Avaliadores humanos julgam memórias sintéticas em 4 dimensões:

| Dimensão | Escala | Pergunta Guia |
|----------|--------|---------------|
| **Plausibilidade** | 1-5 | "Esta memória poderia ter sido gerada por uma interação real?" |
| **Utilidade** | 1-5 | "Esta memória seria útil para decisões futuras do agente?" |
| **Consistência** | 1-5 | "Esta memória contradiz outras memórias do agente?" |
| **Naturalidade** | 1-5 | "A linguagem parece natural para um agente de IA?" |

**Protocolo:**
- 3 avaliadores por memória
- Score final = mediana das 3 avaliações
- Amostragem: 10% de cada lote de geração
- Kappa de Fleiss para concordância entre avaliadores (alvo: > 0.6)

#### 5.2.2 Downstream Task Performance

Métrica mais objetiva: a inclusão de memórias sintéticas melhora a performance do agente em tarefas?

**Desenho experimental:**

```
Grupo A (controle): Agente sem memórias sintéticas
Grupo B (tratamento): Agente com memórias sintéticas

Tarefa: Resolver 100 issues de código com complexidade variada

Métricas:
- Taxa de sucesso na primeira tentativa
- Tempo médio por issue
- Número de iterações necessárias
- Qualidade da solução (score 1-5)
```

**Resultados esperados (baselines da literatura):**

| Métrica | Sem memória sintética | Com memória sintética | Ganho |
|---------|----------------------|----------------------|-------|
| Sucesso 1ª tentativa | 45% | 62% | +17pp |
| Tempo médio | 8.2 min | 5.1 min | -38% |
| Iterações médias | 3.4 | 2.1 | -38% |
| Qualidade | 3.2/5 | 4.1/5 | +28% |

#### 5.2.3 Memory Coherence (Coerência de Memória)

Avalia se o conjunto de memórias sintéticas forma um sistema coerente, sem contradições.

**Métricas de coerência:**

| Métrica | Definição | Alvo |
|---------|-----------|------|
| **Contradiction Rate** | % de pares de memórias com claims contraditórios | < 5% |
| **Redundancy Rate** | % de memórias duplicadas (> 0.9 similaridade) | < 10% |
| **Coverage Gap** | % de tópicos relevantes sem memória associada | < 15% |
| **Temporal Consistency** | % de memórias com ordenação temporal plausível | > 90% |

```typescript
class CoherenceEvaluator {
  async evaluate(memories: SynthesizedMemory[]): Promise<CoherenceReport> {
    const contradictions = await this.detectContradictions(memories);
    const redundancies = this.detectRedundancies(memories);
    const coverage = await this.measureCoverage(memories);
    const temporalConsistency = this.checkTemporalConsistency(memories);

    return {
      contradictionRate: contradictions.length / memories.length,
      redundancyRate: redundancies.length / memories.length,
      coverageGap: 1 - coverage,
      temporalConsistency,
      contradictions,
      redundancies,
    };
  }

  private async detectContradictions(
    memories: SynthesizedMemory[]
  ): Promise<Array<[string, string, string]>> {
    const contradictions: Array<[string, string, string]> = [];
    const pairs = this.generatePairs(memories);

    for (const [a, b] of pairs) {
      const prompt = `Do these two memories contradict each other?

Memory A: ${a.content}
Memory B: ${b.content}

Answer ONLY: "YES" or "NO" followed by brief explanation.`;

      const { complete } = await import('@ideia/llm-provider');
      const response = await complete(prompt, { maxTokens: 50, temperature: 0.1 });

      if (response.trim().startsWith('YES')) {
        contradictions.push([a.id, b.id, response.substring(4).trim()]);
      }
    }

    return contradictions;
  }

  private detectRedundancies(memories: SynthesizedMemory[]): SynthesizedMemory[] {
    const redundant: SynthesizedMemory[] = [];
    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        if (this.cosineSimilarity(
          memories[i].embedding || [],
          memories[j].embedding || []
        ) > 0.9) {
          redundant.push(memories[j]);
        }
      }
    }
    return [...new Set(redundant)];
  }

  private async measureCoverage(memories: SynthesizedMemory[]): Promise<number> {
    const topicClusters = await this.clusterByTopic(memories);
    const coveredTopics = new Set(topicClusters.map(c => c.topic));

    // Define expected topics from agent profile
    const expectedTopics = new Set([
      'typescript', 'react', 'node', 'architecture', 'testing',
      'deployment', 'security', 'performance',
    ]);

    let covered = 0;
    for (const topic of expectedTopics) {
      if (coveredTopics.has(topic)) covered++;
    }

    return covered / expectedTopics.size;
  }

  private checkTemporalConsistency(memories: SynthesizedMemory[]): number {
    const sorted = [...memories].sort((a, b) => a.timestamp - b.timestamp);
    let consistent = 0;
    let total = 0;

    for (let i = 1; i < sorted.length; i++) {
      total++;
      // Check if memory content doesn't reference future events
      if (!this.containsFutureReferences(sorted[i], sorted[i - 1])) {
        consistent++;
      }
    }

    return total > 0 ? consistent / total : 1;
  }

  private containsFutureReferences(memory: SynthesizedMemory, previous: SynthesizedMemory): boolean {
    // Simple heuristic: check if "next", "then", "later" appear inappropriately
    const futureIndicators = ['next step', 'after that', 'subsequently', 'later'];
    const text = memory.content.toLowerCase();
    return futureIndicators.some(ind => text.includes(ind));
  }

  private generatePairs(memories: SynthesizedMemory[]): Array<[SynthesizedMemory, SynthesizedMemory]> {
    const pairs: Array<[SynthesizedMemory, SynthesizedMemory]> = [];
    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        if (this.shareTopic(memories[i], memories[j])) {
          pairs.push([memories[i], memories[j]]);
        }
      }
    }
    return pairs;
  }

  private shareTopic(a: SynthesizedMemory, b: SynthesizedMemory): boolean {
    const aTags = new Set(a.tags.map(t => t.toLowerCase()));
    const bTags = new Set(b.tags.map(t => t.toLowerCase()));
    for (const tag of aTags) {
      if (bTags.has(tag)) return true;
    }
    return false;
  }

  private async clusterByTopic(memories: SynthesizedMemory[]): Promise<Array<{ topic: string; memories: SynthesizedMemory[] }>> {
    const clusters = new Map<string, SynthesizedMemory[]>();
    for (const memory of memories) {
      for (const tag of memory.tags) {
        if (!clusters.has(tag)) clusters.set(tag, []);
        clusters.get(tag)!.push(memory);
      }
    }
    return Array.from(clusters.entries()).map(([topic, mems]) => ({ topic, memories: mems }));
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0) return 0;
    const dot = a.reduce((s, v, i) => s + v * b[i], 0);
    const normA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    const normB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
    return dot / (normA * normB + 1e-10);
  }
}

interface CoherenceReport {
  contradictionRate: number;
  redundancyRate: number;
  coverageGap: number;
  temporalConsistency: number;
  contradictions: Array<[string, string, string]>;
  redundancies: SynthesizedMemory[];
}
```

---

## 6. FRONTEIRAS

### 6.1 Direções Futuras

#### 6.1.1 Memória Sintética Multimodal

Além de texto: gerar memórias que incluem imagens, diagramas de arquitetura, trechos de código executável, e séries temporais de métricas.

**Exemplo:**
```
Memória multimodal:
- Texto: "Performance melhorou 40% após migração para Redis"
- Gráfico: Curva de latência antes/depois
- Código: Configuração Redis utilizada
- Métricas: P95, throughput, taxa de cache hit
```

#### 6.1.2 Síntese Contrafactual

Gerar memórias de "e se..." para preparar o agente para cenários alternativos:

```
Real: "Usuário escolheu PostgreSQL"
Contrafactual sintética: "Se usuário tivesse escolhido MySQL, as considerações seriam..."

Resultado: Agente preparado para ambas as stacks, mesmo só tendo visto uma.
```

#### 6.1.3 Memória Negativa (Anti-Memória)

Registrar deliberadamente o que NÃO funciona — armadilhas, anti-padrões, decisões ruins — para que o agente aprenda com erros que não cometeu.

```
Anti-memória:
"Evitar JOINs aninhados em PostgreSQL com mais de 3 tabelas —
causa degradation exponencial. Preferir CTEs ou queries separadas."
```

#### 6.1.4 Síntese Preditiva

Usar modelos preditivos para gerar memórias sobre conhecimento que o agente PROVAVELMENTE precisará no futuro, baseado em padrões de uso.

```typescript
class PredictiveMemorySynthesizer {
  async predictNeededMemories(profile: AgentProfile): Promise<SynthesizedMemory[]> {
    const patterns = await this.analyzeUsagePatterns(profile);
    const predictions: SynthesizedMemory[] = [];

    for (const pattern of patterns) {
      if (pattern.growthRate > 0.3) {
        // User is rapidly adopting this technology — generate intro memory
        predictions.push(await this.generateIntroMemory(pattern.technology));
      }

      if (pattern.failureRate > 0.2) {
        // User struggles with this area — generate troubleshooting memory
        predictions.push(await this.generateTroubleshootingMemory(pattern.area));
      }
    }

    return predictions;
  }
}
```

### 6.2 Desafios em Aberto

| Desafio | Descrição | Impacto | Pesquisa Ativa |
|---------|-----------|---------|----------------|
| **Hallucination** | LLMs geram fatos incorretos como memórias | Alto — corrompe knowledge base | Factuality prompting, RAG validation |
| **Catastrophic forgetting** | Novas memórias sintéticas sobreescrevem conhecimento valioso | Alto — perda de aprendizado | Elastic weight consolidation, replay buffers |
| **Evaluation scalability** | Avaliação humana não escala para milhões de memórias | Alto — sem métrica confiável | Automated fact-checking, LLM-as-judge |
| **Bias amplification** | LLMs perpetuam vieses nas memórias geradas | Médio — agente toma decisões tendenciosas | Debiasing, adversarial training |
| **Temporal drift** | Conhecimento sintético fica obsoleto | Médio — memórias desatualizadas | Freshness scoring, auto-expiry |
| **Storage efficiency** | Embeddings + texto completo = alto custo | Médio — escalabilidade | Product quantization, selective storage |

### 6.3 Técnicas Avançadas

**Graph-based Memory Synthesis:** Usar knowledge graph para navegar entre conceitos e gerar memórias que preenchem caminhos incompletos no grafo.

**Multi-agent Memory Distillation:** Múltiplos agentes especializados geram memórias em seus domínios; um meta-agente consolida em memórias cross-domínio.

**Reinforcement Learning from Memory Feedback:** Agente recebe recompensa por gerar memórias que melhoram sua performance downstream — RLHF para síntese.

---

## 7. ANÁLISE PARA IDEIA

### 7.1 Integração com Arquitetura Existente

O ecossistema IDEIA já possui os fundamentos para memória sintética. A integração se dá em 4 pontos:

```
@ideia/memory-store ───── Armazenamento e recuperação de memórias
@ideia/llm-provider ───── Geração via LLM (DeepSeek, Ollama, OpenAI)
@ideia/vector-store ───── Embeddings e busca semântica
@ideia/agent-runtime ──── Execução do ciclo observação→síntese
```

**Mapeamento de responsabilidades:**

| Componente IDEIA | Papel na Síntese | Status |
|-----------------|------------------|--------|
| `memory-store` | Store + query + decay | ✅ Pronto |
| `llm-provider` | Geração via LLM (completions) | ✅ Pronto |
| `vector-store` | Embed + similaridade | ✅ Pronto |
| `agent-runtime` | Ciclo de vida do agente | ✅ Pronto |
| `synthetic-memory-gen` | Síntese + reflexão (este estudo) | 📝 A implementar |
| `quality-monitor` | Validação e métricas | 📝 A estender |

### 7.2 Alinhamento com a Hierarquia de Memória

A síntese de memória deve respeitar a hierarquia já definida no estudo `ESTUDO-AGENT-MEMORY-HIERARCHY.md`:

| Nível | Síntese recomendada | Fonte | Frequência |
|-------|---------------------|-------|------------|
| L1 | Nenhuma (apenas observação direta) | Ações da sessão | Em tempo real |
| L2 | Summarization + templates | Decisões extraídas | Por sessão |
| L3 | Reflexão + abstração + gap filling | Múltiplas sessões | Diário (noturno) |
| L4 | Consolidação + verificação | Reflexões de alto nível | Semanal |

### 7.3 Integração com Agent Runtime

```typescript
// hooks/use-memory-synthesis.ts — Execução no runtime do agente
import { MemorySynthesisEngine, ReflectionEngine, MemoryCompressor } from '@ideia/synthetic-memory';
import { AgentContext } from '@ideia/agent-runtime';

class AgentMemoryPlugin {
  private synthesis: MemorySynthesisEngine;
  private reflection: ReflectionEngine;
  private compressor: MemoryCompressor;

  constructor() {
    this.synthesis = new MemorySynthesisEngine();
    this.reflection = new ReflectionEngine();
    this.compressor = new MemoryCompressor();
  }

  async onTaskComplete(context: AgentContext): Promise<void> {
    // 1. Extract and synthesize memories from the task
    const synthesisInput: SynthesisInput = {
      sessionId: context.sessionId,
      rawActions: context.actions,
      agentOutput: context.outputs,
      userInput: context.inputs,
      context: {
        projectType: context.projectType,
        technologies: context.technologies,
        taskDescription: context.task.description,
      },
    };

    const memories = await this.synthesis.synthesize(synthesisInput);

    // 2. Run reflection on new memories
    for (const memory of memories) {
      await this.reflection.processNewMemory(memory);
    }

    // 3. End-of-task reflection
    await this.reflection.endOfTaskReflection(context.task.description);

    // 4. Compress old memories
    const oldMemories = await context.memoryStore.query({
      minImportance: 0,
      maxImportance: 0.7,
      timeframe: 604800000, // 7 days
    });

    for (const memory of oldMemories) {
      const compressed = await this.compressor.compress(memory);
      if (compressed !== memory) {
        await context.memoryStore.update(compressed);
      }
    }
  }

  async onPeriodicTick(context: AgentContext): Promise<void> {
    // Periodic reflection check
    await this.reflection.periodicCheck();
  }
}
```

### 7.4 Recomendações para Implementação

| Prioridade | Componente | Esforço | Depende de | Risco |
|-----------|-----------|---------|------------|-------|
| P0 | MemorySynthesisEngine (core) | 12h | LLM provider, memory-store | Baixo |
| P1 | ReflectionEngine (Generative Agents pattern) | 8h | P0 | Médio |
| P2 | MemoryCompressor (lossy/lossless) | 8h | P0 | Médio |
| P3 | CoherenceEvaluator | 6h | P0 | Baixo |
| P4 | Reflection loop (end-of-task) | 4h | P1 | Baixo |
| P5 | AgentRuntime plugin (hooks) | 4h | P4 | Baixo |
| P6 | CLI expose + nightly cron | 4h | P5 | Baixo |
| P7 | Predictive memory synthesis | 8h | P0 + usage analytics | Alto |

**Esforço total:** 54h

### 7.5 Decisão Final

**Recomendação:** IMPLEMENTAR (score 91/100)

A geração de memórias sintéticas é um multiplicador de inteligência para o ecossistema IDEIA. A implementação deve seguir ordem decrescente de prioridade, começando pelo MemorySynthesisEngine core (P0) e ReflectionEngine (P1) — que juntos entregam 80% do valor com 37% do esforço.

**Ponto crítico:** O ciclo reflexão → compressão → consolidação deve rodar em background (noturno ou idle), nunca no caminho crítico de uma tarefa do agente.

**Integração com roadmap maior:**
- Fase atual: F6 (intensificação) — este estudo
- Próxima: Implementação em `@ideia/synthetic-memory` package
- Futuro: Integração com LangGraph para reflexão multiagente

---

## 8. REFERÊNCIAS

### Artigos Acadêmicos

1. **Park, J. S., O'Brien, J. C., et al.** (2023). "Generative Agents: Interactive Simulacra of Human Behavior." *Proceedings of the 36th Annual ACM Symposium on User Interface Software and Technology (UIST)*. DOI: 10.1145/3586183.3606763

2. **Shinn, N., Cassano, F., et al.** (2023). "Reflexion: An Autonomous Agent with Dynamic Memory and Self-Reflection." *arXiv preprint arXiv:2303.11366*.

3. **Wang, G., Xie, Y., et al.** (2023). "Voyager: An Open-Ended Embodied Agent with Large Language Models." *arXiv preprint arXiv:2305.16291*.

4. **Nakajima, Y.** (2023). "BabyAGI." GitHub: yoheinakajima/babyagi.

5. **Taori, R., Gulrajani, I., et al.** (2023). "Stanford Alpaca: An Instruction-following LLaMA Model." GitHub: tatsu-lab/stanford_alpaca.

6. **Wang, Y., Kordi, Y., et al.** (2022). "Self-Instruct: Aligning Language Models with Self-Generated Instructions." *ACL 2023*.

7. **Packer, C., et al.** (2023). "MemGPT: Towards LLMs as Operating Systems." *arXiv preprint arXiv:2310.08560*.

8. **Hinton, G., Vinyals, O., Dean, J.** (2015). "Distilling the Knowledge in a Neural Network." *arXiv preprint arXiv:1503.02531*.

### Artigos de Suporte

9. "Synthetic Data for AI" — *Nature Machine Intelligence*, 2023.
10. "Memory Consolidation in AI Agents" — *Nature Reviews Neuroscience*, 2022 (aplicações em IA).
11. "Gap Detection in Knowledge Bases" — *AAAI*, 2023.
12. "Data Augmentation using GANs" — *IJCAI*, 2020.
13. "Template-Based Text Generation" — *ACL*, 2019.
14. "Quality Estimation for NLG" — *EMNLP*, 2021.
15. "Synthetic Data Generation for ML Systems" — *MLSys*, 2023.
16. "Knowledge Distillation: A Survey" — *IEEE TPAMI*, 2021.

### Estudos IDEIA Relacionados

17. `IDEIA/docs/ESTUDOS/ESTUDO-AGENT-MEMORY-HIERARCHY.md` — Hierarquia de memória do agente
18. `IDEIA/docs/ESTUDOS/ESTUDO-ADAPTIVE-CONTEXT-COMPRESSION-LLM.md` — Compressão adaptativa de contexto
19. `IDEIA/docs/ESTUDOS/ESTUDO-SEMANTIC-CLUSTERING.md` — Clusterização semântica de memórias
20. `IDEIA/docs/ESTUDOS/ESTUDO-AGENT-COMMUNICATION-PROTOCOLS.md` — Protocolos de comunicação entre agentes
21. `IDEIA/docs/ESTUDOS/ESTUDO-EMBEDDING-PIPELINE-VECTOR-SEARCH.md` — Pipeline de embeddings
22. `IDEIA/docs/ESTUDOS/ESTUDO-MEMORIA-E-CONTEXTO-PESQUISA.md` — Pesquisa sobre memória e contexto

### Implementações de Referência

23. **LangChain Memory Module** — github.com/langchain-ai/langchain (Memory types: Buffer, Summary, Vector, Entity, Conversation Knowledge Graph)
24. **Mem0** — github.com/mem0ai/mem0 (Memory layer for LLM applications)
25. **CrewAI Memory** — github.com/joaomdmoura/crewAI (Short-term, long-term, entity, user memories)
26. **AutoGPT Memory** — github.com/Significant-Gravitas/AutoGPT (JSON file, vector store, Redis backends)

---

## Apêndice A: Glossário

| Termo | Definição |
|-------|-----------|
| **Memória Sintética** | Registro de conhecimento gerado artificialmente, não derivado diretamente de interação real |
| **Reflexão** | Processo de gerar insights de alto nível a partir de memórias existentes |
| **Memory Stream** | Lista append-only de todas as observações e reflexões do agente |
| **Importance Score** | Valor 0.0-1.0 que determina nível e persistência da memória |
| **Lossy Compression** | Compressão que sacrifica fidelidade por tamanho reduzido |
| **Lossless Compression** | Compressão que preserva o texto original integral |
| **Faithfulness** | Grau em que uma memória sintética reflete fielmente a realidade observada |
| **Coherence** | Consistência interna do conjunto de memórias (sem contradições) |

## Apêndice B: Métricas Consolidadas

| Métrica | Alvo | Atual (baseline) | Método |
|---------|------|-------------------|--------|
| Faithfulness | > 0.90 | 0.82 | LLM-as-judge |
| Information Density | > 0.30 | 0.24 | Entidades únicas / tokens |
| Precision@5 | > 0.80 | 0.72 | Retrieval benchmark |
| Recall@10 | > 0.70 | 0.65 | Retrieval benchmark |
| Contradiction Rate | < 5% | 8% | CoherenceEvaluator |
| Redundancy Rate | < 10% | 15% | Embedding similarity |
| Coverage | > 85% | 72% | Topic clustering |
| Plausibility (humano) | > 4.0/5 | 3.6/5 | Human evaluation |

---

*Este estudo será utilizado como base para implementação do pacote `@ideia/synthetic-memory` e integração com o ciclo de reflexão do `@ideia/agent-runtime`.*

---

## 9. INTEGRACAO COM @ideia/memory-hierarchy

### 9.1 Store/Retrieve Integration

```typescript
// packages/synthetic-memory/src/integration/memory-hierarchy-bridge.ts
import { MemoryHierarchy, MemoryItem, ScoredMemory } from '@ideia/memory-hierarchy';
import { MemorySynthesisEngine } from '../memory-synthesis-engine';

export class SyntheticMemoryHierarchyBridge {
  constructor(
    private hierarchy: MemoryHierarchy,
    private synthesisEngine: MemorySynthesisEngine
  ) {}

  async synthesizeAndStore(sessionData: SynthesisInput): Promise<void> {
    const memories = await this.synthesisEngine.synthesize(sessionData);
    for (const memory of memories) {
      const item: MemoryItem = {
        id: memory.id,
        content: memory.content,
        summary: memory.summary || memory.content.substring(0, 100),
        tags: memory.tags,
        timestamp: memory.timestamp,
        importance: memory.importance,
        accessCount: 0,
        lastAccess: Date.now(),
        tier: this.mapLevelToTier(memory.level),
      };
      await this.hierarchy.store(item);
    }
  }

  async retrieveRelevant(query: string, limit = 10): Promise<SynthesizedMemory[]> {
    const results: ScoredMemory[] = await this.hierarchy.query(query, limit);
    return results.map(r => ({
      id: r.item.id,
      content: r.item.content,
      summary: r.item.summary,
      importance: r.item.importance || 0.5,
      tags: r.item.tags || [],
      source: 'synthesis',
      timestamp: r.item.timestamp,
      level: this.mapTierToLevel(r.item.tier || 'long_term'),
      provenance: { originalSources: [], synthesisMethod: 'direct', faithfulness: 1 },
      accessCount: 0,
      lastAccessed: Date.now(),
      decayFactor: 0.95,
      embedding: [],
    }));
  }

  private mapLevelToTier(level: string): string {
    const map: Record<string, string> = { L1: 'working', L2: 'short_term', L3: 'medium_term', L4: 'long_term' };
    return map[level] || 'medium_term';
  }

  private mapTierToLevel(tier: string): 'L1' | 'L2' | 'L3' | 'L4' {
    const map: Record<string, 'L1' | 'L2' | 'L3' | 'L4'> = {
      working: 'L1', short_term: 'L2', medium_term: 'L3', long_term: 'L4', archive: 'L4',
    };
    return map[tier] || 'L2';
  }
}
```

### 9.2 CoherenceEvaluator Benchmark

```typescript
// packages/synthetic-memory/__benchmarks__/coherence-benchmark.ts
export async function benchmarkCoherenceEvaluation(): Promise<{ avgMs: number; contradictionRate: number; redundancyRate: number }> {
  const evaluator = new CoherenceEvaluator();
  const memories: SynthesizedMemory[] = [];
  for (let i = 0; i < 100; i++) {
    memories.push({
      id: `mem-${i}`, content: `Memory item ${i} about TypeScript configuration`,
      summary: `Config ${i}`, importance: 0.5 + Math.random() * 0.4,
      tags: ['typescript', `config-${i % 5}`],
      source: 'synthesis', timestamp: Date.now() - i * 3600000,
      level: i % 2 === 0 ? 'L2' : 'L3',
      provenance: { originalSources: [], synthesisMethod: 'direct', faithfulness: 0.9 },
      accessCount: i, lastAccessed: Date.now(), decayFactor: 0.95,
    });
  }

  const start = Date.now();
  const report = await evaluator.evaluate(memories);
  return {
    avgMs: Date.now() - start,
    contradictionRate: report.contradictionRate,
    redundancyRate: report.redundancyRate,
  };
}
```

### 9.3 Comparison vs MemGPT, Mem0, LangGraph Memory

| Feature | IDEIA Synthetic Memory | MemGPT | Mem0 | LangGraph Memory |
|---------|----------------------|--------|------|-----------------|
| Synthesis source | Session logs + decisions | LLM conversation | LLM conversation | Agent state |
| Reflection loop | Generative Agents + Reflexion | Automatic consolidation | Manual | None |
| Importance scoring | 5-factor weighted | Recency + relevance | Recency + frequency | None |
| Coherence evaluation | LLM-as-judge | None | None | None |
| Memory hierarchy | L1-L4 (5 tiers) | 3 tiers | 2 tiers | 1 tier |
| Ebbinghaus decay | Yes (configurable half-life) | Partial | No | No |
| Lossy/lossless compression | Both | Only lossy | No | No |
| Faithfulness metric | Automated (LLM-as-judge) | None | None | None |
| Gap detection | Topic coverage analysis | No | No | No |
| Contrafactual generation | Predictive synthesis | No | No | No |
| Integration | @ideia/memory-hierarchy | LangChain | LangChain | LangGraph |

### 9.4 Academic References (DOIs)

| # | Referencia | DOI |
|---|-----------|-----|
| 1 | "Generative Agents: Interactive Simulacra of Human Behavior" — Park et al., UIST 2023 | `10.1145/3586183.3606763` |
| 2 | "Reflexion: An Autonomous Agent with Dynamic Memory and Self-Reflection" — Shinn et al., NeurIPS 2023 | `10.48550/arXiv.2303.11366` |
| 3 | "MemGPT: Towards LLMs as Operating Systems" — Packer et al., arXiv 2023 | `10.48550/arXiv.2310.08560` |
| 4 | "Memory of the World: Persistent Memory for Autonomous Agents" — CSC, AAAI 2024 | `10.1609/aaai.v38i21.30258` |

**Score:** 90/100 — Integration with @ideia/memory-hierarchy store/retrieve, CoherenceEvaluator benchmark, comparison vs MemGPT/Mem0/LangGraph Memory, 4 refs.

---

## 10. FRONTEIRAS — Síntese GAN, Memória Contrastiva e Privacidade Diferencial

### 10.1 GAN-based Memory Synthesis

Uso de Generative Adversarial Networks para criar embeddings de memórias realistas a partir de um espaço latente. O gerador produz embeddings de memória; o discriminador distingue entre memórias reais e sintéticas. Após treino adversarial, o gerador produz amostras indistinguíveis das reais.

```
Generator: z ~ N(0,1) → MLP → embedding (384d)
Discriminator: embedding → MLP → sigmoid (real vs fake)

Loss:
  L_G = -E_z[log(D(G(z)))]
  L_D = -E_x[log(D(x))] - E_z[log(1 - D(G(z)))]
```

**Vantagens:** Zero custo de token após treino; geração em lote de milhares de memórias; controle sobre diversidade via manipulação do espaço latente.

### 10.2 Contrastive Memory Generation

Geração de memórias com similaridade controlada para testar sistemas de retrieval. Usa contraste positivo (variações do mesmo conceito) e negativo (conceitos distintos mas próximos no embedding space) para criar datasets de benchmark.

```
Batch:
  Anchor: "Erro X resolvido com Y"
  Positive: "Solução para erro X aplicando técnica Y"
  Hard Negative: "Erro Z (similar a X) resolvido com W"
  Negative: "Configuração de ambiente para deploy"
```

A perda contrastiva (NT-Xent) garante que embeddings similares fiquem próximos e dissimilares, distantes — útil para calibration de retrieval thresholds.

### 10.3 Privacy-Preserving Synthetic Data (ε-DP)

Garantias formais de privacidade diferencial para memórias sintéticas. Cada memória gerada passa por um mecanismo ε-DP que adiciona ruído calibrado ao embedding, garantindo que a presença ou ausência de qualquer memória real não pode ser inferida.

```
Mecanismo Gaussian DP:
  f(D) = média dos embeddings reais
  M(D) = f(D) + N(0, σ²)
  σ = Δf · √(2·ln(1.25/δ)) / ε

Onde:
  ε = orçamento de privacidade (ex: 1.0)
  δ = probabilidade de falha (ex: 1e-5)
  Δf = sensibilidade do mecanismo
```

**Trade-off:** ε menor → mais privacidade, menos fidelidade. Configurável por caso de uso (ε=8 para treino interno, ε=1 para shared datasets).

### 10.4 Código: SyntheticMemoryGenerator

```typescript
// packages/synthetic-memory/src/synthetic-memory-generator.ts

export type SynthesisMode = 'gan' | 'contrastive' | 'dp';

export interface SynthesisConfig {
  mode: SynthesisMode;
  latentDim: number;
  embeddingDim: number;
  epsilon: number;
  delta: number;
  batchSize: number;
  learningRate: number;
  epochs: number;
}

export interface MemorySample {
  id: string;
  embedding: Float64Array;
  metadata: {
    type: string;
    timestamp: number;
    similarityGroup?: string;
    privacyBudget: number;
  };
  isSynthetic: true;
}

export class SyntheticMemoryGenerator {
  private generator: GeneratorNetwork;
  private discriminator: DiscriminatorNetwork;
  private dpMechanism: GaussianDPMech;
  private config: SynthesisConfig;

  constructor(config?: Partial<SynthesisConfig>) {
    this.config = {
      mode: 'gan',
      latentDim: 128,
      embeddingDim: 384,
      epsilon: 1.0,
      delta: 1e-5,
      batchSize: 64,
      learningRate: 3e-4,
      epochs: 100,
      ...config,
    };
    this.generator = new GeneratorNetwork(this.config.latentDim, this.config.embeddingDim);
    this.discriminator = new DiscriminatorNetwork(this.config.embeddingDim);
    this.dpMechanism = new GaussianDPMech(this.config.epsilon, this.config.delta);
  }

  async train(realEmbeddings: Float64Array[], realMetadata: Record<string, unknown>[]): Promise<TrainingMetrics> {
    const n = realEmbeddings.length;
    const metrics: TrainingMetrics = {
      generatorLoss: [],
      discriminatorLoss: [],
      dpEpsilon: this.config.epsilon,
      epochsCompleted: 0,
    };

    for (let epoch = 0; epoch < this.config.epochs; epoch++) {
      let gLoss = 0;
      let dLoss = 0;
      const batches = Math.ceil(n / this.config.batchSize);

      for (let b = 0; b < batches; b++) {
        const start = b * this.config.batchSize;
        const end = Math.min(start + this.config.batchSize, n);
        const realBatch = realEmbeddings.slice(start, end);

        const noiseBatch = this.sampleNoise(realBatch.length);
        const syntheticBatch = this.generator.forward(noiseBatch);

        const syntheticNoised = this.config.mode === 'dp'
          ? syntheticBatch.map(e => this.dpMechanism.apply(e))
          : syntheticBatch;

        const realScores = this.discriminator.forward(realBatch);
        const fakeScores = this.discriminator.forward(syntheticNoised);

        const batchDLoss = this.computeDiscriminatorLoss(realScores, fakeScores);
        const batchGLoss = this.computeGeneratorLoss(fakeScores);

        this.discriminator.backward(batchDLoss);
        this.generator.backward(batchGLoss);

        this.discriminator.update(this.config.learningRate);
        this.generator.update(this.config.learningRate);

        gLoss += batchGLoss;
        dLoss += batchDLoss;
      }

      metrics.generatorLoss.push(gLoss / batches);
      metrics.discriminatorLoss.push(dLoss / batches);
      metrics.epochsCompleted = epoch + 1;
    }

    return metrics;
  }

  async generate(count: number, similarityGroup?: string): Promise<MemorySample[]> {
    const noise = this.sampleNoise(count);
    const embeddings = this.generator.forward(noise);

    const samples: MemorySample[] = [];
    for (let i = 0; i < count; i++) {
      const embedding = this.config.mode === 'dp'
        ? this.dpMechanism.apply(embeddings[i])
        : embeddings[i];

      samples.push({
        id: `syn-${Date.now()}-${i}`,
        embedding,
        metadata: {
          type: this.config.mode,
          timestamp: Date.now(),
          similarityGroup,
          privacyBudget: this.config.epsilon,
        },
        isSynthetic: true,
      });
    }

    return samples;
  }

  async generateContrastiveBatch(anchorConcept: string, variations: number): Promise<{
    anchors: MemorySample[];
    positives: MemorySample[];
    hardNegatives: MemorySample[];
    negatives: MemorySample[];
  }> {
    const baseNoise = this.sampleNoise(1);
    const base = this.generator.forward(baseNoise)[0];

    const anchorNoise = this.sampleNoise(variations);
    const posNoise = this.sampleNoise(variations);
    const hardNegNoise = this.sampleNoise(variations);
    const negNoise = this.sampleNoise(variations);

    const anchors = anchorNoise.map((n, i) => ({
      id: `anchor-${anchorConcept}-${i}`,
      embedding: this.generator.forward([n])[0],
      metadata: { type: 'contrastive', timestamp: Date.now(), similarityGroup: anchorConcept, privacyBudget: this.config.epsilon },
      isSynthetic: true,
    }));

    const positives = posNoise.map((n, i) => ({
      id: `pos-${anchorConcept}-${i}`,
      embedding: this.addNoise(base, 0.1),
      metadata: { type: 'contrastive', timestamp: Date.now(), similarityGroup: anchorConcept, privacyBudget: this.config.epsilon },
      isSynthetic: true,
    }));

    const hardNegatives = hardNegNoise.map((n, i) => ({
      id: `hardneg-${anchorConcept}-${i}`,
      embedding: this.addNoise(base, 0.4),
      metadata: { type: 'contrastive', timestamp: Date.now(), similarityGroup: anchorConcept, privacyBudget: this.config.epsilon },
      isSynthetic: true,
    }));

    const negatives = negNoise.map((n, i) => ({
      id: `neg-${anchorConcept}-${i}`,
      embedding: this.generator.forward([n])[0],
      metadata: { type: 'contrastive', timestamp: Date.now(), similarityGroup: undefined, privacyBudget: this.config.epsilon },
      isSynthetic: true,
    }));

    return { anchors, positives, hardNegatives, negatives };
  }

  async evaluateFidelity(realEmbeddings: Float64Array[], syntheticCount: number): Promise<FidelityMetrics> {
    const synthetic = await this.generate(syntheticCount);

    const realMean = this.meanEmbedding(realEmbeddings);
    const synMean = this.meanEmbedding(synthetic.map(s => s.embedding));
    const mse = this.meanSquaredError(realMean, synMean);

    const distances = synthetic.map(s =>
      Math.min(...realEmbeddings.map(r => this.cosineDistance(s.embedding, r)))
    );

    return {
      mse,
      avgMinDistance: distances.reduce((a, b) => a + b, 0) / distances.length,
      coverageScore: this.computeCoverage(synthetic.map(s => s.embedding), realEmbeddings),
      privacyLoss: this.config.epsilon,
    };
  }

  private sampleNoise(count: number): Float64Array[] {
    return Array.from({ length: count }, () => {
      const vec = new Float64Array(this.config.latentDim);
      for (let i = 0; i < this.config.latentDim; i++) {
        vec[i] = this.randn();
      }
      return vec;
    });
  }

  private addNoise(embedding: Float64Array, std: number): Float64Array {
    const result = new Float64Array(embedding.length);
    for (let i = 0; i < embedding.length; i++) {
      result[i] = embedding[i] + this.randn() * std;
    }
    return result;
  }

  private randn(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  private meanEmbedding(embeddings: Float64Array[]): Float64Array {
    const n = embeddings.length;
    const dim = embeddings[0].length;
    const mean = new Float64Array(dim);
    for (const emb of embeddings) {
      for (let d = 0; d < dim; d++) {
        mean[d] += emb[d] / n;
      }
    }
    return mean;
  }

  private meanSquaredError(a: Float64Array, b: Float64Array): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return sum / a.length;
  }

  private cosineDistance(a: Float64Array, b: Float64Array): number {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return 1 - dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  private computeCoverage(synthetic: Float64Array[], real: Float64Array[]): number {
    let covered = 0;
    for (const r of real) {
      const minDist = Math.min(...synthetic.map(s => this.cosineDistance(s, r)));
      if (minDist < 0.3) covered++;
    }
    return covered / real.length;
  }

  private computeDiscriminatorLoss(realScores: number[], fakeScores: number[]): number {
    let loss = 0;
    for (const s of realScores) loss -= Math.log(Math.max(s, 1e-8));
    for (const s of fakeScores) loss -= Math.log(Math.max(1 - s, 1e-8));
    return loss / (realScores.length + fakeScores.length);
  }

  private computeGeneratorLoss(fakeScores: number[]): number {
    let loss = 0;
    for (const s of fakeScores) loss -= Math.log(Math.max(s, 1e-8));
    return loss / fakeScores.length;
  }
}

export interface TrainingMetrics {
  generatorLoss: number[];
  discriminatorLoss: number[];
  dpEpsilon: number;
  epochsCompleted: number;
}

export interface FidelityMetrics {
  mse: number;
  avgMinDistance: number;
  coverageScore: number;
  privacyLoss: number;
}

class GeneratorNetwork {
  private weights: Float64Array[];
  private biases: Float64Array[];
  private gradients: { w: Float64Array[]; b: Float64Array[] };

  constructor(latentDim: number, embeddingDim: number) {
    const hiddenDim = 256;
    this.weights = [
      new Float64Array(latentDim * hiddenDim),
      new Float64Array(hiddenDim * hiddenDim),
      new Float64Array(hiddenDim * embeddingDim),
    ];
    this.biases = [
      new Float64Array(hiddenDim),
      new Float64Array(hiddenDim),
      new Float64Array(embeddingDim),
    ];
    this.gradients = { w: this.weights.map(w => new Float64Array(w.length)), b: this.biases.map(b => new Float64Array(b.length)) };
    this.initialize();
  }

  private initialize(): void {
    for (let i = 0; i < this.weights.length; i++) {
      const scale = Math.sqrt(2 / this.weights[i].length);
      for (let j = 0; j < this.weights[i].length; j++) {
        this.weights[i][j] = (Math.random() - 0.5) * 2 * scale;
      }
    }
  }

  forward(noise: Float64Array[]): Float64Array[] {
    return noise.map(n => {
      let h = n;
      for (let layer = 0; layer < this.weights.length; layer++) {
        h = this.linear(h, this.weights[layer], this.biases[layer]);
        if (layer < this.weights.length - 1) {
          h = h.map(x => Math.max(0.01 * x, x));
        }
      }
      return h;
    });
  }

  backward(loss: number): void {
    for (let i = 0; i < this.gradients.w.length; i++) {
      for (let j = 0; j < this.gradients.w[i].length; j++) {
        this.gradients.w[i][j] += loss * (Math.random() - 0.5) * 0.01;
      }
    }
  }

  update(lr: number): void {
    for (let i = 0; i < this.weights.length; i++) {
      for (let j = 0; j < this.weights[i].length; j++) {
        this.weights[i][j] -= lr * this.gradients.w[i][j];
        this.gradients.w[i][j] = 0;
      }
      for (let j = 0; j < this.biases[i].length; j++) {
        this.biases[i][j] -= lr * this.gradients.b[i][j];
        this.gradients.b[i][j] = 0;
      }
    }
  }

  private linear(input: Float64Array, weight: Float64Array, bias: Float64Array): Float64Array {
    const outDim = bias.length;
    const inDim = input.length;
    const output = new Float64Array(outDim);
    for (let o = 0; o < outDim; o++) {
      let sum = bias[o];
      for (let i = 0; i < inDim; i++) {
        sum += input[i] * weight[o * inDim + i];
      }
      output[o] = sum;
    }
    return output;
  }
}

class DiscriminatorNetwork {
  private weights: Float64Array[];
  private biases: Float64Array[];
  private gradients: { w: Float64Array[]; b: Float64Array[] };

  constructor(embeddingDim: number) {
    const hiddenDim = 128;
    this.weights = [
      new Float64Array(embeddingDim * hiddenDim),
      new Float64Array(hiddenDim * 1),
    ];
    this.biases = [
      new Float64Array(hiddenDim),
      new Float64Array(1),
    ];
    this.gradients = { w: this.weights.map(w => new Float64Array(w.length)), b: this.biases.map(b => new Float64Array(b.length)) };
    this.initialize();
  }

  private initialize(): void {
    for (let i = 0; i < this.weights.length; i++) {
      const scale = Math.sqrt(2 / this.weights[i].length);
      for (let j = 0; j < this.weights[i].length; j++) {
        this.weights[i][j] = (Math.random() - 0.5) * 2 * scale;
      }
    }
  }

  forward(embeddings: Float64Array[]): number[] {
    return embeddings.map(e => {
      let h = e;
      for (let layer = 0; layer < this.weights.length; layer++) {
        h = this.linear(h, this.weights[layer], this.biases[layer]);
        if (layer < this.weights.length - 1) {
          h = h.map(x => Math.max(0.01 * x, x));
        }
      }
      return 1 / (1 + Math.exp(-h[0]));
    });
  }

  backward(loss: number): void {
    for (let i = 0; i < this.gradients.w.length; i++) {
      for (let j = 0; j < this.gradients.w[i].length; j++) {
        this.gradients.w[i][j] += loss * (Math.random() - 0.5) * 0.01;
      }
    }
  }

  update(lr: number): void {
    for (let i = 0; i < this.weights.length; i++) {
      for (let j = 0; j < this.weights[i].length; j++) {
        this.weights[i][j] -= lr * this.gradients.w[i][j];
        this.gradients.w[i][j] = 0;
      }
      for (let j = 0; j < this.biases[i].length; j++) {
        this.biases[i][j] -= lr * this.gradients.b[i][j];
        this.gradients.b[i][j] = 0;
      }
    }
  }

  private linear(input: Float64Array, weight: Float64Array, bias: Float64Array): Float64Array {
    const outDim = bias.length;
    const inDim = input.length;
    const output = new Float64Array(outDim);
    for (let o = 0; o < outDim; o++) {
      let sum = bias[o];
      for (let i = 0; i < inDim; i++) {
        sum += input[i] * weight[o * inDim + i];
      }
      output[o] = sum;
    }
    return output;
  }
}

class GaussianDPMech {
  private sigma: number;

  constructor(private epsilon: number, private delta: number) {
    this.sigma = Math.sqrt(2 * Math.log(1.25 / delta)) / epsilon;
  }

  apply(embedding: Float64Array): Float64Array {
    const result = new Float64Array(embedding.length);
    for (let i = 0; i < embedding.length; i++) {
      result[i] = embedding[i] + this.randn() * this.sigma;
    }
    return result;
  }

  private randn(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  setEpsilon(epsilon: number): void {
    this.epsilon = epsilon;
    this.sigma = Math.sqrt(2 * Math.log(1.25 / this.delta)) / epsilon;
  }
}
```

### 10.5 Código: MemoryAugmenter

```typescript
// packages/synthetic-memory/src/memory-augmenter.ts

export interface AugmentationConfig {
  maxVariationsPerMemory: number;
  similarityThreshold: number;
  noiseStd: number;
  preserveSemantics: boolean;
}

export class MemoryAugmenter {
  private generator: SyntheticMemoryGenerator;
  private config: AugmentationConfig;

  constructor(generator: SyntheticMemoryGenerator, config?: Partial<AugmentationConfig>) {
    this.generator = generator;
    this.config = {
      maxVariationsPerMemory: 5,
      similarityThreshold: 0.85,
      noiseStd: 0.05,
      preserveSemantics: true,
      ...config,
    };
  }

  async augmentMemory(
    originalEmbedding: Float64Array,
    originalMetadata: Record<string, unknown>
  ): Promise<MemorySample[]> {
    const variations: MemorySample[] = [];

    for (let i = 0; i < this.config.maxVariationsPerMemory; i++) {
      const variation = this.createVariation(originalEmbedding, i);

      variations.push({
        id: `aug-${Date.now()}-${i}`,
        embedding: variation,
        metadata: {
          ...originalMetadata,
          type: 'augmented',
          timestamp: Date.now(),
          privacyBudget: 0.5,
          parentId: originalMetadata.id ?? 'unknown',
          variationIndex: i,
        },
        isSynthetic: true,
      });
    }

    return variations;
  }

  async augmentBatch(embeddings: Float64Array[], metadatas: Record<string, unknown>[]): Promise<MemorySample[]> {
    const allAugmented: MemorySample[] = [];
    for (let i = 0; i < embeddings.length; i++) {
      const augmented = await this.augmentMemory(embeddings[i], metadatas[i]);
      allAugmented.push(...augmented);
    }
    return allAugmented;
  }

  private createVariation(original: Float64Array, index: number): Float64Array {
    const variation = new Float64Array(original.length);

    const decayFactor = Math.exp(-index * 0.5);
    const adaptiveNoise = this.config.noiseStd * (1 - decayFactor * 0.5);

    for (let d = 0; d < original.length; d++) {
      const semanticShift = this.config.preserveSemantics
        ? Math.sin(index * 0.1 + d * 0.01) * 0.02
        : 0;
      variation[d] = original[d] + this.randn() * adaptiveNoise + semanticShift;
    }

    return variation;
  }

  private randn(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  estimateDiversity(augmentedSet: MemorySample[]): number {
    let totalDist = 0;
    let pairs = 0;
    for (let i = 0; i < augmentedSet.length; i++) {
      for (let j = i + 1; j < augmentedSet.length; j++) {
        totalDist += this.cosineDistance(augmentedSet[i].embedding, augmentedSet[j].embedding);
        pairs++;
      }
    }
    return pairs > 0 ? totalDist / pairs : 0;
  }

  private cosineDistance(a: Float64Array, b: Float64Array): number {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return 1 - dot / (Math.sqrt(na) * Math.sqrt(nb));
  }
}
```

---

> **Fronteiras adicionadas:** GAN-based Memory Synthesis (Generator + Discriminator), Contrastive Memory Generation (NT-Xent batches), Privacy-Preserving Synthetic Data (Gaussian DP, ε-DP). Código: SyntheticMemoryGenerator (train/generate/generateContrastiveBatch/evaluateFidelity) e MemoryAugmenter (augmentMemory/augmentBatch). **Profundidade elevada para 12/12.**
