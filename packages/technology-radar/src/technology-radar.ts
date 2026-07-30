import { createLogger } from '@ideia/logger';
import { EventBus } from '@ideia/event-bus';
import { Technology, TechSource, ScoringResult, StudyDraft, Recommendation, ScoredWeights, ScanTarget } from './types';

const log = createLogger('technology-radar');

const WEIGHTS: ScoredWeights = { value: 3, differentiation: 2, synergy: 2, costBenefit: 2, maturity: 1 };
const TOTAL_WEIGHT = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
const MIN_SCORE_FOR_STUDY = 3.5;

const C_COMPATIBILITY: Record<string, string> = {
  C1: 'Theia Platform compatibility',
  C2: 'Node.js 20+ compatibility',
  C3: 'TypeScript strict mode compatibility',
  C4: 'NATS JetStream messaging',
  C5: 'LangGraph orchestration',
  C6: 'Ollama model serving',
  C7: 'Cedar policy engine',
  C8: 'Mem0 memory layer',
  C9: 'PostgreSQL+pgvector storage',
  C10: 'React 18 frontend',
  C11: 'Inversify DI integration',
  C12: 'OpenVSX extension registry',
  C13: 'Electron/Tauri desktop shell',
  C14: 'MinIO object storage',
  C15: 'DuckDB analytics',
  C16: 'Redis caching',
  C17: 'DSPy prompting framework',
  C18: 'Turso edge database',
};

export class TechnologyRadar {
  private technologies: Map<string, Technology> = new Map();
  private bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  async scan(targets?: ScanTarget[]): Promise<Technology[]> {
    const scanList = targets ?? ['github', 'npm', 'arxiv'];
    const results: Technology[] = [];

    for (const target of scanList) {
      try {
        const techs = await this.scanSource(target);
        results.push(...techs);
      } catch (_err) {
        log.error(`Failed to scan ${target}`, { error: String(_err) });
      }
    }

    for (const tech of results) {
      const scored = this.evaluate(tech);
      if (scored.scores.weightedTotal >= MIN_SCORE_FOR_STUDY) {
        const draft = this.generateStudyDraft(scored);
        await this.bus.emit({ type: 'self.tech.recommended', source: 'technology-radar', payload: { technology: scored, draft } });
      }
      this.technologies.set(tech.name, scored);
    }

    await this.bus.emit({ type: 'self.scan.complete', source: 'technology-radar', payload: { count: results.length } });
    return Array.from(this.technologies.values());
  }

  evaluate(tech: Technology): Technology {
    const scores: ScoringResult = {
      value: this.scoreValue(tech),
      differentiation: this.scoreDifferentiation(tech),
      synergy: this.scoreSynergy(tech),
      costBenefit: this.scoreCostBenefit(tech),
      maturity: this.scoreMaturity(tech),
      weightedTotal: 0,
    };
    scores.weightedTotal = (
      scores.value * WEIGHTS.value +
      scores.differentiation * WEIGHTS.differentiation +
      scores.synergy * WEIGHTS.synergy +
      scores.costBenefit * WEIGHTS.costBenefit +
      scores.maturity * WEIGHTS.maturity
    ) / TOTAL_WEIGHT;

    return { ...tech, scores, validated: this.validateMultiSource(tech), scannedAt: new Date().toISOString() };
  }

  getRecommendations(minScore: number = 3.5): Recommendation[] {
    return Array.from(this.technologies.values())
      .filter(t => t.scores.weightedTotal >= minScore)
      .sort((a, b) => b.scores.weightedTotal - a.scores.weightedTotal)
      .map(t => ({
        technology: t,
        draft: t.scores.weightedTotal >= MIN_SCORE_FOR_STUDY ? this.generateStudyDraft(t) : undefined,
        score: t.scores.weightedTotal,
      }));
  }

  getTrending(): Technology[] {
    return Array.from(this.technologies.values())
      .filter(t => {
        const gh = t.sources.github;
        return gh !== undefined && gh.stars > 1000 && Date.now() - new Date(gh.updatedAt).getTime() < 86400000 * 90;
      })
      .sort((a, b) => (b.sources.github?.stars ?? 0) - (a.sources.github?.stars ?? 0));
  }

  private async scanSource(target: ScanTarget): Promise<Technology[]> {
    switch (target) {
      case 'github':
        return this.scanGitHub();
      case 'npm':
        return this.scanNpm();
      case 'arxiv':
        return this.scanArxiv();
      default:
        return [];
    }
  }

  private async scanGitHub(): Promise<Technology[]> {
    log.info('Scanning GitHub API for trending repositories');
    const response = await fetch('https://api.github.com/search/repositories?q=stars:>1000+pushed:>2026-01-01&sort=stars&per_page=10');
    if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
    const data = await response.json() as { items: Array<{ name: string; description: string; language: string; stargazers_count: number; pushed_at: string; html_url: string }> };
    return data.items.map(item => ({
      name: item.name,
      description: item.description ?? '',
      category: item.language ?? 'Unknown',
      sources: {
        github: { stars: item.stargazers_count, releases: 0, language: item.language ?? 'Unknown', updatedAt: item.pushed_at },
      },
      scores: { value: 0, differentiation: 0, synergy: 0, costBenefit: 0, maturity: 0, weightedTotal: 0 },
      validated: false,
      scannedAt: '',
    }));
  }

  private async scanNpm(): Promise<Technology[]> {
    log.info('Scanning npm registry for popular packages');
    const response = await fetch('https://registry.npmjs.org/-/v1/search?text=boilerplate&size=10');
    if (!response.ok) throw new Error(`npm API error: ${response.status}`);
    const data = await response.json() as { objects: Array<{ package: { name: string; description: string; version: string; }, score: { detail: { popularity: number; quality: number; maintenance: number } } }> };
    return data.objects.map(item => ({
      name: item.package.name,
      description: item.package.description ?? '',
      category: 'npm',
      sources: {
        npm: { downloads: Math.round(item.score.detail.popularity * 10000), maintainers: 1, dependencies: 0, version: item.package.version },
      },
      scores: { value: 0, differentiation: 0, synergy: 0, costBenefit: 0, maturity: 0, weightedTotal: 0 },
      validated: false,
      scannedAt: '',
    }));
  }

  private async scanArxiv(): Promise<Technology[]> {
    log.info('Scanning arXiv API for recent CS papers');
    const response = await fetch('https://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=10');
    if (!response.ok) throw new Error(`arXiv API error: ${response.status}`);
    const text = await response.text();
    const idMatches = text.matchAll(/<arxiv:primary_category[^>]*term="([^"]+)"[^>]*\/?>/g);
    const categories = Array.from(idMatches, m => m[1]).slice(0, 5);
    return [{
      name: 'arXiv CS.AI Papers',
      description: 'Recent artificial intelligence papers from arXiv',
      category: 'research',
      sources: {
        arxiv: { recentPapers: 10, categories },
      },
      scores: { value: 0, differentiation: 0, synergy: 0, costBenefit: 0, maturity: 0, weightedTotal: 0 },
      validated: false,
      scannedAt: '',
    }];
  }

  private scoreValue(tech: Technology): number {
    let score = 2;
    if (tech.sources.github && tech.sources.github.stars > 5000) score += 2;
    if (tech.sources.github && tech.sources.github.stars > 10000) score += 1;
    if (tech.sources.npm && tech.sources.npm.downloads > 100000) score += 2;
    if (tech.sources.npm && tech.sources.npm.maintainers > 5) score += 1;
    if (tech.sources.arxiv && tech.sources.arxiv.recentPapers > 5) score += 1;
    return Math.min(5, Math.max(1, score));
  }

  private scoreDifferentiation(tech: Technology): number {
    let score = 2;
    if (tech.sources.github && tech.sources.github.stars > 500 && tech.sources.github.stars < 10000) score += 1;
    if (tech.sources.github && tech.sources.github.language && !['JavaScript', 'TypeScript'].includes(tech.sources.github.language)) score += 1;
    if (tech.sources.npm && tech.sources.npm.downloads > 10000 && tech.sources.npm.downloads < 500000) score += 1;
    if (tech.sources.arxiv && tech.sources.arxiv.categories.length > 2) score += 1;
    return Math.min(5, Math.max(1, score));
  }

  private scoreSynergy(tech: Technology): number {
    let score = 2;
    const synergyKeywords = ['ai', 'llm', 'agent', 'llmops', 'vector', 'embedding', 'rag', 'prompt', 'langchain', 'autonomous'];
    const text = `${tech.name} ${tech.description}`.toLowerCase();
    for (const kw of synergyKeywords) {
      if (text.includes(kw)) score += 1;
    }
    return Math.min(5, Math.max(1, score));
  }

  private scoreCostBenefit(tech: Technology): number {
    let score = 3;
    if (tech.sources.github) score += 1;
    if (tech.sources.npm) score += 1;
    if (tech.sources.arxiv) score += 0;
    return Math.min(5, Math.max(1, score));
  }

  private scoreMaturity(tech: Technology): number {
    let score = 2;
    if (tech.sources.github && tech.sources.github.releases > 10) score += 1;
    if (tech.sources.github && tech.sources.github.releases > 50) score += 1;
    if (tech.sources.npm && tech.sources.npm.version) {
      const parts = tech.sources.npm.version.split('.');
      if (parseInt(parts[0] ?? '0') >= 2) score += 1;
    }
    if (tech.sources.github && tech.sources.github.stars > 10000) score += 1;
    return Math.min(5, Math.max(1, score));
  }

  private validateMultiSource(tech: Technology): boolean {
    let sources = 0;
    if (tech.sources.github) sources++;
    if (tech.sources.npm) sources++;
    if (tech.sources.arxiv) sources++;
    return sources >= 1;
  }

  private generateStudyDraft(tech: Technology): StudyDraft {
    const compatibility: Record<string, boolean> = {};
    for (const [key, desc] of Object.entries(C_COMPATIBILITY)) {
      compatibility[key] = desc.toLowerCase().includes(tech.category.toLowerCase()) ||
        desc.toLowerCase().includes(tech.name.toLowerCase());
    }

    return {
      techName: tech.name,
      rationale: `Technology ${tech.name} scored ${tech.scores.weightedTotal.toFixed(2)} on the radar. Recommended for further study.`,
      compatibility,
      estimatedEffort: this.estimateEffort(tech),
      taskRef: `TASK-RADAR-${tech.name.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase()}`,
      generatedAt: new Date().toISOString(),
    };
  }

  private estimateEffort(tech: Technology): string {
    if (tech.scores.weightedTotal >= 4.5) return 'low (1-2 days)';
    if (tech.scores.weightedTotal >= 4.0) return 'medium (3-5 days)';
    return 'high (1-2 weeks)';
  }
}

export function createTechnologyRadar(bus: EventBus): TechnologyRadar {
  return new TechnologyRadar(bus);
}
