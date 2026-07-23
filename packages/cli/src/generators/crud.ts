import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';

/**
 * Processa crud.
 * @param entity - Valor entity.
 * @param options - Valor options.
 */
export function crud(entity: string, options: GeneratorOptions): void {
  const vars = buildVars(entity);
  const base = 'src/{{name_kebab}}';
  const files: FileEntry[] = [
    {
      path: `${base}/domain/{{Name}}Entity.ts`,
      content: `export interface {{Name}}Entity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}
`,
    },
    {
      path: `${base}/domain/{{Name}}Repository.ts`,
      content: `import { {{Name}}Entity } from './{{Name}}Entity';

export interface {{Name}}Repository {
  findAll(): Promise<{{Name}}Entity[]>;
  findById(id: string): Promise<{{Name}}Entity | null>;
  create(data: Partial<{{Name}}Entity>): Promise<{{Name}}Entity>;
  update(id: string, data: Partial<{{Name}}Entity>): Promise<{{Name}}Entity>;
  delete(id: string): Promise<void>;
}
`,
    },
    {
      path: `${base}/infra/{{Name}}RepositoryImpl.ts`,
      content: `import { {{Name}}Entity } from '../domain/{{Name}}Entity';
import { {{Name}}Repository } from '../domain/{{Name}}Repository';

export class {{Name}}RepositoryImpl implements {{Name}}Repository {
  private store: Map<string, {{Name}}Entity> = new Map();

  async findAll(): Promise<{{Name}}Entity[]> {
    return Array.from(this.store.values());
  }

  async findById(id: string): Promise<{{Name}}Entity | null> {
    return this.store.get(id) ?? null;
  }

  async create(data: Partial<{{Name}}Entity>): Promise<{{Name}}Entity> {
    const entity: {{Name}}Entity = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as {{Name}}Entity;
    this.store.set(entity.id, entity);
    return entity;
  }

  async update(id: string, data: Partial<{{Name}}Entity>): Promise<{{Name}}Entity> {
    const existing = this.store.get(id);
    if (!existing) throw new Error('{{Name}} not found');
    const updated = { ...existing, ...data, updatedAt: new Date() };
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
`,
    },
    {
      path: `${base}/application/{{Name}}Service.ts`,
      content: `import { {{Name}}Entity } from '../domain/{{Name}}Entity';
import { {{Name}}Repository } from '../domain/{{Name}}Repository';

export class {{Name}}Service {
  constructor(private readonly repo: {{Name}}Repository) {}

  async list(): Promise<{{Name}}Entity[]> {
    return this.repo.findAll();
  }

  async get(id: string): Promise<{{Name}}Entity | null> {
    return this.repo.findById(id);
  }

  async create(data: Partial<{{Name}}Entity>): Promise<{{Name}}Entity> {
    return this.repo.create(data);
  }

  async update(id: string, data: Partial<{{Name}}Entity>): Promise<{{Name}}Entity> {
    return this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}
`,
    },
    {
      path: `${base}/api/{{Name}}Controller.ts`,
      content: `import { Router, Request, Response } from 'express';
import { {{Name}}Service } from '../application/{{Name}}Service';
import { {{Name}}RepositoryImpl } from '../infra/{{Name}}RepositoryImpl';

const router = Router();
const service = new {{Name}}Service(new {{Name}}RepositoryImpl());

router.get('/', async (_req: Request, res: Response) => {
  const items = await service.list();
  res.json({ data: items });
});

router.get('/:id', async (req: Request, res: Response) => {
  const item = await service.get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json({ data: item });
});

router.post('/', async (req: Request, res: Response) => {
  const item = await service.create(req.body);
  res.status(201).json({ data: item });
});

router.put('/:id', async (req: Request, res: Response) => {
  const item = await service.update(req.params.id, req.body);
  res.json({ data: item });
});

router.delete('/:id', async (req: Request, res: Response) => {
  await service.delete(req.params.id);
  res.status(204).send();
});

export default router;
`,
    },
    {
      path: `${base}/api/{{Name}}Routes.ts`,
      content: `import { Router } from 'express';
import router from './{{Name}}Controller';

const {{camel}}Routes = Router();
{{camel}}Routes.use('/{{name_kebab}}', router);
export default {{camel}}Routes;
`,
    },
    {
      path: `${base}/api/dto/Create{{Name}}DTO.ts`,
      content: `export class Create{{Name}}DTO {
  constructor(public readonly data: Record<string, unknown>) {}

  static from(body: unknown): Create{{Name}}DTO {
    return new Create{{Name}}DTO(body as Record<string, unknown>);
  }
}
`,
    },
    {
      path: `${base}/api/dto/Update{{Name}}DTO.ts`,
      content: `export class Update{{Name}}DTO {
  constructor(public readonly data: Record<string, unknown>) {}

  static from(body: unknown): Update{{Name}}DTO {
    return new Update{{Name}}DTO(body as Record<string, unknown>);
  }
}
`,
    },
    {
      path: `${base}/api/dto/{{Name}}ResponseDTO.ts`,
      content: `export interface {{Name}}Response {
  id: string;
  [key: string]: unknown;
}
`,
    },
    {
      path: `${base}/infra/{{Name}}Factory.ts`,
      content: `import { {{Name}}Entity } from '../domain/{{Name}}Entity';

export class {{Name}}Factory {
  static create(data: Partial<{{Name}}Entity>): {{Name}}Entity {
    return {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as {{Name}}Entity;
  }
}
`,
    },
    {
      path: `${base}/api/__tests__/{{Name}}Controller.test.ts`,
      content: `import request from 'supertest';
import express from 'express';
import router from '../{{Name}}Controller';

const app = express();
app.use(express.json());
app.use(router);

describe('{{Name}} CRUD', () => {
  it('should list items', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('should create item', async () => {
    const res = await request(app).post('/').send({});
    expect(res.status).toBe(201);
  });
});
`,
    },
    {
      path: `${base}/api/__tests__/{{Name}}Service.test.ts`,
      content: `import { {{Name}}Service } from '../../application/{{Name}}Service';
import { {{Name}}RepositoryImpl } from '../../infra/{{Name}}RepositoryImpl';

describe('{{Name}}Service', () => {
  const service = new {{Name}}Service(new {{Name}}RepositoryImpl());

  it('should create and list', async () => {
    await service.create({});
    const items = await service.list();
    expect(items.length).toBeGreaterThan(0);
  });
});
`,
    },
    {
      path: `${base}/api/__tests__/{{Name}}Repository.test.ts`,
      content: `import { {{Name}}RepositoryImpl } from '../infra/{{Name}}RepositoryImpl';

describe('{{Name}}Repository', () => {
  const repo = new {{Name}}RepositoryImpl();

  it('should CRUD', async () => {
    const created = await repo.create({});
    expect(created.id).toBeDefined();

    const found = await repo.findById(created.id);
    expect(found).toBeDefined();

    await repo.delete(created.id);
    const after = await repo.findById(created.id);
    expect(after).toBeNull();
  });
});
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`CRUD: ${entity} (13 arquivos)`, result, options.dryRun);
}
