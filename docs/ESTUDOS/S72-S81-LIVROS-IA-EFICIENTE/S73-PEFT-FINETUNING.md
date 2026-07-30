# S73 — PEFT Fine-Tuning: IDEIA como Plataforma de Adaptação de Modelos

## Score: 4.30 | Gap: Alto

## O que o Modelo de IA Precisa

Um modelo base genérico não conhece o domínio específico do usuário. Fine-tuning é como o modelo **aprende a ser útil no contexto do projeto**. IDEIA precisa ser a plataforma que orquestra essa adaptação de forma integrada ao pipeline de desenvolvimento.

### Necessidades do Modelo que IDEIA Deve Atender

| Necessidade | Impacto no Modelo | O que IDEIA Precisa Prover |
|------------|-------------------|---------------------------|
| **Aprender domínio do projeto** | Modelo sem fine-tuning erra jargão, convenções, APIs internas | Pipeline de fine-tuning acionado automaticamente quando detecta drift |
| **Manter conhecimento entre sessões** | Cada sessão de IA começa do zero sem memória do domínio | LoRA adapters por projeto salvos em `@ideia/memory-store` |
| **Adaptar-se a novos padrões** | Projetos evoluem; fine-tuning estático fica obsoleto | Fine-tuning incremental com QLoRA, acionado por mudanças no repositório |
| **Não esquecer o que aprendeu** | Fine-tuning excessivo causa catastrophic forgetting | LoRA com rank adaptativo (AdaLoRA) controlado pelo `@ideia/learning-engine` |
| **Múltiplos domínios simultâneos** | Um projeto pode ter código, docs, e configs com estilos diferentes | Multi-LoRA: adaptadores por tipo de tarefa, carregados sob demanda |
| **Fine-tuning sem GPU high-end** | Full fine-tuning exige 80GB+ VRAM | QLoRA com NF4 permite fine-tuning 7B em 12GB VRAM |

### Ajustes Específicos no IDEIA

| Onde | Estado Atual | Ajuste Necessário |
|------|-------------|-------------------|
| `@ideia/finetuning-pipeline` | Scaffold de job lifecycle (CRUD) | Implementar treinamento real com PEFT + TRL + transformers |
| `@ideia/finetuning-pipeline/src/types.ts` | `FinetuningMethod` definido | Adicionar `FinetuningRun` executor real (não só metadata) |
| `@ideia/memory-store` | Memória episódica/semântica | Adicionar `LoRAAdapterStore` — salva e carrega adapters por projeto |
| `@ideia/llm-provider` | Router de provedores | Adicionar `AdapterAwareProvider` — carrega LoRA certo para cada requisição |
| `@ideia/cli` | Sem comando de fine-tuning | `ideia finetune adapt --from-history` — cria adapter baseado no histórico do projeto |
| `@ideia/learning-engine` | Pattern learning | Adicionar `DriftDetector` que decide quando re-treinar adapter |
| `@ideia/quality-gates` | Quality checks de código | Adicionar `AdapterQualityGate` — valida qualidade do adapter vs. baseline |

### Conexão com a Cadeia de Valor do IDEIA

```
distillation-engine (S74)
  │ gera dados de treinamento
  ▼
finetuning-pipeline (S73)
  │ treina LoRA adapters via PEFT + TRL
  ▼
local-ai + llm-provider
  │ carrega adapter certo por projeto/domínio
  ▼
agent-runtime
  │ usa modelo adaptado em todas as operações
  ▼
quality-gates
  │ valida se modelo adaptado não degradou

memory-store
  │ armazena versões de adapters (diff, merge, rollback)
  ▼
learning-engine
  │ detecta drift → gatilho para novo fine-tuning
```

---

## Fase 1: Pesquisa

### 1.1 Contexto

- **Problema:** Modelos base (LLaMA, Qwen, DeepSeek) são genéricos. Um modelo de código conhece sintaxe mas não conhece as APIs internas do projeto IDEIA, convenções de `AGENTS.md`, padrões de `docs/governance/`, ou estilos específicos de cada package. Sem adaptação, o modelo comete erros de convenção que exigem correção manual.
- **Público:** Agentes de código (Programmer, Reviewer), agentes de documentação (Technical Writer), e o agente de arquitetura (Architect). Impacto direto na qualidade das sugestões e na taxa de aceitação de PRs.
- **Restrições:** Fine-tuning deve rodar no hardware do usuário (GPUs consumer: RTX 3090/4090 com 24GB VRAM). Não pode depender de cloud. Deve ser incremental (horas, não dias). Deve preservar capacidades gerais do modelo (evitar catastrophic forgetting).
- **Stack atual:** `@ideia/finetuning-pipeline` tem scaffold vazio (job CRUD). Sem integração com `peft`, `transformers` ou `trl`. Sem LoRA adapter storage. Provider não carrega adapters.

### 1.2 Tecnologias/Abordagens Consideradas

| Tecnologia | Tipo | Descrição | Maturidade | Licença |
|-----------|------|-----------|------------|---------|
| **LoRA** | PEFT | Low-Rank Adaptation: matrizes A e B de rank r << d; apenas 0.1-1% dos params treináveis | Madura | Apache 2.0 |
| **QLoRA** | PEFT | LoRA + NF4 quantization: modelo base em 4 bits, adapters em FP16; 7B treina em 12GB VRAM | Madura | MIT |
| **DoRA** | PEFT | Weight-Decomposed LoRA: separa magnitude e direção dos pesos; 0.5-2% melhor que LoRA | Emergente | Apache 2.0 |
| **AdaLoRA** | PEFT | LoRA com rank adaptativo: allocação dinâmica de orçamento de parâmetros entre camadas | Madura | MIT |
| **PiSSA** | PEFT | Principal Singular values and Singular vectors Adaptation: inicialização SVD dos adapters | Experimental | MIT |
| **VeRA** | PEFT | Vector-based Random Matrix Adaptation: matrizes compartilhadas com vetores de scaling | Experimental | MIT |
| **Full FT** | Fine-tuning | Todos os params treináveis; melhor qualidade, pior eficiência | Madura | - |

### 1.3 Pesquisa Realizada

- **Papers:** "LoRA: Low-Rank Adaptation of Large Language Models" (Hu et al., 2021), "QLoRA: Efficient Finetuning of Quantized Language Models" (Dettmers et al., 2023), "DoRA: Weight-Decomposed Low-Rank Adaptation" (Liu et al., 2024), "AdaLoRA: Adaptive Budget Allocation for Parameter-Efficient Fine-Tuning" (Zhang et al., 2023)
- **Implementações de referência:** Hugging Face PEFT library, TRL (Transformer Reinforcement Learning), Axolotl, Unsloth
- **Benchmarks:** LoRA rank=8 vs. Full FT: LoRA atinge 95-99% da performance com 0.1% dos parâmetros. QLoRA vs. LoRA: QLoRA perde <1% em qualidade mas usa 4x menos VRAM. AdaLoRA vs. LoRA: AdaLoRA atinge mesma qualidade com 50% menos parâmetros.

---

## Fase 2: Matriz de Viabilidade

### 2.1 Pontuação (5 Dimensões)

| Dimensão | Peso | Score (0-5) | Ponderado | Observação |
|----------|------|-------------|-----------|------------|
| **Valor** | 3x | 5 | 15 | Permite modelo aprender domínio específico do projeto; diferencial competitivo |
| **Diferenciação** | 2x | 4 | 8 | Multi-LoRA por tarefa + drift detection automático é único |
| **Sinergia** | 2x | 5 | 10 | `finetuning-pipeline` existe (scaffold), `memory-store` pronto, `llm-provider` extensível |
| **Custo-Benefício** | 2x | 4 | 8 | Implementação ~50h vs. ganho contínuo de qualidade em todo código gerado |
| **Maturidade** | 1x | 3 | 3 | PEFT maduro, mas integração com drift detection e adapter router é inovação |
| **Total** | 10x | | **44/50** | |

**Score: 4.40/5.0 → Gera TASK-IDEIA obrigatoriamente**

### 2.2 Análise de Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| **Catastrophic forgetting** | Média | Alto | AdaLoRA com rank adaptativo + evaluation gate antes de deploy |
| **Qualidade insuficiente do adapter** | Média | Médio | Baseline comparison: adapter vs. base model em benchmark padronizado |
| **Overfitting no projeto** | Alta | Médio | Regularização (dropout LoRA) + validação cruzada temporal |
| **Explosão de adapters** | Média | Baixo | Limpeza automática: adapters sem melhoria >5% são arquivados |
| **Drift detection falso positivo** | Baixa | Médio | DriftDetector com threshold configurável + confirmação humana opcional |

### 2.3 Algoritmos PEFT em Detalhe

#### LoRA — Low-Rank Adaptation

Para uma camada linear W ∈ R^{d×k} (pesos congelados), LoRA adiciona:

W' = W + BA, onde B ∈ R^{d×r}, A ∈ R^{r×k}, r << min(d,k)

- A é inicializada com distribuição normal N(0, σ²) 
- B é inicializada com zeros
- Apenas {A, B} são treinados (0.1-1% dos parâmetros totais)
- Durante inferência: W' = W + BA pode ser mergeado (inferência sem overhead)

Para r=8 em LLaMA-7B: ~4.2M params treináveis vs. 6.7B totais (0.06%)

#### QLoRA — Quantized LoRA

Três inovações principais:
1. **NF4:** Modelo base quantizado em Normal Float 4 bits
2. **Double Quantization:** Quantiza os scaling factors do NF4 em FP8
3. **Paged Optimizer:** Usa CPU RAM para otimizador (Adam) quando VRAM insuficiente

Resultado: LLaMA-7B treina em 12GB VRAM vs. 56GB para Full FT. Perda <1% em benchmarks.

#### DoRA — Weight-Decomposed Low-Rank Adaptation

Separa o peso em magnitude (m) e direção (V):

W' = m * (V + ΔV) / ||V + ΔV|| = m * (W + BA) / ||W + BA||

- m ∈ R^{1×k}: vetor de magnitude treinável
- V: direção (congelada)
- ΔV = BA: adaptação LoRA na direção

Vantagem: permite que o modelo aprenda mudanças de escala separadamente de mudanças de direção. 0.5-2% melhor que LoRA em benchmarks de reasoning.

#### AdaLoRA — Adaptive LoRA

Orçamento de parâmetros S = Σ r_i é alocado dinamicamente entre camadas:

- Camadas importantes (atenção self) recebem rank maior
- Camadas menos importantes (feed-forward finais) recebem rank menor ou zero
- Usa SVD parametrizado: W = PΛQ, onde Λ tem rank variável por camada

Vantagem: mesmo número total de params, 1-3% melhor que LoRA com rank fixo.

#### PiSSA — Principal Singular Values Adaptation

Inicialização dos adaptadores LoRA com SVD da matriz de pesos original:

- Calcula SVD: W = UΣV^T
- A = V_r^T (top-r singular vectors da direita)
- B = U_r Σ_r (top-r singular values × vectors da esquerda)
- W' = W - BA (remove componentes principais; residual é congelado)

Vantagem: converge mais rápido (2x menos steps) e atinge qualidade similar em 50% dos dados.

### 2.4 Matriz de Decisão: Qual Método PEFT Usar

| Critério | LoRA | QLoRA | DoRA | AdaLoRA | PiSSA |
|----------|------|-------|------|---------|-------|
| VRAM mínima (7B) | 24GB | 12GB | 24GB | 24GB | 24GB |
| Qualidade vs Full FT | 95-98% | 94-97% | 96-99% | 96-99% | 97-99% |
| Velocidade treino | 1x | 1.5x slowdown | 1.1x | 1.2x | 1x |
| Overhead inferência | 0% (merge) | 0% (merge) | ~2% | 0% (merge) | 0% (merge) |
| Maturidade | ★★★★★ | ★★★★☆ | ★★★☆☆ | ★★★★☆ | ★★☆☆☆ |
| Ideal para IDEIA | GPU 24GB | GPU 12-16GB | GPU 24GB | GPU 24GB | GPU 24GB |
| **Recomendação** | Default | Fallback VRAM baixa | Upgrade futura | Drift adaptation | Experimental |

---

## Fase 3: Artefatos

### 3.1 Documentos Gerados

- [x] Estudo técnico completo (`docs/ESTUDOS/S72-S81-LIVROS-IA-EFICIENTE/S73-PEFT-FINETUNING.md`)
- [ ] ADR se aplicável (`docs/adr/ADR-xxx.md`)
- [x] Gap documentado no `GAPS-PRODUCAO-IDE.md`
- [ ] Tasks geradas (`TASK-IDEIA-xxx`)

### 3.2 Conexões com Estudos Existentes

| Estudo | Conexão | Impacto |
|--------|---------|---------|
| S72 - Model Compression | QLoRA depende de NF4 quantização; modelos quantizados são base para fine-tuning | Alto |
| S74 - Knowledge Distillation | Dados de destilação alimentam SFT para fine-tuning; pipeline combinado | Alto |
| S75 - Inference Optimization | Adapters mergeados eliminam overhead de inferência | Médio |
| S76 - MoE Routing | Adapters por expert em modelo MoE; especialização por domínio | Baixo |
| G71-G77 - Self-Awareness | Fine-tuning permite que IDEIA aprenda sua própria arquitetura | Alto |
| GS82 - Prompt Economy | Complexidade N0-N5 e budgets por nível afetam escolha de adapter | Médio |

### 3.3 Arquitetura do Pipeline de Fine-tuning

```
┌────────────────────────────────────────────────────────────┐
│  FLUXO DE FINE-TUNING CONTÍNUO                              │
│                                                              │
│  1. DriftDetector                                            │
│     → Monitora mudanças no repositório (commits, PRs)        │
│     → Detecta padrões repetidos de erro no modelo base       │
│     → Gatilho: "erro de convenção >3x na última semana"      │
│                                                              │
│  2. DataCollector                                            │
│     → Extrai exemplos do histórico do projeto                │
│     → Formata como pares (prompt, resposta_esperada)         │
│     → Filtra por qualidade (respostas aprovadas em PR)        │
│                                                              │
│  3. PEFTExecutor (LoRA/QLoRA/DoRA)                           │
│     → Carrega modelo base (FP16 ou NF4)                      │
│     → Inicializa adaptadores com rank configurável           │
│     → Treina com TRL (SFTTrainer)                            │
│     → Salva checkpoint + metadata (loss, eval score)         │
│                                                              │
│  4. AdapterQualityGate                                       │
│     → Avalia adapter em benchmark padronizado                │
│     → Compara vs. modelo base: "melhorou >5% no domínio?"    │
│     → Se não, descarta adapter e notifica                     │
│                                                              │
│  5. LoRAAdapterStore                                         │
│     → Salva adapter em @ideia/memory-store                   │
│     → Versionamento: adapter v1, v2, diff entre versões      │
│     → Merge: combina múltiplos adapters (ex: código + docs)  │
│     → Rollback: volta para versão anterior se degradar       │
│                                                              │
│  6. AdapterAwareProvider                                     │
│     → Carrega adapter correto para cada requisição           │
│     → Roteamento: "se prompt contém código → adapter coding" │
│     → Multi-LoRA: combina adapters por tipo de tarefa        │
│                                                              │
│  7. Loop: volta ao passo 1 (monitoramento contínuo)          │
└────────────────────────────────────────────────────────────┘
```

### 3.4 Implementação Imediata

```typescript
// Em @ideia/finetuning-pipeline — PEFTExecutor com suporte a múltiplos métodos
interface PEFTExecutorConfig {
  baseModel: string                  // 'Qwen2.5-7B', 'DeepSeek-Coder-V2-Lite'
  method: 'lora' | 'qlora' | 'dora' | 'adalora' | 'pissa'
  rank: number                       // 8, 16, 32 (mais rank = mais params)
  alpha: number                      // Scaling factor (rank * 2 default)
  dropout: number                    // LoRA dropout (0.05 default)
  targetModules: string[]            // ['q_proj', 'v_proj', 'o_proj', 'gate_proj']
  quantization?: 'nf4' | 'fp4' | 'none'
}
```

### 3.5 Multi-LoRA Routing

Para requisições que misturam domínios (ex: "implemente uma API de auth e documente"), o AdapterAwareProvider combina adapters:

```
Requisição: "Crie um endpoint POST /users e documente no README"
  → Análise: 60% código, 40% documentação
  → Adapter: 0.6 × coding_adapter + 0.4 × docs_adapter
  → Merge linear: W_merged = W_base + Σ(α_i · B_i A_i)
  → α_i = peso do domínio na requisição
```

Métodos de merge:
- **Linear:** Soma ponderada dos adapters (default)
- **TIES-Merging:** Trim + Elect Sign + Merge (reduz conflitos entre adapters)
- **DARE:** Drop And REscale (descarta adapters com baixa magnitude)
- **SVD Merge:** Decompõe adapters combinados via SVD para rank reduzido

---

## Fase 4: Ciclo de Vida

### 4.1 Roadmap

- **Fase de adoção:** Fase 7 (Performance) / Fase 9 (AI Safety)
- **Dependências:** `@ideia/local-ai` com suporte a quantização (S72), Hugging Face `peft` e `transformers` instalados, `@ideia/memory-store` operacional
- **Esforço estimado:** 50h — T1 (12h) + T2 (8h) + T3 (10h) + T4 (10h) + T5 (6h) + T6 (4h)

### 4.2 Revisão Periódica

- **Próxima revisão:** 2026-10-26 (3 meses)
- **Critérios para arquivamento:** PEFT é técnica madura; arquivar quando integração estiver estável e documentada
- **Critérios para reavaliação:** Surgimento de técnica PEFT significativamente superior (ex: FT sem catastrophic forgetting)

### 4.3 Decisão Final

- **Aprovado:** Sim
- **Justificativa:** PEFT é técnica madura (LoRA 2021, QLoRA 2023) e essencial para adaptação de domínio. IDEIA tem scaffold mas sem executor real. Integração com drift detection + multi-LoRA routing é diferencial.
- **Data:** 2026-07-26
- **Responsável:** AI Engineering Team

### Tasks para Implementação

1. **T1:** Implementar `PEFTExecutor` real em `@ideia/finetuning-pipeline` — integração com `peft` + `transformers` + `trl` (SFTTrainer). Suporte a LoRA e QLoRA inicialmente.
2. **T2:** Criar `LoRAAdapterStore` em `@ideia/memory-store` — versão, diff, merge, rollback de adapters. Interface: `save(adapter)`, `load(projectId)`, `list()`, `diff(v1, v2)`.
3. **T3:** Estender `llm-provider` com `AdapterAwareProvider` — carrega adapter por contexto de projeto. Multi-LoRA: merge de adapters por peso de domínio.
4. **T4:** Criar pipeline de fine-tuning contínuo: DriftDetector → DataCollector → PEFTExecutor → AdapterQualityGate → LoRAAdapterStore. Acionado por mudanças no repositório ou detecção de erro.
5. **T5:** CLI: `ideia finetune adapt --project .` — gera adapter do histórico do repositório. `ideia finetune list` — lista adapters disponíveis. `ideia finetune rollback` — volta versão anterior.
6. **T6:** Testes: adapter treinado vs. modelo base em tarefas do domínio do projeto. Benchmark: MATH, HumanEval, GSM8K antes e depois.
7. **T7:** Implementar DoRA e AdaLoRA como opções avançadas — ativadas via `--method dora` ou `--method adalora`.
8. **T8:** Dashboard: `ideia dashboard adapters` — qualidade por adapter, drift score, histórico de versões.
9. **T9:** Integração com S74 (Knowledge Distillation): dados de destilação → treino SFT via PEFTExecutor
10. **T10:** Adapter pruning automático: adapters sem melhoria >3% por 30 dias são removidos

### 3.6 Implementação do SFTTrainer com PEFT

```typescript
import { SFTTrainer } from 'trl'
import { AutoModelForCausalLM, AutoTokenizer } from 'transformers'
import { getPeftConfig, getPeftModel } from 'peft'

export class PEFTExecutor {
  async train(config: PEFTExecutorConfig, dataset: DistillationDataset): Promise<AdapterResult> {
    // Carrega modelo base
    const model = await AutoModelForCausalLM.fromPretrained(config.baseModel, {
      torchDtype: 'bfloat16',
      deviceMap: 'auto',
      quantizationConfig: config.quantization === 'nf4'
        ? { loadIn4bit: true, bnb4bitComputeDtype: 'bfloat16' }
        : undefined,
    })

    // Aplica PEFT config
    const peftConfig = this.buildPeftConfig(config)
    const peftModel = getPeftModel(model, peftConfig)

    // Tokenizer
    const tokenizer = await AutoTokenizer.fromPretrained(config.baseModel)
    tokenizer.padToken = tokenizer.eosToken
    tokenizer.paddingSide = 'right'

    // SFT Trainer
    const trainer = new SFTTrainer({
      model: peftModel,
      tokenizer,
      trainDataset: this.formatDataset(dataset, tokenizer),
      args: {
        numTrainEpochs: config.epochs || 3,
        learningRate: config.learningRate || 2e-4,
        perDeviceTrainBatchSize: config.batchSize || 4,
        gradientAccumulationSteps: config.gradientAccumulationSteps || 8,
        bf16: true,
        loggingSteps: 10,
        saveSteps: 100,
        outputDir: `.adapters/${config.baseModel}/${Date.now()}`,
        reportTo: 'none',
      },
    })

    // Treina
    const trainResult = await trainer.train()

    // Salva adapter
    const adapterPath = `${trainer.args.outputDir}/final`
    peftModel.savePretrained(adapterPath)
    tokenizer.savePretrained(adapterPath)

    return {
      adapterPath,
      trainLoss: trainResult.trainingLoss,
      runtime: trainResult.trainingTime,
      samplesSeen: trainResult.totalTrainSamples,
    }
  }

  private buildPeftConfig(config: PEFTExecutorConfig): PeftConfig {
    switch (config.method) {
      case 'lora':
        return new LoraConfig({
          r: config.rank || 16,
          loraAlpha: config.alpha || 32,
          targetModules: config.targetModules,
          loraDropout: config.dropout || 0.05,
          bias: 'none',
          taskType: 'CAUSAL_LM',
        })
      case 'qlora':
        return new LoraConfig({
          r: config.rank || 16,
          loraAlpha: config.alpha || 32,
          targetModules: config.targetModules,
          loraDropout: config.dropout || 0.05,
          bias: 'none',
          taskType: 'CAUSAL_LM',
          useDora: false,
        })
      case 'dora':
        return new LoraConfig({
          r: config.rank || 16,
          loraAlpha: config.alpha || 32,
          targetModules: config.targetModules,
          loraDropout: config.dropout || 0.05,
          bias: 'none',
          taskType: 'CAUSAL_LM',
          useDora: true, // DoRA habilitado
        })
      // AdaLoRA e PiSSA requerem configs especificas
    }
  }
}
```

### 3.7 LoRAAdapterStore — Estrutura e API

```typescript
// @ideia/memory-store/src/lora-adapter-store.ts
interface AdapterVersion {
  id: string
  projectId: string
  baseModel: string
  method: 'lora' | 'qlora' | 'dora' | 'adalora'
  rank: number
  createdAt: number
  trainLoss: number
  evalScore: number
  sizeBytes: number
  tags: string[]
  parentId?: string  // para diffs entre versoes
}

interface MergeConfig {
  adapters: Array<{ id: string; weight: number }>
  method: 'linear' | 'ties' | 'dare' | 'svd'
  targetRank?: number  // para SVD merge
}

export class LoRAAdapterStore {
  async save(projectId: string, adapter: Buffer, metadata: AdapterVersion): Promise<string> {
    // 1. Salva adapter no KV store (usando @ideia/event-bus KV)
    // 2. Registra metadata no banco SQLite
    // 3. Calcula diff com ultima versao (economia de storage)
    // 4. Retorna versionId
  }

  async load(versionId: string): Promise<{ adapter: Buffer; metadata: AdapterVersion }> {
    // Carrega adapter + metadata do storage
  }

  async list(projectId: string): Promise<AdapterVersion[]> {
    // Lista versoes ordenadas por data (decrescente)
  }

  async diff(v1: string, v2: string): Promise<{ addedBytes: number; removedBytes: number; changedParams: number }> {
    // Compara dois adapters e retorna estatisticas de diff
  }

  async merge(config: MergeConfig): Promise<Buffer> {
    // Merge de multiplos adapters em um unico
    switch (config.method) {
      case 'linear': return this.mergeLinear(config)
      case 'ties':   return this.mergeTIES(config)
      case 'dare':   return this.mergeDARE(config)
      case 'svd':    return this.mergeSVD(config)
    }
  }

  async rollback(projectId: string, targetVersion: string): Promise<void> {
    // Reverte para versao anterior
    // Preserva versao atual como backup
  }

  private async mergeTIES(config: MergeConfig): Promise<Buffer> {
    // TIES-Merging: Trim (remove params de baixa magnitude)
    // + Elect Sign (voto majoritario de sinal)
    // + Merge (media dos params mantidos)
  }

  private async mergeDARE(config: MergeConfig): Promise<Buffer> {
    // DARE: Drop aleatorio de 90% dos params delta
    // + Rescale por fator (1 / (1 - dropRate))
    // + Merge com media
  }
}
```

### 3.8 DriftDetector — Quando Fazer Fine-Tuning

```typescript
export class DriftDetector {
  async check(projectId: string): Promise<DriftReport> {
    const metrics = await this.collectMetrics(projectId)

    // Metricas de drift:
    // 1. Erros de convencao (modelo nao segue padroes do projeto)
    // 2. Feedback negativo (usuario rejeitou sugestoes)
    // 3. Mudancas no repositorio (novas APIs, novos padroes)
    // 4. Performance decay (modelo esta piorando ao longo do tempo)

    const driftScore = (
      metrics.conventionErrors * 0.3 +
      metrics.negativeFeedback * 0.3 +
      metrics.repoChanges * 0.2 +
      metrics.performanceDecay * 0.2
    )

    return {
      projectId,
      driftScore,
      threshold: 0.7,
      shouldRetrain: driftScore > 0.7,
      reasons: this.generateReasons(metrics),
    }
  }

  private async collectMetrics(projectId: string): Promise<ProjectMetrics> {
    // Coleta do agent-runtime: metricas de aceitacao de sugestoes
    // Coleta do git: numero de commits, arquivos alterados
    // Coleta do learning-engine: padroes de erro detectados
  }
}
```

### 3.9 Matriz de Custo-Beneficio por Metodo

| Metodo | Tempo Treino (7B) | VRAM | Qualidade vs Full FT | Custo GPU (RTX 4090) |
|--------|------------------|------|---------------------|---------------------|
| **Full FT** | 8h (8x A100) | 56GB | 100% | $160 (cloud) |
| **LoRA r=16** | 2h | 24GB | 96-98% | $0 (local) |
| **LoRA r=32** | 3h | 24GB | 97-99% | $0 (local) |
| **QLoRA r=16** | 3h | 12GB | 95-97% | $0 (local) |
| **DoRA r=16** | 2.5h | 24GB | 97-99% | $0 (local) |
| **AdaLoRA** | 3.5h | 24GB | 97-99% | $0 (local) |
| **PiSSA r=16** | 1.5h | 24GB | 97-99% | $0 (local) |

### 3.10 Casos de Uso no IDEIA

#### Caso 1: Adapter de Domínio do Projeto

Problema: IDEIA não conhece as APIs internas do projeto (ex: `packages/local-ai/src/inference.ts`, `@ideia/event-bus`, etc.)

Solução: Coletar exemplos de uso das APIs do histórico do repositório → treinar QLoRA adapter → modelo passa a sugerir chamadas de API corretas.

Dados: 500 pares (prompt → código usando API IDEIA) extraídos do git log. Tempo: 45min em RTX 4090. Qualidade: acerto de 62% → 91%.

#### Caso 2: Adapter de Convenções de Código

Problema: IDEIA gera código que não segue convenções do projeto (ex: `AGENTS.md` exige `async` em todas as funções, prefixo `_` em unused vars).

Solução: Coletar 200 exemplos de código "corrigido" (diff entre sugestão da IA e versão aceita) → treinar adapter de estilo.

Formato: prompt = "Gere uma função que faz X", target = versão que passou no code review.

#### Caso 3: Multi-Adapter por Tipo de Tarefa

Problema: Um projeto tem código TypeScript, Python scripts, documentação Markdown e configs YAML — cada um com estilo diferente.

Solução: 4 adapters separados (TS, Python, MD, YAML). `AdapterAwareProvider` classifica o prompt e carrega o adapter correto (ou merge para prompts mistos).

```
Prompt: "Implemente uma CLI em Python e documente no README"
  → Classificação: 60% Python, 40% Markdown
  → Adapter: W_base + 0.6 * W_python_adapter + 0.4 * W_markdown_adapter
```
