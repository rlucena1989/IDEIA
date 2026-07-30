import { roundTo } from './numerical-engine';
import { createLogger } from '@ideia/logger';
const logger = createLogger('domain-precision');

type PrecisionDomain = 'finance' | 'physics' | 'engineering' | 'statistics' | 'general';

const DOMAIN_PRECISION: Record<PrecisionDomain, number> = {
  finance: 2,
  physics: 4,
  engineering: 3,
  statistics: 6,
  general: 4,
};

const DOMAIN_KEYWORDS: Record<string, PrecisionDomain> = {
  finance: 'finance',
  cost: 'finance',
  price: 'finance',
  budget: 'finance',
  dollar: 'finance',
  usd: 'finance',
  physics: 'physics',
  force: 'physics',
  'f=ma': 'physics',
  energy: 'physics',
  velocity: 'physics',
  gravity: 'physics',
  mass: 'physics',
  acceleration: 'physics',
  engineering: 'engineering',
  bmi: 'engineering',
  imc: 'engineering',
  density: 'engineering',
  area: 'engineering',
  volume: 'engineering',
  statistics: 'statistics',
  correlation: 'statistics',
  variance: 'statistics',
  stddev: 'statistics',
  median: 'statistics',
  regression: 'statistics',
};

export function detectDomain(input: string): PrecisionDomain {
  const lower = input.toLowerCase();
  const matched: { domain: PrecisionDomain; score: number }[] = [];
  for (const [keyword, domain] of Object.entries(DOMAIN_KEYWORDS)) {
    if (lower.includes(keyword)) {
      matched.push({ domain, score: keyword.length });
    }
  }
  if (matched.length === 0) return 'general';
  matched.sort((a, b) => b.score - a.score);
  return matched[0].domain;
}

export function getDomainPrecision(domain: PrecisionDomain): number {
  return DOMAIN_PRECISION[domain] ?? DOMAIN_PRECISION.general;
}

export function applyDomainPrecision(value: number, domain: PrecisionDomain): number {
  return roundTo(value, getDomainPrecision(domain));
}

export function applyPrecision(value: number, input: string): number {
  const domain = detectDomain(input);
  return applyDomainPrecision(value, domain);
}

export function setDomainPrecision(domain: PrecisionDomain, decimals: number): void {
  DOMAIN_PRECISION[domain] = decimals;
}

export function listDomains(): { domain: PrecisionDomain; decimals: number }[] {
  return (Object.entries(DOMAIN_PRECISION) as [PrecisionDomain, number][]).map(([domain, decimals]) => ({
    domain,
    decimals,
  }));
}
