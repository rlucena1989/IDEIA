import { randomInt } from 'node:crypto';
import { createLogger } from '@ideia/logger';
const logger = createLogger('side-channel');

export class SideChannelPrevention {
  static FORBIDDEN_MESSAGE = 'Access denied';

  static async addJitter(minMs = 5, maxMs = 50): Promise<void> {
    const delay = randomInt(minMs, maxMs + 1);
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  static constantErrorResponse(): Buffer {
    const errorObj = { success: false, error: this.FORBIDDEN_MESSAGE };
    const json = Buffer.from(JSON.stringify(errorObj));
    const padding = Buffer.alloc(256 - (json.length % 256), 0x20);
    return Buffer.concat([json, padding]);
  }

  static getSafeErrorMessage(_originalError: Error): string {
    return this.FORBIDDEN_MESSAGE;
  }
}

export async function secureIpcHandler(
  handler: () => Promise<object>,
): Promise<{ data?: object; error?: string }> {
  try {
    const result = await handler();
    await SideChannelPrevention.addJitter(5, 30);
    return { data: result };
  } catch {
    await new Promise(resolve => setTimeout(resolve, 100));
    return { error: SideChannelPrevention.FORBIDDEN_MESSAGE };
  }
}
