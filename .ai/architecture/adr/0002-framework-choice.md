# ADR 0002: Escolha do NestJS como Framework Padrão

## Status
Aceito

## Contexto
O projeto exige escalabilidade de MVP para nível enterprise, seguindo Clean Architecture e DDD. Frameworks livres demais geram inconsistência no código produzido por IA.

## Decisão
Adotar **NestJS** como framework backend padrão do `ai-devkit`.

## Consequências
- DI nativa.
- Organização por módulos.
- Suporte a CQRS e microservices.
- OpenAPI via decorators.
- Alta consistência para IA.
- Possível uso de Fastify adapter quando necessário.
- Validação recomendada com Zod via `nestjs-zod`.
