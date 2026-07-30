# S74 — Knowledge Distillation: IDEIA como Plataforma de Melhoria Contínua de Modelos

## Score: 4.50 | Gap: Crítico

## O que o Modelo de IA Precisa

Modelos pequenos são mais rápidos e baratos, mas menos capazes. Destilação é a técnica que **transfere inteligência** de modelos grandes para pequenos. IDEIA precisa operacionalizar isso como um pipeline contínuo: o modelo grande (professor) ensina o pequeno (aluno) durante a noite, e o aluno serve as requisições do dia seguinte.

### Necessidades do Modelo que IDEIA Deve Atender

| Necessidade | Impacto no Modelo | O que IDEIA Precisa Prover |
|------------|-------------------|---------------------------|
| **Aprender raciocínio do professor** | Modelo pequeno sem destilação não desenvolve chain-of-thought | Pipeline R1-style: professor → gera trajetórias → filtra → SFT aluno |
| **Melhorar sem dados anotados** | Dados humanos são caros e escassos | Auto-destilação: modelo gera seus próprios dados e refina iterativamente |
| **Não degradar com auto-treinamento** | Treinar em saída sintética causa model collapse | TrajectoryFilter com verified-only + 60% âncora humana + diversity scoring |
| **Adaptar-se rápido a novos domínios** | Fine-tuning tradicional leva dias | Destilação cross-tokenizer: usa professor de domínio diferente (ex: DeepSeek → Qwen) |
| **ROI claro da destilação** | Custo do professor (API paga) vs. economia do aluno (local) | Budget tracking integrado com `@ideia/prompt-economy` — custo por sample, break-even |
| **Atualização contínua** | Modelo degrada com o tempo sem novos dados | Pipeline noturno automático: cron → gera → filtra → treina → avalia → deploy |

### Arquitetura: `@ideia/distillation-engine` como Ciclo Contínuo

```
┌──────────────────────────────────────────────────────────────────┐
│  LOOP DE DESTILAÇÃO CONTÍNUA (R1-Style)                           │
│                                                                    │
│  1. ReasoningDataGenerator                                         │
│     → Professor: DeepSeek-R1 / Claude Opus 4 / GPT-4o via API     │
│     → Gera N amostras com cadeias de pensamento (chain-of-thought) │
│     → Métodos: reasoning-r1 (default), logit, cross-tokenizer      │
│     → Batching: 10 amostras paralelas por chamada API              │
│     → Custo: monitorado por sample (ProfessorApiProvider)          │
│                                                                    │
│  2. TrajectoryFilter                                               │
│     → Estratégias: correctness, skill-aware, difficulty, diversity │
│     → SkillProfile: registra domínios e thresholds de fraqueza     │
│     → Verified-only: mantém só trajetórias verificadas (pass/fail) │
│     → Diversity scoring: evita duplicação semântica                │
│     → Max samples: 50K-800K por run (configurável)                 │
│                                                                    │
│  3. SFT Student (via QLoRA/PEFT)                                   │
│     → Aluno: modelo local (Qwen2.5-7B, LLaMA-3-8B)                │
│     → Treina com dados filtrados (TRL SFTTrainer)                  │
│     → Hiperparâmetros: epochs=3, lr=2e-4, batch=4, grad_accum=8   │
│     → Salva checkpoint + adapter (@ideia/finetuning-pipeline)      │
│     → BF16: habilitado para GPU moderna                            │
│                                                                    │
│  4. Evaluate                                                       │
│     → Benchmark contra baseline (MATH, HumanEval, GSM8K, GPQA)    │
│     → Reasoning Score: métrica composta de acurácia + COT quality  │
│     → Se não melhorou (delta <= 0), descarta e notifica            │
│     → Se degradou (delta < -2), rollback automático                │
│                                                                    │
│  5. Deploy (se passou no gate de qualidade)                        │
│     → Student vira o modelo default do projeto                     │
│     → Professor liberado para outros projetos                      │
│     → Notificação: melhoria/degração no dashboard                  │
│                                                                    │
│  6. Loop: repete a cada noite (schedule: "0 2 * * *")             │
│     → Histórico: tracking de scores por data                       │
│     → Tendência: modelo está melhorando? (slope do score)          │
│     → Break-even: quando o custo acumulado do professor            │
│       é menor que a economia de rodar o aluno                      │
└──────────────────────────────────────────────────────────────────┘
```

### Ajustes Específicos no IDEIA

| Onde | O que Ajustar | Para Quê |
|------|--------------|----------|
| `@ideia/distillation-engine` (NOVO) | Pipeline básico criado | Conectar professor real (DeepSeek/Claude API), pipeline R1-style completo |
| `@ideia/distillation-engine/src/professor-api.ts` | ProfessorApiProvider implementado (Anthropic/OpenAI/DeepSeek) | Adicionar Google Gemini, custos reais (não mock), retry com backoff |
| `@ideia/distillation-engine/src/data-generator.ts` | ReasoningDataGenerator gera samples mock | Conectar ProfessorApiProvider real; adicionar busca de prompts do repositório |
| `@ideia/distillation-engine/src/trajectory-filter.ts` | TrajectoryFilter implementado (3 estratégias) | Adicionar verified-by-execution (código compilável) e semantic similarity |
| `@ideia/distillation-engine/src/nightly-pipeline.ts` | NightlyDistillationPipeline com schedule | Conectar SFT real via finetuning-pipeline; notificações (slack/discord) |
| `@ideia/llm-provider` | ProviderRouter | Adicionar `professorMode: true` — usa provedor como professor (sem cache, temperatura alta, max_tokens alto) |
| `@ideia/quality-gates` | Quality gates atuais | Adicionar `DistillationGate` — compara qualidade aluno vs. professor antes de deploy |
| `@ideia/prompt-economy` | Budget tracking | Calcular ROI da destilação: custo professor vs. economia aluno |
| `@ideia/finetuning-pipeline` | SFT scaffold | Conectar como executor de treino do aluno (usa PEFT do S73) |
| `@ideia/performance-monitor` | Métricas de modelo | Adicionar `distillationMetrics: { studentScore, professorScore, delta, costSaved }` |

---

## Fase 1: Pesquisa

### 1.1 Contexto

- **Problema:** Modelos locais (7B-8B) são rápidos e baratos mas têm capacidade limitada em tarefas complexas (raciocínio matemático, código multi-arquivo, planejamento). Modelos grandes (70B+, ou APIs como Claude/DeepSeek-R1) resolvem bem mas são caros (Cloud API) ou lentos (70B local). Destilação é a ponte: transfere a capacidade do professor para o aluno local.
- **Público:** Todos os agentes que rodam localmente — Agent Runtime, Programmer, Reviewer, Architect. O aluno destilado melhora a qualidade de TODAS as operações sem aumentar custo de inferência.
- **Restrições:** Custo do professor (API paga: $1-15/M tokens dependendo do provedor). Pipeline noturno precisa caber em 8h (janela de baixo uso). Qualidade do aluno não pode degradar abaixo do baseline. IDEIA já tem `@ideia/distillation-engine` com scaffolding completo (6 arquivos, ~400 LOC) — falta conectar componentes reais.
- **Stack atual:** `DistillationPipeline` (pipeline orquestrador), `ReasoningDataGenerator` (gera samples mock), `TrajectoryFilter` (filtra samples com 4 estratégias), `ProfessorApiProvider` (Anthropic/OpenAI/DeepSeek), `NightlyDistillationPipeline` (cron + histórico), `types.ts` (tipos completos).

### 1.2 Tecnologias/Abordagens Consideradas

| Tecnologia | Tipo | Descrição | Maturidade | Licença |
|-----------|------|-----------|------------|---------|
| **R1-style Distillation** | Reasoning | Professor gera chain-of-thought completo; aluno aprende via SFT. Usado por DeepSeek-R1 para destilar modelos menores | Madura | MIT |
| **Logit Distillation** | Logit | Aluno aprende da distribuição de probabilidade do professor (soft targets). Requer mesmo tokenizer | Madura | MIT |
| **Cross-Tokenizer Distillation** | Híbrido | Professor e aluno com tokenizers diferentes; usa representações latentes (hidden states) | Experimental | MIT |
| **On-Policy Distillation** | RL | Aluno gera resposta, professor avalia e dá feedback (reward). Mais caro mas melhor qualidade | Experimental | Variada |
| **Self-Distillation** | Auto | Modelo gera seus próprios dados e refina iterativamente. Risco de model collapse | Emergente | - |
| **Multi-Professor Distillation** | Ensemble | Múltiplos professores (Claude + DeepSeek + GPT-4o); voting para resposta final | Experimental | - |

### 1.3 Pesquisa Realizada

- **Papers:** "DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning" (DeepSeek, 2025), "Distilling the Knowledge in a Neural Network" (Hinton et al., 2015), "Textbooks Are All You Need" (Gunasekar et al., 2023), "Contrastive Decoding" (O'Brien & Lewis, 2023)
- **Implementações de referência:** DeepSeek-R1 distillation pipeline, Axolotl (SFT), vLLM com suporte a distribuição logit, Hugging Face TRL
- **Benchmarks:** R1-style distillation: modelo 7B destilado atinge 70-85% da performance do professor (DeepSeek-R1 671B). Logit distillation: 80-90% da performance do professor. Custo: professor DeepSeek-R1 gera sample por ~$0.001; aluno local serve por $0 (custo fixo GPU). Break-even: ~50K samples (~$50 de professor) para 1 mês de operação.

---

## Fase 2: Matriz de Viabilidade

### 2.1 Pontuação (5 Dimensões)

| Dimensão | Peso | Score (0-5) | Ponderado | Observação |
|----------|------|-------------|-----------|------------|
| **Valor** | 3x | 5 | 15 | Transforma modelo local (grátis/rápido) em versão quase tão capaz quanto API paga |
| **Diferenciação** | 2x | 5 | 10 | Pipeline noturno contínuo + ROI tracking é único no mercado de IDEs |
| **Sinergia** | 2x | 5 | 10 | Engine completa já existe (6 arquivos), só precisa conectar componentes |
| **Custo-Benefício** | 2x | 4 | 8 | Custo API do professor (~$50-200/mês) vs. economia de não usar cloud para inferência |
| **Maturidade** | 1x | 4 | 4 | R1-style distillation madura (DeepSeek), logit distillation clássica, pipeline noturno validado |
| **Total** | 10x | | **47/50** | |

**Score: 4.70/5.0 → Gera TASK-IDEIA obrigatoriamente**

### 2.2 Análise de Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| **Model collapse** (treinar em saída sintética degrada) | Média | Alto | TrajectoryFilter com 60% verified-only; 40% dados humanos/curated; diversityScore >0.3 |
| **Custo do professor imprevisível** | Alta | Médio | Budget cap: `--max-cost $50/run`. ProfessorApiProvider com tracking de custo por chamada |
| **Qualidade do aluno insuficiente** | Média | Alto | Evaluation gate: "aluno < 80% professor → não deploy". Rollback automático se degradar |
| **Professor API instability** | Baixa | Médio | Fallback: se Anthropic falha → tenta DeepSeek → tenta OpenAI. Retry com exponential backoff |
| **Tokenizers incompatíveis** | Média | Baixo | Cross-tokenizer distillation via hidden states; fallback para R1-style com CoT textual |

### 2.3 Custo do Professor — API Pricing (ProfessorApiProvider)

| Provedor | Modelo | Custo Input (M tokens) | Custo Output (M tokens) | Ideal Para |
|----------|--------|----------------------|-----------------------|------------|
| **Anthropic** | Claude Opus 4 | $10 | $30 | Tarefas complexas (raciocínio, código) |
| **Anthropic** | Claude Sonnet 4 | $5 | $15 | Tarefas médias (explicação, sumarização) |
| **OpenAI** | GPT-4o | $5 | $15 | Tarefas gerais |
| **OpenAI** | o1 | $15 | $60 | Raciocínio profundo (STEM, matemática) |
| **DeepSeek** | deepseek-reasoner | $0.28 | $1.10 | Melhor custo-benefício para reasoning |
| **DeepSeek** | deepseek-chat | $0.27 | $0.27 | Chat geral, código |
| **Google** | Gemini 2.5 Pro | $5 | $20 | Contexto longo (1M tokens) |

**Custo estimado por sample (médio 500 tokens input + 2000 tokens output):**

| Provedor | Custo/Sample | 50K Samples | 500K Samples |
|----------|-------------|-------------|--------------|
| DeepSeek reasoner | $0.0025 | $125 | $1,250 |
| Claude Opus 4 | $0.065 | $3,250 | $32,500 |
| GPT-4o | $0.035 | $1,750 | $17,500 |

### 2.4 Estratégias de Filtragem (TrajectoryFilter)

| Estratégia | Descrição | Taxa de Retenção | Ideal Para |
|-----------|-----------|-----------------|------------|
| **correctness** | Mantém só samples verificados (expected answer match) | 30-50% | Tarefas com resposta objetiva (MATH, código) |
| **skill-aware** | Pondera por domínio onde aluno tem fraqueza | 40-60% | Adaptação geral contínua |
| **difficulty** | Prioriza samples mais difíceis (high score) | 20-40% | Acelerar aprendizado em tarefas complexas |
| **diversity** | Remove duplicatas semânticas (top-8 words prefix) | 60-80% | Evitar overfitting em tópicos repetidos |

#### Skill Profiles Registrados (NightlyDistillationPipeline)

```typescript
// @ideia/distillation-engine/src/nightly-pipeline.ts
this.filter.registerSkill({
  name: 'reasoning',
  domains: ['math', 'logic', 'reasoning', 'prove', 'explain'],
  weaknessThreshold: 0.9,
})
this.filter.registerSkill({
  name: 'coding',
  domains: ['code', 'function', 'implement', 'debug', 'test', 'api'],
  weaknessThreshold: 0.85,
})
this.filter.registerSkill({
  name: 'writing',
  domains: ['write', 'document', 'describe', 'summarize', 'explain'],
  weaknessThreshold: 0.7,
})
```

---

## Fase 3: Artefatos

### 3.1 Documentos Gerados

- [x] Estudo técnico completo (`docs/ESTUDOS/S72-S81-LIVROS-IA-EFICIENTE/S74-KNOWLEDGE-DISTILLATION.md`)
- [ ] ADR se aplicável (`docs/adr/ADR-xxx.md`)
- [x] Gap documentado no `GAPS-PRODUCAO-IDE.md`
- [ ] Tasks geradas (`TASK-IDEIA-xxx`)

### 3.2 Conexões com Estudos Existentes

| Estudo | Conexão | Impacto |
|--------|---------|---------|
| S72 - Model Compression | Aluno destilado pode ser quantizado (INT4) para deploy em hardware limitado | Alto |
| S73 - PEFT Fine-Tuning | SFT do aluno usa QLoRA/PEFT; pipeline de fine-tuning reutilizado | Alto |
| S75 - Inference Optimization | Aluno menor = inferência mais rápida; speculative decoding com aluno como draft | Alto |
| S76 - MoE Routing | Aluno pode ser modelo MoE (ex: Qwen3-MoE-A2.7B) para eficiência máxima | Médio |
| S77 - RLVR/GRPO | Após destilação, RLVR pode refinar ainda mais o aluno (pipeline R1 completo) | Alto |
| GS82 - Prompt Economy | Budget por complexity (N0-N5) afeta escolha: samples complexos (N4-N5) vão para professor | Médio |

### 3.3 Implementação — Estrutura Atual do DistillationEngine

```typescript
// @ideia/distillation-engine/src/distillation-pipeline.ts
export class DistillationPipeline {
  async run(config: DistillationRunConfig): Promise<DistillationReport> {
    const report: DistillationReport = {
      runId: `run-${Date.now()}`,
      config,
      datasetGenerated: 0,
      datasetAfterFilter: 0,
      status: 'generating',
    }
    // 1. Generate dataset via ReasoningDataGenerator
    const dataset = await this.generateDataset(config)
    report.datasetGenerated = dataset.samples.length
    
    // 2. Filter via TrajectoryFilter
    const filtered = this.filter.filter(dataset.samples, config.filtering)
    report.datasetAfterFilter = filtered.passed.length
    
    // 3. Train student via SFT (conectar com finetuning-pipeline)
    // 4. Evaluate against benchmarks
    // 5. Deploy se passou quality gate
    return report
  }
}
```

### 3.4 ProfessorApiProvider — Arquitetura de Chamadas

```typescript
// @ideia/distillation-engine/src/professor-api.ts
export class ProfessorApiProvider {
  async generate(
    prompt: string, 
    config: ProfessorConfig, 
    expectedAnswer?: string
  ): Promise<ProfessorApiResult> {
    switch (config.provider) {
      case 'anthropic': return this.callAnthropic(prompt, config, expectedAnswer, start)
      case 'openai':    return this.callOpenAI(prompt, config, expectedAnswer, start)
      case 'deepseek':  return this.callDeepSeek(prompt, config, expectedAnswer, start)
      default:          return this.mockCall(prompt, config, start)
    }
  }
  
  // Cada método:
  // 1. Chama API com prompt + chain-of-thought
  // 2. Retorna sample com { prompt, completion, professorModel, verified, metadata }
  // 3. Calcula custo baseado em input_tokens + output_tokens × pricing
}
```

### 3.5 NightlyDistillationPipeline — Configuração

```typescript
// @ideia/distillation-engine/src/nightly-pipeline.ts
const nightlyConfig: NightlyPipelineConfig = {
  schedule: '0 2 * * *',           // 2:00 AM todos os dias
  professorModel: 'deepseek-reasoner',
  professorProvider: 'deepseek',     // menor custo para reasoning
  studentModel: 'Qwen2.5-7B',        // modelo local eficiente
  minSamples: 50000,
  maxSamples: 800000,
  outputDir: './distillation-output',
  notifyOnImprovement: true,
  notifyOnDegradation: true,
}
```

### 3.6 Estratégia de Prompts para Geração de Dados

O `ReasoningDataGenerator` precisa de prompts diversos para gerar trajetórias ricas. Fontes de prompt:

| Fonte | Tipo | Prioridade | Quantidade |
|-------|------|-----------|------------|
| Histórico de prompts de agentes IDEIA | Real | Alta | 10K-100K |
| Benchmarks públicos (MATH, GSM8K, HumanEval) | Estruturado | Alta | 5K-20K |
| Repositório GitHub do projeto | Contextual | Média | 1K-5K |
| Prompt templates de agentes (Architect, Programmer) | Profissional | Média | 500-2K |
| Adversarial (casos onde aluno errou) | Correção | Alta | 100-1K |

---

## Fase 4: Ciclo de Vida

### 4.1 Roadmap

- **Fase de adoção:** Fase 9 (AI Safety) / Fase 7 (Performance) — pipeline contínuo de melhoria
- **Dependências:** `@ideia/finetuning-pipeline` com PEFTExecutor real (S73), `@ideia/local-ai` com vLLM (S75), `@ideia/quality-gates` estendido
- **Esforço estimado:** 48h — T1 (10h) + T2 (8h) + T3 (12h) + T4 (6h) + T5 (8h) + T6 (4h)

### 4.2 Revisão Periódica

- **Próxima revisão:** 2026-10-26 (3 meses)
- **Critérios para arquivamento:** Técnica de destilação estabilizada; pipeline rodando automaticamente há 3 meses sem incidentes
- **Critérios para reavaliação:** Novo método de destilação significativamente superior (ex: on-policy distillation via RL); mudança nos pricing das APIs de professor

### 4.3 Decisão Final

- **Aprovado:** Sim
- **Justificativa:** Crítico para melhorar qualidade do modelo local sem aumentar custo de inferência. Engine já implementada (6 arquivos, 3 classes principais). Faltam conexões reais: ProfessorApiProvider → Pipeline de Treino → Quality Gate → Deploy.
- **Data:** 2026-07-26
- **Responsável:** AI Engineering Team

### Tasks para Implementação

1. **T1:** Conectar professor real no `ReasoningDataGenerator` — suporte a Anthropic + OpenAI + DeepSeek via `ProfessorApiProvider.generate()`. Remover mock. Adicionar retry com exponential backoff e timeout configurável.
2. **T2:** Implementar `TrajectoryFilter` skill-aware completo — foca em trajetórias onde aluno erra mais usando histórico de erros do `@ideia/learning-engine`. Adicionar verified-by-execution para amostras de código (executa e verifica resultado).
3. **T3:** Criar pipeline noturno (cron): `ideia distill --schedule nightly` — conecta `NightlyDistillationPipeline` com `DistillationPipeline`, `ProfessorApiProvider`, `TrajectoryFilter`, e `PEFTExecutor` (S73). Gera dataset, filtra, treina, avalia e deploya automaticamente.
4. **T4:** Adicionar `DistillationGate` em quality-gates: "aluno > 90% professor no domínio?" — avalia em MATH, HumanEval, GSM8K. Se não passar, não faz deploy e notifica.
5. **T5:** Dashboard de destilação — `ideia dashboard distillation`: custo acumulado do professor, economia gerada pelo aluno, qualidade por iteração, histórico de scores, break-even chart.
6. **T6:** Testes: pipeline completo com mock de professor → SFT real (QLoRA 1 epoch) → evaluation. Assert: dataset gerado, filtrado, treinado sem erro.
7. **T7:** Multi-professor distillation — rodar com DeepSeek + Claude em paralelo; usar voting para amostras de alta confiança.
8. **T8:** Self-distillation loop — usar o próprio aluno como professor para gerar mais dados; risco controlado por diversity filter + verified-only threshold.
9. **T9:** Logit distillation mode — para modelos com mesmo tokenizer, usar KL divergence entre logits professor e aluno
10. **T10:** Cross-tokenizer distillation via hidden states — suporte a professor com tokenizer diferente do aluno

### 3.7 Logit Distillation — Algoritmo

Para modelos que compartilham o mesmo tokenizer (ex: Qwen2.5-7B professor → Qwen2.5-1.5B aluno), a destilação logit é mais eficiente que R1-style.

```
Loss = alpha * KL(softmax(logits_prof / T) || softmax(logits_aluno / T))
       + (1 - alpha) * CrossEntropy(logits_aluno, ground_truth)
       + beta * L2(hidden_states_prof, hidden_states_aluno)

Onde:
  T = temperatura de destilação (default: 2.0)
  alpha = peso da destilação (default: 0.5)
  beta = peso do MSE de hidden states (default: 0.1)
```

Vantagens vs R1-style:
- 3-5x mais rápido (não precisa gerar textos longos do professor)
- Preserva distribuição de probabilidade completa (não só a resposta amostrada)
- Menor custo (professor roda localmente)

Desvantagens:
- Requer mesmo tokenizer (ou mapeamento de tokens)
- Não captura chain-of-thought explícito
- Professor precisa rodar localmente (não pode ser API paga)

### 3.8 Cross-Tokenizer Distillation

Para pares professor-aluno com tokenizers diferentes (ex: DeepSeek-R1 → Qwen2.5-7B), usamos hidden states em vez de logits:

```typescript
export class CrossTokenizerDistillation {
  async distill(
    professor: LocalInference,
    student: LocalInference,
    dataset: DistillationDataset,
  ): Promise<DistillationReport> {
    // Para cada amostra:
    // 1. Roda professor (forward pass, captura hidden states da ultima camada)
    // 2. Roda aluno (forward pass, captura hidden states)
    // 3. Alinha hidden states via projecao linear (se dimensoes diferentes)
    // 4. MSE loss entre hidden states
    // 5. CrossEntropy loss nos logits do aluno (com ground truth)

    const alignmentLayer = new LinearLayer(
      professor.config.hiddenSize,  // ex: 8192 (DeepSeek)
      student.config.hiddenSize,    // ex: 3584 (Qwen 7B)
    )

    // Treina alignment + student em loop
    for (const batch of dataset) {
      const profStates = await professor.getHiddenStates(batch.prompt)
      const studStates = await student.getHiddenStates(batch.prompt)
      const alignedStates = alignmentLayer(profStates)

      const loss = mseLoss(alignedStates, studStates) + ceLoss(student.logits, batch.target)
      loss.backward()
      optimizer.step()
    }
  }
}
```

### 3.9 R1-Style Distillation — Formatos de Trajetória

O `DistillationMethod` suporta `'reasoning-r1'` como método default. O formato da trajetória gerada pelo professor:

```
TRAJETORIA R1-STYLE (formato padrao)
====================================

PROMPT:
"Solve the equation: 2x + 5 = 13"

PROFESSOR (DeepSeek-R1 via API):
[thinking]
We need to solve 2x + 5 = 13 for x.
First, subtract 5 from both sides: 2x = 13 - 5 = 8
Then, divide both sides by 2: x = 8 / 2 = 4
Verification: 2(4) + 5 = 8 + 5 = 13 ✓
[/thinking]

The solution is x = 4.

TRAJETORIA PARA SFT (formatada para treino):
<|im_start|>user
Solve the equation: 2x + 5 = 13<|im_end|>
<|im_start|>assistant
<reasoning>
We need to solve 2x + 5 = 13 for x.
Subtract 5: 2x = 8
Divide by 2: x = 4
Verify: 2(4) + 5 = 13 ✓
</reasoning>
The solution is x = 4.
<|im_end|>
```

### 3.10 Evaluation Metrics — DistillationGate

O `DistillationGate` avalia o aluno vs. professor antes de permitir deploy:

```typescript
export class DistillationGate {
  async evaluate(
    student: ModelInterface,
    professor: ModelInterface,
    benchmarks: BenchmarkSet,
  ): Promise<GateResult> {
    // Executa ambos os modelos nos benchmarks
    const studentEval = await this.runBenchmarks(student, benchmarks)
    const professorEval = await this.runBenchmarks(professor, benchmarks)

    // Calcula score composto
    const studentComposite = (
      studentEval.mathScore * 0.3 +
      studentEval.codeScore * 0.3 +
      studentEval.reasoningScore * 0.25 +
      studentEval.writingScore * 0.15
    )
    const professorComposite = (
      professorEval.mathScore * 0.3 +
      professorEval.codeScore * 0.3 +
      professorEval.reasoningScore * 0.25 +
      professorEval.writingScore * 0.15
    )

    const retention = studentComposite / professorComposite

    // Gate: aluno deve reter >90% da capacidade do professor
    const passed = retention >= 0.9

    return {
      passed,
      retention,
      studentScores: studentEval,
      professorScores: professorEval,
      deltaScore: studentComposite - professorComposite,
      recommendation: passed
        ? 'deploy' as const
        : retention > 0.8
          ? 'flag' as const  // deploy com alerta
          : 'block' as const, // bloqueia deploy
    }
  }

  private async runBenchmarks(
    model: ModelInterface,
    benchmarks: BenchmarkSet,
  ): Promise<EvaluationScores> {
    // Benchmarks compativeis com modelos locais:
    // - MATH: 100 problemas de matematica
    // - HumanEval: 164 problemas de codigo Python
    // - GSM8K: 200 problemas de raciocinio matematico
    // - MMLU-Pro: 100 questoes de knowledge geral
    return {
      mathScore: await model.evaluate(benchmarks.math),
      codeScore: await model.evaluate(benchmarks.humaneval),
      reasoningScore: await model.evaluate(benchmarks.gsm8k),
      writingScore: await model.evaluate(benchmarks.writing),
    }
  }
}
```

### 3.11 Analise de ROI da Destilacao

| Cenario | Custo Professor/mes | Custo Aluno/mes | Economia | Break-even |
|---------|-------------------|----------------|----------|------------|
| **Local (RTX 4090)** | $0 (local) | $0 (local) | Qualidade | Imediato |
| **DeepSeek-R1 API** | $500 (500K samples) | $0 (local) | $500/mes | ~45 dias |
| **Claude Opus API** | $3,250 (500K samples) | $0 (local) | $3,250/mes | ~10 dias |
| **GPT-4o API** | $1,750 (500K samples) | $0 (local) | $1,750/mes | ~20 dias |

Nota: O custo do professor é investimento único por iteração de destilação. O aluno serve todas as requisições subsequentes a custo marginal zero (hardware já pago). Para um time de 5 devs fazendo ~1000 chamadas/dia, o break-even ocorre em 10-45 dias dependendo do professor escolhido.
