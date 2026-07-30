import { createLogger } from '@ideia/logger';
import { Technology } from './types';

const SEARCH_TERMS = ['ai', 'typescript', 'developer-tools', 'cli', 'automation'];
const MAX_RESULTS = 10;

export class NpmScanner {
  async scanNpmTrends(): Promise<Technology[]> {
    const results: Technology[] = [];

    for (const term of SEARCH_TERMS) {
      try {
        const techs = await this.searchNpm(term);
        results.push(...techs);
        await this.sleep(200);
      } catch (err) {
        createLogger('npm-scanner').error(`Failed to scan npm term ${term}`, { error: String(err) });
      }
    }

    return this.deduplicate(results);
  }

  private async searchNpm(term: string): Promise<Technology[]> {
    const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(term)}&size=${MAX_RESULTS}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`npm API error: ${response.status}`);
    }

    const data = await response.json() as {
      objects: Array<{
        package: { name: string; description: string; version: string; }
        score: { detail: { popularity: number; quality: number; maintenance: number } }
      }>;
    };

    return data.objects.map(item => ({
      name: item.package.name,
      description: item.package.description ?? '',
      category: 'npm',
      sources: {
        npm: {
          downloads: Math.round(item.score.detail.popularity * 100000),
          maintainers: 1,
          dependencies: 0,
          version: item.package.version,
        },
      },
      scores: { value: 0, differentiation: 0, synergy: 0, costBenefit: 0, maturity: 0, weightedTotal: 0 },
      validated: false,
      scannedAt: new Date().toISOString(),
    }));
  }

  private deduplicate(techs: Technology[]): Technology[] {
    const seen = new Set<string>();
    return techs.filter(t => {
      if (seen.has(t.name)) return false;
      seen.add(t.name);
      return true;
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
