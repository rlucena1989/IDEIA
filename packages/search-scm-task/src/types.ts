import { Disposable, Event } from '@ideia/core-contributions';

export interface SearchService {
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  cancel(): void;
  replace(query: string, replacement: string, options?: SearchOptions): Promise<ReplaceResult>;
  onSearchProgress: Event<{ results: number; total: number }>;
  onSearchComplete: Event<SearchResult[]>;
}

export interface SearchOptions {
  include?: string[];
  exclude?: string[];
  maxResults?: number;
  contextLines?: number;
  isRegex?: boolean;
  matchWholeWord?: boolean;
  matchCase?: boolean;
  rootUri?: string;
}

export interface SearchResult {
  uri: string;
  line: number;
  column: number;
  lineContent: string;
  matchText: string;
  matchLength: number;
  context?: { before: string[]; after: string[] };
}

export interface ReplaceResult {
  replacements: number;
  files: number;
}

export interface SearchProvider {
  readonly id: string;
  search(query: string, options?: SearchOptions): AsyncIterable<SearchResult>;
  replace?(query: string, replacement: string, options?: SearchOptions): Promise<ReplaceResult>;
}

export interface GitService {
  init(path: string): Promise<void>;
  clone(url: string, path: string): Promise<void>;
  status(): Promise<GitStatus>;
  add(files: string[]): Promise<void>;
  commit(message: string): Promise<string>;
  push(remote?: string, branch?: string): Promise<void>;
  pull(remote?: string, branch?: string): Promise<void>;
  branch(): Promise<GitBranchInfo>;
  checkout(branch: string): Promise<void>;
  diff(file?: string): Promise<string>;
  log(maxCount?: number): Promise<GitCommit[]>;
  blame(file: string): Promise<GitBlameEntry[]>;
}

export interface GitStatus {
  staged: GitFileChange[];
  unstaged: GitFileChange[];
  untracked: string[];
  conflicted: string[];
}

export interface GitFileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  originalPath?: string;
}

export interface GitBranchInfo {
  current: string;
  branches: string[];
  remote?: string;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: Date;
}

export interface GitBlameEntry {
  line: number;
  hash: string;
  author: string;
  date: Date;
  content: string;
}

export interface ScmService {
  registerProvider(id: string, provider: ScmProvider): void;
  unregisterProvider(id: string): void;
  getProvider(id: string): ScmProvider | undefined;
  getProviders(): ScmProvider[];
  onProviderRegistered: Event<string>;
  onProviderUnregistered: Event<string>;
}

export interface ScmProvider {
  readonly id: string;
  readonly label: string;
  getStatus(): Promise<ScmStatus>;
  getInputBox(): ScmInputBox;
  getActions(): ScmAction[];
}

export interface ScmStatus {
  changes: ScmChange[];
  hasChanges: boolean;
}

export interface ScmChange {
  uri: string;
  status: string;
  staged: boolean;
}

export interface ScmInputBox {
  value: string;
  placeholder: string;
  onValueChanged: Event<string>;
}

export interface ScmAction {
  id: string;
  label: string;
  run(): Promise<void>;
}

export interface TaskService {
  run(task: TaskDefinition): Promise<TaskExecution>;
  cancel(executionId: string): void;
  getRunningTasks(): TaskExecution[];
  onTaskStarted: Event<TaskExecution>;
  onTaskCompleted: Event<TaskExecution>;
}

export interface TaskDefinition {
  type: string;
  label: string;
  command: string;
  args?: string[];
  options?: TaskOptions;
  group?: 'build' | 'test' | 'rebuild' | 'clean' | 'none';
  problemMatchers?: string[];
  dependsOn?: string[];
}

export interface TaskOptions {
  cwd?: string;
  env?: Record<string, string>;
  shell?: boolean;
  timeout?: number;
  reveal?: 'always' | 'silent' | 'never';
}

export interface TaskExecution {
  id: string;
  definition: TaskDefinition;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  exitCode?: number;
  output?: string;
  startedAt: Date;
  completedAt?: Date;
}

export interface TaskProvider {
  readonly id: string;
  provideTasks(): Promise<TaskDefinition[]>;
  resolveTask?(task: TaskDefinition): Promise<TaskDefinition>;
}

export interface ProblemMatcher {
  readonly name: string;
  parseLine(line: string): ProblemMatch | null;
}

export interface ProblemMatch {
  file: string;
  line: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  code?: string;
}
