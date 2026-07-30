# ESTUDO-S71-INTERNAL-DEVELOPER-PLATFORM.md

> **Data:** 2026-07-24 | **Versão:** 2.0 (upgrade v3.0)
> **Nível de Profundidade:** 7/12 | **Área:** Plataforma — Internal Dev Platform
> **Dependências:** CLI, Quality Gates, CI/CD Pipeline
> **Conexões:** Developer Experience, Package Managers, Enterprise Config
> **Propósito:** Internal Developer Platform (IDP) para IDEIA — self-service actions, golden paths, backstage-like catalog, scorecards, templates.

---

## 1. FUNDAMENTOS

### 1.1 Problema

Equipes de plataforma criam ferramentas, mas desenvolvedores precisam saber que ferramentas existem e como usá-las. Uma Internal Developer Platform (IDP) oferece self-service, padronização e descoberta.

### 1.2 Arquitetura

```
Developer → IDEIA CLI → IDP Core
                         ├── Service Catalog (Backstage-style)
                         ├── Golden Paths (templates)
                         ├── Scorecards (quality)
                         └── Self-Service Actions
```

---

## 2. TÉCNICO

```bash
# Comandos IDP via CLI
IDEIA service list              # Listar serviços disponíveis
IDEIA service create api         # Scaffold novo serviço
IDEIA service scorecard my-api   # Ver scorecard de qualidade
IDEIA template list              # Listar templates
IDEIA template use node-express  # Usar template
IDEIA docs publish               # Publicar documentação
```

---

## 5. ANÁLISE PARA IDEIA

### 5.1 Plano

| Passo | Descrição | Esforço |
|-------|-----------|---------|
| 1 | Service catalog (Backstage-style) | 8h |
| 2 | Golden paths (templates) | 6h |
| 3 | Scorecards (quality gates integration) | 6h |
| 4 | Self-service actions | 6h |

---

## 6. IMPLEMENTAÇÃO — Backstage Integration

```typescript
class ServiceCatalog {
  async register(service: ServiceDefinition): Promise<void> {
    await this.kv.set(`catalog:${service.name}`, {
      name: service.name, type: service.type, owner: service.owner,
      dependsOn: service.dependencies, providesApis: service.apis,
      qualityScore: await this.computeScore(service),
    });
  }

  async list(): Promise<ServiceDefinition[]> {
    const entries = await this.kv.list('catalog:');
    return entries.map(e => JSON.parse(new TextDecoder().decode(e.value)));
  }

  private async computeScore(service: ServiceDefinition): Promise<number> {
    const checks = [
      service.hasTests ? 20 : 0,
      service.hasDocs ? 20 : 0,
      service.hasCI ? 20 : 0,
      service.hasMonitor ? 20 : 0,
      service.owner ? 20 : 0,
    ];
    return checks.reduce((a, b) => a + b, 0);
  }
}

class GoldenPath {
  async scaffold(template: string, params: Record<string, string>): Promise<void> {
    const tmpl = await this.loadTemplate(template);
    const files = tmpl.render(params);
    for (const [path, content] of Object.entries(files)) {
      await fs.writeFile(path, content);
    }
  }
}
```

---

## 7. CLI Commands

```bash
# IDP commands via IDEIA CLI
IDEIA service list                    # List all registered services
IDEIA service create api --template   # Scaffold new API service
IDEIA service scorecard my-svc        # Show quality scorecard
IDEIA template list                   # List available golden paths  
IDEIA template use node-express       # Apply a golden path template
IDEIA docs publish                    # Publish service docs
```

## 8. Scorecard Implementation

```typescript
class Scorecard {
  async compute(service: string): Promise<ScorecardResult> {
    const checks = [
      { name: 'Has Tests', passed: await this.hasTests(service), weight: 20 },
      { name: 'Has Documentation', passed: await this.hasDocs(service), weight: 20 },
      { name: 'CI Passing', passed: await this.ciPassing(service), weight: 20 },
      { name: 'Monitoring', passed: await this.hasMonitoring(service), weight: 20 },
      { name: 'Has Owner', passed: await this.hasOwner(service), weight: 20 },
    ];
    const score = checks.filter(c => c.passed).reduce((s, c) => s + c.weight, 0);
    const grade = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';
    return { service, score, grade, checks, timestamp: Date.now() };
  }
}
```

---

## 8. Service Catalog Engine

### 8.1 ServiceDefinition

```typescript
interface ServiceDefinition {
  name: string;
  type: 'api' | 'worker' | 'web' | 'library' | 'cli' | 'infra';
  owner: string;
  team: string;
  repository: string;
  language: string;
  dependencies: string[];
  apis: string[];
  tags: string[];
  metadata: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}
```

### 8.2 CatalogEntry

```typescript
class CatalogEntry {
  constructor(
    public readonly service: ServiceDefinition,
    public readonly score: number,
    public readonly grade: string,
  ) {}

  static async fromDefinition(
    svc: ServiceDefinition,
    scorecard: Scorecard,
  ): Promise<CatalogEntry> {
    const result = await scorecard.compute(svc.name);
    return new CatalogEntry(svc, result.score, result.grade);
  }

  toJSON() {
    return { ...this.service, score: this.score, grade: this.grade };
  }
}
```

### 8.3 CatalogSearch

```typescript
class CatalogSearch {
  private entries: CatalogEntry[] = [];

  constructor(entries: CatalogEntry[]) {
    this.entries = entries;
  }

  byName(name: string): CatalogEntry | undefined {
    return this.entries.find(e => e.service.name === name);
  }

  byOwner(owner: string): CatalogEntry[] {
    return this.entries.filter(e => e.service.owner === owner);
  }

  byType(type: string): CatalogEntry[] {
    return this.entries.filter(e => e.service.type === type);
  }

  byTag(tag: string): CatalogEntry[] {
    return this.entries.filter(e => e.service.tags.includes(tag));
  }

  byLanguage(lang: string): CatalogEntry[] {
    return this.entries.filter(e => e.service.language === lang);
  }

  byQuery(q: string): CatalogEntry[] {
    const lower = q.toLowerCase();
    return this.entries.filter(e =>
      e.service.name.toLowerCase().includes(lower) ||
      e.service.owner.toLowerCase().includes(lower) ||
      e.service.tags.some(t => t.toLowerCase().includes(lower))
    );
  }

  top(n: number): CatalogEntry[] {
    return [...this.entries].sort((a, b) => b.score - a.score).slice(0, n);
  }

  bottom(n: number): CatalogEntry[] {
    return [...this.entries].sort((a, b) => a.score - b.score).slice(0, n);
  }

  groupByOwner(): Map<string, CatalogEntry[]> {
    const groups = new Map<string, CatalogEntry[]>();
    for (const entry of this.entries) {
      const list = groups.get(entry.service.owner) || [];
      list.push(entry);
      groups.set(entry.service.owner, list);
    }
    return groups;
  }
}
```

### 8.4 CatalogGraph — Dependency Graph

```typescript
class CatalogGraph {
  private adj = new Map<string, string[]>();

  build(entries: CatalogEntry[]): void {
    for (const entry of entries) {
      const deps = entry.service.dependencies || [];
      this.adj.set(entry.service.name, deps);
    }
  }

  dependenciesOf(name: string): string[] {
    const visited = new Set<string>();
    const result: string[] = [];
    const dfs = (node: string) => {
      if (visited.has(node)) return;
      visited.add(node);
      for (const dep of this.adj.get(node) || []) {
        result.push(dep);
        dfs(dep);
      }
    };
    dfs(name);
    return result;
  }

  dependentsOf(name: string, all: string[]): string[] {
    return all.filter(s => (this.adj.get(s) || []).includes(name));
  }

  hasCycle(): boolean {
    const visited = new Set<string>();
    const stack = new Set<string>();
    const dfs = (node: string): boolean => {
      if (stack.has(node)) return true;
      if (visited.has(node)) return false;
      visited.add(node);
      stack.add(node);
      for (const dep of this.adj.get(node) || []) {
        if (dfs(dep)) return true;
      }
      stack.delete(node);
      return false;
    };
    for (const node of this.adj.keys()) {
      if (dfs(node)) return true;
    }
    return false;
  }

  levels(): Map<number, string[]> {
    const inDegree = new Map<string, number>();
    for (const [node, deps] of this.adj) {
      if (!inDegree.has(node)) inDegree.set(node, 0);
      for (const dep of deps) {
        inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
      }
    }
    const queue: string[] = [];
    for (const [node, deg] of inDegree) {
      if (deg === 0) queue.push(node);
    }
    const result = new Map<number, string[]>();
    let level = 0;
    while (queue.length > 0) {
      const current = [...queue];
      queue.length = 0;
      result.set(level++, current);
      for (const node of current) {
        for (const dep of this.adj.get(node) || []) {
          const deg = (inDegree.get(dep) || 1) - 1;
          inDegree.set(dep, deg);
          if (deg === 0) queue.push(dep);
        }
      }
    }
    return result;
  }
}
```

### 8.5 KV Store Integration

```typescript
class CatalogStore {
  constructor(private kv: KVNamespace) {}

  async save(entry: CatalogEntry): Promise<void> {
    await this.kv.set(`catalog:${entry.service.name}`, JSON.stringify(entry.toJSON()));
  }

  async get(name: string): Promise<CatalogEntry | null> {
    const raw = await this.kv.get(`catalog:${name}`);
    if (!raw) return null;
    return JSON.parse(new TextDecoder().decode(raw));
  }

  async list(): Promise<CatalogEntry[]> {
    const entries = await this.kv.list('catalog:');
    const results: CatalogEntry[] = [];
    for (const e of entries) {
      const parsed = JSON.parse(new TextDecoder().decode(e.value));
      results.push(parsed);
    }
    return results;
  }

  async delete(name: string): Promise<void> {
    await this.kv.delete(`catalog:${name}`);
  }

  async search(query: CatalogSearch): Promise<CatalogEntry[]> {
    const all = await this.list();
    return query.byQuery(query.toString());
  }
}
```

---

## 9. Golden Path Engine

### 9.1 GoldenPathTemplate

```typescript
interface TemplateFile {
  path: string;
  content: string;
  executable?: boolean;
}

interface TemplateVariable {
  name: string;
  description: string;
  default?: string;
  required: boolean;
  validator?: (value: string) => boolean;
}

interface TemplateCondition {
  variable: string;
  equals?: string;
  notEquals?: string;
  exists?: boolean;
}

class GoldenPathTemplate {
  constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly version: string,
    public readonly variables: TemplateVariable[],
    public readonly files: TemplateFile[],
    public readonly conditions: Map<string, TemplateCondition>,
    public readonly postActions: string[],
  ) {}

  validateParams(params: Record<string, string>): string[] {
    const errors: string[] = [];
    for (const v of this.variables) {
      if (v.required && !params[v.name]) {
        errors.push(`Missing required variable: ${v.name}`);
      }
      if (params[v.name] && v.validator && !v.validator(params[v.name])) {
        errors.push(`Invalid value for ${v.name}: ${params[v.name]}`);
      }
    }
    return errors;
  }

  getDefaultParams(): Record<string, string> {
    const defaults: Record<string, string> = {};
    for (const v of this.variables) {
      if (v.default !== undefined) {
        defaults[v.name] = v.default;
      }
    }
    return defaults;
  }
}
```

### 9.2 TemplateRenderer

```typescript
class TemplateRenderer {
  render(
    template: GoldenPathTemplate,
    params: Record<string, string>,
    conditions?: Record<string, boolean>,
  ): Map<string, string> {
    const result = new Map<string, string>();
    for (const file of template.files) {
      if (this.shouldInclude(file.path, template.conditions, params, conditions)) {
        const rendered = this.renderContent(file.content, params);
        result.set(file.path, rendered);
      }
    }
    return result;
  }

  private shouldInclude(
    path: string,
    conditions: Map<string, TemplateCondition>,
    params: Record<string, string>,
    runtimeConditions?: Record<string, boolean>,
  ): boolean {
    const cond = conditions.get(path);
    if (!cond) return true;
    if (runtimeConditions && runtimeConditions[path] !== undefined) {
      return runtimeConditions[path];
    }
    const value = params[cond.variable];
    if (cond.equals !== undefined) return value === cond.equals;
    if (cond.notEquals !== undefined) return value !== cond.notEquals;
    if (cond.exists !== undefined) return cond.exists ? !!value : !value;
    return true;
  }

  private renderContent(
    content: string,
    params: Record<string, string>,
  ): string {
    return content.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
      return params[key] !== undefined ? params[key] : match;
    });
  }

  async scaffold(
    template: GoldenPathTemplate,
    params: Record<string, string>,
    targetDir: string,
    conditions?: Record<string, boolean>,
  ): Promise<string[]> {
    const files = this.render(template, params, conditions);
    const created: string[] = [];
    for (const [relPath, content] of files) {
      const fullPath = path.join(targetDir, relPath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
      created.push(fullPath);
    }
    return created;
  }
}
```

### 9.3 TemplateRegistry

```typescript
class TemplateRegistry {
  private templates = new Map<string, GoldenPathTemplate>();

  register(tmpl: GoldenPathTemplate): void {
    this.templates.set(tmpl.name, tmpl);
  }

  unregister(name: string): boolean {
    return this.templates.delete(name);
  }

  get(name: string): GoldenPathTemplate | undefined {
    return this.templates.get(name);
  }

  list(): GoldenPathTemplate[] {
    return Array.from(this.templates.values());
  }

  findByTag(tag: string): GoldenPathTemplate[] {
    return this.list().filter(t => t.name.includes(tag) || t.description.includes(tag));
  }

  findBestMatch(query: string): GoldenPathTemplate | undefined {
    const lower = query.toLowerCase();
    let best: GoldenPathTemplate | undefined;
    let bestScore = 0;
    for (const tmpl of this.templates.values()) {
      let score = 0;
      if (tmpl.name.toLowerCase().includes(lower)) score += 3;
      if (tmpl.description.toLowerCase().includes(lower)) score += 2;
      for (const v of tmpl.variables) {
        if (v.name.toLowerCase().includes(lower)) score += 1;
      }
      if (score > bestScore) {
        bestScore = score;
        best = tmpl;
      }
    }
    return best;
  }

  async loadFromDir(dir: string): Promise<number> {
    const files = await fs.readdir(dir);
    let count = 0;
    for (const file of files) {
      if (file.endsWith('.template.json')) {
        const content = await fs.readFile(path.join(dir, file), 'utf-8');
        const data = JSON.parse(content);
        const tmpl = new GoldenPathTemplate(
          data.name, data.description, data.version,
          data.variables || [], data.files || [],
          new Map(Object.entries(data.conditions || {})),
          data.postActions || [],
        );
        this.register(tmpl);
        count++;
      }
    }
    return count;
  }
}
```

### 9.4 Scaffolding Pipeline

```typescript
class ScaffoldPipeline {
  constructor(
    private registry: TemplateRegistry,
    private renderer: TemplateRenderer,
  ) {}

  async run(
    templateName: string,
    params: Record<string, string>,
    targetDir: string,
    options?: { dryRun?: boolean; conditions?: Record<string, boolean> },
  ): Promise<ScaffoldResult> {
    const tmpl = this.registry.get(templateName);
    if (!tmpl) {
      return { success: false, error: `Template "${templateName}" not found` };
    }

    const errors = tmpl.validateParams(params);
    if (errors.length > 0) {
      return { success: false, error: errors.join('; ') };
    }

    const merged = { ...tmpl.getDefaultParams(), ...params };

    if (options?.dryRun) {
      const files = this.renderer.render(tmpl, merged, options.conditions);
      return {
        success: true,
        dryRun: true,
        files: Array.from(files.keys()),
      };
    }

    const created = await this.renderer.scaffold(tmpl, merged, targetDir, options?.conditions);

    for (const action of tmpl.postActions) {
      await this.executePostAction(action, targetDir, merged);
    }

    return { success: true, files: created };
  }

  private async executePostAction(
    action: string,
    dir: string,
    params: Record<string, string>,
  ): Promise<void> {
    switch (action) {
      case 'npm-install':
        await exec('npm install', { cwd: dir });
        break;
      case 'git-init':
        await exec('git init', { cwd: dir });
        break;
      case 'tsc-init':
        await exec('npx tsc --init', { cwd: dir });
        break;
      default:
        if (action.startsWith('exec:')) {
          const cmd = action.slice(5).replace(/\{\{(\w+)\}\}/g, (_, k) => params[k] || '');
          await exec(cmd, { cwd: dir });
        }
    }
  }
}

interface ScaffoldResult {
  success: boolean;
  error?: string;
  dryRun?: boolean;
  files?: string[];
}
```

---

## 10. Scorecard Engine

### 10.1 Weighted Scorecard

```typescript
interface ScorecardCheck {
  name: string;
  passed: boolean;
  weight: number;
  category: string;
  detail?: string;
}

interface ScorecardResult {
  service: string;
  score: number;
  maxScore: number;
  grade: string;
  checks: ScorecardCheck[];
  timestamp: number;
}

class WeightedScorecard extends Scorecard {
  private categories = new Map<string, number>();

  async compute(service: string): Promise<ScorecardResult> {
    const checks = await this.gatherChecks(service);
    const maxScore = checks.reduce((s, c) => s + c.weight, 0);
    const score = checks.filter(c => c.passed).reduce((s, c) => s + c.weight, 0);
    const grade = this.calculateGrade(score, maxScore);
    return { service, score, maxScore, grade, checks, timestamp: Date.now() };
  }

  private async gatherChecks(service: string): Promise<ScorecardCheck[]> {
    return [
      { name: 'Has Tests', passed: await this.hasTests(service), weight: 15, category: 'quality' },
      { name: 'Test Coverage > 80%', passed: await this.coverageAbove80(service), weight: 10, category: 'quality' },
      { name: 'Has Documentation', passed: await this.hasDocs(service), weight: 10, category: 'docs' },
      { name: 'API Documented', passed: await this.hasApiDocs(service), weight: 10, category: 'docs' },
      { name: 'CI Passing', passed: await this.ciPassing(service), weight: 15, category: 'reliability' },
      { name: 'Monitoring Active', passed: await this.hasMonitoring(service), weight: 10, category: 'observability' },
      { name: 'Has Alerts', passed: await this.hasAlerts(service), weight: 5, category: 'observability' },
      { name: 'Has Owner', passed: await this.hasOwner(service), weight: 5, category: 'governance' },
      { name: 'Dependencies Updated', passed: await this.depsUpdated(service), weight: 10, category: 'security' },
      { name: 'No Critical CVEs', passed: await this.noCriticalCVEs(service), weight: 10, category: 'security' },
    ];
  }

  private calculateGrade(score: number, max: number): string {
    const pct = max > 0 ? (score / max) * 100 : 0;
    if (pct >= 90) return 'A';
    if (pct >= 75) return 'B';
    if (pct >= 50) return 'C';
    if (pct >= 25) return 'D';
    return 'F';
  }

  async categoryBreakdown(service: string): Promise<Map<string, { score: number; max: number }>> {
    const result = await this.compute(service);
    const breakdown = new Map<string, { score: number; max: number }>();
    for (const check of result.checks) {
      const current = breakdown.get(check.category) || { score: 0, max: 0 };
      current.max += check.weight;
      if (check.passed) current.score += check.weight;
      breakdown.set(check.category, current);
    }
    return breakdown;
  }
}
```

### 10.2 ScorecardHistory

```typescript
interface ScorecardSnapshot {
  service: string;
  score: number;
  maxScore: number;
  grade: string;
  timestamp: number;
  checks: ScorecardCheck[];
}

class ScorecardHistory {
  private snapshots: ScorecardSnapshot[] = [];

  constructor(private kv: KVNamespace) {}

  async record(result: ScorecardResult): Promise<void> {
    const snapshot: ScorecardSnapshot = {
      service: result.service,
      score: result.score,
      maxScore: result.maxScore,
      grade: result.grade,
      timestamp: result.timestamp,
      checks: result.checks,
    };
    const key = `scorecard:${result.service}:${result.timestamp}`;
    await this.kv.set(key, JSON.stringify(snapshot));
    this.snapshots.push(snapshot);
  }

  async getHistory(service: string, limit = 20): Promise<ScorecardSnapshot[]> {
    const entries = await this.kv.list(`scorecard:${service}:`);
    const sorted = entries
      .map(e => JSON.parse(new TextDecoder().decode(e.value)) as ScorecardSnapshot)
      .sort((a, b) => b.timestamp - a.timestamp);
    return sorted.slice(0, limit);
  }

  latest(service: string): ScorecardSnapshot | undefined {
    const entries = this.snapshots.filter(s => s.service === service);
    if (entries.length === 0) return undefined;
    return entries.reduce((a, b) => (a.timestamp > b.timestamp ? a : b));
  }
}
```

### 10.3 ScorecardTrend

```typescript
class ScorecardTrend {
  constructor(private history: ScorecardHistory) {}

  async trend(service: string, days = 30): Promise<{
    current: number;
    previous: number;
    change: number;
    direction: 'up' | 'down' | 'stable';
  }> {
    const snapshots = await this.history.getHistory(service);
    if (snapshots.length < 2) {
      return { current: 0, previous: 0, change: 0, direction: 'stable' };
    }
    const current = snapshots[0].score;
    const previous = snapshots[snapshots.length - 1].score;
    const change = current - previous;
    const direction = change > 5 ? 'up' : change < -5 ? 'down' : 'stable';
    return { current, previous, change, direction };
  }

  async regressionAlert(service: string, threshold = 20): Promise<boolean> {
    const t = await this.trend(service);
    return t.direction === 'down' && Math.abs(t.change) >= threshold;
  }

  async servicesWithNegativeTrend(days = 30): Promise<string[]> {
    const all = await this.getAllServices();
    const bad: string[] = [];
    for (const svc of all) {
      const t = await this.trend(svc, days);
      if (t.direction === 'down') bad.push(svc);
    }
    return bad;
  }

  private async getAllServices(): Promise<string[]> {
    const entries = await this.history['kv'].list('scorecard:');
    const services = new Set<string>();
    for (const e of entries) {
      const parts = e.key.split(':');
      if (parts.length >= 2) services.add(parts[1]);
    }
    return Array.from(services);
  }
}
```

### 10.4 ScorecardReport

```typescript
interface CategorySummary {
  category: string;
  score: number;
  max: number;
  percentage: number;
}

class ScorecardReport {
  constructor(
    private scorecard: WeightedScorecard,
    private history: ScorecardHistory,
  ) {}

  async generate(service: string): Promise<string> {
    const result = await this.scorecard.compute(service);
    const breakdown = await this.scorecard.categoryBreakdown(service);
    const hist = await this.history.getHistory(service, 10);
    const t = await new ScorecardTrend(this.history).trend(service);

    const lines: string[] = [
      `Scorecard Report: ${service}`,
      `Grade: ${result.grade} (${result.score}/${result.maxScore})`,
      `Trend: ${t.direction} (${t.change > 0 ? '+' : ''}${t.change} pts)`,
      '',
      '--- Categories ---',
    ];

    for (const [cat, data] of breakdown) {
      const pct = data.max > 0 ? Math.round((data.score / data.max) * 100) : 0;
      lines.push(`  ${cat}: ${data.score}/${data.max} (${pct}%)`);
    }

    lines.push('', '--- Recent History ---');
    for (const snap of hist.slice(0, 5)) {
      const date = new Date(snap.timestamp).toISOString().slice(0, 10);
      lines.push(`  ${date}: ${snap.grade} (${snap.score}/${snap.maxScore})`);
    }

    lines.push('', '--- Details ---');
    for (const check of result.checks) {
      const icon = check.passed ? '[PASS]' : '[FAIL]';
      lines.push(`  ${icon} ${check.name} (${check.weight}pts) - ${check.category}`);
    }

    return lines.join('\n');
  }

  async generateAll(): Promise<Map<string, string>> {
    const reports = new Map<string, string>();
    const services = await this.getAllServices();
    for (const svc of services) {
      reports.set(svc, await this.generate(svc));
    }
    return reports;
  }

  private async getAllServices(): Promise<string[]> {
    const entries = await this.history['kv'].list('scorecard:');
    const services = new Set<string>();
    for (const e of entries) {
      const parts = e.key.split(':');
      if (parts.length >= 2) services.add(parts[1]);
    }
    return Array.from(services);
  }
}
```

---

## 11. Self-Service Actions

### 11.1 ActionRegistry

```typescript
interface ActionDefinition {
  name: string;
  description: string;
  category: string;
  parameters: ActionParameter[];
  requiredApproval: 'none' | 'dev' | 'tech-lead' | 'security';
  timeout: number;
  runner: 'local' | 'pipeline' | 'webhook';
  webhookUrl?: string;
}

interface ActionParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'choice';
  description: string;
  required: boolean;
  default?: string | number | boolean;
  choices?: string[];
  validator?: (value: string) => boolean;
}

class ActionRegistry {
  private actions = new Map<string, ActionDefinition>();

  register(action: ActionDefinition): void {
    this.actions.set(action.name, action);
  }

  get(name: string): ActionDefinition | undefined {
    return this.actions.get(name);
  }

  list(): ActionDefinition[] {
    return Array.from(this.actions.values());
  }

  listByCategory(category: string): ActionDefinition[] {
    return this.list().filter(a => a.category === category);
  }

  find(query: string): ActionDefinition[] {
    const lower = query.toLowerCase();
    return this.list().filter(a =>
      a.name.toLowerCase().includes(lower) ||
      a.description.toLowerCase().includes(lower),
    );
  }
}
```

### 11.2 ActionExecutor

```typescript
interface ActionResult {
  success: boolean;
  action: string;
  output: string;
  duration: number;
  timestamp: number;
  error?: string;
}

class ActionExecutor {
  constructor(
    private registry: ActionRegistry,
    private approval: ActionApproval,
  ) {}

  async execute(
    actionName: string,
    params: Record<string, string>,
    context: { user: string; role: string },
  ): Promise<ActionResult> {
    const def = this.registry.get(actionName);
    if (!def) {
      return { success: false, action: actionName, output: '', duration: 0, timestamp: Date.now(), error: `Action "${actionName}" not found` };
    }

    const validationErrors = this.validateParams(def, params);
    if (validationErrors.length > 0) {
      return { success: false, action: actionName, output: '', duration: 0, timestamp: Date.now(), error: validationErrors.join('; ') };
    }

    if (def.requiredApproval !== 'none') {
      const approved = await this.approval.request(def, params, context);
      if (!approved) {
        return { success: false, action: actionName, output: '', duration: 0, timestamp: Date.now(), error: 'Approval denied' };
      }
    }

    const start = Date.now();
    try {
      const output = await this.runAction(def, params);
      return { success: true, action: actionName, output, duration: Date.now() - start, timestamp: Date.now() };
    } catch (err: any) {
      return { success: false, action: actionName, output: '', duration: Date.now() - start, timestamp: Date.now(), error: err.message };
    }
  }

  private validateParams(def: ActionDefinition, params: Record<string, string>): string[] {
    const errors: string[] = [];
    for (const p of def.parameters) {
      const value = params[p.name];
      if (p.required && !value) {
        errors.push(`Missing required parameter: ${p.name}`);
      }
      if (value && p.validator && !p.validator(value)) {
        errors.push(`Invalid value for ${p.name}: ${value}`);
      }
      if (value && p.type === 'choice' && p.choices && !p.choices.includes(value)) {
        errors.push(`Invalid choice for ${p.name}: ${value}. Allowed: ${p.choices.join(', ')}`);
      }
    }
    return errors;
  }

  private async runAction(def: ActionDefinition, params: Record<string, string>): Promise<string> {
    switch (def.runner) {
      case 'local':
        return this.runLocal(def.name, params);
      case 'pipeline':
        return this.runPipeline(def.name, params);
      case 'webhook':
        return this.runWebhook(def.webhookUrl!, params);
      default:
        throw new Error(`Unknown runner: ${def.runner}`);
    }
  }

  private async runLocal(action: string, params: Record<string, string>): Promise<string> {
    switch (action) {
      case 'create-api':
        return await this.scaffoldApi(params);
      case 'add-monitoring':
        return await this.addMonitoring(params);
      case 'setup-ci':
        return await this.setupCI(params);
      default:
        throw new Error(`No local handler for: ${action}`);
    }
  }

  private async scaffoldApi(params: Record<string, string>): Promise<string> {
    const name = params['name'] || 'my-api';
    const template = params['template'] || 'node-express';
    await exec(`IDEIA template use ${template} --name ${name}`);
    return `API ${name} scaffolded from template ${template}`;
  }

  private async addMonitoring(params: Record<string, string>): Promise<string> {
    const service = params['service'];
    const type = params['type'] || 'prometheus';
    await exec(`IDEIA service monitoring add ${service} --type ${type}`);
    return `Monitoring (${type}) added to ${service}`;
  }

  private async setupCI(params: Record<string, string>): Promise<string> {
    const service = params['service'];
    const provider = params['provider'] || 'github-actions';
    await exec(`IDEIA service ci setup ${service} --provider ${provider}`);
    return `CI (${provider}) configured for ${service}`;
  }

  private async runPipeline(action: string, _params: Record<string, string>): Promise<string> {
    return `Pipeline triggered for ${action} (async)`;
  }

  private async runWebhook(url: string, params: Record<string, string>): Promise<string> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await response.text();
  }
}
```

### 11.3 ActionApproval

```typescript
type ApprovalLevel = 'none' | 'dev' | 'tech-lead' | 'security';

interface ApprovalRequest {
  id: string;
  action: string;
  params: Record<string, string>;
  requestedBy: string;
  requestedAt: number;
  level: ApprovalLevel;
  status: 'pending' | 'approved' | 'denied';
  approvedBy?: string;
  approvedAt?: number;
  reason?: string;
}

class ActionApproval {
  private requests = new Map<string, ApprovalRequest>();
  private approvers = new Map<ApprovalLevel, string[]>();

  constructor() {
    this.approvers.set('dev', ['dev-team']);
    this.approvers.set('tech-lead', ['tech-leads']);
    this.approvers.set('security', ['security-team']);
  }

  async request(
    def: ActionDefinition,
    params: Record<string, string>,
    context: { user: string; role: string },
  ): Promise<boolean> {
    if (def.requiredApproval === 'none') return true;

    const id = `approval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const req: ApprovalRequest = {
      id,
      action: def.name,
      params,
      requestedBy: context.user,
      requestedAt: Date.now(),
      level: def.requiredApproval,
      status: 'pending',
    };
    this.requests.set(id, req);

    const hasRole = this.checkRole(context.role, def.requiredApproval);
    if (hasRole) {
      req.status = 'approved';
      req.approvedBy = context.user;
      req.approvedAt = Date.now();
      return true;
    }

    return await this.waitForApproval(id, 30000);
  }

  private checkRole(role: string, level: ApprovalLevel): boolean {
    const allowed = this.approvers.get(level) || [];
    return allowed.includes(role) || role === 'admin';
  }

  approve(id: string, by: string): boolean {
    const req = this.requests.get(id);
    if (!req || req.status !== 'pending') return false;
    req.status = 'approved';
    req.approvedBy = by;
    req.approvedAt = Date.now();
    return true;
  }

  deny(id: string, by: string, reason?: string): boolean {
    const req = this.requests.get(id);
    if (!req || req.status !== 'pending') return false;
    req.status = 'denied';
    req.approvedBy = by;
    req.reason = reason;
    return true;
  }

  private async waitForApproval(id: string, timeout: number): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const req = this.requests.get(id);
      if (req?.status === 'approved') return true;
      if (req?.status === 'denied') return false;
      await new Promise(r => setTimeout(r, 500));
    }
    this.requests.get(id)!.status = 'denied';
    return false;
  }
}
```

### 11.4 Built-in Actions

| Action | Category | Runner | Approval | Description |
|--------|----------|--------|----------|-------------|
| `create-api` | scaffolding | local | none | Scaffold new API service from template |
| `add-monitoring` | observability | local | dev | Add Prometheus/Datadog monitoring |
| `setup-ci` | pipeline | local | dev | Configure CI/CD pipeline |
| `add-database` | infrastructure | pipeline | tech-lead | Provision PostgreSQL/Redis database |
| `deploy-canary` | delivery | pipeline | tech-lead | Deploy canary release (10%) |
| `rotate-secrets` | security | webhook | security | Rotate service secrets via vault |
| `add-dependency` | dependencies | local | dev | Add internal service dependency |
| `publish-docs` | documentation | local | none | Generate and publish TechDocs |

---

## 12. CLI Implementation

### 12.1 Service List Command

```typescript
import { CliCommandResult } from '../cli-command-result';

export async function serviceList(args: string[], options: any): Promise<CliCommandResult> {
  const catalog = new CatalogStore(await getKV());
  const search = new CatalogSearch(await catalog.list());

  if (options.owner) {
    return CliCommandResult.success(JSON.stringify(search.byOwner(options.owner)));
  }
  if (options.type) {
    return CliCommandResult.success(JSON.stringify(search.byType(options.type)));
  }
  if (options.tag) {
    return CliCommandResult.success(JSON.stringify(search.byTag(options.tag)));
  }
  if (options.query) {
    return CliCommandResult.success(JSON.stringify(search.byQuery(options.query)));
  }
  if (options.top) {
    return CliCommandResult.success(JSON.stringify(search.top(Number(options.top))));
  }

  return CliCommandResult.success(JSON.stringify(await catalog.list()));
}
```

### 12.2 Service Create Command

```typescript
export async function serviceCreate(args: string[], options: any): Promise<CliCommandResult> {
  const type = args[0] || 'api';
  const name = options.name || `${type}-${Date.now()}`;
  const template = options.template || 'node-express';
  const targetDir = options.dir || process.cwd();

  const registry = new TemplateRegistry();
  await registry.loadFromDir(path.join(__dirname, '../../templates'));
  const pipeline = new ScaffoldPipeline(registry, new TemplateRenderer());

  const result = await pipeline.run(template, { name, type }, targetDir, { dryRun: options['dry-run'] });

  if (!result.success) {
    return CliCommandResult.failure(result.error || 'Unknown error');
  }

  const catalog = new CatalogStore(await getKV());
  const svc: ServiceDefinition = {
    name, type: type as any, owner: options.owner || 'unknown', team: options.team || '',
    repository: options.repo || '', language: options.language || 'typescript',
    dependencies: [], apis: [], tags: options.tag ? [options.tag] : [],
    metadata: {}, createdAt: Date.now(), updatedAt: Date.now(),
  };
  await catalog.save(new CatalogEntry(svc, 0, 'N/A'));

  return CliCommandResult.success(
    `Service "${name}" created from template "${template}"\nFiles: ${result.files?.join(', ')}`,
  );
}
```

### 12.3 Service Scorecard Command

```typescript
export async function serviceScorecard(args: string[], options: any): Promise<CliCommandResult> {
  const service = args[0];
  if (!service) return CliCommandResult.failure('Service name required');

  const scorecard = new WeightedScorecard();
  const kv = await getKV();
  const history = new ScorecardHistory(kv);

  if (options.history) {
    const snapshots = await history.getHistory(service, Number(options.limit) || 20);
    return CliCommandResult.success(JSON.stringify(snapshots));
  }
  if (options.trend) {
    const trend = await new ScorecardTrend(history).trend(service);
    return CliCommandResult.success(JSON.stringify(trend));
  }
  if (options.report) {
    const report = new ScorecardReport(scorecard, history);
    const content = await report.generate(service);
    return CliCommandResult.success(content);
  }

  const result = await scorecard.compute(service);
  await history.record(result);
  return CliCommandResult.success(JSON.stringify(result));
}
```

### 12.4 Template List Command

```typescript
export async function templateList(args: string[], options: any): Promise<CliCommandResult> {
  const registry = new TemplateRegistry();
  const templatesDir = options.dir || path.join(__dirname, '../../templates');
  await registry.loadFromDir(templatesDir);

  const list = registry.list();
  if (options.json) {
    return CliCommandResult.success(JSON.stringify(list));
  }

  const lines = list.map(t =>
    `${t.name.padEnd(24)} ${t.description.padEnd(40)} v${t.version}`
  );
  return CliCommandResult.success(lines.join('\n'));
}
```

### 12.5 Template Use Command

```typescript
export async function templateUse(args: string[], options: any): Promise<CliCommandResult> {
  const template = args[0];
  if (!template) return CliCommandResult.failure('Template name required');

  const registry = new TemplateRegistry();
  const templatesDir = options.dir || path.join(__dirname, '../../templates');
  await registry.loadFromDir(templatesDir);
  const pipeline = new ScaffoldPipeline(registry, new TemplateRenderer());

  const params: Record<string, string> = {};
  for (const [key, val] of Object.entries(options)) {
    if (key !== 'dir' && key !== 'dry-run') params[key] = String(val);
  }

  const result = await pipeline.run(template, params, options.targetDir || process.cwd(), {
    dryRun: options['dry-run'],
  });

  if (!result.success) {
    return CliCommandResult.failure(result.error || 'Unknown error');
  }

  return CliCommandResult.success(
    `Template "${template}" applied. Files: ${result.files?.join(', ') || 'none'}`,
  );
}
```

### 12.6 Docs Publish Command

```typescript
export async function docsPublish(args: string[], options: any): Promise<CliCommandResult> {
  const service = args[0] || options.service;
  const sourceDir = options.source || 'docs';
  const targetDir = options.target || 'techdocs';

  if (!service) return CliCommandResult.failure('Service name required');

  await exec(`npx techdocs-cli generate --source-dir ${sourceDir} --output-dir ${targetDir}`);
  await exec(`npx techdocs-cli publish --dir ${targetDir}`);

  return CliCommandResult.success(`Documentation for "${service}" published to TechDocs`);
}
```

### 12.7 Action Run Command

```typescript
export async function actionRun(args: string[], options: any): Promise<CliCommandResult> {
  const actionName = args[0];
  if (!actionName) return CliCommandResult.failure('Action name required');

  const registry = new ActionRegistry();
  registry.register(defaultActions);
  const approval = new ActionApproval();
  const executor = new ActionExecutor(registry, approval);

  const params: Record<string, string> = {};
  for (const [key, val] of Object.entries(options)) {
    if (key !== 'wait') params[key] = String(val);
  }

  const result = await executor.execute(actionName, params, {
    user: options.user || 'anonymous',
    role: options.role || 'dev',
  });

  if (!result.success) {
    return CliCommandResult.failure(result.error || 'Action failed');
  }

  return CliCommandResult.success(result.output);
}
```

---

## 13. Backstage Integration

### 13.1 Entity Provider

```typescript
class IDEEntityProvider {
  async getEntities(): Promise<BackstageEntity[]> {
    const catalog = new CatalogStore(await getKV());
    const entries = await catalog.list();
    return entries.map(e => ({
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: e.service.name,
        description: `${e.service.type} service owned by ${e.service.owner}`,
        tags: e.service.tags,
        annotations: {
          'ideia.dev/service-type': e.service.type,
          'ideia.dev/quality-score': String(e.score),
          'ideia.dev/quality-grade': e.grade,
        },
      },
      spec: {
        type: e.service.type,
        lifecycle: 'production',
        owner: e.service.owner,
        system: e.service.team,
        dependsOn: e.service.dependencies?.map(d => `component:${d}`),
        providesApis: e.service.apis?.map(a => `api:${a}`),
      },
    }));
  }

  async getEntity(name: string): Promise<BackstageEntity | null> {
    const catalog = new CatalogStore(await getKV());
    const entry = await catalog.get(name);
    if (!entry) return null;
    const entities = await this.getEntities();
    return entities.find(e => e.metadata.name === name) || null;
  }
}
```

### 13.2 Catalog Plugin

```typescript
class CatalogPlugin {
  constructor(private provider: IDEEntityProvider) {}

  async refresh(): Promise<number> {
    const entities = await this.provider.getEntities();
    for (const entity of entities) {
      await this.upsertEntity(entity);
    }
    return entities.length;
  }

  private async upsertEntity(entity: BackstageEntity): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/catalog/entities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entity),
    });
    if (!response.ok) {
      console.error(`Failed to upsert entity ${entity.metadata.name}: ${response.statusText}`);
    }
  }

  async deleteStale(maxAgeDays = 7): Promise<number> {
    const entities = await this.provider.getEntities();
    const cutoff = Date.now() - maxAgeDays * 86400000;
    let deleted = 0;
    for (const entity of entities) {
      const entry = await this.provider['getEntity'](entity.metadata.name);
      if (entry && entry.metadata.annotations?.['ideia.dev/last-updated']) {
        const lastUpdated = Number(entry.metadata.annotations['ideia.dev/last-updated']);
        if (lastUpdated < cutoff) {
          await this.deleteEntity(entity.metadata.name);
          deleted++;
        }
      }
    }
    return deleted;
  }

  private async deleteEntity(name: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/catalog/entities/${name}`, { method: 'DELETE' });
  }
}
```

### 13.3 Scaffolder Action

```typescript
class IDEScaffolderAction {
  getAction(): ScaffolderAction {
    return {
      id: 'ideia:template:scaffold',
      description: 'Scaffold a service using IDEIA golden path template',
      schema: {
        input: {
          type: 'object',
          required: ['templateName'],
          properties: {
            templateName: { type: 'string', title: 'Template name' },
            serviceName: { type: 'string', title: 'Service name' },
            owner: { type: 'string', title: 'Owner team' },
            language: { type: 'string', title: 'Programming language' },
          },
        },
      },
      handler: async (ctx: any) => {
        const { templateName, serviceName, owner, language } = ctx.input;
        const registry = new TemplateRegistry();
        await registry.loadFromDir(ctx.workspacePath + '/templates');
        const pipeline = new ScaffoldPipeline(registry, new TemplateRenderer());
        const result = await pipeline.run(templateName, {
          name: serviceName, owner, language,
        }, ctx.workspacePath);
        if (!result.success) throw new Error(result.error);
        return { files: result.files };
      },
    };
  }
}
```

### 13.4 TechDocs Integration

```typescript
class IDETechDocsPublisher {
  async publish(service: string, sourceDir: string): Promise<boolean> {
    const cmd = `npx techdocs-cli generate --source-dir ${sourceDir} --output-dir ./techdocs && npx techdocs-cli publish --publisher-type awsS3 --storage-name ideia-techdocs --entity ${service}`;
    try {
      await exec(cmd);
      return true;
    } catch {
      return false;
    }
  }

  async generateIndex(): Promise<string> {
    const catalog = new CatalogStore(await getKV());
    const entries = await catalog.list();
    let index = '# IDEIA Service Documentation\n\n';
    for (const entry of entries) {
      index += `- [${entry.service.name}](https://techdocs.ideia.dev/${entry.service.name})\n`;
    }
    return index;
  }
}
```

---

## 14. Template Catalog

### 14.1 Available Golden Paths

| Template | Language | Type | Variables | Post-actions |
|----------|----------|------|-----------|-------------|
| `node-api` | TypeScript | API | name, owner, db, auth | npm-install, git-init |
| `python-service` | Python | API | name, owner, framework, python-version | git-init |
| `react-widget` | TypeScript | Web | name, owner, state-manager | npm-install |
| `go-microservice` | Go | Worker | name, owner, transport | git-init |
| `terraform-module` | HCL | Infra | name, provider, region | none |
| `rust-cli` | Rust | CLI | name, owner, args-parser | git-init |
| `spring-boot-api` | Java | API | name, group, package, db | mvn-install |
| `data-pipeline` | Python | Worker | name, source, sink, schedule | git-init |
| `helm-chart` | YAML | Infra | name, namespace, ingress | none |
| `django-admin` | Python | Web | name, owner, db-engine | pip-install, git-init |

### 14.2 Template Metadata Format

```json
{
  "name": "node-api",
  "description": "Node.js Express API with TypeScript",
  "version": "1.2.0",
  "variables": [
    { "name": "name", "description": "Service name", "required": true },
    { "name": "owner", "description": "Team owner", "required": true, "default": "platform" },
    { "name": "db", "description": "Database type", "required": false, "default": "postgres", "type": "choice", "choices": ["postgres", "mysql", "sqlite"] },
    { "name": "auth", "description": "Auth provider", "required": false, "default": "jwt" }
  ],
  "conditions": {
    "src/db/migrations/": { "variable": "db", "notEquals": "sqlite" },
    "src/auth/oauth.ts": { "variable": "auth", "equals": "oauth" }
  },
  "postActions": ["npm-install", "git-init"]
}
```

### 14.3 Template Discovery

```typescript
class TemplateDiscovery {
  async discoverSources(): Promise<string[]> {
    const sources = [
      path.join(__dirname, '../../templates'),
      path.join(os.homedir(), '.ideia/templates'),
      process.env.IDEIA_TEMPLATES_DIR || '',
    ];
    return sources.filter(s => s && fs.existsSync(s));
  }

  async loadAll(registry: TemplateRegistry): Promise<number> {
    const dirs = await this.discoverSources();
    let total = 0;
    for (const dir of dirs) {
      total += await registry.loadFromDir(dir);
    }
    return total;
  }

  async syncFromGit(repo: string, targetDir: string): Promise<void> {
    if (fs.existsSync(targetDir)) {
      await exec(`git -C ${targetDir} pull`);
    } else {
      await exec(`git clone ${repo} ${targetDir}`);
    }
  }
}
```

---

## 15. Quality Integration

### 15.1 ScorecardGate Enforcer

```typescript
interface GateRule {
  category: string;
  minScore: number;
  weight: number;
  blocking: boolean;
}

class ScorecardGate {
  private rules: GateRule[] = [
    { category: 'quality', minScore: 70, weight: 30, blocking: true },
    { category: 'docs', minScore: 50, weight: 15, blocking: false },
    { category: 'reliability', minScore: 60, weight: 20, blocking: true },
    { category: 'observability', minScore: 40, weight: 10, blocking: false },
    { category: 'governance', minScore: 50, weight: 10, blocking: false },
    { category: 'security', minScore: 80, weight: 15, blocking: true },
  ];

  constructor(private scorecard: WeightedScorecard) {}

  async evaluate(service: string): Promise<GateResult> {
    const breakdown = await this.scorecard.categoryBreakdown(service);
    const result = await this.scorecard.compute(service);
    const failures: string[] = [];
    let totalScore = 0;
    let totalWeight = 0;

    for (const rule of this.rules) {
      const data = breakdown.get(rule.category);
      if (!data) {
        if (rule.blocking) failures.push(`Missing category: ${rule.category}`);
        continue;
      }
      const pct = data.max > 0 ? (data.score / data.max) * 100 : 0;
      totalScore += pct * rule.weight;
      totalWeight += rule.weight;
      if (pct < rule.minScore) {
        const msg = `${rule.category}: ${Math.round(pct)}% < ${rule.minScore}%`;
        if (rule.blocking) failures.push(msg);
      }
    }

    const composite = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
    const passed = failures.length === 0;

    return {
      service,
      composite,
      grade: result.grade,
      passed,
      failures,
      breakdown: Object.fromEntries(breakdown),
      timestamp: Date.now(),
    };
  }

  async enforce(service: string, gate: 'commit' | 'pr' | 'release'): Promise<boolean> {
    const result = await this.evaluate(service);
    if (result.passed) return true;

    switch (gate) {
      case 'commit':
        console.error(`Commit blocked for ${service}: ${result.failures.join(', ')}`);
        process.exit(1);
        return false;
      case 'pr':
        console.error(`PR blocked for ${service}: ${result.failures.join(', ')}`);
        return false;
      case 'release':
        console.error(`Release blocked for ${service}: ${result.failures.join(', ')}`);
        return false;
    }
  }
}

interface GateResult {
  service: string;
  composite: number;
  grade: string;
  passed: boolean;
  failures: string[];
  breakdown: Record<string, { score: number; max: number }>;
  timestamp: number;
}
```

### 15.2 CI/CD Pipeline Integration

```typescript
class CIDPIntegration {
  constructor(private gate: ScorecardGate) {}

  async preCommitHook(service: string): Promise<boolean> {
    return this.gate.enforce(service, 'commit');
  }

  async preMergeCheck(service: string): Promise<GateResult> {
    return this.gate.evaluate(service);
  }

  async releaseGate(service: string): Promise<boolean> {
    return this.gate.enforce(service, 'release');
  }

  generateCiStep(service: string): string {
    return `
  - name: Scorecard Gate
    run: |
      npx ideia service scorecard ${service} --ci
  `;
  }

  generateGitHubAction(service: string): string {
    return `
name: Scorecard Gate
on: [pull_request]
jobs:
  scorecard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx ideia service scorecard ${service} --ci
`;
  }
}
```

### 15.3 SLO Monitoring

```typescript
interface SLODefinition {
  name: string;
  target: number;
  window: string;
  category: string;
}

class SloScorecardBridge {
  private slos: SLODefinition[] = [
    { name: 'Test Coverage', target: 80, window: '30d', category: 'quality' },
    { name: 'Uptime', target: 99.9, window: '30d', category: 'reliability' },
    { name: 'Error Budget', target: 95, window: '7d', category: 'reliability' },
    { name: 'P95 Latency', target: 200, window: '7d', category: 'performance' },
    { name: 'Security Score', target: 90, window: '90d', category: 'security' },
  ];

  async calculateSloCompliance(service: string): Promise<Map<string, number>> {
    const compliance = new Map<string, number>();
    for (const slo of this.slos) {
      const actual = await this.measureSlo(service, slo);
      const pct = slo.target > 0 ? Math.min(100, (actual / slo.target) * 100) : 0;
      compliance.set(slo.name, Math.round(pct));
    }
    return compliance;
  }

  private async measureSlo(service: string, slo: SLODefinition): Promise<number> {
    const kv = await getKV();
    const raw = await kv.get(`slo:${service}:${slo.name}`);
    if (!raw) return 0;
    return Number(new TextDecoder().decode(raw));
  }

  async syncToScorecard(service: string, scorecard: WeightedScorecard): Promise<void> {
    const compliance = await this.calculateSloCompliance(service);
    for (const [name, pct] of compliance) {
      if (pct < 80) {
        console.warn(`SLO alert: ${service} ${name} at ${pct}% (target > 80%)`);
      }
    }
  }
}
```

---

## 16. UX

### 16.1 Service Catalog Dashboard (Theia Widget)

```typescript
// packages/ideia-plugin/src/browser/idp-catalog-widget.tsx
export class IDPCatalogWidget extends ReactWidget {
  static ID = 'ideia:idp-catalog';

  constructor(private catalog: CatalogStore) {
    super();
    this.id = IDPCatalogWidget.ID;
    this.title.label = 'Service Catalog';
    this.title.icon = 'fa-database';
    this.title.closable = true;
  }

  async doUpdate(): Promise<void> {
    const entries = await this.catalog.list();
    this.update();
  }

  protected render(): React.ReactNode {
    return (
      <div className='idp-catalog'>
        <div className='idp-catalog-header'>
          <h2>Service Catalog</h2>
          <input type='text' placeholder='Search services...' />
        </div>
        <div className='idp-catalog-grid'>
          {entries.map(entry => (
            <div key={entry.service.name} className={`idp-catalog-card grade-${entry.grade.toLowerCase()}`}>
              <div className='card-header'>
                <span className='service-name'>{entry.service.name}</span>
                <span className={`badge badge-${entry.service.type}`}>{entry.service.type}</span>
              </div>
              <div className='card-body'>
                <p>Owner: {entry.service.owner}</p>
                <p>Team: {entry.service.team}</p>
                <p>Language: {entry.service.language}</p>
                <div className='score-bar'>
                  <div className='score-fill' style={{ width: `${entry.score}%` }} />
                </div>
                <span className={`grade grade-${entry.grade.toLowerCase()}`}>{entry.grade}</span>
              </div>
              <div className='card-actions'>
                <button onClick={() => this.showScorecard(entry.service.name)}>Scorecard</button>
                <button onClick={() => this.openDocs(entry.service.name)}>Docs</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
}
```

### 16.2 CLI Autocomplete

```bash
# Auto-completar para comandos IDP
_IDEIA_IDP_SERVICES=$(IDEIA service list --json | jq -r '.[].name' | tr '\n' ' ')

complete -W "$_IDEIA_IDP_SERVICES" 'IDEIA service scorecard'
complete -W "$_IDEIA_IDP_SERVICES" 'IDEIA service monitoring add'

# Com sugestões de template
_IDEIA_TEMPLATES=$(IDEIA template list --json | jq -r '.[].name' | tr '\n' ' ')

complete -W "$_IDEIA_TEMPLATES" 'IDEIA template use'
```

### 16.3 Onboarding Wizard

```typescript
class OnboardingWizard {
  async start(): Promise<void> {
    console.log('IDEIA IDP Onboarding Wizard');
    console.log('============================\n');

    const name = await this.prompt('Service name: ');
    const type = await this.choice('Service type', ['api', 'worker', 'web', 'cli']);
    const template = await this.choice('Golden path template', this.getTemplateNames());
    const owner = await this.prompt('Owner team: ');

    console.log('\nScaffolding service...');
    await exec(`IDEIA service create ${type} --name ${name} --template ${template} --owner ${owner}`);

    const addScorecard = await this.confirm('Configure quality scorecard?');
    if (addScorecard) {
      await exec(`IDEIA service scorecard ${name} --init`);
    }

    const addCI = await this.confirm('Setup CI/CD pipeline?');
    if (addCI) {
      await exec(`IDEIA action run setup-ci --service ${name}`);
    }

    console.log(`\nService "${name}" is ready!`);
    console.log(`Run 'IDEIA service scorecard ${name}' to view quality`);
  }

  private async prompt(msg: string): Promise<string> {
    return new Promise(resolve => {
      process.stdout.write(msg);
      process.stdin.once('data', data => resolve(data.toString().trim()));
    });
  }

  private async choice(msg: string, options: string[]): Promise<string> {
    console.log(`${msg}:`);
    options.forEach((o, i) => console.log(`  ${i + 1}. ${o}`));
    const answer = await this.prompt(`Choose (1-${options.length}): `);
    return options[parseInt(answer) - 1] || options[0];
  }

  private async confirm(msg: string): Promise<boolean> {
    const answer = await this.prompt(`${msg} (Y/n): `);
    return answer.toLowerCase() !== 'n';
  }

  private getTemplateNames(): string[] {
    return ['node-api', 'python-service', 'react-widget', 'go-microservice'];
  }
}
```

---

## 17. Conexões com Outros Estudos

### 17.1 S54 — Performance

Scorecards alimentam métricas de performance no S54. O `SloScorecardBridge` conecta SLOs de latência e throughput ao scorecard de qualidade. Serviços com score de performance abaixo de 60% recebem alertas automáticos no dashboard.

### 17.2 S70 — Developer Experience (DX)

O catalog dashboard (16.1) e o onboarding wizard (16.3) são implementações diretas de princípios definidos no S70. O CLI autocomplete reduz o tempo de descoberta de comandos. As golden paths garantem consistência entre projetos, eliminando atrito de setup inicial.

### 17.3 S55 — Resiliência

O `ScorecardGate` (15.1) incorpora métricas de resiliência (uptime SLO, error budget) como checks obrigatórios. Serviços com `grade < B` são bloqueados em pipelines de release, garantindo que apenas serviços resilientes cheguem em produção.

### 17.4 S66 — Testing

Scorecards medem cobertura de testes como check primário (peso 25). O `CIDPIntegration` gera steps de CI que rodam testes antes de permitir merge. Templates de golden path incluem configuração de teste por padrão.

### 17.5 Quality Gates

O `ScorecardGate` implementa os 4 gates definidos no Quality Gates (Commit, PR, Release, Sprint). Cada gate avalia categorias diferentes com thresholds distintos:

| Gate | Categories Avaliadas | Threshold Mínimo |
|------|---------------------|-----------------|
| Commit | quality, security | 60% |
| PR | quality, docs, reliability, security | 70% |
| Release | todas as 6 categorias | 80% |
| Sprint | composite score + trends | 75% + sem tendência negativa |

### 17.6 CLI Framework

Todos os comandos IDP (12.1-12.7) seguem o padrão `CliCommandResult` com `success()`/`failure()`, suporte a `--json` e `--verbose`, e registro em audit trail via SHA-256 chain conforme definido no CLI Framework.

### 17.7 Service Catalog (Self-Awareness)

O `CatalogStore` (8.5) integra com o `ServiceCatalog` do módulo de Self-Awareness (77 serviços mapeados), expandindo com scorecards, dependências e golden paths. A descoberta de capabilities do ecossistema é enriquecida com dados de qualidade.

---

## 18. Roadmap

### Fase 1 — Foundation (20h)

| Tarefa | Descrição | Esforço | Dependências |
|--------|-----------|---------|-------------|
| 1.1 | ServiceDefinition + CatalogEntry models | 3h | — |
| 1.2 | CatalogStore com KV namespace | 4h | NATS KV |
| 1.3 | CatalogSearch com filtros | 3h | 1.2 |
| 1.4 | GoldenPathTemplate + renderer básico | 4h | — |
| 1.5 | TemplateRegistry + loadFromDir | 3h | 1.4 |
| 1.6 | CLI service list + template list | 3h | 1.2, 1.5 |

### Fase 2 — Service Catalog (30h)

| Tarefa | Descrição | Esforço |
|--------|-----------|---------|
| 2.1 | CatalogGraph — dependency graph | 4h |
| 2.2 | CatalogSearch avançado (query, groupByOwner) | 3h |
| 2.3 | CLI service create com scaffold | 6h |
| 2.4 | CLI docs publish | 3h |
| 2.5 | Theia IDPCatalogWidget | 8h |
| 2.6 | Template Catalog — 10 golden paths | 6h |

### Fase 3 — Scorecards (25h)

| Tarefa | Descrição | Esforço |
|--------|-----------|---------|
| 3.1 | WeightedScorecard com categorias | 4h |
| 3.2 | ScorecardHistory + KV snapshots | 3h |
| 3.3 | ScorecardTrend + regression alerts | 3h |
| 3.4 | ScorecardReport (markdown generation) | 3h |
| 3.5 | ScorecardGate enforcer (commit/pr/release) | 4h |
| 3.6 | CIDPIntegration — GitHub Actions template | 3h |
| 3.7 | SloScorecardBridge | 3h |
| 3.8 | CLI service scorecard com --report | 2h |

### Fase 4 — Self-Service (25h)

| Tarefa | Descrição | Esforço |
|--------|-----------|---------|
| 4.1 | ActionRegistry + 8 built-in actions | 4h |
| 4.2 | ActionExecutor (local runner) | 4h |
| 4.3 | ActionApproval (3 níveis) | 4h |
| 4.4 | CLI action run | 2h |
| 4.5 | Backstage EntityProvider + refresh | 6h |
| 4.6 | Backstage ScaffolderAction | 3h |
| 4.7 | OnboardingWizard | 2h |

**Total estimado:** 100h distributed across 4 fases, entregando IDP completo com catalog, golden paths, scorecards e self-service actions.

---

## 6. REFERÊNCIAS

1. "Team Topologies" — Skelton & Pais, 2019
2. "Backstage" — Spotify. backstage.io
3. "Internal Developer Platforms" — Humanitec 2024
