import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
import type { AsvsCheck, AsvsCategory } from './asvs-types';
const logger = createLogger('asvs-v11-logic');

const CATEGORY: AsvsCategory = 'V11';

function scanFilesForPattern(rootDir: string, pattern: RegExp, maxResults = 5): string[] {
  const results: string[] = [];
  function walk(dir: string) {
    if (results.length >= maxResults) return;
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (results.length >= maxResults) return;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
          walk(full);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js') || entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx'))) {
          try {
            const content = fs.readFileSync(full, 'utf8');
            const match = content.match(pattern);
            if (match) {
              const relative = path.relative(rootDir, full);
              results.push(`${relative}: ${match[0].slice(0, 100)}`);
            }
          } catch {
          }
        }
      }
    } catch {
    }
  }
  walk(rootDir);
  return results;
}

function scanPackageJsonDeps(rootDir: string, depNames: string[]): string[] {
  const found: string[] = [];
  function walk(dir: string) {
    try {
      const pkgPath = path.join(dir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const content = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const allDeps = { ...content.dependencies, ...content.devDependencies };
        for (const depName of depNames) {
          if (allDeps[depName]) {
            found.push(`${depName}@${allDeps[depName]} (in ${path.relative(rootDir, pkgPath)})`);
          }
        }
      }
    } catch {
    }
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
          walk(path.join(dir, entry.name));
        }
      }
    } catch {
    }
  }
  walk(rootDir);
  return found;
}

export function checkV11_1_1(rootDir: string): AsvsCheck {
  const validationDeps = scanPackageJsonDeps(rootDir, ['zod', 'joi', 'yup', 'superstruct', 'io-ts', 'runtypes', '@sinclair/typebox', 'class-validator', 'ajv', 'validator']);
  const businessRules = scanFilesForPattern(rootDir, /(business.*(logic|rule|valid|constraint)|rule.*engine|workflow.*valid|domain.*valid|transaction.*valid|operation.*valid|policy.*check|approval.*flow|limit.*check|balance.*check)/i);
  const zodBusinessSchemas = scanFilesForPattern(rootDir, /z\.object\(\{[^}]*\}[^)]*\)\.(refine|superRefine|transform)\s*\(/i);
  const passed = businessRules.length > 0 || zodBusinessSchemas.length > 0 || (validationDeps.length > 0 && businessRules.length > 0);
  const evidence: string[] = [];
  if (businessRules.length > 0) evidence.push(`Business logic rules: ${businessRules.slice(0, 4).join(', ')}`);
  if (zodBusinessSchemas.length > 0) evidence.push(`Zod business schemas with refine/transform: ${zodBusinessSchemas.slice(0, 3).join(', ')}`);
  if (validationDeps.length > 0) evidence.push(`Validation libraries available: ${validationDeps.slice(0, 5).join(', ')}`);
  if (!passed) evidence.push('No business logic validation rules detected');
  return {
    id: '11.1.1',
    name: 'Verify business logic validation rules exist for critical operations',
    category: CATEGORY,
    level: 1,
    passed,
    evidence: evidence.join(' | '),
  };
}

export function checkV11_1_2(rootDir: string): AsvsCheck {
  const transactionLimits = scanFilesForPattern(rootDir, /(transaction.*limit|limit.*transaction|max.*amount|amount.*max|min.*amount|amount.*min|spend.*limit|budget.*limit|limit.*budget|daily.*limit|weekly.*limit|monthly.*limit|per.*transaction|maxTransaction)/i);
  const monitoringPatterns = scanFilesForPattern(rootDir, /(monitor|anomaly|alert|threshold|notify.*limit|trigger.*limit|exceed|surpass|over.*limit)/i);
  const passed = transactionLimits.length > 0 || monitoringPatterns.length > 0;
  const evidence: string[] = [];
  if (transactionLimits.length > 0) evidence.push(`Transaction limits: ${transactionLimits.slice(0, 3).join(', ')}`);
  if (monitoringPatterns.length > 0) evidence.push(`Monitoring/anomaly detection: ${monitoringPatterns.slice(0, 3).join(', ')}`);
  if (!passed) evidence.push('No transaction limits or monitoring detected');
  return { id: '11.1.2', name: 'Verify transaction limits and monitoring exist', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}

export function checkV11_2_1(rootDir: string): AsvsCheck {
  const stateMachinePatterns = scanFilesForPattern(rootDir, /(state.?machine|stateMachine|finite.?state|workflow.*state|step.*state|status.*transit|status.*flow|workflow.*status|approval.*status|order.*status|payment.*status|shipping.*status)/i);
  const passed = stateMachinePatterns.length > 0;
  const evidence: string[] = [];
  if (stateMachinePatterns.length > 0) evidence.push(`State machine patterns: ${stateMachinePatterns.slice(0, 3).join(', ')}`);
  if (!passed) evidence.push('No state machine integrity detected');
  return { id: '11.2.1', name: 'Verify state machine integrity for workflow', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}

export function checkV11_3_1(rootDir: string): AsvsCheck {
  const userRateLimit = scanFilesForPattern(rootDir, /(rate.?limit.*user|user.*rate.?limit|per.?user.*limit|limit.*per.?user|user.*throttle|throttle.*user|user.*quota|quota.*user|rateLimit.*key|rate.*limit.*id)/i);
  const roleRateLimit = scanFilesForPattern(rootDir, /(rate.?limit.*role|role.*rate.?limit|per.?role.*limit|limit.*per.?role|admin.*rate.?limit|rate.?limit.*admin)/i);
  const passed = userRateLimit.length > 0 || roleRateLimit.length > 0;
  const evidence: string[] = [];
  if (userRateLimit.length > 0) evidence.push(`User rate limiting: ${userRateLimit.slice(0, 3).join(', ')}`);
  if (roleRateLimit.length > 0) evidence.push(`Role-based rate limiting: ${roleRateLimit.slice(0, 2).join(', ')}`);
  if (!passed) evidence.push('No rate limits per user/role detected');
  return { id: '11.3.1', name: 'Verify rate limits per user/role', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}

export function checkV11_4_1(rootDir: string): AsvsCheck {
  const auditTrailPatterns = scanFilesForPattern(rootDir, /(audit.*(trail|log|record|event|entry)|auditLog|auditTrail|audit.*business|business.*audit|operation.*audit|transaction.*audit|change.*log|activity.*log|event.*log|log.*operation)/i);
  const passed = auditTrailPatterns.length > 0;
  const evidence: string[] = [];
  if (auditTrailPatterns.length > 0) evidence.push(`Audit trail patterns: ${auditTrailPatterns.slice(0, 3).join(', ')}`);
  if (!passed) evidence.push('No audit trail for business operations detected');
  return { id: '11.4.1', name: 'Verify audit trail for business operations', category: CATEGORY, level: 3, passed, evidence: evidence.join(' | ') };
}

export function checkV11_5_1(rootDir: string): AsvsCheck {
  const anomalyPatterns = scanFilesForPattern(rootDir, /(anomaly|anomalous|outlier|unusual|suspicious|fraud|abnormal|irregular|unexpected.*pattern|pattern.*detect|behavior.*analytics|behavior.*detect)/i);
  const mlDetect = scanFilesForPattern(rootDir, /(machine.*learn.*detect|ml.*detect|ai.*detect|model.*anomaly|anomaly.*model|predict.*anomaly|anomaly.*score)/i);
  const passed = anomalyPatterns.length > 0 || mlDetect.length > 0;
  const evidence: string[] = [];
  if (anomalyPatterns.length > 0) evidence.push(`Anomaly detection: ${anomalyPatterns.slice(0, 3).join(', ')}`);
  if (mlDetect.length > 0) evidence.push(`ML-based detection: ${mlDetect.slice(0, 2).join(', ')}`);
  if (!passed) evidence.push('No automatic anomaly detection detected');
  return { id: '11.5.1', name: 'Verify automatic anomaly detection for business operations', category: CATEGORY, level: 3, passed, evidence: evidence.join(' | ') };
}

export function runAllV11Checks(rootDir: string): AsvsCheck[] {
  return [
    checkV11_1_1(rootDir),
    checkV11_1_2(rootDir),
    checkV11_2_1(rootDir),
    checkV11_3_1(rootDir),
    checkV11_4_1(rootDir),
    checkV11_5_1(rootDir),
  ];
}
