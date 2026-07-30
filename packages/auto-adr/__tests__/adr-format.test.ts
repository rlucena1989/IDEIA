import { describe, it, expect } from '@jest/globals';
import { AdrFormat } from '../src/adr-format';

describe('AdrFormat', () => {
  let format: AdrFormat;

  beforeEach(() => {
    format = new AdrFormat();
  });

  it('render generates markdown from data', () => {
    const md = format.render({
      id: '0001',
      title: 'Test Decision',
      status: 'proposed',
      date: '2026-01-01',
      context: 'We need to decide X',
      decision: 'We will do Y',
      consequences: ['Faster delivery', 'More complexity'],
    });
    expect(md).toContain('# ADR 0001: Test Decision');
    expect(md).toContain('**Status:** proposed');
    expect(md).toContain('**Date:** 2026-01-01');
    expect(md).toContain('## Context');
    expect(md).toContain('We need to decide X');
    expect(md).toContain('## Decision');
    expect(md).toContain('We will do Y');
    expect(md).toContain('## Consequences');
    expect(md).toContain('- Faster delivery');
    expect(md).toContain('- More complexity');
  });

  it('render with compliance adds section', () => {
    const md = format.render({
      id: '0002',
      title: 'Compliance Decision',
      status: 'accepted',
      date: '2026-01-01',
      context: 'Context',
      decision: 'Decision',
      consequences: [],
      compliance: 'Must follow LGPD',
    });
    expect(md).toContain('## Compliance');
    expect(md).toContain('Must follow LGPD');
  });

  it('render with supersededBy adds notice', () => {
    const md = format.render({
      id: '0001',
      title: 'Old Decision',
      status: 'superseded',
      date: '2026-01-01',
      context: 'Context',
      decision: 'Decision',
      consequences: [],
      supersededBy: '0002',
    });
    expect(md).toContain('Superseded by ADR 0002');
  });

  it('renderMadr produces same output as render', () => {
    const data = {
      id: '0003',
      title: 'MADR Test',
      status: 'proposed' as const,
      date: '2026-01-01',
      context: 'Test context',
      decision: 'Test decision',
      consequences: ['C1'],
    };
    expect(format.renderMadr(data)).toBe(format.render(data));
  });

  it('getTemplate returns template string', () => {
    const template = format.getTemplate();
    expect(template).toContain('{id}');
    expect(template).toContain('{title}');
    expect(template).toContain('{status}');
    expect(template).toContain('{context}');
    expect(template).toContain('{decision}');
  });

  it('parse extracts data from markdown', () => {
    const md = format.render({
      id: '0004',
      title: 'Parse Test',
      status: 'accepted',
      date: '2026-06-15',
      context: 'Testing parse',
      decision: 'Parse should work',
      consequences: ['Robust parsing', 'Backward compatible'],
    });
    const parsed = format.parse(md);
    expect(parsed).not.toBeNull();
    expect(parsed!.id).toBe('0004');
    expect(parsed!.title).toBe('Parse Test');
    expect(parsed!.status).toBe('accepted');
    expect(parsed!.date).toBe('2026-06-15');
    expect(parsed!.consequences).toContain('Robust parsing');
  });

  it('filename generates correct slug', () => {
    expect(format.filename('0001', 'Test Decision')).toBe('ADR-0001-test-decision.md');
    expect(format.filename('0010', 'Complex Decision: With Special Chars!')).toBe('ADR-0010-complex-decision-with-special-chars.md');
  });

  it('padId pads numbers correctly', () => {
    expect(format.padId(1)).toBe('0001');
    expect(format.padId(100)).toBe('0100');
  });
});
