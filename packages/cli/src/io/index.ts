import { IOContainer } from './interfaces';
import { createLogger } from '@ideia/logger';
import { RealShell, RealFileSystem, RealHttpClient } from './real';
import { MockIOContainer } from './mock';

let _container: IOContainer | null = null;

/**
 * Cria i o.
 * @returns O resultado da operação.
 */
export function createIO(): IOContainer {
  if (process.env.GTI_TEST_MODE === '1') {
    return new MockIOContainer();
  }
  return {
    shell: new RealShell(),
    fs: new RealFileSystem(),
    http: new RealHttpClient(),
    output: (data: unknown): void => { console.log(JSON.stringify(data, null, 2)); },
    outputLines: (lines: string[]): void => { for (const line of lines) console.log(line); },
  };
}

/**
 * Obtém i o.
 * @returns O resultado da operação.
 */
export function getIO(): IOContainer {
  if (!_container) _container = createIO();
  return _container;
}

/** Reinicia i o. */
export function resetIO(): void {
  _container = null;
}

export { IOContainer } from './interfaces';
export { MockIOContainer, MockShell, MockFileSystem, MockHttpClient } from './mock';
