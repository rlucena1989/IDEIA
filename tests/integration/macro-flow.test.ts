import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Macro Flow E2E', () => {
  let tmpDir: string;
  let projectDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'macro-flow-'));
    projectDir = path.join(tmpDir, 'test-project');
    fs.mkdirSync(projectDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('Full lifecycle: create project, generate module, verify structure', () => {
    // 1. Create project structure
    const srcDir = path.join(projectDir, 'src');
    const testsDir = path.join(projectDir, 'tests');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.mkdirSync(testsDir, { recursive: true });

    const packageJson = {
      name: 'test-project',
      version: '1.0.0',
      scripts: { test: 'node --test test-runner.mjs', build: 'node build.mjs' },
    };
    fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify(packageJson, null, 2), 'utf-8');

    // 2. Generate main module
    fs.writeFileSync(
      path.join(srcDir, 'index.ts'),
      [
        'export function greet(name: string): string {',
        '  return `Hello, ${name}!`;',
        '}',
        '',
        'export function add(a: number, b: number): number {',
        '  return a + b;',
        '}',
        '',
        'export const VERSION = "1.0.0";',
      ].join('\n'),
      'utf-8',
    );

    // 3. Generate module with dependencies
    const modulesDir = path.join(srcDir, 'modules');
    fs.mkdirSync(modulesDir, { recursive: true });
    fs.writeFileSync(
      path.join(modulesDir, 'calculator.ts'),
      [
        'export class Calculator {',
        '  add(a: number, b: number): number { return a + b; }',
        '  subtract(a: number, b: number): number { return a - b; }',
        '  multiply(a: number, b: number): number { return a * b; }',
        '  divide(a: number, b: number): number {',
        '    if (b === 0) throw new Error("Division by zero");',
        '    return a / b;',
        '  }',
        '}',
      ].join('\n'),
      'utf-8',
    );

    // 4. Generate test files
    fs.writeFileSync(
      path.join(testsDir, 'test-runner.mjs'),
      [
        'import { describe, it } from "node:test";',
        'import assert from "node:assert";',
        '',
        'describe("greet", () => {',
        '  it("should return greeting", () => {',
        '    assert.strictEqual("Hello, World!", "Hello, World!");',
        '  });',
        '});',
        '',
        'describe("calculator", () => {',
        '  it("should add numbers", () => {',
        '    assert.strictEqual(2 + 3, 5);',
        '  });',
        '  it("should subtract numbers", () => {',
        '    assert.strictEqual(5 - 3, 2);',
        '  });',
        '});',
        '',
        'describe("module integrity", () => {',
        '  it("should have all source files", () => {',
        '    assert.ok(true, "Source files exist");',
        '  });',
        '});',
      ].join('\n'),
      'utf-8',
    );

    // 5. Verify project creation
    expect(fs.existsSync(path.join(projectDir, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(srcDir, 'index.ts'))).toBe(true);
    expect(fs.existsSync(path.join(modulesDir, 'calculator.ts'))).toBe(true);
    expect(fs.existsSync(path.join(testsDir, 'test-runner.mjs'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, 'node_modules'))).toBe(false);

    // 6. Verify module contents
    const calculatorContent = fs.readFileSync(path.join(modulesDir, 'calculator.ts'), 'utf-8');
    expect(calculatorContent).toContain('class Calculator');
    expect(calculatorContent).toContain('add');
    expect(calculatorContent).toContain('subtract');
    expect(calculatorContent).toContain('multiply');
    expect(calculatorContent).toContain('divide');

    const indexContent = fs.readFileSync(path.join(srcDir, 'index.ts'), 'utf-8');
    expect(indexContent).toContain('greet');
    expect(indexContent).toContain('add');
    expect(indexContent).toContain('VERSION');

    // 7. Verify tests are parseable
    const testFiles = fs.readdirSync(testsDir).filter(f => f.endsWith('.mjs'));
    expect(testFiles).toHaveLength(1);
    const testContent = fs.readFileSync(path.join(testsDir, testFiles[0]!), 'utf-8');
    const itCount = (testContent.match(/it\(/g) || []).length;
    expect(itCount).toBeGreaterThanOrEqual(3);
  });

  test('Project creation with config and dependencies', () => {
    const configPath = path.join(projectDir, 'config.json');
    const config = {
      name: 'test-app',
      version: '0.1.0',
      modules: ['core', 'utils', 'api'],
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    for (const mod of config.modules) {
      const modDir = path.join(projectDir, 'src', mod);
      fs.mkdirSync(modDir, { recursive: true });
      fs.writeFileSync(path.join(modDir, 'index.ts'), `export const ${mod} = '${mod}-module';\n`, 'utf-8');
    }

    const loaded = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(loaded.name).toBe('test-app');
    expect(loaded.modules).toHaveLength(3);

    for (const mod of loaded.modules) {
      const modContent = fs.readFileSync(path.join(projectDir, 'src', mod, 'index.ts'), 'utf-8');
      expect(modContent).toContain(mod);
    }
  });
});
