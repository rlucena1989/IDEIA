# G5 — Feedback → Recomendações → Memória Pipeline

> **Tipo**: `structural-gap`  
> **Status**: `study-active`  
> **Data**: 2026-07-15  
> **Metodologia**: Template Permanente de Análise (Fases 1-4)

---

## Fase 1 — Pesquisa e Fundamentação

### 1.1 Resumo Executivo

Os estudos 10, 11 e 16 implementam coleta de feedback, sistema de recomendações e memória persistente, mas operam de forma isolada. Não há um pipeline automatizado que conecte: (1) usuário fornece feedback explícito ou implícito → (2) sistema analisa e gera recomendações → (3) recomendações são armazenadas na memória → (4) memória influencia comportamento futuro. Um pipeline formal fecha o loop de aprendizado do sistema.

**Decisão recomendada**: ✅ FAZER — Score 3.8, prioridade alta.

### 1.2 Pesquisa Acadêmica e de Mercado

- **Padrões**: Reinforcement Learning from Human Feedback (RLHF), Active Learning Loop, Continuous Learning Systems, Feedback Loop Architecture.
- **Concorrentes**: Windsurf "Memórias que aprendem com uso" é o exemplo mais próximo. Claude Code ajusta comportamento baseado em feedback. GitHub Copilot usa telemetria para melhorar sugestões.
- **Open source**: `mlflow` (ML lifecycle), `langfuse` (LLM observability + feedback), `pinecone` + `chromadb` (memory/vector store).
- **Papers**: "Training Language Models to Follow Instructions with Human Feedback" (Ouyang et al., InstructGPT). "Constitutional AI" (Bai et al., Anthropic).

### 1.3 Análise Técnica

**Arquitetura proposta**:
```
User Action → FeedbackCollector
  ├── Feedback explícito (thumbs up/down, rating, comentário)
  └── Feedback implícito (aceitação/rejeição, tempo de uso, correções)

Feedback → FeedbackAnalyzer
  ├── Extrai padrões (ações frequentes, rejeitadas, mais editadas)
  ├── Gera recomendações (configs, policies, shortcuts)
  └── Persiste em MemoryStore via MemoryPipeline

MemoryStore → RecomendationEngine
  ├── Recomendações de configuração
  ├── Recomendações de workflow
  └── Auto-ajuste de policies (sugestão, não auto-ativação)
```

**Dependências**: `packages/memory-store/` (persistência), `packages/event-bus/` (G1, notificações), `packages/audit-trail/` (rastreabilidade).

### 1.4 Riscos e Limitações

- **Privacidade**: Feedback armazena comportamento do usuário — exigir opt-in explícito + anonimização.
- **Qualidade**: Feedback ruidoso pode gerar recomendações ruins — mitigação com thresholds mínimos + revisão humana opcional.
- **Complexidade**: Pipeline de 4 estágios com análise é caro — MVP com regras simples (contagem de recorrência) em vez de ML.

---

## Fase 2 — Matriz de Viabilidade

| Dimensão | Peso | Nota | Pontos |
|----------|:----:|:----:|:------:|
| **Valor para IDE** | 3 | 4 | 12 |
| **Diferenciação** | 2 | 5 | 10 |
| **Sinergia c/ arquitetura** | 2 | 4 | 8 |
| **Custo-benefício** | 2 | 3 | 6 |
| **Maturidade** | 1 | 2 | 2 |

**Score = (12 + 10 + 8 + 6 + 2) / 10 = 3.8** ✅ FAZER

| Esforço | Semanas | Justificativa |
|:-------:|:-------:|---------------|
| **M** | 4-5 | Pipeline multi-estágio; MVP com regras, não ML |

---

## Fase 3 — Artefatos

### 3.1 TASK-IDE-18 — Feedback → Recomendações → Memória Pipeline

```markdown
# Tarefa — Pipeline de Feedback com Loop de Memória

## ID: TASK-IDE-18 | Módulo: feedback-pipeline | Tipo: feature

## Objetivo: Conectar coleta de feedback com análise, geração de recomendações e persistência em memória.

## Dependências
- TASK-IDE-14 (Event Bus)
- TASK-IDE-17 (Schema Registry) — schemas de feedback
- `packages/memory-store/` — persistência existente

## Critérios de aceite
### Subtarefa 18.1 — Feedback Collector
- [ ] API de feedback explícito: `POST /api/feedback` com tipo, alvo, rating, texto
- [ ] Coleta implícita: ações aceitas/rejeitadas pelo policy engine
- [ ] Eventos emitidos via Event Bus para cada feedback coletado

### Subtarefa 18.2 — Feedback Analyzer
- [ ] Análise por recorrência: itens rejeitados > 3x viram recomendação negativa
- [ ] Análise por padrão: sequências frequentes viram workflow suggestion
- [ ] Thresholds configuráveis (min. ocorrências, janela de tempo)

### Subtarefa 18.3 — Recomendation Engine
- [ ] Recomendações de configuração (ex: "Você rejeitou rm -rf 5x. Ativar safe-rm?")
- [ ] Recomendações de workflow (ex: "Você sempre roda test depois de build. Criar atalho?")
- [ ] Recomendações NÃO se auto-aplicam — exigem aprovação

### Subtarefa 18.4 — Memory Integration
- [ ] Recomendações aprovadas persistem em MemoryStore
- [ ] Recomendações rejeitadas são registradas com contagem para evitar repetição
- [ ] MemoryStore expõe `getRecommendations()` para IDE UI

## Arquivos que PODEM ser alterados
- `packages/feedback-pipeline/src/` (collector, analyzer, recommender)
- `packages/memory-store/src/` (métodos de recomendação)
- `packages/cli/src/ide/api-router.ts` (rota de feedback)

## Riscos
- Feedback noise: usuários podem fornecer feedback inconsistente — thresholds mínimos
- Privacidade: feedback contém dados de uso — opt-in obrigatório, anonimização

## Verificação
- [ ] Testes: collect, analyze threshold, recommend, approve/reject
- [ ] Teste de integração: pipeline completo com memory-store
```

### 3.2 Contratos

**Contrato: feedback-pipeline → event-bus**
- Emite `feedback:collected`, `feedback:analyzed`, `recommendation:created`, `recommendation:applied`

**Contrato: feedback-pipeline → memory-store**
- `memoryStore.pushRecommendation(recommendation)` — persiste
- `memoryStore.getRecommendations()` — recupera ativas

### 3.3 CHANGELOG Entry

```markdown
## 2026-07-15 — G5: Feedback→Recomendações→Memória Pipeline

### Arquivos novos
| # | Arquivo | Descrição |
|---|---------|-----------|
| 1 | `docs/ESTUDOS/G5-FEEDBACK-PIPELINE/README.md` | Análise completa do gap estrutural |
```

---

## Fase 4 — Ciclo de Vida

```
[CRIAÇÃO] docs/ESTUDOS/G5-FEEDBACK-PIPELINE/README.md
  │
  ├──> PESQUISA (Fase 1) → Estudos 10, 11, 16 isolados
  │
  ├──> ANÁLISE (Fase 2) → Score 3.8 — ✅ FAZER
  │     │
  │     └──> GERA TAREFA → TASK-IDE-18
  │           │
  │           └──> IMPLEMENTA → Pipeline 4 estágios (MVP sem ML)
  │
  └──> REVISÃO PERIÓDICA → a cada 3 meses (próximo: 2026-10-15)
```

---

## Integração com Código (2026-07-22)

**Status:** ✅ **Implementado** (F8/F9/F10)

Pipeline de feedback implementado através de múltiplas fases:

| Componente | Package/File | Status |
|-----------|-------------|--------|
| Feedback Collector | `packages/cli/src/feedback/` | Coleta explícita e implícita |
| Pattern Learner | `packages/cli/src/local-ai/pattern-learner/` | Extração de padrões |
| Memory Store | `packages/memory-store/` | Persistência de memória |
| Guardrails | `packages/cli/src/guardrails/` | PromptGuard, ContentFilter |

---

## Referências

- Estudos 10, 11, 16 — pesquisas anteriores de feedback/recomendação
- "Training Language Models to Follow Instructions with Human Feedback" — InstructGPT
- "Constitutional AI" — Bai et al., Anthropic
- `langfuse` — LLM observability + feedback collection
- `packages/memory-store/` — persistência de memória existente
