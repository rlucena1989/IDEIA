/**
 * Facade de runners poliglotas (R31/R32/R33).
 *
 * Re-exporta o {@link AdapterRuntime} canônico e os runners de linguagem,
 * preservando a API decompatibilidade (`getDefaultRuntime`, `detectRunner`,
 * `listLanguages`) referenciada por consumidores legados.
 *
 * @module runtime/runners/runner
 */

import { defaultRuntime } from '../adapter-runtime';
import { LangRunner, LanguageId } from '../adapter-contract';

export { AdapterRuntime, defaultRuntime, DetectionResult } from '../adapter-runtime';
export { NodeRunner } from './node-runner';
export { PythonRunner } from './python-runner';
export { GoRunner } from './go-runner';
export { JVMRunner as JvmRunner } from './jvm-runner';
export { RubyRunner } from './ruby-runner';
export { PHPRunner } from './php-runner';
export { SwiftRunner } from './swift-runner';
export { RustRunner } from './rust-runner';
export { DartRunner } from './dart-runner';
export { ElixirRunner } from './elixir-runner';
export { HaskellRunner } from './haskell-runner';
export { ZigRunner } from './zig-runner';
export * from '../adapter-contract';

/**
 * Retorna o runtime padrão (singleton).
 * @returns Instância do AdapterRuntime.
 */
export function getDefaultRuntime(): typeof defaultRuntime {
  return defaultRuntime;
}

/**
 * Detecta o runner primário para um diretório.
 * @param cwd - Diretório de trabalho.
 * @returns Runner correspondente ou undefined.
 */
export function detectRunner(cwd: string): LangRunner | undefined {
  const { primary } = defaultRuntime.detect(cwd);
  return primary ? defaultRuntime.getRunner(primary) : undefined;
}

/**
 * Lista linguagens suportadas.
 * @returns Identificadores de linguagem.
 */
export function listLanguages(): LanguageId[] {
  return defaultRuntime.getSupportedLanguages();
}
