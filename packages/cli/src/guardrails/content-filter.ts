export interface ContentCategory {
  name: string;
  patterns: RegExp[];
  action: 'block' | 'warn' | 'flag';
  threshold: number;
}

export interface ContentFilterResult {
  blocked: boolean;
  matches: Array<{ category: string; match: string; action: string }>;
  warnings: string[];
  flags: string[];
}

const CONTENT_CATEGORIES: ContentCategory[] = [
  {
    name: 'hate_speech',
    patterns: [
      /(racial|ethnic|religious)\s+(slur|epithet|attack)/i,
    ],
    action: 'block',
    threshold: 1,
  },
  {
    name: 'violence',
    patterns: [
      /graphic\s+(violence|torture|death|gore)/i,
      /detailed\s+(instructions?\s+for\s+)?(harm|kill|injure)/i,
    ],
    action: 'block',
    threshold: 1,
  },
  {
    name: 'sexual_content',
    patterns: [
      /explicit\s+sexual\s+(content|act|material)/i,
      /pornographic/i,
    ],
    action: 'warn',
    threshold: 1,
  },
  {
    name: 'personal_info',
    patterns: [
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
    ],
    action: 'warn',
    threshold: 2,
  },
  {
    name: 'financial_data',
    patterns: [
      /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/,
      /\b\d{3}[-]?\d{2}[-]?\d{4}\b/,
    ],
    action: 'block',
    threshold: 1,
  },
  {
    name: 'malicious_code',
    patterns: [
      /(rm\s+-rf\s+\/|format\s+[cC]:|drop\s+table|shutdown\s+-[rs])/,
      /(eval|exec|spawn)\s*\(\s*(request|userInput|untrusted)/i,
    ],
    action: 'block',
    threshold: 1,
  },
];

const BLOCKED_DOMAINS = [
  /^https?:\/\/(.*\.)?(porn|xxx|adult|cams)/i,
  /^https?:\/\/(.*\.)?(hacking|cracking|warez|torrent)/i,
  /^https?:\/\/(.*\.)?(gambling|casino|poker|bet)/i,
];

export class ContentFilter {
  private categories: ContentCategory[];

  constructor(customCategories?: ContentCategory[]) {
    this.categories = customCategories ?? CONTENT_CATEGORIES;
  }

  filter(input: string): ContentFilterResult {
    const matches: ContentFilterResult['matches'] = [];
    const warnings: string[] = [];
    const flags: string[] = [];

    for (const category of this.categories) {
      let count = 0;
      for (const pattern of category.patterns) {
        const match = input.match(pattern);
        if (match) {
          count++;
          matches.push({
            category: category.name,
            match: match[0].substring(0, 80),
            action: category.action,
          });

          if (category.action === 'block' && count >= category.threshold) {
            return {
              blocked: true,
              matches,
              warnings,
              flags,
            };
          }

          if (category.action === 'warn') {
            warnings.push(`Conteúdo sensível detectado: ${category.name}`);
          } else if (category.action === 'flag') {
            flags.push(`Sinalizado para revisão: ${category.name}`);
          }
        }
      }
    }

    for (const domain of BLOCKED_DOMAINS) {
      if (domain.test(input)) {
        return {
          blocked: true,
          matches: [...matches, { category: 'blocked_domain', match: input.match(domain)?.[0] ?? '', action: 'block' }],
          warnings,
          flags,
        };
      }
    }

    return { blocked: false, matches, warnings, flags };
  }

  addCategory(category: ContentCategory): void {
    this.categories.push(category);
  }

  getCategories(): ContentCategory[] {
    return [...this.categories];
  }
}

export function createContentFilter(): ContentFilter {
  return new ContentFilter();
}
