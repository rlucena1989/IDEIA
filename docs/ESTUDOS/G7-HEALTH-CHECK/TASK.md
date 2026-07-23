# TASK-ESTUDO-G7: Criar packages/health-check/

**Prioridade:** 🟡 Média (score 3.2)  
**Esforço:** ~12h  
**Criada em:** 2026-07-22  
**Origem:** G7-HEALTH-CHECK/README.md (análise vs código real)

## Descrição

Unificar health checks dispersos (event-bus, telemetry, cli) em packages/health-check/ com HealthCheckAggregator, schema padronizado, endpoint /api/health

## Critérios de Aceite

1. Pacote criado em packages/ com estrutura src/ + __tests__/
2. Testes unitários passando (mín. 80% cobertura)
3. Documentação README.md no pacote
4. Integração com EventBus via NATS

## Dependências

- Nenhuma (pacote standalone)
