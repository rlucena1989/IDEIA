import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ADRGenerator, createADRGenerator } from '../src/adr-generator';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';

jest.mock('@ideia/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}));

describe('ADRGenerator', () => {
  let tmpDir: string;
  let adrDir: string;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `adr-test-${Date.now()}-${Math.random()}`);
    adrDir = path.join(tmpDir, 'docs', 'adr');
    fs.mkdirSync(adrDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('generates an ADR file with proper structure', () => {
    const generator = new ADRGenerator(adrDir);
    const result = generator.generateADR({
      title: 'Test Decision',
      context: 'We need to decide about testing.',
      decision: 'We will use Jest for testing.',
      consequences: 'Better test coverage.',
    });

    expect(result.number).toBe(1);
    expect(result.title).toBe('Test Decision');
    expect(fs.existsSync(result.fullPath)).toBe(true);

    const content = fs.readFileSync(result.fullPath, 'utf-8');
    expect(content).toContain('# ADR-001: Test Decision');
    expect(content).toContain('## Status');
    expect(content).toContain('## Context');
    expect(content).toContain('We need to decide about testing.');
    expect(content).toContain('## Decision');
    expect(content).toContain('We will use Jest for testing.');
    expect(content).toContain('## Consequences');
    expect(content).toContain('Better test coverage.');
  });

  it('auto-increments ADR numbers', () => {
    const generator = new ADRGenerator(adrDir);

    const first = generator.generateADR({
      title: 'First Decision',
      context: 'First context',
      decision: 'First decision',
      consequences: 'First consequence',
    });
    expect(first.number).toBe(1);

    const second = generator.generateADR({
      title: 'Second Decision',
      context: 'Second context',
      decision: 'Second decision',
      consequences: 'Second consequence',
    });
    expect(second.number).toBe(2);
  });

  it('uses custom status when provided', () => {
    const generator = new ADRGenerator(adrDir);
    const result = generator.generateADR({
      title: 'Deprecated Decision',
      context: 'Context',
      decision: 'Decision',
      consequences: 'Consequences',
      status: 'deprecated',
    });

    const content = fs.readFileSync(result.fullPath, 'utf-8');
    expect(content).toContain('deprecated');
  });

  it('lists generated ADRs', () => {
    const generator = new ADRGenerator(adrDir);
    generator.generateADR({
      title: 'First',
      context: 'Ctx',
      decision: 'Dec',
      consequences: 'Cons',
    });
    generator.generateADR({
      title: 'Second',
      context: 'Ctx',
      decision: 'Dec',
      consequences: 'Cons',
    });

    const adrs = generator.listADRs();
    expect(adrs.length).toBe(2);
    expect(adrs[0].number).toBe(1);
    expect(adrs[1].number).toBe(2);
  });

  it('retrieves ADR content by number', () => {
    const generator = new ADRGenerator(adrDir);
    generator.generateADR({
      title: 'Fetchable',
      context: 'Context',
      decision: 'Decision',
      consequences: 'Consequences',
    });

    const content = generator.getADR(1);
    expect(content).not.toBeNull();
    expect(content).toContain('# ADR-001: Fetchable');
  });

  it('returns null for non-existent ADR number', () => {
    const generator = new ADRGenerator(adrDir);
    const content = generator.getADR(999);
    expect(content).toBeNull();
  });

  it('returns available template names', () => {
    const generator = new ADRGenerator(adrDir);
    const templates = generator.getADRTemplates();
    expect(templates).toContain('technology-adoption');
    expect(templates).toContain('architecture-change');
    expect(templates).toContain('api-change');
    expect(templates).toContain('tool-creation');
  });

  it('generates from template with variables', () => {
    const generator = new ADRGenerator(adrDir);
    const result = generator.generateFromTemplate('technology-adoption', {
      title: 'Adopt React',
      technology: 'React',
      purpose: 'frontend development',
      reasons: 'it is widely adopted',
      consequences: 'faster development',
      date: '2026-07-25',
    });

    expect(result.number).toBe(1);
    const content = fs.readFileSync(result.fullPath, 'utf-8');
    expect(content).toContain('React');
    expect(content).toContain('frontend development');
  });

  it('throws on unknown template', () => {
    const generator = new ADRGenerator(adrDir);
    expect(() =>
      generator.generateFromTemplate('nonexistent', { title: 'Test' })
    ).toThrow('Unknown template: nonexistent');
  });

  it('validates an ADR successfully', () => {
    const generator = new ADRGenerator(adrDir);
    generator.generateADR({
      title: 'Validatable',
      context: 'Ctx',
      decision: 'Dec',
      consequences: 'Cons',
    });

    const validation = generator.validateADR(1);
    expect(validation.valid).toBe(true);
    expect(validation.missingSections).toEqual([]);
  });

  it('validates all ADRs', () => {
    const generator = new ADRGenerator(adrDir);
    generator.generateADR({
      title: 'First',
      context: 'Ctx',
      decision: 'Dec',
      consequences: 'Cons',
    });

    const results = generator.validateAllADRs();
    expect(results.length).toBe(1);
    expect(results[0].valid).toBe(true);
  });

  it('createADRGenerator factory works', () => {
    const generator = createADRGenerator(adrDir);
    expect(generator).toBeInstanceOf(ADRGenerator);
  });
});
