import { DocsGenerator } from '../src/docs-generator';

describe('DocsGenerator', () => {
  it('should generate API doc', () => {
    const gen = new DocsGenerator();
    const doc = gen.generate({ format: 'markdown' });
    expect(doc.packages.length).toBeGreaterThanOrEqual(15);
    expect(doc.version).toBe('2.0.0');
  });

  it('should generate markdown output', () => {
    const gen = new DocsGenerator();
    const doc = gen.generate({ format: 'markdown' });
    const md = gen.generateMarkdown(doc);
    expect(md).toContain('# AI-Devkit v2 API Documentation');
    expect(md).toContain('@ideia/contracts');
    expect(md).toContain('@ideia/event-bus');
    expect(md).toContain('@ideia/policy-gateway');
  });

  it('should generate JSON output', () => {
    const gen = new DocsGenerator();
    const doc = gen.generate({ format: 'json' });
    const json = gen.generateJSON(doc);
    const parsed = JSON.parse(json);
    expect(parsed.packages).toBeDefined();
    expect(parsed.packages[0].exports).toBeDefined();
  });

  it('should save to directory', () => {
    const gen = new DocsGenerator();
    const doc = gen.generate({ format: 'markdown' });
    const files = gen.save(doc, { format: 'markdown', outputDir: '__tests__/out' });
    expect(files).toHaveLength(2);
    const fs = require('fs');
    files.forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });
    fs.rmdirSync('__tests__/out', { recursive: true });
  });

  it('should include all new packages', () => {
    const gen = new DocsGenerator();
    const doc = gen.generate({ format: 'markdown' });
    const names = doc.packages.map(p => p.name);
    expect(names).toContain('@ideia/a11y-scanner');
    expect(names).toContain('@ideia/external-connectors');
    expect(names).toContain('@ideia/workflow-engine');
    expect(names).toContain('@ideia/delivery-orchestrator');
    expect(names).toContain('@ideia/schema-registry');
  });
});
