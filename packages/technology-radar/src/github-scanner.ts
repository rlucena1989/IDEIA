import { createLogger } from '@ideia/logger';
import { Technology } from './types';

interface GitHubRepo {
  name: string;
  description: string;
  language: string;
  stargazers_count: number;
  pushed_at: string;
  html_url: string;
}

const TOPICS = ['ai', 'typescript', 'developer-tools'];
const PER_PAGE = 10;

function getGitHubToken(): string | undefined {
  return typeof process !== 'undefined' ? process.env.GITHUB_TOKEN : undefined;
}

export class GitHubScanner {
  async scanGitHubTrends(topics?: string[]): Promise<Technology[]> {
    const scanTopics = topics ?? TOPICS;
    const token = getGitHubToken();
    const results: Technology[] = [];

    for (const topic of scanTopics) {
      try {
        const techs = await this.scanTopic(topic, token);
        results.push(...techs);
        await this.sleep(100);
      } catch (err) {
        createLogger('github-scanner').error(`Failed to scan topic ${topic}`, { error: String(err) });
      }
    }

    return results;
  }

  private async scanTopic(topic: string, token?: string): Promise<Technology[]> {
    const url = `https://api.github.com/search/repositories?q=topic:${topic}+stars:>100&sort=stars&per_page=${PER_PAGE}`;
    const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
    if (token) {
      headers.Authorization = `token ${token}`;
    }

    const response = await fetch(url, { headers });
    if (response.status === 403) {
      createLogger('github-scanner').warn('GitHub API rate limited');
      return [];
    }
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json() as { items: GitHubRepo[] };
    return data.items.map(item => ({
      name: item.name,
      description: item.description ?? '',
      category: topic,
      sources: {
        github: {
          stars: item.stargazers_count,
          releases: 0,
          language: item.language ?? 'Unknown',
          updatedAt: item.pushed_at,
        },
      },
      scores: { value: 0, differentiation: 0, synergy: 0, costBenefit: 0, maturity: 0, weightedTotal: 0 },
      validated: false,
      scannedAt: new Date().toISOString(),
    }));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
