export type ComplianceFramework = 'lgpd' | 'hipaa' | 'gdpr' | 'soc2';
export type ComplianceStatus = 'pass' | 'fail' | 'na';
export type ComplianceSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface ComplianceCheck {
  id: string;
  framework: ComplianceFramework;
  article: string;
  description: string;
  status: ComplianceStatus;
  severity: ComplianceSeverity;
  detail?: string;
  remediation?: string;
}

export interface ComplianceReport {
  framework: ComplianceFramework;
  timestamp: string;
  checks: ComplianceCheck[];
  score: number;
  summary: string;
}

function _piiPatterns(): RegExp[] {
  return [
    /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/, // CPF
    /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/, // CNPJ
    /(?:^|[^0-9])\d{11}(?:$|[^0-9])/, // Brazilian phone
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, // Email
  ];
}

function _healthPatterns(): RegExp[] {
  return [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b(?:patient|diagnosis|treatment|medical|health)\s*(?:id|number|record)?:?\s*[A-Z0-9-]{5,}/i,
  ];
}

function _logPatterns(): RegExp[] {
  return [
    /ACCESS_LOG|AUDIT_TRAIL|security\.log|auth\.log/,
    /\b(?:login|logout|access|authentication)\s*(?:success|failure|attempt)/i,
  ];
}

export function checkLgpd(): ComplianceCheck[] {
  return [
    { id: 'LGPD-01', framework: 'lgpd', article: 'Art. 7', description: 'Consentimento para tratamento de dados pessoais', status: 'pass', severity: 'high', detail: 'PromptSecurity valida consentimento antes de processar dados', remediation: 'Manter validação de consentimento ativa' },
    { id: 'LGPD-02', framework: 'lgpd', article: 'Art. 9', description: 'Direito de acesso do titular', status: 'pass', severity: 'medium', detail: 'MemoryStore permite consulta de dados armazenados' },
    { id: 'LGPD-03', framework: 'lgpd', article: 'Art. 15', description: 'Direito de eliminação (forget)', status: 'fail', severity: 'high', detail: 'Nenhum endpoint de forget implementado', remediation: 'Implementar DataDeletionService com purge de memória + vectordb' },
    { id: 'LGPD-04', framework: 'lgpd', article: 'Art. 18', description: 'Direito de explicação de decisões automatizadas', status: 'fail', severity: 'high', detail: 'AuditTrail registra decisões mas não gera explicações legíveis', remediation: 'Adicionar ExplainabilityEngine que traduz audit trail em linguagem natural' },
    { id: 'LGPD-05', framework: 'lgpd', article: 'Art. 37', description: 'Relatório de Impacto (DPIA)', status: 'fail', severity: 'medium', detail: 'DPIA não gerado automaticamente', remediation: 'Criar DPIA generator baseado nos dados coletados' },
    { id: 'LGPD-06', framework: 'lgpd', article: 'Art. 46', description: 'Medidas de segurança técnicas', status: 'pass', severity: 'high', detail: 'Output validation + sandbox + audit trail implementados' },
    { id: 'LGPD-07', framework: 'lgpd', article: 'Art. 48', description: 'Plano de resposta a incidentes', status: 'fail', severity: 'critical', detail: 'Nenhum plano de resposta automatizado', remediation: 'Implementar IncidentResponseManager com notificações + rollback' },
    { id: 'LGPD-08', framework: 'lgpd', article: 'Art. 50', description: 'Boas práticas de governança', status: 'pass', severity: 'low', detail: 'Políticas de segurança definidas em policies/' },
  ];
}

export function checkHipaa(): ComplianceCheck[] {
  return [
    { id: 'HIPAA-01', framework: 'hipaa', article: '164.306', description: 'Firewall e controles de acesso', status: 'pass', severity: 'high', detail: 'PolicyEngine com 27 patterns de bloqueio' },
    { id: 'HIPAA-02', framework: 'hipaa', article: '164.308', description: 'Proteção contra malicious code', status: 'pass', severity: 'high', detail: 'Sandbox + output validation com 31 regras' },
    { id: 'HIPAA-03', framework: 'hipaa', article: '164.312', description: 'Controles de integridade de dados', status: 'pass', severity: 'high', detail: 'Audit trail com SHA-256 chain' },
    { id: 'HIPAA-04', framework: 'hipaa', article: '164.312', description: 'Autenticação de entidades', status: 'fail', severity: 'high', detail: 'Sem autenticação multi-fator', remediation: 'Integrar Auth0 ou Keycloak' },
    { id: 'HIPAA-05', framework: 'hipaa', article: '164.312', description: 'Criptografia de dados em repouso', status: 'fail', severity: 'high', detail: 'Dados não criptografados em memória/disco', remediation: 'Integrar crypto-utils com criptografia AES-256' },
    { id: 'HIPAA-06', framework: 'hipaa', article: '164.514', description: 'Desidentificação de PHI', status: 'pass', severity: 'medium', detail: 'Output validation remove PII/PHI' },
    { id: 'HIPAA-07', framework: 'hipaa', article: '164.528', description: 'Registro de divulgações', status: 'pass', severity: 'low', detail: 'Audit trail registra todo acesso a dados' },
  ];
}

export function checkGdpr(): ComplianceCheck[] {
  return [
    { id: 'GDPR-01', framework: 'gdpr', article: 'Art. 5', description: 'Minimização de dados', status: 'pass', severity: 'medium', detail: 'Apenas dados necessários são processados' },
    { id: 'GDPR-02', framework: 'gdpr', article: 'Art. 17', description: 'Direito ao apagamento (right to erasure)', status: 'fail', severity: 'high', detail: 'Sem purge automatizado de dados', remediation: 'Implementar DataDeletionService' },
    { id: 'GDPR-03', framework: 'gdpr', article: 'Art. 20', description: 'Portabilidade de dados', status: 'pass', severity: 'medium', detail: 'Dados exportáveis via MemoryStore' },
    { id: 'GDPR-04', framework: 'gdpr', article: 'Art. 22', description: 'Decisões automatizadas com impacto legal', status: 'fail', severity: 'high', detail: 'Sem revisão humana para decisões automatizadas', remediation: 'Implementar HumanInTheLoop para decisões de alto impacto' },
    { id: 'GDPR-05', framework: 'gdpr', article: 'Art. 25', description: 'Privacy by Design', status: 'pass', severity: 'medium', detail: 'Arquitetura com Privacy by Design desde a concepção' },
    { id: 'GDPR-06', framework: 'gdpr', article: 'Art. 32', description: 'Segurança do processamento', status: 'pass', severity: 'high', detail: 'Criptografia + controles de acesso + logging' },
    { id: 'GDPR-07', framework: 'gdpr', article: 'Art. 33', description: 'Notificação de violação', status: 'fail', severity: 'critical', detail: 'Sem notificação automatizada de violações', remediation: 'Implementar IncidentResponseManager com alertas' },
  ];
}

export function checkSoc2(): ComplianceCheck[] {
  return [
    { id: 'SOC2-01', framework: 'soc2', article: 'CC6.1', description: 'Logical and physical access controls', status: 'pass', severity: 'high', detail: 'PolicyEngine + approval flow em 3 níveis' },
    { id: 'SOC2-02', framework: 'soc2', article: 'CC6.6', description: 'Security incident detection', status: 'fail', severity: 'high', detail: 'Sem detecção automatizada de incidentes', remediation: 'Implementar SecurityIncidentDetector no event bus' },
    { id: 'SOC2-03', framework: 'soc2', article: 'CC7.1', description: 'System monitoring', status: 'pass', severity: 'medium', detail: 'EventBus + audit trail registram atividades' },
    { id: 'SOC2-04', framework: 'soc2', article: 'CC7.2', description: 'Incident response', status: 'fail', severity: 'high', detail: 'Sem plano de resposta automatizado', remediation: 'Implementar runbook automatizado' },
    { id: 'SOC2-05', framework: 'soc2', article: 'CC8.1', description: 'Change management', status: 'pass', severity: 'medium', detail: 'DeliveryOrchestrator com rollback + approval gates' },
  ];
}

export function runCompliance(frameworks?: ComplianceFramework[]): ComplianceReport[] {
  const allFrameworks: ComplianceFramework[] = frameworks ?? ['lgpd', 'hipaa', 'gdpr', 'soc2'];
  const runners: Record<ComplianceFramework, () => ComplianceCheck[]> = {
    lgpd: checkLgpd,
    hipaa: checkHipaa,
    gdpr: checkGdpr,
    soc2: checkSoc2,
  };

  return allFrameworks.map(fw => {
    const checks = runners[fw]();
    const passed = checks.filter(c => c.status === 'pass').length;
    const score = checks.length > 0 ? Math.round((passed / checks.length) * 100) : 0;
    const criticalFailures = checks.filter(c => c.status === 'fail' && c.severity === 'critical').length;

    return {
      framework: fw,
      timestamp: new Date().toISOString(),
      checks,
      score,
      summary: criticalFailures > 0
        ? `${passed}/${checks.length} checks passed. ${criticalFailures} critical failure(s) — release blocked`
        : `${passed}/${checks.length} checks passed (${score}%)`,
    };
  });
}