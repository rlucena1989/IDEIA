# Estudo: Context Builder & Composition Engine

> **Cluster 2** da análise cruzada livro-IDEIA.md vs Codebase
> Capítulos de referência: 6, 41, 70
> Data: 2026-07-21

---

## 1. Problema

A IDEIA já possui peças individuais de contexto:
- `memory-store` (armazenamento, busca semântica, KG, CAG)
- `trusted-context` (integridade hash)
- `scope-isolation` (isolamento de escopo)
- `continuity-engine` (decisões/timeline)
- `LLMContextBuilder` (contexto comprimido via SelfAwareness)
- `buildChatContext` (contexto formatado para chat)
- `PromptPipeline` (pipeline de prompt)

No entanto, **não há um compositor unificado** que:
1. Agregue múltiplas fontes numa única chamada
2. Adapte dinamicamente a composição por tipo de tarefa
3. Reduza ruído (dedup, contradição, obsoleto)
4. Ranqueie por relevância respeitando orçamento de tokens
5. Rastreie proveniência (por que cada item foi incluído)
6. Serialize no formato mais compacto possível

## 2. Abordagem Proposta

### 2.1 Novo pacote: `packages/context-builder`

```
context-builder/
  src/
    composer.ts          # ContextComposer — fachada principal
    aggregator.ts        # ContextAggregator — busca em múltiplas fontes
    scorer.ts            # RelevanceScorer — pontua itens por relevância
    deduplicator.ts      # ContextDeduplicator — remove duplicatas semânticas
    serializer.ts        # ContextSerializer — serialização token-eficiente
    provenance.ts        # ContextProvenance — rastreabilidade de decisões
    index.ts             # Facade + tipos
```

### 2.2 ContextComposer (fachada principal)

```
Entrada: taskProfile (tipo, escopo, complexidade) + tokenBudget
  ↓
1. Aggregator: busca em memory-store, vector-store, trusted-context, 
   continuity-engine, self-awareness
  ↓
2. Deduplicator: remove duplicatas por hash/conteúdo semântico
  ↓
3. Scorer: pontua cada item (freshness x relevância x confiança x categoria)
  ↓
4. Rank & Trim: ordena por score, corta para caber no tokenBudget
  ↓
5. Provenance: registra por que cada item foi incluído/excluído
  ↓
6. Serializer: produz contexto compacto para o LLM
  ↓
Saída: ComposedContext (itens + fontes + metadados + proveniência)
```

### 2.3 Integração

O `ContextComposer` será injetado:
- No `AgentRuntime` como fonte única de contexto
- No `PromptPipeline` como replacement do `ContextInjector` atual
- No `AgentPipelineBridge` para compor contexto antes de invocar subgrafos

## 3. Critérios de Aceitação

1. Compõe contexto de ≥3 fontes em uma chamada
2. Reduz ruído em ≥30% (itens removidos vs raw)
3. Respeita orçamento de tokens com erro ≤10%
4. Proveniência registrada para cada item incluído/excluído
5. Serialização produz formato 40% mais compacto que texto livre
6. Compila com `tsc --noEmit = 0`
7. 70%+ cobertura de testes
