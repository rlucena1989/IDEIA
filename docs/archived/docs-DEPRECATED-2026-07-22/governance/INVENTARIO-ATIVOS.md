# Inventário de Ativos de Informação — IDEIA

> **Documento:** INVENTARIO-ATIVOS.md
> **Versão:** 1.0
> **Data:** 2026-07-18
> **Status:** ✅ Publicado
> **Propósito:** Mapear todos os ativos de informação do ecossistema IDEIA para fins de compliance, segurança e continuidade.

## 1. Código-Fonte

| Ativo | Localização | Tipo | Classificação | Responsável |
|-------|-------------|------|---------------|-------------|
| Monorepo principal | `ai-devkit-v2/` | Código fonte | Interno | Core Team |
| IDEIA Docs | `docs/` | Documentação | Público | Core Team |
| Legacy ai-devkit-setup | `legacy/ai-devkit-setup-v2/` | Código fonte (legado) | Interno | Core Team |
| Theia prototype | `ideia-theia/` | Código fonte (protótipo) | Interno | Core Team |

## 2. Configurações e Infraestrutura

| Ativo | Localização | Tipo | Classificação | Notas |
|-------|-------------|------|---------------|-------|
| Variáveis de ambiente | `.env` (local) / CI secrets | Configuração | **Confidencial** | Não versionado |
| CI/CD workflows | `.github/workflows/` | Automação | Interno | 4 workflows |
| ESLint config | `.eslintrc.js` | Configuração | Público | - |
| TypeScript config | `tsconfig.json` (raiz + packages) | Configuração | Público | - |
| Jest config | `jest.config.js` + `jest.e2e.config.js` | Configuração | Público | - |

## 3. Modelos e Dados de IA

| Ativo | Localização | Tipo | Classificação | Notas |
|-------|-------------|------|---------------|-------|
| Provider routing | `packages/cli/src/local-ai/routing.ts` | Configuração de IA | Interno | Modelos suportados |
| Prompt templates | `packages/prompt-security/` | Templates | Interno | - |
| Agent runtime config | `packages/agent-runtime/` | Configuração | Interno | - |
| Memória de sessão | `packages/memory-store/` | Dados de execução | Interno | Em memória + arquivo |
| Cache de embeddings | `packages/memory-store/` | Dados de execução | Interno | - |

## 4. Logs e Auditoria

| Ativo | Localização | Tipo | Classificação | Retenção |
|-------|-------------|------|---------------|----------|
| Audit trail | AuditTrail (arquivo JSONL) | Log de auditoria | Interno | 10MB por arquivo |
| Hash chain | `.audit.hash` (paralelo) | Integridade | Interno | Mesmo que audit trail |
| Erros de teste | `jest-errors.txt` (temp) | Log temporário | Interno | Excluído |
| Logs de execução | AuditTrail + console | Log de execução | Interno | - |

## 5. Segurança

| Ativo | Localização | Tipo | Classificação | Notas |
|-------|-------------|------|---------------|-------|
| Política de segurança | `docs/governance/POLITICA-SEGURANCA.md` | Documento | Público | v1.0 |
| Matriz de compliance | `docs/governance/MATRIZ-COMPLIANCE-SEGURANCA.md` | Documento | Interno | v1.0 |
| Gap analysis | `docs/governance/GAPS-PRODUCAO-IDE.md` | Documento | Público | 40/60 resolvido |
| Security workflow | `.github/workflows/security.yml` | Automação | Público | CodeQL + audit |

## 6. Documentação

| Ativo | Localização | Tipo | Classificação |
|-------|-------------|------|---------------|
| AGENTS.md | Raiz | Guia do agente | Público |
| README.md | Raiz | Visão geral | Público |
| Estudos | `docs/ESTUDOS/` (36 arquivos) | Pesquisa técnica | Público |
| ADRs | `docs/adr/` (10 arquivos) | Decisões arquiteturais | Público |
| User docs | `docs/user/` (5 arquivos) | Documentação do usuário | Público |
| Governance | `docs/governance/` (6 arquivos) | Governança | Público |
| Document registry | `.ai/governance/document-registry.md` | Catálogo | Interno |
| Glossário | `GLOSSARIO-IDEIA.md` | Referência | Público |

## 7. Histórico de Revisão

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 1.0 | 2026-07-18 | IDEIA Core Team | Versão inicial |
