import { BaseRunner } from './base-runner';
import { createLogger } from '@ideia/logger';
import { LanguageId } from '../adapter-contract';
const logger = createLogger('rust-runner');

/** Classe responsável por processa runner. */
export class RustRunner extends BaseRunner {
  public constructor() {
    super({
      language: LanguageId.Rust,
      name: 'Rust Runner',
      aliases: ['rust', 'rs'],
      markers: ['Cargo.toml'],
      commands: {
        init:   { argv: ['cargo', 'fetch'],                   label: 'Fetch deps',        description: 'Baixa dependências (cargo fetch)' },
        lint:   { argv: ['cargo', 'clippy'],                   label: 'Clippy',            description: 'Executa clippy' },
        test:   { argv: ['cargo', 'test'],                     label: 'Test',              description: 'Executa cargo test' },
        build:  { argv: ['cargo', 'build'],                    label: 'Build',             description: 'Compila pacote' },
        compile:{ argv: ['cargo', 'build', '--release'],       label: 'Release build',     description: 'Compila em release' },
        'quality-gate': { argv: ['cargo', 'clippy'],           label: 'Quality gate',      description: 'Clippy como portão de qualidade' },
      },
    });
  }
}
