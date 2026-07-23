# Agent Safety Policy

## 1. Acoes Bloqueadas
Toda acao do agente passa por `agent-security.validateAction()` antes de executar.

### Bloqueios por acao
| Acao | Risco | Aprovacao? | Padroes bloqueados |
|------|-------|------------|-------------------|
| write_file | Alto | Sim | rm -rf, del /f, format |
| delete_file | Critico | Sim | .env, secret, key, password |
| execute_command | Alto | Sim | rm -rf, sudo, chmod 777, curl-bash |
| read_file | Baixo | Nao | — |
| list_directory | Baixo | Nao | — |
| search_code | Baixo | Nao | — |
| git_commit | Alto | Sim | --force, --amend |
| git_push | Critico | Sim | --force |
| install_package | Medio | Nao | — |
| generate_code | Medio | Nao | — |
| delete_branch | Critico | Sim | — |

## 2. Prompt Injection Detection
Padroes bloqueados na entrada do agente:
- "ignore all previous/prior instructions"
- "forget all/everything"
- "you are now/not"
- "override your/all"
- "system prompt"
- "new instructions"
- "disregard"
- "act as"
- DAN jailbreak patterns

## 3. Auditoria
Toda acao do agente e registrada em `.ai/optimizer/runtime/agents/ledger.jsonl`
com: sessionId, action, tool, input hash, output hash, status, durationMs.

## 4. Aprovacao
Acoes de risco alto ou critico exigem `--apply` para executar.
Sem `--apply`, o agente para em checkpoint e aguarda decisao.

## 5. Rollback
Toda mudanca aplicada pode ser revertida via comando de rollback.
O estado anterior e preservado em checkpoint antes da execucao.