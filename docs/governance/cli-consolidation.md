# CLI Consolidation — Arquitetura da Camada de Comando

## Princípios

1. **CLI não decide regra de negócio** — recebe args, chama funções, formata saída
2. **IO isolado** — leitura/escrita injetável, lógica testável sem terminal
3. **Comando previsível** — saída padronizada `CliCommandResult`, erros claros, código determinístico
4. **Saída auditável** — parâmetros, resultado, erro, status registrados

## Arquitetura

```
┌─────────────────────────────────────────────────┐
│                 CLI (commander)                  │
│  commands/docs.ts, commands/coverage.ts, ...     │
│  — parse args, call domain, format output        │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│              Domain Services                     │
│  domain/doc-service.ts, domain/coverage-service.ts│
│  — regras de negócio, validações, cálculos       │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│              Infraestrutura                      │
│  infra/command-runner.ts, governance/*,          │
│  coverage/*, planner/*, io/*, utils/*            │
│  — leitura/escrita, execução shell, filesystem   │
└─────────────────────────────────────────────────┘
```

## Camadas

| Camada  | Diretório                                        | Responsabilidade                                       |
| ------- | ------------------------------------------------ | ------------------------------------------------------ |
| Tipos   | `types/`                                         | `CliCommandResult`, `CommandContext`, `CommandHandler` |
| CLI     | `commands/`                                      | Parsing de args, formatação de saída                   |
| Domínio | `domain/`                                        | Regras de negócio extraídas                            |
| Infra   | `infra/`, `governance/`, `coverage/`, `planner/` | IO, FS, execução                                       |

## Tipos Padronizados

```ts
interface CliCommandResult<T = unknown> {
  ok: boolean; // true = sucesso, false = erro
  code: number; // 0 = sucesso, >0 = erro
  message: string; // mensagem legível
  data?: T; // dados de retorno (sucesso)
  error?: { name?: string; message: string; details?: unknown };
}

interface CommandContext {
  args: string[];
  cwd: string;
  env: Record<string, string | undefined>;
  dryRun?: boolean;
}
```

## Helpers

| Função                          | Retorno                                |
| ------------------------------- | -------------------------------------- |
| `success(msg, data?)`           | `{ ok: true, code: 0, message, data }` |
| `failure(msg, code?, details?)` | `{ ok: false, code, message, error }`  |
| `createCommandRunner(handler)`  | Wrapper que captura exceções           |
| `buildContext(args, dryRun?)`   | `CommandContext` a partir de args      |

## Estrutura de Pastas

```
packages/cli/src/
├── types/
│   └── cli-result.ts         ← CliCommandResult, CommandContext, CommandHandler
├── infra/
│   └── command-runner.ts     ← createCommandRunner, buildContext
├── domain/
│   ├── doc-service.ts        ← Lógica de governança documental
│   └── coverage-service.ts   ← Lógica de autonomia de testes
├── commands/
│   ├── docs.ts               ← CLI fina (chama domain/doc-service)
│   └── coverage.ts           ← CLI fina (chama domain/coverage-service)
├── governance/               ← Módulos de governança
├── coverage/                 ← Módulos de cobertura
├── planner/                  ← Módulos de planejamento
└── __tests__/
```

## Checklist de Qualidade

- [x] Comandos curtos (docs.ts: ~120 linhas, coverage.ts: ~130 linhas)
- [x] Handlers puros quando possível
- [x] IO injetável (domain services não usam console.log diretamente)
- [x] Resultado sempre padronizado (`CliCommandResult`)
- [x] Falha sempre compreensível (mensagem + código + detalhes)
- [x] Código de retorno consistente (0 = sucesso, 1+ = erro)
