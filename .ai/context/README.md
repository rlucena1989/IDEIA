# Contexto Indexado — IDEIA

> Conteúdo regenerado por `scripts/audit/regenerate-metrics.ts`.
> NÃO editar à mão — qualquer edição cria deriva detectada por `--ci`.

## Arquivos neste diretório

| Arquivo | Propósito | Gerado por script? |
|---------|-----------|--------------------|
| `inject.json` | Snapshot JSON para consumo por IAs (LLMs) | ✅ |
| `ai-handoff.md` | Handoff completo de contexto entre sessões IAs | ✅ |
| `ai-handoff-compact.md` | Handoff curto (~300 tokens) | ✅ |
| `project-state.md` | Estado do projeto + roadmap + métricas | ✅ |
| `project-summary.md` | Resumo curto do projeto | ✅ |
| `communication-protocol.md` | Protocolo humano ↔ IA | ✅ |
| `intent-schema.yaml` | Schema YAML para classificação de intenção | ❌ (estático) |
| `CLAUDE.md` | Briefing para Claude Code | ✅ |
| `README.md` | Este índice | ✅ |
| `_legacy/` | Arquivos legados arquivados (FA-03) | ❌ (não injetar) |

## Fonte única da verdade

`docs/governance/REALITY-MANIFEST.md` é a fonte mestra das métricas. Todos os
arquivos acima derivam dele.

## Regenerar

```bash
npx tsx scripts/audit/regenerate-metrics.ts --fix   # reescrever
npx tsx scripts/audit/regenerate-metrics.ts --ci    # verificar deriva
```
