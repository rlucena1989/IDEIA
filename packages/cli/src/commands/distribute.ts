import { Command } from 'commander';
import { createPackageMetadata, OperationalPackage } from '../distribution/package-types';
import { buildOperationalPackage } from '../distribution/package-builder';
import { computePackageChecksum } from '../distribution/package-hasher';
import { validateOperationalPackage } from '../distribution/package-validator';
import { emitPackage } from '../distribution/package-emitter';
import { buildDistributionReport } from '../distribution/distribution-report';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

export function distributeCommand(): Command {
  const cmd = new Command('distribute')
    .description('Distribuição e emissão de pacotes operacionais — Fase 13');

  cmd
    .command('package')
    .description('Constrói um pacote operacional a partir de dados')
    .argument('<data>', 'Dados do payload em JSON string')
    .option('--source <source>', 'Origem', 'local')
    .option('--target <target>', 'Destino', 'remote')
    .option('--kind <kind>', 'Tipo do pacote', 'state')
    .option('--version <version>', 'Versão', '1.0.0')
    .option('--json', 'Saída em JSON')
    .action((data: string, opts) => {
      try {
        const payload = JSON.parse(data);
        const metadata = createPackageMetadata({
          version: opts.version, source: opts.source, target: opts.target,
          kind: opts.kind, tags: ['cli-generated'],
        });
        const checksum = computePackageChecksum(JSON.stringify(payload));
        const pkg = buildOperationalPackage(metadata, payload, checksum);
        const envelope = createEnvelope({
          ok: true, command: 'distribute package', version: getCliVersion(), data: pkg,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Pacote Operacional');
        printLine(`  ID: ${pkg.metadata.packageId.substring(0, 12)}...`);
        printLine(`  Versão: ${pkg.metadata.version} | Tipo: ${pkg.metadata.kind}`);
        printLine(`  Origem: ${pkg.metadata.source} → Destino: ${pkg.metadata.target}`);
        printLine(`  Checksum: ${pkg.checksum}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao construir pacote: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('validate')
    .description('Valida integridade de um pacote')
    .argument('<data>', 'Payload em JSON string')
    .option('--checksum <hash>', 'Checksum esperado')
    .option('--json', 'Saída em JSON')
    .action((data: string, opts) => {
      try {
        const payload = JSON.parse(data);
        const metadata = createPackageMetadata({ source: 'test', target: 'test', kind: 'state' });
        const checksum = opts.checksum ?? computePackageChecksum(JSON.stringify(payload));
        const pkg = buildOperationalPackage(metadata, payload, checksum);
        const result = validateOperationalPackage(pkg);
        const envelope = createEnvelope({
          ok: result.ok, command: 'distribute validate', version: getCliVersion(), data: result,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Validação de Pacote');
        printResult('Válido', result.ok);
        for (const issue of result.issues) printLine(`  ⚠ ${issue}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na validação: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('emit')
    .description('Emite um pacote para o destino')
    .argument('<data>', 'Payload em JSON string')
    .option('--target <target>', 'Destino', 'remote')
    .option('--json', 'Saída em JSON')
    .action((data: string, opts) => {
      try {
        const payload = JSON.parse(data);
        const metadata = createPackageMetadata({ source: 'local', target: opts.target, kind: 'generation' });
        const checksum = computePackageChecksum(JSON.stringify(payload));
        const pkg = buildOperationalPackage(metadata, payload, checksum);
        const result = emitPackage(pkg, opts.target);
        const envelope = createEnvelope({
          ok: result.ok, command: 'distribute emit', version: getCliVersion(), data: result,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Emissão de Pacote');
        printResult('Emitido', result.ok, result.target);
        printLine(`  Checksum: ${result.checksum}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na emissão: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('report')
    .description('Relatório de distribuição')
    .argument('<data>', 'Payload em JSON string')
    .option('--target <target>', 'Destino', 'remote')
    .option('--json', 'Saída em JSON')
    .action((data: string, opts) => {
      try {
        const payload = JSON.parse(data);
        const metadata = createPackageMetadata({ source: 'local', target: opts.target, kind: 'publication' });
        const checksum = computePackageChecksum(JSON.stringify(payload));
        const pkg = buildOperationalPackage(metadata, payload, checksum);
        const validation = validateOperationalPackage(pkg);
        const emission = emitPackage(pkg, opts.target);
        const report = buildDistributionReport({ pkg, validation, emission });
        const envelope = createEnvelope({
          ok: report.validation.ok, command: 'distribute report', version: getCliVersion(), data: report,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Relatório de Distribuição');
        for (const s of report.summary) printLine(`  ℹ ${s}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no relatório: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
