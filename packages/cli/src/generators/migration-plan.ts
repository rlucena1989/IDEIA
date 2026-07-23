import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';

/**
 * Processa plan.
 * @param description - Valor description.
 * @param options - Valor options.
 */
export function migrationPlan(description: string, options: GeneratorOptions): void {
  const vars = buildVars(description);
  const ts = Date.now();
  const files: FileEntry[] = [
    {
      path: `src/database/migrations/${ts}_${description.replace(/\s+/g, '_')}.up.sql`,
      content: `-- Migration UP: ${description}
-- Date: ${new Date().toISOString().split('T')[0]}

BEGIN;

-- Adicionar instrucoes DDL (ALTER TABLE, CREATE TABLE, etc.) conforme necessario
-- Example:
-- CREATE TABLE {{name_kebab}} (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     name VARCHAR(255) NOT NULL,
--     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );

COMMIT;
`,
    },
    {
      path: `src/database/migrations/${ts}_${description.replace(/\s+/g, '_')}.down.sql`,
      content: `-- Migration DOWN: ${description}
-- Date: ${new Date().toISOString().split('T')[0]}

BEGIN;

-- Adicionar instrucoes de rollback (DROP TABLE, ALTER TABLE, etc.) para reverter a migration
-- Example:
-- DROP TABLE IF EXISTS {{name_kebab}};

COMMIT;
`,
    },
    {
      path: 'src/database/migrations/migration-plan.yaml',
      content: `# Migration Plan
description: "${description}"
timestamp: ${ts}
status: planned
author: "ai-devkit"

steps:
  - id: "MIG-${ts}"
    description: "${description}"
    type: schema_change
    risk: low
    rollback: true
    up: "${ts}_${description.replace(/\s+/g, '_')}.up.sql"
    down: "${ts}_${description.replace(/\s+/g, '_')}.down.sql"
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Migration Plan: ${description}`, result, options.dryRun);
}
