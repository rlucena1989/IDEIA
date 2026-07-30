import fs from 'fs';
import path from 'path';
import { createLogger } from '@ideia/logger';
import type { IEventBus } from '@ideia/event-bus';
import { emitScanResult } from './bus-integration';
import {
  ProjectScanResult,
  ProjectTech,
  ProjectStructure,
  ProjectSize,
  ScanOptions,
  DEFAULT_SCAN_OPTIONS,
  TECH_PATTERNS,
} from './types';

const log = createLogger('project-scanner');

export class ProjectScanner {
  private options: ScanOptions;
  private eventBus: IEventBus | null;

  constructor(options?: Partial<ScanOptions>, eventBus?: IEventBus) {
    this.options = { ...DEFAULT_SCAN_OPTIONS, ...options };
    this.eventBus = eventBus ?? null;
  }

  async scan(rootDir: string): Promise<ProjectScanResult> {
    const start = Date.now();
    const resolvedRoot = path.resolve(rootDir);
    const projectName = path.basename(resolvedRoot);

    const allFiles: string[] = [];
    const detectedTechs = new Map<string, ProjectTech>();
    const languageStats = new Map<string, { files: number; lines: number }>();
    let totalBytes = 0;
    let sourceBytes = 0;
    let sourceLines = 0;
    let commentLines = 0;
    let blankLines = 0;
    let dirCount = 0;
    let configFiles = 0;
    let testFiles = 0;
    let docFiles = 0;
    let assetFiles = 0;

    const excludedSet = new Set(this.options.excludeDirs ?? []);
    const excludePatterns = (this.options.excludePatterns ?? []).map(p => {
      if (p.startsWith('*.')) return new RegExp('\\' + p.slice(1) + '$', 'i');
      return new RegExp(p, 'i');
    });

    const walkDir = (dir: string, depth: number): void => {
      if (depth > (this.options.maxDepth ?? 10)) return;
      if (allFiles.length > (this.options.maxFiles ?? 10000)) return;
      let entries: string[];
      try {
        entries = fs.readdirSync(dir);
      } catch {
        return;
      }
      dirCount++;
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        let stat: fs.Stats;
        try {
          stat = fs.statSync(fullPath);
        } catch {
          continue;
        }
        if (stat.isDirectory()) {
          if (!excludedSet.has(entry) && !entry.startsWith('.')) {
            walkDir(fullPath, depth + 1);
          }
        } else if (stat.isFile()) {
          if (excludePatterns.some(r => r.test(entry))) continue;
          allFiles.push(fullPath);
          totalBytes += stat.size;

          const ext = path.extname(entry).toLowerCase();
          if (['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.kt', '.swift',
               '.rb', '.php', '.cs', '.cpp', '.c', '.h', '.hpp', '.dart', '.ex', '.exs',
               '.hs', '.scala', '.zig', '.vue', '.css', '.scss', '.less', '.html', '.json',
               '.yaml', '.yml', '.toml', '.xml', '.md'].includes(ext)) {
            sourceBytes += stat.size;
            try {
              const content = fs.readFileSync(fullPath, 'utf-8');
              const lines = content.split('\n');
              sourceLines += lines.length;
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.length === 0) {
                  blankLines++;
                } else if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*') ||
                           trimmed.startsWith('*') || trimmed.startsWith('--')) {
                  commentLines++;
                }
              }
              const langKey = ext.replace('.', '').toLowerCase();
              const existing = languageStats.get(langKey) ?? { files: 0, lines: 0 };
              existing.files++;
              existing.lines += lines.length;
              languageStats.set(langKey, existing);
            } catch (err) { log.warn('file scan failed', { error: String(err) }); }
          }

          if (entry.endsWith('.test.ts') || entry.endsWith('.spec.ts') || entry.endsWith('.test.js') ||
              entry.endsWith('.test.py') || entry.includes('__tests__')) {
            testFiles++;
          }

          if (entry.endsWith('.md') || entry.endsWith('.txt') || entry.endsWith('.rst')) {
            docFiles++;
          }

          if (['.json', '.yaml', '.yml', '.toml', '.xml', '.ini', '.cfg'].includes(ext) ||
              entry === 'Dockerfile' || entry === '.dockerignore' || entry.endsWith('.config.js') ||
              entry.endsWith('.config.ts') || entry.startsWith('.') && !entry.endsWith('.md')) {
            configFiles++;
          }

          if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.eot', '.ttf'].includes(ext)) {
            assetFiles++;
          }

          if (this.options.detectTechs) {
            for (const tp of TECH_PATTERNS) {
              if (tp.pattern.test(entry)) {
                if (!detectedTechs.has(tp.name)) {
                  detectedTechs.set(tp.name, { name: tp.name, category: tp.category, confidence: 0.5 });
                }
                const tech = detectedTechs.get(tp.name);
                if (!tech) continue;
                tech.confidence = Math.min(1, tech.confidence + 0.1);
              }
            }
            if (entry === 'package.json') {
              try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                const pkg = JSON.parse(content);
                const deps = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string> | undefined;
                if (deps) {
                  for (const depName of Object.keys(deps)) {
                    for (const tp of TECH_PATTERNS) {
                      if (tp.versionPattern && tp.versionPattern.test(content)) {
                        const tech = detectedTechs.get(tp.name);
                        if (tech) {
                          const versionMatch = tp.versionPattern.exec(content);
                          if (versionMatch && versionMatch[1]) {
                            tech.version = versionMatch[1];
                          }
                        }
                      }
                    }
                    const reactMatch = depName.match(/^react/i);
                    if (reactMatch) {
                      detectedTechs.set('React', { name: 'React', category: 'framework', version: deps[depName]?.replace('^', ''), confidence: 1 });
                    }
                    if (depName === 'express') {
                      detectedTechs.set('Express', { name: 'Express', category: 'framework', version: deps[depName]?.replace('^', ''), confidence: 1 });
                    }
                    if (depName === 'next' || depName === 'next.js' || depName === 'next') {
                      detectedTechs.set('Next.js', { name: 'Next.js', category: 'framework', version: deps[depName]?.replace('^', ''), confidence: 1 });
                    }
                    if (depName === 'vue') {
                      detectedTechs.set('Vue', { name: 'Vue', category: 'framework', version: deps[depName]?.replace('^', ''), confidence: 1 });
                    }
                    if (depName === '@angular/core') {
                      detectedTechs.set('Angular', { name: 'Angular', category: 'framework', version: deps[depName]?.replace('^', ''), confidence: 1 });
                    }
                    if (depName === 'jest') {
                      detectedTechs.set('Jest', { name: 'Jest', category: 'testing', version: deps[depName]?.replace('^', ''), confidence: 1 });
                    }
                    if (depName === 'typescript') {
                      detectedTechs.set('TypeScript', { name: 'TypeScript', category: 'language', version: deps[depName]?.replace('^', ''), confidence: 1 });
                    }
                    if (depName === 'prisma' || depName === 'typeorm' || depName === 'pg' || depName === 'postgres') {
                      detectedTechs.set('PostgreSQL', { name: 'PostgreSQL', category: 'database', confidence: 0.7 });
                    }
                    if (depName === 'mongoose' || depName === 'mongodb') {
                      detectedTechs.set('MongoDB', { name: 'MongoDB', category: 'database', confidence: 0.7 });
                    }
                    if (depName === 'ioredis' || depName === 'redis') {
                      detectedTechs.set('Redis', { name: 'Redis', category: 'database', confidence: 0.7 });
                    }
                    if (depName === 'docker' || depName === 'docker-compose') {
                      detectedTechs.set('Docker', { name: 'Docker', category: 'tooling', confidence: 0.7 });
                    }
                  }
                }
              } catch (err) { log.warn('dependency scan failed', { error: String(err) }); }
            }
          }
        }
      }
    };

    walkDir(resolvedRoot, 0);

    const structure: ProjectStructure = {
      directories: dirCount,
      files: allFiles.length,
      sourceFiles: allFiles.filter(f => ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.kt', '.swift',
        '.rb', '.php', '.cs', '.cpp', '.c', '.h', '.hpp', '.dart', '.ex', '.exs', '.hs', '.scala', '.zig', '.vue',
        '.css', '.scss', '.less', '.html'].includes(path.extname(f).toLowerCase())).length,
      configFiles,
      testFiles,
      documentationFiles: docFiles,
      assetFiles,
    };

    const size: ProjectSize = {
      totalBytes,
      sourceBytes,
      linesOfCode: sourceLines,
      sourceLines,
      commentLines,
      blankLines,
    };

    const totalLangLines = Array.from(languageStats.values()).reduce((s, ls) => s + ls.lines, 0) || 1;
    const languages = Array.from(languageStats.entries())
      .map(([name, stats]) => ({
        name: name.toUpperCase(),
        files: stats.files,
        lines: stats.lines,
        percentage: Math.round((stats.lines / totalLangLines) * 100) / 100,
      }))
      .sort((a, b) => b.files - a.files);

    const durationMs = Date.now() - start;
    log.info('Project scan complete', { projectName, files: allFiles.length, durationMs });

    const result: ProjectScanResult = {
      projectName,
      rootDir: resolvedRoot,
      techs: Array.from(detectedTechs.values()).sort((a, b) => b.confidence - a.confidence),
      structure,
      size,
      languages,
      scannedAt: new Date().toISOString(),
      durationMs,
    };

    if (this.eventBus) {
      emitScanResult(this.eventBus, result);
    }

    return result;
  }

  setOptions(options: Partial<ScanOptions>): void {
    this.options = { ...this.options, ...options };
  }
}

export function createProjectScanner(options?: Partial<ScanOptions>): ProjectScanner {
  return new ProjectScanner(options);
}
