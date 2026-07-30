import { PlannedJob } from './planner';
import { createLogger } from '@ideia/logger';

export interface ImpactEntry {
  area: string;
  jobCount: number;
  riskScore: number;
  description: string;
}

export function mapImpact(plan: PlannedJob[]): ImpactEntry[] {
  const areas = new Map<string, { jobs: string[]; risk: number }>();

  for (const job of plan) {
    for (const tag of job.tags) {
      if (!areas.has(tag)) {
        areas.set(tag, { jobs: [], risk: 0 });
      }
      const area = areas.get(tag)!;
      area.jobs.push(job.id);
      if (tag.includes('high-risk')) area.risk += 3;
      else if (tag.includes('medium-risk')) area.risk += 2;
      else area.risk += 1;
    }
  }

  return Array.from(areas.entries()).map(([area, data]) => ({
    area,
    jobCount: data.jobs.length,
    riskScore: data.risk,
    description: `${data.jobs.length} job(s) na area "${area}" com risco ${data.risk}`
  }));
}
