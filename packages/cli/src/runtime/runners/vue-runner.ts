import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
import { BaseRunner } from './base-runner';
import { LanguageId } from '../adapter-contract';

/** Classe responsável por processa runner. */
export class VueRunner extends BaseRunner {
  public constructor() {
    super({
      language: LanguageId.Vue,
      name: 'Vue Runner',
      aliases: ['vue', 'vuejs', 'nuxt'],
      markers: [],
      commands: {
        init: { argv: ['npm', 'install'], label: 'Install dependencies', description: 'Instala dependências', optional: false },
        lint: { argv: ['npm', 'run', 'lint'], label: 'Lint', description: 'Executa lint', optional: true },
        test: { argv: ['npm', 'test'], label: 'Test', description: 'Executa testes', optional: true },
        build: { argv: ['npm', 'run', 'build'], label: 'Build', description: 'Empacota produção', optional: true },
        'quality-gate': { argv: ['npx', 'vue-tsc', '--noEmit'], label: 'TypeCheck', description: 'Verifica tipos Vue/TS', optional: true },
      },
    });
  }

  override detect(cwd: string): boolean {
    const pkgPath = path.join(cwd, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>;
        if (deps.vue) return true;
      } catch { /* ignore */ }
    }
    try {
      const entries = fs.readdirSync(cwd);
      if (entries.some(e => e.endsWith('.vue'))) return true;
    } catch { /* ignore */ }
    return super.detect(cwd);
  }
}
