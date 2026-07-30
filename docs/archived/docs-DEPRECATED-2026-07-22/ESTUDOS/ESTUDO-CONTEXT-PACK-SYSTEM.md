# ESTUDO S33 — Context Pack System & Expansion

> **Data:** 2026-07-22
> **Versao:** 1.0
> **Classificacao:** Estrategico / Infraestrutura de Contexto
> **Contexto:** IDEIA — plataforma de desenvolvimento assistido por IA com 6+ agentes, 51 comandos CLI, 65+ packages, 13 adapters, prompt pipeline com classificacao, enriquecimento e otimizacao
> **Problema:** A IDEIA possui apenas 1 context pack (fullstack-feature). Nao existe um sistema de context packs, formatos padrao, geracao automatica, resolucao de dependencias, slicing inteligente ou biblioteca de packs. Isso limita severamente a capacidade da IDEIA de fornecer contexto rico e relevante para LLMs em diferentes cenarios.
> **Gap identificado:** Ausencia completa de sistema de context packs — sem registry, sem formato padrao, sem injector inteligente, sem geracao automatica.
> **Solucao:** Context Pack System & Expansion — sistema completo com registry, loader, injector, generator, validator e biblioteca de 20 context packs que cobre todos os cenarios de uso da IDEIA.
> **Estudos-base:** S19 (ESTUDO-ENGENHARIA-PROMPTS-AGENTES), S26 (ESTUDO-MANIFEST-SELF-DESCRIPTION), S27 (ESTUDO-CAPABILITY-REGISTRY), S30 (ESTUDO-ONBOARDING-TUTORIALS), S28 (ESTUDO-ZERO-TO-DEPLOY)
> **Status:** Proposto — Pendente de implementacao

---

## Sumario

1. [Introducao](#1-introducao)
2. [Arquitetura do Context Pack System](#2-arquitetura-do-context-pack-system)
3. [Formato de Context Pack](#3-formato-de-context-pack)
4. [Context Pack Registry](#4-context-pack-registry)
5. [Context Injector](#5-context-injector)
6. [Context Pack Validator](#6-context-pack-validator)
7. [Biblioteca de Context Packs (20 packs)](#7-biblioteca-de-context-packs-20-packs)
8. [Context Pack Generator](#8-context-pack-generator)
9. [Adaptive Context](#9-adaptive-context)
10. [Ciclo de Vida dos Context Packs](#10-ciclo-de-vida-dos-context-packs)
11. [Implementacao TypeScript](#11-implementacao-typescript)
12. [Exemplos Completos de Packs YAML](#12-exemplos-completos-de-packs-yaml)
13. [Conexoes com Outros Estudos](#13-conexoes-com-outros-estudos)
14. [Plano de Implementacao](#14-plano-de-implementacao)

---

## 1. Introducao

### 1.1 O que Sao Context Packs

Context Packs sao unidades modulares de contexto que encapsulam informacao necessaria para que um LLM execute uma tarefa especifica dentro do ecossistema IDEIA. Cada context pack contem:

- **Metadados** — nome, versao, descricao, autor, tags
- **Variaveis** — parametros que personalizam o contexto (ex: {language}, {framework})
- **Sections** — blocos de conteudo em multiplos formatos (markdown, code, json, yaml)
- **Dependencias** — outros context packs necessarios para o contexto completo
- **Regras de slicing** — como reduzir o pack para diferentes limites de contexto (4K, 8K, 32K, 128K tokens)

### 1.2 Por que Context Packs Sao Essenciais

A qualidade da resposta de um LLM e diretamente proporcional a qualidade e relevancia do contexto fornecido. Context Packs resolvem:

| Problema | Sintoma | Solucao via Context Pack |
|----------|---------|--------------------------|
| Contexto generico | LLM da respostas vagas | Pack especifico para cada tipo de tarefa |
| Contexto faltando | LLM precisa advinhar regras do projeto | Pack com regras, convencoes e exemplos |
| Contexto excessivo | Estouro de janela de contexto | Slicing inteligente baseado no limite do LLM |
| Contexto inconsistente | Cada interacao tem contexto diferente | Packs versionados com schema validado |
| Contexto espalhado | Informacao em 10 arquivos diferentes | Pack agrega tudo em uma estrutura unica |
| Reuso zero | Mesmo contexto reconstruido toda vez | Registry com cache e resolucao de dependencias |

### 1.3 Estado Atual na IDEIA

ESTADO ATUAL (1 Pack)                    ESTADO DESEJADO (20+ Packs)
fullstack-feature (manual)               20 packs versionados
Sem formato padrao                       Registry centralizado
Sem geracao automatica                   Formato YAML padrao (Zod)
Sem slicing                              Generator automatico
Sem dependencias                         Injector adaptativo
Sem cache                                Slicing inteligente
Sem validacao                            Validacao CI
                                         Cache LRU

### 1.4 Impacto Estimado

| Dimensao | Sem Context Packs | Com Context Packs | Ganho |
|----------|------------------|-------------------|-------|
| Qualidade da resposta | 60-70% acuracia | 85-95% acuracia | +25% |
| Token overhead | 30-50% do prompt | 10-20% do prompt | -60% |
| Tempo de setup | 30-60s | 1-5s | -90% |
| Consistencia | Baixa | Alta (pack versionado) | +40% |
| Cobertura | 1 cenario | 20+ cenarios | 20x |
| Custo de API |  | .6X | -40% |
| Manutencao | Manual | Automatica (generator) | -95% |

---

## 2. Arquitetura do Context Pack System

### 2.1 Visao Geral

`
                         +---------------------------------------+
                         |         PROMPT PIPELINE (S19)          |
                         |  Guard -> Classify -> Enrich -> Opt    |
                         +------------------+--------------------+
                                            |  pede contexto
                                            v
+-------------------------------------------------------------------+
|                    CONTEXT PACK SYSTEM                             |
|                                                                    |
|  +--------------+   +--------------+   +------------------+        |
|  |     CLI /    |   |   Registry   |   |   Pack Loader    |        |
|  |  IDEIA Tools |---+   Service    |---+   (File/HTTP/    |        |
|  |              |   |              |   |    Memory)       |        |
|  +--------------+   +------+-------+   +--------+---------+        |
|                            |                     |                 |
|                            v                     v                 |
|  +-----------------------------------------------------------+    |
|  |               Context Injector                             |    |
|  |  +----------+  +-----------+  +----------+  +--------+    |    |
|  |  | Template |  | Variable  |  |  Slice   |  |Priorit-|    |    |
|  |  |  Engine  |  | Resolver  |  |  Select  |  |izer    |    |    |
|  |  +----------+  +-----------+  +----------+  +--------+    |    |
|  +-----------------------------------------------------------+    |
|                            |                                      |
|                            v                                      |
|  +--------------+   +--------------+   +------------------+        |
|  |    Pack      |   |    Pack      |   |   Reality        |        |
|  |   Generator  |   |   Validator  |   |   Manifest (S26) |        |
|  +--------------+   +--------------+   +------------------+        |
|                                                                    |
+-------------------------------------------------------------------+
         |
         v
+-------------------------------------------------------------------+
|                   20+ CONTEXT PACKS (YAML)                         |
|  +--------------+ +--------------+ +--------------+               |
|  |  ideia-intro | |  bugfix      | |  refactor    |   ...        |
|  +--------------+ +--------------+ +--------------+               |
+-------------------------------------------------------------------+

### 2.2 Componentes Principais

| Componente | Responsabilidade | Interface |
|------------|-----------------|-----------|
| Context Pack Registry | Cadastro, busca, versionamento, dependencias, cache | RegistryService |
| Pack Loader | Carrega packs de diferentes fontes (fs, http, memoria) | PackLoader |
| Context Injector | Monta o prompt final com template, variaveis, slicing | ContextInjector |
| Pack Generator | Gera packs automaticamente do manifesto/schema/codigo | PackGenerator |
| Pack Validator | Valida schema, dependencias, consistencia | PackValidator |
| Adaptive Context | Seleciona packs otimos para o contexto LLM disponivel | AdaptiveContext |
| CLI/API | Interface para usuarios e IAs interagirem com o sistema | ContextPackCLI |

### 2.3 Fluxo de Requisicao de Contexto

1. Prompt Pipeline (S19) classifica a intencao: "bugfix"
2. AdaptiveContext determina packs necessarios (obrigatorios, primarios, secundarios)
3. RegistryService.resolve() recursivo:
   - Busca cada pack no cache (LRU)
   - Se nao esta no cache, carrega do disco
   - Resolve dependencias transitivas
   - Retorna grafo de dependencias resolvido
4. ContextInjector.inject(packs, variables, maxTokens):
   a. TemplateEngine renderiza cada secao com variaveis
   b. VariableResolver substitui {{variaveis}}
   c. Prioritizer ordena secoes por prioridade (P0, P1, P2)
   d. SliceSelect corta no limite de tokens
5. Contexto final montado e entregue ao Prompt Pipeline

### 2.4 Estrutura de Diretorios

.ai/context-packs/
+-- registry.yaml                    # Indice global de packs
+-- ideia-introduction@1.0.0.yaml    # Pack individual (versao unica)
+-- fullstack-feature@1.0.0.yaml
+-- bugfix@1.0.0.yaml
+-- cache/                           # Cache de packs processados
|   +-- lru-store.json
+-- generated/                       # Packs gerados automaticamente
|   +-- fullstack-feature@1.1.0.yaml
+-- templates/                       # Templates para geracao
    +-- pack-default.ejs
    +-- pack-fullstack.ejs

---



## 3. Formato de Context Pack

### 3.1 Schema YAML Completo

Cada context pack e um arquivo YAML validado contra schema Zod. O formato suporta 3 niveis de complexidade:

- **Nivel 1 (Basico):** Metadata + sections markdown
- **Nivel 2 (Intermediario):** Variaveis + tags + multiplos formatos
- **Nivel 3 (Avancado):** Dependencias + slicing rules + hooks + exemplos

### 3.2 Schema Zod

```typescript
import { z } from 'zod';

const SectionFormat = z.enum(['markdown', 'code', 'json', 'yaml', 'text', 'table']);

const SectionSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(256),
  format: SectionFormat.default('markdown'),
  priority: z.enum(['P0', 'P1', 'P2']).default('P1'),
  content: z.string(),
  contentShort: z.string().optional(),
  contentMedium: z.string().optional(),
  maxTokens: z.number().int().positive().optional(),
  variables: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

const VariableSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'enum', 'path', 'language', 'framework']),
  description: z.string(),
  default: z.any().optional(),
  required: z.boolean().default(false),
  enum: z.array(z.string()).optional(),
  example: z.string().optional(),
});

const DependencySchema = z.object({
  pack: z.string().min(1),
  version: z.string().default('*'),
  required: z.boolean().default(true),
  description: z.string().optional(),
});

const SliceRuleSchema = z.object({
  maxTokens: z.number().int().positive(),
  strategy: z.enum(['truncate', 'summarize', 'priority', 'remove']),
  removeSections: z.array(z.string()).optional(),
  maxSections: z.number().int().positive().optional(),
});

const HookSchema = z.object({
  type: z.enum(['beforeInject', 'afterInject', 'beforeGenerate']),
  script: z.string(),
  lang: z.enum(['js', 'ts', 'sh']).default('ts'),
});

export const ContextPackSchema = z.object({
  name: z.string().min(1).max(128),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  displayName: z.string().optional(),
  description: z.string().min(10).max(2000),
  author: z.string().default('IDEIA'),
  created: z.string().datetime().optional(),
  updated: z.string().datetime().optional(),
  tags: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([]),
  level: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
  variables: z.array(VariableSchema).default([]),
  sections: z.array(SectionSchema).min(1),
  dependencies: z.array(DependencySchema).default([]),
  slicing: z.array(SliceRuleSchema).default([]),
  hooks: z.array(HookSchema).default([]),
  examples: z.array(z.object({
    title: z.string(), code: z.string(), language: z.string().optional(),
  })).default([]),
  totalTokens: z.number().int().positive().optional(),
  totalTokensShort: z.number().int().positive().optional(),
  compatibleEngines: z.array(z.string()).optional(),
  deprecated: z.boolean().default(false),
  deprecationMessage: z.string().optional(),
  replaces: z.string().optional(),
  replacedBy: z.string().optional(),
});

export type ContextPack = z.infer<typeof ContextPackSchema>;
```

### 3.3 Formato YAML — Template Completo

```yaml
name: my-pack
version: 1.0.0
displayName: "My Pack"
description: >
  Descricao completa do que este pack fornece de contexto.
author: IDEIA
created: 2026-07-22T00:00:00Z
updated: 2026-07-22T00:00:00Z
tags: [development, template]
categories: [feature, fullstack]
level: intermediate
variables:
  - name: language
    type: language
    description: "Linguagem principal"
    required: true
    example: TypeScript
  - name: framework
    type: framework
    description: "Framework utilizado"
    required: false
    default: React
    enum: [React, Next.js, Vue, Angular]
  - name: task_description
    type: string
    description: "Descricao da tarefa"
    required: true
sections:
  - id: introduction
    title: "Introducao"
    format: markdown
    priority: P0
    content: |
      ## Contexto da Tarefa
      Linguagem: {{language}}
      Framework: {{framework}}
      Descricao: {{task_description}}
    contentShort: |
      Lang: {{language}}, Framework: {{framework}}, Task: {{task_description}}
  - id: code_rules
    title: "Regras de Codigo"
    format: code
    priority: P1
    content: |
      // Regras para {{language}}
      // - Use ESLint config do projeto
      // - Prefira funcoes puras
      // - NUNCA use `any` sem justificativa
dependencies:
  - pack: ideia-introduction
    version: ^1.0.0
    required: true
slicing:
  - maxTokens: 4096
    strategy: priority
    maxSections: 3
  - maxTokens: 8192
    strategy: priority
    maxSections: 5
  - maxTokens: 32768
    strategy: priority
examples:
  - title: "Uso basico"
    language: bash
    code: |
      IDEIA context pack resolve my-pack --var language=TypeScript
```

---

## 4. Context Pack Registry

### 4.1 Arquitetura do Registry

```
+-------------------------------------------------------------------+
|                    CONTEXT PACK REGISTRY                           |
+-------------------------------------------------------------------+
|  +------------------------------------------------------------+   |
|  |                    Registry Index                           |   |
|  |  +----------+ +----------+ +----------+ +----------+       |   |
|  |  | ideia-   | | bugfix   | | refactor | |   ...    |       |   |
|  |  | intro    | | v1.0.0   | | v1.0.0   | | v1.2.0   |       |   |
|  |  | v1.0.0   | +----------+ +----------+ +----------+       |   |
|  |  +----------+                                              |   |
|  +------------------------------------------------------------+   |
|  +--------------+  +--------------+  +------------------------+    |
|  |  Tag Index   |  | Dependency   |  |  Version Resolution    |    |
|  |  dev -> [a,b]|  | Graph        |  |  ^1.0 -> >=1.0.0     |    |
|  |  sec -> [c,d]|  | A ---> B     |  |  *     -> latest      |    |
|  +--------------+  | B ---> C     |  +------------------------+    |
|                     |       ---> D|                                |
|                     +--------------+                                |
|  +------------------------------------------------------------+   |
|  |                   LRU Cache (Memoria)                       |   |
|  |  +-----------+ +-----------+ +-----------+ +--------+      |   |
|  |  | pack A    | | pack B    | | pack C    | |  ...   |      |   |
|  |  | (hits:45) | | (hits:12) | | (hits:3)  | |        |      |   |
|  |  +-----------+ +-----------+ +-----------+ +--------+      |   |
|  +------------------------------------------------------------+   |
+-------------------------------------------------------------------+
```

### 4.2 Interface RegistryService

```typescript
interface RegistryService {
  register(pack: ContextPack): Promise<void>;
  unregister(name: string, version?: string): Promise<void>;
  update(pack: ContextPack): Promise<void>;
  get(name: string, version?: string): Promise<ContextPack | null>;
  resolve(name: string, version?: string): Promise<ResolvedPack>;
  resolveMany(names: string[]): Promise<ResolvedPack[]>;
  search(query: string, options?: SearchOptions): Promise<ContextPack[]>;
  findByTag(tag: string): Promise<ContextPack[]>;
  findByCategory(category: string): Promise<ContextPack[]>;
  list(options?: ListOptions): Promise<ContextPackIndex[]>;
  resolveDependencies(pack: ContextPack): Promise<DependencyGraph>;
  checkDependencies(pack: ContextPack): Promise<DependencyStatus[]>;
  clearCache(): Promise<void>;
  getCacheStats(): Promise<CacheStats>;
  validateRegistry(): Promise<RegistryValidation>;
  rebuildIndex(): Promise<void>;
}
```

### 4.3 Resolucao de Dependencias

Resolucao por DFS com deteccao de ciclos, resolucao semver, priorizacao e cache:

```
Resolve("bugfix@^1.0.0")
  +-- Resolve("ideia-introduction@^1.0.0")  [required] -> OK
  +-- Resolve("code-review@^0.5.0")          [optional] -> OK
  +-- Resolve("fullstack-feature@*")         [optional]
  |     +-- Resolve("compliance@^1.0.0")     [NOT FOUND]
  |     +-- Fallback: remove compliance
  |     +-- OK
  +-- Grafo: 3 packs, 1 fallback
```

### 4.4 Cache

| Parametro | Valor | Descricao |
|-----------|-------|-----------|
| Tipo | LRU | Evita memoria cheia |
| Tamanho maximo | 50 entradas | ~50 packs |
| TTL | 5 minutos | Raramente muda |
| Hit rate esperado | > 80% | Uso tipico |

### 4.5 Registry Index

```yaml
version: 1
updated: 2026-07-22T00:00:00Z
packs:
  - name: ideia-introduction; version: 1.0.0; tags: [core, essential]; totalTokens: 2450
  - name: fullstack-feature; version: 1.0.0; tags: [feature, development]; totalTokens: 5200
  - name: bugfix; version: 1.0.0; tags: [debug, fix, quality]; totalTokens: 3800
  - name: refactor; version: 1.0.0; tags: [refactoring, quality]; totalTokens: 3200
  - name: documentation; version: 1.0.0; tags: [docs, writing]; totalTokens: 2800
  - name: performance; version: 1.0.0; tags: [perf, optimization]; totalTokens: 3500
  - name: security-review; version: 1.0.0; tags: [security, audit]; totalTokens: 4500
  - name: migration; version: 1.0.0; tags: [migration, upgrade]; totalTokens: 3000
  - name: testing; version: 1.0.0; tags: [testing, quality]; totalTokens: 3600
  - name: deployment; version: 1.0.0; tags: [deploy, devops]; totalTokens: 3200
  - name: onboarding; version: 1.0.0; tags: [onboarding, learning]; totalTokens: 4000
  - name: code-review; version: 1.0.0; tags: [review, quality]; totalTokens: 2900
  - name: api-design; version: 1.0.0; tags: [api, design]; totalTokens: 3400
  - name: database-design; version: 1.0.0; tags: [database, data]; totalTokens: 3100
  - name: architecture; version: 1.0.0; tags: [architecture, design]; totalTokens: 4200
  - name: monitoring; version: 1.0.0; tags: [monitoring, observability]; totalTokens: 2800
  - name: cli-command; version: 1.0.0; tags: [cli, tooling]; totalTokens: 2200
  - name: agent-collaboration; version: 1.0.0; tags: [agent, multi-agent]; totalTokens: 3800
  - name: compliance; version: 1.0.0; tags: [compliance, regulation]; totalTokens: 3500
  - name: theia-plugin; version: 1.0.0; tags: [theia, plugin, extension]; totalTokens: 3000
```

---

## 5. Context Injector

### 5.1 Arquitetura do Injector

```
              +---------------------------+
              |  Variaveis da requisicao   |
              |  { language: "TS",        |
              |    severity: "high" }      |
              +------------+--------------+
                           |
                           v
+-------------------------------------------------------------------+
|                     CONTEXT INJECTOR                               |
|  1. Template Engine (EJS/Handlebars)                              |
|     +-- Renderiza secoes com variaveis                             |
|     +-- Suporta: {{var}}, {{#if}}, {{#each}}, {{> partial}}       |
|  2. Variable Resolver                                             |
|     +-- Substitui {{language}} -> "TypeScript"                    |
|     +-- Valida required vars, aplica defaults                     |
|  3. Prioritizer                                                   |
|     +-- Ordena secoes: P0 > P1 > P2                              |
|     +-- Ordena packs: core > primario > secundario                |
|  4. Slice Select (Adaptive)                                       |
|     +-- Recebe maxTokens (ex: 4096)                               |
|     +-- Estima tokens por secao                                   |
|     +-- Inclui P0 ate encher; P1/P2 se houver espaco             |
|  5. Format Combiner                                               |
|     +-- Combina secoes no prompt final                            |
|     +-- Adiciona separadores entre packs                          |
+-------------------------------------------------------------------+
                           |
                           v
              +---------------------------+
              |  Prompt Final Montado     |
              |  [P0] intro + diagnosis   |
              |  [P1] rules + schema      |
              +---------------------------+
```

### 5.2 Interface ContextInjector

```typescript
interface ContextInjectorConfig {
  templateEngine: 'ejs' | 'handlebars' | 'none';
  packSeparator: string;
  includeSummary: boolean;
  tokenTolerance: number;
  cacheTemplates: boolean;
}

interface ContextInjector {
  inject(
    packs: ResolvedPack[],
    variables: Record<string, unknown>,
    maxTokens?: number
  ): Promise<InjectedContext>;
  renderSection(section: Section, variables: Record<string, unknown>): string;
  estimateTokens(text: string): number;
  slice(packs: ResolvedPack[], maxTokens: number): Promise<SlicedResult>;
  combine(sections: RenderedSection[], options?: CombineOptions): string;
  convertFormat(section: Section, targetFormat: string): string;
}

interface InjectedContext {
  prompt: string;
  usedPacks: string[];
  totalTokens: number;
  maxTokens: number;
  sections: RenderedSection[];
  variables: Record<string, unknown>;
  warnings: string[];
  sliced: boolean;
}

interface RenderedSection {
  id: string; pack: string; title: string; content: string;
  tokens: number; priority: 'P0' | 'P1' | 'P2'; included: boolean;
}

interface SlicedResult {
  included: RenderedSection[];
  excluded: RenderedSection[];
  totalTokens: number; maxTokens: number; overflowPct: number;
}
```

### 5.3 Algoritmo de Slicing

```
function slice(packs, maxTokens):
    for pack in packs:
        for section in pack.sections:
            section.estimatedTokens = estimateTokens(section.content)
    allSections = flatten(packs.sections)
    allSections.sort(by priority ASC)
    included = []; totalTokens = 0; margin = maxTokens * 0.9
    for section in allSections:
        if totalTokens + section.estimatedTokens <= margin:
            included.push(section)
            totalTokens += section.estimatedTokens
        else:
            section.included = false; excluded.push(section)
    p0Excluded = excluded.filter(s => s.priority == 'P0')
    if p0Excluded:
        warnings.push("CRITICAL: P0 sections excluded")
    return { included, excluded, totalTokens, maxTokens }
```

### 5.4 Template Engine

Variaveis especiais do template:

| Variavel | Descricao | Exemplo |
|----------|-----------|---------|
| {{language}} | Linguagem do projeto | TypeScript |
| {{framework}} | Framework | React |
| {{task_description}} | Descricao da tarefa | Criar CRUD... |
| {{current_date}} | Data atual | 2026-07-22 |
| {{project_name}} | Nome do projeto | ai-devkit-workspace |
| {{pack.name}} | Nome do pack atual | bugfix |
| {{pack.version}} | Versao do pack | 1.0.0 |

Controles de template:

```
{{#if severity}}**Severidade:** {{severity}}{{/if}}
{{#each dependencies}}- {{this.pack}}@{{this.version}}{{/each}}
{{> shared/rules-template}}
{{! Este comentario nao aparece no prompt final }}
```

### 5.5 Priorizacao

| Nivel | Prioridade | Inclusao | Percentual |
|-------|-----------|----------|------------|
| P0 | Essencial | Sempre incluso | 50% do budget |
| P1 | Importante | Se houver espaco apos P0 | 30% do budget |
| P2 | Informativo | Apenas se sobrar espaco | 20% do budget |

Ordem entre packs: primario > dependencias obrigatorias > dependencias opcionais > enriquecimento

---

## 6. Context Pack Validator

### 6.1 Interface PackValidator

```typescript
interface PackValidator {
  validateSchema(pack: unknown): ValidationResult;
  validateDependencies(pack: ContextPack, registry: RegistryService): Promise<DependencyValidation>;
  validateVariables(pack: ContextPack): VariableValidation;
  validateSlicing(pack: ContextPack): SlicingValidation;
  validateHooks(pack: ContextPack): HookValidation;
  validateFull(pack: ContextPack, registry: RegistryService): Promise<FullValidation>;
  validateCompatibility(packA: ContextPack, packB: ContextPack): CompatibilityResult;
  validateConsistency(pack: ContextPack): ConsistencyResult;
}
```

### 6.2 Regras de Validacao

| Regra | Descricao | Severidade |
|-------|-----------|------------|
| SC-01 | Name e obrigatorio e unico no registry | error |
| SC-02 | Version segue semver (X.Y.Z) | error |
| SC-03 | Description tem no minimo 10 caracteres | error |
| SC-04 | Pelo menos 1 section definida | error |
| SC-05 | Section.id e unico dentro do pack | error |
| SC-06 | Section.content nao pode ser vazio | error |
| SC-07 | Variaveis required tem default ou serao fornecidas | warning |
| SC-08 | Toda {{variavel}} no content tem declaracao | error |
| SC-09 | Dependencias circulares sao detectadas | error |
| SC-10 | Slicing.maxSections <= total de secoes | error |
| SC-11 | Hooks.script existe (se file path) | warning |
| SC-12 | totalTokens estimado corresponde ao real (+-20%) | warning |
| SC-13 | Pack deprecated tem deprecationMessage | warning |
| SC-14 | Pack com replacedBy aponta para pack existente | error |
| SC-15 | Tags seguem nomenclatura (kebab-case) | warning |

---

## 7. Biblioteca de Context Packs (20 packs)

### 7.1 Visao Geral

```
+-------------------------------------------------------------------+
|                    BIBLIOTECA DE CONTEXT PACKS                     |
|                                                                    |
|  CORE (1)                       ESSENCIAIS (4)                    |
|  +---------------------------+  +-------------------------------+ |
|  | ideia-introduction        |  | fullstack-feature             | |
|  +---------------------------+  | bugfix                        | |
|                                 | refactor                      | |
|                                 | documentation                 | |
|                                 +-------------------------------+ |
|                                                                    |
|  TECNICOS (5)                   ESPECIALIZADOS (5)               |
|  +---------------------------+  +-------------------------------+ |
|  | performance               |  | security-review               | |
|  | migration                 |  | compliance                    | |
|  | testing                   |  | monitoring                    | |
|  | deployment                |  | cli-command                   | |
|  | code-review               |  | agent-collaboration           | |
|  +---------------------------+  +-------------------------------+ |
|                                                                    |
|  DESIGN (4)                     PLATAFORMA (1)                   |
|  +---------------------------+  +-------------------------------+ |
|  | api-design                |  | theia-plugin                  | |
|  | database-design           |  |                               | |
|  | architecture              |  |                               | |
|  | onboarding                |  |                               | |
|  +---------------------------+  +-------------------------------+ |
+-------------------------------------------------------------------+
```

### 7.2 PACK 01: ideia-introduction

Nome: ideia-introduction; Versao: 1.0.0; Tags: core, essential, mandatory
Dependencias: (nenhuma); Total tokens: 2450; Prioridade: P0; Nivel: beginner

Descricao: Apresentacao completa da IDEIA -- arquitetura, agentes, comandos, regras, ferramentas, fluxo de trabalho. Pack fundamental que todo LLM precisa para entender o sistema.

Variaveis:
- agent_role: string, optional, default: "assistant"
- interaction_type: enum, default: "chat"
- autonomy_level: enum, default: "N1"

Sections:
- P0: architecture_overview -- Diagrama de camadas, 15 camadas
- P0: agent_roles -- 6 agentes, responsabilidades
- P0: global_rules -- R1 a R6, regras absolutas
- P1: commands_reference -- 51 comandos CLI, 4 categorias
- P1: tools_available -- FileSystem, Search, Code, Shell, LLM
- P2: architecture_principles -- Clean Arch, DDD, NATS, Theia
- P2: quality_gates -- 4 gates, 7 dimensoes

Slicing: 4096: [P0 only]; 8192: [P0 + P1]; 32768: [completo]

### 7.3 PACK 02: fullstack-feature (expandido)

Nome: fullstack-feature; Versao: 1.1.0; Tags: feature, development, fullstack
Dependencias: ideia-introduction@^1.0.0; Total tokens: 5200; Nivel: advanced

Descricao: Contexto completo para features fullstack -- frontend, backend, banco, testes, deploy. Pack existente expandido com slicing, dependencias e variaveis adicionais.

Variaveis:
- language: language, required
- framework: framework, optional, default: "React"
- backend_language: language, optional
- backend_framework: framework, optional
- database: string, optional, default: "PostgreSQL"
- feature_name: string, required
- feature_description: string, required
- include_tests: boolean, optional, default: true
- include_docs: boolean, optional, default: false

Sections:
- P0: feature_overview, P0: architecture_context
- P1: frontend_spec, P1: backend_spec, P1: database_spec
- P2: test_strategy, P2: deployment_notes, P2: documentation_template

### 7.4 PACK 03: bugfix

Nome: bugfix; Versao: 1.0.0; Tags: debug, fix, quality, troubleshooting
Dependencias: ideia-introduction@^1.0.0; Total tokens: 3800; Nivel: intermediate

Variaveis: bug_description (required), severity (default: medium), affected_component (optional), expected_behavior (required), actual_behavior (required), reproduction_steps (required), error_log (optional)

Sections:
- P0: bug_context, P0: reproduction, P1: diagnosis_framework
- P1: fix_patterns, P2: validation_checklist, P2: regression_prevention

Slicing: 4096: [P0 + reproduction]; 8192: [P0 + P1]; 32768: [completo]

### 7.5 PACK 04: refactor

Nome: refactor; Versao: 1.0.0; Tags: refactoring, quality, clean-code
Dependencias: ideia-introduction@^1.0.0; Total tokens: 3200; Nivel: advanced

Variaveis: refactor_target (required), refactor_goal (required), target_pattern (optional), preserve_api (default: true)

Sections: P0: refactor_context, P0: behavior_preservation, P1: strategy_suggestions, P1: code_smell_checklist, P2: target_patterns, P2: validation_plan

### 7.6 PACK 05: documentation

Nome: documentation; Versao: 1.0.0; Tags: docs, writing, communication
Dependencias: ideia-introduction@^1.0.0; Total tokens: 2800; Nivel: beginner

Variaveis: doc_type (enum: api, readme, architecture, user-guide, technical, changelog), doc_title (required), target_audience (default: developers)

Sections: P0: doc_context, P1: writing_guidelines, P1: template_by_type, P2: example_format, P2: review_checklist

### 7.7 PACK 06: performance

Nome: performance; Versao: 1.0.0; Tags: perf, optimization, benchmarking
Dependencias: ideia-introduction@^1.0.0; Total tokens: 3500; Nivel: advanced

Variaveis: perf_goal (required), bottleneck_area (enum: cpu, memory, io, network, database, rendering, bundle), include_baseline (default: true)

Sections: P0: performance_context, P1: profiling_guide, P1: optimization_strategies, P2: benchmark_template, P2: regression_prevention

### 7.8 PACK 07: security-review

Nome: security-review; Versao: 1.0.0; Tags: security, audit, review, vulnerability
Dependencias: ideia-introduction@^1.0.0, compliance@^1.0.0 (optional); Total tokens: 4500; Nivel: advanced

Variaveis: review_scope (required), threat_model (optional), compliance_standard (enum: owasp, lgpd, soc2, pci, hipaa), severity_threshold (default: high)

Sections: P0: scope_and_context, P1: owasp_top10_checklist, P1: threat_modeling_template, P2: remediation_templates, P2: security_testing_guide, P2: reporting_template

### 7.9 PACK 08: migration

Nome: migration; Versao: 1.0.0; Tags: migration, upgrade, breaking-change
Dependencias: ideia-introduction@^1.0.0; Total tokens: 3000; Nivel: advanced

Variaveis: from_version (required), to_version (required), migration_type (enum: framework, database, language, library, infrastructure, data), rollback_strategy (optional)

Sections: P0: migration_context, P1: breaking_changes_catalog, P1: migration_steps, P2: rollback_plan, P2: verification_checklist

### 7.10 PACK 09: testing

Nome: testing; Versao: 1.0.0; Tags: testing, quality, coverage
Dependencias: ideia-introduction@^1.0.0; Total tokens: 3600; Nivel: intermediate

Variaveis: test_type (enum: unit, integration, e2e, contract, mutation, performance; default: unit), framework_test (default: jest), coverage_target (default: 80), module_under_test (required)

Sections: P0: testing_context, P1: test_strategy_template, P1: mocking_guidelines, P2: fixture_template, P2: ci_integration_notes

### 7.11 PACK 10: deployment

Nome: deployment; Versao: 1.0.0; Tags: deploy, devops, ci-cd, release
Dependencias: ideia-introduction@^1.0.0; Total tokens: 3200; Nivel: advanced

Variaveis: deploy_target (enum: development, staging, production, docker, kubernetes, serverless; required), deploy_strategy (enum: rolling, blue-green, canary, recreate, immutable; default: rolling)

Sections: P0: deployment_context, P1: pipeline_steps, P1: environment_vars, P2: health_check_criteria, P2: rollback_procedure

### 7.12 PACK 11: onboarding

Nome: onboarding; Versao: 1.0.0; Tags: onboarding, learning, tutorial, new-user
Dependencias: ideia-introduction@^1.0.0; Total tokens: 4000; Nivel: beginner

Variaveis: user_role (enum: developer, devops, manager, ai-agent, architect; default: developer), experience_level (enum: beginner, intermediate, advanced; default: beginner), include_exercises (default: true)

Sections: P0: welcome_and_context, P1: core_concepts, P1: first_steps, P2: exercises, P2: next_steps

### 7.13 PACK 12: code-review

Nome: code-review; Versao: 1.0.0; Tags: review, quality, pr
Dependencias: ideia-introduction@^1.0.0; Total tokens: 2900; Nivel: intermediate

Variaveis: review_type (enum: full, quick, security-focus, performance-focus, style-only; default: full), language (optional), pr_size (xs/small/medium/large)

Sections: P0: review_context, P1: checklist_by_type, P1: code_quality_rules, P2: feedback_template, P2: common_patterns

### 7.14 PACK 13: api-design

Nome: api-design; Versao: 1.0.0; Tags: api, design, rest, graphql, contract
Dependencias: ideia-introduction@^1.0.0; Total tokens: 3400; Nivel: advanced

Variaveis: api_type (enum: rest, graphql, grpc, websocket, webhook, event-driven; required), api_version (default: v1), auth_method (enum: jwt, oauth2, api-key, basic, none; default: jwt)

Sections: P0: api_context, P1: restful_design_rules, P1: contract_template, P2: error_format, P2: pagination_pattern, P2: rate_limiting_guide

### 7.15 PACK 14: database-design

Nome: database-design; Versao: 1.0.0; Tags: database, data, schema, sql, nosql
Dependencias: ideia-introduction@^1.0.0, api-design@^1.0.0 (optional); Total tokens: 3100; Nivel: advanced

Variaveis: db_type (enum: postgresql, mysql, sqlite, mongodb, redis, duckdb, turso; required), modeling_approach (enum: relational, document, graph, key-value, hybrid; default: relational)

Sections: P0: database_context, P1: schema_design_rules, P1: migration_template, P2: query_optimization, P2: seed_template

### 7.16 PACK 15: architecture

Nome: architecture; Versao: 1.0.0; Tags: architecture, design, system-design, pattern
Dependencias: ideia-introduction@^1.0.0, api-design@^1.0.0 (optional), database-design@^1.0.0 (optional); Total tokens: 4200; Nivel: advanced

Variaveis: architecture_pattern (enum: clean-architecture, hexagonal, layered, microservices, event-driven, cqrs, ddd; default: clean-architecture), scale_requirement (enum: small, medium, large, xlarge; default: medium)

Sections: P0: architectural_context, P1: pattern_implementation, P1: tradeoff_analysis, P2: adr_template, P2: diagram_guide, P2: quality_attributes

### 7.17 PACK 16: monitoring

Nome: monitoring; Versao: 1.0.0; Tags: monitoring, observability, logging, metrics
Dependencias: ideia-introduction@^1.0.0; Total tokens: 2800; Nivel: intermediate

Variaveis: monitor_type (enum: logging, metrics, tracing, alerting, dashboard, full; optional), logging_level (enum: debug, info, warn, error; default: info)

Sections: P0: monitoring_context, P1: logging_patterns, P1: metrics_template, P2: dashboard_template, P2: alerting_rules

### 7.18 PACK 17: cli-command

Nome: cli-command; Versao: 1.0.0; Tags: cli, tooling, command-line
Dependencias: ideia-introduction@^1.0.0; Total tokens: 2200; Nivel: beginner

Variaveis: cli_name (required), cli_description (required), parser_library (enum: commander, yargs, oclif, cac; default: commander)

Sections: P0: cli_context, P1: command_structure, P1: argument_patterns, P2: output_format, P2: help_and_completion

### 7.19 PACK 18: agent-collaboration

Nome: agent-collaboration; Versao: 1.0.0; Tags: agent, multi-agent, collaboration, orchestration
Dependencias: ideia-introduction@^1.0.0; Total tokens: 3800; Nivel: advanced

Variaveis: collaboration_mode (enum: sequential, parallel, hierarchical, mesh, supervisor; default: sequential), primary_agent (required), num_agents (default: 2)

Sections: P0: collaboration_context, P1: communication_protocol, P1: handoff_procedure, P2: conflict_resolution, P2: escalation_rules

### 7.20 PACK 19: compliance

Nome: compliance; Versao: 1.0.0; Tags: compliance, regulation, lgpd, soc2, audit
Dependencias: ideia-introduction@^1.0.0, security-review@^1.0.0 (optional); Total tokens: 3500; Nivel: advanced

Variaveis: compliance_standard (enum: lgpd, soc2, pci-dss, hipaa, sox, iso27001, gdpr; required), audit_type (enum: internal, external, self-assessment, continuous; default: internal)

Sections: P0: compliance_context, P1: control_mapping, P1: evidence_template, P2: audit_checklist, P2: remediation_template

### 7.21 PACK 20: theia-plugin

Nome: theia-plugin; Versao: 1.0.0; Tags: theia, plugin, extension, eclipse
Dependencias: ideia-introduction@^1.0.0; Total tokens: 3000; Nivel: advanced

Variaveis: plugin_name (required), contribution_type (enum: widget, command, menu, keybinding, preference, language, debug, terminal; required), theia_version (default: 1.48)

Sections: P0: plugin_context, P1: contribution_templates, P1: dependency_injection, P2: widget_patterns, P2: service_patterns, P2: testing_patterns

---

## 8. Context Pack Generator

### 8.1 Geracao Automatica de Packs

O Pack Generator cria context packs a partir de tres fontes:

```
+-------------------------------------------------------------------+
|                     CONTEXT PACK GENERATOR                         |
|                                                                    |
|  +---------------------+  +--------------+  +-------------------+  |
|  |  REALITY MANIFEST   |  |  CODE SCAN   |  |   TEMPLATES       |  |
|  |  (S26)              |  |              |  |                   |  |
|  |  - packages list    |  |  - interfaces|  |  - pack.ejs      |  |
|  |  - endpoints        |  |  - types     |  |  - section.ejs   |  |
|  |  - capabilities     |  |  - exports   |  |  - var.ejs       |  |
|  |  - agents           |  |  - schemas   |  |                   |  |
|  |  - commands         |  |  - configs   |  |                   |  |
|  +---------+-----------+  +------+-------+  +---------+---------+  |
|            |                     |                      |          |
|            v                     v                      v          |
|  +------------------------------------------------------------+   |
|  |                    Pack Merger                              |   |
|  |  Combina informacao, resolve conflitos, gera YAML final    |   |
|  +------------------------------------------------------+-----+   |
|                                                         |         |
|                                                         v         |
|  +------------------------------------------------------------+   |
|  |                    Pack Writer                              |   |
|  |  Salva .ai/context-packs/generated/<name>@<ver>.yaml       |   |
|  +------------------------------------------------------+-----+   |
|                                                         |         |
|                                                         v         |
|  +------------------------------------------------------------+   |
|  |                    Registry Updater                         |   |
|  |  Atualiza registry.yaml com novo pack gerado               |   |
|  +------------------------------------------------------------+   |
+-------------------------------------------------------------------+
```

### 8.2 Interface PackGenerator

```typescript
interface PackGenerator {
  fromManifest(manifest: RealityManifest, options?: GenerateOptions): Promise<ContextPack>;
  fromCodeScan(scanResult: CodeScanResult, options?: GenerateOptions): Promise<ContextPack>;
  fromTemplate(templateName: string, variables: Record<string, unknown>, options?: GenerateOptions): Promise<ContextPack>;
  generateAuto(context: GenerationContext): Promise<ContextPack>;
  refresh(packName: string, options?: RefreshOptions): Promise<ContextPack>;
  estimateTokens(pack: ContextPack): Promise<ContextPack>;
  save(pack: ContextPack, path?: string): Promise<string>;
  register(pack: ContextPack): Promise<void>;
}

interface GenerateOptions {
  outputPath?: string;
  autoRegister?: boolean;
  estimateTokens?: boolean;
  validateAfter?: boolean;
  versionStrategy?: 'patch' | 'minor' | 'major' | 'auto';
  templateEngine?: 'ejs' | 'handlebars';
}
```

### 8.3 Geracao a Partir do Manifesto

```typescript
async function fromManifest(manifest: RealityManifest): Promise<ContextPack> {
  const pack: ContextPack = {
    name: `manifest-${manifest.project.name}`,
    version: '1.0.0',
    description: `Contexto automatico do manifesto do projeto ${manifest.project.name}`,
    tags: ['auto-generated', 'manifest', 'project-context'],
    variables: [{
      name: 'focus_area',
      type: 'string',
      description: 'Area de foco para o contexto',
      required: false,
    }],
    sections: [
      {
        id: 'project_overview',
        title: 'Visao Geral do Projeto',
        format: 'markdown',
        priority: 'P0',
        content: `## Projeto: ${manifest.project.name}\n\n${manifest.project.description}`,
      },
      {
        id: 'packages',
        title: 'Packages do Projeto',
        format: 'table',
        priority: 'P1',
        content: packagesToTable(manifest.packages),
      },
      {
        id: 'capabilities',
        title: 'Capacidades Disponiveis',
        format: 'yaml',
        priority: 'P1',
        content: yaml.dump(manifest.capabilities),
      },
    ],
    dependencies: [],
    slicing: [
      { maxTokens: 4096, strategy: 'priority', maxSections: 3 },
      { maxTokens: 8192, strategy: 'priority', maxSections: 5 },
      { maxTokens: 32768, strategy: 'priority' },
    ],
  };
  return pack;
}
```

---

## 9. Adaptive Context

### 9.1 Conceito

Adaptive Context ajusta automaticamente o contexto com base em:

1. **Janela de contexto do LLM** -- 4K, 8K, 32K, 128K, 200K tokens
2. **Tipo de tarefa** -- bugfix precisa de menos contexto que architecture
3. **Complexidade da tarefa** -- tasks simples precisam de menos secoes
4. **Historico de sessoes anteriores** -- contexto incremental
5. **Custo de tokens** -- otimizar para menor custo possivel

### 9.2 Arquitetura

```
+-------------------------------------------------------------------+
|                      ADAPTIVE CONTEXT                              |
|                                                                    |
|  +------------------------------------------------------------+   |
|  |  1. Task Analyzer                                           |   |
|  |     Extrai: type, complexity, domain, language              |   |
|  |     complexity: simple | moderate | complex                 |   |
|  +----------------------------+-------------------------------+   |
|                               |                                    |
|                               v                                    |
|  +------------------------------------------------------------+   |
|  2. Pack Selector: packs obrigatorios + primarios + secundarios|   |
|  +----------------------------+-------------------------------+   |
|                               |                                    |
|                               v                                    |
|  +------------------------------------------------------------+   |
|  3. Context Size Calculator: budget = llmMax - task - history  |   |
|  +----------------------------+-------------------------------+   |
|                               |                                    |
|                               v                                    |
|  +------------------------------------------------------------+   |
|  4. Slice & Prioritize: ordena por prioridade, aplica slicing  |   |
|  +----------------------------+-------------------------------+   |
|                               |                                    |
|                               v                                    |
|  +------------------------------------------------------------+   |
|  5. Feedback Loop: monitora suficiencia, ajusta para prox     |   |
|  +------------------------------------------------------------+   |
+-------------------------------------------------------------------+
```

### 9.3 Estrategias de Slicing por Modelo

| Modelo | Janela | Estrategia | Secoes/Pack |
|--------|--------|------------|-------------|
| GPT-4o Mini | 128K | Completa | 8-12 secoes |
| GPT-4o | 128K | Completa | 8-12 secoes |
| Claude 3.5 Sonnet | 200K | Completa + enriquecimento | 10-15 secoes |
| Claude 3 Haiku | 48K | Prioritaria (P0 + P1) | 4-6 secoes |
| Gemini 1.5 Pro | 1M | Completa (uso irrestrito) | 12-20 secoes |
| DeepSeek V3 | 64K | Prioritaria (P0 + P1) | 4-6 secoes |
| Mistral Large | 128K | Completa | 8-12 secoes |
| Ollama (codellama) | 4K-8K | Estrita (apenas P0) | 2-3 secoes |
| Ollama (mixtral) | 32K | Prioritaria (P0 + P1) | 4-6 secoes |

### 9.4 AdaptiveContext Interface

```typescript
interface AdaptiveContextConfig {
  llmMaxTokens: number;
  reservedForOutput: number;
  reservedForHistory: number;
  minContextTokens: number;
  maxContextTokens: number;
  enableFeedbackLoop: boolean;
  feedbackWindowSize: number;
}

interface AdaptiveContext {
  getContext(task: TaskInfo, llmConfig: LLMConfig): Promise<InjectedContext>;
  calculateBudget(task: TaskInfo, history: HistoryInfo): ContextBudget;
  selectPacks(task: TaskInfo, budget: ContextBudget): Promise<SelectedPacks>;
  reportFeedback(contextId: string, wasSufficient: boolean, details?: FeedbackDetails): Promise<void>;
  getMetrics(): Promise<AdaptiveMetrics>;
}

interface ContextBudget {
  totalAvailable: number;
  requiredReserve: number;
  effectiveBudget: number;
  minPerPack: number;
  maxPerPack: number;
}

interface SelectedPacks {
  required: string[];
  primary: string[];
  secondary: string[];
  estimatedTokens: number;
}

interface AdaptiveMetrics {
  totalRequests: number;
  avgContextTokens: number;
  avgSatisfactionScore: number;
  topPacks: { name: string; usage: number }[];
  slicingEfficiency: number;
  cacheHitRate: number;
}
```

### 9.5 Exemplo de Adaptacao

Scenario: "Corrigir bug critico no login" com Claude 3 Haiku (48K)

LLM Config: maxTokens=48000, reservedForOutput=9600, reservedForHistory=4800, effectiveBudget=33600

Task: type=bugfix, complexity=moderate, domain=backend, language=TypeScript

Adaptive Selection:
- REQUIRED: ideia-introduction (P0 only: 1200) + bugfix (P0+P1: 2800) = 4000
- PRIMARY: fullstack-feature (P0 only: 1500) = 1500
- SECONDARY: code-review (P0 only: 800) if space
- Total: 5500 tokens (16% of 33600 budget) -- confortavel, inclui tudo

---

## 10. Ciclo de Vida dos Context Packs

### 10.1 Fases do Ciclo de Vida

```
                     +-------------+
                     |   CRIADO    |
                     |   draft     |
                     +------+------+
                            | validate
                            v
                     +-------------+
                     |  VALIDADO   |
                     |   active    |
                     +------+------+
                            |
                    +-------+--------+
                    |                |
                    v                v
             +----------+    +----------+
             |  PUBLIC  |    |   TEST   |
             | released |    | canary   |
             +-----+----+    +-----+----+
                   |               |
                   +-------+-------+
                           | promoted
                           v
                    +-------------+
                   |  ACTIVE     |
                   |  stable     |
                   +------+------+
                          |
                    +-----+------+
                    |            |
                    v            v
             +----------+  +----------+
             |DEPRECATED|  | REPLACED |
             | v1.0.0   |  | v1.0.0   |
             | warning  |  | use v2.0 |
             +-----+----+  +-----+----+
                   |            |
                   +------+-----+
                          |
                          v
                   +-------------+
                   |  REMOVED    |
                   |  archived   |
                   +-------------+
```

### 10.2 Estados e Transicoes

| Estado | Descricao | Gatilho para Saida |
|--------|-----------|-------------------|
| Draft | Em criacao, nao disponivel | Validacao bem-sucedida |
| Validated | Validado, aguardando publicacao | Decisao do maintainer |
| Canary | Teste limitado (10% das requisicoes) | Feedback positivo ou N horas |
| Released | Disponivel para todos | Decisao de deprecation |
| Active | Estavel e recomendado | Deprecation ou replacement |
| Deprecated | Ainda funciona com warnings | Substituicao completa |
| Replaced | Substituido por nova versao | Remocao apos periodo de graca |
| Removed | Arquivo movido para archive | N/A |

### 10.3 Versionamento Semantico

Segue SemVer 2.0.0:

- **MAJOR:** Mudanca estrutural que quebra compatibilidade (secoes removidas, variaveis required alteradas, dependencias obrigatorias alteradas)
- **MINOR:** Adicao compativel (novas secoes P2, novas variaveis opcionais, novas tags)
- **PATCH:** Correcoes compativeis (atualizacao de conteudo, ajuste de slicing, typos, reestimativa de tokens)

### 10.4 Politica de Ciclo de Vida

| Regra | Descricao |
|-------|-----------|
| CV-01 | Todo pack comeca como draft |
| CV-02 | Validacao obrigatoria antes de publicacao |
| CV-03 | Periodo canary minimo: 24h para packs novos |
| CV-04 | Deprecation period: 30 dias antes de remocao |
| CV-05 | Pack replaced DEVE ter redirect no registry |
| CV-06 | Remocao so apos 30 dias de deprecation |
| CV-07 | Packs core (ideia-introduction) nunca sao removidos |
| CV-08 | Breaking changes exigem MAJOR version bump |
| CV-09 | Toda versao deve ser registrada no registry |
| CV-10 | Pack deprecated emite warning no injector |

---

## 11. Implementacao TypeScript

### 11.1 Estrutura do Package

```
packages/context-pack/
+-- package.json
+-- tsconfig.json
+-- src/
|   +-- index.ts                       # Public API exports
|   +-- schema/
|   |   +-- context-pack-schema.ts     # Zod schema
|   |   +-- registry-schema.ts         # Registry index schema
|   +-- registry/
|   |   +-- registry-service.ts        # RegistryService implementation
|   |   +-- registry-store.ts          # File-based registry store
|   |   +-- dependency-resolver.ts     # Recursive dependency resolution
|   |   +-- pack-cache.ts             # LRU cache implementation
|   +-- loader/
|   |   +-- pack-loader.ts             # Abstract pack loader
|   |   +-- file-loader.ts             # Load packs from filesystem
|   |   +-- http-loader.ts             # Load packs from HTTP
|   |   +-- memory-loader.ts           # Load packs from memory buffer
|   +-- injector/
|   |   +-- context-injector.ts        # ContextInjector implementation
|   |   +-- template-engine.ts         # EJS/Handlebars adapter
|   |   +-- variable-resolver.ts       # Variable substitution
|   |   +-- prioritizer.ts             # Section/pack prioritization
|   |   +-- slice-selector.ts          # Adaptive token-based slicing
|   |   +-- format-combiner.ts         # Combines into final prompt
|   +-- generator/
|   |   +-- pack-generator.ts          # PackGenerator implementation
|   |   +-- manifest-scanner.ts        # Extract from Reality Manifest
|   |   +-- code-scanner.ts            # Scan codebase for types
|   |   +-- template-renderer.ts       # Render packs from .ejs
|   +-- validator/
|   |   +-- pack-validator.ts          # PackValidator implementation
|   |   +-- schema-validator.ts        # Zod schema validation
|   |   +-- dependency-validator.ts    # Dependency graph validation
|   |   +-- variable-validator.ts      # Variable usage validation
|   |   +-- consistency-checker.ts     # Cross-section consistency
|   +-- adaptive/
|   |   +-- adaptive-context.ts        # AdaptiveContext implementation
|   |   +-- task-analyzer.ts           # Extract task info
|   |   +-- pack-selector.ts           # Select packs based on task
|   |   +-- budget-calculator.ts       # Calculate context budget
|   |   +-- feedback-collector.ts      # Collect and process feedback
|   +-- cli/
|   |   +-- context-pack-cli.ts        # IDEIA context pack commands
|   |   +-- pack-list.ts, pack-resolve.ts, pack-validate.ts
|   |   +-- pack-generate.ts, pack-search.ts
|   +-- types/
|       +-- context-pack.types.ts, registry.types.ts, injector.types.ts
+-- tests/
|   +-- registry.test.ts, injector.test.ts, generator.test.ts
|   +-- validator.test.ts, adaptive.test.ts, loader.test.ts
|   +-- fixtures/ (valid-pack.yaml, invalid-pack.yaml, registry-index.yaml)
+-- .ai/context-packs/            # Biblioteca de 20 packs
    +-- registry.yaml, ideia-introduction@1.0.0.yaml, ...
```

### 11.2 RegistryService Implementation

```typescript
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { LRUCache } from './pack-cache';
import { DependencyResolver } from './dependency-resolver';
import { ContextPack, ContextPackSchema } from '../schema/context-pack-schema';
import { RegistryIndex, RegistryIndexSchema } from '../schema/registry-schema';

export class RegistryService {
  private packs: Map<string, Map<string, ContextPack>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private cache: LRUCache<string, ContextPack>;
  private dependencyResolver: DependencyResolver;

  constructor(
    private config: RegistryConfig,
    private store: RegistryStore
  ) {
    this.cache = new LRUCache({
      maxSize: config.cacheMaxSize ?? 50,
      ttl: config.cacheTTL ?? 300_000,
    });
    this.dependencyResolver = new DependencyResolver(this);
  }

  async initialize(): Promise<void> {
    const index = await this.store.loadIndex();
    for (const entry of index.packs) {
      const pack = await this.store.loadPack(entry.path);
      this.registerInternal(pack);
    }
  }

  async register(pack: ContextPack): Promise<void> {
    const parsed = ContextPackSchema.parse(pack);
    this.registerInternal(parsed);
    await this.store.savePack(parsed);
    await this.updateRegistryIndex();
  }

  private registerInternal(pack: ContextPack): void {
    const { name, version } = pack;
    if (!this.packs.has(name)) this.packs.set(name, new Map());
    this.packs.get(name)!.set(version, pack);
    for (const tag of pack.tags) {
      if (!this.tagIndex.has(tag)) this.tagIndex.set(tag, new Set());
      this.tagIndex.get(tag)!.add(name);
    }
  }

  async get(name: string, version?: string): Promise<ContextPack | null> {
    const cacheKey = `${name}@${version ?? 'latest'}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const versions = this.packs.get(name);
    if (!versions) return null;

    let pack: ContextPack | null = null;
    if (version) {
      pack = versions.get(version) ?? null;
    } else {
      const sorted = [...versions.keys()].sort((a, b) => semverCompare(b, a));
      pack = versions.get(sorted[0]) ?? null;
    }

    if (pack) this.cache.set(cacheKey, pack);
    return pack;
  }

  async resolve(name: string, version?: string): Promise<ResolvedPack> {
    const pack = await this.get(name, version);
    if (!pack) throw new PackNotFoundError(name, version);
    const dependencies = await this.dependencyResolver.resolve(pack);
    return { pack, dependencies, resolvedAt: new Date().toISOString() };
  }

  async resolveMany(names: string[]): Promise<ResolvedPack[]> {
    const results: ResolvedPack[] = [];
    const visited = new Set<string>();
    for (const name of names) {
      const [packName, packVersion] = name.includes('@') ? name.split('@') : [name, undefined];
      if (!visited.has(packName)) {
        visited.add(packName);
        results.push(await this.resolve(packName, packVersion));
      }
    }
    return results;
  }

  async findByTag(tag: string): Promise<ContextPack[]> {
    const names = this.tagIndex.get(tag);
    if (!names) return [];
    const results: ContextPack[] = [];
    for (const name of names) {
      const pack = await this.get(name);
      if (pack) results.push(pack);
    }
    return results;
  }

  clearCache(): void { this.cache.clear(); }
  getCacheStats(): CacheStats { return this.cache.getStats(); }
}
```

### 11.3 ContextInjector Implementation

```typescript
import { TemplateEngine } from './template-engine';
import { VariableResolver } from './variable-resolver';
import { Prioritizer } from './prioritizer';
import { SliceSelector } from './slice-selector';
import { FormatCombiner } from './format-combiner';
import { Section, ContextPack, ResolvedPack } from '../types/context-pack.types';

export class ContextInjector {
  private templateEngine: TemplateEngine;
  private variableResolver: VariableResolver;
  private prioritizer: Prioritizer;
  private sliceSelector: SliceSelector;
  private combiner: FormatCombiner;

  constructor(private config: ContextInjectorConfig) {
    this.templateEngine = new TemplateEngine({ engine: config.templateEngine });
    this.variableResolver = new VariableResolver();
    this.prioritizer = new Prioritizer();
    this.sliceSelector = new SliceSelector();
    this.combiner = new FormatCombiner({ separator: config.packSeparator });
  }

  async inject(
    packs: ResolvedPack[],
    variables: Record<string, unknown>,
    maxTokens?: number
  ): Promise<InjectedContext> {
    const warnings: string[] = [];
    const usedPacks: string[] = [];

    const allSections: SectionWithPack[] = [];
    for (const resolved of packs) {
      usedPacks.push(resolved.pack.name);
      for (const section of resolved.pack.sections) {
        allSections.push({ ...section, packName: resolved.pack.name });
      }
    }

    for (const section of allSections) {
      section.resolvedContent = this.variableResolver.resolve(section.content, variables);
    }

    const missingVars = this.variableResolver.checkRequired(packs, variables);
    if (missingVars.length > 0) {
      warnings.push(`Missing required: ${missingVars.join(', ')}`);
    }

    const prioritized = this.prioritizer.prioritize(allSections);

    let finalSections: RenderedSection[];
    let sliced = false;

    if (maxTokens && maxTokens > 0) {
      const slicedResult = this.sliceSelector.slice(prioritized, maxTokens);
      finalSections = slicedResult.included;
      if (slicedResult.excluded.length > 0) {
        sliced = true;
        const p0Excluded = slicedResult.excluded.filter(s => s.priority === 'P0');
        if (p0Excluded.length > 0) {
          warnings.push(`CRITICAL: ${p0Excluded.length} P0 sections excluded`);
        }
      }
    } else {
      finalSections = prioritized.map(s => ({
        id: s.id, pack: s.packName, title: s.title,
        content: s.resolvedContent, tokens: this.estimateTokens(s.resolvedContent),
        priority: s.priority, included: true,
      }));
    }

    const rendered: RenderedSection[] = [];
    for (const section of finalSections) {
      const renderedContent = await this.templateEngine.render(section.content, variables);
      rendered.push({ ...section, content: renderedContent, tokens: this.estimateTokens(renderedContent) });
    }

    const prompt = this.combiner.combine(rendered, {
      showSummary: this.config.includeSummary, usedPacks,
    });

    const totalTokens = rendered.reduce((a, s) => a + s.tokens, 0);

    return {
      prompt, usedPacks, totalTokens, maxTokens: maxTokens ?? totalTokens,
      sections: rendered, variables, warnings, sliced,
    };
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

interface SectionWithPack extends Section {
  packName: string;
  resolvedContent: string;
}
```

### 11.4 LRUCache Implementation

```typescript
export class LRUCache<K, V> {
  private cache: Map<K, CacheEntry<V>>;
  private hits = 0;
  private misses = 0;

  constructor(private config: { maxSize: number; ttl: number }) {
    this.cache = new Map();
  }

  get(key: K): V | null {
    const entry = this.cache.get(key);
    if (!entry) { this.misses++; return null; }
    if (Date.now() - entry.timestamp > this.config.ttl) {
      this.cache.delete(key); this.misses++; return null;
    }
    this.hits++;
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.config.maxSize) {
      const lruKey = this.cache.keys().next().value;
      if (lruKey !== undefined) this.cache.delete(lruKey);
    }
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear(): void { this.cache.clear(); this.hits = 0; this.misses = 0; }

  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size, hits: this.hits, misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }
}

interface CacheEntry<V> { value: V; timestamp: number; }
```

### 11.5 DependencyResolver Implementation

```typescript
import { satisfies } from 'semver';
import { ContextPack } from '../schema/context-pack-schema';
import { RegistryService } from './registry-service';

export class DependencyResolver {
  constructor(private registry: RegistryService) {}

  async resolve(pack: ContextPack): Promise<ContextPack[]> {
    const resolved: ContextPack[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();
    await this.resolveRecursive(pack, resolved, visiting, visited);
    return resolved;
  }

  private async resolveRecursive(
    pack: ContextPack, resolved: ContextPack[],
    visiting: Set<string>, visited: Set<string>
  ): Promise<void> {
    const packKey = `${pack.name}@${pack.version}`;
    if (visited.has(packKey)) return;
    if (visiting.has(packKey)) throw new CyclicDependencyError(pack.name, [...visiting]);

    visiting.add(packKey);

    for (const dep of pack.dependencies) {
      if (!dep.required) {
        try {
          const depPack = await this.registry.get(dep.pack);
          if (depPack) await this.resolveRecursive(depPack, resolved, visiting, visited);
        } catch { continue; }
      } else {
        const depPack = await this.registry.get(dep.pack);
        if (!depPack) throw new DependencyNotFoundError(dep.pack, pack.name);
        if (dep.version !== '*' && !satisfies(depPack.version, dep.version)) {
          throw new DependencyVersionMismatchError(dep.pack, dep.version, depPack.version, pack.name);
        }
        await this.resolveRecursive(depPack, resolved, visiting, visited);
      }
    }

    visiting.delete(packKey);
    visited.add(packKey);
    resolved.push(pack);
  }
}
```

---

## 12. Exemplos Completos de Packs YAML

### 12.1 Pack: bugfix@1.0.0.yaml

```yaml
name: bugfix
version: 1.0.0
displayName: "Bug Fix Context"
description: >
  Contexto completo para correcao de bugs na plataforma IDEIA.
  Fornece diagnostico estruturado, template de reproducao,
  analise de causa raiz, padroes de correcao e checklist de
  validacao pos-fix. Adequado para bugs de todos os niveis
  de severidade (low a critical) em qualquer componente.
author: IDEIA
created: 2026-07-22T00:00:00Z
updated: 2026-07-22T00:00:00Z
tags: [debug, fix, quality, troubleshooting, defect]
categories: [quality, maintenance]
level: intermediate

variables:
  - name: bug_description
    type: string
    description: "Descricao detalhada do bug observado"
    required: true
  - name: severity
    type: enum
    description: "Nivel de severidade do bug"
    default: medium
    enum: [low, medium, high, critical]
  - name: expected_behavior
    type: string
    description: "Comportamento esperado"
    required: true
  - name: actual_behavior
    type: string
    description: "Comportamento atual"
    required: true
  - name: reproduction_steps
    type: string
    description: "Passos para reproduzir o bug"
    required: true

dependencies:
  - pack: ideia-introduction
    version: ^1.0.0
    required: true

sections:
  - id: bug_context
    title: "Contexto do Bug"
    format: markdown
    priority: P0
    content: |
      ## Contexto do Bug
      **Descricao:** {{bug_description}}
      **Severidade:** {{severity}}
      **Esperado:** {{expected_behavior}}
      **Atual:** {{actual_behavior}}
    contentShort: |
      ## Bug: {{bug_description}} ({{severity}})

  - id: reproduction
    title: "Passos para Reproduzir"
    format: markdown
    priority: P0
    content: |
      ## Reproducao
      {{reproduction_steps}}

  - id: diagnosis_framework
    title: "Framework de Diagnostico"
    format: markdown
    priority: P1
    content: |
      ## Metodo: 5 Whys
      1. Por que o comportamento atual ocorre?
      2. Por que a causa acima existe?
      3. Por que a causa acima existe?
      4. Por que a causa acima existe?
      5. Por que a causa acima existe?

  - id: fix_patterns
    title: "Padroes de Correcao"
    format: markdown
    priority: P2
    content: |
      | Tipo de Bug | Padrao | Abordagem |
      | NullPointer | Null Object Pattern | Retornar objeto vazio |
      | Race Condition | Mutex | Sincronizar recurso |
      | Memory Leak | WeakRef/Dispose | Liberar em finally |
      | Timeout | Circuit Breaker | Falhar rapido |

  - id: validation_checklist
    title: "Checklist de Validacao"
    format: markdown
    priority: P1
    content: |
      - [ ] Bug nao e mais reproduzivel
      - [ ] Teste unitario cobre o cenario
      - [ ] Teste de regressao adicionado

slicing:
  - maxTokens: 4096; strategy: priority; maxSections: 3
  - maxTokens: 8192; strategy: priority; maxSections: 5
  - maxTokens: 32768; strategy: priority

totalTokens: 3800
totalTokensShort: 1800
```

### 12.2 Pack: onboarding@1.0.0.yaml

```yaml
name: onboarding
version: 1.0.0
displayName: "Onboarding Context"
description: >
  Contexto para onboarding de novos usuarios e agentes na plataforma
  IDEIA. Fornece tutorial interativo, conceitos fundamentais, primeiros
  passos e exercicios guiados. Adaptavel ao nivel de experiencia e papel.
author: IDEIA
created: 2026-07-22T00:00:00Z
updated: 2026-07-22T00:00:00Z
tags: [onboarding, learning, tutorial, new-user, training]
categories: [education, user-experience]
level: beginner

variables:
  - name: user_role
    type: enum
    default: developer
    enum: [developer, devops, manager, ai-agent, architect]
  - name: experience_level
    type: enum
    default: beginner
    enum: [beginner, intermediate, advanced]
  - name: include_exercises
    type: boolean
    default: true

dependencies:
  - pack: ideia-introduction
    version: ^1.0.0
    required: true

sections:
  - id: welcome
    title: "Boas-Vindas"
    format: markdown
    priority: P0
    content: |
      ## Bem-vindo a IDEIA!
      **Papel:** {{user_role}}
      **Nivel:** {{experience_level}}
      1. Conceitos fundamentais (5min)
      2. Primeiros passos (15min)
      3. Fluxo completo (30min)
      {{#if include_exercises}}4. Exercicios (20min){{/if}}

  - id: core_concepts
    title: "Conceitos Fundamentais"
    format: markdown
    priority: P1
    content: |
      ## Os 6 Agentes
      | Agente | Funcao |
      | Analyst | Entender requisitos |
      | Architect | Definir arquitetura |
      | Programmer | Implementar |
      | Reviewer | Revisar qualidade |
      | Tester | Criar testes |
      | DevOps | Configurar deploy |

  - id: first_steps
    title: "Primeiros Passos"
    format: code
    priority: P1
    content: |
      # Iniciar projeto
      IDEIA init meu-primeiro-projeto
      # Gerar feature
      IDEIA generate feature "Endpoint GET /hello"
      # Rodar testes
      IDEIA run tests

  - id: exercises
    title: "Exercicios"
    format: markdown
    priority: P2
    content: |
      {{#if include_exercises}}
      ### Exercicio 1: Criar um Comando CLI
      IDEIA generate command saudacao --param nome
      ### Exercicio 2: Adicionar Testes
      IDEIA generate test --target comandos/saudacao.ts
      {{else}}Exercicios desabilitados{{/if}}

  - id: next_steps
    title: "Proximos Passos"
    format: markdown
    priority: P2
    content: |
      - `IDEIA help` - Lista comandos
      - `IDEIA context pack resolve architecture` - Arquitetura
      - `IDEIA deploy` - Orquestracao completa

slicing:
  - maxTokens: 4096; strategy: priority; maxSections: 3
  - maxTokens: 8192; strategy: priority; maxSections: 5
  - maxTokens: 32768; strategy: priority

totalTokens: 4000
totalTokensShort: 1500
```

---

## 13. Conexoes com Outros Estudos

### 13.1 Mapa de Conexoes

```
            +--------------------------------------------------+
            |             S33 CONTEXT PACK SYSTEM                |
            +--------------------------------------------------+
                       |           |           |
     +-----------------+           |           +-----------------+
     v                             v                             v
+--------------+          +------------------+          +------------------+
|  S19 PROMPTS  |          |  S26 MANIFEST     |          |  S27 CAPABILITY   |
|               |          |                   |          |                   |
| Pipeline de   |<-------->| Self-Description  |<-------->| Registry &        |
| prompts,      |  Context | System, realidade |   Packs  | Discovery Engine  |
| enriquecimento|  Packs   | verificavel       |   gerados |                   |
+-------+-------+          +------------------+          +------------------+
        |
        |
        v
+--------------+          +------------------+          +------------------+
|  S28 ZERO-TO-|          |  S30 ONBOARDING   |          |  S20 PLUGINS      |
|  DEPLOY      |          |                   |          |                   |
|              |          |                   |          |                   |
| Orquestracao |<-------->| Tutoriais e       |<-------->| Ecossistema de    |
| de 6 fases   |   Packs  | onboarding de     |   Pack   | plugins, extensoes|
|              |  injetam | novos usuarios    |   theia  |                   |
+--------------+          +------------------+          +------------------+
        |
        v
+--------------+          +------------------+          +------------------+
|  S3 INTENT-  |          |  S18 AI SAFETY    |          |  S1 BARRAMENTO    |
|  TO-PLAN     |          |                   |          |                   |
|              |          |                   |          |                   |
| Classificacao|<-------->| Alinhamento e     |<-------->| Eventos NATS      |
| de intencao  |   Packs  | seguranca de IA   |   Packs  | para notificacoes |
|              |  guiam o |                   | security |                   |
+--------------+          +------------------+          +------------------+
```

### 13.2 Conexoes Detalhadas

| Estudo | Conexao | Direcao | Detalhes |
|--------|---------|---------|----------|
| **S19** -- Engenharia de Prompts | Context Injector alimenta o Prompt Pipeline | S33 -> S19 | Context packs sao a fonte de contexto para a etapa "Enrich" do pipeline |
| **S19** -- Engenharia de Prompts | Prompt Pipeline classifica intencao para Adaptive Context | S19 -> S33 | A classificacao (bugfix, feature, etc.) seleciona o pack apropriado |
| **S26** -- Manifest System | Pack Generator usa o Manifest como fonte | S26 -> S33 | Manifesto fornece packages, comandos e capacidades para geracao automatica |
| **S26** -- Manifest System | Context Packs enriquecem o Self-Description protocol | S33 -> S26 | Packs sao registrados como parte da auto-descricao da IDEIA |
| **S27** -- Capability Registry | Context Packs registram capacidades dos modulos | S27 <-> S33 | Cada pack expoe capacidades que o Capability Registry indexa |
| **S27** -- Capability Registry | Discovery Engine localiza packs por capacidade | S27 -> S33 | "Encontre um pack que sabe fazer bugfix" |
| **S28** -- Zero-to-Deploy | Cada fase do deploy tem um context pack associado | S33 -> S28 | Pack `deployment` guia cada fase; pack `testing` prepara testes |
| **S30** -- Onboarding | Pack `onboarding` e o principal recurso | S33 -> S30 | Tutorial interativo guia novos usuarios com contexto adaptativo |
| **S30** -- Onboarding | Onboarding define pacotes para perfil de usuario | S30 -> S33 | Define qual combinacao de packs usar para cada perfil |
| **S20** -- Plugins | Pack `theia-plugin` guia desenvolvimento | S33 -> S20 | Contexto especializado para criar extensoes Theia |
| **S3** -- Intent-to-Plan | Classificacao de intencao seleciona packs | S3 -> S33 | Intencao "bugfix" -> pack `bugfix` |
| **S18** -- AI Safety | Pack `security-review` aplica controles | S18 <-> S33 | Pack herda regras de seguranca do S18 |
| **S1** -- Barramento | Registry emite eventos de mudanca de packs | S33 -> S1 | Pack registrado/atualizado notifica via NATS |
| **S5** -- Multiagente | Pack `agent-collaboration` define protocolo | S33 -> S5 | Contexto de colaboracao multiagente |
| **S6** -- Pipeline Qualidade | Pack Validator integra com quality gates | S33 <-> S6 | Validacao de packs como parte do gate |
| **S12** -- Testes | Context packs incluem templates de teste | S33 <-> S12 | Pack `testing` fornece templates |
| **S4** -- Seguranca Prompt | Pack `security-review` fortalece governor | S33 <-> S4 | Injeccao de contexto seguro |

### 13.3 Impacto nos Estudos Conectados

| Estudo | Como S33 melhora o estudo |
|--------|---------------------------|
| **S19** | Reduz em 60% o custo de tokens do contexto; aumenta precisao da classificacao |
| **S26** | Adiciona 20+ pontos de auto-descricao; manifesto inclui catalogo de packs |
| **S27** | Registry de capacidades ganha 20 novas capacidades (uma por pack) |
| **S28** | Cada fase ganha contexto especializado; orquestrador usa AdaptiveContext |
| **S30** | Onboarding passa de tutorial estatico para adaptativo (nivel + papel) |
| **S18** | Security review automatizada com contexto rico e checklist OWASP |
| **S3** | Classificacao de intencao passa a ter contexto preciso para cada tipo |
| **S5** | Agentes se comunicam com contexto compartilhado via packs |
| **S20** | Plugin developers tem guia completo de contribuicoes Theia |

---

## 14. Plano de Implementacao

### 14.1 Tasks Detalhadas

| ID | Task | Horas | Prioridade | Depende de |
|----|------|-------|------------|------------|
| CP-01 | Criar package `packages/context-pack` com estrutura de diretorios | 2 | P0 | -- |
| CP-02 | Implementar ContextPackSchema (Zod) com todos os campos | 4 | P0 | CP-01 |
| CP-03 | Implementar RegistryService: register, get, search, findByTag | 8 | P0 | CP-02 |
| CP-04 | Implementar DependencyResolver com DFS, ciclo detection, semver | 6 | P0 | CP-03 |
| CP-05 | Implementar PackCache (LRU) com TTL e stats | 3 | P0 | CP-01 |
| CP-06 | Implementar FileLoader: load packs from .ai/context-packs/ | 3 | P0 | CP-01 |
| CP-07 | Implementar TemplateEngine (EJS adapter) | 4 | P0 | CP-01 |
| CP-08 | Implementar VariableResolver com validacao required/default | 3 | P0 | CP-07 |
| CP-09 | Implementar Prioritizer (P0/P1/P2 ordering) | 2 | P0 | CP-01 |
| CP-10 | Implementar SliceSelector com algoritmo de slicing adaptativo | 6 | P0 | CP-09 |
| CP-11 | Implementar FormatCombiner para montagem do prompt final | 3 | P0 | CP-07 |
| CP-12 | Implementar ContextInjector (integra T.Engine + V.Resolver + Prioritizer + Slice) | 8 | P0 | CP-07 a CP-11 |
| CP-13 | Implementar PackValidator: schema, dependencias, variaveis, slicing | 6 | P0 | CP-02 |
| CP-14 | Implementar PackGenerator: fromManifest, fromTemplate, refresh | 8 | P0 | CP-02, S26 |
| CP-15 | Implementar AdaptiveContext: TaskAnalyzer, PackSelector, BudgetCalc | 10 | P0 | CP-12 |
| CP-16 | Implementar CLI `IDEIA context pack` (list, resolve, validate, generate, search) | 8 | P0 | CP-03, CP-12, CP-13 |
| CP-17 | Criar 20 context packs YAML completos (biblioteca) | 20 | P0 | CP-02 |
| CP-18 | Criar registry.yaml com indice dos 20 packs | 2 | P0 | CP-17 |
| CP-19 | Integrar ContextInjector com Prompt Pipeline (S19) | 6 | P1 | CP-12, S19 |
| CP-20 | Integrar PackGenerator com Reality Manifest (S26) | 4 | P1 | CP-14, S26 |
| CP-21 | Integrar AdaptiveContext com Intent Classifier (S3) | 4 | P1 | CP-15, S3 |
| CP-22 | Integrar Registry events com NATS barramento (S1) | 4 | P1 | CP-03, S1 |
| CP-23 | Implementar FeedbackCollector no AdaptiveContext | 4 | P1 | CP-15 |
| CP-24 | Implementar HTTPLoader para packs remotos | 3 | P2 | CP-06 |
| CP-25 | Implementar geracao automatica de packs via CodeScanner | 6 | P2 | CP-14 |
| CP-26 | Implementar validacao CI (pre-commit hook para packs) | 4 | P2 | CP-13 |
| CP-27 | Implementar drift detection de packs vs manifesto | 4 | P2 | CP-14, CP-20 |
| CP-28 | Implementar metrics collection e dashboard de uso de packs | 4 | P2 | CP-15 |
| CP-29 | Implementar export/import de packs (serializacao) | 3 | P2 | CP-03 |
| CP-30 | Documentacao completa do Context Pack System | 6 | P1 | CP-01 a CP-16 |

**Total estimado: 154 horas**

### 14.2 Dependencias entre Tasks

```
CP-01 -----+-- CP-02 -----+-- CP-03 -----+-- CP-16 (CLI)
           |              |              +-- CP-18 (registry index)
           |              |              +-- CP-22 (NATS)
           |              +-- CP-04 (dependency resolver)
           |              +-- CP-05 (cache)
           |              +-- CP-29 (export/import)
           |
           +-- CP-06 (file loader)
           +-- CP-07 -----+-- CP-08 (variable resolver)
           |              +-- CP-09 (prioritizer)
           |              +-- CP-10 (slice selector)
           |              +-- CP-11 (format combiner)
           |              +-- CP-12 (context injector) -----+-- CP-19 (Prompt Pipeline)
           |                                                 +-- CP-30 (docs)
           |
           +-- CP-13 (validator) -----+-- CP-26 (CI hooks)
           |
           +-- CP-14 (generator) -----+-- CP-20 (Manifest S26)
           |                           +-- CP-25 (CodeScanner)
           |                           +-- CP-27 (drift detection)
           |
           +-- CP-15 (adaptive) -------+-- CP-21 (Intent Classifier S3)
           |                            +-- CP-23 (feedback)
           |                            +-- CP-28 (metrics)
           |
           +-- CP-17 (20 packs) -------+-- CP-18 (registry index)
           |
           +-- CP-24 (HTTP loader)
```

### 14.3 Roadmap

```
Fase 1 (Semana 1-2): Core do Context Pack System
  CP-01 a CP-12: Schema, Registry, Loader, Injector completo
  Resultado: Sistema funcional com 1 pack (ideia-introduction)
  Testes: Registry unit + Injector unit + Validator unit

Fase 2 (Semana 3-4): Biblioteca e Integracao
  CP-13 a CP-18: Validator, Generator, CLI, 20 packs
  CP-19 a CP-22: Integracao com Prompt Pipeline, Manifest, NATS
  Resultado: 20 packs disponiveis, CLI funcional
  Testes: Integracao com Prompt Pipeline

Fase 3 (Semana 5-6): Inteligencia e Maturidade
  CP-23 a CP-30: Adaptive Context, feedback loop, metrics, docs
  CP-24 a CP-27: HTTP loader, code scanner, CI validation, drift
  Resultado: Sistema completo com Adaptive Context
  Testes: End-to-end, mutation, performance

Fase 4 (Semana 7-8): Producao e Otimizacao
  CP-28 a CP-30: Metrics dashboard, export/import, docs finais
  Otimizacao: Cache tuning, slicing perf, template caching
  Resultado: Context Pack System em producao
  Testes: Performance benchmarking, stress test
```

### 14.4 Criterios de Aceitacao

| Criterio | Descricao | Verificacao |
|----------|-----------|-------------|
| CA-01 | Registry carrega e indexa 20 packs em < 2s | `time context-pack list` |
| CA-02 | ContextInjector monta prompt com 3 packs + slicing em < 500ms | Benchmark |
| CA-03 | AdaptiveContext seleciona packs corretos para cada tipo de task | Testes de classificacao |
| CA-04 | Validacao de schema detecta 100% dos erros SC-01 a SC-15 | Testes unitarios |
| CA-05 | Cache LRU tem hit rate > 80% em uso tipico | `getCacheStats()` |
| CA-06 | Pack Generator cria pack valido a partir do manifesto | `validate --auto` |
| CA-07 | Slicing respeita limite de tokens com margem de 10% | Testes de slicing |
| CA-08 | CLI `IDEIA context pack` tem --json, --verbose | `--help` |
| CA-09 | 20 context packs cobrem todos os cenarios de uso | Coverage test |
| CA-10 | Integracao com Prompt Pipeline reduz tokens de contexto em 60% | Medicao A/B |

### 14.5 Metricas de Sucesso

| Metrica | Alvo v1.0 | Alvo v2.0 | Medicao |
|---------|-----------|-----------|---------|
| Cobertura de cenarios com context packs | 20 cenarios | 50+ cenarios | Contagem de packs |
| Reducao de tokens de contexto | 60% | 80% | Medicao A/B |
| Tempo de resolucao de packs | < 2s | < 500ms | `time resolve` |
| Cache hit rate | > 80% | > 95% | Cache stats |
| Precisao do Adaptive Context | 85% | 95% | Feedback score |
| Qualidade das respostas LLM | +25% | +40% | Avaliacao comparativa |
| Satisfacao dos usuarios/agentes | NPS > 50 | NPS > 70 | Survey trimestral |
| Cobertura de testes do sistema | 80% | 95% | Istanbul coverage |
| Packs gerados automaticamente | 0 | 10+/semana | Count |

---

## Referencias

### Documentos Internos

| Referencia | Descricao |
|------------|-----------|
| AGENTS.md | Regras e arquitetura da IDEIA |
| ESTUDO-ENGENHARIA-PROMPTS-AGENTES.md (S19) | Prompt pipeline e engenharia de prompts |
| ESTUDO-MANIFEST-SELF-DESCRIPTION.md (S26) | Self-Description System e Reality Manifest |
| ESTUDO-CAPABILITY-REGISTRY.md (S27) | Capability Registry e Discovery Engine |
| ESTUDO-ZERO-TO-DEPLOY.md (S28) | Orquestracao Zero-to-Deploy |
| ESTUDO-ONBOARDING-TUTORIALS.md (S30) | Onboarding e tutoriais |
| ESTUDO-INTENT-TO-PLAN-RESEARCH.md (S3) | Classificacao de intencao |
| ESTUDO-ORQUESTRACAO-MULTIAGENTE-DISTRIBUIDA.md (S5) | Orquestracao multiagente |
| ESTUDO-PLUGINS-ECOSSISTEMA.md (S20) | Plugins e ecossistema |
| ESTUDO-AI-SAFETY-ALIGNMENT.md (S18) | Seguranca de IA |

### Tecnologias e Ferramentas

| Tecnologia | Uso no Context Pack System |
|------------|---------------------------|
| **Zod** | Schema validation dos context packs |
| **YAML** | Formato de armazenamento dos packs |
| **EJS/Handlebars** | Template engine para renderizacao |
| **semver** | Resolucao de versoes de dependencias |
| **Commander/Yargs** | CLI commands para context pack |
| **glob** | Scan de arquivos no code scanner |
| **LRU Cache** | Cache de packs em memoria |
| **tiktoken** | Estimativa precisa de tokens |

### Referencias Externas

- JSON Schema Specification: https://json-schema.org/specification
- Zod Documentation: https://zod.dev/
- YAML Spec 1.2.2: https://yaml.org/spec/
- SemVer 2.0.0: https://semver.org/
- EJS Documentation: https://ejs.co/
- Anthropic Context Guidelines: https://docs.anthropic.com/claude/docs/constructing-prompts
- MCP (Model Context Protocol): https://modelcontextprotocol.io/

---

> **Proximo passo:** Criar `packages/context-pack` com schema Zod, RegistryService, DependencyResolver, ContextInjector, PackValidator, PackGenerator e AdaptiveContext. Integrar com Prompt Pipeline (S19), Reality Manifest (S26) e Capability Registry (S27). Escrever 20 context packs YAML cobrindo todos os cenarios de uso da IDEIA.
