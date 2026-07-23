#!/usr/bin/env node
/**
 * generate-sbom.js — Gera SBOM (Software Bill of Materials)
 *
 * Usage: node .ai/bin/generate-sbom.js
 * Output: sbom.json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'package.json');
const OUT = path.join(ROOT, 'sbom.json');

if (!fs.existsSync(SRC)) {
  console.error('package.json not found');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(SRC, 'utf-8'));
const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

const components = Object.entries(allDeps).map(([name, version]) => ({
  type: 'library',
  name,
  version: version.replace(/^\^|~|>=|<=|>/g, ''),
  licenses: ['MIT'],
  purl: `pkg:npm/${name}@${version.replace(/^\^|~|>=|<=|>/g, '')}`,
}));

const sbom = {
  $schema: 'https://raw.githubusercontent.com/CycloneDX/bommaster/main/schema/bom-1.5.schema.json',
  bomFormat: 'CycloneDX',
  specVersion: '1.5',
  serialNumber: `urn:uuid:${require('crypto').randomUUID()}`,
  version: 1,
  metadata: {
    timestamp: new Date().toISOString(),
    tools: [{ vendor: 'IDEIA', name: 'sbom-generator', version: '1.0' }],
    component: {
      type: 'application',
      name: pkg.name || '@ai-devkit/monorepo',
      version: pkg.version || '1.0.0-alpha.0',
    },
  },
  components,
};

fs.writeFileSync(OUT, JSON.stringify(sbom, null, 2));
console.log(`SBOM generated: ${OUT}`);
console.log(`Components: ${components.length}`);
