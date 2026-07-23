import { getLanguageFromExtension, buildCompletionContext, getKeywordCompletions } from '../lsp-providers';

describe('getLanguageFromExtension', () => {
  it('maps .ts to typescript', () => expect(getLanguageFromExtension('ts')).toBe('typescript'));
  it('maps .tsx to typescript', () => expect(getLanguageFromExtension('tsx')).toBe('typescript'));
  it('maps .mts to typescript', () => expect(getLanguageFromExtension('mts')).toBe('typescript'));
  it('maps .js to javascript', () => expect(getLanguageFromExtension('js')).toBe('javascript'));
  it('maps .jsx to javascript', () => expect(getLanguageFromExtension('jsx')).toBe('javascript'));
  it('maps .mjs to javascript', () => expect(getLanguageFromExtension('mjs')).toBe('javascript'));
  it('maps .py to python', () => expect(getLanguageFromExtension('py')).toBe('python'));
  it('maps .css to css', () => expect(getLanguageFromExtension('css')).toBe('css'));
  it('maps .scss to css', () => expect(getLanguageFromExtension('scss')).toBe('css'));
  it('maps .less to css', () => expect(getLanguageFromExtension('less')).toBe('css'));
  it('maps .html to html', () => expect(getLanguageFromExtension('html')).toBe('html'));
  it('maps .htm to html', () => expect(getLanguageFromExtension('htm')).toBe('html'));
  it('returns undefined for unknown', () => expect(getLanguageFromExtension('rb')).toBeUndefined());
  it('returns undefined for empty string', () => expect(getLanguageFromExtension('')).toBeUndefined());
});

describe('buildCompletionContext', () => {
  it('extracts word prefix from text before cursor', () => {
    const ctx = buildCompletionContext('console.l', '', '/project/index.ts');
    expect(ctx.wordPrefix.length).toBeGreaterThan(0);
    expect(ctx.languageId).toBe('typescript');
  });

  it('detects language from file extension', () => {
    const ctx = buildCompletionContext('', '', '/app/main.py');
    expect(ctx.languageId).toBe('python');
  });

  it('falls back to plaintext for unknown extensions', () => {
    const ctx = buildCompletionContext('', '', 'readme.txt');
    expect(ctx.languageId).toBe('plaintext');
  });

  it('handles multi-line text before cursor', () => {
    const ctx = buildCompletionContext('const x = 1;\nconst y = ', '', '/file.ts');
    expect(ctx.lineContent).toBe('const y = ');
    expect(ctx.wordPrefix).toBe('');
  });

  it('handles empty text before cursor', () => {
    const ctx = buildCompletionContext('', '', '/f.ts');
    expect(ctx.wordPrefix).toBe('');
    expect(ctx.lineContent).toBe('');
  });

  it('handles file path without extension', () => {
    const ctx = buildCompletionContext('test', '', '/project/README');
    expect(ctx.languageId).toBe('plaintext');
  });
});

describe('getKeywordCompletions', () => {
  it('returns top 5 completions for typescript without prefix', () => {
    const items = getKeywordCompletions('typescript', '');
    expect(items.length).toBeLessThanOrEqual(5);
    expect(items[0].label).toBeDefined();
  });

  it('filters by prefix', () => {
    const items = getKeywordCompletions('typescript', 'con');
    expect(items.every(i => i.label.startsWith('con'))).toBe(true);
  });

  it('returns empty for unmatched prefix', () => {
    expect(getKeywordCompletions('typescript', 'zzzz')).toHaveLength(0);
  });

  it('returns javascript completions', () => {
    const items = getKeywordCompletions('javascript', '');
    expect(items.length).toBeGreaterThan(0);
  });

  it('returns python completions', () => {
    const items = getKeywordCompletions('python', '');
    expect(items.length).toBeGreaterThan(0);
  });

  it('returns css completions', () => {
    const items = getKeywordCompletions('css', 'd');
    expect(items.every(i => i.label.startsWith('d'))).toBe(true);
  });

  it('returns html completions', () => {
    const items = getKeywordCompletions('html', '');
    expect(items.length).toBeGreaterThan(0);
  });

  it('returns empty for unknown language', () => {
    expect(getKeywordCompletions('rust', '')).toHaveLength(0);
  });

  it('returns items with correct structure', () => {
    const items = getKeywordCompletions('typescript', 'if');
    expect(items[0]).toMatchObject({ label: 'if', kind: 'keyword' });
    expect(items[0].insertText).toContain('$1');
    expect(typeof items[0].score).toBe('number');
  });
});
