# Skill: Always Validate Tokens Server-Side

**Origin:** G9-distilled cycle
**Date:** 2026-07-26

## Lesson
Always validate authentication tokens on the server side. Never rely solely on client-side validation for security-critical operations.

## Application
- All auth checks must happen in backend Theia services (`packages/ideia-plugin/src/node/`)
- Use the security middleware at `packages/security-middleware/`
- Follow the policy patterns in `.ai/policies/`
