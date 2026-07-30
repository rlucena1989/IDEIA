# FA-05 Handoff — Urgente Continuação

> **Gerado em:** 2026-07-27 17:00 UTC-03:00  
> **Sessão:** 13 — FA-05: TypeScript Build Errors Fix  
> **Status:** Em andamento — 2,083 erros (reduzido de 3,402)

---

## Estado Atual

### Métricas
- **Total erros:** 2,083 (redução de 39% de 3,402)
- **TS6307:** 298 erros (redução de 61% de 771)
- **TS6059:** 278 erros (redução de 64% de 771)
- **TS2322:** 282 erros
- **TS2304:** 236 erros
- **TS2305:** 164 erros

### Correções Aplicadas
1. ✅ Adicionado `composite: true` a 270 packages
2. ✅ Corrigido `rootDir` de `./src` para `src` em 34 packages
3. ✅ Corrigido `include` de `src` para `src/**/*.ts` em 196 packages
4. ✅ Adicionado referências comuns (logger, contracts, event-bus, audit-trail, data-layer, memory-store) a todos packages
5. ✅ Removido referências desnecessárias a llm-provider de 266 packages
6. ✅ Adicionado referências event-bus e audit-trail a config-engine
7. ✅ Adicionado `composite: true` a event-bus

---

## Problema Raiz Atual

**TS6059/TS6307 errors** são causados por packages que importam de `llm-provider` mas não têm referência adequada no tsconfig.json.

**Estado atual do llm-provider:**
- ❌ **NÃO** está no root `tsconfig.json` references
- ✅ Está em 8 packages que realmente precisam (tem em package.json):
  - agent-runtime
  - ai-debug
  - ai-engineer
  - ai-testing
  - distillation-engine
  - ideia-plugin
  - local-ai
  - rag-engine

**Erro típico:**
```
packages/config-engine/src/config-engine.ts(6,26): error TS6059: File 'F:/PROJETOS/ai-devkit-workspace/IDEIA/packages/event-bus/src/index.ts' is not under 'rootDir' 'F:/PROJETOS/ai-devkit-workspace/IDEIA/packages/llm-provider/src'.
```

O TypeScript está tentando compilar packages usando `llm-provider/src` como rootDir, o que indica que llm-provider está sendo referenciado incorretamente.

---

## Próximo Passo Exato (URGENTE)

### Opção A: Adicionar llm-provider ao root tsconfig.json
```bash
# Adicionar llm-provider ao root tsconfig.json
npx tsx scripts/audit/add-llm-to-root.ts
# Re-run build
npx tsc -b --pretty false 2>&1 | npx tsx scripts/audit/tsc-error-report.ts --fix
```

### Opção B: Investigar e remover referências circulares
Se Option A não funcionar, investigar quais packages estão criando referências circulares com llm-provider e removê-las.

---

## Scripts Úteis Criados

- `scripts/audit/tsc-error-report.ts` — Parser de erros tsc -b
- `scripts/audit/add-composite.ts` — Adiciona composite: true
- `scripts/audit/fix-rootdir.ts` — Corrige rootDir
- `scripts/audit/fix-include.ts` — Corrige include patterns
- `scripts/audit/remove-all-llm-refs-final.ts` — Remove todas refs llm-provider
- `scripts/audit/restore-llm-provider-needed.ts` — Restaura llm-provider apenas para packages que precisam
- `scripts/audit/add-llm-to-root.ts` — Adiciona llm-provider ao root tsconfig.json
- `scripts/audit/remove-llm-from-root.ts` — Remove llm-provider do root tsconfig.json

---

## Comando para Continuar

```bash
cd f:\PROJETOS\ai-devkit-workspace\IDEIA
npx tsc -b --pretty false 2>&1 | npx tsx scripts/audit/tsc-error-report.ts --fix
```

Depois analisar o report em `docs/governance/TSC-ERROR-FREQUENCY.md` e identificar a próxima correção de maior impacto.
