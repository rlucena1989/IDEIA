import { Disposable, Event } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
const logger = createLogger('types');

export interface VfsUri {
  scheme: string;
  authority: string;
  path: string;
  query: string;
  fragment: string;
  toString(): string;
}

export interface PathService {
  normalize(path: string): string;
  join(...paths: string[]): string;
  relative(from: string, to: string): string;
  basename(path: string): string;
  dirname(path: string): string;
  extname(path: string): string;
  isAbsolute(path: string): boolean;
  resolve(...paths: string[]): string;
  separator: string;
}

export interface WorkspaceInput {
  roots: string[];
  workspaceFile?: string;
  id?: string;
  label?: string;
}

export interface WorkspaceData {
  folders: Array<{ path: string; name?: string }>;
  settings?: Record<string, unknown>;
  extensions?: Record<string, unknown>;
}

export interface ResourceProvider {
  read(uri: string): Promise<Uint8Array>;
  write(uri: string, content: Uint8Array): Promise<void>;
  stat(uri: string): Promise<ResourceStat>;
  watch(uri: string): Disposable;
  onResourceChanged: Event<string>;
}

export interface ResourceStat {
  uri: string;
  size: number;
  mtime: Date;
  isDirectory: boolean;
  isFile: boolean;
}

export interface Resource {
  uri: string;
  read(): Promise<Uint8Array>;
  stat(): Promise<ResourceStat>;
  dispose(): void;
}

export interface FileService {
  read(uri: string): Promise<Uint8Array>;
  write(uri: string, content: Uint8Array): Promise<void>;
  delete(uri: string, options?: { recursive?: boolean; useTrash?: boolean }): Promise<void>;
  rename(source: string, target: string): Promise<void>;
  copy(source: string, target: string): Promise<void>;
  createDirectory(uri: string): Promise<void>;
  stat(uri: string): Promise<ResourceStat>;
  readDirectory(uri: string): Promise<[string, boolean][]>;
  exists(uri: string): Promise<boolean>;
  watch(uri: string, options?: WatchOptions): Disposable;
  onFileChanged: Event<FileChangeEvent>;
}

export interface WatchOptions {
  recursive?: boolean;
  excludes?: string[];
  debounce?: number;
}

export interface FileChangeEvent {
  uri: string;
  type: 'created' | 'updated' | 'deleted';
  stat?: ResourceStat;
}

export interface TextModelService {
  getModel(uri: string): ITextModel | undefined;
  createModel(uri: string, content?: string): ITextModel;
  removeModel(uri: string): void;
  onModelCreated: Event<ITextModel>;
  onModelRemoved: Event<string>;
}

export interface ITextModel {
  readonly uri: string;
  getContent(): string;
  setContent(content: string): void;
  getLineCount(): number;
  getLineContent(line: number): string;
  isDirty(): boolean;
  markClean(): void;
  onContentChanged: Event<string>;
}

export interface ResourceContextKey {
  readonly scheme: string;
  readonly path: string;
  readonly ext: string;
  readonly filename: string;
  readonly isFile: boolean;
  readonly isDirectory: boolean;
}

export interface ScopedStorageService {
  getGlobal<T>(key: string): T | undefined;
  setGlobal<T>(key: string, value: T): void;
  getWorkspace<T>(key: string): T | undefined;
  setWorkspace<T>(key: string, value: T): void;
  getFolder<T>(key: string): T | undefined;
  setFolder<T>(key: string, value: T): void;
}
