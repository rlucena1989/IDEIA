# ADR-0007: Self-Awareness System

**Status:** Approved  
**Date:** 2026-07-22  
**Author:** Architecture Team

## Context

IDEIA needs to understand its own capabilities, structure, and state to provide accurate context to LLMs and users. The Self-Awareness system provides introspection, lifecycle management, tutorials, and capability discovery.

## Decision

Implement Self-Awareness through five modules in `packages/cli/src/`:

- **ServiceCatalog** (`ecosystem/service-catalog.ts`): Maps 77 services with discovery API
- **SelfAwareness** (`ecosystem/self-awareness.ts`): Exposes `describeSystem()`, `getCapabilities()`, `getArchitecture()`, `getStack()`, `getWorkflows()`
- **LifecycleOrchestrator** (`lifecycle/project-lifecycle-orchestrator.ts`): 7 phases (idea→monitoring) with checkpoints and rollback
- **TutorialSystem** (`tutorials/tutorial-system.ts`): 6 tutorials with progress tracking and badges
- **CapabilityDiscovery** (`ecosystem/capability-discovery.ts`): Dynamic self-discovery of capabilities

CLI commands: `catalog` (6 subcommands), `tutorial` (7 subcommands), `lifecycle` (6 subcommands).

## Consequences

- Positive: LLMs get structured context about IDEIA without hardcoding
- Positive: Tutorial system onboard new users progressively
- Negative: ServiceCatalog must be manually updated when services change
- Negative: LifecycleOrchestrator couples project state to IDEIA's view of the project
