export interface Blueprint {
  name: string;
  version: string;
  description: string;
  author?: string;
  tags?: string[];
}

export interface Variable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'multi-select';
  description?: string;
  prompt?: string;
  required?: boolean;
  default?: string | number | boolean | string[];
  validate?: string;
  options?: string[];
}

export interface FileTemplate {
  path: string;
  content: string;
  templateEngine?: 'ejs' | 'handlebars';
  condition?: string;
  generate?: 'always';
}

export interface Dependency {
  name: string;
  version: string;
  dev?: boolean;
  optional?: boolean;
}

export interface ConfigFile {
  path: string;
  content: Record<string, unknown>;
  format?: 'json' | 'yaml';
}

export interface ContractDefinition {
  name: string;
  version: string;
  schema: string;
  description?: string;
  interfaces?: ContractInterface[];
  events?: ContractEvent[];
}

export interface ContractInterface {
  name: string;
  methods: ContractMethod[];
}

export interface ContractMethod {
  name: string;
  params: { name: string; type: string }[];
  returns: string;
}

export interface ContractEvent {
  name: string;
  payload: string;
  description?: string;
}

export interface ADREntry {
  id: string;
  title: string;
  status: 'Proposed' | 'Accepted' | 'Deprecated' | 'Superseded';
  context: string;
  decision: string;
  consequences: string[];
  date?: string;
}

export interface BlueprintManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  tags?: string[];
  extends?: string[];
  compatibility?: {
    ideia?: string;
    node?: string;
    pnpm?: string;
  };
  variables?: Variable[];
  structure?: Record<string, unknown>;
  dependencies?: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  };
  configs?: {
    tsconfig?: Record<string, unknown>;
    eslint?: Record<string, unknown>;
    prettier?: Record<string, unknown>;
    jest?: Record<string, unknown>;
    vitest?: Record<string, unknown>;
    dockerCompose?: Record<string, unknown>;
    dockerfile?: Record<string, unknown>;
    envExample?: Record<string, unknown>;
    editorconfig?: Record<string, unknown>;
    gitignore?: Record<string, unknown>;
  };
  contracts?: {
    modules?: ContractDefinition[];
    schemaFormat?: 'zod' | 'valibot' | 'typescript';
    generateTests?: boolean;
    generateOpenAPI?: boolean;
  };
  adrs?: {
    autoGenerate?: boolean;
    templates?: { title: string; template?: string }[];
  };
  postProcess?: {
    command: string;
    description?: string;
    condition?: string;
    timeout?: number;
  }[];
}

export interface ScaffoldOptions {
  outputDir: string;
  variables?: Record<string, unknown>;
  skipInstall?: boolean;
  skipGit?: boolean;
  force?: boolean;
  ci?: boolean;
}

export interface ScaffoldResult {
  projectPath: string;
  filesCreated: number;
  filesSkipped: number;
  dependenciesInstalled: boolean;
  gitInitialized: boolean;
  adrsGenerated: number;
  contractsGenerated: number;
  duration: number;
  errors: string[];
  warnings: string[];
}

export interface ResolvedDependencies {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  optionalDependencies: Record<string, string>;
  errors: DependencyError[];
  warnings: DependencyWarning[];
}

export interface DependencyError {
  code: string;
  package: string;
  message: string;
}

export interface DependencyWarning {
  code: string;
  package: string;
  message: string;
}

export interface GeneratedConfig {
  path: string;
  content: string;
}

export interface GeneratedContract {
  path: string;
  content: string;
  format: string;
}

export interface GeneratedADR {
  path: string;
  content: string;
  title: string;
  id: string;
}

export interface TemplateContext {
  projectName: string;
  projectNamePascal: string;
  projectNameCamel: string;
  projectNameKebab: string;
  projectNameSnake: string;
  description: string;
  features: string[];
  createdAt: string;
  ideiaVersion: string;
  nodeVersion: string;
  [key: string]: unknown;
}
