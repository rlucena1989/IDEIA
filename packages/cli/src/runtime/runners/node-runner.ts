/**
 * Runner para projetos Node.js / TypeScript (R32).
 *
 * @module runtime/runners/node-runner
 */

import { BaseRunner } from './base-runner';
import { LanguageId } from '../adapter-contract';

/** Runner Node/TypeScript. */
export class NodeRunner extends BaseRunner {
  /** Cria o runner Node. */
  public constructor() {
    super({
      language: LanguageId.Node,
      name: 'Node Runner',
      aliases: ['node', 'js', 'javascript', 'ts', 'typescript', 'npm'],
      markers: ['package.json', 'tsconfig.json'],
      commands: {
        init: { argv: ['npm', 'install'], label: 'Install dependencies', description: 'Instala dependências via npm' },
        lint: { argv: ['npm', 'run', 'lint'], label: 'Lint', description: 'Executa lint (script "lint")', optional: true },
        test: { argv: ['npm', 'test'], label: 'Test', description: 'Executa suíte de testes', optional: true },
        build: { argv: ['npm', 'run', 'build'], label: 'Build', description: 'Empacota via script "build"', optional: true },
        compile: { argv: ['tsc', '-b'], label: 'Compile', description: 'Compila TypeScript (project refs)', optional: true },
        'quality-gate': { argv: ['npx', 'tsc', '--noEmit'], label: 'Quality gate', description: 'Typecheck estático (tsc)', optional: true },
      },
    });
  }
}
