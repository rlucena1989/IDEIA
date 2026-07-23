# Context Pack: Onboarding — New Team Member Setup

> **Use when:** Getting a new developer productive with the IDEIA project
> **Estimated tokens saved:** ~85%

## Relevant Files & Directories
- `AGENTS.md` — project overview, architecture, quality gates, contribution guide
- `docs/governance/REALITY-MANIFEST.md` — single source of truth for project state
- `.ai/ideia-tools.mjs` — CLI helper with context, plan, validate, and policy functions
- `.ai/ideia-manifest.md` — IDEIA tools manifest and documentation
- `.ai/checklists/onboarding-checklist.md` — step-by-step onboarding checklist
- `.ai/architecture/ddd-guidelines.md` — DDD and Clean Architecture conventions
- `.ai/quality/definition-of-done.md` — definition of done for tasks
- `.ai/architecture/module-boundaries.md` — module structure and dependency rules
- `docs/ESTUDOS/IDEIA-MASTER.md` — index of all 71 study documents
- `docs/ESTUDOS/VISAO-PRODUTO-IDEIA.md` — product vision and concept
- `packages/*/README.md` — package-level documentation
- `TASKS-IMPLEMENTACAO-DIRETA.md` — task tracking and status

## Key Domain Concepts
- **IDEIA Philosophy:** "Give us the idea, we deliver the solution." The system transforms high-level intent into working software through a multi-agent pipeline.
- **Architecture Layers:** Clean Architecture + DDD. Domain never imports infrastructure. Events cross module boundaries via the event bus. Agents operate at N0-N4 autonomy levels.
- **Oráculo da Verdade:** The Reality Manifest is the single source of truth. All docs must match the manifest. The `reality-check.ps1` script validates this automatically.
- **Agent Autonomy Levels:** N0 (Assistido) — N1 (Supervisionado) — N2 (Semi-autônomo) — N3 (Autônomo) — N4 (Total). New contributors start at N0/N1.
- **Everything is Documented:** 71 study documents, governance policies, ADRs, architecture guides. If you can't find it, it probably doesn't exist yet.

## Common Patterns
- Start with the onboarding checklist: `.ai/checklists/onboarding-checklist.md`
- Run `node .ai/ideia-tools.mjs status` first to verify environment tools are available
- Use `node .ai/ideia-tools.mjs context .` to get project stats and structure
- Use `IDEIA context search <term>` to find relevant documentation quickly
- Read `AGENTS.md` completely — it contains all the rules and context you need
- Before making changes, read `docs/governance/RULES.md` and `.ai/architecture/module-boundaries.md`

## Task-Specific Instructions
1. **Environment Setup:**
   - Clone the repo: `git clone <repo-url>`
   - Install dependencies: `npm install`
   - Build: `npm run build`
   - Run tests: `npm test`
   - Verify tooling: `node .ai/ideia-tools.mjs status`
2. **Read Core Documents:**
   - `AGENTS.md` — complete project orientation
   - `docs/governance/REALITY-MANIFEST.md` — what exists and what doesn't
   - `docs/ESTUDOS/VISAO-PRODUTO-IDEIA.md` — product vision
3. **Explore the Codebase:**
   - Browse `packages/` to understand the module structure
   - Run a simple task: `node .ai/ideia-tools.mjs context packages/`
   - Try the prompt pipeline: `node .ai/ideia-tools.mjs plan "list all packages"`
4. **First Contribution:**
   - Pick a task from `TASKS-IMPLEMENTACAO-DIRETA.md` with a 🔵 or 🟢 status
   - Follow the contribution flow in `AGENTS.md`
   - Submit a PR with tests and documentation
5. **Learn the Quality Gates:**
   - Run `npm run lint`, `npm run typecheck`, `npm run test:unit`
   - Try `npm run ai:boundaries` and `npm run ai:contract-check`
6. **Understand Agent Operations:**
   - Read `.ai/policies/agent-safety-policy.md`
   - Test policy engine: `node .ai/ideia-tools.mjs policy read packages/cli/src/index.ts`
   - Test output validation: create a file with a test secret and run `node .ai/ideia-tools.mjs validate`

## Pitfalls
- Jumping into code changes without reading `AGENTS.md` — the rules there are critical (R1-R6)
- Assuming a library exists without checking — verify in `REALITY-MANIFEST.md` or the actual code first
- Using `any` type — it's banned without documented justification
- Modifying files outside the task scope — strictly forbidden
- Asking for clarification on intent — the prompt pipeline has already classified the request
- Ignoring the Reality Manifest — if your code creates something new, update the manifest
- Forgetting to verify on Windows — all scripts must work cross-platform (PowerShell 5.1+ and bash)

## Output Checklist
- [ ] `npm install` and `npm run build` succeed
- [ ] `npm test` passes
- [ ] `node .ai/ideia-tools.mjs status` shows all tools available
- [ ] Read `AGENTS.md` and `REALITY-MANIFEST.md`
- [ ] Explored the `packages/` directory structure
- [ ] Completed one small task end-to-end
- [ ] Knows how to run quality gates (`npm run lint`, `npm run typecheck`, `npm run ai:*`)
- [ ] Understands agent autonomy levels and which level they're operating at
