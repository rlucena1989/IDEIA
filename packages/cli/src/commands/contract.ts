import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
import { validateSpec, detectSpecType } from '../contracts/validator';
import { diffSpecs } from '../contracts/differ';
import { lintSpec } from '../contracts/linter';
import { generateClient, generateServer } from '../contracts/generator';
import { printHeader, printLine, printResult, finish } from "../utils/output";
import { getIO } from '../io';

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function contractValidateAction(type: string, file: string): void {
  const filePath = path.resolve(file);
  if (!getIO().fs.exists(filePath)) {
    printResult('Erro', false, `Arquivo nao encontrado: ${filePath}`);
    finish({ checkpoint: 'contract_validate', ok: false, status: 'failed', context_summary: `Arquivo nao encontrado: ${filePath}` });
    return;
  }
  const detected = detectSpecType(filePath);
  if (type !== 'auto' && type !== detected && type !== 'graphql') {
    printResult('Aviso', false, `Tipo declarado "${type}" difere do detectado "${detected}" — usando detectado`);
  }
  printHeader(`Validando spec ${type}: ${file}`);
  const result = validateSpec(filePath);
  for (const err of result.errors) printResult('Erro', false, err);
  for (const warn of result.warnings) printResult('Aviso', false, warn);
  if (result.valid) {
    printResult('Validacao', true, `${result.specType} — ${Object.keys(result.info).length} campos analisados`);
  } else {
    printResult('Validacao', false, `${result.errors.length} erro(s), ${result.warnings.length} aviso(s)`);
  }
  finish({
    checkpoint: 'contract_validate', ok: result.valid, status: result.valid ? 'passed' : 'failed',
    context_summary: result.valid ? `${result.specType} valido: ${result.info.title || '(sem titulo)'} v${result.info.version || '?'}` : `${result.errors.length} erro(s), ${result.warnings.length} aviso(s)`,
    data: { specType: result.specType, valid: result.valid, errors: result.errors.length, warnings: result.warnings.length, info: result.info },
  });
}

export function contractDiffAction(oldFile: string, newFile: string): void {
  const oldPath = path.resolve(oldFile);
  const newPath = path.resolve(newFile);
  if (!getIO().fs.exists(oldPath)) { printResult('Erro', false, `Arquivo nao encontrado: ${oldPath}`); finish({ checkpoint: 'contract_diff', ok: false, status: 'failed', context_summary: `Arquivo nao encontrado: ${oldPath}` }); return; }
  if (!getIO().fs.exists(newPath)) { printResult('Erro', false, `Arquivo nao encontrado: ${newPath}`); finish({ checkpoint: 'contract_diff', ok: false, status: 'failed', context_summary: `Arquivo nao encontrado: ${newPath}` }); return; }
  printHeader(`Diff: ${oldFile} vs ${newFile}`);
  const result = diffSpecs(oldPath, newPath);
  printLine(`Tipo: ${result.specType}`);
  printLine(`Total de mudancas: ${result.total}`);
  printLine(`Breaking: ${result.breaking.length}`);
  printLine(`Non-breaking: ${result.nonBreaking.length}`);
  printLine('');
  if (result.breaking.length > 0) {
    printLine('--- Breaking Changes ---');
    for (const b of result.breaking) printResult(`[BREAKING] ${b.field}`, false, b.change);
    printLine('');
  }
  if (result.nonBreaking.length > 0) {
    printLine('--- Non-Breaking Changes ---');
    for (const nb of result.nonBreaking) printLine(`  ${nb.field}: ${nb.change}`);
    printLine('');
  }
  const ok = result.breaking.length === 0;
  finish({
    checkpoint: 'contract_diff', ok, status: ok ? 'passed' : 'failed',
    context_summary: ok ? `${result.total} mudancas, nenhuma breaking` : `${result.breaking.length} breaking change(s) encontrada(s)`,
    data: { specType: result.specType, breaking: result.breaking.length, nonBreaking: result.nonBreaking.length, total: result.total },
  });
}

export function contractLintAction(file: string): void {
  const filePath = path.resolve(file);
  if (!getIO().fs.exists(filePath)) { printResult('Erro', false, `Arquivo nao encontrado: ${filePath}`); finish({ checkpoint: 'contract_lint', ok: false, status: 'failed', context_summary: `Arquivo nao encontrado: ${filePath}` }); return; }
  printHeader(`Lint: ${file}`);
  const result = lintSpec(filePath);
  printLine(`Tipo: ${result.specType}`);
  printLine(`Score: ${result.score}/100`);
  printLine('');
  for (const issue of result.issues) {
    const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
    printLine(`${icon} [${issue.rule}] ${issue.path}: ${issue.message}`);
  }
  if (result.issues.length === 0) printLine('Nenhum problema encontrado!');
  finish({
    checkpoint: 'contract_lint', ok: result.score >= 60, status: result.score >= 80 ? 'passed' : result.score >= 60 ? 'warning' : 'failed',
    context_summary: `Score: ${result.score}/100 — ${result.issues.filter(i => i.severity === 'error').length} erros, ${result.issues.filter(i => i.severity === 'warning').length} warnings`,
    data: { specType: result.specType, score: result.score, issues: result.issues.length, errors: result.issues.filter(i => i.severity === 'error').length, warnings: result.issues.filter(i => i.severity === 'warning').length },
  });
}

export function contractGenerateClientAction(spec: string, options: { out: string }): void {
  const specPath = path.resolve(spec);
  if (!getIO().fs.exists(specPath)) { printResult('Erro', false, `Arquivo nao encontrado: ${specPath}`); finish({ checkpoint: 'contract_generate_client', ok: false, status: 'failed', context_summary: `Arquivo nao encontrado: ${specPath}` }); return; }
  printHeader(`Gerando cliente: ${spec}`);
  const files = generateClient(specPath, path.resolve(options.out));
  for (const f of files) {
    const outPath = path.resolve(f.path);
    getIO().fs.mkDir(path.dirname(outPath), true);
    getIO().fs.write(outPath, f.content);
    printResult('Gerado', true, f.path);
  }
  finish({
    checkpoint: 'contract_generate_client', ok: true, status: 'passed',
    context_summary: `${files.length} arquivo(s) gerado(s) em ${options.out}`,
    data: { files: files.map(f => f.path), generated: files.length },
  });
}

export function contractGenerateServerAction(spec: string, options: { out: string }): void {
  const specPath = path.resolve(spec);
  if (!getIO().fs.exists(specPath)) { printResult('Erro', false, `Arquivo nao encontrado: ${specPath}`); finish({ checkpoint: 'contract_generate_server', ok: false, status: 'failed', context_summary: `Arquivo nao encontrado: ${specPath}` }); return; }
  printHeader(`Gerando server stub: ${spec}`);
  const files = generateServer(specPath, path.resolve(options.out));
  for (const f of files) {
    const outPath = path.resolve(f.path);
    getIO().fs.mkDir(path.dirname(outPath), true);
    getIO().fs.write(outPath, f.content);
    printResult('Gerado', true, f.path);
  }
  finish({
    checkpoint: 'contract_generate_server', ok: true, status: 'passed',
    context_summary: `${files.length} arquivo(s) gerado(s) em ${options.out}`,
    data: { files: files.map(f => f.path), generated: files.length },
  });
}

export function contractCheckAllAction(options: { dir: string }): void {
  const root = path.resolve(options.dir);
  printHeader('Contract Check-All');
  const specFiles: string[] = [];
  function findSpecs(dir: string): void {
    try {
      const entries = getIO().fs.readDirEntries(dir);
      for (const e of entries) {
        if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') findSpecs(path.join(dir, e.name));
        else if (e.isFile() && /\.(yaml|yml|json|graphql|gql)$/i.test(e.name)) specFiles.push(path.join(dir, e.name));
      }
    } catch { printLine(`Aviso: Sem permissao para ler ${dir}`); }
  }
  findSpecs(root);
  const contractFiles = specFiles.filter(f => {
    try { return detectSpecType(f) !== 'unknown'; } catch { return false; }
  });
  if (contractFiles.length === 0) {
    printLine('Nenhuma spec de API encontrada no projeto.');
    finish({ checkpoint: 'contract_check_all', ok: true, status: 'passed', context_summary: 'Nenhuma spec encontrada', data: { total: 0, valid: 0, invalid: 0 } });
    return;
  }
  let valid = 0; let invalid = 0; let totalWarnings = 0; let totalScore = 0;
  for (const f of contractFiles) {
    const valResult = validateSpec(f);
    const lintResult = lintSpec(f);
    const relPath = path.relative(root, f);
    if (valResult.valid) { printResult(`${relPath}`, true, `Score: ${lintResult.score}/100`); valid++; }
    else { printResult(`${relPath}`, false, `${valResult.errors.length} erro(s)`); invalid++; }
    totalWarnings += valResult.warnings.length;
    totalScore += lintResult.score;
  }
  const avgScore = contractFiles.length > 0 ? Math.round(totalScore / contractFiles.length) : 100;
  printLine('');
  printResult('Total', true, `${contractFiles.length} spec(s) — ${valid} validas, ${invalid} invalidas, media score ${avgScore}/100`);
  finish({
    checkpoint: 'contract_check_all', ok: invalid === 0, status: invalid === 0 ? 'passed' : 'failed',
    context_summary: `${contractFiles.length} specs: ${valid} validas, ${invalid} invalidas, media ${avgScore}/100`,
    data: { total: contractFiles.length, valid, invalid, warnings: totalWarnings, averageScore: avgScore },
  });
}

export function contractCommand(): Command {
  const cmd = new Command('contract')
    .description('Validacao, diff, lint e geracao de contratos de API');

  cmd
    .command('validate')
    .description('Valida uma spec de API (openapi, asyncapi, graphql)')
    .argument('<type>', 'Tipo: openapi, asyncapi ou graphql')
    .argument('<file>', 'Caminho do arquivo de spec')
    .action((type: string, file: string) => contractValidateAction(type, file));

  cmd
    .command('diff')
    .description('Compara duas specs e detecta breaking changes')
    .argument('<old-file>', 'Spec antiga')
    .argument('<new-file>', 'Spec nova')
    .action((oldFile: string, newFile: string) => contractDiffAction(oldFile, newFile));

  cmd
    .command('lint')
    .description('Analisa boas praticas de uma spec de API')
    .argument('<file>', 'Caminho do arquivo de spec')
    .action((file: string) => contractLintAction(file));

  cmd.command('generate-client').description('Gera cliente TypeScript a partir de spec OpenAPI').argument('<spec>', 'Caminho da spec OpenAPI').option('-o, --out <dir>', 'Diretorio de saida', '.').action((spec: string, options: { out: string }) => contractGenerateClientAction(spec, options));

  cmd.command('generate-server').description('Gera server stub Express a partir de spec OpenAPI').argument('<spec>', 'Caminho da spec OpenAPI').option('-o, --out <dir>', 'Diretorio de saida', '.').action((spec: string, options: { out: string }) => contractGenerateServerAction(spec, options));

  cmd.command('check-all').description('Executa todas as validacoes em specs encontradas no projeto').option('--dir <path>', 'Diretorio para buscar specs', '.').action((options: { dir: string }) => contractCheckAllAction(options));

  return cmd;
}
