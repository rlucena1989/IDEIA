/** Interface que define a estrutura de shell result. */
export interface ShellResult {
  status: number;
  stdout: string;
  stderr: string;
}

/** Interface que define a estrutura de shell. */
export interface Shell {
  exec(command: string, args: string[], cwd?: string, timeout?: number): ShellResult;
  execString(command: string, cwd?: string): { stdout: string; status: number };
}

/** Interface que define a estrutura de file system. */
export interface FileSystem {
  exists(filePath: string): boolean;
  read(filePath: string, encoding?: string): string;
  readBuffer(filePath: string): Buffer;
  write(filePath: string, content: string): void;
  append(filePath: string, content: string): void;
  mkDir(dirPath: string, recursive?: boolean): void;
  readDir(dirPath: string): string[];
  readDirEntries(dirPath: string): { name: string; isDirectory: () => boolean; isFile: () => boolean }[];
  stat(filePath: string): { mtimeMs: number; size: number; isDirectory: () => boolean };
  remove(filePath: string, opts?: { recursive?: boolean; force?: boolean }): void;
  copy(src: string, dest: string): void;
  ensureDir(dirPath: string): void;
  cwd(): string;
}

/** Interface que define a estrutura de http client. */
export interface HttpClient {
  post(url: string, body: unknown, headers?: Record<string, string>, timeout?: number): Promise<{ status: number; data: string }>;
  get(url: string, timeout?: number): Promise<{ status: number; data: string }>;
}

/** Interface que define a estrutura de i o container. */
export interface IOContainer {
  shell: Shell;
  fs: FileSystem;
  http: HttpClient;
}
