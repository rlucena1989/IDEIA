import { BaseRunner } from './base-runner';
import { createLogger } from '@ideia/logger';
import { LanguageId } from '../adapter-contract';
const logger = createLogger('ruby-runner');

/** Classe responsável por processa runner. */
export class RubyRunner extends BaseRunner {
  public constructor() {
    super({
      language: LanguageId.Ruby,
      name: 'Ruby Runner',
      aliases: ['ruby', 'rb'],
      markers: ['Gemfile'],
      commands: {
        init:   { argv: ['bundle', 'install'],               label: 'Install deps',     description: 'Instala dependências (bundle install)' },
        lint:   { argv: ['rubocop'],                         label: 'Lint',              description: 'Executa rubocop' },
        test:   { argv: ['bundle', 'exec', 'rspec'],         label: 'Test',              description: 'Executa rspec' },
        build:  { argv: ['gem', 'build'],                     label: 'Build gem',         description: 'Empacota gem' },
        'quality-gate': { argv: ['rubocop'],                  label: 'Quality gate',      description: 'Rubocop como portão de qualidade' },
      },
    });
  }
}
