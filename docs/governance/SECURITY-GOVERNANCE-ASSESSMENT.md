# Segurança, Governança e Compliance — AI-Devkit v2

> **Data:** 2026-07-13  
> **Metodologia:** Inspeção de 50+ arquivos de políticas, código de segurança, supply chain e compliance  
> **Nível de confiança:** Alto (leitura direta de código e políticas)

---

## 1. MAPA DE RISCOS

### 🔴 Risco Crítico

| #      | Risco                                        | Prob. | Impacto | Descrição                                                                                                                                       | Localização                                                   |
| ------ | -------------------------------------------- | ----- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **R1** | **`.env` versionado no git**                 | Alta  | Alto    | `.env` com placeholders JWT_SECRET, DATABASE_URL está **trackeado no repositório** — se valores reais forem inseridos, vazarão para o histórico | `raiz/.env`                                                   |
| **R2** | **Nenhum scanner automatizado de secrets**   | Alta  | Alto    | `ph-value-policy.yaml` define regras, mas **nenhuma ferramenta real** (gitleaks, truffleHog, detect-secrets) é executada em CI                  | Nenhum workflow integra scanner de secrets                    |
| **R3** | **29 arquivos executam comandos do sistema** | Média | Alto    | `child_process.spawn/exec` espalhados por 29 fontes — qualquer vulnerabilidade de injeção de comando compromete o host                          | `io/real.ts`, `commands/verify.ts`, `commands/audit.ts`, etc. |

### 🟠 Risco Alto

| #      | Risco                                                | Prob. | Impacto | Descrição                                                                                                                     | Localização                                                        |
| ------ | ---------------------------------------------------- | ----- | ------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **R4** | **Sem isolamento de execução**                       | Alta  | Médio   | Todos os comandos rodam com as permissões do usuário — sem sandbox, sem container, sem `worker_threads`                       | `commands/*.ts` (29 arquivos)                                      |
| **R5** | **no-explicit-any desligado sem enforcement**        | Alta  | Médio   | `.ai/security/baseline.json` exige justificativa para `any`, mas `.eslintrc.js` tem `no-explicit-any: off`                    | `.eslintrc.js:10`                                                  |
| **R6** | **Políticas sem verificação automática**             | Alta  | Médio   | `agent-safety-policy.md`, `secrets-policy.md` definem regras, mas **nenhum código as verifica em tempo de execução**          | `.ai/policies/`, `.ai/security/`                                   |
| **R7** | **Templates geram código com placeholders de senha** | Média | Médio   | `appbuilder/generator.ts`, `generators/infrastructure.ts` geram `JWT_SECRET`, `db_password` — risco se commitados sem revisão | `local-ai/appbuilder/generator.ts`, `generators/infrastructure.ts` |

### 🟡 Risco Médio

| #       | Risco                                              | Prob. | Impacto | Descrição                                                                                      | Localização               |
| ------- | -------------------------------------------------- | ----- | ------- | ---------------------------------------------------------------------------------------------- | ------------------------- |
| **R8**  | **Sem rate limiting na API**                       | Média | Médio   | Servidor HTTP (porta 3001) não tem proteção contra abuso                                       | `web-ui/server/index.ts`  |
| **R9**  | **Sem autenticação na API**                        | Média | Médio   | Servidor HTTP local sem auth — risco em modo rede                                              | `web-ui/server/index.ts`  |
| **R10** | **Audit trail não é verificado automaticamente**   | Média | Médio   | Ledger JSONL existe mas não há validação periódica de integridade                              | `.ai/audit/`              |
| **R11** | **Alertas via webhook sem cifragem**               | Baixa | Médio   | Webhooks Slack/Discord podem conter dados sensíveis em texto claro                             | `utils/alert-webhook.ts`  |
| **R12** | **MCP server sem autenticação**                    | Média | Médio   | MCP stdio é local, mas se exposto via TCP não tem auth                                         | `commands/mcp.ts`         |
| **R13** | **Dados sensíveis de compliance sem proteção**     | Baixa | Médio   | Relatórios de compliance (score, gaps) ficam em `.ai/reports/compliance/` sem criptografia     | `.ai/reports/compliance/` |
| **R14** | **Chave HMAC do attestation chain em texto claro** | Média | Médio   | Segredo da corrente de atestação em `.ai/audit/secret` — se lido por atacante, quebra a cadeia | `.ai/audit/secret`        |

---

## 2. GAPS DE SEGURANÇA

### 🔴 Críticos

| Gap                                        | Status Atual                 | Requerido                                                                    |
| ------------------------------------------ | ---------------------------- | ---------------------------------------------------------------------------- |
| **G1** Scanner de secrets em CI            | ❌ Ausente                   | gitleaks ou truffleHog em CI para detectar secrets hardcoded antes do commit |
| **G2** `.env` no `.gitignore`              | ❌ `.env` está **trackeado** | Adicionar ao `.gitignore` e remover do tracking                              |
| **G3** Sandbox de execução                 | ❌ Ausente                   | `worker_threads` ou Docker para isolar execução de comandos                  |
| **G4** Verificação automática de políticas | ❌ Ausente                   | Código que valide `agent-safety-policy`, `secrets-policy` em runtime         |

### 🟠 Altos

| Gap                                  | Status Atual | Requerido                                                      |
| ------------------------------------ | ------------ | -------------------------------------------------------------- |
| **G5** Lint security rules           | ⚠️ Mínimo    | Adicionar `eslint-plugin-security`, `eslint-plugin-no-secrets` |
| **G6** Auth na REST API              | ❌ Ausente   | Token-based auth para o servidor HTTP (modo produção)          |
| **G7** Validação periódica do ledger | ❌ Ausente   | Script que verifique integridade do JSONL contra ataques       |
| **G8** Container image scanning      | ❌ Ausente   | Docker Scout ou Trivy para scan de imagens                     |
| **G9** SBOM assinatura               | ❌ Ausente   | Assinar SBOM CycloneDX com chave privada                       |
| **G10** Rate limiting                | ❌ Ausente   | Limitar requisições por IP no servidor HTTP                    |

### 🟡 Médios

| Gap                                       | Status Atual   | Requerido                                                                                        |
| ----------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------ |
| **G11** Testes de segurança               | ⚠️ Parcial     | Testes para `agent-security.ts`, `security/baseline.ts` existem, mas faltam testes de penetração |
| **G12** Dependency vulnerability database | ⚠️ `npm audit` | Usar ferramenta mais robusta (Snyk, Socket.dev)                                                  |
| **G13** Secrets rotation automation       | ❌ Ausente     | Script para rotação automática de chaves                                                         |
| **G14** Criptografia em repouso           | ❌ Ausente     | Dados de compliance e auditoria sem criptografia                                                 |

---

## 3. LACUNAS DE GOVERNANÇA

| Lacuna                         | Status                                           | Evidência                                                               |
| ------------------------------ | ------------------------------------------------ | ----------------------------------------------------------------------- |
| Políticas sem dono             | ❌ Nenhuma política tem owner ou data de revisão | `.ai/policies/*.md` sem metadados                                       |
| Enforcement de `laws.yaml`     | ⚠️ Manual                                        | Regras como "no `any` sem justificativa" não são verificadas por linter |
| Revisão periódica de políticas | ❌ Ausente                                       | Nenhum workflow de revisão trimestral                                   |
| Matriz de permissões           | ❌ Não encontrada                                | `.ai/permissions/matrix.md` não existe                                  |
| Memory/decisions log           | ❌ Não encontrado                                | `.ai/memory/` com `decisions-log.md` não existe                         |
| OKRs/KPIs de governança        | ❌ Ausente                                       | Sem métricas para medir adesão à governança                             |
| Rastreabilidade de exceções    | ⚠️ Manual                                        | `barrier-bypass.log` tem 1 entrada — sem processo formal                |
| Segregação de papéis           | ❌ Ausente                                       | Sem definição de admin vs operador vs auditor                           |
| Plano de resposta a incidentes | ❌ Ausente                                       | Sem procedimento documentado                                            |
| BCP/DR (continuidade)          | ❌ Ausente                                       | Sem plano de recuperação de desastres                                   |

---

## 4. MEDIDAS JÁ EXISTENTES

### ✅ Segurança de credenciais

| Medida                         | Status                                    | Detalhe                                                             |
| ------------------------------ | ----------------------------------------- | ------------------------------------------------------------------- |
| `.env` no `.gitignore`         | ⚠️ **Presente mas `.env` está trackeado** | `.gitignore` lista `.env`, porém o arquivo real está versionado     |
| Proibição de secrets hardcoded | ✅ 3 políticas                            | `ph-value-policy.yaml`, `security-policy.yaml`, `secrets-policy.md` |
| Detecção de downgrade          | ✅ `security/baseline.ts`                 | `detectDowngrades()` + `logDowngradeAttempt()`                      |
| Barreiras de segurança         | ✅ `security/barrier.ts`                  | Bloqueia `auth*`, `.env*`, `credentials*`, `secrets*`               |
| Prompt injection detection     | ✅ `agent-security.ts`                    | Bloqueia 11 padrões de jailbreak                                    |

### ✅ Supply Chain

| Medida          | Status                 | Detalhe                               |
| --------------- | ---------------------- | ------------------------------------- |
| Dependabot      | ✅ Semanal             | npm + GitHub Actions, max 10 PRs      |
| CVE scanning    | ✅ `supply-chain scan` | `npm audit` + modo CI com exit code 1 |
| SBOM generation | ✅ `supply-chain sbom` | CycloneDX format                      |
| CodeQL          | ✅ Semanal             | `security-and-quality` queries        |

### ✅ Auditoria e trilhas

| Medida                  | Status            | Detalhe                                                     |
| ----------------------- | ----------------- | ----------------------------------------------------------- |
| Atestação criptográfica | ✅ HMAC-SHA256    | `attestations/chain.ts` — corrente de atestação             |
| Audit command           | ✅ `audit`        | Verifica placeholders, código gerado, arquivos obrigatórios |
| Audit ledger            | ✅ JSONL          | `.ai/audit/ledger.jsonl`                                    |
| Downgrade log           | ✅ JSONL          | `.ai/reports/security/downgrades.jsonl`                     |
| Barrier bypass log      | ✅                | `.ai/audit-trail/barrier-bypass.log`                        |
| Weekly audit workflow   | ✅ GitHub Actions | Auditoria semanal automatizada                              |

### ✅ Compliance

| Medida                        | Status                                   | Detalhe                                                   |
| ----------------------------- | ---------------------------------------- | --------------------------------------------------------- |
| 5 frameworks                  | ✅ SOC 2, PCI DSS, GDPR, LGPD, ISO 27001 | `compliance/frameworks/index.ts`                          |
| Mapeamento regras → framework | ✅ Keyword matching                      | `compliance/mapper.ts`                                    |
| CLI compliance                | ✅ 6 subcomandos                         | `compliance.ts` — map, check, report, gap, badges, import |
| Score de conformidade         | ✅                                       | `ComplianceReport` com score por framework                |

### ✅ Agentes e aprovação

| Medida                     | Status                      | Detalhe                                                    |
| -------------------------- | --------------------------- | ---------------------------------------------------------- |
| Política de agente         | ✅                          | `agent-safety-policy.md` + `agent-security.ts`             |
| Ações que exigem aprovação | ✅                          | `write_file`, `delete_file`, `execute_command`, `git_push` |
| Padrões bloqueados         | ✅                          | `rm -rf`, `sudo`, `chmod 777`, `curl                       | bash` |
| Aprovação governada        | ✅ `approve` + `governance` | Fluxo request → grant/deny                                 |

---

## 5. AÇÕES DE CORREÇÃO PRIORITÁRIAS

### 🔴 Imediatas (1-2 dias)

| #      | Ação                                                            | Esforço | Risco mitigado                   |
| ------ | --------------------------------------------------------------- | ------- | -------------------------------- |
| **A1** | Adicionar `.env` ao `.gitignore` e **remover do tracking**      | 30 min  | **R1** — `.env` versionado       |
| **A2** | Configurar gitleaks no CI (pre-commit + GitHub Actions)         | 2h      | **R2** — sem scanner de secrets  |
| **A3** | Adicionar `eslint-plugin-security` e `eslint-plugin-no-secrets` | 1h      | **R5** — `any` sem justificativa |
| **A4** | Criar script de validação do audit ledger (contra adulteração)  | 2h      | **R10** — ledger não validado    |

### 🟠 Curto prazo (1 semana)

| #      | Ação                                                                            | Esforço | Risco mitigado                     |
| ------ | ------------------------------------------------------------------------------- | ------- | ---------------------------------- |
| **A5** | Implementar `worker_threads` para execução isolada de comandos                  | 4h      | **R4** — sem isolamento            |
| **A6** | Adicionar auth token ao servidor HTTP (porta 3001)                              | 2h      | **R9** — API sem auth              |
| **A7** | Adicionar rate limiting ao servidor HTTP                                        | 2h      | **R8** — sem rate limit            |
| **A8** | Mover segredo HMAC do disco para env var                                        | 1h      | **R14** — chave em texto claro     |
| **A9** | Adicionar validação de políticas em runtime (`security-policy check --enforce`) | 4h      | **R6** — políticas sem verificação |

### 🟡 Médio prazo (2-4 semanas)

| #       | Ação                                            | Esforço | Risco mitigado                            |
| ------- | ----------------------------------------------- | ------- | ----------------------------------------- |
| **A10** | Containerizar com Docker + Docker Scout         | 8h      | **R4** isolamento + **G8** image scanning |
| **A11** | Assinar SBOM com GPG                            | 2h      | **G9** — SBOM sem assinatura              |
| **A12** | Adicionar Snyk ou Socket.dev ao CI              | 2h      | **G12** — npm audit limitado              |
| **A13** | Criar plano de resposta a incidentes            | 4h      | Lacuna de governança                      |
| **A14** | Criar OKRs de governança e dashboard trimestral | 4h      | Lacuna de governança                      |

---

## 6. RECOMENDAÇÕES PARA OPERAÇÃO HÍBRIDA HUMANO + IA

### Princípios

1. **Toda ação destrutiva exige aprovação humana** — já implementado em `agent-security.ts`
2. **Toda decisão de IA deve ser explicável** — já implementado em `explanation/`
3. **Toda mudança deve ser auditável** — já implementado em `attestations/chain.ts`
4. **Nenhum segredo deve estar acessível ao agente** — `agent-security.ts` bloqueia leitura de `.env*`, `credentials*`, `secrets*`

### Arquitetura de aprovação recomendada

```
[Agente IA] propõe ação
     │
     ▼
[agent-security.ts] valida política
     │
     ├── Ação permitida → executa automaticamente
     │
     └── Ação requer aprovação → cria `ApprovalRequest`
               │
               ▼
         [orchestrate decide] 3+1 opções
               │
               ├── Humano aprova → executa
               │
               └── Humano rejeita → registra em `explanation/` + `memory/`
```

### Trilha de segurança obrigatória

```
1. Toda ação → agent-security.ts valida
2. Toda aprovação → approve.ts registra
3. Toda decisão → explanation/ gera DecisionTrace
4. Toda execução → audit/ledger.jsonl registra
5. Toda exceção → barrier-bypass.log registra
6. Periódico → attest chain valida integridade
7. Semanal → audit --json verifica baseline
```

### Recomendações específicas

| Cenário                            | Regra                                           | Implementação                       |
| ---------------------------------- | ----------------------------------------------- | ----------------------------------- |
| Agente quer modificar arquivo      | Requer aprovação se risco ≥ high                | `agent-security.ts`                 |
| Agente quer executar comando shell | Bloquear `rm -rf`, `sudo`, `chmod 777`          | `agent-security.ts` blockedPatterns |
| Agente quer acessar `.env`         | Bloqueado sempre                                | `security/barrier.ts`               |
| Agente quer fazer git push --force | Requer aprovação + justificativa                | `agent-security.ts`                 |
| Humano quer bypassar regra         | Log em `barrier-bypass.log` + razão obrigatória | Já implementado                     |
| Decisão crítica do agente          | Gerar `DecisionTrace` + `Explanation`           | `explanation/`                      |
| Risco alto detectado               | Notificar webhook + criar `ApprovalRequest`     | `alert-webhook.ts` + `approve.ts`   |
| Auditoria semanal                  | Validar ledger + atestações + baseline          | `.github/workflows/`                |

### Limites de autonomia por perfil

| Perfil            | Ações automáticas                                        | Requer aprovação                      | Bloqueado                                  |
| ----------------- | -------------------------------------------------------- | ------------------------------------- | ------------------------------------------ |
| **Leitor**        | Listar arquivos, consultar memória, gerar relatórios     | N/A                                   | Escrita, execução, git push                |
| **Operador**      | Criar arquivos, executar comandos seguros, `npm install` | write_file, delete_file, git push     | `rm -rf`, `sudo`, `chmod 777`              |
| **Mantenedor**    | Tudo do operador + git push                              | `git push --force`, batch >5 arquivos | Modificar `.ai/laws.yaml`, `.ai/policies/` |
| **Administrador** | Tudo                                                     | Bypass de barreira (com log)          | Nada                                       |
| **Auditor**       | Apenas leitura                                           | N/A                                   | Tudo que modifica estado                   |

---

## APÊNDICE A: MAPA COMPLETO DE POLÍTICAS

| Política                | Arquivo                                    | Escopo                               | Enforcement                                |
| ----------------------- | ------------------------------------------ | ------------------------------------ | ------------------------------------------ |
| Command Policy          | `.ai/policies/command-policy.md`           | Comandos shell permitidos/bloqueados | Manual + `agent-security.ts`               |
| AI Generated Code       | `.ai/policies/ai-generated-code-policy.md` | Código gerado por IA                 | Manual                                     |
| Agent Safety            | `.ai/policies/agent-safety-policy.md`      | Comportamento de agentes IA          | `agent-security.ts`                        |
| PH Value                | `.ai/policies/ph-value-policy.yaml`        | Secrets, tokens, credenciais         | Scanner `.ai/bin/check-ph-value-policy.js` |
| Project Policy          | `.ai/policies/project-policy.yaml`         | Convenções de projeto                | Manual                                     |
| Security Policy         | `.ai/policies/security-policy.yaml`        | Secrets, rede, FS, dependências      | Manual + CI                                |
| Secrets Policy (legado) | `.ai/security/secrets-policy.md`           | Secrets e credenciais                | Manual                                     |
| Network Security        | `.ai/security/network-security-policy.md`  | Conexões de rede                     | Manual                                     |
| Agent Safety (legado)   | `.ai/security/agent-safety-policy.md`      | Comportamento de agentes             | Manual                                     |

## APÊNDICE B: FERRAMENTAS DE SEGURANÇA RECOMENDADAS

| Ferramenta                 | Função                                 | Prioridade  | Custo                  |
| -------------------------- | -------------------------------------- | ----------- | ---------------------- |
| **gitleaks**               | Scanner de secrets em commits          | 🔴 Imediata | Gratuito               |
| **eslint-plugin-security** | Detectar padrões inseguros em JS/TS    | 🔴 Imediata | Gratuito               |
| **Socket.dev**             | Dependency risk scoring                | 🟠 Curto    | Gratuito (open source) |
| **Docker Scout**           | Image vulnerability scanning           | 🟠 Curto    | Gratuito               |
| **Trivy**                  | Filesystem + repo + container scanning | 🟠 Curto    | Gratuito               |
| **SOPS**                   | Secrets encryption in git              | 🟡 Médio    | Gratuito               |
| **OpenSCA**                | Dependency compliance                  | 🟡 Médio    | Gratuito               |

---

## SCORE DE SEGURANÇA

| Dimensão                 | Pontos     | %       | Status |
| ------------------------ | ---------- | ------- | ------ |
| Políticas definidas      | 18/20      | 90%     | ✅     |
| Enforcement automatizado | 8/20       | 40%     | ⚠️     |
| Ferramentas de scanning  | 6/15       | 40%     | ⚠️     |
| Supply chain             | 12/15      | 80%     | ✅     |
| Auditoria e trilhas      | 14/15      | 93%     | ✅     |
| Isolamento               | 2/15       | 13%     | ❌     |
| **Total**                | **60/100** | **60%** | ⚠️     |
