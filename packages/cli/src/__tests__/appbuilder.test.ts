import { AVAILABLE_TEMPLATES, AVAILABLE_FEATURES, AppBlueprint, AppTemplate, AppFeature, GeneratedFile } from '../local-ai/appbuilder/types';

describe('appbuilder - types', () => {
  it('AVAILABLE_TEMPLATES deve ter templates definidos', () => {
    expect(AVAILABLE_TEMPLATES.length).toBeGreaterThan(0);
    for (const t of AVAILABLE_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
    }
  });

  it('deve conter template api', () => {
    const api = AVAILABLE_TEMPLATES.find(t => t.id === 'api');
    expect(api).toBeDefined();
    expect(api!.frameworks).toContain('express');
  });

  it('deve conter template rust-api', () => {
    const rust = AVAILABLE_TEMPLATES.find(t => t.id === 'rust-api');
    expect(rust).toBeDefined();
    expect(rust!.frameworks).toContain('axum');
  });

  it('AVAILABLE_FEATURES deve ter features definidas', () => {
    expect(AVAILABLE_FEATURES.length).toBeGreaterThan(0);
    for (const f of AVAILABLE_FEATURES) {
      expect(f.name).toBeTruthy();
      expect(f.category).toMatch(/^(auth|crud|api|storage|ui|monitoring|messaging)$/);
    }
  });

  it('deve conter feature JWT auth', () => {
    const auth = AVAILABLE_FEATURES.find(f => f.name.includes('Authentication'));
    expect(auth).toBeDefined();
    expect(auth!.category).toBe('auth');
  });
});

import { generateApp } from '../local-ai/appbuilder/generator';

describe('appbuilder - generator', () => {
  const makeBlueprint = (overrides: Partial<AppBlueprint> = {}): AppBlueprint => ({
    name: 'test-app',
    description: 'A test application',
    template: 'api',
    features: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    files: [],
    ...overrides,
  });

  it('generateApp deve gerar arquivos para template api', () => {
    const files = generateApp(makeBlueprint());
    expect(files.length).toBeGreaterThanOrEqual(4);
    const paths = files.map(f => f.path);
    expect(paths).toContain('package.json');
    expect(paths).toContain('tsconfig.json');
    expect(paths).toContain('src/index.ts');
  });

  it('generateApp deve gerar web template', () => {
    const files = generateApp(makeBlueprint({ template: 'web' }));
    expect(files.length).toBeGreaterThanOrEqual(3);
    expect(files.some(f => f.path.includes('App.tsx'))).toBe(true);
  });

  it('generateApp deve gerar cli template', () => {
    const files = generateApp(makeBlueprint({ template: 'cli' }));
    expect(files.some(f => f.path === 'src/index.ts')).toBe(true);
    expect(files.some(f => f.path === 'package.json')).toBe(true);
  });

  it('generateApp deve gerar library template', () => {
    const files = generateApp(makeBlueprint({ template: 'library' }));
    expect(files.some(f => f.path.includes('__tests__'))).toBe(true);
  });

  it('generateApp deve gerar fullstack template', () => {
    const files = generateApp(makeBlueprint({ template: 'fullstack' }));
    expect(files.some(f => f.path.includes('app/page'))).toBe(true);
  });

  it('generateApp deve incluir auth files quando feature JWT ativada', () => {
    const files = generateApp(makeBlueprint({
      features: [{ name: 'Authentication (JWT)', description: '', category: 'auth', enabled: true }],
    }));
    expect(files.some(f => f.path.includes('middleware/auth'))).toBe(true);
  });

  it('generateApp deve incluir docker quando feature ativada', () => {
    const files = generateApp(makeBlueprint({
      features: [{ name: 'Docker Support', description: '', category: 'monitoring', enabled: true }],
    }));
    expect(files.some(f => f.path === 'Dockerfile')).toBe(true);
  });

  it('generateApp para rust-api deve gerar Cargo.toml', () => {
    const files = generateApp(makeBlueprint({ template: 'rust-api' }));
    expect(files.some(f => f.path === 'Cargo.toml')).toBe(true);
    expect(files.some(f => f.path === 'src/main.rs')).toBe(true);
  });

  it('generateApp para java-api deve gerar pom.xml', () => {
    const files = generateApp(makeBlueprint({ template: 'java-api' }));
    expect(files.some(f => f.path === 'pom.xml')).toBe(true);
  });

  it('generateApp para csharp-api deve gerar .csproj', () => {
    const files = generateApp(makeBlueprint({ template: 'csharp-api' }));
    expect(files.some(f => f.path.endsWith('.csproj'))).toBe(true);
  });

  it('cada arquivo gerado deve ter path, content, language', () => {
    const files = generateApp(makeBlueprint({ template: 'fullstack' }));
    for (const f of files) {
      expect(f.path).toBeTruthy();
      expect(f.content).toBeTruthy();
      expect(f.language).toBeTruthy();
    }
  });
});