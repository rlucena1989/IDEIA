import { DevkitState } from './state-types';

export function buildDevkitState(): DevkitState {
  return {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    summary: 'ai-devkit consolidado com governança, planning, autonomia, CLI, cockpit, triagem v2/v3 e base para geração ativa.',
    blocks: [
      {
        id: 'governance',
        title: 'Governança documental',
        status: 'done',
        summary: 'Registry, policy, resolver, auditoria e comandos de docs concluídos.',
        evidence: [
          'document-registry.ts',
          'document-policy.ts',
          'document-audit.ts',
          'docs commands',
        ],
      },
      {
        id: 'planning',
        title: 'Planning / execução',
        status: 'done',
        summary: 'TaskSpec, ExecutionPlan, validator e router implementados.',
        evidence: [
          'task-spec.ts',
          'execution-plan.ts',
          'command-router.ts',
          'task-validator.ts',
        ],
      },
      {
        id: 'autonomy',
        title: 'Coverage / autonomia',
        status: 'done',
        summary: 'Reader, prioritizer, classifier e repair loop implementados.',
        evidence: [
          'coverage-reader.ts',
          'gap-prioritizer.ts',
          'test-quality-classifier.ts',
          'test-repair-loop.ts',
        ],
      },
      {
        id: 'cockpit',
        title: 'Cockpit / extensão',
        status: 'done',
        summary: 'StatusProvider, MetricsProvider e comandos de operação implementados.',
        evidence: [
          'StatusProvider',
          'MetricsProvider',
          'cliBridge.ts',
          'syncDocs.ts',
          'runTask.ts',
        ],
      },
      {
        id: 'v2v3',
        title: 'Triagem v2/v3',
        status: 'done',
        summary: 'Priorização de versão, escopo v3, contratos e migração planejados.',
        evidence: [
          'version-priority.ts',
          'v3-platform.ts',
          'version-decision-log.md',
          'v3-migration-plan.md',
        ],
      },
      {
        id: 'active-generation',
        title: 'Geração ativa sob demanda',
        status: 'experimental',
        summary: 'Núcleo inicial para materialização de artefatos operacionais a partir do estado.',
        evidence: [
          'state-builder.ts',
          'artifact-generator.ts',
          'content-planner.ts',
        ],
      },
    ],
    metrics: [
      {
        name: 'testsPassing',
        value: true,
        description: 'Suite principal passando',
      },
      {
        name: 'repairLoopReady',
        value: true,
        description: 'Ciclo de reparo funcional',
      },
      {
        name: 'cliConsolidated',
        value: true,
        description: 'CLI com domínio separado',
      },
      {
        name: 'cockpitReady',
        value: true,
        description: 'Extensão com visão operacional',
      },
    ],
    artifacts: [
      { path: 'docs/governance/', purpose: 'Governança e decisões', status: 'present' },
      { path: 'packages/cli/src/planning/', purpose: 'Planning e versionamento', status: 'present' },
      { path: 'packages/cli/src/coverage/', purpose: 'Autonomia e cobertura', status: 'present' },
      { path: 'packages/cli/src/views/', purpose: 'Cockpit da extensão', status: 'present' },
    ],
    commands: [
      { command: 'ai-devkit docs', purpose: 'Governança documental', status: 'active' },
      { command: 'ai-devkit plan', purpose: 'Planejamento de tarefas', status: 'active' },
      { command: 'ai-devkit coverage', purpose: 'Autonomia e cobertura', status: 'active' },
      { command: 'ai-devkit cockpit', purpose: 'Visão operacional da extensão', status: 'active' },
    ],
    blockers: [
      'Sincronização de estado com artefatos gerados sob demanda',
      'Padronização de contratos de saída',
    ],
    nextSteps: [
      'Criar matriz de consistência',
      'Implementar hardening',
      'Introduzir gerador de artefatos',
      'Adicionar validação de completude',
    ],
  };
}
