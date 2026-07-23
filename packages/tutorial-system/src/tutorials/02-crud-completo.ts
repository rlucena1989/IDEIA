import { Tutorial } from '../types';

export const crudCompletoTutorial: Tutorial = {
  id: '02-crud-completo',
  name: 'CRUD Completo',
  description: 'Crie uma API REST completa com operações CRUD usando a IDEIA. Do scaffold ao teste com curl.',
  difficulty: 'intermediate',
  prerequisites: ['01-primeiro-projeto'],
  estimatedMinutes: 20,
  tags: ['crud', 'api', 'rest', 'backend', 'intermediario'],
  steps: [
    {
      id: 'scaffold-api',
      title: 'Scaffold do projeto API',
      description: 'Inicialize um projeto API REST com template e banco de dados.',
      command: 'IDEIA init crud-app --template rest-api --db postgres',
      expectedOutput: 'Initialized',
      validationFn: (input: string) => input.includes('init') && input.includes('crud-app'),
      hint: 'Use IDEIA init crud-app --template rest-api para criar uma API REST',
      type: 'shell'
    },
    {
      id: 'create-model',
      title: 'Criar modelo/schema',
      description: 'Defina o modelo de dados User com campos id, name, email usando o gerador da IDEIA.',
      command: 'IDEIA generate model user --fields name:string,email:string',
      expectedOutput: 'Model created',
      validationFn: (input: string) => input.includes('model') && input.includes('user'),
      hint: 'Comando: IDEIA generate model user --fields name:string,email:string',
      type: 'shell'
    },
    {
      id: 'implement-crud',
      title: 'Implementar endpoints CRUD',
      description: 'Gere automaticamente as rotas CRUD para o modelo User.',
      command: 'IDEIA generate crud User',
      expectedOutput: 'CRUD generated',
      validationFn: (input: string) => input.includes('crud') || input.includes('CRUD'),
      hint: 'O comando generate crud cria GET, POST, PUT, DELETE automaticamente',
      type: 'shell'
    },
    {
      id: 'add-validation',
      title: 'Adicionar validação',
      description: 'Adicione regras de validação aos campos do modelo usando a IDEIA.',
      command: 'IDEIA generate validation user --rules email:required,email:format',
      expectedOutput: 'Validation added',
      validationFn: (input: string) => input.includes('validation') || input.includes('Validation'),
      hint: 'Use IDEIA generate validation user --rules para adicionar validações',
      type: 'shell'
    },
    {
      id: 'test-with-curl',
      title: 'Testar com curl',
      description: 'Inicie o servidor e faça uma requisição de teste com curl para verificar o CRUD funcionando.',
      command: 'curl -X POST http://localhost:3000/users -H "Content-Type: application/json" -d \'{"name":"Teste","email":"teste@teste.com"}\'',
      expectedOutput: '"id"',
      validationFn: (input: string) => input.includes('curl') || input.includes('200') || input.includes('"id"'),
      hint: 'Primeiro inicie o servidor com npm run dev, depois execute o curl',
      type: 'shell'
    }
  ]
};
