import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.supply-chain');
import { scan, generateSbom, audit, verifyPackage, printScanReport } from '../utils/supply-chain/index';
import path from 'node:path';
import { getIO } from '../io';

/**
 * Processa chain command.
 * @returns O resultado da operação.
 */
export function supplyChainScanAction(opts: Record<string, unknown>): void {
  const cwd = process.cwd();
  const result = scan(cwd);
  printScanReport(result, cwd, !!opts.json);
  if (opts.ci && result.summary.critical > 0) process.exit(1);
}

export function supplyChainSbomAction(): void {
  const cwd = process.cwd();
  const sbom = generateSbom(cwd);
  const outPath = path.join(cwd, 'sbom.json');
  getIO().fs.write(outPath, JSON.stringify(sbom, null, 2));
  logger.info('SBOM gerado: ${path.relative(cwd, outPath)}');
  logger.info('Componentes: ${(sbom.components as Array<Record<string, unknown>>).length}');
}

export function supplyChainAuditAction(opts: Record<string, unknown>): void {
  const cwd = process.cwd();
  const result = scan(cwd);
  const diff = audit(result.entries, opts.baseline as string);
  if (diff.changed) {
    logger.info('Mudancas detectadas em relacao ao baseline:');
    if (diff.added.length > 0) logger.info('  Novas vulnerabilidades: ${diff.added.length}');
    if (diff.removed.length > 0) logger.info('  Removidas: ${diff.removed.length}');
  } else {
    logger.info('Nenhuma mudanca em relacao ao baseline.');
  }
}

export function supplyChainVerifyAction(pkg: string): void {
  const cwd = process.cwd();
  const result = verifyPackage(pkg, cwd);
  logger.info('Pacote: ${pkg}');
  logger.info('Verificado: ${result.verified}');
  if (result.integrity) logger.info('Integridade: ${result.integrity}');
  if (result.error) console.error(`Erro: ${result.error}`);
}

export function supplyChainCommand(): Command {
  const cmd = new Command('supply-chain')
    .description('Supply chain security: CVE scanning, SBOM generation, package verification');

  cmd.command('scan')
    .description('Scan dependencies for CVEs')
    .option('--ci', 'Exit with code 1 on critical vulnerabilities')
    .option('--json', 'JSON output')
    .action((opts: Record<string, unknown>) => supplyChainScanAction(opts));
  cmd.command('sbom').description('Generate Software Bill of Materials (CycloneDX)').action(supplyChainSbomAction);
  cmd.command('audit').description('Compare SBOM against baseline').option('--baseline <path>', 'Path to baseline SBOM').action((opts: Record<string, unknown>) => supplyChainAuditAction(opts));
  cmd.command('verify <package>').description('Verify package integrity').action((pkg: string) => supplyChainVerifyAction(pkg));

  return cmd;
}
