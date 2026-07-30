import { IdeiaClientConfig, RetryConfig } from './types'
import { createLogger } from '@ideia/logger';
const logger = createLogger('sdk-client-generator');

export class SDKClientGenerator {
  generateClientCode(config: IdeiaClientConfig): string {
    return `import { IdeiaClient } from '@ideia/api-sdk';

const client = new IdeiaClient({
  apiKey: process.env.IDEIA_API_KEY,
  baseUrl: '${config.baseUrl}',
  timeout: ${config.timeout || 30000},
  retry: ${JSON.stringify(config.retry || { maxRetries: 3, backoff: 'exponential', retryOn: [429, 500, 502, 503] })}
});

export default client;
`
  }

  generateUsageExample(): string {
    return `// Example usage
import client from './client';

async function main() {
  // List projects
  const projects = await client.listProjects();
  logger.info(projects);

  // Execute agent
  const execution = await client.executeAgent('programmer', {
    task: 'Implement feature',
    projectId: 'proj_123'
  });
  logger.info('Execution', { executionId: execution.executionId });
}
`
  }
}
