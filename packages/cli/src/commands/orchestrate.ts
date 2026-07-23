import { Command } from 'commander';
import _path from 'node:path';
import { createInitialState, orchestrateCycle, advancePhase, resumeFromCheckpoint, PHASE_NAMES } from '../runtime/phase-orchestrator';
import { createCheckpoint, listCheckpoints, loadLatestCheckpoint } from '../runtime/checkpoint-manager';
import { buildDecisionRequest, buildDecisionPrompt, resolveDecision, checkDecisionCompleteness } from '../runtime/decision-center';
import { decomposeTask } from '../runtime/task-decomposer';
import { routeTask, routeBatch } from '../runtime/model-router';
import { getReadyTasks, getBlockedTasks } from '../runtime/unlock-engine';
import { getEffectiveAutonomyLevel, buildAutonomySummary } from '../runtime/autonomy-policy';
import { TaskNode, TaskStatus } from '../runtime/orchestration-types';

function getCwd(): string {
  return process.cwd();
}

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function orchestrateCommand(): Command {
  const cmd = new Command('orchestrate')
    .description('Orquestracao mista — ciclo autonomo com checkpoints, decisoes humanas e multi-modelo');

  cmd
    .command('start')
    .description('Inicia um ciclo de orquestracao')
    .option('--autonomy <level>', 'Nivel de autonomia (autonomous, guided, blocked)', 'guided')
    .option('--json', 'Saida em JSON')
    .action(async (options) => {
      const cwd = getCwd();
      const _sampleTask: TaskNode = {
        id: 'main-task',
        name: 'Feature principal',
        description: 'Implementar feature com estrutura, logica e validacao',
        phase: 'structuring',
        status: 'pending',
        dependsOn: [],
        blockedBy: [],
        riskLevel: 'medium',
        estimatedEffort: 'hours',
        canParallelize: true,
        isDeterministic: false,
        requiresLLM: true,
        requiredModelTier: 'lightweight',
      };

      const decomposed = decomposeTask({
        id: 'main-task',
        name: 'Feature principal',
        description: 'Implementar feature completa',
        estimatedComplexity: 'medium',
        domain: ['typescript', 'backend'],
        hasLLMRequirement: true,
        hasDeterministicParts: true,
      }, 'structuring');

      const allTasks = decomposed.subtasks;
      let state = createInitialState(cwd, allTasks, options.autonomy);

      let iterations = 0;
      const maxIterations = 10;

      while (iterations < maxIterations) {
        const result = orchestrateCycle(state, cwd);
        state = result.state;

        if (result.executed.length > 0) {
          // Actions were executed this cycle
        }

        if (result.decisions.length > 0) {
          // Decisions were made this cycle
        }

        const transition = advancePhase(state, cwd);
        state = transition.state;

        if (state.phases.every(p =>
          p.tasks.every(t => t.status === 'completed' || t.status === 'validated'),
        )) {
          break;
        }

        if (result.executed.length === 0 && result.decisions.length === 0) {
          break;
        }

        iterations++;
      }

      if (options.json) {
        console.log(JSON.stringify({
          state: {
            currentPhase: state.currentPhase,
            executionMode: state.executionMode,
            autonomyLevel: state.autonomyLevel,
            confidence: state.confidence,
            phases: state.phases.map(p => ({
              id: p.id,
              name: p.name,
              status: p.status,
              progress: p.progress,
              completedTasks: p.completedTasks,
              totalTasks: p.totalTasks,
            })),
          },
          checkpoints: state.checkpoints.length,
          pendingDecisions: state.pendingDecisions.length,
          decomposed: {
            subtasks: decomposed.subtasks.length,
            parallelGroups: decomposed.parallelGroups.length,
          },
        }, null, 2));
        return;
      }

      console.log(`\n=== Orquestracao Iniciada ===`);
      console.log(`Fase atual: ${PHASE_NAMES[state.currentPhase]} (${state.currentPhase})`);
      console.log(`Modo: ${state.executionMode}`);
      console.log(`Confianca: ${(state.confidence * 100).toFixed(0)}%`);
      console.log(`${buildAutonomySummary(state.autonomyLevel, state.confidence)}`);
      console.log(`\nFases:`);
      for (const p of state.phases) {
        const icon = p.status === 'completed' ? '✅' : p.status === 'ready' ? '🟢' : p.status === 'running' ? '🔄' : '⏳';
        const progress = p.totalTasks > 0 ? `${p.completedTasks}/${p.totalTasks}` : '-';
        console.log(`  ${icon} ${p.name.padEnd(30)} ${progress} (${p.progress}%)`);
      }
      console.log(`\nCheckpoints: ${state.checkpoints.length}`);
      console.log(`Decisoes pendentes: ${state.pendingDecisions.length}`);
      console.log(`Tarefas decompostas: ${decomposed.subtasks.length} (${decomposed.parallelGroups.length} grupos paralelos)`);
    });

  cmd
    .command('status')
    .description('Mostra estado atual da orquestracao')
    .option('--json', 'Saida em JSON')
    .action((options) => {
      const cwd = getCwd();
      const latest = loadLatestCheckpoint(cwd);

      if (!latest) {
        console.log('Nenhum checkpoint encontrado. Use `orchestrate start` para iniciar.');
        return;
      }

      const cps = listCheckpoints(cwd);

      if (options.json) {
        console.log(JSON.stringify({ latestCheckpoint: latest, total: cps.length, checkpoints: cps }, null, 2));
        return;
      }

      console.log(`\n=== Status da Orquestracao ===`);
      console.log(`Ultimo checkpoint: ${latest.id}`);
      console.log(`Fase: ${PHASE_NAMES[latest.phase]} (${latest.phase})`);
      console.log(`Status: ${latest.status}`);
      console.log(`Total checkpoints: ${cps.length}`);
      console.log(`\nCheckpoints por fase:`);
      const byPhase = new Map<string, number>();
      for (const cp of cps) {
        byPhase.set(cp.phase, (byPhase.get(cp.phase) ?? 0) + 1);
      }
      for (const [phase, count] of byPhase) {
        console.log(`  ${PHASE_NAMES[phase as keyof typeof PHASE_NAMES] ?? phase}: ${count}`);
      }
    });

  cmd
    .command('resume')
    .description('Retoma orquestracao do ultimo checkpoint')
    .option('--json', 'Saida em JSON')
    .action((options) => {
      const cwd = getCwd();
      const state = resumeFromCheckpoint(cwd);

      if (!state) {
        console.log('Nenhum checkpoint encontrado para retomar.');
        return;
      }

      if (options.json) {
        console.log(JSON.stringify({
          currentPhase: state.currentPhase,
          pendingDecisions: state.pendingDecisions.length,
          checkpoints: state.checkpoints.length,
        }, null, 2));
        return;
      }

      console.log(`\n=== Orquestracao Retomada ===`);
      console.log(`Fase atual: ${PHASE_NAMES[state.currentPhase]} (${state.currentPhase})`);
      console.log(`Checkpoints: ${state.checkpoints.length}`);
      console.log(`Decisoes pendentes: ${state.pendingDecisions.length}`);

      if (state.pendingDecisions.length > 0) {
        console.log(`\nDecisoes pendentes:`);
        for (const dec of state.pendingDecisions) {
          console.log(`  [${dec.id}] ${dec.title}`);
          console.log(`    Motivo: ${dec.reason}`);
        }
      }
    });

  cmd
    .command('checkpoints')
    .description('Lista checkpoints')
    .option('--phase <phase>', 'Filtrar por fase')
    .option('--json', 'Saida em JSON')
    .action((options) => {
      const cwd = getCwd();
      const cps = listCheckpoints(cwd)
        .filter(cp => !options.phase || cp.phase === options.phase);

      if (options.json) {
        console.log(JSON.stringify(cps, null, 2));
        return;
      }

      if (cps.length === 0) {
        console.log('Nenhum checkpoint encontrado.');
        return;
      }

      console.log(`\n=== Checkpoints (${cps.length}) ===`);
      for (const cp of cps.slice(0, 20)) {
        const icon = cp.status === 'completed' ? '✅' : cp.status === 'needs-decision' ? '❓' : cp.status === 'failed' ? '❌' : '⏳';
        console.log(`  ${icon} ${cp.id}`);
        console.log(`     Fase: ${cp.phase} | Task: ${cp.taskId ?? '-'} | Status: ${cp.status}`);
        if (cp.metrics) {
          const m = [];
          if (cp.metrics.coverage !== undefined) m.push(`cov:${cp.metrics.coverage}%`);
          if (cp.metrics.scorecard !== undefined) m.push(`score:${cp.metrics.scorecard}`);
          if (cp.metrics.risk !== undefined) m.push(`risk:${cp.metrics.risk}`);
          if (m.length > 0) console.log(`     Metricas: ${m.join(', ')}`);
        }
      }
      if (cps.length > 20) {
        console.log(`  ... e mais ${cps.length - 20} checkpoints`);
      }
    });

  cmd
    .command('decide')
    .description('Resolve uma decisao pendente')
    .argument('<decision-id>', 'ID da decisao pendente')
    .option('--option <id>', 'Opcao escolhida (A, B, C)')
    .option('--custom <value>', 'Resposta personalizada')
    .option('--reason <text>', 'Justificativa')
    .option('--json', 'Saida em JSON')
    .action((decisionId, options) => {
      const cwd = getCwd();
      const cps = listCheckpoints(cwd);
      const pendingCp = cps.find(c => c.status === 'needs-decision' && c.id === decisionId);

      if (!pendingCp) {
        const decCp = cps.find(c => c.id === decisionId);
        if (decCp) {
          console.log(`Checkpoint ${decisionId} ja foi resolvido (status: ${decCp.status}).`);
          return;
        }
        console.log(`Decisao ${decisionId} nao encontrada.`);
        return;
      }

      const decReq = buildDecisionRequest(
        'Retomada de checkpoint',
        `Decisao para checkpoint ${pendingCp.id}`,
        'Checkpoint requer decisao humana',
        `Fase: ${pendingCp.phase}`,
        pendingCp,
        'Opcao recomendada: B',
      );

      const optionId = options.option;
      const customValue = options.custom;
      const rationale = options.reason;

      const record = resolveDecision(decReq, optionId, customValue, rationale);

      const { attachDecisionToCheckpoint } = require('../runtime/checkpoint-manager');
      attachDecisionToCheckpoint(cwd, pendingCp.id, record);

      if (options.json) {
        console.log(JSON.stringify({ decisionId, record }, null, 2));
        return;
      }

      const label = optionId
        ? decReq.options.find(o => o.id === optionId)?.label ?? optionId
        : 'Personalizada';
      console.log(`\n✅ Decisao registrada:`);
      console.log(`  Checkpoint: ${pendingCp.id}`);
      console.log(`  Opcao: ${label}`);
      console.log(`  Justificativa: ${rationale ?? 'nenhuma'}`);
      console.log(`  Pronto para retomar: use \`orchestrate resume\``);
    });

  cmd
    .command('explain-decision')
    .description('Mostra detalhes e ajuda sobre uma decisao')
    .argument('<decision-id>', 'ID da decisao')
    .option('--json', 'Saida em JSON')
    .action((decisionId, options) => {
      const cwd = getCwd();
      const cps = listCheckpoints(cwd);
      const cp = cps.find(c => c.id === decisionId);

      if (!cp) {
        console.log(`Checkpoint ${decisionId} nao encontrado.`);
        return;
      }

      const decReq = buildDecisionRequest(
        cp.taskId ? `Decisao: ${cp.taskId}` : 'Decisao de checkpoint',
        `Checkpoint na fase ${cp.phase}`,
        cp.status === 'needs-decision' ? 'Checkpoint requer decisao humana' : 'Analise de checkpoint',
        `Fase: ${cp.phase} | Task: ${cp.taskId ?? '-'} | Status: ${cp.status}\nCriado em: ${cp.createdAt}\nProximas acoes: ${cp.nextActions.join(', ') || 'nenhuma'}`,
        cp,
        'Opcao recomendada: B (equilibrio risco/avanca)',
      );

      const completeness = checkDecisionCompleteness(decReq);
      const prompt = buildDecisionPrompt(decReq);

      if (options.json) {
        console.log(JSON.stringify({
          checkpoint: {
            id: cp.id,
            phase: cp.phase,
            taskId: cp.taskId,
            status: cp.status,
            createdAt: cp.createdAt,
            nextActions: cp.nextActions,
            metrics: cp.metrics,
          },
          decisionRequest: decReq,
          completeness,
          prompt: {
            title: prompt.title,
            summary: prompt.summary,
            impact: prompt.impact,
            recommendedAction: prompt.recommendedAction,
            formatted: prompt.formatted,
          },
        }, null, 2));
        return;
      }

      console.log(`\n${prompt.formatted}`);
      console.log(`\n--- Analise de Completeza ---`);
      if (completeness.complete) {
        console.log('Decisao em formato 3+1 completo (A, B, C, D).');
      } else {
        console.log(`Itens faltantes: ${completeness.missing.join(', ')}`);
      }

      const phaseName = typeof PHASE_NAMES === 'object' && PHASE_NAMES !== null
        ? (PHASE_NAMES as Record<string, string>)[cp.phase] ?? cp.phase
        : cp.phase;
      console.log(`\n--- Resumo do Checkpoint ---`);
      console.log(`Fase: ${phaseName}`);
      console.log(`Task: ${cp.taskId ?? '-'}`);
      console.log(`Status: ${cp.status}`);
      console.log(`Proximas acoes: ${cp.nextActions.join(', ') || 'nenhuma'}`);
      if (cp.metrics) {
        console.log(`Metricas: cobertura=${cp.metrics.coverage ?? '-'}% | scorecard=${cp.metrics.scorecard ?? '-'} | risco=${cp.metrics.risk ?? '-'}`);
      }
    });

  cmd
    .command('decompose')
    .description('Decompoe uma tarefa em subtarefas')
    .argument('<task-name>', 'Nome da tarefa')
    .option('--complexity <level>', 'Complexidade (low, medium, high)', 'medium')
    .option('--domain <domains>', 'Dominios separados por virgula', 'typescript')
    .option('--json', 'Saida em JSON')
    .action((taskName, options) => {
      const decomposed = decomposeTask({
        id: taskName.toLowerCase().replace(/\s+/g, '-'),
        name: taskName,
        description: `Implementar ${taskName}`,
        estimatedComplexity: options.complexity,
        domain: options.domain.split(',').map((d: string) => d.trim()),
        hasLLMRequirement: true,
        hasDeterministicParts: true,
      }, 'structuring');

      if (options.json) {
        console.log(JSON.stringify(decomposed, null, 2));
        return;
      }

      console.log(`\n=== Decomposicao: ${taskName} ===`);
      console.log(`Sub-tarefas: ${decomposed.subtasks.length}`);
      console.log(`Grupos paralelos: ${decomposed.parallelGroups.length}`);
      console.log(`Dependencias: ${decomposed.dependencies.length}`);
      console.log(`\nSub-tarefas:`);
      for (const st of decomposed.subtasks) {
        const icon = st.isDeterministic ? '⚙️' : '🤖';
        const deps = st.dependsOn.length > 0 ? ` (deps: ${st.dependsOn.join(', ')})` : '';
        console.log(`  ${icon} ${st.name}${deps}`);
      }
      console.log(`\nGrupos paralelos:`);
      for (let i = 0; i < decomposed.parallelGroups.length; i++) {
        console.log(`  Grupo ${i + 1}: ${decomposed.parallelGroups[i]!.join(', ')}`);
      }
    });

  return cmd;
}
