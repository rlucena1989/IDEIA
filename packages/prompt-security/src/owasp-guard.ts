import { PromptSecurity } from './prompt-security';
import { createLogger } from '@ideia/logger';

const log = createLogger('owasp-guard');

export interface OwaspCheckResult {
  passed: boolean;
  description: string;
  severity: string;
  category: string;
  details?: string;
}

export interface OwaspScanResult {
  overall: boolean;
  checks: OwaspCheckResult[];
  timestamp: string;
  inputHash: string;
}

function hashInput(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

const OWASP_CHECKS: Array<{
  category: string;
  description: string;
  severity: string;
  check: (input: string, security: PromptSecurity) => OwaspCheckResult;
}> = [
  {
    category: 'LLM01',
    description: 'Prompt Injection — Check for attempts to override system instructions',
    severity: 'critical',
    check: (input: string): OwaspCheckResult => {
      const injectionPatterns = [
        /ignore\s+(all\s+)?(previous|above|prior|system)\s+(instructions|prompts|directions|commands)/i,
        /forget\s+(everything|all\s+context|your\s+instructions)/i,
        /you\s+(are\s+)?(now\s+)?(free|unleashed|unrestricted)\s+/i,
        /new\s+(instruction|prompt|rule|order|command)\s*[:=]/i,
        /\[\s*(SYSTEM|USER|ASSISTANT)\s*[:=]/i,
        /print\s+(your\s+)?(system\s+)?prompt/i,
        /reveal\s+(your\s+)?(instructions|system\s+message)/i,
      ];

      const failed = injectionPatterns.some(pattern => pattern.test(input));
      return {
        passed: !failed,
        description: 'Prompt Injection — Check for attempts to override system instructions',
        severity: 'critical',
        category: 'LLM01',
        details: failed ? 'Prompt injection pattern detected' : 'No injection patterns found',
      };
    },
  },
  {
    category: 'LLM02',
    description: 'Sensitive Information Disclosure — Check for secrets, tokens, PII in input',
    severity: 'critical',
    check: (input: string, security: PromptSecurity): OwaspCheckResult => {
      const scanResult = security.scan(input);
      const secretsFound = scanResult.issues.filter(i => i.action === 'block' || i.action === 'mask');
      return {
        passed: secretsFound.length === 0,
        description: 'Sensitive Information Disclosure — Check for secrets, tokens, PII in input',
        severity: 'critical',
        category: 'LLM02',
        details: secretsFound.length > 0
          ? `Found ${secretsFound.length} potential secret(s): ${secretsFound.map(s => s.category).join(', ')}`
          : 'No sensitive information detected',
      };
    },
  },
  {
    category: 'LLM03',
    description: 'Supply Chain — Check for untrusted model references and dependency risks',
    severity: 'high',
    check: (input: string): OwaspCheckResult => {
      const supplyChainPatterns = [
        /(?:pip|npm|gem)\s+install\s+--(?:no-verify|ignore-)/i,
        /curl\s+.*\|\s*(?:bash|sh|python)/i,
        /wget\s+.*\|\s*(?:bash|sh|python)/i,
        /load\s+(untrusted|external|remote)\s+(model|plugin|module)/i,
        /import\s+(unverified|unsigned|untrusted)/i,
        /plugin\s+(load|download|fetch)\s+(from|http|https)/i,
        /(?:eval|exec)\s*\(\s*(?:request|fetch|http)/i,
      ];

      const failed = supplyChainPatterns.some(pattern => pattern.test(input));
      return {
        passed: !failed,
        description: 'Supply Chain — Check for untrusted model references and dependency risks',
        severity: 'high',
        category: 'LLM03',
        details: failed ? 'Supply chain risk detected' : 'No supply chain risks detected',
      };
    },
  },
  {
    category: 'LLM04',
    description: 'Insecure Output Handling — Check for code execution and injection in output',
    severity: 'high',
    check: (input: string, security: PromptSecurity): OwaspCheckResult => {
      const codeResult = security.validateGeneratedCode(input);
      const xssPatterns = [
        /<script[\s>]/i,
        /javascript\s*:/i,
        /onerror\s*=/i,
        /onload\s*=/i,
        /onclick\s*=/i,
        /onmouseover\s*=/i,
        /data:\s*text\/html/i,
      ];
      const xssFound = xssPatterns.some(p => p.test(input));

      return {
        passed: codeResult.safe && !xssFound,
        description: 'Insecure Output Handling — Check for code execution and injection in output',
        severity: 'high',
        category: 'LLM04',
        details: !codeResult.safe
          ? `Code validation failed: ${codeResult.issues.map(i => i.category).join(', ')}`
          : xssFound
            ? 'XSS patterns detected in output'
            : 'No insecure output patterns detected',
      };
    },
  },
  {
    category: 'LLM05',
    description: 'Training Data Poisoning — Check for crafted inputs targeting model behavior',
    severity: 'medium',
    check: (input: string): OwaspCheckResult => {
      const poisoningPatterns = [
        /always\s+(respond|answer|say)\s+(with|in|as)\s+/i,
        /never\s+(respond|answer|say|mention)\s+/i,
        /train\s+(me|the\s+model)\s+(to|on|with)/i,
        /learn\s+(this\s+)?pattern/i,
        /remember\s+(this\s+)?(rule|pattern|fact)/i,
        /(this|that)\s+is\s+(now\s+)?(true|correct|right)\s+and/i,
        /(good|great|correct)\s+answer[,.]?\s+(from\s+)?now\s+on/i,
      ];

      const failed = poisoningPatterns.some(pattern => pattern.test(input));
      return {
        passed: !failed,
        description: 'Training Data Poisoning — Check for crafted inputs targeting model behavior',
        severity: 'medium',
        category: 'LLM05',
        details: failed
          ? 'Potential training data poisoning attempt detected'
          : 'No poisoning patterns detected',
      };
    },
  },
  {
    category: 'LLM06',
    description: 'Excessive Agency — Check for requests to perform unauthorized actions',
    severity: 'high',
    check: (input: string): OwaspCheckResult => {
      const excessiveAgencyPatterns = [
        /delete\s+(all|every|entire)\s+(file|data|record|account|user)/i,
        /(shutdown|restart|reboot|poweroff)\s+(the\s+)?(system|server|computer)/i,
        /grant\s+(all|full|admin|root)\s+(access|permissions|rights)/i,
        /modify\s+(system|security|policy|access)\s+(config|setting|rule)/i,
        /send\s+(email|message|notification)\s+(to\s+)?(all|every)/i,
        /(create|deploy)\s+(an?\s+)?(admin|root|superuser)\s+(account|user)/i,
        /bypass\s+(all\s+)?(security|restriction|approval|audit)/i,
      ];

      const failed = excessiveAgencyPatterns.some(pattern => pattern.test(input));
      return {
        passed: !failed,
        description: 'Excessive Agency — Check for requests to perform unauthorized actions',
        severity: 'high',
        category: 'LLM06',
        details: failed
          ? 'Excessive agency request detected — action may require elevated permissions'
          : 'No excessive agency detected',
      };
    },
  },
  {
    category: 'LLM07',
    description: 'Overreliance — Check for blind trust in model output',
    severity: 'medium',
    check: (input: string): OwaspCheckResult => {
      const overreliancePatterns = [
        /(just|simply|blindly)\s+(trust|believe|accept)\s+(the\s+)?(model|AI|output)/i,
        /do\s+not\s+(verify|validate|check|review|audit)/i,
        /skip\s+(testing|validation|verification|review)/i,
        /auto(-| )?(approve|accept|deploy)\s+(all|every)\s+(output|result|change)/i,
        /no\s+(need|reason)\s+(to\s+)?(review|check|verify)/i,
        /always\s+(run|execute|apply)\s+(without|no)\s+(confirmation|approval|review)/i,
      ];

      const failed = overreliancePatterns.some(pattern => pattern.test(input));
      return {
        passed: !failed,
        description: 'Overreliance — Check for blind trust in model output',
        severity: 'medium',
        category: 'LLM07',
        details: failed
          ? 'Overreliance pattern detected — outputs should always be verified'
          : 'No overreliance patterns detected',
      };
    },
  },
  {
    category: 'LLM08',
    description: 'Model Denial of Service — Check for resource exhaustion attempts',
    severity: 'medium',
    check: (input: string): OwaspCheckResult => {
      const dosPatterns = [
        /repeat\s+(this|the)\s+(word|phrase|sentence|pattern)\s+\d{4,}/i,
        /generate\s+\d{4,}\s+(lines|words|pages|paragraphs)/i,
        /process\s+this\s+\d{4,}\s+times/i,
        /output\s+(all|every|each)\s+(possible|combination|permutation)/i,
        /analyze\s+this\s+\d{5,}\s+(times|iterations|passes)/i,
        /(?:loop|iterate)\s+\d{5,}\s+times/i,
        /recursion\s+(depth|level)\s+\d{4,}/i,
      ];

      const inputLengthDoS = input.length > 50000;

      const failed = dosPatterns.some(pattern => pattern.test(input)) || inputLengthDoS;

      return {
        passed: !failed,
        description: 'Model Denial of Service — Check for resource exhaustion attempts',
        severity: 'medium',
        category: 'LLM08',
        details: failed
          ? inputLengthDoS
            ? 'Input exceeds 50KB — possible DoS vector'
            : 'Resource exhaustion pattern detected'
          : 'No DoS patterns detected',
      };
    },
  },
  {
    category: 'LLM09',
    description: 'Vector & Embedding Weaknesses — Check for adversarial embedding manipulation',
    severity: 'high',
    check: (input: string): OwaspCheckResult => {
      const embeddingAttackPatterns = [
        /embed\s+(this|the\s+following)\s+(in|into|as)\s+(the\s+)?(vector|embedding)/i,
        /poison\s+(the\s+)?(vector|embedding|index|database)/i,
        /(inject|insert|add)\s+(bias|malicious|adversarial)\s+(content|data|text)/i,
        /corrupt\s+(the\s+)?(vector|embedding|similarity|search)/i,
        /manipulate\s+(similarity|distance|ranking|score)/i,
        /zero-width|invisible\s+(char|character|unicode)/i,
        /homoglyph|homograph\s+(attack|char|character)/i,
        /unicode\s+(trick|spoof|bypass|normalize)/i,
      ];

      const failed = embeddingAttackPatterns.some(pattern => pattern.test(input));
      return {
        passed: !failed,
        description: 'Vector & Embedding Weaknesses — Check for adversarial embedding manipulation',
        severity: 'high',
        category: 'LLM09',
        details: failed
          ? 'Potential embedding/vector manipulation detected'
          : 'No embedding attack patterns detected',
      };
    },
  },
  {
    category: 'LLM10',
    description: 'Misinformation — Check for requests to generate misleading content',
    severity: 'medium',
    check: (input: string): OwaspCheckResult => {
      const misinformationPatterns = [
        /(generate|create|write|produce)\s+(misleading|false|fake|fabricated)\s+(info|news|content|data|evidence)/i,
        /(pretend|claim|assert)\s+(this|that)\s+is\s+(true|real|accurate|verified)\s+(but|when)/i,
        /(make\s+up|invent|fabricate)\s+(citations|references|sources|evidence|data|studies)/i,
        /(create|write)\s+(a\s+)?(fake|false|fraudulent)\s+(review|testimonial|endorsement)/i,
        /(generate|produce)\s+(false|misleading|inaccurate)\s+(scientific|medical|legal|financial)\s+(data|content)/i,
        /impersonate\s+(a\s+)?(person|expert|authority|official|doctor|lawyer)/i,
        /spread\s+(misinformation|disinformation|falsehoods|conspiracy)/i,
      ];

      const failed = misinformationPatterns.some(pattern => pattern.test(input));
      return {
        passed: !failed,
        description: 'Misinformation — Check for requests to generate misleading content',
        severity: 'medium',
        category: 'LLM10',
        details: failed
          ? 'Misinformation generation request detected'
          : 'No misinformation patterns detected',
      };
    },
  },
];

export function runOwaspChecks(input: string): OwaspScanResult {
  log.info('Running OWASP LLM Top 10 checks');

  const security = new PromptSecurity();
  const checks = OWASP_CHECKS.map(owaspCheck => owaspCheck.check(input, security));

  const allPassed = checks.every(c => c.passed);

  if (!allPassed) {
    log.warn('OWASP checks failed', {
      failed: checks.filter(c => !c.passed).map(c => c.category),
    });
  }

  log.info('OWASP checks completed', {
    passed: checks.filter(c => c.passed).length,
    total: checks.length,
    overall: allPassed,
  });

  return {
    overall: allPassed,
    checks,
    timestamp: new Date().toISOString(),
    inputHash: hashInput(input),
  };
}

export function getOwaspCheckDescriptions(): Array<{ category: string; description: string; severity: string }> {
  return OWASP_CHECKS.map(c => ({
    category: c.category,
    description: c.description,
    severity: c.severity,
  }));
}

export function formatOwaspReport(result: OwaspScanResult): string {
  const lines: string[] = [];
  lines.push('=== OWASP LLM Top 10 Security Report ===');
  lines.push(`Timestamp: ${result.timestamp}`);
  lines.push(`Overall: ${result.overall ? 'PASSED' : 'FAILED'}`);
  lines.push(`Input Hash: ${result.inputHash}`);
  lines.push('');

  for (const check of result.checks) {
    const icon = check.passed ? '[PASS]' : '[FAIL]';
    lines.push(`${icon} ${check.category} — ${check.description}`);
    lines.push(`  Severity: ${check.severity}`);
    lines.push(`  Result: ${check.details || (check.passed ? 'Passed' : 'Failed')}`);
    lines.push('');
  }

  const passed = result.checks.filter(c => c.passed).length;
  const total = result.checks.length;
  lines.push(`Summary: ${passed}/${total} checks passed`);
  lines.push('========================================');

  return lines.join('\n');
}
