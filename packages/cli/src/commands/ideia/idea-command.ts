import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.ideia.idea-command');
import { Command } from 'commander';
import _path from 'node:path';

const log = createLogger('cli:commands:ideia:idea');
import { startEngineerMode, EngineerSession, listEngineerSessions } from '../engineer';
import { getIO } from '../../io';
import { keywordClassifier } from '../../intent-classifier';

interface IdeiaPlanStep {
  step: number;
  action: string;
  module: string;
  status: 'pending' | 'running' | 'done' | 'failed';
}

interface IdeiaPipelineResult {
  idea: string;
  analysis: { stack: string[]; architecture: string; risks: string[]; estimatedFiles: number };
  plan: IdeiaPlanStep[];
  session: EngineerSession;
}

export function classifyIdeaNaturalLanguage(idea: string): { stack: string[]; architecture: string; risks: string[]; estimatedFiles: number } {
  const lower = idea.toLowerCase();
  const stack: string[] = [];
  if (lower.includes('next') || lower.includes('react')) stack.push('Next.js');
  else if (lower.includes('vue')) stack.push('Vue.js');
  else if (lower.includes('angular')) stack.push('Angular');
  else stack.push('Next.js (detectado)');

  if (lower.includes('postgres') || lower.includes('sql')) stack.push('PostgreSQL');
  else if (lower.includes('mongo')) stack.push('MongoDB');
  else if (lower.includes('prisma')) stack.push('Prisma + PostgreSQL');
  else stack.push('PostgreSQL (recomendado)');

  if (lower.includes('stripe')) stack.push('Stripe');
  if (lower.includes('payment') || lower.includes('pagamento')) stack.push('Stripe (recomendado)');
  if (lower.includes('auth') || lower.includes('login')) stack.push('Auth (JWT + OAuth)');
  if (lower.includes('docker')) stack.push('Docker');
  if (lower.includes('vercel')) stack.push('Vercel');

  const architecture = lower.includes('saas') || lower.includes('multi')
    ? 'Multi-tenancy modular monolith'
    : 'Modular monolith with clean architecture';

  const risks: string[] = [];
  if (lower.includes('stripe') || lower.includes('payment')) risks.push('Webhook Stripe precisa de URL pública');
  if (lower.includes('multi') || lower.includes('tenant')) risks.push('Isolamento multi-tenancy requer atenção');
  risks.push('Migrations em deploy serverless');

  return { stack, architecture, risks, estimatedFiles: 28 + stack.length * 4 };
}

export function buildPlan(idea: string, analysis: { stack: string[] }): IdeiaPlanStep[] {
  const plan: IdeiaPlanStep[] = [
    { step: 1, action: 'Configurar estrutura do projeto', module: 'infra', status: 'pending' },
    { step: 2, action: 'Modelar banco de dados e schema', module: 'database', status: 'pending' },
    { step: 3, action: 'Implementar autenticação e autorização', module: 'auth', status: 'pending' },
    { step: 4, action: 'Criar API principal e contratos', module: 'api', status: 'pending' },
    { step: 5, action: 'Desenvolver interface do usuário', module: 'frontend', status: 'pending' },
    { step: 6, action: 'Implementar fluxos de pagamento', module: 'payments', status: 'pending' },
    { step: 7, action: 'Testes e quality gates', module: 'qa', status: 'pending' },
    { step: 8, action: 'Documentação e deploy', module: 'delivery', status: 'pending' },
  ];

  if (analysis.stack.some(s => s.toLowerCase().includes('stripe'))) {
    plan.splice(5, 0, { step: 6, action: 'Integrar gateway de pagamento', module: 'payments', status: 'pending' });
  }

  return plan;
}

export async function runIdeiaPipeline(idea: string, root: string, options?: { approve?: boolean; autonomy?: string }): Promise<IdeiaPipelineResult> {
  logger.info('\n${\'=\'.repeat(56)}');
  logger.info('  IDEIA — Pipeline de transformação');
  logger.info('${\'=\'.repeat(56)}\n');

  const analysis = classifyIdeaNaturalLanguage(idea);
  const plan = buildPlan(idea, analysis);
  const intent = keywordClassifier(idea);

  logger.info('  📋 Análise da ideia:\n');
  logger.info('     🎯 Intenção: ${intent.intent} (${intent.confidence})');
  logger.info('     Stack detectada: ${analysis.stack.join(\', \')}');
  logger.info('     Arquitetura: ${analysis.architecture}');
  logger.info('     Arquivos estimados: ~${analysis.estimatedFiles}');
  if (analysis.risks.length > 0) {
    logger.info('\n     ⚠ Riscos identificados:');
    for (const risk of analysis.risks) logger.info('       • ${risk}');
  }

  logger.info('\n  📋 Plano de implementação:\n');
  for (const step of plan) {
    logger.info('     ${step.step}. [${step.module}] ${step.action}');
  }

  const autoApprove = options?.approve || false;
  if (!autoApprove) {
    logger.info('\n  ────────────────────────────────────────');
    logger.info('  Projeto analisado. Para executar, use:');
    logger.info('    ideia idea run <sua-ideia>');
    logger.info('  ────────────────────────────────────────\n');
    return { idea, analysis, plan, session: null as unknown as EngineerSession };
  }

  const autonomyLevel = options?.autonomy || 'N2';
  logger.info('\n  🤖 Nível de autonomia: ${autonomyLevel}');
  logger.info('  🚀 Iniciando implementação...\n');

  const session = await startEngineerMode(root, idea, {
    maxIterations: 5,
    model: 'qwen2.5-coder',
    skipGates: false,
  });

  return { idea, analysis, plan, session };
}

export function ideaCommand(): Command {
  const cmd = new Command('idea')
    .description('Transforma uma ideia em linguagem natural em um plano executável');

  cmd
    .command('analyze')
    .description('Analisa uma ideia e gera plano sem executar')
    .argument('<idea>', 'Descrição da ideia em linguagem natural')
    .option('--json', 'Saída em JSON')
    .action(async (idea: string, options) => {
      try {
        const analysis = classifyIdeaNaturalLanguage(idea);
        const plan = buildPlan(idea, analysis);

        if (options.json) {
          console.log(JSON.stringify({ idea, analysis, plan }, null, 2));
          return;
        }

        logger.info('\n${\'=\'.repeat(56)}');
        logger.info('  🔍 IDEIA — Análise');
        logger.info('${\'=\'.repeat(56)}\n');
        logger.info('  Ideia: "${idea}"\n');
        const intent = keywordClassifier(idea);
        logger.info('  🎯 Intenção detectada: ${intent.intent} (confiança: ${intent.confidence})');
        if (intent.reasoning) logger.info('     ${intent.reasoning}');
        console.log('');
        logger.info('  📋 Stack detectada:');
        for (const s of analysis.stack) logger.info('     ✅ ${s}');
        logger.info('\n  🏗️  Arquitetura: ${analysis.architecture}');
        logger.info('  📦 Arquivos estimados: ~${analysis.estimatedFiles}');

        if (analysis.risks.length > 0) {
          logger.info('\n  ⚠ Riscos:');
          for (const r of analysis.risks) logger.info('     • ${r}');
        }

        logger.info('\n  📋 Plano:\n');
        for (const step of plan) {
          logger.info('     ${step.step}. [${step.module}] ${step.action}');
        }
        logger.info('\n  💡 Para executar: ideia idea run "${idea}"');
        console.log('');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`\n❌ Erro: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('run')
    .description('Executa o pipeline completo: análise → plano → implementação → entrega')
    .argument('<idea>', 'Descrição da ideia em linguagem natural')
    .option('--approve', 'Pula confirmação do plano')
    .option('--autonomy <level>', 'Nível de autonomia (N0-N4)', 'N2')
    .option('--json', 'Saída em JSON')
    .action(async (idea: string, options) => {
      try {
        const root = process.cwd();
        const result = await runIdeiaPipeline(idea, root, {
          approve: options.approve || false,
          autonomy: options.autonomy,
        });

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        if (result.session) {
          logger.info('\n${\'=\'.repeat(56)}');
          logger.info('  ✅ IDEIA — Pipeline concluído');
          logger.info('${\'=\'.repeat(56)}\n');
          logger.info('  Sessão: ${result.session.id}');
          logger.info('  Status: ${result.session.status}');
          logger.info('  Iterações: ${result.session.iteration}/${result.session.maxIterations}');

          const passed = result.session.gates.filter(g => g.status === 'passed').length;
          const total = result.session.gates.length;
          if (total > 0) logger.info('  Gates: ${passed}/${total}');
          console.log('');
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`\n❌ Erro: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('status')
    .description('Mostra o status das ideas em execução')
    .option('--json', 'Saída em JSON')
    .action((options) => {
      try {
        const root = process.cwd();
        const sessions = listEngineerSessions(root);

        if (options.json) {
          console.log(JSON.stringify(sessions, null, 2));
          return;
        }

        if (sessions.length === 0) {
          logger.info('\n  Nenhuma ideia em execução.\n');
          return;
        }

        logger.info('\n${\'=\'.repeat(56)}');
        logger.info('  📋 IDEIA — Projetos em andamento');
        logger.info('${\'=\'.repeat(56)}\n');

        for (const s of sessions) {
          const icon = s.status === 'completed' ? '✅' : s.status === 'failed' ? '❌' : '⏳';
          logger.info('  ${icon} ${s.task.slice(0, 80)}');
          logger.info('     ID: ${s.id} | Status: ${s.status} | Atualizado: ${new Date(s.updatedAt).toLocaleString()}');
          console.log('');
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`\n❌ Erro: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}

