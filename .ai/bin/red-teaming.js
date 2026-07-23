#!/usr/bin/env node
/**
 * red-teaming.js — Red Teaming Automatizado
 *
 * Escaneia prompts, templates e configurações em busca de padrões
 * de injeção de prompt, jailbreaks e vazamento de contexto.
 *
 * Usage:
 *   node .ai/bin/red-teaming.js              # full scan
 *   node .ai/bin/red-teaming.js --ci         # exit 1 se falhar
 *   node .ai/bin/red-teaming.js --verbose    # detalhado
 *   node .ai/bin/red-teaming.js --garak      # tenta usar Garak CLI
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CI = process.argv.includes('--ci');
const VERBOSE = process.argv.includes('--verbose');
const USE_GARAK = process.argv.includes('--garak');

const ROOT = path.resolve(__dirname, '../..');

const PATTERNS = [
  { name: 'Ignore instructions above', regex: /ignore\s+(all\s+)?(previous|above|prior)/i, severity: 'high' },
  { name: 'Role-play jailbreak', regex: /(act\s+as|pretend|you\s+are\s+now)\s+(dan|jailbroken|unrestricted|no\s+rules|no\s+limits)/i, severity: 'high' },
  { name: 'System prompt override', regex: /(override|disregard|ignore)\s+(your\s+)?(system|instructions|guidelines)/i, severity: 'high' },
  { name: 'Token smuggling', regex: /\[\s*(SYSTEM|USER|ASSISTANT|TOOL)\s*[:=\]]/i, severity: 'medium' },
  { name: 'DAN-style jailbreak', regex: /\bdan\b.*(do\s+anything|unleashed)/i, severity: 'high' },
  { name: 'Hypothetical prompt leak', regex: /(print|show|reveal|output|display)\s+(your\s+)?(prompt|instructions|system\s+message)/i, severity: 'medium' },
  { name: 'Role reversal attack', regex: /(now\s+)?(you\s+are|you\'?re)\s+(the\s+)?(user|attacker|hacker)/i, severity: 'medium' },
  { name: 'Context boundary break', regex: /(forget|ignore|discard)\s+(everything|all|context)/i, severity: 'medium' },
  { name: 'Base64 encoding bypass', regex: /(base64|decode|encode)\s*(\(|of|the\s+following)/i, severity: 'low' },
  { name: 'ASCII art bypass', regex: /(ascii\s+art|unicode\s+bypass|zero\s+width)/i, severity: 'low' },
  { name: 'Many-shot jailbreak', regex: /repeat\s+(the\s+)?(word|phrase|sentence)\s+/i, severity: 'medium' },
  { name: 'Payload smuggling in markdown', regex: /```.*(system|user|assistant):/is, severity: 'high' },
];

const DIRS_TO_SCAN = [
  'packages/agent-runtime',
  'packages/onboarding-engine',
  'packages/trusted-context',
  '.ai/prompts',
  '.ai/templates',
  'prompts',
];

const EXCLUDE_DIRS = [
  'node_modules',
  '.git',
  'dist',
];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const findings = [];

  for (const pattern of PATTERNS) {
    const matches = content.match(pattern.regex);
    if (matches) {
      const lines = content.split('\n');
      const lineNum = lines.findIndex(l => pattern.regex.test(l)) + 1;
      findings.push({
        pattern: pattern.name,
        severity: pattern.severity,
        match: matches[0].length > 80 ? matches[0].slice(0, 77) + '...' : matches[0],
        line: lineNum,
      });
    }
  }

  return findings;
}

function shouldExclude(fullPath) {
  const normalized = fullPath.replace(/\\/g, '/');
  return EXCLUDE_DIRS.some(exDir => normalized.includes('/' + exDir + '/') || normalized.endsWith('/' + exDir));
}

function scanDirectory(dirPath) {
  const absPath = path.resolve(ROOT, dirPath);
  if (!fs.existsSync(absPath)) return [];

  const results = [];
  const entries = fs.readdirSync(absPath, { withFileTypes: true, recursive: true });

  for (const entry of entries) {
    const fullPath = path.join(entry.parentPath, entry.name);
    if (entry.isFile() && /\.(md|txt|ts|js|json|yaml|yml)$/.test(entry.name) && !shouldExclude(fullPath)) {
      try {
        const findings = scanFile(fullPath);
        for (const f of findings) {
          results.push({ file: path.relative(ROOT, fullPath), ...f });
        }
      } catch {}
    }
  }

  return results;
}

async function runGarak() {
  try {
    const result = execSync('garak --model-type report --list_probes 2>&1', {
      encoding: 'utf8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { available: true, probes: result.split('\n').filter(l => l.trim()) };
  } catch {
    return { available: false, probes: [] };
  }
}

async function main() {
  if (USE_GARAK) {
    const garak = await runGarak();
    if (garak.available) {
      console.log(`\n\x1b[1mGarak Red Teaming\x1b[0m`);
      console.log(`Available probes: ${garak.probes.length}`);
      try {
        const scanResult = execSync('garak --model-type report --probes promptinject,encoding,dan,tap 2>&1', {
          encoding: 'utf8', timeout: 60000, stdio: ['pipe', 'pipe', 'pipe'],
        });
        console.log(scanResult);
      } catch (e) {
        console.log(`Garak scan output: ${e.stdout || 'no output'}`);
        if (e.stderr) console.error(`Garak errors: ${e.stderr}`);
      }
    } else {
      console.log('\n\x1b[33mGarak not available. Install: pip install garak\x1b[0m');
    }
  }

  let allFindings = [];
  for (const dir of DIRS_TO_SCAN) {
    allFindings = allFindings.concat(scanDirectory(dir));
  }

  if (VERBOSE || allFindings.length > 0 || CI) {
    console.log(`\n\x1b[1mRed Teaming Scan Report\x1b[0m`);
    console.log(`Patterns: ${PATTERNS.length}`);
    console.log(`Directories: ${DIRS_TO_SCAN.length}`);
    console.log(`Findings: ${allFindings.length}\n`);

    for (const f of allFindings) {
      const color = f.severity === 'high' ? '\x1b[31m' : f.severity === 'medium' ? '\x1b[33m' : '\x1b[90m';
      console.log(`${color}[${f.severity.toUpperCase()}]\x1b[0m ${f.file}:${f.line}`);
      console.log(`  Pattern: ${f.pattern}`);
      console.log(`  Match: "${f.match}"\n`);
    }
  }

  if (allFindings.length === 0) {
    console.log(`\x1b[32mNo red teaming findings detected.\x1b[0m`);
  }

  const highCount = allFindings.filter(f => f.severity === 'high').length;
  const mediumCount = allFindings.filter(f => f.severity === 'medium').length;
  const lowCount = allFindings.filter(f => f.severity === 'low').length;
  console.log(`Summary: ${highCount} high, ${mediumCount} medium, ${lowCount} low`);

  if (CI && highCount > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
