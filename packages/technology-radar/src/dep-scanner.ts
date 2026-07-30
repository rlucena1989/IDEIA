import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '@ideia/logger';
import { Technology } from './types';

export interface DepInfo {
  name: string;
  version: string;
  isDev: boolean;
  category: string | null;
}

export interface DepScanResult {
  project: string;
  dependencies: DepInfo[];
  devDependencies: DepInfo[];
  totalCount: number;
  matchedWithRadar: Array<{ dep: DepInfo; radarTech: Technology }>;
  unmatched: DepInfo[];
}

export class DepScanner {
  private logger = createLogger('dep-scanner');

  async scanProjectDependencies(projectDir?: string): Promise<DepScanResult> {
    const dir = projectDir ?? process.cwd();
    const pkgPath = path.join(dir, 'package.json');

    if (!fs.existsSync(pkgPath)) {
      this.logger.warn(`No package.json found at ${pkgPath}`);
      return {
        project: dir,
        dependencies: [],
        devDependencies: [],
        totalCount: 0,
        matchedWithRadar: [],
        unmatched: [],
      };
    }

    let pkg: { name?: string; dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    try {
      pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    } catch {
      this.logger.warn(`Invalid package.json at ${pkgPath}`);
      return {
        project: dir,
        dependencies: [],
        devDependencies: [],
        totalCount: 0,
        matchedWithRadar: [],
        unmatched: [],
      };
    }

    const deps = this.parseDeps(pkg.dependencies ?? {}, false);
    const devDeps = this.parseDeps(pkg.devDependencies ?? {}, true);

    return {
      project: pkg.name ?? dir,
      dependencies: deps,
      devDependencies: devDeps,
      totalCount: deps.length + devDeps.length,
      matchedWithRadar: [],
      unmatched: [...deps, ...devDeps],
    };
  }

  crossReferenceWithRadar(result: DepScanResult, radar: Technology[]): DepScanResult {
    const radarByName = new Map(radar.map(t => [t.name.toLowerCase(), t]));

    const matched: Array<{ dep: DepInfo; radarTech: Technology }> = [];
    const unmatched: DepInfo[] = [];

    for (const dep of [...result.dependencies, ...result.devDependencies]) {
      const depName = dep.name.toLowerCase().replace(/^@[^/]+\//, '');
      const match = radarByName.get(depName) ?? radarByName.get(dep.name);

      if (match) {
        matched.push({ dep, radarTech: match });
      } else {
        unmatched.push(dep);
      }
    }

    return {
      ...result,
      matchedWithRadar: matched,
      unmatched,
    };
  }

  private parseDeps(deps: Record<string, string>, isDev: boolean): DepInfo[] {
    return Object.entries(deps).map(([name, version]) => ({
      name,
      version: version.replace(/^[\^~]/, ''),
      isDev,
      category: this.inferCategory(name),
    }));
  }

  private inferCategory(name: string): string | null {
    if (name.startsWith('@types/')) return 'types';
    if (name.includes('eslint') || name.includes('prettier')) return 'lint';
    if (name.includes('jest') || name.includes('mocha') || name.includes('vitest')) return 'test';
    if (name.includes('webpack') || name.includes('vite') || name.includes('rollup')) return 'build';
    if (name.includes('react') || name.includes('vue') || name.includes('angular')) return 'framework';
    if (name.includes('express') || name.includes('koa') || name.includes('fastify')) return 'server';
    if (name.includes('eslint') || name.includes('prettier')) return 'dev-tool';
    return null;
  }
}
