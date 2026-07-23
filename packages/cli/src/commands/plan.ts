import { Command } from 'commander';
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
        console.log('⚠ Task spec validation failed:');
        for (const r of validation.reasons) console.log(`  - ${r}`);
        return;
      }

      const plan = createExecutionPlan(spec);
      const commands = routeCommands(spec);

      _activeTaskSpec = spec;

      if (options.json) {
        console.log(JSON.stringify({ spec, plan, commands }, null, 2));
        return;
      }

      console.log(`📋 Plano criado: ${spec.title}`);
      console.log(`   ID: ${spec.id}`);
      console.log(`   Tipo: ${spec.taskType}`);
      console.log(`   Fonte: ${spec.sourceDocument}`);
      console.log(`   Risco: ${spec.riskLevel}`);
      console.log(`   Requer aprovação: ${spec.requiresApproval ? 'Sim' : 'Não'}`);

      if (plan.blocked) {
        console.log(`\n🔴 Plano bloqueado: ${plan.reason}`);
        return;
      }

      console.log('\n📌 Etapas:');
      for (const step of plan.steps) {
        console.log(`  ${step.id}: ${step.title}`);
        console.log(`     ${step.description}`);
        if (step.command) console.log(`     Comando: ${step.command}`);
      }

      console.log('\n🔧 Comandos sugeridos:');
      for (const c of commands) {
        const allowed = isCommandAllowed(c, spec);
        console.log(`  ${allowed ? '✅' : '⛔'} ${c}`);
      }

      console.log(`\n✅ ${plan.successCriteria.length} critérios de sucesso definidos`);
      console.log(`🏁 ${plan.checkpoints.length} checkpoints`);
    });

  cmd
    .command('validate')
    .description('Valida o contexto e escopo da tarefa ativa')
    .option('--json', 'Saída em JSON')
    .action((options: { json?: boolean }) => {
      if (!_activeTaskSpec) {
        console.log('⚠ Nenhuma tarefa ativa. Crie um plano primeiro com: ai-devkit plan create <description>');
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

      console.log('🔍 Validação da tarefa ativa:');
      console.log(`   ID: ${_activeTaskSpec.id}`);
      console.log(`   Tipo: ${_activeTaskSpec.taskType}`);
      console.log(`   Fonte: ${_activeTaskSpec.sourceDocument}\n`);

      console.log(`  Contexto:   ${context.valid ? '✅' : '❌'} ${context.reasons.join(', ')}`);
      console.log(`  Escopo:     ${scope.valid ? '✅' : '❌'} ${scope.reasons.join(', ')}`);
      console.log(`  Deps:       ${deps.valid ? '✅' : '❌'} ${deps.reasons.join(', ')}`);
      console.log(`  Modo:       ${mode.valid ? '✅' : '❌'} ${mode.reasons.join(', ')}`);

      console.log(`\nStatus geral: ${allValid ? '✅ Válido' : '❌ Inválido'}`);
      if (!allValid) {
        console.log('Razões:');
        for (const r of allReasons) console.log(`  - ${r}`);
      }
    });

  cmd
    .command('status')
    .description('Exibe o status do plano ativo')
    .option('--json', 'Saída em JSON')
    .action((options: { json?: boolean }) => {
      if (!_activeTaskSpec) {
        console.log('⚠ Nenhum plano ativo.');
        return;
      }

      const plan = createExecutionPlan(_activeTaskSpec);
      const commands = routeCommands(_activeTaskSpec);

      if (options.json) {
        console.log(JSON.stringify({ spec: _activeTaskSpec, plan, commands }, null, 2));
        return;
      }

      console.log('📊 Status do plano ativo:');
      console.log(`   Tarefa: ${_activeTaskSpec.title} (${_activeTaskSpec.id})`);
      console.log(`   Tipo: ${_activeTaskSpec.taskType}`);
      console.log(`   Status: ${plan.blocked ? '🔴 Bloqueado' : '✅ Pronto'}`);
      if (plan.reason) console.log(`   Razão: ${plan.reason}`);
      console.log(`   Etapas: ${plan.steps.length}`);
      console.log(`   Comandos: ${commands.length}`);
      console.log(`   Checkpoints: ${plan.checkpoints.length}`);
    });

  return cmd;
}
