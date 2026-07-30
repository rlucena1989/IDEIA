# Plano de Resposta a Incidentes — IDEIA

> **Documento:** PLANO-RESPOSTA-INCIDENTES.md
> **Versão:** 1.0
> **Data:** 2026-07-18
> **Status:** ✅ Publicado
> **Base:** NIST SP 800-61 Rev. 2

## 1. Categorias de Incidente

| ID | Categoria | Exemplos | Severidade | SLA |
|----|-----------|----------|------------|-----|
| INC-01 | Vazamento de dados | Exposição de secrets, PII em logs de LLM | 🔴 Crítico | 1h |
| INC-02 | Injeção de prompt | Agente executa comando malicioso | 🔴 Crítico | 2h |
| INC-03 | Acesso não autorizado | Bypass de policy engine, elevação de privilégio | 🔴 Crítico | 2h |
| INC-04 | Quebra de audit trail | Hash chain violada, log adulterado | 🟠 Alto | 4h |
| INC-05 | Falha de disponibilidade | IDE não inicia, serviço indisponível | 🟠 Alto | 4h |
| INC-06 | Degradação de performance | LSP lento, file watcher excessivo | 🟡 Médio | 8h |
| INC-07 | Vulnerabilidade em dependência | CVE conhecida em pacote npm | 🟡 Médio | 24h |
| INC-08 | Alerta falso positivo | Policy engine bloqueia ação legítima | 🟢 Baixo | 48h |

## 2. SLA de Resposta

| Severidade | Tempo de resposta | Tempo de contenção | Tempo de resolução |
|------------|-------------------|--------------------|--------------------|
| 🔴 Crítico | 1 hora | 4 horas | 24 horas |
| 🟠 Alto | 4 horas | 8 horas | 48 horas |
| 🟡 Médio | 8 horas | 24 horas | 5 dias |
| 🟢 Baixo | 24 horas | — | 10 dias |

## 3. Papéis e Responsabilidades

| Papel | Pessoa/Time | Responsabilidade |
|-------|-------------|------------------|
| IC (Incident Commander) | Security Champion | Coordena resposta, decisões |
| Communications Lead | Core Team | Comunicação interna/externa |
| Technical Lead | Core Team | Análise técnica, mitigação |
| Scribe | Core Team | Registro de timeline e ações |

## 4. Fluxo de Resposta

### 4.1 Detecção
- Monitoramento: `npm run ai:gap:check`, CodeQL (CI/CD), audit trail
- Reporte: SECURITY.md (email), GitHub Security Advisories
- Automático: security.yml falha → notificação

### 4.2 Triagem
1. Confirmar incidente (IC verifica logs/evidências)
2. Classificar severidade (INC-01 a INC-08)
3. Notificar time (Slack/email)
4. Abrir issue de segurança (template: `.github/ISSUE_TEMPLATE/security-incident.md`)

### 4.3 Contenção
1. Isolar sistema afetado (desativar feature/agente)
2. Preservar evidências (audit trail, logs, snapshots)
3. Aplicar hotfix se disponível
4. Notificar stakeholders

### 4.4 Erradicação
1. Remover causa raiz (rollback de mudança, rotação de chaves)
2. Verificar hash chain do audit trail (`verifyChain()`)
3. Escanear por comprometimento adicional
4. Atualizar políticas de segurança

### 4.5 Recuperação
1. Restaurar de backup verificado
2. Validar integridade (testes, gap check, audit verify)
3. Monitorar por recorrência (24h)
4. Comunicar resolução

### 4.6 Pós-Incidente
1. Reunião post-mortem (até 5 dias após)
2. Documentar lições aprendidas
3. Atualizar `GAPS-PRODUCAO-IDE.md` se aplicável
4. Atualizar playbooks

## 5. Comunicação

- **Interna:** Slack #security — atualizações a cada hora (crítico) / 4h (alto)
- **Externa:** GitHub Security Advisory — dentro de 48h para incidentes confirmados
- **Regulatória:** LGPD/GDPR — 72h para notificação de vazamento de dados pessoais

## 6. Playbooks

### P1: Vazamento de Secrets
1. Revogar chave/imediato
2. Rotacionar em todos os sistemas
3. Verificar git history (BFG Repo-Cleaner se necessário)
4. Atualir .gitignore e .env.example

### P2: Injeção de Prompt Confirmada
1. Isolar agente afetado
2. Revisar logs do audit trail (hash chain verify)
3. Atualizar regras do policy engine
4. Adicionar padrão ao `terminal-bridge.ts` (BLOCKED_COMMANDS if applicable)

### P3: Quebra de Hash Chain
1. Identificar ponto de quebra (`verifyChain().breakAtIndex`)
2. Restaurar audit trail de backup
3. Verificar integridade de todos os arquivos `.hash`
4. Investigar causa (acesso ao sistema de arquivos)

## 7. Contatos

| Canal | Detalhe |
|-------|---------|
| Security report | security@ideia.dev (ou GitHub Advisory) |
| Incident commander | A definir |
| Escalação | BDFL (anomalyco) |

## 8. Notificação Automática

### 8.1 Roteamento por Severidade

O `IncidentNotifier` (`packages/incident-manager/src/incident-notifier.ts`) roteia notificações automaticamente:

| Severidade | Canais |
|------------|--------|
| 🔴 Crítico | PagerDuty + Slack + Email |
| 🟠 Alto | Slack + Email |
| 🟡 Médio | Email + Dashboard (console) |
| 🟢 Baixo | Email + Dashboard (console) |

### 8.2 Eventos Notificados

- `notifyCreated` — disparado após `IncidentManager.create()`
- `notifyStatusChanged` — disparado após `IncidentManager.updateStatus()`
- `notifyEscalated` — escalonamento manual via `IncidentNotifier.notifyEscalated()`

### 8.3 Configuração via Environment

```env
# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_CHANNEL=#security

# Email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user
SMTP_PASS=pass
ALERT_EMAIL_FROM=incidents@ideia.dev
ALERT_EMAIL_TO=security@ideia.dev

# PagerDuty (apenas crítico)
PAGERDUTY_API_KEY=...
PAGERDUTY_ROUTING_KEY=...
PAGERDUTY_SERVICE_ID=...
```

### 8.4 Comandos CLI

```bash
ai-devkit incident notifier status    # Verificar configuração
ai-devkit incident notifier test      # Testar canais
ai-devkit incident create -s critical "Título"   # Criar incidente
ai-devkit incident list               # Listar incidentes
```

### 8.5 Implementação

- `IncidentNotifier` — `packages/incident-manager/src/incident-notifier.ts`
- Hook no `IncidentManager` — notificador opcional (graceful fallback se não configurado)
- `loadNotifierConfig()` — carrega configuração de variáveis de ambiente
- Compatível com `sendWebhookAlert()` em `packages/cli/src/utils/alert-webhook.ts`

## 9. Histórico

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 1.0 | 2026-07-18 | IDEIA Core Team | Versão inicial |
| 1.1 | 2026-07-26 | IDEIA Core Team | Adicionada seção 8 — Notificação Automática com IncidentNotifier |
