# ADR-0009: Capability System (Registry + Matching + Progressive Disclosure)

**Status:** Approved  
**Date:** 2026-07-22  
**Author:** Architecture Team

## Context

IDEIA exposes a growing set of capabilities (LLM providers, code generation, security scanning, etc.). Without a formal capability system, features are hard to discover, compose, and progressively unlock as users gain expertise.

## Decision

Implement a three-part capability system:

- **CapabilityRegistry** (`packages/capability-registry/`): Central catalog of all capabilities with semantic metadata, dependency resolution, and discovery API. Includes `CapabilityRegistryService`, `SemanticMatcher`, `DependencyResolver`, and a CATALOG of 20+ capabilities.
- **CapabilityMatcher** (`packages/capability-matcher/`): TF-IDF scoring, fuzzy matching, and relevance ranking to match user requests to capabilities. Merged from earlier `capability-matching-engine`.
- **ProgressiveDisclosure** (`packages/progressive-disclosure/`): 19 features organized in 4 tiers (Beginner, Intermediate, Advanced, Expert) with unlock conditions based on user actions, project complexity, and experience level.

## Consequences

- Positive: Users discover capabilities gradually rather than being overwhelmed
- Positive: Capability composition enables complex workflows from simple primitives
- Negative: Capability metadata must be kept in sync with actual code
- Negative: Progressive disclosure adds complexity to the onboarding experience
