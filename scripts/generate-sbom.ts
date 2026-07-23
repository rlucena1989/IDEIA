import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = resolve(__dirname, '..');

interface PackageInfo {
  name: string;
  version: string;
  license?: string;
  dependencies: Record<string, string>;
  devDependencies?: Record<string, string>;
  path: string;
}

interface SBOMEntry {
  name: string;
  version: string;
  license?: string;
  purl: string;
  dependencyOf: string;
  isDev: boolean;
  hash: string;
}

interface SBOMReport {
  bomFormat: string;
  specVersion: string;
  serialNumber: string;
  version: number;
  metadata: {
    timestamp: string;
    tools: { name: string; version: string }[];
    component: { name: string; version: string; type: string };
  };
  components: SBOMEntry[];
  dependencies: { ref: string; dependsOn: string[] }[];
}

function findPackageJsons(dir: string, maxDepth = 4): string[] {
  const results: string[] = [];
  if (maxDepth <= 0) return results;
  try {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry.startsWith('.') || entry === '.stryker-tmp') continue;
      const fullPath = join(dir, entry);
      if (existsSync(fullPath)) {
        const stat = require('fs').statSync(fullPath);
        if (stat.isDirectory()) {
          results.push(...findPackageJsons(fullPath, maxDepth - 1));
        } else if (entry === 'package.json' && !fullPath.includes('node_modules')) {
          results.push(fullPath);
        }
      }
    }
  } catch { }
  return results;
}

function detectLicense(pkg: Record<string, unknown>): string | undefined {
  if (typeof pkg.license === 'string') return pkg.license;
  if (Array.isArray(pkg.license)) return pkg.license.join(', ');
  if (pkg.licenses && Array.isArray(pkg.licenses)) {
    return pkg.licenses.map((l: any) => l.type || l).join(', ');
  }
  return undefined;
}

function purl(name: string, version: string): string {
  return `pkg:npm/${name}@${version}`;
}

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function generateSBOM(): SBOMReport {
  const rootPackagePath = join(ROOT, 'package.json');
  let rootPkg: Record<string, unknown> = {};
  try {
    rootPkg = JSON.parse(readFileSync(rootPackagePath, 'utf8'));
  } catch { }

  const allPackageJsons = findPackageJsons(ROOT, 4);
  const monorepoPackages: PackageInfo[] = [];
  const externalDeps = new Map<string, { name: string; version: string; license?: string; isDev: boolean; dependencyOf: string[] }>();

  for (const pkgPath of allPackageJsons) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      const relPath = pkgPath.replace(ROOT, '').replace(/\\/g, '/');
      const info: PackageInfo = {
        name: pkg.name || 'unnamed',
        version: pkg.version || '0.0.0',
        license: detectLicense(pkg),
        dependencies: pkg.dependencies || {},
        devDependencies: pkg.devDependencies || {},
        path: relPath,
      };
      monorepoPackages.push(info);

      for (const [depName, depVer] of Object.entries(info.dependencies)) {
        const key = `${depName}@${depVer}`;
        if (!externalDeps.has(key)) {
          externalDeps.set(key, { name: depName, version: String(depVer), isDev: false, dependencyOf: [] });
        }
        externalDeps.get(key)!.dependencyOf.push(info.name);
      }

      for (const [depName, depVer] of Object.entries(info.devDependencies || {})) {
        const key = `${depName}@${depVer}`;
        if (!externalDeps.has(key)) {
          externalDeps.set(key, { name: depName, version: String(depVer), isDev: true, dependencyOf: [] });
        }
        externalDeps.get(key)!.dependencyOf.push(info.name);
      }
    } catch { }
  }

  const components: SBOMEntry[] = [];

  for (const pkg of monorepoPackages) {
    components.push({
      name: pkg.name,
      version: pkg.version,
      license: pkg.license,
      purl: purl(pkg.name, pkg.version),
      dependencyOf: 'root',
      isDev: false,
      hash: hashContent(JSON.stringify(pkg)),
    });
  }

  for (const [, dep] of externalDeps) {
    components.push({
      name: dep.name,
      version: dep.version,
      purl: purl(dep.name, dep.version),
      dependencyOf: dep.dependencyOf.join(', '),
      isDev: dep.isDev,
      hash: hashContent(`${dep.name}@${dep.version}`),
    });
  }

  const dependencyMap = new Map<string, string[]>();
  for (const comp of components) {
    if (!dependencyMap.has(comp.purl)) {
      dependencyMap.set(comp.purl, []);
    }
  }
  for (const [, dep] of externalDeps) {
    const depPurl = purl(dep.name, dep.version);
    for (const parentName of dep.dependencyOf) {
      const parent = components.find(c => c.name === parentName);
      if (parent) {
        const existing = dependencyMap.get(parent.purl) || [];
        if (!existing.includes(depPurl)) {
          existing.push(depPurl);
          dependencyMap.set(parent.purl, existing);
        }
      }
    }
  }

  const serialNumber = `urn:uuid:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [{ name: 'IDEIA SBOM Generator', version: '1.0.0' }],
      component: {
        name: String(rootPkg.name || 'IDEIA'),
        version: String(rootPkg.version || '1.0.0'),
        type: 'application',
      },
    },
    components,
    dependencies: Array.from(dependencyMap.entries()).map(([ref, dependsOn]) => ({
      ref,
      dependsOn: dependsOn.filter(Boolean),
    })),
  };
}

function main(): void {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const outputFile = args.includes('--output') ? args[args.indexOf('--output') + 1] : null;

  const sbom = generateSBOM();

  console.log(`\n=== IDEIA SBOM (CycloneDX) ===\n`);
  console.log(`Generated: ${sbom.metadata.timestamp}`);
  console.log(`Total components: ${sbom.components.length}`);
  console.log(`  Monorepo packages: ${sbom.components.filter(c => !c.isDev && c.dependencyOf === 'root').length}`);
  console.log(`  External dependencies: ${sbom.components.filter(c => c.dependencyOf !== 'root').length}`);
  console.log(`  Dev dependencies: ${sbom.components.filter(c => c.isDev).length}`);

  if (jsonOutput || outputFile) {
    const json = JSON.stringify(sbom, null, 2);
    if (outputFile) {
      writeFileSync(join(ROOT, outputFile), json, 'utf8');
      console.log(`\nSBOM written to ${outputFile}`);
    } else {
      console.log(`\nFull JSON:\n${json}`);
    }
  }
}

if (require.main === module) {
  main();
}

export { generateSBOM, SBOMReport, SBOMEntry };
