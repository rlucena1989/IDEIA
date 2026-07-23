# Estudo de Implementação — Cedar + Red Teaming + Compliance (G5/G12/G13)

> **Tipo:** `implementation-study`
> **Status:** `planned`
> **Data:** 2026-07-21
> **Fase:** F6 — ~33h, 12 tarefas
> **Gaps:** G5 (PolicyEngine regex → Cedar), G12 (Red Teaming automático), G13 (Compliance LGPD), G22 (SBOM), G23 (AI Safety), G24 (Bias Detection)

---

## 1. Estado Atual

- `packages/policy-engine/` — regex-based (27 patterns Linux + Windows)
- `packages/policy-gateway/` — wrapper do policy-engine
- `packages/prompt-security/` — validation básico
- `packages/safety-circuit/` — stub
- `packages/violation-registry/` — stub
- `packages/slo-monitor/` — stub

## 2. Plano de Implementação

### Etapa 1: Cedar Policy Engine (8h)
- Integrar Cedar-wasm no `policy-engine`
- Definir policies em Cedar (.cedar) em vez de YAML regex
- Schema de resources + actions + principals
- Test de policies com `cedar test`

### Etapa 2: Red Teaming Automático (6h)
- Script `scripts/red-team.mjs`
- 20+ cenários de ataque (injection, jailbreak, roleplay, etc.)
- Relatório em JSON com severidade
- Modo `--fix` para auto-correção

### Etapa 3: Compliance Checker (6h)
- Regras LGPD: PII detection, data retention, right to delete
- Regras SOC2: audit trail completo, access control
- Relatório de compliance em PDF/JSON
- Violações registradas em `violation-registry`

### Etapa 4: AI Safety (6h)
- Prompt guard: detectar jailbreak, injection, harmful content
- Output validator: bias detection, toxic content, factual accuracy
- Rate limiting por modelo
- Content moderation pipeline

### Etapa 5: SBOM (4h)
- `scripts/generate-sbom.mjs` — CycloneDX format
- Scaneamento de dependências (npm audit + Snyk)
- Verificação de licenças

### Etapa 6: Auditoria Contínua (3h)
- `scripts/auto-audit-loop.js` — CI diário
- Gate de segurança no CI
- Relatório semanal automático

## 3. Cedar Policy Example

```cedar
permit (
  principal is IDEIA::Agent,
  action in [IDEIA::Action::"file.read"],
  resource is IDEIA::Resource::"file"
) when {
  resource.path startsWith "/workspace/" &&
  resource.extension in [".ts", ".js", ".json", ".md"]
};

forbid (
  principal,
  action in [IDEIA::Action::"file.write"],
  resource
) when {
  resource.path.matches(".*\\.(env|key|pem|secret)$")
};
```

## 4. Compliance Rules (LGPD)

```typescript
const LGPD_RULES = [
  { article: 'Art. 7', check: 'consentimento explícito para coleta' },
  { article: 'Art. 15', check: 'direito de eliminação' },
  { article: 'Art. 18', check: 'acesso aos dados pelo titular' },
  { article: 'Art. 46', check: 'medidas de segurança' },
];
```

## 5. Dependências

- `cedar-wasm` — Cedar policy engine
- `@cyclonedx/cyclonedx-library` — SBOM
- `snyk-api` — vulnerability scanning (opcional)
- Node.js 20+ com WebAssembly support

## 6. Critérios de Aceitação

- [ ] Policy Engine com Cedar (não regex)
- [ ] 20+ cenários de red teaming
- [ ] Compliance check LGPD + SOC2
- [ ] AI Safety: prompt guard + bias detection
- [ ] SBOM automático (CycloneDX)
- [ ] Auto-audit loop no CI
