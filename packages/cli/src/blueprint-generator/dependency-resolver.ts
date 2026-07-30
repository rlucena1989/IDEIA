import type { ResolvedDependencies, DependencyError, DependencyWarning } from './types';
import { createLogger } from '@ideia/logger';

interface DepEntry {
  version: string;
  type: 'dependency' | 'devDependency' | 'peerDependency' | 'optionalDependency';
  conflict?: boolean;
  source?: string;
}

export class DependencyResolver {
  private registryCache: Map<string, string> = new Map();
  private registryUrl: string;

  constructor(registryUrl = 'https://registry.npmjs.org') {
    this.registryUrl = registryUrl;
  }

  async resolve(
    blueprintDeps: {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
    },
    existingDeps?: Record<string, string>,
  ): Promise<ResolvedDependencies> {
    const allDeps: Record<string, DepEntry> = {};
    const errors: DependencyError[] = [];
    const warnings: DependencyWarning[] = [];

    const sections: [string, 'dependency' | 'devDependency' | 'peerDependency' | 'optionalDependency'][] = [
      ['dependencies', 'dependency'],
      ['devDependencies', 'devDependency'],
      ['peerDependencies', 'peerDependency'],
      ['optionalDependencies', 'optionalDependency'],
    ];

    for (const [sectionKey, depType] of sections) {
      const section = blueprintDeps[sectionKey as keyof typeof blueprintDeps] as Record<string, string> | undefined;
      if (section) {
        for (const [name, version] of Object.entries(section)) {
          if (allDeps[name]) {
            warnings.push({
              code: 'DUPLICATE_DEP',
              package: name,
              message: `Package "${name}" appears in multiple sections. Using first occurrence.`,
            });
            continue;
          }
          allDeps[name] = { version, type: depType, source: 'blueprint' };
        }
      }
    }

    if (existingDeps) {
      for (const [name, version] of Object.entries(existingDeps)) {
        if (allDeps[name]) {
          if (allDeps[name].version !== version) {
            warnings.push({
              code: 'VERSION_CONFLICT',
              package: name,
              message: `Version conflict for "${name}": blueprint has ${allDeps[name].version}, existing has ${version}. Keeping existing.`,
            });
            allDeps[name] = {
              ...allDeps[name],
              version,
              conflict: true,
              source: 'existing',
            };
          }
        } else {
          allDeps[name] = { version, type: 'dependency', source: 'existing' };
        }
      }
    }

    const depNames = Object.keys(allDeps);
    for (const name of depNames) {
      if (allDeps[name].type === 'peerDependency') {
        const runtimeDep = depNames.find(n => n === name && allDeps[n].type === 'dependency');
        if (!runtimeDep) {
          warnings.push({
            code: 'MISSING_PEER_RUNTIME',
            package: name,
            message: `Peer dependency "${name}@${allDeps[name].version}" has no corresponding runtime dependency.`,
          });
        }
      }
    }

    return {
      dependencies: this.filterByType(allDeps, 'dependency'),
      devDependencies: this.filterByType(allDeps, 'devDependency'),
      peerDependencies: this.filterByType(allDeps, 'peerDependency'),
      optionalDependencies: this.filterByType(allDeps, 'optionalDependency'),
      errors,
      warnings,
    };
  }

  async checkLatestVersion(packageName: string): Promise<string> {
    if (this.registryCache.has(packageName)) {
      return this.registryCache.get(packageName) as string;
    }
    try {
      const url = `${this.registryUrl}/${encodeURIComponent(packageName)}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) return 'unknown';
      const data = await response.json() as { 'dist-tags': { latest: string } };
      const latest = data['dist-tags']?.latest || 'unknown';
      this.registryCache.set(packageName, latest);
      return latest;
    } catch {
      return 'unknown';
    }
  }

  async resolveVersions(packages: Record<string, string>): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    for (const [name, version] of Object.entries(packages)) {
      if (version === 'latest' || version === '*') {
        const latest = await this.checkLatestVersion(name);
        result[name] = latest !== 'unknown' ? `^${latest}` : '*';
      } else {
        result[name] = version;
      }
    }
    return result;
  }

  generatePackageJson(
    name: string,
    description: string,
    deps: ResolvedDependencies,
    scripts?: Record<string, string>,
    engines?: Record<string, string>,
  ): string {
    const defaultScripts: Record<string, string> = {
      build: 'tsc',
      dev: 'tsx watch src/index.ts',
      start: 'node dist/index.js',
      test: 'jest --passWithNoTests',
      lint: 'eslint src/ --ext .ts',
    };

    const pkg: Record<string, unknown> = {
      name,
      version: '0.1.0',
      description: description || '',
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      scripts: { ...defaultScripts, ...scripts },
    };

    const depTypes: ('dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies')[] = [
      'dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies',
    ];

    for (const depType of depTypes) {
      const resolved = deps[depType];
      if (resolved && Object.keys(resolved).length > 0) {
        pkg[depType] = resolved;
      }
    }

    if (engines && Object.keys(engines).length > 0) {
      pkg.engines = engines;
    }

    return JSON.stringify(pkg, null, 2);
  }

  mergeDependencyArrays(
    base: Record<string, string>,
    override: Record<string, string>,
  ): Record<string, string> {
    const merged: Record<string, string> = { ...base };
    for (const [name, version] of Object.entries(override)) {
      if (merged[name] && merged[name] !== version) {
        merged[name] = version;
      } else if (!merged[name]) {
        merged[name] = version;
      }
    }
    return merged;
  }

  detectConflicts(deps: Record<string, string>, otherDeps: Record<string, string>): DependencyWarning[] {
    const warnings: DependencyWarning[] = [];
    for (const [name, version] of Object.entries(otherDeps)) {
      if (deps[name] && deps[name] !== version) {
        warnings.push({
          code: 'VERSION_MISMATCH',
          package: name,
          message: `"${name}" has conflicting versions: ${deps[name]} vs ${version}`,
        });
      }
    }
    return warnings;
  }

  private filterByType(deps: Record<string, DepEntry>, type: string): Record<string, string> {
    const filtered: Record<string, string> = {};
    for (const [name, entry] of Object.entries(deps)) {
      if (entry.type === type) {
        filtered[name] = entry.version;
      }
    }
    return filtered;
  }
}
