import type { ScorecardItem, ScorecardCategory, ScorecardResult, ScorecardAlert, CorrelationAlert, ScorecardTrend } from '../../commands/scorecard';

export function calcScore(items: ScorecardItem[]): number {
  const total = items.reduce((s, i) => s + i.weight, 0);
  const earned = items.filter(i => i.passed).reduce((s, i) => s + i.weight, 0);
  return total > 0 ? (earned / total) * 100 : 0;
}

export function level(score: number): 'A' | 'B' | 'C' | 'D' {
  if (score >= 90) return 'A'; if (score >= 70) return 'B'; if (score >= 50) return 'C'; return 'D';
}

export function overallScore(categories: ScorecardCategory[]): number {
  const totW = categories.reduce((s, c) => s + c.weight, 0);
  return totW > 0 ? categories.reduce((s, c) => s + (c.score * c.weight) / 100, 0) / totW * 100 : 0;
}

export function shieldColor(s: number): string { return s >= 90 ? 'brightgreen' : s >= 70 ? 'yellow' : s >= 50 ? 'orange' : 'red'; }

export function buildRecommendations(categories: ScorecardCategory[]): { text: string; fixCommand?: string }[] {
  const recs: { text: string; fixCommand?: string }[] = [];
  for (const cat of categories) for (const item of cat.items) if (!item.passed) recs.push({ text: `[${cat.name}] ${item.description}${item.hint ? ` — ${item.hint}` : ''}${item.value !== undefined ? ` (atual: ${item.value})` : ''}`, fixCommand: item.fixCommand });
  return recs.slice(0, 20);
}

export function buildAlerts(categories: ScorecardCategory[]): ScorecardAlert[] {
  const alerts: ScorecardAlert[] = [];
  for (const cat of categories) for (const item of cat.items) if (!item.passed && item.weight >= 3) alerts.push({ category: cat.name, item: item.id, severity: 'error', message: item.description });
  return alerts;
}

export function generateBadge(score: number): string {
  const color = shieldColor(score);
  const label = 'maturidade';
  const value = `${score}/100`;
  const w = 170;
  const lw = 80;
  const rw = w - lw;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20">\n    <linearGradient id="b" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>\n    <clipPath id="c"><rect width="${w}" height="20" rx="3" fill="#fff"/></clipPath>\n    <g clip-path="url(#c)">\n      <rect width="${lw}" height="20" fill="#555"/>\n      <rect x="${lw}" width="${rw}" height="20" fill="${color === 'brightgreen' ? '#4c1' : color === 'yellow' ? '#dfb317' : color === 'orange' ? '#fe7d37' : '#e05d44'}"/>\n      <rect width="${w}" height="20" fill="url(#b)"/>\n    </g>\n    <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">\n      <text x="${lw / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text><text x="${lw / 2}" y="14">${label}</text>\n      <text x="${lw + rw / 2}" y="15" fill="#010101" fill-opacity=".3">${value}</text><text x="${lw + rw / 2}" y="14">${value}</text>\n    </g></svg>`;
}

export function crossCategoryAnalysis(result: ScorecardResult): CorrelationAlert[] {
  const alerts: CorrelationAlert[] = [];
  const cats = result.categories.filter(c => c.weight > 0);
  const sec = cats.find(c => c.name === 'Segurança');
  const qual = cats.find(c => c.name === 'Qualidade');
  const eco = cats.find(c => c.name === 'Saúde do Ecossistema');
  if (sec && qual && Math.round(sec.score) < 50 && Math.round(qual.score) < 50)
    alerts.push({ severity: 'critical', message: 'Segurança e Qualidade ambos baixos — risco alto de regressão', categories: ['Segurança', 'Qualidade'] });
  if (eco && Math.round(eco.score) < 40)
    alerts.push({ severity: 'warn', message: 'Saúde do Ecossistema crítica — dependências podem comprometer o projeto', categories: ['Saúde do Ecossistema'] });
  if (sec && qual && Math.round(sec.score) >= 90 && Math.round(qual.score) >= 90)
    alerts.push({ severity: 'info', message: 'Segurança e Qualidade em nível alto — projeto maduro', categories: ['Segurança', 'Qualidade'] });
  const integridade = cats.find(c => c.name === 'Integridade do Projeto');
  const pipeline = cats.find(c => c.name === 'Pipeline Health');
  if (integridade && pipeline && Math.round(integridade.score) === 100 && Math.round(pipeline.score) === 100)
    alerts.push({ severity: 'info', message: 'Integridade e Pipeline saudáveis — projeto bem estruturado', categories: ['Integridade do Projeto', 'Pipeline Health'] });
  return alerts;
}

export function buildTrends(history: ScorecardResult[]): ScorecardTrend[] {
  return history.slice(-20).map(h => ({ timestamp: h.timestamp, overallScore: h.overallScore, categories: h.categories.map(c => ({ name: c.name, score: Math.round(c.score) })) }));
}
