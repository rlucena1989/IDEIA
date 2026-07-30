import { MessageService, MessageAction } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('markers-output');

export class DefaultMessageService implements MessageService {
  async info(message: string, actions?: MessageAction[]): Promise<string | undefined> {
    return this.showMessage('info', message, actions);
  }

  async warn(message: string, actions?: MessageAction[]): Promise<string | undefined> {
    return this.showMessage('warn', message, actions);
  }

  async error(message: string, actions?: MessageAction[]): Promise<string | undefined> {
    return this.showMessage('error', message, actions);
  }

  async showMessage(type: 'info' | 'warn' | 'error', message: string, actions?: MessageAction[]): Promise<string | undefined> {
    logger.info('[${type.toUpperCase()}] ${message}');
    if (actions) {
      for (const action of actions) {
        logger.info('  Action: ${action.label}');
      }
    }
    return undefined;
  }
}
