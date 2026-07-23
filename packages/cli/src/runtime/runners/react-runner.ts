import fs from 'node:fs';
import path from 'node:path';
import { BaseRunner } from './base-runner';
import { LanguageId } from '../adapter-contract';

/** Classe responsável por processa runner. */
export class ReactRunner extends BaseRunner {
  public constructor() {
    super({
      language: LanguageId.React,
      name: 'React Runner',
      aliases: ['react', 'reactjs', 'next', 'nextjs', 'remix', 'gatsby'],
      markers: [],
      commands: {
        init: { argv: ['npm', 'install'], label: 'Install dependencies', description: 'Instala dependências', optional: false },
        lint: { argv: ['npm', 'run', 'lint'], label: 'Lint', description: 'Executa lint', optional: true },
        test: { argv: ['npm', 'test'], label: 'Test', description: 'Executa testes', optional: true },
        build: { argv: ['npm', 'run', 'build'], label: 'Build', description: 'Empacota produção', optional: true },
        'quality-gate': { argv: ['npx', 'tsc', '--noEmit'], label: 'TypeCheck', description: 'Verifica tipos TypeScript', optional: true },
      },
    });
  }

  override detect(cwd: string): boolean {
    const pkgPath = path.join(cwd, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>;
        return !!deps.react;
      } catch { return false; }
    }
    return super.detect(cwd);
  }
}
