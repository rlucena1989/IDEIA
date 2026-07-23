/**
 * Runner para projetos Go (R33).
 *
 * @module runtime/runners/go-runner
 */

import { BaseRunner } from './base-runner';
import { LanguageId } from '../adapter-contract';

/** Runner Go. */
export class GoRunner extends BaseRunner {
  /** Cria o runner Go. */
  public constructor() {
    super({
      language: LanguageId.Go,
      name: 'Go Runner',
      aliases: ['go', 'golang'],
      markers: ['go.mod'],
      commands: {
        init: { argv: ['go', 'mod', 'download'], label: 'Download modules', description: 'Resolve dependências (go mod download)' },
        lint: { argv: ['go', 'vet', './...'], label: 'Vet', description: 'Executa go vet' },
        test: { argv: ['go', 'test', './...'], label: 'Test', description: 'Executa go test' },
        build: { argv: ['go', 'build', './...'], label: 'Build', description: 'Compila pacotes' },
        compile: { argv: ['go', 'build', '-o', 'bin/app', './...'], label: 'Compile binary', description: 'Gera binário em bin/app' },
        'quality-gate': { argv: ['go', 'vet', './...'], label: 'Quality gate', description: 'Vet como portão de qualidade' },
      },
    });
  }
}
