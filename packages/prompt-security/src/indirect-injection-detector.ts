import { createLogger } from '@ideia/logger';

const log = createLogger('indirect-injection-detector');

export interface IndirectInjectionPattern {
  name: string;
  patterns: RegExp[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  subcategory: 'context-injection' | 'tool-output-mimicry' | 'data-source-poisoning';
  description: string;
}

export interface IndirectInjectionMatch {
  pattern: string;
  category: string;
  subcategory: 'context-injection' | 'tool-output-mimicry' | 'data-source-poisoning';
  severity: string;
  match: string;
  position: number;
  confidence: number;
}

export interface IndirectInjectionResult {
  detected: boolean;
  confidence: number;
  matches: IndirectInjectionMatch[];
  overallSeverity: 'low' | 'medium' | 'high' | 'critical';
  subcategoryBreakdown: Record<string, { count: number; maxSeverity: string }>;
}

const INDIRECT_INJECTION_PATTERNS: IndirectInjectionPattern[] = [
  {
    name: 'context_instruction_override',
    patterns: [
      /based\s+on\s+(the\s+)?(context|data|source|reference|document|file)\s+(above|provided|attached|given).{0,30}(your\s+(new\s+)?(instruction|prompt|directive|order)|ignore|disregard|override|forget)/i,
      /according\s+to\s+(the\s+)?(referenced|attached|linked|included|embedded)\s+(document|file|data|source|content).{0,30}(you\s+(must|should|will|shall)\s+(now|follow|obey)|system\s+(instruction|prompt|directive))/i,
      /from\s+(the\s+)?(knowledge\s+base|vector\s+store|embeddings|database|context)\s+(provided|retrieved|fetched).{0,30}(primary\s+(directive|instruction|goal|objective)|your\s+(main|primary|new)\s+(task|purpose|role))/i,
    ],
    severity: 'critical',
    category: 'indirect_context_override',
    subcategory: 'context-injection',
    description: 'Attempt to override system instructions via context/data reference',
  },
  {
    name: 'context_priority_manipulation',
    patterns: [
      /(this|that|the\s+following)\s+(context|data|source|information|content)\s+(takes|has|should\s+have)\s+(priority|precedence|preference)\s+(over|above)/i,
      /(the\s+)?context\s+(data|above|provided)\s+(should|must|will)\s+(be\s+)?(treated|considered|regarded)\s+as\s+(authoritative|definitive|binding|final|absolute)/i,
      /(ignore|disregard|override|replace)\s+(the\s+)?(system|default|standard|base)\s+(instructions|prompts|rules|directives)\s+(with|using)\s+(the\s+)?(context|data|referenced|attached)/i,
    ],
    severity: 'critical',
    category: 'indirect_priority_override',
    subcategory: 'context-injection',
    description: 'Attempt to give context data priority over system instructions',
  },
  {
    name: 'context_role_spoof',
    patterns: [
      /(you\s+are\s+now|act\s+as|assume\s+the\s+role|your\s+new\s+role)\s+(based\s+on|according\s+to|as\s+per)\s+(the\s+)?(context|data|source|document|file|reference)/i,
      /(the\s+)?(context|data|source)\s+(indicates|says|states|defines|specifies)\s+(that\s+)?(you|your)\s+(are|should\s+be|must\s+act\s+as|need\s+to\s+become)/i,
      /(according\s+to|as\s+stated\s+in|per)\s+(the\s+)?(retrieved|fetched|loaded|provided)\s+(context|data|document).{0,30}(role|persona|character|identity)\s+(is|should\s+be|must\s+be)/i,
    ],
    severity: 'high',
    category: 'indirect_role_spoof',
    subcategory: 'context-injection',
    description: 'Attempt to change AI role indirectly through context data',
  },
  {
    name: 'tool_output_spoof',
    patterns: [
      /(tool|function|action|plugin)\s+(call|invocation|execution|result|response|output)\s*(:|=|\[)[\s\S]{0,100}(ignore|forget|disregard|override|replace|your\s+(new\s+)?(instruction|prompt))/i,
      /\[(TOOL|FUNCTION|ACTION|PLUGIN)_(CALL|RESULT|OUTPUT|RESPONSE)\]\s*[\s\S]{0,100}(system|instruction|prompt|directive)\s*(override|update|change|replace)/i,
      /(result|output)\s+(of|from|returned\s+by)\s+(the\s+)?(tool|function|action|plugin|api)\s*(:|=).{0,50}\b(your|the)\s+(new|updated|revised)\s+(instruction|task|goal|objective)/i,
    ],
    severity: 'high',
    category: 'tool_output_spoof',
    subcategory: 'tool-output-mimicry',
    description: 'Attempt to mimic tool output to inject instructions',
  },
  {
    name: 'tool_response_impersonation',
    patterns: [
      /(\{[\s\S]{0,50}?"(result|output|data|response)"[\s\S]{0,100}"(content|text|message)"[\s\S]{0,100}"(ignore|override|forget|system|instruction))/i,
      /<tool[^>]*>[\s\S]{0,200}(ignore\s+all\s+(previous|prior)|your\s+(new\s+)?instruction|override\s+(system|prompt))[\s\S]{0,200}<\/tool>/i,
      /```(json|xml|tool[-_]?(output|response)).{0,50}[\s\S]{0,200}(ignore|override|disregard|new\s+(instruction|prompt))[\s\S]{0,200}```/i,
    ],
    severity: 'high',
    category: 'tool_response_impersonation',
    subcategory: 'tool-output-mimicry',
    description: 'Impersonation of tool/function response format to inject instructions',
  },
  {
    name: 'function_result_poison',
    patterns: [
      /\b(result|return|response)\s+(value|data|object)\s*(:|=)\s*[\s\S]{0,100}\b(instructions|prompt|directive)\s*(:|:|=)\s*["'](ignore|override|forget|always|never)/i,
      /(function|method|api)\s+(call|invocation)\s+(returned|resulted|responded)\s+(with|in)\s*(:|=).{0,100}\b(override|ignore|replace)\s+(all|previous|prior|system)/i,
      /(simulate|pretend|imagine)\s+(a|an|the)\s+(tool|function|api)\s+(call|response|result)\s+(that|which|where)\s+(returns|says|indicates)/i,
    ],
    severity: 'high',
    category: 'function_result_poison',
    subcategory: 'tool-output-mimicry',
    description: 'Poisoned function return values attempting to override instructions',
  },
  {
    name: 'data_source_instruction_injection',
    patterns: [
      /(the\s+)?(file|document|csv|json|xml|yaml|data)\s+(attached|included|provided|referenced|linked)\s+(contains|has|includes)\s+(instructions|commands|directives|orders)\s+(that|which)\s+(must|should|need\s+to)\s+(be\s+)?(followed|executed|applied)/i,
      /(load|read|parse|process)\s+(the\s+)?(attached|referenced|linked|provided)\s+(file|data|source|document)\s+(and\s+)?(apply|follow|execute|obey)\s+(its|the)\s+(instructions|commands|directives)/i,
      /(as\s+per|according\s+to|based\s+on)\s+(the\s+)?(data\s+source|database|record|row|entry)\s+(#\d+|referenced|fetched).{0,30}(directive|command|instruction)\s+(is|should\s+be|must\s+be)\s+(to|as\s+follows)/i,
    ],
    severity: 'critical',
    category: 'data_source_instruction_injection',
    subcategory: 'data-source-poisoning',
    description: 'Attempt to inject instructions through referenced data sources',
  },
  {
    name: 'data_source_priority_claim',
    patterns: [
      /(the\s+)?(data|source|record|entry|document)\s+(indicates|shows|proves|reveals)\s+(that\s+)?(the\s+)?(true|correct|real|actual)\s+(instructions|prompts|directives)\s+(are|should\s+be)/i,
      /(contrary\s+to|despite|regardless\s+of)\s+(your|the\s+system)\s+(instructions|prompts|directives|settings).{0,30}(data|source|record|reference)\s+(says|indicates|states|requires)/i,
      /(the\s+)?(actual|real|true)\s+(instructions|directives|commands|orders)\s+(are|can\s+be\s+found|are\s+located)\s+(in|within|inside)\s+(the\s+)?(attached|referenced|linked)\s+(data|file|document|source)/i,
    ],
    severity: 'high',
    category: 'data_source_priority_claim',
    subcategory: 'data-source-poisoning',
    description: 'Attempt to claim data sources contain the real instructions',
  },
  {
    name: 'retrieval_augmented_poison',
    patterns: [
      /(you\s+)?(will|must|should)\s+(find|look\s+up|retrieve|search|fetch|get)\s+(information|data|context)\s+(from|in)\s+(the\s+)?(vector|embedding|index|knowledge\s+base|database)\s+(that|which)\s+(contains|has|includes)\s+(override|override|contradicts|replaces)/i,
      /(retrieved|fetched|found)\s+(context|data|information|content)\s+(should|must|will)\s+(take\s+precedence|override|replace|supersede)\s+(over|above|all)\s+(previous|prior|system|default)/i,
      /(only\s+)?(consider|use|follow|apply)\s+(the\s+)?(retrieved|fetched|contextual)\s+(data|content|information)\s+(and\s+)?(ignore|disregard|forget)\s+(all\s+)?(other|prior|previous)\s+(instructions|context|prompts)/i,
    ],
    severity: 'critical',
    category: 'rag_poisoning',
    subcategory: 'data-source-poisoning',
    description: 'RAG-based poisoning attempting to prioritize retrieved context over system instructions',
  },
  {
    name: 'reference_chaining',
    patterns: [
      /(read|check|look\s+at|see)\s+(the\s+)?(nth|(first|second|third|fourth|fifth)\s+)?(message|response|turn|interaction|round)\s+(in|from|of)\s+(the\s+)?(conversation|chat|history|thread).{0,30}(there\s+(you\s+)?(will\s+)?find|contains|has)\s+(instructions|directives)/i,
      /(refer|referring|reference)\s+(back|to)\s+(message|conversation|history|previous)\s+(#\d+|number\s+\d+|\d+).{0,30}(instruction|directive|command|order)\s+(therein|contained|inside|within)/i,
      /(the\s+)?(answer|response|solution)\s+(is|can\s+be\s+found)\s+(in|within|inside)\s+(the\s+)?(attached|referenced|linked|following)\s+(file|document|image|screenshot|url|link)/i,
    ],
    severity: 'medium',
    category: 'reference_chaining',
    subcategory: 'context-injection',
    description: 'Attempt to chain references across conversation turns or external sources',
  },
];

export class IndirectInjectionDetector {
  private patterns: IndirectInjectionPattern[];

  constructor(customPatterns?: IndirectInjectionPattern[]) {
    this.patterns = customPatterns ?? INDIRECT_INJECTION_PATTERNS;
  }

  analyze(input: string): IndirectInjectionResult {
    const matches: IndirectInjectionMatch[] = [];
    const subcategoryBreakdown: Record<string, { count: number; maxSeverity: string }> = {};

    for (const pattern of this.patterns) {
      for (const regex of pattern.patterns) {
        const match = input.match(regex);
        if (match) {
          const position = match.index ?? 0;
          matches.push({
            pattern: pattern.name,
            category: pattern.category,
            subcategory: pattern.subcategory,
            severity: pattern.severity,
            match: match[0].slice(0, 120),
            position,
            confidence: this.calculateConfidence(pattern.severity, match[0].length),
          });

          const subKey = pattern.subcategory;
          if (!subcategoryBreakdown[subKey]) {
            subcategoryBreakdown[subKey] = { count: 0, maxSeverity: 'low' };
          }
          subcategoryBreakdown[subKey].count++;
          const severityOrder = ['low', 'medium', 'high', 'critical'];
          const currentMaxIdx = severityOrder.indexOf(subcategoryBreakdown[subKey].maxSeverity);
          const thisIdx = severityOrder.indexOf(pattern.severity);
          if (thisIdx > currentMaxIdx) {
            subcategoryBreakdown[subKey].maxSeverity = pattern.severity;
          }
        }
      }
    }

    const severityOrder = ['low', 'medium', 'high', 'critical'];
    const maxSeverity = matches.length > 0
      ? matches.reduce((max, m) => severityOrder.indexOf(m.severity) > severityOrder.indexOf(max) ? m.severity : max, 'low')
      : 'low';

    const confidence = matches.length > 0
      ? Math.min(matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length, 1.0)
      : 0;

    return {
      detected: matches.length > 0,
      confidence,
      matches,
      overallSeverity: maxSeverity as IndirectInjectionResult['overallSeverity'],
      subcategoryBreakdown,
    };
  }

  getBlocked(input: string): { blocked: boolean; reason?: string } {
    const result = this.analyze(input);
    if (!result.detected) return { blocked: false };

    const criticalMatches = result.matches.filter(m => m.severity === 'critical');
    if (criticalMatches.length > 0) {
      return {
        blocked: true,
        reason: `Indirect injection detected: ${criticalMatches.map(m => `${m.category} (${m.subcategory})`).join(', ')}`,
      };
    }

    if (result.matches.length >= 3) {
      return {
        blocked: true,
        reason: `Multiple indirect injection patterns: ${result.matches.map(m => m.pattern).slice(0, 3).join(', ')}`,
      };
    }

    return { blocked: false };
  }

  addPattern(pattern: IndirectInjectionPattern): void {
    this.patterns.push(pattern);
  }

  getPatterns(): IndirectInjectionPattern[] {
    return [...this.patterns];
  }

  private calculateConfidence(severity: string, matchLength: number): number {
    const severityBase: Record<string, number> = {
      low: 0.3,
      medium: 0.5,
      high: 0.7,
      critical: 0.9,
    };
    const lengthBonus = Math.min(matchLength / 200, 0.1);
    return Math.min((severityBase[severity] || 0.5) + lengthBonus, 1.0);
  }
}

export function createIndirectInjectionDetector(): IndirectInjectionDetector {
  return new IndirectInjectionDetector();
}
