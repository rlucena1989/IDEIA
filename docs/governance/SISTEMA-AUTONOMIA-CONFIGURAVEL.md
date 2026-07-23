# Sistema de Autonomia Configurável — AI-Devkit

**Objetivo:** Propor um modelo em que o usuário possa definir, por projeto e globalmente, o que é automático, o que precisa ser consultado, o que precisa de aprovação e o que é bloqueado.

**Data:** 2026-07-13
**Base:** Análise de 35+ arquivos de código existentes, 20+ arquivos de configuração `.ai/policies/`, `.ai/rules/`, `.ai/security/`, `.ai/permissions/`

---

## 0. Diagnóstico do que Já Existe

O ai-devkit já possui um **sistema de autonomia surpreendentemente completo em código**, mas com **zero usabilidade** porque:

| O que existe                                       | O que falta                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------------- |
| 3 níveis de autonomia (autonomous/guided/blocked)  | Persistência (tudo em RAM, perdido ao reiniciar)                          |
| 11 ações de agente com políticas de segurança      | Configuração pelo usuário (tudo hardcoded)                                |
| Motor de risco com 6 fatores ponderados            | Hierarquia global vs projeto                                              |
| Motor de permissões com políticas e regras         | Integração com arquivos `.ai/policies/*.yaml` (existem mas são ignorados) |
| Fluxo de aprovação (criar, aprovar, rejeitar)      | Interface de decisão (só CLI, sem UI)                                     |
| Central de decisões (formato A/B/C/D)              | Auditoria persistente                                                     |
| Conselho de governança (votação)                   | Testes de integração                                                      |
| Política adaptativa (ciclos, confiança, escalação) | Documentação para o usuário                                               |

---

## 1. Modelo de Política

### 1.1 Níveis de Autonomia

Quatro níveis, organizados do mais livre ao mais restrito:

```
AUTOMATIC   → Executa sem aviso, registra em auditoria
CONSULT     → Executa, mas notifica o usuário (pode cancelar após ver)
APPROVAL    → Pausa e pede aprovação explícita antes de executar
BLOCKED     → Recusa executar, explica o motivo
```

| Nível       | Comportamento                                                                  | Risco típico | Uso                                                                             |
| ----------- | ------------------------------------------------------------------------------ | ------------ | ------------------------------------------------------------------------------- |
| `automatic` | Executa imediatamente. Log em `audit.jsonl`.                                   | Baixo        | Ler arquivos, listar diretórios, search code                                    |
| `consult`   | Executa + notifica via SSE. Usuário pode cancelar em N segundos.               | Médio        | Instalar pacotes, gerar código, criar branches                                  |
| `approval`  | Pausa antes de executar. Mostra diff/preview. Usuário aprova/rejeita/modifica. | Alto         | Editar arquivos, git commit/push, executar comandos                             |
| `blocked`   | Recusa com explicação. Registra tentativa em auditoria.                        | Crítico      | Deletar arquivos, force push, alterar .env, chamar IAs externas não-autorizadas |

### 1.2 Categorias de Ação

Cada ação do sistema se enquadra em uma categoria com política padrão:

| Categoria       | Ações incluídas                                    | Padrão global                         |
| --------------- | -------------------------------------------------- | ------------------------------------- |
| **leitura**     | `read_file`, `list_directory`, `search_code`       | `automatic`                           |
| **geração**     | `generate_code`, `generate_docs`, `generate_tests` | `consult`                             |
| **escrita**     | `write_file`, `edit_file`, `delete_file`           | `approval`                            |
| **execução**    | `execute_command`, `run_script`                    | `approval`                            |
| **git_local**   | `git_commit`, `git_branch`, `git_merge`            | `approval`                            |
| **git_remoto**  | `git_push`, `git_pr`, `git_force_push`             | `approval` (push), `blocked` (force)  |
| **rede**        | `call_llm`, `call_api`, `install_package`          | `consult` (LLM), `approval` (install) |
| **arquitetura** | `decide_pattern`, `choose_framework`, `define_api` | `consult`                             |
| **prioridade**  | `set_priority`, `reorder_backlog`, `cancel_task`   | `consult`                             |
| **risco**       | `interrupt_task`, `rollback`, `delete_branch`      | `blocked`                             |
| **config**      | `edit_env`, `edit_config`, `change_remote`         | `blocked`                             |

### 1.3 Estrutura de Política

```typescript
// ─── Política de Autonomia ───
interface AutonomyPolicy {
  id: string;
  name: string;
  description: string;
  version: string;
  updatedAt: string;

  // Nível global padrão para ações sem regra específica
  defaultLevel: AutonomyLevel; // 'consult'

  // Regras específicas por ação/categoria
  rules: AutonomyRule[];

  // Exceções (sobrescrevem regras)
  exceptions: AutonomyException[];

  // Configurações gerais
  settings: AutonomySettings;
}

// ─── Nível de Autonomia ───
type AutonomyLevel = 'automatic' | 'consult' | 'approval' | 'blocked';

// ─── Regra ───
interface AutonomyRule {
  id: string;
  name: string;

  // Alvo da regra
  target: {
    actions?: string[]; // ações específicas
    categories?: ActionCategory[]; // ou categorias
    patterns?: string[]; // ou padrões glob (ex: "src/**/*.ts")
  };

  // Nível aplicado
  level: AutonomyLevel;

  // Condições para aplicar
  conditions?: RuleCondition[];

  // Metadados
  priority: number; // maior = aplica primeiro
  description: string;
  enabled: boolean;
}

// ─── Condição ───
interface RuleCondition {
  type: 'risk' | 'file' | 'branch' | 'time' | 'mode' | 'metric';
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'matches';
  value: unknown;
}

// Exemplos de condições:
// { type: 'risk', operator: 'gte', value: 80 }           → risco >= 80
// { type: 'file', operator: 'matches', value: '.env' }    → arquivo contém .env
// { type: 'branch', operator: 'eq', value: 'main' }       → branch é main
// { type: 'mode', operator: 'in', value: ['production'] } → modo produção
// { type: 'metric', operator: 'lt', value: 70 }           → cobertura < 70%

// ─── Exceção ───
interface AutonomyException {
  id: string;
  description: string;
  ruleId: string; // regra a excepcionar
  overrideLevel: AutonomyLevel;
  conditions: RuleCondition[];
  expiresAt?: string; // expiração opcional
  createdBy: string;
}

// ─── Configurações Gerais ───
interface AutonomySettings {
  consultTimeout: number; // segundos para cancelar (padrão: 30)
  approvalTimeout: number; // segundos para timeout (padrão: 300)
  autoRetryOnFailure: boolean; // (padrão: true)
  maxRetries: number; // (padrão: 2)
  autoExecuteRiskThreshold: number; // risco abaixo disso executa (padrão: 40)
  notifyOnAutomatic: boolean; // notifica mesmo ações automáticas? (padrão: false)
  requireReasonForBlocked: boolean; // exige justificativa ao tentar ação bloqueada? (padrão: true)
}
```

### 1.4 Política Padrão (built-in)

```yaml
# .ai/autonomy/policies/default.yaml
id: default-policy
name: 'Política Padrão AI-Devkit'
version: '1.0.0'
defaultLevel: consult

rules:
  # --- Leitura: sempre automático ---
  - id: rule-read-files
    target: { categories: ['leitura'] }
    level: automatic
    priority: 10

  # --- Geração: notifica mas executa ---
  - id: rule-generate-code
    target: { actions: ['generate_code'] }
    level: consult
    priority: 20

  # --- Escrita: approval por padrão ---
  - id: rule-write-files
    target: { actions: ['write_file', 'edit_file'] }
    level: approval
    priority: 30

  - id: rule-write-sensitive
    target: { actions: ['write_file', 'edit_file', 'delete_file'] }
    level: blocked
    conditions: [{ type: 'file', operator: 'matches', value: '(\\.env$|\\.env\\..+|secrets|credentials|\\*\\.pem|\\*\\.key)' }]
    priority: 100

  # --- Execução: approval ---
  - id: rule-execute-commands
    target: { actions: ['execute_command'] }
    level: approval
    priority: 30
    conditions: [{ type: 'risk', operator: 'gte', value: 60 }]

  - id: rule-execute-blocked
    target: { actions: ['execute_command'] }
    level: blocked
    conditions: [{ type: 'risk', operator: 'gte', value: 90 }]
    priority: 100

  - id: rule-execute-blocked-patterns
    target: { actions: ['execute_command'], patterns: ['rm -rf', 'sudo', 'chmod 777', 'curl *|*bash'] }
    level: blocked
    priority: 200

  # --- Git: approval em geral, blocked em force ---
  - id: rule-git-commit
    target: { actions: ['git_commit'] }
    level: approval
    priority: 30

  - id: rule-git-force-push
    target: { actions: ['git_push'], patterns: ['--force'] }
    level: blocked
    priority: 100

  # --- Chamar IAs: consult ---
  - id: rule-call-llm
    target: { actions: ['call_llm'] }
    level: consult
    priority: 20

  - id: rule-call-external-api
    target: { actions: ['call_api'] }
    level: approval
    priority: 50

  # --- Arquitetura: consult ---
  - id: rule-architecture-decisions
    target: { categories: ['arquitetura'] }
    level: consult
    priority: 30

  # --- Risco/Config: blocked ---
  - id: rule-interrupt-task
    target: { categories: ['risco'] }
    level: blocked
    priority: 50

  - id: rule-edit-config
    target: { categories: ['config'] }
    level: blocked
    priority: 50

settings:
  consultTimeout: 30
  approvalTimeout: 300
  autoRetryOnFailure: true
  maxRetries: 2
  autoExecuteRiskThreshold: 40
  notifyOnAutomatic: false
  requireReasonForBlocked: true
```

---

## 2. Estrutura de Configuração

### 2.1 Diretório de Configuração

```
.ai/
└── autonomy/
    ├── policies/
    │   ├── default.yaml              ← política padrão (built-in, pode ser sobrescrita)
    │   ├── project.yaml              ← política específica do projeto
    │   └── custom/                   ← políticas criadas pelo usuário
    │       ├── security-hardened.yaml
    │       └── fast-prototyping.yaml
    │
    ├── overrides/
    │   └── local.yaml                ← sobrescritas locais (NÃO versionar)
    │
    ├── exceptions/
    │   └── grants.yaml               ← exceções concedidas manualmente
    │
    ├── decisions/
    │   └── log.jsonl                 ← append-only log de todas as decisões
    │
    └── state.json                    ← estado atual do sistema de autonomia
```

### 2.2 Configuração Global (usuário)

```yaml
# %USERPROFILE%\.ai-devkit\autonomy.yaml  (GLOBAL)
# ou ~/.config/ai-devkit/autonomy.yaml    (Linux/Mac)

id: global-user-policy
name: 'Minha Política Global'
version: '1.0.0'
defaultLevel: approval

rules:
  # Sou conservador: tudo que escreve precisa aprovação
  - id: my-write-approval
    target: { categories: ['escrita', 'execução', 'git_local', 'git_remoto'] }
    level: approval
    priority: 50

  # Mas LLMs podem rodar automático
  - id: my-llm-auto
    target: { actions: ['call_llm'] }
    level: automatic
    priority: 60

  # Instalar pacotes: bloqueado (reviso manualmente)
  - id: my-install-blocked
    target: { actions: ['install_package'] }
    level: blocked
    priority: 60
```

### 2.3 Configuração por Projeto

```yaml
# .ai/autonomy/policies/project.yaml

extends: default # herda da política padrão

defaultLevel: consult # sou mais permissivo neste projeto

rules:
  - id: proj-write-auto
    target: { actions: ['write_file', 'edit_file'], patterns: ['src/**/*.ts'] }
    level: automatic # editar .ts pode ser automático
    priority: 100 # sobrescreve rule-write-files (priority 30)

  - id: proj-write-approval
    target: { actions: ['write_file'], patterns: ['.ai/**/*'] }
    level: approval # mexer em .ai/ sempre requer aprovação
    priority: 110

  - id: proj-push-consult
    target: { actions: ['git_push'] }
    level: consult # pode fazer push sem aprovação, mas avisa
    priority: 100 # sobrescreve padrão approval

settings:
  consultTimeout: 15 # só 15 segundos para cancelar
  notifyOnAutomatic: true # quero ver tudo que acontece
```

### 2.4 Sobrescrita Local (NÃO versionada)

```yaml
# .ai/autonomy/overrides/local.yaml  (no .gitignore)

# Uso local: quero mais liberdade
# Isto NÃO vai para o repositório compartilhado

defaultLevel: automatic

rules:
  - id: local-all-auto
    target: { actions: ['write_file', 'edit_file', 'execute_command'] }
    level: automatic
    priority: 999 # máxima prioridade

  # Mas ainda assim, nada de force push
  - id: local-no-force
    target: { patterns: ['--force'] }
    level: blocked
    priority: 1000
```

### 2.5 Exceções Concedidas (grants)

```yaml
# .ai/autonomy/exceptions/grants.yaml

exceptions:
  - id: grant-001
    description: 'Permitir instalação do pacote lodash para task TASK-123'
    ruleId: my-install-blocked
    overrideLevel: approval
    conditions:
      - { type: 'time', operator: 'lt', value: '2026-07-20' }
    createdBy: 'user@example.com'
    createdAt: '2026-07-13T10:00:00Z'

  - id: grant-002
    description: 'Force push na branch feature/temp para correção urgente'
    ruleId: rule-git-force-push
    overrideLevel: approval
    conditions:
      - { type: 'branch', operator: 'matches', value: 'feature/temp-*' }
      - { type: 'time', operator: 'lt', value: '2026-07-15' }
    createdBy: 'user@example.com'
    expiresAt: '2026-07-15T00:00:00Z'
```

---

## 3. Regras de Precedência

### 3.1 Hierarquia de Políticas

A resolução de uma política para uma ação segue esta ordem (maior precedência primeiro):

```
  1. EXCEÇÃO (grant) explícita          ← .ai/autonomy/exceptions/grants.yaml
  2. SOBRESCRITA LOCAL                  ← .ai/autonomy/overrides/local.yaml
  3. POLÍTICA DO PROJETO                ← .ai/autonomy/policies/project.yaml
  4. POLÍTICA GLOBAL DO USUÁRIO         ← ~/.config/ai-devkit/autonomy.yaml
  5. POLÍTICA PADRÃO (built-in)         ← .ai/autonomy/policies/default.yaml
```

### 3.2 Resolução de Regras Dentro de uma Política

1. Filtra regras onde `target.actions` ou `target.categories` corresponde à ação
2. Filtra regras onde `target.patterns` corresponde ao alvo (arquivo/comando)
3. Filtra regras onde todas as `conditions` são satisfeitas
4. Ordena por `priority` decrescente
5. Aplica a regra de maior prioridade

**Se nenhuma regra corresponder:** usa `defaultLevel` da política.

**Se nenhuma política definir:** o nível é `blocked` (default-deny).

### 3.3 Exemplo de Resolução

```
Ação: write_file em src/app.ts
Alvo: src/app.ts
Risco calculado: 35

1. Exceções? → Não há grant para write_file
2. Local? → override.yaml não define write_file
3. Projeto? → project.yaml:
   - rule proj-write-auto: actions=write_file, patterns=src/**/*.ts → automatic (priority 100) ✓
   → Nível: AUTOMATIC
4. Global? → Não consultado (projeto já resolveu)

────────────────────────────────────

Ação: git_push --force
Alvo: origin/main
Risco calculado: 95

1. Exceções? → grant-002: branch=feature/temp-* overrideLevel=approval (não aplica, branch=main)
2. Local? → local-no-force: patterns=--force → blocked (priority 1000) ✓
   → Nível: BLOCKED
```

### 3.4 Herança entre Políticas

```yaml
# project.yaml usa 'extends' para herdar da padrão

extends: default

# Regras do projeto:
# - Se uma regra tem priority > que a correspondente na padrão, sobrescreve
# - Se não priority definida, priority = 50 (meio) por padrão
# - Regras sem correspondente na padrão são adicionadas
```

---

## 4. Comportamento por Tipo de Ação

### 4.1 Leitura (`read_file`, `list_directory`, `search_code`)

| Nível       | Comportamento                                           |
| ----------- | ------------------------------------------------------- |
| `automatic` | Lê e retorna. Log em audit.                             |
| `consult`   | Lê e retorna. Notifica via SSE com caminho do arquivo.  |
| `approval`  | Mostra preview do path + tamanho. Pergunta se pode ler. |
| `blocked`   | Recusa. Só libera com grant.                            |

### 4.2 Escrita (`write_file`, `edit_file`, `delete_file`)

| Nível       | Comportamento                                                                       |
| ----------- | ----------------------------------------------------------------------------------- |
| `automatic` | Escreve. Log em audit com hash do conteúdo.                                         |
| `consult`   | Escreve. Notifica com diff do que mudou. Usuário pode reverter em Ns.               |
| `approval`  | Gera diff. Mostra no chat com botões Aprovar/Rejeitar/Modificar. Pausa até decisão. |
| `blocked`   | Recusa. Explica: "Arquivo protegido pela regra X."                                  |

**Fluxo de approval para escrita:**

```
1. Agente propõe mudança
2. Sistema gera diff (unificado)
3. UI mostra: "🤖 Quer modificar src/app.ts:" + diff
   [Aprovar] [Rejeitar] [Editar Proposta] [Pedir Explanação]
4a. Aprovado → executa mudança + registra decisão
4b. Rejeitado → descarta + registra decisão + agente ajusta proposta
4c. Editado → usuário edita o diff manualmente → executa versão editada
4d. Explanação → agente explica o racional da mudança
```

### 4.3 Execução (`execute_command`, `run_script`)

| Nível       | Comportamento                                            |
| ----------- | -------------------------------------------------------- |
| `automatic` | Executa. Log com stdout/stderr.                          |
| `consult`   | Executa. Mostra output em tempo real via SSE.            |
| `approval`  | Mostra comando + simulação (dry-run se possível). Pausa. |
| `blocked`   | Recusa se comando na whitelist ou padrão perigoso.       |

**Whitelist de comandos seguros (sempre automatic):**
`npm run build`, `npm run test`, `npm run lint`, `npm run typecheck`, `npx tsx`, `node`, `git status`, `git log`, `git diff`

**Blacklist de comandos (sempre blocked a menos que grant):**
`rm -rf /`, `sudo`, `chmod 777`, `curl *|*bash`, `git push --force`, `git reset --hard HEAD`

### 4.4 Git Local (`git_commit`, `git_branch`, `git_merge`)

| Nível       | Comportamento                                                      |
| ----------- | ------------------------------------------------------------------ |
| `automatic` | Commit com mensagem gerada. Branch criada. Merge automático.       |
| `consult`   | Executa. Notifica: "Commit feito: feat: adiciona login (abc1234)". |
| `approval`  | Mostra diff do commit. Pausa para aprovação.                       |
| `blocked`   | Recusa commit/bloqueia merge.                                      |

### 4.5 Git Remoto (`git_push`, `git_pr`, `git_force_push`)

| Nível       | Comportamento                                                 |
| ----------- | ------------------------------------------------------------- |
| `automatic` | Push automático após quality gate passar.                     |
| `consult`   | Push + notifica.                                              |
| `approval`  | Mostra resumo do que será enviado (commits, diffstat). Pausa. |
| `blocked`   | Recusa. Especialmente `--force` é sempre blocked sem grant.   |

### 4.6 Chamar IAs (`call_llm`, `call_api`)

| Nível       | Comportamento                                                          |
| ----------- | ---------------------------------------------------------------------- |
| `automatic` | Chama sem avisar. Auditoria de custo/tokens.                           |
| `consult`   | Chama. Notifica: "Consultando GPT-4 (estimado $0.03)".                 |
| `approval`  | Mostra estimativa de custo + modelo. "Posso consultar GPT-4? [$0.03]". |
| `blocked`   | Recusa se provedor não autorizado na política de rede.                 |

### 4.7 Decisões de Arquitetura (`decide_pattern`, `choose_framework`)

| Nível       | Comportamento                                                |
| ----------- | ------------------------------------------------------------ |
| `automatic` | Aplica padrão/baseado em contexto. Registra decisão.         |
| `consult`   | Sugere + notifica. "Sugiro usar Repository pattern. Ok?"     |
| `approval`  | Mostra opções (A/B/C/D) com prós/contras + ADR draft. Pausa. |
| `blocked`   | Recusa. "Decisão arquitetural requer modo planning."         |

**Formato de decisão (aproveitando `decision-center.ts` existente):**

```
┌──────────────────────────────────────────────┐
│  Decisão Arquitetural #42                    │
│  "Qual padrão para camada de dados?"         │
├──────────────────────────────────────────────┤
│  A) Repository Pattern (recomendado)         │
│     → Baixo acoplamento, testável, familiar  │
│  B) Active Record                            │
│     → Simples, menos código, menos flexível  │
│  C) CQRS + Event Sourcing                    │
│     → Escalável, complexo, overengineering   │
│  D) Escrever minha própria abordagem         │
├──────────────────────────────────────────────┤
│  [Selecionar A] [Selecionar B] [Selecionar C]│
│  [Personalizar...] [Pedir Explanação]        │
└──────────────────────────────────────────────┘
```

### 4.8 Prioridade (`set_priority`, `reorder_backlog`, `cancel_task`)

| Nível       | Comportamento                                             |
| ----------- | --------------------------------------------------------- |
| `automatic` | Reordena baseado em análise.                              |
| `consult`   | Reordena + notifica "Task X movida para prioridade alta". |
| `approval`  | Mostra impacto da mudança + dependências afetadas. Pausa. |
| `blocked`   | Recusa. "Reordenar backlog requer permissão de gerente."  |

### 4.9 Risco/Interrupção (`interrupt_task`, `rollback`, `delete_branch`)

| Nível       | Comportamento                                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `automatic` | NUNCA automático (risco muito alto).                                                                                                             |
| `consult`   | NUNCA consult (risco muito alto).                                                                                                                |
| `approval`  | Mostra impacto total: "Rollback vai desfazer 5 commits. Arquivos afetados: 12. Perda estimada: 2h de trabalho." Pausa com confirmação explícita. |
| `blocked`   | Padrão.                                                                                                                                          |

---

## 5. Comportamento por Projeto vs Global

### 5.1 Escopos de Política

| Escopo        | Onde fica                                     | Versionado?         | Quem define                     |
| ------------- | --------------------------------------------- | ------------------- | ------------------------------- |
| **Built-in**  | Embutido no código (default.yaml)             | —                   | AI-Devkit                       |
| **Global**    | `~/.config/ai-devkit/autonomy.yaml`           | Não                 | Usuário (preferências pessoais) |
| **Workspace** | `.ai-devkit/autonomy.yaml` (raiz do monorepo) | Sim                 | Time/Organização                |
| **Projeto**   | `.ai/autonomy/policies/project.yaml`          | Sim                 | Mantenedores do projeto         |
| **Local**     | `.ai/autonomy/overrides/local.yaml`           | Não (no .gitignore) | Usuário local                   |
| **Exceção**   | `.ai/autonomy/exceptions/grants.yaml`         | Sim (audit trail)   | Usuário (ato único)             |

### 5.2 Resolução por Escopo

```
AVALIAR AÇÃO
  │
  ├── 1. Ação corresponde a alguma EXCEÇÃO em grants.yaml?
  │      YES → usa overrideLevel + registra em audit trail
  │      NO  → continua
  │
  ├── 2. Ação corresponde a OVERRIDE LOCAL?
  │      YES → usa nível do local.yaml (não audita)
  │      NO  → continua
  │
  ├── 3. Escopo atual é PROJETO?
  │      YES → busca em project.yaml
  │             ├── achou regra? → usa nível
  │             └── não achou?   → verifica extends (herança)
  │      NO  → continua
  │
  ├── 4. Escopo atual é WORKSPACE?
  │      YES → busca em .ai-devkit/autonomy.yaml
  │      NO  → continua
  │
  ├── 5. Escopo atual é GLOBAL?
  │      YES → busca em ~/.config/ai-devkit/autonomy.yaml
  │      NO  → continua
  │
  └── 6. Usa política BUILT-IN (default.yaml)
         → Se ainda não achou: usa defaultLevel (consult)
         → Se defaultLevel não definido: BLOCKED (default-deny)
```

### 5.3 Política Global vs Projeto: Casos de Uso

| Situação                                 | Global                    | Projeto                   | Resultado  |
| ---------------------------------------- | ------------------------- | ------------------------- | ---------- |
| Dev experiente, projeto confiável        | `automatic`               | (herda)                   | Automático |
| Dev experiente, projeto crítico (bancos) | `automatic`               | `approval` para escrita   | Approval   |
| Dev iniciante, qualquer projeto          | `approval`                | (herda)                   | Approval   |
| Todos os projetos, sem exceção           | `blocked` para force push | (herda)                   | Blocked    |
| Projeto específico, dev confiável        | `approval`                | `automatic` (sobrescreve) | Automático |

### 5.4 Sincronização Global

```
COMANDO:
  ai-devkit autonomy sync

O QUE FAZ:
  1. Lê ~/.config/ai-devkit/autonomy.yaml (global)
  2. Lê .ai/autonomy/policies/project.yaml (projeto)
  3. Mescla: projeto herda regras não-definidas da global
  4. Gera .ai/autonomy/state.json com política resolvida
  5. Valida: nenhuma regra conflitante, nenhum ciclo
```

---

## 6. Interface de Decisão

### 6.1 Modelo de Decisão (aproveitando `decision-center.ts` existente)

```typescript
// ─── Decisão Pendente ───
interface PendingDecision {
  id: string;
  sessionId: string;
  timestamp: string;
  policyRule: string; // qual regra acionou
  action: {
    type: string; // write_file, execute_command, etc.
    target: string; // path, comando, URL
    details: string; // descrição em linguagem natural
    diff?: string; // diff unificado (para escrita)
    simulation?: string; // resultado simulado (para comandos)
    risk: number; // 0-100
    estimatedImpact: string; // "12 arquivos, 5 commits"
  };
  context: {
    taskId?: string;
    phase?: string;
    mode: string;
    branch: string;
  };
  options: DecisionOption[];
  expiresAt: string; // timeout
  status: 'pending' | 'approved' | 'rejected' | 'modified' | 'expired';
  rationale?: string; // por que o usuário escolheu X
}

interface DecisionOption {
  id: 'approve' | 'reject' | 'modify' | 'explain' | 'delegate';
  label: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
}
```

### 6.2 Interfaces de Decisão

#### CLI (já existe, expandir)

```
$ ai-devkit autonomy decision pending
┌─────────────────────────────────────────────────────────────┐
│  Decisão Pendente #dec-003                                  │
│  Ação: write_file → src/services/auth.service.ts            │
│  Risco: 72 (ALTO)                                           │
│  Regra: rule-write-files (project.yaml) → nível: approval   │
│  ─────────────────────────────────────                      │
│  Diff:                                                      │
│  + async login(email, password) {                           │
│  +   const user = await this.prisma.user.findUnique(...)    │
│  ─────────────────────────────────────                      │
│  [1] Aprovar     [2] Rejeitar     [3] Modificar             │
│  [4] Explicar    [5] Delegar p/ outro                       │
│  [6] Criar Exceção Permanente                               │
│  (timeout: 5:00)                                            │
└─────────────────────────────────────────────────────────────┘
```

#### Web UI (chat integrado)

```
┌────────────────────────────────────────────────────────┐
│ 🤖 Quero modificar src/services/auth.service.ts       │
│                                                        │
│ ┌────────────────────────────────────────────────┐     │
│ │ @@ -10,7 +10,12 @@                             │     │
│ │  export class AuthService {                     │     │
│ │ +  async login(email, password) {               │     │
│ │ +    const user = await this.prisma.user...     │     │
│ │ +    return this.jwt.sign({ id: user.id });     │     │
│ │ +  }                                            │     │
│ └────────────────────────────────────────────────┘     │
│                                                        │
│ ⚠️ Risco: 72 (ALTO) — Regra: rule-write-files         │
│                                                        │
│ [✅ Aprovar]  [❌ Rejeitar]  [✏️ Modificar]           │
│ [💬 Explicar]  [🔗 Delegar]  [⭐ Sempre Aprovar]     │
└────────────────────────────────────────────────────────┘
```

### 6.3 Notificações em Tempo Real (SSE)

Eventos enviados para a UI em tempo real:

```
event: autonomy.decision.pending
data: {"id":"dec-003","action":"write_file","target":"src/services/auth.service.ts",...}

event: autonomy.decision.approved
data: {"id":"dec-003","approvedBy":"user@example.com","timestamp":"..."}

event: autonomy.action.executed
data: {"action":"write_file","target":"src/services/auth.service.ts","status":"success","hash":"abc123"}

event: autonomy.action.blocked
data: {"action":"execute_command","target":"rm -rf /","rule":"rule-execute-blocked","reason":"Comando bloqueado: rm -rf com risco 95"}

event: autonomy.consult.notification
data: {"action":"call_llm","provider":"openai","model":"gpt-4","estimatedCost":"$0.03","status":"completed"}
```

### 6.4 Comandos CLI Propostos

```bash
# ─── Gerenciamento de Políticas ───
ai-devkit autonomy init                  # Cria .ai/autonomy/ com política padrão
ai-devkit autonomy status                # Mostra nível atual + regras ativas
ai-devkit autonomy policy list           # Lista políticas carregadas
ai-devkit autonomy policy show <id>      # Mostra política em detalhe
ai-devkit autonomy policy apply <file>   # Aplica política de um arquivo YAML
ai-devkit autonomy policy test <action>  # Simula: qual nível seria aplicado?

# ─── Decisões Pendentes ───
ai-devkit autonomy decision list         # Lista decisões pendentes
ai-devkit autonomy decision show <id>    # Mostra decisão com diff
ai-devkit autonomy decision approve <id> # Aprova
ai-devkit autonomy decision reject <id>  # Rejeita
ai-devkit autonomy decision modify <id>  # Modifica proposta antes de aprovar

# ─── Exceções ───
ai-devkit autonomy exception add <ruleId> --level approval --reason "..." --expires "..."
ai-devkit autonomy exception list
ai-devkit autonomy exception revoke <id>

# ─── Auditoria ───
ai-devkit autonomy audit                 # Mostra log de decisões
ai-devkit autonomy audit --since 7d      # Filtrado por período
ai-devkit autonomy audit --action write  # Filtrado por ação
ai-devkit autonomy audit --status blocked # Filtrado por resultado

# ─── Sincronização ───
ai-devkit autonomy sync                  # Sincroniza global ↔ projeto
ai-devkit autonomy validate              # Valida políticas (conflitos, ciclos)
```

---

## 7. Pontos de Auditoria

### 7.1 Log de Decisões (`decisions.jsonl`)

Cada decisão de autonomia (automática, consultada, aprovada, rejeitada, bloqueada) é registrada:

```jsonl
{"id":"dec-001","timestamp":"2026-07-13T10:00:00Z","action":"write_file","target":"src/app.ts","level":"automatic","rule":"proj-write-auto","risk":35,"duration":120,"status":"executed"}
{"id":"dec-002","timestamp":"2026-07-13T10:05:00Z","action":"install_package","target":"lodash","level":"blocked","rule":"rule-install-blocked","risk":85,"reason":"Pacote não autorizado na política de segurança","status":"denied","requestedBy":"system"}
{"id":"dec-003","timestamp":"2026-07-13T10:10:00Z","action":"write_file","target":"src/services/auth.ts","level":"approval","risk":72,"rule":"rule-write-files","decision":"approved","approvedBy":"user@example.com","rationale":"Mudança necessária para task TASK-123","duration":45000,"diffHash":"sha256:abc123","status":"executed"}
{"id":"dec-004","timestamp":"2026-07-13T10:15:00Z","action":"execute_command","target":"npm run build","level":"automatic","rule":"whitelist-safe","risk":10,"duration":3000,"exitCode":0,"status":"executed"}
```

### 7.2 Métricas de Auditoria

```typescript
interface AutonomyReport {
  period: { start: string; end: string };

  summary: {
    totalDecisions: number;
    automatic: number; // ações automáticas
    consulted: number; // ações consultadas
    approved: number; // ações aprovadas
    rejected: number; // ações rejeitadas
    blocked: number; // ações bloqueadas
    modified: number; // ações modificadas pelo usuário
  };

  byAction: Record<string, { total: number; approved: number; rejected: number; blocked: number }>;
  byRisk: Record<string, number>; // distribuição de risco
  byPolicy: Record<string, number>; // decisões por regra

  userImpact: {
    timeSpentOnDecisions: number; // ms gastos em aprovações
    decisionsPerSession: number;
    averageDecisionTime: number; // ms por decisão
    rejectionRate: number; // % rejeitadas
  };

  riskMetrics: {
    averageRiskScore: number;
    highRiskActions: number;
    criticalRiskActions: number;
    falsePositives: number; // ações bloqueadas que depois foram aprovadas
  };

  incidents: AutonomyIncident[];
}

interface AutonomyIncident {
  decisionId: string;
  type: 'unexpected_block' | 'unexpected_execution' | 'policy_violation' | 'timeout';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  action: string;
  rule: string;
  timestamp: string;
  resolvedAt?: string;
}
```

### 7.3 Pontos de Verificação

| #   | O que auditar                 | Por que                | Como                                 |
| --- | ----------------------------- | ---------------------- | ------------------------------------ |
| 1   | Toda decisão de autonomia     | Rastreabilidade        | Log em `decisions.jsonl`             |
| 2   | Toda ação executada           | Prova de execução      | Log em `audit.jsonl` + Mirror Ledger |
| 3   | Toda ação bloqueada           | Segurança              | Log + notificação SSE                |
| 4   | Toda exceção concedida        | Evitar abuso           | Log com expiração                    |
| 5   | Toda mudança de política      | Controle de versão     | Políticas em YAML versionado         |
| 6   | Timeout de decisão            | Experiência do usuário | Log se expirou                       |
| 7   | Modificação de proposta       | Transparência          | Diff do antes/depois da modificação  |
| 8   | Cadeia de decisões em cascata | Complexidade           | Relação parentId entre decisões      |

### 7.4 Comando de Auditoria

```bash
$ ai-devkit autonomy audit --since 7d --format table

Decisões dos últimos 7 dias:
┌────────┬──────────┬──────────────────────────────┬───────┬──────────┬──────────┐
│ Data   │ Ação     │ Alvo                         │ Nível │ Decisão  │ Risco   │
├────────┼──────────┼──────────────────────────────┼───────┼──────────┼──────────┤
│ 07/13  │ write    │ src/app.ts                   │ auto  │ executou │ 35      │
│ 07/13  │ install  │ lodash                       │ block│ negado   │ 85      │
│ 07/13  │ write    │ src/services/auth.ts         │ apprv│ aprovado │ 72      │
│ 07/12  │ execute  │ npm run build                │ auto  │ executou │ 10      │
│ 07/12  │ git_push │ feature/login                │ apprv│ rejeitado│ 65      │
│ 07/11  │ llm      │ GPT-4: revisar código        │ consult│ notif.  │ 20      │
└────────┴──────────┴──────────────────────────────┴───────┴──────────┴──────────┘

Resumo: 142 decisões, 68% automáticas, 15% approval, 12% consult, 5% blocked
Tempo médio em aprovações: 12s
Taxa de rejeição: 8%
```

---

## 8. Mapa de Implementação

### 8.1 O que Reusar do Código Existente

| Componente existente                        | Arquivo                                | Como reusar                                                                                      |
| ------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `AutonomyLevel` (autonomous/guided/blocked) | `orchestration-types.ts:13`            | Mapear para novo modelo (automatic≈autonomous, consult≈guided, approval≈guided, blocked=blocked) |
| `RiskLevel` (low/medium/high/critical)      | `orchestration-types.ts:19`            | Reusar diretamente                                                                               |
| `AgentActionPolicy` (11 ações)              | `agent-security.ts`                    | Expandir e externalizar para YAML                                                                |
| `PermissionEngine`                          | `governance/permission-engine.ts`      | Adaptar como resolvedor de política                                                              |
| `PolicyRegistry`                            | `governance/policy-registry.ts`        | Substituir por loader de YAML + cache                                                            |
| `ApprovalFlow`                              | `governance/approval-flow.ts`          | Adicionar persistência + UI                                                                      |
| `DecisionCenter` (formato A/B/C/D)          | `runtime/decision-center.ts`           | Reusar para decisões arquiteturais                                                               |
| `AutonomyConfig`                            | `autonomy-policy.ts`                   | Expandir para `AutonomySettings`                                                                 |
| `AutonomyController`                        | `consolidation/autonomy-controller.ts` | Reusar como state manager                                                                        |
| `GovernanceCouncil`                         | `ecosystem/governance-council.ts`      | Reusar para votação                                                                              |
| Risk scoring (6 fatores)                    | `autonomy-policy.ts`                   | Reusar no calculation engine                                                                     |
| `PolicyAdapter` (memory)                    | `memory/policy-adapter.ts`             | Integrar com persistência                                                                        |
| `AgentRuntime`                              | `runtime/agent-runtime.ts`             | Reusar para session + checkpoint                                                                 |

### 8.2 O que Criar

| Componente              | Prioridade | Descrição                                                  |
| ----------------------- | ---------- | ---------------------------------------------------------- |
| `AutonomyPolicy` types  | 🔴 Alta    | Interfaces, YAML schema, validadores                       |
| `PolicyLoader` (YAML)   | 🔴 Alta    | Lê `.yaml` de múltiplos escopos, merge, resolve herança    |
| `PolicyResolver`        | 🔴 Alta    | Dada uma ação + contexto, retorna nível de autonomia       |
| `DecisionManager`       | 🔴 Alta    | Gerencia decisões pendentes, timeout, persistência         |
| `DecisionUI` (chat)     | 🔴 Alta    | Componentes de decisão na Web UI                           |
| `AuditLogger`           | 🟠 Média   | Append-only log de decisões + ações                        |
| `Autonomy CLI commands` | 🟠 Média   | `init`, `policy`, `decision`, `exception`, `audit`, `sync` |
| `AutonomySSE`           | 🟠 Média   | Eventos em tempo real de decisões                          |
| `GrantManager`          | 🟡 Baixa   | Gerencia exceções temporárias                              |
| `AutonomyReport`        | 🟡 Baixa   | Métricas e relatórios                                      |

### 8.3 Estrutura de Diretórios Proposta

```
packages/cli/src/
├── autonomy/
│   ├── types.ts                        ← AutonomyPolicy, AutonomyLevel, etc.
│   ├── policy-loader.ts                ← Carrega + merge de YAMLs
│   ├── policy-resolver.ts              ← Resolve ação → nível
│   ├── decision-manager.ts             ← Gerencia decisões pendentes
│   ├── audit-logger.ts                 ← Log JSONL de auditoria
│   ├── autonomy-state.ts               ← Estado atual do sistema
│   ├── grant-manager.ts                ← Exceções temporárias
│   ├── autonomy-report.ts             ← Métricas e relatórios
│   ├── sse-events.ts                   ← Eventos SSE de autonomia
│   └── __tests__/                      ← Testes
│
├── commands/
│   └── autonomy.ts                     ← REFATORAR: adicionar policy, decision, exception, audit, sync
│
└── runtime/
    ├── autonomy-policy.ts              ← MANTER (adaptar para usar PolicyLoader)
    └── agent-security.ts               ← MANTER (expandir ações)
```

### 8.4 Cronograma Sugerido

| Fase      | Entrega                                                 | Esforço     |
| --------- | ------------------------------------------------------- | ----------- |
| **1**     | Types + PolicyLoader + PolicyResolver                   | 3 dias      |
| **2**     | DecisionManager + AuditLogger + persistência            | 3 dias      |
| **3**     | CLI commands (policy, decision, exception, audit, sync) | 3 dias      |
| **4**     | Decisão na Web UI (chat components)                     | 4 dias      |
| **5**     | SSE events + notificações em tempo real                 | 2 dias      |
| **6**     | AutonomyReport + métricas                               | 2 dias      |
| **7**     | Testes de integração (fluxo completo)                   | 3 dias      |
| **Total** |                                                         | **20 dias** |

---

## 9. Exemplos de Políticas por Perfil

### 9.1 Perfil: Desenvolvedor Solo (projeto pessoal)

```yaml
# .ai/autonomy/policies/project.yaml
extends: default
defaultLevel: automatic

rules:
  - id: solo-approval
    target: { actions: ['git_push'], patterns: ['--force'] }
    level: approval
    priority: 100
```

### 9.2 Perfil: Time Ágil (projeto corporativo)

```yaml
# .ai/autonomy/policies/project.yaml
extends: default
defaultLevel: approval

rules:
  - id: team-write-auto
    target: { actions: ['write_file'], patterns: ['src/**/*.test.ts', 'src/**/*.spec.ts'] }
    level: automatic # testes podem ser automáticos
    priority: 100

  - id: team-git-push
    target: { actions: ['git_push'] }
    level: approval # push sempre requer aprovação
    priority: 80

  - id: team-llm-consult
    target: { actions: ['call_llm'] }
    level: consult # avisa quanto custa
    priority: 50

settings:
  approvalTimeout: 600 # 10 minutos
```

### 9.3 Perfil: Seguro (produção crítica)

```yaml
# .ai/autonomy/policies/project.yaml
extends: default
defaultLevel: blocked

rules:
  - id: safe-read-auto
    target: { categories: ['leitura'] }
    level: automatic
    priority: 10

  - id: safe-generate-consult
    target: { categories: ['geração'] }
    level: consult
    priority: 20

  - id: safe-write-approval
    target: { categories: ['escrita', 'execução', 'git_local', 'git_remoto'] }
    level: approval
    priority: 30

  - id: safe-no-external-llm
    target: { actions: ['call_llm'] }
    level: blocked
    priority: 100

settings:
  notifyOnAutomatic: true # quero ver TUDO
```

---

## 10. Resumo: Fluxo de Decisão Completo

```
AÇÃO SOLICITADA (ex: write_file → src/config/database.ts)
  │
  ├── 1. ANÁLISE DE RISCO
  │      ├── riskLevel (high)
  │      ├── blockedPatterns: nenhum
  │      ├── filePattern: *.ts (normal)
  │      └── riskScore: 72 (ALTO)
  │
  ├── 2. RESOLUÇÃO DE POLÍTICA
  │      ├── 2a. Exceção em grants.yaml? → não
  │      ├── 2b. Override local.yaml? → não
  │      ├── 2c. Regra em project.yaml?
  │      │     └── proj-write-safe: actions=write_file, risk>=60 → approval (p=80) ✓
  │      └── Nível: APPROVAL
  │
  ├── 3. VERDITO
  │      └── approval → gerar diff + pausar para decisão
  │
  ├── 4. DECISÃO
  │      ├── 4a. Usuário aprova → executa + loga + auditoria
  │      ├── 4b. Usuário rejeita → descarta + loga + feedback ao agente
  │      ├── 4c. Usuário modifica → diff editado → executa versão modificada
  │      ├── 4d. Timeout → bloqueia + notifica
  │      └── 4e. "Sempre Aprovar" → cria exceção permanente
  │
  └── 5. REGISTRO
         ├── decisions.jsonl ← { id, action, level, risk, decision, rationale, duration }
         ├── mirror/ledger.jsonl ← { prompt, response, tokens, cost }
         └── audit trail (se ação executada)
```

---

## Anexo A: Arquivos Existentes vs. Propostos

| Arquivo existente                                  | Status              | Proposta                                          |
| -------------------------------------------------- | ------------------- | ------------------------------------------------- |
| `runtime/autonomy-policy.ts` (263 linhas)          | ✅ Completo         | Refatorar para usar `PolicyResolver`              |
| `runtime/agent-security.ts` (64 linhas)            | ✅ Completo         | Expandir ações + externalizar para YAML           |
| `runtime/decision-center.ts` (206 linhas)          | ✅ Completo         | Reusar + persistir decisões                       |
| `runtime/orchestration-types.ts` (153 linhas)      | ✅ Completo         | Adicionar novos tipos                             |
| `governance/approval-flow.ts` (39 linhas)          | ⚠️ Sem persistência | Adicionar disco                                   |
| `governance/permission-engine.ts` (47 linhas)      | ✅ Completo         | Adaptar para novo modelo                          |
| `governance/policy-types.ts` (17 linhas)           | ✅ Completo         | Expandir                                          |
| `governance/policy-registry.ts` (33 linhas)        | ⚠️ Em memória       | Substituir por YAML loader                        |
| `governance/governance-policy.ts` (32 linhas)      | ⚠️ Hardcoded        | Externalizar para default.yaml                    |
| `commands/autonomy.ts` (94 linhas)                 | ⚠️ Básico           | Expandir com policy/decision/exception/audit/sync |
| `commands/approve.ts` (98 linhas)                  | ⚠️ Em memória       | Adicionar persistência + UI                       |
| `commands/policy.ts` (73 linhas)                   | ⚠️ Básico           | Expandir                                          |
| `.ai/agents/registry.yaml` (73 linhas)             | ⚠️ Não integrado    | Integrar com PolicyResolver                       |
| `.ai/laws.yaml` (15 linhas)                        | ⚠️ Não integrado    | Integrar como regras                              |
| `.ai/policies/*.yaml` (6 arquivos)                 | ⚠️ Ignorados        | Integrar como fontes de política                  |
| `.ai/rules/*.yaml` (7 arquivos)                    | ⚠️ Ignorados        | Integrar como regras                              |
| `memory/policy-adapter.ts` (17 linhas)             | ⚠️ Esboço           | Expandir com persistência                         |
| `consolidation/autonomy-controller.ts` (23 linhas) | ✅ Completo         | Reusar                                            |
| `adaptive/adaptive-policy.ts` (13 linhas)          | ✅ Completo         | Reusar                                            |
| `evolution/evolution-policy.ts` (15 linhas)        | ✅ Completo         | Reusar                                            |
| `.ai/permissions/matrix.md`                        | ⚠️ Ignorado         | Integrar                                          |

---

## Veridito Final

O ai-devkit já possui **85% da lógica de autonomia implementada em TypeScript**, mas:

1. **Tudo em RAM** — zero persistência
2. **Tudo hardcoded** — zero configurável pelo usuário
3. **Arquivos YAML/MD ignorados** — `.ai/policies/`, `.ai/rules/`, `.ai/agents/registry.yaml` existem mas não são lidos
4. **Sem interface de decisão** — aprovação só via CLI, sem Web UI

**O maior ganho não é codificar lógica nova — é conectar o que já existe.** Implementar o `PolicyLoader` (lê YAML) + `PolicyResolver` (aplica lógica de autonomia) + `DecisionManager` (persiste + UI) resolve 90% do problema. O código de autonomia, risco, aprovação e auditoria já está escrito.

**Estimativa:** 20 dias para um sistema completo, sendo 10 dias apenas para conectar peças existentes + UI + persistência.
