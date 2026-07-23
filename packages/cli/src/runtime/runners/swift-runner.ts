import { BaseRunner } from './base-runner';
import { LanguageId } from '../adapter-contract';

/** Classe responsável por processa runner. */
export class SwiftRunner extends BaseRunner {
  public constructor() {
    super({
      language: LanguageId.Swift,
      name: 'Swift Runner',
      aliases: ['swift'],
      markers: ['Package.swift'],
      commands: {
        init:   { argv: ['swift', 'package', 'resolve'],      label: 'Resolve deps',     description: 'Resolve dependências SPM' },
        lint:   { argv: ['swift', 'lint'],                     label: 'Lint',              description: 'Executa swiftlint' },
        test:   { argv: ['swift', 'test'],                     label: 'Test',              description: 'Executa swift test' },
        build:  { argv: ['swift', 'build'],                    label: 'Build',             description: 'Compila pacote' },
        compile:{ argv: ['swift', 'build', '-c', 'release'],   label: 'Release build',     description: 'Compila em release' },
        'quality-gate': { argv: ['swift', 'build'],            label: 'Quality gate',      description: 'Build como portão de qualidade' },
      },
    });
  }
}
