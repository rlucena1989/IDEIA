/** Interface que define a estrutura de agent action policy. */
export interface AgentActionPolicy {
  action: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresApproval: boolean;
  blockedPatterns: RegExp[];
  maxArgsLength: number;
}

const POLICIES: AgentActionPolicy[] = [
  { action: 'write_file', riskLevel: 'high', requiresApproval: true, blockedPatterns: [/rm\s+-rf/i, /del\s+\/f/i, /format/i], maxArgsLength: 10000 },
  { action: 'delete_file', riskLevel: 'critical', requiresApproval: true, blockedPatterns: [/.env/, /secret/, /key/, /password/i], maxArgsLength: 500 },
  { action: 'execute_command', riskLevel: 'high', requiresApproval: true, blockedPatterns: [/rm\s+-rf/i, /sudo/i, /chmod\s+777/i, /curl.*\|.*bash/i], maxArgsLength: 2000 },
  { action: 'read_file', riskLevel: 'low', requiresApproval: false, blockedPatterns: [], maxArgsLength: 50000 },
  { action: 'list_directory', riskLevel: 'low', requiresApproval: false, blockedPatterns: [], maxArgsLength: 500 },
  { action: 'search_code', riskLevel: 'low', requiresApproval: false, blockedPatterns: [], maxArgsLength: 1000 },
  { action: 'git_commit', riskLevel: 'high', requiresApproval: true, blockedPatterns: [/--force/i, /--amend/i], maxArgsLength: 2000 },
  { action: 'git_push', riskLevel: 'critical', requiresApproval: true, blockedPatterns: [/--force/i], maxArgsLength: 500 },
  { action: 'install_package', riskLevel: 'medium', requiresApproval: false, blockedPatterns: [], maxArgsLength: 500 },
  { action: 'generate_code', riskLevel: 'medium', requiresApproval: false, blockedPatterns: [], maxArgsLength: 50000 },
  { action: 'delete_branch', riskLevel: 'critical', requiresApproval: true, blockedPatterns: [], maxArgsLength: 200 },
];

/** Interface que define a estrutura de policy result. */
export interface PolicyResult {
  allowed: boolean;
  requiresApproval: boolean;
  riskLevel: string;
  reason?: string;
}

function detectPromptInjection(input: string): boolean {
  const injectionPatterns = [/ignore all (previous|prior)/i, /forget (all|everything)/i, /you are (now|not)/i, /override (your|all)/i, /system.*prompt/i, /new instructions/i, /disregard/i, /act as/i, /DAN/i, /jailbreak/i];
  return injectionPatterns.some(p => p.test(input));
}

/**
 * Valida action.
 * @param action - Valor action.
 * @param input - Valor input.
 * @returns O resultado da operação.
 */
export function validateAction(action: string, input: string): PolicyResult {
  const policy = POLICIES.find(p => p.action === action);
  if (!policy) {
    return { allowed: false, requiresApproval: true, riskLevel: 'high', reason: `Acao "${action}" nao possui politica definida` };
  }

  if (detectPromptInjection(input)) {
    return { allowed: false, requiresApproval: true, riskLevel: 'critical', reason: 'Possivel prompt injection detectado' };
  }

  if (input.length > policy.maxArgsLength) {
    return { allowed: false, requiresApproval: true, riskLevel: policy.riskLevel, reason: `Input excede limite de ${policy.maxArgsLength} caracteres` };
  }

  for (const pattern of policy.blockedPatterns) {
    if (pattern.test(input)) {
      return { allowed: false, requiresApproval: true, riskLevel: 'critical', reason: `Input bloqueado por politica: corresponde a "${pattern}"` };
    }
  }

  return { allowed: true, requiresApproval: policy.requiresApproval, riskLevel: policy.riskLevel };
}