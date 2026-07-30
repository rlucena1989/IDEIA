import { BaseRunner } from './base-runner';
import { createLogger } from '@ideia/logger';
import { LanguageId } from '../adapter-contract';
const logger = createLogger('haskell-runner');

/** Classe responsável por processa runner. */
export class HaskellRunner extends BaseRunner {
  public constructor() {
    super({
      language: LanguageId.Haskell,
      name: 'Haskell Runner',
      aliases: ['haskell', 'hs'],
      markers: ['stack.yaml', '*.cabal', 'package.yaml'],
      commands: {
        init:   { argv: ['stack', 'build', '--only-dependencies'], label: 'Build deps',    description: 'Constrói dependências (stack build)' },
        lint:   { argv: ['hlint'],                               label: 'HLint',          description: 'Executa hlint' },
        test:   { argv: ['stack', 'test'],                       label: 'Test',            description: 'Executa stack test' },
        build:  { argv: ['stack', 'build'],                      label: 'Build',           description: 'Compila pacote' },
        compile:{ argv: ['stack', 'build'],                      label: 'Build (compile)',  description: 'Compila (stack build)' },
        'quality-gate': { argv: ['hlint'],                       label: 'Quality gate',    description: 'HLint como portão de qualidade' },
      },
    });
  }
}
