# Política de Segurança — IDEIA

> **Documento:** POLITICA-SEGURANCA.md
> **Versão:** 1.0
> **Data:** 2026-07-18
> **Status:** ✅ Publicado
> **Propósito:** Definir princípios, papéis, responsabilidades e controles de segurança do ecossistema IDEIA.

## 1. Escopo

Esta política cobre todos os componentes do ecossistema IDEIA: código-fonte, infraestrutura, pipelines CI/CD, agentes de IA, modelos LLM, dados de telemetria, embeddings e configurações.

## 2. Princípios

1. **Defesa em profundidade** — múltiplas camadas de controle (código → pipeline → runtime → dados)
2. **Menor privilégio** — agentes e usuários têm apenas as permissões necessárias
3. **Confiança zero** — toda ação é verificada, independentemente da origem
4. **Auditabilidade** — toda decisão de agente é registrada com hash chain à prova de adulteração
5. **Transparência** — o usuário é informado quando interage com IA
6. **Privacidade por design** — dados pessoais minimizados e protegidos

## 3. Papéis e Responsabilidades

| Papel | Responsabilidade |
|-------|-----------------|
| **BDFL** | Aprovação final de exceções de segurança |
| **Security Champion** | Ownership dos controles SEC-001 a SEC-025, revisão semanal |
| **Core Team** | Implementação de controles, reporte de incidentes |
| **Contribuidores** | Seguir boas práticas, reportar vulnerabilidades |

## 4. Controles de Segurança

### 4.1 Código
- ESLint com `plugin:security/recommended` ativo
- `no-explicit-any` como erro (proibido any sem justificativa)
- Code review obrigatório em todo PR
- Secret scan via talisman no pre-commit

### 4.2 Audit Trail
- Audit trail com SHA-256 hash chain (SEC-001)
- `verifyChain()` para verificação de integridade
- `getChainTipHash()` para checkpoint externo

### 4.3 Agentes de IA
- Policy engine com regras `auto/ask/block`
- Output validation (schema + PII)
- Prompt injection detection (planejado: LLM Guard)

### 4.4 Pipeline CI/CD
- Quality gates em 4 níveis (Commit → PR → Release → Sprint)
- Gap analysis permanente via `ai:gap:check`
- Dependências escaneadas (planejado: CI/CD security tests)

### 4.5 Dados
- Sem secrets versionados (`.gitignore` + `.env.example`)
- Dados de telemetria anonimizados
- Rótulos de privacidade em dados de treino

## 5. Reporte de Vulnerabilidades

Ver `SECURITY.md` na raiz do projeto para canais e procedimentos.

## 6. Revisão

Esta política será revisada anualmente ou quando houver mudanças significativas na arquitetura.

## 7. Histórico

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 1.0 | 2026-07-18 | IDEIA Core Team | Versão inicial |
