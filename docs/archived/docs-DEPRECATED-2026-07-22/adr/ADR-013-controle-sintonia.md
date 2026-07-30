# ADR-013: Control, Safety & IDEIA↔IA Synergy

**Status:** Approved
**Date:** 2026-07-18
**Deciders:** Architecture Team

## Context
As IDEIA gains autonomy (self-fix, self-evolution), control and safety mechanisms must scale proportionally. A formal protocol for IDEIA↔AI collaboration is needed to ensure they work in harmony.

## Decision
- Autonomy Control Tower: central panel with status, emergency controls, decision log
- Safety Circuit Breaker: 5 triggers (loop, regression, breakage, resources, user override)
- Bidirectional Help Protocol (BHP): formal IDEIA↔AI help protocol with 7 message types
- Decision Continuity Engine: projects never stop for pending human decisions
- 7-Layer Safety Architecture: from Rollback Ready (L1) to Human Override (L7)

## Consequences
- Positive: Zero loss of control even with full autonomy
- Positive: Projects continue during pending decisions
- Negative: BHP adds protocol overhead to every AI interaction
- Risk: Safety Circuit Breaker false positives could block legitimate actions
