import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from '../engine';
import { createLogger } from '@ideia/logger';

interface SeedOptions extends GeneratorOptions {
  count?: string;
  fields?: string;
}

/**
 * Processa seed.
 * @param name - Valor name.
 * @param options - Valor options.
 */
export function seed(name: string, options: SeedOptions): void {
  const vars = buildVars(name);
  const count = parseInt(options.count || '10', 10);
  const fields = (options.fields || 'title,description').split(',').map(f => f.trim());

  const fieldEntries = fields.map(f => {
    const _fv = buildVars(f);
    return `    ${f}: faker.lorem.sentence(),`;
  }).join('\n');

  const files: FileEntry[] = [
    {
      path: `prisma/seed.ts`,
      content: `import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

interface ${vars.Name}Seed {
${fields.map(f => `  ${f}: string;`).join('\n')}
}

async function main() {
  logger.info('Seeding ${count} ${vars.name_kebab}...');

  const data: ${vars.Name}Seed[] = Array.from({ length: ${count} }, () => ({
${fieldEntries}
  }));

  for (const item of data) {
    await prisma.${vars.name_kebab}.create({ data: item });
  }

  logger.info('Done.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
`,
    },
    {
      path: `prisma/seed.config.ts`,
      content: `export const seedConfig = {
  count: ${count},
  model: '${vars.Name}',
  fields: [${fields.map(f => `'${f}'`).join(', ')}],
};
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Seed: ${name} (${count} registros, ${fields.length} campos)`, result, options.dryRun);
}
