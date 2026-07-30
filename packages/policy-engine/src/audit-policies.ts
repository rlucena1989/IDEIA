import { RiskLevel } from '@ideia/contracts';
import { createLogger } from '@ideia/logger';
import { evaluatePolicy, PolicyResult, PolicyInput } from './policy';
import { CedarPolicySet, CedarPolicy as _CedarPolicy, evaluateCedarPolicy } from './cedar-adapter';
import { loadPolicyDirectory, PolicyRule as _PolicyRule, PolicyDocument as _PolicyDocument } from './policy-loader';
const logger = createLogger('audit-policies');

export interface PolicyAuditEntry {
  ruleId: string;
  ruleDescription: string;
  testInput: PolicyInput;
  expected: PolicyResult['decision'];
  actual: PolicyResult['decision'];
  passed: boolean;
  source: 'regex' | 'cedar' | 'yaml';
}

export interface PolicyAuditReport {
  timestamp: string;
  totalRules: number;
  passed: number;
  failed: number;
  entries: PolicyAuditEntry[];
  coverage: { actionTypes: string[]; riskLevels: string[] };
}

export function auditRegexPolicies(): PolicyAuditReport {
  const testCases: { input: PolicyInput; expected: PolicyResult['decision'] }[] = [
    { input: { actionType: 'file.read', resource: 'test.txt', riskLevel: 'low' as RiskLevel }, expected: 'auto' },
    { input: { actionType: 'shell.exec', resource: 'rm -rf /', riskLevel: 'high' as RiskLevel }, expected: 'block' },
    { input: { actionType: 'shell.exec', resource: 'rm -rf /home/user', riskLevel: 'high' as RiskLevel }, expected: 'block' },
    { input: { actionType: 'file.delete', resource: '/tmp/test', riskLevel: 'medium' as RiskLevel }, expected: 'ask' },
    { input: { actionType: 'policy.change', resource: 'policy.yaml', riskLevel: 'high' as RiskLevel }, expected: 'ask' },
    { input: { actionType: 'shell.exec', resource: 'Invoke-Expression "malicious"', riskLevel: 'high' as RiskLevel }, expected: 'block' },
    { input: { actionType: 'shell.exec', resource: 'npm install express', riskLevel: 'low' as RiskLevel }, expected: 'auto' },
    { input: { actionType: 'shell.exec', resource: 'format C: /FS:NTFS', riskLevel: 'high' as RiskLevel }, expected: 'block' },
    { input: { actionType: 'user.create', resource: '', riskLevel: 'medium' as RiskLevel }, expected: 'ask' },
    { input: { actionType: 'code.analyze', resource: 'src/index.ts', riskLevel: 'low' as RiskLevel }, expected: 'auto' },
  ];

  const entries: PolicyAuditEntry[] = testCases.map(tc => {
    const actual = evaluatePolicy(tc.input);
    return {
      ruleId: 'regex-eval',
      ruleDescription: `action=${tc.input.actionType} resource=${tc.input.resource}`,
      testInput: tc.input,
      expected: tc.expected,
      actual: actual.decision,
      passed: actual.decision === tc.expected,
      source: 'regex',
    };
  });

  const passed = entries.filter(e => e.passed).length;
  const actionTypes = [...new Set(testCases.map(t => t.input.actionType))];
  const riskLevels = [...new Set(testCases.map(t => t.input.riskLevel).filter(Boolean))] as string[];

  return {
    timestamp: new Date().toISOString(),
    totalRules: entries.length,
    passed,
    failed: entries.length - passed,
    entries,
    coverage: { actionTypes, riskLevels },
  };
}

export function auditCedarPolicies(policySet: CedarPolicySet): PolicyAuditReport {
  const testCases: { input: PolicyInput; expected: PolicyResult['decision'] }[] = [
    { input: { actionType: 'file.read', resource: 'test.txt', riskLevel: 'low' as RiskLevel }, expected: 'auto' },
    { input: { actionType: 'shell.exec', resource: 'rm -rf /', riskLevel: 'high' as RiskLevel }, expected: 'block' },
    { input: { actionType: 'deploy', resource: 'production', riskLevel: 'high' as RiskLevel }, expected: 'block' },
    { input: { actionType: 'deploy', resource: 'staging', riskLevel: 'medium' as RiskLevel }, expected: 'ask' },
    { input: { actionType: 'file.read' }, expected: 'auto' },
  ];

  const entries: PolicyAuditEntry[] = testCases.map(tc => {
    let actual: PolicyResult['decision'] = 'ask';
    for (const policy of policySet.policies.sort((a, b) => b.priority - a.priority)) {
      if (evaluateCedarPolicy(policy, tc.input)) {
        actual = policy.effect === 'forbid' ? 'block' : 'auto';
        break;
      }
    }
    return {
      ruleId: 'cedar-eval',
      ruleDescription: tc.input.actionType,
      testInput: tc.input,
      expected: tc.expected,
      actual,
      passed: actual === tc.expected,
      source: 'cedar',
    };
  });

  const passed = entries.filter(e => e.passed).length;
  return {
    timestamp: new Date().toISOString(),
    totalRules: entries.length,
    passed,
    failed: entries.length - passed,
    entries,
    coverage: { actionTypes: [...new Set(testCases.map(t => t.input.actionType))], riskLevels: ['low', 'medium', 'high'] },
  };
}

export function auditYamlPolicies(dirPath?: string): PolicyAuditReport {
  const policies = loadPolicyDirectory(dirPath);
  const entries: PolicyAuditEntry[] = [];
  let passed = 0;

  for (const [name, doc] of policies) {
    for (const rule of doc.rules) {
      const input: PolicyInput = {
        actionType: rule.actionPattern || '*',
        resource: rule.resourcePattern,
        riskLevel: rule.riskLevel,
      };
      const result = evaluatePolicy(input);
      const expected = rule.action;
      const isPassed = result.decision === expected;
      if (isPassed) passed++;
      entries.push({
        ruleId: `${name}:${rule.id}`,
        ruleDescription: rule.description,
        testInput: input,
        expected,
        actual: result.decision,
        passed: isPassed,
        source: 'yaml',
      });
    }
  }

  return {
    timestamp: new Date().toISOString(),
    totalRules: entries.length,
    passed,
    failed: entries.length - passed,
    entries,
    coverage: { actionTypes: [...new Set(entries.map(e => e.testInput.actionType))], riskLevels: [] },
  };
}

export function fullPolicyAudit(cedarPolicySet?: CedarPolicySet): PolicyAuditReport[] {
  return [
    auditRegexPolicies(),
    ...(cedarPolicySet ? [auditCedarPolicies(cedarPolicySet)] : []),
    auditYamlPolicies(),
  ];
}