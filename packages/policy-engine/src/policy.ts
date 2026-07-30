import { Decision, RiskLevel } from '@ideia/contracts';
import { createLogger } from '@ideia/logger';

export interface PolicyInput {
  actionType: string;
  resource?: string;
  riskLevel?: RiskLevel;
}

export interface PolicyResult {
  decision: Decision;
  reason: string;
}

const BLOCKED_PATTERNS: { pattern: RegExp; reason: string }[] = [
  // Linux/Unix — root & destructive
  { pattern: /rm\s+(-[a-z]*r[a-z]*\s+)?(-[a-z]*f[a-z]*\s+)?\s*\/[/*]?/, reason: 'destructive root operation' },
  { pattern: /rm\s+(-[a-z]*r[a-z]*\s+)?(-[a-z]*f[a-z]*\s+)?\s*--no-preserve-root/, reason: 'destructive root operation' },
  { pattern: /^format\s+/, reason: 'filesystem format blocked' },
  { pattern: /^mkfs\s+/, reason: 'filesystem creation blocked' },
  { pattern: /^dd\s+/, reason: 'low-level disk write blocked' },
  { pattern: /^shutdown\s/, reason: 'system shutdown blocked' },
  { pattern: /^reboot\s/, reason: 'system reboot blocked' },
  { pattern: /^\s*eval\s*\(/, reason: 'arbitrary code execution blocked' },
  { pattern: /^\s*exec\s*\(/, reason: 'arbitrary code execution blocked' },
  { pattern: /[>|]\s*\/dev\/sd/, reason: 'direct disk write blocked' },
  { pattern: /:\(\)\s*\{/, reason: 'fork bomb blocked' },
  // Windows — cmd.exe & PowerShell destructive
  { pattern: /^rmdir\s+\/s(\s+\/q)?/, reason: 'destructive directory deletion blocked' },
  { pattern: /^del\s+\/f(\s+\/s)?/, reason: 'force file deletion blocked' },
  { pattern: /^icacls\s+\/grant.*:F/, reason: 'full access grant blocked' },
  { pattern: /^icacls\s+\/inheritance/, reason: 'permission inheritance change blocked' },
  { pattern: /^takeown\s+\/f/, reason: 'file ownership takeover blocked' },
  { pattern: /^vssadmin\s+delete/, reason: 'shadow copy deletion blocked' },
  { pattern: /^reg\s+delete/, reason: 'registry key deletion blocked' },
  { pattern: /^cscript/, reason: 'script host execution blocked' },
  { pattern: /^wscript/, reason: 'script host execution blocked' },
  { pattern: /^diskpart/, reason: 'disk partition management blocked' },
  { pattern: /^bcedit/, reason: 'boot configuration edit blocked' },
  // PowerShell
  { pattern: /Remove-Item\s+-Recurse/, reason: 'destructive PowerShell operation blocked' },
  { pattern: /Remove-Item\s+-Force/, reason: 'forceful PowerShell delete blocked' },
  { pattern: /Clear-Content/, reason: 'content clear operation blocked' },
  { pattern: /Invoke-Expression/, reason: 'PowerShell code execution blocked' },
  { pattern: /IEX\s+/, reason: 'PowerShell invoke expression blocked' },
  { pattern: /Start-Process\s+-WindowStyle\s+Hidden/, reason: 'hidden process start blocked' },
];

const HIGH_RISK_ACTIONS = new Set([
  'file.delete',
  'file.rename',
  'file.write.executable',
  'shell.exec',
  'policy.change',
  'user.create',
]);

export function evaluatePolicy(input: PolicyInput): PolicyResult {
  if (input.resource) {
    for (const bp of BLOCKED_PATTERNS) {
      if (bp.pattern.test(input.resource)) {
        return { decision: 'block', reason: bp.reason };
      }
    }
  }

  if (input.riskLevel === 'high') {
    return { decision: 'block', reason: 'high risk action blocked by policy' };
  }

  if (HIGH_RISK_ACTIONS.has(input.actionType)) {
    return { decision: 'ask', reason: `${input.actionType} requires approval` };
  }

  if (input.riskLevel === 'medium') {
    return { decision: 'ask', reason: 'medium risk action requires approval' };
  }

  return { decision: 'auto', reason: 'low risk action auto-approved' };
}

export function evaluateBatch(inputs: PolicyInput[]): PolicyResult[] {
  return inputs.map(input => {
    try {
      return evaluatePolicy(input);
    } catch (_err) {
      return { decision: 'block', reason: `evaluation error: ${_err}` };
    }
  });
}
