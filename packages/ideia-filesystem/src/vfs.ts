import { Emitter, Disposable } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import {
  FileSystemProvider, FileSystemProviderCapabilities,
  FileStat, FileType, FileWriteOptions, FileDeleteOptions,
  FileRenameOptions, FileCopyOptions, WatchOptions,
} from './types';

export class DiskFileSystemProvider implements FileSystemProvider {
  readonly scheme = 'file';
  readonly capabilities: FileSystemProviderCapabilities = {
    supportsFileReadWrite: true,
    supportsDirectoryRead: true,
    supportsCreateDelete: true,
    supportsRenameCopy: true,
    supportsWatching: true,
    supportsStreaming: false,
  };

  async stat(uri: string): Promise<FileStat> {
    return { uri, type: FileType.File, size: 0, mtime: Date.now(), ctime: Date.now(), isDirectory: false, isSymbolicLink: false };
  }

  async readFile(uri: string): Promise<Uint8Array> {
    return new Uint8Array();
  }

  async writeFile(uri: string, content: Uint8Array, options?: FileWriteOptions): Promise<void> {}

  async readDirectory(uri: string): Promise<[string, FileType][]> {
    return [];
  }

  async createDirectory(uri: string): Promise<void> {}

  async delete(uri: string, options?: FileDeleteOptions): Promise<void> {}

  async rename(oldUri: string, newUri: string, options?: FileRenameOptions): Promise<void> {}

  async copy(source: string, target: string, options?: FileCopyOptions): Promise<void> {}

  watch(uri: string, options?: WatchOptions): Disposable {
    return { dispose: () => {} };
  }
}

export class InMemoryFileSystemProvider implements FileSystemProvider {
  readonly scheme = 'inmemory';
  readonly capabilities: FileSystemProviderCapabilities = {
    supportsFileReadWrite: true,
    supportsDirectoryRead: true,
    supportsCreateDelete: true,
    supportsRenameCopy: true,
    supportsWatching: false,
    supportsStreaming: false,
  };

  private files = new Map<string, Uint8Array>();
  private dirs = new Set<string>();

  async stat(uri: string): Promise<FileStat> {
    const isDir = this.dirs.has(uri);
    const content = this.files.get(uri);
    return {
      uri,
      type: isDir ? FileType.Directory : FileType.File,
      size: content?.length ?? 0,
      mtime: Date.now(),
      ctime: Date.now(),
      isDirectory: isDir,
      isSymbolicLink: false,
    };
  }

  async readFile(uri: string): Promise<Uint8Array> {
    const content = this.files.get(uri);
    if (!content) throw new Error(`File not found: ${uri}`);
    return content;
  }

  async writeFile(uri: string, content: Uint8Array, options?: FileWriteOptions): Promise<void> {
    this.files.set(uri, content);
  }

  async readDirectory(uri: string): Promise<[string, FileType][]> {
    const results: [string, FileType][] = [];
    for (const fileUri of this.files.keys()) {
      if (fileUri.startsWith(uri) && fileUri !== uri) {
        const name = fileUri.slice(uri.length).replace(/^\//, '').split('/')[0];
        if (name && !results.find(r => r[0] === name)) {
          results.push([name, FileType.File]);
        }
      }
    }
    for (const dir of this.dirs) {
      if (dir.startsWith(uri) && dir !== uri) {
        const name = dir.slice(uri.length).replace(/^\//, '').split('/')[0];
        if (name && !results.find(r => r[0] === name)) {
          results.push([name, FileType.Directory]);
        }
      }
    }
    return results;
  }

  async createDirectory(uri: string): Promise<void> {
    this.dirs.add(uri);
  }

  async delete(uri: string, options?: FileDeleteOptions): Promise<void> {
    this.files.delete(uri);
    this.dirs.delete(uri);
  }

  async rename(oldUri: string, newUri: string, options?: FileRenameOptions): Promise<void> {
    const content = this.files.get(oldUri);
    if (content) {
      this.files.set(newUri, content);
      this.files.delete(oldUri);
    }
  }

  async copy(source: string, target: string, options?: FileCopyOptions): Promise<void> {
    const content = this.files.get(source);
    if (content) {
      this.files.set(target, content);
    }
  }

  watch(uri: string, options?: WatchOptions): Disposable {
    return { dispose: () => {} };
  }
}

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
    if (!provider) {
      throw new Error(`No provider for scheme: ${scheme}`);
    }
    return provider;
  }
}
