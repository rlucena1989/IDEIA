import type { Capability } from '../types/capability';
import { createLogger } from '@ideia/logger';
import type { IDiscoveryEngine, DiscoveryResult } from './discovery.interface';
const logger = createLogger('package-scanner');

export class PackageScanner implements IDiscoveryEngine {
  constructor(private workspaceRoot: string) {}

  async scanPackage(_packagePath: string): Promise<DiscoveryResult[]> { return []; }

  async scanDecorators(_sourceCode: string): Promise<Capability[]> { return []; }

  async parseManifest(_manifestPath: string): Promise<Capability[]> { return []; }

  async staticAnalyze(_modulePath: string): Promise<Capability[]> { return []; }

  async scanAll(): Promise<Map<string, DiscoveryResult[]>> { return new Map(); }
}
