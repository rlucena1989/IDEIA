import { TypeScriptAdapter, createTypeScriptAdapter } from '../src/index';
import { generateEntity, scaffoldProject, generateFromSpec, writeFiles } from '../src/generator';
import type { Spec, GeneratedFile } from '../src/generator';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ts-adapter-test-'));
}

describe('TypeScriptAdapter', () => {
  let adapter: TypeScriptAdapter;

  beforeEach(() => {
    adapter = createTypeScriptAdapter();
  });

  it('has correct name and language', () => {
    expect(adapter.name).toBe('typescript');
    expect(adapter.language).toBe('typescript');
  });

  it('detects TypeScript project by tsconfig.json', () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, 'tsconfig.json'), '{}');
    expect(adapter.detect(dir)).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('detects TypeScript project by package.json dep', () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ devDependencies: { typescript: '^5.0.0' } }));
    expect(adapter.detect(dir)).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('detects TypeScript project by .ts file', () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, 'index.ts'), '');
    expect(adapter.detect(dir)).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('does not detect non-TypeScript project', () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, 'readme.md'), '# hello');
    expect(adapter.detect(dir)).toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('init scaffolds a project', async () => {
    const dir = tmpDir();
    const projectName = path.join(dir, 'my-app');
    const result = await adapter.init(projectName);
    expect(result.success).toBe(true);
    expect(result.files.length).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(projectName, 'tsconfig.json'))).toBe(true);
    expect(fs.existsSync(path.join(projectName, 'src', 'index.ts'))).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('init with generateExample creates entity', async () => {
    const dir = tmpDir();
    const projectName = path.join(dir, 'my-app');
    const result = await adapter.init(projectName, { generateExample: 'User' });
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(projectName, 'src', 'User', 'User.ts'))).toBe(true);
    expect(fs.existsSync(path.join(projectName, 'src', 'User', 'User.test.ts'))).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('generateEntity creates entity files', async () => {
    const dir = tmpDir();
    const result = await adapter.generateEntity('Product', dir);
    expect(result).toBe(dir);
    expect(fs.existsSync(path.join(dir, 'Product.ts'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'Product.test.ts'))).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('qualityGate detects missing config', async () => {
    const dir = tmpDir();
    const gate = await adapter.qualityGate(dir);
    expect(gate.passed).toBe(false);
    expect(gate.issues.length).toBeGreaterThan(0);
    expect(gate.issues).toContain('tsconfig.json not found');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('qualityGate passes for valid project', async () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, 'tsconfig.json'), '{}');
    fs.writeFileSync(path.join(dir, 'package.json'), '{}');
    fs.mkdirSync(path.join(dir, 'src'));
    const gate = await adapter.qualityGate(dir);
    expect(gate.passed).toBe(true);
    expect(gate.issues).toHaveLength(0);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('generator — scaffoldProject', () => {
  it('creates all project files', () => {
    const dir = tmpDir();
    const projectDir = path.join(dir, 'test-proj');
    const files = scaffoldProject(projectDir, 'test-proj');
    expect(files.length).toBeGreaterThanOrEqual(4);
    expect(files.some(f => f.path.endsWith('tsconfig.json'))).toBe(true);
    expect(files.some(f => f.path.endsWith('package.json'))).toBe(true);
    expect(files.some(f => f.path.endsWith('src/index.ts'))).toBe(true);
    expect(files.some(f => f.path.endsWith('src/index.test.ts'))).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('generator — generateEntity', () => {
  it('creates entity interface and service', () => {
    const dir = tmpDir();
    const entityDir = path.join(dir, 'User');
    const files = generateEntity('User', entityDir);
    expect(files).toHaveLength(2);
    const entityFile = files.find(f => f.path.endsWith('User.ts'));
    expect(entityFile).toBeDefined();
    expect(entityFile!.content).toContain('UserService');
    expect(entityFile!.content).toContain('findAll');
    expect(entityFile!.content).toContain('create');
    const testFile = files.find(f => f.path.endsWith('User.test.ts'));
    expect(testFile).toBeDefined();
    expect(testFile!.content).toContain('UserService');
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('generator — generateFromSpec', () => {
  it('generates files from spec', () => {
    const dir = tmpDir();
    const spec: Spec = {
      id: 'test-1',
      title: 'Test Project',
      requirements: [],
      design: {
        components: [{
          name: 'User',
          responsibility: 'User management',
          interfaces: [{ name: 'name', type: 'input', contract: 'string' }],
          dependencies: [],
        }],
      },
      acceptanceCriteria: [{
        id: 'AC-1',
        description: 'Create user',
        type: 'functional',
        given: 'valid data',
        when: 'create',
        then: 'user exists',
        expectedResult: 'success',
      }],
    };
    const files = generateFromSpec(spec, dir);
    expect(files.length).toBeGreaterThan(2);
    expect(files.some(f => f.path.includes('User'))).toBe(true);
    expect(files.some(f => f.path.endsWith('acceptance.test.ts'))).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('generator — writeFiles', () => {
  it('writes files to disk', () => {
    const dir = tmpDir();
    const files: GeneratedFile[] = [
      { path: path.join(dir, 'test.txt'), content: 'hello' },
    ];
    writeFiles(files);
    expect(fs.readFileSync(path.join(dir, 'test.txt'), 'utf8')).toBe('hello');
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('createTypeScriptAdapter', () => {
  it('creates adapter with config', () => {
    const a = createTypeScriptAdapter({ projectRoot: '/tmp' });
    expect(a).toBeInstanceOf(TypeScriptAdapter);
  });

  it('creates adapter without config', () => {
    const a = createTypeScriptAdapter();
    expect(a).toBeInstanceOf(TypeScriptAdapter);
  });
});
