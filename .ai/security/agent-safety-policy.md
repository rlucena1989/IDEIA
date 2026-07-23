# Agent Safety Policy

## Scope
This policy applies to all AI agents operating within the ai-devkit ecosystem, including the orchestrator, quality-agent, audit-agent, and any sub-agents spawned during execution.

## Permissions
- Agents must NEVER execute arbitrary code without explicit human approval
- Agents must NEVER modify security-critical files (see security barriers)
- Agents must NEVER access or expose secrets, API keys, or credentials
- Agents MUST log all write operations to the audit trail

## Write Operations
- All file modifications by agents require explicit confirmation (Y/n)
- Modifications to `.ai/` governance files require `--force` flag
- Bulk operations (>5 files) must be approved as a batch

## Read Operations
- Agents may read any file in the project by default
- Reading `.env*`, `credentials*`, and `secrets*` is PROHIBITED
- Agent context is limited to the project root directory

## Execution Guardrails
1. No agent may modify `laws.yaml` without baseline comparison
2. No agent may downgrade security rules (see security/baseline.ts)
3. No agent may write code outside the project structure
4. All agent actions are logged in `.ai/audit-trail/agent-activity.log`

## Enforcement
Violations are detected by `security barrier check` and `adversarial review`.
Blocked operations are logged in `.ai/audit-trail/barrier-bypass.log` with reason.