import { ConsistencyItem, ConsistencyReport } from './consistency-types';

export interface PrioritizedItem {
  area: string;
  score: number;
  risk: 'low' | 'medium' | 'high' | 'critical';
  gaps: string[];
  recommendation: string;
}

export function prioritizeInconsistencies(report: ConsistencyReport): PrioritizedItem[] {
  return report.items.map(item => {
    const gaps: string[] = [];
    let score = 0;

    const check = (label: string, val: string) => {
      if (val === 'missing') { gaps.push(`${label} ausente`); score += 4; }
      else if (val === 'stale') { gaps.push(`${label} desatualizado`); score += 3; }
      else if (val === 'partial') { gaps.push(`${label} parcial`); score += 2; }
    };

    check('docs', item.docs);
    check('code', item.code);
    check('tests', item.tests);
    check('cli', item.cli);
    check('extension', item.extension);

    let risk: PrioritizedItem['risk'] = 'low';
    if (score >= 12) risk = 'critical';
    else if (score >= 8) risk = 'high';
    else if (score >= 4) risk = 'medium';

    const recommendation = risk === 'critical' || risk === 'high'
      ? `Revisar ${item.area} com prioridade — ${gaps.join(', ')}`
      : `Monitorar ${item.area} — sem gaps críticos`;

    return { area: item.area, score, risk, gaps, recommendation };
  }).sort((a, b) => b.score - a.score);
}

export function summarizePriorities(items: PrioritizedItem[]): string[] {
  const critical = items.filter(i => i.risk === 'critical');
  const high = items.filter(i => i.risk === 'high');
  const summary: string[] = [];
  if (critical.length > 0) summary.push(`${critical.length} área(s) crítica(s): ${critical.map(i => i.area).join(', ')}`);
  if (high.length > 0) summary.push(`${high.length} área(s) de alta prioridade: ${high.map(i => i.area).join(', ')}`);
  return summary;
}
