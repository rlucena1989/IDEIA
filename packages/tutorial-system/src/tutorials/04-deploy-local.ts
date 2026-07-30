import { Tutorial } from '../types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('04-deploy-local');

export const deployLocalTutorial: Tutorial = {
  id: '04-deploy-local',
  name: 'Deploy Local',
  description: 'Aprenda a conteinerizar e fazer deploy local da sua aplicação usando Docker e Docker Compose com a IDEIA.',
  difficulty: 'intermediate',
  prerequisites: ['02-crud-completo'],
  estimatedMinutes: 15,
  tags: ['deploy', 'docker', 'devops', 'infra', 'intermediario'],
  steps: [
    {
      id: 'configure-docker',
      title: 'Configurar Dockerfile',
      description: 'Use a IDEIA para gerar um Dockerfile otimizado com multi-stage build para sua aplicação.',
      command: 'IDEIA generate docker --output Dockerfile --port 3000',
      expectedOutput: 'Dockerfile created',
      validationFn: (input: string) => input.includes('Dockerfile') || input.includes('docker'),
      hint: 'O comando generate docker cria um Dockerfile com multi-stage build',
      type: 'shell'
    },
    {
      id: 'build-image',
      title: 'Construir imagem Docker',
      description: 'Faça o build da imagem Docker da sua aplicação.',
      command: 'docker build -t minha-app:latest .',
      expectedOutput: 'Successfully built',
      validationFn: (input: string) => input.includes('Successfully') || input.includes('built') || input.includes('docker build'),
      hint: 'Execute docker build -t minha-app:latest . para construir a imagem',
      type: 'shell'
    },
    {
      id: 'docker-compose-up',
      title: 'Subir com Docker Compose',
      description: 'Configure e inicie todos os serviços com Docker Compose.',
      command: 'docker-compose up --build -d',
      expectedOutput: 'Started',
      validationFn: (input: string) => input.includes('docker-compose') || input.includes('Started'),
      hint: 'Use docker-compose up --build -d para iniciar em background',
      type: 'shell'
    },
    {
      id: 'health-check',
      title: 'Verificar health check',
      description: 'Confirme que a aplicação está rodando corretamente com um health check.',
      command: 'curl http://localhost:3000/health',
      expectedOutput: 'ok',
      validationFn: (input: string) => input.includes('ok') || input.includes('200') || input.includes('healthy'),
      hint: 'O endpoint /health retorna o status da aplicação',
      type: 'shell'
    },
    {
      id: 'stop-cleanup',
      title: 'Parar e limpar',
      description: 'Aprenda a parar os serviços e limpar os recursos Docker corretamente.',
      command: 'docker-compose down --volumes',
      expectedOutput: 'Removing',
      validationFn: (input: string) => input.includes('down') || input.includes('Removing') || input.includes('Stopping'),
      hint: 'docker-compose down --volumes para parar e remover volumes',
      type: 'shell'
    }
  ]
};
