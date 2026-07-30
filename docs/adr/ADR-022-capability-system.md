# ADR-022: Capability System (Registry + Matching + Progressive Disclosure)

- **Status:** Implementado
- **Data:** 2026-07-24 (convertido de 0009-capability para ADR-XXX)
- **Decisão:** Sistema de capacidades em 3 modulos: registry, matcher, disclosure

## Contexto
A IDEIA precisa descobrir, classificar e expor capacidades de forma progressiva.

## Decisao
- `@ideia/capability-registry`: CapabilityRegistryService, SemanticMatcher, DependencyResolver, CATALOG com 19 testes
- `@ideia/capability-matcher`: CapabilityMatcher com 20 capacidades, TF-scoring, fuzzy match, 11 testes
- `@ideia/progressive-disclosure`: 19 features em 4 niveis, unlock conditions, 22 testes
