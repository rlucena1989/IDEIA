import { Disposable, Event } from '@ideia/core-contributions';

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

export interface FileWriteOptions {
  create?: boolean;
  overwrite?: boolean;
  encoding?: string;
}

export interface FileDeleteOptions {
  recursive?: boolean;
  useTrash?: boolean;
}

export interface FileRenameOptions {
  overwrite?: boolean;
}

export interface FileCopyOptions {
  overwrite?: boolean;
}

export interface WatchOptions {
  recursive?: boolean;
  excludes?: string[];
}

export interface FileChangeEvent {
  uri: string;
  type: FileChangeType;
}

export enum FileChangeType {
  Created = 1,
  Updated = 2,
  Deleted = 3,
}

export interface FileWatcherService {
  watch(uri: string, options?: WatchOptions): Disposable;
  onFileChanged: Event<FileChangeEvent>;
}

export interface WorkspaceService {
  readonly roots: string[];
  addRoot(uri: string): Promise<void>;
  removeRoot(uri: string): Promise<void>;
  getWorkspaceFile(): string | undefined;
  isMultiRoot(): boolean;
  onRootsChanged: Event<string[]>;
}

export interface FileSearchService {
  search(query: string, options?: FileSearchOptions): Promise<string[]>;
}

export interface FileSearchOptions {
  rootUri?: string;
  maxResults?: number;
  excludePattern?: string[];
  includePattern?: string[];
}

export interface BulkFileOperator {
  move(sources: string[], target: string): Promise<void>;
  copy(sources: string[], target: string): Promise<void>;
  delete(sources: string[], options?: FileDeleteOptions): Promise<void>;
  rename(source: string, target: string): Promise<void>;
  undo(): Promise<void>;
}

export interface LanguageService {
  getLanguageForUri(uri: string): string;
  getLanguageByExtension(ext: string): string | undefined;
  getLanguageByFilename(filename: string): string | undefined;
  getLanguageByContent(content: string): string | undefined;
}
