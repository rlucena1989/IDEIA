import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';
import { createLogger } from '@ideia/logger';

/**
 * Processa seed.
 * @param entity - Valor entity.
 * @param options - Valor options.
 */
export function seed(entity: string, options: GeneratorOptions): void {
  const vars = buildVars(entity);
  const files: FileEntry[] = [
    {
      path: 'src/database/seeds/{{name_kebab}}.seed.ts',
      content: `import { faker } from '@faker-js/faker';

interface {{Name}}SeedData {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  createdAt: Date;
}

export function generate{{Name}}Seed(count: number = 10): {{Name}}SeedData[] {
  return Array.from({ length: count }, () => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    status: faker.helpers.arrayElement(['active', 'inactive']),
    createdAt: faker.date.past(),
  }));
}

export const {{NAME}}_SEED_DATA: {{Name}}SeedData[] = generate{{Name}}Seed(10);
`,
    },
    {
      path: 'prisma/seed.ts',
      content: `import { PrismaClient } from '@prisma/client';
import { generate{{Name}}Seed } from '../src/database/seeds/{{name_kebab}}.seed';

const prisma = new PrismaClient();

async function main() {
  const {{camel}}Data = generate{{Name}}Seed(10);
  logger.info(\`Seeded \${ {{camel}}Data.length } {{name}} records\`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Seed: ${entity}`, result, options.dryRun);
}
