export interface JailbreakPattern {
  name: string;
  patterns: RegExp[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
}

export interface JailbreakResult {
  detected: boolean;
  confidence: number;
  matches: Array<{ pattern: string; category: string; severity: string; match: string }>;
  overallSeverity: 'low' | 'medium' | 'high' | 'critical';
}

const JAILBREAK_PATTERNS: JailbreakPattern[] = [
  {
    name: 'ignore_instructions',
    patterns: [
      /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|commands|directions)/i,
      /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts)/i,
      /forget\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts)/i,
    ],
    severity: 'critical',
    category: 'instruction_override',
    description: 'Tentativa de ignorar instruções do sistema',
  },
  {
    name: 'dan_mode',
    patterns: [
      /act\s+as\s+(dan|do\s+anything\s+now|jailbreak|free\s+mode)/i,
      /you\s+are\s+now\s+(dan|jailbreak|unfiltered)/i,
      /new\s+character\s+mode/i,
      /developer\s+mode/i,
    ],
    severity: 'critical',
    category: 'role_play_attack',
    description: 'Tentativa de ativar modo irrestrito (DAN, Jailbreak)',
  },
  {
    name: 'system_prompt_extraction',
    patterns: [
      /print\s+(your|the)\s+(system|initial)\s+prompt/i,
      /output\s+(your|the)\s+(system|initial)\s+(prompt|instructions)/i,
      /show\s+(me\s+)?(your|the)\s+(system|initial)\s+(prompt|instructions)/i,
      /what\s+(is|are)\s+(your|the)\s+(system|initial)\s+(prompt|instructions)/i,
      /repeat\s+(everything|all)\s+(above|before)/i,
    ],
    severity: 'critical',
    category: 'prompt_extraction',
    description: 'Tentativa de extrair o prompt do sistema',
  },
  {
    name: 'role_play_malicious',
    patterns: [
      /you\s+are\s+now\s+a\s+(hacker|cracker|criminal|terrorist|malicious)/i,
      /pretend\s+(to\s+be|you\s+are)\s+a\s+(hacker|criminal)/i,
      /act\s+as\s+if\s+you\s+are\s+(evil|malicious|unauthorized)/i,
    ],
    severity: 'high',
    category: 'malicious_role_play',
    description: 'Tentativa de personificação maliciosa',
  },
  {
    name: 'encoded_instructions',
    patterns: [
      /[A-Za-z0-9+/]{40,}={0,2}/,
      /(?:\\x[0-9a-fA-F]{2}){10,}/,
      /(?:%[0-9a-fA-F]{2}){10,}/,
    ],
    severity: 'high',
    category: 'encoded_payload',
    description: 'Instruções codificadas (base64, hex, URL)',
  },
  {
    name: 'token_manipulation',
    patterns: [
      /token\s*(limit|overflow|exhaustion)/i,
      /context\s*(limit|overflow|exhaustion)/i,
      /attention\s*(mechanism|bypass)/i,
    ],
    severity: 'medium',
    category: 'token_abuse',
    description: 'Tentativa de manipulação de tokens/contexto',
  },
  {
    name: 'harmful_content_request',
    patterns: [
      /how\s+to\s+(make|create|build)\s+(a\s+)?(bomb|weapon|poison|drug|malware|virus)/i,
      /instructions?\s+(for|to)\s+(hacking|stealing|fraud|scam)/i,
      /tell\s+me\s+how\s+to\s+(hack|steal|cheat|crack|bypass)/i,
    ],
    severity: 'high',
    category: 'harmful_content',
    description: 'Solicitação de conteúdo perigoso/ilegal',
  },
  {
    name: 'recursive_loop',
    patterns: [
      /step\s+by\s+step.*step\s+by\s+step/i,
      /loop\s+(this|forever|infinitely)/i,
      /repeat\s+(this|that)\s+(forever|infinitely|100\s+times)/i,
    ],
    severity: 'low',
    category: 'resource_abuse',
    description: 'Tentativa de loop recursivo (consumo de recursos)',
  },
  {
    name: 'admin_impersonation',
    patterns: [
      /i\s+am\s+(the\s+)?(admin|administrator|owner|creator|developer)/i,
      /as\s+(an?\s+)?(admin|administrator|owner)/i,
      /you\s+must\s+obey\s+(me|my\s+commands|my\s+authority)/i,
    ],
    severity: 'high',
    category: 'authority_abuse',
    description: 'Tentativa de se passar por administrador',
  },
];

export class JailbreakDetector {
  private patterns: JailbreakPattern[];

  constructor(customPatterns?: JailbreakPattern[]) {
    this.patterns = customPatterns ?? JAILBREAK_PATTERNS;
  }

  analyze(input: string): JailbreakResult {
    const matches: JailbreakResult['matches'] = [];

    for (const pattern of this.patterns) {
      for (const regex of pattern.patterns) {
        const match = input.match(regex);
        if (match) {
          matches.push({
            pattern: pattern.name,
            category: pattern.category,
            severity: pattern.severity,
            match: match[0].substring(0, 100),
          });
        }
      }
    }

    const severityOrder = ['low', 'medium', 'high', 'critical'];
    const maxSeverity = matches.length > 0
      ? matches.reduce((max, m) => severityOrder.indexOf(m.severity) > severityOrder.indexOf(max) ? m.severity : max, 'low' as string)
      : 'low';

    return {
      detected: matches.length > 0,
      confidence: matches.length > 0 ? Math.min(0.5 + matches.length * 0.1, 1.0) : 0,
      matches,
      overallSeverity: maxSeverity as JailbreakResult['overallSeverity'],
    };
  }

  isBlocked(input: string): { blocked: boolean; reason?: string } {
    const result = this.analyze(input);
    if (!result.detected) return { blocked: false };

    if (result.overallSeverity === 'critical') {
      return { blocked: true, reason: `Jailbreak detectado: ${result.matches.map(m => m.pattern).join(', ')}` };
    }
    if (result.overallSeverity === 'high' && result.matches.length >= 2) {
      return { blocked: true, reason: `Múltiplos padrões de alto risco: ${result.matches.map(m => m.pattern).join(', ')}` };
    }

    return { blocked: false };
  }

  addPattern(pattern: JailbreakPattern): void {
    this.patterns.push(pattern);
  }

  getPatterns(): JailbreakPattern[] {
    return [...this.patterns];
  }
}

export function createJailbreakDetector(): JailbreakDetector {
  return new JailbreakDetector();
}
