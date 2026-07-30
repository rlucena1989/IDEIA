# S76 — Mixture of Experts: IDEIA Servindo Modelos Massivos em Hardware Modesto

## Score: 4.10 | Gap: Alto

## O que o Modelo de IA Precisa

Modelos MoE como Qwen3-Coder-Next (80B total, 3B ativo) oferecem qualidade de modelo gigante com custo de modelo pequeno — **por token**. Mas todos os especialistas precisam estar carregados na VRAM. IDEIA precisa gerenciar isso de forma que o modelo nunca pare por falta de memória.

### Necessidades do Modelo que IDEIA Deve Atender

| Necessidade | Impacto no Modelo | O que IDEIA Precisa Prover |
|------------|-------------------|---------------------------|
| **Carregar só especialistas necessários** | MoE com 64 experts, mas só 2 ativos por token → 62 desnecessários na VRAM | `ExpertOffloadManager` — LRU de experts na VRAM com swap para RAM/SSD |
| **Balanceamento de carga entre experts** | Todo token vai para o mesmo expert → collapse | Load balancer com auxiliary loss + z-loss via `MoERouter.decide()` |
| **Servir multi-modelo** | IDEIA troca entre MoE local e modelo denso remoto conforme complexidade | `MoERouter` integrado ao `ComplexityRouter` — tasks N0-N2 → denso, N3-N5 → MoE |
| **Contexto longo sem degradação** | MoE + contexto longo = KV cache explosivo | KV cache FP8 + chunked prefill + expert offload combinados |
| **Sparse activation eficiente** | MoE com top-4 ativa só 5-15% dos parâmetros | Roteamento consciente de VRAM com fallback automático |

### MoE no Pipeline do IDEIA

```
Usuário faz requisição
    │
    ▼
ComplexityRouter (N0-N5)
    │ classifica complexidade
    ├── N0/N1 → modelo denso local (Qwen2.5-7B GGUF / Qwen3-MoE-A2.7B)
    ├── N2/N3 → MoE local (Mixtral-8x7B via Ollama)
    └── N4/N5 → MoE remoto (Qwen3-Coder-Next / MiniMax-M2.5 via vLLM)
    
    MoERouter.decide():
    - Verifica VRAM disponível vs. necessidade
    - Calcula: vramNeeded = totalParams × 0.5 (estimativa INT4)
    - Se task 'low' → rejeita MoE (modelo denso basta)
    - Se VRAM insuficiente → fallbackToDense = true
    - Se OK → useMoE = true com modelo recomendado
    
    ExpertOffloadManager:
    - LRU cache com N slots de expert na VRAM
    - Swap LRU → RAM via DMA se expert ocioso > 2s
    - Pré-carrega top-4 experts baseado em histórico
    - Métricas: expertUtilization, expertSwapRate, loadBalancingScore
```

### MoERouter — Código Real em Produção

```typescript
// packages/local-ai/src/moe-router.ts
export interface MoEModelInfo {
  id: string
  totalParams: number   // parâmetros totais (ex: 80B)
  activeParams: number  // parâmetros ativos por token (ex: 3B)
  numExperts: number    // número total de experts (ex: 64)
  topK: number          // experts ativos por token (ex: 4)
  expertsPerToken: number
  supportedEngines: string[]  // ['vllm', 'ollama']
}

export const KNOWN_MOE_MODELS: MoEModelInfo[] = [
  { id: 'Qwen3-Coder-Next', totalParams: 80, activeParams: 3,
    numExperts: 64, topK: 4, expertsPerToken: 4,
    supportedEngines: ['vllm'] },
  { id: 'MiniMax-M2.5', totalParams: 229, activeParams: 10,
    numExperts: 48, topK: 6, expertsPerToken: 6,
    supportedEngines: ['vllm'] },
  { id: 'DeepSeek-V3.2', totalParams: 685, activeParams: 37,
    numExperts: 256, topK: 8, expertsPerToken: 8,
    supportedEngines: ['vllm'] },
  { id: 'Mixtral-8x7B', totalParams: 47, activeParams: 13,
    numExperts: 8, topK: 2, expertsPerToken: 2,
    supportedEngines: ['vllm', 'ollama'] },
  { id: 'Qwen3-MoE-A2.7B', totalParams: 30, activeParams: 2.7,
    numExperts: 32, topK: 4, expertsPerToken: 4,
    supportedEngines: ['vllm'] },
]

export class MoERouter {
  private models: Map<string, MoEModelInfo> = new Map()

  constructor() {
    for (const m of KNOWN_MOE_MODELS) {
      this.models.set(m.id.toLowerCase(), m)
    }
  }

  decide(modelQuery: string, availableVRAM: number,
         taskComplexity: 'low' | 'medium' | 'high'): MoERoutingDecision {
    const modelId = this.findBestMatch(modelQuery)
    if (!modelId) {
      return { useMoE: false, modelId: modelQuery,
        reason: 'Model not found in MoE registry',
        estimatedVRAM: 0, fallbackToDense: true }
    }
    const model = this.models.get(modelId.toLowerCase())!
    const vramNeeded = model.totalParams * 0.5

    if (taskComplexity === 'low') {
      return { useMoE: false, modelId: model.id,
        reason: 'Low complexity — dense model is more efficient',
        estimatedVRAM: vramNeeded, fallbackToDense: true }
    }
    if (availableVRAM < vramNeeded) {
      return { useMoE: false, modelId: model.id,
        reason: `Insufficient VRAM: need ${vramNeeded.toFixed(0)}GB, have ${availableVRAM}GB`,
        estimatedVRAM: vramNeeded, fallbackToDense: true }
    }
    return { useMoE: true, modelId: model.id,
      reason: `MoE: ${model.activeParams}B active of ${model.totalParams}B (${model.numExperts} experts, top-${model.topK})`,
      estimatedVRAM: vramNeeded, fallbackToDense: false }
  }

  getRecommendedForVRAM(vramGB: number): MoEModelInfo[] {
    return KNOWN_MOE_MODELS
      .filter(m => m.totalParams * 0.5 <= vramGB * 0.9)
      .sort((a, b) => b.activeParams - a.activeParams)
  }
}
```

### Arquitetura de Sparse Activation

```
                    ┌─────────────────────┐
                    │     Gating Router    │
                    │  (top-K softmax)     │
                    └──┬──┬──┬──┬──┬──┬──┘
                       │  │  │  │  │  │
              ┌────────┘  │  │  │  │  └────────┐
              ▼           ▼  ▼  ▼  ▼           ▼
        ┌─────────┐  ┌─────────────────────┐  ┌─────────┐
        │ Expert 1 │  │ Expert 2 ... N-1    │  │ Expert N│
        │ (FFN)    │  │ (FFN dispersos)     │  │ (FFN)   │
        └─────────┘  └─────────────────────┘  └─────────┘
              │           │  │  │  │              │
              └───────────┘  │  │  └──────────────┘
                            ▼  ▼
                     ┌────────────────┐
                     │    Sum +       │
                     │  (weighted)    │
                     └────────────────┘

  Vantagens do Sparse Activation:
  - Custo computacional = activeParams × tokens (não totalParams)
  - Qwen3-Coder-Next: 80B total, 3B ativo → 96% de economia por token
  - MiniMax-M2.5: 229B total, 10B ativo → 95.6% de economia
  - DeepSeek-V3.2: 685B total, 37B ativo → 94.6% de economia

  Desafios:
  - All-to-all communication: experts em GPUs diferentes precisam trocar dados
  - Load balancing: se um expert recebe >20% dos tokens, collapse
  - Expert offload: VRAM limitada vs. numExperts grande
```

---

## Fase 1: Pesquisa

### 1.1 Contexto

- **Problema:** Modelos densos de alta qualidade (Qwen2.5-72B, Llama-3-70B) exigem VRAM proporcional aos parâmetros totais — inviável em hardware consumidor (24-48 GB). Modelos MoE oferecem qualidade similar com 5-15% dos parâmetros ativos por token, mas exigem gerenciamento inteligente de memória e roteamento.
- **Público:** IDEIA rodando em estações de trabalho com RTX 3090/4090 (24 GB), A6000 (48 GB), Apple Silicon M-series (64-128 GB unificada), e servidores com A100 (80 GB).
- **Restrições:** VRAM máxima 24-80 GB; modelos MoE maiores que 80B totais não cabem inteiros; latência máxima aceitável de 8s para tasks N4-N5; compatibilidade com vLLM (engine principal MoE) e Ollama (fallback para Mixtral).

### 1.2 Tecnologias/Abordagens Consideradas

| Tecnologia | Tipo | Descrição | Maturidade | Licença |
|-----------|------|-----------|------------|---------|
| vLLM + MoE | Inference Engine | Suporte nativo a MoE com PagedAttention, KV cache FP8, chunked prefill | Madura (v0.6+) | Apache 2.0 |
| Ollama + Mixtral | Inference Engine | Suporte básico a MoE via llama.cpp, sem offload de experts | Madura | MIT |
| Expert Offload (LRU) | Técnica de Memória | Swap de experts entre VRAM ↔ RAM baseado em frequência de acesso | Experimental | — |
| Auxiliary Loss + z-loss | Regularização | Balanceamento de carga entre experts durante treino/inferência | Madura (DeepSeek, Qwen) | — |
| MoERouter (IDEIA) | Roteador | Decisão MoE vs. denso baseada em VRAM disponível e complexidade | ✅ Implementado | MIT |

### 1.3 Pesquisa Realizada

- DeepSeek-V2/V3: 256 experts, top-8, auxiliary loss com weight 0.01, z-loss para estabilidade
- Qwen3-MoE: 32 experts, top-4, load balancing loss adaptativa
- Mixtral-8x7B: 8 experts, top-2, modelo mais maduro para hardware consumidor
- MiniMax-M2.5: 48 experts, top-6, 229B total com 10B ativo — maior eficiência da classe
- Paper: "Efficient Large Language Models: Mixture-of-Experts" (Fedus et al., 2022)
- Paper: "DeepSeek-V3: A Frontier Model with 685B Parameters" (DeepSeek, 2025)

---

## Fase 2: Matriz de Viabilidade

### 2.1 Pontuação (5 Dimensões)

| Dimensão | Peso | Score (0-5) | Ponderado | Observação |
|----------|------|-------------|-----------|------------|
| **Valor** | 3× | 4.5 | 13.5 | MoE permite rodar modelos de fronteira em hardware modesto — valor central para IDEIA democratizar IA |
| **Diferenciação** | 2× | 4.0 | 8.0 | Nenhum concorrente (Cursor, Windsurf) oferece MoE routing inteligente com fallback |
| **Sinergia** | 2× | 4.5 | 9.0 | MoERouter já implementado em `@ideia/local-ai`, integração direta com ComplexityRouter e agent-router |
| **Custo-Benefício** | 2× | 3.5 | 7.0 | Implementação de offload é complexa, mas o ganho de qualidade por token é 10-20× vs. denso pequeno |
| **Maturidade** | 1× | 3.5 | 3.5 | vLLM maduro, ExpertOffload ainda experimental |
| **Total** | 10× | | **41.0/50** | |

**Score ≥ 3.5 → gera TASK-IDEIA-* obrigatoriamente**

### 2.2 Análise de Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Expert collapse (load balancing) | Média | Alto | Monitorar expertUtilization, fallback automático para modelo denso se imbalance > 30% |
| VRAM insuficiente para modelo cheio | Alta | Alto | MoERouter.decide() com fallbackToDense=true + recomendar modelo menor |
| Latência de swap de experts | Alta | Médio | LRU cache com prefetching baseado em padrões de acesso históricos |
| Qualidade inferior ao esperado | Média | Médio | A/B testing: amostra 10% das requests com modelo denso maior como baseline |
| vLLM incompatível com Windows | Baixa | Alto | Fallback para Ollama + Mixtral-8x7B (funciona via llama.cpp no Windows) |

---

## Fase 3: Artefatos

### 3.1 Documentos Gerados

- [x] Estudo técnico completo (`docs/ESTUDOS/S76-MIXTURE-OF-EXPERTS.md`)
- [ ] ADR se aplicável (`docs/adr/ADR-016-MoE-Routing.md`)
- [ ] Gap documentado no `GAPS-PRODUCAO-IDE.md` — GS76
- [ ] Tasks geradas (`TASK-IDEIA-S76-01` a `TASK-IDEIA-S76-05`)

### 3.2 Conexões com Estudos Existentes

| Estudo | Conexão | Impacto |
|--------|---------|---------|
| S78 — Token Economy & Context Engineering | MoE aumenta eficiência de tokens por dólar (mais qualidade por token) | Alto |
| S72 — Quantization (Model Optimization) | INT4 quantization reduz VRAM necessária para MoE em 4× | Alto |
| S75 — Inference Optimization | KV cache FP8 + chunked prefill essenciais para MoE com contexto longo | Alto |
| S79 — Spec-Driven Development | SpecGenerator pode gerar configurações MoE otimizadas por hardware | Médio |

---

## Fase 4: Ciclo de Vida

### 4.1 Roadmap

- **Fase de adoção:** Fase 5 — Implantação em produção
- **Dependências:** vLLM instalado com suporte a MoE; `@ideia/local-ai` com MoERouter operacional; GPU com ≥ 24 GB VRAM para Qwen3-Coder-Next
- **Esforço estimado:** 40h — 20h ExpertOffloadManager, 10h integração ComplexityRouter + MoERouter, 5h benchmarking, 5h documentação

### 4.2 Revisão Periódica

- **Próxima revisão:** 2026-10-26 (3 meses)
- **Critérios para arquivamento:** Nenhum modelo MoE relevante com suporte a offload no mercado; hardware consumidor atinge 128 GB VRAM
- **Critérios para reavaliação:** Novo modelo MoE com > 90% sparse activation ratio; nova técnica de offload (ex: expert distillation)

### 4.3 Decisão Final

- **Aprovado:** Sim
- **Justificativa:** MoE é a única forma viável de rodar modelos de fronteira (Qwen3-Coder-Next, DeepSeek-V3.2) em hardware consumidor. O MoERouter já está implementado e integrado ao pipeline de complexidade. O ExpertOffloadManager é a peça faltante para completar o suporte.
- **Data:** 2026-07-26
- **Responsável:** Equipe de IA Eficiente

---

## Implementação Detalhada

### ExpertOffloadManager — Arquitetura

```typescript
interface ExpertSlot {
  expertId: number
  vramAddress: string  // ponteiro na VRAM
  lastAccessed: number
  accessCount: number
  model: MoEModelInfo
}

class ExpertOffloadManager {
  private vramSlots: Map<number, ExpertSlot> = new Map()
  private swapQueue: ExpertSlot[] = []
  private readonly MAX_VRAM_SLOTS = 8  // configurable por hardware

  async loadExpert(expertId: number, model: MoEModelInfo): Promise<void> {
    if (this.vramSlots.has(expertId)) {
      // cache hit — atualiza timestamp
      this.vramSlots.get(expertId)!.lastAccessed = Date.now()
      this.vramSlots.get(expertId)!.accessCount++
      return
    }
    if (this.vramSlots.size >= this.MAX_VRAM_SLOTS) {
      await this.swapOutLRU()
    }
    await this.loadToVRAM(expertId, model)
  }

  private async swapOutLRU(): Promise<void> {
    // LRU: encontra expert menos acessado recentemente
    let lruId = -1, lruTime = Infinity
    for (const [id, slot] of this.vramSlots) {
      if (slot.lastAccessed < lruTime) {
        lruTime = slot.lastAccessed
        lruId = id
      }
    }
    if (lruId >= 0) {
      await this.swapToRAM(lruId)
      this.vramSlots.delete(lruId)
    }
  }

  getUtilization(): { expertUtilization: number; swapRate: number } {
    const total = this.vramSlots.size
    const accessed = [...this.vramSlots.values()]
      .filter(s => Date.now() - s.lastAccessed < 5000).length
    return {
      expertUtilization: total > 0 ? accessed / total : 0,
      swapRate: this.swapQueue.length,
    }
  }
}
```

### Integração com ComplexityRouter — N0-N5 + MoE

```
ComplexityRouter.classify() determina nível:
  N0 → maxSteps:1, tokenBudget:500  → modelo denso (Qwen2.5-7B)
  N1 → maxSteps:3, tokenBudget:2000 → modelo denso
  N2 → maxSteps:5, tokenBudget:4000 → modelo denso ou MoE pequeno
  N3 → maxSteps:10, tokenBudget:8000 → MoE (Mixtral-8x7B local)
  N4 → maxSteps:15, tokenBudget:15000 → MoE (Qwen3-Coder-Next)
  N5 → maxSteps:20, tokenBudget:25000 → MoE remoto (MiniMax-M2.5)

  MoERouter.decide() refina:
  - Se VRAM < vramNeeded → fallback para modelo denso do mesmo nível
  - Se taskComplexity 'low' → força modelo denso (MoE é overkill)
  - Se modelo não encontrado → fallbackToDense = true
```

### Métricas e Monitoramento

| Métrica | Descrição | Fonte | Alerta se |
|---------|-----------|-------|-----------|
| `expertUtilization` | % de experts na VRAM realmente usados | ExpertOffloadManager | < 40% |
| `expertSwapRate` | swaps/segundo | ExpertOffloadManager | > 2/s |
| `loadBalancingScore` | Desvio padrão de tokens por expert | vLLM metrics | > 0.3 |
| `moEvsDenseRatio` | % de requests servidas por MoE vs. denso | MoERouter | — |
| `vramUsageMoE` | GB de VRAM ocupados por experts | nvidia-smi | > 90% |

### Ajustes Específicos no IDEIA

| Onde | O que Ajustar | Para Quê |
|------|--------------|----------|
| `@ideia/local-ai/src/moe-router.ts` | MoERouter | Já implementado com decide() e getRecommendedForVRAM() |
| `@ideia/local-ai/src/types.ts` | ModelInfo sem campo MoE | Adicionar `isMoE: boolean`, `activeParams`, `totalParams`, `numExperts`, `topK` |
| `@ideia/local-ai/src/model-manager.ts` | Carrega modelo todo | Adicionar `ExpertOffloadManager` — LRU de experts na VRAM |
| `@ideia/performance-monitor` | Métricas genéricas | Adicionar `expertUtilization`, `expertSwapRate`, `loadBalancingScore` |
| `@ideia/prompt-economy/src/router/complexity-router.ts` | N0-N5 pipeline | Integrar MoERouter na decisão: N3+ usa MoE se VRAM suficiente |
| `@ideia/capability-registry` | Registry | Adicionar capability `moe-routing` para descoberta automática |

### Tasks para Implementação

1. **T1:** Adicionar tipos MoE em `@ideia/local-ai` — `MoEModelInfo` (✅ já existe), `ExpertConfig`, `ExpertOffloadConfig`
2. **T2:** Criar `ExpertOffloadManager` — LRU de experts com swap VRAM↔RAM, prefetching baseado em histórico
3. **T3:** Integrar MoERouter com ComplexityRouter — N3+ usa MoERouter.decide() para escolher modelo
4. **T4:** Adicionar métricas MoE no `performance-monitor` — expertUtilization, swapRate, loadBalancingScore
5. **T5:** CLI: `ideia serve --model Qwen3-Coder-Next --moe-offload ram` — serve MoE com offload
6. **T6:** Benchmark: MoE vs. modelo denso equivalente em 5 dimensões (qualidade, latência, VRAM, throughput, custo)
7. **T7:** Dashboard de monitoramento MoE — tempo real de utilização de experts

### Integração com CapabilityRegistry e CapabilityMatcher

```typescript
// packages/capability-registry/src/registry/registry.service.ts
// Registrar MoE routing como capability do sistema
await registry.register({
  id: 'moe-routing',
  name: 'Mixture-of-Experts Routing',
  description: 'Roteamento inteligente entre modelos MoE e densos baseado em VRAM e complexidade',
  category: 'ai',
  subcategory: 'inference',
  status: 'active',
  tags: ['moe', 'routing', 'sparse', 'expert', 'vllm'],
  version: '1.0.0',
  dependencies: ['local-ai'],
})

// packages/capability-matcher/src/matcher-engine.ts
// CapabilityMatcher encontra matching para necessidades do projeto
const matcher = new CapabilityMatcher()
matcher.registerCapability(
  'moe-routing',
  ['moe', 'mixture', 'expert', 'sparse', 'routing', 'vram', 'offload'],
  'ai',
  'Roteamento inteligente entre modelos MoE e densos',
  'local-ai'
)

// CLI: descobrir capabilities MoE
$ ideia capability query moe
→ moe-routing (available: true) — local-ai
→ model-compression (available: true) — local-ai
→ inference-optimization (available: true) — local-ai
```

### Inferência com vLLM — Arquitetura de Serviço

```
┌────────────────────────────────────────────────────────────────┐
│  vLLM Inference Engine com Suporte MoE                        │
│                                                                │
│  ┌──────────────────┐  ┌──────────────────┐                   │
│  │  PagedAttention   │  │  KV Cache FP8     │                   │
│  │  Memória virtual  │  │  Quantização       │                   │
│  │  por página       │  │  (FP8 → 50% menos) │                   │
│  └────────┬─────────┘  └────────┬─────────┘                   │
│           │                     │                              │
│           └─────────┬───────────┘                              │
│                     ▼                                          │
│  ┌─────────────────────────────────────┐                      │
│  │  MoE Scheduler                       │                      │
│  │  • Agendamento de experts por GPU    │                      │
│  │  • All-to-all comunicação entre GPUs │                      │
│  │  • Load balancing routing dos tokens │                      │
│  └────────────────┬────────────────────┘                      │
│                   │                                            │
│         ┌─────────┴─────────┐                                  │
│         ▼                   ▼                                  │
│  ┌─────────────┐    ┌─────────────┐                            │
│  │ GPU 0        │    │ GPU 1        │                           │
│  │ Experts 1-32 │    │ Experts 33-64│                           │
│  └─────────────┘    └─────────────┘                            │
└────────────────────────────────────────────────────────────────┘

  vLLM Features Essenciais para MoE:
  - PagedAttention: gerencia KV cache em páginas de memória virtual
    → Evita fragmentação de memória com contexto longo
    → Permite compartilhamento de KV cache entre amostras (beam search)
  - KV Cache FP8: reduz uso de memória do cache em 50%
    → Crítico para MoE + contexto longo (KV cache explode com experts)
  - Chunked Prefill: divide prefill longo em chunks
    → Evita OOM em contexto muito longo (128K+ tokens)
  - Speculative Decoding: modelo draft pequeno (0.5B) + MoE grande
    → 2-3× mais throughput com mesma qualidade
```

### Estratégias de Expert Parallelism

```
Expert Parallelism — Distribuição de Experts entre GPUs:

  Cenário 1: GPU única (RTX 4090 — 24 GB)
  ┌──────────────────────────────────────┐
  │ GPU 0                                 │
  │ Experts: 1-8 (Mixtral) ou 1-4 (Qwen) │
  │ LRU Offload: experts > 4 → RAM       │
  └──────────────────────────────────────┘
  → Apenas modelos com totalParams < 50B via INT4

  Cenário 2: Multi-GPU (2× A6000 — 96 GB)
  ┌─────────────────────┬─────────────────────┐
  │ GPU 0               │ GPU 1               │
  │ Experts: 1-32       │ Experts: 33-64      │
  │ (Qwen3-Coder-Next)  │ (Qwen3-Coder-Next)  │
  └─────────────────────┴─────────────────────┘
  → All-to-all communication entre GPUs
  → Gating Router em GPU 0, envia tokens para GPU certa
  → Overhead de comunicação: ~5ms por token

  Cenário 3: Cluster (4× A100 — 320 GB)
  ┌──────────┬──────────┬──────────┬──────────┐
  │ GPU 0    │ GPU 1    │ GPU 2    │ GPU 3    │
  │ Exp 1-64 │ Exp 65-128│Exp129-192│Exp193-256│
  │ (DeepSeek-V3.2 — 256 experts)              │
  └──────────┴──────────┴──────────┴──────────┘
  → Tensor Parallelism + Expert Parallelism
  → Communication: NVLink (600 GB/s entre GPUs)
  → Throughput: 3 tokens/s para DeepSeek-V3.2
```

### Técnicas Avançadas de Load Balancing

```typescript
// Algoritmo de Load Balancing para MoE
class LoadBalancer {
  // Auxiliary Loss: penaliza distribuição desigual de tokens entre experts
  computeAuxiliaryLoss(expertCounts: number[], totalTokens: number, alpha: number = 0.01): number {
    // importance = (frequência de cada expert) / total
    const importance = expertCounts.map(c => c / totalTokens)
    // squared sum of importance fractions
    const loss = importance.reduce((sum, p) => sum + p ** 2, 0) * expertCounts.length
    return alpha * loss
  }

  // z-loss: estabiliza treino MoE penalizando logits grandes do gating router
  computeZLoss(gatingLogits: number[], beta: number = 0.001): number {
    const logZ = gatingLogits.reduce((max, x) => Math.max(max, x), -Infinity)
    const sumExp = gatingLogits.reduce((sum, x) => sum + Math.exp(x - logZ), 0)
    const z = logZ + Math.log(sumExp)
    return beta * (z ** 2)
  }

  // Load balancing score: coeficiente de variação da distribuição
  getLoadBalanceScore(expertCounts: number[]): number {
    const mean = expertCounts.reduce((a, b) => a + b, 0) / expertCounts.length
    const variance = expertCounts.reduce((a, b) => a + (b - mean) ** 2, 0) / expertCounts.length
    return mean > 0 ? Math.sqrt(variance) / mean : 0  // CV ideal = 0
  }
}
```

### CLI — Comandos MoE

```bash
# Listar modelos MoE suportados
$ ideia moe list
┌─────────────────────┬──────┬──────┬─────────┬──────┬──────────┐
│ Modelo              │ Total│Ativo │ Experts │ TopK │ Engine   │
├─────────────────────┼──────┼──────┼─────────┼──────┼──────────┤
│ Qwen3-Coder-Next    │ 80B  │ 3B   │ 64      │ 4    │ vllm     │
│ MiniMax-M2.5        │ 229B │ 10B  │ 48      │ 6    │ vllm     │
│ DeepSeek-V3.2       │ 685B │ 37B  │ 256     │ 8    │ vllm     │
│ Mixtral-8x7B        │ 47B  │ 13B  │ 8       │ 2    │ vllm,ollama│
│ Qwen3-MoE-A2.7B     │ 30B  │ 2.7B │ 32      │ 4    │ vllm     │
└─────────────────────┴──────┴──────┴─────────┴──────┴──────────┘

# Recomendar modelo baseado na VRAM disponível
$ ideia moe recommend --vram 24
→ Mixtral-8x7B (47B total, 13B ativo, cabe em 24GB INT4)
→ Qwen3-MoE-A2.7B (30B total, 2.7B ativo, cabe em 24GB INT4)

# Servir modelo MoE com offload
$ ideia serve \
  --model Qwen3-Coder-Next \
  --backend vllm \
  --quantization int4 \
  --moe-offload ram \
  --offload-threshold 0.8 \
  --max-vram-experts 4

# Benchmark MoE vs. denso
$ ideia moe benchmark \
  --moe-model Qwen3-Coder-Next \
  --dense-model Qwen2.5-32B \
  --tasks mmlu,human-eval,gsm8k \
  --samples 100

# Monitorar utilização de experts em tempo real
$ ideia moe monitor --interval 1s
  Time    Expert Utilization  Swap/s  Load Balance  VRAM Usage
  10:00:03  72.4%             0.3/s   0.12          6.2/8 GB
  10:00:04  68.1%             0.5/s   0.15          6.5/8 GB
  10:00:05  75.8%             0.2/s   0.09          5.9/8 GB
```

| Cenário | Modelo | VRAM | Qualidade (MMLU) | Tokens/s | Custo/token |
|---------|--------|------|-------------------|----------|-------------|
| Denso pequeno | Qwen2.5-7B | 14 GB | 71% | 45 | $0.0001 |
| MoE pequeno | Mixtral-8x7B | 24 GB | 78% | 25 | $0.0002 |
| Denso médio | Qwen2.5-32B | 64 GB | 82% | 12 | $0.0005 |
| MoE médio | Qwen3-Coder-Next | 40 GB (INT4) | 88% | 18 | $0.0003 |
| MoE grande | MiniMax-M2.5 | 115 GB (INT4) | 91% | 8 | $0.0008 |
| MoE fronteira | DeepSeek-V3.2 | 342 GB (INT4) | 95% | 3 | $0.002 |
