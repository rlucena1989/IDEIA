import { createLogger } from '@ideia/logger';
import { Technology } from './types';

const SEARCH_QUERIES = [
  'cat:cs.AI+AND+abs:machine+learning',
  'cat:cs.SE+AND+abs:software+engineering',
  'cat:cs.LG+AND+abs:deep+learning',
];
const MAX_RESULTS = 10;

interface ArxivEntry {
  id: string;
  title: string;
  summary: string;
  category: string;
}

export class ArxivScanner {
  async scanArxivPapers(): Promise<Technology[]> {
    const results: Technology[] = [];

    for (const query of SEARCH_QUERIES) {
      try {
        const papers = await this.fetchPapers(query);
        results.push(...papers);
        await this.sleep(500);
      } catch (err) {
        createLogger('arxiv-scanner').error(`Failed to scan arXiv query ${query}`, { error: String(err) });
      }
    }

    return this.deduplicate(results);
  }

  private async fetchPapers(query: string): Promise<Technology[]> {
    const url = `https://export.arxiv.org/api/query?search_query=${query}&sortBy=submittedDate&sortOrder=descending&max_results=${MAX_RESULTS}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`arXiv API error: ${response.status}`);
    }

    const text = await response.text();
    return this.parseResponse(text);
  }

  private parseResponse(xml: string): Technology[] {
    const entries = this.extractEntries(xml);
    const categories = this.extractCategories(xml);

    if (entries.length === 0) {
      return [];
    }

    return entries.slice(0, 5).map(entry => ({
      name: this.sanitizeTitle(entry.title),
      description: entry.summary.slice(0, 200),
      category: entry.category || 'research',
      sources: {
        arxiv: {
          recentPapers: entries.length,
          categories: [...new Set(categories)],
        },
      },
      scores: { value: 0, differentiation: 0, synergy: 0, costBenefit: 0, maturity: 0, weightedTotal: 0 },
      validated: false,
      scannedAt: new Date().toISOString(),
    }));
  }

  private extractEntries(xml: string): ArxivEntry[] {
    const entries: ArxivEntry[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match: RegExpExecArray | null;

    while ((match = entryRegex.exec(xml)) !== null) {
      const entryXml = match[1];
      const idMatch = entryXml.match(/<id>([^<]+)<\/id>/);
      const titleMatch = entryXml.match(/<title>([\s\S]*?)<\/title>/);
      const summaryMatch = entryXml.match(/<summary>([\s\S]*?)<\/summary>/);
      const catMatch = entryXml.match(/<arxiv:primary_category[^>]*term="([^"]+)"[^>]*\/?>/);

      if (idMatch && titleMatch) {
        entries.push({
          id: idMatch[1].trim(),
          title: titleMatch[1].trim().replace(/\s+/g, ' '),
          summary: summaryMatch ? summaryMatch[1].trim().slice(0, 300) : '',
          category: catMatch ? catMatch[1] : 'cs.AI',
        });
      }
    }

    return entries;
  }

  private extractCategories(xml: string): string[] {
    const categories: string[] = [];
    const catRegex = /<category[^>]*term="([^"]+)"[^>]*\/?>/g;
    let match: RegExpExecArray | null;

    while ((match = catRegex.exec(xml)) !== null) {
      categories.push(match[1]);
    }

    return categories;
  }

  private sanitizeTitle(title: string): string {
    return title.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private deduplicate(techs: Technology[]): Technology[] {
    const seen = new Set<string>();
    return techs.filter(t => {
      const key = t.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
