# Context Pack: Documentation — Writing & Maintaining Docs

> **Use when:** Creating or updating project documentation, ADRs, study documents, API docs, or READMEs
> **Estimated tokens saved:** ~70%

## Relevant Files & Directories
- `docs/governance/document-registry.md` — registry of all governance documents, must be updated on every new doc
- `docs/governance/REALITY-MANIFEST.md` — truth source; docs must never contradict the manifest
- `docs/ESTUDOS/IDEIA-MASTER.md` — index of all study documents
- `docs/ESTUDOS/TEMPLATE-ANALISE-PERMANENTE.md` — template for study analysis documents
- `docs/adr/` — Architecture Decision Records directory
- `packages/*/README.md` — package-level READMEs
- `.ai/ideia-tools.mjs` — CLI tool with context, plan, and validate functions

## Key Domain Concepts
- **Oráculo da Verdade (Truth Oracle):** `REALITY-MANIFEST.md` is the single source of truth. Any doc that contradicts it is wrong. Always cross-reference claims against real code.
- **ADR Pattern:** Each ADR follows: Title, Status, Context, Decision, Consequences, Compliance. One ADR per decision. Stored in `docs/adr/`.
- **Document Registry:** Every governance document must be registered in `document-registry.md` with a unique ID, path, status, and last review date.
- **Self-Auditing:** Documentation must be machine-verifiable. Claims like "X supports Y" must be testable via `reality-check.ps1`.

## Common Patterns
- Write docs first, then implement — this clarifies intent before code
- Use `IDEIA context search <term>` to find existing docs before creating new ones
- Every new study goes in `docs/ESTUDOS/` and is registered in `IDEIA-MASTER.md`
- API docs are generated from JSDoc/Zod schemas — never hand-write API docs
- Use `node .ai/ideia-tools.mjs validate <file>` to check docs for secrets before committing

## Task-Specific Instructions
1. Search existing docs to avoid duplication — check `IDEIA-MASTER.md` for studies, `document-registry.md` for governance docs
2. Identify the doc type: README (package-level), ADR (architectural decision), Study (deep research), or Governance (policy/rules)
3. For ADRs: use the `docs/adr/` template with status (proposed/accepted/deprecated/superseded)
4. For studies: use `TEMPLATE-ANALISE-PERMANENTE.md` as a starting structure
5. For READMEs: include install, usage, API, configuration, and links to related docs
6. Cross-reference all claims against the actual code — a claim that a package supports something must be verified
7. Run `npm run ai:docs:enforce` to verify document integrity and cross-references
8. Register the new document in the appropriate registry

## Pitfalls
- Writing docs that describe what the code *should* do instead of what it *actually* does — always verify against reality
- Orphan documents not linked from any index — every doc must be discoverable
- Claiming features that don't exist yet — use "planned" or "future" markers
- Forgetting to update the Reality Manifest when docs describe new capabilities
- Including secrets, tokens, or internal URLs in public-facing docs

## Output Checklist
- [ ] Document type identified and correct template used
- [ ] All factual claims verified against actual code
- [ ] No contradictions with `REALITY-MANIFEST.md`
- [ ] Registered in appropriate index (`document-registry.md`, `IDEIA-MASTER.md`, or `docs/adr/`)
- [ ] Cross-references to related documents included
- [ ] `npm run ai:docs:enforce` passes
- [ ] No secrets, tokens, or internal URLs leaked
- [ ] Language matches project conventions (Portuguese for governance/studies, English for code docs)
