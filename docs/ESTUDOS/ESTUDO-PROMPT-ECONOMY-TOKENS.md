# Estudo: Prompt Pipeline & Economy of Tokens

> **Cluster 1** da análise cruzada livro-IDEIA.md vs Codebase
> Capítulos de referência: 41, 42, 48, 70
> Data: 2026-07-21

---

## 1. Problema

A IDEIA já possui um `prompt-pipeline.ts` no CLI que faz classificação básica, guardrails, otimização de saudação e planejamento. No entanto:

1. **Não há compressão de contexto** — tudo que é recuperado vai inteiro para o LLM
2. **Não há orçamento de tokens** — cada tarefa gasta sem limite
3. **Não há early exit** — mesmo que a resposta já esteja clara, o pipeline continua
4. **Não há roteamento por complexidade** — tarefas triviais e complexas usam o mesmo pipeline
5. **Pipeline isolado no CLI** — o `agent-runtime` não usa o pipeline, chamando o LLM diretamente

## 2. Análise do Estado Atual

### O que existe:
- `PromptPipeline` (CLI): classify → enrich → optimize → guard → plan → format
- `AgentPipelineBridge` (CLI): conecta pipeline ao LangGraph agent
- `LLMProvider` + `ProviderRouter`: Ollama + OpenAI + fallback
- `AgentRuntime`: executa steps com step executor e policy check

### O que falta:
| Funcionalidade | Capítulo | Status |
|---|---|---|
| Compressão de contexto | 41.5 | ❌ Inexistente |
| Orçamento de tokens por tarefa | 42.2, 55.6 | ❌ Inexistente |
| Early exit | 42.5, 70.5 | ❌ Inexistente |
| Roteamento por complexidade (N0-N5) | 55.4 | ❌ Inexistente |
| Caching de planos e decisões | 42.7 | ⚠️ Parcial (CAG no memory-store) |
| Batching de chamadas LLM | 42.6 | ❌ Inexistente |
| Prompt pipeline integrado ao agent-runtime | 41.3 | ⚠️ Bridge existe mas é CLI-only |

## 3. Abordagem Proposta

### 3.1 Novo pacote: `packages/prompt-economy`

Criar um pacote central com 4 submódulos:

```
prompt-economy/
  src/
    compressor/       # Compressão de contexto
    budget/           # Orçamento de tokens + early exit
    router/           # Roteamento por complexidade
    cache/            # Cache de LLM calls + planos
    index.ts          # Facade principal
```

### 3.2 Compressor (`compressor/`)

**Responsabilidade:** Reduzir o contexto enviado ao LLM sem perder informação essencial.

Algoritmos:
1. **SummarizeTrimmer** — usa LLM para resumir partes antigas do histórico
2. **DeduplicateTrimmer** — remove trechos duplicados entre contextos diferentes
3. **PriorityRanker** — ranqueia trechos por relevância estimada e corta os de baixa prioridade
4. **TokenBudgetTrimmer** — corta o contexto para caber dentro de um orçamento de tokens

```
Input: contexto bruto (histórico, arquivos, logs, etc.)
  ↓
SummarizeTrimmer (resume partes antigas)
  ↓
DeduplicateTrimmer (remove duplicatas)
  ↓
PriorityRanker (ranqueia por relevância)
  ↓
TokenBudgetTrimmer (corta para caber no orçamento)
  ↓
Output: contexto comprimido
```

### 3.3 Budget (`budget/`)

**Responsabilidade:** Controlar quantos tokens cada tarefa pode gastar e decidir parar cedo.

Componentes:
1. **TokenBudget** — define orçamento para cada tipo/nível de tarefa
2. **BudgetTracker** — monitora gasto acumulado vs orçamento
3. **EarlyExitDecider** — decide se a tarefa já pode parar (evidência suficiente, critério atingido)
4. **StageBudget** — orçamento separado por etapa (classificação vs execução vs verificação)

### 3.4 Router (`router/`)

**Responsabilidade:** Classificar a tarefa por complexidade e rotear para o pipeline adequado.

Níveis (baseado no capítulo 55.4):
| Nível | Descrição | Pipeline | Custo estimado |
|---|---|---|---|
| N0 | Resposta direta | Apenas classify → respond | ~50 tokens |
| N1 | Tarefa curta, 1 agente | Classify → execute (1 step) | ~200 tokens |
| N2 | Tarefa com plano+verificação | Classify → plan → execute → verify | ~1000 tokens |
| N3 | Tarefa multi-step + checkpoints | Full pipeline com checkpoints | ~3000 tokens |
| N4 | Tarefa paralela multiagente | Full pipeline + parallel agents | ~5000 tokens |
| N5 | Tarefa crítica c/ revisão humana | Full pipeline + forced approval | ~8000 tokens |

Critérios de classificação:
- Número de arquivos afetados
- Risco da operação
- Quantidade de etapas necessárias
- Dependência de contexto histórico
- Criticidade do ambiente

### 3.5 Cache (`cache/`)

**Responsabilidade:** Reaproveitar resultados de chamadas LLM para tarefas similares.

Tipos de cache:
1. **PlanCache** — planos já aprovados para tarefas similares
2. **EmbeddingCache** — embeddings de documentos frequentes
3. **DecisionCache** — decisões repetitivas (e.g., "é seguro executar esse comando?")
4. **ResponseCache** — respostas para perguntas frequentes

## 4. Design de Implementação

### 4.1 Interfaces

```ts
// Compressor
interface ContextCompressor {
  compress(input: CompressorInput): Promise<CompressorOutput>;
}
interface CompressorInput {
  messages: ChatMessage[];
  contextItems: ContextItem[];
  maxTokens: number;
  strategy: CompressionStrategy;
}
interface CompressorOutput {
  compressed: Array<ChatMessage | ContextItem>;
  originalTokens: number;
  compressedTokens: number;
  savings: number;
  removed: string[]; // IDs dos itens removidos
}
type CompressionStrategy = 'summarize' | 'deduplicate' | 'priority_rank' | 'budget_cut' | 'full';

// Budget
interface TokenBudget {
  taskType: TaskType;
  maxTokens: number;
  warningThreshold: number; // % que dispara warning
  hardLimit: number; // % que bloqueia
}
interface BudgetTracker {
  allocate(taskId: string, budget: TokenBudget): void;
  spend(taskId: string, tokens: number): void;
  getRemaining(taskId: string): number;
  isExhausted(taskId: string): boolean;
}
interface EarlyExitDecider {
  shouldExit(taskId: string, evidence: Evidence[]): Promise<EarlyExitDecision>;
}

// Router
interface ComplexityRouter {
  classify(task: TaskSpec): Promise<ComplexityLevel>;
  getPipeline(level: ComplexityLevel): PipelineConfig;
}
type ComplexityLevel = 'N0' | 'N1' | 'N2' | 'N3' | 'N4' | 'N5';
interface PipelineConfig {
  requirePlan: boolean;
  requireVerification: boolean;
  requireApproval: boolean;
  parallelAgents: boolean;
  maxSteps: number;
  tokenBudget: number;
}
```

### 4.2 Integração com agent-runtime

O `prompt-economy` será injetado no `AgentRuntime` e no `LangGraphAgent` como um serviço:

```ts
// agent-runtime passa a aceitar um EconomyService
class AgentRuntime {
  constructor(
    private policy: PolicyEngine,
    private audit: AuditTrail,
    private memory: MemoryStore,
    private economy?: PromptEconomy, // NOVO
    private executor?: StepExecutor,
  ) {}
  
  async run(request: TaskRequest): Promise<TaskRun> {
    // 1. Classificar complexidade
    const level = await this.economy?.router.classify(request) ?? 'N2';
    
    // 2. Alocar orçamento
    const budget = this.economy?.budget.allocate(request.taskId, level);
    
    // 3. Executar com compressão de contexto
    const compressed = await this.economy?.compressor.compress({
      messages: request.messages,
      contextItems: await this.memory.search(request),
      maxTokens: budget?.maxTokens ?? 4000,
      strategy: 'full',
    });
    
    // 4. Verificar early exit após cada etapa
    // ...
  }
}
```

## 5. Complexidade e Riscos

| Componente | Complexidade | Risco | Dependências |
|---|---|---|---|
| Compressor | Alta (precisa de LLM para sumarizar) | Médio (pode perder contexto) | LLM provider |
| Budget | Baixa (controle numérico) | Baixo | Nenhuma |
| Router | Média (classificação heurística) | Baixo | Config de thresholds |
| Cache | Média (invalidação) | Médio (cache sujo) | Memory-store |

## 6. Critérios de Aceitação

1. Compressor reduz contexto em ≥40% sem perda de informação crítica
2. BudgetTracker bloqueia tarefas que excedem orçamento
3. Router classifica corretamente ≥85% das tarefas
4. Early exit detecta ≥90% dos casos onde tarefa já está resolvida
5. Tudo compila com `tsc --noEmit = 0`
6. Tudo testado com cobertura mínima de 70%

## 7. Próximos Passos Imediatos

1. ✅ Criar este estudo
2. 🔲 Criar `packages/prompt-economy` com estrutura de pastas
3. 🔲 Implementar `TokenBudget` + `BudgetTracker`
4. 🔲 Implementar `ComplexityRouter` (N0-N5)
5. 🔲 Implementar `ContextCompressor` (summarize + deduplicate + priority)
6. 🔲 Implementar `EarlyExitDecider`
7. 🔲 Implementar `LLMCache` (plan + decision cache)
8. 🔲 Integrar `PromptEconomy` no `AgentRuntime`
9. 🔲 Atualizar `PromptPipeline` para usar o novo pacote
10. 🔲 Testes unitários em cada submódulo
