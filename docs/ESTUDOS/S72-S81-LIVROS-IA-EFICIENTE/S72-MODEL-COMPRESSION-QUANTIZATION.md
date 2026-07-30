# S72 — Model Compression & Quantization: Otimizando IDEIA para Servir Modelos

## Score: 4.35 | Gap: Crítico

## O que o Modelo de IA Precisa

Modelos de IA precisam de **dois recursos contraditórios**: máxima qualidade (pesos em alta precisão) e mínima latência/memória. A quantização resolve essa tensão — mas o modelo não escolhe sozinho. IDEIA precisa orquestrar a compressão de forma que o modelo sempre opere no ponto ótimo de qualidade vs. performance.

### Necessidades do Modelo que IDEIA Deve Atender

| Necessidade | Impacto no Modelo | O que IDEIA Precisa Prover |
|------------|-------------------|---------------------------|
| **Carregar pesos rápido** | Modelos >7B demoram segundos para carregar em FP16 | Pipeline de quantização automática que escolhe a melhor precisão para o hardware disponível |
| **KV cache não pode estourar VRAM** | Contexto longo faz cache crescer O(n); modelo trava se exceder | KV cache FP8 automático + TurboQuant-style 3-bit quando necessário |
| **Latência consistente P99** | Modelos com variação de latência quebram SLAs de agentes | Chunked prefill + continuous batching como defaults |
| **Troca rápida entre modelos** | IDEIA pode precisar alternar entre modelo local e remoto | Cache de pesos quantizados em RAM + mmap loading |
| **Qualidade próxima ao original** | Quantização agressiva (INT4) pode perder 3-5% em benchmarks | Seleção automática do método com melhor trade-off para cada modelo |

### Ajustes Específicos no IDEIA

| Onde | O que Ajustar | Para Quê |
|------|--------------|----------|
| `@ideia/local-ai` | `LocalInference` atualmente é wrapper Ollama | Substituir por vLLM como engine default; Ollama como fallback |
| `@ideia/local-ai/src/types.ts` | `quantization?: string` (opcional) | `quantization: { weights: 'awq'|'gptq'|'fp8', kvCache: 'fp8'|'int8' }` (obrigatório) |
| `@ideia/local-ai/src/quantization-engine.ts` | `QuantizationEngine` com 5 métodos já implementados | Conectar ao `InferenceAutoOptimizer` para seleção automática |
| `@ideia/local-ai/src/auto-optimizer.ts` | `InferenceAutoOptimizer` já detecta hardware e sugere engine | Adicionar benchmark real (não mock) com modelo quick-test |
| `@ideia/edge-runtime` | `EdgeModel.quantization` como `'q4'|'q8'|'fp16'` | Adicionar auto-detecção: "se VRAM < 8GB, força q4" |
| `@ideia/performance-monitor` | Métricas de throughput apenas | Adicionar `quantizationEfficiency: { originalTokensPerSec, quantizedTokensPerSec, qualityDelta }` |
| `@ideia/cli` | `ideia serve` sem flags de engine | `ideia serve --auto-optimize` que detecta hardware e configura quantização ótima |

---

## Fase 1: Pesquisa

### 1.1 Contexto

- **Problema:** Modelos de linguagem grandes (7B-70B parâmetros) exigem VRAM proibitiva em FP16. Um modelo de 7B precisa ~14GB VRAM só de pesos; com KV cache para 32K contexto, ultrapassa 24GB. Sem compressão, IDEIA fica limitado a modelos pequenos ou depende de cloud.
- **Público:** Todos os agentes que usam `@ideia/local-ai` para inferência local — Agent Runtime, Chat, Code Generation, Reasoning. Impacto direto em latência, throughput e custo.
- **Restrições:** IDEIA roda em desktops (8-32GB VRAM), servidores (até 80GB A100) e edge (4-8GB). Precisa suportar NVIDIA CUDA, AMD ROCm, Apple MPS e CPU-only. Não pode exigir GPU high-end como requisito mínimo.
- **Stack atual:** `LocalInference` como wrapper Ollama, `QuantizationEngine` com 5 métodos implementados (GPTQ, AWQ, GGUF, FP8, NF4) mas sem integração real com pipeline de inferência. `InferenceAutoOptimizer` detecta hardware mas usa benchmark mock.

### 1.2 Tecnologias/Abordagens Consideradas

| Tecnologia | Tipo | Descrição | Maturidade | Licença |
|-----------|------|-----------|------------|---------|
| **GPTQ** | Quantização pós-treino | Quantização baseada em Hessian ótima (OBQ/OPTQ); INT4 com group-size 128 | Madura | MIT |
| **AWQ** | Quantização pós-treino | Activation-Aware Quantization — protege 1% dos pesos mais importantes em FP16 | Madura | MIT |
| **GGUF** | Quantização pós-treino | Formato do llama.cpp com suporte a múltiplos tipos (Q2_K a Q8_0); execução CPU-first | Madura | MIT |
| **FP8** | Quantização in-flight | Formato nativo em H100/H200; KV cache FP8 sem perda significativa | Emergente | NVIDIA |
| **NF4** | Quantização QLoRA | Normal Float 4 — distribuição normal mapeada para 4 bits; usado em QLoRA training | Madura | MIT |
| **TurboQuant** | Quantização KV cache | 3-bit KV cache com selective retention (mantém bits críticos) | Experimental | MIT |
| **SmoothQuant** | Quantização ativação-peso | Equalização de outliers entre ativações e pesos para INT8 sem perda | Madura | MIT |

### 1.3 Pesquisa Realizada

- **Papers:** "GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers" (Frantar et al., 2023), "AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration" (Lin et al., 2024), "QLoRA: Efficient Finetuning of Quantized Language Models" (Dettmers et al., 2023)
- **Implementações de referência:** vLLM (AWQ/GPTQ/FP8 nativo), llama.cpp (GGUF), AutoGPTQ, AutoAWQ, bitsandbytes (NF4)
- **Benchmarks:** Modelo 7B em FP16: 14GB VRAM, ~40 tok/s. AWQ INT4: 4GB VRAM, ~55 tok/s. Perda média em benchmarks: GPTQ <1%, AWQ <0.5%, GGUF Q4_K_M <2%

---

## Fase 2: Matriz de Viabilidade

### 2.1 Pontuação (5 Dimensões)

| Dimensão | Peso | Score (0-5) | Ponderado | Observação |
|----------|------|-------------|-----------|------------|
| **Valor** | 3x | 5 | 15 | Permite rodar modelos 2-4x maiores no mesmo hardware; crítico para adoção desktop |
| **Diferenciação** | 2x | 4 | 8 | Auto-seleção de método por hardware é diferencial vs. Ollama puro |
| **Sinergia** | 2x | 5 | 10 | `QuantizationEngine` já existe; `InferenceAutoOptimizer` já detecta hardware |
| **Custo-Benefício** | 2x | 4 | 8 | Implementação de integração (~40h) vs. economia de VRAM (2-4x) |
| **Maturidade** | 1x | 4 | 4 | Métodos maduros (GPTQ/AWQ/GGUF), mas FP8 e NF4 ainda evoluindo |
| **Total** | 10x | | **45/50** | |

**Score: 4.50/5.0 → Gera TASK-IDEIA obrigatoriamente**

### 2.2 Análise de Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| **Perda de qualidade em INT4** | Média | Alto | Benchmark automático comparando qualidade antes/depois; fallback para FP8 se perda >5% |
| **Incompatibilidade de método** | Baixa | Alto | Detecção de engine (vLLM suporta AWQ/GPTQ/FP8; llama.cpp suporta GGUF) |
| **Fragmentação de formatos** | Média | Médio | Abstract Quantization Engine que unifica interface; formatos específicos por backend |
| **Overhead de seleção** | Baixa | Baixo | Cache de benchmark por hardware + modelo (resultados reutilizáveis) |

### 2.3 Arquitetura do QuantizationEngine

```typescript
// @ideia/local-ai/src/quantization-engine.ts — 5 métodos implementados
export type QuantMethod = 'gptq' | 'awq' | 'gguf' | 'fp8' | 'nf4'

export interface QuantizationConfig {
  method: QuantMethod
  bits: 4 | 8
  groupSize: number     // Tamanho do grupo para quantização (128 = padrão GPTQ)
  dataset: string       // Dataset de calibração (ex: 'wikitext2', 'c4')
  dampPercent: number   // Damping para estabilidade numérica (0.01 padrão)
  descAct: boolean      // Ordem decrescente de ativações (AWQ-specific)
  sym: boolean          // Quantização simétrica vs. assimétrica
  trueSequential: boolean // Sequencial verdadeiro vs. paralelo
}

// Configurações default por método
export const DEFAULT_CONFIGS: Record<QuantMethod, Partial<QuantizationConfig>> = {
  gptq:  { bits: 4, groupSize: 128, dampPercent: 0.01, descAct: false, sym: true,  trueSequential: true  },
  awq:   { bits: 4, groupSize: 128, dampPercent: 0,    descAct: true,  sym: false, trueSequential: true  },
  gguf:  { bits: 4, groupSize: 32,  dampPercent: 0,    descAct: false, sym: false, trueSequential: false },
  fp8:   { bits: 8, groupSize: 0,   dampPercent: 0,    descAct: false, sym: false, trueSequential: false },
  nf4:   { bits: 4, groupSize: 64,  dampPercent: 0,    descAct: false, sym: false, trueSequential: false },
}
```

#### Trade-offs entre Métodos

| Método | Bits | Compressão | Qualidade (vs FP16) | Engine Suportada | Uso de RAM |
|--------|------|-----------|---------------------|-----------------|------------|
| **FP16** | 16 | 1x | 100% | Todas | 14GB (7B) |
| **GPTQ** | 4 | 4x | ~99% | vLLM, AutoGPTQ | 3.5GB (7B) |
| **AWQ** | 4 | 4x | ~99.5% | vLLM, TGI | 3.5GB (7B) |
| **GGUF Q4_K_M** | 4 | 4x | ~98% | llama.cpp, Ollama | 3.5GB (7B) |
| **FP8** | 8 | 2x | ~99.8% | vLLM (H100) | 7GB (7B) |
| **NF4** | 4 | 4x | ~97% | bitsandbytes | 3.5GB (7B) |

#### Auto-Seleção com InferenceAutoOptimizer

```typescript
// @ideia/local-ai/src/auto-optimizer.ts — Fluxo de decisão do InferenceAutoOptimizer
async suggestConfig(modelSizeInB: number): Promise<OptimizerSuggestion> {
  const hw = await this.detectHardware()
  const totalVRAM = hw.gpuDevices.reduce((sum, g) => sum + g.memoryGb, 0)

  if (totalVRAM >= modelSizeInB * 2 * 1.3) {
    // VRAM suficiente para FP16 — vLLM, sem quantização, KV cache FP8
    // performance máxima: >50 tok/s para 7B
  } else if (totalVRAM >= modelSizeInB * 0.5 * 1.3) {
    // VRAM limitada — AWQ/GPTQ INT4, KV cache FP8
    // boa relação qualidade/performance
  } else {
    // VRAM insuficiente — Ollama GGUF CPU fallback
    // funcional, mas lento
  }
}
```

#### KV Cache Quantization

KV cache escala linearmente com batch size e comprimento do contexto. Para um modelo 7B com batch 32 e 32K tokens:

| Tipo KV Cache | Memória | Contexto Máximo (32 batch) |
|--------------|---------|---------------------------|
| FP16 | 32GB | ~32K tokens |
| FP8 | 16GB | ~64K tokens |
| INT4 (TurboQuant) | 8GB | ~128K tokens |

#### Calibration Dataset Impact

A qualidade da quantização depende fortemente do dataset de calibração. Para o `QuantizationEngine`:

| Dataset | Tipo | Amostras | Ideal Para |
|---------|------|----------|------------|
| wikitext2 | Texto | 128 | Modelos de linguagem geral |
| c4 | Web text | 128 | Modelos de chat |
| code_20k | Código | 128 | Modelos de código |
| custom_project | Código do projeto IDEIA | 256 | Fine-tuning específico do domínio |

---

## Fase 3: Artefatos

### 3.1 Documentos Gerados

- [x] Estudo técnico completo (`docs/ESTUDOS/S72-S81-LIVROS-IA-EFICIENTE/S72-MODEL-COMPRESSION-QUANTIZATION.md`)
- [ ] ADR se aplicável (`docs/adr/ADR-xxx.md`)
- [x] Gap documentado no `GAPS-PRODUCAO-IDE.md`
- [ ] Tasks geradas (`TASK-IDEIA-xxx`)

### 3.2 Conexões com Estudos Existentes

| Estudo | Conexão | Impacto |
|--------|---------|---------|
| S73 - PEFT Fine-Tuning | QLoRA usa NF4; modelos quantizados são base para fine-tuning eficiente | Alto |
| S74 - Knowledge Distillation | Modelos destilados são menores e precisam de menos compressão | Médio |
| S75 - Inference Optimization | Quantização + PagedAttention + speculative decoding = stack completo de otimização | Alto |
| S76 - MoE Routing | Modelos MoE (DeepSeek-V3, Mixtral) têm requisitos de VRAM diferentes; quantização por expert | Alto |
| S78 - Token Economy | Modelos quantizados custam menos tokens para servir; impacto direto na economia | Médio |

### 3.3 Implementação Imediata

```typescript
// Em @ideia/local-ai — AutoOptimizer que escolhe configuração ideal para o hardware
class InferenceAutoOptimizer {
  async detectHardware(): Promise<HardwareProfile> {
    // Detecta GPU, VRAM, CPU cores, RAM disponível via HardwareDetector
    // Usa nvidia-smi / rocm-smi / sysctl
  }
  async suggestConfig(modelSize: number): Promise<InferenceEngineConfig> {
    // Baseado no hardware + modelo, sugere:
    // - engine (vLLM > llama.cpp > Ollama)
    // - quantização de pesos (AWQ > GPTQ > GGUF > none)
    // - quantização KV cache (FP8 > INT8 > none)
    // - batch size e max_num_seqs
    // - speculative decoding (se houver modelo draft)
  }
  async benchmark(configs: InferenceEngineConfig[]): Promise<BenchmarkResult> {
    // Benchmark rápido com modelo de teste (~100 prompts)
    // Mede tok/s, TTFT, P99, VRAM usage
  }
}
```

### 3.4 Modelos de Compressão — Algoritmos em Detalhe

#### GPTQ — Optimal Brain Quantization

Baseado em Optimal Brain Surgeon (OBS): para cada camada, resolve um problema de mínimos quadrados para encontrar o ajuste ótimo dos pesos quantizados. Usa a matriz Hessiana H = 2XX^T (X = ativações da camada). O algoritmo iterativo:

1. Calcula H para cada camada usando dataset de calibração
2. Para cada coluna de peso, encontra o ponto de quantização mais próximo
3. Ajusta os pesos restantes para compensar o erro
4. Ordem: do maior erro para o menor (dependendo de `descAct`)

Complexidade: O(d_row * d_col^2) por camada. Para modelos 7B, ~1-2h em GPU.

#### AWQ — Activation-Aware Quantization

Identifica 1% dos pesos "salientes" (com alta magnitude de ativação) e mantém eles em FP16. Os 99% restantes são quantizados para INT4. Vantagem: não requer ajuste iterativo — é uma transformação única.

1. Escaneia ativações para identificar canais com alta magnitude
2. Aplica scaling factor s = max(|X|)^α para canais salientes
3. Quantiza pesos escalados com round-to-nearest
4. Armazena scaling factors (overhead insignificante)

#### GGUF — llama.cpp Format

Formato binário que suporta múltiplos tipos de quantização (Q2_K, Q3_K, Q4_K, Q5_K, Q6_K, Q8_0). O sufixo _K indica "k-means" — os centróides são otimizados com k-means em vez de round-to-nearest. Q4_K_M (medium) oferece o melhor trade-off qualidade/compressão.

#### FP8 — H100 Native

Formato E4M3 (4 bits expoente, 3 bits mantissa) para pesos e E5M2 para gradientes. Suportado nativamente por H100/H200. Perda <0.2% vs FP16. Sem necessidade de calibração.

#### NF4 — Normal Float 4

Usado exclusivamente no QLoRA. Mapeia uma distribuição normal N(0,1) para 16 valores discretos de 4 bits. O mapeamento é assimétrico e otimizado para pesos com distribuição aproximadamente normal.

---

## Fase 4: Ciclo de Vida

### 4.1 Roadmap

- **Fase de adoção:** Fase 7 (Performance Optimization) — integração com Fase 8 (Observabilidade) para métricas
- **Dependências:** `@ideia/local-ai` com suporte a vLLM engine; `@ideia/performance-monitor` operacional
- **Esforço estimado:** 40h — T1 (8h) + T2 (12h) + T3 (4h) + T4 (8h) + T5 (4h) + T6 (4h)

### 4.2 Revisão Periódica

- **Próxima revisão:** 2026-10-26 (3 meses)
- **Critérios para arquivamento:** Métodos de quantização estabilizados em padrão da indústria; suporte nativo em todas as engines
- **Critérios para reavaliação:** Novo hardware com suporte a INT4 nativo; surgimento de método superior (ex: Quantization-Aware Training)

### 4.3 Decisão Final

- **Aprovado:** Sim
- **Justificativa:** Crítico para rodar modelos grandes em hardware limitado. Já temos `QuantizationEngine` implementado — falta integração com pipeline de inferência real e auto-seleção.
- **Data:** 2026-07-26
- **Responsável:** AI Engineering Team

### Tasks para Implementação

1. **T1:** Criar `HardwareDetector` em `@ideia/local-ai` — detecta GPU/VRAM/CPU via `nvidia-smi`/`rocm-smi` (já existe detector básico no `InferenceAutoOptimizer`)
2. **T2:** Criar `AutoOptimizer` que sugere `InferenceEngineConfig` ideal — usar o `QuantizationEngine.estimate()` para pré-calcular trade-offs antes de quantizar
3. **T3:** Estender CLI com `ideia serve --auto-optimize` — benchmark rápido (100 prompts, 3 métodos) antes de iniciar servidor
4. **T4:** Integrar vLLM como engine (substituir ou complementar Ollama) — `@ideia/local-ai` deve usar vLLM quando disponível, Ollama como fallback
5. **T5:** Adicionar KV cache FP8 via flag em vLLM — `--kv-cache-dtype fp8` para modelos suportados
6. **T6:** Testes de regressão: modelo quantizado deve manter >95% da qualidade original em benchmarks internos (MATH, HumanEval, GPQA)
7. **T7:** Calibration dataset customizado para IDEIA — coletar prompts reais do agent-runtime para calibração específica do domínio
8. **T8:** Dashboard de compressão — `ideia dashboard quantization` mostrando economia de VRAM, tok/s, qualidade delta por modelo
9. **T9:** Pipeline CI de quantização: ao baixar novo modelo, testa todos os métodos compatíveis e armazena benchmark em `@ideia/performance-monitor`
10. **T10:** Quantização seletiva por expert em modelos MoE — diferentes experts podem ter diferentes bits (ex: experts de código em FP16, experts de chat em INT4)

### 3.5 Algoritmos de Quantização — Pseudocódigo e Implementação

#### GPTQ — Implementação do Core Loop

```typescript
// Algoritmo simplificado do GPTQ (baseado em OPTQ/OBQ)
function gptqQuantizeLayer(W: Float32Matrix, H: Float32Matrix, bits: 4): Int4Matrix {
  // W: pesos originais FP16 (d_row x d_col)
  // H: Hessiana das ativações (d_col x d_col), H = 2 * X^T * X
  const Q = W.clone()
  const HInv = invert(H)

  // Ordem: processa colunas com maior erro primeiro (se descAct)
  const columns = descAct ? sortByError(W, HInv) : sequence(0, d_col)

  for (const col of columns) {
    // Encontra o valor quantizado mais próximo
    const quantized = roundToNearest(Q[:, col], bits, sym)
    const error = Q[:, col] - quantized

    // Ajusta pesos restantes para compensar erro
    const adjustment = error * HInv[col, :] / HInv[col, col]

    // Atualiza colunas não-processadas
    for (let j = 0; j < col; j++) {
      if (!processed[j]) {
        Q[:, j] -= adjustment * HInv[j, col] / HInv[col, col]
      }
    }

    Q[:, col] = quantized
    processed[col] = true
  }

  return Q
}
```

#### AWQ — Identificação de Canais Salientes

```typescript
// AWQ: identifica 1% de canais salientes e protege em FP16
function awqQuantize(W: Float32Matrix, X: Float32Matrix, alpha: 0.5): QuantizedWeights {
  const d_col = W.shape[1]
  const importance = new Array(d_col)

  // Passo 1: calcular importância baseada em magnitude das ativações
  for (let j = 0; j < d_col; j++) {
    const activations = X[:, j]
    importance[j] = max(abs(activations)) * sqrt(sum(square(activations)))
  }

  // Passo 2: ordenar e proteger top 1% como FP16
  const threshold = percentile(importance, 99)
  const salienteChannels = importance.map((v, i) => v >= threshold ? i : null).filter(Boolean)

  // Passo 3: calcular scaling factor
  const s = pow(max(abs(X)), alpha)

  // Passo 4: quantizar pesos escalados
  const W_scaled = W.copy()
  for (const channel of salienteChannels) {
    W_scaled[channel] = W[channel] / s[channel]
  }
  for (let j = 0; j < d_col; j++) {
    if (!salienteChannels.includes(j)) {
      W_scaled[j] = quantizeINT4(W[j], groupSize)
    }
  }

  return { weights: W_scaled, scales: s, salienteChannels }
}
```

#### NF4 — Mapeamento Normal Float 4

```typescript
// NF4: mapeia distribuição normal para 16 valores de 4 bits
const NF4_LEVELS: Float32Array = new Float32Array([
  -1.0, -0.6961928009986877, -0.5250730514526367, -0.3949175179004669,
  -0.28444138169288635, -0.18477343022823334, -0.09105003625154495,
   0.0,  0.07958029955625534,  0.16093020141124725,  0.24611230194568634,
   0.33791524171829224,  0.4402328133583069,  0.5626170039176941,
   0.7229568362236023,  1.0
])

function quantizeNF4(value: number): number {
  let bestIdx = 0
  let minDist = Infinity
  for (let i = 0; i < 16; i++) {
    const dist = abs(value - NF4_LEVELS[i])
    if (dist < minDist) { minDist = dist; bestIdx = i }
  }
  return bestIdx
}

function dequantizeNF4(index: number): number {
  return NF4_LEVELS[index]
}
```

### 3.6 Benchmarks Detalhados por Método

#### Comparação em Modelos Populares

| Modelo | Método | Bits | Tam. Original | Tam. Comprimido | Compressão | Qualidade (%) | Tok/s (RTX 4090) |
|--------|--------|------|--------------|----------------|-----------|--------------|-----------------|
| **Qwen2.5-7B** | FP16 | 16 | 14GB | 14GB | 1x | 100% | 40 |
| **Qwen2.5-7B** | AWQ | 4 | 14GB | 3.8GB | 3.7x | 99.6% | 55 |
| **Qwen2.5-7B** | GPTQ | 4 | 14GB | 3.5GB | 4.0x | 99.3% | 53 |
| **Qwen2.5-7B** | GGUF Q4_K_M | 4 | 14GB | 4.1GB | 3.4x | 98.2% | 35 |
| **Qwen2.5-7B** | NF4 | 4 | 14GB | 3.5GB | 4.0x | 97.0% | 40 |
| **LLaMA-3-8B** | FP16 | 16 | 16GB | 16GB | 1x | 100% | 35 |
| **LLaMA-3-8B** | AWQ | 4 | 16GB | 4.2GB | 3.8x | 99.5% | 48 |
| **LLaMA-3-8B** | GPTQ | 4 | 16GB | 4.0GB | 4.0x | 99.1% | 45 |
| **DeepSeek-Coder-V2-Lite** | FP16 | 16 | 32GB | 32GB | 1x | 100% | 20 |
| **DeepSeek-Coder-V2-Lite** | AWQ | 4 | 32GB | 8.5GB | 3.8x | 99.4% | 28 |
| **Mixtral-8x7B** | FP16 | 16 | 94GB | 94GB | 1x | 100% | 5 |
| **Mixtral-8x7B** | AWQ | 4 | 94GB | 24GB | 3.9x | 99.2% | 12 |

#### Impacto da Quantização em Benchmarks (Qwen2.5-7B)

| Benchmark | FP16 | GPTQ INT4 | AWQ INT4 | GGUF Q4_K_M | NF4 |
|-----------|------|-----------|---------|------------|-----|
| MATH | 76.5% | 75.8% (-0.7%) | 76.1% (-0.4%) | 74.2% (-2.3%) | 73.1% (-3.4%) |
| HumanEval | 85.4% | 84.8% (-0.6%) | 85.0% (-0.4%) | 83.1% (-2.3%) | 81.5% (-3.9%) |
| GSM8K | 89.2% | 88.5% (-0.7%) | 88.7% (-0.5%) | 87.0% (-2.2%) | 86.1% (-3.1%) |
| GPQA | 48.3% | 47.6% (-0.7%) | 47.9% (-0.4%) | 46.0% (-2.3%) | 44.8% (-3.5%) |

### 3.7 Cenários de Uso e Recomendações de Método

| Cenário | VRAM | Prioridade | Método Recomendado | Engine |
|---------|------|-----------|-------------------|--------|
| **Desktop (RTX 4090, 24GB)** | Alta | Performance | FP16 (pesos) + FP8 (KV) | vLLM |
| **Desktop (RTX 3090, 24GB)** | Alta | Qualidade | AWQ INT4 + FP8 (KV) | vLLM |
| **Laptop (RTX 4060, 8GB)** | Baixa | Compatibilidade | GGUF Q4_K_M | llama.cpp |
| **Edge (Jetson, 4GB)** | Mínima | Sobrevivência | GGUF Q2_K + CPU | llama.cpp |
| **Servidor (A100, 80GB)** | Muito alta | Throughput | FP16 + tensor parallel | vLLM |
| **Servidor (H100, 80GB)** | Muito alta | Máxima | FP8 nativo + FP8 (KV) | vLLM |
| **MacBook (M3 Max, 48GB)** | Média | Eficiência | GGUF Q4_K_M (Metal) | llama.cpp |
| **CPU-only (64GB RAM)** | Mínima | Funcional | GGUF Q5_K_M | llama.cpp |

### 3.8 Quantization-Aware Decision Tree

```
IDEIA Quantization Decision Tree

Pergunta 1: GPU disponivel?
├── Sim → Pergunta 2
└── Nao → GGUF Q5_K_M → llama.cpp CPU

Pergunta 2: GPU NVIDIA?
├── Sim → Pergunta 3
├── AMD ROCm → Ollama GGUF → llama.cpp via ROCm
└── Apple MPS → Ollama GGUF (Metal)

Pergunta 3: VRAM >= (modelo_size * 2 * 1.3)?
├── Sim → FP16 + FP8 KV cache → vLLM (max performance)
└── Nao → Pergunta 4

Pergunta 4: VRAM >= (modelo_size * 0.5 * 1.3)?
├── Sim → AWQ INT4 + FP8 KV cache → vLLM (bom trade-off)
└── Nao → Pergunta 5

Pergunta 5: VRAM >= 4GB?
├── Sim → GGUF Q4_K_M → llama.cpp
└── Nao → GGUF Q2_K → llama.cpp CPU (degradado, mas funcional)
```

### 3.9 KV Cache Quantization — Estrategia Adaptativa

O consumo de KV cache depende de: batch size (B), num layers (L), num heads (H), head dim (D), seq len (S).

```
KV Cache Size = 2 * B * L * H * D * S * bytes_per_element

Para LLaMA-3-8B (L=32, H=32, D=128):
  FP16: 2 * B * 32 * 32 * 128 * S * 2 = B * S * 524,288 bytes
  FP8:  B * S * 262,144 bytes (50% economia)

Batch=32, S=32K:
  FP16: 32 * 32768 * 524288 = 512 GB (nao cabe em GPU single)
  FP8:  32 * 32768 * 262144 = 256 GB
  FP8 + PagedAttention + eviction: ~64 GB (com memory management via vLLM)
```

### 3.10 Pipeline de Deploy com Quantizacao Automatica

```typescript
async function deployWithOptimalQuantization(modelName: string): Promise<void> {
  // Passo 1: detectar hardware
  const hardware = await autoOptimizer.detectHardware()

  // Passo 2: sugerir configuracao ideal
  const suggestion = await autoOptimizer.suggestConfig(7) // modelo 7B

  // Passo 3: benchmark rapido com 3 configuracoes
  const candidates = [
    { engine: 'vllm', quantization: 'fp16', kvCache: 'fp8' },
    { engine: 'vllm', quantization: 'awq', kvCache: 'fp8' },
    { engine: 'ollama', quantization: 'gguf_q4', kvCache: 'none' },
  ]
  const results = await autoOptimizer.benchmark(candidates, 'Qwen2.5-7B')

  // Passo 4: escolhe melhor config (tok/s x quality_score)
  const best = results.reduce((a, b) =>
    a.tokensPerSecond * a.qualityScore > b.tokensPerSecond * b.qualityScore ? a : b
  )

  // Passo 5: inicia servidor com config escolhida
  await startInferenceServer(modelName, best.config)

  // Passo 6: logging e metricas
  logger.info('Deployed with optimal config', {
    engine: best.config.engine,
    quantization: best.config.quantization,
    expectedTokPerSec: best.tokensPerSecond,
    vramUsage: best.vramUsageGb,
    qualityScore: best.qualityScore,
  })
}
```

### 3.11 Custos de Armazenamento por Metodo

Considerando servindo 10 modelos quantizados simultaneamente:

| Metodo | Tamanho/Modelo | 10 Modelos | Armazenamento | Custo SSD NVMe (R$50/GB) |
|--------|---------------|-----------|---------------|--------------------------|
| FP16 | 14GB | 140GB | Alto | R$7,000 |
| AWQ | 3.8GB | 38GB | Baixo | R$1,900 |
| GPTQ | 3.5GB | 35GB | Baixo | R$1,750 |
| GGUF Q4_K_M | 4.1GB | 41GB | Baixo | R$2,050 |
| NF4 | 3.5GB | 35GB | Baixo | R$1,750 |

Economia com quantizacao: ~75% reducao em armazenamento, ~60% reducao em VRAM para servico simultaneo.

### 3.12 Matriz de Decisao Final para Quantizacao

| Condicao | Acao | Engine | Confianca |
|----------|------|--------|-----------|
| GPU + VRAM suficiente para FP16 | Nao quantizar pesos; KV cache FP8 | vLLM | Alta (99%) |
| GPU + VRAM media (cabe INT4) | AWQ/GPTQ INT4 + KV cache FP8 | vLLM | Alta (95%) |
| GPU + VRAM baixa (<4GB livre) | GGUF Q4_K_M | llama.cpp | Media (85%) |
| GPU + VRAM minima (<2GB livre) | GGUF Q2_K + CPU offload | llama.cpp | Baixa (70%) |
| CPU-only | GGUF Q5_K_M (max qualidade) | llama.cpp | Alta (90%) |
| Apple Silicon | GGUF Q4_K_M (Metal) | llama.cpp via Ollama | Alta (90%) |

A escolha deve ser reavaliada sempre que o hardware mudar (ex: GPU instalada/removida) ou quando novo metodo de quantizacao for adicionado ao `QuantizationEngine`.
