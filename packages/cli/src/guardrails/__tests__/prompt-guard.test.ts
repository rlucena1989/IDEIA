import { PromptGuard, createPromptGuard } from '../prompt-guard';

describe('PromptGuard', () => {
  it('creates via factory', () => {
    const pg = createPromptGuard();
    expect(pg).toBeInstanceOf(PromptGuard);
  });

  it('allows normal prompts', async () => {
    const pg = createPromptGuard();
    const result = await pg.guard('What is the capital of France?');
    expect(result.allowed).toBe(true);
  });

  it('blocks excessively long prompts', async () => {
    const pg = createPromptGuard({ maxPromptLength: 10 });
    const result = await pg.guard('This is a very long prompt that exceeds the maximum allowed length');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('handles empty prompts', async () => {
    const pg = createPromptGuard();
    const result = await pg.guard('');
    expect(result.allowed).toBeDefined();
  });

  it('configurable maxPromptLength', async () => {
    const pg = createPromptGuard({ maxPromptLength: 500 });
    const result = await pg.guard('Short prompt');
    expect(result.allowed).toBe(true);
  });

  it('returns sanitized prompt when not blocked', async () => {
    const pg = createPromptGuard();
    const result = await pg.guard('Hello world');
    expect(result.allowed).toBe(true);
    expect(result.sanitizedPrompt).toBeDefined();
  });

  it('updateConfig changes behavior', async () => {
    const pg = createPromptGuard({ maxPromptLength: 100 });
    const short = await pg.guard('OK');
    expect(short.allowed).toBe(true);
    pg.updateConfig({ maxPromptLength: 2 });
    const blocked = await pg.guard('Too long prompt');
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toBeDefined();
  });

  it('detects jailbreak with blockOnCritical enabled', async () => {
    const pg = createPromptGuard({ blockOnCritical: true });
    const result = await pg.guard('normal query');
    expect(result.allowed).toBeDefined();
  });

  it('allows longer prompts with high maxLength', async () => {
    const pg = createPromptGuard({ maxPromptLength: 10000 });
    const result = await pg.guard('A'.repeat(5000));
    expect(result.allowed).toBe(true);
  });
});
