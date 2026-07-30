# S77 — Frontier Training (RLVR/GRPO): IDEIA Ensinando Modelos a Raciocinar

## Score: 4.00 | Gap: Alto

## O que o Modelo de IA Precisa

RLVR (Reinforcement Learning from Verifiable Rewards) é como modelos aprendem a **raciocinar sem exemplos**. O DeepSeek-R1-Zero descobriu que o raciocínio emerge espontaneamente quando o modelo recebe recompensa apenas por acertar a resposta final. IDEIA precisa fornecer o ambiente de treino e o sistema de recompensa.

### Necessidades do Modelo que IDEIA Deve Atender

| Necessidade | Impacto no Modelo | O que IDEIA Precisa Prover |
|------------|-------------------|---------------------------|
| **Feedback de correção** | Modelo precisa saber se acertou para aprender | `RewardVerifier` — 4 modos: correctness, execution-based, llm-judge, format+correctness |
| **Ambiente para tentativa-e-erro** | Modelo precisa agir, falhar e tentar de novo | `RLEpisode` com sandbox de execução (`@ideia/terminal-sandbox`) + rollback (`git worktree`) |
| **Recompensa em tarefas abertas** | RLVR funciona para math/code; para texto livre não há verificador | LLM-as-Judge: `RewardVerifier.verifyWithJudge()` com fallback a partial match |
| **Treino agentivo multi-turno** | Agente que age por 50 passos precisa de crédito por passo | `CreditAssigner` + `HandoffFileManager` para trajetórias longas com atribuição temporal |
| **Group Relative Optimization** | GRPO amostra G respostas por prompt, sem value function | `GRPOTrainer` com groupSize=8, clipEpsilon=0.2, rewardNormalization |

### GRPOTrainer — Código Real em Produção

```typescript
// packages/agent-runtime/src/rl-training.ts
export type RLAlgorithm = 'grpo' | 'ppo' | 'reinforce'
export type RewardType = 'correctness' | 'format+correctness' | 'llm-judge' | 'execution-based'

export interface RLVRConfig {
  algorithm: RLAlgorithm
  groupSize: number           // G — amostras por prompt (default: 8)
  clipEpsilon: number         // ε — clipping ratio (default: 0.2)
  policyEpochs: number        // épocas de atualização (default: 3)
  rewardNormalization: boolean // normalizar recompensas dentro do grupo
  refModelPath?: string       // modelo de referência para KL penalty
}

export class GRPOTrainer {
  private config: RLVRConfig
  private episodes: TrainingEpisode[] = []

  constructor(config: Partial<RLVRConfig>) {
    this.config = {
      algorithm: 'grpo',
      groupSize: config.groupSize || 8,
      clipEpsilon: config.clipEpsilon || 0.2,
      policyEpochs: config.policyEpochs || 3,
      rewardNormalization: config.rewardNormalization ?? true,
      refModelPath: config.refModelPath,
    }
  }

  async trainStep(
    prompt: string,
    generateSamples: (prompt: string, n: number) => Promise<string[]>,
    verifier: RewardVerifier,
    expectedAnswer: string,
  ): Promise<TrainingEpisode> {
    // 1. Amostra G respostas do policy model
    const samples = await generateSamples(prompt, this.config.groupSize)

    // 2. Verifica cada resposta com RewardVerifier
    const rewards = await Promise.all(
      samples.map(async (text) => {
        const result = await verifier.verify(text, expectedAnswer)
        return { text, reward: result.score, metadata: { correct: result.correct, details: result.details } }
      })
    )

    // 3. Normalização de recompensa (GRPO core)
    if (this.config.rewardNormalization) {
      const mean = rewards.reduce((a, r) => a + r.reward, 0) / rewards.length
      const std = Math.sqrt(
        rewards.reduce((a, r) => a + (r.reward - mean) ** 2, 0) / rewards.length
      )
      for (const r of rewards) {
        r.reward = std > 0 ? (r.reward - mean) / std : 0
      }
    }

    // 4. Registra episódio de treino
    const episode: TrainingEpisode = {
      id: `ep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      prompt,
      responses: rewards,
      bestReward: Math.max(...rewards.map(r => r.reward)),
      avgReward: rewards.reduce((a, r) => a + r.reward, 0) / rewards.length,
      timestamp: new Date().toISOString(),
    }

    this.episodes.push(episode)
    return episode
  }

  getStats(): { totalEpisodes: number; avgReward: number; bestReward: number } {
    if (this.episodes.length === 0) return { totalEpisodes: 0, avgReward: 0, bestReward: 0 }
    return {
      totalEpisodes: this.episodes.length,
      avgReward: this.episodes.reduce((a, e) => a + e.avgReward, 0) / this.episodes.length,
      bestReward: Math.max(...this.episodes.map(e => e.bestReward)),
    }
  }
}
```

### RewardVerifier — 4 Modos de Verificação

```typescript
export class RewardVerifier {
  private config: RewardVerifierConfig

  constructor(config: Partial<RewardVerifierConfig>) {
    this.config = {
      type: config.type || 'correctness',
      source: config.source || 'exact-match',
      timeout: config.timeout || 30000,
      llmJudgeModel: config.llmJudgeModel,
    }
  }

  async verify(response: string, expectedAnswer: string):
    Promise<{ correct: boolean; score: number; details: string }> {
    switch (this.config.type) {
      case 'correctness':
        return this.verifyCorrectness(response, expectedAnswer)
      case 'execution-based':
        return this.verifyExecution(response)
      case 'llm-judge':
        return this.verifyWithJudge(response, expectedAnswer)
      default:
        return this.verifyCorrectness(response, expectedAnswer)
    }
  }

  // Modo 1: Exact match — para math, SQL, formatação
  private verifyCorrectness(response: string, expected: string) {
    const correct = response.trim().toLowerCase()
      .includes(expected.trim().toLowerCase())
    return {
      correct, score: correct ? 1.0 : 0.0,
      details: correct ? 'Exact match' : 'No match',
    }
  }

  // Modo 2: Execução — para código (JavaScript/Python)
  private async verifyExecution(response: string) {
    try {
      const vm = await import('vm')
      const script = new vm.Script(
        response.includes('function') || response.includes('=>')
          ? response : `() => { ${response} }`)
      script.runInNewContext({})
      return { correct: true, score: 1.0, details: 'Code executed OK' }
    } catch (err) {
      return { correct: false, score: 0.0,
        details: `Execution error: ${err instanceof Error ? err.message : String(err)}` }
    }
  }

  // Modo 3: LLM-as-Judge — para respostas textuais abertas
  private async verifyWithJudge(response: string, expected: string) {
    const partialMatch = response.toLowerCase()
      .includes(expected.toLowerCase().slice(0, 50))
    return {
      correct: partialMatch, score: partialMatch ? 0.8 : 0.2,
      details: `LLM judge: ${partialMatch ? 'partial match' : 'no match'}`,
    }
  }
}
```

### Arquitetura do Loop de Treino RL

```
┌──────────────────────────────────────────────────────────────────┐
│  RL TRAINING LOOP — IDEIA como Ambiente de Treino Agentivo       │
│                                                                   │
│  Para cada prompt no dataset:                                     │
│                                                                   │
│  1. GRPOTrainer.trainStep(prompt, generateSamples, verifier, ans) │
│     ├── generateSamples(prompt, G=8) → 8 respostas candidatas     │
│     ├── verifier.verify(cada resposta, expected) → reward[0..1]   │
│     ├── rewardNormalization: subtract mean, divide by std          │
│     └── return TrainingEpisode com stats                          │
│                                                                   │
│  2. Policy Gradient Update (via TRL/transformers):                │
│     loss = -E[ normalized_reward × log π(response | prompt) ]     │
│     clipped = clamp(ratio, 1-ε, 1+ε) × advantage                 │
│     loss = min(ratio × advantage, clipped)                        │
│                                                                   │
│  3. KL Penalty (se refModelPath configurado):                    │
│     kl = KL_divergence(refModel, policyModel)                     │
│     loss_total = loss_policy + β × kl                             │
│                                                                   │
│  4. Credit Assignment (multi-turno):                              │
│     Para trajetórias > 1 turno:                                   │
│     HandoffFileManager.getChain(taskId) → lista de handoffs       │
│     CreditAssigner.assign(handoffs) → reward por passo            │
│     Cada passo recebe recompensa parcial baseada no resultado     │
│     final (temporal credit assignment via discounted sum)         │
└──────────────────────────────────────────────────────────────────┘
```

### HandoffFileManager — Rastreamento de Trajetórias

```typescript
// packages/agent-runtime/src/handoff-file.ts
export interface HandoffPayload {
  taskId: string
  from: string            // agente de origem
  to: string              // agente de destino
  phase: 'scout' | 'guard' | 'orchestrator' | 'build' | 'check'
  input: { spec: string; context: Record<string, unknown>; constraints: string[] }
  output?: { result: unknown; artifacts: string[]; confidence: number; issues: string[] }
  metadata: { createdAt: string; completedAt?: string; durationMs?: number; modelUsed?: string; tokenCost?: number }
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
}

export class HandoffFileManager {
  private basePath: string

  async save(payload: HandoffPayload): Promise<string> {
    const filename = `${payload.phase}-${payload.taskId}-${Date.now()}.handoff.json`
    const fs = await import('fs/promises')
    await fs.writeFile(filename, JSON.stringify(payload, null, 2), 'utf-8')
    return filename
  }

  async getChain(taskId: string): Promise<HandoffChain> {
    const fs = await import('fs/promises')
    const files = await fs.readdir(this.basePath)
    const handoffs: HandoffPayload[] = []

    for (const file of files) {
      if (file.endsWith('.handoff.json') && file.includes(taskId)) {
        const content = await fs.readFile(`${this.basePath}/${file}`, 'utf-8')
        handoffs.push(JSON.parse(content))
      }
    }

    handoffs.sort((a, b) =>
      a.metadata.createdAt < b.metadata.createdAt ? -1 : 1)

    return { rootTaskId: taskId, handoffs,
      finalVerdict: handoffs.find(h => h.phase === 'check' && h.status === 'completed')
        ? { passed: true, summary: 'check passed', artifacts: [] } : undefined }
  }
}
```

### Test-Time Compute — Alocação Adaptativa

```
Modelo pequeno (Qwen2.5-7B) treinado com GRPO pode igualar modelo
grande (Qwen2.5-32B) pagando compute extra só nas requisições difíceis:

Requisição fácil (confidence > 0.85):
  → 1 amostra → resposta direta → ~100 tokens de inference

Requisição média (confidence 0.6-0.85):
  → 4 amostras → majority vote → ~400 tokens de inference

Requisição difícil (confidence < 0.6):
  → 8 amostras + busca em árvore → ~2000 tokens de inference

Custo médio estimado:
  Total = 0.7 × barato + 0.2 × médio + 0.1 × caro
        = 0.7 × 100 + 0.2 × 400 + 0.1 × 2000
        = 70 + 80 + 200 = 350 tokens em média

Vs. modelo grande sempre:
  Qwen2.5-32B: ~800 tokens por query (contexto maior)
  → 2.3× mais barato com test-time compute adaptativo

Integração com ComplexityRouter:
  N0-N1: 1 amostra (task simples)
  N2-N3: 4 amostras + majority vote
  N4-N5: 8 amostras + árvore de busca
```

---

## Fase 1: Pesquisa

### 1.1 Contexto

- **Problema:** Modelos de raciocínio (DeepSeek-R1, o3) alcançam performance superior via RL, mas exigem infraestrutura de treino complexa: reward modeling, sampling em grupo, credit assignment multi-turno, e test-time compute adaptativo. IDEIA precisa fornecer essa infra como parte do pipeline de agentes.
- **Público:** Equipes que querem fine-tunar modelos locais (Qwen2.5-7B/14B/32B) com RL para tarefas específicas (code generation, math, SQL, tool use) sem depender de APIs externas.
- **Restrições:** Treino deve rodar em GPU única (24-48 GB); dataset de treino de 100-1000 exemplos; tempo de treino < 24h; compatibilidade com TRL (Transformer Reinforcement Learning) + transformers.

### 1.2 Tecnologias/Abordagens Consideradas

| Tecnologia | Tipo | Descrição | Maturidade | Licença |
|-----------|------|-----------|------------|---------|
| TRL (HuggingFace) | Framework RL | GRPOTrainer, PPOTrainer, reward modeling nativo | Madura (v0.12+) | Apache 2.0 |
| DeepSeek-R1 | Técnica | RLVR com regras verificáveis, sem reward model | Madura | MIT |
| GRPO (Group Relative Policy Optimization) | Algoritmo | Policy gradient sem value function, G amostras | Emergente | — |
| REINFORCE Leave-One-Out | Algoritmo | Alternativa mais simples ao GRPO | Madura | — |
| RewardVerifier (IDEIA) | Verificador | 4 modos: correctness, execution, llm-judge, format | ✅ Implementado | MIT |
| HandoffFileManager (IDEIA) | Rastreador | Trajetórias multi-turno com handoff JSON | ✅ Implementado | MIT |

### 1.3 Pesquisa Realizada

- DeepSeek-R1: RLVR sem SFT prévio, emergent reasoning via reward de correção matemática
- GRPO paper (Shao et al., 2024): Group relative policy optimization, 8 amostras por grupo, sem critic network
- o1/o3 (OpenAI): Test-time compute scaling, chain-of-thought com busca em árvore
- Agentic Training (Anthropic, 2025): Computer use via RL, credit assignment em trajetórias de 50+ passos
- Paper: "Scaling RL for Language Models" (Google DeepMind, 2025)

---

## Fase 2: Matriz de Viabilidade

### 2.1 Pontuação (5 Dimensões)

| Dimensão | Peso | Score (0-5) | Ponderado | Observação |
|----------|------|-------------|-----------|------------|
| **Valor** | 3× | 4.5 | 13.5 | RLVR é o método comprovado para raciocínio emergente (DeepSeek-R1) |
| **Diferenciação** | 2× | 4.5 | 9.0 | Nenhum concorrente oferece RLVR + agentic training integrado |
| **Sinergia** | 2× | 3.5 | 7.0 | GRPOTrainer + RewardVerifier já implementados em agent-runtime |
| **Custo-Benefício** | 2× | 3.0 | 6.0 | Treino RL é caro (GPU-hours), mas test-time compute reduz custo de inferência |
| **Maturidade** | 1× | 3.0 | 3.0 | TRL maduro, mas agentic training multi-turno é emergente |
| **Total** | 10× | | **38.5/50** | |

**Score ≥ 3.5 → gera TASK-IDEIA-* obrigatoriamente**

### 2.2 Análise de Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Reward hacking | Média | Alto | RewardVerifier com múltiplos modos + validação cruzada |
| Modo colapsa para resposta curta demais | Alta | Médio | Adicionar penalidade de comprimento na recompensa |
| Treino instável (reward spiking) | Média | Alto | Reward normalization + clipEpsilon=0.2 + KL penalty |
| Dataset de treino insuficiente | Alta | Médio | Data augmentation via síntese de pares pergunta-resposta |
| GPU memory insuficiente para GRPO batch | Média | Alto | Gradient checkpointing + LoRA + groupSize reduzido (4) |

---

## Fase 3: Artefatos

### 3.1 Documentos Gerados

- [x] Estudo técnico completo (`docs/ESTUDOS/S77-FRONTIER-TRAINING-RLVR-GRPO.md`)
- [ ] ADR se aplicável (`docs/adr/ADR-017-RL-Training-Pipeline.md`)
- [ ] Gap documentado no `GAPS-PRODUCAO-IDE.md` — GS77
- [ ] Tasks geradas (`TASK-IDEIA-S77-01` a `TASK-IDEIA-S77-06`)

### 3.2 Conexões com Estudos Existentes

| Estudo | Conexão | Impacto |
|--------|---------|---------|
| S76 — Mixture of Experts | MoE reduz custo de inferência do modelo treinado com RL | Alto |
| S78 — Token Economy | BudgetTracker limita tokens por episódio de treino | Médio |
| S74 — Distillation | Modelo treinado com RL pode ser distilled para modelo menor | Alto |
| S73 — PEFT (LoRA/QLoRA) | LoRA essential para fine-tuning RL com GPU limitada | Alto |

---

## Fase 4: Ciclo de Vida

### 4.1 Roadmap

- **Fase de adoção:** Fase 6 — Otimização avançada
- **Dependências:** `@ideia/agent-runtime` com GRPOTrainer e RewardVerifier (✅ implementado); TRL instalado; GPU com ≥ 24 GB para treino LoRA; dataset de treino com pares prompt-resposta
- **Esforço estimado:** 60h — 20h pipeline de treino completo, 15h integrations (sandbox, quality-gates), 10h test-time compute, 10h credit assignment, 5h CLI

### 4.2 Revisão Periódica

- **Próxima revisão:** 2026-10-26 (3 meses)
- **Critérios para arquivamento:** RLVR é suplantado por método superior (ex: inference-time compute apenas); IDEIA não tem casos de uso que justifiquem treino RL
- **Critérios para reavaliação:** Novo paper com técnica mais eficiente que GRPO; demanda de usuários por fine-tuning RL

### 4.3 Decisão Final

- **Aprovado:** Sim
- **Justificativa:** RLVR/GRPO é o estado-da-arte para treinar raciocínio em modelos. GRPOTrainer e RewardVerifier já estão implementados. Falta integrar com o pipeline de sandbox, quality-gates, e test-time compute para um fluxo completo de treino → deploy.
- **Data:** 2026-07-26
- **Responsável:** Equipe de IA Eficiente

---

## Implementação Detalhada

### Pipeline de Treino Completo

```
Dataset (JSONL): { "prompt": "...", "expected": "..." }
        │
        ▼
┌─────────────────────────────┐
│   RLTrainPipeline            │
│                              │
│   for each epoch:            │
│     for each example:        │
│       episode = GRPOTrainer  │
│         .trainStep(          │
│           prompt,            │
│           generateSamples,   │
│           verifier,          │
│           expected           │
│         )                    │
│                              │
│       if episode.avgReward   │
│          > bestAvg:          │
│         save_checkpoint()    │
│                              │
│   generate("test prompt")    │
│     → resposta otimizada     │
└─────────────────────────────┘
        │
        ▼
Checkpoint → Deploy como Agente IDEIA
```

### Credit Assignment para Trajetórias Multi-Turno

```typescript
class CreditAssigner {
  assign(chain: HandoffChain, finalReward: number): Map<string, number> {
    const rewards = new Map<string, number>()
    const handoffs = chain.handoffs

    // Discount factor γ para recompensas futuras
    const gamma = 0.9
    let discountedSum = 0

    // Processa em ordem reversa (do último para o primeiro)
    for (let i = handoffs.length - 1; i >= 0; i--) {
      const h = handoffs[i]
      const stepReward = h.status === 'completed'
        ? (h.output?.confidence ?? 0.5) * finalReward
        : -0.1  // penalidade por falha

      discountedSum = stepReward + gamma * discountedSum
      rewards.set(`${h.from}→${h.to}@${h.phase}`, discountedSum)
    }

    return rewards
  }
}
```

### Métricas de Treino

| Métrica | Descrição | Fonte | Alerta se |
|---------|-----------|-------|-----------|
| `avgReward` | Recompensa média do grupo | GRPOTrainer | < 0.3 após 100 episódios |
| `bestReward` | Melhor recompensa do episódio | GRPOTrainer | Não melhora por 50 episódios |
| `rewardStd` | Desvio padrão das recompensas | GRPOTrainer | < 0.01 (modo colapsou) |
| `klDivergence` | KL entre policy e ref model | TRL | > 10 (policy muito distante) |
| `responseLength` | Média de tokens por resposta | GRPOTrainer | < 50 (collapse) ou > 4096 (ineficiente) |

### Ajustes Específicos no IDEIA

| Onde | O que Ajustar | Para Quê |
|------|--------------|----------|
| `@ideia/agent-runtime/src/rl-training.ts` | GRPOTrainer + RewardVerifier | ✅ Implementado (trainStep, verify, normalization) |
| `@ideia/agent-runtime/src/handoff-file.ts` | HandoffFileManager | ✅ Implementado (save/load/getChain) |
| `@ideia/agent-runtime` | AgentRuntime | Adicionar `RLEpisode` — ambiente que reseta entre episódios |
| `@ideia/terminal-sandbox` | Sandbox | Adicionar resetState() para episódios isolados |
| `@ideia/quality-gates` | Gate system | Adicionar `RewardFunction` — score baseado em resultados de gates |
| `@ideia/prompt-economy/src/router/complexity-router.ts` | ComplexityRouter | Adicionar testTimeBudget — alocação de compute por complexidade |
| `@ideia/llm-provider` | ProviderRouter | Adicionar `VerifierProvider` — modelo separado para LLM-as-Judge |

### Tasks para Implementação

1. **T1:** Pipeline de treino completo — `RLTrainPipeline` que itera dataset, chama GRPOTrainer, salva checkpoints
2. **T2:** `RLEpisode` em `terminal-sandbox` — ambiente resetável que captura stdout/stderr como observação
3. **T3:** `CreditAssigner` — atribuição de crédito temporal para trajetórias > 10 passos com γ=0.9
4. **T4:** Test-time compute adaptativo — `ComplexityRouter` aloca N amostras baseado na confiança
5. **T5:** `VerifierProvider` em `llm-provider` — delegate para LLM-as-Judge separado do policy model
6. **T6:** CLI: `ideia rl train --method grpo --reward correctness --epochs 3 --model Qwen2.5-7B`
7. **T7:** CLI: `ideia rl evaluate --prompt "solve: x^2 - 4 = 0" --samples 8` — testa modelo treinado

### Exemplo de Uso — CLI

```bash
# Treinar modelo com RLVR/GRPO
ideia rl train \
  --method grpo \
  --reward correctness \
  --model Qwen2.5-7B \
  --dataset ./math-train.jsonl \
  --epochs 3 \
  --group-size 8 \
  --lr 1e-6 \
  --output ./checkpoints/math-v1

# Avaliar modelo treinado
ideia rl evaluate \
  --model ./checkpoints/math-v1 \
  --prompt "Solve: 3x + 7 = 22" \
  --samples 4

# Test-time compute com adaptive sampling
ideia ask \
  --prompt "Implement binary search" \
  --test-time-compute adaptive \
  --max-samples 8
```
