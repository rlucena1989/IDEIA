export interface DirPattern {
  path: string;
  depth: number;
  childCount: number;
  namingConvention: 'camelCase' | 'kebab-case' | 'PascalCase' | 'snake_case' | 'mixed';
  commonPrefix: string;
}

export interface NamingConvention {
  type: 'camelCase' | 'kebab-case' | 'PascalCase' | 'snake_case';
  extension: string;
  count: number;
  examples: string[];
}

export interface ComponentPattern {
  name: string;
  hasProps: boolean;
  hasHooks: boolean;
  hasStyles: boolean;
  hasTests: boolean;
  file: string;
}

export interface CommitPattern {
  conventionalType: string;
  scope: string;
  count: number;
  examples: string[];
}

export interface TestPattern {
  framework: 'jest' | 'vitest' | 'mocha' | 'unknown';
  location: 'co-located' | '__tests__' | 'dist';
  naming: '*.test.ts' | '*.spec.ts' | '*.test.tsx' | '*.spec.tsx';
  coverageStrategy: 'unit' | 'integration' | 'e2e';
}

export interface ApiPattern {
  name: string;
  method: string;
  path: string;
  file: string;
  hasAuth: boolean;
  hasValidation: boolean;
}

export interface RepoPatterns {
  directory: DirPattern[];
  naming: NamingConvention[];
  components: ComponentPattern[];
  commits: CommitPattern[];
  tests: TestPattern[];
  apis: ApiPattern[];
  summary: { totalFiles: number; totalDirs: number; srcDirs: number; componentCount: number; testCount: number; commitCount: number; apiCount: number };
  suggestions: string[];
}

export interface ScanOptions {
  rootDir: string;
  maxDepth?: number;
  maxCommits?: number;
}
