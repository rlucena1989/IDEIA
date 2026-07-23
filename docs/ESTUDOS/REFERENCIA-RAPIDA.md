# Referência Rápida — AI-Devkit v2 IDE

> **Uso**: Consulta rápida durante implementação. Cada seção é um resumo executivo.

---

## 📐 Arquitetura

```
Padrão:           Clean Architecture + Modular Monolith
Linguagem:        TypeScript 5.4 (ES2022, CommonJS)
Monorepo:         npm workspaces (23 packages)
Build:            tsc -b (project references em cadeia)
Testes:           Jest 29 (threshold: lines 40% → subindo para 80%)
Frontend:         React 18 + Vite + Monaco Editor
Extension:        VS Code (WebView-based TreeViews)
```

## 🎯 Escopo (O que SOMOS)

`docs/ESCOPO-IDE.md` define o que está DENTRO e FORA. Resumo:

| ✅ DENTRO | ❌ FORA |
|-----------|---------|
| Editor + Terminal + Chat | Fine-tuning de modelos |
| Code Review AI | HPC (alta precisão) |
| Agente Autônomo | Supply chain auditing |
| MCP Server & Client | Fuzzing |
| Policy Engine + Audit | CI/CD pipelines |
| RAG + Code Graph | Plugin Marketplace |
| VS Code Extension | Cloud hosting |

## 🧠 Decisões Arquiteturais (ADRs)

Ver `.ai/architecture/adr/` para decisões registradas:
- ADR-0001 a 0004: estrutura básica
- ADR pendentes: MCP, Code Review, Agent Architecture

## 🔌 API da IDE (porta 3001)

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/health` | GET | Health check |
| `/api/ide/status` | GET | Status da IDE |
| `/api/fs/list` | GET | Listar diretório |
| `/api/fs/read` | GET | Ler arquivo |
| `/api/fs/write` | POST | Escrever arquivo |
| `/api/shell` | POST | Executar comando |
| `/api/session` | GET/POST | Gerenciar sessão |
| `/api/chat/completions` | POST | Chat SSE streaming |
| `/api/sandbox/exec` | POST | Executar código isolado |
| `/api/approval/*` | POST | Fluxo de aprovação |
| `/api/preview/*` | GET/POST | Preview de alterações |
| `/api/git/*` | GET | Status git |
| `/api/memory` | GET/POST | Memória da IDE |
| WebSocket `/ws` | WS | Eventos tempo real |

## 🏗️ Estrutura de Packages

```
packages/
├── cli/             → CLI (130+ cmds) + IDE server (7 bridges)
├── core/            → Motor de governança
├── contracts/       → Schemas, tipos, DTOs
├── policy-engine/   → Classificação auto/ask/block
├── diff-engine/     → Diff textual + semântico
├── memory-store/    → Persistência de sessão
├── audit-trail/     → Log de eventos
├── agent-runtime/   → Intenções + LLM
├── web-ui/          → React + Monaco Editor
└── adapter-{lang}/  → 13 adapters (FastAPI, Go, NestJS, etc.)
```

## 🧪 Comandos de Teste

```bash
npm run test:quick        # Testes rápidos
npm run test:standard     # Testes padrão
npm run test:full         # Todos os testes (1106)
npm run test:cov:quick    # Cobertura rápida
npm run test:new          # Policy + Memory + Audit + Agent + MFE
npm run test:cli          # Apenas CLI
```

## 🚀 Startups

```bash
# CLI mode
npx tsx packages/cli/src/index.ts ide --port 3001

# ES module entry (recomendado)
node --import tsx/esm start-ide.mjs --port=3001

# Direct
npx tsx packages/cli/src/commands/ide.ts --port 3001 --root . --static packages/web-ui/dist

# API server (approval remoto)
npx ts-node apps/api/src/index.ts     # Porta 3002
```

## 📊 Scorecard (alvo: ≥95/100)

```bash
npm run scorecard           # Avaliação atual
npm run ai:quality:gate     # Quality gate completo
npm run ai:verify           # Verificação de governança
npm run ai:doctor           # Diagnóstico
```

## 🔐 Policy Engine

```
auto  → Ação executada automaticamente
ask   → Requer aprovação humana (high-risk commands, file.delete, etc.)
block → Ação bloqueada (rm -rf /, format, mkfs)
```

## 📝 Checklist de Nova Funcionalidade

1. [ ] Está dentro do escopo? (ver `docs/ESCOPO-IDE.md`)
2. [ ] Tem ADR registrado? (ver `.ai/architecture/adr/`)
3. [ ] Tem contrato/schema? (ver `packages/contracts/`)
4. [ ] Passa pelo Policy Engine? (ver `packages/policy-engine/`)
5. [ ] Tem testes? (mín. 80% cobertura)
6. [ ] Passa no quality gate? (`npm run ai:quality:gate`)
7. [ ] Está no CHANGELOG? (ver `CHANGELOG.md`)

## 📚 Documentos Principais

| Documento | Local | Conteúdo |
|-----------|-------|----------|
| Estudo Completo | `docs/ESTUDO-COMPLETO-AI-DEVKIT.md` | Pesquisa abrangente |
| Escopo | `docs/ESCOPO-IDE.md` | O que fazemos/não fazemos |
| Matriz Factibilidade | `docs/MATRIZ-FEASIBILIDADE-TECNOLOGICA.md` | Análise tecnologia vs esforço |
| Arquitetura | `.ai/architecture/architecture-overview.md` | Clean Architecture |
| Roadmap | `.ai/tasks/master-plan.md` | Plano mestre |
| ADRs | `.ai/architecture/adr/` | Decision records |
