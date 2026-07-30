import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.plan');
import type { TaskSpec } from '../planner/types';
import { createTaskSpec, inferTaskType, validateTaskSpec } from '../planner/task-spec';
import { createExecutionPlan } from '../planner/execution-plan';
import { routeCommands, isCommandAllowed } from '../planner/command-router';
import { validateTaskContext, validateTaskScope, validateDependencies, validateExecutionMode } from '../planner/task-validator';

let _activeTaskSpec: ReturnType<typeof createTaskSpec> | null = null;

export function planCommand(): Command {
  const cmd = new Command('plan');

  cmd
    .description('Planejamento de tarefas — cria, valida e gerencia planos de execução');

  cmd
    .command('create <description>')
    .description('Cria um plano de execução a partir de uma descrição em linguagem natural')
    .option('-s, --source <source>', 'Documento de origem (padrão: .ai/tasks/current-task.md)')
    .option('-i, --id <id>', 'ID da tarefa (padrão: auto-gerado)')
    .option('-t, --title <title>', 'Título da tarefa')
    .option('-r, --risk <risk>', 'Nível de risco: low|medium|high|critical')
    .option('--json', 'Saída em JSON')
    .action((description: string, options: { source?: string; id?: string; title?: string; risk?: string; json?: boolean }) => {
      const _inferredType = inferTaskType(description);
      const taskId = options.id ?? `plan-${Date.now()}`;
      const title = options.title ?? `Plan: ${description.substring(0, 60)}`;
      const source = options.source ?? '.ai/tasks/current-task.md';

      const spec = createTaskSpec({
        id: taskId,
        title,
        description,
        sourceDocument: source,
        riskLevel: (options.risk as TaskSpec['riskLevel']) ?? 'medium',
        context: [description],
        expectedOutputs: ['Execution plan generated'],
      });

      const validation = validateTaskSpec(spec);
      if (!validation.valid) {
        logger.info('⚠ Task spec validation failed:');
        for (const r of validation.reasons) logger.info('  - ${r}');
        return;
      }

      const plan = createExecutionPlan(spec);
      const commands = routeCommands(spec);

      _activeTaskSpec = spec;

      if (options.json) {
        console.log(JSON.stringify({ spec, plan, commands }, null, 2));
        return;
      }

      logger.info('📋 Plano criado: ${spec.title}');
      logger.info('   ID: ${spec.id}');
      logger.info('   Tipo: ${spec.taskType}');
      logger.info('   Fonte: ${spec.sourceDocument}');
      logger.info('   Risco: ${spec.riskLevel}');
      logger.info('   Requer aprovação: ${spec.requiresApproval ? \'Sim\' : \'Não\'}');

      if (plan.blocked) {
        logger.info('\n🔴 Plano bloqueado: ${plan.reason}');
        return;
      }

      logger.info('\n📌 Etapas:');
      for (const step of plan.steps) {
        logger.info('  ${step.id}: ${step.title}');
        logger.info('     ${step.description}');
        if (step.command) logger.info('     Comando: ${step.command}');
      }

      logger.info('\n🔧 Comandos sugeridos:');
      for (const c of commands) {
        const allowed = isCommandAllowed(c, spec);
        logger.info('  ${allowed ? \'✅\' : \'⛔\'} ${c}');
      }

      logger.info('\n✅ ${plan.successCriteria.length} critérios de sucesso definidos');
      logger.info('🏁 ${plan.checkpoints.length} checkpoints');
    });

  cmd
    .command('validate')
    .description('Valida o contexto e escopo da tarefa ativa')
    .option('--json', 'Saída em JSON')
    .action((options: { json?: boolean }) => {
      if (!_activeTaskSpec) {
        logger.info('⚠ Nenhuma tarefa ativa. Crie um plano primeiro com: ai-devkit plan create <description>');
        return;
      }

      const context = validateTaskContext(_activeTaskSpec);
      const scope = validateTaskScope(_activeTaskSpec);
      const deps = validateDependencies(_activeTaskSpec);
      const mode = validateExecutionMode(_activeTaskSpec);

      if (options.json) {
        console.log(JSON.stringify({ context, scope, deps, mode }, null, 2));
        return;
      }

      const allReasons = [...context.reasons, ...scope.reasons, ...deps.reasons, ...mode.reasons];
      const allValid = context.valid && scope.valid && deps.valid && mode.valid;

      logger.info('🔍 Validação da tarefa ativa:');
      logger.info('   ID: ${_activeTaskSpec.id}');
      logger.info('   Tipo: ${_activeTaskSpec.taskType}');
      logger.info('   Fonte: ${_activeTaskSpec.sourceDocument}\n');

      logger.info('  Contexto:   ${context.valid ? \'✅\' : \'❌\'} ${context.reasons.join(\', \')}');
      logger.info('  Escopo:     ${scope.valid ? \'✅\' : \'❌\'} ${scope.reasons.join(\', \')}');
      logger.info('  Deps:       ${deps.valid ? \'✅\' : \'❌\'} ${deps.reasons.join(\', \')}');
      logger.info('  Modo:       ${mode.valid ? \'✅\' : \'❌\'} ${mode.reasons.join(\', \')}');

      logger.info('\nStatus geral: ${allValid ? \'✅ Válido\' : \'❌ Inválido\'}');
      if (!allValid) {
        logger.info('Razões:');
        for (const r of allReasons) logger.info('  - ${r}');
      }
    });

  cmd
    .command('status')
    .description('Exibe o status do plano ativo')
    .option('--json', 'Saída em JSON')
    .action((options: { json?: boolean }) => {
      if (!_activeTaskSpec) {
        logger.info('⚠ Nenhum plano ativo.');
        return;
      }

      const plan = createExecutionPlan(_activeTaskSpec);
      const commands = routeCommands(_activeTaskSpec);

      if (options.json) {
        console.log(JSON.stringify({ spec: _activeTaskSpec, plan, commands }, null, 2));
        return;
      }

      logger.info('📊 Status do plano ativo:');
      logger.info('   Tarefa: ${_activeTaskSpec.title} (${_activeTaskSpec.id})');
      logger.info('   Tipo: ${_activeTaskSpec.taskType}');
      logger.info('   Status: ${plan.blocked ? \'🔴 Bloqueado\' : \'✅ Pronto\'}');
      if (plan.reason) logger.info('   Razão: ${plan.reason}');
      logger.info('   Etapas: ${plan.steps.length}');
      logger.info('   Comandos: ${commands.length}');
      logger.info('   Checkpoints: ${plan.checkpoints.length}');
    });

  return cmd;
}
