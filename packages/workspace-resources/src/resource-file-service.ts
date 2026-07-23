import { Emitter, Disposable } from '@ideia/core-contributions';
import { FileSystemProviderRegistry } from '@ideia/filesystem';
import {
  ResourceProvider, ResourceStat, FileService, WatchOptions, FileChangeEvent,
} from './types';
import { DefaultVfsUri, DefaultPathService } from './uri-path';

export class DefaultResourceProvider implements ResourceProvider {
  private onChangedEmitter = new Emitter<string>();
  get onResourceChanged() { return this.onChangedEmitter.event; }

  constructor(private providerRegistry: FileSystemProviderRegistry) {}

  async read(uri: string): Promise<Uint8Array> {
    const provider = this.providerRegistry.resolveProvider(uri);
    return provider.readFile(uri);
  }

  async write(uri: string, content: Uint8Array): Promise<void> {
    const provider = this.providerRegistry.resolveProvider(uri);
    await provider.writeFile(uri, content);
  }

  async stat(uri: string): Promise<ResourceStat> {
    const provider = this.providerRegistry.resolveProvider(uri);
    const stat = await provider.stat(uri);
    return {
      uri: stat.uri,
      size: stat.size,
      mtime: new Date(stat.mtime),
      isDirectory: stat.isDirectory,
      isFile: !stat.isDirectory,
    };
  }

  watch(uri: string): Disposable {
    const provider = this.providerRegistry.resolveProvider(uri);
    return provider.watch(uri);
  }
}

export class DefaultFileService implements FileService {
  private onChangedEmitter = new Emitter<FileChangeEvent>();
  get onFileChanged() { return this.onChangedEmitter.event; }

  constructor(
    private providerRegistry: FileSystemProviderRegistry,
    private pathService: DefaultPathService,
  ) {}

  async read(uri: string): Promise<Uint8Array> {
    const provider = this.providerRegistry.resolveProvider(uri);
    return provider.readFile(uri);
  }

  async write(uri: string, content: Uint8Array): Promise<void> {
    const provider = this.providerRegistry.resolveProvider(uri);
    await provider.writeFile(uri, content);
    this.onChangedEmitter.fire({ uri, type: 'updated' });
  }

  async delete(uri: string, options?: { recursive?: boolean; useTrash?: boolean }): Promise<void> {
    const provider = this.providerRegistry.resolveProvider(uri);
    await provider.delete(uri, { recursive: options?.recursive });
    this.onChangedEmitter.fire({ uri, type: 'deleted' });
  }

  async rename(source: string, target: string): Promise<void> {
    const provider = this.providerRegistry.resolveProvider(source);
    await provider.rename(source, target);
    this.onChangedEmitter.fire({ uri: source, type: 'deleted' });
    this.onChangedEmitter.fire({ uri: target, type: 'created' });
  }

  async copy(source: string, target: string): Promise<void> {
    const provider = this.providerRegistry.resolveProvider(source);
    await provider.copy(source, target);
    this.onChangedEmitter.fire({ uri: target, type: 'created' });
  }

  async createDirectory(uri: string): Promise<void> {
    const provider = this.providerRegistry.resolveProvider(uri);
    await provider.createDirectory(uri);
  }

  async stat(uri: string): Promise<ResourceStat> {
    const provider = this.providerRegistry.resolveProvider(uri);
    const s = await provider.stat(uri);
    return { uri: s.uri, size: s.size, mtime: new Date(s.mtime), isDirectory: s.isDirectory, isFile: !s.isDirectory };
  }

  async readDirectory(uri: string): Promise<[string, boolean][]> {
    const provider = this.providerRegistry.resolveProvider(uri);
    const entries = await provider.readDirectory(uri);
    return entries.map(([name, type]) => [name, type === 2]);
  }

  async exists(uri: string): Promise<boolean> {
    try {
      await this.stat(uri);
      return true;
    } catch { return false; }
  }

  watch(uri: string, options?: WatchOptions): Disposable {
    const provider = this.providerRegistry.resolveProvider(uri);
    return provider.watch(uri, { recursive: options?.recursive, excludes: options?.excludes });
  }
}
