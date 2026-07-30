import { Technology} from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('radar-report');

export interface RelevanceScore {
  overall: number;
  ideiaFit: number;
  communityAdoption: number;
  innovationPotential: number;
}

export interface DepHealthInfo {
  totalDeps: number;
  outdated: number;
  vulnerabilities: number;
  upToDate: number;
}

export interface TechnologyRadarReport {
  generatedAt: string;
  totalTechnologies: number;
  technologies: Array<{
    name: string;
    category: string;
    relevance: RelevanceScore;
    sources: string[];
    recommendation: 'adopt' | 'trial' | 'assess' | 'hold';
  }>;
  summary: {
    adoptCount: number;
    trialCount: number;
    assessCount: number;
    holdCount: number;
    topTechnologies: string[];
  };
  sections?: {
    githubStars?: number;
    npmDownloads?: number;
    arxivPapers?: number;
    depHealth?: DepHealthInfo;
  };
}

export class RadarReport {
  generateReport(technologies: Technology[], depHealth?: DepHealthInfo): TechnologyRadarReport {
    const entries = technologies.map(tech => {
      const relevance = this.computeRelevance(tech);
      return {
        name: tech.name,
        category: tech.category,
        relevance,
        sources: this.getActiveSources(tech.sources as unknown as Record<string, unknown>),
        recommendation: this.classifyRecommendation(relevance.overall),
      };
    });

    const adopt = entries.filter(e => e.recommendation === 'adopt');
    const trial = entries.filter(e => e.recommendation === 'trial');
    const assess = entries.filter(e => e.recommendation === 'assess');

    const totalGithubStars = technologies.reduce((s, t) => s + (t.sources.github?.stars ?? 0), 0);
    const totalNpmDownloads = technologies.reduce((s, t) => s + (t.sources.npm?.downloads ?? 0), 0);
    const totalArxivPapers = technologies.reduce((s, t) => s + (t.sources.arxiv?.recentPapers ?? 0), 0);

    return {
      generatedAt: new Date().toISOString(),
      totalTechnologies: technologies.length,
      technologies: entries,
      summary: {
        adoptCount: adopt.length,
        trialCount: trial.length,
        assessCount: assess.length,
        holdCount: entries.length - adopt.length - trial.length - assess.length,
        topTechnologies: entries
          .sort((a, b) => b.relevance.overall - a.relevance.overall)
          .slice(0, 5)
          .map(e => e.name),
      },
      sections: {
        githubStars: totalGithubStars,
        npmDownloads: totalNpmDownloads,
        arxivPapers: totalArxivPapers,
        depHealth: depHealth ?? { totalDeps: 0, outdated: 0, vulnerabilities: 0, upToDate: 0 },
      },
    };
  }

  private computeRelevance(tech: Technology): RelevanceScore {
    const s = tech.scores;
    const communityAdoption = this.scoreCommunityAdoption(tech);
    const innovationPotential = (s.differentiation + s.value) / 2;

    return {
      overall: s.weightedTotal,
      ideiaFit: s.synergy,
      communityAdoption,
      innovationPotential,
    };
  }

  private scoreCommunityAdoption(tech: Technology): number {
    let score = 0;
    if (tech.sources.github) {
      score += Math.min(5, tech.sources.github.stars / 2000);
    }
    if (tech.sources.npm) {
      score += Math.min(5, tech.sources.npm.downloads / 50000);
    }
    if (tech.sources.arxiv) {
      score += Math.min(2, tech.sources.arxiv.recentPapers / 5);
    }
    return Math.min(5, score);
  }

  private classifyRecommendation(score: number): 'adopt' | 'trial' | 'assess' | 'hold' {
    if (score >= 4.5) return 'adopt';
    if (score >= 3.5) return 'trial';
    if (score >= 2.5) return 'assess';
    return 'hold';
  }

  private getActiveSources(sources: Record<string, unknown>): string[] {
    const active: string[] = [];
    if (sources.github) active.push('github');
    if (sources.npm) active.push('npm');
    if (sources.arxiv) active.push('arxiv');
    return active;
  }
}
