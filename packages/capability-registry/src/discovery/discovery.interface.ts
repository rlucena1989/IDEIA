import type { Capability } from '../types/capability';

export type DiscoverySource = 'decorator' | 'manifest' | 'static-analysis' | 'config';

export interface DiscoveryResult {
  capabilities: Capability[];
  source: DiscoverySource;
  sourceFile: string;
  errors: string[];
}

export interface IDiscoveryEngine {
  scanPackage(packagePath: string): Promise<DiscoveryResult[]>;
  scanDecorators(sourceCode: string): Promise<Capability[]>;
  parseManifest(manifestPath: string): Promise<Capability[]>;
  staticAnalyze(modulePath: string): Promise<Capability[]>;
  scanAll(): Promise<Map<string, DiscoveryResult[]>>;
}
