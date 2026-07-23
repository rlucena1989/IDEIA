import { Tutorial } from '../types';

export const contextPackCustomTutorial: Tutorial = {
  id: '06-context-pack-custom',
  name: 'Criando Context Pack Customizado',
  description: 'Aprenda a criar Context Packs personalizados para encapsular conhecimento especializado e regras de domínio para os agentes da IDEIA.',
  difficulty: 'advanced',
  prerequisites: ['05-novo-agente'],
  estimatedMinutes: 25,
  tags: ['context-pack', 'governanca', 'regras', 'dominio', 'avancado'],
  steps: [
    {
      id: 'understand-pack-format',
      title: 'Entender o formato de pack',
      description: 'Explore a estrutura de um Context Pack existente para entender o formato YAML e os componentes: regras, variáveis, exemplos e templates.',
      command: 'IDEIA context pack list',
      expectedOutput: 'pack',
      validationFn: (input: string) => input.includes('pack') || input.includes('Pack'),
      hint: 'Use IDEIA context pack list para ver packs existentes como referência',
      type: 'read'
    },
    {
      id: 'create-yaml-pack',
      title: 'Criar pack YAML',
      description: 'Use a IDEIA para gerar a estrutura base de um novo Context Pack.',
      command: 'IDEIA context pack create --name meu-pack-empresarial --description "Regras e padrões corporativos"',
      expectedOutput: 'Pack created',
      validationFn: (input: string) => input.includes('Pack created') || input.includes('pack created'),
      hint: 'IDEIA context pack create gera a estrutura completa do pack',
      type: 'shell'
    },
    {
      id: 'add-variables',
      title: 'Adicionar variáveis de contexto',
      description: 'Configure variáveis de contexto que serão injetadas nos agentes quando o pack estiver ativo.',
      command: 'IDEIA context pack variable add meu-pack-empresarial --key PROJECT_PREFIX --value "ACME" --description "Prefixo dos projetos ACME"',
      expectedOutput: 'Variable added',
      validationFn: (input: string) => input.includes('variable') || input.includes('Variable'),
      hint: 'IDEIA context pack variable add adiciona variáveis de ambiente para o pack',
      type: 'shell'
    },
    {
      id: 'register-in-registry',
      title: 'Registrar no registry',
      description: 'Ative o pack no registry global para que todos os agentes possam utilizá-lo.',
      command: 'IDEIA context pack activate meu-pack-empresarial --scope global',
      expectedOutput: 'activated',
      validationFn: (input: string) => input.includes('activate') || input.includes('activated'),
      hint: 'IDEIA context pack activate --scope global torna o pack disponível para todos os agentes',
      type: 'shell'
    },
    {
      id: 'test-injection',
      title: 'Testar injeção de contexto',
      description: 'Invoque um agente com o pack ativo e verifique se as regras e variáveis são aplicadas corretamente.',
      command: 'IDEIA agent run programmer --task "Criar um controller seguindo o pack ativo" --pack meu-pack-empresarial',
      expectedOutput: 'Context applied',
      validationFn: (input: string) => input.includes('Context') || input.includes('applied') || input.includes('created'),
      hint: 'O agente aplica automaticamente as regras e variáveis do pack ativo',
      type: 'shell'
    }
  ]
};
