# Context Pack: Security — Review, Audit & Hardening

> **Use when:** Performing security reviews, audit checks, vulnerability remediation, or compliance validation
> **Estimated tokens saved:** ~80%

## Relevant Files & Directories
- `.ai/architecture/security-guidelines.md` — security architecture and guidelines
- `.ai/architecture/threat-model.md` — threat model for the IDEIA system
- `.ai/policies/agent-safety-policy.md` — safety constraints for AI agent actions
- `.ai/policies/command-policy.md` — allowed/blocked commands and shell operations
- `.ai/permissions/matrix.md` — permission matrix for agent autonomy levels
- `packages/policy-engine/src/` — policy engine (27 patterns, YAML externalized)
- `packages/output-validation/src/` — output validation (31 PII patterns, secrets scan)
- `docs/ESTUDOS/SEGURANCA-PROMPT-GOVERNADOR-AI.md` — prompt security and governance study
- `docs/governance/GAPS-PRODUCAO-IDE.md` — known security gaps (SEC-001 through SEC-023)

## Key Domain Concepts
- **Policy Engine:** 27 patterns covering Linux + Windows + PowerShell dangerous operations. YAML-based rules at `packages/policy-engine/src/rules/`. Each rule has action, resource, and effect (allow/deny).
- **Output Validation:** 31 patterns for PII detection (CPF, SSN, IBAN, credit card, API keys, tokens). Uses regex + entropy detection. Runs on every LLM output before delivery.
- **Audit Trail:** SHA-256 hash chain via `verifyChain()` — every security-relevant action is logged with a hash of the previous entry. Tampering is detectable.
- **Approval Flow:** 3 levels (dev → tech-lead → security). Defined in `approval-flow.ts`. Critical operations require multi-party approval.
- **LLM Guard:** Input guard detects prompt injection, jailbreak attempts, and dangerous commands before they reach the LLM.

## Common Patterns
- Run security checks early — `node .ai/ideia-tools.mjs policy <action> <resource>` before executing
- Validate all external inputs with `Contract.pre()` — never trust data crossing module boundaries
- Scan for secrets before every commit — `node .ai/ideia-tools.mjs validate <file>`
- Test auth/authorization boundaries — authenticated users should never access another user's data
- Check `docs/governance/GAPS-PRODUCAO-IDE.md` for unresolved security gaps before starting

## Task-Specific Instructions
1. Identify the scope: code review, policy audit, vulnerability scan, or compliance check
2. Run automated tools first: `npm run ai:red-teaming` for injection tests, `npm run ai:policy-bypass` for policy evasion
3. For code review: check for eval, dynamic imports, command injection, path traversal, hardcoded secrets
4. For policy audit: verify `command-policy.md` covers all dangerous patterns, test each rule with a positive and negative case
5. For output validation: ensure all 31 PII patterns are tested, add new patterns if gaps found
6. For compliance: verify data handling against privacy requirements, check audit trail integrity
7. Document findings with severity (🔴 critical, 🟠 high, 🟡 medium, 🟢 low) in the appropriate report
8. For 🔴 gaps, create an immediate fix PR; for 🟠, schedule for next sprint; for 🟡/🟢, add to backlog

## Pitfalls
- False sense of security from passing automated checks — always complement with manual review
- Ignoring the dependency supply chain — check `npm audit` / `snyk` for vulnerable dependencies
- Over-restrictive policies that block legitimate work — balance security with developer productivity
- Storing secrets in environment variables without encryption — use a secrets manager or encrypted vault
- Forgetting to update the threat model when architecture changes

## Output Checklist
- [ ] Automated security tools run (red-teaming, policy-bypass, secret scan)
- [ ] Manual code review completed for the scope
- [ ] New findings documented with severity and reproduction steps
- [ ] Existing gaps in `GAPS-PRODUCAO-IDE.md` checked for relevance
- [ ] If fix applied: regression tests added for the security check
- [ ] Audit trail updated with the security review action
- [ ] Threat model updated if the finding reveals a new attack vector
