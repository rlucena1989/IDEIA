import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
const ROOT = resolve(__dirname, '..', '..');
const OUTPUT_MD = resolve(ROOT, 'docs', 'governance', 'TSC-ERROR-FREQUENCY.md');
const OUTPUT_JSON = resolve(ROOT, 'docs', 'governance', 'tsc-errors.json');

interface TscError {
  file: string;
  line: number;
  col: number;
  code: string;
  message: string;
  package: string;
}

interface ErrorReport {
  totalErrors: number;
  byCode: Record<string, number>;
  byPackage: Record<string, number>;
  byFile: Record<string, number>;
  byRoot: Record<string, number>;
  errors: TscError[];
}

function parseTscOutput(output: string): TscError[] {
  const errors: TscError[] = [];
  const lines = output.split(/\r?\n/);

  for (const line of lines) {
    const fileMatch = line.match(/packages\/([^\/\\\s]+)\/src\/([^:]+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s*(.*)/);
    if (fileMatch) {
      const [, pkg, file, lineStr, colStr, code, message] = fileMatch;
      errors.push({
        file: 'packages/' + pkg + '/src/' + file,
        line: parseInt(lineStr, 10),
        col: parseInt(colStr, 10),
        code,
        message: (message || '').trim(),
        package: pkg
      });
      continue;
    }
    const genericMatch = line.match(/(packages\/[^\s:]+):\s+error\s+(TS\d+):\s*(.*)/);
    if (genericMatch) {
      const [, file, code, message] = genericMatch;
      const pkgMatch = file.match(/packages\/([^\/\\\s]+)/);
      errors.push({
        file,
        line: 0,
        col: 0,
        code,
        message: (message || '').trim(),
        package: pkgMatch ? pkgMatch[1] : 'unknown'
      });
      continue;
    }
    const bareMatch = line.match(/error\s+(TS\d+):\s*(.*)/);
    if (bareMatch) {
      const [, code, message] = bareMatch;
      errors.push({
        file: '<global>',
        line: 0,
        col: 0,
        code,
        message: (message || '').trim(),
        package: 'global'
      });
    }
  }

  return errors;
}

function generateReport(errors: TscError[]): ErrorReport {
  const report: ErrorReport = {
    totalErrors: errors.length,
    byCode: {},
    byPackage: {},
    byFile: {},
    byRoot: {},
    errors
  };
  
  for (const err of errors) {
    report.byCode[err.code] = (report.byCode[err.code] || 0) + 1;
    report.byPackage[err.package] = (report.byPackage[err.package] || 0) + 1;
    
    const fileKey = err.file;
    report.byFile[fileKey] = (report.byFile[fileKey] || 0) + 1;
    
    let root = 'other:' + err.code;
    if (err.code === 'TS5055' || err.code === 'TS6059' || err.code === 'TS6307' || err.code === 'TS6053') {
      root = 'build-config:outDir-rootDir';
    } else if (err.code === 'TS2552' && /'err\b|'error\b/.test(err.message)) {
      root = 'lint-staged-rename:err-to-_err';
    } else if (err.code === 'TS2305' || err.code === 'TS2724') {
      if (/['"]\.\/types['"]/.test(err.message) || /['"]\.\.\/types['"]/.test(err.message)) {
        root = 'missing-type-export:types.ts';
      } else {
        root = 'missing-type-export:other';
      }
    } else if (err.code === 'TS2339') {
      root = 'property-does-not-exist';
    } else if (err.code === 'TS7006') {
      root = 'implicit-any:parameter';
    } else if (err.code === 'TS2352') {
      root = 'unsafe-cast:needs-unknown-bridge';
    } else if (err.code === 'TS1005' || err.code === 'TS1128' || err.code === 'TS1003' || err.code === 'TS1109' || err.code === 'TS1011' || err.code === 'TS1117' || err.code === 'TS2694') {
      root = 'syntax-error';
    } else if (err.code === 'TS4114' || err.code === 'TS4115') {
      root = 'missing-override-modifier';
    } else if (err.code === 'TS2353') {
      root = 'object-literal-unknown-property';
    } else if (err.code === 'TS2459') {
      root = 'local-decl-not-exported';
    } else if (err.code === 'TS18047' || err.code === 'TS18048' || err.code === 'TS18046') {
      root = 'strict-null-checks';
    } else if (err.code === 'TS2304') {
      root = 'cannot-find-name:generic';
    } else if (err.code === 'TS2322' || err.code === 'TS2345') {
      root = 'type-mismatch';
    } else if (err.code === 'TS2554') {
      root = 'argument-count-mismatch';
    }
    report.byRoot[root] = (report.byRoot[root] || 0) + 1;
  }
  
  return report;
}

function writeMarkdownReport(report: ErrorReport, outputPath: string): void {
  const sortedCodes = Object.entries(report.byCode).sort((a, b) => b[1] - a[1]);
  const sortedPackages = Object.entries(report.byPackage).sort((a, b) => b[1] - a[1]).slice(0, 20);
  const sortedFiles = Object.entries(report.byFile).sort((a, b) => b[1] - a[1]).slice(0, 20);
  const sortedRoots = Object.entries(report.byRoot).sort((a, b) => b[1] - a[1]);
  
  let md = '# TSC Error Frequency Report\n\n';
  md += '> Generated: ' + new Date().toISOString() + '\n';
  md += '> Total Errors: ' + report.totalErrors + '\n\n';
  
  md += '## By Error Code\n\n';
  md += '| Code | Count | Description |\n';
  md += '|------|-------|-------------|\n';
  for (const [code, count] of sortedCodes) {
    md += '| ' + code + ' | ' + count + ' | ' + getCodeDescription(code) + ' |\n';
  }
  
  md += '\n## By Package (Top 20)\n\n';
  md += '| Package | Errors |\n';
  md += '|---------|--------|\n';
  for (const [pkg, count] of sortedPackages) {
    md += '| ' + pkg + ' | ' + count + ' |\n';
  }
  
  md += '\n## By File (Top 20)\n\n';
  md += '| File | Errors |\n';
  md += '|------|--------|\n';
  for (const [file, count] of sortedFiles) {
    md += '| ' + file + ' | ' + count + ' |\n';
  }
  
  md += '\n## By Heuristic Root\n\n';
  md += '| Root Cause | Errors |\n';
  md += '|------------|--------|\n';
  for (const [root, count] of sortedRoots) {
    md += '| ' + root + ' | ' + count + ' |\n';
  }
  
  writeFileSync(outputPath, md, 'utf8');
}

function getCodeDescription(code: string): string {
  const descriptions: Record<string, string> = {
    'TS2305': 'Module has no exported member',
    'TS2339': 'Property does not exist on type',
    'TS2552': 'Cannot find name (typo suggestion)',
    'TS7006': 'Parameter implicitly has any type',
    'TS2322': 'Type is not assignable to type',
    'TS2304': 'Cannot find name',
    'TS1005': 'Syntax error (expected token)',
    'TS2353': 'Object literal may only specify known properties',
    'TS2724': 'No exported member with suggestion',
    'TS2345': 'Argument type not assignable',
    'TS2554': 'Expected N arguments, got M',
    'TS1128': 'Declaration or statement expected',
    'TS18047': 'X is possibly null',
    'TS2352': 'Conversion may be a mistake (cast overlap)',
    'TS2459': 'Module declares X locally but not exported',
    'TS18048': 'X is possibly undefined',
    'TS4114': 'Member must have override modifier',
    'TS2551': 'Property does not exist (did you mean)',
    'TS1434': 'Unexpected reserved word',
    'TS18046': 'X is of type any',
    'TS1003': 'Identifier expected',
    'TS2314': 'Generic type requires type argument(s)',
    'TS2448': 'Block-scoped variable used before declaration',
    'TS1011': 'An element access expression should take an argument',
    'TS1109': 'Expression expected',
    'TS2307': 'Cannot find module',
    'TS1117': 'An object literal cannot have multiple properties with the same name',
    'TS7053': 'Element implicitly has any (index expression)',
    'TS2367': 'Types have no overlap',
    'TS2739': 'Property is missing in type',
    'TS2769': 'No overload matches this call',
    'TS1002': 'Unterminated string literal',
    'TS2694': 'Namespace has no exported member',
    'TS2300': 'Duplicate identifier',
    'TS4115': 'Parameter property must have override modifier',
    'TS2308': 'Module already exported member (ambiguity)',
    'TS6059': 'File not under rootDir',
    'TS6307': 'File not in project file list',
    'TS2420': 'Class incorrectly implements interface',
    'TS2366': 'No overload matches this call (binary operator)',
    'TS7052': 'Element implicitly has an any type',
    'TS1135': 'Argument expression expected',
    'TS1136': 'Property assignment expected',
    'TS4053': 'Return type uses private name from external module',
    'TS2741': 'Property is missing in type',
    'TS2531': 'Object is possibly null',
    'TS2344': 'Type argument does not satisfy constraint',
    'TS2415': 'Class is not assignable to type',
    'TS5083': 'Cannot read file',
    'TS6053': 'File not found',
    'TS2430': 'Interface incorrectly extends interface',
    'TS4055': 'Return type uses private name',
    'TS2307': 'Cannot find module',
    'TS7022': 'Implicitly has any (self-reference)',
    'TS2349': 'Expression is not callable',
    'TS5055': 'Cannot write file (dist conflict)',
    'TS1109': 'Expression expected'
  };
  return descriptions[code] || 'Unknown error';
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fix = args.includes('--fix');
  
  let output = '';
  for await (const chunk of process.stdin) {
    output += chunk.toString();
  }
  
  const errors = parseTscOutput(output);
  const report = generateReport(errors);
  
  console.log('Parsed ' + report.totalErrors + ' errors');
  console.log('Top error codes:');
  Object.entries(report.byCode)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([code, count]) => console.log('  ' + code + ': ' + count));
  
  if (fix) {
    writeMarkdownReport(report, OUTPUT_MD);
    writeFileSync(OUTPUT_JSON, JSON.stringify(report, null, 2), 'utf8');
    console.log('\nReport written to:');
    console.log('  ' + OUTPUT_MD);
    console.log('  ' + OUTPUT_JSON);
  }
}

main();
