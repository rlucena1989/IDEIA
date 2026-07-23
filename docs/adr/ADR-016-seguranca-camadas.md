# ADR-016: Security Layers Architecture

**Status:** Approved  
**Date:** 2026-07-18  
**Deciders:** Architecture Team  

## Context
IDEIA handles sensitive operations: code generation, file modification, shell execution, LLM calls, autonomous decision-making. A layered security architecture is needed to ensure no single point of failure.

## Decision
- **7-Layer Security Model:**
  - L1: Rollback Ready (backup antes de toda alteração)
  - L2: Audit Trail (hash chain imutável)
  - L3: Scope Isolation (self-space × project-space)
  - L4: Contract Enforcement (C1-C18 validation)
  - L5: Autonomy Policy (matriz decisão × nível)
  - L6: Safety Circuit (loop/regression/breakage detection)
  - L7: Human Override (STOP/PAUSE/ROLLBACK)
- **Policy Engine:** YAML-based rules with OPA/Cedar support (future)
- **Prompt Security:** 31 PII/injection detection rules
- **Rate Limiting:** Sliding window per endpoint

## Consequences
- Positive: Defense in depth — no single layer can be breached
- Positive: Autonomous operations are always reversible
- Negative: 7 layers add latency (~50ms total per operation)
- Risk: False positives in safety circuit could block legitimate actions
