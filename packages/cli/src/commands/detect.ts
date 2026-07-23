import { Command } from 'commander';
import path from 'node:path';

import { printHeader, printLine, finish } from "../utils/output";
import { getIO } from '../io';

/** Interface que define a estrutura de stack info. */
export interface StackInfo {
  languages: string[];
  frameworks: string[];
  packageManager: string | null;
  ciProviders: string[];
  buildTool: string | null;
  testFramework: string | null;
}

const STACK_FILE = '.ai/stack.json';

function hasFile(root: string, file: string): boolean {
  return getIO().fs.exists(path.join(root, file));
}

function readFile(root: string, file: string): string {
  try { return getIO().fs.read(path.join(root, file), 'utf8'); }
  catch (e) { console.error(`[detect] readFile failed: ${e instanceof Error ? e.message : String(e)}`); return ''; }
}

const _readDirCache = new Map<string, string[]>();

function hasGlob(root: string, pattern: string): boolean {
  try {
    const globPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
    let dir = _readDirCache.get(root);
    if (!dir) {
      dir = getIO().fs.readDir(root);
      _readDirCache.set(root, dir);
    }
    return dir.some((f: string) => new RegExp('^' + globPattern + '$').test(f));
  } catch { return false; }
}

const LANG_DETECTORS: Array<{ lang: string; files: string[]; globs?: string[] }> = [
  { lang: 'javascript', files: ['package.json'] },
  { lang: 'typescript', files: ['tsconfig.json', 'tsconfig.base.json'] },
  { lang: 'python', files: ['pyproject.toml', 'requirements.txt', 'setup.py', 'Pipfile'] },
  { lang: 'go', files: ['go.mod', 'go.sum'] },
  { lang: 'rust', files: ['Cargo.toml', 'Cargo.lock'] },
  { lang: 'cpp', files: ['CMakeLists.txt'], globs: ['*.cpp', '*.hpp', '*.cc'] },
  { lang: 'c', files: [], globs: ['*.c', '*.h'] },
  { lang: 'csharp', files: ['.sln', '*.csproj'], globs: ['*.cs'] },
  { lang: 'java', files: ['pom.xml', 'build.gradle', 'build.gradle.kts', 'settings.gradle'], globs: ['*.java'] },
  { lang: 'kotlin', files: ['build.gradle.kts', 'settings.gradle.kts'], globs: ['*.kt', '*.kts'] },
  { lang: 'scala', files: ['build.sbt'], globs: ['*.scala'] },
  { lang: 'ruby', files: ['Gemfile', 'Gemfile.lock', '*.gemspec'], globs: ['*.rb'] },
  { lang: 'php', files: ['composer.json', 'composer.lock'], globs: ['*.php'] },
  { lang: 'swift', files: ['Package.swift'], globs: ['*.swift'] },
  { lang: 'kotlin-mobile', files: [], globs: ['*.kt'] },
  { lang: 'dart', files: ['pubspec.yaml', 'pubspec.lock'], globs: ['*.dart'] },
  { lang: 'elixir', files: ['mix.exs', 'mix.lock'], globs: ['*.ex', '*.exs'] },
  { lang: 'erlang', files: ['rebar.config', 'erlang.mk'], globs: ['*.erl', '*.hrl'] },
  { lang: 'clojure', files: ['project.clj', 'deps.edn'], globs: ['*.clj', '*.cljs'] },
  { lang: 'haskell', files: ['*.cabal', 'stack.yaml', 'package.yaml'], globs: ['*.hs'] },
  { lang: 'zig', files: ['build.zig', 'build.zig.zon'], globs: ['*.zig'] },
  { lang: 'nim', files: ['*.nimble', 'nim.cfg'], globs: ['*.nim'] },
  { lang: 'odin', files: ['odin.json'], globs: ['*.odin'] },
  { lang: 'ada', files: [], globs: ['*.adb', '*.ads'] },
  { lang: 'fortran', files: [], globs: ['*.f90', '*.f95', '*.f03', '*.f'] },
  { lang: 'cobol', files: [], globs: ['*.cbl', '*.cob', '*.cpy'] },
  { lang: 'perl', files: ['Makefile.PL', 'Build.PL', 'cpanfile'], globs: ['*.pl', '*.pm'] },
  { lang: 'lua', files: [], globs: ['*.lua'] },
  { lang: 'r', files: ['DESCRIPTION', 'NAMESPACE'], globs: ['*.R', '*.r'] },
  { lang: 'julia', files: ['Project.toml', 'Manifest.toml'], globs: ['*.jl'] },
  { lang: 'matlab', files: [], globs: ['*.m'] },
  { lang: 'haxe', files: ['haxe.json', '*.hxml'], globs: ['*.hx'] },
  { lang: 'purescript', files: ['spago.dhall', 'psc-package.json'], globs: ['*.purs'] },
  { lang: 'rescript', files: ['rescript.json'], globs: ['*.res'] },
  { lang: 'solidity', files: ['hardhat.config.js', 'hardhat.config.ts', 'foundry.toml'], globs: ['*.sol'] },
  { lang: 'tcl', files: [], globs: ['*.tcl'] },
  { lang: 'racket', files: ['info.rkt'], globs: ['*.rkt'] },
  { lang: 'fsharp', files: ['*.fsproj'], globs: ['*.fs'] },
  { lang: 'objective-c', files: [], globs: ['*.m', '*.mm'] },
  { lang: 'groovy', files: [], globs: ['*.groovy', '*.gvy'] },
  { lang: 'crystal', files: ['shard.yml', 'shard.lock'], globs: ['*.cr'] },
  { lang: 'vlang', files: ['v.mod'], globs: ['*.v'] },
  { lang: 'mojo', files: [], globs: ['*.mojo', '*.🔥'] },
];

const PACKAGE_MANAGERS: Array<{ pm: string; files: string[] }> = [
  { pm: 'npm', files: ['package-lock.json'] },
  { pm: 'yarn', files: ['yarn.lock'] },
  { pm: 'pnpm', files: ['pnpm-lock.yaml'] },
  { pm: 'pip', files: ['requirements.txt', 'Pipfile.lock'] },
  { pm: 'poetry', files: ['poetry.lock'] },
  { pm: 'cargo', files: ['Cargo.lock'] },
  { pm: 'go-modules', files: ['go.sum'] },
  { pm: 'bundler', files: ['Gemfile.lock'] },
  { pm: 'composer', files: ['composer.lock'] },
  { pm: 'gradle', files: ['build.gradle', 'build.gradle.kts'] },
  { pm: 'maven', files: ['pom.xml'] },
  { pm: 'sbt', files: ['build.sbt'] },
  { pm: 'mix', files: ['mix.lock'] },
  { pm: 'nuget', files: ['packages.config'] },
  { pm: 'pub', files: ['pubspec.lock'] },
  { pm: 'swift-pm', files: ['Package.resolved'] },
  { pm: 'julia-pm', files: ['Manifest.toml'] },
  { pm: 'cpan', files: ['cpanfile.snapshot'] },
  { pm: 'luarocks', files: ['*.rockspec'] },
  { pm: 'conan', files: ['conanfile.txt', 'conanfile.py'] },
  { pm: 'vcpkg', files: ['vcpkg.json'] },
];

const BUILD_TOOLS: Record<string, Array<{ file: string; tool: string }>> = {
  typescript: [{ file: 'tsconfig.json', tool: 'typescript' }],
  go: [{ file: 'go.mod', tool: 'go' }],
  rust: [{ file: 'Cargo.toml', tool: 'cargo' }],
  java: [
    { file: 'pom.xml', tool: 'maven' },
    { file: 'build.gradle', tool: 'gradle' },
    { file: 'build.gradle.kts', tool: 'gradle' },
  ],
  cpp: [{ file: 'CMakeLists.txt', tool: 'cmake' }],
  csharp: [{ file: '.sln', tool: 'dotnet' }],
  python: [{ file: 'pyproject.toml', tool: 'python' }, { file: 'setup.py', tool: 'python' }],
  ruby: [{ file: 'Rakefile', tool: 'rake' }, { file: 'Gemfile', tool: 'bundler' }],
  dart: [{ file: 'pubspec.yaml', tool: 'dart' }],
  swift: [{ file: 'Package.swift', tool: 'swift' }],
  zig: [{ file: 'build.zig', tool: 'zig' }],
  nim: [{ file: '*.nimble', tool: 'nim' }],
  haskell: [{ file: 'stack.yaml', tool: 'stack' }, { file: '*.cabal', tool: 'cabal' }],
};

const FRAMEWORK_DETECTORS: Array<{ lang: string; file: string; pattern: RegExp; framework: string }> = [
  { lang: 'javascript', file: 'package.json', pattern: /@nestjs\/core/, framework: 'nestjs' },
  { lang: 'javascript', file: 'package.json', pattern: /express/, framework: 'express' },
  { lang: 'javascript', file: 'package.json', pattern: /fastify/, framework: 'fastify' },
  { lang: 'javascript', file: 'package.json', pattern: /next\b/, framework: 'nextjs' },
  { lang: 'javascript', file: 'package.json', pattern: /nuxt/, framework: 'nuxt' },
  { lang: 'javascript', file: 'package.json', pattern: /vue/, framework: 'vue' },
  { lang: 'javascript', file: 'package.json', pattern: /react/, framework: 'react' },
  { lang: 'javascript', file: 'package.json', pattern: /angular/, framework: 'angular' },
  { lang: 'javascript', file: 'package.json', pattern: /svelte/, framework: 'svelte' },
  { lang: 'python', file: 'requirements.txt', pattern: /django/, framework: 'django' },
  { lang: 'python', file: 'requirements.txt', pattern: /flask/, framework: 'flask' },
  { lang: 'python', file: 'requirements.txt', pattern: /fastapi/, framework: 'fastapi' },
  { lang: 'python', file: 'pyproject.toml', pattern: /fastapi/, framework: 'fastapi' },
  { lang: 'python', file: 'requirements.txt', pattern: /tornado/, framework: 'tornado' },
  { lang: 'python', file: 'requirements.txt', pattern: /bottle/, framework: 'bottle' },
  { lang: 'ruby', file: 'Gemfile', pattern: /rails/, framework: 'rails' },
  { lang: 'ruby', file: 'Gemfile', pattern: /sinatra/, framework: 'sinatra' },
  { lang: 'php', file: 'composer.json', pattern: /laravel/, framework: 'laravel' },
  { lang: 'php', file: 'composer.json', pattern: /symfony/, framework: 'symfony' },
  { lang: 'php', file: 'composer.json', pattern: /cakephp/, framework: 'cakephp' },
  { lang: 'java', file: 'pom.xml', pattern: /spring-boot/, framework: 'spring-boot' },
  { lang: 'java', file: 'build.gradle', pattern: /spring/, framework: 'spring-boot' },
  { lang: 'java', file: 'pom.xml', pattern: /quarkus/, framework: 'quarkus' },
  { lang: 'java', file: 'pom.xml', pattern: /micronaut/, framework: 'micronaut' },
  { lang: 'java', file: 'build.gradle', pattern: /micronaut/, framework: 'micronaut' },
  { lang: 'java', file: 'pom.xml', pattern: /jakarta/, framework: 'jakarta-ee' },
  { lang: 'kotlin', file: 'build.gradle.kts', pattern: /spring/, framework: 'spring-boot' },
  { lang: 'kotlin', file: 'build.gradle.kts', pattern: /ktor/, framework: 'ktor' },
  { lang: 'elixir', file: 'mix.exs', pattern: /phoenix/, framework: 'phoenix' },
  { lang: 'elixir', file: 'mix.exs', pattern: /plug/, framework: 'plug' },
  { lang: 'dart', file: 'pubspec.yaml', pattern: /flutter/, framework: 'flutter' },
  { lang: 'scala', file: 'build.sbt', pattern: /play/, framework: 'play' },
  { lang: 'scala', file: 'build.sbt', pattern: /http4s/, framework: 'http4s' },
  { lang: 'haskell', file: '*.cabal', pattern: /warp/, framework: 'warp' },
  { lang: 'haskell', file: 'stack.yaml', pattern: /yesod/, framework: 'yesod' },
  { lang: 'cpp', file: 'CMakeLists.txt', pattern: /drogon/, framework: 'drogon' },
  { lang: 'cpp', file: 'CMakeLists.txt', pattern: /boost/, framework: 'boost' },
  { lang: 'rust', file: 'Cargo.toml', pattern: /axum/, framework: 'axum' },
  { lang: 'rust', file: 'Cargo.toml', pattern: /actix-web/, framework: 'actix-web' },
  { lang: 'rust', file: 'Cargo.toml', pattern: /rocket/, framework: 'rocket' },
  { lang: 'rust', file: 'Cargo.toml', pattern: /tokio/, framework: 'tokio' },
  { lang: 'csharp', file: '.csproj', pattern: /microsoft/, framework: 'aspnet-core' },
  { lang: 'csharp', file: '.csproj', pattern: /blazor/, framework: 'blazor' },
  { lang: 'csharp', file: '.csproj', pattern: /xamarin/, framework: 'xamarin' },
  { lang: 'go', file: 'go.mod', pattern: /gin/, framework: 'gin' },
  { lang: 'go', file: 'go.mod', pattern: /echo/, framework: 'echo' },
  { lang: 'go', file: 'go.mod', pattern: /fiber/, framework: 'fiber' },
  { lang: 'go', file: 'go.mod', pattern: /chi/, framework: 'chi' },
  { lang: 'swift', file: 'Package.swift', pattern: /vapor/, framework: 'vapor' },
  { lang: 'clojure', file: 'project.clj', pattern: /ring/, framework: 'ring' },
  { lang: 'clojure', file: 'deps.edn', pattern: /ring/, framework: 'ring' },
];

const TEST_FRAMEWORKS: Array<{ lang: string; file: string; pattern: RegExp; tf: string }> = [
  { lang: 'javascript', file: 'package.json', pattern: /jest/, tf: 'jest' },
  { lang: 'javascript', file: 'package.json', pattern: /vitest/, tf: 'vitest' },
  { lang: 'javascript', file: 'package.json', pattern: /mocha/, tf: 'mocha' },
  { lang: 'javascript', file: 'package.json', pattern: /jasmine/, tf: 'jasmine' },
  { lang: 'javascript', file: 'package.json', pattern: /ava/, tf: 'ava' },
  { lang: 'python', file: 'requirements.txt', pattern: /pytest/, tf: 'pytest' },
  { lang: 'python', file: 'pyproject.toml', pattern: /pytest/, tf: 'pytest' },
  { lang: 'java', file: 'pom.xml', pattern: /junit/, tf: 'junit' },
  { lang: 'java', file: 'build.gradle', pattern: /junit/, tf: 'junit' },
  { lang: 'kotlin', file: 'build.gradle.kts', pattern: /kotlin.test/, tf: 'kotlin-test' },
  { lang: 'kotlin', file: 'build.gradle.kts', pattern: /spek/, tf: 'spek' },
  { lang: 'ruby', file: 'Gemfile', pattern: /rspec/, tf: 'rspec' },
  { lang: 'ruby', file: 'Gemfile', pattern: /minitest/, tf: 'minitest' },
  { lang: 'php', file: 'composer.json', pattern: /phpunit/, tf: 'phpunit' },
  { lang: 'php', file: 'composer.json', pattern: /pest/, tf: 'pest' },
  { lang: 'go', file: 'go.mod', pattern: /testify/, tf: 'testify' },
  { lang: 'rust', file: 'Cargo.toml', pattern: /rstest/, tf: 'rstest' },
  { lang: 'cpp', file: 'CMakeLists.txt', pattern: /gtest/, tf: 'googletest' },
  { lang: 'cpp', file: 'CMakeLists.txt', pattern: /catch2/, tf: 'catch2' },
  { lang: 'csharp', file: '.csproj', pattern: /xunit/, tf: 'xunit' },
  { lang: 'csharp', file: '.csproj', pattern: /nunit/, tf: 'nunit' },
  { lang: 'csharp', file: '.csproj', pattern: /mstest/, tf: 'mstest' },
  { lang: 'scala', file: 'build.sbt', pattern: /scalatest/, tf: 'scalatest' },
  { lang: 'haskell', file: '*.cabal', pattern: /hspec/, tf: 'hspec' },
  { lang: 'dart', file: 'pubspec.yaml', pattern: /test/, tf: 'dart-test' },
  { lang: 'elixir', file: 'mix.exs', pattern: /ex_unit/, tf: 'exunit' },
];

function detectLangFiles(cwd: string): string[] {
  const detected: string[] = [];
  for (const entry of LANG_DETECTORS) {
    if (entry.files.some(f => f.includes('*') ? hasGlob(cwd, f) : hasFile(cwd, f))) {
      if (!detected.includes(entry.lang)) detected.push(entry.lang);
      continue;
    }
    if (entry.globs && entry.globs.some(g => hasGlob(cwd, g))) {
      if (!detected.includes(entry.lang)) detected.push(entry.lang);
    }
  }
  return detected;
}

function detectPackageManager(cwd: string, _langs: string[]): string | null {
  for (const entry of PACKAGE_MANAGERS) {
    if (entry.files.some(f => f.includes('*') ? hasGlob(cwd, f) : hasFile(cwd, f))) {
      return entry.pm;
    }
  }
  return null;
}

function detectBuildTool(cwd: string, _langs: string[]): string | null {
  for (const lang of _langs) {
    const tools = BUILD_TOOLS[lang];
    if (tools) {
      for (const t of tools) {
        if (t.file.includes('*') ? hasGlob(cwd, t.file) : hasFile(cwd, t.file)) {
          return t.tool;
        }
      }
    }
  }
  return null;
}

function detectFrameworks(cwd: string, langs: string[]): string[] {
  const frameworks: string[] = [];
  for (const entry of FRAMEWORK_DETECTORS) {
    if (!langs.includes(entry.lang)) continue;
    const content = readFile(cwd, entry.file);
    if (entry.pattern.test(content) && !frameworks.includes(entry.framework)) {
      frameworks.push(entry.framework);
    }
  }
  return frameworks;
}

function detectTestFramework(cwd: string, langs: string[]): string | null {
  for (const entry of TEST_FRAMEWORKS) {
    if (!langs.includes(entry.lang)) continue;
    const content = readFile(cwd, entry.file);
    if (entry.pattern.test(content)) return entry.tf;
  }
  return null;
}

/**
 * Detecta stack.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function detectStack(root?: string): StackInfo {
  const cwd = root || process.cwd();
  // _readDirCache is populated by hasGlob calls in dependent functions
  const languages = detectLangFiles(cwd);

  const mergedLangs = [...new Set(languages)];

  const frameworks = detectFrameworks(cwd, mergedLangs);

  return {
    languages: mergedLangs,
    frameworks,
    packageManager: detectPackageManager(cwd, mergedLangs),
    ciProviders: [
      ...(hasFile(cwd, '.github/workflows') ? ['github-actions'] : []),
      ...(hasFile(cwd, '.gitlab-ci.yml') ? ['gitlab-ci'] : []),
      ...(hasFile(cwd, 'Jenkinsfile') ? ['jenkins'] : []),
      ...(hasFile(cwd, '.circleci/config.yml') ? ['circleci'] : []),
      ...(hasFile(cwd, 'bitbucket-pipelines.yml') ? ['bitbucket'] : []),
      ...(hasFile(cwd, '.drone.yml') ? ['drone'] : []),
      ...(hasFile(cwd, 'azure-pipelines.yml') ? ['azure-devops'] : []),
    ],
    buildTool: detectBuildTool(cwd, mergedLangs),
    testFramework: detectTestFramework(cwd, mergedLangs),
  };
}

/**
 * Persiste stack.
 * @param root - Valor root.
 * @param info - Valor info.
 */
export function saveStack(root: string, info: StackInfo): void {
  const stackPath = path.join(root, STACK_FILE);
  const ioFs = getIO().fs;
  ioFs.mkDir(path.dirname(stackPath), true);
  const data = {
    detectedAt: new Date().toISOString(),
    ...info,
  };
  ioFs.write(stackPath, JSON.stringify(data, null, 2));
}

/**
 * Detecta command.
 * @returns O resultado da operação.
 */
export function detectCommand(): Command {
  const cmd = new Command('detect')
    .description('Detecta a stack tecnologica do projeto atual');

  cmd
    .command('stack')
    .description('Detecta e exibe a stack do projeto')
    .action(() => {
      const root = process.cwd();
      const info = detectStack(root);
      saveStack(root, info);

      printHeader('Stack Detectada');
      printLine(`Linguagens: ${info.languages.join(', ') || 'nenhuma'}`);
      printLine(`Frameworks: ${info.frameworks.join(', ') || 'nenhum'}`);
      printLine(`Gerenciador de pacotes: ${info.packageManager || 'não detectado'}`);
      printLine(`Build tool: ${info.buildTool || 'não detectado'}`);
      printLine(`Test framework: ${info.testFramework || 'não detectado'}`);
      printLine(`CI providers: ${info.ciProviders.join(', ') || 'nenhum'}`);

      const ok = info.languages.length > 0;
      finish({
        checkpoint: 'detect',
        ok,
        status: ok ? 'passed' : 'failed',
        context_summary: ok
          ? `Stack detectada: ${info.languages.join(', ')}`
          : 'Nenhuma stack conhecida detectada.',
        data: info as unknown as Record<string, unknown>,
      });
    });

  cmd
    .command('list-languages')
    .description('Lista todas as 45+ linguagens detectaveis')
    .action(() => {
      printHeader('Linguagens Detectaveis');
      for (const entry of LANG_DETECTORS) {
        const files = entry.files.concat(entry.globs || []).slice(0, 3).join(', ');
        printLine(`  ${entry.lang.padEnd(18)} ${files}`);
      }
    });

  return cmd;
}