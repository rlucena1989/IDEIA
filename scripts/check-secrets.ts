import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');

const SECRET_PATTERNS: { pattern: RegExp; name: string }[] = [
  { pattern: /sk-[a-zA-Z0-9]{20,}/g, name: 'OpenAI API Key' },
  { pattern: /ghp_[a-zA-Z0-9]{36,}/g, name: 'GitHub Personal Access Token' },
  { pattern: /gho_[a-zA-Z0-9]{36,}/g, name: 'GitHub OAuth Token' },
  { pattern: /AKIA[0-9A-Z]{16}/g, name: 'AWS Access Key ID' },
  { pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g, name: 'Private Key' },
  { pattern: /xox[baprs]-[a-zA-Z0-9]{10,}/g, name: 'Slack Token' },
  { pattern: /AIza[0-9A-Za-z_-]{35}/g, name: 'Google API Key' },
];

const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'coverage', '.ai'];

interface Finding {
  file: string;
  line: number;
  pattern: string;
}

function scanFile(filePath: string, findings: Finding[]): void {
  try {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    for (const sp of SECRET_PATTERNS) {
      for (let i = 0; i < lines.length; i++) {
        if (sp.pattern.test(lines[i]!)) {
          findings.push({ file: filePath, line: i + 1, pattern: sp.name });
        }
      }
    }
  } catch {}
}

function scanDir(dir: string, findings: Finding[]): void {
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || IGNORE_DIRS.includes(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(full, findings);
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.js') || entry.name.endsWith('.env')) {
        scanFile(full, findings);
      }
    }
  } catch {}
}

function main(): void {
  const findings: Finding[] = [];
  scanDir(ROOT, findings);

  console.log(`\n# Secret Scan Report`);
  console.log(`**Arquivos escaneados:** recursive scan\n`);
  console.log(`**Secrets encontrados:** ${findings.length}\n`);

  // Group by pattern
  const byPattern: Record<string, Finding[]> = {};
  for (const f of findings) {
    if (!byPattern[f.pattern]) byPattern[f.pattern] = [];
    byPattern[f.pattern].push(f);
  }

  for (const [pattern, files] of Object.entries(byPattern)) {
    console.log(`### ${pattern} (${files.length})`);
    for (const f of files) {
      console.log(`- ${f.file}:${f.line}`);
    }
    console.log('');
  }

  process.exit(findings.length > 0 ? 1 : 0);
}

main();
