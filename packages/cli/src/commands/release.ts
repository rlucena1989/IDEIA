import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import path from 'node:path';

import { generateReleaseNotes, formatReleaseNotes } from '../release/notes';
import { prepareRelease } from '../release/preparer';
import { publishRelease } from '../release/publisher';
import { printHeader, printLine, printResult, finish } from "../utils/output";
import { getIO } from '../io';

function detectPackageManager(root: string): string {
  if (getIO().fs.exists(path.join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (getIO().fs.exists(path.join(root, 'yarn.lock'))) return 'yarn';
  return 'npm';
}

function dockerfileContent(): string {
  return `# Multi-stage Dockerfile gerado por ai-devkit
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
`;
}

function k8sDeploymentContent(name: string): string {
  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${name}
  labels:
    app: ${name}
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ${name}
  template:
    metadata:
      labels:
        app: ${name}
    spec:
      containers:
      - name: ${name}
        image: ${name}:latest
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
---
apiVersion: v1
kind: Service
metadata:
  name: ${name}
spec:
  selector:
    app: ${name}
  ports:
  - port: 80
    targetPort: 3000
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ${name}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${name}
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
`;
}

/**
 * Libera command.
 * @returns O resultado da operação.
 */
export function releaseCommand(): Command {
  const cmd = new Command('release')
    .description('Automacao de release, CI/CD e publicacao');

  cmd
    .command('prepare')
    .description('Prepara uma nova release (bump version, changelog, tag)')
    .requiredOption('-V, --ver <semver>', 'Versao semver (ex: 1.2.3)')
    .option('--dry-run', 'Simula sem modificar arquivos')
    .action((options: { ver: string; dryRun?: boolean }) => {
      const semverRegex = /^\d+\.\d+\.\d+$/;
      if (!semverRegex.test(options.ver)) {
        printResult('Erro', false, `Versao invalida: "${options.ver}". Use semver (ex: 1.2.3)`);
        finish({ checkpoint: 'release_prepare', ok: false, status: 'failed', context_summary: `Versao invalida: ${options.ver}` });
        return;
      }

      printHeader(`Preparando release v${options.ver}`);
      const result = prepareRelease(options.ver, options.dryRun);

      if (options.dryRun) {
        printLine(`[DRY-RUN] Versao: ${result.version}`);
        printLine(`[DRY-RUN] Tag: ${result.tag}`);
        printLine(`[DRY-RUN] Anterior: v${result.previousVersion}`);
        printLine(`[DRY-RUN] Commits desde ultima tag: ${result.commitsSinceLast}`);
      } else {
        printResult('Versao', true, result.version);
        printResult('Tag', true, result.tag);
        printResult('Changelog', true, result.changelogPath);
        printLine(`Commits desde v${result.previousVersion}: ${result.commitsSinceLast}`);
      }

      finish({
        checkpoint: 'release_prepare',
        ok: true,
        status: 'passed',
        context_summary: options.dryRun
          ? `[DRY-RUN] Release v${result.version} pronta`
          : `Release v${result.version} preparada — tag ${result.tag}`,
        data: { version: result.version, tag: result.tag, previousVersion: result.previousVersion, commitsSinceLast: result.commitsSinceLast, dryRun: !!options.dryRun },
      });
    });

  cmd
    .command('publish')
    .description('Publica release nos registros configurados')
    .option('--dry-run', 'Simula publicacao')
    .action((options: { dryRun?: boolean }) => {
      let version: string;
      try {
        const pkg = JSON.parse(getIO().fs.read(path.join(process.cwd(), 'package.json'), 'utf-8'));
        version = pkg.version;
      } catch (_e) {
        printResult('Erro', false, `Falha ao ler package.json: ${(_e as Error).message}`);
        finish({ checkpoint: 'release_publish', ok: false, status: 'failed', context_summary: 'Falha ao ler package.json' });
        return;
      }

      printHeader(`Publicando v${version}`);
      const result = publishRelease(version, options.dryRun);

      if (result.errors.length > 0) {
        for (const err of result.errors) printResult('Erro', false, err);
      }

      if (result.artifacts.length > 0) {
        for (const art of result.artifacts) printResult('Publicado', true, art);
      }

      finish({
        checkpoint: 'release_publish',
        ok: result.published,
        status: result.published ? 'passed' : 'failed',
        context_summary: result.published
          ? `${result.artifacts.length} artefato(s) publicado(s)`
          : `Falha na publicacao: ${result.errors.join('; ')}`,
        data: { version, published: result.published, artifacts: result.artifacts, errors: result.errors, dryRun: !!options.dryRun },
      });
    });

  cmd
    .command('notes')
    .description('Gera release notes automaticas entre tags')
    .option('-f, --from <tag>', 'Tag inicial', 'HEAD~10')
    .option('-t, --to <tag>', 'Tag final', 'HEAD')
    .option('-o, --out <file>', 'Arquivo de saida')
    .action((options: { from: string; to: string; out?: string }) => {
      printHeader(`Release Notes: ${options.from} → ${options.to}`);
      const notes = generateReleaseNotes(options.from, options.to);
      const formatted = formatReleaseNotes(notes);

      printLine(formatted);

      if (options.out) {
        const outPath = path.resolve(options.out);
        getIO().fs.write(outPath, formatted);
        printResult('Salvo', true, options.out);
      }

      finish({
        checkpoint: 'release_notes',
        ok: true,
        status: 'passed',
        context_summary: `Features: ${notes.features.length}, Fixes: ${notes.fixes.length}, Breaking: ${notes.breakingChanges.length}`,
        data: { from: options.from, to: options.to, features: notes.features.length, fixes: notes.fixes.length, breakingChanges: notes.breakingChanges.length },
      });
    });

  cmd
    .command('changelog')
    .description('Gera changelog a partir de commits convencionais')
    .option('-o, --out <file>', 'Arquivo de saida (default: stdout)', '')
    .action((options: { out: string }) => {
      printHeader('Gerando Changelog');
      let log = '';
      const logResult = getIO().shell.execString('git log --oneline --format="%s"');
      if (logResult.status === 0) log = logResult.stdout;

      const commits = log.split('\n').filter(Boolean);
      const features: string[] = [];
      const fixes: string[] = [];
      const breaking: string[] = [];
      const other: string[] = [];

      for (const commit of commits) {
        if (/^feat/i.test(commit) || /^feature/i.test(commit)) features.push(commit);
        else if (/^fix/i.test(commit)) fixes.push(commit);
        else if (/^breaking/i.test(commit) || /!:/i.test(commit)) breaking.push(commit);
        else other.push(commit);
      }

      const lines: string[] = [
        '# Changelog',
        `Gerado em: ${new Date().toISOString().split('T')[0]}`,
        '',
      ];

      if (breaking.length > 0) { lines.push('## Breaking Changes'); for (const b of breaking) lines.push(`- ${b}`); lines.push(''); }
      if (features.length > 0) { lines.push('## Features'); for (const f of features) lines.push(`- ${f}`); lines.push(''); }
      if (fixes.length > 0) { lines.push('## Bug Fixes'); for (const f of fixes) lines.push(`- ${f}`); lines.push(''); }
      if (other.length > 0) { lines.push('## Other'); for (const o of other) lines.push(`- ${o}`); lines.push(''); }

      const changelogContent = lines.join('\n');

      if (options.out) {
        getIO().fs.write(path.resolve(options.out), changelogContent);
        printResult('Changelog salvo', true, options.out);
      } else {
        printLine(changelogContent);
      }

      finish({
        checkpoint: 'release_changelog',
        ok: true,
        status: 'passed',
        context_summary: `${features.length} features, ${fixes.length} fixes, ${breaking.length} breaking`,
        data: { features: features.length, fixes: fixes.length, breaking: breaking.length, other: other.length },
      });
    });

  return cmd;
}

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function releasePipelineCommand(): Command {
  const cmd = new Command('pipeline')
    .description('Geracao e execucao de pipelines CI/CD');

  cmd
    .command('generate')
    .description('Gera pipelines CI/CD')
    .option('--github', 'Gera GitHub Actions')
    .option('--gitlab', 'Gera GitLab CI')
    .option('--docker', 'Gera Dockerfile multi-stage')
    .option('--k8s', 'Gera manifests Kubernetes')
    .option('--force', 'Sobrescreve arquivos existentes')
    .option('--dry-run', 'Mostra o que seria gerado sem escrever')
    .action((options: { github?: boolean; gitlab?: boolean; docker?: boolean; k8s?: boolean; force?: boolean; dryRun?: boolean }) => {
      const root = process.cwd();
      const all = !options.github && !options.gitlab && !options.docker && !options.k8s;
      const generated: string[] = [];
      const skipped: string[] = [];

      printHeader('Pipeline Generator');

      if (all || options.github) {
        const ghDir = path.join(root, '.github', 'workflows');
        const ghFile = path.join(ghDir, 'ci-pipeline.yml');
        if (!options.dryRun) {
          if (getIO().fs.exists(ghFile) && !options.force) {
            skipped.push('.github/workflows/ci-pipeline.yml');
          } else {
            const pkgManager = detectPackageManager(root);
            const installCmd = pkgManager === 'pnpm'
              ? 'npm install -g pnpm && pnpm install --frozen-lockfile'
              : pkgManager === 'yarn' ? 'yarn install --frozen-lockfile' : 'npm ci';
            const content = `name: CI Pipeline

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: '${pkgManager}'
      - run: ${installCmd}
      - run: npm run build --if-present
      - run: npm test --if-present
`;
            getIO().fs.mkDir(ghDir, true);
            getIO().fs.write(ghFile, content);
            generated.push('.github/workflows/ci-pipeline.yml');
          }
        } else {
          generated.push('.github/workflows/ci-pipeline.yml (dry-run)');
        }
      }

      if (all || options.gitlab) {
        const glFile = path.join(root, '.gitlab-ci.yml');
        if (!options.dryRun) {
          if (getIO().fs.exists(glFile) && !options.force) {
            skipped.push('.gitlab-ci.yml');
          } else {
            const content = `stages:
  - build
  - test
  - deploy

variables:
  NODE_VERSION: "20"

build:
  stage: build
  image: node:\${NODE_VERSION}
  script:
    - npm ci
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
            getIO().fs.write(glFile, content);
            generated.push('.gitlab-ci.yml');
          }
        } else {
          generated.push('.gitlab-ci.yml (dry-run)');
        }
      }

      if (all || options.docker) {
        const dockerFile = path.join(root, 'Dockerfile');
        if (!options.dryRun) {
          if (getIO().fs.exists(dockerFile) && !options.force) {
            skipped.push('Dockerfile');
          } else {
            getIO().fs.write(dockerFile, dockerfileContent());
            generated.push('Dockerfile');
          }
        } else {
          generated.push('Dockerfile (dry-run)');
        }
      }

      if (all || options.k8s) {
        const k8sDir = path.join(root, 'k8s');
        const projectName = path.basename(root);
        if (!options.dryRun) {
          const k8sFile = path.join(k8sDir, 'deployment.yaml');
          if (getIO().fs.exists(k8sFile) && !options.force) {
            skipped.push('k8s/deployment.yaml');
          } else {
            getIO().fs.mkDir(k8sDir, true);
            getIO().fs.write(k8sFile, k8sDeploymentContent(projectName));
            generated.push('k8s/deployment.yaml');
          }
        } else {
          generated.push('k8s/deployment.yaml (dry-run)');
        }
      }

      for (const g of generated) printResult('Gerado', true, g);
      for (const s of skipped) printResult('Pulado', false, `${s} (use --force)`);

      const ok = generated.length > 0;
      finish({
        checkpoint: 'pipeline_generate',
        ok,
        status: ok ? 'passed' : 'failed',
        context_summary: ok
          ? `Gerado(s): ${generated.join(', ')}${skipped.length > 0 ? `. Pulado(s): ${skipped.join(', ')}` : ''}`
          : 'Nenhum arquivo gerado.',
        data: { generated, skipped },
      });
    });

  cmd
    .command('run')
    .description('Executa pipeline localmente (dry-run)')
    .argument('<workflow>', 'Nome do workflow')
    .action((workflow: string) => {
      printHeader(`Pipeline Run: ${workflow}`);
      printLine(`[DRY-RUN] Pipeline "${workflow}" executaria:`);
      printLine('  1. npm ci');
      printLine('  2. npm run build --if-present');
      printLine('  3. npm test --if-present');
      if (getIO().fs.exists(path.join(process.cwd(), 'Dockerfile'))) printLine('  4. docker build -t app .');
      printLine('');

      const _pkgManager = detectPackageManager(process.cwd());
      const steps: string[] = [];
      let allPassed = true;

      const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      steps.push('install');
      const ciResult = getIO().shell.execString(`${npmBin} ci`, process.cwd());
      if (ciResult.status === 0) {
        printResult('npm ci', true);
      } else {
        printResult('npm ci', false);
        allPassed = false;
      }

      steps.push('build');
      const buildResult = getIO().shell.execString(`${npmBin} run build --if-present`, process.cwd());
      if (buildResult.status === 0) {
        printResult('Build', true);
      } else {
        printResult('Build', false);
        allPassed = false;
      }

      finish({
        checkpoint: 'pipeline_run',
        ok: allPassed,
        status: allPassed ? 'passed' : 'failed',
        context_summary: allPassed ? `Pipeline "${workflow}" executou com sucesso` : `Pipeline "${workflow}" falhou`,
        data: { workflow, steps, allPassed },
      });
    });

  return cmd;
}
