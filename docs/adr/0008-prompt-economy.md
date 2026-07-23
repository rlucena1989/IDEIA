# ADR-0008: Prompt Economy System

**Status:** Approved  
**Date:** 2026-07-22  
**Author:** Architecture Team

## Context

LLM interactions are the most expensive operation in IDEIA (token cost + latency). Without optimization, every prompt to the LLM carries full context, leading to high token consumption and slow responses. A Prompt Economy system optimizes context size, caches responses, and routes requests to the appropriate model.

## Decision

Implement Prompt Economy in `packages/prompt-economy/` with five components:

- **ContextCompressor**: Reduces context size by removing redundant information, summarizing history, and prioritizing relevant data
- **BudgetTracker**: Tracks token usage per session/project with configurable budgets and alerts
- **ComplexityRouter**: Routes simple requests to faster/cheaper models (Phi-4-mini), complex requests to capable models (GPT-4o, Claude)
- **LLMCache**: Caches LLM responses keyed by prompt hash with TTL-based invalidation
- **EarlyExitDecider**: Detects when a response can be short-circuited without LLM call (e.g., known patterns, cached results)

Integrated with the Prompt Pipeline (guard→classify→enrich→optimize→plan→format).

## Consequences

- Positive: Reduced token consumption by ~40% in benchmarks
- Positive: Faster response times for common/cached queries
- Negative: Cache invalidation is hard — stale responses may be served
- Negative: ComplexityRouter requires accurate classification of request complexity
