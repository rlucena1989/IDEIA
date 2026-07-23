import { Command } from 'commander';
import { handleDocResolve, handleDocAudit, handleDocSources, handleDocPolicy, handleDocStatus, DocResolveOutput, DocAuditOutput, DocSourcesOutput, DocPolicyOutput, DocStatusOutput } from '../domain/doc-service';
import { KnowledgeBase } from '../knowledge/knowledge-base';
import { createKnowledgeEntry } from '../knowledge/knowledge-types';
import { generateMarkdownDocs, buildDocumentationArtifact } from '../knowledge/doc-generator';
import { syncDocumentation } from '../knowledge/doc-sync';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine } from '../utils/output';
import { getCliVersion } from '../utils/version';

const knowledgeBase = new KnowledgeBase();

export function docsCommand(): Command {
  const cmd = new Command('docs');
  cmd.description('Governança documental — resolve, audita e consulta fontes de verdade');

  cmd
    .command('resolve <task-type>')
    .description('Resolve o documento primário para um tipo de tarefa')
    .action((taskType: string) => {
      const result = handleDocResolve(taskType);
      if (!result.ok) {
        const data = result.error?.details as DocResolveOutput | undefined;
        console.log(`⚠ Bloqueado: ${result.message}`);
        if (data?.fallbacks) {
          console.log('Fallbacks disponíveis:');
          for (const fb of data.fallbacks as Array<{ id: string; path: string; priority: number }>) {
            console.log(`  ${fb.id} (${fb.path}) — prioridade ${fb.priority}`);
          }
        }
        return;
      }
      const data = result.data as DocResolveOutput;
      console.log(`✅ ${result.message}`);
      const primary = data.primary as { path: string; category: string; priority: number } | null;
      if (primary) {
        console.log(`   Caminho: ${primary.path}`);
        console.log(`   Categoria: ${primary.category}`);
        console.log(`   Prioridade: ${primary.priority}`);
      }
      if (data.fallbacks.length > 0) {
        console.log('Fallbacks:');
        for (const fb of data.fallbacks as Array<{ id: string; path: string; priority: number }>) {
          console.log(`  ${fb.id} (${fb.path}) — prioridade ${fb.priority}`);
        }
      }
    });

  cmd
    .command('audit')
    .description('Audita conflitos entre documentos de governança')
    .option('--json', 'Saída em JSON')
    .action((options: { json?: boolean }) => {
      const result = handleDocAudit();
      if (options.json) {
        console.log(JSON.stringify(result.data ?? result.error?.details, null, 2));
        return;
      }
      const data = result.data as DocAuditOutput;
      const conflicts = data.conflicts as Array<{ severity: string; taskType: string; reason: string; documents: string[]; recommendation: string }>;
      const status = data.status;
      console.log(`Status: ${status === 'clean' ? '✅ Clean' : status === 'warning' ? '⚠ Warning' : '🔴 Blocked'}`);
      console.log(`${conflicts.length} conflitos encontrados`);
      for (const c of conflicts) {
        const icon = c.severity === 'critical' ? '🔴' : c.severity === 'high' ? '🟠' : c.severity === 'medium' ? '🟡' : '🟢';
        console.log(`\n${icon} [${c.severity.toUpperCase()}] ${c.taskType}`);
        console.log(`   Motivo: ${c.reason}`);
        console.log(`   Documentos: ${c.documents.join(', ')}`);
        console.log(`   Recomendação: ${c.recommendation}`);
      }
      if (data.status === 'blocked') {
        console.log('\n🔴 Conflitos críticos bloqueiam execução automática.');
      }
    });

  cmd
    .command('sources')
    .description('Lista todas as fontes de verdade documentais')
    .option('--category <category>', 'Filtrar por categoria (task|plan|procedure|metric|roadmap|policy|reference)')
    .option('--json', 'Saída em JSON')
    .action((options: { category?: string; json?: boolean }) => {
      const result = handleDocSources(options.category);
      if (options.json) {
        console.log(JSON.stringify(result.data?.documents, null, 2));
        return;
      }
      const sourcesData = result.data as DocSourcesOutput;
      const docs = sourcesData.documents as Array<{ id: string; title: string; path: string; category: string; priority: number; tags: string[] }>;
      console.log(`📚 Fontes de verdade (${docs.length} ativas):\n`);
      for (const doc of docs) {
        console.log(`  ${doc.id}`);
        console.log(`    Título: ${doc.title}`);
        console.log(`    Caminho: ${doc.path}`);
        console.log(`    Categoria: ${doc.category}`);
        console.log(`    Prioridade: ${doc.priority}`);
        console.log(`    Tags: ${doc.tags.join(', ')}`);
        console.log('');
      }
    });

  cmd
    .command('policy [task-type]')
    .description('Exibe políticas documentais por tipo de tarefa')
    .option('--json', 'Saída em JSON')
    .action((taskType: string | undefined, options: { json?: boolean }) => {
      const result = handleDocPolicy(taskType);
      if (options.json) {
        console.log(JSON.stringify(result.data?.policies, null, 2));
        return;
      }
      const policyData = result.data as DocPolicyOutput;
      const policies = policyData.policies as Array<{ primaryDocument: string; fallbackDocuments?: string[]; conflictRule: string; executionMode: string; requiresApproval: boolean; taskType?: string }>;
      if (policies.length === 0) {
        console.log(`Nenhuma política encontrada para "${taskType}"`);
        return;
      }
      if (taskType && policies.length === 1) {
        const p = policies[0];
        console.log(`Política para "${taskType}":`);
        console.log(`  Documento primário: ${p.primaryDocument}`);
        console.log(`  Fallbacks: ${p.fallbackDocuments?.join(', ')}`);
        console.log(`  Regra de conflito: ${p.conflictRule}`);
        console.log(`  Modo de execução: ${p.executionMode}`);
        console.log(`  Requer aprovação: ${p.requiresApproval ? 'Sim' : 'Não'}`);
        return;
      }
      console.log(`📋 Políticas documentais (${policies.length}):\n`);
      for (const p of policies) {
        console.log(`  ${p.taskType}`);
        console.log(`    Primário: ${p.primaryDocument} | Regra: ${p.conflictRule} | Modo: ${p.executionMode}`);
        console.log('');
      }
    });

  cmd
    .command('status')
    .description('Status da governança documental')
    .option('--json', 'Saída em JSON')
    .action((options: { json?: boolean }) => {
      const result = handleDocStatus();
      if (options.json) {
        console.log(JSON.stringify(result.data, null, 2));
        return;
      }
      const data = result.data as DocStatusOutput;
      console.log('📊 Status da Governança Documental');
      console.log('═══════════════════════════════════\n');
      console.log(`Documentos ativos: ${data.totalDocuments}`);
      console.log(`Políticas definidas: ${data.totalPolicies}`);
      console.log(`Conflitos detectados: ${data.conflicts}`);
      const statusLabel = data.status === 'clean' ? '✅ Clean' : data.status === 'warning' ? '⚠ Warning' : '🔴 Blocked';
      console.log(`Status da auditoria: ${statusLabel}`);
      console.log('');
      console.log('Para detalhes, use:');
      console.log('  ai-devkit docs sources        — listar fontes');
      console.log('  ai-devkit docs policy         — listar políticas');
      console.log('  ai-devkit docs audit          — auditar conflitos');
      console.log('  ai-devkit docs resolve <type> — resolver documento');
    });

  cmd
    .command('generate')
    .description('Gera documentação viva a partir do conhecimento — Fase 29')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const entries = knowledgeBase.list();
        const artifact = buildDocumentationArtifact(entries, 'living-docs', '1.0');
        const envelope = createEnvelope({
          ok: true, command: 'docs generate', version: getCliVersion(),
          data: { artifact: { name: artifact.name, type: artifact.type, version: artifact.version, length: artifact.content.length } },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Documentação Viva');
        printLine(`  Artefato: ${artifact.name} (${artifact.type})`);
        printLine(`  Versão: ${artifact.version}`);
        printLine(`  Tamanho: ${artifact.content.length} caracteres`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na geração: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('sync')
    .description('Sincroniza artefatos de documentação — Fase 29')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const entries = knowledgeBase.list();
        const artifact = buildDocumentationArtifact(entries, 'sync-docs', '1.0');
        const result = syncDocumentation([artifact]);
        const envelope = createEnvelope({
          ok: true, command: 'docs sync', version: getCliVersion(),
          data: { syncedCount: result.syncedCount, timestamp: result.timestamp },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Sincronização de Documentação');
        printLine(`  ${result.syncedCount} artefato(s) sincronizado(s)`);
        printLine(`  Timestamp: ${result.timestamp}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na sincronização: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('publish')
    .description('Publica documentação como artefato versionado — Fase 29')
    .argument('<version>', 'Versão a publicar')
    .option('--json', 'Saída em JSON')
    .action((version: string, opts) => {
      try {
        const entries = knowledgeBase.list();
        const artifact = buildDocumentationArtifact(entries, 'published-docs', version);
        const envelope = createEnvelope({
          ok: true, command: 'docs publish', version: getCliVersion(),
          data: { artifact: { name: artifact.name, version: artifact.version, type: artifact.type, length: artifact.content.length } },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Publicação de Documentação');
        printLine(`  Versão: ${version}`);
        printLine(`  Artefato: ${artifact.name}`);
        printLine(`  Tamanho: ${artifact.content.length} caracteres`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na publicação: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
