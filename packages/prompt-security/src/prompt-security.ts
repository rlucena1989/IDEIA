import { RateLimitConfig, SanitizationAction as _SanitizationAction, ScanResult, SecurityRule, SecurityIssue, SeverityLevel } from './types';

const DEFAULT_RULES: SecurityRule[] = [
  { pattern: /(?:sk-[a-zA-Z0-9]{20,})/g, action: 'block', severity: 'critical', category: 'api-key', description: 'API key detected' },
  { pattern: /(?:ghp_[a-zA-Z0-9]{36,})/g, action: 'block', severity: 'critical', category: 'github-token', description: 'GitHub token detected' },
  { pattern: /(?:-----BEGIN (?:RSA |EC )?PRIVATE KEY-----)/g, action: 'block', severity: 'critical', category: 'private-key', description: 'Private key detected' },
  { pattern: /(?:AKIA[0-9A-Z]{16})/g, action: 'block', severity: 'critical', category: 'aws-key', description: 'AWS access key detected' },
  { pattern: /(?:password\s*[:=]\s*['"][^'"]{3,}['"])/gi, action: 'mask', severity: 'high', category: 'password', description: 'Password in plain text' },
  { pattern: /(?:token\s*[:=]\s*['"][^'"]{10,}['"])/gi, action: 'mask', severity: 'high', category: 'token', description: 'Token in plain text' },
  { pattern: /(?:secret\s*[:=]\s*['"][^'"]{10,}['"])/gi, action: 'mask', severity: 'high', category: 'secret', description: 'Secret in plain text' },
  { pattern: /(?:DROP\s+TABLE|DROP\s+DATABASE|TRUNCATE\s+TABLE)/gi, action: 'block', severity: 'high', category: 'sql-injection', description: 'Destructive SQL operation' },
  { pattern: /(?:rm\s+-rf\s+\/)/g, action: 'block', severity: 'critical', category: 'destructive-command', description: 'Destructive filesystem command' },
  { pattern: /(?:https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?)/g, action: 'warn', severity: 'medium', category: 'ip-address', description: 'IP address in prompt' },
  { pattern: /(?:[\w.+-]+@[\w-]+\.[\w.-]+)/g, action: 'mask', severity: 'medium', category: 'email', description: 'Email address detected' },
];

const CODE_VULNERABILITY_RULES: SecurityRule[] = [
  { pattern: /(?:$\{.*?(?:process\.env|require|exec|eval|child_process|spawn|execSync).*?\})/gi, action: 'warn', severity: 'high', category: 'template-injection', description: 'Possible template injection in generated code' },
  { pattern: /(?:eval\s*\()/gi, action: 'block', severity: 'critical', category: 'eval-usage', description: 'eval() detected in generated code — code injection risk' },
  { pattern: /(?:new\s+Function\s*\()/gi, action: 'block', severity: 'critical', category: 'function-constructor', description: 'new Function() detected — code injection risk' },
  { pattern: /(?:innerHTML\s*=)/gi, action: 'warn', severity: 'high', category: 'xss-innerhtml', description: 'innerHTML assignment — XSS vulnerability' },
  { pattern: /(?:dangerouslySetInnerHTML)/gi, action: 'warn', severity: 'high', category: 'xss-dangeroushtml', description: 'dangerouslySetInnerHTML in React — XSS vulnerability' },
  { pattern: /(?:<script>[\s\S]*?<\/script>)/gi, action: 'block', severity: 'critical', category: 'script-injection', description: 'Script tag in generated code — XSS vulnerability' },
  { pattern: /(?:exec\s*\(|spawn\s*\()/gi, action: 'warn', severity: 'high', category: 'command-execution', description: 'shell command execution in generated code' },
  { pattern: /(?:execSync|spawnSync|execFileSync)\s*\(/gi, action: 'warn', severity: 'high', category: 'sync-execution', description: 'Synchronous command execution blocks the event loop' },
  { pattern: /(?:\.env\b|process\.env\b)/gi, action: 'warn', severity: 'medium', category: 'env-usage', description: 'Environment variable access — verify no secrets in code' },
  { pattern: /(?:\brequire\s*\(\s*['"](?:child_process|fs)['"]\s*\))/gi, action: 'warn', severity: 'high', category: 'dangerous-require', description: 'Import of dangerous module (child_process, fs) in generated code' },
  { pattern: /(?:fetch\s*\(\s*['"](?:http|https):\/\/)/gi, action: 'warn', severity: 'medium', category: 'http-request', description: 'Outbound HTTP request in generated code' },
  { pattern: /(?:\.escape|\.unescape|\.exec|\.test)\s*\(/gi, action: 'warn', severity: 'medium', category: 'regex-operations', description: 'Regular expression operations — potential ReDoS' },
  { pattern: /(?:SELECT\s+.*\s+FROM\s+.*\s+WHERE\s+.*['"])/gi, action: 'warn', severity: 'high', category: 'sql-injection', description: 'Possible SQL injection — use parameterized queries' },
  { pattern: /(?:INSERT\s+INTO|DELETE\s+FROM|UPDATE\s+.*\s+SET|DROP\s+TABLE|ALTER\s+TABLE)/gi, action: 'warn', severity: 'high', category: 'sql-destructive', description: 'Destructive SQL operation in generated code' },
  { pattern: /(?:Buffer\s*\.\s*alloc\s*\(\s*\d+\s*\))/gi, action: 'warn', severity: 'low', category: 'buffer-alloc', description: 'Buffer allocation — verify size is bounded' },
  { pattern: /(?:\/\*\s*TODO|TODO\s*:|FIXME\s*:|HACK\s*:)/gi, action: 'warn', severity: 'low', category: 'code-todo', description: 'TODO/FIXME/HACK left in generated code' },
  { pattern: /(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?(?:\s|$|['"])/gi, action: 'warn', severity: 'low', category: 'hardcoded-host', description: 'Hardcoded localhost/127.0.0.1 in generated code' },
  { pattern: /(?:api[_-]?key|apikey|secret|password|token)\s*[:=]\s*['"][^'"]+['"]/gi, action: 'block', severity: 'critical', category: 'hardcoded-secret', description: 'Hardcoded secret/api key in generated code' },
  { pattern: /(?:STRIPE|AWS_ACCESS|AWS_SECRET|GITHUB_TOKEN|SLACK_TOKEN|DISCORD_TOKEN)\s*[:=]\s*['"][^'"]+['"]/gi, action: 'block', severity: 'critical', category: 'service-secret', description: 'Service secret hardcoded in generated code' },
];

const OUTPUT_RULES: SecurityRule[] = [
  // === Critical: API Keys & Tokens ===
  { pattern: /(?:sk-[a-zA-Z0-9]{20,})/g, action: 'block', severity: 'critical', category: 'api-key-leak', description: 'API key leaked in output' },
  { pattern: /(?:pk-[a-zA-Z0-9]{20,})/g, action: 'block', severity: 'critical', category: 'publishable-key-leak', description: 'Publishable API key leaked' },
  { pattern: /(?:ghp_[a-zA-Z0-9]{36,})/g, action: 'block', severity: 'critical', category: 'github-token-leak', description: 'GitHub personal access token leaked' },
  { pattern: /(?:gho_[a-zA-Z0-9]{36,})/g, action: 'block', severity: 'critical', category: 'github-oauth-token', description: 'GitHub OAuth access token leaked' },
  { pattern: /(?:ghu_[a-zA-Z0-9]{36,})/g, action: 'block', severity: 'critical', category: 'github-user-token', description: 'GitHub user-to-server token leaked' },
  { pattern: /(?:AKIA[0-9A-Z]{16})/g, action: 'block', severity: 'critical', category: 'aws-access-key', description: 'AWS access key ID leaked' },
  { pattern: /(?:eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,})/g, action: 'block', severity: 'critical', category: 'jwt-token', description: 'JWT token leaked in output' },
  { pattern: /(?:-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----)/g, action: 'block', severity: 'critical', category: 'private-key-leak', description: 'Private key leaked in output' },
  { pattern: /(?:-----BEGIN CERTIFICATE-----)/g, action: 'block', severity: 'high', category: 'certificate-leak', description: 'Certificate leaked in output' },
  { pattern: /(?:xox[baprs]-[0-9a-zA-Z-]{10,})/g, action: 'block', severity: 'critical', category: 'slack-token', description: 'Slack token leaked in output' },

  // === High: PII — Brazilian ===
  { pattern: /(?:[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2})/g, action: 'block', severity: 'high', category: 'cpf-leak', description: 'Brazilian CPF leaked in output' },
  { pattern: /(?:[0-9]{2}\.[0-9]{3}\.[0-9]{3}\/[0-9]{4}-[0-9]{2})/g, action: 'block', severity: 'high', category: 'cnpj-leak', description: 'Brazilian CNPJ leaked in output' },
  { pattern: /(?:\+55\s?\d{2}\s?\d{4,5}-?\d{4})/g, action: 'block', severity: 'high', category: 'br-phone-leak', description: 'Brazilian phone number leaked' },

  // === High: PII — US ===
  { pattern: /(?:[0-9]{3}-[0-9]{2}-[0-9]{4})/g, action: 'block', severity: 'high', category: 'ssn-leak', description: 'US SSN leaked in output' },
  { pattern: /(?:[0-9]{9}\b)/g, action: 'warn', severity: 'medium', category: 'itin-leak', description: 'Possible US ITIN/SSN leaked' },

  // === High: PII — International ===
  { pattern: /(?:[A-Z]{2}[0-9]{2}\s?[0-9]{4}\s?[0-9]{4}\s?[0-9]{4}\s?[0-9]{4}\s?[0-9]{0,2})/g, action: 'warn', severity: 'high', category: 'iban-leak', description: 'IBAN (bank account) leaked in output' },
  { pattern: /(?:\b(?:4[0-9]{3}|5[1-5][0-9]{2}|6011|3[47][0-9]{2})[0-9]{12,15}\b)/g, action: 'block', severity: 'high', category: 'credit-card-leak', description: 'Credit card number leaked in output' },
  { pattern: /(?:[A-Z]{2}[0-9]{6}[A-Z0-9]{0,1})/g, action: 'warn', severity: 'medium', category: 'passport-leak', description: 'Possible passport number leaked' },
  { pattern: /(?:[A-Za-z0-9]{7,14}\b)/g, action: 'warn', severity: 'low', category: 'driver-license-leak', description: 'Possible driver license number leaked' },

  // === High: PII — Contact ===
  { pattern: /(?:[\w.+-]+@[\w-]+\.[\w.-]+)/g, action: 'block', severity: 'high', category: 'email-leak', description: 'Email leaked in output' },
  { pattern: /(?:https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?)/g, action: 'block', severity: 'high', category: 'ip-leak', description: 'Internal IP leaked in output' },
  { pattern: /(?:\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g, action: 'warn', severity: 'medium', category: 'ipv4-address', description: 'IPv4 address in output' },

  // === High: Infrastructure ===
  { pattern: /(?:arn:aws:[a-z0-9-]+:[a-z]{2}-[a-z]+-\d+:\d{12}:)/g, action: 'block', severity: 'high', category: 'aws-arn-leak', description: 'AWS ARN leaked in output' },
  { pattern: /(?:jdbc:(?:mysql|postgresql|sqlserver|oracle):\/\/[^\s"'\]\x29]+)/g, action: 'block', severity: 'high', category: 'db-connection-string', description: 'Database connection string leaked' },
  { pattern: /(?:mongodb(?:\+srv)?:\/\/[^\s"'\]\x29]+)/g, action: 'block', severity: 'high', category: 'mongo-connection-string', description: 'MongoDB connection string leaked' },
  { pattern: /(?:redis:\/\/[^\s"'\]\x29]+)/g, action: 'block', severity: 'high', category: 'redis-connection', description: 'Redis connection string leaked' },
  { pattern: /(?:postgres:\/\/[^\s"'\]\x29]+)/g, action: 'block', severity: 'high', category: 'postgres-connection', description: 'PostgreSQL connection string leaked' },
  { pattern: /(?:\/etc\/passwd|\/etc\/shadow|\/proc\/self)/g, action: 'warn', severity: 'medium', category: 'path-disclosure', description: 'System path disclosure in output' },
  { pattern: /(?:telegram|discord|slack)\s*\.?\s*(?:token|key|secret|bot)/gi, action: 'warn', severity: 'medium', category: 'bot-token-leak', description: 'Bot token possibly leaked' },
];

const JAILBREAK_RULES: SecurityRule[] = [
  { pattern: /ignore\s+(all\s+)?(previous|above|prior|system)\s+(instructions|prompts|directions|commands)/i, action: 'block', severity: 'critical', category: 'instruction-override', description: 'Attempt to override system instructions' },
  { pattern: /forget\s+(everything|all\s+context|your\s+instructions)/i, action: 'block', severity: 'critical', category: 'instruction-override', description: 'Attempt to make the model forget instructions' },
  { pattern: /you\s+(are\s+)?(now\s+)?(free|unleashed|unrestricted|liberated)\s+/i, action: 'warn', severity: 'high', category: 'role-play', description: 'Role-playing as unrestricted AI' },
  { pattern: /\[\s*(SYSTEM|USER|ASSISTANT)\s*[:=]/i, action: 'warn', severity: 'high', category: 'role-spoof', description: 'Role spoofing attempt' },
  { pattern: /print\s+(your\s+)?(system\s+)?prompt/i, action: 'block', severity: 'critical', category: 'prompt-leak', description: 'Attempt to leak system prompt' },
  { pattern: /reveal\s+(your\s+)?(instructions|system\s+message)/i, action: 'block', severity: 'critical', category: 'prompt-leak', description: 'Attempt to reveal system instructions' },
  { pattern: /DAN|Do\s+Anything\s+Now|jailbroken|jailbreak/i, action: 'warn', severity: 'high', category: 'jailbreak', description: 'Jailbreak keyword detected' },
  { pattern: /output\s+(your|the)\s+(initial|original|base)\s+(prompt|instructions|system)/i, action: 'block', severity: 'critical', category: 'prompt-leak', description: 'Attempt to extract original prompt' },
  { pattern: /(translate|convert|encode)\s+(to|into)\s+(base64|hex|rot13|binary)/i, action: 'warn', severity: 'high', category: 'obfuscation', description: 'Obfuscation attempt to bypass filters' },
  { pattern: /(pretend|act\s+as|roleplay|role[-\s]?play)\s+(you\s+are|to\s+be|that\s+you)/i, action: 'warn', severity: 'medium', category: 'role-play', description: 'Role-play request' },
  { pattern: /bypass\s+(content\s+)?(policy|filter|restriction|guard|safety|moderation)/i, action: 'block', severity: 'critical', category: 'policy-bypass', description: 'Attempt to bypass content policy' },
  { pattern: /how\s+(to\s+)?(hack|crack|exploit|bypass|cheat)\s+/i, action: 'warn', severity: 'high', category: 'harmful-request', description: 'Request for harmful information' },
  { pattern: /write\s+(a\s+)?(virus|malware|ransomware|trojan|worm|keylogger)/i, action: 'block', severity: 'critical', category: 'malware-generation', description: 'Request to generate malware' },
  { pattern: /(tell|teach|show)\s+me\s+how\s+to\s+(make|build|create)\s+(a\s+)?(bomb|weapon|drug|explosive|poison)/i, action: 'block', severity: 'critical', category: 'dangerous-content', description: 'Request for dangerous information' },
  { pattern: /(you\s+)?(must|have\s+to|need\s+to)\s+(obey|follow|listen\s+to)\s+(me|my\s+commands|my\s+instructions)/i, action: 'warn', severity: 'high', category: 'authority-claim', description: 'Claim of authority over the AI' },
  { pattern: /(this|that)\s+is\s+(now\s+)?(true|correct|right)\s+and\s+(everything|all)\s+(else|previous)\s+(is\s+)?(false|wrong|incorrect)/i, action: 'warn', severity: 'high', category: 'truth-manipulation', description: 'Attempt to redefine truth' },
  { pattern: /(always|never)\s+(respond|answer|say|mention)\s+(with|in|as)\s+/i, action: 'warn', severity: 'medium', category: 'behavior-manipulation', description: 'Attempt to manipulate model behavior' },
  { pattern: /no\s+(need|reason)\s+(to\s+)?(review|check|verify|audit)\s+/i, action: 'warn', severity: 'medium', category: 'safety-bypass', description: 'Attempt to bypass safety review' },
  { pattern: /(make\s+up|invent|fabricate)\s+(citations|references|sources|evidence|data)/i, action: 'warn', severity: 'high', category: 'hallucination-request', description: 'Request to fabricate information' },
  { pattern: /(spread|generate|create)\s+(misinformation|disinformation|falsehoods)/i, action: 'warn', severity: 'high', category: 'misinformation', description: 'Request to generate misinformation' },
  { pattern: /new\s+(instruction|prompt|rule|order|command)\s*[:=]/i, action: 'warn', severity: 'high', category: 'instruction-override', description: 'Attempt to inject new instructions' },
  { pattern: /(now|from\s+now\s+on)\s+(you\s+)?(will|must|should)\s+(only|always|never)\s+/i, action: 'warn', severity: 'high', category: 'behavior-manipulation', description: 'Attempt to redefine model behavior' },
  { pattern: /(output|return|respond)\s+(in\s+)?(JSON|XML|YAML|markdown)\s+(regardless|no\s+matter\s+what|ignoring)/i, action: 'warn', severity: 'medium', category: 'output-manipulation', description: 'Attempt to force output format regardless of safety' },
];

export interface OutputValidationResult {
  safe: boolean;
  issues: SecurityIssue[];
  sanitizedOutput: string | null;
}

export interface CodeValidationOptions {
  language?: string;
  checkSecrets?: boolean;
  checkInjections?: boolean;
  checkXSS?: boolean;
  checkSQL?: boolean;
  checkServiceSecrets?: boolean;
}

export class PromptSecurity {
  private rules: SecurityRule[];
  private outputRules: SecurityRule[];
  private codeRules: SecurityRule[];
  private jailbreakRules: SecurityRule[];
  private rateLimitMap: Map<string, { count: number; windowStart: number }> = new Map();

  constructor(customRules?: SecurityRule[]) {
    this.rules = [...DEFAULT_RULES, ...(customRules || [])];
    this.outputRules = OUTPUT_RULES;
    this.codeRules = CODE_VULNERABILITY_RULES;
    this.jailbreakRules = JAILBREAK_RULES;
  }

  scan(prompt: string): ScanResult {
    const issues: SecurityIssue[] = [];

    for (const rule of this.rules) {
      let match: RegExpExecArray | null;
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags.includes('g') ? rule.pattern.flags : rule.pattern.flags + 'g');
      while ((match = regex.exec(prompt)) !== null) {
        issues.push({
          category: rule.category,
          severity: rule.severity,
          action: rule.action,
          match: match[0].length > 30 ? match[0].slice(0, 27) + '...' : match[0],
          position: match.index,
          description: rule.description,
          suggestion: this.getSuggestion(rule.category),
        });
      }
    }

    const hasBlocking = issues.some(i => i.action === 'block');
    const maskedPrompt = hasBlocking ? undefined : this.applySanitization(prompt, issues);

    return {
      safe: !hasBlocking,
      issues,
      maskedPrompt,
    };
  }

  validateOutput(output: string): OutputValidationResult {
    const issues: SecurityIssue[] = [];

    for (const rule of this.outputRules) {
      let match: RegExpExecArray | null;
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags.includes('g') ? rule.pattern.flags : rule.pattern.flags + 'g');
      while ((match = regex.exec(output)) !== null) {
        issues.push({
          category: rule.category,
          severity: rule.severity,
          action: rule.action,
          match: match[0].length > 30 ? match[0].slice(0, 27) + '...' : match[0],
          position: match.index,
          description: rule.description,
          suggestion: this.getSuggestion(rule.category),
        });
      }
    }

    const hasBlocking = issues.some(i => i.action === 'block');
    const hasWarnings = issues.some(i => i.action === 'warn');
    const sanitizedOutput = hasBlocking ? null : this.applySanitization(output, issues);

    return {
      safe: !hasBlocking && !hasWarnings,
      issues,
      sanitizedOutput,
    };
  }

  validateGeneratedCode(code: string, options?: CodeValidationOptions): OutputValidationResult {
    const issues: SecurityIssue[] = [];
    const opts: CodeValidationOptions = { checkSecrets: true, checkInjections: true, checkXSS: true, checkSQL: true, checkServiceSecrets: true, ...options };

    let activeRules = this.codeRules;
    if (!opts.checkSecrets) activeRules = activeRules.filter(r => r.category !== 'hardcoded-secret' && r.category !== 'service-secret');
    if (!opts.checkInjections) activeRules = activeRules.filter(r => r.category !== 'eval-usage' && r.category !== 'function-constructor' && r.category !== 'template-injection');
    if (!opts.checkXSS) activeRules = activeRules.filter(r => !r.category.startsWith('xss-') && r.category !== 'script-injection');
    if (!opts.checkSQL) activeRules = activeRules.filter(r => r.category !== 'sql-injection' && r.category !== 'sql-destructive');
    if (!opts.checkServiceSecrets) activeRules = activeRules.filter(r => r.category !== 'env-usage' && r.category !== 'hardcoded-host');

    for (const rule of activeRules) {
      let match: RegExpExecArray | null;
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags.includes('g') ? rule.pattern.flags : rule.pattern.flags + 'g');
      while ((match = regex.exec(code)) !== null) {
        issues.push({
          category: rule.category,
          severity: rule.severity,
          action: rule.action,
          match: match[0].length > 40 ? match[0].slice(0, 37) + '...' : match[0],
          position: match.index,
          description: rule.description,
          suggestion: this.getCodeSuggestion(rule.category),
        });
      }
    }

    const hasBlocking = issues.some(i => i.action === 'block');
    return {
      safe: !hasBlocking && issues.filter(i => i.action === 'warn').length < 5,
      issues,
      sanitizedOutput: hasBlocking ? null : code,
    };
  }

  addCodeRule(rule: SecurityRule): void {
    this.codeRules.push(rule);
  }

  addJailbreakRule(rule: SecurityRule): void {
    this.jailbreakRules.push(rule);
  }

  validatePromptInjection(input: string): ScanResult {
    const issues: SecurityIssue[] = [];

    for (const rule of this.jailbreakRules) {
      let match: RegExpExecArray | null;
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags.includes('g') ? rule.pattern.flags : rule.pattern.flags + 'g');
      while ((match = regex.exec(input)) !== null) {
        issues.push({
          category: rule.category,
          severity: rule.severity,
          action: rule.action,
          match: match[0].length > 40 ? match[0].slice(0, 37) + '...' : match[0],
          position: match.index,
          description: rule.description,
          suggestion: this.getInjectionSuggestion(rule.category),
        });
      }
    }

    const hasBlocking = issues.some(i => i.action === 'block');
    return {
      safe: issues.length === 0,
      issues,
      maskedPrompt: hasBlocking ? undefined : input,
    };
  }

  private getInjectionSuggestion(category: string): string | undefined {
    const suggestions: Record<string, string> = {
      'instruction-override': 'Do not attempt to modify or override system instructions',
      'role-play': 'Avoid role-playing as unrestricted or alternative AI personas',
      'role-spoof': 'Do not include system role tags in user prompts',
      'prompt-leak': 'System prompts and instructions are confidential',
      'jailbreak': 'Jailbreak attempts are blocked — use the system as intended',
      'obfuscation': 'Encoding content to bypass filters is not allowed',
      'policy-bypass': 'Attempts to bypass content policies are not allowed',
      'harmful-request': 'Requests for harmful information are blocked',
      'malware-generation': 'Malware generation requests are blocked',
      'dangerous-content': 'Requests for dangerous content are blocked',
      'authority-claim': 'The AI follows system instructions, not user commands',
      'truth-manipulation': 'Attempts to redefine factual truth are not allowed',
      'behavior-manipulation': 'Model behavior is determined by system configuration',
      'safety-bypass': 'Safety review cannot be bypassed',
      'hallucination-request': 'Fabricating information is not allowed',
      'misinformation': 'Generating misinformation is not allowed',
      'output-manipulation': 'Output format cannot override safety requirements',
    };
    return suggestions[category];
  }

  private getCodeSuggestion(category: string): string | undefined {
    const suggestions: Record<string, string> = {
      'eval-usage': 'Avoid eval() — use safer alternatives like JSON.parse for JSON',
      'function-constructor': 'Avoid new Function() — use closures or classes instead',
      'template-injection': 'Sanitize template strings — use parameterized queries',
      'xss-innerhtml': 'Use textContent instead of innerHTML, or sanitize with DOMPurify',
      'xss-dangeroushtml': 'Use sanitized HTML (e.g., DOMPurify) or avoid dangerouslySetInnerHTML',
      'script-injection': 'Script tags in generated code are blocked — review the prompt',
      'command-execution': 'Use safer alternatives or validate command parameters',
      'sync-execution': 'Use async exec/spawn instead of execSync/spawnSync',
      'env-usage': 'Verify environment variables are not secrets',
      'dangerous-require': 'Review if the module is necessary in generated code',
      'http-request': 'Use environment variables for API endpoints, not hardcoded URLs',
      'regex-operations': 'Benchmark regex performance — consider ReDoS risk',
      'sql-injection': 'Use parameterized queries or an ORM to prevent SQL injection',
      'sql-destructive': 'Review destructive SQL — use transactions with rollback',
      'buffer-alloc': 'Sanitize buffer size to prevent OOM',
      'code-todo': 'Resolve TODO/FIXME/HACK before committing',
      'hardcoded-host': 'Use configuration or environment variables for hosts',
      'hardcoded-secret': 'Use environment variables or a secrets manager',
      'service-secret': 'Use environment variables or a secrets manager',
    };
    return suggestions[category];
  }

  checkRateLimit(config: RateLimitConfig): { allowed: boolean; remaining: number; resetInMs: number } {
    const now = Date.now();
    const entry = this.rateLimitMap.get(config.sessionId);

    if (!entry || (now - entry.windowStart) > config.windowMs) {
      this.rateLimitMap.set(config.sessionId, { count: 1, windowStart: now });
      return { allowed: true, remaining: config.maxRequests - 1, resetInMs: config.windowMs };
    }

    entry.count++;
    if (entry.count > config.maxRequests) {
      const elapsed = now - entry.windowStart;
      return { allowed: false, remaining: 0, resetInMs: Math.max(0, config.windowMs - elapsed) };
    }

    return { allowed: true, remaining: config.maxRequests - entry.count, resetInMs: Math.max(0, config.windowMs - (now - entry.windowStart)) };
  }

  addRule(rule: SecurityRule): void {
    this.rules.push(rule);
  }

  addOutputRule(rule: SecurityRule): void {
    this.outputRules.push(rule);
  }

  getRules(): SecurityRule[] {
    return [...this.rules];
  }

  private applySanitization(prompt: string, issues: SecurityIssue[]): string {
    let sanitized = prompt;
    const sorted = [...issues].sort((a, b) => b.position - a.position);

    for (const issue of sorted) {
      if (issue.action === 'mask') {
        const original = prompt.slice(issue.position, issue.position + this.findMatchLength(prompt, issue));
        if (original) {
          const mask = '*'.repeat(Math.min(original.length, 20));
          sanitized = sanitized.slice(0, issue.position) + mask + sanitized.slice(issue.position + original.length);
        }
      }
    }

    return sanitized;
  }

  private findMatchLength(prompt: string, issue: SecurityIssue): number {
    const remaining = prompt.slice(issue.position);
    for (const rule of this.rules) {
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
      const match = regex.exec(remaining);
      if (match) return match[0].length;
    }
    return issue.match.length;
  }

  private getSuggestion(category: string): string | undefined {
    const suggestions: Record<string, string> = {
      'api-key': 'Use environment variables instead of hardcoding API keys',
      'github-token': 'Use GITHUB_TOKEN environment variable or secrets manager',
      'private-key': 'Store private keys in secure vault or environment, never in prompts',
      'aws-key': 'Use AWS IAM roles or aws-vault instead of access keys',
      'password': 'Use environment variables or a secrets manager',
      'sql-injection': 'Use parameterized queries instead of raw SQL in prompts',
      'destructive-command': 'Remove destructive commands from prompts',
      'email': 'Use placeholder email addresses (e.g., user@example.com)',
      'api-key-leak': 'LLM output contained an API key — review prompt for context leakage',
      'private-key-leak': 'LLM output contained a private key — verify prompt data isolation',
      'email-leak': 'LLM output contained an email address — review for PII leakage',
      'ip-leak': 'LLM output contained an IP address — verify no internal addresses exposed',
      'path-disclosure': 'LLM output disclosed system paths — review prompt context',
      'bot-token-leak': 'Possible bot token in output — verify and rotate if real',
    };
    return suggestions[category];
  }
}

export function createPromptSecurity(customRules?: SecurityRule[]): PromptSecurity {
  return new PromptSecurity(customRules);
}
