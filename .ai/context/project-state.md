# Estado do Projeto — IDEIA

> **ATENÇÃO:** este arquivo é saída determinística de `scripts/audit/regenerate-metrics.ts`.
> NÃO editar à mão — qualquer alteração manual será sobrescrita no próximo `--fix`.
> Regerado em 2026-07-29 §ts§

## Fase atual
development (parcial — ver bloqueadores em `docs/governance/GAPS-PRODUCAO-IDE.md`)

## Fases (roadmap)
- [x] discovery
- [x] architecture
- [~] development (em andamento)
- [ ] testing (próximo)
- [ ] production

## Métricas reais (recálculo determinístico em CI)

| Métrica | Valor |
|---------|-------|
| Packages com `src/` | 292 |
| Arquivos de teste | 1565 |
| LOC (`src/`) | ~440083 |
| TODO/FIXME/HACK | 49/14/10 |
| `console.log` em `src/` | 184 |
| ADRs únicos (duplicados) | 29 (5) |
| Comandos CLI | 345 |
| Arquivos >500 linhas | 33 |

## Bloqueadores ativos (ver GAPS-PRODUCAO-IDE.md)

Os bloqueadores abaixo **NÃO** são cobaias de um "prove" legado (esse comando
não existe neste repo). São as faixas FA (do dossiê de produção):

- [ ] **FA-05** — `tsc -b` zerando 3.424 erros em 184 packages (gate de build real)
- [ ] **FA-04** — regeneração determinística de métricas (este script)
- [ ] **FA-03** — contexto de IA limpo (este arquivo faz parte da entrega)
- [ ] GS141-GS147 — 7 gaps abertos em `GAPS-PRODUCAO-IDE.md`

## Última verificação real executada

```bash
npx tsx scripts/audit/regenerate-metrics.ts --ci
```

Output: (preenchido pelo CI — `--ci` retorna exit 0 em dia verde ou exit 1 em deriva)
```text
(matenha esta seção como saída literal do --ci)
```
