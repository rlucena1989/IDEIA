# Cognitive Coprocessor — Processamento Coparticipativo de IA

## Conceito

Camada de cognição operacional onde o devkit **participa do raciocínio da IA** com cálculos determinísticos, validação e estruturação de contexto. A IA raciocina com apoio do devkit, não sozinha.

## Os 8 Pilares

| Função                     | Descrição                                                   | Comando CLI                     |
| -------------------------- | ----------------------------------------------------------- | ------------------------------- |
| `normalizeInput()`         | Limpa, valida e extrai features de dados brutos             | `ai-devkit coprocess normalize` |
| `computeMetrics()`         | Métricas multidimensionais para contexto de raciocínio      | `ai-devkit coprocess metrics`   |
| `rankPriorities()`         | Ranqueamento multicritério (urgência, impacto, risco)       | `ai-devkit coprocess rank`      |
| `detectInconsistencies()`  | Contradições lógicas, numéricas e contra regras             | `ai-devkit coprocess detect`    |
| `simulateOutcomes()`       | Simulação what-if (determinística, heurística, monte-carlo) | `ai-devkit coprocess simulate`  |
| `validateAnswer()`         | Valida resposta da IA (schema, numérica, lógica)            | `ai-devkit coprocess validate`  |
| `generateReasoningHints()` | Dicas para guiar raciocínio da IA                           | `ai-devkit coprocess hints`     |
| `prepareContextForLLM()`   | Pipeline completo → pacote de contexto cognitivo            | `ai-devkit coprocess context`   |

## Pipeline Cognitivo

```
Input → normalizeInput → computeMetrics → detectInconsistencies →
rankPriorities → simulateOutcomes → generateReasoningHints →
validateAnswer → Contexto estruturado para LLM
```

## Uso via CLI

```bash
# Pipeline completo
ai-devkit coprocess run '[10, 20, 30, 40, 50]'

# Métricas para LLM
ai-devkit coprocess metrics '[1,2,3,4,5]' --json

# Ranqueamento
ai-devkit coprocess rank '[{"id":"1","label":"Bug","urgency":10,"impact":8,"risk":9}]'

# Simulação
ai-devkit coprocess simulate '{"name":"test","variables":{"risk":80,"effort":30}}' --mode monte-carlo

# Validação de resposta da IA
ai-devkit coprocess validate '[1,2,6]' --ground-truth '[1,2,3]'

# Dicas de raciocínio
ai-devkit coprocess hints 'calcule a média dos valores 10, 20 e 30'

# Contexto completo para LLM
ai-devkit coprocess context '[10, 20, 30]' --llm-ready
```

## Integração com Pipeline de IA

Ative o middleware de coprocessamento para interceptar chamadas de IA:

```typescript
import { configureCoprocessor, coprocessBefore, coprocessAfter } from './cognitive-coprocessor/integration';

// Antes de chamar a IA
const hints = coprocessBefore(userInput);

// Depois da resposta da IA
const validation = coprocessAfter(aiResponse, userInput);
```

## Relação com Engine Existente

O Cognitive Coprocessor **reutiliza** os seguintes módulos existentes:

- `scripts/acceleration/calculation-engine.ts` — execução de cálculos
- `scripts/acceleration/numerical-engine.ts` — funções numéricas (sum, mean, stddev)
- `scripts/acceleration/stats-engine.ts` — funções estatísticas (median, correlation)
- `scripts/acceleration/physics-engine.ts` — cálculos físicos
- `scripts/acceleration/math-parser.ts` — parsing de expressões
- `scripts/acceleration/formula-registry.ts` — fórmulas registradas
- `scripts/acceleration/route-selector.ts` — roteamento determinístico vs IA
- `packages/cli/src/runtime/request-normalizer.ts` — normalização de requests

## Testes

```bash
npm test -- cognitive-coprocessor
```
