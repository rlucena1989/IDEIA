import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import { BumpType, CDCContract, ContractDiff, VersionSuggestion, PactContract, PactInteraction, ConsumerExpectation, ProviderVerificationResult, CompatibilityMatrix, CompatibilityMatrixEntry, PublishedContract, ContractStatus } from './types';

const DEFAULT_PERSIST_DIR = '.ai/contract-cdc';

export class ContractCDC {
  private contracts: Map<string, CDCContract> = new Map();
  private pacts: Map<string, PactContract> = new Map();
  private expectations: Map<string, ConsumerExpectation[]> = new Map();
  private publishDir: string = DEFAULT_PERSIST_DIR;

  setPublishDir(dir: string): void {
    this.publishDir = dir;
  }

  register(contract: CDCContract): void {
    this.contracts.set(`${contract.consumer}:${contract.provider}`, contract);
  }

  get(consumer: string, provider: string): CDCContract | undefined {
    return this.contracts.get(`${consumer}:${provider}`);
  }

  registerPact(pact: PactContract): void {
    this.pacts.set(`${pact.consumer}:${pact.provider}`, pact);
  }

  getPact(consumer: string, provider: string): PactContract | undefined {
    return this.pacts.get(`${consumer}:${provider}`);
  }

  addExpectation(consumer: string, provider: string, interaction: PactInteraction): ConsumerExpectation {
    const key = `${consumer}:${provider}`;
    const existing = this.expectations.get(key) || [];
    const expectation: ConsumerExpectation = {
      consumer,
      provider,
      interaction,
      createdAt: new Date().toISOString(),
      verified: false,
    };
    existing.push(expectation);
    this.expectations.set(key, existing);
    return expectation;
  }

  getExpectations(consumer: string, provider: string): ConsumerExpectation[] {
    return this.expectations.get(`${consumer}:${provider}`) || [];
  }

  verifyProvider(provider: string, contracts: PactContract[]): ProviderVerificationResult {
    const failures: Array<{ interaction: string; reason: string; expected: unknown; actual: unknown }> = [];
    let passedCount = 0;
    const total = contracts.reduce((sum, c) => sum + c.interactions.length, 0);

    for (const contract of contracts) {
      const expectedPact = this.pacts.get(`${contract.consumer}:${provider}`);
      if (!expectedPact) {
        for (const interaction of contract.interactions) {
          failures.push({
            interaction: interaction.description,
            reason: `No registered pact for ${contract.consumer}:${provider}`,
            expected: interaction,
            actual: null,
          });
        }
        continue;
      }

      for (const interaction of contract.interactions) {
        const expected = expectedPact.interactions.find(i =>
          i.description === interaction.description &&
          i.request.method === interaction.request.method &&
          i.request.path === interaction.request.path
        );

        if (!expected) {
          failures.push({
            interaction: interaction.description,
            reason: 'Interaction not found in provider pact',
            expected: null,
            actual: interaction,
          });
          continue;
        }

        const expectedBody = JSON.stringify(expected.response.body);
        const actualBody = JSON.stringify(interaction.response.body);
        if (expected.response.status !== interaction.response.status) {
          failures.push({
            interaction: interaction.description,
            reason: `Status mismatch: expected ${expected.response.status}, got ${interaction.response.status}`,
            expected: expected.response.status,
            actual: interaction.response.status,
          });
          continue;
        }

        if (expectedBody && expectedBody !== actualBody) {
          failures.push({
            interaction: interaction.description,
            reason: 'Response body mismatch',
            expected: expected.response.body,
            actual: interaction.response.body,
          });
          continue;
        }

        passedCount++;
      }
    }

    return {
      provider,
      passed: failures.length === 0,
      failures,
      summary: { total, passed: passedCount, failed: failures.length },
    };
  }

  diff(contractA: CDCContract, contractB: CDCContract): ContractDiff {
    const changes: string[] = [];
    let breaking = false;

    const aEndpoints = new Set(contractA.endpoints.map(e => `${e.method}:${e.path}`));
    for (const eb of contractB.endpoints) {
      const key = `${eb.method}:${eb.path}`;
      if (!aEndpoints.has(key)) {
        changes.push(`Added endpoint ${eb.method} ${eb.path}`);
      } else {
        const ea = contractA.endpoints.find(e => e.method === eb.method && e.path === eb.path)!;
        const reqKeys = Object.keys(eb.request);
        const resKeys = Object.keys(eb.response);

        for (const k of Object.keys(ea.request)) {
          if (!reqKeys.includes(k)) {
            changes.push(`Removed request field ${k}`);
            breaking = true;
          }
        }
        for (const k of Object.keys(ea.response)) {
          if (!resKeys.includes(k)) {
            changes.push(`Removed response field ${k}`);
            breaking = true;
          }
        }
        for (const k of reqKeys) {
          if (!Object.keys(ea.request).includes(k)) {
            changes.push(`Added request field ${k}`);
          }
        }
        for (const k of resKeys) {
          if (!Object.keys(ea.response).includes(k)) {
            changes.push(`Added response field ${k}`);
          }
        }
        for (const k of reqKeys) {
          if (JSON.stringify(ea.request[k]) !== JSON.stringify(eb.request[k])) {
            changes.push(`Request field ${k} type changed`);
            breaking = true;
          }
        }
        for (const k of resKeys) {
          if (JSON.stringify(ea.response[k]) !== JSON.stringify(eb.response[k])) {
            changes.push(`Response field ${k} type changed`);
            breaking = true;
          }
        }
      }
    }

    for (const ea of contractA.endpoints) {
      if (!contractB.endpoints.some(e => e.method === ea.method && e.path === ea.path)) {
        changes.push(`Removed endpoint ${ea.method} ${ea.path}`);
        breaking = true;
      }
    }

    return {
      moduleA: contractA.consumer,
      moduleB: contractB.provider,
      changes,
      breaking,
      classification: breaking ? 'major' : changes.length > 0 ? 'minor' : 'patch',
    };
  }

  suggestVersion(currentVersion: string, diff: ContractDiff): VersionSuggestion {
    const parts = currentVersion.split('.').map(Number);
    let [major, minor, patch] = parts.length === 3 ? parts : [1, 0, 0];

    if (diff.classification === 'major') { major++; minor = 0; patch = 0; }
    else if (diff.classification === 'minor') { minor++; patch = 0; }
    else if (diff.classification === 'patch') { patch++; }

    return {
      current: currentVersion,
      suggested: `${major}.${minor}.${patch}`,
      bump: diff.classification,
      reason: diff.breaking ? 'Breaking changes detected' : diff.changes.length > 0 ? 'New features added' : 'Bug fixes only',
    };
  }

  testContract(consumer: string, provider: string, actual: CDCContract): { compatible: boolean; diff: ContractDiff | null } {
    const expected = this.contracts.get(`${consumer}:${provider}`);
    if (!expected) return { compatible: false, diff: null };
    const d = this.diff(expected, actual);
    return { compatible: !d.breaking, diff: d };
  }

  getCompatibilityMatrix(): CompatibilityMatrix {
    const allConsumers = Array.from(new Set(Array.from(this.contracts.values()).map(c => c.consumer)));
    const allProviders = Array.from(new Set(Array.from(this.contracts.values()).map(c => c.provider)));
    const matrix: Record<string, Record<string, CompatibilityMatrixEntry>> = {};

    for (const consumer of allConsumers) {
      matrix[consumer] = {};
      for (const provider of allProviders) {
        const providerContract = this.contracts.get(`${consumer}:${provider}`);
        const pactKey = `${consumer}:${provider}`;
        const pact = this.pacts.get(pactKey);
        const expectations = this.expectations.get(pactKey);

        if (!providerContract && !pact) {
          matrix[consumer][provider] = {
            compatible: false,
            status: 'unknown',
            consumerVersion: '0.0.0',
            providerVersion: '0.0.0',
            diff: null,
            lastVerified: null,
          };
          continue;
        }

        const testResult = providerContract
          ? this.testContract(consumer, provider, providerContract)
          : { compatible: false, diff: null };

        const allVerified = expectations ? expectations.every(e => e.verified) : false;
        const status: ContractStatus = testResult.compatible ? 'compatible' : 'breaking';

        matrix[consumer][provider] = {
          compatible: testResult.compatible && allVerified,
          status,
          consumerVersion: providerContract?.version || pact?.version || '0.0.0',
          providerVersion: providerContract?.version || pact?.version || '0.0.0',
          diff: testResult.diff,
          lastVerified: expectations && expectations.length > 0
            ? expectations.filter(e => e.verified).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.createdAt || null
            : null,
        };
      }
    }

    return { consumers: allConsumers, providers: allProviders, matrix, generatedAt: new Date().toISOString() };
  }

  publishContracts(): PublishedContract[] {
    const dirPath = join(process.cwd(), this.publishDir);
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }

    const published: PublishedContract[] = [];

    for (const [, pact] of this.pacts) {
      const checksum = createHash('sha256').update(JSON.stringify(pact)).digest('hex');
      const entry: PublishedContract = {
        consumer: pact.consumer,
        provider: pact.provider,
        version: pact.version,
        pact,
        publishedAt: new Date().toISOString(),
        checksum,
      };
      const filePath = join(dirPath, `${pact.consumer}--${pact.provider}.json`);
      writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8');
      published.push(entry);
    }

    for (const [, contract] of this.contracts) {
      const pact = this.pacts.get(`${contract.consumer}:${contract.provider}`);
      if (!pact) {
        const checksum = createHash('sha256').update(JSON.stringify(contract)).digest('hex');
        const cdcEntry: PublishedContract = {
          consumer: contract.consumer,
          provider: contract.provider,
          version: contract.version,
          pact: {
            consumer: contract.consumer,
            provider: contract.provider,
            interactions: contract.endpoints.map(e => ({
              description: `${e.method} ${e.path}`,
              type: 'request-response' as const,
              request: { method: e.method, path: e.path, body: e.request },
              response: { status: 200, body: e.response },
            })),
            version: contract.version,
          },
          publishedAt: new Date().toISOString(),
          checksum,
        };
        const filePath = join(dirPath, `${contract.consumer}--${contract.provider}.json`);
        writeFileSync(filePath, JSON.stringify(cdcEntry, null, 2), 'utf-8');
        published.push(cdcEntry);
      }
    }

    return published;
  }

  fetchContracts(consumer?: string, provider?: string): PactContract[] {
    const dirPath = join(process.cwd(), this.publishDir);
    if (!existsSync(dirPath)) return [];

    const files = consumer && provider
      ? [`${consumer}--${provider}.json`]
      : require('fs').readdirSync(dirPath).filter((f: string) => f.endsWith('.json'));

    const contracts: PactContract[] = [];
    for (const file of files) {
      const filePath = join(dirPath, file);
      if (!existsSync(filePath)) continue;
      const raw = readFileSync(filePath, 'utf-8');
      const published: PublishedContract = JSON.parse(raw);
      contracts.push(published.pact);
      const key = `${published.pact.consumer}:${published.pact.provider}`;
      if (!this.pacts.has(key)) {
        this.pacts.set(key, published.pact);
      }
    }

    return contracts;
  }

  list(): CDCContract[] {
    return Array.from(this.contracts.values());
  }

  listPacts(): PactContract[] {
    return Array.from(this.pacts.values());
  }
}

export function createContractCDC(): ContractCDC {
  return new ContractCDC();
}
