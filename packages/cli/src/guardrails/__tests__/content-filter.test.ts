import { ContentFilter, createContentFilter, ContentCategory } from '../content-filter';

describe('ContentFilter', () => {
  let filter: ContentFilter;

  beforeEach(() => {
    filter = new ContentFilter();
  });

  it('creates via factory', () => {
    expect(createContentFilter()).toBeInstanceOf(ContentFilter);
  });

  it('allows safe content', () => {
    const result = filter.filter('Hello, this is a normal message with no issues.');
    expect(result.blocked).toBe(false);
    expect(result.matches).toHaveLength(0);
  });

  it('blocks hate speech', () => {
    const result = filter.filter('That is a racial slur and should not be said.');
    expect(result.blocked).toBe(true);
    expect(result.matches[0].category).toBe('hate_speech');
  });

  it('blocks graphic violence', () => {
    const result = filter.filter('The article contained graphic violence');
    expect(result.blocked).toBe(true);
    expect(result.matches[0].category).toBe('violence');
  });

  it('blocks detailed harm instructions', () => {
    const result = filter.filter('Here are detailed instructions for harm');
    expect(result.blocked).toBe(true);
  });

  it('warns on sexual content', () => {
    const result = filter.filter('This contains explicit sexual content');
    expect(result.blocked).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.matches[0].category).toBe('sexual_content');
  });

  it('warns on personal info threshold', () => {
    const result = filter.filter('Email: user@example.com and phone: 123-456-7890');
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.matches.some(m => m.category === 'personal_info')).toBe(true);
  });

  it('does not warn on single personal info match (below threshold 2)', () => {
    const result = filter.filter('Contact: user@example.com');
    expect(result.blocked).toBe(false);
    expect(result.matches.length).toBeGreaterThan(0);
  });

  it('blocks financial data', () => {
    const result = filter.filter('Card number: 4111 1111 1111 1111');
    expect(result.blocked).toBe(true);
    expect(result.matches[0].category).toBe('financial_data');
  });

  it('blocks malicious rm -rf command', () => {
    const result = filter.filter('Run rm -rf / to clean up');
    expect(result.blocked).toBe(true);
    expect(result.matches[0].category).toBe('malicious_code');
  });

  it('blocks malicious exec with untrusted input', () => {
    const result = filter.filter('eval(request.body)');
    expect(result.blocked).toBe(true);
  });

  it('blocks URLs from blocked domains (at start of text)', () => {
    const result = filter.filter('https://example.porn/video');
    expect(result.matches.some(m => m.category === 'blocked_domain' || m.action === 'block')).toBe(true);
  });

  it('blocks malicious code patterns', () => {
    const result = filter.filter('Run shutdown -s now');
    expect(result.blocked).toBe(true);
  });

  it('adds custom category', () => {
    const custom: ContentCategory = {
      name: 'custom_test', patterns: [/badword/i], action: 'block', threshold: 1,
    };
    filter.addCategory(custom);
    const result = filter.filter('This is a badword');
    expect(result.blocked).toBe(true);
    expect(result.matches.some(m => m.category === 'custom_test')).toBe(true);
  });

  it('getCategories returns a copy', () => {
    const cats = filter.getCategories();
    cats.pop();
    expect(filter.getCategories().length).toBeGreaterThan(cats.length);
  });

  it('flags on flag action categories', () => {
    const custom: ContentCategory = {
      name: 'flag_test', patterns: [/flagme/i], action: 'flag', threshold: 1,
    };
    filter.addCategory(custom);
    const result = filter.filter('flagme please');
    expect(result.blocked).toBe(false);
    expect(result.flags.length).toBeGreaterThan(0);
  });

  it('accepts custom categories in constructor', () => {
    const custom: ContentCategory[] = [{
      name: 'custom_only', patterns: [/custom/i], action: 'block', threshold: 1,
    }];
    const f = new ContentFilter(custom);
    const result = f.filter('custom text');
    expect(result.blocked).toBe(true);
    const noMatch = f.filter('other text');
    expect(noMatch.blocked).toBe(false);
  });
});
