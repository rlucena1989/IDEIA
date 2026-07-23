import { ContextItem } from './types';

export class CodebaseProvider {
  readonly name = 'codebase';

  async collect(options?: { dir?: string }): Promise<ContextItem[]> {
    return [{
      id: `codebase-${Date.now()}`,
      source: 'codebase',
      content: `Codebase context from ${options?.dir || 'current directory'}`,
      timestamp: Date.now(),
      relevance: 0.8,
    }];
  }
}

export class GitProvider {
  readonly name = 'git';

  async collect(): Promise<ContextItem[]> {
    return [{
      id: `git-${Date.now()}`,
      source: 'git',
      content: 'Git context: branch, recent commits, changed files',
      timestamp: Date.now(),
      relevance: 0.7,
    }];
  }
}

export class StackProvider {
  readonly name = 'stack';

  async collect(): Promise<ContextItem[]> {
    return [{
      id: `stack-${Date.now()}`,
      source: 'stack',
      content: `Stack: ${process.version}, ${process.platform}`,
      metadata: { nodeVersion: process.version, platform: process.platform },
      timestamp: Date.now(),
      relevance: 0.5,
    }];
  }
}

export class MemoryProvider {
  readonly name = 'memory';

  async collect(): Promise<ContextItem[]> {
    return [{
      id: `memory-${Date.now()}`,
      source: 'memory',
      content: 'Working memory: recent decisions, patterns, preferences',
      timestamp: Date.now(),
      relevance: 0.9,
    }];
  }
}
