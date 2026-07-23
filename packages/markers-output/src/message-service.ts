import { MessageService, MessageAction } from './types';

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
    console.log(`[${type.toUpperCase()}] ${message}`);
    if (actions) {
      for (const action of actions) {
        console.log(`  Action: ${action.label}`);
      }
    }
    return undefined;
  }
}
