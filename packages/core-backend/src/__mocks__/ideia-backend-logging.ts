export class DefaultLogger {
  info = jest.fn(); warn = jest.fn(); error = jest.fn(); debug = jest.fn();
}
export interface ILogger { info(msg: string, meta?: unknown): void; warn(msg: string, meta?: unknown): void; error(msg: string, meta?: unknown): void; debug(msg: string, meta?: unknown): void; }
