import { Command } from 'commander';
import path from 'node:path';
import { detectStack, StackInfo } from './detect';
import { printHeader, printLine, printResult, finish } from "../utils/output";
import { getIO } from '../io';

/**
 * Processa workflow content.
 * @param stack - Valor stack.
 * @returns O resultado da operação.
 */
function githubWorkflowContent(stack: StackInfo): string {
  const buildCmd = stack.buildTool === 'typescript' ? 'npm run build' : 'npm run build --if-present';
  const testCmd = stack.testFramework ? 'npm test' : 'npm run test --if-present';
  const installCmd = stack.packageManager === 'pnpm'
    ? 'npm install -g pnpm && pnpm install --frozen-lockfile'
    : stack.packageManager === 'yarn'
      ? 'yarn install --frozen-lockfile'
      : 'npm ci';

  return `name: AI-Devkit Quality Gates

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  quality:
    name: AI Quality Gates
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: lts/*

      - name: Install dependencies
        run: ${installCmd}

      - name: AI-Devkit Doctor
        run: npx ai-devkit doctor

      - name: AI-Devkit Verify
        run: npx ai-devkit verify

      - name: Build
        run: ${buildCmd}

      - name: Test
        run: ${testCmd}
`;
}

/**
 * Processa ci content.
 * @param stack - Valor stack.
 * @returns O resultado da operação.
 */
function gitlabCiContent(_stack: StackInfo): string {
  return `stages:
  - quality
  - build
  - test

variables:
  NODE_VERSION: lts

ai-doctor:
  stage: quality
  image: node:\${NODE_VERSION}
  script:
    - npx ai-devkit doctor
  cache:
    key: \${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/

ai-verify:
  stage: quality
  image: node:\${NODE_VERSION}
  script:
    - npx ai-devkit verify
  cache:
    key: \${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/

build:
  stage: build
  image: node:\${NODE_VERSION}
  script:
    - npm run build --if-present
  cache:
    key: \${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/

test:
  stage: test
  image: node:\${NODE_VERSION}
  script:
    - npm test --if-present
  cache:
    key: \${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/
`;
}

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function ciCommand(): Command {
  const cmd = new Command('ci')
    .description('Gera pipelines de CI/CD configurados');

  cmd
    .command('generate')
    .description('Gera workflows de CI baseados na stack do projeto')
    .option('--github', 'Gera apenas GitHub Actions')
    .option('--gitlab', 'Gera apenas GitLab CI')
    .option('--force', 'Sobrescreve arquivos existentes')
    .option('--dry-run', 'Mostra o que seria gerado sem escrever')
    .action((options) => ciGenerateAction(options));

  return cmd;
}

export function ciGenerateAction(options: { github?: boolean; gitlab?: boolean; force?: boolean; dryRun?: boolean }): void {
  const root = process.cwd();
  const stack = detectStack(root);
  const genGithub = !options.gitlab || options.github;
  const genGitlab = !options.github || options.gitlab;
  const generated: string[] = [];
  const skipped: string[] = [];

  printHeader('CI Pipeline Generator');
  printLine(`Stack: ${stack.languages.join(', ') || 'nodejs'}`);
  printLine(`Package manager: ${stack.packageManager || 'npm'}`);
  printLine(`Build tool: ${stack.buildTool || 'node'}`);
  printLine(`Test framework: ${stack.testFramework || 'none'}`);
  printLine('');

  if (genGithub) {
    const ghDir = path.join(root, '.github', 'workflows');
    const ghFile = path.join(ghDir, 'ai-quality.yml');
    const content = githubWorkflowContent(stack);

    if (!options.dryRun) {
      if (getIO().fs.exists(ghFile) && !options.force) {
        printResult('GitHub Actions', false, `ja existe: .github/workflows/ai-quality.yml (use --force)`);
        skipped.push('.github/workflows/ai-quality.yml');
      } else {
        getIO().fs.mkDir(ghDir, true);
        getIO().fs.write(ghFile, content);
        printResult('GitHub Actions', true, `.github/workflows/ai-quality.yml`);
        generated.push('.github/workflows/ai-quality.yml');
      }
    } else {
      printLine(`[DRY-RUN] Criaria: .github/workflows/ai-quality.yml`);
      generated.push('.github/workflows/ai-quality.yml (dry-run)');
    }
  }

  if (genGitlab) {
    const glFile = path.join(root, '.gitlab-ci.yml');

    if (!options.dryRun) {
      if (getIO().fs.exists(glFile) && !options.force) {
        printResult('GitLab CI', false, `ja existe: .gitlab-ci.yml (use --force)`);
        skipped.push('.gitlab-ci.yml');
      } else {
        const content = gitlabCiContent(stack);
        getIO().fs.write(glFile, content);
        printResult('GitLab CI', true, `.gitlab-ci.yml`);
        generated.push('.gitlab-ci.yml');
      }
    } else {
      printLine(`[DRY-RUN] Criaria: .gitlab-ci.yml`);
      generated.push('.gitlab-ci.yml (dry-run)');
    }
  }

  const ok = generated.length > 0;
  finish({
    checkpoint: 'ci_generate',
    ok,
    status: ok ? 'passed' : 'failed',
    context_summary: ok
      ? `Gerado(s): ${generated.join(', ')}${skipped.length > 0 ? `. Pulado(s): ${skipped.join(', ')}` : ''}`
      : 'Nenhum arquivo gerado.',
    data: { generated, skipped },
  });
}

export { githubWorkflowContent, gitlabCiContent };
