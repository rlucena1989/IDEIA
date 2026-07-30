import { ContextAnalyzer } from './context-analyzer';

describe('ContextAnalyzer', () => {
  const analyzer = new ContextAnalyzer();

  it('should extract function exports', () => {
    const code = 'export function sum(a: number, b: number): number { return a + b; }';
    const ctx = analyzer.analyze('math.ts', code);
    expect(ctx.exports).toHaveLength(1);
    expect(ctx.exports[0].name).toBe('sum');
    expect(ctx.exports[0].type).toBe('function');
  });

  it('should extract class exports', () => {
    const code = 'export class Calculator { add(a: number, b: number) { return a + b; } }';
    const ctx = analyzer.analyze('calc.ts', code);
    expect(ctx.exports).toHaveLength(1);
    expect(ctx.exports[0].type).toBe('class');
  });

  it('should extract interface exports', () => {
    const code = 'export interface User { id: string; name: string; }';
    const ctx = analyzer.analyze('types.ts', code);
    expect(ctx.exports).toHaveLength(1);
    expect(ctx.exports[0].type).toBe('interface');
  });

  it('should extract external dependencies', () => {
    const code = `import { foo } from 'bar';\nimport { baz } from './local';\n`;
    const ctx = analyzer.analyze('test.ts', code);
    expect(ctx.dependencies).toContain('bar');
    expect(ctx.dependencies).not.toContain('./local');
  });

  it('should extract type definitions', () => {
    const code = 'export interface Config { port: number; }\nexport type Callback = () => void;';
    const ctx = analyzer.analyze('config.ts', code);
    expect(ctx.types).toHaveLength(2);
    expect(ctx.types.map(t => t.name)).toContain('Config');
    expect(ctx.types.map(t => t.name)).toContain('Callback');
  });

  it('should handle empty source', () => {
    const ctx = analyzer.analyze('empty.ts', '');
    expect(ctx.exports).toHaveLength(0);
    expect(ctx.dependencies).toHaveLength(0);
  });
});
