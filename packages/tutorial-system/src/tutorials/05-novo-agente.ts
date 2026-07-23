import { Tutorial } from '../types';

export const novoAgenteTutorial: Tutorial = {
  id: '05-novo-agente',
  name: 'Adicionando Novo Agente',
  description: 'Aprenda a criar e registrar um novo agente especializado na IDEIA. Entenda a interface de agente, implemente ferramentas e integre ao runtime.',
  difficulty: 'advanced',
  prerequisites: ['02-crud-completo', '03-api-externa'],
  estimatedMinutes: 25,
  tags: ['agente', 'extensao', 'runtime', 'tools', 'avancado'],
  steps: [
    {
      id: 'understand-agent-interface',
      title: 'Entender a interface de agente',
      description: 'Leia a documentação da interface Agent para entender os contratos que precisa implementar. Explore os agentes existentes como referência.',
      command: 'IDEIA agent list',
      expectedOutput: 'Agent',
      validationFn: (input: string) => input.includes('Agent') || input.includes('agent') || input.includes('Analyst'),
      hint: 'Use IDEIA agent list para ver todos os agentes disponíveis como referência',
      type: 'shell'
    },
    {
      id: 'create-agent-class',
      title: 'Criar classe do agente',
      description: 'Use a IDEIA para gerar o scaffold de um novo agente especializado.',
      command: 'IDEIA generate agent my-custom-agent --description "Agente para análise de dados" --output src/agents/my-custom-agent.ts',
      expectedOutput: 'Agent created',
      validationFn: (input: string) => input.includes('agent') && (input.includes('my-custom') || input.includes('Agent')),
      hint: 'IDEIA generate agent cria o scaffold completo com interface e métodos',
      type: 'shell'
    },
    {
      id: 'register-tools',
      title: 'Registrar ferramentas do agente',
      description: 'Adicione ferramentas personalizadas ao seu agente para que ele possa executar ações específicas.',
      command: 'IDEIA agent tool add my-custom-agent --name analyze-data --description "Analisa dados estruturados" --params filepath:string',
      expectedOutput: 'Tool added',
      validationFn: (input: string) => input.includes('tool') || input.includes('Tool'),
      hint: 'Use IDEIA agent tool add para registrar ferramentas no agente',
      type: 'shell'
    },
    {
      id: 'add-to-runtime',
      title: 'Adicionar agente ao runtime',
      description: 'Registre o novo agente no runtime da IDEIA para que ele possa ser invocado.',
      command: 'IDEIA agent register my-custom-agent --level N2 --runtime default',
      expectedOutput: 'registered',
      validationFn: (input: string) => input.includes('register') || input.includes('registered'),
      hint: 'IDEIA agent register ativa o agente no runtime com nível de autonomia',
      type: 'shell'
    },
    {
      id: 'test-interaction',
      title: 'Testar interação com o agente',
      description: 'Invoque seu novo agente e verifique se ele responde corretamente.',
      command: 'IDEIA agent run my-custom-agent --task "Analise os dados da pasta atual"',
      expectedOutput: 'Analysis complete',
      validationFn: (input: string) => input.includes('Analysis') || input.includes('complete') || input.includes('successful'),
      hint: 'Use IDEIA agent run para testar seu agente com uma tarefa real',
      type: 'shell'
    }
  ]
};
