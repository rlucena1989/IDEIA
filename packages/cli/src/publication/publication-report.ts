import { PublicationPlan, PublicationResult } from './publication-types';

export interface PublicationReport {
  generatedAt: string;
  totalPlans: number;
  published: number;
  failed: number;
  results: PublicationResult[];
  summary: string[];
}

export function buildPublicationReport(results: PublicationResult[]): PublicationReport {
  const published = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;

  const summary: string[] = [
    `${results.length} publicação(ões) processada(s)`,
    `${published} publicada(s), ${failed} falha(s)`,
  ];

  return {
    generatedAt: new Date().toISOString(),
    totalPlans: results.length,
    published,
    failed,
    results,
    summary,
  };
}
