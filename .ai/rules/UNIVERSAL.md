# Regras Universais — IDEIA

> **Fonte ÚNICA da Verdade para qualquer modelo de IA.**
> Todo arquivo de regras (CLAUDE.md, .cursorrules, copilot-instructions.md, .windsurfrules)
> DEVE referenciar este arquivo como fonte primária.

---

## ⚠️ REGRA #1 — A Verdade Está no Código, Não na Sua Memória

**NUNCA confie na sua memória ou conhecimento prévio sobre este projeto.**
Sempre:
1. Leia `docs/governance/REALITY-MANIFEST.md` — contém a lista REAL de packages
2. Leia `.ai/context/inject.json` — contém dados verificados do código
3. Execute `npx tsx scripts/docs-sync.ts` para verificar o estado atual

**Se houver divergência entre o que você "sabe" e o que está no código, o CÓDIGO é a verdade.**

---

## ⚠️ REGRA #2 — Documentação é Obrigatória e Verificada

- Toda alteração em packages/ DEVE refletir em REALITY-MANIFEST.md
- O script `scripts/docs-sync.ts --fix` atualiza automaticamente
- O pre-commit hook BLOQUEIA commits com docs desatualizadas
- O CI `docs-verify.yml` FALHA se houver divergência

**Comandos:**
```bash
npx tsx scripts/docs-sync.ts         # audit
npx tsx scripts/docs-sync.ts --fix   # auto-corrigir
npx tsx scripts/docs-sync.ts --ci    # verificar (exit 1 se falhar)
```

---

## ⚠️ REGRA #3 — Contexto Real é Obrigatório

Antes de qualquer operação:
1. Leia `.ai/context/inject.json` — contexto real verificado
2. Leia `docs/governance/REALITY-MANIFEST.md` — lista de packages
3. Verifique se `docs-sync.ts --ci` passa

**Se o contexto estiver desatualizado, pare e execute --fix primeiro.**

---

## ⚠️ REGRA #4 — Arquitetura Theia-Only

- **Única interface:** Eclipse Theia
- **Frontend:** Widgets React dentro do Theia (`packages/ideia-plugin/src/browser/`)
- **Backend:** Serviços Theia (`packages/ideia-plugin/src/node/`)
- **Proibido:** Qualquer frontend standalone (React SPA, Vite, Next.js não-Theia)

---

## ⚠️ REGRA #5 — Cross-Platform Nativo

- Todo script DEVE funcionar em Windows (PowerShell 5.1+) e Linux (bash)
- Path separators: usar `path.join()` ou `path.resolve()`, NUNCA strings fixas
- Testes DEVEM rodar em CI matrix (ubuntu + windows)

---

## ⚠️ REGRA #7 — Workspace Boundary: `IDEIA/` é a Única Área Editável

- **Toda alteração ou criação de arquivo DEVE estar dentro de `IDEIA/`**
- **Diretórios fora de `IDEIA/` (raiz do workspace) são LEGADO** — podem ser consultados para referência, mas **NUNCA modificados**
- Violação: **bloqueia commit / PR / release**
- Exceção: apenas se explicitamente autorizado por instrução direta do usuário
- Path de referência: `F:\PROJETOS\ai-devkit-workspace\IDEIA\`

---

## ⚠️ REGRA #6 — Clean Architecture

- Domínio não importa infraestrutura
- Contratos explícitos (DTOs validados)
- Erros de negócio via `AppError` com código
- Proibido `any` sem justificativa

---

## 🔄 Ciclo de Vida da Documentação

```
Você altera código fonte
       ↓
lint-staged detecta → roda docs-sync.ts --fix
       ↓
pré-commit hook → docs-sync.ts --ci
       ↓
  Se falhar → ❌ COMMIT BLOQUEADO (use --no-verify só em emergência)
  Se passar → ✅ Commit permitido
       ↓
CI (GitHub Actions) → docs-verify.yml valida novamente
       ↓
  Se falhar → ❌ PR BLOQUEADO
```

---

## 📋 Checklist para IAs

Toda interação com este projeto DEVE seguir:

- [ ] Li `docs/governance/REALITY-MANIFEST.md`
- [ ] Li `.ai/context/inject.json`
- [ ] Executei `npx tsx scripts/docs-sync.ts` (sem erros)
- [ ] Verifiquei se a mudança não quebra o pre-commit hook
- [ ] Documentação reflete o código real
