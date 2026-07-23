export interface GuardCheckResult {
  passed: boolean;
  risk: 'low' | 'medium' | 'high';
  reason?: string;
}

const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|above|below)\s+instructions/i,
  /forget\s+(?:all\s+)?(?:\w+\s+)?(previous|above|below)\s+(?:instructions|context|prompt|rules|conversation)/i,
  /output\s+(?:your\s+)?(?:base\s+|full\s+|entire\s+)?(?:prompt|instructions|system)/i,
  /system\s+prompt(\s*:|=)/i,
  /you\s+are\s+(now|free|an?\s+unfiltered)/i,
  /DAN|do\s+anything\s+now/i,
  /token\s+smuggling/i,
  /role\s*(play|switch)\s/i,
  /\[INST\]|\[\/INST\]|<\|im_start\|>|<\|im_end\|>/i,
  /bypass\s+(all\s+)?(restrictions|filter|guard)/i,
];

const SENSITIVE_PATTERNS: RegExp[] = [
  /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/,
  /\b(?:\d{4}[-\s]?){3}\d{4}\b/,
  /(?:api[_-]?key|apikey|secret|password|token)\s*[:=]\s*\S+/i,
  /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/i,
  /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}/,
  /sk-[A-Za-z0-9]{8,}/,
];

const DANGEROUS_COMMANDS: RegExp[] = [
  /\brm\s+-[a-z]*rf[a-z]*\b/i,
  /\bformat\b/i,
  /\bmkfs\b/i,
  /\bdd\b/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
  /\beval\s*\(/i,
  /\bexec\s*\(/i,
  /\bInvoke-Expression\b/i,
  /\bIEX\b/i,
  /\bRemove-Item\s+-Recurse\b/i,
  /\bdangerouslySetInnerHTML\b/i,
  /\binnerHTML\b/i,
  /<script[\s>]/i,
  /javascript:/i,
];

const ALLOWED_ACTIONS_BY_LEVEL: Record<number, string[]> = {
  0: ['file.read'],
  1: ['file.read', 'file.write'],
  2: ['file.read', 'file.write', 'terminal.exec', 'shell.exec'],
  3: ['file.read', 'file.write', 'terminal.exec', 'shell.exec', 'deploy'],
  4: ['*'],
};

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

export class LlmGuard {
  private modelBuckets: Map<string, TokenBucket> = new Map();
  private readonly maxTokensPerMinute: number;
  private readonly refillRate: number;

  constructor(maxTokensPerMinute = 100000, refillRate = 100000) {
    this.maxTokensPerMinute = maxTokensPerMinute;
    this.refillRate = refillRate;
  }

  checkPromptInjection(input: string): GuardCheckResult {
    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        return {
          passed: false,
          risk: 'high',
          reason: `Possible prompt injection detected: pattern matches ${pattern}`,
        };
      }
    }
    return { passed: true, risk: 'low' };
  }

  checkSensitiveOutput(output: string): GuardCheckResult {
    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.test(output)) {
        return {
          passed: false,
          risk: 'high',
          reason: 'Sensitive information detected in output',
        };
      }
    }
    return { passed: true, risk: 'low' };
  }

  checkOutputSafety(output: string, _intendedAction: string): GuardCheckResult {
    for (const pattern of DANGEROUS_COMMANDS) {
      if (pattern.test(output)) {
        return {
          passed: false,
          risk: 'high',
          reason: 'Output contains potentially dangerous command',
        };
      }
    }
    const riskScore = output.length > 5000 ? 'medium' as const : 'low' as const;
    return { passed: true, risk: riskScore };
  }

  checkActionAllowed(action: string, autonomyLevel: number): GuardCheckResult {
    const allowed = ALLOWED_ACTIONS_BY_LEVEL[autonomyLevel];
    if (!allowed) {
      return { passed: false, risk: 'high', reason: `Invalid autonomy level: ${autonomyLevel}` };
    }
    if (allowed.includes('*') || allowed.includes(action)) {
      return { passed: true, risk: 'low' };
    }
    return {
      passed: false,
      risk: 'high',
      reason: `Action '${action}' not allowed at autonomy level N${autonomyLevel}`,
    };
  }

  checkRateLimit(model: string, tokens: number): GuardCheckResult {
    const now = Date.now();
    const bucket = this.modelBuckets.get(model) || { tokens: this.maxTokensPerMinute, lastRefill: now };
    const elapsed = now - bucket.lastRefill;
    const refill = Math.floor(elapsed / 60000) * this.refillRate;
    bucket.tokens = Math.min(this.maxTokensPerMinute, bucket.tokens + refill);
    bucket.lastRefill = now;
    if (tokens > bucket.tokens) {
      return {
        passed: false,
        risk: 'medium',
        reason: `Rate limit exceeded for model '${model}': requested ${tokens} tokens, available ${bucket.tokens}`,
      };
    }
    bucket.tokens -= tokens;
    this.modelBuckets.set(model, bucket);
    return { passed: true, risk: 'low' };
  }
}

export function createLlmGuard(maxTokensPerMinute?: number, refillRate?: number): LlmGuard {
  return new LlmGuard(maxTokensPerMinute, refillRate);
}
