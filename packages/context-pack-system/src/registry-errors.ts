export class PackNotFoundError extends Error {
  constructor(packId: string, version?: string) {
    super(`Context pack not found: ${packId}${version ? `@${version}` : ''}`);
    this.name = 'PackNotFoundError';
  }
}

export class CyclicDependencyError extends Error {
  constructor(packId: string, chain: string[]) {
    super(`Cyclic dependency detected: ${packId} → ${chain.join(' → ')}`);
    this.name = 'CyclicDependencyError';
  }
}

export class DependencyNotFoundError extends Error {
  constructor(packId: string, dependent: string) {
    super(`Dependency not found: ${packId} required by ${dependent}`);
    this.name = 'DependencyNotFoundError';
  }
}
