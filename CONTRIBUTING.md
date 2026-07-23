# Contributing to IDEIA

## Development Setup

```bash
git clone https://github.com/anomalyco/ideia.git
cd ideia
npm install
npm run build
```

## Code Standards

- **Clean Architecture**: domínio não importa infraestrutura
- **Domain-Driven Design**: entidades, value objects, agregados, domain events
- **TypeScript strict**: sem `any` sem justificativa documentada
- **Contratos explícitos**: todo DTO validado com schema
- **Naming**: camelCase para variáveis/funções, PascalCase para classes/types
- **Commits**: conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`)

## Quality Gates

### Gate 1 — Commit (pre-commit hook)

```
lint-staged (eslint --fix + prettier --write)
commitlint (conventional commit)
tsc --noEmit (typecheck)
jest --changedSince HEAD~1
```

### Gate 2 — PR (status checks)

```
lint · typecheck · coverage ≥ 30%
CodeQL · snyk · injection suite
smoke test · event bus · contract verification
```

### Gate 3 — Release

```
E2E completo · Performance full suite
Segurança full suite · Resiliência
SBOM · Changelog
```

## Testing

```bash
npm run test:unit              # Unitários com cobertura
npm run test:integration       # Integração
npm run test:contract          # Contract testing (Pact)
npm run test:mutation          # Mutation testing (Stryker)
npm run ai:boundaries          # Boundaries arquiteturais
```

## PR Process

1. Create branch: `feature/IDEIA-xxx-descricao`
2. Implement changes com testes
3. Run `npm run ai:quality:gate`
4. Open PR com template preenchido
5. Zen Review obrigatório antes do merge

## Project Structure

```
packages/
  agent-runtime/        # Runtime de execução de agentes
  agent-identity/       # Identidade e permissões de agentes
  cli/                  # CLI principal (51 comandos)
  core/                 # Core types e utilitários
  data-layer/           # PostgreSQL + SQLite + DuckDB
  event-bus/            # NATS JetStream (Pub/Sub, KV, Object Store)
  execution-layer/      # Camada de execução isolada
  ideia-plugin/         # Plugin Theia (8 widgets, 5 serviços)
  policy-engine/        # Policy engine (27 patterns)
  security-middleware/  # Segurança e validação
  prompt-security/      # Segurança de prompts (LLM)
  ... (86+ packages)
scripts/
  security-pentest.ts   # Pentest automatizado
  generate-sbom.ts      # SBOM CycloneDX
```

## Need Help?

- Check `.ai/checklists/onboarding-checklist.md`
- Run `ideia doctor` para diagnóstico
- Open an issue em [github.com/anomalyco/ideia/issues](https://github.com/anomalyco/ideia/issues)
