import { Tutorial } from '../types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('03-api-externa');

export const apiExternaTutorial: Tutorial = {
  id: '03-api-externa',
  name: 'Integracao com API Externa',
  description: 'Aprenda a integrar sua aplicação com APIs externas usando a IDEIA. Consuma dados reais, trate erros e implemente cache.',
  difficulty: 'intermediate',
  prerequisites: ['02-crud-completo'],
  estimatedMinutes: 20,
  tags: ['api', 'integracao', 'http', 'cache', 'intermediario'],
  steps: [
    {
      id: 'setup-http-client',
      title: 'Configurar cliente HTTP',
      description: 'Use a IDEIA para gerar um cliente HTTP configurado para consumir APIs externas.',
      command: 'IDEIA generate integration github --output src/integrations/github.ts',
      expectedOutput: 'Integration created',
      validationFn: (input: string) => input.includes('integration') || input.includes('Integration'),
      hint: 'O comando generate integration cria um adapter para API externa',
      type: 'shell'
    },
    {
      id: 'consume-public-api',
      title: 'Consumir API pública',
      description: 'Implemente uma função que consome dados de uma API pública usando o cliente gerado.',
      command: 'IDEIA generate endpoint GET /repos --handler src/integrations/github.ts --method getRepos',
      expectedOutput: 'Endpoint created',
      validationFn: (input: string) => input.includes('endpoint') || input.includes('Endpoint'),
      hint: 'Use generate endpoint para criar rotas que consomem a API externa',
      type: 'shell'
    },
    {
      id: 'handle-errors',
      title: 'Tratar erros de API',
      description: 'Adicione tratamento de erros robusto para falhas de rede, timeouts e respostas inesperadas.',
      command: 'IDEIA generate middleware error-handler --type api --output src/middleware/error-handler.ts',
      expectedOutput: 'Middleware created',
      validationFn: (input: string) => input.includes('error') || input.includes('middleware'),
      hint: 'Gere um middleware de error handling com IDEIA generate middleware',
      type: 'shell'
    },
    {
      id: 'cache-responses',
      title: 'Implementar cache de respostas',
      description: 'Adicione uma camada de cache para evitar chamadas repetidas à API externa.',
      command: 'IDEIA generate cache --provider redis --ttl 300 --output src/cache/api-cache.ts',
      expectedOutput: 'Cache configured',
      validationFn: (input: string) => input.includes('cache') || input.includes('Cache'),
      hint: 'Use IDEIA generate cache para adicionar cache com Redis ou memória',
      type: 'shell'
    },
    {
      id: 'test-integration',
      title: 'Testar integração completa',
      description: 'Execute os testes de integração para verificar se tudo está funcionando.',
      command: 'npm run test:integration',
      expectedOutput: 'PASS',
      validationFn: (input: string) => input.includes('PASS') || input.includes('passing') || input.includes('Tests:'),
      hint: 'Execute npm run test:integration para rodar os testes de integração',
      type: 'shell'
    }
  ]
};
