/**
 * Adapter Runtime poliglota (R31 / R35).
 *
 * Centraliza o registro e a descoberta de {@link LangRunner}, executa
 * comandos de forma agnóstica e expõe `detect(cwd)` (wrapper
 * retrocompatível de `detectStack`) e `getQualityGates(cwd)` com fallback
 * Node.js (integração segura com engineer-mode / orchestrator).
 *
 * @module runtime/adapter-runtime
 */

import { promises as fsp } from 'node:fs';
import fs from 'node:fs';
import path from 'node:path';
import { detectLanguages } from './stack-detector';
import {
  AdapterCommandId,
  AdapterManifest,
  AdapterResult,
  LanguageId,
  LangRunner,
  readAdapterManifest,
  RunOptions,
  RunStatus,
} from './adapter-contract';
import { hasMarker } from './runners/base-runner';
import { NodeRunner } from './runners/node-runner';
import { PythonRunner } from './runners/python-runner';
import { GoRunner } from './runners/go-runner';
import { JVMRunner } from './runners/jvm-runner';
import { ReactRunner } from './runners/react-runner';
import { VueRunner } from './runners/vue-runner';
import { ReactNativeRunner } from './runners/react-native-runner';
import { FlutterRunner } from './runners/flutter-runner';
import { RubyRunner } from './runners/ruby-runner';
import { PHPRunner } from './runners/php-runner';
import { SwiftRunner } from './runners/swift-runner';
import { RustRunner } from './runners/rust-runner';
import { DartRunner } from './runners/dart-runner';
import { ElixirRunner } from './runners/elixir-runner';
import { HaskellRunner } from './runners/haskell-runner';
import { ZigRunner } from './runners/zig-runner';

/** Resultado da detecção poliglota. */
export interface DetectionResult {
  /** Linguagem primária (primeira detectada). */
  primary: LanguageId | null;
  /** Todas as linguagens com runner disponível. */
  languages: LanguageId[];
  /** Nomes crus retornados por `detectLanguages`. */
  raw: string[];
}

/** Mapa nome cru → LanguageId. */
const NAME_TO_LANG: Record<string, LanguageId> = {
  'Node.js': LanguageId.Node,
  TypeScript: LanguageId.TypeScript,
  JavaScript: LanguageId.JavaScript,
  Python: LanguageId.Python,
  Go: LanguageId.Go,
  Rust: LanguageId.Rust,
  Java: LanguageId.Java,
  Kotlin: LanguageId.Kotlin,
  Ruby: LanguageId.Ruby,
  PHP: LanguageId.PHP,
  Swift: LanguageId.Swift,
  'C#': LanguageId.CSharp,
  Dart: LanguageId.Dart,
  Elixir: LanguageId.Elixir,
  Haskell: LanguageId.Haskell,
  Zig: LanguageId.Zig,
  React: LanguageId.React,
  Vue: LanguageId.Vue,
};

/**
 * Runtime de adapters poliglotas.
 *
 * @example
 * ```ts
 * const rt = new AdapterRuntime();
 * const langs = rt.detect('./meu-projeto-go');
 * const res = await rt.execute(LanguageId.Go, AdapterCommandId.Test, './meu-projeto-go');
 * ```
 */
export class AdapterRuntime {
  /** Registros de runners por linguagem. */
  private readonly registry: Map<LanguageId, LangRunner> = new Map();

  /** Adapters scaffold-only (sem runner, apenas generateProject). */
  private scaffoldAdapters: Map<string, AdapterManifest> = new Map();

  /** Cria o runtime e registra os runners padrão. */
  public constructor() {
    this.register(new NodeRunner());
    this.register(new PythonRunner());
    this.register(new GoRunner());
    this.register(new JVMRunner());
    this.register(new ReactRunner());
    this.register(new VueRunner());
    this.register(new ReactNativeRunner());
    this.register(new FlutterRunner());
    this.register(new RubyRunner());
    this.register(new PHPRunner());
    this.register(new SwiftRunner());
    this.register(new RustRunner());
    this.register(new DartRunner());
    this.register(new ElixirRunner());
    this.register(new HaskellRunner());
    this.register(new ZigRunner());
  }

  /**
   * Registra um runner.
   * @param runner - Runner a registrar.
   */
  public register(runner: LangRunner): void {
    this.registry.set(runner.language, runner);
  }

  /**
   * Remove um runner da linguagem.
   * @param language - Linguagem a remover.
   */
  public unregister(language: LanguageId): void {
    this.registry.delete(language);
  }

  /**
   * Lista linguagens com runner disponível.
   * @returns Identificadores de linguagem.
   */
  public getSupportedLanguages(): LanguageId[] {
    return [...this.registry.keys()];
  }

  /**
   * Retorna o runner de uma linguagem.
   * @param language - Linguagem.
   * @returns Runner ou undefined.
   */
  public getRunner(language: LanguageId): LangRunner | undefined {
    return this.registry.get(language);
  }

  /**
   * Lista runners registrados.
   * @returns Array de runners.
   */
  public listRunners(): LangRunner[] {
    return [...this.registry.values()];
  }

  /**
   * Detecta linguagens no diretório (wrapper de `detectStack`/detectLanguages).
   * @param cwd - Diretório de trabalho.
   * @returns Resultado de detecção poliglota.
   */
  public detect(cwd: string): DetectionResult {
    const raw = detectLanguages(cwd);
    const languages = raw
      .map((name: string): LanguageId | undefined => NAME_TO_LANG[name])
      .filter((lang): lang is LanguageId => lang !== undefined && this.registry.has(lang));
    return {
      primary: languages[0] ?? null,
      languages,
      raw,
    };
  }

  /**
   * Executa um comando em uma linguagem.
   * @param language - Linguagem alvo.
   * @param command - Comando.
   * @param cwd - Diretório de trabalho.
   * @param opts - Opções de execução.
   * @returns Resultado normalizado (Skipped se sem runner).
   */
  public async execute(
    language: LanguageId,
    command: AdapterCommandId,
    cwd: string,
    opts?: RunOptions,
  ): Promise<AdapterResult> {
    const runner = this.registry.get(language);
    if (!runner) {
      return {
        command,
        language,
        status: RunStatus.Skipped,
        exitCode: 0,
        stdout: '',
        stderr: '',
        durationMs: 0,
        cwd,
        commandLine: `execute ${command} (${language})`,
        error: `Nenhum runner registrado para ${language}`,
      };
    }
    switch (command) {
      case AdapterCommandId.Init:
        return runner.init(cwd, opts);
      case AdapterCommandId.Lint:
        return runner.lint(cwd, opts);
      case AdapterCommandId.Test:
        return runner.test(cwd, opts);
      case AdapterCommandId.Build:
        return runner.build(cwd, opts);
      case AdapterCommandId.Compile:
        return runner.compile(cwd, opts);
      case AdapterCommandId.QualityGate:
        return runner.qualityGate(cwd, opts);
      default:
        return runner.detect(cwd)
          ? {
              command,
              language,
              status: RunStatus.Success,
              exitCode: 0,
              stdout: 'detected',
              stderr: '',
              durationMs: 0,
              cwd,
              commandLine: `detect ${language}`,
            }
          : {
              command,
              language,
              status: RunStatus.Skipped,
              exitCode: 0,
              stdout: '',
              stderr: '',
              durationMs: 0,
              cwd,
              commandLine: `detect ${language}`,
            };
    }
  }

  /**
   * Executa portões de qualidade para todas as linguagens detectadas.
   * Fallback para Node.js quando nenhuma linguagem é detectada.
   * @param cwd - Diretório de trabalho.
   * @param opts - Opções de execução.
   * @returns Resultados por linguagem.
   */
  public async getQualityGates(cwd: string, opts?: RunOptions): Promise<AdapterResult[]> {
    const { languages } = this.detect(cwd);
    const targets = languages.length > 0 ? languages : [LanguageId.Node];
    const results: AdapterResult[] = [];
    for (const lang of targets) {
      results.push(await this.execute(lang, AdapterCommandId.QualityGate, cwd, opts));
    }
    return results;
  }

  /**
   * Descobre e registra adapters a partir de manifestos `adapter.json`.
   * Adaptadores sem runner registrado são marcados como scaffold-only.
   * @param packagesDir - Diretório `packages/` do monorepo.
   * @returns Manifests lidos (independente de terem runner implementado).
   */
  public async discoverAdapters(packagesDir: string): Promise<AdapterManifest[]> {
    const manifests: AdapterManifest[] = [];
    let entries: fs.Dirent[];
    try {
      entries = await fsp.readdir(packagesDir, { withFileTypes: true });
    } catch {
      return manifests;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith('adapter-')) continue;
      const manifestPath = path.join(packagesDir, entry.name, 'adapter.json');
      try {
        const manifest = await readAdapterManifest(manifestPath);
        manifests.push(manifest);
        if (!this.registry.has(manifest.language)) {
          this.scaffoldAdapters.set(manifest.id, manifest);
        }
      } catch {
        /* adapter sem manifesto válido — ignora */
      }
    }
    return manifests;
  }

  /**
   * Lista linguagens disponíveis para scaffold (geração de projeto).
   * @returns IDs de linguagem scaffold-only.
   */
  public getScaffoldableLanguages(): LanguageId[] {
    return [...this.scaffoldAdapters.values()].map(m => m.language);
  }

  /**
   * Lista todas as linguagens suportadas (runners + scaffold).
   * @returns IDs de linguagem.
   */
  public getAllSupportedLanguages(): LanguageId[] {
    const runners = [...this.registry.keys()];
    const scaffolds = this.getScaffoldableLanguages();
    return [...new Set([...runners, ...scaffolds])];
  }

  /**
   * Gera um scaffold de projeto usando um adapter package.
   * @param language - Linguagem alvo.
   * @param name - Nome do projeto.
   * @param directory - Diretório de saída.
   * @param template - Template opcional.
   * @returns Caminho do projeto gerado.
   */
  public async generateScaffold(
    language: LanguageId,
    name: string,
    directory: string,
    template?: string,
  ): Promise<string> {
    const packagesDir = path.resolve(process.cwd(), 'packages');
    let entries: fs.Dirent[];
    try {
      entries = await fsp.readdir(packagesDir, { withFileTypes: true });
    } catch {
      throw new Error(`Diretório packages/ não encontrado em ${packagesDir}`);
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith('adapter-')) continue;
      const manifestPath = path.join(packagesDir, entry.name, 'adapter.json');
      let manifest: AdapterManifest;
      try {
        manifest = JSON.parse(await fsp.readFile(manifestPath, 'utf-8')) as AdapterManifest;
      } catch { continue; }
      if (manifest.language !== language) continue;
      const entryPoint = path.join(packagesDir, entry.name, 'dist', 'index.js');
      try {
        const adapter = require(entryPoint);
        if (typeof adapter.generateProject !== 'function') {
          throw new Error(`adapter ${entry.name} não exporta generateProject`);
        }
        await adapter.generateProject({ name, directory, template });
        return path.join(directory, name);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Falha ao gerar scaffold via ${entry.name}: ${msg}`);
      }
    }
    throw new Error(`Nenhum adapter encontrado para linguagem ${language}`);
  }

  /**
   * Verifica se a linguagem tem runner registrado (usado por generators).
   * @param language - Linguagem.
   * @returns Verdadeiro se suportada.
   */
  public isSupported(language: LanguageId): boolean {
    return this.registry.has(language);
  }
}

/** Instância singleton padrão do runtime. */
export const defaultRuntime = new AdapterRuntime();

export { hasMarker };
