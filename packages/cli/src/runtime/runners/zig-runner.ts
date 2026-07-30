import { BaseRunner } from './base-runner';
import { createLogger } from '@ideia/logger';
import { LanguageId } from '../adapter-contract';
const logger = createLogger('zig-runner');

/** Classe responsável por processa runner. */
export class ZigRunner extends BaseRunner {
  public constructor() {
    super({
      language: LanguageId.Zig,
      name: 'Zig Runner',
      aliases: ['zig', 'z'],
      markers: ['build.zig'],
      commands: {
        init:   { argv: ['zig', 'build'],                       label: 'Build (init)',     description: 'Build padrão como init' },
        lint:   { argv: ['zig', 'fmt', '--check'],              label: 'Format check',     description: 'Verifica formatação' },
        test:   { argv: ['zig', 'build', 'test'],               label: 'Test',             description: 'Executa zig build test' },
        build:  { argv: ['zig', 'build'],                       label: 'Build',            description: 'Compila projeto' },
        compile:{ argv: ['zig', 'build-exe', '--release-safe'], label: 'Compile exe',      description: 'Compila executável release-safe' },
        'quality-gate': { argv: ['zig', 'build'],               label: 'Quality gate',     description: 'Build como portão de qualidade' },
      },
    });
  }
}
