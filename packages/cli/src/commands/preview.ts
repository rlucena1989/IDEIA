import { Command } from 'commander';
import { generatePreview, generateFrontendTemplate, generateLowLevelTemplate } from '../runtime/preview-engine';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Cria preview command.
 * @returns O resultado da operação.
 */
function createPreviewCommand(): Command {
  const command = new Command('preview')
    .description('UX de Operacao e Preview — Fase 13');

  command
    .command('diff <original> <modified>')
    .description('Gera preview de diff entre dois arquivos')
    .option('--json', 'Saida em JSON')
    .action((orig, mod, opts) => {
      if (!fs.existsSync(orig)) { console.error('Original nao encontrado:', orig); process.exit(1); }
      if (!fs.existsSync(mod)) { console.error('Modificado nao encontrado:', mod); process.exit(1); }
      const origContent = fs.readFileSync(orig, 'utf-8');
      const modContent = fs.readFileSync(mod, 'utf-8');
      const diff = generatePreview(origContent, modContent, path.basename(orig));
      if (opts.json) { console.log(JSON.stringify(diff, null, 2)); return; }
      console.log(`\nDiff Preview: "${path.basename(orig)}"`);
      console.log(`  +${diff.linesAdded}  -${diff.linesRemoved}`);
      for (const c of diff.chunks.slice(0, 20)) {
        const prefix = c.type === 'add' ? '+' : c.type === 'remove' ? '-' : ' ';
        console.log(`  ${prefix} ${c.content.substring(0, 80)}`);
      }
    });

  command
    .command('frontend <name>')
    .description('Gera template de componente frontend')
    .option('--stack <stack>', 'Stack (react, vue, angular, svelte)', 'react')
    .option('--save <dir>', 'Salvar em diretorio')
    .action((name, opts) => {
      const code = generateFrontendTemplate(opts.stack, name);
      if (opts.save) {
        const ext = opts.stack === 'vue' ? '.vue' : opts.stack === 'svelte' ? '.svelte' : '.tsx';
        fs.mkdirSync(path.dirname(path.join(opts.save, name + ext)), { recursive: true });
        fs.writeFileSync(path.join(opts.save, name + ext), code, 'utf-8');
        console.log(`Salvo: ${path.join(opts.save, name + ext)}`);
      } else {
        console.log(code);
      }
    });

  command
    .command('low-level <type> <name>')
    .description('Gera template de baixo nivel (service, repository, middleware, config)')
    .option('--save <dir>', 'Salvar em diretorio')
    .action((type, name, opts) => {
      const code = generateLowLevelTemplate(type, name);
      if (opts.save) {
        const filePath = path.join(opts.save, `${name.toLowerCase()}.${type}.ts`);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, code, 'utf-8');
        console.log(`Salvo: ${filePath}`);
      } else {
        console.log(code);
      }
    });

  return command;
}

export { createPreviewCommand };