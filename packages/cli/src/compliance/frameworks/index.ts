/** Interface que define a estrutura de framework definition. */
export interface FrameworkDefinition {
  id: string;
  name: string;
  description: string;
  requirements: FrameworkRequirement[];
}

/** Interface que define a estrutura de framework requirement. */
export interface FrameworkRequirement {
  id: string;
  title: string;
  description: string;
  keywords: string[];
}

/** Processa r a m e w o r k s. */
export const FRAMEWORKS: FrameworkDefinition[] = [
  {
    id: 'soc2',
    name: 'SOC 2',
    description: 'Service Organization Control 2 — seguranca, disponibilidade, integridade, confidencialidade, privacidade',
    requirements: [
      { id: 'SOC2-CC1', title: 'Controle de Acesso', description: 'Implementar controle de acesso logico', keywords: ['acesso', 'access', 'auth', 'autenticacao', 'permissao'] },
      { id: 'SOC2-CC2', title: 'Monitoramento Contínuo', description: 'Monitoramento continuo de seguranca', keywords: ['monitor', 'audit', 'log', 'observabilidade'] },
      { id: 'SOC2-CC3', title: 'Gestão de Mudanças', description: 'Processo formal de gestao de mudancas', keywords: ['mudanca', 'change', 'versionamento', 'review'] },
      { id: 'SOC2-CC4', title: 'Integridade de Dados', description: 'Garantir integridade dos dados processados', keywords: ['integridade', 'validacao', 'validation', 'check'] },
      { id: 'SOC2-CC5', title: 'Disponibilidade', description: 'Garantir disponibilidade do sistema', keywords: ['disponibilidade', 'availability', 'backup', 'recovery'] },
      { id: 'SOC2-CC6', title: 'Confidencialidade', description: 'Proteger dados confidenciais', keywords: ['confidencial', 'secret', 'senha', 'encrypt', 'cripto'] },
    ]
  },
  {
    id: 'pci-dss',
    name: 'PCI DSS',
    description: 'Payment Card Industry Data Security Standard',
    requirements: [
      { id: 'PCI-1', title: 'Firewall', description: 'Instalar e manter configuracao de firewall', keywords: ['firewall', 'rede', 'network', 'porta'] },
      { id: 'PCI-2', title: 'Senhas Seguras', description: 'Nao usar senhas padrao do fornecedor', keywords: ['senha', 'password', 'credential', 'default'] },
      { id: 'PCI-3', title: 'Dados do Portador', description: 'Proteger dados do portador do cartao armazenados', keywords: ['card', 'pagamento', 'payment', 'ccnum', 'pan'] },
      { id: 'PCI-4', title: 'Criptografia', description: 'Criptografar dados do titular transmitidos', keywords: ['cripto', 'encrypt', 'tls', 'ssl', 'https'] },
      { id: 'PCI-5', title: 'Anti-malware', description: 'Proteger sistemas contra malware', keywords: ['malware', 'virus', 'antivirus', 'scan'] },
      { id: 'PCI-6', title: 'Acesso Restrito', description: 'Restringir acesso a dados por necessidade', keywords: ['acesso', 'permissao', 'role', 'rbac', 'minimo'] },
    ]
  },
  {
    id: 'gdpr',
    name: 'GDPR',
    description: 'General Data Protection Regulation — protecao de dados pessoais na UE',
    requirements: [
      { id: 'GDPR-5', title: 'Consentimento', description: 'Obter consentimento explicito para processamento', keywords: ['consentimento', 'consent', 'opt-in', 'privacidade'] },
      { id: 'GDPR-6', title: 'Minimizacao', description: 'Coletar apenas dados necessarios', keywords: ['minimo', 'minimizacao', 'necessario', 'coleta'] },
      { id: 'GDPR-7', title: 'Retencao', description: 'Limitar tempo de retencao de dados', keywords: ['retencao', 'retention', 'delete', 'excluir', 'ttl'] },
      { id: 'GDPR-8', title: 'Transparencia', description: 'Informar titulares sobre processamento', keywords: ['transparencia', 'privacy', 'policy', 'aviso'] },
      { id: 'GDPR-9', title: 'Portabilidade', description: 'Permitir exportacao de dados do titular', keywords: ['portabilidade', 'export', 'download', 'portability'] },
      { id: 'GDPR-10', title: 'Seguranca', description: 'Implementar medidas tecnicas de seguranca', keywords: ['seguranca', 'security', 'protecao', 'safety'] },
    ]
  },
  {
    id: 'lgpd',
    name: 'LGPD',
    description: 'Lei Geral de Protecao de Dados — legislacao brasileira de privacidade',
    requirements: [
      { id: 'LGPD-1', title: 'Base Legal', description: 'Identificar base legal para processamento', keywords: ['base legal', 'consentimento', 'legitimo', 'obrigacao legal'] },
      { id: 'LGPD-2', title: 'Direitos do Titular', description: 'Garantir direitos de acesso, correcao, exclusao', keywords: ['titular', 'acesso', 'correcao', 'exclusao', 'direito'] },
      { id: 'LGPD-3', title: 'Seguranca', description: 'Implementar medidas de seguranca', keywords: ['seguranca', 'security', 'protecao', 'incidente'] },
      { id: 'LGPD-4', title: 'Agente de Tratamento', description: 'Designar encarregado de dados', keywords: ['encarregado', 'dpo', 'controlador', 'operador'] },
      { id: 'LGPD-5', title: 'Relatorio de Impacto', description: 'Elaborar relatorio de impacto a privacidade', keywords: ['impacto', 'ripd', 'dpia', 'avaliacao'] },
    ]
  },
  {
    id: 'iso27001',
    name: 'ISO 27001',
    description: 'International Standard for Information Security Management',
    requirements: [
      { id: 'ISO-A5', title: 'Politicas de Seguranca', description: 'Politica de seguranca da informacao', keywords: ['politica', 'policy', 'seguranca', 'information security'] },
      { id: 'ISO-A6', title: 'Organizacao', description: 'Atribuicao de responsabilidades de seguranca', keywords: ['responsabilidade', 'organizacao', 'papeis', 'roles'] },
      { id: 'ISO-A7', title: 'Recursos Humanos', description: 'Seguranca antes, durante e apos contratacao', keywords: ['rh', 'humano', 'treinamento', 'conduta'] },
      { id: 'ISO-A8', title: 'Gestao de Ativos', description: 'Inventario e classificacao de ativos', keywords: ['ativo', 'asset', 'inventario', 'classificacao'] },
      { id: 'ISO-A9', title: 'Controle de Acesso', description: 'Controle de acesso logico e fisico', keywords: ['acesso', 'access', 'permissao', 'rbac'] },
      { id: 'ISO-A10', title: 'Criptografia', description: 'Criptografia e gestao de chaves', keywords: ['cripto', 'encrypt', 'chave', 'key', 'certificado'] },
      { id: 'ISO-A12', title: 'Seguranca Operacional', description: 'Procedimentos operacionais de seguranca', keywords: ['operacional', 'procedimento', 'backup', 'monitor'] },
      { id: 'ISO-A16', title: 'Gestao de Incidentes', description: 'Gestao de incidentes de seguranca', keywords: ['incidente', 'incident', 'resposta', 'escalacao'] },
      { id: 'ISO-A18', title: 'Conformidade', description: 'Conformidade com requisitos legais', keywords: ['conformidade', 'compliance', 'legal', 'regulatorio'] },
    ]
  },
  {
    id: 'hipaa',
    name: 'HIPAA',
    description: 'Health Insurance Portability and Accountability Act — protecao de dados de saude nos EUA',
    requirements: [
      { id: 'HIPAA-164.306', title: 'Politicas de Seguranca', description: 'Implementar politicas e procedimentos de seguranca', keywords: ['politica', 'policy', 'seguranca', 'hipaa', 'health', 'procedimento'] },
      { id: 'HIPAA-164.308', title: 'Responsaveis pela Seguranca', description: 'Designar responsavel pela seguranca da informacao', keywords: ['responsavel', 'security officer', 'cso', 'ciso', 'gestao'] },
      { id: 'HIPAA-164.310', title: 'Controles de Acesso Fisico', description: 'Controles de acesso a instalacoes e estacoes de trabalho', keywords: ['acesso', 'fisico', 'estacao', 'instalacao', 'workstation'] },
      { id: 'HIPAA-164.312', title: 'Controles Tecnicos', description: 'Controles de acesso, auditoria, integridade e transmissao', keywords: ['tecnico', 'acesso', 'auditoria', 'integridade', 'transmissao', 'autenticacao'] },
      { id: 'HIPAA-164.314', title: 'Contratos de Associados', description: 'Acordos com associados de negocios (BAA)', keywords: ['associado', 'baa', 'contrato', 'terceiro', 'business associate'] },
      { id: 'HIPAA-164.316', title: 'Documentacao', description: 'Manter documentacao de politicas e procedimentos', keywords: ['documentacao', 'registro', 'policy', 'procedimento', 'arquivamento'] },
      { id: 'HIPAA-164.520', title: 'Aviso de Privacidade', description: 'Fornecer aviso de praticas de privacidade', keywords: ['aviso', 'privacidade', 'privacy notice', 'paciente', 'health'] },
      { id: 'HIPAA-164.522', title: 'Direitos do Paciente', description: 'Direito de acessar, emendar e restringir divulgacao', keywords: ['paciente', 'direito', 'acesso', 'emendar', 'restricao', 'divulgacao'] },
      { id: 'HIPAA-164.528', title: 'Contabilidade de Divulgacoes', description: 'Manter registro de divulgacoes de PHI', keywords: ['divulgacao', 'phi', 'accounting', 'registro', 'disclosure'] },
      { id: 'HIPAA-164.530', title: 'Treinamento e Sancao', description: 'Treinar equipe e aplicar sancões por violacao', keywords: ['treinamento', 'sancao', 'equipe', 'training', 'violacao'] },
    ]
  }
];

/**
 * Obtém framework.
 * @param id - Valor id.
 * @returns O resultado da operação.
 */
export function getFramework(id: string): FrameworkDefinition | undefined {
  return FRAMEWORKS.find(f => f.id === id);
}

/**
 * Processa frameworks.
 * @returns O resultado da operação.
 */
export function listFrameworks(): string[] {
  return FRAMEWORKS.map(f => f.id);
}
