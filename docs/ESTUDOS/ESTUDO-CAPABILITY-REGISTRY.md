# ESTUDO S27 — Capability Registry & Discovery Engine

> **Data:** 2026-07-22
> **Contexto:** IDEIA — sistema multiagente com 6+ agentes, 51 comandos CLI, 13 adapters de linguagem, 7 registries e 65+ packages
> **Problema:** Ausencia de registro centralizado de capacidades — agentes, ferramentas e modulos nao sabem o que uns aos outros oferecem
> **Solucao:** Capability Registry & Discovery Engine — registro universal, descoberta automatica, matching semantico e resolucao de dependencias

---

## Sumario

1. [Introducao](#1-introducao)
2. [Arquitetura do Capability Registry](#2-arquitetura-do-capability-registry)
3. [Interface Capability](#3-interface-capability)
4. [Registry Service](#4-registry-service)
5. [Discovery Engine](#5-discovery-engine)
6. [Capability Matcher](#6-capability-matcher)
7. [Dependency Resolver](#7-dependency-resolver)
8. [Categorias de Capacidades](#8-categorias-de-capacidades)
9. [Integracao com Prompt Pipeline](#9-integracao-com-prompt-pipeline)
10. [Protocolo de Comunicacao](#10-protocolo-de-comunicacao)
11. [Implementacao TypeScript](#11-implementacao-typescript)
12. [Conexoes com Estudos](#12-conexoes-com-estudos)
13. [Plano de Implementacao](#13-plano-de-implementacao)

---

## 1. Introducao

### 1.1 O Problema da Descoberta em Sistemas Multi-Agente

Sistemas multi-agente enfrentam um problema fundamental: **como um agente descobre o que outro agente (ou ferramenta, ou modulo) pode fazer?** Sem um registro centralizado, as seguintes disfuncoes ocorrem:

| Problema | Impacto | Exemplo na IDEIA |
|----------|---------|------------------|
| Roteamento硬coded | Agente chama funcao errada por falta de alternativa | Planner chama Programmer para tarefa de revisao |
| Duplicacao de capacidade | Dois modulos implementam mesma funcao sem saber | `task-analyzer.ts` e `intent-classifier.ts` fazem parsing similar |
| Sub-utilizacao | Capacidade existe mas ninguem sabe | Adapter de Rust existe mas agentes geram TypeScript |
| Dependencia quebrada | Modulo A depende de B, mas B foi descontinuado | Registry de patterns removido, mas plugin ainda o referencia |
| Onboarding lento | Novo agente demanda configuracao manual de dependencias | Cada agente precisa de toolbox.json proprio |

### 1.2 Por que um Capability Registry e Essencial

Um Capability Registry resolve esses problemas ao:

1. **Centralizar** o catalogo de todas as capacidades do sistema
2. **Automatizar descoberta** via scanning de packages e decorators
3. **Roteamento inteligente** com scoring de similaridade semantica
4. **Resolucao de dependencias** com deteccao de ciclos e versionamento
5. **Alimentar o Prompt Pipeline** com contexto enriquecido de capacidades disponiveis

### 1.3 Definicao de Capacidade

No contexto da IDEIA, uma **capacidade** e qualquer unidade funcional com:

- **Identidade** unica (id, nome, versao)
- **Interface** explicita (inputs, outputs, schemas)
- **Dependencias** declaradas para funcionamento
- **Metadados** para descoberta (tags, categoria, exemplos)

```
           ┌─────────────────────────────────┐
           │         CAPACIDADE              │
           ├─────────────────────────────────┤
           │  id: "agent.programmer.v1"     │
           │  name: "Programmer Agent"      │
           │  category: "agent"             │
           │  subcategory: "implementation" │
           ├─────────────────────────────────┤
           │  dependsOn: [                  │
           │    "tool.read",                │
           │    "tool.write",               │
           │    "registry.schema"           │
           │  ]                             │
           ├─────────────────────────────────┤
           │  inputs: [                     │
           │    { name: "task", type: "TaskSpec" }
           │  ]                             │
           │  outputs: [                    │
           │    { name: "code", type: "FileContent[]" }
           │  ]                             │
           └─────────────────────────────────┘
```

---

## 2. Arquitetura do Capability Registry

### 2.1 Visao Geral

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CAPABILITY REGISTRY SYSTEM                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐   ┌─────────────────┐   ┌──────────────────┐     │
│  │  DISCOVERY   │   │   REGISTRY      │   │   DEPENDENCY     │     │
│  │  ENGINE      │──>│   SERVICE       │<──│   RESOLVER       │     │
│  │  (scan,      │   │  (CRUD, cache,  │   │  (graph, cycle   │     │
│  │   parse,     │   │   search, emit) │   │   detect, semver)│     │
│  │   index)     │   └────────┬────────┘   └──────────────────┘     │
│  └──────────────┘            │                                      │
│                               │                                      │
│                    ┌──────────▼──────────┐                          │
│                    │   CAPABILITY         │                          │
│                    │   MATCHER            │                          │
│                    │  (semantic, score,   │                          │
│                    │   rank, filter)      │                          │
│                    └──────────────────────┘                          │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    STORAGE LAYER                              │   │
│  │  ┌─────────┐  ┌──────────┐  ┌────────┐  ┌────────────────┐  │   │
│  │  │ SQLite  │  │  Memory  │  │  DuckDB│  │  NATS KV       │  │   │
│  │  │ (persist)│  │  (cache) │  │ (analytics) │  (distribuido)│  │   │
│  │  └─────────┘  └──────────┘  └────────┘  └────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
   Prompt Pipeline           NATS Events               REST API
   (context enrichment)    (capability.*)           (CRUD + query)
```

### 2.2 Componentes

| Componente | Responsabilidade | Interface |
|------------|-----------------|-----------|
| **Registry Service** | CRUD de capacidades, cache, busca full-text | `ICapabilityRegistry` |
| **Capability Interface** | Schema e contrato de capacidade | `Capability` type |
| **Discovery Engine** | Scan automatico de packages, decorators, manifests | `IDiscoveryEngine` |
| **Capability Matcher** | Matching requisito x capacidade com scoring | `ICapabilityMatcher` |
| **Dependency Resolver** | Grafo de dependencias, deteccao de ciclos, semver | `IDependencyResolver` |
| **Discovery API** | REST + NATS + MCP para consulta externa | `IDiscoveryAPI` |

### 2.3 Fluxo de Registro

```
[Package] ──scan──> [Discovery Engine]
                         │
                         ▼ detecta @capability decorator
                         ▼ extrai manifest.yaml
                         ▼ analise estatica de exports
                         │
                         ▼
                    [Capability Document] ──register──> [Registry Service]
                                                              │
                                                              ▼
                                                         [SQLite Store]
                                                              │
                                                              ▼
                                                         [NATS Event]
                                                    "capability.registered"
                                                              │
                                                              ▼
                                                    [Dependency Resolver]
                                                    valida dependencias
                                                    detecta ciclos
                                                              │
                                                              ▼
                                                    [Cache Update]
```

### 2.4 Fluxo de Consulta (Matching)

```
[Agente/Modulo] ──requisito──> [Capability Matcher]
                                      │
                                      ▼ busca em [Registry Service]
                                      │
                                      ▼ scoring semantico
                                      │  - similaridade de nome
                                      │  - match de tags
                                      │  - compatibilidade de tipos
                                      │  - versao compativel
                                      │
                                      ▼ ranking
                                      │
                                      ▼ filtro por:
                                      │  - categoria
                                      │  - status (active/deprecated)
                                      │  - versao minima
                                      │
                                      ▼
                                 [CapabilityMatch[]]
                                 ranked por score
```

---

## 3. Interface Capability

### 3.1 Schema TypeScript

```typescript
// ============================================================
// packages/capability-registry/src/types/capability.ts
// ============================================================

export type CapabilityCategory =
  | 'agent'
  | 'tool'
  | 'context-pack'
  | 'adapter'
  | 'registry'
  | 'workflow'
  | 'observation'
  | 'memory'
  | 'pipeline'
  | 'integration';

export type CapabilityStatus = 'active' | 'deprecated' | 'experimental' | 'draft';

export type CapabilitySubcategory =
  // agent
  | 'analysis' | 'architecture' | 'implementation' | 'review'
  | 'testing' | 'devops' | 'planning' | 'exploration'
  // tool
  | 'codegen' | 'analyzer' | 'validator' | 'formatter'
  | 'search' | 'transform' | 'publisher' | 'scaffolder'
  // context-pack
  | 'domain' | 'technology' | 'project' | 'organization'
  // adapter
  | 'language' | 'framework' | 'platform'
  // registry
  | 'schema' | 'pattern' | 'trace' | 'plugin'
  | 'template' | 'knowledge' | 'metric';

export interface CapabilityInput {
  name: string;
  type: string;
  description?: string;
  required: boolean;
  default?: unknown;
  schema?: Record<string, unknown>;
}

export interface CapabilityOutput {
  name: string;
  type: string;
  description?: string;
  schema?: Record<string, unknown>;
}

export interface CapabilityDependency {
  id: string;
  version: string;
  optional?: boolean;
}

export interface CapabilityExample {
  description: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
}

export interface CapabilityMetadata {
  author?: string;
  package?: string;
  sourceFile?: string;
  since?: string;
  maturity?: number;
  sloCoefficient?: number;
  tags: string[];
  keywords: string[];
  links: Record<string, string>;
}

export interface Capability {
  id: string;
  name: string;
  description: string;
  category: CapabilityCategory;
  subcategory: CapabilitySubcategory;
  version: string;
  status: CapabilityStatus;
  createdAt: string;
  updatedAt: string;

  dependsOn: CapabilityDependency[];
  inputs: CapabilityInput[];
  outputs: CapabilityOutput[];
  examples: CapabilityExample[];

  tags: string[];
  metadata: CapabilityMetadata;
}

export interface CapabilityMatch {
  capability: Capability;
  score: number;
  matchReasons: string[];
}

export interface CapabilityQuery {
  text?: string;
  category?: CapabilityCategory;
  subcategory?: CapabilitySubcategory;
  tags?: string[];
  status?: CapabilityStatus;
  versionMin?: string;
  limit?: number;
  offset?: number;
}

export interface RegistryEvent {
  type: 'registered' | 'updated' | 'deprecated' | 'removed' | 'dependency-changed';
  capability: Capability;
  timestamp: string;
}
```

### 3.2 Schema Zod (Validacao em Runtime)

```typescript
// packages/capability-registry/src/types/capability.zod.ts

import { z } from 'zod';

const CapabilityCategorySchema = z.enum([
  'agent', 'tool', 'context-pack', 'adapter', 'registry',
  'workflow', 'observation', 'memory', 'pipeline', 'integration'
]);

const CapabilityStatusSchema = z.enum([
  'active', 'deprecated', 'experimental', 'draft'
]);

const CapabilityInputSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  required: z.boolean(),
  default: z.unknown().optional(),
  schema: z.record(z.unknown()).optional(),
});

const CapabilityDependencySchema = z.object({
  id: z.string().min(1).max(200),
  version: z.string().min(1).max(50),
  optional: z.boolean().optional(),
});

const CapabilityMetadataSchema = z.object({
  author: z.string().optional(),
  package: z.string().optional(),
  sourceFile: z.string().optional(),
  since: z.string().optional(),
  maturity: z.number().min(0).max(10).optional(),
  sloCoefficient: z.number().min(0).optional(),
  tags: z.array(z.string()),
  keywords: z.array(z.string()),
  links: z.record(z.string()),
});

export const CapabilitySchema = z.object({
  id: z.string().min(1).max(200)
    .regex(/^[a-z0-9._-]+$/, 'id deve conter apenas letras minusculas, numeros, pontos, hifens e underscores'),
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  category: CapabilityCategorySchema,
  subcategory: z.string().min(1).max(100),
  version: z.string().min(1).max(50),
  status: CapabilityStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  dependsOn: z.array(CapabilityDependencySchema).default([]),
  inputs: z.array(CapabilityInputSchema).default([]),
  outputs: z.array(CapabilityInputSchema).default([]),
  examples: z.array(z.object({
    description: z.string(),
    input: z.record(z.unknown()),
    output: z.record(z.unknown()),
  })).default([]),
  tags: z.array(z.string()).default([]),
  metadata: CapabilityMetadataSchema,
});

export type CapabilityDTO = z.infer<typeof CapabilitySchema>;

export function validateCapability(data: unknown): CapabilityDTO {
  return CapabilitySchema.parse(data);
}
```

---

## 4. Registry Service

### 4.1 Interface

```typescript
// packages/capability-registry/src/registry/registry.interface.ts

import {
  Capability,
  CapabilityMatch,
  CapabilityQuery,
  RegistryEvent,
} from '../types/capability';

export interface ICapabilityRegistry {
  // CRUD
  register(cap: Capability): Promise<RegistryEvent>;
  get(id: string): Promise<Capability | null>;
  update(id: string, partial: Partial<Capability>): Promise<RegistryEvent>;
  remove(id: string): Promise<void>;
  list(query?: CapabilityQuery): Promise<Capability[]>;
  count(query?: CapabilityQuery): Promise<number>;

  // Busca
  search(text: string, limit?: number): Promise<Capability[]>;
  searchByTags(tags: string[], mode?: 'any' | 'all'): Promise<Capability[]>;
  searchByCategory(cat: string): Promise<Capability[]>;

  // Cache
  invalidate(id: string): Promise<void>;
  invalidateAll(): Promise<void>;

  // Eventos
  onEvent(handler: (event: RegistryEvent) => void): void;
}
```

### 4.2 Implementacao

```typescript
// packages/capability-registry/src/registry/registry.service.ts

import { BetterSqlite3Database } from 'drizzle-orm/better-sqlite3';
import { eq, like, and, or, sql } from 'drizzle-orm';
import { capabilities } from './registry.schema';
import { ICapabilityRegistry } from './registry.interface';
import {
  Capability,
  CapabilityQuery,
  RegistryEvent,
} from '../types/capability';

export class CapabilityRegistryService implements ICapabilityRegistry {
  private db: BetterSqlite3Database;
  private cache: Map<string, { cap: Capability; ts: number }>;
  private listeners: Array<(event: RegistryEvent) => void>;
  private readonly CACHE_TTL = 60_000; // 1 minuto

  constructor(db: BetterSqlite3Database) {
    this.db = db;
    this.cache = new Map();
    this.listeners = [];
  }

  async register(cap: Capability): Promise<RegistryEvent> {
    const existing = await this.get(cap.id);
    if (existing) {
      return this.update(cap.id, cap);
    }

    this.db.insert(capabilities).values({
      id: cap.id,
      name: cap.name,
      description: cap.description,
      category: cap.category,
      subcategory: cap.subcategory,
      version: cap.version,
      status: cap.status,
      tags: JSON.stringify(cap.tags),
      metadata: JSON.stringify(cap.metadata),
      dependsOn: JSON.stringify(cap.dependsOn),
      inputs: JSON.stringify(cap.inputs),
      outputs: JSON.stringify(cap.outputs),
      createdAt: cap.createdAt,
      updatedAt: cap.updatedAt,
    }).run();

    const event: RegistryEvent = {
      type: 'registered',
      capability: cap,
      timestamp: new Date().toISOString(),
    };

    this.emit(event);
    return event;
  }

  async get(id: string): Promise<Capability | null> {
    // Check cache
    const cached = this.cache.get(id);
    if (cached && (Date.now() - cached.ts) < this.CACHE_TTL) {
      return cached.cap;
    }

    const row = this.db.select().from(capabilities)
      .where(eq(capabilities.id, id))
      .get();

    if (!row) return null;

    const cap = this.hydrate(row);
    this.cache.set(id, { cap, ts: Date.now() });
    return cap;
  }

  async update(id: string, partial: Partial<Capability>): Promise<RegistryEvent> {
    const existing = await this.get(id);
    if (!existing) {
      throw new Error(`Capability ${id} not found`);
    }

    const updated: Capability = { ...existing, ...partial, updatedAt: new Date().toISOString() };

    this.db.update(capabilities)
      .set({
        name: updated.name,
        description: updated.description,
        category: updated.category,
        subcategory: updated.subcategory,
        version: updated.version,
        status: updated.status,
        tags: JSON.stringify(updated.tags),
        metadata: JSON.stringify(updated.metadata),
        dependsOn: JSON.stringify(updated.dependsOn),
        inputs: JSON.stringify(updated.inputs),
        outputs: JSON.stringify(updated.outputs),
        updatedAt: updated.updatedAt,
      })
      .where(eq(capabilities.id, id))
      .run();

    this.cache.delete(id);

    const event: RegistryEvent = {
      type: 'updated',
      capability: updated,
      timestamp: updated.updatedAt,
    };

    this.emit(event);
    return event;
  }

  async remove(id: string): Promise<void> {
    this.db.delete(capabilities).where(eq(capabilities.id, id)).run();
    this.cache.delete(id);

    this.emit({
      type: 'removed',
      capability: { id } as Capability,
      timestamp: new Date().toISOString(),
    });
  }

  async search(text: string, limit = 20): Promise<Capability[]> {
    const pattern = `%${text}%`;
    const rows = this.db.select().from(capabilities)
      .where(
        or(
          like(capabilities.name, pattern),
          like(capabilities.description, pattern),
          like(capabilities.tags, pattern),
        )
      )
      .limit(limit)
      .all();

    return rows.map(r => this.hydrate(r));
  }

  async searchByTags(tags: string[], mode: 'any' | 'all' = 'any'): Promise<Capability[]> {
    const rows = this.db.select().from(capabilities).all();

    return rows
      .map(r => this.hydrate(r))
      .filter(cap => {
        const capTags = new Set(cap.tags);
        return mode === 'all'
          ? tags.every(t => capTags.has(t))
          : tags.some(t => capTags.has(t));
      });
  }

  async searchByCategory(cat: string): Promise<Capability[]> {
    const rows = this.db.select().from(capabilities)
      .where(eq(capabilities.category, cat))
      .all();

    return rows.map(r => this.hydrate(r));
  }

  async list(query?: CapabilityQuery): Promise<Capability[]> {
    let q = this.db.select().from(capabilities);

    if (query) {
      const conditions = [];
      if (query.category) conditions.push(eq(capabilities.category, query.category));
      if (query.subcategory) conditions.push(eq(capabilities.subcategory, query.subcategory));
      if (query.status) conditions.push(eq(capabilities.status, query.status));
      if (conditions.length > 0) q = q.where(and(...conditions));
    }

    const rows = q.all();
    return rows.map(r => this.hydrate(r));
  }

  async count(query?: CapabilityQuery): Promise<number> {
    const list = await this.list(query);
    return list.length;
  }

  async invalidate(id: string): Promise<void> {
    this.cache.delete(id);
  }

  async invalidateAll(): Promise<void> {
    this.cache.clear();
  }

  onEvent(handler: (event: RegistryEvent) => void): void {
    this.listeners.push(handler);
  }

  private emit(event: RegistryEvent): void {
    for (const listener of this.listeners) {
      try { listener(event); } catch { /* isolate listener failures */ }
    }
  }

  private hydrate(row: any): Capability {
    return {
      ...row,
      tags: JSON.parse(row.tags || '[]'),
      metadata: JSON.parse(row.metadata || '{}'),
      dependsOn: JSON.parse(row.dependsOn || '[]'),
      inputs: JSON.parse(row.inputs || '[]'),
      outputs: JSON.parse(row.outputs || '[]'),
    };
  }
}
```

### 4.3 Schema SQLite (Drizzle ORM)

```typescript
// packages/capability-registry/src/registry/registry.schema.ts

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const capabilities = sqliteTable('capabilities', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  subcategory: text('subcategory').notNull(),
  version: text('version').notNull(),
  status: text('status').notNull().default('active'),
  tags: text('tags').notNull().default('[]'),
  metadata: text('metadata').notNull().default('{}'),
  dependsOn: text('depends_on').notNull().default('[]'),
  inputs: text('inputs').notNull().default('[]'),
  outputs: text('outputs').notNull().default('[]'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const capabilitiesFts = sqliteTable('capabilities_fts', {
  id: text('id').primaryKey(),
  name: text('name'),
  description: text('description'),
  tags: text('tags'),
});

// Indices
export const idxCategory = sqliteTable('idx_cap_category', {
  category: text('category'),
});

export const idxStatus = sqliteTable('idx_cap_status', {
  status: text('status'),
});
```

---

## 5. Discovery Engine

### 5.1 Interface

```typescript
// packages/capability-registry/src/discovery/discovery.interface.ts

import { Capability } from '../types/capability';

export type DiscoverySource = 'decorator' | 'manifest' | 'static-analysis' | 'config';

export interface DiscoveryResult {
  capabilities: Capability[];
  source: DiscoverySource;
  sourceFile: string;
  errors: string[];
}

export interface IDiscoveryEngine {
  scanPackage(packagePath: string): Promise<DiscoveryResult[]>;
  scanDecorators(sourceCode: string): Promise<Capability[]>;
  parseManifest(manifestPath: string): Promise<Capability[]>;
  staticAnalyze(modulePath: string): Promise<Capability[]>;
  scanAll(): Promise<Map<string, DiscoveryResult[]>>;
}
```

### 5.2 Scanning de Packages

```typescript
// packages/capability-registry/src/discovery/package-scanner.ts

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import glob from 'fast-glob';
import { Capability, CapabilityCategory } from '../types/capability';
import { IDiscoveryEngine, DiscoveryResult, DiscoverySource } from './discovery.interface';

export class PackageScanner implements IDiscoveryEngine {
  private readonly PACKAGES_DIR = 'packages';
  private readonly DISCOVERY_PATTERNS = [
    '**/manifest.yaml',
    '**/manifest.yml',
    '**/manifest.json',
    '**/*.capability.ts',
    '**/*.capability.js',
    '**/*.tool.ts',
    '**/index.ts',
    '**/index.js',
  ];

  constructor(
    private readonly workspaceRoot: string,
    private readonly skipDirs: string[] = ['node_modules', 'dist', '.git'],
  ) {}

  async scanPackage(packagePath: string): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];
    const absPath = path.resolve(this.workspaceRoot, packagePath);

    // 1. Scan for manifest files
    const manifests = await this.findManifests(absPath);
    for (const manifest of manifests) {
      try {
        const caps = await this.parseManifest(manifest);
        results.push({
          capabilities: caps,
          source: 'manifest',
          sourceFile: manifest,
          errors: [],
        });
      } catch (err) {
        results.push({
          capabilities: [],
          source: 'manifest',
          sourceFile: manifest,
          errors: [(err as Error).message],
        });
      }
    }

    // 2. Scan for decorator-annotated files
    const decoratorFiles = await glob('**/*.{ts,js}', {
      cwd: absPath,
      ignore: this.skipDirs,
    });

    for (const file of decoratorFiles) {
      const fullPath = path.join(absPath, file);
      const content = await fs.readFile(fullPath, 'utf-8');

      if (this.hasCapabilityDecorator(content)) {
        const caps = await this.scanDecorators(content);
        if (caps.length > 0) {
          results.push({
            capabilities: caps,
            source: 'decorator',
            sourceFile: fullPath,
            errors: [],
          });
        }
      }
    }

    // 3. Static analysis for tool exports
    for (const file of decoratorFiles.filter(f => f.includes('index.') || f.includes('tool'))) {
      const fullPath = path.join(absPath, file);
      try {
        const caps = await this.staticAnalyze(fullPath);
        if (caps.length > 0) {
          results.push({
            capabilities,
            source: 'static-analysis',
            sourceFile: fullPath,
            errors: [],
          });
        }
      } catch {
        // skip files that can't be analyzed
      }
    }

    return results;
  }

  async parseManifest(manifestPath: string): Promise<Capability[]> {
    const content = await fs.readFile(manifestPath, 'utf-8');
    const ext = path.extname(manifestPath);

    let data: any;
    if (ext === '.json') {
      data = JSON.parse(content);
    } else if (ext === '.yaml' || ext === '.yml') {
      // YAML parsing would go here
      // For now, assume JSON-compatible YAML
      data = JSON.parse(content);
    } else {
      throw new Error(`Unsupported manifest format: ${ext}`);
    }

    if (!Array.isArray(data)) {
      data = [data];
    }

    return data.map((item: any) => this.normalizeManifestEntry(item, manifestPath));
  }

  async scanDecorators(sourceCode: string): Promise<Capability[]> {
    const capabilities: Capability[] = [];
    const decoratorRegex = /@Capability\s*\(\s*\{([^}]+)\}\s*\)/g;
    let match: RegExpExecArray | null;

    while ((match = decoratorRegex.exec(sourceCode)) !== null) {
      try {
        // Extrai objeto JSON do decorator
        const jsonStr = `{${match[1]}}`;
        const data = this.safeParseDecoratorArgs(jsonStr);
        if (data && data.id) {
          capabilities.push(this.buildCapabilityFromDecorator(data));
        }
      } catch {
        // Skip malformed decorators
      }
    }

    return capabilities;
  }

  async staticAnalyze(modulePath: string): Promise<Capability[]> {
    const content = await fs.readFile(modulePath, 'utf-8');
    const capabilities: Capability[] = [];

    // Detect exported functions/classes as potential capabilities
    const exportRegex = /export\s+(?:async\s+)?function\s+(\w+)|export\s+class\s+(\w+)/g;
    let match: RegExpExecArray | null;

    while ((match = exportRegex.exec(content)) !== null) {
      const name = match[1] || match[2];
      if (name && !name.startsWith('_')) {
        capabilities.push({
          id: `auto.${path.basename(modulePath, path.extname(modulePath))}.${name}`,
          name,
          description: `Auto-detected from ${path.basename(modulePath)}`,
          category: 'tool',
          subcategory: 'analyzer',
          version: '1.0.0',
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          dependsOn: [],
          inputs: [],
          outputs: [],
          examples: [],
          tags: ['auto-detected'],
          metadata: {
            tags: [],
            keywords: [],
            links: {},
            sourceFile: modulePath,
          },
        });
      }
    }

    return capabilities;
  }

  async scanAll(): Promise<Map<string, DiscoveryResult[]>> {
    const results = new Map<string, DiscoveryResult[]>();
    const packagesDir = path.join(this.workspaceRoot, this.PACKAGES_DIR);

    try {
      const entries = await fs.readdir(packagesDir);
      for (const entry of entries) {
        const pkgPath = path.join(packagesDir, entry);
        const stat = await fs.stat(pkgPath);
        if (stat.isDirectory() && entry.startsWith('ideia-') || entry.startsWith('@ideia')) {
          const pkgResults = await this.scanPackage(pkgPath);
          if (pkgResults.length > 0) {
            results.set(entry, pkgResults);
          }
        }
      }
    } catch {
      // packages dir may not exist
    }

    return results;
  }

  private async findManifests(dir: string): Promise<string[]> {
    const patterns = this.DISCOVERY_PATTERNS.filter(p => p.includes('manifest'));
    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, { cwd: dir, absolute: true, ignore: this.skipDirs });
      files.push(...matches);
    }
    return files;
  }

  private hasCapabilityDecorator(content: string): boolean {
    return /@Capability\s*\(/.test(content);
  }

  private safeParseDecoratorArgs(jsonStr: string): Record<string, unknown> | null {
    try {
      return JSON.parse(jsonStr);
    } catch {
      // Attempt to fix common JSON issues in decorators
      const fixed = jsonStr
        .replace(/(\w+):/g, '"$1":')
        .replace(/'/g, '"');
      try {
        return JSON.parse(fixed);
      } catch {
        return null;
      }
    }
  }

  private buildCapabilityFromDecorator(data: Record<string, unknown>): Capability {
    return {
      id: data.id as string,
      name: (data.name as string) || (data.id as string),
      description: (data.description as string) || '',
      category: (data.category as CapabilityCategory) || 'tool',
      subcategory: (data.subcategory as string) || 'analyzer',
      version: (data.version as string) || '1.0.0',
      status: (data.status as CapabilityStatus) || 'experimental',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dependsOn: (data.dependsOn as any[]) || [],
      inputs: (data.inputs as any[]) || [],
      outputs: (data.outputs as any[]) || [],
      examples: (data.examples as any[]) || [],
      tags: (data.tags as string[]) || [],
      metadata: {
        tags: (data.tags as string[]) || [],
        keywords: [],
        links: {},
        ...((data.metadata as any) || {}),
      },
    };
  }

  private normalizeManifestEntry(item: any, sourcePath: string): Capability {
    return {
      id: item.id || `manifest.${path.basename(path.dirname(sourcePath))}.${item.name}`,
      name: item.name,
      description: item.description || '',
      category: item.category || 'tool',
      subcategory: item.subcategory || 'analyzer',
      version: item.version || '1.0.0',
      status: item.status || 'active',
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
      dependsOn: item.dependsOn || [],
      inputs: item.inputs || [],
      outputs: item.outputs || [],
      examples: item.examples || [],
      tags: item.tags || [],
      metadata: {
        tags: item.tags || [],
        keywords: item.keywords || [],
        links: item.links || {},
        sourceFile: sourcePath,
        ...(item.metadata || {}),
      },
    };
  }
}
```

### 5.3 Manifest File Format (YAML)

```yaml
# packages/agent-programmer/manifest.yaml
capabilities:
  - id: agent.programmer
    name: Programmer Agent
    description: Implementa codigo a partir de especificacoes tecnicas
    category: agent
    subcategory: implementation
    version: 2.1.0
    status: active
    dependsOn:
      - id: tool.file.read
        version: ">=1.0.0"
      - id: tool.file.write
        version: ">=1.0.0"
      - id: registry.schema
        version: ">=2.0.0"
        optional: true
    inputs:
      - name: task
        type: TaskSpec
        description: Especificacao da tarefa de implementacao
        required: true
      - name: context
        type: ProjectContext
        description: Contexto do projeto (opcional)
        required: false
    outputs:
      - name: files
        type: FileContent[]
        description: Arquivos gerados/modificados
    tags:
      - agent
      - programmer
      - codegen
      - implementation
    metadata:
      author: IDEIA Core
      package: "@ideia/agent-programmer"
      maturity: 8

  - id: tool.file.read
    name: File Reader
    description: Le conteudo de arquivos do workspace
    category: tool
    subcategory: codegen
    version: 1.0.0
    status: active
    inputs:
      - name: path
        type: string
        description: Caminho do arquivo
        required: true
    outputs:
      - name: content
        type: string
        description: Conteudo do arquivo
    tags:
      - tool
      - file
      - read
```

### 5.4 Decorator para Descoberta

```typescript
// packages/capability-registry/src/discovery/capability.decorator.ts

import 'reflect-metadata';
import { CapabilityMetadata } from '../types/capability';

const CAPABILITY_KEY = Symbol('ideia:capability');

export function Capability(config: CapabilityMetadata) {
  return function (target: any) {
    Reflect.defineMetadata(CAPABILITY_KEY, config, target);
    return target;
  };
}

export function getCapabilityMetadata(target: any): CapabilityMetadata | undefined {
  return Reflect.getMetadata(CAPABILITY_KEY, target);
}

// Exemplo de uso:
// @Capability({
//   id: 'tool.analyzer.dependency-graph',
//   name: 'Dependency Graph Analyzer',
//   description: 'Analisa o grafo de dependencias do projeto',
//   category: 'tool',
//   subcategory: 'analyzer',
//   version: '1.0.0',
//   inputs: [{ name: 'projectPath', type: 'string', required: true }],
//   outputs: [{ name: 'graph', type: 'DependencyGraph' }],
//   tags: ['analyzer', 'dependencies', 'graph'],
// })
// export class DependencyGraphAnalyzer { ... }
```

---

## 6. Capability Matcher

### 6.1 Algoritmo de Matching

O Capability Matcher implementa um scoring multicriterio para encontrar a melhor capacidade para um determinado requisito:

```
Score Total = (W1 * SemanticScore) + (W2 * TagScore) + (W3 * TypeScore) + (W4 * VersionScore)

Onde:
  SemanticScore = similaridade de cosseno entre embedding do requisito e embedding da capacidade
  TagScore      = proporcao de tags do requisito presentes na capacidade
  TypeScore     = compatibilidade de tipos input/output (0 ou 1)
  VersionScore  = satisfacao de constraints semanticas de versao

  W1 = 0.40  (peso semantico)
  W2 = 0.25  (peso de tags)
  W3 = 0.20  (peso de tipos)
  W4 = 0.15  (peso de versao)
```

### 6.2 Interface e Implementacao

```typescript
// packages/capability-registry/src/matcher/matcher.interface.ts

import { Capability, CapabilityMatch } from '../types/capability';

export interface MatchRequest {
  text: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  inputTypes?: string[];
  outputTypes?: string[];
  versionMin?: string;
  limit?: number;
}

export interface ICapabilityMatcher {
  match(request: MatchRequest): Promise<CapabilityMatch[]>;
  matchExact(id: string): Promise<CapabilityMatch | null>;
  getSimilar(id: string, limit?: number): Promise<CapabilityMatch[]>;
}
```

```typescript
// packages/capability-registry/src/matcher/semantic-matcher.ts

import { Capability, CapabilityMatch, CapabilityQuery } from '../types/capability';
import { ICapabilityRegistry } from '../registry/registry.interface';
import { ICapabilityMatcher, MatchRequest } from './matcher.interface';

export class SemanticCapabilityMatcher implements ICapabilityMatcher {
  private readonly WEIGHTS = {
    semantic: 0.40,
    tag: 0.25,
    type: 0.20,
    version: 0.15,
  };

  constructor(
    private registry: ICapabilityRegistry,
    private embeddingFn?: (text: string) => Promise<number[]>,
  ) {}

  async match(request: MatchRequest): Promise<CapabilityMatch[]> {
    const reqEmbedding = request.text && this.embeddingFn
      ? await this.embeddingFn(request.text)
      : null;

    const candidates = await this.registry.list({
      category: request.category as any,
      tags: request.tags,
      status: 'active',
    } as CapabilityQuery);

    const scored: CapabilityMatch[] = [];

    for (const cap of candidates) {
      const reasons: string[] = [];
      let score = 0;

      // Semantic score
      let semanticScore = 0;
      if (reqEmbedding && cap.metadata?.embedding) {
        semanticScore = this.cosineSimilarity(reqEmbedding, cap.metadata.embedding);
        reasons.push(`semantic:${semanticScore.toFixed(3)}`);
      } else if (request.text) {
        semanticScore = this.textSimilarity(request.text, cap.name + ' ' + cap.description);
        reasons.push(`text-sim:${semanticScore.toFixed(3)}`);
      }
      score += semanticScore * this.WEIGHTS.semantic;

      // Tag score
      let tagScore = 0;
      if (request.tags && request.tags.length > 0) {
        const capTagSet = new Set(cap.tags);
        const matched = request.tags.filter(t => capTagSet.has(t)).length;
        tagScore = matched / Math.max(request.tags.length, 1);
        if (matched > 0) reasons.push(`tags:${matched}/${request.tags.length}`);
      }
      score += tagScore * this.WEIGHTS.tag;

      // Type score
      let typeScore = 0;
      if (request.inputTypes && request.inputTypes.length > 0) {
        const capInputTypes = new Set(cap.inputs.map(i => i.type));
        const matched = request.inputTypes.filter(t => capInputTypes.has(t)).length;
        typeScore = matched / Math.max(request.inputTypes.length, 1);
        if (matched > 0) reasons.push(`types:${matched}/${request.inputTypes.length}`);
      }
      score += typeScore * this.WEIGHTS.type;

      // Version score
      let versionScore = 1.0;
      if (request.versionMin) {
        versionScore = this.checkVersionConstraint(cap.version, request.versionMin) ? 1.0 : 0.0;
        if (versionScore === 0) reasons.push('version-incompatible');
      }
      score += versionScore * this.WEIGHTS.version;

      // Penalize deprecated
      if (cap.status === 'deprecated') {
        score *= 0.3;
        reasons.push('deprecated-penalty');
      }

      if (score > 0) {
        scored.push({ capability: cap, score, matchReasons: reasons });
      }
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, request.limit || 5);
  }

  async matchExact(id: string): Promise<CapabilityMatch | null> {
    const cap = await this.registry.get(id);
    if (!cap) return null;

    return {
      capability: cap,
      score: 1.0,
      matchReasons: ['exact-match'],
    };
  }

  async getSimilar(id: string, limit = 5): Promise<CapabilityMatch[]> {
    const cap = await this.registry.get(id);
    if (!cap) return [];

    return this.match({
      text: `${cap.name} ${cap.description}`,
      tags: cap.tags,
      category: cap.category,
      limit,
    });
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }

  private textSimilarity(a: string, b: string): number {
    const aWords = new Set(a.toLowerCase().split(/\W+/));
    const bWords = new Set(b.toLowerCase().split(/\W+/));
    let intersection = 0;
    for (const word of aWords) {
      if (bWords.has(word)) intersection++;
    }
    const union = aWords.size + bWords.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  private checkVersionConstraint(capVersion: string, minVersion: string): boolean {
    const capParts = capVersion.split('.').map(Number);
    const minParts = minVersion.replace('>=', '').split('.').map(Number);

    for (let i = 0; i < Math.max(capParts.length, minParts.length); i++) {
      const capP = capParts[i] || 0;
      const minP = minParts[i] || 0;
      if (capP < minP) return false;
      if (capP > minP) return true;
    }
    return true;
  }
}
```

---

## 7. Dependency Resolver

### 7.1 Interface

```typescript
// packages/capability-registry/src/resolver/resolver.interface.ts

import { Capability, CapabilityDependency } from '../types/capability';

export interface DependencyGraph {
  nodes: Map<string, Capability>;
  edges: Map<string, string[]>; // nodeId -> dependsOn nodeIds
}

export interface ResolutionResult {
  success: boolean;
  order: string[];
  graph: DependencyGraph;
  cycles: string[][];
  missing: string[];
  versionConflicts: string[];
}

export interface IDependencyResolver {
  resolve(capabilityIds: string[]): Promise<ResolutionResult>;
  validate(capability: Capability): Promise<{ valid: boolean; errors: string[] }>;
  getDependencyGraph(capabilityId: string): Promise<DependencyGraph>;
  detectCycles(capabilityId: string): Promise<string[][]>;
}
```

### 7.2 Implementacao

```typescript
// packages/capability-registry/src/resolver/dependency-resolver.ts

import { Capability } from '../types/capability';
import { ICapabilityRegistry } from '../registry/registry.interface';
import {
  IDependencyResolver,
  DependencyGraph,
  ResolutionResult,
} from './resolver.interface';

export class CapabilityDependencyResolver implements IDependencyResolver {
  constructor(private registry: ICapabilityRegistry) {}

  async resolve(capabilityIds: string[]): Promise<ResolutionResult> {
    const graph: DependencyGraph = {
      nodes: new Map(),
      edges: new Map(),
    };

    const missing: string[] = [];
    const versionConflicts: string[] = [];
    const visited = new Set<string>();

    // Build graph
    const queue = [...capabilityIds];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);

      const cap = await this.registry.get(id);
      if (!cap) {
        missing.push(id);
        continue;
      }

      graph.nodes.set(id, cap);
      const deps = cap.dependsOn.map(d => d.id);
      graph.edges.set(id, deps);
      queue.push(...deps);
    }

    // Detect cycles via DFS
    const cycles = this.findCycles(graph);

    // Topological sort
    let order: string[] = [];
    if (cycles.length === 0) {
      order = this.topologicalSort(graph);
    }

    // Version conflict detection
    const versionMap = new Map<string, string>();
    for (const [id, cap] of graph.nodes) {
      if (versionMap.has(id) && versionMap.get(id) !== cap.version) {
        versionConflicts.push(`${id}: ${versionMap.get(id)} vs ${cap.version}`);
      }
      versionMap.set(id, cap.version);
    }

    return {
      success: missing.length === 0 && cycles.length === 0 && versionConflicts.length === 0,
      order,
      graph,
      cycles,
      missing,
      versionConflicts,
    };
  }

  async validate(capability: Capability): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const dep of capability.dependsOn) {
      const resolved = await this.registry.get(dep.id);
      if (!resolved) {
        errors.push(`Dependency not found: ${dep.id}@${dep.version}`);
        continue;
      }
      if (!this.versionSatisfies(resolved.version, dep.version)) {
        errors.push(`Version mismatch for ${dep.id}: required ${dep.version}, found ${resolved.version}`);
      }
      if (resolved.status === 'deprecated') {
        errors.push(`Dependency ${dep.id}@${resolved.version} is deprecated`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async getDependencyGraph(capabilityId: string): Promise<DependencyGraph> {
    const result = await this.resolve([capabilityId]);
    return result.graph;
  }

  async detectCycles(capabilityId: string): Promise<string[][]> {
    const result = await this.resolve([capabilityId]);
    return result.cycles;
  }

  private findCycles(graph: DependencyGraph): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string) => {
      if (recursionStack.has(node)) {
        const cycleStart = path.indexOf(node);
        if (cycleStart !== -1) {
          cycles.push([...path.slice(cycleStart), node]);
        }
        return;
      }
      if (visited.has(node)) return;

      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const deps = graph.edges.get(node) || [];
      for (const dep of deps) {
        if (graph.nodes.has(dep)) {
          dfs(dep);
        }
      }

      path.pop();
      recursionStack.delete(node);
    };

    for (const node of graph.nodes.keys()) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return cycles;
  }

  private topologicalSort(graph: DependencyGraph): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const dfs = (node: string) => {
      if (visited.has(node)) return;
      visited.add(node);

      const deps = graph.edges.get(node) || [];
      for (const dep of deps) {
        if (graph.nodes.has(dep)) {
          dfs(dep);
        }
      }
      result.unshift(node); // Add after processing dependencies
    };

    for (const node of graph.nodes.keys()) {
      dfs(node);
    }

    return result;
  }

  private versionSatisfies(version: string, constraint: string): boolean {
    if (constraint.startsWith('>=')) {
      const min = constraint.slice(2);
      return this.compareVersions(version, min) >= 0;
    }
    if (constraint.startsWith('^')) {
      const major = constraint.slice(1).split('.')[0];
      return version.startsWith(major + '.');
    }
    if (constraint.startsWith('~')) {
      const [major, minor] = constraint.slice(1).split('.');
      return version.startsWith(`${major}.${minor}`);
    }
    return version === constraint;
  }

  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aP = aParts[i] || 0;
      const bP = bParts[i] || 0;
      if (aP > bP) return 1;
      if (aP < bP) return -1;
    }
    return 0;
  }
}
```

### 7.3 Exemplo de Resolucao

```
Capacidade: agent.programmer (v2.1.0)
  depende de:
    ├── tool.file.read    (>=1.0.0) → active, v2.0.0  OK
    ├── tool.file.write   (>=1.0.0) → active, v1.5.0  OK
    ├── registry.schema   (>=2.0.0) → active, v2.1.0  OK (optional)
    └── context.project   (^1.0.0)  → active, v1.2.0  OK

Ordem de resolucao:
  1. tool.file.read     (sem dependencias)
  2. tool.file.write    (sem dependencias)
  3. registry.schema    (sem dependencias)
  4. context.project    (sem dependencias)
  5. agent.programmer   (todas dependencias resolvidas)

Resultado: SUCCESS
  - missing: []
  - cycles: []
  - versionConflicts: []
```

---

## 8. Categorias de Capacidades

### 8.1 Catalogo de Capacidades da IDEIA

| Categoria | Subcategoria | Exemplos | Quantidade |
|-----------|-------------|----------|------------|
| **agent** | analysis | Analyst Agent | 1 |
| **agent** | architecture | Architect Agent | 1 |
| **agent** | implementation | Programmer Agent | 1 |
| **agent** | review | Reviewer Agent | 1 |
| **agent** | testing | Tester Agent | 1 |
| **agent** | devops | DevOps Agent | 1 |
| **agent** | planning | Planner Agent | 1 |
| **agent** | exploration | Explorer Agent | 1 |
| **tool** | codegen | `generate`, `scaffold`, `init` | 12 |
| **tool** | analyzer | `analyze`, `inspect`, `drift` | 8 |
| **tool** | validator | `validate`, `lint`, `check` | 6 |
| **tool** | formatter | `format`, `fix` | 3 |
| **tool** | search | `search`, `find`, `grep` | 4 |
| **tool** | transform | `convert`, `migrate`, `refactor` | 5 |
| **tool** | publisher | `publish`, `deploy`, `release` | 7 |
| **tool** | scaffolder | `init`, `create`, `new` | 6 |
| **context-pack** | domain | `domain/ideia-core`, `domain/mcp` | 3 |
| **context-pack** | technology | `tech/node`, `tech/typescript`, `tech/react` | 8 |
| **context-pack** | project | `project/config`, `project/rules` | 4 |
| **context-pack** | organization | `org/standards`, `org/templates` | 2 |
| **adapter** | language | TypeScript, Python, Rust, Go, Java | 13 |
| **adapter** | framework | React, Express, Next.js, NestJS | 6 |
| **adapter** | platform | Node.js, Deno, Bun, Python | 4 |
| **registry** | schema | Schema Registry (Zod/JSON Schema) | 1 |
| **registry** | pattern | Pattern Registry (design patterns) | 1 |
| **registry** | trace | Trace Registry (audit trail) | 1 |
| **registry** | plugin | Plugin Registry (extensions) | 1 |
| **registry** | template | Template Registry (scaffolds) | 1 |
| **registry** | knowledge | Knowledge Registry (docs) | 1 |
| **registry** | metric | Metric Registry (observability) | 1 |
| **workflow** | pipeline | `workflow.run`, `pipeline.execute` | 3 |
| **workflow** | delivery | `delivery.deploy`, `delivery.release` | 2 |
| **observation** | tracing | `trace.span`, `trace.export` | 3 |
| **observation** | logging | `log.collect`, `log.query` | 2 |
| **observation** | metrics | `metric.collect`, `metric.export` | 2 |
| **memory** | storage | `memory.store`, `memory.get` | 3 |
| **memory** | retrieval | `memory.search`, `memory.similar` | 2 |
| **pipeline** | prompt | `prompt.classify`, `prompt.enrich` | 3 |
| **pipeline** | context | `context.build`, `context.inject` | 2 |
| **integration** | mcp | `mcp.tool`, `mcp.resource` | 4 |
| **integration** | api | `api.rest`, `api.graphql` | 2 |

### 8.2 Distribuicao Projetada

```
agentes       ████████████ 8 roles        (6.7%)
ferramentas   █████████████████████████ 51 comandos  (42.5%)
context-packs █████████                 17 packs      (14.2%)
adapters      █████████████             23 adapters   (19.2%)
registries    ███████                    7 registries  (5.8%)
workflows     ██                         5 workflows   (4.2%)
observacao    ███                        7 spans       (5.8%)
memoria       ██                         5 operacoes   (4.2%)
pipeline      ██                         5 stages      (4.2%)
integracao    ███                        6 endpoints   (5.0%)
                                  ────────────────
              Total:               ~120 capacidades
```

### 8.3 Ciclo de Vida de uma Capacidade

```
draft ──> experimental ──> active ──> deprecated ──> removed
  ^                          │
  └──────────────────────────┘
       (reativacao via nova versao)

Transicoes:
  draft → experimental:   aprovacao de revisao tecnica
  experimental → active:  testes E2E + cobertura ≥ 70%
  active → deprecated:    substituto identificado, 90 dias de compat
  deprecated → removed:   apos janela de migracao
  removed → draft:        reimplementacao com nova versao
```

---

## 9. Integracao com Prompt Pipeline

### 9.1 Context Enrichment via Capability Registry

O Prompt Pipeline (definido no Prompt Pipeline da IDEIA) e enriquecido com capacidades disponiveis automaticamente:

```
Prompt bruto do usuario:
  "crie um CRUD de usuarios com autenticacao JWT"

       │
       ▼
  Prompt Pipeline:
    ├── Guard (seguranca)
    ├── Classify (intent: feature)
    ├── Enrich (injetar contexto)
    │      │
    │      ▼ Capability Registry Query
    │       match({ text: "CRUD usuarios autenticacao JWT",
    │               category: "tool", limit: 5 })
    │       Resultados:
    │         • tool.scaffold.express  (0.92) - Scaffold Express CRUD
    │         • tool.codegen.jwt       (0.88) - Geracao JWT middleware
    │         • agent.programmer       (0.85) - Programmer Agent
    │         • adapter.prisma         (0.80) - Adapter Prisma ORM
    │         • registry.schema        (0.72) - Schema Registry
    │
    │      ▼ Formatacao para contexto do prompt:
    │       "Capacidades disponiveis:
    │        1. tool.scaffold.express (score 0.92) - Gera scaffold Express com CRUD
    │        2. tool.codegen.jwt (score 0.88) - Implementa autenticacao JWT
    │        3. agent.programmer (score 0.85) - Agente de implementacao
    │        4. adapter.prisma (score 0.80) - Suporte a Prisma ORM
    │        5. registry.schema (score 0.72) - Validacao de schemas"
    │
    ├── Optimize
    ├── Plan
    └── Format

Prompt enriquecido (entrada na IA):
  "feature|express|urg=medium
  Crie um CRUD de usuarios com autenticacao JWT

  [CAPABILITIES]
  - scaffold-express: gera estrutura base com rotas, modelos
  - codegen-jwt: middleware de autenticacao JWT pronto
  - programmer: agente especializado em implementacao
  - prisma: adapter para Prisma ORM
  - schema-registry: validacao de schemas Zod"
```

### 9.2 CapabilityContextProvider

```typescript
// packages/prompt-pipeline/src/enrichment/capability-context.ts

import { ICapabilityMatcher, MatchRequest } from '../../capability-registry/src/matcher/matcher.interface';
import { ICapabilityRegistry } from '../../capability-registry/src/registry/registry.interface';

export interface CapabilityContextOptions {
  maxCapabilities: number;
  minScore: number;
  includeAgents: boolean;
  includeTools: boolean;
  includeAdapters: boolean;
}

export class CapabilityContextProvider {
  constructor(
    private registry: ICapabilityRegistry,
    private matcher: ICapabilityMatcher,
    private options: CapabilityContextOptions = {
      maxCapabilities: 10,
      minScore: 0.3,
      includeAgents: true,
      includeTools: true,
      includeAdapters: true,
    },
  ) {}

  async enrichPrompt(userInput: string): Promise<string> {
    const matched = await this.matcher.match({
      text: userInput,
      limit: this.options.maxCapabilities,
    } as MatchRequest);

    const relevant = matched
      .filter(m => m.score >= this.options.minScore)
      .filter(m => this.filterByCategory(m.capability.category));

    if (relevant.length === 0) return '';

    const lines = relevant.map((m, i) => {
      const cap = m.capability;
      const inputs = cap.inputs.map(inp => `${inp.name}:${inp.type}`).join(', ');
      const outputs = cap.outputs.map(out => `${out.name}:${out.type}`).join(', ');
      return `${i + 1}. ${cap.id} (score: ${(m.score * 100).toFixed(0)}%) - ${cap.description} [in: ${inputs}] [out: ${outputs}]`;
    });

    return `[CAPABILITIES]\n${lines.join('\n')}`;
  }

  private filterByCategory(category: string): boolean {
    switch (category) {
      case 'agent': return this.options.includeAgents;
      case 'tool': return this.options.includeTools;
      case 'adapter': return this.options.includeAdapters;
      default: return true;
    }
  }
}
```

### 9.3 Context Budget Allocation

```
Orcamento de tokens do prompt enriquecido (~4096 tokens):

┌────────────────────────────────────────────────────────────┐
│  System Prompt:   800 tokens (20%) - identidade, regras    │
│  Task Prompt:     400 tokens (10%) - objetivo, criterios   │
│  Context Prompt: 1700 tokens (41%) - memoria, estado       │
│    ├── Projeto:   600 tokens                               │
│    ├── Memoria:   500 tokens                               │
│    ├── Regras:    300 tokens                               │
│    └── Capacidades: 300 tokens ← Capability Context       │
│  Tool Prompt:     800 tokens (20%) - ferramentas, formato  │
│  Output Format:   396 tokens (9%)  - schema, exemplo       │
└────────────────────────────────────────────────────────────┘

O Capability Registry consome ~300 tokens (7.3% do total)
para fornecer ate 10 capacidades ranqueadas → ROI comprovado
```

---

## 10. Protocolo de Comunicacao

### 10.1 Eventos NATS

O Capability Registry publica eventos no barramento NATS para notificar mudancas no catalogo:

```typescript
// packages/capability-registry/src/nats/capability-nats-bridge.ts

import { NatsConnection, JetStreamClient, StringCodec } from 'nats';
import { RegistryEvent } from '../types/capability';

const SUBJECT_PREFIX = 'ideia.capability';
const SC = StringCodec();

export class CapabilityNatsBridge {
  private js: JetStreamClient;

  constructor(private nc: NatsConnection) {
    this.js = this.nc.jetstream();
  }

  async publishEvent(event: RegistryEvent): Promise<void> {
    const subject = `${SUBJECT_PREFIX}.${event.type}`;
    const data = JSON.stringify(event);

    await this.js.publish(subject, SC.encode(data), {
      msgId: `${event.capability.id}.${Date.now()}`,
    });
  }

  async subscribeAll(handler: (event: RegistryEvent) => void): Promise<void> {
    const sub = await this.js.subscribe(`${SUBJECT_PREFIX}.>`, {
      deliverSubject: 'capability-sub',
      durableName: 'capability-registry',
    });

    (async () => {
      for await (const msg of sub) {
        try {
          const event: RegistryEvent = JSON.parse(SC.decode(msg.data));
          handler(event);
          await msg.ack();
        } catch (err) {
          console.error('[CapabilityNats] Failed to process event:', err);
          await msg.term(); // Terminate failed messages
        }
      }
    })();
  }

  async queryBySubject(subject: string): Promise<RegistryEvent[]> {
    const stream = await this.js.streams.get('IDEIA_CAPABILITIES');
    const messages: RegistryEvent[] = [];

    for await (const msg of stream.getMessageList({ subject })) {
      try {
        messages.push(JSON.parse(SC.decode(msg.data)));
      } catch { /* skip corrupt messages */ }
    }

    return messages;
  }
}
```

Topico NATS | Payload | Quando
---|---|---
`ideia.capability.registered` | `RegistryEvent` | Nova capacidade registrada
`ideia.capability.updated` | `RegistryEvent` | Capacidade atualizada
`ideia.capability.deprecated` | `RegistryEvent` | Capacidade marcada como deprecated
`ideia.capability.removed` | `RegistryEvent` | Capacidade removida
`ideia.capability.dependency-changed` | `RegistryEvent` | Dependencia alterada
`ideia.capability.query` | `CapabilityQuery` | Consulta via request-reply

### 10.2 API REST (Express/Fastify)

```typescript
// packages/capability-registry/src/api/capability-routes.ts

import { FastifyInstance } from 'fastify';
import { ICapabilityRegistry } from '../registry/registry.interface';
import { ICapabilityMatcher } from '../matcher/matcher.interface';
import { CapabilityQuery } from '../types/capability';

export function registerCapabilityRoutes(
  app: FastifyInstance,
  registry: ICapabilityRegistry,
  matcher: ICapabilityMatcher,
): void {

  // GET /api/capabilities - Lista capacidades com filtros
  app.get('/api/capabilities', async (request) => {
    const query = request.query as CapabilityQuery;
    const capabilities = await registry.list(query);
    const total = await registry.count(query);
    return { data: capabilities, total, offset: query.offset || 0, limit: query.limit || 50 };
  });

  // GET /api/capabilities/search - Busca full-text
  app.get('/api/capabilities/search', async (request) => {
    const { q, limit } = request.query as any;
    if (!q) return { data: [], total: 0 };
    const results = await registry.search(q, limit || 10);
    return { data: results, total: results.length };
  });

  // GET /api/capabilities/:id - Detalhe de capacidade
  app.get('/api/capabilities/:id', async (request) => {
    const { id } = request.params as any;
    const cap = await registry.get(id);
    if (!cap) return { error: 'Capability not found' };
    return { data: cap };
  });

  // POST /api/capabilities - Registrar nova capacidade
  app.post('/api/capabilities', async (request) => {
    const event = await registry.register(request.body as any);
    return { data: event };
  });

  // PUT /api/capabilities/:id - Atualizar capacidade
  app.put('/api/capabilities/:id', async (request) => {
    const { id } = request.params as any;
    const event = await registry.update(id, request.body as any);
    return { data: event };
  });

  // DELETE /api/capabilities/:id - Remover capacidade
  app.delete('/api/capabilities/:id', async (request) => {
    const { id } = request.params as any;
    await registry.remove(id);
    return { data: { id, removed: true } };
  });

  // POST /api/capabilities/match - Matching semantico
  app.post('/api/capabilities/match', async (request) => {
    const matches = await matcher.match(request.body as any);
    return { data: matches };
  });

  // GET /api/capabilities/:id/similar - Capacidades similares
  app.get('/api/capabilities/:id/similar', async (request) => {
    const { id } = request.params as any;
    const { limit } = request.query as any;
    const similar = await matcher.getSimilar(id, limit || 5);
    return { data: similar };
  });

  // GET /api/capabilities/health - Health check
  app.get('/api/capabilities/health', async () => {
    const total = await registry.count();
    return { status: 'ok', totalCapabilities: total, timestamp: new Date().toISOString() };
  });
}
```

### 10.3 MCP Tools para Descoberta

```typescript
// packages/capability-registry/src/mcp/capability-mcp-tools.ts

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ICapabilityRegistry } from '../registry/registry.interface';
import { ICapabilityMatcher } from '../matcher/matcher.interface';

export function registerCapabilityMcpTools(
  server: McpServer,
  registry: ICapabilityRegistry,
  matcher: ICapabilityMatcher,
): void {

  // Tool: search_capabilities
  server.tool(
    'search_capabilities',
    { query: z.string(), limit: z.number().optional().default(10) },
    async ({ query, limit }) => {
      const results = await registry.search(query, limit);
      return {
        content: results.map(r => ({
          type: 'text' as const,
          text: `${r.id} (v${r.version}) - ${r.description} [${r.category}:${r.subcategory}]`,
        })),
      };
    },
  );

  // Tool: match_capability
  server.tool(
    'match_capability',
    {
      task: z.string(),
      category: z.string().optional(),
      limit: z.number().optional().default(5),
    },
    async ({ task, category, limit }) => {
      const matches = await matcher.match({
        text: task,
        category: category as any,
        limit,
      });
      return {
        content: matches.map(m => ({
          type: 'text' as const,
          text: `[${(m.score * 100).toFixed(0)}%] ${m.capability.id}: ${m.capability.description}`,
        })),
      };
    },
  );

  // Tool: get_capability
  server.tool(
    'get_capability',
    { id: z.string() },
    async ({ id }) => {
      const cap = await registry.get(id);
      if (!cap) return { content: [{ type: 'text', text: 'Capability not found' }] };
      return {
        content: [
          { type: 'text', text: JSON.stringify(cap, null, 2) },
        ],
      };
    },
  );

  // Tool: list_capabilities
  server.tool(
    'list_capabilities',
    { category: z.string().optional(), status: z.string().optional() },
    async ({ category, status }) => {
      const caps = await registry.list({
        category: category as any,
        status: status as any,
      } as any);
      return {
        content: caps.map(c => ({
          type: 'text' as const,
          text: `${c.id} (v${c.version}) [${c.status}] - ${c.category}:${c.subcategory}`,
        })),
      };
    },
  );
}
```

### 10.4 Comandos CLI

```typescript
// packages/cli/src/commands/capability-commands.ts

// IDEIA capability search <query>
// IDEIA capability get <id>
// IDEIA capability list [--category] [--status]
// IDEIA capability match <task-description>
// IDEIA capability register <file>
// IDEIA capability verify [--all]

export const capabilityCommands = [
  {
    name: 'capability',
    subcommands: [
      {
        name: 'search',
        description: 'Busca capacidades por texto',
        args: [{ name: 'query', required: true }],
        options: [
          { name: 'limit', type: 'number', default: 10 },
          { name: 'json', type: 'boolean', description: 'Saida JSON' },
        ],
      },
      {
        name: 'get',
        description: 'Obtem detalhes de uma capacidade',
        args: [{ name: 'id', required: true }],
        options: [{ name: 'json', type: 'boolean' }],
      },
      {
        name: 'list',
        description: 'Lista capacidades registradas',
        options: [
          { name: 'category', type: 'string' },
          { name: 'status', type: 'string' },
          { name: 'json', type: 'boolean' },
        ],
      },
      {
        name: 'match',
        description: 'Encontra capacidades que melhor atendem uma descricao',
        args: [{ name: 'task', required: true }],
        options: [{ name: 'limit', type: 'number', default: 5 }],
      },
      {
        name: 'register',
        description: 'Registra capacidades a partir de um arquivo manifest',
        args: [{ name: 'file', required: true }],
      },
      {
        name: 'verify',
        description: 'Verifica integridade do catalogo',
        options: [
          { name: 'all', type: 'boolean', description: 'Verifica todas as capacidades' },
        ],
      },
    ],
  },
];
```

---

## 11. Implementacao TypeScript

### 11.1 Estrutura de Pastas

```
packages/capability-registry/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                         # Entry point, barrel exports
│   ├── types/
│   │   ├── capability.ts                # Interfaces e types
│   │   └── capability.zod.ts            # Schema Zod para validacao
│   ├── registry/
│   │   ├── registry.interface.ts         # Interface ICapabilityRegistry
│   │   ├── registry.service.ts          # Implementacao SQLite
│   │   └── registry.schema.ts           # Drizzle ORM schema
│   ├── discovery/
│   │   ├── discovery.interface.ts       # Interface IDiscoveryEngine
│   │   ├── package-scanner.ts           # Scanner de packages
│   │   ├── capability.decorator.ts      # Decorator @Capability
│   │   └── manifest.validator.ts        # Validador de manifests
│   ├── matcher/
│   │   ├── matcher.interface.ts         # Interface ICapabilityMatcher
│   │   └── semantic-matcher.ts          # Matching semantico
│   ├── resolver/
│   │   ├── resolver.interface.ts        # Interface IDependencyResolver
│   │   └── dependency-resolver.ts       # Resolutor de dependencias
│   ├── nats/
│   │   └── capability-nats-bridge.ts    # Bridge NATS para eventos
│   ├── api/
│   │   └── capability-routes.ts         # Rotas REST (Fastify)
│   ├── mcp/
│   │   └── capability-mcp-tools.ts      # Ferramentas MCP
│   └── cli/
│       └── capability-commands.ts       # Comandos CLI
├── tests/
│   ├── registry.test.ts
│   ├── discovery.test.ts
│   ├── matcher.test.ts
│   ├── resolver.test.ts
│   └── nats-bridge.test.ts
└── examples/
    ├── manifest.example.yaml
    ├── register-capability.ts
    └── match-query.ts
```

### 11.2 Package.json

```json
{
  "name": "@ideia/capability-registry",
  "version": "1.0.0",
  "description": "Capability Registry & Discovery Engine para IDEIA",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src/ tests/",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@ideia/nats-bridge": "workspace:*",
    "drizzle-orm": "^0.38.0",
    "better-sqlite3": "^11.7.0",
    "fastify": "^5.0.0",
    "zod": "^3.23.0",
    "fast-glob": "^3.3.0",
    "reflect-metadata": "^0.2.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "vitest": "^3.0.0",
    "typescript": "^5.7.0",
    "eslint": "^9.0.0"
  }
}
```

### 11.3 Testes Unitarios

```typescript
// packages/capability-registry/tests/matcher.test.ts

import { describe, it, expect, vi } from 'vitest';
import { SemanticCapabilityMatcher } from '../src/matcher/semantic-matcher';
import { Capability } from '../src/types/capability';

function makeCap(overrides: Partial<Capability>): Capability {
  return {
    id: 'test.cap',
    name: 'Test Capability',
    description: 'A test capability for unit testing',
    category: 'tool',
    subcategory: 'analyzer',
    version: '1.0.0',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    dependsOn: [],
    inputs: [],
    outputs: [],
    examples: [],
    tags: [],
    metadata: { tags: [], keywords: [], links: {} },
    ...overrides,
  };
}

describe('SemanticCapabilityMatcher', () => {
  it('should rank exact match highest', async () => {
    const registry = {
      list: vi.fn().mockResolvedValue([
        makeCap({ id: 'tool.test', name: 'Test Tool', description: 'A testing tool', tags: ['tool', 'test'] }),
        makeCap({ id: 'tool.build', name: 'Build Tool', description: 'A build system', tags: ['tool', 'build'] }),
      ]),
    } as any;

    const matcher = new SemanticCapabilityMatcher(registry);
    const results = await matcher.match({ text: 'test tool', limit: 5 });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].capability.id).toBe('tool.test');
    expect(results[0].score).toBeGreaterThan(results[1]?.score || 0);
  });

  it('should filter by tags', async () => {
    const registry = {
      list: vi.fn().mockResolvedValue([
        makeCap({ id: 'tool.test', tags: ['tool', 'test'] }),
        makeCap({ id: 'tool.build', tags: ['tool', 'build'] }),
      ]),
    } as any;

    const matcher = new SemanticCapabilityMatcher(registry);
    const results = await matcher.match({ text: 'test', tags: ['test'], limit: 5 });

    expect(results[0].capability.id).toBe('tool.test');
  });

  it('should penalize deprecated capabilities', async () => {
    const registry = {
      list: vi.fn().mockResolvedValue([
        makeCap({ id: 'tool.active', name: 'Active Tool', status: 'active' }),
        makeCap({ id: 'tool.deprecated', name: 'Deprecated Tool', status: 'deprecated' }),
      ]),
    } as any;

    const matcher = new SemanticCapabilityMatcher(registry);
    const results = await matcher.match({ text: 'tool', limit: 5 });

    expect(results[0].capability.id).toBe('tool.active');
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it('should return empty for no matches', async () => {
    const registry = {
      list: vi.fn().mockResolvedValue([]),
    } as any;

    const matcher = new SemanticCapabilityMatcher(registry);
    const results = await matcher.match({ text: 'nonexistent', limit: 5 });

    expect(results).toHaveLength(0);
  });

  it('should find exact match by id', async () => {
    const registry = {
      get: vi.fn().mockResolvedValue(makeCap({ id: 'tool.test' })),
    } as any;

    const matcher = new SemanticCapabilityMatcher(registry);
    const result = await matcher.matchExact('tool.test');

    expect(result).not.toBeNull();
    expect(result!.capability.id).toBe('tool.test');
    expect(result!.score).toBe(1.0);
  });
});
```

```typescript
// packages/capability-registry/tests/resolver.test.ts

import { describe, it, expect, vi } from 'vitest';
import { CapabilityDependencyResolver } from '../src/resolver/dependency-resolver';
import { Capability } from '../src/types/capability';

function makeCap(id: string, deps: string[] = []): Capability {
  return {
    id,
    name: id,
    description: '',
    category: 'tool',
    subcategory: 'analyzer',
    version: '1.0.0',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    dependsOn: deps.map(d => ({ id: d, version: '>=1.0.0' })),
    inputs: [],
    outputs: [],
    examples: [],
    tags: [],
    metadata: { tags: [], keywords: [], links: {} },
  };
}

describe('CapabilityDependencyResolver', () => {
  it('should resolve linear dependencies', async () => {
    const registry = {
      get: vi.fn((id: string) => {
        const map: Record<string, Capability> = {
          'app': makeCap('app', ['lib']),
          'lib': makeCap('lib', ['base']),
          'base': makeCap('base', []),
        };
        return Promise.resolve(map[id] || null);
      }),
    } as any;

    const resolver = new CapabilityDependencyResolver(registry);
    const result = await resolver.resolve(['app']);

    expect(result.success).toBe(true);
    expect(result.order).toEqual(['base', 'lib', 'app']);
    expect(result.missing).toHaveLength(0);
    expect(result.cycles).toHaveLength(0);
  });

  it('should detect cycles', async () => {
    const registry = {
      get: vi.fn((id: string) => {
        const map: Record<string, Capability> = {
          'a': makeCap('a', ['b']),
          'b': makeCap('b', ['c']),
          'c': makeCap('c', ['a']), // cycle: a -> b -> c -> a
        };
        return Promise.resolve(map[id] || null);
      }),
    } as any;

    const resolver = new CapabilityDependencyResolver(registry);
    const result = await resolver.resolve(['a']);

    expect(result.success).toBe(false);
    expect(result.cycles.length).toBeGreaterThan(0);
  });

  it('should report missing dependencies', async () => {
    const registry = {
      get: vi.fn((id: string) => {
        const map: Record<string, Capability> = {
          'app': makeCap('app', ['missing-lib']),
        };
        return Promise.resolve(map[id] || null);
      }),
    } as any;

    const resolver = new CapabilityDependencyResolver(registry);
    const result = await resolver.resolve(['app']);

    expect(result.success).toBe(false);
    expect(result.missing).toContain('missing-lib');
  });

  it('should validate capability dependencies', async () => {
    const registry = {
      get: vi.fn((id: string) => {
        if (id === 'valid-dep') return Promise.resolve(makeCap('valid-dep', []));
        return Promise.resolve(null);
      }),
    } as any;

    const resolver = new CapabilityDependencyResolver(registry);

    const valid = await resolver.validate(makeCap('app', ['valid-dep']));
    expect(valid.valid).toBe(true);
    expect(valid.errors).toHaveLength(0);

    const invalid = await resolver.validate(makeCap('app', ['missing-dep']));
    expect(invalid.valid).toBe(false);
    expect(invalid.errors).toHaveLength(1);
  });
});
```

### 11.4 Exemplo de Uso Completo

```typescript
// examples/register-capability.ts

import { CapabilityRegistryService } from '../src/registry/registry.service';
import { PackageScanner } from '../src/discovery/package-scanner';
import { SemanticCapabilityMatcher } from '../src/matcher/semantic-matcher';
import { CapabilityDependencyResolver } from '../src/resolver/dependency-resolver';
import { Database } from 'better-sqlite3';

async function main() {
  // Setup
  const sqlite = new Database(':memory:');
  const db = /* drizzle(sqlite) */;
  const registry = new CapabilityRegistryService(db);
  const scanner = new PackageScanner(process.cwd());
  const matcher = new SemanticCapabilityMatcher(registry);
  const resolver = new CapabilityDependencyResolver(registry);

  // 1. Discover capabilities from packages
  console.log('Scanning packages for capabilities...');
  const discoveryResults = await scanner.scanAll();

  for (const [pkg, results] of discoveryResults) {
    for (const result of results) {
      for (const cap of result.capabilities) {
        const event = await registry.register(cap);
        console.log(`[${event.type}] ${cap.id}@${cap.version} (from ${result.source})`);
      }
    }
  }

  // 2. Query capabilities
  console.log('\nAll capabilities:');
  const all = await registry.list();
  for (const cap of all) {
    console.log(`  - ${cap.id} (v${cap.version}) [${cap.status}]`);
  }

  // 3. Match by task description
  console.log('\nMatching "generate authentication middleware":');
  const matches = await matcher.match({ text: 'generate authentication middleware JWT', limit: 3 });
  for (const match of matches) {
    console.log(`  [${(match.score * 100).toFixed(1)}%] ${match.capability.id}`);
  }

  // 4. Validate dependencies
  console.log('\nValidating dependency graph:');
  const result = await resolver.resolve(['agent.programmer']);
  if (result.success) {
    console.log(`  Resolution order: ${result.order.join(' -> ')}`);
  } else {
    if (result.missing.length > 0) console.log(`  Missing: ${result.missing.join(', ')}`);
    if (result.cycles.length > 0) console.log(`  Cycles detected: ${JSON.stringify(result.cycles)}`);
  }

  // 5. Search by text
  console.log('\nSearching for "scaffold":');
  const searchResults = await registry.search('scaffold');
  for (const cap of searchResults) {
    console.log(`  - ${cap.id}: ${cap.description}`);
  }
}

main().catch(console.error);
```

---

## 12. Conexoes com Estudos

### 12.1 Matriz de Conexoes

| Estudo | Conexao | Como se Integra |
|--------|---------|-----------------|
| **S1 — Barramento** | Eventos NATS `capability.*` | Registry publica eventos de mudanca no barramento; consumidores reagem |
| **S2 — Memoria** | Cache de capacidades + indices | SQLite para persistencia, Mem0 para cache semantico, DuckDB para analytics |
| **S3 — Intencao→Plano** | Matching semantico para roteamento | Intent classifier usa matcher para encontrar ferramentas adequadas |
| **S4 — Seguranca** | Policy engine valida acesso a capacidades | Toda chamada de capacidade passa por verificacao de politica |
| **S5 — Multiagente** | Agentes descobrem uns aos outros via registry | Agent orchestrator usa registry para rotear tarefas ao agente certo |
| **S6 — Pipeline Entrega** | Quality gates verificam dependencias | Pre-deploy validation usa resolver para verificar integridade |
| **S7 — Aprendizado** | Feedback de matching melhora scoring | Uso de cada capacidade vira dado de treino para refinamento |
| **S9 — Matriz Tecnologica** | Tecnologias como capacidades | Cada tecnologia avaliada vira capability no registry |
| **S10 — Contratos** | Contratos entre modulos como capacidades | Cada interface contratual e tambem uma capability |
| **S11 — Theia** | Theia AI usa registry para tool selection | Agentes Theia consultam MCP tools expostas pelo registry |
| **S12 — Testes** | Testes de integracao do registry | Contract tests validam que capacidades estao registradas corretamente |
| **S17 — Observabilidade** | Tracing de chamadas de capacidade | Cada resolucao de capacidade gera span OTel |
| **S19 — Prompts** | Enriquecimento de prompt via registry | Context provider injeta capacidades relevantes no prompt |
| **S20 — Plugins** | Plugin manifest registra capacidades | Plugins expoem capabilities via manifest.yaml |
| **S21 — Terminal/Debug** | Comandos CLI do capability registry | `IDEIA capability search/match/list/register/verify` |
| **S23 — Self-Optimization** | Auto-registro de novas capacidades | Technology Radar registra capacidades de novas tecnologias |
| **S24 — Controle** | Safety circuit sobre registros | Registro de capacidade perigosa e bloqueado por politica |
| **S25 — Perfis** | Perfil determina capacidades visiveis | Usuario N0 ve menos capacidades que N4 |
| **S26 — Manifest** | Realidade vs capacidades registradas | Reality-check valida que capacidades no manifesto existem no registry |
| **S27 — Capability Registry** | Este estudo | — |

### 12.2 Diagrama de Integracao

```
                            ┌──────────────────────┐
                            │    AGENT ORCHESTRATOR │
                            │  (S5 - Multiagente)   │
                            └──────────┬───────────┘
                                       │ descobre agente
                                       │ para tarefa
                                       ▼
┌──────────────┐           ┌──────────────────────┐         ┌──────────────┐
│  PROMPT      │───usa───> │  CAPABILITY REGISTRY │<───lê───│    AGENTES   │
│  PIPELINE    │           │  (S27 - Este estudo)  │         │  (Analyst,   │
│  (S19)       │           │                       │         │  Architect,  │
│              │           │  ┌─────────────────┐  │         │  Programmer) │
│  enriquece   │           │  │ Registry Service │  │         └──────────────┘
│  prompt com  │           │  │ Matcher          │  │              │
│  capacidades │           │  │ Resolver         │  │              │ expoem
│              │           │  │ Scanner          │  │              │ capacidades
└──────────────┘           │  │ NATS Bridge      │  │              ▼
                           │  └─────────────────┘  │         ┌──────────────┐
                           └───────────────────────┘         │  FERRAMENTAS │
                                       │                      │  CLI (51)   │
                                       │ publica eventos      └──────────────┘
                                       ▼                              │
                            ┌──────────────────────┐                  │
                            │    NATS JETSTREAM     │                  │
                            │  (S1 - Barramento)    │                  │
                            └──────────────────────┘                  │
                                       │                              │
                          ┌────────────┼────────────┐                 │
                          ▼            ▼            ▼                  │
                   ┌──────────┐ ┌──────────┐ ┌──────────┐             │
                   │S17 - OTel│ │S4 - Pol. │ │S2 - Mem. │             │
                   │ trace    │ │ verify   │ │ cache    │             │
                   └──────────┘ └──────────┘ └──────────┘             │
                                                                      │
                           ┌──────────────────────────────────────────┘
                           ▼
                    ┌──────────────┐
                    │  ADAPTERS    │
                    │  (13 langs)  │
                    └──────────────┘
```

---

## 13. Plano de Implementacao

### 13.1 Tasks

| Task | Descricao | Esforco | Prioridade | Dependencias |
|------|-----------|---------|------------|--------------|
| CR-01 | Definir interfaces TypeScript (types, zod schemas) | 4h | P0 | — |
| CR-02 | Implementar Registry Service (CRUD SQLite) | 8h | P0 | CR-01 |
| CR-03 | Implementar Discovery Engine (package scanner) | 12h | P0 | CR-01 |
| CR-04 | Implementar Capability Matcher (semantico) | 10h | P0 | CR-01, CR-02 |
| CR-05 | Implementar Dependency Resolver (grafo) | 8h | P1 | CR-01, CR-02 |
| CR-06 | Implementar decorator @Capability | 3h | P1 | CR-01 |
| CR-07 | Implementar parser de manifest YAML/JSON | 4h | P1 | CR-01 |
| CR-08 | Bridge NATS para eventos capability.* | 6h | P1 | CR-02, S1 |
| CR-09 | API REST (Fastify, 8 endpoints) | 6h | P1 | CR-02 |
| CR-10 | MCP tools para descoberta (4 ferramentas) | 4h | P1 | CR-02, CR-04 |
| CR-11 | Comandos CLI (search, get, list, match, register, verify) | 6h | P1 | CR-02, CR-04 |
| CR-12 | CapabilityContextProvider para Prompt Pipeline | 5h | P2 | CR-04, S19 |
| CR-13 | Testes unitarios (registry, matcher, resolver) | 8h | P0 | CR-02, CR-04, CR-05 |
| CR-14 | Testes de integracao (scanner + registry) | 6h | P1 | CR-03, CR-02 |
| CR-15 | Documentacao de cada categoria de capacidade | 6h | P2 | CR-01 |
| CR-16 | Integracao com Reality Manifest (S26) | 4h | P2 | CR-02, S26 |
| CR-17 | Auto-registro via analise estatica | 8h | P2 | CR-03 |
| CR-18 | Feedback loop: uso de capacidades vira dado de treino | 10h | P3 | CR-04, S7 |
| CR-19 | Dashboard visual de capacidades (Theia widget) | 12h | P3 | CR-09, S11 |
| CR-20 | CI/CD do registry (pre-commit verify) | 4h | P2 | CR-05 |

### 13.2 Cronograma

```
Fase 0 (Semana 1-2) — Core
  CR-01 ◆ CR-02 ◆ CR-03 ◆ CR-04 ◆ CR-05 ◆ CR-13
  Resultado: Registry funcional com matching e resolucao

Fase 1 (Semana 3-4) — Protocolos
  CR-06 ◆ CR-07 ◆ CR-08 ◆ CR-09 ◆ CR-10 ◆ CR-11 ◆ CR-14
  Resultado: NATS + REST + MCP + CLI operacionais

Fase 2 (Semana 5-6) — Integracao
  CR-12 ◆ CR-15 ◆ CR-16 ◆ CR-17 ◆ CR-20
  Resultado: Registry integrado ao pipeline e manifesto

Fase 3 (Semana 7-8) — Avancado
  CR-18 ◆ CR-19
  Resultado: Feedback loop e dashboard visual
```

### 13.3 Estimativa de Esforco

| Fase | Tasks | Horas | Dias uteis | Recursos |
|------|-------|-------|------------|----------|
| Fase 0 | 6 | 50h | 6-7 | 1 dev full-stack |
| Fase 1 | 7 | 39h | 5 | 1 dev + 1 suporte NATS |
| Fase 2 | 5 | 27h | 3-4 | 1 dev |
| Fase 3 | 2 | 22h | 3 | 1 dev + 1 UX |
| **Total** | **20** | **138h** | **17-19** | **2 devs (intermitente)** |

### 13.4 Riscos e Mitigacoes

| Risco | Impacto | Probabilidade | Mitigacao |
|-------|---------|---------------|-----------|
| Embeddings semanticos lentos sem GPU | Alto | Media | Usar TF-IDF + Jaccard como fallback |
| Carga inicial de scan muito lenta | Medio | Alta | Scans incrementais com dirty-bit |
| Ciclos de dependencia complexos | Medio | Baixa | DFS com max-depth + relatorio manual |
| NATS nao disponivel em dev | Alto | Baixa | Implementar EventEmitter sync local |
| Schema Zod muito restritivo | Baixo | Media | Usar .passthrough() para extensoes |
| Duplicacao de capacidades entre packages | Medio | Alta | Estrategia de merge com precedence rules |

---

## Referencias

1. Google (2025). "Agent-to-Agent (A2A) Protocol." github.com/google/A2A
2. Anthropic (2025). "Model Context Protocol (MCP)." spec.modelcontextprotocol.io
3. OASIS (2024). "CloudEvents Specification." cloudevents.io
4. LangChain (2025). "LangGraph: Multi-Agent Orchestration." langchain.com/langgraph
5. MetaGPT (2024). "Multi-Agent Collaborative Framework." github.com/geekan/MetaGPT
6. OpenAI (2025). "Function Calling & Tool Use." platform.openai.com
7. Drizzle Team (2026). "Drizzle ORM Schema Definition." orm.drizzle.team
8. Cline/Bin (2026). "System Prompt Engineering for Agentic Coding." cline.bin
9. Capability Pattern (2025). "Domain-Driven Design Capability Maps." dddcommunity.org
10. NATS (2026). "NATS JetStream Documentation." docs.nats.io/nats-concepts/jetstream
11. Fastify (2026). "Fastify v5 Documentation." fastify.dev
12. Zod (2026). "Zod Schema Validation." zod.dev
13. Microsoft (2024). "Semantic Kernel: AI Orchestration." learn.microsoft.com/semantic-kernel
14. Pinecone (2025). "Semantic Similarity Search." pinecone.io/learn
15. Topological Sorting (2024). "Kahn's Algorithm vs DFS-based." cp-algorithms.com

---

> **Fim do Estudo S27 — Capability Registry & Discovery Engine**
>
> Total de capacidades projetadas: ~120 (8 agentes + 51 ferramentas + 17 context-packs + 23 adapters + 7 registries + 5 workflows + 7 observacao + 5 memoria + 5 pipeline + 6 integracao)
>
> Proxima etapa: Implementar Fase 0 (CR-01 a CR-05 + CR-13) como package `@ideia/capability-registry` (estimativa: 50h / 6-7 dias uteis)
