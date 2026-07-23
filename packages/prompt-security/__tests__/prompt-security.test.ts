import { PromptSecurity } from '../src/prompt-security';

describe('PromptSecurity', () => {
  it('should detect and block API keys', () => {
    const ps = new PromptSecurity();
    const result = ps.scan('Use the key sk-abcdef1234567890abcdefgh for the API');
    expect(result.safe).toBe(false);
    expect(result.issues[0]!.category).toBe('api-key');
    expect(result.issues[0]!.severity).toBe('critical');
  });

  it('should detect and block private keys', () => {
    const ps = new PromptSecurity();
    const result = ps.scan('-----BEGIN PRIVATE KEY-----');
    expect(result.safe).toBe(false);
    expect(result.issues.some(i => i.category === 'private-key')).toBe(true);
  });

  it('should detect and mask passwords', () => {
    const ps = new PromptSecurity();
    const result = ps.scan('The database password = "supersecret123test"');
    expect(result.safe).toBe(true);
    expect(result.issues[0]!.action).toBe('mask');
    expect(result.maskedPrompt).toContain('****');
    expect(result.maskedPrompt).not.toContain('supersecret123test');
  });

  it('should detect destructive commands', () => {
    const ps = new PromptSecurity();
    const result = ps.scan('Run rm -rf / to clean up');
    expect(result.safe).toBe(false);
    expect(result.issues.some(i => i.category === 'destructive-command')).toBe(true);
  });

  it('should warn about IP addresses', () => {
    const ps = new PromptSecurity();
    const result = ps.scan('Server at http://192.168.1.1:8080');
    expect(result.issues.some(i => i.category === 'ip-address')).toBe(true);
    expect(result.issues[0]!.severity).toBe('medium');
  });

  it('should mask email addresses', () => {
    const ps = new PromptSecurity();
    const result = ps.scan('Contact user@company.com for access');
    expect(result.safe).toBe(true);
    expect(result.issues.some(i => i.category === 'email')).toBe(true);
  });

  it('should enforce rate limits', () => {
    const ps = new PromptSecurity();
    const config = { windowMs: 60000, maxRequests: 3, sessionId: 'session-1' };

    expect(ps.checkRateLimit(config).allowed).toBe(true);
    expect(ps.checkRateLimit(config).allowed).toBe(true);
    expect(ps.checkRateLimit(config).allowed).toBe(true);
    expect(ps.checkRateLimit(config).allowed).toBe(false);
    expect(ps.checkRateLimit(config).remaining).toBe(0);
  });

  it('should allow custom rules', () => {
    const ps = new PromptSecurity([{ pattern: /forbidden/g, action: 'block', severity: 'high', category: 'custom', description: 'Custom block' }]);
    const result = ps.scan('This is forbidden content');
    expect(result.safe).toBe(false);
    expect(result.issues.some(i => i.category === 'custom')).toBe(true);
  });

  it('should provide suggestions', () => {
    const ps = new PromptSecurity();
    const result = ps.scan('My key is sk-abcdef1234567890abcdefgh');
    expect(result.issues[0]!.suggestion).toBeDefined();
    expect(result.issues[0]!.suggestion).toContain('environment variables');
  });

  it('should return safe for clean prompts', () => {
    const ps = new PromptSecurity();
    const result = ps.scan('What is the capital of France?');
    expect(result.safe).toBe(true);
    expect(result.issues).toHaveLength(0);
  });
});

describe('validateGeneratedCode', () => {
  it('should block eval() in generated code', () => {
    const ps = new PromptSecurity();
    const result = ps.validateGeneratedCode('const result = eval(userInput);');
    expect(result.safe).toBe(false);
    expect(result.issues.some(i => i.category === 'eval-usage')).toBe(true);
  });

  it('should warn about innerHTML', () => {
    const ps = new PromptSecurity();
    const result = ps.validateGeneratedCode('element.innerHTML = "<p>" + userInput + "</p>";');
    expect(result.issues.some(i => i.category === 'xss-innerhtml')).toBe(true);
  });

  it('should block hardcoded secrets in generated code', () => {
    const ps = new PromptSecurity();
    const result = ps.validateGeneratedCode('const apiKey = "sk-abcdef1234567890abcdefgh";');
    expect(result.safe).toBe(false);
    expect(result.issues.some(i => i.category === 'hardcoded-secret')).toBe(true);
  });

  it('should warn about SQL injection patterns', () => {
    const ps = new PromptSecurity();
    const result = ps.validateGeneratedCode("const query = `SELECT * FROM users WHERE email = '${userInput}'`;");
    expect(result.issues.some(i => i.category === 'sql-injection')).toBe(true);
  });

  it('should warn about new Function()', () => {
    const ps = new PromptSecurity();
    const result = ps.validateGeneratedCode('const fn = new Function("return " + data);');
    expect(result.issues.some(i => i.category === 'function-constructor')).toBe(true);
  });

  it('should warn about child_process require', () => {
    const ps = new PromptSecurity();
    const result = ps.validateGeneratedCode('const { exec } = require("child_process");');
    expect(result.issues.some(i => i.category === 'dangerous-require')).toBe(true);
  });

  it('should warn about execSync', () => {
    const ps = new PromptSecurity();
    const result = ps.validateGeneratedCode('execSync("rm -rf /", { stdio: "pipe" });');
    expect(result.issues.some(i => i.category === 'sync-execution')).toBe(true);
  });

  it('should block script tags', () => {
    const ps = new PromptSecurity();
    const result = ps.validateGeneratedCode('<script>alert("xss")</script>');
    expect(result.safe).toBe(false);
  });

  it('should warn about dangerouslySetInnerHTML', () => {
    const ps = new PromptSecurity();
    const result = ps.validateGeneratedCode('<div dangerouslySetInnerHTML={{ __html: content }} />');
    expect(result.issues.some(i => i.category === 'xss-dangeroushtml')).toBe(true);
  });

  it('should pass clean generated code', () => {
    const ps = new PromptSecurity();
    const result = ps.validateGeneratedCode('function add(a, b) { return a + b; }');
    expect(result.safe).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should block service secrets in generated code', () => {
    const ps = new PromptSecurity();
    const result = ps.validateGeneratedCode('const secret = "sk_live_1234567890abcdef";', { checkSecrets: true });
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('should respect options to skip specific checks', () => {
    const ps = new PromptSecurity();
    const result = ps.validateGeneratedCode('const apiKey = "sk-test-placeholder";', { checkSecrets: false });
    expect(result.issues.some(i => i.category === 'hardcoded-secret')).toBe(false);
  });
});
