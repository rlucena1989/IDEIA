#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { parseArgs, printHelp, ensureDir, log, info, warn } = require('./lib/common');

const args = parseArgs(process.argv.slice(2));

if (args.help || args._.length === 0) {
  printHelp(
    'test-generate.js — Gera arquivo de teste para um modulo TypeScript',
    'node .ai/bin/test-generate.js <path/to/file.ts> [--type unit|integration]',
    [
      '--type <type>  unit (default) ou integration',
    ]
  );
  process.exit(0);
}

const targetFile = args._[0];
const testType = args.type || 'unit';
const fullPath = path.resolve(process.cwd(), targetFile);

if (!fs.existsSync(fullPath)) {
  console.error(`File not found: ${targetFile}`);
  process.exit(1);
}

const content = fs.readFileSync(fullPath, 'utf-8');
const fileName = path.basename(targetFile, path.extname(targetFile));
const testDir = path.join(path.dirname(fullPath), '__tests__');
const testFile = path.join(testDir, `${fileName}.test.ts`);

const exportPatterns = [
  /export\s+(?:async\s+)?function\s+(\w+)/g,
  /export\s+class\s+(\w+)/g,
  /export\s+const\s+(\w+)/g,
];

const foundExports = [];
for (const pattern of exportPatterns) {
  let match;
  while ((match = pattern.exec(content)) !== null) {
    foundExports.push(match[1]);
  }
}

const hasDefault = /export\s+default\s+/.test(content);
const relativeImport = path.relative(testDir, fullPath).replace(/\\/g, '/').replace(/\.ts$/, '');

let testContent = `import `;
if (hasDefault) {
  testContent += `DefaultExport, { ${foundExports.join(', ')} } from '${relativeImport}';\n`;
} else if (foundExports.length > 0) {
  testContent += `{ ${foundExports.join(', ')} } from '${relativeImport}';\n`;
} else {
  testContent += `* as Module from '${relativeImport}';\n`;
}

testContent += `\ndescribe('${fileName}', () => {\n`;

if (foundExports.length > 0) {
  for (const exp of foundExports) {
    testContent += `  describe('${exp}', () => {\n`;
    testContent += `    it('should be defined', () => {\n`;
    testContent += `      expect(${exp}).toBeDefined();\n`;
    testContent += `    });\n`;
    testContent += `  });\n\n`;
  }
} else if (hasDefault) {
  testContent += `  it('should have a default export', () => {\n`;
  testContent += `    expect(DefaultExport).toBeDefined();\n`;
  testContent += `  });\n`;
} else {
  testContent += `  it('should export something', () => {\n`;
  testContent += `    expect(Module).toBeDefined();\n`;
  testContent += `  });\n`;
}

testContent += `});\n`;

if (fs.existsSync(testFile)) {
  warn(`Skip (exists): ${path.relative(process.cwd(), testFile)}`);
} else {
  ensureDir(testDir);
  fs.writeFileSync(testFile, testContent, 'utf-8');
  log(`Create: ${path.relative(process.cwd(), testFile)}`);
}

info(`Type: ${testType} | Exports found: ${foundExports.length}${hasDefault ? ' + default' : ''}`);
