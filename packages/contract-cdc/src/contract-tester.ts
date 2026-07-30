import { ContractCDC } from './contract-cdc';
import { createLogger } from '@ideia/logger';
import type { CDCContract, ContractDiff, PactContract, PactInteraction, ConsumerExpectation, ProviderVerificationResult, CompatibilityMatrix } from './types';

export class ContractTester {
  private cdc: ContractCDC;
  private history: Map<string, CDCContract[]> = new Map();
  private providers: Map<string, CDCContract> = new Map();
  private consumers: Map<string, CDCContract[]> = new Map();

  constructor(cdc?: ContractCDC) {
    this.cdc = cdc ?? new ContractCDC();
  }

  registerProvider(providerName: string, contract: CDCContract): void {
    this.providers.set(providerName, contract);
    this.cdc.register(contract);
  }

  registerConsumer(consumerName: string, contract: CDCContract): void {
    const existing = this.consumers.get(consumerName) ?? [];
    existing.push(contract);
    this.consumers.set(consumerName, existing);
    this.cdc.register(contract);
  }

  registerPact(pact: PactContract): void {
    this.cdc.registerPact(pact);
  }

  addExpectation(consumer: string, provider: string, interaction: PactInteraction): ConsumerExpectation {
    return this.cdc.addExpectation(consumer, provider, interaction);
  }

  getExpectations(consumer: string, provider: string): ConsumerExpectation[] {
    return this.cdc.getExpectations(consumer, provider);
  }

  verifyProvider(providerName: string, contracts: PactContract[]): ProviderVerificationResult {
    return this.cdc.verifyProvider(providerName, contracts);
  }

  verifyConsumer(consumerName: string, actual: CDCContract): { valid: boolean; issues: string[]; suggestion: string } {
    const existingContract = this.cdc.get(actual.consumer, actual.provider);
    if (!existingContract) {
      return { valid: false, issues: ['No registered contract found for this consumer-provider pair'], suggestion: 'Register the base contract first' };
    }

    const diff = this.cdc.diff(existingContract, actual);
    const issues: string[] = [];
    if (diff.breaking) issues.push(`Consumer expects breaking changes: ${diff.changes.join(', ')}`);
    const versionSuggestion = this.cdc.suggestVersion(existingContract.version, diff);
    return { valid: !diff.breaking, issues, suggestion: versionSuggestion.suggested };
  }

  validateConsumer(consumerName: string, actual: CDCContract): { valid: boolean; issues: string[]; suggestion: string } {
    return this.verifyConsumer(consumerName, actual);
  }

  detectDrift(contracts: CDCContract[]): Array<{ contract: string; drifted: boolean; changes: string[]; severity: 'none' | 'minor' | 'major' }> {
    const results: Array<{ contract: string; drifted: boolean; changes: string[]; severity: 'none' | 'minor' | 'major' }> = [];

    for (const contract of contracts) {
      const key = `${contract.consumer}:${contract.provider}`;
      const history = this.history.get(key) ?? [];
      const lastVersion = history[history.length - 1];

      if (!lastVersion) {
        results.push({ contract: key, drifted: false, changes: [], severity: 'none' });
        continue;
      }

      const diff = this.cdc.diff(lastVersion, contract);
      results.push({
        contract: key,
        drifted: diff.changes.length > 0,
        changes: diff.changes,
        severity: diff.breaking ? 'major' : diff.changes.length > 0 ? 'minor' : 'none',
      });
    }

    return results;
  }

  getCompatibilityMatrix(): CompatibilityMatrix {
    return this.cdc.getCompatibilityMatrix();
  }

  publishContracts(): void {
    this.cdc.publishContracts();
  }

  fetchContracts(consumer?: string, provider?: string): PactContract[] {
    return this.cdc.fetchContracts(consumer, provider);
  }

  list(): CDCContract[] {
    return this.cdc.list();
  }

  listPacts(): PactContract[] {
    return this.cdc.listPacts();
  }

  private recordHistory(key: string, contract: CDCContract): void {
    const keyName = `${contract.consumer}:${contract.provider}`;
    const history = this.history.get(keyName) ?? [];
    history.push(contract);
    if (history.length > 50) history.shift();
    this.history.set(keyName, history);
  }
}

export function createContractTester(cdc?: ContractCDC): ContractTester {
  return new ContractTester(cdc);
}
