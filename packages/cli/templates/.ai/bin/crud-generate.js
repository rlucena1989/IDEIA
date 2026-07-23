#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { parseArgs, printHelp, ensureDir, log, info, warn } = require('./lib/common');
const { toPascalCase, toCamelCase, toKebabCase } = require('../generators/helpers/naming');

const args = parseArgs(process.argv.slice(2));

if (args.help || args._.length === 0) {
  printHelp(
    'crud-generate.js — Gera CRUD completo com Clean Architecture',
    'node .ai/bin/crud-generate.js <EntityName> [--module <name>] [--dry-run] [--force] [--out <dir>]',
    [
      '--module <name>   Nome do modulo (default: plural kebab-case da entidade)',
      '--dry-run         Apenas log, nenhum arquivo gerado',
      '--force           Sobrescrever arquivos existentes',
      '--out <dir>       Diretorio base (default: src/)',
    ]
  );
  process.exit(0);
}

const entityName = args._[0];
const moduleName = args.module || toKebabCase(entityName) + 's';
const dryRun = !!args['dry-run'];
const force = !!args.force;
const outBase = args.out || 'src';

const Entity = toPascalCase(entityName);
const entity = toCamelCase(entityName);
const moduleKebab = toKebabCase(moduleName);
const modulePath = path.join(process.cwd(), outBase, 'modules', moduleKebab);

const files = [];

function addFile(relPath, content) {
  files.push({ relPath, content });
}

addFile(
  `domain/entities/${Entity}.ts`,
  `export class ${Entity} {
  constructor(
    public readonly id: string,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

  getId(): string {
    return this.id;
  }

  touch(): void {
    this.updatedAt = new Date();
  }
}
`
);

addFile(
  `domain/repositories/I${Entity}Repository.ts`,
  `import { ${Entity} } from '../entities/${Entity}';

export interface I${Entity}Repository {
  create(entity: ${Entity}): Promise<${Entity}>;
  findById(id: string): Promise<${Entity} | null>;
  findAll(skip: number, take: number): Promise<${Entity}[]>;
  update(entity: ${Entity}): Promise<${Entity}>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
}
`
);

addFile(
  `infrastructure/repositories/${Entity}Repository.ts`,
  `import { ${Entity} } from '../../domain/entities/${Entity}';
import { I${Entity}Repository } from '../../domain/repositories/I${Entity}Repository';

export class ${Entity}Repository implements I${Entity}Repository {
  private store: Map<string, ${Entity}> = new Map();

  async create(entity: ${Entity}): Promise<${Entity}> {
    this.store.set(entity.id, entity);
    return entity;
  }

  async findById(id: string): Promise<${Entity} | null> {
    return this.store.get(id) ?? null;
  }

  async findAll(skip: number, take: number): Promise<${Entity}[]> {
    return Array.from(this.store.values()).slice(skip, skip + take);
  }

  async update(entity: ${Entity}): Promise<${Entity}> {
    entity.touch();
    this.store.set(entity.id, entity);
    return entity;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async count(): Promise<number> {
    return this.store.size;
  }
}
`
);

addFile(
  `application/dtos/Create${Entity}Input.ts`,
  `export interface Create${Entity}Input {
  // TODO: add fields
}
`
);

addFile(
  `application/dtos/Update${Entity}Input.ts`,
  `export interface Update${Entity}Input {
  id: string;
  // TODO: add fields
}
`
);

addFile(
  `application/dtos/${Entity}Response.ts`,
  `export interface ${Entity}Response {
  id: string;
  createdAt: string;
  updatedAt: string;
}
`
);

addFile(
  `application/usecases/Create${Entity}UseCase.ts`,
  `import { ${Entity} } from '../../domain/entities/${Entity}';
import { I${Entity}Repository } from '../../domain/repositories/I${Entity}Repository';
import { Create${Entity}Input } from '../dtos/Create${Entity}Input';
import { ${Entity}Response } from '../dtos/${Entity}Response';

export class Create${Entity}UseCase {
  constructor(private readonly repo: I${Entity}Repository) {}

  async execute(input: Create${Entity}Input): Promise<${Entity}Response> {
    const id = crypto.randomUUID();
    const entity = new ${Entity}(id);
    const created = await this.repo.create(entity);
    return {
      id: created.id,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }
}
`
);

addFile(
  `application/usecases/Get${Entity}UseCase.ts`,
  `import { I${Entity}Repository } from '../../domain/repositories/I${Entity}Repository';
import { ${Entity}Response } from '../dtos/${Entity}Response';

export class Get${Entity}UseCase {
  constructor(private readonly repo: I${Entity}Repository) {}

  async execute(id: string): Promise<${Entity}Response | null> {
    const entity = await this.repo.findById(id);
    if (!entity) return null;
    return {
      id: entity.id,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
`
);

addFile(
  `application/usecases/Update${Entity}UseCase.ts`,
  `import { I${Entity}Repository } from '../../domain/repositories/I${Entity}Repository';
import { Update${Entity}Input } from '../dtos/Update${Entity}Input';
import { ${Entity}Response } from '../dtos/${Entity}Response';

export class Update${Entity}UseCase {
  constructor(private readonly repo: I${Entity}Repository) {}

  async execute(input: Update${Entity}Input): Promise<${Entity}Response | null> {
    const entity = await this.repo.findById(input.id);
    if (!entity) return null;
    const updated = await this.repo.update(entity);
    return {
      id: updated.id,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
`
);

addFile(
  `application/usecases/Delete${Entity}UseCase.ts`,
  `import { I${Entity}Repository } from '../../domain/repositories/I${Entity}Repository';

export class Delete${Entity}UseCase {
  constructor(private readonly repo: I${Entity}Repository) {}

  async execute(id: string): Promise<boolean> {
    const existing = await this.repo.findById(id);
    if (!existing) return false;
    await this.repo.delete(id);
    return true;
  }
}
`
);

addFile(
  `application/usecases/List${Entity}UseCase.ts`,
  `import { I${Entity}Repository } from '../../domain/repositories/I${Entity}Repository';
import { ${Entity}Response } from '../dtos/${Entity}Response';

export interface List${Entity}Output {
  items: ${Entity}Response[];
  total: number;
}

export class List${Entity}UseCase {
  constructor(private readonly repo: I${Entity}Repository) {}

  async execute(page = 1, pageSize = 20): Promise<List${Entity}Output> {
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.repo.findAll(skip, pageSize),
      this.repo.count(),
    ]);
    return {
      items: items.map(e => ({
        id: e.id,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      })),
      total,
    };
  }
}
`
);

addFile(
  `presentation/controllers/${Entity}Controller.ts`,
  `import { Create${Entity}UseCase } from '../../application/usecases/Create${Entity}UseCase';
import { Get${Entity}UseCase } from '../../application/usecases/Get${Entity}UseCase';
import { Update${Entity}UseCase } from '../../application/usecases/Update${Entity}UseCase';
import { Delete${Entity}UseCase } from '../../application/usecases/Delete${Entity}UseCase';
import { List${Entity}UseCase } from '../../application/usecases/List${Entity}UseCase';
import { Create${Entity}Input } from '../../application/dtos/Create${Entity}Input';
import { Update${Entity}Input } from '../../application/dtos/Update${Entity}Input';

export class ${Entity}Controller {
  constructor(
    private readonly createUseCase: Create${Entity}UseCase,
    private readonly getUseCase: Get${Entity}UseCase,
    private readonly updateUseCase: Update${Entity}UseCase,
    private readonly deleteUseCase: Delete${Entity}UseCase,
    private readonly listUseCase: List${Entity}UseCase,
  ) {}

  async create(input: Create${Entity}Input) {
    return this.createUseCase.execute(input);
  }

  async getById(id: string) {
    return this.getUseCase.execute(id);
  }

  async update(input: Update${Entity}Input) {
    return this.updateUseCase.execute(input);
  }

  async delete(id: string) {
    return this.deleteUseCase.execute(id);
  }

  async list(page?: number, pageSize?: number) {
    return this.listUseCase.execute(page, pageSize);
  }
}
`
);

addFile(
  `presentation/routes.ts`,
  `// Route definitions for ${Entity} module
// Integrate with your HTTP framework (Express, Fastify, NestJS, etc.)

export const ${entity}Routes = {
  create:  'POST   /${moduleKebab}',
  getById: 'GET    /${moduleKebab}/:id',
  update:  'PATCH  /${moduleKebab}/:id',
  delete:  'DELETE /${moduleKebab}/:id',
  list:    'GET    /${moduleKebab}',
};
`
);

let created = 0;
let skipped = 0;
let overwritten = 0;

for (const file of files) {
  const fullPath = path.join(modulePath, file.relPath);
  const exists = fs.existsSync(fullPath);

  if (dryRun) {
    log(`[DRY-RUN] ${exists ? (force ? 'OVERWRITE' : 'SKIP') : 'CREATE'}: ${path.relative(process.cwd(), fullPath)}`);
    if (exists) { if (force) overwritten++; else skipped++; } else { created++; }
    continue;
  }

  if (exists && !force) {
    warn(`Skip (exists): ${path.relative(process.cwd(), fullPath)}`);
    skipped++;
    continue;
  }

  ensureDir(path.dirname(fullPath));
  fs.writeFileSync(fullPath, file.content, 'utf-8');
  if (exists) {
    log(`Overwrite: ${path.relative(process.cwd(), fullPath)}`);
    overwritten++;
  } else {
    log(`Create: ${path.relative(process.cwd(), fullPath)}`);
    created++;
  }
}

console.log('');
info(`Module: ${moduleKebab}`);
info(`Entity: ${Entity}`);
info(`Created: ${created} | Skipped: ${skipped} | Overwritten: ${overwritten} | Total: ${files.length}`);
