export interface PlatformBoundary {
  module: string;
  keepAsIs: boolean;
  refactorNeeded: boolean;
  replaceInV3: boolean;
  reason: string;
}

export interface V3Capability {
  id: string;
  title: string;
  description: string;
  contract: string;
  requiredInputs: string[];
  requiredOutputs: string[];
  persistenceRequired: boolean;
  multiTenant?: boolean;
  multiAgent?: boolean;
}

export interface MigrationPlan {
  phase: 'pre-v3';
  boundaries: PlatformBoundary[];
  capabilities: V3Capability[];
  risks: string[];
  recommendedOrder: string[];
}

export function prioritizeForV3(capabilities: V3Capability[]): V3Capability[] {
  return [...capabilities].sort((a, b) => {
    const scoreA = (a.persistenceRequired ? 2 : 0) + (a.multiAgent ? 2 : 0) + a.requiredInputs.length;
    const scoreB = (b.persistenceRequired ? 2 : 0) + (b.multiAgent ? 2 : 0) + b.requiredInputs.length;
    return scoreB - scoreA;
  });
}

export function classifyBoundaries(modules: string[]): PlatformBoundary[] {
  const map: Record<string, Omit<PlatformBoundary, 'module'>> = {
    governance: {
      keepAsIs: false, refactorNeeded: true, replaceInV3: false,
      reason: 'Núcleo da plataforma. Precisa de abstração de armazenamento e API.',
    },
    planning: {
      keepAsIs: false, refactorNeeded: true, replaceInV3: false,
      reason: 'Lógica de planejamento deve virar serviço com estado persistente.',
    },
    coverage: {
      keepAsIs: false, refactorNeeded: true, replaceInV3: false,
      reason: 'Ciclo de autonomia deve ser serviço orquestrado, não script.',
    },
    cli: {
      keepAsIs: false, refactorNeeded: false, replaceInV3: true,
      reason: 'CLI vira adapter/transporte. Lógica migra para API.',
    },
    extension: {
      keepAsIs: false, refactorNeeded: false, replaceInV3: true,
      reason: 'Extensão vira cliente da API, não executor direto.',
    },
    runtime: {
      keepAsIs: false, refactorNeeded: true, replaceInV3: false,
      reason: 'Runtime vira motor de execução agnóstico de transporte.',
    },
    contracts: {
      keepAsIs: true, refactorNeeded: false, replaceInV3: false,
      reason: 'Contracts já tem boa separação. Pode evoluir como está.',
    },
    security: {
      keepAsIs: false, refactorNeeded: true, replaceInV3: false,
      reason: 'Segurança precisa de API de políticas e identidade.',
    },
    adapters: {
      keepAsIs: false, refactorNeeded: false, replaceInV3: true,
      reason: 'Adapters viram plugins registrados via API.',
    },
    plugins: {
      keepAsIs: false, refactorNeeded: false, replaceInV3: true,
      reason: 'Plugin system precisa de SDK formal e marketplace.',
    },
    localAi: {
      keepAsIs: false, refactorNeeded: true, replaceInV3: false,
      reason: 'AI local vira provider plugável na orquestração.',
    },
    release: {
      keepAsIs: true, refactorNeeded: false, replaceInV3: false,
      reason: 'Release system já tem boa separação de concerns.',
    },
    generators: {
      keepAsIs: false, refactorNeeded: false, replaceInV3: true,
      reason: 'Generators viram templates no marketplace da plataforma.',
    },
  };

  return modules
    .filter(m => m in map)
    .map(m => ({ module: m, ...map[m] }));
}

export function buildMigrationPlan(boundaries: PlatformBoundary[]): MigrationPlan {
  const risks: string[] = [];
  const recommendedOrder: string[] = [];

  const refactorFirst = boundaries.filter(b => b.refactorNeeded && !b.replaceInV3);
  const replaceFirst = boundaries.filter(b => b.replaceInV3);
  const keepLast = boundaries.filter(b => b.keepAsIs);

  for (const b of refactorFirst) {
    recommendedOrder.push(`refactor:${b.module}`);
    if (b.module === 'governance') {
      risks.push('Governança é dependência crítica de todos os outros módulos. Migrar primeiro.');
    }
    if (b.module === 'runtime') {
      risks.push('Runtime tem 49 módulos. Refatoração deve ser incremental, não total.');
    }
  }

  for (const b of replaceFirst) {
    recommendedOrder.push(`replace:${b.module}`);
    if (b.module === 'cli') {
      risks.push('CLI tem 85 comandos. Substituição requer compatibilidade reversa.');
    }
  }

  for (const b of keepLast) {
    recommendedOrder.push(`keep:${b.module}`);
  }

  risks.push('Rompimento de compatibilidade com configurações existentes (settings.json).');
  risks.push('Migração de tasks .ai/tasks/*.md para banco de dados ou API state store.');
  risks.push('Adapters multilíngue (13) podem perder suporte se não forem pluginizados a tempo.');

  return {
    phase: 'pre-v3',
    boundaries,
    capabilities: [],
    risks,
    recommendedOrder,
  };
}
