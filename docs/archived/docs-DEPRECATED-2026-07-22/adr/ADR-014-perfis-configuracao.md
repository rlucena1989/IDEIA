# ADR-014: User Profiles & Configuration System

**Status:** Approved
**Date:** 2026-07-18
**Deciders:** Architecture Team

## Context
Different users have different needs, risk tolerances, and technical familiarity. A one-size-fits-all configuration doesn't work. The system must be adaptable to each user's profile and context.

## Decision
- 5 preset profiles: Solo Dev, Tech Lead, Automator, Enterprise, Custom
- Configuration stored in `~/.ideia/config.json` (global) and `.ideia/config.json` (project)
- Configuration dashboard in web UI (not raw JSON)
- CLI: `ai-devkit config set/show/reset/profile/context`
- Adaptive learning: system adjusts based on user behavior (50/200+ interactions)
- Team policies: mandatory rules set by tech-lead, members cannot override

## Consequences
- Positive: Users get appropriate defaults based on profile
- Positive: Team-wide policies ensure compliance
- Negative: More code to maintain (configuration UI + CLI + adaptive engine)
- Risk: Adaptive learning could reinforce bad habits if not calibrated
