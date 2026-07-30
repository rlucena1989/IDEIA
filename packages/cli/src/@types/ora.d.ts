declare module 'ora' {
  interface Ora {
    start(text?: string): Ora;
    stop(): Ora;
    succeed(text?: string): Ora;
    fail(text?: string): Ora;
    warn(text?: string): Ora;
    info(text?: string): Ora;
    stopAndPersist(options?: { text?: string; symbol?: string }): Ora;
    clear(): Ora;
    render(): Ora;
    frame(): string;
    text: string;
    color: string;
    spinner: { interval: number; frames: string[] };
  }
  function ora(options?: unknown): Ora;
  export default ora;
  export { Ora };
}
