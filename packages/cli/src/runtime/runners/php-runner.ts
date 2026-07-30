import { BaseRunner } from './base-runner';
import { createLogger } from '@ideia/logger';
import { LanguageId } from '../adapter-contract';
const logger = createLogger('php-runner');

/** Classe responsável por processa h p runner. */
export class PHPRunner extends BaseRunner {
  public constructor() {
    super({
      language: LanguageId.PHP,
      name: 'PHP Runner',
      aliases: ['php'],
      markers: ['composer.json'],
      commands: {
        init:   { argv: ['composer', 'install'],              label: 'Install deps',     description: 'Instala dependências (composer install)' },
        lint:   { argv: ['php', '-l'],                        label: 'Lint',              description: 'Syntax check (php -l)' },
        test:   { argv: ['phpunit'],                          label: 'Test',              description: 'Executa phpunit' },
        build:  { argv: ['composer', 'dump-autoload', '--optimize'], label: 'Build',     description: 'Otimiza autoload' },
        'quality-gate': { argv: ['php', '-l'],                label: 'Quality gate',      description: 'Syntax check como portão de qualidade' },
      },
    });
  }
}
