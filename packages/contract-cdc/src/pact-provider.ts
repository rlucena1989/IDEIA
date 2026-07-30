import { Server, IncomingMessage, ServerResponse, createServer } from 'http';
import { createLogger } from '@ideia/logger';
import {
  PactContract,
  PactInteraction,
  ProviderVerificationResult,
  PactFileV2,
  MockServerConfig,
  BrokerConfig,
  BrokerPublishResult,
  BrokerRetrieveResult,
  VerifiedInteractionResult,
} from './types';
import { ContractCDC } from './contract-cdc';
const logger = createLogger('pact-provider');

export interface PactProviderConfig {
  providerName: string;
  version: string;
  contractCDC: ContractCDC;
}

export interface PactProviderState {
  name: string;
  setup: () => Promise<void> | void;
  teardown?: () => Promise<void> | void;
}

export class PactProvider {
  private config: PactProviderConfig;
  private cdc: ContractCDC;
  private states: Map<string, PactProviderState> = new Map();
  private handlers: Map<string, (request: PactInteraction['request']) => PactInteraction['response']> = new Map();
  private mockServer: Server | null = null;

  constructor(config: PactProviderConfig) {
    this.config = config;
    this.cdc = config.contractCDC;
  }

  registerState(name: string, state: Omit<PactProviderState, 'name'>): void {
    this.states.set(name, { name, ...state });
  }

  registerHandler(description: string, handler: (request: PactInteraction['request']) => PactInteraction['response']): void {
    this.handlers.set(description, handler);
  }

  async verify(consumerPact: PactContract): Promise<ProviderVerificationResult> {
    const failures: ProviderVerificationResult['failures'] = [];
    let passedCount = 0;
    const total = consumerPact.interactions.length;

    for (const interaction of consumerPact.interactions) {
      try {
        if (interaction.providerState) {
          const state = this.states.get(interaction.providerState);
          if (state) {
            await state.setup();
          }
        }

        const handler = this.handlers.get(interaction.description);
        if (!handler) {
          failures.push({
            interaction: interaction.description,
            reason: `No handler registered for interaction: ${interaction.description}`,
            expected: interaction.response,
            actual: null,
          });
          continue;
        }

        const actualResponse = handler(interaction.request);
        const expectedResponse = interaction.response;

        if (actualResponse.status !== expectedResponse.status) {
          failures.push({
            interaction: interaction.description,
            reason: `Status mismatch: expected ${expectedResponse.status}, got ${actualResponse.status}`,
            expected: expectedResponse.status,
            actual: actualResponse.status,
          });
          continue;
        }

        if (expectedResponse.body !== undefined) {
          const expectedBody = JSON.stringify(expectedResponse.body);
          const actualBody = JSON.stringify(actualResponse.body);
          if (expectedBody !== actualBody) {
            failures.push({
              interaction: interaction.description,
              reason: 'Response body mismatch',
              expected: expectedResponse.body,
              actual: actualResponse.body,
            });
            continue;
          }
        }

        passedCount++;

        if (interaction.providerState) {
          const state = this.states.get(interaction.providerState);
          if (state?.teardown) {
            await state.teardown();
          }
        }
      } catch (err) {
        failures.push({
          interaction: interaction.description,
          reason: `Handler threw: ${err instanceof Error ? err.message : String(err)}`,
          expected: interaction.response,
          actual: null,
        });
      }
    }

    return {
      provider: this.config.providerName,
      passed: failures.length === 0,
      failures,
      summary: { total, passed: passedCount, failed: failures.length },
    };
  }

  async startMockServer(config: MockServerConfig): Promise<number> {
    return new Promise((resolve, reject) => {
      if (this.mockServer) {
        reject(new Error('Mock server already running'));
        return;
      }

      const server = createServer((req: IncomingMessage, res: ServerResponse) => {
        this.handleMockRequest(req, res);
      });

      server.listen(config.port, config.host || '127.0.0.1', () => {
        this.mockServer = server;
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          resolve(addr.port);
        } else {
          resolve(config.port);
        }
      });

      server.on('error', (err: Error) => {
        reject(err);
      });
    });
  }

  async stopMockServer(): Promise<void> {
    return new Promise((resolve) => {
      if (this.mockServer) {
        this.mockServer.close(() => {
          this.mockServer = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  isMockServerRunning(): boolean {
    return this.mockServer !== null;
  }

  async verifyWithRealRequests(port: number, pact: PactContract): Promise<VerifiedInteractionResult[]> {
    const results: VerifiedInteractionResult[] = [];
    const http = await import('http');

    for (const interaction of pact.interactions) {
      try {
        const result = await this.sendRealRequest(http, port, interaction);
        results.push(result);
      } catch (err) {
        results.push({
          description: interaction.description,
          passed: false,
          requestMethod: interaction.request.method,
          requestPath: interaction.request.path,
          expectedStatus: interaction.response.status,
          actualStatus: -1,
          bodyMatch: false,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return results;
  }

  private sendRealRequest(
    httpModule: typeof import('http'),
    port: number,
    interaction: PactInteraction,
  ): Promise<VerifiedInteractionResult> {
    return new Promise((resolve, reject) => {
      const bodyStr = interaction.request.body ? JSON.stringify(interaction.request.body) : undefined;
      const options: import('http').RequestOptions = {
        hostname: '127.0.0.1',
        port,
        path: interaction.request.path,
        method: interaction.request.method,
        headers: {
          ...interaction.request.headers,
          'Content-Type': 'application/json',
          'Content-Length': bodyStr ? Buffer.byteLength(bodyStr).toString() : '0',
        },
      };

      const req = httpModule.request(options, (res: IncomingMessage) => {
        let data = '';
        res.on('data', (chunk: string) => {
          data += chunk;
        });
        res.on('end', () => {
          let actualBody: unknown;
          try {
            actualBody = data ? JSON.parse(data) : undefined;
          } catch {
            actualBody = data;
          }

          const statusMatch = res.statusCode === interaction.response.status;
          let bodyMatch = true;
          if (interaction.response.body !== undefined) {
            const expectedStr = JSON.stringify(interaction.response.body);
            const actualStr = JSON.stringify(actualBody);
            bodyMatch = expectedStr === actualStr;
          }

          resolve({
            description: interaction.description,
            success: statusMatch && bodyMatch,
            passed: statusMatch && bodyMatch,
            requestMethod: interaction.request.method,
            requestPath: interaction.request.path,
            expectedStatus: interaction.response.status,
            actualStatus: res.statusCode || -1,
            bodyMatch,
            error: !statusMatch
              ? `Status ${res.statusCode} !== ${interaction.response.status}`
              : !bodyMatch
                ? 'Response body mismatch'
                : undefined,
          });
        });
      });

      req.on('error', (err: Error) => {
        reject(err);
      });

      if (bodyStr) {
        req.write(bodyStr);
      }
      req.end();
    });
  }

  private handleMockRequest(req: IncomingMessage, res: ServerResponse): void {
    const method = req.method || 'GET';
    const path = req.url || '/';
    let body = '';

    req.on('data', (chunk: string) => {
      body += chunk;
    });
    req.on('end', () => {
      let parsedBody: unknown;
      try {
        parsedBody = body ? JSON.parse(body) : undefined;
      } catch {
        parsedBody = body;
      }

      for (const [, handler] of this.handlers) {
        const response = handler({
          method,
          path,
          body: parsedBody,
        });

        if (response) {
          res.writeHead(response.status, {
            'Content-Type': 'application/json',
            ...response.headers,
          });
          res.end(JSON.stringify(response.body));
          return;
        }
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `No handler for ${method} ${path}` }));
    });
  }

  async publishToBroker(pact: PactFileV2, config: BrokerConfig): Promise<BrokerPublishResult> {
    try {
      const url = `${config.baseUrl}/contracts/pact`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(config.authToken ? { Authorization: `Bearer ${config.authToken}` } : {}),
        },
        body: JSON.stringify(pact),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Broker returned ${response.status}: ${response.statusText}`,
        };
      }

      const result = await response.json();
      return {
        success: true,
        pactUrl: result._links?.self?.href || `${config.baseUrl}/contracts/${pact.consumer.name}/${pact.provider.name}`,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async retrieveFromBroker(consumer: string, provider: string, config: BrokerConfig): Promise<BrokerRetrieveResult> {
    try {
      const url = `${config.baseUrl}/contracts/pact/${encodeURIComponent(consumer)}/${encodeURIComponent(provider)}/latest`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(config.authToken ? { Authorization: `Bearer ${config.authToken}` } : {}),
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Broker returned ${response.status}: ${response.statusText}`,
        };
      }

      const pact = (await response.json()) as PactFileV2;
      return {
        success: true,
        pacts: [pact as any],
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async retrieveAllFromBroker(config: BrokerConfig, provider?: string): Promise<BrokerRetrieveResult> {
    try {
      let url = `${config.baseUrl}/contracts/pact`;
      if (provider) {
        url += `?provider=${encodeURIComponent(provider)}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(config.authToken ? { Authorization: `Bearer ${config.authToken}` } : {}),
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Broker returned ${response.status}: ${response.statusText}`,
        };
      }

      const pacts = (await response.json()) as PactFileV2[];
      return {
        success: true,
        pacts: pacts as any,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  createContractForConsumer(consumerName: string, version: string): PactContract {
    const interactions: PactInteraction[] = [];
    for (const [description] of this.handlers) {
      interactions.push({
        description,
        type: 'request-response',
        request: { method: 'GET', path: '/' },
        response: { status: 200 },
      });
    }
    return {
      consumer: consumerName,
      provider: this.config.providerName,
      interactions,
      version,
      metadata: { generatedAt: new Date().toISOString() },
    };
  }
}

export function createPactProvider(config: PactProviderConfig): PactProvider {
  return new PactProvider(config);
}
