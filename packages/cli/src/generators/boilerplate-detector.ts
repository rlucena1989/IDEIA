import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
const logger = createLogger('generators.boilerplate-detector');
import path from 'node:path';
import { GeneratorOptions, printGeneratorResult, GeneratorResult } from './engine';

/**
 * Processa remove.
 * @param options - Valor options.
 */
export function boilerplateRemove(options: GeneratorOptions): void {
  const root = options.cwd || process.cwd();
  const result: GeneratorResult = { created: [], skipped: [], overwritten: [], errors: [] };

  const boilerplatePatterns = [
    { dir: 'src', file: 'app.controller.ts' },
    { dir: 'src', file: 'app.service.ts' },
    { dir: 'src', file: 'app.module.ts' },
    { dir: 'test', file: 'app.e2e-spec.ts' },
  ];

  const suggestions: string[] = [];

  for (const pattern of boilerplatePatterns) {
    const fullPath = path.join(root, pattern.dir, pattern.file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (content.includes('Hello World') || content.includes('getHello')) {
        suggestions.push(`- ${path.relative(root, fullPath)}: Contem boilerplate 'Hello World'`);
        result.created.push(path.relative(root, fullPath));
      }
    }
  }

  if (!options.dryRun && suggestions.length > 0) {
    const report = `# Boilerplate Detection Report\n\n${suggestions.join('\n')}\n\n# Recommended actions\n`;
    const reportPath = path.join(root, '.ai', 'reports', 'boilerplate-detection.md');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, report, 'utf-8');
  }

  if (suggestions.length > 0) {
    logger.info('\nBoilerplate detectado — sugestoes:');
    suggestions.forEach((s: string) => logger.info('  ${s}'));
  } else {
    logger.info('\nNenhum boilerplate padrao detectado.');
  }

  printGeneratorResult('Boilerplate Removal Scan', result, options.dryRun);
}
