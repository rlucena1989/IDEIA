# Política de Governança — Projeto IDEIA

> **Documento:** POLITICA-GOVERNANCA-IDEIA.md
> **Versão:** 1.0
> **Data:** 2026-07-17
> **Status:** ✅ Publicado
> **Propósito:** Definir as regras, processos e padrões que todo contribuidor deve seguir no ecossistema IDEIA.
> **Base:** `AGENTS.md`, `docs/ESTUDOS/ESTUDO-QUALIDADE-TOTAL-IDEIA.md`, `docs/governance/MATRIZ-COMPLIANCE-SEGURANCA.md`, `docs/ESTUDOS/VISAO-PRODUTO-IDEIA.md`

---

## Sumário

1. [Estrutura de Governança](#1-estrutura-de-governança)
2. [Política de Autonomia](#2-política-de-autonomia)
3. [Política de Commits](#3-política-de-commits)
4. [Política de Branches](#4-política-de-branches)
5. [Política de PRs](#5-política-de-prs)
6. [Política de Releases](#6-política-de-releases)
7. [Política de Segurança](#7-política-de-segurança)
8. [Política de Dados e Privacidade](#8-política-de-dados-e-privacidade)
9. [Código de Conduta](#9-código-de-conduta)
10. [Contribuição](#10-contribuição)

---

## 1. Estrutura de Governança

### 1.1 Papéis e Responsabilidades

#### BDFL (Benevolent Dictator for Life)

| Aspecto | Detalhe |
|---------|---------|
| **Titular** | Criador do projeto IDEIA |
| **Poderes** | Veto final em decisões arquiteturais, definição de visão estratégica, nomeação/remoção de Core Team |
| **Limitações** | Não pode alterar este documento sem RFC pública; não pode violar o Código de Conduta |
| **Herança** | Deve nomear sucessor com 6 meses de transição; se não houver, Core Team elege novo BDFL por 80%+ votos |

#### Core Team

| Aspecto | Detalhe |
|---------|---------|
| **Composição** | 3–7 membros indicados pelo BDFL |
| **Mandato** | 12 meses, renovável por avaliação |
| **Poderes** | Merge em `main`, aprovação de ADRs, definição de roadmap, revisão de autonomia |
| **Responsabilidades** | Revisão de PRs arquiteturais, mentoria de contributors, manutenção de documentação de governança |
| **Afastamento** | Ausência > 30 dias consecutivos sem justificativa → status inativo; > 60 dias → remoção |

#### Contributors

| Aspecto | Detalhe |
|---------|---------|
| **Quem pode** | Qualquer pessoa que tenha ao menos 1 PR merged |
| **Direitos** | Abrir PRs, participar de RFCs, votar em decisões não-estratégicas |
| **Responsabilidades** | Seguir este documento, manter qualidade, reportar violações |
| **Promoção** | 10+ PRs merged com qualidade consistente → convite para Core Team |

#### Users

| Aspecto | Detalhe |
|---------|---------|
| **Quem é** | Qualquer pessoa que use o IDEIA |
| **Direitos** | Reportar bugs, sugerir features, acessar documentação |
| **Responsabilidades** | Reportar vulnerabilidades via SECURITY.md, respeitar licença |

---

### 1.2 Processo de Decisão

#### RFC-style para Mudanças Arquiteturais

Toda mudança que afete múltiplos módulos, interfaces públicas, ou a arquitetura geral DEVE passar por RFC:

```
Fase 1 — Proposta (3 dias)
  ├── Autor abre ISSUE com template RFC
  ├── Inclui: contexto, proposta, alternativas, impactos, riscos
  └── Label: rfc

Fase 2 — Discussão (7 dias)
  ├── Comentários públicos no GitHub
  ├── Core Team deve responder em até 48h
  └── Se controvérsia → reunião síncrona obrigatória

Fase 3 — Decisão (3 dias)
  ├── Core Team vota: Approve / Reject / Needs Changes
  ├── 60%+ para aprovar (BDFL voto de minerva)
  └── Se aprovada → merge do documento RFC em docs/decisions/

Fase 4 — Implementação
  ├── Até 2 sprints para implementar
  └── Se não implementada no prazo → RFC expira, precisa renovar
```

#### ADRs para Decisões Técnicas

Decisões técnicas de escopo limitado (single module, non-breaking) usam ADRs:

```
Formato: docs/decisions/ADR-XXXX-titulo.md
  ├── Title: curto e descritivo
  ├── Status: Proposed | Accepted | Deprecated | Superseded
  ├── Context: por que essa decisão é necessária
  ├── Decision: o que foi decidido
  ├── Consequences: impactos positivos e negativos
  └── Alternatives: opções rejeitadas e motivo

Fluxo: PR → Review → Merge → Registrar no index ADR
```

#### Matriz de Decisão

| Tipo de Decisão | Quem Decide | Processo | Documento |
|----------------|-------------|----------|-----------|
| Visão estratégica | BDFL | Consulta Core Team | VISAO-PRODUTO |
| Arquitetura cross-módulo | Core Team + BDFL | RFC | RFC + ADR |
| Decisão técnica local | Core Team | ADR | ADR |
| Mudança em política | BDFL | RFC obrigatória | Este documento |
| Bugfix / refactor | Contributor | PR + Review | PR description |
| Release | Core Team | Gate 3 | CHANGELOG |

---

### 1.3 Hierarquia de Documentos

```
CONSTITUIÇÃO (este documento)
  ├── Regras imutáveis, requer RFC para alterar
  │
  ├── ADRs (docs/decisions/)
  │   ├── Decisões técnicas vinculantes
  │   ├── Mutáveis por novo ADR que supersede o anterior
  │   └── Revisão mensal obrigatória
  │
  ├── Estudos (docs/ESTUDOS/)
  │   ├── Análises e pesquisas
  │   ├── Recomendação, não vinculante
  │   └── Revisão trimestral obrigatória
  │
  ├── Código-fonte
  │   ├── Implementação concreta
  │   ├── Deve seguir ADRs e Estudos
  │   └── Verificado por fitness functions (npm run ai:boundaries)
  │
  └── Documentos de Governança (docs/governance/)
      ├── Políticas, matrizes, planos
      ├── Registrados em document-registry.md
      └── Revisão trimestral
```

### 1.4 Ciclo de Revisão

| Documento | Frequência | Responsável | Gatilho |
|-----------|-----------|-------------|---------|
| ADRs | Mensal | Core Team | Issue recorrente |
| Estudos | Trimestral | Core Team + Autores | Agenda de sprint |
| Política de Governança | Semestral | BDFL + Core Team | RFC |
| Matriz de Compliance | Trimestral | Security Champion | Agenda de sprint |
| Gap Analysis (GAPS-PRODUCAO) | Contínuo | Contributors | A cada PR |
| Document Registry | Contínuo | Core Team | A cada novo documento |

---

## 2. Política de Autonomia

### 2.1 Níveis de Autonomia (N0–N4)

#### N0 — Assistido (Padrão para novos usuários/contributors)

| Ação | Permissão | Exemplo |
|------|-----------|---------|
| Ler arquivos | ✅ Sem restrições | `src/*.ts`, `docs/*.md` |
| Editar arquivos | 🟡 Apenas via chat com aprovação explícita | "Posso modificar user-service.ts?" |
| Executar comandos | 🟡 Apenas comandos seguros predefinidos | `npm test`, `npm run build` |
| Deploy | ❌ Bloqueado | `npm run deploy` é rejeitado |
| Uso de APIs externas | ❌ Bloqueado | Chamadas a provedores LLM são auditadas |
| Aprovação de PRs | ❌ Não pode | Apenas review não-vinculante |

**Quem começa em N0:** Todo novo contributor automaticamente.

#### N1 — Supervisionado

| Ação | Permissão | Exemplo |
|------|-----------|---------|
| Ler arquivos | ✅ Sem restrições | Qualquer arquivo do projeto |
| Editar arquivos | ✅ Sem aprovação para <50 linhas | Refactor local, bugfix pequeno |
| Executar comandos | 🟡 Comandos de dev/test | `npm run test:integration`, `npm run lint` |
| Deploy | ❌ Bloqueado | |
| Uso de APIs externas | 🟡 Apenas provedores configurados | Ollama local habilitado |
| Aprovação de PRs | ❌ Não pode | |

**Quem começa em N1:** Contributors com 3+ PRs merged.

#### N2 — Semi-autônomo

| Ação | Permissão | Exemplo |
|------|-----------|---------|
| Ler arquivos | ✅ Sem restrições | Incluindo arquivos sensíveis (config, .env) |
| Editar arquivos | ✅ Até 200 linhas sem aprovação | Implementar módulo completo |
| Executar comandos | ✅ Comandos de build/test/lint | `npm run build`, `npm test` |
| Deploy | 🟡 Apenas staging | Deploy para ambiente de teste |
| Uso de APIs externas | 🟡 Com limites de taxa | LLM providers, APIs públicas |
| Aprovação de PRs | 🟡 Apenas não-arquiteturais | PRs simples, sem mudança de contrato |
| Aprovação de ADRs | ❌ Não pode | |

**Quem atinge N2:** Core Team members, contributors com 10+ PRs e histórico de qualidade.

#### N3 — Autônomo

| Ação | Permissão | Exemplo |
|------|-----------|---------|
| Ler arquivos | ✅ Sem restrições | Incluindo audit trail |
| Editar arquivos | ✅ Sem limite de tamanho | Qualquer módulo do sistema |
| Executar comandos | ✅ Todos os comandos | Incluindo scripts de deploy |
| Deploy | ✅ Staging e produção | Release completo |
| Uso de APIs externas | ✅ Com monitoramento | Todos os provedores |
| Aprovação de PRs | ✅ Arquiteturais também | PRs cross-módulo |
| Aprovação de ADRs | ✅ Pode aprovar ADRs | Decisões técnicas |
| Modificar políticas | ❌ Bloqueado | Requer RFC |

**Quem atinge N3:** Core Team com 6+ meses de contribuição consistente.

#### N4 — Total

| Ação | Permissão | Exemplo |
|------|-----------|---------|
| Todas as ações | ✅ Ilimitado | Incluindo modificar este documento |
| Modificar autonomia | ✅ Pode alterar níveis de outros | Promover/despromover contributors |
| Veto em decisões | ✅ Veto final | |
| Acesso total ao audit | ✅ Complete access | |

**Quem atinge N4:** Apenas BDFL. Pode ser delegado temporariamente.

---

### 2.2 Quando Promover / Despromover

#### Promoção

| De → Para | Critérios | Quem decide |
|-----------|-----------|-------------|
| N0 → N1 | 3 PRs merged + 1 revisão de qualidade positiva | Core Team |
| N1 → N2 | 10 PRs merged + 90 days de contribuição + sem violações de política nos últimos 30 dias | Core Team |
| N2 → N3 | 6+ meses como N2 + 50+ PRs merged + mentoria de 2 contributors N0→N1 | Core Team + BDFL |
| N3 → N4 | BDFL nomeia | BDFL |

#### Despromoção

| Condição | Ação | Quem decide |
|----------|------|-------------|
| 3 violações de política em 30 dias | Despromover 1 nível | Core Team |
| Violação grave de segurança (introduzir vulnerabilidade intencionalmente) | Despromover para N0 imediatamente | Core Team + BDFL |
| 60 dias sem contribuição | Suspensão automática (pode retornar no nível anterior em até 180 dias) | Automático |
| Violação do Código de Conduta | Banimento (ver seção 9) | Core Team + BDFL |

---

### 2.3 Limites por Tipo de Ação

| Tipo de Ação | N0 | N1 | N2 | N3 | N4 |
|-------------|----|----|----|----|----|
| **Arquivos** | | | | | |
| Leitura | ✅ | ✅ | ✅ | ✅ | ✅ |
| Escrita (< 50 linhas) | 🟡 approval | ✅ | ✅ | ✅ | ✅ |
| Escrita (50–200 linhas) | ❌ | 🟡 approval | ✅ | ✅ | ✅ |
| Escrita (> 200 linhas) | ❌ | ❌ | 🟡 approval | ✅ | ✅ |
| Exclusão | ❌ | ❌ | 🟡 approval | ✅ | ✅ |
| **Terminal** | | | | | |
| `npm test`, `npm run lint` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `npm run build` | 🟡 approval | ✅ | ✅ | ✅ | ✅ |
| `npm run deploy` | ❌ | ❌ | 🟡 staging | ✅ | ✅ |
| `rm`, `mv`, `chmod` (sistema) | ❌ | ❌ | ❌ | 🟡 approval | ✅ |
| Instalar dependências | ❌ | 🟡 approval | ✅ | ✅ | ✅ |
| **Deploy** | | | | | |
| Staging | ❌ | ❌ | 🟡 | ✅ | ✅ |
| Produção | ❌ | ❌ | ❌ | ✅ | ✅ |
| Rollback | ❌ | ❌ | ❌ | ✅ | ✅ |
| **APIs** | | | | | |
| LLM providers (locais) | 🟡 audit | ✅ | ✅ | ✅ | ✅ |
| LLM providers (cloud) | ❌ | 🟡 | ✅ | ✅ | ✅ |
| APIs externas (gerais) | ❌ | 🟡 com limites | ✅ | ✅ | ✅ |
| Webhooks | ❌ | ❌ | 🟡 | ✅ | ✅ |
| **Governança** | | | | | |
| Aprovar PRs (simples) | ❌ | ❌ | ✅ | ✅ | ✅ |
| Aprovar PRs (arquiteturais) | ❌ | ❌ | ❌ | ✅ | ✅ |
| Aprovar ADRs | ❌ | ❌ | ❌ | ✅ | ✅ |
| Modificar política | ❌ | ❌ | ❌ | ❌ | ✅ |
| Alterar autonomia de outro | ❌ | ❌ | ❌ | ❌ | ✅ |

**Legenda:** ✅ = Permitido | 🟡 = Permitido com restrições | ❌ = Bloqueado

---

### 2.4 Override Manual

O BDFL e qualquer membro do Core Team pode sobrescrever os limites de autonomia em caráter emergencial:

| Situação | Override | Registro |
|----------|----------|----------|
| Incidente de segurança crítico | Core Team pode elevar temporariamente para mitigar | Audit trail + notificação BDFL em < 1h |
| Release blocker | BDFL pode autorizar bypass de restrição | ADR emergencial + audit trail |
| Experimento controlado | Core Team pode conceder autonomia temporária para teste | Issue com prazo definido |

**Todo override DEVE ser:**
1. Registrado no audit trail com motivo e duração
2. Limitado a 48h (renovável uma vez)
3. Notificado ao canal #governance no Slack/Discord

---

### 2.5 Logging de Mudanças de Autonomia

Toda mudança de autonomia (promoção, despromoção, override) é registrada:

```typescript
interface AutonomyChangeLog {
  timestamp: string;           // ISO 8601
  agentId: string;            // Quem mudou
  targetId: string;           // Quem foi mudado
  previousLevel: AutonomyLevel; // N0–N4
  newLevel: AutonomyLevel;
  reason: string;             // Motivo documentado
  approvedBy: string;         // Quem aprovou
  expiresAt?: string;         // Se temporário
  auditHash: string;          // Hash chain
}
```

Comando para consultar histórico:
```bash
npm run ai:autonomy:history -- --agent <id>
npm run ai:autonomy:current                    # Lista níveis atuais de todos
```

---

## 3. Política de Commits

### 3.1 Formato (Conventional Commits)

```
tipo(escopo): descrição

[corpo opcional]

[footer opcional (BREAKING CHANGE, Closes, Ref)]
```

**Exemplos:**
```
feat(agent): add intent classifier for feature requests
fix(event-bus): resolve message ordering in high-throughput scenarios
docs(quality): update coverage targets for v1.0
refactor(memory): extract embedding service from store
security(policy): add cedar policy for file write restrictions
```

### 3.2 Tipos Permitidos

| Tipo | Uso | Release |
|------|-----|---------|
| `feat` | Nova funcionalidade | MINOR |
| `fix` | Correção de bug | PATCH |
| `docs` | Documentação | PATCH |
| `style` | Formatação, lint | PATCH |
| `refactor` | Refatoração sem mudança funcional | PATCH |
| `perf` | Melhoria de performance | PATCH |
| `test` | Testes | PATCH |
| `chore` | Build, CI, tarefas administrativas | PATCH |
| `ci` | CI/CD pipeline | PATCH |
| `security` | Correção de segurança | PATCH (ou MAJOR se breaking) |
| `revert` | Reversão de commit anterior | PATCH |

**Breaking changes:** Adicionar `!` após o tipo + `BREAKING CHANGE` no footer:
```
feat(api)!: migrate from REST to WebSocket

BREAKING CHANGE: All REST endpoints are removed. Use WebSocket.
```

### 3.3 Escopos

| Escopo | Descrição | Exemplo |
|--------|-----------|---------|
| `chat` | Interface de chat, streaming | `feat(chat): add slash commands` |
| `editor` | Monaco, diff viewer, editor | `fix(editor): syntax highlight for jsx` |
| `agent` | Agent runtime, tool functions | `feat(agent): add planner agent` |
| `memory` | Memória, embeddings, RAG | `refactor(memory): optimize vector search` |
| `event-bus` | NATS, pub/sub, mensageria | `fix(event-bus): dedup on reconnect` |
| `policy` | Políticas, permissões, segurança | `security(policy): add path traversal rule` |
| `deploy` | Deploy, CI/CD, infra | `ci(deploy): add staging environment` |
| `quality` | Testes, cobertura, lint | `test(quality): add injection suite` |
| `security` | Segurança, criptografia, audit | `security(audit): implement hash chain` ✅ |
| `docs` | Documentação | `docs(governance): add autonomy policy` |
| `ux` | Experiência do usuário | `feat(ux): add onboarding wizard` |
| `api` | APIs internas/externas | `feat(api): add health check endpoint` |

### 3.4 Regras

| Regra | Valor | Exceção |
|-------|-------|---------|
| Tamanho máximo | 400 linhas por commit | Geração de código por IA documentada |
| Assunto máximo | 72 caracteres | N/A |
| Linhas no corpo | < 72 caracteres por linha | Citações de código |
| Review obrigatório | > 100 linhas alteradas | Contributors N3+ em escopo próprio |
| Mínimo de 1 teste | Todo commit de feat/fix deve incluir ou alterar teste | docs/style/chore |

### 3.5 Git Hook (Pre-commit)

Via Husky + `lint-staged` (conforme `AGENTS.md`):

```
✅ lint-staged: eslint --fix + prettier --write
✅ commitlint: conventional commit format
✅ Secret scan: talisman
✅ Typecheck: tsc --noEmit (apenas arquivos alterados)
✅ Testes rápidos: jest --changedSince HEAD~1
```

**Qualquer falha BLOQUEIA o commit.**

---

## 4. Política de Branches

### 4.1 Estrutura

```
main ─────────────────────────────────────────────────────── (produção)
  │
  ├── develop ────────────────────────────────────────────── (integração)
  │     │
  │     ├── feature/IDEIA-123-adicionar-validador-email
  │     ├── feature/IDEIA-456-migrar-para-cedar
  │     ├── fix/IDEIA-789-corrigir-timeout-streaming
  │     │
  │     └── release/v1.2.0 ────→ main (tag)
  │
  └── hotfix/IDEIA-999-vazamento-memoria ─→ main (depois merge em develop)
```

### 4.2 Descrição das Branches

| Branch | Base | Merge para | Protegida | Requisitos |
|--------|------|-----------|-----------|------------|
| `main` | — | — | ✅ | PR obrigatório + 2 approvals + todos os status checks |
| `develop` | `main` | — | ✅ | PR obrigatório + 1 approval + checks essenciais |
| `feature/IDEIA-XXX` | `develop` | `develop` | ❌ | Nome deve incluir issue ID |
| `fix/IDEIA-XXX` | `develop` | `develop` | ❌ | Nome deve incluir issue ID |
| `release/vX.Y.Z` | `develop` | `main` | 🟡 | Apenas Core Team cria |
| `hotfix/IDEIA-XXX` | `main` | `main` + `develop` | 🟡 | Apenas Core Team cria, revisão urgente |

### 4.3 Regras

- **feature/ e fix/:** Sempre criadas a partir de `develop`. Merge de volta para `develop` via PR.
- **release/vX.Y.Z:** Criada a partir de `develop` quando ready para release. Apenas bugfixes críticos são permitidos (sem novas features). Merge para `main` e `develop`.
- **hotfix/:** Criada a partir de `main` para emergências em produção. Merge para `main` e `develop`. Deve ter approvação de ao menos 1 Core Team member.
- **Squash merge** é obrigatório para `feature/` e `fix/` em `develop`.
- **Merge commit** é obrigatório para `release/` e `hotfix/` em `main`.
- **Rebase** é proibido em branches compartilhadas (`develop`, `main`, `release/`).

### 4.4 Nomenclatura

```
feature/IDEIA-<numero>-<descricao-kebab-case>
fix/IDEIA-<numero>-<descricao-kebab-case>
release/v<major>.<minor>.<patch>
hotfix/IDEIA-<numero>-<descricao-kebab-case>
```

**Exemplos:**
```
feature/IDEIA-42-autocomplete-multiline
fix/IDEIA-128-crash-on-empty-response
release/v1.2.0
hotfix/IDEIA-256-security-prompt-injection
```

### 4.5 Branch Protection Rules (GitHub)

#### `main`

```
☑ Require pull request reviews: 2 approvals
☑ Dismiss stale reviews when new commits are pushed
☑ Require review from Code Owners
☐ Restrict who can push (Core Team + BDFL)
☑ Require status checks:
  ├── lint-check, typecheck, unit-tests, coverage
  ├── security-scan, integration-tests
  ├── contract-check, boundaries
  └── smoke-test
☑ Require branches to be up to date
☑ Require conversation resolution
☐ Allow force pushes: ❌
☐ Allow deletions: ❌
```

#### `develop`

```
☑ Require pull request reviews: 1 approval
☑ Dismiss stale reviews when new commits are pushed
☑ Require status checks:
  ├── lint-check, typecheck, unit-tests
  └── security-scan
☑ Require branches to be up to date
☐ Allow force pushes: ❌
☐ Allow deletions: ❌
```

---

## 5. Política de PRs

### 5.1 Template Obrigatório

O template a seguir DEVE ser preenchido em todo PR. Salvo em `.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## Descrição

<!-- Descreva o que este PR faz e por quê. Inclua contexto, motivação e referência à issue. -->

Closes IDEIA-XXX

## Tipo de Mudança

- [ ] feat — Nova funcionalidade
- [ ] fix — Correção de bug
- [ ] refactor — Refatoração
- [ ] perf — Performance
- [ ] test — Testes
- [ ] docs — Documentação
- [ ] security — Segurança
- [ ] chore — Manutenção

## Checklist de Qualidade

- [ ] Código segue as regras de arquitetura (Clean Architecture + DDD)
- [ ] Tipagem TypeScript estrita respeitada (sem `any` não justificado)
- [ ] Testes unitários passam e cobrem o novo código
- [ ] Testes de integração passam (se aplicável)
- [ ] Lint e formatação (ESLint + Prettier) OK
- [ ] Nenhum secret/credencial no código
- [ ] Contratos de API/eventos são backward compatible
- [ ] Documentação atualizada (se aplicável)
- [ ] CHANGELOG atualizado (se aplicável)
- [ ] PR não excede 500 linhas (exceto generated)

## Mudanças por Arquivo

<!-- Liste os principais arquivos alterados e o que mudou em cada um. -->

| Arquivo | Mudança |
|---------|---------|
| `src/...` | Descrição da mudança |

## Como Testar

<!-- Passos para testar esta mudança localmente. -->

1. `npm run build`
2. `npm test`
3. ...

## Screenshots (se UI)

<!-- Se aplicável, adicione screenshots antes/depois. -->

## Observações

<!-- Informações adicionais, decisões técnicas, alternativas consideradas. -->
```

### 5.2 Regras de PRs

| Regra | Valor | Exceção |
|-------|-------|---------|
| Tamanho máximo | 500 linhas (diff) | Código gerado por IA com justificativa |
| Labels obrigatórias | Pelo menos 1: `feature`, `bug`, `security`, `quality`, `docs` | |
| Review mínimo (não-arquitetural) | 1 approval | |
| Review mínimo (arquitetural) | 2 approvals, sendo 1 do Core Team | |
| Review de segurança | Obrigatório se label `security` | Security Champion revisa |
| Tempo máximo para review | 48h (dias úteis) | Após 48h pode solicitar outro reviewer |
| Stale PR (> 30 dias sem atividade) | Fechado automaticamente | Pode ser reaberto |
| Draft PRs | Permitido para WIP, não requer review | |
| Conflitos de merge | Devem ser resolvidos antes do merge | |
| Status checks | Todos devem passar | Exceção documentada no PR |

### 5.3 Labels

| Label | Cor | Descrição | Obrigatória em |
|-------|-----|-----------|----------------|
| `feature` | 🟢 Verde | Nova funcionalidade | PRs de feat |
| `bug` | 🔴 Vermelho | Correção de bug | PRs de fix |
| `security` | ⚫ Preto | Correção de segurança | PRs de security |
| `quality` | 🔵 Azul | Melhoria de qualidade | PRs de test/refactor |
| `docs` | 🟡 Amarelo | Documentação | PRs de docs |
| `breaking` | 🟠 Laranja | Breaking change | PRs com BREAKING CHANGE |
| `rfc` | 🟣 Roxo | RFC para discussão | Issues de RFC |
| `e2e` | ⚪ Cinza | Gatilho para testes E2E | PRs core |
| `needs-fix` | 🔴 Vermelho | Gate não-crítico falhou | Automático do CI |
| `automerge` | 🟢 Verde | Merge automático após aprovação | PRs de chore/docs simples |

### 5.4 Fluxo de Revisão

```
PR Aberto
  │
  ├── CI/CD Gate 2 executa automaticamente
  │     ├── ✅ All checks pass → label 'ready-for-review'
  │     └── ❌ Falha → label 'needs-fix', autor notificado
  │
  ├── Zen Review (AI) executa
  │     ├── Gera relatório no PR
  │     └── Se score < 70 → label 'needs-human-attention'
  │
  ├── Reviewers são atribuídos (automático por CODEOWNERS)
  │     ├── Reviewer aprova → ✅
  │     ├── Reviewer solicita mudanças → 🔄 autor ajusta
  │     └── Stale (> 48h) → reatribuição automática
  │
  ├── Merge
  │     ├── feature/fix → squash merge em develop
  │     ├── release → merge commit em main
  │     └── hotfix → merge commit em main + develop
  │
  └── Pós-merge
        ├── Branch deletada automaticamente
        └── Se PR fecha issue → issue fechada automaticamente
```

### 5.5 CODEOWNERS

Arquivo `.github/CODEOWNERS`:

```
# Arquitetura geral
docs/decisions/          @core-team
AGENTS.md                @core-team

# Pacotes core
packages/contracts/      @core-team
packages/agent-runtime/  @core-team
packages/policy-engine/  @core-team
packages/event-bus/      @core-team

# Segurança
packages/prompt-security/ @core-team-security
packages/audit-trail/     @core-team-security
docs/governance/         @core-team

# Qualidade
docs/ESTUDOS/            @core-team
*.test.ts                @core-team

# Documentação
docs/                    @core-team
*.md                     @core-team
```

---

## 6. Política de Releases

### 6.1 Versionamento Semântico (SemVer)

```
vMAJOR.MINOR.PATCH
   │      │      └── PATCH: bugfixes, segurança, docs (backward compatible)
   │      └──────── MINOR: novas features (backward compatible)
   └─────────── MAJOR: breaking changes, arquitetura nova
```

**Regras:**

| Componente | Quando incrementar | Exemplo |
|-----------|-------------------|---------|
| MAJOR | Breaking change em APIs, contratos, armazenamento | `feat(api)!: remove REST endpoints` |
| MINOR | Nova funcionalidade, nova API, novo provedor | `feat(agent): add code-review agent` |
| PATCH | Bugfix, segurança, performance, docs | `fix(chat): crash on empty message` |

**Pré-release:**
```
v2.0.0-alpha.1    → Alpha (interno, instável)
v2.0.0-beta.1     → Beta (testers, feature complete)
v2.0.0-rc.1       → Release Candidate (pronto para produção, falta aprovação)
```

### 6.2 Changelog

Gerado automaticamente a partir dos conventional commits:

```bash
npm run ai:release:notes -- --from v1.1.0 --to v1.2.0 > CHANGELOG.md
```

Formato:

```markdown
# Changelog

## [v1.2.0] — 2026-09-15

### 🚀 Features
- feat(agent): add intent classifier for feature requests ([#142])
- feat(chat): implement slash commands ([#138])

### 🐛 Bug Fixes
- fix(event-bus): message ordering in high-throughput ([#145])
- fix(editor): syntax highlight for JSX files ([#140])

### 🔒 Security
- security(audit): implement cryptographic hash chain ([#150])
- security(policy): add path traversal protection ([#147])

### 📚 Documentation
- docs(governance): add autonomy policy ([#152])

### ⚙️ Maintenance
- chore(deps): update @types/node to v20.14 ([#148])

### 📊 Performance
- perf(memory): optimize vector search by 40% ([#149])

### BREAKING CHANGES
- feat(api)!: migrate from REST to WebSocket ([#155])
  Migration guide: docs/migrations/rest-to-ws.md
```

### 6.3 Release Flow

```
Fase 1 — Preparação (3 dias antes)
  ├── Core Team decide versão e escopo
  ├── Cria branch release/vX.Y.Z de develop
  ├── Apenas bugfixes críticos são permitidos
  └── Roadmap atualizado

Fase 2 — Release Candidate (2 dias)
  ├── Cria tag vX.Y.Z-rc.1
  ├── E2E completo + Performance full suite + Segurança full suite
  ├── Benchmarks comparativos com versão anterior
  ├── Se falhas → corrige, cria rc.2, etc.
  └── Se aprovado → prossegue

Fase 3 — Gate 3 (Release Gate)
  ├── Resiliência + Load test + Audit chain verification
  ├── SBOM gerado (CycloneDX JSON)
  ├── Changelog gerado e revisado
  ├── Migration guides (se breaking changes)
  ├── Build verificado + Bundle size check
  └── Licença e atribuições verificadas

Fase 4 — Publicação (1 dia)
  ├── Merge release/vX.Y.Z em main (merge commit)
  ├── Tag vX.Y.Z em main
  ├── Deploy produção
  ├── Release notes no GitHub
  ├── Notificação nos canais (Slack, Discord, Twitter?)
  └── Merge release/vX.Y.Z em develop (se houver correções)

Fase 5 — Pós-release (contínuo)
  ├── Monitorar métricas de erro por 48h
  ├── Hotfix se necessário
  └── Post-mortem se houve incidente
```

### 6.4 Release Checklist (Gate 3)

```
╔══════════════════════════════════════════════════════════════════╗
║                      GATE 3 — RELEASE                            ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  TESTES                                                           ║
║  [x] Testes E2E completos (fluxo chat → deploy)                  ║
║  [x] Testes de performance (benchmark completo)                   ║
║  [x] Testes de segurança (full suite)                             ║
║  [x] Testes de resiliência (circuit breaker, failover)            ║
║  [x] Testes de carga (k6, multi-usuário)                          ║
║  [x] Benchmarks comparativos (vAtual vs vAnterior)                ║
║                                                                   ║
║  AUDITORIA                                                        ║
║  [x] Audit trail verification (hash chain íntegra) ✅              ║
║  [x] SBOM gerado (npm run ai:sbom:generate)                       ║
║  [x] Changelog gerado e revisado                                  ║
║  [x] Licença e atribuições verificadas                            ║
║  [x] Dependências sem vulnerabilidades críticas/altas (npm audit fix — 0 vulnerabilidades) ║
║                                                                   ║
║  DOCUMENTAÇÃO                                                     ║
║  [x] README atualizado                                            ║
║  [x] CHANGELOG atualizado                                         ║
║  [ ] Migration guides (se breaking changes)                       ║
║  [x] API docs publicadas/atualizadas                              ║
║                                                                   ║
║  INFRA                                                            ║
║  [x] Build bem-sucedido (npm run build)                           ║
║  [ ] Docker image built (se aplicável)                            ║
║  [ ] Bundle size dentro do limite                                ║
║  [x] Deploy staging verificado                                    ║
║                                                                   ║
║  APROVAÇÃO                                                        ║
║  [x] Core Team approva release                                   ║
║  [x] Security Champion approva (se security changes)             ║
║  [ ] BDFL informado (não precisa aprovar se não breaking)        ║
║                                                                   ║
╚══════════════════════════════════════════════════════════════════╝
```

### 6.5 SBOM (Software Bill of Materials)

Gerado automaticamente ao final do Gate 3:

```bash
npm run ai:sbom:generate -- --format cyclonedx --output docs/sbom/sbom-vX.Y.Z.json
```

O SBOM inclui:

- Todas as dependências diretas e transitivas (NPM)
- Versões, licenças, hashes
- Modelos LLM utilizados (com hash do modelo)
- Ferramentas de build e suas versões
- Assinatura digital do SBOM

### 6.6 Bloqueios de Release

| Condição | Ação |
|----------|------|
| 🔴 Falha em teste E2E | Release BLOQUEADA |
| 🔴 Falha em teste de segurança | Release BLOQUEADA |
| 🔴 Audit trail corrompido | Release BLOQUEADA |
| 🔴 Vulnerabilidade crítica aberta | Release BLOQUEADA |
| 🟡 Performance degradada > 20% | Release condicional (post-mortem obrigatório) |
| 🟡 SBOM não gerado | Release condicional (gerar antes do deploy) |
| 🟡 Changelog não revisado | Release condicional |
| 🟢 Todos os itens verdes | Release liberada |

---

## 7. Política de Segurança

### 7.1 Reportar Vulnerabilidades

Arquivo `SECURITY.md`:

```markdown
# Security Policy

## Reporting a Vulnerability

**DO NOT create a public GitHub issue for security vulnerabilities.**

Send an email to: security@ideia.dev
-or-
Open a confidential issue using GitHub's private vulnerability reporting.

### What to include:
- Description of the vulnerability
- Steps to reproduce
- Affected versions
- Potential impact
- Suggested fix (if any)

### Response Times:
- Critical: 48 hours
- High: 7 days
- Medium: 14 days
- Low: 30 days

### Disclosure Policy:
1. Report received → acknowledgment within 24h
2. Investigation → remediation timeline shared within 48h
3. Patch developed → tested in private fork
4. Coordinated disclosure → public announcement + CVE allocation

We follow Coordinated Vulnerability Disclosure (CVD) as defined in ISO 29147.
```

### 7.2 Tempo de Resposta

| Severidade | Exemplo | Tempo para 1ª resposta | Tempo para patch | Notificação |
|-----------|---------|----------------------|------------------|-------------|
| 🔴 Crítica | RCE, SQL injection, vazamento de credenciais | 4h | 48h | Email + Slack + Pager |
| 🟠 Alta | XSS, path traversal, quebra de autenticação | 24h | 7 dias | Email + Slack |
| 🟡 Média | CSP bypass, info disclosure não-sensível | 48h | 14 dias | Email |
| 🟢 Baixa | Best practice, hardening menor | 7 dias | 30 dias | Issue privada |

### 7.3 Disclosure Coordenado

```
1. Reporte recebido (privado)
2. Equipe de segurança tria em < 4h
3. CVE solicitado (se aplicável)
4. Patch desenvolvido em fork privado
5. Usuários notificados 7 dias antes da publicação (se crítico, 48h)
6. Patch publicado + CVE divulgado simultaneamente
7. Post-mortem em até 7 dias após resolução
```

### 7.4 Ferramentas de Segurança Obrigatórias

| Ferramenta | Onde | Frequência | Bloqueante |
|-----------|------|-----------|------------|
| `talisman` | Pre-commit hook | A cada commit | ✅ Sim |
| `trufflehog` | CI (PR) | A cada push | ✅ Sim |
| `snyk` / `npm audit` | CI (PR) | A cada push | ✅ Sim (críticas/altas) |
| CodeQL | GitHub Actions | A cada PR | ✅ Sim |
| Secret scanning (GitHub) | GitHub | Contínuo | ✅ Sim |
| `trivy` | CI (diário) | Diário | ❌ Não (alerta) |
| Dependabot | GitHub | Automático | ❌ Não (PR automático) |
| Garak (red team) | CI (semanal) | Semanal | ❌ Não (relatório) |

### 7.5 Container Scanning

```
Pipeline de container:
  ├── Build da imagem Docker
  ├── Trivy scan: vulnerabilidades OS + libs
  ├── Docker Scout: análise de supply chain
  ├── Se CRÍTICA → build falha
  └── Se ALTA + sem patch → alerta manual

Registro:
  ├── Imagens assinadas (cosign)
  ├── SBOM da imagem gerado
  └── Scan semanal de imagens em repositório
```

### 7.6 Auditable Security Events

Os seguintes eventos SÃO SEMPRE registrados no audit trail:

| Evento | Detalhes | Retenção |
|--------|----------|----------|
| Login / autenticação | identity, timestamp, IP | 1 ano |
| Mudança de autonomia | agent, target, de → para | 1 ano |
| Decisão de política | action, decisão, motivo | 1 ano |
| Execução de comando | comando, output hash, status | 1 ano |
| Acesso a secrets | identity, secret id (nunca o valor) | 1 ano |
| Modificação de arquivo | path, diff hash, agent | 1 ano |
| Deploy | versão, ambiente, status | 1 ano |
| Violação de política | agent, action, pattern triggered | 1 ano |
| Override manual | quem, o que, motivo, duração | 1 ano |

### 7.7 Dependências Proibidas

| Tipo | Motivo |
|------|--------|
| Pacotes com licença GPL/AGPL (se não compatível com MIT) | Incompatibilidade de licença |
| Pacotes sem manutenção há > 2 anos | Risco de supply chain |
| Pacotes com vulnerabilidade crítica sem patch | Risco de segurança |
| `eval()`, `new Function()`, `vm.runInThisContext()` (a menos que em sandbox explicit) | Risco de execução de código arbitrário |
| Pacotes de telemetria não autorizados | Privacidade |

---

## 8. Política de Dados e Privacidade

### 8.1 O que a IDEIA Coleta

**Por padrão: NADA.**

A IDEIA opera completamente local e não coleta nenhum dado do usuário sem consentimento explícito.

#### Dados Coletados (Opt-in)

Se o usuário optar por telemetria, os seguintes dados ANONIMIZADOS são coletados:

| Dado | Propósito | PII? | Excluível? |
|------|-----------|------|-----------|
| Versão da IDEIA | Diagnóstico de bugs | Não | Sim |
| Sistema operacional | Diagnóstico de compatibilidade | Não | Sim |
| Comandos executados (hash) | Melhoria de UX | Não | Sim |
| Tempo de resposta (TTFT, TPS) | Performance benchmarking | Não | Sim |
| Erros (stack trace sem paths) | Identificação de bugs | Não | Sim |
| Features usadas (contagem) | Roadmap prioritization | Não | Sim |
| Modelo LLM usado | Suporte técnico | Não | Sim |

#### Dados NUNCA Coletados

- Código-fonte do usuário
- Credenciais, tokens, chaves de API
- Arquivos pessoais
- Histórico de navegação
- Dados de identificação pessoal (nome, email, IP completo)
- Conteúdo de prompts de chat (apenas metadados anonimizados)

### 8.2 Onde os Dados Ficam

| Modo | Armazenamento | Localização |
|------|--------------|-------------|
| Local (padrão) | SQLite + File system | `~/.ideia/` (máquina do usuário) |
| Cloud (opt-in) | PostgreSQL + MinIO | Configurado pelo usuário, nunca por default |
| Memória | RAM (volátil) | Processo local |

**A IDEIA NUNCA envia dados para servidores externos sem consentimento explícito e configurável.**

### 8.3 Direito à Explicação

Todo usuário tem direito a entender por que a IA tomou uma decisão:

```bash
ai explain <task-id>
# Output:
# Task: IDEIA-42 — "Add email validation to user registration"
# Plan: 3 steps
#   1. Add IsEmail decorator to user.dto.ts
#   2. Add validation test to user.service.test.ts
#   3. Add error handling to user.controller.ts
# Confidence: 0.87
# Based on: 3 similar patterns found in memory
```

A explicação inclui:
- O plano gerado
- A confiança em cada etapa
- Os padrões similares encontrados na memória
- As ferramentas utilizadas
- Tempo estimado vs real

### 8.4 Direito à Eliminação

```bash
ai forget --all                 # Remove todos os dados da IDEIA
ai forget --conversations       # Remove apenas conversas
ai forget --patterns            # Remove padrões aprendidos
ai forget --config              # Restaura configurações padrão
ai forget --telemetry           # Remove dados de telemetria
```

A eliminação:
1. Remove os dados do armazenamento local
2. Remove cópias de backup (se existirem)
3. Remove dados de cloud (se configurado)
4. Gera certificado de eliminação
5. É registrada no audit trail

### 8.5 LGPD/GDPR Compliance por Design

| Princípio | Implementação |
|-----------|--------------|
| **Minimização** | Coleta-se apenas o necessário para a função |
| **Consentimento** | Opt-in explícito na primeira execução; registro no audit trail |
| **Transparência** | `docs/PRIVACY.md` claro e acessível |
| **Portabilidade** | Export em JSON padronizado |
| **Eliminação** | Comando `ai forget` com certificado |
| **Explicação** | `ai explain` para decisões automatizadas |
| **Segurança** | Criptografia AES-256 em repouso, TLS 1.3 em trânsito |
| **Retenção** | 90 dias para telemetria (configurável), purge automático |
| **DPO** | security@ideia.dev como canal de contato |

### 8.6 Data Flow Diagram

```
Usuário
  │
  ├── Chat (prompt) ─────────────────────────────────┐
  │     │                                             │
  │     ├── Local LLM (Ollama)                        │
  │     │     ├── NUNCA sai da máquina                │
  │     │     └── Padrões aprendidos → memória local  │
  │     │                                             │
  │     └── Cloud LLM (opt-in, configurado)           │
  │           ├── Usuário escolhe o provider          │
  │           ├── Política de dados do provider      │
  │           └── Auditoria de prompts enviados      │
  │                                                   │
  ├── Telemetria (opt-in, anonimizada) ──────────────┐
  │     ├── Metadados de uso                          │
  │     ├── Métricas de performance                   │
  │     └── Relatórios de erro (sem PII)             │
  │                                                   │
  └── Dados locais ──────────────────────────────────┐
        ├── .ideia/ (SQLite, JSON, embeddings)        │
        ├── Criptografado (AES-256 se configurado)   │
        └── Backup local (nunca automático cloud)    │
```

---

## 9. Código de Conduta

### 9.1 Compromisso

Nós, como membros, contribuidores e líderes do projeto IDEIA, nos comprometemos a tornar a participação em nossa comunidade uma experiência livre de assédio para todos, independentemente de idade, corpo, deficiência, etnia, características sexuais, identidade e expressão de gênero, nível de experiência, educação, status socioeconômico, nacionalidade, aparência pessoal, raça, religião ou identidade e orientação sexual.

### 9.2 Padrões

#### Comportamentos Esperados

- Usar linguagem acolhedora e inclusiva
- Respeitar pontos de vista e experiências diferentes
- Aceitar críticas construtivas com graça
- Focar no que é melhor para a comunidade
- Demonstrar empatia para com outros membros da comunidade
- Dar crédito a quem contribuiu
- Priorizar a qualidade e segurança do código

#### Comportamentos Inaceitáveis

- Uso de linguagem ou imagens sexualizadas e atenção ou avanços sexuais indesejados
- Comentários insultuosos/depreciativos e ataques pessoais ou políticos
- Assédio público ou privado
- Publicar informações privadas de terceiros sem permissão explícita
- Introduzir intencionalmente vulnerabilidades, backdoors ou código malicioso
- Roubo de crédito de contribuições alheias
- Outras condutas que possam ser razoavelmente consideradas inadequadas em um ambiente profissional
- Violar intencionalmente as políticas deste documento

### 9.3 Responsabilidades

Os líderes da comunidade (Core Team + BDFL) são responsáveis por esclarecer os padrões de comportamento aceitável e devem tomar ações corretivas apropriadas e justas em resposta a qualquer instância de comportamento inaceitável.

Os líderes da comunidade têm o direito e a responsabilidade de remover, editar ou rejeitar comentários, commits, código, edições na wiki, issues e outras contribuições que não estejam alinhadas a este Código de Conduta, e banir temporária ou permanentemente qualquer contribuidor por outros comportamentos que considerem inadequados, ameaçadores, ofensivos ou prejudiciais.

### 9.4 Reporte de Violações

Incidentes podem ser reportados para:

```
Email: conduta@ideia.dev
Slack/Discord: DM para qualquer Core Team member (confidencial)
Formulário anônimo: https://ideia.dev/conduta/report
```

O processo de reporte:

```
1. Reporte recebido (máximo 24h para acknowledgment)
2. Triage: Core Team + BDFL (confidencial)
3. Investigação: entrevistas, revisão de logs, evidências
4. Decisão: comunicada ao reportante e ao reportado
5. Ação corretiva: implementada imediatamente
6. Apelação: reportado pode apelar ao BDFL em 7 dias
```

### 9.5 Consequências

| Violação | Primeira Ocorrência | Segunda Ocorrência | Terceira Ocorrência |
|----------|-------------------|-------------------|-------------------|
| Comentário inadequado | Advertência privada | Advertência pública | Banimento temporário (30 dias) |
| Assédio | Advertência pública | Banimento temporário (30 dias) | Banimento permanente |
| Violação de privacidade | Banimento temporário (30 dias) | Banimento permanente | — |
| Código malicioso | Banimento permanente + reporte legal | — | — |
| Roubo de crédito | Advertência pública + correção | Banimento temporário (60 dias) | Banimento permanente |

**Banimento permanente:**

- Decisão final do BDFL
- Comunicado publicamente (sem detalhes da violação)
- Registrado no audit trail
- Reporte a autoridades se crime (art. 154-A CP — invasão de dispositivo, art. 171 CP — estelionato)

### 9.6 Atribuição

Este Código de Conduta é adaptado do [Contributor Covenant](https://www.contributor-covenant.org), versão 2.1, disponível em https://www.contributor-covenant.org/version/2/1/code_of_conduct.html

---

## 10. Contribuição

### 10.1 Setup do Ambiente

```bash
# 1. Clone o repositório
git clone https://github.com/ideia/ideia.git
cd ideia

# 2. Instale as dependências
npm install

# 3. Configure os hooks de commit
npx husky install

# 4. Configure as variáveis de ambiente
cp .env.example .env

# 5. Execute o build
npm run build

# 6. Execute os testes
npm run test:unit

# 7. Verifique os gates de qualidade
npm run ai:gap:check
npm run ai:docs:enforce
npm run ai:boundaries
npm run ai:contract-check
```

### 10.2 Fluxo de Contribuição

```
1. Escolha uma issue
   ├── Issues com label 'good-first-issue' são recomendadas para novatos
   ├── Issues com label 'help-wanted' precisam de contribuição ativa
   └── Issues com label 'rfc' são para discussão arquitetural

2. Atribua a issue a si mesmo
   ├── Comente "/assign" na issue
   └── Se ficar inativo por 7 dias, a issue é desatribuída

3. Crie uma branch
   ├── git checkout -b feature/IDEIA-XXX-descricao develop
   └── Siga a política de nomenclatura de branches (seção 4.4)

4. Implemente
   ├── Siga as regras de arquitetura (Clean Architecture + DDD)
   ├── Escreva testes (mínimo 80% cobertura do novo código)
   ├── Respeite o limite de 400 linhas por commit
   └── Siga conventional commits (seção 3)

5. Submeta o PR
   ├── Preencha o template obrigatório
   ├── Adicione labels apropriadas
   ├── Verifique o checklist de qualidade
   └── CI/CD vai executar os gates automaticamente

6. Participe da revisão
   ├── Responda a comentários em até 48h
   ├── Faça as alterações solicitadas
   └── Se houver discordância, escalate para Core Team

7. Merge
   ├── Feature/fix → squash merge em develop
   └── A branch é deletada automaticamente

8. Pós-merge
   ├── Verifique se a issue foi fechada
   ├── Comemore! 🎉 (você merece)
   └── Seu nome será adicionado ao CONTRIBUTORS.md
```

### 10.3 Níveis de Contribuição

#### N0 — Assistido

| Atividades | Como começar |
|-----------|-------------|
| Reportar bugs | Abrir issue com template de bug |
| Sugerir features | Abrir issue com template de feature |
| Melhorar documentação | Corrigir typos, exemplos, traduções |
| Responder dúvidas | Ajudar em issues de outros usuários |
| Testar releases RC | Usar versões release candidate e reportar problemas |

**Reconhecimento:** Menção no CONTRIBUTORS.md na seção "Agradecimentos"

#### N1 — Supervisionado

| Atividades | Requisitos |
|-----------|-----------|
| Abrir PRs com testes | 3 PRs merged |
| Revisar PRs simples | 5 reviews úteis |
| Participar de RFCs | Comentários construtivos |
| Traduzir documentação | Issues de i18n |

**Reconhecimento:** Lista em CONTRIBUTORS.md como "Contributor"

#### N2 — Semi-autônomo

| Atividades | Requisitos |
|-----------|-----------|
| Implementar módulos completos | 10 PRs merged + qualidade consistente |
| Revisar PRs arquiteturais | Conhecimento profundo do sistema |
| Mentoriar N0→N1 | Paciência e didática |
| Criar estudos/ADRs | Capacidade de pesquisa e análise |

**Reconhecimento:** Seção "Core Contributors" no CONTRIBUTORS.md + convite para Core Team

#### N3 — Autônomo

| Atividades | Requisitos |
|-----------|-----------|
| Orquestrar entregas cross-módulo | 6+ meses como N2 |
| Definir arquitetura de módulos | Múltiplos ADRs aprovados |
| Aprovar PRs arquiteturais | Core Team |
| Liderar releases | Conhecimento de todo o pipeline |

**Reconhecimento:** Core Team member + voto em decisões estratégicas

#### N4 — Total

| Atividades | Requisitos |
|-----------|-----------|
| Definir visão estratégica | BDFL ou delegado |
| Modificar políticas | Visão de longo prazo |
| Representar o projeto | Liderança comunitária |

**Reconhecimento:** BDFL

### 10.4 Mentorias e Pairing

#### Programa de Mentoria

Todo contributor N0/N1 pode solicitar um mentor:

```bash
# Solicitar mentor
npm run ai:mentor:request -- --area agent-runtime
# Output: "Mentor assigned: @johndoe (Core Team). Schedule a 30min sync."
```

| Aspecto | Detalhe |
|---------|---------|
| Quem pode mentorar | Core Team + N2+ |
| Compromisso do mentor | 1h/semana por 4 semanas |
| Tópicos | Arquitetura, código, PR review, carreira |
| Como solicitar | Issue com label `mentorship` |
| Reconhecimento | Mentores recebem badge "Mentor" no CONTRIBUTORS.md |

#### Pair Programming Sessions

Sessões semanais de pair programming:

```
📅 Toda quinta, 15h UTC
📍 Discord/Slack huddle
🎯 Foco em: PRs complexos, arquitetura, debugging
👥 Aberto para todos os níveis
```

#### Cargo Cult Prevention

Todo contributor N2+ DEVE:

- Escrever ao menos 1 ADR por trimestre
- Apresentar 1 lightning talk (15min) por semestre
- Participar de ao menos 1 code review por semana
- Contribuir para documentação de governança

### 10.5 Reconhecimento (CONTRIBUTORS.md)

Gerado automaticamente a partir do histórico de git e GitHub:

```bash
npm run ai:contributors:generate
```

Formato:

```markdown
# Contributors — IDEIA

## Core Team
- @johndoe — Architecture, Security
- @janedoe — Agent Runtime, Memory

## Core Contributors (N2)
- @bobsmith — Event Bus, NATS
- @alicewong — Prompt Security, LLM Guard

## Contributors (N1)
- @charlie — Testes, Documentação
- @davidsilva — UI/UX, Acessibilidade

## Agradecimentos (N0)
- @emily — Report de bugs, testes RC
- @frank — Tradução pt-BR

## Mentores do Mês
- @johndoe — Mentorou 3 contributors N0→N1 em Julho/2026

## Estatísticas
- Total de contributors: 42
- Total de PRs merged: 1.234
- Total de issues fechadas: 567
- Cobertura de código: 78%
```

### 10.6 Diretrizes para Código

#### Antes de Codificar

- Verifique se a issue está atribuída a você
- Leia os ADRs existentes sobre o módulo
- Verifique se não há PR similar aberto
- Planeje a implementação (esboço de arquitetura)

#### Durante a Codificação

- Siga a estrutura de diretórios (Clean Architecture)
- Prefira composition sobre inheritance
- Escreva testes antes ou junto do código (TDD recomendado)
- Mantenha funções pequenas (< 30 linhas, < 4 parâmetros)
- Use nomes descritivos (nada de `x`, `tmp`, `data`)
- Documente apenas o "por quê", não o "o quê" (o código já diz o quê)

#### Após Codificar

- Execute `npm run build` localmente
- Execute `npm test` para o módulo alterado
- Execute `npm run lint` e `npm run format`
- Verifique se não há secrets no diff
- Faça squash de commits relacionados

---

## Apêndices

### A. Glossário

| Termo | Significado |
|-------|-------------|
| ADR | Architecture Decision Record |
| BDFL | Benevolent Dictator For Life |
| DPO | Data Protection Officer |
| DPIA | Data Protection Impact Assessment |
| LGPD | Lei Geral de Proteção de Dados (Brasil) |
| GDPR | General Data Protection Regulation (Europa) |
| RFC | Request For Comments |
| SBOM | Software Bill of Materials |
| SemVer | Semantic Versioning |
| TTFT | Time To First Token |
| TPS | Tokens Per Second |

### B. Documentos Relacionados

| Documento | Localização |
|-----------|-------------|
| AGENTS.md | `AGENTS.md` |
| Visão de Produto | `docs/ESTUDOS/VISAO-PRODUTO-IDEIA.md` |
| Plano de Implementação Detalhado | `docs/ESTUDOS/PLANO-IMPLEMENTACAO-IDEIA-DETALHADO.md` |
| Estudo de Qualidade Total | `docs/ESTUDOS/ESTUDO-QUALIDADE-TOTAL-IDEIA.md` |
| Matriz de Compliance e Segurança | `docs/governance/MATRIZ-COMPLIANCE-SEGURANCA.md` |
| Document Registry | `docs/governance/document-registry.md` |
| Gap Analysis | `docs/governance/GAPS-PRODUCAO-IDE.md` |
| Security Policy | `SECURITY.md` |
| Código de Conduta (completo) | `CODE_OF_CONDUCT.md` |

### C. Histórico de Revisão

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 1.0 | 2026-07-17 | IDEIA Core Team | Versão inicial |
| — | — | — | — |

---

*Este documento é a Constituição do projeto IDEIA. Qualquer alteração requer RFC pública e aprovação do BDFL.*
