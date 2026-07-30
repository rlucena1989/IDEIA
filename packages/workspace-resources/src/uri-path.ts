import { VfsUri } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('uri-path');

export class DefaultVfsUri implements VfsUri {
  readonly scheme: string;
  readonly authority: string;
  readonly path: string;
  readonly query: string;
  readonly fragment: string;

  constructor(scheme: string, authority: string, path: string, query = '', fragment = '') {
    this.scheme = scheme;
    this.authority = authority;
    this.path = path;
    this.query = query;
    this.fragment = fragment;
  }

  toString(): string {
    let uri = `${this.scheme}:`;
    if (this.authority) uri += `//${this.authority}`;
    uri += this.path;
    if (this.query) uri += `?${this.query}`;
    if (this.fragment) uri += `#${this.fragment}`;
    return uri;
  }

  toJSON(): string {
    return this.toString();
  }

  static parse(uri: string): DefaultVfsUri {
    const match = uri.match(/^([a-z][a-z0-9+.-]*):\/\/([^/]*)(\/[^?#]*)?(\?[^#]*)?(#.*)?$/i);
    if (!match) {
      if (uri.startsWith('/')) return new DefaultVfsUri('file', '', uri);
      throw new Error(`Invalid URI: ${uri}`);
    }
    return new DefaultVfsUri(
      match[1],
      match[2] || '',
      match[3] || '/',
      match[4] ? match[4].slice(1) : '',
      match[5] ? match[5].slice(1) : '',
    );
  }

  static file(path: string): DefaultVfsUri {
    const normalized = path.replace(/\\/g, '/');
    return new DefaultVfsUri('file', '', normalized.startsWith('/') ? normalized : `/${normalized}`);
  }
}

export class DefaultPathService {
  readonly separator: string = '/';

  normalize(path: string): string {
    const parts = path.replace(/\\/g, '/').split('/');
    const result: string[] = [];
    for (const part of parts) {
      if (part === '.' || part === '') continue;
      if (part === '..') { result.pop(); continue; }
      result.push(part);
    }
    const prefix = path.startsWith('/') ? '/' : '';
    return prefix + result.join('/');
  }

  join(...paths: string[]): string {
    return this.normalize(paths.join('/'));
  }

  relative(from: string, to: string): string {
    const fromParts = from.replace(/\\/g, '/').split('/').filter(Boolean);
    const toParts = to.replace(/\\/g, '/').split('/').filter(Boolean);
    let i = 0;
    while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) i++;
    const ups = fromParts.length - i;
    const rel = Array(ups).fill('..').concat(toParts.slice(i));
    return rel.join('/') || '.';
  }

  basename(path: string): string {
    const cleaned = path.replace(/\\/g, '/').replace(/\/$/, '');
    return cleaned.split('/').pop() || '';
  }

  dirname(path: string): string {
    const cleaned = path.replace(/\\/g, '/').replace(/\/$/, '');
    const parts = cleaned.split('/');
    parts.pop();
    return parts.join('/') || '/';
  }

  extname(path: string): string {
    const base = this.basename(path);
    const dot = base.lastIndexOf('.');
    return dot === -1 ? '' : base.slice(dot);
  }

  isAbsolute(path: string): boolean {
    return path.startsWith('/') || /^[a-zA-Z]:\\/.test(path);
  }

  resolve(...paths: string[]): string {
    const parts: string[] = [];
    for (const p of paths) {
      if (this.isAbsolute(p)) {
        parts.length = 0;
        parts.push(p);
      } else {
        parts.push(p);
      }
    }
    return this.normalize(parts.join('/'));
  }
}
