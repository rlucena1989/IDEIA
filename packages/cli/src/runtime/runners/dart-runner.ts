import { BaseRunner } from './base-runner';
import { createLogger } from '@ideia/logger';
import { LanguageId } from '../adapter-contract';
const logger = createLogger('dart-runner');

/** Classe responsável por processa runner. */
export class DartRunner extends BaseRunner {
  public constructor() {
    super({
      language: LanguageId.Dart,
      name: 'Dart Runner',
      aliases: ['dart'],
      markers: ['pubspec.yaml'],
      commands: {
        init:   { argv: ['dart', 'pub', 'get'],                label: 'Get deps',          description: 'Baixa dependências (dart pub get)' },
        lint:   { argv: ['dart', 'analyze'],                   label: 'Analyze',           description: 'Executa dart analyze' },
        test:   { argv: ['dart', 'test'],                      label: 'Test',              description: 'Executa dart test' },
        build:  { argv: ['dart', 'compile', 'exe'],            label: 'Compile exe',       description: 'Compila executável nativo' },
        'quality-gate': { argv: ['dart', 'analyze'],           label: 'Quality gate',      description: 'Analyze como portão de qualidade' },
      },
    });
  }
}
