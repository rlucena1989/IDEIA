import { Command } from 'commander';
import _path from 'node:path';
import { createStructuredLogger } from '@ideia/logger';
import { createInitialState, orchestrateCycle, advancePhase, resumeFromCheckpoint, PHASE_NAMES } from '../runtime/phase-orchestrator';
import { createCheckpoint, listCheckpoints, loadLatestCheckpoint } from '../runtime/checkpoint-manager';
import { buildDecisionRequest, buildDecisionPrompt, resolveDecision, checkDecisionCompleteness } from '../runtime/decision-center';
import { decomposeTask } from '../runtime/task-decomposer';
import { routeTask, routeBatch } from '../runtime/model-router';
import { getReadyTasks, getBlockedTasks } from '../runtime/unlock-engine';
import { getEffectiveAutonomyLevel, buildAutonomySummary } from '../runtime/autonomy-policy';
import { TaskNode, TaskStatus } from '../runtime/orchestration-types';

const logger = createStructuredLogger('cli:orchestrate');

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
        logger.info('Orchestration state', { state: {
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
        });
        return;
      }

      logger.info('Orchestration started', { 
        phase: PHASE_NAMES[state.currentPhase],
        phaseId: state.currentPhase,
        mode: state.executionMode,
        confidence: (state.confidence * 100).toFixed(0) + '%',
        autonomy: buildAutonomySummary(state.autonomyLevel, state.confidence),
        checkpoints: state.checkpoints.length,
        pendingDecisions: state.pendingDecisions.length,
        subtasks: decomposed.subtasks.length,
        parallelGroups: decomposed.parallelGroups.length,
        phases: state.phases.map(p => ({
          name: p.name,
          status: p.status,
          progress: p.progress,
          completedTasks: p.completedTasks,
          totalTasks: p.totalTasks
        }))
      });
    });

  cmd
    .command('status')
    .description('Mostra estado atual da orquestracao')
    .option('--json', 'Saida em JSON')
    .action((options) => {
      const cwd = getCwd();
      const latest = loadLatestCheckpoint(cwd);

      if (!latest) {
        logger.warn('No checkpoint found', { message: 'Use `orchestrate start` to initiate' });
        return;
      }

      const cps = listCheckpoints(cwd);

      if (options.json) {
        logger.info('Checkpoint status', { latestCheckpoint: latest, total: cps.length, checkpoints: cps });
        return;
      }

      const byPhase = new Map<string, number>();
      for (const cp of cps) {
        byPhase.set(cp.phase, (byPhase.get(cp.phase) ?? 0) + 1);
      }
      
      logger.info('Orchestration status', {
        latestCheckpoint: latest.id,
        phase: PHASE_NAMES[latest.phase],
        phaseId: latest.phase,
        status: latest.status,
        totalCheckpoints: cps.length,
        checkpointsByPhase: Object.fromEntries(byPhase)
      });
    });

  cmd
    .command('resume')
    .description('Retoma orquestracao do ultimo checkpoint')
    .option('--json', 'Saida em JSON')
    .action((options) => {
      const cwd = getCwd();
      const state = resumeFromCheckpoint(cwd);

      if (!state) {
        logger.warn('No checkpoint found to resume');
        return;
      }

      if (options.json) {
        logger.info('Resume state', {
          currentPhase: state.currentPhase,
          pendingDecisions: state.pendingDecisions.length,
          checkpoints: state.checkpoints.length,
        });
        return;
      }

      logger.info('Orchestration resumed', {
        phase: PHASE_NAMES[state.currentPhase],
        phaseId: state.currentPhase,
        checkpoints: state.checkpoints.length,
        pendingDecisions: state.pendingDecisions.length,
        pendingDecisionsList: state.pendingDecisions.map(dec => ({
          id: dec.id,
          title: dec.title,
          reason: dec.reason
        }))
      });
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
        logger.info('Nenhum checkpoint encontrado.');
        return;
      }

      logger.info('\n=== Checkpoints (${cps.length}) ===');
      for (const cp of cps.slice(0, 20)) {
        const icon = cp.status === 'completed' ? '✅' : cp.status === 'needs-decision' ? '❓' : cp.status === 'failed' ? '❌' : '⏳';
        logger.info('  ${icon} ${cp.id}');
        logger.info('     Fase: ${cp.phase} | Task: ${cp.taskId ?? \'-\'} | Status: ${cp.status}');
        if (cp.metrics) {
          const m = [];
          if (cp.metrics.coverage !== undefined) m.push(`cov:${cp.metrics.coverage}%`);
          if (cp.metrics.scorecard !== undefined) m.push(`score:${cp.metrics.scorecard}`);
          if (cp.metrics.risk !== undefined) m.push(`risk:${cp.metrics.risk}`);
          if (m.length > 0) logger.info('     Metricas: ${m.join(\', \')}');
        }
      }
      if (cps.length > 20) {
        logger.info('  ... e mais ${cps.length - 20} checkpoints');
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
          logger.info('Checkpoint ${decisionId} ja foi resolvido (status: ${decCp.status}).');
          return;
        }
        logger.info('Decisao ${decisionId} nao encontrada.');
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
      logger.info('\n✅ Decisao registrada:');
      logger.info('  Checkpoint: ${pendingCp.id}');
      logger.info('  Opcao: ${label}');
      logger.info('  Justificativa: ${rationale ?? \'nenhuma\'}');
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
        logger.info('Checkpoint ${decisionId} nao encontrado.');
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

      logger.info('\n${prompt.formatted}');
      logger.info('\n--- Analise de Completeza ---');
      if (completeness.complete) {
        logger.info('Decisao em formato 3+1 completo (A, B, C, D).');
      } else {
        logger.info('Itens faltantes: ${completeness.missing.join(\', \')}');
      }

      const phaseName = typeof PHASE_NAMES === 'object' && PHASE_NAMES !== null
        ? (PHASE_NAMES as Record<string, string>)[cp.phase] ?? cp.phase
        : cp.phase;
      logger.info('\n--- Resumo do Checkpoint ---');
      logger.info('Fase: ${phaseName}');
      logger.info('Task: ${cp.taskId ?? \'-\'}');
      logger.info('Status: ${cp.status}');
      logger.info('Proximas acoes: ${cp.nextActions.join(\', \') || \'nenhuma\'}');
      if (cp.metrics) {
        logger.info('Metricas: cobertura=${cp.metrics.coverage ?? \'-\'}% | scorecard=${cp.metrics.scorecard ?? \'-\'} | risco=${cp.metrics.risk ?? \'-\'}');
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

      logger.info('\n=== Decomposicao: ${taskName} ===');
      logger.info('Sub-tarefas: ${decomposed.subtasks.length}');
      logger.info('Grupos paralelos: ${decomposed.parallelGroups.length}');
      logger.info('Dependencias: ${decomposed.dependencies.length}');
      logger.info('\nSub-tarefas:');
      for (const st of decomposed.subtasks) {
        const icon = st.isDeterministic ? '⚙️' : '🤖';
        const deps = st.dependsOn.length > 0 ? ` (deps: ${st.dependsOn.join(', ')})` : '';
        logger.info('  ${icon} ${st.name}${deps}');
      }
      logger.info('\nGrupos paralelos:');
      for (let i = 0; i < decomposed.parallelGroups.length; i++) {
        logger.info('  Grupo ${i + 1}: ${(decomposed.parallelGroups[i] ?? []).join(\', \')}');
      }
    });

  return cmd;
}
