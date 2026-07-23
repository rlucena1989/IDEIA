declare module 'node-pty' {
  interface IPtyForkOptions {
    name?: string;
    cols?: number;
    rows?: number;
    cwd?: string;
    env?: Record<string, string>;
    encoding?: string;
    handleFlowControl?: boolean;
    flowControlPause?: string;
    flowControlResume?: string;
  }

  interface IPtyOpenOptions {
    cols?: number;
    rows?: number;
    encoding?: string;
  }

  interface IPty {
    pid: number;
    cols: number;
    rows: number;
    process: string;
    on(event: string, listener: (...args: unknown[]) => void): void;
    onData(callback: (data: string) => void): void;
    onExit(callback: (event: { exitCode: number; signal?: string }) => void): void;
    write(data: string): void;
    resize(cols: number, rows: number): void;
    kill(signal?: string): void;
    pause(): void;
    resume(): void;
  }

  function spawn(file: string, args?: string[], options?: IPtyForkOptions): IPty;
  function open(options?: IPtyOpenOptions): IPty;
}
