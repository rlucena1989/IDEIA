import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import _fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { detectStack } from './detect';
import { printLine, printHeader, finish } from '../utils/output';

export const GOALS = [
  { id: 'new-project', label: 'Novo Projeto — scaffold completo com governança' },
  { id: 'generate-api', label: 'Gerar uma API — endpoint REST com validação' },
  { id: 'add-tests', label: 'Adicionar Testes — scaffolding de testes unitários/integração' },
  { id: 'add-module', label: 'Adicionar Módulo — novo módulo com estrutura limpa' },
  { id: 'config-governance', label: 'Configurar Governança — setup .ai/ governance' },
] as const;

type GoalId = typeof GOALS[number]['id'];

export const FEATURE_TEMPLATES: Record<string, string[]> = {
  'generate-api': [
    'REST endpoint with CRUD', 'GraphQL resolver', 'WebSocket handler',
    'Webhook receiver', 'Health check endpoint',
  ],
  'add-tests': [
    'Unit tests (jest)', 'Integration tests', 'E2E tests',
    'API contract tests', 'Test coverage reports',
  ],
  'add-module': [
    'Clean Architecture module', 'Feature module', 'Data access layer',
    'Background job worker', 'Event handler',
  ],
};

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => rl.question(question + ' ', resolve));
}

async function askOptions(rl: readline.Interface, question: string, options: string[]): Promise<string> {
  printLine(question);
  options.forEach((opt, i) => printLine(`  ${i + 1}) ${opt}`));
  const answer = await ask(rl, `Escolha (1-${options.length}):`);
  const idx = parseInt(answer, 10) - 1;
  if (idx >= 0 && idx < options.length) return options[idx] ?? options[0] as string;
  return options[0] as string;
}

async function goalNewProject(rl: readline.Interface, root: string): Promise<Record<string, string>> {
  const stack = detectStack(root);
  const name = await ask(rl, `Nome do projeto [${path.basename(root)}]:`) || path.basename(root);
  const langDefault = stack.languages[0] ?? 'nodejs';
  const lang = await ask(rl, `Linguagem [${langDefault}]:`) || langDefault;
  const framework = await ask(rl, `Framework [${stack.frameworks[0] ?? 'nestjs'}]:`) || (stack.frameworks[0] ?? 'nestjs');
  const features = await ask(rl, 'Features extras (separadas por vírgula):');
  const pkgManager = await ask(rl, `Package manager [${stack.packageManager || 'npm'}]:`) || stack.packageManager || 'npm';
  return { goal: 'new-project', name, language: lang, framework, features, packageManager: pkgManager };
}

async function goalGenerateApi(rl: readline.Interface, _root: string): Promise<Record<string, string>> {
  const resource = await ask(rl, 'Nome do recurso (ex: users, products):');
  const template = await askOptions(rl, 'Tipo de API:', FEATURE_TEMPLATES['generate-api'] ?? []);
  const fields = await ask(rl, 'Campos (nome:tipo separados por vírgula, ex: name:string,email:string):');
  const auth = await ask(rl, 'Requer autenticação? (s/N):');
  return { goal: 'generate-api', resource, template, fields, auth: auth.toLowerCase() === 's' ? 'yes' : 'no' };
}

async function goalAddTests(rl: readline.Interface, _root: string): Promise<Record<string, string>> {
  const target = await ask(rl, 'Módulo/arquivo alvo dos testes:');
  const type = await askOptions(rl, 'Tipo de teste:', FEATURE_TEMPLATES['add-tests'] ?? []);
  const framework_pick = await ask(rl, 'Framework de teste [jest]:') || 'jest';
  const coverage = await ask(rl, 'Meta de cobertura mínima (ex: 80):') || '80';
  return { goal: 'add-tests', target, type, framework: framework_pick, coverage };
}

async function goalAddModule(rl: readline.Interface, _root: string): Promise<Record<string, string>> {
  const moduleName = await ask(rl, 'Nome do módulo:');
  const type = await askOptions(rl, 'Tipo de módulo:', FEATURE_TEMPLATES['add-module'] ?? []);
  const withTests = await ask(rl, 'Incluir testes? (S/n):');
  const withDocs = await ask(rl, 'Incluir documentação? (S/n):');
  return { goal: 'add-module', moduleName, type, withTests: withTests.toLowerCase() !== 'n' ? 'yes' : 'no', withDocs: withDocs.toLowerCase() !== 'n' ? 'yes' : 'no' };
}

async function goalConfigGovernance(rl: readline.Interface, _root: string): Promise<Record<string, string>> {
  const mode = await askOptions(rl, 'Modo de instalação:', ['Mínimo (essencial)', 'Padrão (recomendado)', 'Completo']);
  const withCI = await ask(rl, 'Gerar pipeline CI? (S/n):');
  const withAdr = await ask(rl, 'Incluir ADR template? (S/n):');
  return { goal: 'config-governance', mode, withCI: withCI.toLowerCase() !== 'n' ? 'yes' : 'no', withAdr: withAdr.toLowerCase() !== 'n' ? 'yes' : 'no' };
}

export function printGoalSummary(answers: Record<string, string>): void {
  const summaries: Record<GoalId, (a: Record<string, string>) => string> = {
    'new-project': (a) => [
      `Nome: ${a.name}`,
      `Linguagem: ${a.language}`,
      `Framework: ${a.framework}`,
      `Features: ${a.features || 'nenhuma'}`,
      `Package manager: ${a.packageManager}`,
    ].join('\n  '),
    'generate-api': (a) => [
      `Recurso: ${a.resource}`,
      `Tipo: ${a.template}`,
      `Campos: ${a.fields || 'nenhum'}`,
      `Autenticação: ${a.auth}`,
    ].join('\n  '),
    'add-tests': (a) => [
      `Alvo: ${a.target}`,
      `Tipo: ${a.type}`,
      `Framework: ${a.framework}`,
      `Cobertura: ${a.coverage}%`,
    ].join('\n  '),
    'add-module': (a) => [
      `Módulo: ${a.moduleName}`,
      `Tipo: ${a.type}`,
      `Testes: ${a.withTests}`,
      `Docs: ${a.withDocs}`,
    ].join('\n  '),
    'config-governance': (a) => [
      `Modo: ${a.mode}`,
      `CI: ${a.withCI}`,
      `ADR: ${a.withAdr}`,
    ].join('\n  '),
  };

  const goal = answers.goal as GoalId;
  const summaryFn = summaries[goal];
  if (summaryFn) printLine(`\n  ${summaryFn(answers)}`);
}

async function executeGoal(answers: Record<string, string>): Promise<void> {
  const _root = process.cwd();
  const goal = answers.goal as GoalId;

  switch (goal) {
    case 'new-project': {
      printLine(`\nExecutando: ai-devkit init --flavor ${answers.framework}`);
      break;
    }
    case 'generate-api': {
      printLine(`\nGerando API REST para ${answers.resource}...`);
      printLine(`  ai-devkit generate crud ${answers.resource}`);
      break;
    }
    case 'add-tests': {
      printLine(`\nPreparando testes para ${answers.target}...`);
      printLine(`  ai-devkit generate test-matrix ${answers.target}`);
      break;
    }
    case 'add-module': {
      printLine(`\nCriando módulo ${answers.moduleName}...`);
      printLine(`  ai-devkit generate domain-model ${answers.moduleName}`);
      break;
    }
    case 'config-governance': {
      const flag = answers.mode === 'Completo' ? 'full' : answers.mode === 'Mínimo (essencial)' ? 'minimal' : 'standard';
      printLine(`\nAplicando governança...`);
      printLine(`  ai-devkit init --${flag}`);
      break;
    }
  }
}

export async function runWizard(root: string): Promise<Record<string, string>> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  printHeader('AI-Devkit Wizard');
  printLine('');

  const goal = await askOptions(rl, 'O que você deseja fazer?', GOALS.map((g) => g.label));
  const goalId = GOALS.find((g) => g.label === goal)?.id || 'new-project';

  let answers: Record<string, string>;
  switch (goalId) {
    case 'new-project': answers = await goalNewProject(rl, root); break;
    case 'generate-api': answers = await goalGenerateApi(rl, root); break;
    case 'add-tests': answers = await goalAddTests(rl, root); break;
    case 'add-module': answers = await goalAddModule(rl, root); break;
    case 'config-governance': answers = await goalConfigGovernance(rl, root); break;
    default: answers = await goalNewProject(rl, root);
  }

  rl.close();

  printLine('');
  printLine('=== Resumo ===');
  printGoalSummary(answers);

  printLine('');
  printLine('Para aplicar, pressione Enter ou Ctrl+C para cancelar.');
  const confirmRl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise<void>(resolve => confirmRl.question('', () => { confirmRl.close(); resolve(); }));

  await executeGoal(answers);

  return answers;
}

export function wizardCommand(): Command {
  return new Command('wizard')
    .description('Wizard interativo com fluxos guiados por objetivo')
    .option('--goal <goal>', 'Pular menu e ir direto para um objetivo (new-project, generate-api, add-tests, add-module, config-governance)')
    .option('--no-wizard', 'Força modo CLI clássico mesmo sem pipe')
    .action(async (options) => {
      const isPiped = !process.stdin.isTTY;
      if (options.wizard === false || isPiped) {
        printLine('[ai-devkit] Modo wizard desativado. Use "ai-devkit init" para CLI clássico.');
        return;
      }

      try {
        const root = process.cwd();

        if (options.goal) {
          const validGoals = GOALS.map((g) => g.id);
          if (!validGoals.includes(options.goal)) {
            printLine(`[ai-devkit] Goal inválido: "${options.goal}". Válidos: ${validGoals.join(', ')}`);
            process.exit(1);
          }
          process.stdout.write(`[ai-devkit] Modo direto para goal: ${options.goal}\n`);
        }

        const _answers = await runWizard(root);
        printLine('');
        printLine('✅ Wizard concluído com sucesso.');
        process.exit(0);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n❌ Erro no wizard: ${message}`);
        process.exit(1);
      }
    });
}
