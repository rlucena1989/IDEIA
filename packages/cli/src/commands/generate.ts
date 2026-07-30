import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.generate');
import { featureBlueprint } from '../generators/feature-blueprint';
import { domainModel } from '../generators/domain-model';
import { usecasePipeline } from '../generators/usecase-pipeline';
import { acceptanceTest } from '../generators/acceptance-test';
import { testMatrix } from '../generators/test-matrix';
import { permissionEndpoint } from '../generators/permission-endpoint';
import { crud } from '../generators/crud';
import { resource } from '../generators/resource';
import { dataScenario } from '../generators/data-scenario';
import { seed } from '../generators/seed';
import { boilerplateRemove } from '../generators/boilerplate-detector';
import { integrationAdapter } from '../generators/integration-adapter';
import { migrationPlan } from '../generators/migration-plan';
import { errorFlow } from '../generators/error-flow';
import { workflow } from '../generators/workflow';
import { dto } from '../generators/dto';
import { configValidator } from '../generators/config-validator';
import { mockApi } from '../generators/mock-api';
import { sdk } from '../generators/sdk';
import { multiTenant } from '../generators/multi-tenant';
import { privacy } from '../generators/privacy';
import { auditTrail } from '../generators/audit-trail';
import { backgroundJob } from '../generators/background-job';
import { notification } from '../generators/notification';
import { observability } from '../generators/observability';
import { runbook } from '../generators/runbook';
import { uxContract } from '../generators/ux-contract';
import { analyticsEvent } from '../generators/analytics';
import { i18n } from '../generators/i18n';
import { example } from '../generators/example';
import { onboarding } from '../generators/onboarding';
import { bugReproduction } from '../generators/bug-reproduction';
import { goldenPath } from '../generators/golden-path';
import { GeneratorOptions } from '../generators/engine';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { GenerationScope } from '../generation/artifact-types';
import { runDemandGeneration } from '../generation/generation-context';
import { orchestrateGeneration } from '../generation/generation-orchestrator';

function parseParentOptions(command: Command): GeneratorOptions {
  const parent = command.parent;
  const opts = parent ? parent.opts() : {};
  return {
    dryRun: !!opts.dryRun,
    force: !!opts.force,
  };
}

/**
 * Gera command.
 * @returns O resultado da operação.
 */
export function generateCommand(): Command {
  const cmd = new Command('generate')
    .description('Generate code artifacts using built-in templates')
    .option('--dry-run', 'Show what would be generated without writing files')
    .option('--force', 'Overwrite existing files');

  const go = (fn: (name: string, opts: GeneratorOptions) => void) =>
    (name: string, _opts: Record<string, unknown>, command: Command) =>
      fn(name, parseParentOptions(command));

  const go0 = (fn: (opts: GeneratorOptions) => void) =>
    (_opts: Record<string, unknown>, command: Command) =>
      fn(parseParentOptions(command));

  // TASK-F7-01
  cmd.command('feature-blueprint <name>')
    .description('Generate feature blueprint document')
    .action(go(featureBlueprint));

  cmd.command('domain-model <entity>')
    .description('Generate domain entity with validation and tests')
    .action(go(domainModel));

  cmd.command('usecase-pipeline <name>')
    .description('Generate use case pipeline (handler, request, response)')
    .action(go(usecasePipeline));

  cmd.command('acceptance-test <feature>')
    .description('Generate acceptance test (Gherkin)')
    .action(go(acceptanceTest));

  cmd.command('test-matrix <module>')
    .description('Generate test matrix for a module')
    .action(go(testMatrix));

  cmd.command('permission-endpoint <resource>')
    .description('Generate CRUD endpoint with permission control')
    .action(go(permissionEndpoint));

  // TASK-F7-02
  cmd.command('crud <entity>')
    .description('Generate full CRUD (13 files: entity, repo, service, controller, DTOs, tests)')
    .action(go(crud));

  cmd.command('resource <name>')
    .description('Generate UI resource component (React/Vue/Angular)')
    .option('--stack <stack>', 'UI stack (react, vue, angular)', 'react')
    .action((name: string, opts: Record<string, unknown>, command: Command) => {
      const stack = (opts.stack as string) || 'react';
      resource(name, { ...parseParentOptions(command), stack });
    });

  cmd.command('data-scenario <name>')
    .description('Generate data scenario for testing')
    .action(go(dataScenario));

  cmd.command('seed <entity>')
    .description('Generate seed data factory with Faker')
    .action(go(seed));

  cmd.command('boilerplate-remove')
    .description('Detect and report boilerplate code')
    .action(go0(boilerplateRemove));

  // TASK-F7-03
  cmd.command('integration-adapter <source>')
    .description('Generate integration adapter for external API')
    .action(go(integrationAdapter));

  cmd.command('migration-plan <description>')
    .description('Generate database migration plan (up/down scripts)')
    .action(go(migrationPlan));

  cmd.command('error-flow <module>')
    .description('Generate error flow mapping (codes, exceptions, handler)')
    .action(go(errorFlow));

  cmd.command('workflow <name>')
    .description('Generate business process workflow')
    .action(go(workflow));

  cmd.command('dto <entity>')
    .description('Generate DTO with Zod validation')
    .action(go(dto));

  cmd.command('config-validator <name>')
    .description('Generate environment/config validator')
    .action(go(configValidator));

  cmd.command('mock-api <spec>')
    .description('Generate mock API from OpenAPI spec')
    .action(go(mockApi));

  // TASK-F7-04 — Enterprise
  cmd.command('sdk <module>')
    .description('Generate SDK client from module spec')
    .action(go(sdk));

  cmd.command('multi-tenant <entity>')
    .description('Generate multi-tenant blueprint')
    .action(go(multiTenant));

  cmd.command('privacy <feature>')
    .description('Generate LGPD/GDPR privacy checklist and service')
    .action(go(privacy));

  cmd.command('audit-trail <entity>')
    .description('Generate audit trail for entity')
    .action(go(auditTrail));

  cmd.command('background-job <name>')
    .description('Generate async background job with queue')
    .action(go(backgroundJob));

  cmd.command('notification <channel>')
    .description('Generate notification channel (email, push, in-app)')
    .action(go(notification));

  cmd.command('observability <module>')
    .description('Generate metrics, logging and tracing')
    .action(go(observability));

  cmd.command('runbook <scenario>')
    .description('Generate operations runbook')
    .action(go(runbook));

  // TASK-F7-04 — Product Experience
  cmd.command('ux-contract <feature>')
    .description('Generate UX contract (events, payloads, states)')
    .action(go(uxContract));

  cmd.command('analytics-event <feature>')
    .description('Generate analytics event plan')
    .action(go(analyticsEvent));

  cmd.command('i18n <locale>')
    .description('Generate i18n locale structure')
    .action(go(i18n));

  cmd.command('example <feature>')
    .description('Generate interactive example')
    .action(go(example));

  cmd.command('onboarding')
    .description('Generate developer onboarding checklist')
    .action(go0(onboarding));

  cmd.command('bug-reproduction <id>')
    .description('Generate bug reproduction package')
    .action(go(bugReproduction));

  cmd.command('golden-path <stack>')
    .description('Generate golden path tests for detected stack')
    .action(go(goldenPath));

  // Fase 8/9 — Geração via modelo de produto
  cmd
    .command('product <scope-file>')
    .description('Planeja e gera artefatos usando modelo de produto — Fase 9')
    .option('--json', 'Saída em JSON')
    .action((scopeFile: string, opts: Record<string, unknown>) => {
      try {
        if (!fs.existsSync(scopeFile)) {
          console.error(`Arquivo de escopo não encontrado: ${scopeFile}`);
          process.exit(1);
        }
        const raw = fs.readFileSync(scopeFile, 'utf-8');
        const scope: GenerationScope = JSON.parse(raw);
        const { plan, documents, completeness } = orchestrateGeneration(scope);

        if (opts.json) {
          console.log(JSON.stringify({ plan, documents, completeness }, null, 2));
          return;
        }

        logger.info('\nGeração via modelo de produto "${plan.scope.productName}":');
        logger.info('  Tipo: ${plan.scope.productType}');
        logger.info('  Confiança: ${(plan.confidence * 100).toFixed(0)}%');
        logger.info('  Artefatos planejados: ${plan.artifacts.length}');
        logger.info('  Documentos gerados: ${documents.length}');
        logger.info('  Completude: ${completeness.ok ? \'OK\' : \'INCOMPLETO\'}');
        for (const doc of documents) logger.info('  → ${doc.path}');
        if (completeness.missing.length > 0) {
          for (const m of completeness.missing) logger.info('  ❌ Ausente: ${m}');
        }
        if (completeness.insufficient.length > 0) {
          for (const i of completeness.insufficient) logger.info('  ⚠ Insuficiente: ${i}');
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na geração por produto: ${message}`);
        process.exit(1);
      }
    });

  // ─── Adapter generators (lang scaffold) ─────────────────────────────────────
  function loadAdapterGenerator(lang: string): { generateFromSpec: (spec: unknown, destDir: string) => Array<{ path: string; content: string }> } | null {
    const candidates = [
      path.resolve(__dirname, `../../../../packages/adapter-${lang}/dist/index.js`),
      path.resolve(__dirname, `../../../packages/adapter-${lang}/dist/index.js`),
    ];
    for (const candidate of candidates) {
      try {
        if (fs.existsSync(candidate)) {
          const mod = require(candidate);
          if (typeof mod.generateFromSpec === 'function') return mod;
        }
      } catch { /* try next candidate */ }
    }
    try {
      const mod = require(`@ideia/adapter-${lang}`);
      if (typeof mod.generateFromSpec === 'function') return mod;
    } catch { /* not in node_modules */ }
    return null;
  }

  function listAvailableLangs(): string[] {
    const dirs = [
      path.resolve(__dirname, '../../../../packages'),
      path.resolve(__dirname, '../../../packages'),
      path.resolve(process.cwd(), 'packages'),
    ];
    for (const dir of dirs) {
      try {
        if (fs.existsSync(dir)) {
          return fs.readdirSync(dir)
            .filter(d => d.startsWith('adapter-'))
            .map(d => d.replace('adapter-', ''))
            .sort();
        }
      } catch { /* try next */ }
    }
    return ['go', 'typescript', 'python', 'java', 'kotlin', 'ruby', 'rust', 'elixir', 'haskell', 'dart', 'swift', 'php', 'zig', 'scala'];
  }

  cmd
    .option('--lang <language>', 'Target language for code generation via adapter (e.g. go)')
    .option('--spec <file>', 'Spec JSON file to generate from (used with --lang)')
    .option('--out <dir>', 'Output directory for generated files (used with --lang)', './generated')
    .action((opts: Record<string, unknown>) => {
      const lang = opts.lang as string | undefined;
      if (!lang) return;
      const gen = loadAdapterGenerator(lang);
      if (!gen) {
        const available = listAvailableLangs();
        console.error(`No adapter found for language "${lang}". Available: ${available.join(', ')}`);
        process.exit(1);
      }
      const specFile = (opts.spec as string) || path.join(process.cwd(), 'spec.json');
      if (!fs.existsSync(specFile)) {
        console.error(`Spec file not found: ${specFile}`);
        console.error('Provide a spec file with --spec <file> or place spec.json in the current directory');
        process.exit(1);
      }
      const raw = fs.readFileSync(specFile, 'utf-8');
      let spec: unknown;
      try { spec = JSON.parse(raw); } catch {
        console.error(`Invalid JSON in spec file: ${specFile}`);
        process.exit(1);
      }
      const destDir = path.resolve(process.cwd(), opts.out as string);
      const files = gen.generateFromSpec(spec, destDir);
      for (const f of files) {
        const fullPath = path.join(destDir, f.path);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, f.content, 'utf-8');
        logger.info('  → ${f.path}');
      }
      logger.info('\nGenerated ${files.length} files in ${destDir}');
    });

  // Fase 8 — Geração ativa sob demanda
  cmd
    .command('demand <scope-file>')
    .description('Gera artefatos operacionais sob demanda a partir de escopo — Fase 8')
    .option('--json', 'Saída em JSON')
    .action((scopeFile: string, opts: Record<string, unknown>) => {
      try {
        if (!fs.existsSync(scopeFile)) {
          console.error(`Arquivo de escopo não encontrado: ${scopeFile}`);
          process.exit(1);
        }
        const raw = fs.readFileSync(scopeFile, 'utf-8');
        const scope: GenerationScope = JSON.parse(raw);
        const { plan, artifacts, validation } = runDemandGeneration(scope);

        if (opts.json) {
          console.log(JSON.stringify({ plan, artifacts, validation }, null, 2));
          return;
        }

        logger.info('\nGeração sob demanda para "${scope.productName}":');
        logger.info('  Tipo: ${scope.productType}');
        logger.info('  Artefatos planejados: ${plan.artifacts.length}');
        logger.info('  Artefatos gerados: ${artifacts.length}');
        logger.info('  Validação: ${validation.ok ? \'OK\' : \'FALHAS\'}');
        for (const artifact of artifacts) logger.info('  → ${artifact.path}');
        if (validation.issues.length > 0) {
          for (const issue of validation.issues) logger.info('  ⚠ ${issue}');
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na geração sob demanda: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
