# ADR-020: Self-Awareness System

- **Status:** Implementado
- **Data:** 2026-07-24 (convertido de 0007-self-awareness para ADR-XXX)
- **Decisão:** Sistema de auto-conhecimento com catalog, tutorial, lifecycle

## Contexto
A IDEIA precisa conhecer suas proprias capacidades para se descrever, ensinar e orquestrar.

## Decisao
- ServiceCatalog: 77 servicos mapeados com API de descoberta
- SelfAwareness: describeSystem, getCapabilities, getArchitecture
- LifecycleOrchestrator: 7 fases (ideacao, arquitetura, implementacao, qualidade, deploy, documentacao, monitoring)
- TutorialSystem: 6 tutoriais com progress tracking e badges
- CapabilityDiscovery: auto-descoberta dinamica
- 21 subcomandos CLI (catalog, tutorial, lifecycle)
