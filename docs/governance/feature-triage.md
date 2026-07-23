# Triagem de Features — v2.1 e v2.2

## Metodologia

Cada feature candidata foi avaliada em 6 dimensões:

| Dimensão         | Escala | Descrição                        |
| ---------------- | ------ | -------------------------------- |
| Impacto          | 1-10   | Quanto valor entrega             |
| Risco            | 1-10   | Chance de causar regressão       |
| Esforço          | 1-10   | Quantidade de trabalho estimada  |
| Dependências     | 0-N    | Quantos outros módulos precisa   |
| Estabiliza base  | bool   | Torna o sistema mais confiável   |
| Amplia autonomia | bool   | Reduz necessidade de intervenção |

## Fórmula

```
benefit  = impacto + (estabiliza_base ? 20 : 0) + (amplia_autonomia ? 15 : 0)
penalty  = risco + esforço + dependências * 5
score    = benefit - penalty
```

## Regras de Target

| Condição                         | Target    |
| -------------------------------- | --------- |
| `estabiliza_base && risco <= 4`  | v2.1      |
| `amplia_autonomia && risco <= 6` | v2.2      |
| demais casos                     | post-v2.2 |

## Features que Mudaram de Target

| Feature                     | Target Inicial | Target Final | Motivo da Mudança                                                   |
| --------------------------- | -------------- | ------------ | ------------------------------------------------------------------- |
| Autonomy Status Persistence | v2.2           | v2.1         | Risk=1, stabilizesBase=true. Base necessária para autonomia futura. |
| MCP Server                  | v2.1           | v2.2         | Risk=4, não estabiliza base. Melhor como feature de autonomia.      |
| Runtime Hooks               | v2.2           | v2.1         | Risk=4 mas estabiliza base (hooks previsíveis).                     |
| Pattern Learning            | v2.1           | v2.2         | Risk=4, não estabiliza base diretamente. É autonomia.               |

## Features Adiadas (post-v2.2)

| Feature               | Score | Motivo                                               |
| --------------------- | ----- | ---------------------------------------------------- |
| Multi-agent Platform  | -39   | Risco 8, 5 dependências. Escopo enorme.              |
| AI Engineer           | -17   | Risco 7, esforço 9. Amplo demais para v2.            |
| Local AI Engine       | -12   | Risco 6, esforço 8. Depende de base de conhecimento. |
| RAG Engine            | -8    | Risco 5, esforço 7. Depende de indexação.            |
| Cognitive Coprocessor | -9    | Risco 6, esforço 7. Experimental.                    |
| Plugin System         | -8    | Risco 5, 3 dependências. Requer arquitetura madura.  |

## Features com Score Negativo (justificativa para manter)

| Feature             | Score | Por que não remover                                                     |
| ------------------- | ----- | ----------------------------------------------------------------------- |
| Adapters (13 langs) | 3     | Mantido por ser diferencial do ai-devkit; postergar esforço de melhoria |
| Code Generators     | 5     | Mantido; 31 geradores já funcionam, só não expandir agora               |
