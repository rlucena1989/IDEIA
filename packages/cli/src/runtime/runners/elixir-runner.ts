import { BaseRunner } from './base-runner';
import { createLogger } from '@ideia/logger';
import { LanguageId } from '../adapter-contract';
const logger = createLogger('elixir-runner');

/** Classe responsável por processa runner. */
export class ElixirRunner extends BaseRunner {
  public constructor() {
    super({
      language: LanguageId.Elixir,
      name: 'Elixir Runner',
      aliases: ['elixir', 'ex'],
      markers: ['mix.exs'],
      commands: {
        init:   { argv: ['mix', 'deps.get'],                   label: 'Get deps',          description: 'Baixa dependências (mix deps.get)' },
        lint:   { argv: ['mix', 'format', '--check-formatted'], label: 'Format check',     description: 'Verifica formatação' },
        test:   { argv: ['mix', 'test'],                       label: 'Test',              description: 'Executa mix test' },
        build:  { argv: ['mix', 'compile'],                    label: 'Compile',           description: 'Compila projeto' },
        compile:{ argv: ['mix', 'compile', '--warnings-as-errors'], label: 'Strict compile', description: 'Compila com warnings como erro' },
        'quality-gate': { argv: ['mix', 'compile', '--warnings-as-errors'], label: 'Quality gate', description: 'Compile strict como portão de qualidade' },
      },
    });
  }
}
