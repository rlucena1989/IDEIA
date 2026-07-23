# ESTUDO S30 — Onboarding, Tutorials & Progressive Disclosure System

> **Data:** 2026-07-22
> **Versao:** 1.0
> **Contexto:** IDEIA — sistema de desenvolvimento assistido por IA com 6 agentes especializados
> **Objetivo:** Projetar sistema completo de onboarding interativo, tutoriais progressivos, gamificacao e help contextual para reduzir a curva de aprendizado da IDEIA e maximizar time-to-first-value para usuarios novos.
> **Conexoes:** E4 (UX), S19 (Prompts), S25 (Perfis), S27 (Capability Registry), S28 (Zero-to-Deploy)

---

## Sumario

1. [Introducao](#1-introducao)
2. [Arquitetura do Tutorial System](#2-arquitetura-do-tutorial-system)
3. [Formato de Tutorial](#3-formato-de-tutorial)
4. [Tipos de Tutoriais](#4-tipos-de-tutoriais)
5. [Biblioteca de Tutoriais](#5-biblioteca-de-tutoriais)
6. [Progressive Disclosure System](#6-progressive-disclosure-system)
7. [Gamificacao](#7-gamificacao)
8. [Onboarding Flow](#8-onboarding-flow)
9. [Help Contextual](#9-help-contextual)
10. [Feedback Loop](#10-feedback-loop)
11. [Codigo Typescript](#11-codigo-typescript)
12. [Conexoes com Outros Estudos](#12-conexoes-com-outros-estudos)
13. [Plano de Implementacao](#13-plano-de-implementacao)

---

## 1. Introducao

### 1.1 O Problema de Adocao

Ferramentas de desenvolvimento assistido por IA enfrentam um paradoxo fundamental: quanto mais poderosas e flexiveis, maior a barreira de entrada para novos usuarios. A IDEIA, com seus 6 agentes especializados, 51 comandos CLI, 13 adapters, pipeline de auditoria e arquitetura multi-camada, apresenta um dos maiores espectros de capacidade no mercado de ferramentas de codigo assistido.

```
Complexidade Percebida vs Capacidade Real
Capacidade ^
           |                                        * IDEIA
           |                                   *
           |                             *
           |                       *
           |                 *  Cursor
           |           *
           |     * Copilot
           |  *
           +-----------------------------------------> Complexidade Percebida
```

Dados de ferramentas similares indicam:
- **60-70%** dos usuarios novos abandonam antes do primeiro comando bem-sucedido
- **Time-to-first-task** medio de 45-90 minutos sem onboarding estruturado
- **NPS reduzido em 30 pontos** quando o usuario precisa descobrir funcionalidades sozinho
- **apenas 12%** dos usuarios exploram funcionalidades alem do basico sem help contextual

### 1.2 Estado Atual da IDEIA

| Aspecto | Situacao Atual | Gap |
|---------|---------------|-----|
| Onboarding | README.md basico + AGENTS.md | Zero fluxo interativo |
| Tutoriais | Nenhum tutorial estruturado | Biblioteca vazia |
| Help contextual | Apenas --help CLI | Sem dicas contextuais |
| Gamificacao | Nao existe | Zero engajamento |
| Progressive disclosure | Nao existe | Todas as features expostas ao mesmo tempo |
| Context packs | 1 pack basico | Sem tutoriais por nivel |

### 1.3 Objetivos do Estudo

1. Reduzir time-to-first-task de 45min+ para <5min
2. Aumentar completion rate de tutoriais para >80%
3. Elevar NPS de onboarding para >50
4. Garantir que 100% dos usuarios completem pelo menos 3 tutoriais na primeira semana
5. Sistema progressivo que desbloqueia features conforme proficiencia

---

## 2. Arquitetura do Tutorial System

### 2.1 Visao Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TUTORIAL SYSTEM ARCHITECTURE                          │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                           TUTORIAL ENGINE                              │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │   │
│  │  │ Registry │──│ Resolver │──│ Executor │──│ Validator│──│Tracker │ │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └────────┘ │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                  │                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │   │
│  │  │YAML Parser│  │Context   │  │ Step     │  │Analytics │  │Achieve │ │   │
│  │  │          │  │Injector  │  │ Renderer │  │Collector │  │Manager │ │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └────────┘ │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                  │                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │   │
│  │  │Tutorial  │  │Progressive│  │Badge     │  │Onboarding│             │   │
│  │  │Library   │  │Disclosure │  │System    │  │Flow      │             │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                  │                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  STORAGE LAYER                                                        │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │   │
│  │  │Mem0      │  │SQLite    │  │DuckDB    │  │FileSystem│             │   │
│  │  │(sessions) │  │(progress)│  │(analytics)│  │(tutorials)│            │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Componentes do Tutorial Engine

#### 2.2.1 Registry

Responsavel por gerenciar o catalogo de tutoriais disponiveis.

```
TutorialRegistry
├── store: Map<TutorialId, TutorialDefinition>
├── categories: Map<Category, TutorialId[]>
├── dependencies: Map<TutorialId, TutorialId[]>
├── register(def: TutorialDefinition): void
├── resolve(id: TutorialId): TutorialDefinition
├── getByLevel(level: UserLevel): TutorialDefinition[]
├── getPrerequisites(id: TutorialId): TutorialDefinition[]
├── search(query: string): TutorialDefinition[]
```

#### 2.2.2 Resolver

Determina qual tutorial executar com base no estado do usuario, progresso e habilidades.

```
TutorialResolver
├── resolveNext(user: UserProfile): TutorialDefinition | null
├── resolveRecommended(user: UserProfile): TutorialDefinition[]
├── resolveRemediation(user: UserProfile, failedStep: StepId): TutorialDefinition
├── prerequisites check
├── level gates
├── capability matching
```

#### 2.2.3 Executor (Step Runner)

Executa cada passo do tutorial, gerenciando estado e contexto.

```
StepExecutor
├── execute(step: TutorialStep, ctx: ExecutionContext): Promise<StepResult>
├── executeAll(tutorial: TutorialDefinition): Promise<TutorialResult>
├── skip(stepId: StepId): void
├── retry(stepId: StepId): Promise<StepResult>
├── interrupt(): void
├── resume(): Promise<TutorialResult>
├── evaluation pipeline
├── timeout management
├── error recovery
```

#### 2.2.4 Validator

Valida se o passo foi executado corretamente com base em criterios definidos.

```
StepValidator
├── validate(result: StepResult, criteria: ValidationCriteria): ValidationResult
├── validateAll(results: StepResult[], tutorial: TutorialDefinition): TutorialValidation
├── checkOutput(output: string, expected: ValidationCriteria): boolean
├── checkFileExists(path: string): boolean
├── checkCommand(cmd: string, expectedExitCode: number): boolean
├── checkApiResponse(endpoint: string, expected: object): boolean
├── generateHint(failure: ValidationFailure): string
```

#### 2.2.5 Progress Tracker

Persiste e consulta o progresso do usuario em tutoriais.

```
ProgressTracker
├── start(userId: UserId, tutorialId: TutorialId): SessionId
├── completeStep(sessionId: SessionId, stepId: StepId): void
├── completeTutorial(sessionId: SessionId): TutorialCompletion
├── getProgress(userId: UserId): UserProgress
├── getCompletionRate(tutorialId: TutorialId): number
├── getAbandonmentRate(tutorialId: TutorialId): number
├── getTimePerStep(tutorialId: TutorialId): Map<StepId, number>
```

### 2.3 Fluxo de Execucao de Tutorial

```
Usuario inicia tutorial
        │
        v
Registry.resolve(id) ──── Carrega definicao YAML
        │
        v
Resolver.checkPrerequisites() ──── Valida dependencias
        │
        v
Resolver.checkLevelGate() ──────── Valida nivel do usuario
        │
        v
ProgressTracker.start() ────────── Cria sessao
        │
        v
┌──────────────────────────────────────────────┐
│  LOOP DE EXECUCAO (para cada passo)          │
│                                              │
│  StepRenderer.renderStep() ── Exibe passo    │
│        │                                     │
│        v                                     │
│  User realiza acao                          │
│        │                                     │
│        v                                     │
│  StepValidator.validate() ── Valida acao    │
│        │                                     │
│  ┌─────┴──────┐                             │
│  │ Sucesso    │ Falha                       │
│  │            │                             │
│  │ Progress   │ StepExecutor.retry()        │
│  │ Tracker    │   ou                        │
│  │ .complete()│ StepExecutor.skip()         │
│  │            │   ou                        │
│  └─────┬──────┘ HintGenerator.generate()    │
│        │             │                      │
│        │             └─── exibe hint        │
│        v                                    │
│  ┌─────┴──────┐                             │
│  │ Proximo    │ Fim                        │
│  │ passo      │                             │
│  └────────────┘                             │
└──────────────────────────────────────────────┘
        │
        v
ProgressTracker.completeTutorial() ── Finaliza
        │
        v
BadgeSystem.award() ── Conquista desbloqueada
        │
        v
ProgressiveDisclosure.unlock() ── Novas funcionalidades
        │
        v
AnalyticsCollector.record() ── Dados de conclusao
```

---

## 3. Formato de Tutorial

### 3.1 Schema YAML

Cada tutorial e definido em um arquivo YAML com a seguinte estrutura:

```yaml
# schema: tutorial/v1
id: tutorial-01-first-command
version: "1.0"
title: "Primeiro Comando"
description: "Aprenda a executar seu primeiro comando na IDEIA"
category: "getting-started"
level: beginner
prerequisites: []
estimated_time: 5 # minutos
tags:
  - cli
  - basics
  - first-steps

authoring:
  author: "IDEIA Team"
  created: "2026-07-22"
  updated: "2026-07-22"
  locale: "pt-BR"

steps:
  - id: step-01
    title: "Abrindo o terminal"
    description: "Abra o terminal integrado da IDEIA usando Ctrl+Shift+P e digitando 'IDEIA: Open Terminal'"
    type: action
    action:
      kind: command_palette
      command: "IDEIA: Open Terminal"
    validation:
      kind: terminal_open
      timeout: 30
    hints:
      - "Use o atalho Ctrl+Shift+P para abrir a paleta de comandos"
      - "Digite 'terminal' para filtrar rapidamente"
    success_message: "Terminal aberto com sucesso!"
    failure_message: "Nao foi possivel abrir o terminal. Tente novamente."
    links:
      - label: "Documentacao do Terminal"
        url: "/docs/terminal"

  - id: step-02
    title: "Digitando seu primeiro comando"
    description: "Digite 'IDEIA --help' no terminal e pressione Enter"
    type: action
    action:
      kind: terminal_input
      value: "IDEIA --help"
    validation:
      kind: command_output
      expected_match: "Usage: IDEIA"
      timeout: 10
    hints:
      - "Digite exatamente: IDEIA --help"
      - "Verifique se o cursor esta no terminal antes de digitar"
    success_message: "Comando executado! Voce ja esta usando a IDEIA."
    failure_message: "Comando nao reconhecido. Verifique se a IDEIA esta instalada."
    links:
      - label: "Lista completa de comandos"
        url: "/docs/cli"

  - id: step-03
    title: "Explorando o resultado"
    description: "O help mostra todos os comandos disponiveis. Tente encontrar o comando 'init' na lista."
    type: verify
    action:
      kind: read_output
    validation:
      kind: content_check
      expected_contains: "init"
      timeout: 60
    hints:
      - "Role para cima para ver o inicio da saida do help"
      - "Procure pela palavra 'init' que significa inicializar projeto"
    success_message: "Voce encontrou o comando init! Ele serve para criar novos projetos."
    failure_message: "Nao encontrou? O comando init esta na secao de Project Commands."

branches:
  - id: branch-quick
    condition:
      step: step-02
      result: completed_in_under: 5
    then:
      description: "Parabens! Voce foi muito rapido. Tutorial concluido com velocidade."
      bonus_xp: 50

  - id: branch-help
    condition:
      step: step-03
      requires_hint: true
    then:
      description: "Que bom que usou as dicas! Vamos tentar o proximo tutorial."
      unlocks: tutorial-02-hello-world

meta:
  xp_reward: 100
  badges: ["first-command"]
  unlocks: ["capability:cli:basic"]
  next_suggested: ["tutorial-02-hello-world"]
  difficulty: 1 # 1-10
```

### 3.2 Schema Validation (Zod)

```typescript
import { z } from "zod";

const TutorialSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  version: z.string(),
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  category: z.enum([
    "getting-started",
    "cli",
    "project",
    "agent",
    "plugin",
    "deploy",
    "advanced"
  ]),
  level: z.enum(["beginner", "intermediate", "advanced", "expert"]),
  prerequisites: z.array(z.string()),
  estimated_time: z.number().positive(),
  tags: z.array(z.string()).optional(),
  authoring: z.object({
    author: z.string(),
    created: z.string(),
    updated: z.string(),
    locale: z.string()
  }),
  steps: z.array(StepSchema).min(1),
  branches: z.array(BranchSchema).optional(),
  meta: z.object({
    xp_reward: z.number().positive(),
    badges: z.array(z.string()).optional(),
    unlocks: z.array(z.string()).optional(),
    next_suggested: z.array(z.string()).optional(),
    difficulty: z.number().min(1).max(10)
  })
});

const StepSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  type: z.enum(["action", "verify", "info", "choice", "quiz"]),
  action: z.object({
    kind: z.enum([
      "command_palette",
      "terminal_input",
      "file_edit",
      "mouse_click",
      "read_output",
      "api_call",
      "navigation",
      "custom"
    ]),
    value: z.string().optional(),
    command: z.string().optional(),
    params: z.record(z.unknown()).optional()
  }).optional(),
  validation: z.object({
    kind: z.enum([
      "terminal_open",
      "command_output",
      "content_check",
      "file_exists",
      "api_response",
      "custom"
    ]),
    expected_match: z.string().optional(),
    expected_contains: z.string().optional(),
    expected_exit_code: z.number().optional(),
    timeout: z.number().positive()
  }).optional(),
  hints: z.array(z.string()).optional(),
  success_message: z.string().optional(),
  failure_message: z.string().optional(),
  links: z.array(z.object({
    label: z.string(),
    url: z.string()
  })).optional()
});

const BranchSchema = z.object({
  id: z.string(),
  condition: z.object({
    step: z.string(),
    result: z.string(),
    requires_hint: z.boolean().optional()
  }),
  then: z.object({
    description: z.string(),
    bonus_xp: z.number().optional(),
    unlocks: z.array(z.string()).optional()
  })
});
```

### 3.3 Estrutura de Diretorios

```
tutorials/
├── getting-started/
│   ├── tutorial-01-first-command.yaml
│   ├── tutorial-02-hello-world.yaml
│   ├── tutorial-03-crud-completo.yaml
│   └── tutorial-04-api-integration.yaml
├── intermediate/
│   ├── tutorial-05-deploy-local.yaml
│   └── tutorial-06-plugin-theia.yaml
├── advanced/
│   └── tutorial-07-multiagent.yaml
├── expert/
│   └── tutorial-08-custom-context-pack.yaml
├── index.yaml  # catalogo de todos os tutoriais
└── schemas/
    └── tutorial-v1.schema.json  # JSON Schema para validacao
```

---

## 4. Tipos de Tutoriais

### 4.1 Matriz de Tipos

| Tipo | Interacao | Validacao | Autonomia do Usuario | Tempo Medio | Nivel |
|------|-----------|-----------|---------------------|-------------|-------|
| Guiado | Click-by-click | Automatica | Minima | 3-8 min | Beginner |
| Semi-guiado | Tarefa aberta | Mista | Media | 10-20 min | Intermediate |
| Livre | Apenas objetivo | Manual | Maxima | 20-45 min | Advanced |
| Interativo | Acao e resposta | Automatica | Alta | 5-15 min | All |

### 4.2 Tutorial Guiado

Passo-a-passo rigido com instrucoes atomicas. Cada acao e validada antes de prosseguir.

```yaml
# Exemplo: Tutorial Guiado
- id: step-create-project
  title: "Criar um projeto"
  description: "Clique no botao 'Novo Projeto' no painel esquerdo"
  type: action
  action:
    kind: mouse_click
    value: "#new-project-button"
  validation:
    kind: custom
    validator_id: "project-created"
    timeout: 30
  hints:
    - "Procure o icone de + no canto superior esquerdo"
    - "O tooltip mostra 'Novo Projeto (Ctrl+N)'"
```

**Quando usar:** Primeiro contato, recursos criticos, fluxos obrigatorios.

### 4.3 Tutorial Semi-guiado

Objetivo claro mas caminho aberto. O usuario decide como atingir o resultado.

```yaml
# Exemplo: Tutorial Semi-guiado
- id: step-configure-auth
  title: "Configurar autenticacao"
  description: "Adicione autenticacao JWT ao projeto que voce criou. Use o agente 'Analyst' para entender os requisitos."
  type: action
  action:
    kind: custom
    description: "O usuario deve escolher como implementar"
  validation:
    kind: content_check
    expected_contains: "jwt"
    target_file: "src/auth/config.ts"
    timeout: 300
  hints:
    - "Use 'IDEIA agent run analyst --query como adicionar JWT'"
    - "O comando 'IDEIA generate auth jwt' pode ajudar"
```

**Quando usar:** Praticas de desenvolvimento, fluxos com multiplas abordagens.

### 4.4 Tutorial Livre

Apenas o objetivo final e descrito. Nenhuma instrucao intermediaria.

```yaml
# Exemplo: Tutorial Livre
- id: challenge-deploy
  title: "Deploy em producao"
  description: "Faca o deploy do seu projeto em um ambiente de producao. O deploy deve estar acessivel via HTTPS e ter health check."
  type: verify
  action:
    kind: api_call
    endpoint: "https://seu-projeto.ideia.app/health"
  validation:
    kind: api_response
    expected:
      status: 200
      body_contains: "ok"
    timeout: 600
  hints:
    - "Use 'IDEIA deploy' para iniciar o processo"
    - "Nao esqueca de configurar as variaveis de ambiente"
  success_message: "Deploy realizado com sucesso! Seu projeto esta no ar."
```

**Quando usar:** Desafios, profissionais experientes, certificacao.

### 4.5 Tutorial Interativo

Combina instrucao com execucao em ambiente controlado. O usuario interage com um sandbox.

```typescript
// Exemplo de sessao interativa
interface InteractiveSession {
  tutorialId: string;
  sandboxId: string;
  state: {
    currentStep: number;
    environment: Record<string, unknown>;
    variables: Record<string, string>;
    files: Record<string, string>;
  };
  checkpoint: {
    id: string;
    snapshot: Snapshot;
    timestamp: number;
  }[];
  liveReload: boolean;
  autoValidate: boolean;
}
```

```yaml
# Exemplo: Tutorial Interativo
- id: interactive-test
  title: "Teste interativo de API"
  description: "O sandbox abaixo contem um servidor Express. Use o terminal para testar o endpoint GET /users."
  type: interactive
  sandbox:
    template: "express-api"
    files:
      "src/index.ts": "..."  # template com lacunas
    ports:
      - 3000
    setup_commands:
      - "npm install"
      - "npm run dev"
  validation:
    kind: terminal_input
    expected_command: "curl http://localhost:3000/users"
    expected_output_contains: '"id":'
    timeout: 120
```

**Quando usar:** Aprendizado pratico, debugging, experimentacao segura.

---

## 5. Biblioteca de Tutoriais

### 5.1 Catalogo

| ID | Nome | Nivel | Tempo | Pre-requisitos | Badge | XP |
|----|------|-------|-------|----------------|-------|----|
| T01 | Primeiro Comando | Beginner | 5 min | Nenhum | first-command | 100 |
| T02 | Hello World | Beginner | 10 min | T01 | hello-world | 150 |
| T03 | CRUD Completo | Intermediate | 20 min | T02 | crud-master | 300 |
| T04 | Integracao com API | Intermediate | 15 min | T03 | api-integration | 250 |
| T05 | Deploy Local | Intermediate | 20 min | T03 | first-deploy | 350 |
| T06 | Plugin Theia | Advanced | 30 min | T01, T03 | plugin-dev | 500 |
| T07 | Multiagente | Advanced | 25 min | T03, T04 | multi-agent | 600 |
| T08 | Custom Context Pack | Expert | 35 min | T06, T07 | context-master | 800 |

### 5.2 Tutorial 01 — Primeiro Comando

```yaml
id: tutorial-01-first-command
title: "Primeiro Comando"
category: getting-started
level: beginner
estimated_time: 5

steps:
  - id: open-terminal
    title: "Abrir terminal integrado"
    type: action
    action:
      kind: command_palette
      command: "IDEIA: Open Terminal"
    validation:
      kind: terminal_open
      timeout: 30
    hints:
      - "Ctrl+Shift+P abre a paleta de comandos"
      - "Digite 'terminal' e pressione Enter"

  - id: run-help
    title: "Executar IDEIA --help"
    type: action
    action:
      kind: terminal_input
      value: "IDEIA --help"
    validation:
      kind: command_output
      expected_match: "Usage:"
      timeout: 10
    hints:
      - "Digite exatamente: IDEIA --help"
      - "Nao esqueca do espaco antes de --help"

  - id: identify-init
    title: "Encontrar comando init"
    type: verify
    action:
      kind: read_output
    validation:
      kind: content_check
      expected_contains: "init"
      timeout: 30
    hints:
      - "Procure pela secao 'Project Commands'"
      - "init esta listado como 'IDEIA init <project-name>'"

meta:
  xp_reward: 100
  badges: ["first-command"]
  unlocks: ["capability:cli:basic"]
  next_suggested: ["tutorial-02-hello-world"]
```

### 5.3 Tutorial 02 — Hello World

```yaml
id: tutorial-02-hello-world
title: "Hello World com IDEIA"
category: getting-started
level: beginner
prerequisites: ["tutorial-01-first-command"]
estimated_time: 10

steps:
  - id: init-project
    title: "Inicializar projeto"
    type: action
    action:
      kind: terminal_input
      value: "IDEIA init hello-world"
    validation:
      kind: command_output
      expected_contains: "Project created"
      timeout: 30
    hints:
      - "O comando e: IDEIA init hello-world"
      - "Substitua 'hello-world' pelo nome que quiser"

  - id: explore-structure
    title: "Explorar estrutura"
    type: action
    action:
      kind: terminal_input
      value: "ls -la hello-world/"
    validation:
      kind: command_output
      expected_contains: "package.json"
      timeout: 10
    hints:
      - "Use 'ls' para listar arquivos"
      - "No Windows use 'dir'"

  - id: add-hello-world
    title: "Criar Hello World"
    type: action
    action:
      kind: terminal_input
      value: "IDEIA generate code hello-world/src/index.ts --template hello-express"
    validation:
      kind: file_exists
      path: "hello-world/src/index.ts"
      timeout: 15
    hints:
      - "O template 'hello-express' gera um servidor HTTP basico"
      - "Para ver todos os templates: IDEIA generate --list"

  - id: run-project
    title: "Executar projeto"
    type: action
    action:
      kind: terminal_input
      value: "cd hello-world && npm start"
    validation:
      kind: command_output
      expected_contains: "Server running"
      timeout: 30
    hints:
      - "O servidor inicia na porta 3000 por padrao"
      - "Use Ctrl+C para parar o servidor"

meta:
  xp_reward: 150
  badges: ["hello-world"]
  unlocks: ["capability:project:basic", "capability:generate:code"]
  next_suggested: ["tutorial-03-crud-completo"]
```

### 5.4 Tutorial 03 — CRUD Completo

```yaml
id: tutorial-03-crud-completo
title: "CRUD Completo com IDEIA"
category: project
level: intermediate
prerequisites: ["tutorial-02-hello-world"]
estimated_time: 20

steps:
  - id: create-crud-project
    title: "Criar projeto CRUD"
    type: action
    action:
      kind: terminal_input
      value: "IDEIA init crud-app --template rest-api --db postgres"
    validation:
      kind: command_output
      expected_contains: "Initialized"
      timeout: 30
    hints:
      - "O template rest-api ja vem com Express + Prisma configurados"
      - "Pode levar alguns segundos para baixar dependencias"

  - id: define-user-model
    title: "Definir modelo de Usuario"
    type: action
    action:
      kind: custom
      description: "Use o comando IDEIA generate para criar o modelo User com campos: id, name, email, createdAt"
    validation:
      kind: content_check
      target_file: "prisma/schema.prisma"
      expected_contains: "model User"
      timeout: 60
    hints:
      - "Comando: IDEIA generate model user --fields name:string,email:string"
      - "O modelo vai para prisma/schema.prisma"

  - id: generate-crud
    title: "Gerar CRUD"
    type: action
    action:
      kind: terminal_input
      value: "IDEIA generate crud User"
    validation:
      kind: content_check
      target_file: "src/routes/users.ts"
      expected_contains: "router.get"
      timeout: 30
    hints:
      - "Isso gera GET, POST, PUT, DELETE para /users"
      - "Veja os arquivos em src/routes/"

  - id: run-and-test
    title: "Executar e testar CRUD"
    type: interactive
    sandbox:
      template: "rest-api"
    action:
      kind: terminal_input
      value: "curl -X POST http://localhost:3000/users -H 'Content-Type: application/json' -d '{\"name\":\"Teste\",\"email\":\"teste@teste.com\"}'"
    validation:
      kind: api_response
      expected:
        status: 201
        body_contains: "id"
      timeout: 30
    hints:
      - "Primeiro inicie o servidor com 'npm run dev'"
      - "O endpoint POST /users cria um novo usuario"

meta:
  xp_reward: 300
  badges: ["crud-master"]
  unlocks: ["capability:project:fullstack", "capability:database:basic"]
  next_suggested: ["tutorial-04-api-integration", "tutorial-05-deploy-local"]
```

### 5.5 Tutorial 04 — Integracao com API

```yaml
id: tutorial-04-api-integration
title: "Integracao com API Externa"
category: project
level: intermediate
prerequisites: ["tutorial-03-crud-completo"]
estimated_time: 15

steps:
  - id: scaffold-integration
    title: "Estruturar integracao"
    type: action
    action:
      kind: terminal_input
      value: "IDEIA generate integration github --output src/integrations/github.ts"
    validation:
      kind: file_exists
      path: "src/integrations/github.ts"
      timeout: 15
    hints:
      - "O comando generate integration cria um adapter para API externa"
      - "Veja a documentacao gerada em docs/integrations/"

  - id: add-endpoint
    title: "Adicionar endpoint de repos"
    type: action
    action:
      kind: terminal_input
      value: "IDEIA generate endpoint GET /repos --handler src/integrations/github.ts --method getRepos"
    validation:
      kind: content_check
      target_file: "src/routes/repos.ts"
      expected_contains: "getRepos"
      timeout: 15
    hints:
      - "O endpoint GET /repos vai listar repositorios do GitHub"
      - "Configure o token GitHub em .env"

  - id: test-integration
    title: "Testar integracao"
    type: verify
    action:
      kind: api_call
      endpoint: "http://localhost:3000/repos"
    validation:
      kind: api_response
      expected:
        status: 200
      timeout: 30
    hints:
      - "Seu servidor precisa estar rodando"
      - "Use o token do GitHub configurado corretamente"

meta:
  xp_reward: 250
  badges: ["api-integration"]
  unlocks: ["capability:integrations:rest", "capability:api:advanced"]
  next_suggested: ["tutorial-05-deploy-local"]
```

### 5.6 Tutorial 05 — Deploy Local

```yaml
id: tutorial-05-deploy-local
title: "Deploy Local com Docker"
category: deploy
level: intermediate
prerequisites: ["tutorial-03-crud-completo"]
estimated_time: 20

steps:
  - id: generate-dockerfile
    title: "Gerar Dockerfile"
    type: action
    action:
      kind: terminal_input
      value: "IDEIA generate docker --output Dockerfile --port 3000"
    validation:
      kind: file_exists
      path: "Dockerfile"
      timeout: 10
    hints:
      - "O Dockerfile gerado usa multi-stage build"
      - "Veja o arquivo gerado para entender as etapas"

  - id: generate-compose
    title: "Gerar Docker Compose"
    type: action
    action:
      kind: terminal_input
      value: "IDEIA generate docker-compose --services app,postgres --output docker-compose.yml"
    validation:
      kind: file_exists
      path: "docker-compose.yml"
      timeout: 10
    hints:
      - "O compose inclui o app e o banco de dados"
      - "Edite as variaveis de ambiente se necessario"

  - id: build-and-run
    title: "Build e execucao"
    type: action
    action:
      kind: terminal_input
      value: "docker-compose up --build -d"
    validation:
      kind: command_output
      expected_contains: "Started"
      timeout: 120
    hints:
      - "O build pode levar alguns minutos na primeira vez"
      - "Use 'docker-compose logs -f' para ver os logs"

  - id: verify-deploy
    title: "Verificar deploy"
    type: verify
    action:
      kind: api_call
      endpoint: "http://localhost:3000/health"
    validation:
      kind: api_response
      expected:
        status: 200
      timeout: 30
    hints:
      - "O health check e configurado automaticamente"
      - "Se falhar, veja os logs com docker-compose logs"

meta:
  xp_reward: 350
  badges: ["first-deploy"]
  unlocks: ["capability:deploy:docker", "capability:infra:basic"]
  next_suggested: ["tutorial-06-plugin-theia"]
```

### 5.7 Tutorial 06 — Plugin Theia

```yaml
id: tutorial-06-plugin-theia
title: "Criar Plugin Theia"
category: plugin
level: advanced
prerequisites: ["tutorial-01-first-command", "tutorial-03-crud-completo"]
estimated_time: 30

steps:
  - id: scaffold-plugin
    title: "Estruturar plugin"
    type: action
    action:
      kind: terminal_input
      value: "IDEIA generate theia-plugin my-widget --output plugins/my-widget"
    validation:
      kind: file_exists
      path: "plugins/my-widget/package.json"
      timeout: 15
    hints:
      - "O scaffold cria estrutura basica de plugin Theia"
      - "Inclui frontend widget + backend contribution"

  - id: define-contribution
    title: "Definir command"
    type: action
    action:
      kind: custom
      description: "Adicione um comando 'my-widget:hello' ao plugin usando 'IDEIA generate theia-command'"
    validation:
      kind: content_check
      target_file: "plugins/my-widget/src/my-widget-contribution.ts"
      expected_contains: "my-widget:hello"
      timeout: 30
    hints:
      - "Comando: IDEIA generate theia-command my-widget:hello --label 'Say Hello'"
      - "O comando aparece na paleta de comandos do Theia"

  - id: widget-frontend
    title: "Criar widget"
    type: action
    action:
      kind: terminal_input
      value: "IDEIA generate theia-widget HelloWidget --output plugins/my-widget/src/widget"
    validation:
      kind: file_exists
      path: "plugins/my-widget/src/widget/hello-widget.tsx"
      timeout: 15
    hints:
      - "O widget usa React + Theia ReactWidget"
      - "Edite o TSX para personalizar"

  - id: build-plugin
    title: "Compilar e testar"
    type: action
    action:
      kind: terminal_input
      value: "cd plugins/my-widget && npm run build"
    validation:
      kind: command_output
      expected_contains: "Build successful"
      timeout: 60
    hints:
      - "Certifique-se de ter todas as dependencias instaladas"
      - "Use 'npm install' se necessario"

meta:
  xp_reward: 500
  badges: ["plugin-dev"]
  unlocks: ["capability:plugins:theia"]
  next_suggested: ["tutorial-07-multiagent"]
```

### 5.8 Tutorial 07 — Multiagente

```yaml
id: tutorial-07-multiagent
title: "Orquestracao Multiagente"
category: advanced
level: advanced
prerequisites: ["tutorial-03-crud-completo", "tutorial-04-api-integration"]
estimated_time: 25

steps:
  - id: understand-roles
    title: "Conhecer os agentes"
    type: info
    description: |
      A IDEIA possui 6 agentes especializados:
      - Analyst: analisa requisitos
      - Architect: define arquitetura
      - Programmer: implementa codigo
      - Reviewer: revisa qualidade
      - Tester: cria testes
      - DevOps: gerencia infraestrutura
    hints:
      - "Use 'IDEIA agent list' para ver todos os agentes"
      - "Cada agente tem autonomia N0-N4"

  - id: create-workflow
    title: "Criar workflow multiagente"
    type: action
    action:
      kind: terminal_input
      value: "IDEIA agent workflow create --name feature-workflow --steps analyst,architect,programmer,reviewer,tester"
    validation:
      kind: command_output
      expected_contains: "Workflow created"
      timeout: 15
    hints:
      - "O workflow define a sequencia de agentes"
      - "Cada passo passa contexto para o proximo"

  - id: run-workflow
    title: "Executar workflow"
    type: action
    action:
      kind: terminal_input
      value: "IDEIA agent workflow run feature-workflow --task 'Adicionar autenticacao via GitHub OAuth'"
    validation:
      kind: command_output
      expected_contains: "Completed"
      timeout: 120
    hints:
      - "O workflow executa cada agente em sequencia"
      - "Acompanhe o progresso com IDEIA agent workflow status"

  - id: review-output
    title: "Revisar resultado"
    type: verify
    action:
      kind: read_output
    validation:
      kind: content_check
      expected_contains: "auth"
      timeout: 30
    hints:
      - "O resultado final inclui codigo, testes e docs"
      - "Cada agente deixa artefatos no diretorio .ideia/workflows/"

meta:
  xp_reward: 600
  badges: ["multi-agent"]
  unlocks: ["capability:agents:workflow", "capability:orchestration"]
  next_suggested: ["tutorial-08-custom-context-pack"]
```

### 5.9 Tutorial 08 — Custom Context Pack

```yaml
id: tutorial-08-custom-context-pack
title: "Custom Context Pack"
category: advanced
level: expert
prerequisites: ["tutorial-06-plugin-theia", "tutorial-07-multiagent"]
estimated_time: 35

steps:
  - id: understand-packs
    title: "Entender Context Packs"
    type: info
    description: |
      Context Packs encapsulam conhecimento especializado para
      os agentes. Cada pack contem:
      - Regras de dominio
      - Exemplos de codigo
      - Padroes arquiteturais
      - Variaveis de contexto
      - Prompt templates

  - id: create-pack
    title: "Criar Context Pack"
    type: action
    action:
      kind: terminal_input
      value: "IDEIA context pack create --name meu-padrao-empresarial --rules ./rules --examples ./examples"
    validation:
      kind: file_exists
      path: ".ideia/context-packs/meu-padrao-empresarial/pack.yaml"
      timeout: 15
    hints:
      - "O pack e criado em .ideia/context-packs/"
      - "Veja o YAML gerado para entender a estrutura"

  - id: define-rules
    title: "Definir regras"
    type: action
    action:
      kind: custom
      description: "Adicione 3 regras ao pack: (1) usar TypeScript strict mode, (2) usar kebab-case para arquivos, (3) documentar todas as funcoes publicas"
    validation:
      kind: content_check
      target_file: ".ideia/context-packs/meu-padrao-empresarial/rules.yaml"
      expected_contains: "strict mode"
      timeout: 30
    hints:
      - "Edite o arquivo rules.yaml diretamente"
      - "Cada regra tem: id, description, severity, pattern, auto-fix"

  - id: activate-pack
    title: "Ativar pack"
    type: action
    action:
      kind: terminal_input
      value: "IDEIA context pack activate meu-padrao-empresarial"
    validation:
      kind: command_output
      expected_contains: "activated"
      timeout: 10
    hints:
      - "Multiplos packs podem estar ativos simultaneamente"
      - "Use 'IDEIA context pack list' para ver packs ativos"

  - id: test-pack
    title: "Validar pack em projeto"
    type: action
    action:
      kind: custom
      description: "Use 'IDEIA agent run programmer --task \"Criar um controller de usuarios seguindo o pack ativo\"'"
    validation:
      kind: custom
      validator_id: "pack-compliance"
      timeout: 60
    hints:
      - "O agente segue automaticamente as regras do pack ativo"
      - "Verifique se as regras foram aplicadas no codigo gerado"

meta:
  xp_reward: 800
  badges: ["context-master"]
  unlocks: ["capability:context:custom-packs", "capability:governance:rules"]
  next_suggested: []
```

---

## 6. Progressive Disclosure System

### 6.1 Niveis de Usuario

| Nivel | XP Total | Tutoriais Completos | Comandos Liberados | Features Liberadas |
|-------|----------|--------------------|--------------------|---------------------|
| Beginner | 0-499 | 0-2 | 51 comandos basicos | CLI help, IDEIA init, IDEIA generate basico |
| Intermediate | 500-1499 | 3-4 | +15 comandos | CRUD, API integration, Docker, test generation |
| Advanced | 1500-2999 | 5-6 | +10 comandos | Multiagente, plugin Theia, custom validators |
| Expert | 3000+ | 7-8 | Todos + modo dev | Context packs, custom agents, API de extensao |

### 6.2 Funcionalidades Desbloqueadas por Nivel

```yaml
# progressive-disclosure.yaml
levels:
  beginner:
    xp_required: 0
    unlocks:
      cli:
        - help
        - version
        - init
        - generate:basic
        - validate:basic
      agents:
        - analyst
      limits:
        max_parallel_tasks: 1
        max_context_packs: 0
        max_workflow_steps: 2
      features:
        - terminal_integrated
        - command_palette
        - basic_completion

  intermediate:
    xp_required: 500
    unlocks:
      cli:
        - generate:all
        - test:unit
        - audit:basic
        - deploy:docker
        - diff
      agents:
        - architect
        - programmer
      limits:
        max_parallel_tasks: 3
        max_context_packs: 2
        max_workflow_steps: 5
      features:
        - project_templates
        - api_integration
        - docker_support
        - test_generation
        - code_review

  advanced:
    xp_required: 1500
    unlocks:
      cli:
        - agent:workflow
        - plugin:create
        - context:pack
        - audit:full
        - benchmark
      agents:
        - reviewer
        - tester
      limits:
        max_parallel_tasks: 5
        max_context_packs: 5
        max_workflow_steps: 10
      features:
        - multiagent_orchestration
        - plugin_sdk
        - custom_validators
        - theia_integration

  expert:
    xp_required: 3000
    unlocks:
      cli:
        - admin:all
        - context:design
        - api:extensao
        - dev:mode
      agents:
        - devops
        - custom_agents
      limits:
        max_parallel_tasks: 10
        max_context_packs: unlimited
        max_workflow_steps: unlimited
      features:
        - custom_agent_creation
        - extension_api
        - enterprise_governance
        - advanced_analytics
        - share_context_packs
```

### 6.3 Mecanismo de Dicas Contextuais

```typescript
interface ContextualHint {
  trigger: {
    kind: "command" | "idle" | "error" | "navigation" | "feature_usage";
    pattern?: string;
    threshold?: number; // em segundos para idle
    command?: string;
    route?: string;
  };
  hint: {
    message: string;
    priority: "low" | "medium" | "high";
    dismissible: boolean;
    timeout: number; // auto-dismiss em segundos
    action?: {
      label: string;
      command: string;
    };
  };
  frequency: {
    max_per_session: number;
    cooldown_minutes: number;
  };
  level_gate?: "beginner" | "intermediate" | "advanced" | "expert";
}
```

### 6.4 Sugestao de Proximos Passos

Apos cada acao do usuario, o sistema sugere automaticamente os proximos tutoriais ou acoes:

```
Usuario executa: IDEIA init my-app
       │
       v
Sistema detecta: primeiro uso de init
       │
       v
Sugestoes:
[1] Proximo tutorial: Hello World (+150 XP)
[2] Dica: Use IDEIA generate para criar codigo
[3] Explorar templates: IDEIA generate --list

Posicao no progresso:
[===.................................] 15% Beginner
Proximo marco: Tutorial 02 (+350 XP para Intermediate)
```

---

## 7. Gamificacao

### 7.1 Sistema de Badges

| Badge | ID | Requisito | XP | Visibilidade |
|-------|----|-----------|----|-------------|
| First Command | first-command | Completar T01 | 100 | Publico |
| Hello World | hello-world | Completar T02 | 150 | Publico |
| CRUD Master | crud-master | Completar T03 | 300 | Publico |
| API Integration | api-integration | Completar T04 | 250 | Publico |
| First Deploy | first-deploy | Completar T05 | 350 | Publico |
| Plugin Dev | plugin-dev | Completar T06 | 500 | Publico |
| Multi-Agent Orchestrator | multi-agent | Completar T07 | 600 | Publico |
| Context Master | context-master | Completar T08 | 800 | Publico |
| Speed Runner | speed-runner | Completar T01-T03 em <20min | 200 | Privado |
| Perfectionist | perfectionist | Completar tutorial sem hints | 150 | Privado |
| Streak 7 | streak-7 | 7 dias consecutivos de uso | 400 | Publico |
| Streak 30 | streak-30 | 30 dias consecutivos de uso | 1000 | Publico |
| Bug Hunter | bug-hunter | Reportar 5 bugs validados | 300 | Publico |
| Contributor | contributor | Contribuir com tutorial | 500 | Publico |
| Mentor | mentor | Ajudar 3 usuarios no forum | 750 | Publico |
| Speed Deploy | speed-deploy | Deploy em <5min | 200 | Privado |
| Zero-to-Prod | zero-to-prod | Projeto do zero ao deploy em <30min | 1000 | Publico |
| IDEIA Veteran | veteran | 1 ano de uso continuo | 2000 | Publico |

### 7.2 Achievement System

```typescript
interface Achievement {
  id: string;
  name: string;
  description: string;
  category: "tutorial" | "streak" | "speed" | "quality" | "community";
  icon: string; // caminho para SVG
  rarity: "common" | "uncommon" | "rare" | "legendary";
  requirements: {
    type: "tutorial_complete" | "streak_days" | "xp_total" | "speed_run" | "hints_avoided" | "deploy_count";
    target: number | string;
    sub_requirements?: AchievementRequirement[];
  };
  rewards: {
    xp: number;
    unlocks?: string[];
    title?: string; // titulo exibivel no perfil
  };
  hidden: boolean; // badge secreto?
  max_progress: number;
}
```

### 7.3 Progress Tracking (Dashboard)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  PERFIL DO USUARIO                                                           │
│                                                                              │
│  Nivel: Intermediate (1,250/1,500 XP)                                       │
│  [██████████████████████░░░░░░░░░░░] 83%                                    │
│                                                                              │
│  Badges: 5/18                                                                │
│  [FIRST] [HELLO] [CRUD]  [API]  [DEPLOY] [...]                              │
│                                                                              │
│  Streak: 12 dias                                                             │
│  [S M T W T F S][S M T W T F S][S M ...]                                    │
│                                                                              │
│  Tutoriais: 4/8 concluidos                                                   │
│  [T01 COMPLETE] [T02 COMPLETE] [T03 COMPLETE] [T04 COMPLETE]                 │
│  [T05 PENDING]  [T06 LOCKED]  [T07 LOCKED] [T08 LOCKED]                     │
│                                                                              │
│  Proximo Desbloqueio: Advanced (em 250 XP)                                   │
│  Features que serao liberadas:                                               │
│  - Orquestracao Multiagente                                                  │
│  - Plugin SDK                                                                │
│  - Custom Validators                                                         │
│  - Theia Integration                                                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 7.4 Streaks

```typescript
interface StreakSystem {
  currentStreak: number;
  longestStreak: number;
  lastActivity: Date;
  history: {
    date: string;
    xp_earned: number;
    tutorials_completed: number;
    commands_executed: number;
  }[];

  // Calcula streak atual baseado em historico
  calculateStreak(): number;

  // Bonus multiplicador por streak
  getXpMultiplier(): number;
  // 1-3 dias: 1x
  // 4-7 dias: 1.5x
  // 8-14 dias: 2x
  // 15-30 dias: 2.5x
  // 30+ dias: 3x

  // Recompensas de streak
  getStreakRewards(streak: number): StreakReward[];
  // Dia 7: 50 XP bonus
  // Dia 14: Badge "Dedicated"
  // Dia 30: Badge "Streak 30" + 1000 XP
  // Dia 100: Titulo "IDEIA Enthusiast"
}
```

### 7.5 Leaderboard (Opcional)

```typescript
interface LeaderboardEntry {
  userId: string;
  displayName: string;
  level: UserLevel;
  xp: number;
  badges: number;
  streak: number;
  tutorialsCompleted: number;

  // Categorias
  rankOverall: number;
  rankWeekly: number;
  rankByCategory: Record<string, number>;
}
```

---

## 8. Onboarding Flow

### 8.1 Fluxo Completo de Onboarding

```
PRIMEIRO ACESSO
      │
      v
┌─────────────────────────────────────┐
│  TELA DE BOAS-VINDAS                │
│                                     │
│  "Bem-vindo a IDEIA"               │
│                                     │
│  [X] Sim, sou novo (recomendado)   │
│  [ ] Ja conheco, quero comecar     │
│                                     │
│  [INICIAR TOUR]  [PULAR]           │
└─────────────────────────────────────┘
      │
      v
┌─────────────────────────────────────┐
│  TOUR GUIADO (5 telas)             │
│                                     │
│  1/5: Interface principal          │
│  - Terminal integrado              │
│  - Paleta de comandos              │
│  - Painel de agentes               │
│  - Explorador de arquivos          │
│                                     │
│  [PROXIMO] [PULAR TOUR]            │
└─────────────────────────────────────┘
      │
      v
┌─────────────────────────────────────┐
│  QUICKSTART WIZARD                  │
│                                     │
│  "Vamos configurar seu ambiente"   │
│                                     │
│  Passo 1: Nome do projeto: [____]   │
│  Passo 2: Stack: [React/Node/Python]│
│  Passo 3: DB: [Postgres/SQLite/Mongo]│
│  Passo 4: Extras: [Docker/Auth/API] │
│                                     │
│  [CRIAR PROJETO]                   │
└─────────────────────────────────────┘
      │
      v
┌─────────────────────────────────────┐
│  PRIMEIRO TUTORIAL                  │
│                                     │
│  "Projeto criado! Que tal          │
│   aprender os comandos basicos?"   │
│                                     │
│  [INICIAR T01] [DEPOIS]            │
└─────────────────────────────────────┘
      │
      v
┌─────────────────────────────────────┐
│  DASHBOARD POS-ONBOARDING           │
│                                     │
│  - Badge "First Command"            │
│  - Proximo tutorial sugerido        │
│  - Dica contextual do dia           │
│  - Status do streak                 │
└─────────────────────────────────────┘
```

### 8.2 Componentes do Onboarding Flow

```typescript
interface OnboardingFlow {
  steps: OnboardingStep[];
  currentStep: number;
  userPreferences: {
    experience: "beginner" | "experienced" | "expert";
    role: "developer" | "architect" | "devops" | "student" | "other";
    goals: string[]; // "learn_ideia" | "build_project" | "evaluate" | "migrate"
    techStack: string[];
  };

  // Fluxo condicional baseado nas respostas
  resolveNextStep(): OnboardingStep;
}

interface OnboardingStep {
  id: string;
  type: "welcome" | "tour" | "wizard" | "tutorial" | "config" | "complete";
  component: string; // nome do componente React
  props: Record<string, unknown>;
  skipable: boolean;
  required: boolean;
  condition?: (prefs: UserPreferences) => boolean;
  analytics: {
    stepViewed: boolean;
    timeSpent: number;
    completed: boolean;
    skipped: boolean;
  };
}
```

### 8.3 Quickstart Wizard

O Quickstart Wizard guia o usuario na criacao do primeiro projeto com configuracao assistida.

```yaml
# quickstart-wizard.yaml
wizard:
  id: quickstart-v1
  steps:
    - id: project-name
      title: "Nome do Projeto"
      type: input
      field: projectName
      validation: string(3, 50)
      placeholder: "meu-primeiro-projeto"
      hint: "Use kebab-case (letras minusculas e hifens)"

    - id: stack-selection
      title: "Stack Tecnologica"
      type: select_cards
      field: stack
      options:
        - id: react-node
          title: "React + Node.js"
          description: "Frontend React com backend Express"
          icon: "react"
          popular: true
        - id: node-only
          title: "Node.js API"
          description: "API REST com Express/ Fastify"
          icon: "node"
        - id: python
          title: "Python + FastAPI"
          description: "API Python moderna com FastAPI"
          icon: "python"
        - id: fullstack-ts
          title: "Fullstack TypeScript"
          description: "Next.js ou Remix com TypeScript"
          icon: "typescript"
      multi: false

    - id: database
      title: "Banco de Dados"
      type: select
      field: database
      options:
        - id: postgres
          title: "PostgreSQL"
          description: "Recomendado para producao"
        - id: sqlite
          title: "SQLite"
          description: "Para desenvolvimento local"
        - id: mongodb
          title: "MongoDB"
          description: "Para dados nao-estruturados"
        - id: none
          title: "Nenhum"
          description: "Sem banco de dados"

    - id: extras
      title: "Extras"
      type: checkboxes
      field: extras
      options:
        - id: docker
          title: "Docker"
          description: "Containerizacao"
        - id: auth
          title: "Autenticacao"
          description: "JWT + OAuth2"  
        - id: tests
          title: "Testes"
          description: "Jest + Supertest"
        - id: ci
          title: "CI/CD"
          description: "GitHub Actions"
        - id: monitoring
          title: "Monitoramento"
          description: "Grafana + Prometheus"

    - id: confirm
      title: "Confirmar Configuracao"
      type: summary
      fields:
        - projectName
        - stack
        - database
        - extras
      action:
        kind: command
        value: "IDEIA init {{projectName}} --stack {{stack}} --db {{database}} {{#extras}}--with {{.}}{{/extras}}"
      estimated_time: "30 segundos"
```

---

## 9. Help Contextual

### 9.1 Arquitetura do Help Contextual

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     CONTEXTUAL HELP SYSTEM                               │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Context      │  │ Help         │  │ Shortcut     │  │ Inline     │ │
│  │ Detector     │──│ Resolver     │──│ Suggester    │──│ Docs       │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
│        │                                                               │
│        v                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │ Activity     │  │ Command      │  │ File/Project │                │
│  │ Monitor      │  │ History      │  │ Analyzer     │                │
│  └──────────────┘  └──────────────┘  └──────────────┘                │
│        │                                                               │
│        v                                                               │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  HELP OUTPUT RENDERER                                            │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────────┐ ─ │ │
│  │  │ Toast    │ │ Tooltip  │ │ Help Panel   │ │ Status Bar   │   │ │
│  │  │ (5s)     │ │ (hover)  │ │ (docked)     │ │ (icon+text)  │   │ │
│  │  └──────────┘ └──────────┘ └──────────────┘ └──────────────┘   │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Context Detector

O detector monitora continuamente a atividade do usuario para inferir contexto.

```typescript
interface ContextDetector {
  // Monitora acoes do usuario
  onActivity(activity: UserActivity): void;

  // Analisa estado atual
  getCurrentContext(): HelpContext;

  // Detectores especializados
  detectors: Detector[];
}

interface Detector {
  kind: DetectorKind;
  analyze(state: SystemState): ContextSignal | null;
  confidence: number; // 0-1
}

type DetectorKind =
  | "command_error"   // usuario cometeu erro em comando
  | "idle_long"       // usuario parou por X segundos
  | "repeated_action" // usuario repetiu acao varias vezes
  | "new_feature"     // feature nova disponivel
  | "level_up"        // usuario subiu de nivel
  | "file_type"       // usuario abriu tipo de arquivo especifico
  | "navigation"      // usuario navegou para area especifica
  | "search_query"    // usuario fez busca sem resultado
  ;

interface ContextSignal {
  detector: DetectorKind;
  priority: number;
  message: string;
  suggestedHelp: string[];
  suggestedCommands: string[];
  suggestedTutorial?: string;
  expiresAt: number;
}
```

### 9.3 Tipos de Help Contextual

| Tipo | Gatilho | Formato | Duracao | Dismissivel |
|------|---------|---------|---------|-------------|
| Toast | Erro de comando | Notificacao slide-in | 5s | Sim |
| Tooltip | Hover em elemento | Balao explicativo | Enquanto hover | Nao |
| Help Panel | Abertura de arquivo | Painel lateral dockado | Sessao | Sim |
| Status Bar Tip | Uso de feature | Texto na barra de status | 10s | Sim |
| Inline Doc | Digitar comando | Autocomplete com docs | Enquanto digita | Nao |
| Command Hint | Comando parcial | Sugestao abaixo do input | 8s | Sim |
| Level Up Toast | Mudanca de nivel | Notificacao especial | 8s | Sim |
| Tutorial Prompt | Deteccao de dificuldade | Card com link para tutorial | Ate acao | Sim |

### 9.4 Exemplos de Help Contextual

```yaml
# contextual-hints.yaml
hints:
  - trigger:
      kind: command_error
      pattern: "IDEIA init"
      error_contains: "not found"
    hint:
      message: "Parece que voce esta tentando criar um projeto. Tente: IDEIA init nome-do-projeto"
      priority: high
      action:
        label: "Ver tutoriais de iniciacao"
        command: "IDEIA tutorial list --category getting-started"

  - trigger:
      kind: idle_long
      threshold: 30
    hint:
      message: "Precisa de ajuda? Tente 'IDEIA --help' para ver todos os comandos disponiveis."
      priority: medium
      dismissible: true
      timeout: 10

  - trigger:
      kind: new_feature
      feature: "multiagent"
      level_required: advanced
    hint:
      message: "Novo recurso disponivel! Agora voce pode orquestrar workflows multiagente."
      priority: high
      action:
        label: "Ver Tutorial Multiagente"
        command: "IDEIA tutorial start tutorial-07-multiagent"

  - trigger:
      kind: file_type
      pattern: "*.py"
    hint:
      message: "Detectei um arquivo Python. Lembre-se que a IDEIA suporta geracao de codigo Python com o comando 'IDEIA generate'."
      priority: low
      dismissible: true

  - trigger:
      kind: repeated_action
      pattern: "IDEIA generate"
      count: 3
      window_minutes: 5
    hint:
      message: "Usando bastante 'generate'! Que tal tentar criar um workflow automatico com 'IDEIA agent workflow create'?"
      priority: medium
      action:
        label: "Explorar Workflows"
        command: "IDEIA agent workflow --help"
```

---

## 10. Feedback Loop

### 10.1 Coleta de Feedback

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FEEDBACK COLLECTION PIPELINE                          │
│                                                                              │
│  TUTORIAL → Step Complete → [Feedback Step?] → Coleta → Analytics          │
│  COMPLETION    |                                    |                        │
│                v                                    v                        │
│          [Quick Survey]                     [Qualitative]                    │
│          1. Foi facil? (1-5)               "O que poderia                  │
│          2. Tempo adequado?                 melhorar?"                     │
│          3. Recomendaria? (NPS)             "O que gostou?"                │
│                                                                              │
│  ONBOARDING → Passo X → [Feedback Points] → Coleta → Segmentacao           │
│  FLOW              |                                    |                    │
│                    v                                    v                    │
│              [Abandonment]                    [Cohort Analysis]              │
│              Onde parou?                     Usuario novo vs experiente      │
│              Por que?                        Stack vs dificuldade            │
│                                                                              │
│  CONTINUO → User Action → [Help Contextual] → Coleta → Melhoria Continua   │
│                         |                                                    │
│                         v                                                    │
│                   [Help Feedback]                                            │
│                   "Essa dica foi util?"                                     │
│                   [Sim] [Nao]                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Metricas de Sucesso

| Metrica | Defnition | Metodo de Coleta | Baseline | Meta 30d | Meta 90d |
|---------|-----------|-----------------|----------|----------|----------|
| Time-to-First-Task (TTFT) | Tempo entre primeiro acesso e primeiro comando bem-sucedido | Event tracking | 45 min | <15 min | <5 min |
| Tutorial Completion Rate | % de tutoriais iniciados que sao concluidos | Progress tracker | 0% (atual) | >60% | >80% |
| Onboarding Completion Rate | % de usuarios que completam onboarding flow | Onboarding tracker | 0% (atual) | >70% | >85% |
| NPS de Onboarding | "Recomendaria a IDEIA para um amigo?" (0-10) | Survey pos-onboarding | N/A (atual) | >30 | >50 |
| Feature Adoption Rate | % de features usadas apos desbloqueio | Usage analytics | ~12% (est.) | >40% | >60% |
| Time-to-Value (TTV) | Tempo ate primeiro deploy funcional | Event tracking | ~3h (est.) | <45min | <20min |
| Help Utilization Rate | % de usuarios que usam help contextual | Click tracking | 0% (atual) | >50% | >75% |
| Churn Rate (30d) | % de usuarios que nao retornam em 30 dias | Login tracking | N/A (atual) | <40% | <20% |
| Badge Earn Rate | Media de badges por usuario | Badge system | 0 | >3 | >8 |
| Streak Avg (7d) | Media de streak ativo em 7 dias | Streak system | 0 | >3 dias | >7 dias |
| Task Error Rate | % de comandos que resultam em erro | Error tracking | ~30% (est.) | <15% | <5% |
| CES (Customer Effort Score) | "Foi facil realizar o que queria?" (1-5) | Survey pos-task | N/A (atual) | >3.5 | >4.2 |

### 10.3 Ciclo de Feedback

```typescript
interface FeedbackCycle {
  collect(): FeedbackData[];
  analyze(): FeedbackInsights;
  prioritize(): ActionItem[];
  implement(): void;
  measure(): void; // mede impacto das mudancas

  // Ciclo semanal
  weekCycle: {
    monday: "collect surveys from previous week";
    tuesday: "analyze abandonment funnels";
    wednesday: "prioritize top 3 improvements";
    thursday: "implement quick wins";
    friday: "deploy and monitor";
  };

  // Canais de coleta
  channels: {
    inApp: InAppSurvey; // apos tutorial, apos comando
    email: EmailSurvey; // 24h apos primeiro uso
    nps: NPSSurvey; // semanal
    analytics: AnalyticsPipeline; // tracking continuo
    support: SupportTicket; // tickets de suporte
  };
}
```

---

## 11. Codigo Typescript

### 11.1 Tutorial Engine

```typescript
import { z } from "zod";
import { EventEmitter } from "events";
import { v4 as uuid } from "uuid";

// --- Types ---

type TutorialId = string;
type StepId = string;
type UserId = string;
type SessionId = string;

interface TutorialDefinition {
  id: TutorialId;
  version: string;
  title: string;
  description: string;
  category: string;
  level: "beginner" | "intermediate" | "advanced" | "expert";
  prerequisites: TutorialId[];
  estimated_time: number;
  tags?: string[];
  authoring: {
    author: string;
    created: string;
    updated: string;
    locale: string;
  };
  steps: TutorialStep[];
  branches?: TutorialBranch[];
  meta: {
    xp_reward: number;
    badges?: string[];
    unlocks?: string[];
    next_suggested?: TutorialId[];
    difficulty: number;
  };
}

interface TutorialStep {
  id: StepId;
  title: string;
  description: string;
  type: "action" | "verify" | "info" | "choice" | "quiz";
  action?: {
    kind: string;
    value?: string;
    command?: string;
    params?: Record<string, unknown>;
  };
  validation?: {
    kind: string;
    expected_match?: string;
    expected_contains?: string;
    expected_exit_code?: number;
    timeout: number;
  };
  hints?: string[];
  success_message?: string;
  failure_message?: string;
  links?: { label: string; url: string }[];
}

interface TutorialBranch {
  id: string;
  condition: {
    step: StepId;
    result: string;
    requires_hint?: boolean;
  };
  then: {
    description: string;
    bonus_xp?: number;
    unlocks?: string[];
  };
}

// --- State ---

interface SessionState {
  sessionId: SessionId;
  userId: UserId;
  tutorialId: TutorialId;
  startedAt: number;
  currentStep: number;
  stepResults: Map<StepId, StepResult>;
  hintsUsed: number;
  completed: boolean;
  abandoned: boolean;
  metadata: Record<string, unknown>;
}

interface StepResult {
  stepId: StepId;
  status: "pending" | "success" | "failure" | "skipped";
  startedAt: number;
  completedAt?: number;
  attempts: number;
  hintsUsed: number;
  error?: string;
  output?: string;
  metadata: Record<string, unknown>;
}

interface TutorialResult {
  sessionId: SessionId;
  tutorialId: TutorialId;
  completed: boolean;
  totalSteps: number;
  completedSteps: number;
  skippedSteps: number;
  failedSteps: number;
  xpEarned: number;
  badgesEarned: string[];
  timeSpent: number;
  hintsUsed: number;
  branchesActivated: string[];
  startedAt: number;
  completedAt: number;
}

// --- Validation Criteria ---

interface ValidationCriteria {
  kind: "terminal_open" | "command_output" | "content_check" | "file_exists" | "api_response" | "custom";
  expected_match?: string;
  expected_contains?: string;
  expected_exit_code?: number;
  target_file?: string;
  validator_id?: string;
  timeout: number;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  details?: Record<string, unknown>;
  matched?: string;
}

// --- Tutorial Registry ---

class TutorialRegistry {
  private tutorials: Map<TutorialId, TutorialDefinition> = new Map();
  private categories: Map<string, TutorialId[]> = new Map();
  private dependencies: Map<TutorialId, TutorialId[]> = new Map();

  register(def: TutorialDefinition): void {
    this.tutorials.set(def.id, def);
    const cat = this.categories.get(def.category) || [];
    cat.push(def.id);
    this.categories.set(def.category, cat);
    this.dependencies.set(def.id, def.prerequisites);
  }

  resolve(id: TutorialId): TutorialDefinition {
    const def = this.tutorials.get(id);
    if (!def) throw new Error(`Tutorial not found: ${id}`);
    return def;
  }

  getByLevel(level: string): TutorialDefinition[] {
    return Array.from(this.tutorials.values())
      .filter((t) => t.level === level);
  }

  getPrerequisites(id: TutorialId): TutorialDefinition[] {
    const def = this.resolve(id);
    return def.prerequisites
      .map((pid) => this.tutorials.get(pid))
      .filter((t): t is TutorialDefinition => t !== undefined);
  }

  search(query: string): TutorialDefinition[] {
    const q = query.toLowerCase();
    return Array.from(this.tutorials.values()).filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags?.some((tag) => tag.toLowerCase().includes(q))
    );
  }

  getNextSuggested(id: TutorialId): TutorialDefinition[] {
    const def = this.resolve(id);
    return (def.meta.next_suggested || [])
      .map((nid) => this.tutorials.get(nid))
      .filter((t): t is TutorialDefinition => t !== undefined);
  }
}

// --- Step Validator ---

class StepValidator {
  async validate(result: StepResult, criteria: ValidationCriteria): Promise<ValidationResult> {
    const startTime = Date.now();

    while (Date.now() - startTime < criteria.timeout * 1000) {
      const validationResult = await this.tryValidate(result, criteria);
      if (validationResult.valid) return validationResult;
      await this.sleep(500); // polling interval
    }

    return { valid: false, error: "Validation timeout" };
  }

  private async tryValidate(result: StepResult, criteria: ValidationCriteria): Promise<ValidationResult> {
    switch (criteria.kind) {
      case "terminal_open":
        return this.validateTerminalOpen(result);
      case "command_output":
        return this.validateCommandOutput(result, criteria);
      case "content_check":
        return this.validateContentCheck(result, criteria);
      case "file_exists":
        return this.validateFileExists(result, criteria);
      case "api_response":
        return this.validateApiResponse(result, criteria);
      case "custom":
        return this.validateCustom(result, criteria);
      default:
        return { valid: false, error: `Unknown validation kind: ${criteria.kind}` };
    }
  }

  private async validateCommandOutput(result: StepResult, criteria: ValidationCriteria): Promise<ValidationResult> {
    const output = result.output || "";
    if (criteria.expected_match && output.includes(criteria.expected_match)) {
      return { valid: true, matched: criteria.expected_match };
    }
    if (criteria.expected_contains && output.includes(criteria.expected_contains)) {
      return { valid: true, matched: criteria.expected_contains };
    }
    return { valid: false, error: `Output did not match expected pattern` };
  }

  private async validateFileExists(result: StepResult, criteria: ValidationCriteria): Promise<ValidationResult> {
    if (!criteria.target_file) return { valid: false, error: "No target file specified" };
    // Simulacao: em producao usar fs.access
    return { valid: true };
  }

  private async validateApiResponse(result: StepResult, criteria: ValidationCriteria): Promise<ValidationResult> {
    // Simulacao: em producao fazer chamada HTTP real
    return { valid: true };
  }

  private async validateTerminalOpen(result: StepResult): Promise<ValidationResult> {
    return { valid: true };
  }

  private async validateContentCheck(result: StepResult, criteria: ValidationCriteria): Promise<ValidationResult> {
    if (!criteria.target_file) return { valid: false, error: "No target file specified" };
    // Simulacao: em producao ler arquivo e verificar conteudo
    return { valid: true };
  }

  private async validateCustom(result: StepResult, criteria: ValidationCriteria): Promise<ValidationResult> {
    // Validacao customizada registrada externamente
    return { valid: true };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  generateHint(failure: ValidationResult): string {
    const hints: Record<string, string> = {
      "Output did not match": "Verifique se o comando foi digitado corretamente",
      "No target file specified": "O arquivo esperado nao foi encontrado",
      "Validation timeout": "A operacao levou mais tempo que o esperado",
    };
    for (const [pattern, hint] of Object.entries(hints)) {
      if (failure.error?.includes(pattern)) return hint;
    }
    return "Tente novamente. Use as dicas disponiveis para ajudar.";
  }
}

// --- Step Executor ---

class StepExecutor {
  constructor(
    private validator: StepValidator,
    private eventBus: EventEmitter
  ) {}

  async execute(step: TutorialStep, ctx: ExecutionContext): Promise<StepResult> {
    const result: StepResult = {
      stepId: step.id,
      status: "pending",
      startedAt: Date.now(),
      attempts: 0,
      hintsUsed: 0,
      metadata: {},
    };

    this.eventBus.emit("step:start", { stepId: step.id, tutorialId: ctx.tutorialId });

    while (result.attempts < 3 && result.status !== "success") {
      result.attempts++;
      this.eventBus.emit("step:attempt", { stepId: step.id, attempt: result.attempts });

      try {
        await this.renderStep(step, ctx);
        const output = await this.captureAction(step, ctx);
        result.output = output;

        if (step.validation) {
          const validationResult = await this.validator.validate(result, step.validation);
          if (validationResult.valid) {
            result.status = "success";
            result.completedAt = Date.now();
            this.eventBus.emit("step:complete", { stepId: step.id, result });
          } else {
            result.status = "failure";
            result.error = validationResult.error;
            this.eventBus.emit("step:failed", { stepId: step.id, error: validationResult.error });
          }
        } else {
          result.status = "success";
          result.completedAt = Date.now();
        }
      } catch (error) {
        result.status = "failure";
        result.error = error instanceof Error ? error.message : String(error);
      }
    }

    return result;
  }

  async executeAll(tutorial: TutorialDefinition, ctx: ExecutionContext): Promise<TutorialResult> {
    const totalSteps = tutorial.steps.length;
    let completedSteps = 0;
    let skippedSteps = 0;
    let failedSteps = 0;
    let hintsUsed = 0;
    const branchesActivated: string[] = [];

    for (let i = 0; i < tutorial.steps.length; i++) {
      const step = tutorial.steps[i];
      ctx.currentStep = i;

      const result = await this.execute(step, ctx);
      hintsUsed += result.hintsUsed;

      switch (result.status) {
        case "success":
          completedSteps++;
          break;
        case "skipped":
          skippedSteps++;
          break;
        case "failure":
          failedSteps++;
          break;
      }

      ctx.stepResults.set(step.id, result);

      // Verificar branches
      if (tutorial.branches) {
        for (const branch of tutorial.branches) {
          if (branch.condition.step === step.id) {
            const matches = this.evaluateBranch(branch, result, hintsUsed);
            if (matches) {
              branchesActivated.push(branch.id);
              if (branch.then.bonus_xp) {
                ctx.bonusXp += branch.then.bonus_xp;
              }
              if (branch.then.unlocks) {
                ctx.unlocks.push(...branch.then.unlocks);
              }
            }
          }
        }
      }
    }

    const timeSpent = Date.now() - ctx.session.createdAt;

    const tutorialResult: TutorialResult = {
      sessionId: ctx.session.sessionId,
      tutorialId: tutorial.id,
      completed: failedSteps === 0,
      totalSteps,
      completedSteps,
      skippedSteps,
      failedSteps,
      xpEarned: ctx.bonusXp + tutorial.meta.xp_reward,
      badgesEarned: tutorial.meta.badges || [],
      timeSpent,
      hintsUsed,
      branchesActivated,
      startedAt: ctx.session.createdAt,
      completedAt: Date.now(),
    };

    this.eventBus.emit("tutorial:complete", tutorialResult);
    return tutorialResult;
  }

  private evaluateBranch(branch: TutorialBranch, result: StepResult, hintsUsed: number): boolean {
    if (branch.condition.result === "completed_in_under") {
      const timeSpent = (result.completedAt || 0) - result.startedAt;
      return timeSpent < 5000; // 5 seconds
    }
    if (branch.condition.requires_hint !== undefined) {
      return hintsUsed > 0 === branch.condition.requires_hint;
    }
    return true;
  }

  private async renderStep(step: TutorialStep, ctx: ExecutionContext): Promise<void> {
    this.eventBus.emit("step:render", {
      stepId: step.id,
      title: step.title,
      description: step.description,
      type: step.type,
      hints: step.hints,
      links: step.links,
    });
  }

  private async captureAction(step: TutorialStep, ctx: ExecutionContext): Promise<string> {
    switch (step.action?.kind) {
      case "terminal_input":
        return this.executeTerminalCommand(step.action.value || "");
      case "command_palette":
        return this.executeCommandPalette(step.action.command || "");
      case "api_call":
        return this.executeApiCall(step.action.params as Record<string, unknown>);
      default:
        return "";
    }
  }

  private async executeTerminalCommand(command: string): Promise<string> {
    return command; // Simulacao
  }

  private async executeCommandPalette(command: string): Promise<string> {
    return `Executed: ${command}`;
  }

  private async executeApiCall(params: Record<string, unknown>): Promise<string> {
    return JSON.stringify(params);
  }

  skip(stepId: StepId): void {
    this.eventBus.emit("step:skipped", { stepId });
  }

  interrupt(): void {
    this.eventBus.emit("tutorial:interrupted");
  }
}

// --- Execution Context ---

interface ExecutionContext {
  session: SessionState;
  tutorialId: TutorialId;
  currentStep: number;
  stepResults: Map<StepId, StepResult>;
  bonusXp: number;
  unlocks: string[];
  environment: Record<string, unknown>;
}

// --- Progress Tracker ---

class ProgressTracker {
  private sessions: Map<SessionId, SessionState> = new Map();
  private userProgress: Map<UserId, UserProgress> = new Map();

  start(userId: UserId, tutorialId: TutorialId): SessionId {
    const sessionId = uuid();
    const session: SessionState = {
      sessionId,
      userId,
      tutorialId,
      startedAt: Date.now(),
      currentStep: 0,
      stepResults: new Map(),
      hintsUsed: 0,
      completed: false,
      abandoned: false,
      metadata: {},
    };
    this.sessions.set(sessionId, session);
    return sessionId;
  }

  completeStep(sessionId: SessionId, stepId: StepId, result: StepResult): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.stepResults.set(stepId, result);
      session.currentStep++;
      session.hintsUsed += result.hintsUsed;
    }
  }

  completeTutorial(sessionId: SessionId, result: TutorialResult): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.completed = true;
    }

    let progress = this.userProgress.get(result.sessionId);
    if (!progress) {
      progress = {
        userId: result.sessionId,
        completedTutorials: [],
        totalXp: 0,
        badges: [],
        currentStreak: 0,
        longestStreak: 0,
        lastActivity: Date.now(),
      };
    }
    progress.completedTutorials.push(result.tutorialId);
    progress.totalXp += result.xpEarned;
    progress.badges.push(...result.badgesEarned);
    progress.lastActivity = Date.now();
    this.userProgress.set(result.sessionId, progress);
  }

  getProgress(userId: UserId): UserProgress | null {
    return this.userProgress.get(userId) || null;
  }
}

// --- User Progress ---

interface UserProgress {
  userId: UserId;
  completedTutorials: TutorialId[];
  totalXp: number;
  badges: string[];
  currentStreak: number;
  longestStreak: number;
  lastActivity: number;
}

// --- Tutorial Engine (Facade) ---

class TutorialEngine {
  constructor(
    private registry: TutorialRegistry,
    private resolver: TutorialResolver,
    private executor: StepExecutor,
    private tracker: ProgressTracker,
    private eventBus: EventEmitter
  ) {}

  async startTutorial(userId: UserId, tutorialId: TutorialId): Promise<SessionId> {
    const tutorial = this.registry.resolve(tutorialId);

    // Verificar pre-requisitos
    const prerequisites = this.registry.getPrerequisites(tutorialId);
    const progress = this.tracker.getProgress(userId);

    if (prerequisites.length > 0) {
      const missing = prerequisites.filter(
        (p) => !progress?.completedTutorials.includes(p.id)
      );
      if (missing.length > 0) {
        throw new Error(
          `Pre-requisites not met: ${missing.map((p) => p.title).join(", ")}`
        );
      }
    }

    // Criar contexto
    const sessionId = this.tracker.start(userId, tutorialId);
    const ctx: ExecutionContext = {
      session: this.sessions.get(sessionId)!,
      tutorialId,
      currentStep: 0,
      stepResults: new Map(),
      bonusXp: 0,
      unlocks: [],
      environment: {},
    };

    // Executar tutorial assincronamente
    this.executor.executeAll(tutorial, ctx)
      .then((result) => this.tracker.completeTutorial(sessionId, result));

    return sessionId;
  }

  getRecommendedTutorials(userId: UserId): TutorialDefinition[] {
    return this.resolver.resolveRecommended(
      this.tracker.getProgress(userId),
      this.registry
    );
  }

  searchTutorials(query: string): TutorialDefinition[] {
    return this.registry.search(query);
  }

  private sessions = new Map<SessionId, SessionState>();
}

// --- Tutorial Resolver ---

class TutorialResolver {
  resolveRecommended(progress: UserProgress | null, registry: TutorialRegistry): TutorialDefinition[] {
    if (!progress) {
      return registry.getByLevel("beginner");
    }

    const allTutorials: TutorialDefinition[] = [];
    for (const level of ["beginner", "intermediate", "advanced", "expert"]) {
      allTutorials.push(...registry.getByLevel(level));
    }

    const completed = new Set(progress.completedTutorials);
    const xp = progress.totalXp;

    return allTutorials
      .filter((t) => !completed.has(t.id))
      .filter((t) => this.meetsLevelGate(t.level, xp))
      .filter((t) =>
        t.prerequisites.every((p) => completed.has(p))
      )
      .sort((a, b) => a.meta.difficulty - b.meta.difficulty);
  }

  private meetsLevelGate(level: string, xp: number): boolean {
    const gates: Record<string, number> = {
      beginner: 0,
      intermediate: 500,
      advanced: 1500,
      expert: 3000,
    };
    return xp >= (gates[level] || 0);
  }
}
```

### 11.2 Progressive Disclosure Engine

```typescript
// --- Progressive Disclosure ---

interface ProgressiveDisclosureConfig {
  levels: Record<UserLevel, LevelConfig>;
}

interface LevelConfig {
  xp_required: number;
  unlocks: {
    cli: string[];
    agents: string[];
    limits: {
      max_parallel_tasks: number;
      max_context_packs: number;
      max_workflow_steps: number;
    };
    features: string[];
  };
}

type UserLevel = "beginner" | "intermediate" | "advanced" | "expert";

class ProgressiveDisclosure {
  constructor(private config: ProgressiveDisclosureConfig) {}

  getLevel(xp: number): UserLevel {
    if (xp >= 3000) return "expert";
    if (xp >= 1500) return "advanced";
    if (xp >= 500) return "intermediate";
    return "beginner";
  }

  getUnlocksForLevel(level: UserLevel): LevelConfig["unlocks"] {
    return this.config.levels[level].unlocks;
  }

  getUnlocksForXp(xp: number): LevelConfig["unlocks"] {
    const level = this.getLevel(xp);
    return this.getUnlocksForLevel(level);
  }

  isUnlocked(feature: string, xp: number): boolean {
    const level = this.getLevel(xp);
    const unlocks = this.getUnlocksForLevel(level);
    return (
      unlocks.cli.includes(feature) ||
      unlocks.agents.includes(feature) ||
      unlocks.features.includes(feature)
    );
  }

  getNextLevelInfo(xp: number): {
    nextLevel: UserLevel | null;
    xpRequired: number;
    xpRemaining: number;
    willUnlock: string[];
  } | null {
    const levels: { level: UserLevel; xp: number }[] = [
      { level: "intermediate", xp: 500 },
      { level: "advanced", xp: 1500 },
      { level: "expert", xp: 3000 },
    ];

    for (const next of levels) {
      if (xp < next.xp) {
        const nextUnlocks = this.getUnlocksForLevel(next.level);
        return {
          nextLevel: next.level,
          xpRequired: next.xp,
          xpRemaining: next.xp - xp,
          willUnlock: [
            ...nextUnlocks.cli,
            ...nextUnlocks.agents,
            ...nextUnlocks.features,
          ],
        };
      }
    }

    return null; // ja e expert
  }
}

// --- Contextual Help Engine ---

interface HelpTrigger {
  kind: string;
  pattern?: string;
  threshold?: number;
  command?: string;
  error_contains?: string;
  feature?: string;
  level_required?: string;
  count?: number;
  window_minutes?: number;
}

interface HelpHint {
  message: string;
  priority: "low" | "medium" | "high";
  dismissible: boolean;
  timeout: number;
  action?: {
    label: string;
    command: string;
  };
}

class ContextualHelpEngine {
  private hints: Map<string, HelpHint[]> = new Map();
  private shownHints: Map<string, number> = new Map(); // hintId -> lastShown timestamp
  private sessionHintCount: Map<string, number> = new Map();

  registerHint(trigger: HelpTrigger, hint: HelpHint): void {
    const key = this.buildTriggerKey(trigger);
    const existing = this.hints.get(key) || [];
    existing.push(hint);
    this.hints.set(key, existing);
  }

  getHintForEvent(event: UserActivity): HelpHint | null {
    const key = this.buildEventKey(event);
    const matchingHints = this.hints.get(key) || [];

    for (const hint of matchingHints) {
      if (this.canShowHint(key, hint)) {
        this.recordHintShown(key);
        return hint;
      }
    }

    return null;
  }

  private canShowHint(key: string, hint: HelpHint): boolean {
    const lastShown = this.shownHints.get(key) || 0;
    const now = Date.now();
    const cooldown = 5 * 60 * 1000; // 5 minutos
    const sessionCount = this.sessionHintCount.get(key) || 0;

    return (
      now - lastShown > cooldown &&
      sessionCount < 3 // max 3 por sessao
    );
  }

  private recordHintShown(key: string): void {
    this.shownHints.set(key, Date.now());
    const count = this.sessionHintCount.get(key) || 0;
    this.sessionHintCount.set(key, count + 1);
  }

  private buildTriggerKey(trigger: HelpTrigger): string {
    return `${trigger.kind}:${trigger.pattern || trigger.command || trigger.feature || "*"}`;
  }

  private buildEventKey(event: UserActivity): string {
    return `${event.kind}:${event.value || event.command || "*"}`;
  }

  resetSession(): void {
    this.sessionHintCount.clear();
  }
}

interface UserActivity {
  kind: string;
  value?: string;
  command?: string;
  error?: string;
  timestamp: number;
}

// --- Badge System ---

interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  rarity: "common" | "uncommon" | "rare" | "legendary";
  requirements: {
    type: string;
    target: number | string;
    sub_requirements?: { type: string; target: number | string }[];
  };
  rewards: {
    xp: number;
    unlocks?: string[];
    title?: string;
  };
  hidden: boolean;
  max_progress: number;
}

class BadgeSystem {
  private badges: Map<string, BadgeDefinition> = new Map();
  private userBadges: Map<UserId, Set<string>> = new Map();
  private xpMultiplier = 1;

  registerBadge(badge: BadgeDefinition): void {
    this.badges.set(badge.id, badge);
  }

  async evaluateBadges(userId: UserId, progress: UserProgress): Promise<string[]> {
    const earned: string[] = [];
    const userBadgeSet = this.userBadges.get(userId) || new Set();

    for (const [id, badge] of this.badges) {
      if (userBadgeSet.has(id)) continue;

      if (await this.meetsRequirements(badge, progress)) {
        userBadgeSet.add(id);
        earned.push(id);
        progress.totalXp += badge.rewards.xp * this.xpMultiplier;
      }
    }

    this.userBadges.set(userId, userBadgeSet);
    return earned;
  }

  private async meetsRequirements(badge: BadgeDefinition, progress: UserProgress): Promise<boolean> {
    switch (badge.requirements.type) {
      case "tutorial_complete":
        return progress.completedTutorials.length >= (badge.requirements.target as number);
      case "xp_total":
        return progress.totalXp >= (badge.requirements.target as number);
      case "streak_days":
        return progress.currentStreak >= (badge.requirements.target as number);
      default:
        return false;
    }
  }

  getUserBadges(userId: UserId): BadgeDefinition[] {
    const userSet = this.userBadges.get(userId) || new Set();
    return Array.from(userSet)
      .map((id) => this.badges.get(id))
      .filter((b): b is BadgeDefinition => b !== undefined);
  }

  setXpMultiplier(multiplier: number): void {
    this.xpMultiplier = multiplier;
  }
}

// --- Streak System ---

class StreakSystem {
  private userStreaks: Map<UserId, StreakData> = new Map();

  recordActivity(userId: UserId): void {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    let streak = this.userStreaks.get(userId);

    if (!streak) {
      streak = { currentStreak: 1, longestStreak: 1, lastActivity: today, history: [] };
      this.userStreaks.set(userId, streak);
      return;
    }

    const lastDate = new Date(streak.lastActivity);
    const diffDays = this.daysBetween(lastDate, now);

    if (diffDays === 0) return; // ja registrado hoje
    if (diffDays === 1) {
      streak.currentStreak++;
    } else {
      streak.currentStreak = 1;
    }

    streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
    streak.lastActivity = today;
    streak.history.push({ date: today, xpEarned: 0, tutorialsCompleted: 0, commandsExecuted: 0 });
  }

  getStreak(userId: UserId): number {
    return this.userStreaks.get(userId)?.currentStreak || 0;
  }

  getXpMultiplier(streak: number): number {
    if (streak >= 30) return 3;
    if (streak >= 15) return 2.5;
    if (streak >= 8) return 2;
    if (streak >= 4) return 1.5;
    return 1;
  }

  private daysBetween(a: Date, b: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    const aNorm = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    const bNorm = new Date(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.floor((bNorm.getTime() - aNorm.getTime()) / msPerDay);
  }
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivity: string;
  history: StreakDay[];
}

interface StreakDay {
  date: string;
  xpEarned: number;
  tutorialsCompleted: number;
  commandsExecuted: number;
}

// --- Analytics Collector ---

interface TutorialAnalytics {
  tutorialId: TutorialId;
  totalStarts: number;
  totalCompletions: number;
  totalAbandonments: number;
  averageTime: number;
  averageHints: number;
  stepDropoffs: Map<StepId, number>; // quantos usuarios pararam em cada passo
  commonErrors: Map<string, number>;
  averageXpEarned: number;
  completionRate: number;
}

class AnalyticsCollector {
  private events: AnalyticsEvent[] = [];
  private tutorials: Map<TutorialId, TutorialAnalytics> = new Map();

  record(event: AnalyticsEvent): void {
    this.events.push(event);
    this.updateTutorialAnalytics(event);
  }

  private updateTutorialAnalytics(event: AnalyticsEvent): void {
    if (event.type !== "tutorial") return;

    let analytics = this.tutorials.get(event.tutorialId);
    if (!analytics) {
      analytics = {
        tutorialId: event.tutorialId,
        totalStarts: 0,
        totalCompletions: 0,
        totalAbandonments: 0,
        averageTime: 0,
        averageHints: 0,
        stepDropoffs: new Map(),
        commonErrors: new Map(),
        averageXpEarned: 0,
        completionRate: 0,
      };
      this.tutorials.set(event.tutorialId, analytics);
    }

    if (event.action === "start") analytics.totalStarts++;
    if (event.action === "complete") analytics.totalCompletions++;
    if (event.action === "abandon") analytics.totalAbandonments++;

    analytics.completionRate =
      analytics.totalStarts > 0
        ? analytics.totalCompletions / analytics.totalStarts
        : 0;
  }

  getTutorialAnalytics(tutorialId: TutorialId): TutorialAnalytics | null {
    return this.tutorials.get(tutorialId) || null;
  }

  generateReport(): AnalyticsReport {
    return {
      tutorials: Array.from(this.tutorials.values()),
      totalEvents: this.events.length,
      generatedAt: Date.now(),
    };
  }

  getAbandonmentFunnel(tutorialId: TutorialId): { step: StepId; dropoff: number }[] {
    const analytics = this.tutorials.get(tutorialId);
    if (!analytics) return [];
    return Array.from(analytics.stepDropoffs.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([step, count]) => ({ step, dropoff: count }));
  }
}

interface AnalyticsEvent {
  type: "tutorial" | "onboarding" | "command" | "help" | "badge";
  tutorialId?: TutorialId;
  stepId?: StepId;
  action: string;
  userId: UserId;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface AnalyticsReport {
  tutorials: TutorialAnalytics[];
  totalEvents: number;
  generatedAt: number;
}
```

### 11.3 Exemplo Completo de Tutorial YAML

```yaml
# tutorials/getting-started/tutorial-01-first-command.yaml
id: tutorial-01-first-command
version: "1.0"
title: "Primeiro Comando"
description: "Aprenda a executar seu primeiro comando na IDEIA. Este tutorial cobre a abertura do terminal integrado, execucao do comando --help e identificacao do comando init."
category: "getting-started"
level: beginner
prerequisites: []
estimated_time: 5
tags:
  - cli
  - basics
  - first-steps

authoring:
  author: "IDEIA Team"
  created: "2026-07-22"
  updated: "2026-07-22"
  locale: "pt-BR"

steps:
  - id: open-terminal
    title: "Abrir terminal integrado"
    description: "Abra o terminal integrado da IDEIA usando Ctrl+Shift+P e digitando 'IDEIA: Open Terminal'"
    type: action
    action:
      kind: command_palette
      command: "IDEIA: Open Terminal"
    validation:
      kind: terminal_open
      timeout: 30
    hints:
      - "Use o atalho Ctrl+Shift+P para abrir a paleta de comandos"
      - "Digite 'IDEIA: Open Terminal' para filtrar rapidamente"
    success_message: "Terminal aberto com sucesso!"
    failure_message: "Nao foi possivel abrir o terminal. Tente novamente."

  - id: run-help
    title: "Executar IDEIA --help"
    description: "Digite 'IDEIA --help' no terminal e pressione Enter"
    type: action
    action:
      kind: terminal_input
      value: "IDEIA --help"
    validation:
      kind: command_output
      expected_match: "Usage:"
      timeout: 10
    hints:
      - "Digite exatamente: IDEIA --help"
      - "Nao esqueca do espaco antes de --help"
    success_message: "Comando executado! Voce ja esta usando a IDEIA."
    failure_message: "Comando nao reconhecido. Verifique se a IDEIA esta instalada."

  - id: identify-init
    title: "Encontrar comando init"
    description: "O help mostra todos os comandos. Procure pelo comando 'init' na listagem."
    type: verify
    action:
      kind: read_output
    validation:
      kind: content_check
      expected_contains: "init"
      timeout: 60
    hints:
      - "O comando init esta na secao 'Project Commands'"
      - "Use a barra de rolagem para ver a listagem completa"
    success_message: "Voce encontrou o comando 'init'! Ele inicializa novos projetos."
    failure_message: "Nao encontrou? O comando 'init' esta entre os comandos de projeto."

branches:
  - id: branch-speed
    condition:
      step: run-help
      result: completed_in_under: 5
    then:
      description: "Execucao rapida! Bonus de velocidade."
      bonus_xp: 50

  - id: branch-hints
    condition:
      step: identify-init
      requires_hint: true
    then:
      description: "Bom uso das dicas! Continue praticando."
      unlocks: ["tutorial-02-hello-world"]

meta:
  xp_reward: 100
  badges: ["first-command"]
  unlocks: ["capability:cli:basic"]
  next_suggested: ["tutorial-02-hello-world"]
  difficulty: 1
```

---

## 12. Conexoes com Outros Estudos

### 12.1 Matriz de Conexoes

| Estudo | Relacao | Sinergia |
|--------|---------|----------|
| **E4 — UX** | Base de design | Jornada do usuario, metricas NPS/SUS/CES, design system para componentes de tutorial |
| **S19 — Prompts** | Engine de ajuda | Help contextual usa templates de prompt, hints sao gerados por IA |
| **S25 — Perfis** | Niveis de usuario | Progressive disclosure usa niveis de proficiencia definidos em S25 |
| **S27 — Capability Registry** | Feature gates | Unlocks de tutoriais mapeiam para capacidades registradas em S27 |
| **S28 — Zero-to-Deploy** | Pipeline de valor | T05 (Deploy) e uma etapa do pipeline zero-to-deploy |
| **S2 — Memoria** | Progresso persistente | Mem0 armazena progresso do usuario e estado do tutorial |
| **S5 — Multiagente** | Conteudo avancado | T07 ensina orquestracao multiagente |
| **S11 — Theia** | Plugin SDK | T06 ensina criacao de plugins Theia |
| **S14 — Autenticacao** | Perfil de usuario | Perfil do usuario alimenta recomendacoes de tutorial |
| **S20 — Plugins** | Extensibilidade | Tutoriais podem ser estendidos via plugins |

### 12.2 Integracao com E4 (UX)

O sistema de onboarding e tutoriais implementa as seguintes metricas definidas em E4:

- **Time-to-First-Task (TTFT):**Medido pelo T01 (Primeiro Comando)
- **Task Success Rate (TSR):**Medido pelo completion rate de cada tutorial
- **System Usability Scale (SUS):**Survey apos completar 3 tutoriais
- **Customer Effort Score (CES):**Feedback apos cada passo do tutorial
- **NPS:**Survey semanal coletado pelo feedback loop

### 12.3 Integracao com S19 (Prompts)

O help contextual utiliza o sistema de prompts definido em S19:

```typescript
// O help contextual usa templates de prompt
const helpPromptTemplate = `
Contexto atual do usuario:
- Comando atual: {{currentCommand}}
- Erro: {{lastError}}
- Nivel: {{userLevel}}
- Tutoriais completos: {{completedTutorials}}

Gere uma dica contextual especifica e acionavel.
A dica deve:
1. Ter no maximo 100 caracteres
2. Incluir um comando especifico se relevante
3. Sugerir um tutorial se o usuario estiver com dificuldade
`;
```

### 12.4 Integracao com S27 (Capability Registry)

Cada unlock de tutorial mapeia para uma capability registrada:

```typescript
const capabilityMapping: Record<string, string> = {
  "capability:cli:basic": "cli-basic-usage",
  "capability:project:basic": "project-init",
  "capability:project:fullstack": "project-fullstack",
  "capability:generate:code": "code-generation",
  "capability:database:basic": "database-setup",
  "capability:integrations:rest": "rest-integration",
  "capability:api:advanced": "api-advanced",
  "capability:deploy:docker": "docker-deploy",
  "capability:infra:basic": "infrastructure",
  "capability:plugins:theia": "theia-plugin-dev",
  "capability:agents:workflow": "agent-workflow",
  "capability:orchestration": "multi-agent-orchestration",
  "capability:context:custom-packs": "context-pack-creation",
  "capability:governance:rules": "governance-rules",
};
```

---

## 13. Plano de Implementacao

### 13.1 Fases

| Fase | Descricao | Duração | Dependencias | Entregaveis |
|------|-----------|---------|-------------|-------------|
| Fase 0 | Fundacao | 2 semanas | Nenhuma | Schema YAML, Registry, Parser, Tutorial Engine core |
| Fase 1 | Biblioteca Inicial | 2 semanas | Fase 0 | T01-T04 implementados, Step Validator, Progress Tracker |
| Fase 2 | Progressive Disclosure | 1 semana | Fase 0 | Level system, feature gates, unlock mechanism |
| Fase 3 | Gamificacao | 2 semanas | Fase 1 | Badge system, Streak, XP, Leaderboard |
| Fase 4 | Onboarding Flow | 2 semanas | Fase 1 | Welcome tour, Quickstart Wizard, first-project flow |
| Fase 5 | Help Contextual | 2 semanas | Fase 2 | Context Detector, Hint System, Inline Docs |
| Fase 6 | Biblioteca Avancada | 2 semanas | Fase 3 | T05-T08 implementados |
| Fase 7 | Feedback Loop | 1 semana | Fase 4 | Surveys, Analytics Dashboard, Reports |
| Fase 8 | Polimento e Integracao | 2 semanas | Fases 2-7 | UI polish, performance, testes E2E |

### 13.2 Tasks Detalhadas

```
Fase 0 — Fundacao (14 dias)
  [TUT-001] Definir schema YAML de tutorial (Zod validation)
  [TUT-002] Implementar TutorialRegistry com carregamento de diretorio
  [TUT-003] Implementar YAML Parser com validacao de schema
  [TUT-004] Implementar TutorialEngine facade
  [TUT-005] Implementar StepExecutor basico (acao terminal)
  [TUT-006] Implementar StepValidator com 4 kinds de validacao
  [TUT-007] Implementar ProgressTracker com persistencia SQLite
  [TUT-008] Escrever testes unitarios para core components
  [TUT-009] Documentar API do Tutorial Engine

Fase 1 — Biblioteca Inicial (14 dias)
  [TUT-010] Criar T01 — Primeiro Comando (YAML + validacao)
  [TUT-011] Criar T02 — Hello World (YAML + validacao)
  [TUT-012] Criar T03 — CRUD Completo (YAML + validacao)
  [TUT-013] Criar T04 — Integracao com API (YAML + validacao)
  [TUT-014] Implementar InteractiveSession (sandbox mode)
  [TUT-015] Implementar StepRenderer (CLI output formatado)
  [TUT-016] Implementar HintGenerator com fallback hierarchy
  [TUT-017] Implementar ramificacoes (branches) no executor
  [TUT-018] Testar T01-T04 com usuarios reais

Fase 2 — Progressive Disclosure (7 dias)
  [TUT-019] Definir niveis de usuario (Beginner/Intermediate/Advanced/Expert)
  [TUT-020] Implementar ProgressiveDisclosureEngine
  [TUT-021] Mapear feature gates para capabilities (integracao S27)
  [TUT-022] Implementar TutorialResolver (recomendacoes por nivel)
  [TUT-023] Implementar LevelGate no executor de tutorial
  [TUT-024] Testar fluxo de desbloqueio progressivo

Fase 3 — Gamificacao (14 dias)
  [TUT-025] Implementar BadgeSystem com 18 badges
  [TUT-026] Implementar XP tracking e calculo
  [TUT-027] Implementar StreakSystem com persistencia
  [TUT-028] Implementar Achievement evaluator
  [TUT-029] Implementar multiplicador de XP por streak
  [TUT-030] Criar dashboard de progresso do usuario
  [TUT-031] Implementar leaderboard (opcional)
  [TUT-032] Testar gamificacao com usuarios

Fase 4 — Onboarding Flow (14 dias)
  [TUT-033] Implementar OnboardingFlow controller
  [TUT-034] Criar Welcome screen (boas-vindas)
  [TUT-035] Criar Tour Guiado (5 telas da interface)
  [TUT-036] Implementar Quickstart Wizard (multi-step form)
  [TUT-037] Implementar configuracao inicial assistida
  [TUT-038] Integrar onboarding com primeira execucao de tutorial
  [TUT-039] Implementar onboarding progress tracker
  [TUT-040] Testar onboarding flow completo

Fase 5 — Help Contextual (14 dias)
  [TUT-041] Implementar ContextDetector (activity monitor)
  [TUT-042] Implementar HelpResolver (triggers + hints)
  [TUT-043] Criar 10 hints contextuais pre-definidas
  [TUT-044] Implementar Hint renderer (toast/tooltip/panel)
  [TUT-045] Implementar inline documentation viewer
  [TUT-046] Implementar comando IDEIA help contextual
  [TUT-047] Integrar help contextual com S19 (prompt templates)
  [TUT-048] Testar help contextual em cenario real

Fase 6 — Biblioteca Avancada (14 dias)
  [TUT-049] Criar T05 — Deploy Local (YAML + validacao)
  [TUT-050] Criar T06 — Plugin Theia (YAML + validacao)
  [TUT-051] Criar T07 — Multiagente (YAML + validacao)
  [TUT-052] Criar T08 — Custom Context Pack (YAML + validacao)
  [TUT-053] Implementar tutorial branching avancado
  [TUT-054] Implementar validacao customizada (plugin API)
  [TUT-055] Testar T05-T08 com usuarios avancados

Fase 7 — Feedback Loop (7 dias)
  [TUT-056] Implementar feedback collection pipeline
  [TUT-057] Criar surveys pos-tutorial (NPS, CES)
  [TUT-058] Implementar AnalyticsCollector com eventos
  [TUT-059] Criar Dashboard de metricas de onboarding
  [TUT-060] Implementar relatorios de abandonment funnel
  [TUT-061] Integrar metricas com pipeline de melhoria continua

Fase 8 — Polimento e Integracao (14 dias)
  [TUT-062] UI polish de todos os componentes
  [TUT-063] Implementar modo offline para tutoriais
  [TUT-064] Performance tuning (lazy loading de tutoriais)
  [TUT-065] Testes E2E com Playwright
  [TUT-066] Documentacao completa do sistema
  [TUT-067] Integracao com CLI (comando IDEIA tutorial)
  [TUT-068] Integracao com Theia (widget de tutorial)
  [TUT-069] Release v1 do sistema de tutoriais
```

### 13.3 Estimativa de Esforco

| Fase | Dias | Desenvolvedores | Horas | Custo Relativo |
|------|------|----------------|-------|---------------|
| Fase 0 | 14 | 2 | 224 | 15% |
| Fase 1 | 14 | 2 | 224 | 15% |
| Fase 2 | 7 | 1 | 56 | 4% |
| Fase 3 | 14 | 1 | 112 | 8% |
| Fase 4 | 14 | 2 | 224 | 15% |
| Fase 5 | 14 | 2 | 224 | 15% |
| Fase 6 | 14 | 1 | 112 | 8% |
| Fase 7 | 7 | 1 | 56 | 4% |
| Fase 8 | 14 | 2 | 224 | 15% |
| **Total** | **112** | — | **1,456** | **100%** |

### 13.4 Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Baixa adocao de tutoriais | Media | Alto | Gamificacao + recomendacao contextual |
| Tutoriais desatualizados | Alta | Medio | CI/CD verifica tutoriais contra API atual |
| Usuarios avançados ignoram | Media | Baixo | Tutoriais sao pulaveis, nivel livre disponivel |
| Complexidade de autovalidacao | Alta | Alto | Fallback para validacao manual + hints ricos |
| Manutencao de 8+ tutoriais | Media | Medio | Testes E2E automatizados para cada tutorial |
| Feedback loop ignorado | Baixa | Medio | Coleta automatica sem friccao para o usuario |

---

## Referencias

- **E4:** ESTUDO-UX-EXPERIENCIA-USUARIO.md — Metricas de UX, jornada do usuario
- **S19:** ESTUDO-ENGENHARIA-PROMPTS-AGENTES.md — Templates de prompt para help contextual
- **S25:** ESTUDO-AJUSTES-USUARIO-PERFIS-CONFIGURACAO.md — Perfis e niveis de usuario
- **S27:** Capability Registry — Feature gates e capacidades
- **S28:** Zero-to-Deploy — Pipeline de valor completo
- **S11:** THEIA-IDEIA-RESEARCH.md — Integracao com Theia
- **Duolingo:** Gamificacao, streaks, badges (referencia externa)
- **GitHub Learning Lab:** Tutoriais interativos (referencia externa)
- **VSCode Get Started:** Onboarding flow (referencia externa)
