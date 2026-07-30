# Metrics Guide — `scripts/audit/regenerate-metrics.ts` (FA-04)

> **Fonte única da verdade:** este script é a **única** fonte de números no
> projeto. Tudo que aparece em `REALITY-MANIFEST.md`, `.ai/context/*` e
> `.ai/*.{yaml,json}` é derivado de uma varredura determinística do código.
>
> **Se um número estiver errado, mude o código — não o manifesto.**
> O modo `--ci` bloqueia qualquer divergência entre manifesto e código.

---

## Comandos

```bash
npx tsx scripts/audit/regenerate-metrics.ts            # audit: imprime + detecta drift
npx tsx scripts/audit/regenerate-metrics.ts --fix       # reescreve os 12 arquivos derivados
npx tsx scripts/audit/regenerate-metrics.ts --ci       # exit 1 se drift vs commit
```

| Modo | Quando usar |
|------|-------------|
| `audit` (default) | Verificar se há drift. Não escreve nada. |
| `--fix` | Regenerar manifesto + context. Rodar após mudanças de código. |
| `--ci` | Em PR/CI — falha se manifesto desatualizado. |

---

## Saídas (12 arquivos)

1. `docs/governance/REALITY-MANIFEST.md` — tabela global de métricas
2. `.ai/context/inject.json` — snapshot JSON para IAs
3. `.ai/context/ai-handoff.md` — handoff completo entre sessões
4. `.ai/context/ai-handoff-compact.md` — handoff curto (~300 tokens)
5. `.ai/context/project-state.md` — estado + roadmap
6. `.ai/context/project-summary.md` — resumo curto
7. `.ai/context/communication-protocol.md` — protocolo humano↔IA
8. `.ai/context/README.md` — índice do diretório
9. `.ai/context/CLAUDE.md` — briefing para Claude Code
10. `.ai/project-manifest.yaml` — manifesto em YAML
11. `.ai/stack.json` — stack tecnológico detectado
12. `.ai/session-mode.json` — modo de sessão (estático)

**Regra:** todos os 12 são regenerados juntos. Não há geração parcial. Se uma
métrica mudar, todos os arquivos que a referenciam são reescritos.

---

## Adicionar uma nova métrica

Toda métrica é calculada em 4 pontos do script, sempre na mesma ordem. Para
adicionar uma nova métrica, siga estes passos **na ordem**:

### 1. Adicionar campo em `Metrics` (interface)

Local: `regenerate-metrics.ts:77-91`

```ts
interface Metrics {
  // ... campos existentes ...
  minhaNovaMetrica: number;  // ← novo campo
}
```

### 2. Calcular valor em `scanMetrics()`

Local: `regenerate-metrics.ts:192-262`

```ts
function scanMetrics(packages: PackageInfo[]): Metrics {
  // ... código existente ...
  const minhaNovaMetrica = /* cálculo a partir de srcFiles/testFiles/etc */;

  return {
    // ... campos existentes ...
    minhaNovaMetrica,
  };
}
```

**Restrições:**

- O cálculo deve ser **puramente determinístico** — sem `Date.now()` exceto
  via `new Date().toISOString()` que é normalizado por `normalizeForCompare()`.
- Não use `process.env` exceto se o valor for estável entre execuções.
- Para parse de comandos CLI, regex sobre `packages/cli/src/commands/*.ts` é
  o padrão (ver `cmdRe` em `scanMetrics`).

### 3. Adicionar linha na tabela de `genRealityManifest()`

Local: `regenerate-metrics.ts:266-318` (tabela "Métricas Globais")

```ts
| Minha nova métrica | ${m.minhaNovaMetrica} | `fonte` |
```

### 4. Injetar nos arquivos de context

A métrica nova deve aparecer em pelo menos um dos arquivos abaixo para que
LLMs e ferramentas de auditoria a vejam:

| Arquivo | Função geradora | Quando atualizar |
|---------|-----------------|------------------|
| `inject.json` | `genInjectJson()` | Métricas estruturadas (objetos, números) |
| `ai-handoff.md` / `ai-handoff-compact.md` | `genAiHandoff()` / `genAiHandoffCompact()` | Tabela de métricas para humanos |
| `project-state.md` | `genProjectState()` | Métricas de estado do projeto |
| `project-summary.md` | `genProjectSummary()` | Snapshot curto |
| `project-manifest.yaml` | `genProjectManifestYaml()` | Manifesto YAML estruturado |

Exemplo para `inject.json`:

```ts
function genInjectJson(packages: PackageInfo[], m: Metrics): Record<string, unknown> {
  return {
    // ... existente ...
    stats: {
      // ... existente ...
      minhaNovaMetrica: m.minhaNovaMetrica,
    },
  };
}
```

### 5. Adicionar cobertura em `__tests__/regenerate-metrics.test.ts`

Local: `scripts/audit/__tests__/regenerate-metrics.test.ts`

Adicione uma asserção que verifique a presença da métrica em pelo menos um
dos arquivos gerados (teste `REALITY-MANIFEST contém as 13 métricas canônicas`
ou crie um novo `it` específico).

```ts
it('REALITY-MANIFEST contém minha nova métrica', () => {
  const manifest = readFileSync(MANIFEST, 'utf-8');
  expect(manifest).toMatch(/Minha nova métrica/);
});
```

### 6. Rodar o gate

```bash
npx tsx scripts/audit/regenerate-metrics.ts --fix   # regenera
npx tsx scripts/audit/regenerate-metrics.ts --ci    # deve sair 0
npx jest scripts/audit/__tests__/regenerate-metrics.test.ts  # testes passam
```

---

## Princípios

1. **Determinístico primeiro.** Mesmo input → mesmo output (exceto timestamps).
2. **Zero prosa inventada.** Nenhum número pode ser digitado à mão.
3. **Idempotente.** Rodar `--fix` 2× produz o mesmo arquivo (tolerância: timestamps).
4. **Auto-suficiente.** Sem dependência de LLM, sem rede, sem `process.env` instável.
5. **Rápido.** Deve rodar em <60s em CI para gates de PR.
6. **Cross-platform.** Windows (PowerShell 5.1+) + Linux (bash) sem `&&`.

---

## Anti-padrões (NÃO fazer)

- ❌ Adicionar métrica calculada a partir de `Date.now()` ou timestamps não normalizados.
- ❌ Editar `REALITY-MANIFEST.md` à mão. Mudanças serão sobrescritas.
- ❌ Usar `process.env` exceto para flags de modo (`--fix`, `--ci`).
- ❌ Escrever um número no manifesto sem ter uma função de scan correspondente.
- ❌ Burlar `--ci` com `--no-verify` em emergências — conserte a métrica.

---

## Verificação rápida

```bash
# 1. Manifesto em sincronia
npx tsx scripts/audit/regenerate-metrics.ts --ci

# 2. Testes passam
npx jest scripts/audit/__tests__/regenerate-metrics.test.ts

# 3. Drift detection funciona
sed -i 's/| 292 |/| 9999 |/' docs/governance/REALITY-MANIFEST.md  # corromper
npx tsx scripts/audit/regenerate-metrics.ts --ci                  # deve dar exit 1
git checkout docs/governance/REALITY-MANIFEST.md                   # restaurar
```

---

## Histórico

- **FA-04 (2026-07-27)** — Script criado em sessão 13. Substitui parcialmente
  o `docs-sync.ts` como **fonte canônica** das métricas. `docs-sync.ts`
  continua existindo para sincronização de seções específicas de
  `AGENTS.md` que este script não cobre.
- **Sessão 14 (2026-07-28)** — Testes de idempotência adicionados em
  `__tests__/regenerate-metrics.test.ts`. Integração no PR Gate
  (`metrics-drift` job). Este guia.
