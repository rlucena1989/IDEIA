/**
 * Runner para projetos Python (R32).
 *
 * @module runtime/runners/python-runner
 */

import { BaseRunner } from './base-runner';
import { LanguageId } from '../adapter-contract';

/** Runner Python. */
export class PythonRunner extends BaseRunner {
  /** Cria o runner Python. */
  public constructor() {
    super({
      language: LanguageId.Python,
      name: 'Python Runner',
      aliases: ['python', 'py', 'pip'],
      markers: ['requirements.txt', 'Pipfile', 'pyproject.toml'],
      commands: {
        init: { argv: ['pip', 'install', '-r', 'requirements.txt'], label: 'Install dependencies', description: 'Instala requirements.txt' },
        lint: { argv: ['python', '-m', 'flake8', '.'], label: 'Lint', description: 'Executa flake8', optional: true },
        test: { argv: ['python', '-m', 'pytest'], label: 'Test', description: 'Executa pytest', optional: true },
        build: { argv: ['python', '-m', 'build'], label: 'Build', description: 'Empacota via python -m build', optional: true },
        'quality-gate': { argv: ['python', '-m', 'flake8', '.'], label: 'Quality gate', description: 'Lint como portão de qualidade', optional: true },
      },
    });
  }
}
