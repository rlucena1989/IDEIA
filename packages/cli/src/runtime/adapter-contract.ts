/**
 * Contratos do Adapter Runtime poliglota.
 *
 * Define a interface {@link LangRunner} (R31) e os tipos de resultado/registro
 * usados pelos runners de linguagem (Node, Python, Go, JVM) e pelo
 * {@link AdapterRuntime}. Também descreve o schema do manifesto `adapter.json`
 * (R35) usado no fluxo de descoberta/registro de adapters.
 *
 * @module runtime/adapter-contract
 */

import { execFile } from 'node:child_process';
import { promises as fsp } from 'node:fs';

/** Status de execução de um comando de adapter. */
export enum RunStatus {
  /** Comando executado e código de saída 0. */
  Success = 'success',
  /** Comando executado e código de saída != 0. */
  Failure = 'failure',
  /** Comando não aplicável à stack (ex.: lint ausente). */
  Skipped = 'skipped',
  /** Tempo limite excedido. */
  Timeout = 'timeout',
}

/** Identificador canônico de linguagem suportada pelo runtime. */
export enum LanguageId {
  TypeScript = 'typescript',
  JavaScript = 'javascript',
  Node = 'node',
  Python = 'python',
  Go = 'go',
  Rust = 'rust',
  Java = 'java',
  Kotlin = 'kotlin',
  Ruby = 'ruby',
  PHP = 'php',
  Swift = 'swift',
  CSharp = 'csharp',
  Dart = 'dart',
  Elixir = 'elixir',
  Haskell = 'haskell',
  Zig = 'zig',
  React = 'react',
  Vue = 'vue',
  ReactNative = 'react-native',
  Flutter = 'flutter',
}

/** Comando executável exposto por um adapter. */
export enum AdapterCommandId {
  Init = 'init',
  Lint = 'lint',
  Test = 'test',
  Build = 'build',
  Compile = 'compile',
  QualityGate = 'quality-gate',
  Detect = 'detect',
}

/** Opções de execução de um comando de adapter. */
export interface RunOptions {
  /** Tempo limite em milissegundos (padrão 120000). */
  timeoutMs?: number;
  /** Variáveis de ambiente adicionais. */
  env?: Record<string, string>;
  /** Argumentos extras passados após o comando base. */
  args?: string[];
  /** Diretório de trabalho (override do cwd informado). */
  cwd?: string;
}

/** Resultado normalizado de um comando de adapter. */
export interface AdapterResult {
  /** Comando executado. */
  command: AdapterCommandId;
  /** Linguagem alvo. */
  language: LanguageId;
  /** Status final da execução. */
  status: RunStatus;
  /** Código de saída do processo (0 quando skipped). */
  exitCode: number;
  /** Saída padrão capturada. */
  stdout: string;
  /** Saída de erro capturada. */
  stderr: string;
  /** Duração da execução em milissegundos. */
  durationMs: number;
  /** Diretório efetivo de execução. */
  cwd: string;
  /** Linha de comando real executada. */
  commandLine: string;
  /** Mensagem de erro quando status != Success. */
  error?: string;
}

/** Descrição de um comando individual exposto por um adapter. */
export interface AdapterCommand {
  /** Identificador do comando. */
  id: AdapterCommandId;
  /** Rótulo legível. */
  label: string;
  /** Descrição curta. */
  description: string;
  /**
   * Executa o comando.
   * @param cwd - Diretório de trabalho.
   * @param opts - Opções de execução.
   * @returns Resultado normalizado da execução.
   */
  run(cwd: string, opts?: RunOptions): Promise<AdapterResult>;
}

/**
 * Contrato de um runner de linguagem.
 *
 * Todo adapter poliglota (Node, Python, Go, JVM) implementa esta interface,
 * permitindo que o orquestrador e o engineer-mode invoquem
 * `init/lint/test/build/compile/qualityGate` de forma agnóstica.
 */
export interface LangRunner {
  /** Linguagem primária atendida. */
  readonly language: LanguageId;
  /** Nome legível do runner. */
  readonly name: string;
  /** Aliases aceitos na detecção (ex.: 'ts', 'js'). */
  readonly aliases: string[];
  /**
   * Decide se a stack em `cwd` pertence a esta linguagem.
   * @param cwd - Diretório de trabalho.
   * @returns Verdadeiro se a linguagem for detectada.
   */
  detect(cwd: string): boolean;
  /** Inicializa dependências/ambiente. */
  init(cwd: string, opts?: RunOptions): Promise<AdapterResult>;
  /** Executa lint estático. */
  lint(cwd: string, opts?: RunOptions): Promise<AdapterResult>;
  /** Executa a suíte de testes. */
  test(cwd: string, opts?: RunOptions): Promise<AdapterResult>;
  /** Compila/empacota o projeto. */
  build(cwd: string, opts?: RunOptions): Promise<AdapterResult>;
  /** Compila para artefatos binários (linguagens compiladas). */
  compile(cwd: string, opts?: RunOptions): Promise<AdapterResult>;
  /** Executa portão de qualidade (lint + typecheck/test). */
  qualityGate(cwd: string, opts?: RunOptions): Promise<AdapterResult>;
  /** Lista os comandos disponíveis. */
  commands(): AdapterCommand[];
}

/** Schema do manifesto `adapter.json` (R35). */
export interface AdapterManifest {
  /** Identificador único (ex.: 'adapter-go'). */
  id: string;
  /** Nome legível. */
  name: string;
  /** Linguagem primária. */
  language: LanguageId;
  /** Versão semântica do adapter. */
  version: string;
  /** Comandos declarados como executáveis. */
  commands: Array<{ id: AdapterCommandId; label: string; description: string }>;
  /** Arquivo de entrada do adapter (relativo ao pacote). */
  entry?: string;
}

/** Tempo limite padrão (ms) por comando — resiliência (R35). */
export const DEFAULT_TIMEOUT_MS = 120_000;

/** Política de retry padrão — resiliência (R35). */
export interface RetryPolicy {
  /** Número máximo de tentativas. */
  maxAttempts: number;
  /** Atraso base em ms entre tentativas. */
  backoffMs: number;
}

/** Política de retry padrão. */
export const DEFAULT_RETRY: RetryPolicy = { maxAttempts: 1, backoffMs: 0 };

/**
 * Erro normalizado de execução de subprocesso.
 */
interface ExecError extends Error {
  /** Código de erro (string ou numérico). */
  code?: string | number;
  /** Verdadeiro se o processo foi morto pelo timeout. */
  killed?: boolean;
  /** Sinal recebido (ex.: SIGTERM). */
  signal?: string | null;
}

/**
 * Executa um comando em subprocesso com timeout.
 * @param argv - Vetor comando + argumentos.
 * @param cwd - Diretório de trabalho.
 * @param opts - Opções de execução.
 * @returns Objeto com stdout/stderr/exitCode/duração.
 */
export function execCommand(
  argv: string[],
  cwd: string,
  opts: RunOptions = {},
): Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: boolean }> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  return new Promise((resolve) => {
    const _start = Date.now();
    const child = execFile(
      argv[0],
      argv.slice(1),
      { cwd, timeout: timeoutMs, env: { ...process.env, ...(opts.env ?? {}) }, maxBuffer: 32 * 1024 * 1024 },
      (error, stdout, stderr) => {
        const errno: ExecError | null = (error as ExecError | null) ?? null;
        const timedOut = errno?.killed === true || (errno?.signal != null && errno.signal.length > 0);
        const numericCode = typeof errno?.code === 'number' ? (errno.code as number) : undefined;
        resolve({
          stdout: stdout ?? '',
          stderr: stderr ?? '',
          exitCode: timedOut ? 124 : error ? (numericCode ?? 1) : 0,
          timedOut,
        });
      },
    );
    child.on('error', () => {
      /* erro de spawn tratado no callback */
    });
  });
}

/**
 * Lê e faz parse de um manifesto `adapter.json`.
 * @param manifestPath - Caminho do arquivo.
 * @returns Manifesto tipado.
 */
export async function readAdapterManifest(manifestPath: string): Promise<AdapterManifest> {
  const raw = await fsp.readFile(manifestPath, 'utf-8');
  const parsed = JSON.parse(raw) as AdapterManifest;
  if (!parsed.id || !parsed.language || !Array.isArray(parsed.commands)) {
    throw new Error(`Manifesto inválido: ${manifestPath}`);
  }
  return parsed;
}
