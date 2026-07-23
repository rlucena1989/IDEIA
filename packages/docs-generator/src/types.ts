export type DocFormat = 'markdown' | 'json' | 'html';

export interface CommandDoc {
  name: string;
  description: string;
  arguments?: string[];
  options?: { flag: string; description: string; default?: string }[];
  examples?: string[];
  category: string;
}

export interface PackageDoc {
  name: string;
  description: string;
  exports: string[];
  dependencies: string[];
  commands?: CommandDoc[];
}

export interface APIDoc {
  version: string;
  generatedAt: string;
  packages: PackageDoc[];
}

export interface GenerateOptions {
  format: DocFormat;
  outputDir?: string;
  includePrivate?: boolean;
}
