# MÃ©tricas por VersÃ£o â€” v2.1 e v2.2

## v2.1 â€” MÃ©tricas-alvo

| MÃ©trica | Atual | Alvo v2.1 | CritÃ©rio |
|---------|-------|-----------|----------|
| CLI commands with standardized result | ~20% | 100% | CliCommandResult em todos os comandos pÃºblicos |
| Governance docs coverage | 8/8 | 8/8 | Manter 100% â€” todos os documentos existentes |
| Document audit pass rate | 80% | 100% | Zero conflitos crÃ­ticos |
| Coverage (overall) | 45% | 65% | MÃ³dulos centrais >= 80% |
| Test count (CLI) | 140+ | 200+ | 60 novos testes de contrato e integraÃ§Ã£o |
| Extension views functional | 7/7 | 7/7 | 100% operacional |
| IO isolation | NÃ£o | Sim | Infra/IO abstraÃ­do para testes |
| Plan creation â†’ validation cycle | Manual | AutomÃ¡tico | plan create â†’ validate em menos de 2s |
| Status refresh rate (extension) | 60s | 30s | Cockpit reativo |

## v2.2 â€” MÃ©tricas-alvo

| MÃ©trica | Atual | Alvo v2.2 | CritÃ©rio |
|---------|-------|-----------|----------|
| Gap prioritization accuracy | 70% | 90% | Gaps classificados corretamente |
| Repair success rate | 50% | 75% | Gaps reparados validam apÃ³s ciclo |
| Test quality classification | 0% | 80% | Testes classificados como Ãºtil/cosmÃ©tico |
| Autonomy cycle persistence | Parcial | Completa | Status salvo e recuperado entre sessÃµes |
| Manual intervention rate | Alta | Reduzida em 50% | Menos comandos manuais por ciclo |
| Pattern detection coverage | 0% | 60% | PadrÃµes do cÃ³digo detectados |
| MCP uptime | N/A | 99% | Servidor rodando continuamente |

## Comparativo v2.1 â†’ v2.2

```
Indicador                    v2.1        v2.2
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Cobertura de testes         65%          80%
Gaps resolvidos/ciclo       Manual       AutomÃ¡tico (3+)
ClassificaÃ§Ã£o de gaps       Manual       AutomÃ¡tica
PersistÃªncia de estado      Parcial      Completa
IntervenÃ§Ã£o humana          MÃ©dia        Baixa
Tempo de ciclo (diagnÃ³stico) 30s        10s
ExtensÃ£o VS Code            EstÃ¡tico     Reativo
Scorecard                   VisÃ­vel      AcionÃ¡vel
```
