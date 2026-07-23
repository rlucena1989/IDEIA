# Secrets Management — IDEIA

> **Documento:** SECRETS-MANAGEMENT.md
> **Versão:** 1.0
> **Data:** 2026-07-18
> **Status:** ✅ Publicado
> **Propósito:** Definir estratégia e boas práticas para gerenciamento de secrets no ecossistema IDEIA.

## 1. Princípios

1. **Nunca versionar secrets** — `.env` está no `.gitignore` (verificado)
2. **Usar variáveis de ambiente** — secrets fornecidos via env, nunca hardcoded
3. **Rotação periódica** — chaves devem ser rotacionadas a cada 90 dias
4. **Mínimo privilégio** — cada secret com escopo restrito ao necessário
5. **Audit trail** — acesso a secrets registrado no audit trail

## 2. Secrets Atuais

| Secret | Localização | Uso | Rotação |
|--------|-------------|-----|---------|
| `OPENAI_API_KEY` | `.env` / CI secrets | Provider de LLM | A cada 90 dias |
| `ANTHROPIC_API_KEY` | `.env` / CI secrets | Provider de LLM | A cada 90 dias |
| `MISTRAL_API_KEY` | `.env` / CI secrets | Provider de LLM | A cada 90 dias |
| `NPM_TOKEN` | CI secrets (GitHub) | Publicação npm | A cada 180 dias |
| `GITHUB_TOKEN` | CI (automático) | Ações GitHub | Automático |

## 3. Boas Práticas

### Desenvolvimento Local
- Usar `.env` (não versionado) com `.env.example` como template
- `PromptSecurity.scan()` detecta secrets em prompts automaticamente
- `OutputValidation.validateOutput()` bloqueia vazamento de secrets em saídas LLM

### CI/CD
- Secrets armazenados em GitHub Secrets (criptografados)
- `NPM_TOKEN` com escopo restrito ao pacote `@ai-devkit/*`
- Workflow `security.yml` escaneia por secrets vazados via audit + CodeQL

### Futuro (SOPS/Vault)
Para ambientes com múltiplos desenvolvedores, recomenda-se:
1. **Mozilla SOPS** — criptografia de arquivos `.env` com age/PGP
2. **HashCorp Vault** — servidor centralizado de secrets (para deploy)

## 4. Plano de Migração

| Fase | Ação | Prazo |
|------|------|-------|
| Atual | `.env` + GitHub Secrets | ✅ Atual |
| Curto prazo | Implementar SOPS para `.env.production` | 2 sprints |
| Médio prazo | Avaliar HashiCorp Vault para deploy | 4 sprints |
| Longo prazo | Auto-rotação de chaves via cron | 8 sprints |

## 5. Referências

- [Mozilla SOPS](https://github.com/getsops/sops)
- [HashCorp Vault](https://www.vaultproject.io/)
- [GitHub Secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

## 6. Histórico

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 1.0 | 2026-07-18 | IDEIA Core Team | Versão inicial |
