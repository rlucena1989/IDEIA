# TASK-ESTUDO-G2: Criar packages/task-queue/

**Prioridade:** 🟠 Alta (score 3.7)  
**Esforço:** ~20h  
**Criada em:** 2026-07-22  
**Origem:** G2-TASK-QUEUE/README.md (análise vs código real)

## Descrição

Implementar fila assíncrona de tarefas com p-queue, retry com backoff exponencial (1s, 4s, 16s, 64s), integração com EventBus, DLQ para tarefas falhas

## Critérios de Aceite

1. Pacote criado em packages/ com estrutura src/ + __tests__/
2. Testes unitários passando (mín. 80% cobertura)
3. Documentação README.md no pacote
4. Integração com EventBus via NATS

## Dependências

- Nenhuma (pacote standalone)
