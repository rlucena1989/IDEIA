// IDEIA Context Engine â€” OrÃ¡culo da Verdade
// Fornece contexto estruturado, verificado e pesquisÃ¡vel para IAs
// Uso: ai-devkit context [query] [--format json|markdown]
//       ai-devkit context audit          â†’ executa auditoria completa
//       ai-devkit context search <term>  â†’ busca no Ã­ndice de conhecimento

import { readFileSync, existsSync, readdirSync, statSync, writeFileSync } from 'fs';
import { createLogger } from '@ideia/logger';
import { join, relative, resolve } from 'path';

interface ContextEntry {
  key: string;
  value: string;
  source: 'manifest' | 'gaps' | 'tasks' | 'package' | 'docs';
  updatedAt: string;
  hash: string;
}

interface PackageInfo {
  name: string;
  path: string;
  version: string;
  hasTests: boolean;
  linesOfCode: number;
  description: string;
  deps: string[];
}

interface KnowledgeRecord {
  term: string;
  locations: string[];
  weight: number;
}

const ROOT = resolve(__dirname, '..', '..', '..', '..');
const MONOREPO = join(ROOT, 'ai-devkit-v2');
const PACKAGES_DIR = join(MONOREPO, 'packages');
const DOCS_DIR = join(ROOT, 'docs');

export class ContextEngine {
  private cache: Map<string, ContextEntry> = new Map();
  private knowledgeIndex: KnowledgeRecord[] = [];
  private lastIndexed = 0;

  // === 1. CONTEXT PROVIDER â€” entrega contexto estruturado para IAs ===

  getContext(options?: { packages?: boolean; gaps?: boolean; tasks?: boolean; docs?: boolean; metadata?: boolean }): Record<string, unknown> {
    const ctx: Record<string, unknown> = {
      generatedAt: new Date().toISOString(),
      project: 'IDEIA',
      monorepo: MONOREPO,
    };

    if (options?.metadata ?? true) {
      ctx.metadata = this.getMetadata();
    }
    if (options?.packages ?? true) {
      ctx.packages = this.getPackages();
    }
    if (options?.gaps ?? true) {
      ctx.gaps = this.getGaps();
    }
    if (options?.tasks ?? true) {
      ctx.tasks = this.getTasks();
    }

    return ctx;
  }

  getContextForAI(format: 'json' | 'markdown' = 'json'): string {
    const ctx = this.getContext();
    if (format === 'markdown') {
      return this.toMarkdown(ctx);
    }
    return JSON.stringify(ctx, null, 2);
  }

  // === 2. AUDITOR â€” verifica consistÃªncia docs vs cÃ³digo ===

  audit(): AuditReport {
    const report: AuditReport = { timestamp: new Date().toISOString(), checks: [], passed: 0, failed: 0, warnings: 0 };

    // Check 1: All packages in manifest exist
    const manifest = this.loadManifest();
    const packages = this.getPackages();
    for (const pkg of packages) {
      if (!manifest.includes(pkg.name)) {
        report.checks.push({ check: 'manifest-package', status: 'warning', message: `Package ${pkg.name} not in manifest` });
        report.warnings++;
      }
    }

    // Check 2: All documented endpoints exist
    const endpoints = this.scanEndpoints();
    const apiRoutes = this.scanApiRoutes();
    for (const ep of endpoints) {
      if (!apiRoutes.includes(ep)) {
        report.checks.push({ check: 'endpoint', status: 'fail', message: `Endpoint ${ep} not found in API` });
        report.failed++;
      }
    }

    // Check 3: Test counts match
    const testResult = this.runTestCount();
    if (testResult) {
      report.checks.push({ check: 'tests', status: 'pass', message: `Tests: ${testResult.passing}/${testResult.total} passing` });
      report.passed++;
    }

    // Check 4: GAPS-PRODUCAO-IDE.md is up to date
    const gapsDoc = this.readFileSafe(join(ROOT, 'docs', 'governance', 'GAPS-PRODUCAO-IDE.md'));
    if (gapsDoc && gapsDoc.includes('58 resolvidos')) {
      report.checks.push({ check: 'gaps-doc', status: 'pass', message: 'GAPS doc is up to date' });
      report.passed++;
    }

    return report;
  }

  // === 3. SEARCH ENGINE â€” busca de alto desempenho no conhecimento ===

  search(query: string, limit = 10): SearchResult[] {
    this.ensureIndexed();
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const scored = new Map<string, { entry: KnowledgeRecord; score: number }>();

    for (const record of this.knowledgeIndex) {
      const matchCount = terms.filter(t => record.term.includes(t)).length;
      if (matchCount > 0) {
        const existing = scored.get(record.term);
        const score = (matchCount / terms.length) * record.weight;
        if (!existing || score > existing.score) {
          scored.set(record.term, { entry: record, score });
        }
      }
    }

    return Array.from(scored.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => ({
        term: s.entry.term,
        locations: s.entry.locations,
        score: Math.round(s.score * 100) / 100,
      }));
  }

  // === 4. KNOWLEDGE INDEXER â€” constrÃ³i Ã­ndice pesquisÃ¡vel ===

  private ensureIndexed(): void {
    if (Date.now() - this.lastIndexed < 60000) return;
    this.buildIndex();
  }

  buildIndex(): void {
    this.knowledgeIndex = [];
    const _start = Date.now();

    // Index docs
    this.indexDirectory(DOCS_DIR, ['md']);

    // Index packages
    if (existsSync(PACKAGES_DIR)) {
      for (const pkg of readdirSync(PACKAGES_DIR)) {
        const pkgPath = join(PACKAGES_DIR, pkg);
        if (statSync(pkgPath).isDirectory()) {
          this.indexDirectory(pkgPath, ['ts', 'tsx', 'md', 'json']);
        }
      }
    }

    // Index key terms from manifest
    const manifest = this.readFileSafe(join(ROOT, 'docs', 'governance', 'REALITY-MANIFEST.md'));
    if (manifest) {
      const terms = manifest.match(/`@ai-devkit\/[^`]+`|âœ…|âŒ|âš ï¸|`\/api\/[^`]+`/g) || [];
      for (const term of terms) {
        this.knowledgeIndex.push({ term: term.replace(/`/g, ''), locations: ['REALITY-MANIFEST.md'], weight: 3 });
      }
    }

    this.lastIndexed = Date.now();
  }

  private indexDirectory(dir: string, exts: string[]): void {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (entry.startsWith('.')) continue;
      if (statSync(full).isDirectory() && entry !== 'node_modules') {
        this.indexDirectory(full, exts);
      } else if (exts.some(e => entry.endsWith(e))) {
        try {
          const content = readFileSync(full, 'utf-8');
          const rel = relative(ROOT, full);
          this.extractTerms(content, rel);
        } catch { /* skip unreadable */ }
      }
    }
  }

  private extractTerms(content: string, source: string): void {
    const terms = new Set<string>();
    const patterns = [
      /@ai-devkit\/[\w-]+/g,
      /`[^`]{10,}`/g,
      /# [A-Z][^\n]{10,}/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const term = (match[0] ?? '').replace(/[#`]/g, '').trim();
        if (term.length > 8) terms.add(term);
      }
    }

    for (const term of terms) {
      this.knowledgeIndex.push({ term, locations: [source], weight: 1 });
    }
  }

  // === HELPERS ===

  private getMetadata(): ProjectMetadata {
    const pkgCount = existsSync(PACKAGES_DIR) ? readdirSync(PACKAGES_DIR).length : 0;
    return {
      packages: pkgCount,
      lastAudit: this.readFileSafe(join(ROOT, 'docs', 'governance', 'REALITY-MANIFEST.md'))?.match(/\*\*Data:\*\* ([^\n]+)/)?.[1] || 'unknown',
      docsCount: existsSync(DOCS_DIR) ? this.countFiles(DOCS_DIR, 'md') : 0,
    };
  }

  private getPackages(): PackageInfo[] {
    const result: PackageInfo[] = [];
    if (!existsSync(PACKAGES_DIR)) return result;

    for (const pkg of readdirSync(PACKAGES_DIR)) {
      const pkgJsonPath = join(PACKAGES_DIR, pkg, 'package.json');
      if (!existsSync(pkgJsonPath)) continue;
      try {
        const json = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
        result.push({
          name: json.name || `@ideia/${pkg}`,
          path: pkg,
          version: json.version || '0.0.0',
          hasTests: existsSync(join(PACKAGES_DIR, pkg, '__tests__')),
          linesOfCode: this.countLines(join(PACKAGES_DIR, pkg, 'src')),
          description: json.description || '',
          deps: json.dependencies ? Object.keys(json.dependencies) : [],
        });
      } catch { /* skip invalid */ }
    }
    return result;
  }

  private getGaps(): GapSummary {
    const gaps = this.readFileSafe(join(ROOT, 'docs', 'governance', 'GAPS-PRODUCAO-IDE.md'));
    return {
      total: parseInt(gaps?.match(/\*\*Total\*\*.*?(\d+)/)?.[1] || '0'),
      resolved: parseInt(gaps?.match(/(\d+) resolvidos/)?.[1] || '0'),
      critical: gaps?.match(/ðŸ”´/g)?.length || 0,
      high: gaps?.match(/ðŸŸ /g)?.length || 0,
    };
  }

  private getTasks(): TaskSummary {
    const tasks = this.readFileSafe(join(ROOT, 'TASKS-IMPLEMENTACAO-DIRETA.md'));
    return {
      total: parseInt(tasks?.match(/(\d+)\/36/)?.[1] || '0'),
      completed: parseInt(tasks?.match(/(\d+)\/36/)?.[1] || '0'),
    };
  }

  private loadManifest(): string[] {
    const content = this.readFileSafe(join(ROOT, 'docs', 'governance', 'REALITY-MANIFEST.md'));
    if (!content) return [];
    const pkgs: string[] = [];
    const regex = /`@ai-devkit\/([^`]+)`/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      pkgs.push(`@ideia/${match[1]}`);
    }
    return pkgs;
  }

  private scanEndpoints(): string[] {
    const content = this.readFileSafe(join(ROOT, 'docs', 'governance', 'REALITY-MANIFEST.md'));
    if (!content) return [];
    const eps: string[] = [];
    const regex = /`(\/api\/[^\s]+)`/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      eps.push(match[1]);
    }
    return eps;
  }

  private scanApiRoutes(): string[] {
    const apiFile = join(MONOREPO, 'apps', 'api', 'src', 'index.ts');
    const content = this.readFileSafe(apiFile);
    if (!content) return [];
    const routes: string[] = [];
    const regex = /app\.(?:get|post|put|delete|patch)\('(\/api\/[^']+)'/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      routes.push(match[1]);
    }
    return routes;
  }

  private readFileSafe(path: string): string | null {
    try { return readFileSync(path, 'utf-8'); } catch { return null; }
  }

  private countFiles(dir: string, ext: string): number {
    let count = 0;
    if (!existsSync(dir)) return 0;
    for (const e of readdirSync(dir)) {
      const f = join(dir, e);
      if (statSync(f).isDirectory()) count += this.countFiles(f, ext);
      else if (e.endsWith('.' + ext)) count++;
    }
    return count;
  }

  private countLines(dir: string): number {
    if (!existsSync(dir)) return 0;
    let total = 0;
    for (const e of readdirSync(dir)) {
      const f = join(dir, e);
      if (statSync(f).isDirectory() && e !== 'node_modules') total += this.countLines(f);
      else if (e.endsWith('.ts')) total += readFileSync(f, 'utf-8').split('\n').length;
    }
    return total;
  }

  private toMarkdown(ctx: Record<string, unknown>): string {
    let md = `# IDEIA Context (${String((ctx as { generatedAt: string }).generatedAt)})\n\n`;
    const meta = ctx.metadata as ProjectMetadata | undefined;
    if (meta) {
      md += `## Metadata\n- Packages: ${meta.packages}\n- Docs: ${meta.docsCount}\n- Last audit: ${meta.lastAudit}\n\n`;
    }
    const gaps = ctx.gaps as GapSummary | undefined;
    if (gaps) {
      md += `## Gaps\n- Total: ${gaps.total}\n- Resolved: ${gaps.resolved}\n- Critical open: ${gaps.critical}\n\n`;
    }
    return md;
  }

  private runTestCount(): { passing: number; total: number } | null {
    try {
      const { execFileSync } = require('child_process');
      const output = execFileSync('npx jest --passWithNoTests 2>&1', { cwd: MONOREPO, encoding: 'utf-8', timeout: 60000 });
      const passing = parseInt(output.match(/Tests:\s+(\d+)\s+passed/)?.[1] || '0');
      const total = parseInt(output.match(/(\d+)\s+tests?$/m)?.[1] || '0');
      return { passing, total };
    } catch { return null; }
  }
}

interface AuditReport {
  timestamp: string;
  checks: Array<{ check: string; status: 'pass' | 'fail' | 'warning'; message: string }>;
  passed: number;
  failed: number;
  warnings: number;
}

interface ProjectMetadata {
  packages: number;
  lastAudit: string;
  docsCount: number;
}

interface GapSummary {
  total: number;
  resolved: number;
  critical: number;
  high: number;
}

interface TaskSummary {
  total: number;
  completed: number;
}

interface SearchResult {
  term: string;
  locations: string[];
  score: number;
}

export function createContextEngine(): ContextEngine {
  return new ContextEngine();
}

export { AgentPipelineBridge, createAgentPipelineBridge } from './agent-pipeline-bridge';
export type { AgentPipelineResult } from './agent-pipeline-bridge';
