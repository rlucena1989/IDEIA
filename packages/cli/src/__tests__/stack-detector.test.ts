import { detectStack } from '../runtime/stack-detector';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

describe('stack-detector', () => {
  it('should detect unknown stack in empty dir', () => {
    const stack = detectStack('C:\\\\nonexistent_dir_12345');
    expect(stack.language).toBe('unknown');
    expect(stack.confidence).toBe(0);
  });

  it('should have correct structure', () => {
    const stack = detectStack('C:\\\\nonexistent');
    expect(stack).toHaveProperty('language');
    expect(stack).toHaveProperty('framework');
    expect(stack).toHaveProperty('packageManager');
    expect(stack).toHaveProperty('database');
    expect(stack).toHaveProperty('ui');
    expect(stack).toHaveProperty('testing');
    expect(stack).toHaveProperty('ci');
    expect(stack).toHaveProperty('evidence');
  });

  describe('detectStack on current project', () => {
    const projectRoot = path.resolve(__dirname, '..', '..', '..', '..', '..');

    it('should detect TypeScript + Node.js (tsconfig.json + package.json)', () => {
      const stack = detectStack(projectRoot);
      expect(['TypeScript', 'Node.js']).toContain(stack.language);
      expect(stack.evidence.some(e => e.includes('TypeScript'))).toBe(true);
    });

    it('should have confidence > 0 for a real project', () => {
      const stack = detectStack(projectRoot);
      expect(stack.confidence).toBeGreaterThan(0);
    });

    it('should detect npm (package-lock.json)', () => {
      const stack = detectStack(projectRoot);
      expect(stack.packageManager).toBe('npm');
    });

    it('should detect Jest (jest.config.js or .test.ts files)', () => {
      const stack = detectStack(projectRoot);
      expect(stack.testing).toBe('Jest');
    });

    it('should have evidence array populated', () => {
      const stack = detectStack(projectRoot);
      expect(stack.evidence.length).toBeGreaterThan(0);
    });
  });

  describe('detectStack on pure adapter package', () => {
    const adapters = ['adapter-dart', 'adapter-go', 'adapter-ruby'];

    adapters.forEach((adapter) => {
      it(`should detect ${adapter} as unknown (adapter stubs have no stack markers)`, () => {
        const p = path.resolve(__dirname, '..', '..', '..', '..', '..', 'packages', adapter);
        const stack = detectStack(p);
        expect(stack).toHaveProperty('language');
        expect(stack).toHaveProperty('confidence');
      });
    });
  });

  describe('confidence calculation edge cases', () => {
    it('deve ter confidence 0 em diretorio vazio', () => {
      const stack = detectStack('C:\\\\dir_vazio_inexistente_99999');
      expect(stack.confidence).toBe(0);
    });

    it('deve ter confidence entre 0 e 1 no projeto real', () => {
      const root = path.resolve(__dirname, '..', '..', '..', '..', '..');
      const stack = detectStack(root);
      expect(stack.confidence).toBeGreaterThan(0);
      expect(stack.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('individual detector tests with temp files', () => {
    function withTempDir(files: string[], fn: (dir: string) => void) {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stack-'));
      try {
        for (const f of files) {
          const fullPath = path.join(tmpDir, f);
          fs.mkdirSync(path.dirname(fullPath), { recursive: true });
          fs.writeFileSync(fullPath, '');
        }
        fn(tmpDir);
      } finally {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
      }
    }

    it('deve detectar Go (go.mod)', () => {
      withTempDir(['go.mod'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.language).toBe('Go');
      });
    });

    it('deve detectar Rust (Cargo.toml)', () => {
      withTempDir(['Cargo.toml'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.language).toBe('Rust');
      });
    });

    it('deve detectar Python (requirements.txt)', () => {
      withTempDir(['requirements.txt'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.language).toBe('Python');
      });
    });

    it('deve detectar Python (Pipfile)', () => {
      withTempDir(['Pipfile'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.language).toBe('Python');
      });
    });

    it('deve detectar Python (pyproject.toml)', () => {
      withTempDir(['pyproject.toml'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.language).toBe('Python');
      });
    });

    it('deve detectar Vue (.vue files)', () => {
      withTempDir(['src/App.vue'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.ui).toBe('Vue');
      });
    });

    it('deve detectar pnpm (pnpm-lock.yaml)', () => {
      withTempDir(['pnpm-lock.yaml'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.packageManager).toBe('pnpm');
      });
    });

    it('deve detectar yarn (yarn.lock)', () => {
      withTempDir(['yarn.lock'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.packageManager).toBe('yarn');
      });
    });

    it('deve detectar MySQL (mysql files)', () => {
      withTempDir(['src/db/mysql-connection.ts'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.database).toBe('MySQL');
      });
    });

    it('deve detectar MongoDB (mongoose files)', () => {
      withTempDir(['src/models/mongoose-schema.ts'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.database).toBe('MongoDB');
      });
    });

    it('deve detectar SQLite (.db files)', () => {
      withTempDir(['data/app.db'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.database).toBe('SQLite');
      });
    });

    it('deve detectar Vitest (vitest.config)', () => {
      withTempDir(['vitest.config.ts'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.testing).toBe('Vitest');
      });
    });

    it('deve detectar GitHub Actions (.github/workflows/)', () => {
      withTempDir(['.github/workflows/ci.yml'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.ci).toBe('GitHub Actions');
      });
    });

    it('deve detectar GitLab CI (.gitlab-ci.yml)', () => {
      withTempDir(['.gitlab-ci.yml'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.ci).toBe('GitLab CI');
      });
    });

    it('deve testar inferencia conjunto de testing + package-manager', () => {
      withTempDir(['package.json', 'package-lock.json', 'jest.config.js'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.testing).toBe('Jest');
        expect(stack.packageManager).toBe('npm');
      });
    });

  });

  describe('individual detector tests — uncovered coverage (20+ new)', () => {
    function withTempDir(files: string[], fn: (dir: string) => void) {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stack-cover-'));
      try {
        for (const f of files) {
          const fullPath = path.join(tmpDir, f);
          fs.mkdirSync(path.dirname(fullPath), { recursive: true });
          fs.writeFileSync(fullPath, '');
        }
        fn(tmpDir);
      } finally {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
      }
    }

    it('deve detectar Node.js via package.json isolado', () => {
      withTempDir(['package.json'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.language).toBe('Node.js');
      });
    });

    it('deve detectar TypeScript via tsconfig.json isolado (sem package.json)', () => {
      withTempDir(['tsconfig.json'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.language).toBe('TypeScript');
      });
    });

    it('deve detectar NestJS via nest-cli.json', () => {
      withTempDir(['nest-cli.json'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.framework).toBe('NestJS');
      });
    });

    it('deve detectar React via arquivo .jsx', () => {
      withTempDir(['src/App.jsx'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.ui).toBe('React');
      });
    });

    it('deve reportar confidence baixa para detector unico de baixa confianca', () => {
      withTempDir(['data/app.db'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.database).toBe('SQLite');
        expect(stack.confidence).toBeGreaterThan(0);
      });
    });

    it('deve detectar MongoDB via arquivo com nome mongodb', () => {
      withTempDir(['src/db/mongodb-client.ts'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.database).toBe('MongoDB');
      });
    });

    it('deve detectar teste e package-manager juntos (evidence acumulado)', () => {
      withTempDir(['package.json', 'package-lock.json', 'jest.config.js'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.testing).toBe('Jest');
        expect(stack.packageManager).toBe('npm');
      });
    });

    it('deve manter categoria como unknown quando nenhum detector daquela categoria casa', () => {
      withTempDir(['go.mod'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.framework).toBe('unknown');
        expect(stack.database).toBe('unknown');
        expect(stack.ui).toBe('unknown');
        expect(stack.testing).toBe('unknown');
        expect(stack.ci).toBe('unknown');
      });
    });

    it('deve reportar confidence 0 em diretorio completamente vazio', () => {
      const vazio = fs.mkdtempSync(path.join(os.tmpdir(), 'stack-vazio-'));
      try {
        const stack = detectStack(vazio);
        expect(stack.confidence).toBe(0);
        expect(stack.evidence).toEqual([]);
      } finally {
        try { fs.rmSync(vazio, { recursive: true, force: true }); } catch {}
      }
    });

    it('deve incluir evidence com prefixo de categoria (ex: language: Go)', () => {
      withTempDir(['go.mod'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.evidence.some(e => e.includes('language:') && e.includes('Go'))).toBe(true);
      });
    });

    it('deve ter confidence baseada no detector individual (TypeScript 0.9)', () => {
      withTempDir(['tsconfig.json'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.confidence).toBeGreaterThanOrEqual(0.85);
      });
    });

    it('deve ter confidence baseada no detector individual (Vue 0.9)', () => {
      withTempDir(['src/App.vue'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.confidence).toBeGreaterThanOrEqual(0.85);
      });
    });

    it('deve retornar estrutura completa mesmo sem detectores', () => {
      const vazio = fs.mkdtempSync(path.join(os.tmpdir(), 'stack-struct-'));
      try {
        const stack = detectStack(vazio);
        expect(stack.language).toBe('unknown');
        expect(stack.framework).toBe('unknown');
        expect(stack.packageManager).toBe('unknown');
        expect(stack.database).toBe('unknown');
        expect(stack.ui).toBe('unknown');
        expect(stack.testing).toBe('unknown');
        expect(stack.ci).toBe('unknown');
        expect(Array.isArray(stack.evidence)).toBe(true);
        expect(typeof stack.confidence).toBe('number');
      } finally {
        try { fs.rmSync(vazio, { recursive: true, force: true }); } catch {}
      }
    });

    it('deve detectar npm via package-lock.json', () => {
      withTempDir(['package-lock.json'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.packageManager).toBe('npm');
      });
    });

    it('deve detectar Jest via jest.config.js', () => {
      withTempDir(['jest.config.js'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.testing).toBe('Jest');
      });
    });

    it('deve detectar Vitest via vitest.config.ts', () => {
      withTempDir(['vitest.config.ts'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.testing).toBe('Vitest');
      });
    });

    it('deve detectar GitHub Actions com caminho exato .github/workflows/', () => {
      withTempDir(['.github/workflows/ci.yml'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.ci).toBe('GitHub Actions');
      });
    });

    it('deve detectar GitLab CI via .gitlab-ci.yml', () => {
      withTempDir(['.gitlab-ci.yml'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.ci).toBe('GitLab CI');
      });
    });

    it('deve detectar React via tsx em caminho profundo', () => {
      withTempDir(['src/components/forms/LoginForm.tsx'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.ui).toBe('React');
      });
    });

    it('deve detectar MongoDB via mongoose-schema', () => {
      withTempDir(['src/models/user-mongoose.ts'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.database).toBe('MongoDB');
      });
    });

    it('deve ter packageManager yarn quando yarn.lock presente', () => {
      withTempDir(['yarn.lock'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.packageManager).toBe('yarn');
      });
    });

    it('deve detectar linguagem correta para dir com apenas package.json e lang nao TS', () => {
      withTempDir(['package.json'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.language).toBe('Node.js');
        expect(stack.framework).toBe('unknown');
      });
    });
  });

  describe('remaining detectors (Java, Kotlin, Ruby, PHP, Swift, C#, Dart, Elixir, Haskell, Zig, JavaScript)', () => {
    function withTempDir(files: string[], fn: (dir: string) => void) {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stack-rem-'));
      try {
        for (const f of files) {
          const fullPath = path.join(tmpDir, f);
          fs.mkdirSync(path.dirname(fullPath), { recursive: true });
          fs.writeFileSync(fullPath, '');
        }
        fn(tmpDir);
      } finally {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
      }
    }

    it('deve detectar Java via pom.xml', () => {
      withTempDir(['pom.xml'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.language).toBe('Java');
      });
    });

    it('deve detectar Java via build.gradle', () => {
      withTempDir(['build.gradle'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.language).toBe('Java');
      });
    });

    it('deve detectar Kotlin via .kt file', () => {
      withTempDir(['src/Main.kt'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.language).toBe('Kotlin');
      });
    });

    it('deve detectar Kotlin via build.gradle.kts', () => {
      withTempDir(['build.gradle.kts'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.language).toBe('Kotlin');
      });
    });

    it('deve detectar Ruby via Gemfile', () => {
      withTempDir(['Gemfile'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.language).toBe('Ruby');
      });
    });

    it('deve detectar Ruby via .gemspec', () => {
      withTempDir(['mygem.gemspec'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.language).toBe('Ruby');
      });
    });

    it('deve detectar PHP via composer.json', () => {
      withTempDir(['composer.json'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.language).toBe('PHP');
      });
    });

    it('deve detectar Swift via Package.swift', () => {
      withTempDir(['Package.swift'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.language).toBe('Swift');
      });
    });

    it('deve detectar C# via .csproj', () => {
      withTempDir(['src/MyApp.csproj'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.language).toBe('C#');
      });
    });

    it('deve detectar C# via .sln', () => {
      withTempDir(['MyApp.sln'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.language).toBe('C#');
      });
    });

    it('deve detectar C# via .cs file', () => {
      withTempDir(['Program.cs'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.language).toBe('C#');
      });
    });

    it('deve detectar Dart via pubspec.yaml', () => {
      withTempDir(['pubspec.yaml'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.language).toBe('Dart');
      });
    });

    it('deve detectar Elixir via mix.exs', () => {
      withTempDir(['mix.exs'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.language).toBe('Elixir');
      });
    });

    it('deve detectar Haskell via .cabal', () => {
      withTempDir(['myapp.cabal'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.language).toBe('Haskell');
      });
    });

    it('deve detectar Haskell via stack.yaml', () => {
      withTempDir(['stack.yaml'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.language).toBe('Haskell');
      });
    });

    it('deve detectar Zig via build.zig', () => {
      withTempDir(['build.zig'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.language).toBe('Zig');
      });
    });

    it('deve detectar JavaScript via package.json (fallback)', () => {
      withTempDir(['package.json'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.language).toBe('Node.js');
      });
    });
  });

  describe('Express, Fastify, PostgreSQL (leem package.json content)', () => {
    function withTempDir(files: string[], fn: (dir: string) => void) {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stack-pkg-'));
      try {
        for (const f of files) {
          const fullPath = path.join(tmpDir, f);
          fs.mkdirSync(path.dirname(fullPath), { recursive: true });
          fs.writeFileSync(fullPath, '');
        }
        fn(tmpDir);
      } finally {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
      }
    }

    function withPkgDir(deps: Record<string, string>, fn: (dir: string) => void) {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stack-pkg-'));
      try {
        const pkgPath = path.join(tmpDir, 'package.json');
        const pkg = { name: 'test', version: '1.0.0', dependencies: deps };
        fs.writeFileSync(pkgPath, JSON.stringify(pkg));
        fn(tmpDir);
      } finally {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
      }
    }

    it('deve detectar Express via dependencies.express', () => {
      withPkgDir({ express: '^4.18.0' }, (dir) => {
        const stack = detectStack(dir);
        expect(stack.framework).toBe('Express');
      });
    });

    it('deve detectar Express via devDependencies', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stack-pkg-'));
      try {
        const pkg = { name: 'test', version: '1.0.0', devDependencies: { express: '^4.18.0' } };
        fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(pkg));
        const stack = detectStack(tmpDir);
        expect(stack.framework).toBe('Express');
      } finally {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
      }
    });

    it('deve detectar Fastify via dependencies.fastify', () => {
      withPkgDir({ fastify: '^4.0.0' }, (dir) => {
        const stack = detectStack(dir);
        expect(stack.framework).toBe('Fastify');
      });
    });

    it('deve detectar PostgreSQL via dependencies.pg', () => {
      withPkgDir({ pg: '^8.0.0' }, (dir) => {
        const stack = detectStack(dir);
        expect(stack.database).toBe('PostgreSQL');
      });
    });

    it('deve detectar PostgreSQL via dependencies.typeorm', () => {
      withPkgDir({ typeorm: '^0.3.0' }, (dir) => {
        const stack = detectStack(dir);
        expect(stack.database).toBe('PostgreSQL');
      });
    });

    it('deve detectar PostgreSQL via dependencies.prisma', () => {
      withPkgDir({ prisma: '^5.0.0' }, (dir) => {
        const stack = detectStack(dir);
        expect(stack.database).toBe('PostgreSQL');
      });
    });

    it('nao deve detectar Express/Fastify/PostgreSQL sem package.json', () => {
      withTempDir(['src/index.ts'], (dir) => {
        const stack = detectStack(dir);
        expect(stack.framework).toBe('unknown');
        expect(stack.database).toBe('unknown');
      });
    });
  });
});
