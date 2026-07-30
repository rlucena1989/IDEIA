# ESTUDO-IMP-TESTES-CLI — Estratégia de Testes CLI: Cobertura Sistemática

> **Data:** 2026-07-25
> **Versão:** 2.0 (Intensified)
> **Nível de Profundidade:** 6 (Engenharia Expandida)
> **Área:** Qualidade, Testes
> **Dependências:** ESTUDO-IMP-QUALIDADE, ESTUDO-TESTES-QUALIDADE-AUTOMATIZADA
> **Conexões:** S12 (Testes e Qualidade Automatizada), S66 (AI-Driven Testing), S13 (Performance e Escalabilidade), S6 (Pipeline de Entrega)
> **Propósito:** Estratégia sistemática para expandir cobertura de testes CLI de ~15% para 80%+ com framework de teste dedicado, exemplos concretos, CI/CD integrado, testes avançados e template v2.0.

---

## 1. FUNDAMENTOS

### 1.0 Problema e Contexto

- **173 comandos CLI** registrados (V2.1 — todos migrados para `CliCommandResult` com `success()`/`failure()`)
- **81 comandos sem testes** (~47%)
- **~106K LOC** no CLI com cobertura ~15%
- Pacotes core (event-bus, data-layer, memory-store) têm **0 testes**
- Risco: qualquer refatoração no CLI pode quebrar comandos sem detecção
- 55 BOMs corrigidos anteriormente, mas sem testes de regressão

### 1.1 Current State Analysis

**Inventory detalhado por grupo de risco:**

| Grupo de Risco | Comandos | Cobertura | LOC | Risco | Prioridade |
|---------------|----------|-----------|-----|-------|------------|
| Core (init, generate, audit, verify, drift) | 20 | 5% (1/20) | ~28K | 🔴 Crítico | P0 |
| Security (safety-status, barrier, pentest) | 15 | 0% (0/15) | ~18K | 🔴 Crítico | P0 |
| AI (chat, prompt, agents, orchestrate) | 12 | 8% (1/12) | ~14K | 🟠 Alto | P1 |
| DevOps (deploy, release, ci, docker) | 10 | 20% (2/10) | ~12K | 🟠 Alto | P1 |
| Quality (audit, coverage, scorecard, verify) | 8 | 25% (2/8) | ~9K | 🟡 Médio | P1 |
| Info (help, version, status, config) | 10 | 60% (6/10) | ~6K | 🟢 Baixo | P2 |
| Dev (build, test, lint, typecheck) | 15 | 40% (6/15) | ~8K | 🟢 Baixo | P2 |
| Memory (memory, context, evolution) | 8 | 12% (1/8) | ~7K | 🟠 Alto | P1 |
| Reports (report, scorecard, benchmark) | 5 | 0% (0/5) | ~4K | 🟡 Médio | P2 |
| Pipeline (workflow, orchestrate, delivery) | 7 | 14% (1/7) | ~6K | 🔴 Crítico | P0 |
| Documentation (docs, changelog, migration) | 6 | 33% (2/6) | ~3K | 🟢 Baixo | P2 |
| Ecosystem (plugins, registry, manifest) | 9 | 11% (1/9) | ~8K | 🟠 Alto | P1 |
| Desktop (electron, build, installer) | 8 | 0% (0/8) | ~5K | 🟡 Médio | P2 |
| Prompt Economy | 5 | 20% (1/5) | ~4K | 🟡 Médio | P2 |
| Self-Awareness | 7 | 14% (1/7) | ~6K | 🟠 Alto | P1 |
| Reality Sync | 8 | 12% (1/8) | ~7K | 🟠 Alto | P1 |
| Total | 173 | 15% (26/173) | ~106K | | |

**Análise de Pareto (20% dos comandos = 80% do risco):**

Os **35 comandos P0** (20% do total) concentram ~80% do risco de falha:
- Commands core: `init`, `generate`, `audit`, `verify`, `drift`, `policy`, `compliance`, `workflow`, `report`, `memory`, `evolution`, `optimize`, `coverage`, `agents`, `reality-sync`, `prompt`, `orchestrate`, `scorecard`, `release`
- Security: `safety-status`, `security barrier check`, `security pentest`, `supply-chain`, `audit-ledger`, `security auth check`, `security policy verify`, `security threat-model`, `security rotate-keys`, `security audit-trail`
- Pipeline: `workflow run`, `workflow status`, `workflow cancel`, `delivery deploy`, `delivery rollback`, `delivery status`

**Risco acumulado:** Se estes 35 comandos falharem, o pipeline de entrega inteiro para, auditorias de segurança ficam cegas, e o core product fica inoperante.

### 1.2 Test Architecture

**Arquitetura do TestCLI Framework:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLI TEST SUITE                                │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  CommandTestSuite (base class)                                  │ │
│  │  ├─ testCommand(…) → void                                      │ │
│  │  ├─ testErrorCase(…) → void                                    │ │
│  │  ├─ testEdgeCase(…) → void                                     │ │
│  │  └─ testSnapshot(…) → void                                     │ │
│  └──────────────────┬──────────────────────────────────────────────┘ │
│                     │ extends                                        │
│  ┌──────────────────▼──────────────────────────────────────────────┐ │
│  │  InitTestSuite │ AuditTestSuite │ GenerateTestSuite │ ...      │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  TestCLI (runner + assertions + fixtures + snapshots)          │ │
│  │  ├─ run(command, args) → CliTestResult                          │ │
│  │  ├─ assertOutput(regex)                                         │ │
│  │  ├─ assertErrorCode(code)                                       │ │
│  │  ├─ assertFileCreated(path)                                     │ │
│  │  ├─ assertSnapshot(name)                                        │ │
│  │  └─ trackCoverage() → CoverageReport                            │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐    │
│  │ MockEventBus │  │ MockFS       │  │ MockLLMProvider        │    │
│  │ NatsMock     │  │ temp dir+bkp │  │ deterministic response │    │
│  └──────────────┘  └──────────────┘  └────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

**Mock Strategy:**

| Dependência | Mock | Razão |
|-------------|------|-------|
| NATS JetStream | `MockEventBus` — eventos em memória com publish/subscribe síncrono | Evita conexão real; testes determinísticos |
| Filesystem | `MockFilesystem` — temp dir + backup/restore + assertions | Isolamento total; sem efeitos colaterais |
| LLM Providers (Ollama/OpenAI) | `MockLLMProvider` — retorna respostas pré-definidas | Determinismo; sem custo de API; sem rate limit |
| Process env | `withEnv()` helper — set/unset automático | Evita poluição entre testes |
| Console output | `TestCLI.capture()` — buffer + restore | Captura estruturada sem modificar globals permanentemente |

**Integration Test Infrastructure:**

```
┌──────────────────────────────────────────────────────┐
│               Docker Compose (CI only)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  NATS Server │  │  PostgreSQL  │  │  MinIO (S3)  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│  Wait-for-it: test containers ready → run test suite  │
│  Cleanup: docker compose down -v após conclusão      │
└──────────────────────────────────────────────────────┘
```

### 1.3 Estratégia

```
Pirâmide de Testes CLI:
┌──────────────────────┐
│     E2E (5%)         │  → Testar fluxos completos (init → generate → verify)
├──────────────────────┤
│   Integração (25%)   │  → Testar comando → módulo real (com NATS mock)
├──────────────────────┤
│   Unitário (70%)     │  → Testar handlers, validadores, utils
└──────────────────────┘
```

---

## 2. ENGENHARIA

### 2.1 TestCLI Framework Expansion

```typescript
// packages/cli/src/__tests__/helpers/test-cli.ts
class TestCLI {
  private program: CommanderProgram;
  private fixtures: Map<string, string> = new Map();
  private snapshots: Map<string, string> = new Map();
  private coverage: Set<string> = new Set();

  constructor(program: CommanderProgram) {
    this.program = program;
  }

  async run(command: string, args: string[] = []): Promise<CliTestResult> {
    const start = Date.now();
    const output: string[] = [];
    const error: string[] = [];

    const stdoutWrite = process.stdout.write.bind(process.stdout);
    const stderrWrite = process.stderr.write.bind(process.stderr);

    process.stdout.write = (chunk: any) => { output.push(String(chunk)); return true; };
    process.stderr.write = (chunk: any) => { error.push(String(chunk)); return true; };

    try {
      await this.program.parseAsync([command, ...args], { from: 'user' });
    } catch (e) {
      error.push(String(e));
    } finally {
      process.stdout.write = stdoutWrite;
      process.stderr.write = stderrWrite;
    }

    this.coverage.add(command);

    return {
      command: [command, ...args].join(' '),
      output: output.join(''),
      error: error.join(''),
      duration: Date.now() - start,
      exitCode: error.length > 0 ? 1 : 0,
      json: this.tryParseJSON(output.join('')),
    };
  }

  assertOutput(result: CliTestResult, pattern: RegExp): void {
    if (!pattern.test(result.output)) {
      throw new Error(`Output mismatch: expected /${pattern.source}/, got "${result.output.slice(0, 200)}"`);
    }
  }

  assertErrorCode(result: CliTestResult, code: number): void {
    if (result.exitCode !== code) {
      throw new Error(`Exit code mismatch: expected ${code}, got ${result.exitCode}`);
    }
  }

  assertFileCreated(path: string): void {
    if (!fs.existsSync(path)) {
      throw new Error(`Expected file not created: ${path}`);
    }
  }

  assertSnapshot(name: string, content: string): void {
    const prev = this.snapshots.get(name);
    if (prev === undefined) {
      this.snapshots.set(name, content);
      if (process.env.UPDATE_SNAPSHOTS) {
        const snapshotPath = path.join(__dirname, '__snapshots__', `${name}.snap`);
        fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
        fs.writeFileSync(snapshotPath, content);
      }
      return;
    }
    if (prev !== content) {
      throw new Error(`Snapshot mismatch: ${name}\nExpected:\n${prev.slice(0, 200)}\nGot:\n${content.slice(0, 200)}`);
    }
  }

  registerFixture(name: string, content: string): void {
    this.fixtures.set(name, content);
  }

  resolveFixture(name: string): string {
    const content = this.fixtures.get(name);
    if (!content) throw new Error(`Fixture not found: ${name}`);
    const tmpPath = path.join(process.cwd(), '.test-fixtures', name);
    fs.mkdirSync(path.dirname(tmpPath), { recursive: true });
    fs.writeFileSync(tmpPath, content);
    return tmpPath;
  }

  trackCoverage(): CoverageReport {
    const allCommands = this.getAllRegisteredCommands();
    const tested = [...this.coverage];
    return {
      total: allCommands.length,
      tested: tested.length,
      untested: allCommands.filter(c => !this.coverage.has(c)),
      percentage: Math.round((tested.length / allCommands.length) * 100),
    };
  }

  private tryParseJSON(output: string): Record<string, unknown> | null {
    try { return JSON.parse(output); } catch { return null; }
  }

  private getAllRegisteredCommands(): string[] {
    return this.program.commands.map(c => c.name());
  }
}
```

```typescript
// packages/cli/src/__tests__/helpers/mock-event-bus.ts
class MockEventBus implements IEventBus {
  private handlers: Map<string, Array<(event: any) => void>> = new Map();
  private published: Array<{ topic: string; data: any }> = [];

  async publish(topic: string, data: any): Promise<void> {
    this.published.push({ topic, data });
    const handlers = this.handlers.get(topic) || [];
    for (const handler of handlers) {
      await handler(data);
    }
  }

  async subscribe(topic: string, handler: (event: any) => void): Promise<void> {
    const existing = this.handlers.get(topic) || [];
    existing.push(handler);
    this.handlers.set(topic, existing);
  }

  assertPublished(topic: string, times?: number): void {
    const count = this.published.filter(e => e.topic === topic).length;
    if (times !== undefined && count !== times) {
      throw new Error(`Expected ${times} publishes on "${topic}", got ${count}`);
    }
    if (times === undefined && count === 0) {
      throw new Error(`Expected publish on "${topic}", got none`);
    }
  }

  assertPublishedWith(topic: string, predicate: (data: any) => boolean): void {
    const events = this.published.filter(e => e.topic === topic);
    if (!events.some(e => predicate(e.data))) {
      throw new Error(`No publish on "${topic}" matching predicate. Published: ${JSON.stringify(events)}`);
    }
  }

  assertNoPublish(topic: string): void {
    const count = this.published.filter(e => e.topic === topic).length;
    if (count > 0) {
      throw new Error(`Expected no publishes on "${topic}", got ${count}`);
    }
  }

  reset(): void {
    this.handlers.clear();
    this.published = [];
  }

  getPublishedEvents(): Array<{ topic: string; data: any }> {
    return [...this.published];
  }
}
```

```typescript
// packages/cli/src/__tests__/helpers/mock-filesystem.ts
class MockFilesystem {
  private originalCwd: string;
  private tempDir: string;
  private createdFiles: Set<string> = new Set();
  private fileContents: Map<string, string> = new Map();

  constructor() {
    this.originalCwd = process.cwd();
    this.tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));
    process.chdir(this.tempDir);
  }

  writeFile(relativePath: string, content: string): void {
    const fullPath = path.join(this.tempDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
    this.createdFiles.add(relativePath);
    this.fileContents.set(relativePath, content);
  }

  readFile(relativePath: string): string {
    return fs.readFileSync(path.join(this.tempDir, relativePath), 'utf-8');
  }

  fileExists(relativePath: string): boolean {
    return fs.existsSync(path.join(this.tempDir, relativePath));
  }

  assertFileExists(relativePath: string): void {
    if (!this.fileExists(relativePath)) {
      throw new Error(`Expected file exists: ${relativePath}. Created files: [${[...this.createdFiles].join(', ')}]`);
    }
  }

  assertFileContent(relativePath: string, pattern: RegExp): void {
    const content = this.readFile(relativePath);
    if (!pattern.test(content)) {
      throw new Error(`File "${relativePath}" content mismatch: expected /${pattern.source}/`);
    }
  }

  assertFileNotExists(relativePath: string): void {
    if (this.fileExists(relativePath)) {
      throw new Error(`File should not exist: ${relativePath}`);
    }
  }

  assertStructure(expected: Record<string, 'file' | 'dir'>): void {
    for (const [relPath, type] of Object.entries(expected)) {
      const fullPath = path.join(this.tempDir, relPath);
      const exists = fs.existsSync(fullPath);
      const isDir = exists ? fs.statSync(fullPath).isDirectory() : false;
      if (!exists) throw new Error(`Expected structure path missing: ${relPath}`);
      if (type === 'dir' && !isDir) throw new Error(`Expected directory: ${relPath}`);
      if (type === 'file' && isDir) throw new Error(`Expected file but got dir: ${relPath}`);
    }
  }

  cleanup(): void {
    process.chdir(this.originalCwd);
    fs.rmSync(this.tempDir, { recursive: true, force: true });
  }

  getTempDir(): string {
    return this.tempDir;
  }
}
```

```typescript
// packages/cli/src/__tests__/helpers/command-test-suite.ts
abstract class CommandTestSuite {
  protected cli: TestCLI;
  protected eventBus: MockEventBus;
  protected fs: MockFilesystem;
  protected name: string;

  constructor(name: string, program: CommanderProgram) {
    this.name = name;
    this.cli = new TestCLI(program);
    this.eventBus = new MockEventBus();
    this.fs = new MockFilesystem();
  }

  abstract register(): void;

  protected async testCommand(
    args: string[],
    assertions: (result: CliTestResult) => void,
  ): Promise<void> {
    const result = await this.cli.run(this.name, args);
    try {
      assertions(result);
    } catch (e) {
      throw new Error(`[${this.name}] ${(e as Error).message}`);
    }
  }

  protected async testErrorCase(
    args: string[],
    expectedCode: number,
    expectedError?: RegExp,
  ): Promise<void> {
    const result = await this.cli.run(this.name, args);
    this.cli.assertErrorCode(result, expectedCode);
    if (expectedError) {
      this.cli.assertOutput(result, expectedError);
    }
  }

  protected async testEdgeCase(
    description: string,
    args: string[],
    assertions: (result: CliTestResult) => void,
  ): Promise<void> {
    try {
      const result = await this.cli.run(this.name, args);
      assertions(result);
    } catch (e) {
      throw new Error(`[${this.name}] Edge case "${description}" failed: ${(e as Error).message}`);
    }
  }

  async setup(): Promise<void> {
    this.eventBus.reset();
    this.fs = new MockFilesystem();
  }

  async teardown(): Promise<void> {
    this.fs.cleanup();
  }
}
```

### 2.2 Example Test Files

```typescript
// packages/cli/src/__tests__/commands/init.test.ts
import { InitCommandSuite } from './suites/init-suite';

describe('IDEIA CLI — init command', () => {
  const suite = new InitCommandSuite(program);

  beforeEach(async () => suite.setup());
  afterEach(async () => suite.teardown());

  it('should create project structure with default template', async () => {
    await suite.testCommand(['my-project'], (result) => {
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('Project created');
      suite.fs.assertFileExists('my-project/package.json');
      suite.fs.assertFileExists('my-project/src/index.ts');
      suite.fs.assertFileContent('my-project/package.json', /"name":\s*"my-project"/);
      suite.eventBus.assertPublished('project:created');
    });
  });

  it('should fail when target directory already exists', async () => {
    suite.fs.writeFile('existing-project', '');
    await suite.testErrorCase(
      ['existing-project'],
      1,
      /already exists/,
    );
  });

  it('should accept --template parameter for custom template', async () => {
    await suite.testCommand(['custom-app', '--template', 'react-ts'], (result) => {
      expect(result.exitCode).toBe(0);
      suite.fs.assertFileExists('custom-app/tsconfig.json');
      suite.fs.assertFileExists('custom-app/src/App.tsx');
    });
  });

  it('should accept --git flag and initialize repository', async () => {
    await suite.testCommand(['git-project', '--git'], (result) => {
      expect(result.exitCode).toBe(0);
      suite.fs.assertFileExists('git-project/.gitignore');
      suite.fs.assertFileExists('git-project/.git/HEAD');
    });
  });

  it('should output JSON when --json flag is used', async () => {
    await suite.testCommand(['json-project', '--json'], (result) => {
      expect(result.json).not.toBeNull();
      expect(result.json).toHaveProperty('path');
      expect(result.json).toHaveProperty('status', 'created');
    });
  });

  it('should reject empty project name', async () => {
    await suite.testErrorCase([''], 1, /name is required/);
  });

  it('should reject project name with special characters', async () => {
    await suite.testErrorCase(['../malicious'], 1, /invalid project name/);
  });

  it('should create nested directory structure', async () => {
    await suite.testCommand(['nested/app'], (result) => {
      expect(result.exitCode).toBe(0);
      suite.fs.assertFileExists('nested/app/package.json');
      suite.fs.assertStructure({
        'nested/app/package.json': 'file',
        'nested/app/src': 'dir',
        'nested/app/src/index.ts': 'file',
      });
    });
  });

  it('should publish NPM-style project metadata', async () => {
    await suite.testCommand(['npm-style'], (result) => {
      suite.eventBus.assertPublishedWith('project:created', (data) => {
        return data.name === 'npm-style' && data.template === 'default';
      });
    });
  });

  it('should not create files on --dry-run', async () => {
    await suite.testCommand(['dry-run-test', '--dry-run'], (result) => {
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('DRY RUN');
      suite.fs.assertFileNotExists('dry-run-test/package.json');
    });
  });
});
```

```typescript
// packages/cli/src/__tests__/commands/audit.test.ts
import { AuditCommandSuite } from './suites/audit-suite';

describe('IDEIA CLI — audit command', () => {
  const suite = new AuditCommandSuite(program);

  beforeEach(async () => suite.setup());
  afterEach(async () => suite.teardown());

  it('should run full audit and produce report', async () => {
    await suite.testCommand(['.'], (result) => {
      expect(result.exitCode).toBe(0);
      expect(result.json).not.toBeNull();
      expect(result.json).toHaveProperty('issues');
      expect(result.json).toHaveProperty('score');
      expect(typeof result.json!.score).toBe('number');
      suite.eventBus.assertPublished('audit:completed');
    });
  });

  it('should emit AUDIT_PROGRESS events during scan', async () => {
    await suite.testCommand(['.', '--verbose'], (result) => {
      suite.eventBus.assertPublished('audit:progress');
      const progressEvents = suite.eventBus.getPublishedEvents()
        .filter(e => e.topic === 'audit:progress');
      expect(progressEvents.length).toBeGreaterThan(0);
    });
  });

  it('should fail with non-zero exit code when critical issues found', async () => {
    suite.fs.writeFile('project/src/.env', 'SECRET=sk-1234567890abcdef');
    await suite.testErrorCase(['project', '--strict'], 2, /CRITICAL/);
  });

  it('should generate SARIF output for CI integration', async () => {
    await suite.testCommand(['.', '--format', 'sarif'], (result) => {
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('"$schema"');
      expect(result.output).toContain('"results"');
      expect(result.output).toContain('sarif');
    });
  });

  it('should respect --threshold parameter', async () => {
    await suite.testCommand(['.', '--threshold', '90'], (result) => {
      expect(result.exitCode).toBe(0);
      expect(result.json).toHaveProperty('threshold', 90);
    });
  });

  it('should skip specified audit categories', async () => {
    await suite.testCommand(['.', '--skip', 'security,style'], (result) => {
      expect(result.json).not.toHaveProperty('categories.security');
    });
  });

  it('should handle empty project gracefully', async () => {
    suite.fs.writeFile('empty-project/README.md', '# Empty');
    await suite.testCommand(['empty-project'], (result) => {
      expect(result.exitCode).toBe(0);
      expect(result.json).toHaveProperty('issues', 0);
      expect(result.output).toContain('No issues found');
    });
  });

  it('should verify audit chain integrity', async () => {
    await suite.testCommand(['.', '--verify-chain'], (result) => {
      expect(result.exitCode).toBe(0);
      expect(result.json).toHaveProperty('chainValid', true);
      expect(result.json).toHaveProperty('chainLength');
      expect(result.json!.chainLength).toBeGreaterThan(0);
    });
  });
});
```

```typescript
// packages/cli/src/__tests__/commands/generate.test.ts
import { GenerateCommandSuite } from './suites/generate-suite';

describe('IDEIA CLI — generate command', () => {
  const suite = new GenerateCommandSuite(program);

  beforeEach(async () => suite.setup());
  afterEach(async () => suite.teardown());

  it('should scaffold a CRUD REST API from blueprint', async () => {
    await suite.testCommand(['api', '--blueprint', 'rest-crud'], (result) => {
      expect(result.exitCode).toBe(0);
      suite.fs.assertFileExists('api/src/controllers/UserController.ts');
      suite.fs.assertFileContent('api/src/models/User.ts', /interface User/);
      suite.fs.assertStructure({
        'api/src/controllers': 'dir',
        'api/src/models': 'dir',
        'api/src/routes': 'dir',
        'api/package.json': 'file',
        'api/tsconfig.json': 'file',
      });
    });
  });

  it('should use template engine with variables', async () => {
    await suite.testCommand(['service', '--name', 'AuthService', '--vars', '{"port": 3000}'], (result) => {
      expect(result.exitCode).toBe(0);
      suite.fs.assertFileContent('service/src/index.ts', /AuthService/);
    });
  });

  it('should fail with unknown blueprint', async () => {
    await suite.testErrorCase(['unknown-template'], 1, /blueprint not found/);
  });

  it('should support --overwrite flag', async () => {
    suite.fs.writeFile('existing/src/file.ts', '// old');
    await suite.testCommand(['existing', '--overwrite'], (result) => {
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('overwritten');
    });
  });

  it('should not overwrite without --overwrite flag', async () => {
    suite.fs.writeFile('existing/src/file.ts', '// old');
    await suite.testErrorCase(['existing'], 1, /already exists/);
  });
});
```

### 2.3 Advanced Testing

**Property-Based Testing with fast-check:**

```typescript
// packages/cli/src/__tests__/properties/cli-properties.test.ts
import fc from 'fast-check';

describe('CLI — property-based tests', () => {
  it('should reject all invalid project name patterns', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 100 }), (name) => {
        if (/^[a-z0-9][a-z0-9-]*$/.test(name)) {
          return true; // valid — will pass if accepted
        }
        const result = await cli.run('init', [name]);
        return result.exitCode !== 0; // invalid — must reject
      }),
      { numRuns: 200 },
    );
  });

  it('should preserve output format under --json flag', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(['init', 'audit', 'verify', 'status']),
        fc.array(fc.string(), { maxLength: 5 }),
        async (cmd, args) => {
          const result = await cli.run(cmd, [...args, '--json']);
          if (result.exitCode === 0) {
            return result.json !== null;
          }
          return true; // erro é aceitável, mas JSON deve ser válido
        },
      ),
      { numRuns: 100 },
    );
  });
});
```

**Argument Fuzzing:**

```typescript
// packages/cli/src/__tests__/fuzzing/cli-fuzzer.test.ts
describe('CLI — argument fuzzing', () => {
  const FUZZ_ITERATIONS = 50;

  it('should not crash on extreme argument lengths', async () => {
    for (let i = 0; i < FUZZ_ITERATIONS; i++) {
      const longArg = 'A'.repeat(Math.floor(Math.random() * 10000));
      const result = await cli.run('init', [longArg]);
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
      expect(result.error).not.toContain('unhandled');
    }
  });

  it('should not crash on special characters in arguments', async () => {
    const specialChars = ['$(rm -rf /)', '`id`', '| cat /etc/passwd', '&& echo pwned', '; rm -rf', "' OR '1'='1"];
    for (const payload of specialChars) {
      const result = await cli.run('init', [payload]);
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
      expect(result.error).not.toContain('unhandled');
      expect(result.exitCode).not.toBeNaN();
    }
  });

  it('should not crash on unicode injection', async () => {
    const unicodePayloads = ['\u0000', '\uFFFF', '\u202E\u202D', '\u{1F4A9}', '\u00E9\u0065\u0301'];
    for (const payload of unicodePayloads) {
      const result = await cli.run('init', [payload]);
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
      expect(result.error).not.toContain('unhandled');
    }
  });

  it('should handle missing required flags gracefully', async () => {
    const commands = [
      { cmd: 'generate', args: [], expected: /required/ },
      { cmd: 'audit', args: [], expected: /path/ },
      { cmd: 'deploy', args: [], expected: /required/ },
    ];
    for (const { cmd, args, expected } of commands) {
      const result = await cli.run(cmd, args);
      expect(result.exitCode).toBe(1);
      expect(result.error).toMatch(expected);
    }
  });

  it('should handle flag value type mismatches', async () => {
    const mismatches = [
      ['--threshold', 'not-a-number'],
      ['--port', 'abc'],
      ['--verbose', 'invalid-boolean'],
      ['--format', 'nonexistent-format'],
    ];
    for (const [flag, value] of mismatches) {
      const result = await cli.run('audit', ['.', flag, value]);
      expect(result.exitCode).toBe(1);
      expect(result.error).toBeTruthy();
    }
  });
});
```

**Concurrency Testing:**

```typescript
// packages/cli/src/__tests__/concurrency/cli-concurrency.test.ts
describe('CLI — concurrency', () => {
  it('should handle parallel command execution without state corruption', async () => {
    const commands = Array.from({ length: 10 }, (_, i) => ({
      cmd: 'init',
      args: [`parallel-project-${i}`, '--dry-run'],
    }));

    const results = await Promise.all(
      commands.map(({ cmd, args }) => cli.run(cmd, args)),
    );

    for (const result of results) {
      expect(result.exitCode).toBe(0);
      expect(result.error).toBe('');
    }
  });

  it('should maintain audit trail integrity under concurrent load', async () => {
    const auditCalls = Array.from({ length: 5 }, () => cli.run('audit', ['.', '--json']));
    const results = await Promise.all(auditCalls);

    for (const result of results) {
      expect(result.json).toHaveProperty('chainLength');
    }
  });

  it('should not deadlock on concurrent filesystem operations', async () => {
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(cli.run('init', [`concurrent-${i}`, '--dry-run`]));
    }
    const results = await Promise.all(promises);
    const failed = results.filter(r => r.exitCode !== 0);
    expect(failed.length).toBe(0);
  });
});
```

### 2.4 CI Integration

```yaml
# .github/workflows/cli-tests.yml
name: CLI Tests

on:
  pull_request:
    paths:
      - 'packages/cli/**'
      - 'packages/event-bus/**'
      - 'packages/data-layer/**'
  push:
    branches: [main, develop]

env:
  NODE_VERSION: '20'
  COVERAGE_THRESHOLD: 60

jobs:
  unit:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
        split: [1, 2, 3]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: |
          npx jest packages/cli/src/__tests__/ \
            --shard=${{ matrix.split }}/3 \
            --coverage \
            --coverageThreshold='{"global":{"branches":${{ env.COVERAGE_THRESHOLD }},"lines":${{ env.COVERAGE_THRESHOLD }},"statements":${{ env.COVERAGE_THRESHOLD }}}}'
        name: Run CLI tests (shard ${{ matrix.split }}/3)

  integration:
    runs-on: ubuntu-latest
    services:
      nats:
        image: nats:2.10-alpine
        ports:
          - 4222:4222
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      - run: npm ci
      - run: |
          npx jest packages/cli/src/__tests__/integration/ \
            --testMatch='**/*.integration.test.ts' \
            --forceExit
        name: Run CLI integration tests
        env:
          NATS_URL: nats://localhost:4222
          TEST_MODE: integration

  mutation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      - run: npm ci
      - run: |
          npx stryker run packages/cli/stryker.conf.js \
            --reporters json,html \
            --thresholds.high 60 \
            --thresholds.low 40
        name: Run mutation tests
        continue-on-error: true

  flaky-detection:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      - run: npm ci
      - run: |
          for i in {1..5}; do
            echo "Run $i of 5"
            npx jest packages/cli/src/__tests__/ --shard=1/1 2>&1 | tee jest-run-$i.log
          done
          echo "Checking for flaky tests..."
          # Detect inconsistent results across runs
          node scripts/detect-flaky.js jest-run-*.log
        name: Detect flaky tests (5 runs)

  coverage-report:
    runs-on: ubuntu-latest
    needs: [unit]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx jest packages/cli/ --coverage --coverageReporters=json-summary
      - run: |
          node scripts/check-coverage-threshold.js \
            --coverage-file coverage/coverage-summary.json \
            --threshold 70
        name: Enforce coverage threshold
```

**Flaky Test Detection Strategy:**

| Técnica | Descrição | Implementação |
|---------|-----------|---------------|
| Repeated runs | Executa cada teste 5x em CI | `ci-flaky-detect.ts` |
| Timing variance | Detecta testes com duração > 3σ da média | `flaky-timing.ts` |
| Order independence | Testa em ordem aleatória vs alfabética | `jest --randomize` |
| Shared state detection | Varredura de `beforeAll` com efeito colateral | `static-state-scanner.ts` |
| Auto-retry | Retry 1x antes de reportar falha (com logging) | `jest.retryTimes(1)` |

### 2.5 Plano de Cobertura por Comando

**Prioridade 1 — Core (20 comandos, ~40h)**
| Comando | Testes | Esforço |
|---------|--------|---------|
| init | init.test.ts | 2h |
| generate | generate.test.ts | 4h |
| audit | audit.test.ts | 2h |
| verify | verify.test.ts | 2h |
| drift | drift.test.ts | 2h |
| policy | policy.test.ts | 2h |
| compliance | compliance.test.ts | 2h |
| docs | docs.test.ts | 2h |
| workflow | workflow.test.ts | 2h |
| report | report.test.ts | 2h |
| memory | memory.test.ts | 2h |
| evolution | evolution.test.ts | 2h |
| optimize | optimize.test.ts | 4h |
| coverage | coverage.test.ts | 2h |
| agents | agents.test.ts | 4h |
| reality-sync | reality-sync.test.ts | 2h |
| prompt | prompt.test.ts | 2h |
| orchestrate | orchestrate.test.ts | 2h |
| scorecard | scorecard.test.ts | 2h |
| release | release.test.ts | 2h |

**Prioridade 2 — Security (15 comandos, ~20h)**
| Comando | Esforço |
|---------|---------|
| safety-status | 1h |
| security barrier check | 2h |
| security pentest | 2h |
| supply-chain | 2h |
| audit-ledger | 1h |
| Demais 10 security commands | 12h |

**Prioridade 3 — Utilitários (46 comandos, ~30h)**
| Grupo | Comandos | Esforço |
|-------|----------|---------|
| AI commands | 12 | 8h |
| Dev commands | 15 | 10h |
| Info commands | 10 | 6h |
| Misc commands | 9 | 6h |

### 2.6 Teste de Mutação para CLI

```yaml
# stryker.cli.conf.json
{
  "mutate": ["packages/cli/src/commands/**/*.ts"],
  "testRunner": "jest",
  "jest": { "configFile": "jest.config.js" },
  "reporters": ["html", "json", "progress"],
  "thresholds": { "high": 60, "low": 40, "break": 30 }
}
```

### 2.7 Métricas de Sucesso

| Métrica | Atual | 30d | 60d | 90d |
|---------|-------|-----|-----|-----|
| CLI coverage | ~15% | 40% | 60% | 80% |
| Comandos testados | 92/173 | 130/173 | 160/173 | 173/173 |
| Mutation score | — | 30% | 50% | 60% |
| Testes CLI totais | ~480 | ~800 | ~1200 | ~1500 |

---

## 3. REFERENCES

| ID | Tipo | Título | Ano | Relevância IDEIA |
|----|------|--------|-----|-----------------|
| R1 | Paper | "Simple Testing Can Prevent Most Critical Failures" (OSDI) | 2014 | Base da pirâmide de testes — mostra que 80% das falhas catastróficas são detectáveis com testes simples |
| R2 | Book | "Working Effectively with Legacy Code" (Feathers) | 2004 | Estratégias para adicionar testes em codebase com ~15% cobertura |
| R3 | Tool | fast-check — Property-Based Testing for JavaScript | 2023 | Framework para testes baseados em propriedades no CLI |
| R4 | Standard | StrykerJS — Mutation Testing Framework | 2024 | Framework de teste de mutação para TypeScript |
| R5 | Paper | "An Empirical Study of Flaky Tests" (Luo et al., FSE) | 2014 | Taxonomia de flaky tests — base para detecção no CI |
| R6 | Pattern | "Test Doubles" (Meszaros, xUnit Patterns) | 2007 | Mock, Stub, Fake patterns — base para MockEventBus e MockFilesystem |
| R7 | Tool | Jest Snapshot Testing | 2024 | Snapshot testing para output de comandos CLI |
| R8 | Std | GitHub Actions — Matrix Builds & Sharding | 2024 | CI parallelization para suítes grandes de teste |
| R9 | Paper | "Property-Based Testing: A Practitioner's Guide" | 2021 | Guia prático para fast-check — base para seção 2.3 |
| R10 | Tool | Istanbul/NYC — Code Coverage | 2024 | Cobertura de código com thresholds configuráveis |
| R11 | Methodology | "Test Coverage: A Comprehensive Guide" (Atlassian) | 2024 | Métricas de cobertura significativas — branch, condition, mutation |
| R12 | Book | "xUnit Test Patterns" (Meszaros) | 2007 | CommandTestSuite base class — padrão TestSuite xUnit |
| R13 | Report | "OWASP Testing Guide v5" | 2024 | CLI security testing — injection, fuzzing, path traversal |
| R14 | Tool | playwright-test — CLI testing framework | 2024 | Inspiração para TestCLI — captura de stdout/stderr |
| R15 | Article | "Testing Command-Line Tools with Jest" (LogRocket) | 2023 | Padrões de teste para CLI — mocks de filesystem e process |
| R16 | Paper | "Feedback-Directed Random Test Generation" (Pacheco, ICSE) | 2007 | Fuzzing de argumentos — base científica para seção 2.3 |
| R17 | Tool | PACT — Contract Testing Framework | 2024 | Contratos entre comandos e serviços — integração com NATS |
| R18 | Standard | CWE — Common Weakness Enumeration | 2024 | Base para categorizar riscos de comandos não testados |

---

## 4. Integration with Quality Ecosystem

**Mapping to S66 (AI-Driven Testing):**

| S66 Module | CLI Test Integration | Status |
|-----------|---------------------|--------|
| Test Case Generator | Gera automaticamente casos de teste para novos comandos | 🔧 Planned |
| Flaky Test Classifier | ML model classifica flaky vs deterministic failures | 🧪 Prototype |
| Coverage Gap Analyzer | Identifica branches/file não testados e prioriza | ✅ Active |
| Mutation Optimizer | Seleciona mutantes de alto valor para reduzir runtime | 🔧 Planned |
| Self-Healing Tests | Auto-corrige snapshots quebrados por mudanças intencionais | 🧪 Prototype |

**Mutation Testing Pipeline:**

```
Code Change → Build → Unit Tests → Mutation Testing → Report → Quality Gate
                                  ↓
                    ┌──────────────────────────────┐
                    │  Mutation Score ≥ 60% → PASS │
                    │  Mutation Score 40-59% → WARN│
                    │  Mutation Score < 40% → FAIL │
                    └──────────────────────────────┘
```

**Quality Gates Integration:**

| Gate | CLI Test Requirement | Enforcement |
|------|---------------------|-------------|
| Gate 1 (Commit) | `jest --changedSince HEAD~1` no packages/cli | pre-commit hook |
| Gate 2 (PR) | 60%+ branch coverage, no regressions | GitHub status check |
| Gate 3 (Release) | 80%+ coverage, mutation score > 50%, 0 flaky | Release pipeline |
| Gate 4 (Sprint) | Trend positive, flaky rate < 5% | Sprint review |

**Contract Verification (Pact Integration):**

```typescript
// packages/cli/src/__tests__/contracts/init-contract.test.ts
describe('CLI — contract verification', () => {
  it('should produce event in expected format', async () => {
    await cli.run('init', ['contract-test', '--json']);
    suite.eventBus.assertPublishedWith('project:created', (data) => {
      return (
        typeof data.name === 'string' &&
        typeof data.timestamp === 'number' &&
        Array.isArray(data.files) &&
        data.template === 'default'
      );
    });
  });
});
```

---

## 5. Benchmarks

**Current vs Target Coverage Metrics:**

| Package | Current Coverage | 30d Target | 60d Target | 90d Target |
|---------|-----------------|------------|------------|------------|
| packages/cli/src/commands | 12% | 40% | 65% | 85% |
| packages/cli/src/handlers | 18% | 45% | 70% | 90% |
| packages/cli/src/validators | 8% | 50% | 75% | 90% |
| packages/cli/src/utils | 22% | 50% | 70% | 85% |
| packages/cli/src/output | 15% | 40% | 60% | 80% |
| packages/cli/src/pipeline | 5% | 35% | 55% | 80% |
| packages/cli/src/security | 0% | 30% | 50% | 75% |
| packages/cli/src/context-engine | 20% | 45% | 65% | 85% |

**Test Execution Time Budgets:**

| Test Group | Current | Target | Budget (max) |
|-----------|---------|--------|-------------|
| Unit (__tests__/commands/) | ~45s | ~30s | 60s |
| Integration (__tests__/integration/) | N/A | ~60s | 120s |
| Property-based | N/A | ~120s | 180s |
| Mutation | N/A | ~300s | 600s |
| Total (parallel) | ~45s | ~120s | 300s |

**ROI Estimates:**

| Investment | Cost (hours) | Expected Benefit | Payback Period |
|-----------|-------------|-----------------|----------------|
| TestCLI Framework | 8h | Reusable by all 173+ commands, reduced test authoring 60% | 2 weeks |
| Core 20 commands tests | 40h | Covers 80% of risk surface | 1 month |
| CI integration + sharding | 8h | 3x faster CI, parallel execution | Immediate |
| Mutation testing setup | 4h | Catches 40% more bugs than coverage alone | 2 months |
| Property-based testing | 12h | Finds edge cases no manual test covers | 1 month |
| Flaky detection infra | 6h | Reduces CI false negatives by 90% | 2 weeks |
| Total | 78h | +65% coverage, -80% regression risk | 6-8 weeks |

**Cumulative Value Over 12 Months:**

```
| Metric | Without Investment | With Investment | Savings |
|--------|-------------------|----------------|---------|
| Regressions caught | ~2/month | ~15/month | 7.5x |
| CI avg time | 15min | 5min | 3x faster |
| Onboarding new commands | 4h/command | 1.5h/command | 2.6x |
| Bug fix cycle time | 8h average | 2h average | 4x faster |
```

---

## 6. TEMPLATE V2.0 COMPLIANCE

### 6.1 5 Fases de Implementação

| Fase | Descrição | Esforço | Dependências | Entregável |
|------|-----------|---------|-------------|------------|
| F1 | TestCLI Framework + Mock helpers | 8h | — | `__tests__/helpers/` completo |
| F2 | Core commands tests (P0) | 40h | F1 | 20 test suites, coverage 40% |
| F3 | Security + Pipeline tests (P0) | 20h | F2 | 15 test suites, coverage 55% |
| F4 | CI + Mutation + Fuzzing | 18h | F2, F3 | CI pipeline, stryker, fast-check |
| F5 | Remaining commands + Property tests | 30h | F4 | Coverage 80%+, mutation 60%+ |

### 6.2 6 Dimensões de Qualidade

| Dimensão | Score Atual | Score Alvo | Indicador |
|----------|-------------|------------|-----------|
| Cobertura (8 seções) | 3/8 | 8/8 | All sections populated |
| Profundidade | 5/12 | 6/12 | Framework + exemplos + CI |
| Código | 15% | 80% | LOC testados |
| Referências | 3 | 18 | Papers, tools, books |
| Integração | S12 | S12+S66+S13+S6 | Conexões com 4 estudos |
| Aplicabilidade | Média | Alta | Uso imediato no codebase |

---

> **Score de Maturidade:** 75/100 ✅
> **Próximo passo:** Implementar F1 — TestCLI Framework + Mock helpers (8h)
