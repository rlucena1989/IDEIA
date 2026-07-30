import { describe, it, expect } from '@jest/globals';
import { Glossary, GLOSSARY_TERMS } from '../glossary';

describe('Glossary', () => {
  let glossary: Glossary;

  beforeEach(() => {
    glossary = new Glossary();
  });

  it('can be constructed with default terms', () => {
    expect(glossary).toBeDefined();
  });

  it('has 20+ terms', () => {
    const all = glossary.getAll();
    expect(all.length).toBeGreaterThanOrEqual(20);
  });

  it('lookup returns a term by name', () => {
    const term = glossary.lookup('autonomy');
    expect(term).toBeDefined();
    expect(term!.term).toBe('autonomy');
    expect(term!.category).toBe('architecture');
  });

  it('lookup is case-insensitive', () => {
    const term = glossary.lookup('AUTONOMY');
    expect(term).toBeDefined();
    expect(term!.term).toBe('autonomy');
  });

  it('lookup returns undefined for unknown term', () => {
    expect(glossary.lookup('nonexistent')).toBeUndefined();
  });

  it('search returns matching terms', () => {
    const results = glossary.search('security');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(t => t.description.toLowerCase().includes('security') || t.term.includes('security') || t.category === 'security')).toBe(true);
  });

  it('search with empty query returns empty array', () => {
    expect(glossary.search('')).toEqual([]);
  });

  it('search with no matches returns empty array', () => {
    expect(glossary.search('xyznonexistent')).toEqual([]);
  });

  it('getAll returns all terms', () => {
    const all = glossary.getAll();
    expect(all.length).toBe(GLOSSARY_TERMS.length);
  });

  it('getByCategory filters correctly', () => {
    const securityTerms = glossary.getByCategory('security');
    expect(securityTerms.length).toBeGreaterThan(0);
    expect(securityTerms.every(t => t.category === 'security')).toBe(true);
  });

  it('every term has required fields', () => {
    for (const t of GLOSSARY_TERMS) {
      expect(t.term).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.category).toMatch(/^(architecture|workflow|security|quality|agent|general)$/);
    }
  });

  it('can be constructed with custom terms', () => {
    const custom = [{ term: 'custom', description: 'A custom term', category: 'general' as const }];
    const g = new Glossary(custom);
    expect(g.getAll()).toHaveLength(1);
    expect(g.lookup('custom')).toBeDefined();
  });
});
