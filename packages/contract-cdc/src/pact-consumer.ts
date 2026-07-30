import { PactContract, PactInteraction, ConsumerExpectation, PactFileV2 } from './types';
import { createLogger } from '@ideia/logger';
import { ContractCDC } from './contract-cdc';
const logger = createLogger('pact-consumer');

export interface PactConsumerConfig {
  consumerName: string;
  providerName: string;
  version: string;
  contractCDC: ContractCDC;
  pactSpecVersion?: string;
}

export interface PactConsumerOptions {
  providerState?: string;
  providerStateParams?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export class PactConsumer {
  private config: PactConsumerConfig;
  private interactions: PactInteraction[] = [];
  private cdc: ContractCDC;

  constructor(config: PactConsumerConfig) {
    this.config = config;
    this.cdc = config.contractCDC;
  }

  given(providerState: string, _params?: Record<string, unknown>): PactConsumer {
    const lastInteraction = this.interactions[this.interactions.length - 1];
    if (lastInteraction) {
      lastInteraction.providerState = providerState;
    }
    return this;
  }

  uponReceiving(description: string): PactConsumer {
    this.interactions.push({
      description,
      type: 'request-response',
      request: { method: 'GET', path: '/' },
      response: { status: 200 },
    });
    return this;
  }

  withRequest(method: string, path: string, options?: { headers?: Record<string, string>; query?: Record<string, string>; body?: unknown }): PactConsumer {
    const lastInteraction = this.interactions[this.interactions.length - 1];
    if (lastInteraction) {
      lastInteraction.request = {
        method,
        path,
        headers: options?.headers,
        query: options?.query,
        body: options?.body,
      };
    }
    return this;
  }

  willRespondWith(status: number, options?: { headers?: Record<string, string>; body?: unknown }): PactConsumer {
    const lastInteraction = this.interactions[this.interactions.length - 1];
    if (lastInteraction) {
      lastInteraction.response = {
        status,
        headers: options?.headers,
        body: options?.body,
      };
    }
    return this;
  }

  build(): PactContract {
    return {
      consumer: this.config.consumerName,
      provider: this.config.providerName,
      interactions: [...this.interactions],
      version: this.config.version,
      metadata: {
        generatedAt: new Date().toISOString(),
        interactionCount: this.interactions.length,
        pactSpecVersion: this.config.pactSpecVersion || '2.0.0',
      },
    };
  }

  exportPactJson(): PactFileV2 {
    const specVersion = this.config.pactSpecVersion || '2.0.0';
    return {
      consumer: { name: this.config.consumerName },
      provider: { name: this.config.providerName },
      interactions: this.interactions.map(i => {
        const pactV2: PactInteraction = {
          description: i.description,
          type: 'request-response',
          request: {
            method: i.request.method,
            path: i.request.path,
            headers: i.request.headers,
            query: i.request.query,
            body: i.request.body,
          },
          response: {
            status: i.response.status,
            headers: i.response.headers,
            body: i.response.body,
          },
        };
        if (i.providerState) {
          pactV2.providerState = i.providerState;
        }
        return pactV2;
      }),
      metadata: {
        pactSpecification: { version: specVersion },
        generatedAt: new Date().toISOString(),
        interactionCount: this.interactions.length,
        consumerVersion: this.config.version,
      },
    };
  }

  register(): ConsumerExpectation[] {
    const pact = this.build();
    this.cdc.registerPact(pact);
    return this.interactions.map(interaction =>
      this.cdc.addExpectation(
        this.config.consumerName,
        this.config.providerName,
        interaction,
      )
    );
  }

  clear(): void {
    this.interactions = [];
  }
}

export function createPactConsumer(config: PactConsumerConfig): PactConsumer {
  return new PactConsumer(config);
}
