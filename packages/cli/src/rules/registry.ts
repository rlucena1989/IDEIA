/** Interface que define a estrutura de rule pack manifest. */
export interface RulePackManifest {
  name: string;
  version: string;
  description?: string;
  tags: string[];
  rules: RulePackEntry[];
}

/** Interface que define a estrutura de rule pack entry. */
export interface RulePackEntry {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  target: 'laws.yaml' | 'policy' | 'quality' | 'security';
}

/** Processa u i l t_ i n_ p a c k s. */
export const BUILT_IN_PACKS: RulePackManifest[] = [
  {
    name: 'soc2-basics',
    version: '1.0.0',
    description: 'Regras basicas para conformidade SOC 2',
    tags: ['compliance', 'soc2', 'security'],
    rules: [
      { id: 'SOC2-ACCESS', title: 'Controle de Acesso', description: 'Implementar controle de acesso baseado em papeis', severity: 'critical', target: 'laws.yaml' },
      { id: 'SOC2-MONITOR', title: 'Monitoramento', description: 'Implementar monitoramento continuo de seguranca', severity: 'high', target: 'policy' },
      { id: 'SOC2-CHANGE', title: 'Gestao de Mudancas', description: 'Processo formal de revisao de mudancas', severity: 'high', target: 'policy' },
      { id: 'SOC2-DATA', title: 'Integridade de Dados', description: 'Validar consistencia de dados processados', severity: 'high', target: 'quality' },
    ]
  },
  {
    name: 'react-testing',
    version: '1.0.0',
    description: 'Melhores praticas para testes React com Testing Library',
    tags: ['react', 'testing', 'frontend'],
    rules: [
      { id: 'RTL-001', title: 'Render Simples', description: 'Prefira render simples a setups complexos', severity: 'medium', target: 'quality' },
      { id: 'RTL-002', title: 'Teste de Comportamento', description: 'Teste comportamento do usuario, nao implementacao', severity: 'medium', target: 'quality' },
      { id: 'RTL-003', title: 'Acessibilidade', description: 'Use getByRole para elementos acessiveis', severity: 'medium', target: 'quality' },
      { id: 'RTL-004', title: 'Evite waitFor Desnecessario', description: 'Use findBy em vez de waitFor + getBy', severity: 'low', target: 'quality' },
    ]
  },
  {
    name: 'api-security',
    version: '1.0.0',
    description: 'Regras de seguranca para APIs REST/GraphQL',
    tags: ['api', 'security', 'backend'],
    rules: [
      { id: 'API-001', title: 'Autenticacao', description: 'Toda rota deve ter autenticacao explicita', severity: 'critical', target: 'laws.yaml' },
      { id: 'API-002', title: 'Rate Limiting', description: 'Implementar limitacao de taxa', severity: 'high', target: 'security' },
      { id: 'API-003', title: 'Input Validation', description: 'Validar todas as entradas da API', severity: 'critical', target: 'laws.yaml' },
      { id: 'API-004', title: 'CORS', description: 'Configurar CORS corretamente', severity: 'high', target: 'policy' },
      { id: 'API-005', title: 'HTTPS Only', description: 'Forcar HTTPS em producao', severity: 'critical', target: 'security' },
    ]
  },
  {
    name: 'nestjs-best-practices',
    version: '1.0.0',
    description: 'Boas praticas para projetos NestJS',
    tags: ['nestjs', 'backend', 'typescript'],
    rules: [
      { id: 'NEST-001', title: 'Clean Architecture', description: 'Manter separacao de camadas (domain, application, infra)', severity: 'high', target: 'laws.yaml' },
      { id: 'NEST-002', title: 'Dependency Injection', description: 'Usar injecao de dependencia do NestJS', severity: 'medium', target: 'policy' },
      { id: 'NEST-003', title: 'DTO Validation', description: 'Validar DTOs com class-validator', severity: 'high', target: 'quality' },
      { id: 'NEST-004', title: 'Exception Filters', description: 'Usar filtros de excecao globais', severity: 'medium', target: 'policy' },
    ]
  }
];
