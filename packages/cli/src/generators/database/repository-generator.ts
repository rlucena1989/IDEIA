import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from '../engine';

interface RepoOptions extends GeneratorOptions {
  orm?: 'prisma' | 'typeorm' | 'drizzle';
}

const ormTemplates: Record<string, (vars: Record<string, string>) => string> = {
  prisma: (v) => `import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function findMany(): Promise<${v.Name}[]> {
  return prisma.${v.name_kebab}.findMany();
}

export async function findById(id: number): Promise<${v.Name} | null> {
  return prisma.${v.name_kebab}.findUnique({ where: { id } });
}

export async function create(data: Omit<${v.Name}, 'id' | 'createdAt' | 'updatedAt'>): Promise<${v.Name}> {
  return prisma.${v.name_kebab}.create({ data });
}

export async function update(id: number, data: Partial<${v.Name}>): Promise<${v.Name}> {
  return prisma.${v.name_kebab}.update({ where: { id }, data });
}

export async function remove(id: number): Promise<void> {
  await prisma.${v.name_kebab}.delete({ where: { id } });
}
`,

  typeorm: (v) => `import { Repository, EntityRepository } from 'typeorm';
import { ${v.Name} } from '../entities/${v.Name}';

@EntityRepository(${v.Name})
export class ${v.Name}Repository extends Repository<${v.Name}> {
  async findMany(): Promise<${v.Name}[]> {
    return this.find();
  }

  async findById(id: number): Promise<${v.Name} | null> {
    return this.findOne({ where: { id } });
  }

  async create(data: Partial<${v.Name}>): Promise<${v.Name}> {
    const entity = this.create(data);
    return this.save(entity);
  }
}
`,
};

/**
 * Processa repository.
 * @param name - Valor name.
 * @param options - Valor options.
 */
export function repository(name: string, options: RepoOptions): void {
  const vars = buildVars(name);
  const orm = options.orm || 'prisma';
  const template = ormTemplates[orm] || ormTemplates.prisma;

  const files: FileEntry[] = [
    {
      path: `src/repositories/${vars.Name}Repository.ts`,
      content: `import { ${vars.Name} } from '../types';

${template(vars)}
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Repository: ${name} (ORM: ${orm})`, result, options.dryRun);
}
