# Token Optimization Engine

## Propósito
Reduzir o volume de contexto enviado a LLMs, mantendo apenas os arquivos e
trechos de código com maior relevância para a tarefa em execução.

## Estratégia
1. **Poda por relevância de import**: arquivos importados diretamente pelo
   arquivo alvo da tarefa recebem prioridade máxima.
2. **Poda por AST**: extrai apenas assinaturas de função/classe de arquivos
   de segunda ordem (dependências indiretas), via `.ai/bin/ast-slicer.js`.
3. **Limite de tokens configurável**: definido em `.ai/sdk/config.yaml`
   (campo `context_strategy`).

## Comando relacionado
```bash
ai-devkit context pack <nome-da-feature>
```
Gera o pacote otimizado em `.ai/context-packs/<nome>.md`.

## Critério de validação
Um context pack é considerado válido se:
- não excede o limite de tokens configurado;
- inclui cada um dos arquivos que serão de fato modificados pela tarefa;
- não inclui arquivos não relacionados (ruído).
