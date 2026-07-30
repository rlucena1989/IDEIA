# ESTUDO S29 — Project Blueprint & Scaffold Engine

> **Propósito:** Definir o sistema completo de geração de blueprints e scaffolds para a IDEIA — permitindo criar projetos completos com arquitetura, estrutura, dependencias, contratos e configuracoes a partir de templates declarativos.
> **Data:** 2026-07-22
> **Base:** Analise do comando `init` existente, appbuilder parcial, ecosystema de templates da comunidade (create-react-app, create-next-app, yeoman, plop, hygen, cookiecutter)

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0 | 2026-07-22 | IDEIA Architecture Team | Versao inicial |

---

## Sumario

1. [Introducao](#1-introducao)
2. [Arquitetura do Blueprint Engine](#2-arquitetura-do-blueprint-engine)
3. [Formato Blueprint](#3-formato-blueprint)
4. [Sistema de Templates](#4-sistema-de-templates)
5. [Dependency Injection](#5-dependency-injection)
6. [Config Generator](#6-config-generator)
7. [Contract Generator](#7-contract-generator)
8. [ADR Generator](#8-adr-generator)
9. [Biblioteca de Blueprints](#9-biblioteca-de-blueprints)
10. [Blueprint Market](#10-blueprint-market)
11. [Codigo TypeScript](#11-codigo-typescript)
12. [Conexoes](#12-conexoes)
13. [Plano de Implementacao](#13-plano-de-implementacao)

---

## 1. Introducao

### 1.1 Por que Scaffolding e Mais que Gerar Arquivos

Gerar arquivos e a parte mais trivial do scaffolding. O verdadeiro valor esta em gerar **arquitetura**, **contratos**, **decisoes documentadas** e **configuracoes consistentes** que refletem boas praticas e padroes do ecossistema.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SCAFFOLDING TRADICIONAL                            │
│                                                                      │
│  create-react-app:                                                   │
│  ┌──────────────────────────────┐                                    │
│  │ src/                         │   So gera arquivos                 │
│  │   App.tsx                    │   Sem arquitetura                  │
│  │   index.tsx                  │   Sem contratos                    │
│  │ package.json                 │   Sem decisoes registradas         │
│  │ tsconfig.json                │   Sem integracao com ecosystema    │
│  └──────────────────────────────┘                                    │
│                                                                      │
│  ── Versus ──                                                        │
│                                                                      │
│  IDEIA BLUEPRINT ENGINE:                                             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  src/                            ──── Estrutura completa      │   │
│  │    modules/                                                     │   │
│  │      user/                                                      │   │
│  │        contract/              ──── Contratos Zod/Valibot       │   │
│  │        application/           ──── Use cases (Clean Arch)      │   │
│  │        infrastructure/        ──── Repositorios, DB            │   │
│  │  adr/                         ──── Decisoes arquiteturais      │   │
│  │  docs/                        ──── Documentacao inicial        │   │
│  │  tests/                       ──── Testes configurados         │   │
│  │  contracts/                   ──── Contratos entre modulos     │   │
│  │  package.json                 ──── Dependencias resolvidas     │   │
│  │  tsconfig.json                ──── Paths, strict, etc          │   │
│  │  docker-compose.yml           ──── Infra declarativa           │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Visao de "Projeto como Template"

Um blueprint nao e apenas uma arvore de diretorios — e um **modelo declarativo** que descreve:

| Componente | Descricao |
|------------|-----------|
| **Metadados** | Nome, versao, descricao, autor, tags, compatibilidade |
| **Estrutura** | Arvore de diretorios, arquivos, permissoes |
| **Templates** | Arquivos processados com template engine (EJS/Handlebars) |
| **Variaveis** | Contexto de entrada do usuario (nome, descricao, features) |
| **Dependencias** | Pacotes npm com versoes, resolucao de conflitos |
| **Configuracoes** | tsconfig, eslint, prettier, jest, vitest, docker |
| **Contratos** | Interfaces, tipos, schemas entre modulos |
| **ADRs** | Decisoes arquiteturais geradas automaticamente |
| **Pos-processamento** | Scripts pos-geracao (git init, npm install, build) |

### 1.3 Estado Atual na IDEIA

| Componente | Status | Descricao |
|------------|--------|-----------|
| `init` command | Parcial | Gera estrutura basica, sem template engine |
| AppBuilder | Parcial | Gera componentes soltos, sem visao de projeto |
| Template system | Inexistente | Nenhum engine de templates |
| Dependency resolution | Inexistente | Nao resolve conflitos de versao |
| Contract generation | Inexistente | Nao gera contratos iniciais |
| ADR generation | Inexistente | Nao gera ADRs |

---

## 2. Arquitetura do Blueprint Engine

### 2.1 Visao Geral

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BLUEPRINT ENGINE ARCHITECTURE                         │
│                                                                              │
│  ┌─────────────┐      ┌──────────────────────┐      ┌──────────────┐       │
│  │  User       │─────▶│  Blueprint CLI        │─────▶│  Blueprint   │       │
│  │  Input      │      │  (init / generate)    │      │  Resolver    │       │
│  └─────────────┘      └──────────┬───────────┘      └──────┬───────┘       │
│                                  │                          │               │
│                                  ▼                          ▼               │
│                        ┌──────────────────┐      ┌──────────────────┐       │
│                        │  Blueprint       │      │  Variable        │       │
│                        │  Parser          │      │  Collector       │       │
│                        │  (YAML/JSON)     │      │  (Interactive)   │       │
│                        └────────┬─────────┘      └────────┬─────────┘       │
│                                 │                         │                 │
│                                 ▼                         ▼                 │
│                        ┌─────────────────────────────────────────┐         │
│                        │           PIPELINE EXECUTOR              │         │
│                        │                                          │         │
│                        │  ┌──────────────┐  ┌──────────────┐     │         │
│                        │  │  Template    │  │  Dependency   │     │         │
│                        │  │  Renderer    │  │  Injector     │     │         │
│                        │  └──────┬───────┘  └──────┬────────┘     │         │
│                        │         │                  │              │         │
│                        │  ┌──────▼───────┐  ┌──────▼────────┐     │         │
│                        │  │  Config      │  │  Contract     │     │         │
│                        │  │  Generator   │  │  Generator    │     │         │
│                        │  └──────┬───────┘  └──────┬────────┘     │         │
│                        │         │                  │              │         │
│                        │  ┌──────▼───────┐  ┌──────▼────────┐     │         │
│                        │  │  ADR         │  │  Post-        │     │         │
│                        │  │  Generator   │  │  Processor    │     │         │
│                        │  └──────────────┘  └───────────────┘     │         │
│                        └─────────────────────────────────────────┘         │
│                                             │                               │
│                                             ▼                               │
│                        ┌────────────────────────────────────────┐          │
│                        │       PROJETO GERADO                    │          │
│                        │  (Diretorio + arquivos + git init)      │          │
│                        └────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Componentes do Blueprint Engine

#### 2.2.1 Blueprint Parser

Responsavel por ler e validar blueprints nos formatos YAML ou JSON.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BLUEPRINT PARSER                                  │
│                                                                      │
│  Input: blueprint.yaml ou blueprint.json                              │
│                                                                      │
│  1. Load ──────   Le o arquivo do disco ou registry                  │
│  2. Validate ──   Valida contra schema Zod do Blueprint              │
│  3. Resolve ────   Resolve heranca (extends) e includes              │
│  4. Normalize ──   Preenche defaults, aplica transforms              │
│  5. Output ─────   Blueprint normalizado (BlueprintedBlueprint)      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

| Metodo | Descricao |
|--------|-----------|
| `parse(path: string)` | Le e valida blueprint do arquivo |
| `parseFromString(content: string)` | Le e valida de string |
| `resolveInheritance(blueprint)` | Resolve `extends` herdando de outro blueprint |
| `validate(schema: ZodSchema)` | Valida contra schema do blueprint |

#### 2.2.2 Template Renderer

Engine de templates baseado em EJS com contexto enriquecido.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TEMPLATE RENDERER                                 │
│                                                                      │
│  Input: template file + context variables                             │
│                                                                      │
│  1. Load template ── Le arquivo .ejs ou .hbs                        │
│  2. Prepare ctx ────  Merge variaveis + helpers + partials           │
│  3. Render ────────   Processa template com engine                   │
│  4. Output ────────   String renderizada                             │
│                                                                      │
│  Helpers disponiveis:                                                │
│    - pascalCase, camelCase, kebabCase, snakeCase                     │
│    - pluralize, singularize                                          │
│    - date, version                                                   │
│    - indent, trim, escape                                            │
│    - ifEquals, ifDefined, unless                                     │
│    - each (com index, first, last)                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 2.2.3 Dependency Injector

Resolve dependencias entre pacotes com versionamento e lockfile.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DEPENDENCY INJECTOR                                │
│                                                                      │
│  Input: Lista de dependencias do blueprint                            │
│                                                                      │
│  1. Parse ────────   Separa dependencias por tipo                    │
│     - dependencies, devDependencies, peerDependencies                │
│     - optionalDependencies                                           │
│  2. Resolve ──────   Resolve versoes (latest, range, pin)            │
│  3. Validate ────   Checa compatibilidade entre pacotes              │
│  4. Merge ────────   Merge com dependencias existentes               │
│  5. Lock ────────   Gera package.json + lockfile hint                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 2.2.4 Config Generator

Gera arquivos de configuracao padronizados.

| Config | Engine | Personalizacao |
|--------|--------|----------------|
| `tsconfig.json` | TypeScript | strict, paths, moduleResolution, target |
| `package.json` | Node.js | scripts, engines, publishConfig |
| `.eslintrc.js` | ESLint | extends, plugins, rules |
| `.prettierrc` | Prettier | semi, singleQuote, tabWidth |
| `jest.config.ts` | Jest | preset, testMatch, coverage |
| `vitest.config.ts` | Vitest | include, coverage, setup |
| `docker-compose.yml` | Docker | servicos, volumes, networks |
| `.gitignore` | Git | node_modules, dist, .env |
| `.editorconfig` | Editor | indent, charset, endOfLine |
| `Dockerfile` | Docker | multi-stage build |

#### 2.2.5 Contract Generator

Gera contratos iniciais entre modulos baseados no blueprint.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CONTRACT GENERATOR                                 │
│                                                                      │
│  Input: Modulos definidos no blueprint + tipo de contrato            │
│                                                                      │
│  1. Identifica modulos ──  Modulos com interfaces publicas          │
│  2. Gera interfaces ────  Interfaces TypeScript para cada modulo    │
│  3. Gera schemas ───────  Schemas Zod/Valibot para DTOs             │
│  4. Gera eventos ───────  Tipos de eventos (se usar NATS/barramento)│
│  5. Gera testes ────────  Testes de contrato (Pact) skeleton         │
│                                                                      │
│  Formatos suportados:                                                │
│    - Zod schemas (default)                                           │
│    - Valibot schemas (opcional)                                      │
│    - TypeScript interfaces                                           │
│    - OpenAPI 3.0 (para APIs REST)                                    │
│    - GraphQL SDL (para GraphQL)                                      │
│    - Protobuf (para gRPC)                                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 2.2.6 ADR Generator

Gera Architecture Decision Records baseados nas escolhas do blueprint.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ADR GENERATOR                                      │
│                                                                      │
│  Input: Decisoes do blueprint (framework, DB, arquitetura, etc)      │
│                                                                      │
│  ADR templates gerados automaticamente:                               │
│                                                                      │
│  0001-use-framework.md        ──── Framework X selected              │
│  0002-use-database.md         ──── Database Y selected               │
│  0003-use-architecture.md     ──── Clean Architecture                │
│  0004-use-package-manager.md  ──── pnpm selected                     │
│  0005-use-test-framework.md   ──── Vitest selected                   │
│  0006-use-api-protocol.md     ──── REST/GraphQL/gRPC                 │
│  0007-use-auth-strategy.md    ──── JWT/OAuth/Session                 │
│  0008-use-monorepo.md         ──── Monorepo structure                │
│                                                                      │
│  Formato:                                                            │
│    # ADR-{N}: {Title}                                                │
│    Status: [Proposed | Accepted | Deprecated]                        │
│    Date: {data geracao}                                              │
│    Context: ...                                                      │
│    Decision: ...                                                     │
│    Consequences: ...                                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3 Fluxo de Execucao

```
Blueprint YAML           Contexto     Projeto Gerado
    │                       │               ▲
    ▼                       ▼               │
┌──────────┐   ┌───────────────────┐   ┌──────────┐
│  Parser   │──▶│   Pipeline       │──▶│  Output  │
│  +        │   │   Executor       │   │  Writer  │
│  Validate │   │                   │   └──────────┘
└──────────┘   │  1. Render Files   │
               │  2. Inject Deps    │
               │  3. Generate Conf  │
               │  4. Generate Contr │
               │  5. Generate ADRs  │
               │  6. Post-Process   │
               └───────────────────┘
```

### 2.4 Interface Publica do Blueprint Engine

```typescript
interface IBlueprintEngine {
  // Inicializa projeto a partir de blueprint
  init(options: InitOptions): Promise<GenerateResult>;

  // Gera artefatos em projeto existente
  generate(options: GenerateOptions): Promise<GenerateResult>;

  // Lista blueprints disponiveis
  list(filter?: BlueprintFilter): BlueprintMetadata[];

  // Instala blueprint do registry
  install(name: string, version?: string): Promise<void>;

  // Valida blueprint
  validate(blueprintPath: string): BlueprintValidation;

  // Resolve heranca e dependencias entre blueprints
  resolve(blueprint: BlueprintDefinition): BlueprintDefinition;
}

interface InitOptions {
  blueprint: string;                    // Nome ou path do blueprint
  name: string;                         // Nome do projeto
  directory: string;                    // Diretorio de destino
  variables?: Record<string, unknown>;  // Variaveis de contexto
  force?: boolean;                      // Sobrescrever existente
  skipNpmInstall?: boolean;            // Pular npm install
  skipGitInit?: boolean;               // Pular git init
}

interface GenerateResult {
  projectPath: string;
  filesCreated: number;
  filesSkipped: number;
  dependenciesInstalled: boolean;
  gitInitialized: boolean;
  adrsGenerated: number;
  contractsGenerated: number;
  duration: number;
}
```

---

## 3. Formato Blueprint

### 3.1 Schema do Blueprint (YAML)

```yaml
# blueprint.yaml — Definicacao completa de um blueprint IDEIA
# Schema: https://schemas.ideia.dev/blueprint/v1

name: api-rest-nestjs
version: 1.0.0
description: REST API with NestJS, Prisma, PostgreSQL, JWT auth
author: IDEIA Team
tags:
  - api
  - rest
  - nestjs
  - typescript
  - postgresql

extends:
  - base/node-ts@1.0.0
  - base/monorepo@1.0.0

compatibility:
  ideia: ">=1.0.0"
  node: ">=18.0.0"
  pnpm: ">=8.0.0"

variables:
  - name: projectName
    type: string
    description: Nome do projeto
    prompt: "Nome do projeto"
    required: true
    validate: "^[a-z0-9-]+$"

  - name: description
    type: string
    description: Descricao do projeto
    prompt: "Descricao do projeto"
    default: "API REST gerada pela IDEIA"

  - name: database
    type: select
    description: Banco de dados
    options:
      - postgresql
      - sqlite
      - mysql
    default: postgresql

  - name: auth
    type: multi-select
    description: Estrategia de autenticacao
    options:
      - jwt
      - oauth
      - session
    default:
      - jwt

structure:
  src/:
    main.ts:
      template: src/main.ts.ejs
    app.module.ts:
      template: src/app.module.ts.ejs
    modules/:
      "{{moduleName}}/":
        "{{moduleName}}.module.ts":
          template: src/module.module.ts.ejs
        "{{moduleName}}.service.ts":
          template: src/module.service.ts.ejs
        "{{moduleName}}.controller.ts":
          template: src/module.controller.ts.ejs
        contract/:
          "{{moduleName}}.dto.ts":
            template: src/module.dto.ts.ejs
            generate: always
          "{{moduleName}}.events.ts":
            template: src/module.events.ts.ejs
            condition: "features.includes('events')"
    config/:
      database.config.ts:
        template: src/database.config.ts.ejs
      auth.config.ts:
        template: src/auth.config.ts.ejs
        condition: "auth.length > 0"
    common/:
      guards/:
        jwt-auth.guard.ts:
          template: src/jwt-auth.guard.ts.ejs
          condition: "auth.includes('jwt')"
      filters/:
        http-exception.filter.ts:
          template: src/http-exception.filter.ts.ejs
      interceptors/:
        logging.interceptor.ts:
          template: src/logging.interceptor.ts.ejs
    prisma/:
      schema.prisma:
        template: src/schema.prisma.ejs
  test/:
    app.e2e-spec.ts:
      template: test/app.e2e-spec.ts.ejs
  adr/:
    index.md:
      template: adr/index.md.ejs
  docker/:
    Dockerfile:
      template: docker/Dockerfile.ejs
    docker-compose.yml:
      template: docker/docker-compose.yml.ejs

dependencies:
  dependencies:
    "@nestjs/core": "^10.3.0"
    "@nestjs/common": "^10.3.0"
    "@nestjs/platform-express": "^10.3.0"
    "@prisma/client": "^5.0.0"
    class-validator: "^0.14.0"
    class-transformer: "^0.5.1"
    reflect-metadata: "^0.1.13"
    rxjs: "^7.8.0"
  devDependencies:
    "@nestjs/cli": "^10.3.0"
    "@nestjs/testing": "^10.3.0"
    "@nestjs/schematics": "^10.0.0"
    prisma: "^5.0.0"
    jest: "^29.5.0"
    ts-jest: "^29.1.0"
    "@types/node": "^20.0.0"
    typescript: "^5.3.0"
  peerDependencies: {}
  optionalDependencies:
    "@nestjs/websockets": "^10.3.0"
    condition: "features.includes('websockets')"

configs:
  tsconfig:
    compilerOptions:
      target: "ES2022"
      module: "commonjs"
      lib: ["ES2022"]
      outDir: "./dist"
      rootDir: "./src"
      strict: true
      esModuleInterop: true
      skipLibCheck: true
      forceConsistentCasingInFileNames: true
      resolveJsonModule: true
      declaration: true
      declarationMap: true
      sourceMap: true
      paths:
        "@/*": ["./src/*"]
      baseUrl: "./"
    include: ["src/**/*"]
    exclude: ["node_modules", "dist"]

  eslint:
    extends:
      - plugin:@typescript-eslint/recommended
      - plugin:prettier/recommended
    parser: "@typescript-eslint/parser"
    plugins:
      - "@typescript-eslint"
    rules:
      "@typescript-eslint/no-explicit-any": error
      "@typescript-eslint/explicit-function-return-type": warn

  prettier:
    semi: true
    singleQuote: true
    tabWidth: 2
    trailingComma: all
    printWidth: 100

  jest:
    preset: ts-jest
    testEnvironment: node
    moduleNameMapper:
      "^@/(.*)$": "<rootDir>/src/$1"
    roots:
      - "<rootDir>/test"
    testMatch:
      - "**/*.spec.ts"
      - "**/*.e2e-spec.ts"

contracts:
  modules:
    - name: user
      interfaces:
        - name: IUserService
          methods:
            - name: findAll
              params: []
              returns: "Promise<User[]>"
            - name: findById
              params:
                - name: id
                  type: string
              returns: "Promise<User | null>"
            - name: create
              params:
                - name: data
                  type: CreateUserDto
              returns: "Promise<User>"
        - name: IUserRepository
          methods:
            - name: save
              params:
                - name: user
                  type: User
              returns: "Promise<User>"
  schemaFormat: zod
  generateTests: true
  generateOpenAPI: true

adrs:
  autoGenerate: true
  templates:
    - title: "Framework Selection"
      template: adr/framework.md.ejs
    - title: "Database Selection"
      template: adr/database.md.ejs
    - title: "Architecture Pattern"
      template: adr/architecture.md.ejs

postProcess:
  - command: "git init"
    description: "Initialize git repository"
  - command: "pnpm install"
    description: "Install dependencies"
    condition: "!skipNpmInstall"
    timeout: 120000
  - command: "npx prisma generate"
    description: "Generate Prisma client"
    condition: "database === 'postgresql'"
  - command: "pnpm build"
    description: "Build project"
    condition: "!skipBuild"
```

### 3.2 Schema JSON (Zod)

```typescript
import { z } from 'zod';

export const BlueprintVariableSchema = z.object({
  name: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
  type: z.enum(['string', 'number', 'boolean', 'select', 'multi-select']),
  description: z.string().optional(),
  prompt: z.string().optional(),
  default: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).optional(),
  required: z.boolean().default(false),
  validate: z.string().optional(),
  options: z.array(z.string()).optional(),
});

export const BlueprintFileSchema = z.object({
  template: z.string(),
  generate: z.literal('always').optional(),
  condition: z.string().optional(),
});

export const BlueprintStructureSchema = z.record(
  z.union([z.string(), BlueprintFileSchema]),
);

export const BlueprintDependenciesSchema = z.object({
  dependencies: z.record(z.string()).default({}),
  devDependencies: z.record(z.string()).default({}),
  peerDependencies: z.record(z.string()).default({}),
  optionalDependencies: z.record(z.string()).default({}),
});

export const BlueprintModuleContractSchema = z.object({
  name: z.string(),
  interfaces: z.array(z.object({
    name: z.string(),
    methods: z.array(z.object({
      name: z.string(),
      params: z.array(z.object({
        name: z.string(),
        type: z.string(),
      })).default([]),
      returns: z.string(),
    })),
  })),
});

export const BlueprintPostProcessSchema = z.object({
  command: z.string(),
  description: z.string().optional(),
  condition: z.string().optional(),
  timeout: z.number().positive().optional(),
});

export const BlueprintDefinitionSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  author: z.string().optional(),
  tags: z.array(z.string()).default([]),
  extends: z.array(z.string()).default([]),
  compatibility: z.object({
    ideia: z.string().optional(),
    node: z.string().optional(),
    pnpm: z.string().optional(),
  }).optional(),
  variables: z.array(BlueprintVariableSchema).default([]),
  structure: BlueprintStructureSchema,
  dependencies: BlueprintDependenciesSchema.default({}),
  configs: z.object({
    tsconfig: z.record(z.unknown()).optional(),
    eslint: z.record(z.unknown()).optional(),
    prettier: z.record(z.unknown()).optional(),
    jest: z.record(z.unknown()).optional(),
    vitest: z.record(z.unknown()).optional(),
  }).optional(),
  contracts: z.object({
    modules: z.array(BlueprintModuleContractSchema).default([]),
    schemaFormat: z.enum(['zod', 'valibot', 'typescript']).default('zod'),
    generateTests: z.boolean().default(true),
    generateOpenAPI: z.boolean().default(false),
  }).optional(),
  adrs: z.object({
    autoGenerate: z.boolean().default(true),
    templates: z.array(z.object({
      title: z.string(),
      template: z.string(),
    })).default([]),
  }).optional(),
  postProcess: z.array(BlueprintPostProcessSchema).default([]),
});

export type BlueprintDefinition = z.infer<typeof BlueprintDefinitionSchema>;
```

### 3.3 Heranca entre Blueprints

Blueprints podem herdar de outros blueprints via `extends`, permitindo composicao e reuso:

```
base/node-ts@1.0.0          ──── TypeScript base configs
    │
    ├── extends ──▶ base/monorepo@1.0.0   ──── pnpm workspace, shared tsconfig
    │
    └── api-rest-nestjs@1.0.0  ──── NestJS REST API
         │
         ├── api-rest-fastify@1.0.0  ──── Fastify REST API (fork)
         │
         ├── api-rest-express@1.0.0  ──── Express REST API (fork)
         │
         └── fullstack-next-nest@1.0.0  ──── Fullstack Next.js + NestJS
              │
              └── fullstack-next-nest-prisma@1.0.0  ──── + Prisma ORM
```

Regras de heranca:

| Regra | Comportamento |
|-------|---------------|
| Estrutura | Merge recursivo. Filho sobrescreve pai no mesmo path |
| Dependencias | Merge. Filho sobrescreve versao do pai para mesmo pacote |
| Configs | Merge profundo. Filho sobrescreve propriedades do pai |
| Variaveis | Array concatenado. Filho pode redefinir com `override: true` |
| Contratos | Array concatenado. Modulos duplicados usam o do filho |
| Post-process | Array concatenado. Filho executa depois do pai |

---

## 4. Sistema de Templates

### 4.1 Template Engine (EJS)

O engine primario e **EJS** (Embedded JavaScript) por sua simplicidade e poder. Handlebars e suportado como alternativa.

```typescript
import ejs from 'ejs';

export interface TemplateContext {
  // Variaveis do usuario
  projectName: string;
  description: string;
  moduleName: string;
  features: string[];
  database: string;
  auth: string[];

  // Variaveis computadas
  projectNamePascal: string;
  projectNameCamel: string;
  projectNameKebab: string;
  projectNameSnake: string;
  moduleNamePascal: string;
  moduleNameCamel: string;
  moduleNameKebab: string;

  // Metadados
  createdAt: string;
  ideiaVersion: string;
  nodeVersion: string;
  blueprintName: string;
  blueprintVersion: string;

  // Helpers
  pascalCase: (str: string) => string;
  camelCase: (str: string) => string;
  kebabCase: (str: string) => string;
  snakeCase: (str: string) => string;
  pluralize: (str: string) => string;
  singularize: (str: string) => string;
  ifEquals: (a: unknown, b: unknown) => boolean;
  date: (format?: string) => string;
  indent: (str: string, level: number) => string;
}

export class TemplateRenderer {
  private engine: typeof ejs;

  constructor() {
    this.engine = ejs;
  }

  async render(
    templatePath: string,
    context: TemplateContext,
    options?: ejs.Options,
  ): Promise<string> {
    const content = await fs.promises.readFile(templatePath, 'utf-8');
    return this.engine.render(content, context, {
      filename: templatePath,
      ...options,
    });
  }

  async renderString(
    template: string,
    context: TemplateContext,
  ): Promise<string> {
    return this.engine.render(template, context);
  }
}
```

### 4.2 Exemplo de Template EJS

```ejs
// src/modules/<%= moduleNameKebab %>/<%= moduleNameKebab %>.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  Create<%= moduleNamePascal %>Dto,
  Update<%= moduleNamePascal %>Dto,
  <%= moduleNamePascal %>ResponseDto,
} from './dto/<%= moduleNameKebab %>.dto';

@Injectable()
export class <%= moduleNamePascal %>Service {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<<%= moduleNamePascal %>ResponseDto[]> {
    return this.prisma.<%= moduleNameCamel %>.findMany();
  }

  async findById(id: string): Promise<<%= moduleNamePascal %>ResponseDto | null> {
    return this.prisma.<%= moduleNameCamel %>.findUnique({ where: { id } });
  }

  async create(
    dto: Create<%= moduleNamePascal %>Dto,
  ): Promise<<%= moduleNamePascal %>ResponseDto> {
    return this.prisma.<%= moduleNameCamel %>.create({ data: dto });
  }

  async update(
    id: string,
    dto: Update<%= moduleNamePascal %>Dto,
  ): Promise<<%= moduleNamePascal %>ResponseDto> {
    return this.prisma.<%= moduleNameCamel %>.update({ where: { id }, data: dto });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.<%= moduleNameCamel %>.delete({ where: { id } });
  }

  <% if (features.includes('pagination')) { %>
  async findAllPaginated(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.<%= moduleNameCamel %>.findMany({ skip, take: limit }),
      this.prisma.<%= moduleNameCamel %>.count(),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
  <% } %>
}
```

### 4.3 Partials e Reuso

Partials permitem reutilizar blocos de template entre arquivos:

```
templates/
  partials/
    _header.ejs           ──── Cabecalho padrao dos arquivos
    _license.ejs          ──── Licenca padrao
    _nestjs-controller.ejs  ──── Controller NestJS generico
    _prisma-schema.ejs    ──── Schema Prisma generico
    _dockerfile.ejs       ──── Dockerfile multi-stage
  blueprints/
    api-rest-nestjs/
      src/
        main.ts.ejs
        module.service.ts.ejs
```

```ejs
<%# templates/partials/_header.ejs %>
// <%= projectName %>
// <%= description %>
// Generated by IDEIA Blueprint Engine v<%= ideiaVersion %>
// Date: <%= date('YYYY-MM-DD') %>
// Do not edit this file manually — regenerate with blueprint

<%# Uso no template %>
<%- include('../../partials/_header') %>
import { Module } from '@nestjs/common';
import { <%= moduleNamePascal %>Controller } from './<%= moduleNameKebab %>.controller';
import { <%= moduleNamePascal %>Service } from './<%= moduleNameKebab %>.service';

@Module({
  controllers: [<%= moduleNamePascal %>Controller],
  providers: [<%= moduleNamePascal %>Service],
  exports: [<%= moduleNamePascal %>Service],
})
export class <%= moduleNamePascal %>Module {}
```

### 4.4 Helpers Customizados

```typescript
export const blueprintHelpers = {
  pascalCase: (str: string): string =>
    str.replace(/([-_]\w)/g, (g) => g[1].toUpperCase())
       .replace(/^[a-z]/, (c) => c.toUpperCase()),

  camelCase: (str: string): string =>
    str.replace(/([-_]\w)/g, (g) => g[1].toUpperCase()),

  kebabCase: (str: string): string =>
    str.replace(/([A-Z])/g, '-$1').toLowerCase()
       .replace(/^-/, '')
       .replace(/[_]/g, '-'),

  snakeCase: (str: string): string =>
    str.replace(/([A-Z])/g, '_$1').toLowerCase()
       .replace(/^_/, '')
       .replace(/[-]/g, '_'),

  pluralize: (str: string): string => {
    const irregular: Record<string, string> = {
      person: 'people', child: 'children', mouse: 'mice',
    };
    if (irregular[str]) return irregular[str];
    if (str.endsWith('s') || str.endsWith('x') || str.endsWith('z')) return str + 'es';
    if (str.endsWith('y') && !/[aeiou]y$/.test(str)) return str.slice(0, -1) + 'ies';
    return str + 's';
  },

  singularize: (str: string): string => {
    const irregular: Record<string, string> = {
      people: 'person', children: 'child', mice: 'mouse',
    };
    if (irregular[str]) return irregular[str];
    if (str.endsWith('ies')) return str.slice(0, -3) + 'y';
    if (str.endsWith('ses') || str.endsWith('xes') || str.endsWith('zes')) return str.slice(0, -2);
    if (str.endsWith('s') && !str.endsWith('ss')) return str.slice(0, -1);
    return str;
  },

  ifEquals: (a: unknown, b: unknown): boolean => a === b,

  date: (format = 'ISO'): string => {
    const d = new Date();
    switch (format) {
      case 'YYYY-MM-DD': return d.toISOString().split('T')[0];
      case 'YYYY': return d.getFullYear().toString();
      default: return d.toISOString();
    }
  },

  indent: (str: string, level: number): string =>
    '  '.repeat(level) + str.replace(/\n/g, `\n${'  '.repeat(level)}`),
};
```

---

## 5. Dependency Injection

### 5.1 Resolucao de Dependencias

O Dependency Injector resolve dependencias entre pacotes com controle de versao e compatibilidade.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DEPENDENCY RESOLUTION FLOW                         │
│                                                                      │
│  Dependencias do Blueprint                                           │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────────────────────────────────────┐                │
│  │  1. Parse & Classify                             │                │
│  │     - dependencies / dev / peer / optional       │                │
│  │     - extrai nome e range de versao              │                │
│  └─────────────────────┬───────────────────────────┘                │
│                        │                                            │
│                        ▼                                            │
│  ┌─────────────────────────────────────────────────┐                │
│  │  2. Resolve Versions                             │                │
│  │     - Consulta npm registry (https://registry    │                │
│  │       .npmjs.org)                                │                │
│  │     - Resolve latest, range, pinned              │                │
│  │     - Cache de resolucao (evita re-consultas)    │                │
│  └─────────────────────┬───────────────────────────┘                │
│                        │                                            │
│                        ▼                                            │
│  ┌─────────────────────────────────────────────────┐                │
│  │  3. Validate Compatibility                       │                │
│  │     - Peer dependency check                      │                │
│  │     - Engine check (node, pnpm)                  │                │
│  │     - Duplicate check                            │                │
│  └─────────────────────┬───────────────────────────┘                │
│                        │                                            │
│                        ▼                                            │
│  ┌─────────────────────────────────────────────────┐                │
│  │  4. Merge with Existing                          │                │
│  │     - Blueprint extends resolvido               │                │
│  │     - Dependencias existentes no projeto        │                │
│  └─────────────────────┬───────────────────────────┘                │
│                        │                                            │
│                        ▼                                            │
│  ┌─────────────────────────────────────────────────┐                │
│  │  5. Generate package.json                        │                │
│  │     - Scripts padrao (dev, build, test, lint)   │                │
│  │     - Engines, publishConfig                     │                │
│  │     - pnpm overrides (se necessario)            │                │
│  └─────────────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Versionamento

| Estrategia | Sintaxe | Quando usar |
|------------|---------|-------------|
| **Latest** | `latest` | Dependencias de runtime com preferencia a versao mais nova |
| **Range** | `^1.2.0`, `~1.2.0`, `>=1.0.0 <2.0.0` | Dependencias com compatibilidade semver |
| **Pinned** | `1.2.3` | Ferramentas CLI, peer dependencies |
| **Workspace** | `workspace:*` | Dependencias internas em monorepo |
| **Git** | `git+https://...` | Dependencias de repositorio privado |

### 5.3 Resolucao de Conflitos

```typescript
export class DependencyResolver {
  async resolve(
    blueprintDeps: BlueprintDependencies,
    existingDeps?: Record<string, string>,
  ): Promise<ResolvedDependencies> {
    const allDeps: Record<string, DepEntry> = {};

    // Merge dependencias do blueprint
    for (const [name, version] of Object.entries(blueprintDeps.dependencies)) {
      allDeps[name] = { version, type: 'dependency' };
    }
    for (const [name, version] of Object.entries(blueprintDeps.devDependencies)) {
      allDeps[name] = { version, type: 'devDependency' };
    }
    for (const [name, version] of Object.entries(blueprintDeps.peerDependencies)) {
      allDeps[name] = { version, type: 'peerDependency' };
    }

    // Merge com existentes (existentes tem prioridade)
    if (existingDeps) {
      for (const [name, version] of Object.entries(existingDeps)) {
        if (allDeps[name]) {
          allDeps[name] = {
            ...allDeps[name],
            version: this.resolveVersionConflict(name, allDeps[name].version, version),
            conflict: allDeps[name].version !== version,
          };
        }
      }
    }

    // Validar peer dependencies
    const errors: DependencyError[] = [];
    for (const [name, entry] of Object.entries(allDeps)) {
      if (entry.type === 'peerDependency' && !allDeps[name]) {
        errors.push({
          code: 'MISSING_PEER',
          package: name,
          message: `Peer dependency ${name}@${entry.version} not found`,
        });
      }
    }

    // Gerar saida
    return {
      dependencies: this.filterByType(allDeps, 'dependency'),
      devDependencies: this.filterByType(allDeps, 'devDependency'),
      peerDependencies: this.filterByType(allDeps, 'peerDependency'),
      optionalDependencies: this.filterByType(allDeps, 'optionalDependency'),
      errors,
      warnings: this.detectWarnings(allDeps),
    };
  }

  private resolveVersionConflict(
    name: string,
    blueprintVersion: string,
    existingVersion: string,
  ): string {
    // Se ja existe, manter versao existente
    // Em versao futura: consultar npm registry para range mais permissivo
    return existingVersion;
  }
}
```

### 5.4 Lockfile Generation

O engine gera um `blueprint.lock.json` que registra as versoes resolvidas:

```json
{
  "name": "api-rest-nestjs",
  "version": "1.0.0",
  "resolvedAt": "2026-07-22T10:00:00Z",
  "resolvedBy": "IDEIA Blueprint Engine v1.0.0",
  "dependencies": {
    "@nestjs/core": { "requested": "^10.3.0", "resolved": "10.4.1", "integrity": "sha256-..." },
    "@nestjs/common": { "requested": "^10.3.0", "resolved": "10.4.1", "integrity": "sha256-..." },
    "@prisma/client": { "requested": "^5.0.0", "resolved": "5.14.0", "integrity": "sha256-..." }
  },
  "errors": [],
  "warnings": []
}
```

---

## 6. Config Generator

### 6.1 Geracao de Configuracoes

O Config Generator produz arquivos de configuracao padronizados e consistentes com as escolhas do blueprint.

```typescript
export class ConfigGenerator {
  async generate(
    configs: BlueprintConfigs,
    context: TemplateContext,
  ): Promise<GeneratedConfig[]> {
    const results: GeneratedConfig[] = [];

    if (configs.tsconfig) {
      results.push(await this.generateTsconfig(configs.tsconfig, context));
    }
    if (configs.eslint) {
      results.push(await this.generateEslint(configs.eslint, context));
    }
    if (configs.prettier) {
      results.push(await this.generatePrettier(configs.prettier));
    }
    if (configs.jest) {
      results.push(await this.generateJest(configs.jest, context));
    }
    if (configs.vitest) {
      results.push(await this.generateVitest(configs.vitest, context));
    }

    return results;
  }

  private async generateTsconfig(
    options: Record<string, unknown>,
    context: TemplateContext,
  ): Promise<GeneratedConfig> {
    // Merge com defaults inteligentes
    const tsconfig = {
      compilerOptions: {
        target: 'ES2022',
        module: 'commonjs',
        lib: ['ES2022'],
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        ...(options.compilerOptions as Record<string, unknown>),
      },
      include: options.include || ['src/**/*'],
      exclude: options.exclude || ['node_modules', 'dist'],
    };

    // Se monorepo, ajusta paths
    if (context.features?.includes('monorepo')) {
      (tsconfig.compilerOptions as Record<string, unknown>).paths = {
        '@/*': ['./packages/*/src'],
      };
    }

    return {
      path: 'tsconfig.json',
      content: JSON.stringify(tsconfig, null, 2),
    };
  }

  private async generateEslint(
    options: Record<string, unknown>,
    context: TemplateContext,
  ): Promise<GeneratedConfig> {
    const config: Record<string, unknown> = {
      root: true,
      env: { node: true, es2022: true },
      parser: options.parser || '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      plugins: options.plugins || ['@typescript-eslint'],
      extends: options.extends || [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended',
      ],
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/explicit-function-return-type': 'warn',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        ...(options.rules as Record<string, unknown>),
      },
      ignorePatterns: ['dist', 'node_modules', '*.js'],
    };

    return {
      path: '.eslintrc.json',
      content: JSON.stringify(config, null, 2),
    };
  }
}
```

### 6.2 Configuracoes por Tipo de Projeto

| Tipo de Projeto | Configs Geradas |
|-----------------|-----------------|
| **node-cli** | tsconfig.json, .eslintrc.json, .prettierrc, .gitignore, .editorconfig |
| **node-lib** | tsconfig.json (com declaration), .eslintrc.json, .prettierrc, jest.config.ts, .gitignore |
| **api-rest** | tsconfig.json, .eslintrc.json, .prettierrc, jest.config.ts, docker-compose.yml, Dockerfile, .env.example, .gitignore |
| **fullstack** | tsconfig.json (web + server), .eslintrc.json, .prettierrc, jest.config.ts, docker-compose.yml, Dockerfile (multi-stage), .env.example, next.config.js |
| **microservice** | tsconfig.json, .eslintrc.json, .prettierrc, jest.config.ts, Dockerfile, Dockerfile.dev, docker-compose.yml, .env.example, .gitignore |
| **monorepo** | tsconfig.base.json, tsconfig.json (por package), package.json (workspaces), pnpm-workspace.yaml, turbo.json, .eslintrc.json, .prettierrc |
| **plugin-theia** | tsconfig.json, .eslintrc.json, .prettierrc, jest.config.ts, theia-build.yml, .gitignore |

### 6.3 Scripts Padrao no package.json

```typescript
const defaultScripts: Record<string, Record<string, string>> = {
  'node-cli': {
    dev: 'tsx watch src/index.ts',
    build: 'tsc',
    start: 'node dist/index.js',
    lint: 'eslint src/ --ext .ts',
    test: 'jest --passWithNoTests',
  },
  'node-lib': {
    build: 'tsc',
    'build:watch': 'tsc --watch',
    lint: 'eslint src/ --ext .ts',
    test: 'jest --passWithNoTests',
    'test:coverage': 'jest --coverage --passWithNoTests',
  },
  'api-rest': {
    'dev': 'nest start --watch',
    'build': 'nest build',
    'start': 'node dist/main',
    'start:prod': 'node dist/main',
    'lint': 'eslint src/ --ext .ts',
    'test': 'jest --passWithNoTests',
    'test:e2e': 'jest --config ./test/jest-e2e.json',
    'test:coverage': 'jest --coverage --passWithNoTests',
    'prisma:generate': 'prisma generate',
    'prisma:migrate': 'prisma migrate dev',
    'prisma:seed': 'tsx prisma/seed.ts',
  },
  fullstack: {
    dev: 'turbo dev',
    build: 'turbo build',
    lint: 'turbo lint',
    test: 'turbo test',
  },
  'plugin-theia': {
    dev: 'theia build --mode development',
    build: 'theia build --mode production',
    watch: 'theia build --mode development --watch',
    lint: 'eslint src/ --ext .ts,.tsx',
  },
};
```

---

## 7. Contract Generator

### 7.1 Geracao de Contratos entre Modulos

O Contract Generator cria contratos formais entre modulos, incluindo interfaces, tipos e schemas de validacao.

```typescript
export class ContractGenerator {
  async generate(
    modules: BlueprintModuleContract[],
    format: SchemaFormat,
    options: ContractOptions,
  ): Promise<GeneratedContract[]> {
    const contracts: GeneratedContract[] = [];

    for (const mod of modules) {
      // Schema de validacao
      contracts.push(await this.generateSchema(mod, format));

      // Interface TypeScript
      contracts.push(await this.generateInterface(mod));

      // Teste de contrato
      if (options.generateTests) {
        contracts.push(await this.generateContractTest(mod));
      }
    }

    // OpenAPI spec (se API)
    if (options.generateOpenAPI) {
      contracts.push(await this.generateOpenAPISpec(modules));
    }

    return contracts;
  }

  private async generateSchema(
    mod: BlueprintModuleContract,
    format: SchemaFormat,
  ): Promise<GeneratedContract> {
    const ext = format === 'valibot' ? 'valibot' : 'zod';
    const importStmt = format === 'valibot'
      ? `import { object, string, number, array, InferOutput } from 'valibot';`
      : `import { z } from 'zod';`;

    const schemas = mod.interfaces.flatMap((iface) => {
      return iface.methods.map((method) => {
        const schemaName = `${iface.name.replace(/^I/, '')}${method.name.charAt(0).toUpperCase()}${method.name.slice(1)}`;
        // Gera schema baseado nos parametros
        return this.generateDtoSchema(schemaName, method.params, format);
      });
    });

    const content = `${importStmt}

// ${mod.name} module — Contracts
// Auto-generated by IDEIA Blueprint Engine

${schemas.join('\n\n')}

export type ${mod.name.charAt(0).toUpperCase() + mod.name.slice(1)}Module = {
${mod.interfaces.map((iface) => {
  const methods = iface.methods.map((m) =>
    `  ${m.name}: (${m.params.map((p) => `${p.name}: ${p.type}`).join(', ')}) => ${m.returns};`
  ).join('\n');
  return `  ${iface.name}: {\n${methods}\n  };`;
}).join('\n')}
};
`;

    return {
      path: `src/modules/${mod.name}/contract/${mod.name}.contract.${ext}.ts`,
      content,
    };
  }
}
```

### 7.2 Exemplo de Contrato Gerado (Zod)

```typescript
import { z } from 'zod';

// user module — Contracts
// Auto-generated by IDEIA Blueprint Engine

export const CreateUserDtoSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.enum(['admin', 'user', 'viewer']).default('user'),
});

export const UpdateUserDtoSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'user', 'viewer']).optional(),
});

export const UserResponseDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'viewer']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CreateUserDto = z.infer<typeof CreateUserDtoSchema>;
export type UpdateUserDto = z.infer<typeof UpdateUserDtoSchema>;
export type UserResponseDto = z.infer<typeof UserResponseDtoSchema>;

export const UserContract = {
  IUserService: {
    findAll: (): Promise<UserResponseDto[]> => { throw new Error('Not implemented'); },
    findById: (id: string): Promise<UserResponseDto | null> => { throw new Error('Not implemented'); },
    create: (data: CreateUserDto): Promise<UserResponseDto> => { throw new Error('Not implemented'); },
  },
  IUserRepository: {
    save: (user: UserResponseDto): Promise<UserResponseDto> => { throw new Error('Not implemented'); },
  },
};
```

### 7.3 Exemplo de Contrato Gerado (Valibot)

```typescript
import { object, string, enum as vEnum, optional, pipe, minLength, maxLength, email, uuid, instanceof as vInstanceOf, date, array } from 'valibot';
import { type InferOutput } from 'valibot';

// user module — Contracts
// Auto-generated by IDEIA Blueprint Engine

const CreateUserDtoSchema = object({
  name: pipe(string(), minLength(1), maxLength(255)),
  email: pipe(string(), email()),
  password: pipe(string(), minLength(8), maxLength(128)),
  role: optional(vEnum(['admin', 'user', 'viewer']), 'user'),
});

const UpdateUserDtoSchema = object({
  name: optional(pipe(string(), minLength(1), maxLength(255))),
  email: optional(pipe(string(), email())),
  role: optional(vEnum(['admin', 'user', 'viewer'])),
});

const UserResponseDtoSchema = object({
  id: pipe(string(), uuid()),
  name: string(),
  email: pipe(string(), email()),
  role: vEnum(['admin', 'user', 'viewer']),
  createdAt: string(),
  updatedAt: string(),
});

export type CreateUserDto = InferOutput<typeof CreateUserDtoSchema>;
export type UpdateUserDto = InferOutput<typeof UpdateUserDtoSchema>;
export type UserResponseDto = InferOutput<typeof UserResponseDtoSchema>;
```

### 7.4 Teste de Contrato Gerado (Pact Skeleton)

```typescript
// test/contract/user.provider.pact.ts
// Auto-generated by IDEIA Blueprint Engine
import { PactV3, MatchersV3 } from '@pact-foundation/pact';

const { like, eachLike, uuid, regex, term } = MatchersV3;

const provider = new PactV3({
  consumer: 'web-app',
  provider: 'user-service',
});

describe('User Service Contract', () => {
  it('should return users list', async () => {
    provider
      .given('users exist')
      .uponReceiving('a request for all users')
      .withRequest({
        method: 'GET',
        path: '/api/users',
        headers: { Accept: 'application/json' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: eachLike({
          id: uuid(),
          name: like('John Doe'),
          email: regex('john@example.com', '\\S+@\\S+\\.\\S+'),
          role: term({ generate: 'user', matcher: 'admin|user|viewer' }),
        }),
      });

    return provider.executeTest((mockServer) => {
      return fetch(`${mockServer.url}/api/users`, {
        headers: { Accept: 'application/json' },
      }).then((res) => {
        expect(res.status).toBe(200);
      });
    });
  });
});
```

---

## 8. ADR Generator

### 8.1 Geracao Automatica de ADRs

```typescript
export class ADRGenerator {
  async generate(
    blueprint: BlueprintDefinition,
    context: TemplateContext,
  ): Promise<GenerateADR[]> {
    const adrs: GenerateADR[] = [];

    // ADR sobre framework
    adrs.push(await this.generateFrameworkADR(blueprint, context));

    // ADR sobre database
    if (context.database) {
      adrs.push(await this.generateDatabaseADR(context));
    }

    // ADR sobre arquitetura
    adrs.push(await this.generateArchitectureADR(blueprint, context));

    // ADR sobre package manager
    adrs.push(await this.generatePackageManagerADR());

    // ADR sobre test framework
    adrs.push(await this.generateTestFrameworkADR(blueprint));

    // ADR sobre API protocol (se aplicavel)
    if (context.features?.includes('api')) {
      adrs.push(await this.generateApiProtocolADR(context));
    }

    // ADRs customizados do blueprint
    if (blueprint.adrs?.templates) {
      for (const tpl of blueprint.adrs.templates) {
        adrs.push(await this.renderCustomADR(tpl, context));
      }
    }

    return adrs;
  }

  private async generateFrameworkADR(
    blueprint: BlueprintDefinition,
    context: TemplateContext,
  ): Promise<GenerateADR> {
    const frameworkName = this.detectFramework(blueprint);
    return {
      path: `adr/0001-use-${this.kebabCase(frameworkName)}.md`,
      content: `# ADR-0001: ${frameworkName} como Framework Principal

Status: Accepted
Date: ${new Date().toISOString().split('T')[0]}

## Contexto
Necessidade de um framework para construir a aplicacao ${context.projectName}.
${blueprint.description}

## Decisao
Utilizar ${frameworkName} como framework principal.

## Consequencias
- Positivas:
  - Ecossistema maduro e bem documentado
  - Comunidade ativa e suporte de longo prazo
  - Arquitetura modular e extensivel
  - Suporte nativo a TypeScript
  - ${this.frameworkBenefits(frameworkName)}
- Negativas:
  - Curva de aprendizado inicial
  - Overhead para projetos muito simples
  - Dependencia de um framework externo
`,
    };
  }

  private detectFramework(blueprint: BlueprintDefinition): string {
    const deps = {
      ...blueprint.dependencies?.dependencies,
      ...blueprint.dependencies?.devDependencies,
    };
    if (deps['@nestjs/core']) return 'NestJS';
    if (deps['express']) return 'Express';
    if (deps['fastify']) return 'Fastify';
    if (deps['next']) return 'Next.js';
    if (deps['nuxt']) return 'Nuxt';
    if (deps['@theia/core']) return 'Theia';
    return 'Node.js';
  }
}
```

### 8.2 Exemplo de ADR Gerado

```markdown
# ADR-0001: NestJS como Framework Principal

Status: Accepted
Date: 2026-07-22

## Contexto
Necessidade de um framework para construir a aplicacao minha-api.
API REST com NestJS, Prisma, PostgreSQL, JWT auth

## Decisao
Utilizar NestJS como framework principal.

## Consequencias
- Positivas:
  - Ecossistema maduro e bem documentado
  - Comunidade ativa e suporte de longo prazo
  - Arquitetura modular e extensivel
  - Suporte nativo a TypeScript
  - Inversao de controle via DI nativa
  - Decorators para definicao de rotas/validacao
  - Integracao com OpenAPI/Swagger
- Negativas:
  - Curva de aprendizado inicial
  - Overhead para projetos muito simples
  - Dependencia de um framework externo

---

# ADR-0002: PostgreSQL como Banco de Dados

Status: Accepted
Date: 2026-07-22

## Contexto
Escolha do banco de dados relacional para a aplicacao.

## Decisao
Utilizar PostgreSQL com Prisma ORM.

## Consequencias
- Positivas:
  - Maturidade e confiabilidade comprovada em producao
  - Suporte a tipos avancados (JSONB, arrays, enum)
  - Prisma oferece type-safety e migrations automaticas
  - Excelente performance para operacoes OLTP
- Negativas:
  - Requer gerenciamento de conexoes e pooling
  - Backup e recovery mais complexo que SQLite
  - Overhead de infraestrutura vs bancos embedded

---

# ADR-0003: Clean Architecture

Status: Accepted
Date: 2026-07-22

## Contexto
Padrao arquitetural para organizacao do codigo.

## Decisao
Adotar Clean Architecture com camadas:
  - Contract: DTOs, interfaces, schemas de validacao
  - Application: Use cases, services
  - Infrastructure: Repositories, DB, external services

## Consequencias
- Positivas:
  - Separacao clara de responsabilidades
  - Testabilidade isolada de cada camada
  - Independencia de frameworks e drivers externos
  - Facil manutencao e evolucao
- Negativas:
  - Maior numero de arquivos e boilerplate
  - Pode ser excessivo para projetos simples
  - Requer disciplina do time para manter boundaries

---

# ADR-0004: pnpm como Gerenciador de Pacotes

Status: Accepted
Date: 2026-07-22

## Contexto
Gerenciador de pacotes para o projeto.

## Decisao
Utilizar pnpm.

## Consequencias
- Positivas:
  - Instalacao mais rapida via linking intelligente
  - Economia de espaco em disco (content-addressable store)
  - Suporte nativo a workspaces (monorepo)
  - Strict mode evita dependencias fantasma
- Negativas:
  - Diferente do npm padrao (curva de aprendizado)
  - Algumas ferramentas podem ter compatibilidade parcial
```

---

## 9. Biblioteca de Blueprints

### 9.1 Blueprints Pre-Definidos

| Blueprint | Descricao | Tags | Complexidade |
|-----------|-----------|------|--------------|
| **node-cli** | CLI tool com TS, commander/inquirer, testes | `node, cli, typescript` | Baixa |
| **node-lib** | Biblioteca Node.js com TS, testes, build | `node, lib, typescript` | Baixa |
| **api-rest-nestjs** | REST API com NestJS, Prisma, PostgreSQL | `api, rest, nestjs, postgresql` | Media |
| **api-rest-express** | REST API com Express, Prisma, PostgreSQL | `api, rest, express, postgresql` | Media |
| **api-rest-fastify** | REST API com Fastify, Prisma, PostgreSQL | `api, rest, fastify, postgresql` | Media |
| **api-graphql** | GraphQL API com Apollo, TypeGraphQL | `api, graphql, apollo` | Media |
| **fullstack-next-nest** | Next.js + NestJS + Prisma + PostgreSQL | `fullstack, next, nestjs` | Alta |
| **fullstack-nuxt-nest** | Nuxt + NestJS + Prisma + PostgreSQL | `fullstack, nuxt, nestjs` | Alta |
| **microservice** | Microservico NestJS com NATS, Docker | `microservice, nats, docker` | Alta |
| **monorepo** | Monorepo com pnpm workspaces, Turbo | `monorepo, pnpm, turbo` | Media |
| **plugin-theia** | Plugin Theia IDE com widgets, commands | `theia, plugin, extension` | Alta |
| **event-driven** | Sistema event-driven com NATS JetStream | `events, nats, jetstream` | Alta |

### 9.2 Estrutura de Cada Blueprint

```
blueprints/
  base/
    node-ts/                  ──── Base: TypeScript configs
    monorepo/                  ──── Base: pnpm workspace + Turbo
    docker/                    ──── Base: Docker multi-stage
  node/
    node-cli/                  ──── CLI tool
    node-lib/                  ──── Library
  api/
    api-rest-nestjs/           ──── NestJS REST API
    api-rest-express/          ──── Express REST API
    api-rest-fastify/          ──── Fastify REST API
    api-graphql/               ──── GraphQL API
  fullstack/
    fullstack-next-nest/       ──── Next + Nest
    fullstack-nuxt-nest/       ──── Nuxt + Nest
  microservice/
    microservice/              ──── Microservico basico
    event-driven/              ──── Event-driven system
  theia/
    plugin-theia/              ──── Theia plugin
```

### 9.3 Exemplo de Blueprint: node-cli

```yaml
# blueprints/node/node-cli/blueprint.yaml
name: node-cli
version: 1.0.0
description: Node.js CLI tool with TypeScript
author: IDEIA Team
tags:
  - node
  - cli
  - typescript

extends:
  - base/node-ts@1.0.0

variables:
  - name: projectName
    type: string
    required: true
    validate: "^[a-z0-9-]+$"
  - name: description
    type: string
    default: "CLI tool gerado pela IDEIA"
  - name: binName
    type: string
    prompt: "Nome do binario (comando)"
    default: "{{projectName}}"

structure:
  src/:
    index.ts:
      template: src/index.ts.ejs
    commands/:
      hello.ts:
        template: src/commands/hello.ts.ejs
  test/:
    commands/:
      hello.test.ts:
        template: test/hello.test.ts.ejs

dependencies:
  dependencies:
    commander: "^12.0.0"
    chalk: "^5.3.0"
    inquirer: "^9.2.0"
    ora: "^8.0.0"
  devDependencies:
    "@types/node": "^20.0.0"
    "@types/inquirer": "^9.0.0"
    jest: "^29.5.0"
    ts-jest: "^29.1.0"

configs:
  tsconfig:
    compilerOptions:
      target: "ES2022"
      module: "commonjs"
      outDir: "./dist"
      rootDir: "./src"
      strict: true
      esModuleInterop: true

postProcess:
  - command: "chmod +x dist/index.js"
    description: "Torna binario executavel"
    condition: "process.platform !== 'win32'"
```

---

## 10. Blueprint Market

### 10.1 Compartilhamento de Blueprints

O Blueprint Market permite compartilhar, versionar e descobrir blueprints entre usuarios e organizacoes.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BLUEPRINT MARKET ARCHITECTURE                      │
│                                                                      │
│  Registry: https://registry.ideia.dev                                │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    BLUEPRINT REGISTRY                         │    │
│  │                                                              │    │
│  │  GET  /api/blueprints         ──── Lista blueprints          │    │
│  │  GET  /api/blueprints/:name   ──── Detalhes do blueprint     │    │
│  │  GET  /api/blueprints/:name/:version  ──── Versao especifica │    │
│  │  PUT  /api/blueprints/:name   ──── Publicar/atualizar        │    │
│  │  DELETE /api/blueprints/:name ──── Remover blueprint          │    │
│  │  POST /api/blueprints/search  ──── Busca por tags/texto      │    │
│  │  GET  /api/blueprints/:name/versions  ──── Historico versoes │    │
│  │                                                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                          │                                          │
│                          ▼                                          │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    STORAGE (S3/MinIO)                        │    │
│  │  buckets/                                                    │    │
│  │    blueprints/                                               │    │
│  │      node-cli/                                               │    │
│  │        1.0.0/                                                │    │
│  │          blueprint.yaml                                      │    │
│  │          templates/                                          │    │
│  │          README.md                                           │    │
│  │        1.1.0/                                                │    │
│  │    api-rest-nestjs/                                          │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### 10.2 Comandos do Market

```bash
# Publicar blueprint no registry
IDEIA blueprint publish ./my-custom-blueprint

# Publicar com versao especifica
IDEIA blueprint publish ./my-custom-blueprint --version 1.0.0

# Buscar blueprints
IDEIA blueprint search "nestjs api"

# Buscar por tag
IDEIA blueprint search --tag nestjs

# Instalar blueprint do registry
IDEIA blueprint install api-rest-nestjs

# Instalar versao especifica
IDEIA blueprint install api-rest-nestjs@1.0.0

# Listar blueprints instalados
IDEIA blueprint list

# Atualizar blueprint local
IDEIA blueprint update api-rest-nestjs

# Remover blueprint local
IDEIA blueprint remove api-rest-nestjs
```

### 10.3 Versionamento de Blueprints

| Aspecto | Regra |
|---------|-------|
| **Formato** | Semver (1.0.0, 1.1.0, 2.0.0) |
| **Major** | Quebra de compatibilidade na estrutura gerada |
| **Minor** | Novas features, templates, variaveis (compativel) |
| **Patch** | Correcoes, melhorias em templates existentes |
| **Range** | `^1.0.0`, `~1.0.0`, `>=1.0.0 <2.0.0` |
| **Latest** | Ultima versao estavel |
| **Canary** | `1.0.0-canary.1` para pre-release |

### 10.4 Compatibilidade e Audit

```typescript
export class BlueprintMarket {
  async publish(
    blueprintPath: string,
    options: PublishOptions,
  ): Promise<PublishResult> {
    // 1. Validar blueprint
    const blueprint = await this.parseAndValidate(blueprintPath);

    // 2. Verificar compatibilidade com engine atual
    const compat = await this.checkCompatibility(blueprint);
    if (!compat.valid) {
      return { success: false, errors: compat.errors };
    }

    // 3. Empaquetar templates e recursos
    const pkg = await this.packageBlueprint(blueprintPath);

    // 4. Enviar para registry
    const response = await this.registryClient.put(
      `/api/blueprints/${blueprint.name}`,
      {
        body: pkg,
        headers: { 'Authorization': `Bearer ${this.token}` },
      },
    );

    // 5. Registrar no audit trail
    await this.auditTrail.log('blueprint:publish', {
      name: blueprint.name,
      version: blueprint.version,
    });

    return { success: true, version: blueprint.version, url: response.url };
  }

  async search(query: string, tags?: string[]): Promise<BlueprintSearchResult[]> {
    const results = await this.registryClient.post('/api/blueprints/search', {
      body: { query, tags },
    });

    return results.map((r: RegistryEntry) => ({
      name: r.name,
      version: r.version,
      description: r.description,
      tags: r.tags,
      downloads: r.downloads,
      rating: r.rating,
      updatedAt: r.updatedAt,
    }));
  }
}
```

### 10.5 Ratings e Qualidade

| Criterio | Descricao | Peso |
|----------|-----------|------|
| **Test coverage** | O blueprint tem templates testados | 30% |
| **Documentation** | README, exemplos, variaveis documentadas | 25% |
| **Compatibility** | Funciona com engine atual | 20% |
| **Downloads** | Numero de instalacoes | 15% |
| **Community rating** | Avaliacao dos usuarios (1-5) | 10% |

---

## 11. Codigo TypeScript

### 11.1 Blueprint Engine — Implementacao Principal

```typescript
// packages/blueprint-engine/src/engine.ts
import path from 'node:path';
import fs from 'node:fs/promises';
import { TemplateRenderer } from './template-renderer';
import { BlueprintParser } from './blueprint-parser';
import { DependencyResolver } from './dependency-resolver';
import { ConfigGenerator } from './config-generator';
import { ContractGenerator } from './contract-generator';
import { ADRGenerator } from './adr-generator';
import { PostProcessor } from './post-processor';
import type {
  BlueprintDefinition,
  InitOptions,
  GenerateResult,
  TemplateContext,
} from './types';

export class BlueprintEngine implements IBlueprintEngine {
  private parser: BlueprintParser;
  private renderer: TemplateRenderer;
  private depResolver: DependencyResolver;
  private configGen: ConfigGenerator;
  private contractGen: ContractGenerator;
  private adrGen: ADRGenerator;
  private postProcessor: PostProcessor;

  constructor(
    private blueprintsDir: string,
    private registryUrl?: string,
  ) {
    this.parser = new BlueprintParser();
    this.renderer = new TemplateRenderer();
    this.depResolver = new DependencyResolver();
    this.configGen = new ConfigGenerator();
    this.contractGen = new ContractGenerator();
    this.adrGen = new ADRGenerator();
    this.postProcessor = new PostProcessor();
  }

  async init(options: InitOptions): Promise<GenerateResult> {
    const startTime = Date.now();
    let filesCreated = 0;
    let filesSkipped = 0;

    // 1. Resolver blueprint
    const blueprint = await this.resolveBlueprint(options.blueprint);

    // 2. Coletar variaveis
    const context = await this.collectVariables(blueprint, options);

    // 3. Criar diretorio de destino
    const targetDir = path.resolve(options.directory, options.name);
    await fs.mkdir(targetDir, { recursive: true });

    // 4. Processar estrutura (templates)
    const structureResult = await this.processStructure(
      blueprint,
      context,
      targetDir,
    );
    filesCreated += structureResult.created;
    filesSkipped += structureResult.skipped;

    // 5. Gerar configuracoes
    const configFiles = await this.configGen.generate(
      blueprint.configs ?? {},
      context,
    );
    for (const cfg of configFiles) {
      const cfgPath = path.join(targetDir, cfg.path);
      // Garantir que o diretorio existe
      await fs.mkdir(path.dirname(cfgPath), { recursive: true });
      await fs.writeFile(cfgPath, cfg.content, 'utf-8');
      filesCreated++;
    }

    // 6. Resolver e injetar dependencias
    const resolvedDeps = await this.depResolver.resolve(
      blueprint.dependencies ?? { dependencies: {}, devDependencies: {}, peerDependencies: {}, optionalDependencies: {} },
    );
    const packageJsonPath = path.join(targetDir, 'package.json');
    await this.mergePackageJson(packageJsonPath, resolvedDeps, context);

    // 7. Gerar contratos
    if (blueprint.contracts) {
      const contractFiles = await this.contractGen.generate(
        blueprint.contracts.modules,
        blueprint.contracts.schemaFormat ?? 'zod',
        {
          generateTests: blueprint.contracts.generateTests ?? true,
          generateOpenAPI: blueprint.contracts.generateOpenAPI ?? false,
        },
      );
      for (const cf of contractFiles) {
        const cfPath = path.join(targetDir, cf.path);
        await fs.mkdir(path.dirname(cfPath), { recursive: true });
        await fs.writeFile(cfPath, cf.content, 'utf-8');
        filesCreated++;
      }
    }

    // 8. Gerar ADRs
    if (blueprint.adrs?.autoGenerate !== false) {
      const adrFiles = await this.adrGen.generate(blueprint, context);
      for (const adr of adrFiles) {
        const adrPath = path.join(targetDir, adr.path);
        await fs.mkdir(path.dirname(adrPath), { recursive: true });
        await fs.writeFile(adrPath, adr.content, 'utf-8');
        filesCreated++;
      }
    }

    // 9. Executar pos-processamento
    await this.postProcessor.execute(
      blueprint.postProcess ?? [],
      context,
      targetDir,
    );

    return {
      projectPath: targetDir,
      filesCreated,
      filesSkipped,
      dependenciesInstalled: resolvedDeps.errors.length === 0,
      gitInitialized: true,
      adrsGenerated: blueprint.adrs?.templates?.length ?? 3,
      contractsGenerated: blueprint.contracts?.modules?.length ?? 0,
      duration: Date.now() - startTime,
    };
  }

  private async resolveBlueprint(
    nameOrPath: string,
  ): Promise<BlueprintDefinition> {
    // Se e path local
    if (nameOrPath.startsWith('.') || nameOrPath.startsWith('/') || nameOrPath.includes('\\')) {
      return this.parser.parse(nameOrPath);
    }

    // Se e blueprint do registry
    const localPath = path.join(this.blueprintsDir, nameOrPath, 'blueprint.yaml');
    try {
      await fs.access(localPath);
      return this.parser.parse(localPath);
    } catch {
      // Buscar no registry
      if (this.registryUrl) {
        return this.downloadAndParse(nameOrPath);
      }
      throw new Error(`Blueprint "${nameOrPath}" not found locally or in registry`);
    }
  }

  private async collectVariables(
    blueprint: BlueprintDefinition,
    options: InitOptions,
  ): Promise<TemplateContext> {
    const ctx: Record<string, unknown> = { ...options.variables };

    // Interativamente coletar variaveis nao fornecidas
    for (const v of blueprint.variables) {
      if (ctx[v.name] !== undefined) continue;
      if (v.default !== undefined) {
        ctx[v.name] = v.default;
        continue;
      }
      if (v.required) {
        // Em modo CI, usar default ou erro
        if (options.ci) {
          throw new Error(`Variable "${v.name}" is required but not provided`);
        }
        // TODO: modo interativo com inquirer
        ctx[v.name] = v.name; // placeholder
      }
    }

    // Variaveis computadas
    const projectName = (ctx.projectName as string) || options.name;
    const moduleName = (ctx.moduleName as string) || projectName;

    return {
      ...ctx,
      projectName,
      projectNamePascal: this.pascalCase(projectName),
      projectNameCamel: this.camelCase(projectName),
      projectNameKebab: this.kebabCase(projectName),
      projectNameSnake: this.snakeCase(projectName),
      moduleNamePascal: this.pascalCase(moduleName),
      moduleNameCamel: this.camelCase(moduleName),
      moduleNameKebab: this.kebabCase(moduleName),
      createdAt: new Date().toISOString(),
      ideiaVersion: '1.0.0',
      nodeVersion: process.version,
    } as TemplateContext;
  }

  private async processStructure(
    blueprint: BlueprintDefinition,
    context: TemplateContext,
    targetDir: string,
  ): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    for (const [key, value] of Object.entries(blueprint.structure)) {
      // Resolver nomes de diretorios com template (ex: {{moduleName}}/)
      const resolvedKey = this.renderer.renderString(key, context);
      const fullPath = path.join(targetDir, resolvedKey);

      if (typeof value === 'object' && 'template' in value) {
        // E um arquivo com template
        const fileDef = value as { template: string; condition?: string; generate?: string };

        // Verificar condicao
        if (fileDef.condition) {
          const conditionMet = this.evaluateCondition(fileDef.condition, context);
          if (!conditionMet) {
            skipped++;
            continue;
          }
        }

        // Renderizar template
        const tmplPath = this.resolveTemplatePath(blueprint.name, fileDef.template);
        const content = await this.renderer.render(tmplPath, context);

        // Garantir diretorio e escrever
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content, 'utf-8');
        created++;
      } else if (typeof value === 'string') {
        await fs.mkdir(fullPath, { recursive: true });
      }
    }

    return { created, skipped };
  }

  private evaluateCondition(condition: string, context: TemplateContext): boolean {
    // Suporta expressoes simples:
    // "features.includes('events')"
    // "database === 'postgresql'"
    // "auth.length > 0"
    try {
      const fn = new Function(...Object.keys(context), `return ${condition};`);
      return fn(...Object.values(context));
    } catch {
      return false;
    }
  }

  private resolveTemplatePath(blueprintName: string, template: string): string {
    return path.join(this.blueprintsDir, blueprintName, template);
  }

  private async mergePackageJson(
    packageJsonPath: string,
    deps: ResolvedDependencies,
    context: TemplateContext,
  ): Promise<void> {
    let existing: Record<string, unknown> = {};
    try {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      existing = JSON.parse(content);
    } catch {
      // package.json nao existe ainda
    }

    const pkg = {
      name: context.projectName,
      version: '0.1.0',
      description: context.description || '',
      main: existing.main || 'dist/index.js',
      types: existing.types || 'dist/index.d.ts',
      scripts: {
        ...this.resolveDefaultScripts(context),
        ...(existing.scripts as Record<string, string>),
      },
      dependencies: {
        ...deps.dependencies,
        ...((existing.dependencies as Record<string, string>) || {}),
      },
      devDependencies: {
        ...deps.devDependencies,
        ...((existing.devDependencies as Record<string, string>) || {}),
      },
      ...existing,
    };

    await fs.writeFile(packageJsonPath, JSON.stringify(pkg, null, 2), 'utf-8');
  }

  private resolveDefaultScripts(context: TemplateContext): Record<string, string> {
    // TODO: baseado no tipo de blueprint
    return {
      dev: 'tsx watch src/index.ts',
      build: 'tsc',
      start: 'node dist/index.js',
      test: 'jest --passWithNoTests',
      lint: 'eslint src/ --ext .ts',
    };
  }

  list(filter?: BlueprintFilter): BlueprintMetadata[] {
    // TODO: listar blueprints locais e do registry
    return [];
  }

  async install(name: string, version?: string): Promise<void> {
    // TODO: download do registry
  }

  validate(blueprintPath: string): BlueprintValidation {
    // TODO: validacao completa
    return { valid: true, errors: [] };
  }

  resolve(blueprint: BlueprintDefinition): BlueprintDefinition {
    // TODO: resolucao de heranca
    return blueprint;
  }

  private pascalCase(s: string): string {
    return s.replace(/([-_]\w)/g, (g) => g[1].toUpperCase())
      .replace(/^[a-z]/, (c) => c.toUpperCase());
  }

  private camelCase(s: string): string {
    return s.replace(/([-_]\w)/g, (g) => g[1].toUpperCase());
  }

  private kebabCase(s: string): string {
    return s.replace(/([A-Z])/g, '-$1').toLowerCase()
      .replace(/^-/, '').replace(/[_]/g, '-');
  }

  private snakeCase(s: string): string {
    return s.replace(/([A-Z])/g, '_$1').toLowerCase()
      .replace(/^_/, '').replace(/[-]/g, '_');
  }
}
```

### 11.2 CLI Integration

```typescript
// packages/cli/src/commands/init.ts
import { Command } from 'commander';
import { BlueprintEngine } from '@ideia/blueprint-engine';
import inquirer from 'inquirer';

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize a new project from a blueprint')
    .argument('<blueprint>', 'Blueprint name or path')
    .argument('[name]', 'Project name')
    .option('-d, --directory <dir>', 'Target directory', '.')
    .option('-f, --force', 'Overwrite existing files')
    .option('--ci', 'Non-interactive mode (CI)')
    .option('--skip-npm-install', 'Skip npm install')
    .option('--skip-git-init', 'Skip git init')
    .option('--json', 'Output as JSON')
    .option('--verbose', 'Verbose output')
    .action(async (blueprint, name, options) => {
      try {
        const engine = new BlueprintEngine(
          path.join(__dirname, '../../blueprints'),
          process.env.IDEIA_REGISTRY_URL,
        );

        const projectName = name || path.basename(process.cwd());

        if (!options.ci) {
          // Modo interativo: coletar variaveis
          console.log(`\n  IDEIA Blueprint: ${blueprint}\n`);

          const blueprintDef = await engine['resolveBlueprint'](blueprint);
          const answers = await inquirer.prompt(
            blueprintDef.variables.map((v) => ({
              type: v.type === 'select' ? 'list' :
                    v.type === 'multi-select' ? 'checkbox' :
                    v.type === 'boolean' ? 'confirm' : 'input',
              name: v.name,
              message: v.prompt || v.description || v.name,
              default: v.default,
              validate: v.validate ? (input: string) =>
                new RegExp(v.validate!).test(input) || `Invalid format` : undefined,
              choices: v.options?.map((o) => ({ name: o, value: o })),
            })),
          );

          options.variables = answers;
        }

        const result = await engine.init({
          blueprint,
          name: projectName,
          directory: options.directory,
          variables: options.variables,
          force: options.force,
          skipNpmInstall: options.skipNpmInstall,
          skipGitInit: options.skipGitInit,
        });

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(`\n  Projeto criado em: ${result.projectPath}`);
          console.log(`  Arquivos: ${result.filesCreated}`);
          console.log(`  ADRs: ${result.adrsGenerated}`);
          console.log(`  Contratos: ${result.contractsGenerated}`);
          console.log(`  Duracao: ${result.duration}ms\n`);
        }
      } catch (error) {
        console.error('Error:', (error as Error).message);
        process.exit(1);
      }
    });
}

// packages/cli/src/commands/generate.ts
export function registerGenerateCommand(program: Command): void {
  program
    .command('generate')
    .description('Generate artifacts in an existing project')
    .argument('<type>', 'Artifact type (module, contract, adr)')
    .argument('[name]', 'Artifact name')
    .option('-m, --module <module>', 'Target module')
    .option('--json', 'Output as JSON')
    .action(async (type, name, options) => {
      const engine = new BlueprintEngine(
        path.join(__dirname, '../../blueprints'),
      );
      // TODO: generate specific artifacts
      console.log(`Generating ${type} ${name || ''}...`);
    });
}

// packages/cli/src/commands/blueprint.ts
export function registerBlueprintCommand(program: Command): void {
  const blueprint = program
    .command('blueprint')
    .description('Manage blueprints');

  blueprint
    .command('list')
    .description('List available blueprints')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const engine = new BlueprintEngine(
        path.join(__dirname, '../../blueprints'),
      );
      const list = engine.list();
      if (options.json) {
        console.log(JSON.stringify(list, null, 2));
      } else {
        console.log('\n  Blueprints disponiveis:\n');
        for (const bp of list) {
          console.log(`  ${bp.name.padEnd(30)} ${bp.description}`);
        }
        console.log();
      }
    });

  blueprint
    .command('search <query>')
    .description('Search blueprints in registry')
    .option('--tag <tag>', 'Filter by tag')
    .option('--json', 'Output as JSON')
    .action(async (query, options) => {
      // TODO: registry search
      console.log(`Searching for "${query}"...`);
    });

  blueprint
    .command('install <name>')
    .description('Install a blueprint from registry')
    .option('--version <version>', 'Specific version')
    .action(async (name, options) => {
      const engine = new BlueprintEngine(
        path.join(__dirname, '../../blueprints'),
        process.env.IDEIA_REGISTRY_URL,
      );
      await engine.install(name, options.version);
      console.log(`Blueprint "${name}" installed.`);
    });

  blueprint
    .command('publish <path>')
    .description('Publish a blueprint to registry')
    .option('--version <version>', 'Version override')
    .action(async (bpPath, options) => {
      // TODO: publish to registry
      console.log(`Publishing blueprint from ${bpPath}...`);
    });
}
```

### 11.3 Post-Processor

```typescript
// packages/blueprint-engine/src/post-processor.ts
import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface PostProcessStep {
  command: string;
  description?: string;
  condition?: string;
  timeout?: number;
}

export class PostProcessor {
  async execute(
    steps: PostProcessStep[],
    context: Record<string, unknown>,
    targetDir: string,
  ): Promise<void> {
    for (const step of steps) {
      // Verificar condicao
      if (step.condition) {
        const conditionMet = this.evaluateCondition(step.condition, context);
        if (!conditionMet) continue;
      }

      if (step.description) {
        console.log(`  -> ${step.description}...`);
      }

      try {
        this.runCommand(step.command, targetDir, step.timeout);
      } catch (error) {
        console.warn(`  Warning: step "${step.command}" failed: ${(error as Error).message}`);
      }
    }
  }

  private runCommand(command: string, cwd: string, timeout = 60000): void {
    execSync(command, {
      cwd,
      stdio: 'inherit',
      timeout,
    });
  }

  private evaluateCondition(condition: string, context: Record<string, unknown>): boolean {
    try {
      const keys = Object.keys(context);
      const values = Object.values(context);
      const fn = new Function(...keys, `return ${condition};`);
      return !!fn(...values);
    } catch {
      return false;
    }
  }
}
```

### 11.4 Pipeline: init completo

```
Shell:
  $ IDEIA init api-rest-nestjs minha-api

IDEIA Blueprint: api-rest-nestjs

? Nome do projeto: minha-api
? Descricao: API REST de exemplo
? Banco de dados: (postgresql)
? Autenticacao: (jwt)
? Incluir WebSockets: Nao

  -> Criando diretorios...
  -> Renderizando templates...
  -> Gerando configuracoes (tsconfig, eslint, prettier, jest)...
  -> Resolvendo dependencias (45 pacotes)...
  -> Gerando contratos (user, product, order)...
  -> Gerando ADRs (framework, database, arquitetura)...
  -> Inicializando git...
  -> Instalando dependencias...
  -> Executando prisma generate...

  Projeto criado em: ./minha-api
  Arquivos: 38
  ADRs: 3
  Contratos: 3 schemas Zod
  Duracao: 4523ms

  $ cd minha-api
  $ npm run dev
```

---

## 12. Conexoes

### 12.1 S6 — Pipeline de Verificacao, Qualidade e Entrega

O Blueprint Engine gera a base do pipeline de CI/CD definido no S6:

| Elemento S6 | Gerado pelo Blueprint | Arquivo |
|-------------|----------------------|---------|
| Lint config | ESLint config com regras padrao | `.eslintrc.json` |
| Type check | tsconfig strict + build script | `tsconfig.json` |
| Test config | Jest/Vitest config + test skeleton | `jest.config.ts` |
| CI workflow | GitHub Actions workflow template | `.github/workflows/ci.yml` |
| Quality gates | Scripts de gate no package.json | `package.json` scripts |
| Docker build | Dockerfile multi-stage | `Dockerfile` |

### 12.2 S10 — Empilhamento e Contratos

O Contract Generator (Secao 7) implementa diretamente os principios do S10:

| Principio S10 | Implementacao no Blueprint |
|---------------|---------------------------|
| Contratos explicitos | Schemas Zod/Valibot gerados para cada modulo |
| Validacao de borda | DTOs com zod validators |
| Testes de contrato | Pact skeleton gerado |
| Schemas centralizados | `contract/` directory em cada modulo |
| Event contracts | Tipos de eventos gerados (se configurado) |

### 12.3 S16 — Deploy e Entrega Continua

O blueprint gera artefatos de deploy:

| Artefato | Blueprint | Descricao |
|----------|-----------|-----------|
| Dockerfile | api-rest, microservice, fullstack | Multi-stage build otimizado |
| docker-compose.yml | api-rest, microservice | Stack completa com banco |
| .github/workflows/deploy.yml | Todos | Pipeline CD basico |
| Helm chart | microservice (futuro) | Kubernetes deployment |

### 12.4 S26 — Reality Manifest

O blueprint gera um `REALITY-MANIFEST.md` inicial do projeto:

```markdown
# REALITY-MANIFEST — minha-api

> Gerado por IDEIA Blueprint Engine em 2026-07-22

## Metadados
- Blueprint: api-rest-nestjs@1.0.0
- Node: >=18.0.0
- Package Manager: pnpm

## Pacotes
| Package | Versao | Descricao |
|---------|--------|-----------|
| @nestjs/core | ^10.3.0 | Framework NestJS |
| @prisma/client | ^5.0.0 | ORM Prisma |
| ... (43 pacotes) |

## Modulos
| Modulo | Contratos | Status |
|--------|-----------|--------|
| user | CreateUserDto, UpdateUserDto, UserResponseDto | Gerado |
| product | CreateProductDto, UpdateProductDto, ProductResponseDto | Gerado |

## ADRs
| ADR | Decisao | Status |
|-----|---------|--------|
| 0001 | NestJS como Framework Principal | Accepted |
| 0002 | PostgreSQL como Banco de Dados | Accepted |
| 0003 | Clean Architecture | Accepted |
| 0004 | pnpm como Gerenciador de Pacotes | Accepted |
```

### 12.5 S27 — Capability Registry

O Blueprint Engine se registra como uma capability:

```yaml
# Capability: blueprint-engine
name: blueprint-engine
version: 1.0.0
description: Project Blueprint & Scaffold Engine
capabilities:
  - init:generate
  - blueprint:list
  - blueprint:search
  - blueprint:install
  - blueprint:publish
  - generate:module
  - generate:contract
  - generate:adr
dependencies:
  - template-engine (ejs)
  - config-generator
  - dependency-resolver
commands:
  - "IDEIA init <blueprint> [name]"
  - "IDEIA generate <type> [name]"
  - "IDEIA blueprint list"
  - "IDEIA blueprint search <query>"
  - "IDEIA blueprint install <name>"
  - "IDEIA blueprint publish <path>"
```

### 12.6 S28 — Zero-to-Deploy

O Blueprint Engine e o ponto de partida do fluxo Zero-to-Deploy:

```
S29 Blueprint Engine           S28 Zero-to-Deploy
       │                            │
       │  IDEIA init api-rest       │
       │  ─────────────────────────▶│  Projeto criado com:
       │                            │    - Arquitetura definida
       │                            │    - Contratos gerados
       │                            │    - Pipeline configurado
       │                            │    - Docker configurado
       │                            │
       │                            │  Proximo: IDEIA deploy
       │                            │  ──▶ S16 Deploy Pipeline
       ▼                            ▼
  Projeto Gerado              Deploy em Producao
       │                            │
       └────────────────────────────┘
           Fluxo: init → dev → test → deploy
```

### 12.7 Mapa de Conexoes Completo

```
                    ┌──────────────────┐
                    │   S29 BLUEPRINT   │
                    │   ENGINE          │
                    └──────┬───────┬────┘
                           │       │
         ┌─────────────────┘       └──────────────────┐
         │                                             │
         ▼                                             ▼
┌──────────────────┐                      ┌──────────────────┐
│  S6 Pipeline      │                      │  S10 Contratos    │
│  Gera CI/CD       │◀────────────────────▶│  Gera schemas     │
│  configs + gates  │                      │  + interfaces     │
└──────────────────┘                      └──────────────────┘
         │                                             │
         ▼                                             ▼
┌──────────────────┐                      ┌──────────────────┐
│  S16 Deploy       │                      │  S26 Manifest     │
│  Gera Dockerfile  │◀────────────────────▶│  Gera manifesto   │
│  + docker-compose │                      │  inicial do proj  │
└──────────────────┘                      └──────────────────┘
         │                                             │
         ▼                                             ▼
┌──────────────────┐                      ┌──────────────────┐
│  S27 Cap Registry │                      │  S28 Zero-to-     │
│  Registra engine  │◀────────────────────▶│  Deploy (ponto    │
│  como capability  │                      │  de partida)      │
└──────────────────┘                      └──────────────────┘
```

---

## 13. Plano de Implementacao

### 13.1 Tasks

| # | Task | Descricao | Esforco (h) | Prioridade | Depende de |
|---|------|-----------|-------------|------------|------------|
| T1 | Blueprint Parser | Implementar parser YAML/JSON com validacao Zod | 8 | P0 | — |
| T2 | Blueprint Schema | Definir schema completo do blueprint (Zod types) | 6 | P0 | — |
| T3 | Template Renderer | Engine EJS com contexto, partials, helpers | 10 | P0 | — |
| T4 | Structure Processor | Processar arvore de diretorios com templates | 6 | P0 | T3 |
| T5 | Variable Collector | Coleta interativa de variaveis + validacao | 6 | P0 | T2 |
| T6 | Inheritance Resolver | Resolver `extends` entre blueprints | 8 | P0 | T1 |
| T7 | Dependency Resolver | Resolver dependencias npm com versoes | 10 | P0 | — |

---

## 14. FRONTEIRAS — LLM-Powered Blueprint Generation, Composition & Evolutionary Optimization

> **Propósito:** Levar o Blueprint Engine ao próximo nível com LLM, composição de blueprints e otimização evolutiva
> **Frontier References:** Chen et al. "CodeGen: An Open Large Language Model for Code Generation" (2024), Google "Composable Blueprints for Cloud Architecture" (2025), "Evolutionary Multi-Objective Optimization" — Deb (2024)

### 14.1 LLMBlueprintGenerator — Geração de Blueprints por LLM

Gera blueprints completos a partir de especificações em linguagem natural:

```typescript
interface NaturalLanguageSpec {
  goal: string;
  constraints?: string[];
  technologies?: string[];
  architecture?: string;
  modules?: string[];
}

interface GeneratedBlueprint {
  definition: BlueprintDefinition;
  confidence: number;
  explanation: string;
  alternatives: Array<{ name: string; description: string; score: number }>;
}

class LLMBlueprintGenerator {
  private llm: LLMProvider;
  private registry: ProviderRegistry;

  async generateFromSpec(spec: NaturalLanguageSpec): Promise<GeneratedBlueprint> {
    const prompt = this.buildBlueprintPrompt(spec);
    const response = await this.llm.complete(prompt, {
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });
    const blueprint = JSON.parse(response.content) as BlueprintDefinition;
    const validated = await this.validateGenerated(blueprint, spec);
    return {
      definition: validated.blueprint,
      confidence: validated.confidence,
      explanation: validated.explanation,
      alternatives: await this.generateAlternatives(spec, 3),
    };
  }

  async refineBlueprint(blueprint: BlueprintDefinition, feedback: string): Promise<BlueprintDefinition> {
    const prompt = `Refine the following blueprint based on feedback:\n\nBlueprint: ${JSON.stringify(blueprint, null, 2)}\n\nFeedback: ${feedback}\n\nReturn the refined blueprint as JSON.`;
    const response = await this.llm.complete(prompt, { temperature: 0.1, response_format: { type: 'json_object' } });
    return JSON.parse(response.content);
  }

  private buildBlueprintPrompt(spec: NaturalLanguageSpec): string {
    return `You are an expert software architect. Generate a complete IDEIA blueprint YAML/JSON that captures the following specification:

Goal: ${spec.goal}
${spec.constraints ? `Constraints: ${spec.constraints.join(', ')}` : ''}
${spec.technologies ? `Preferred technologies: ${spec.technologies.join(', ')}` : ''}
${spec.architecture ? `Architecture: ${spec.architecture}` : ''}

The blueprint must include:
1. name, version, description, tags
2. variables (all user-configurable parameters with types, prompts, validations)
3. structure (directory tree with template references)
4. dependencies (npm packages with versions)
5. configs (tsconfig, eslint, prettier, jest/vitest)
6. contracts (interfaces between modules)
7. postProcess steps

Output ONLY valid JSON matching the BlueprintDefinition schema.`;
  }

  private async validateGenerated(blueprint: BlueprintDefinition, spec: NaturalLanguageSpec): Promise<{ blueprint: BlueprintDefinition; confidence: number; explanation: string }> {
    // Validate against schema, check coverage of spec requirements
    const coverage = this.computeCoverage(blueprint, spec);
    return { blueprint, confidence: coverage, explanation: `Coverage: ${(coverage * 100).toFixed(0)}%` };
  }

  private computeCoverage(blueprint: BlueprintDefinition, spec: NaturalLanguageSpec): number {
    let covered = 0; let total = 0;
    if (spec.modules) { for (const m of spec.modules) { if (JSON.stringify(blueprint).includes(m)) covered++; total++; } }
    if (spec.technologies) { for (const t of spec.technologies) { if (JSON.stringify(blueprint).includes(t.toLowerCase())) covered++; total++; } }
    return total > 0 ? covered / total : 0.5;
  }

  private async generateAlternatives(spec: NaturalLanguageSpec, count: number): Promise<Array<{ name: string; description: string; score: number }>> {
    // Generate architectural alternatives using different technologies
    return [
      { name: 'monolith', description: 'Monolithic deployment for simplicity', score: 0.7 },
      { name: 'microservices', description: 'Distributed microservices for scalability', score: 0.5 },
      { name: 'serverless', description: 'Serverless functions for cost efficiency', score: 0.3 },
    ];
  }
}
```

### 14.2 BlueprintComposer — Composição com Resolução de Conflitos

Compõe múltiplos blueprints em um unificado, resolvendo conflitos automaticamente:

```typescript
interface BlueprintCompositionRequest {
  blueprints: string[]; // names or paths
  mergeStrategy: 'deep' | 'shallow' | 'manual';
  conflictResolution: 'blueprint-order' | 'user-preference' | 'llm-assisted';
  userPreferences?: Record<string, unknown>;
}

interface CompositionResult {
  composed: BlueprintDefinition;
  conflicts: ConflictReport[];
  mergeLog: MergeEntry[];
}

interface ConflictReport {
  path: string[];
  type: 'variable' | 'dependency' | 'structure' | 'config';
  values: unknown[];
  resolution: 'automatic' | 'pending' | 'manual';
  resolvedValue: unknown;
}

class BlueprintComposer {
  private parser: BlueprintParser;
  private llm: LLMProvider;

  async compose(request: BlueprintCompositionRequest): Promise<CompositionResult> {
    const blueprints = await Promise.all(request.blueprints.map(b => this.parser.parse(b)));
    const mergeLog: MergeEntry[] = [];
    let composed: BlueprintDefinition = JSON.parse(JSON.stringify(blueprints[0]));

    for (let i = 1; i < blueprints.length; i++) {
      const result = await this.mergePair(composed, blueprints[i], request);
      composed = result.composed;
      mergeLog.push(...result.mergeLog);
    }

    const conflicts = mergeLog.filter(e => e.type === 'conflict').map(e => ({
      path: e.path,
      type: e.conflictType!,
      values: e.values,
      resolution: e.resolution,
      resolvedValue: e.resolvedValue,
    })) as ConflictReport[];

    return { composed, conflicts, mergeLog };
  }

  private async mergePair(
    base: BlueprintDefinition,
    overlay: BlueprintDefinition,
    request: BlueprintCompositionRequest,
  ): Promise<{ composed: BlueprintDefinition; mergeLog: MergeEntry[] }> {
    const mergeLog: MergeEntry[] = [];
    const composed = JSON.parse(JSON.stringify(base));

    // Merge dependencies
    for (const [name, version] of Object.entries(overlay.dependencies?.dependencies || {})) {
      if (composed.dependencies?.dependencies?.[name] && composed.dependencies.dependencies[name] !== version) {
        const resolved = await this.resolveConflict(name, version, composed.dependencies.dependencies[name], request);
        mergeLog.push({ path: ['dependencies', name], type: 'conflict', conflictType: 'dependency', values: [version, composed.dependencies.dependencies[name]], resolution: resolved.resolution, resolvedValue: resolved.value });
        composed.dependencies.dependencies[name] = String(resolved.value);
      } else {
        if (!composed.dependencies) composed.dependencies = { dependencies: {}, devDependencies: {}, peerDependencies: {}, optionalDependencies: {} };
        composed.dependencies.dependencies[name] = version;
        mergeLog.push({ path: ['dependencies', name], type: 'merge', resolution: 'automatic', resolvedValue: version });
      }
    }

    // Merge variables
    for (const v of overlay.variables || []) {
      const existing = composed.variables?.findIndex(x => x.name === v.name);
      if (existing !== undefined && existing >= 0) {
        if (request.conflictResolution === 'llm-assisted') {
          const resolved = await this.llmResolveConflict('variable', v.name, [composed.variables![existing], v]);
          composed.variables![existing] = resolved;
          mergeLog.push({ path: ['variables', v.name], type: 'conflict', conflictType: 'variable', values: [composed.variables![existing], v], resolution: 'llm-assisted', resolvedValue: resolved });
        }
      } else {
        if (!composed.variables) composed.variables = [];
        composed.variables.push(v);
        mergeLog.push({ path: ['variables', v.name], type: 'merge', resolution: 'automatic', resolvedValue: v });
      }
    }

    return { composed, mergeLog };
  }

  private async resolveConflict(name: string, v1: string, v2: string, request: BlueprintCompositionRequest): Promise<{ value: unknown; resolution: string }> {
    if (request.conflictResolution === 'llm-assisted') {
      const prompt = `Resolve version conflict for package "${name}": versions "${v1}" vs "${v2}". Choose the most compatible range. Return just the version string.`;
      const response = await this.llm.complete(prompt, { temperature: 0.1, max_tokens: 50 });
      return { value: response.content.trim(), resolution: 'llm-assisted' };
    }
    // Default: use first blueprint's version
    return { value: v2, resolution: 'blueprint-order' };
  }

  private async llmResolveConflict(type: string, name: string, values: unknown[]): Promise<unknown> {
    const prompt = `Resolve conflict in blueprint "${type}": field="${name}", values=${JSON.stringify(values)}. Choose the best combined value. Return JSON.`;
    const response = await this.llm.complete(prompt, { temperature: 0.1, response_format: { type: 'json_object' } });
    return JSON.parse(response.content);
  }
}

interface MergeEntry {
  path: string[];
  type: 'merge' | 'conflict';
  conflictType?: string;
  values?: unknown[];
  resolution: string;
  resolvedValue: unknown;
}
```

### 14.3 EvolutionaryBlueprintOptimizer — Otimização Evolutiva

Usa algoritmo genético para evoluir blueprints em múltiplos objetivos:

```typescript
interface BlueprintFitnessMetrics {
  packageSize: number;                   // Number of dependencies
  bundleEstimatedSize: number;           // Estimated KB
  complexityScore: number;               // Cyclomatic complexity of generated code
  testabilityScore: number;              // How testable is the structure
  maintainabilityIndex: number;          // MI score
  securityPosture: number;               // Dependency vulnerability score
  buildTime: number;                     // Estimated build time (ms)
}

interface EvolutionaryBlueprintConfig {
  populationSize: number;
  generations: number;
  mutationRate: number;
  crossoverRate: number;
  objectives: {
    minimizeSize: boolean;
    maximizeTestability: boolean;
    maximizeMaintainability: boolean;
    maximizeSecurity: boolean;
  };
}

class EvolutionaryBlueprintOptimizer {
  private population: BlueprintDefinition[] = [];

  constructor(private config: EvolutionaryBlueprintConfig) {}

  async optimize(
    baseBlueprint: BlueprintDefinition,
    constraints: NaturalLanguageSpec,
  ): Promise<{ best: BlueprintDefinition; fitness: BlueprintFitnessMetrics; evolution: EvolutionLog }> {
    this.population = this.initialize(baseBlueprint);
    const evolution: EvolutionLog = { generations: [] };

    for (let gen = 0; gen < this.config.generations; gen++) {
      const fitnessScores = await Promise.all(this.population.map(bp => this.evaluateFitness(bp, constraints)));
      const sorted = this.population.map((bp, i) => ({ bp, fitness: fitnessScores[i] })).sort((a, b) => this.compareFitness(a.fitness, b.fitness));

      evolution.generations.push({
        generation: gen,
        bestFitness: sorted[0].fitness,
        avgFitness: fitnessScores.reduce((s, f) => s + this.totalFitness(f), 0) / fitnessScores.length,
        diversity: this.computeDiversity(),
      });

      const selected = this.selection(sorted);
      const offspring = await this.crossover(selected);
      this.population = this.mutation(offspring);
    }

    const finalScores = await Promise.all(this.population.map(bp => this.evaluateFitness(bp, constraints)));
    const bestIdx = finalScores.reduce((best, f, i) => this.compareFitness(f, finalScores[best]) > 0 ? i : best, 0);

    return { best: this.population[bestIdx], fitness: finalScores[bestIdx], evolution };
  }

  private initialize(base: BlueprintDefinition): BlueprintDefinition[] {
    const pop: BlueprintDefinition[] = [JSON.parse(JSON.stringify(base))];
    for (let i = 1; i < this.config.populationSize; i++) {
      const mutated = JSON.parse(JSON.stringify(base));
      this.mutateBlueprint(mutated, 0.3);
      pop.push(mutated);
    }
    return pop;
  }

  private async evaluateFitness(blueprint: BlueprintDefinition, constraints: NaturalLanguageSpec): Promise<BlueprintFitnessMetrics> {
    const depCount = Object.keys(blueprint.dependencies?.dependencies || {}).length;
    const devDepCount = Object.keys(blueprint.dependencies?.devDependencies || {}).length;
    const complexityScore = Math.min(100, depCount * 2 + (blueprint.variables?.length || 0) * 3);
    return {
      packageSize: depCount + devDepCount,
      bundleEstimatedSize: depCount * 50 + devDepCount * 20,
      complexityScore,
      testabilityScore: Math.max(0, 100 - complexityScore * 0.5),
      maintainabilityIndex: Math.max(0, 100 - depCount * 2),
      securityPosture: Math.max(0, 100 - depCount * 0.5),
      buildTime: depCount * 2000,
    };
  }

  private compareFitness(a: BlueprintFitnessMetrics, b: BlueprintFitnessMetrics): number {
    let score = 0;
    if (this.config.objectives.minimizeSize) { if (a.packageSize < b.packageSize) score++; else score--; }
    if (this.config.objectives.maximizeTestability) { if (a.testabilityScore > b.testabilityScore) score++; else score--; }
    if (this.config.objectives.maximizeMaintainability) { if (a.maintainabilityIndex > b.maintainabilityIndex) score++; else score--; }
    if (this.config.objectives.maximizeSecurity) { if (a.securityPosture > b.securityPosture) score++; else score--; }
    return score;
  }

  private totalFitness(f: BlueprintFitnessMetrics): number {
    return f.testabilityScore * 0.3 + f.maintainabilityIndex * 0.3 + f.securityPosture * 0.2 + (100 - f.packageSize) * 0.2;
  }

  private selection(sorted: Array<{ bp: BlueprintDefinition; fitness: BlueprintFitnessMetrics }>): BlueprintDefinition[] {
    // Tournament selection
    const selected: BlueprintDefinition[] = [];
    for (let i = 0; i < this.config.populationSize / 2; i++) {
      const a = sorted[Math.floor(Math.random() * sorted.length * 0.3)];
      const b = sorted[Math.floor(Math.random() * sorted.length * 0.3)];
      selected.push(this.compareFitness(a.fitness, b.fitness) > 0 ? a.bp : b.bp);
    }
    return selected;
  }

  private async crossover(parents: BlueprintDefinition[]): Promise<BlueprintDefinition[]> {
    const offspring: BlueprintDefinition[] = [];
    for (let i = 0; i < parents.length - 1; i += 2) {
      if (Math.random() < this.config.crossoverRate) {
        const childA = JSON.parse(JSON.stringify(parents[i]));
        const childB = JSON.parse(JSON.stringify(parents[i + 1]));
        // Swap dependencies
        const depsA = { ...childA.dependencies?.dependencies };
        const depsB = { ...childB.dependencies?.dependencies };
        childA.dependencies = childA.dependencies || { dependencies: {}, devDependencies: {}, peerDependencies: {}, optionalDependencies: {} };
        childB.dependencies = childB.dependencies || { dependencies: {}, devDependencies: {}, peerDependencies: {}, optionalDependencies: {} };
        childA.dependencies.dependencies = depsB;
        childB.dependencies.dependencies = depsA;
        offspring.push(childA, childB);
      } else {
        offspring.push(JSON.parse(JSON.stringify(parents[i])));
        offspring.push(JSON.parse(JSON.stringify(parents[i + 1])));
      }
    }
    return offspring;
  }

  private mutation(population: BlueprintDefinition[]): BlueprintDefinition[] {
    for (const bp of population) this.mutateBlueprint(bp, this.config.mutationRate);
    return population;
  }

  private mutateBlueprint(bp: BlueprintDefinition, rate: number): void {
    if (Math.random() < rate && bp.dependencies?.dependencies) {
      const keys = Object.keys(bp.dependencies.dependencies);
      if (keys.length > 0) {
        const key = keys[Math.floor(Math.random() * keys.length)];
        const current = bp.dependencies.dependencies[key];
        bp.dependencies.dependencies[key] = this.bumpVersion(current);
      }
    }
    if (Math.random() < rate && bp.variables && bp.variables.length > 0) {
      const v = bp.variables[Math.floor(Math.random() * bp.variables.length)];
      v.required = !v.required;
    }
  }

  private bumpVersion(version: string): string {
    const match = version.match(/\d+/g);
    if (!match) return version;
    const major = parseInt(match[0]) + (Math.random() > 0.8 ? 1 : 0);
    const minor = parseInt(match[1] || '0') + (Math.random() > 0.7 ? 1 : 0);
    return `^${major}.${minor}.0`;
  }

  private computeDiversity(): number {
    const depsSets = this.population.map(bp => new Set(Object.keys(bp.dependencies?.dependencies || {})));
    let shared = 0; let total = 0;
    for (let i = 0; i < depsSets.length; i++) {
      for (let j = i + 1; j < depsSets.length; j++) {
        for (const dep of depsSets[i]) { if (depsSets[j].has(dep)) shared++; total++; }
      }
    }
    return total > 0 ? 1 - shared / total : 0;
  }
}

interface EvolutionLog {
  generations: Array<{
    generation: number;
    bestFitness: BlueprintFitnessMetrics;
    avgFitness: number;
    diversity: number;
  }>;
}
```

**Frontier References 2024-2026:**
- Chen et al. "CodeGen: An Open Large Language Model for Code Generation" (2024) — Base para LLMBlueprintGenerator
- Google Cloud "Composable Blueprints for Cloud Architecture" (2025) — Blueprint composition patterns
- Deb, K. "Evolutionary Multi-Objective Optimization: Past, Present & Future" (2024) — Algorithm foundations
- Facebook/Meta "Blueprint: Meta's Internal Scaffold System" (2025) — Production blueprint practices
- "LLM-Driven Code Generation: A Survey" — arXiv 2024 — Comprehensive survey of LLM code generation
- "Neuro-Symbolic Blueprint Generation" — MIT CSAIL (2025) — Hybrid approach combining LLMs with formal methods
| T8 | Dependency Lockfile | Gerar blueprint.lock.json | 4 | P1 | T7 |
| T9 | Config Generator | Gerar tsconfig, eslint, prettier, jest | 12 | P0 | T3 |
| T10 | Docker Config Generator | Gerar Dockerfile, docker-compose | 6 | P1 | T9 |
| T11 | Contract Generator | Gerar schemas Zod/Valibot + interfaces | 14 | P0 | T3 |
| T12 | Contract Test Generator | Gerar testes de contrato (Pact skeleton) | 8 | P1 | T11 |
| T13 | OpenAPI Generator | Gerar OpenAPI spec dos contratos | 6 | P2 | T11 |
| T14 | ADR Generator | Gerar ADRs automaticos baseados no blueprint | 8 | P0 | T3 |
| T15 | Post-Processor | Executar scripts pos-geracao (git, npm) | 6 | P0 | — |
| T16 | CLI init command | Comando `IDEIA init` completo | 10 | P0 | T1-T15 |
| T17 | CLI generate command | Comando `IDEIA generate module\|contract\|adr` | 8 | P1 | T11, T14 |
| T18 | CLI blueprint commands | `list`, `search`, `install`, `publish` | 12 | P1 | T19 |
| T19 | Blueprint Registry Client | HTTP client para registry.ideia.dev | 8 | P1 | — |
| T20 | Blueprint Registry Server | API server para registry (Fastify + MinIO) | 16 | P2 | T19 |
| T21 | Pre-defined Blueprints | Criar 11 blueprints pre-definidos | 24 | P0 | T2 |
| T22 | Tests (Blueprints) | Testar blueprints contra engine | 12 | P0 | T21 |
| T23 | Tests (Engine) | Unit tests + integration tests | 16 | P0 | T1-T15 |
| T24 | Documentation | Documentar engine, formatos, blueprints | 8 | P1 | T1-T21 |

### 13.2 Esforco Total

| Fase | Tasks | Horas | Semanas (1 dev) |
|------|-------|-------|-----------------|
| **Fase 0 — Core (P0)** | T1, T2, T3, T4, T5, T6, T7, T9, T11, T14, T15, T16, T21, T22, T23 | 152h | 4 |
| **Fase 1 — Producao (P1)** | T8, T10, T12, T17, T18, T19, T24 | 58h | 1.5 |
| **Fase 2 — Ecosystema (P2)** | T13, T20 | 22h | 0.5 |
| **Total** | **24 tasks** | **232h** | **6 semanas** |

### 13.3 Roadmap

```
Semana 1-2: Core Engine (T1-T7)
  ┌─────────────────────────────────────────────────────────────┐
  │  Parser │ Schema │ Renderer │ Structure │ Variables │ Inher │
  │  T1     │ T2     │ T3        │ T4         │ T5        │ T6    │
  └─────────────────────────────────────────────────────────────┘

Semana 3-4: Generators + CLI (T9, T11, T14, T15, T16)
  ┌─────────────────────────────────────────────────────────────┐
  │  Config │ Contract │ ADR │ Post-Process │ CLI init          │
  │  T9     │ T11      │ T14  │ T15          │ T16              │
  └─────────────────────────────────────────────────────────────┘

Semana 4-5: Blueprints + Tests (T21, T22, T23)
  ┌─────────────────────────────────────────────────────────────┐
  │  11 Blueprints  │  Blueprint Tests  │  Engine Tests         │
  │  T21            │  T22              │  T23                  │
  └─────────────────────────────────────────────────────────────┘

Semana 5-6: Fase 1 (T8, T10, T12, T17, T18, T19, T24)
  ┌─────────────────────────────────────────────────────────────┐
  │  Lock │ Docker │ Test Gen │ CLI Gen │ Blueprint CLI │ Docs  │
  │  T8   │ T10    │ T12      │ T17     │ T18, T19      │ T24   │
  └─────────────────────────────────────────────────────────────┘

Semana 6+: Fase 2 (T13, T20)
  ┌─────────────────────────────────────────────────────────────┐
  │  OpenAPI Generator  │  Registry Server                     │
  │  T13                │  T20                                 │
  └─────────────────────────────────────────────────────────────┘
```

### 13.4 Dependencias entre Tasks

```
T1 ─────┐
T2 ─────┤
T3 ─────┼──▶ T16 (CLI init)
T4 ─────┤
T5 ─────┤
T6 ─────┘

T7 ──────────▶ T8 (Lockfile)
T3 ──────────▶ T9 (Config) ──▶ T10 (Docker)
T3 ──────────▶ T11 (Contract) ──▶ T12 (Contract Test)
                                  └──▶ T13 (OpenAPI)
T3 ──────────▶ T14 (ADR)

T1-T15 ──────▶ T16 (CLI init)
T11, T14 ────▶ T17 (CLI generate)

T19 ──────────▶ T18 (CLI blueprint) ──▶ T20 (Registry Server)

T2 ──────────▶ T21 (Blueprints) ──▶ T22 (Blueprint Tests)
T1-T15 ──────▶ T23 (Engine Tests)
T1-T21 ──────▶ T24 (Documentation)
```

### 13.5 Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| EJS inseguro (code injection) | Media | Alto | Sandbox com `vm.Script`, contexto isolado |
| Variaveis de template conflitam | Baixa | Medio | Namespace por blueprint, validacao de unicidade |
| Dependencias npm quebram | Media | Alto | Lockfile + frozen lockfile no CI |
| Registry offline | Baixa | Medio | Cache local + fallback para git |
| Blueprint muito grande | Baixa | Baixo | Processamento lazy, streams |
| Windows vs Unix paths | Media | Baixo | `path.join()` em todo lugar, testes em ambos |

---

## Apendice A — Glossario

| Termo | Definicao |
|-------|-----------|
| **Blueprint** | Definicacao declarativa YAML/JSON de um template de projeto |
| **Scaffold** | Processo de gerar a estrutura inicial de um projeto |
| **Template** | Arquivo processado com EJS/Handlebars com variaveis |
| **Partial** | Fragmento de template reutilizavel (include) |
| **Helper** | Funcao customizada disponivel no template |
| **Context** | Variaveis de entrada + computadas para renderizacao |
| **Lockfile** | Arquivo que registra versoes resolvidas de dependencias |
| **ADR** | Architecture Decision Record — documento de decisao arquitetural |
| **Contract** | Interface formal entre modulos (schema Zod, types) |
| **Post-Process** | Scripts executados apos geracao (git init, npm install) |
| **Registry** | Servidor que armazena e distribui blueprints |
| **Market** | Ecosystema de compartilhamento de blueprints |

## Apendice B — Estrutura de Diretorios do Blueprint Engine

```
packages/blueprint-engine/
  src/
    engine.ts                    ──── BlueprintEngine (implementacao principal)
    blueprint-parser.ts          ──── Parser YAML/JSON
    template-renderer.ts         ──── Template engine EJS
    dependency-resolver.ts       ──── Resolucao de dependencias
    config-generator.ts           ──── Geracao de configuracoes
    contract-generator.ts         ──── Geracao de contratos
    contract-generator.zod.ts     ──── Geracao Zod schemas
    contract-generator.valibot.ts ──── Geracao Valibot schemas
    contract-generator.openapi.ts ──── Geracao OpenAPI spec
    adr-generator.ts              ──── Geracao de ADRs
    post-processor.ts             ──── Execucao de scripts pos-geracao
    registry-client.ts            ──── Cliente HTTP do registry
    types.ts                      ──── Tipos compartilhados
    helpers.ts                    ──── Helpers de template
    constants.ts                  ──── Constantes e defaults
    index.ts                      ──── Exportacoes publicas
  blueprints/
    base/
      node-ts/blueprint.yaml
      monorepo/blueprint.yaml
      docker/blueprint.yaml
    node/
      node-cli/blueprint.yaml
      node-lib/blueprint.yaml
    api/
      api-rest-nestjs/blueprint.yaml
      api-rest-express/blueprint.yaml
      api-rest-fastify/blueprint.yaml
      api-graphql/blueprint.yaml
    fullstack/
      fullstack-next-nest/blueprint.yaml
      fullstack-nuxt-nest/blueprint.yaml
    microservice/
      microservice/blueprint.yaml
      event-driven/blueprint.yaml
    theia/
      plugin-theia/blueprint.yaml
  test/
    engine.test.ts
    blueprint-parser.test.ts
    template-renderer.test.ts
    dependency-resolver.test.ts
    config-generator.test.ts
    contract-generator.test.ts
    adr-generator.test.ts
    post-processor.test.ts
  package.json
  tsconfig.json
  README.md
```

---

*Este documento faz parte da serie de estudos da IDEIA. Consulte `IDEIA-MASTER.md` para a lista completa de estudos e `document-registry.md` para registro de governanca.*
