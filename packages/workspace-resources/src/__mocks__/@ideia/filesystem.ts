export enum FileType {
  File = 1,
  Directory = 2,
  SymbolicLink = 64,
}

export interface FileStat {
  uri: string;
  type: FileType;
  size: number;
  mtime: number;
  ctime: number;
  etag?: string;
  isDirectory: boolean;
  isSymbolicLink: boolean;
  children?: FileStat[];
}

export interface FileSystemProvider {
  readonly scheme: string;
  readonly capabilities: FileSystemProviderCapabilities;
  stat(uri: string): Promise<FileStat>;
  readFile(uri: string): Promise<Uint8Array>;
  writeFile(uri: string, content: Uint8Array, options?: FileWriteOptions): Promise<void>;
  readDirectory(uri: string): Promise<[string, FileType][]>;
  createDirectory(uri: string): Promise<void>;
  delete(uri: string, options?: FileDeleteOptions): Promise<void>;
  rename(oldUri: string, newUri: string, options?: FileRenameOptions): Promise<void>;
  copy(source: string, target: string, options?: FileCopyOptions): Promise<void>;
  watch(uri: string, options?: WatchOptions): Disposable;
}

export interface FileSystemProviderCapabilities {
  supportsFileReadWrite: boolean;
  supportsDirectoryRead: boolean;
  supportsCreateDelete: boolean;
  supportsRenameCopy: boolean;
  supportsWatching: boolean;
  supportsStreaming: boolean;
}

export interface FileWriteOptions { create?: boolean; overwrite?: boolean; encoding?: string }
export interface FileDeleteOptions { recursive?: boolean; useTrash?: boolean }
export interface FileRenameOptions { overwrite?: boolean }
export interface FileCopyOptions { overwrite?: boolean }
export interface WatchOptions { recursive?: boolean; excludes?: string[] }
export interface Disposable { dispose(): void }
export interface FileChangeEvent { uri: string; type: FileChangeType }
export enum FileChangeType { Created = 1, Updated = 2, Deleted = 3 }

export class FileSystemProviderRegistry {
  private providers = new Map<string, FileSystemProvider>();

  register(provider: FileSystemProvider): Disposable {
    this.providers.set(provider.scheme, provider);
    return { dispose: () => this.providers.delete(provider.scheme) };
  }

  get(scheme: string): FileSystemProvider | undefined {
    return this.providers.get(scheme);
  }

  getAll(): FileSystemProvider[] {
    return Array.from(this.providers.values());
  }

  resolveProvider(uri: string): FileSystemProvider {
    const scheme = uri.split(':')[0];
    const provider = this.providers.get(scheme);
    if (!provider) throw new Error(`No provider for scheme: ${scheme}`);
    return provider;
  }
}
