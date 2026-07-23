import { PromptSecurity } from '@ideia/prompt-security';

export interface GuardrailReport {
  passed: boolean;
  checks: GuardrailCheck[];
  summary: string;
}

export interface GuardrailCheck {
  name: string;
  passed: boolean;
  details: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export interface GuardrailConfig {
  maxPromptLength?: number;
  maxOutputLength?: number;
  blockedTopics?: string[];
  allowedModels?: string[];
  requireApprovalForDeploy?: boolean;
}

const DEFAULT_CONFIG: GuardrailConfig = {
  maxPromptLength: 8000,
  maxOutputLength: 16000,
  blockedTopics: [],
  allowedModels: [],
  requireApprovalForDeploy: true,
};

export class Guardrails {
  private security: PromptSecurity;
  private config: GuardrailConfig;

  constructor(config?: Partial<GuardrailConfig>) {
    this.security = new PromptSecurity();
    this.config = { ...DEFAULT_CONFIG, ...config } as Required<GuardrailConfig>;
  }

  checkInput(input: string): GuardrailReport {
    const checks: GuardrailCheck[] = [];

    const maxPrompt = this.config.maxPromptLength ?? 4000;
    const lengthCheck = input.length <= maxPrompt;
    checks.push({
      name: 'prompt_length',
      passed: lengthCheck,
      details: lengthCheck
        ? `${input.length}/${maxPrompt} caracteres`
        : `Prompt excede limite de ${maxPrompt} caracteres`,
      severity: lengthCheck ? 'info' : 'error',
    });

    const scanResult = this.security.scan(input);
    const hasBlocking = scanResult.issues.some((i: { action: string }) => i.action === 'block');
    checks.push({
      name: 'prompt_security_scan',
      passed: !hasBlocking,
      details: hasBlocking
        ? `Conteúdo bloqueado: ${scanResult.issues.filter((i: { action: string }) => i.action === 'block').map((i: { category: string }) => i.category).join(', ')}`
        : `Scan seguro (${scanResult.issues.length} observações)`,
      severity: hasBlocking ? 'critical' : 'info',
    });

    const apiKeyPattern = /\b(sk-[a-zA-Z0-9_-]{10,}|pk-[a-zA-Z0-9_-]{10,}|[A-Za-z0-9]{32,})\b/;
    const hasApiKey = apiKeyPattern.test(input);
    checks.push({
      name: 'api_key_detected',
      passed: !hasApiKey,
      details: hasApiKey ? 'Chave de API detectada no input' : 'Nenhuma chave de API detectada',
      severity: hasApiKey ? 'critical' : 'info',
    });

    return {
      passed: checks.every(c => c.passed),
      checks,
      summary: checks.every(c => c.passed) ? 'Input seguro' : `${checks.filter(c => !c.passed).length} check(s) falharam`,
    };
  }

  checkOutput(output: string): GuardrailReport & { sanitized: string | null } {
    const checks: GuardrailCheck[] = [];

    const maxOutput = this.config.maxOutputLength ?? 8000;
    const lengthCheck = output.length <= maxOutput;
    checks.push({
      name: 'output_length',
      passed: lengthCheck,
      details: lengthCheck
        ? `${output.length}/${maxOutput} caracteres`
        : `Output excede limite de ${maxOutput} caracteres`,
      severity: lengthCheck ? 'info' : 'warning',
    });

    const validation = this.security.validateOutput(output);
    const hasBlocking = validation.issues.some((i: { action: string }) => i.action === 'block');
    checks.push({
      name: 'output_security_scan',
      passed: !hasBlocking,
      details: hasBlocking
        ? `Output bloqueado: ${validation.issues.filter((i: { action: string }) => i.action === 'block').map((i: { category: string }) => i.category).join(', ')}`
        : `Output seguro (${validation.issues.length} observações)`,
      severity: hasBlocking ? 'critical' : (validation.issues.length > 0 ? 'warning' : 'info'),
    });

    const codeValidation = this.security.validateGeneratedCode(output);
    checks.push({
      name: 'code_vulnerability_scan',
      passed: codeValidation.safe,
      details: codeValidation.safe
        ? 'Nenhuma vulnerabilidade detectada'
        : `Vulnerabilidades: ${codeValidation.issues.map((i: { category: string }) => i.category).join(', ')}`,
      severity: codeValidation.safe ? 'info' : 'error',
    });

    const allPassed = checks.every(c => c.passed);
    return {
      passed: allPassed,
      checks,
      summary: allPassed ? 'Output seguro' : `${checks.filter(c => !c.passed).length} check(s) falharam`,
      sanitized: validation.sanitizedOutput,
    };
  }

  checkDeployApproval(environment: string): GuardrailCheck {
    const needsApproval = (this.config.requireApprovalForDeploy ?? true) && environment === 'production';
    return {
      name: 'deploy_approval',
      passed: !needsApproval,
      details: needsApproval
        ? `Deploy para ${environment} requer aprovação humana`
        : `Deploy para ${environment} autorizado`,
      severity: needsApproval ? 'warning' : 'info',
    };
  }

  checkModelAllowed(model: string): GuardrailCheck {
    const allowedModels = this.config.allowedModels ?? [];
    if (allowedModels.length === 0) {
      return { name: 'model_allowed', passed: true, details: 'Nenhuma restrição de modelo configurada', severity: 'info' };
    }
    const allowed = allowedModels.includes(model);
    return {
      name: 'model_allowed',
      passed: allowed,
      details: allowed ? `Modelo ${model} autorizado` : `Modelo ${model} não está na lista de permitidos`,
      severity: allowed ? 'info' : 'error',
    };
  }
}

export function createGuardrails(config?: Partial<GuardrailConfig>): Guardrails {
  return new Guardrails(config);
}
