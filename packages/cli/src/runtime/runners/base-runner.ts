/**
 * Runner base para adapters poliglotas.
 *
 * Implementa {@link LangRunner} a partir de uma configuração declarativa de
 * comandos, centralizando execução em subprocesso, timeout (R35), detecção por
 * marcadores de arquivo e geração do resultado normalizado
 * {@link AdapterResult}.
 *
 * @module runtime/runners/base-runner
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  AdapterCommand,
  AdapterCommandId,
  AdapterResult,
  DEFAULT_TIMEOUT_MS,
  execCommand,
  LanguageId,
  LangRunner,
  RunOptions,
  RunStatus,
} from '../adapter-contract';

/** Especificação de um comando dentro de um runner. */
export interface RunnerCommandSpec {
  /** Vetor comando + argumentos base. */
  argv: string[];
  /** Rótulo legível. */
  label: string;
  /** Descrição curta. */
  description: string;
  /** Se ausente/binário faltar, vira {@link RunStatus.Skipped}. */
  optional?: boolean;
}

/** Configuração de um runner derivado de {@link BaseRunner}. */
export interface RunnerConfig {
  /** Linguagem primária. */
  language: LanguageId;
  /** Nome legível. */
  name: string;
  /** Aliases aceitos na detecção. */
  aliases: string[];
  /** Padrões de arquivo que indicam a linguagem. */
  markers: string[];
  /** Comandos por id (quaisquer subset). */
  commands: Partial<Record<AdapterCommandId, RunnerCommandSpec>>;
}

/** Profundidade máxima de varredura de marcadores. */
const MARKER_WALK_DEPTH = 3;

/**
 * Runner base abstrato.
 *
 * @example
 * ```ts
 * class GoRunner extends BaseRunner {
 *   constructor() {
 *     super({
 *       language: LanguageId.Go,
 *       name: 'Go Runner',
 *       aliases: ['go', 'golang'],
 *       markers: ['go.mod'],
 *       commands: { test: { argv: ['go','test','./...'], label:'Test', description:'' } },
 *     });
 *   }
 * }
 * ```
 */
export abstract class BaseRunner implements LangRunner {
  /** Linguagem primária. */
  public readonly language: LanguageId;
  /** Nome legível. */
  public readonly name: string;
  /** Aliases aceitos na detecção. */
  public readonly aliases: string[];
  /** Configuração interna. */
  protected readonly config: RunnerConfig;

  /**
   * @param config - Configuração do runner.
   */
  public constructor(config: RunnerConfig) {
    this.config = config;
    this.language = config.language;
    this.name = config.name;
    this.aliases = config.aliases;
  }

  /**
   * Detecta se a stack em `cwd` corresponde a esta linguagem.
   * @param cwd - Diretório de trabalho.
   * @returns Verdadeiro se algum marcador for encontrado.
   */
  public detect(cwd: string): boolean {
    return this.config.markers.some((marker) => hasMarker(cwd, marker));
  }

  /**
   * Executa um comando declarado.
   * @param id - Identificador do comando.
   * @param cwd - Diretório de trabalho.
   * @param opts - Opções de execução.
   * @returns Resultado normalizado.
   */
  public async runCommand(id: AdapterCommandId, cwd: string, opts: RunOptions = {}): Promise<AdapterResult> {
    const spec = this.config.commands[id];
    const effCwd = opts.cwd ?? cwd;
    const commandLine = spec ? [spec.argv.join(' '), ...(opts.args ?? [])].join(' ') : `${id} (n/a)`;
    if (!spec) {
      return this.skipped(id, effCwd, commandLine, `Comando '${id}' não suportado por ${this.name}`);
    }
    const argv = [...spec.argv, ...(opts.args ?? [])];
    const start = Date.now();
    let out;
    try {
      out = await execCommand(argv, effCwd, { timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS, env: opts.env });
    } catch (_err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        command: id,
        language: this.language,
        status: RunStatus.Failure,
        exitCode: 1,
        stdout: '',
        stderr: message,
        durationMs: Date.now() - start,
        cwd: effCwd,
        commandLine,
        error: message,
      };
    }
    const durationMs = Date.now() - start;
    const status = out.timedOut
      ? RunStatus.Timeout
      : out.exitCode === 0
        ? RunStatus.Success
        : spec.optional
          ? RunStatus.Skipped
          : RunStatus.Failure;
    return {
      command: id,
      language: this.language,
      status,
      exitCode: out.exitCode,
      stdout: out.stdout,
      stderr: out.stderr,
      durationMs,
      cwd: effCwd,
      commandLine,
      error: status === RunStatus.Success ? undefined : out.stderr || out.stdout || 'command failed',
    };
  }

  /** @inheritdoc */
  public init(cwd: string, opts?: RunOptions): Promise<AdapterResult> {
    return this.runCommand(AdapterCommandId.Init, cwd, opts);
  }

  /** @inheritdoc */
  public lint(cwd: string, opts?: RunOptions): Promise<AdapterResult> {
    return this.runCommand(AdapterCommandId.Lint, cwd, opts);
  }

  /** @inheritdoc */
  public test(cwd: string, opts?: RunOptions): Promise<AdapterResult> {
    return this.runCommand(AdapterCommandId.Test, cwd, opts);
  }

  /** @inheritdoc */
  public build(cwd: string, opts?: RunOptions): Promise<AdapterResult> {
    return this.runCommand(AdapterCommandId.Build, cwd, opts);
  }

  /** @inheritdoc */
  public compile(cwd: string, opts?: RunOptions): Promise<AdapterResult> {
    return this.runCommand(AdapterCommandId.Compile, cwd, opts);
  }

  /**
   * Portão de qualidade: executa lint quando disponível, senão build.
   * @param cwd - Diretório de trabalho.
   * @param opts - Opções de execução.
   * @returns Resultado do comando de portão.
   */
  public async qualityGate(cwd: string, opts?: RunOptions): Promise<AdapterResult> {
    if (this.config.commands[AdapterCommandId.QualityGate]) {
      return this.runCommand(AdapterCommandId.QualityGate, cwd, opts);
    }
    if (this.config.commands[AdapterCommandId.Lint]) {
      return this.runCommand(AdapterCommandId.Lint, cwd, opts);
    }
    return this.runCommand(AdapterCommandId.Build, cwd, opts);
  }

  /** @inheritdoc */
  public commands(): AdapterCommand[] {
    const ids = Object.keys(this.config.commands) as AdapterCommandId[];
    const list: AdapterCommand[] = ids.map((id) => {
      const spec = this.config.commands[id] as RunnerCommandSpec;
      return {
        id,
        label: spec.label,
        description: spec.description,
        run: (cwd: string, opts?: RunOptions) => this.runCommand(id, cwd, opts),
      };
    });
    list.push({
      id: AdapterCommandId.Detect,
      label: 'Detect',
      description: 'Verifica se a stack pertence a esta linguagem',
      run: (cwd: string) => Promise.resolve(this.detectResult(cwd)),
    });
    return list;
  }

  /**
   * Constroi um resultado "skipped".
   * @param id - Comando.
   * @param cwd - Diretório.
   * @param commandLine - Linha.
   * @param error - Motivo.
   * @returns Resultado skipped.
   */
  protected skipped(id: AdapterCommandId, cwd: string, commandLine: string, error: string): AdapterResult {
    return {
      command: id,
      language: this.language,
      status: RunStatus.Skipped,
      exitCode: 0,
      stdout: '',
      stderr: '',
      durationMs: 0,
      cwd,
      commandLine,
      error,
    };
  }

  /**
   * Resultado do comando detect.
   * @param cwd - Diretório.
   * @returns Resultado success/skipped.
   */
  protected detectResult(cwd: string): AdapterResult {
    const found = this.detect(cwd);
    return {
      command: AdapterCommandId.Detect,
      language: this.language,
      status: found ? RunStatus.Success : RunStatus.Skipped,
      exitCode: found ? 0 : 0,
      stdout: found ? `detected: ${this.name}` : 'not detected',
      stderr: '',
      durationMs: 0,
      cwd,
      commandLine: `detect ${this.name}`,
    };
  }
}

/**
 * Verifica se um marcador de arquivo existe em `cwd` (walk limitado).
 * @param root - Diretório base.
 * @param marker - Nome de arquivo ou padrão `*.<ext>` / `*.ext`.
 * @returns Verdadeiro se encontrado.
 */
export function hasMarker(root: string, marker: string): boolean {
  const isExtGlob = marker.startsWith('*.');
  const ext = isExtGlob ? marker.slice(1) : null;
  try {
    const walk = (dir: string, depth: number): boolean => {
      if (depth > MARKER_WALK_DEPTH) return false;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return false;
      }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
          if (walk(full, depth + 1)) return true;
        } else if (isExtGlob) {
          if (ext && entry.name.endsWith(ext)) return true;
        } else if (entry.name === marker) {
          return true;
        }
      }
      return false;
    };
    return walk(root, 0);
  } catch {
    return false;
  }
}
