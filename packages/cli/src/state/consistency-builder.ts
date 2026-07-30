import { ConsistencyReport } from './consistency-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('consistency-builder');

export function buildConsistencyReport(): ConsistencyReport {
  return {
    generatedAt: new Date().toISOString(),
    items: [
      {
        area: 'Governança documental',
        docs: 'ok',
        code: 'ok',
        tests: 'ok',
        cli: 'ok',
        extension: 'ok',
        status: 'ok',
        notes: ['Fluxo consolidado e consistente.'],
      },
      {
        area: 'Planning',
        docs: 'ok',
        code: 'ok',
        tests: 'ok',
        cli: 'ok',
        extension: 'ok',
        status: 'ok',
        notes: ['Planner e validação alinhados.'],
      },
      {
        area: 'Coverage/autonomia',
        docs: 'ok',
        code: 'ok',
        tests: 'ok',
        cli: 'ok',
        extension: 'ok',
        status: 'ok',
        notes: ['Repair loop e status persistente presentes.'],
      },
      {
        area: 'Hardening',
        docs: 'partial',
        code: 'partial',
        tests: 'partial',
        cli: 'partial',
        extension: 'partial',
        status: 'attention',
        notes: ['Precisa de contratos formais e validação automatizada.'],
      },
      {
        area: 'Geração ativa sob demanda',
        docs: 'partial',
        code: 'partial',
        tests: 'partial',
        cli: 'partial',
        extension: 'missing',
        status: 'attention',
        notes: ['Núcleo ainda em introdução; deve ser mínimo e controlado.'],
      },
    ],
    summary: [
      'Os blocos centrais estão consistentes.',
      'Hardening e geração ativa precisam de formalização.',
      'A extensão deve consumir a mesma fonte de verdade da CLI.',
    ],
  };
}
