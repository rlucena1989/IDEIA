import { Emitter } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import {
  GitService, GitStatus, GitBranchInfo, GitCommit, GitBlameEntry, GitFileChange,
  ScmService, ScmProvider, ScmStatus, ScmChange, ScmInputBox, ScmAction,
} from './types';

export class DefaultGitService implements GitService {
  private currentBranch = 'main';

  async init(path: string): Promise<void> {}
  async clone(url: string, path: string): Promise<void> {}
  async status(): Promise<GitStatus> {
    return { staged: [], unstaged: [], untracked: [], conflicted: [] };
  }
  async add(files: string[]): Promise<void> {}
  async commit(message: string): Promise<string> { return ''; }
  async push(remote?: string, branch?: string): Promise<void> {}
  async pull(remote?: string, branch?: string): Promise<void> {}
  async branch(): Promise<GitBranchInfo> {
    return { current: this.currentBranch, branches: [this.currentBranch] };
  }
  async checkout(branch: string): Promise<void> { this.currentBranch = branch; }
  async diff(file?: string): Promise<string> { return ''; }
  async log(maxCount?: number): Promise<GitCommit[]> { return []; }
  async blame(file: string): Promise<GitBlameEntry[]> { return []; }
}

class DefaultScmInputBox implements ScmInputBox {
  private _value = '';
  private onChangedEmitter = new Emitter<string>();

  get onValueChanged() { return this.onChangedEmitter.event; }
  get value(): string { return this._value; }
  set value(v: string) { this._value = v; this.onChangedEmitter.fire(v); }
  placeholder = 'Commit message...';
}

export class DefaultScmService implements ScmService {
  private providers = new Map<string, ScmProvider>();
  private onRegisteredEmitter = new Emitter<string>();
  private onUnregisteredEmitter = new Emitter<string>();

  get onProviderRegistered() { return this.onRegisteredEmitter.event; }
  get onProviderUnregistered() { return this.onUnregisteredEmitter.event; }

  registerProvider(id: string, provider: ScmProvider): void {
    this.providers.set(id, provider);
    this.onRegisteredEmitter.fire(id);
  }

  unregisterProvider(id: string): void {
    this.providers.delete(id);
    this.onUnregisteredEmitter.fire(id);
  }

  getProvider(id: string): ScmProvider | undefined {
    return this.providers.get(id);
  }

  getProviders(): ScmProvider[] {
    return Array.from(this.providers.values());
  }
}

export class GitScmProvider implements ScmProvider {
  readonly id: string;
  readonly label: string;
  private inputBox = new DefaultScmInputBox();

  constructor(id = 'git', label = 'Git') {
    this.id = id;
    this.label = label;
  }

  async getStatus(): Promise<ScmStatus> {
    return { changes: [], hasChanges: false };
  }

  getInputBox(): ScmInputBox {
    return this.inputBox;
  }

  getActions(): ScmAction[] {
    return [];
  }
}
