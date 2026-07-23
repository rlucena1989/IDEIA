import { BUILT_IN_TOKENS, BUILT_IN_LAYOUTS, getToken, getTokensByCategory, searchTokens, formatTokensCSS, formatTokensJSON, formatTokensSCSS, DesignToken } from '../runtime/design-tokens';

describe('DesignTokens', () => {
  it('should have built-in tokens', () => {
    expect(BUILT_IN_TOKENS.length).toBeGreaterThan(30);
  });

  it('should have built-in layouts', () => {
    expect(BUILT_IN_LAYOUTS.length).toBe(7);
  });

  it('should get token by name', () => {
    const token = getToken('color-primary');
    expect(token).toBeDefined();
    expect(token!.value).toBe('#2563eb');
  });

  it('should return undefined for unknown token', () => {
    expect(getToken('nonexistent')).toBeUndefined();
  });

  it('should filter tokens by category', () => {
    const colors = getTokensByCategory('color');
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every(t => t.category === 'color')).toBe(true);
  });

  it('should search tokens by name', () => {
    const results = searchTokens('spacing');
    expect(results.length).toBeGreaterThan(0);
  });

  it('should search tokens by tag', () => {
    const results = searchTokens('feedback');
    expect(results.length).toBeGreaterThan(0);
  });

  it('should format tokens as CSS variables', () => {
    const css = formatTokensCSS(BUILT_IN_TOKENS);
    expect(css).toContain(':root {');
    expect(css).toContain('--color-primary:');
    expect(css).toContain('--spacing-md:');
  });

  it('should format tokens as JSON', () => {
    const json = formatTokensJSON(BUILT_IN_TOKENS);
    const parsed = JSON.parse(json);
    expect(parsed['color-primary']).toBe('#2563eb');
  });

  it('should format tokens as SCSS variables', () => {
    const scss = formatTokensSCSS(BUILT_IN_TOKENS);
    expect(scss).toContain('$color-primary:');
    expect(scss).toContain('$spacing-md:');
  });
});
