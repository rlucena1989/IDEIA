export interface ProtocolConfig {
  scheme: string;
  description: string;
  handler: (url: string) => Promise<void> | void;
  platforms?: ('win32' | 'darwin' | 'linux')[];
}

export class ProtocolHandler {
  private handlers: Map<string, ProtocolConfig> = new Map();

  register(config: ProtocolConfig): void {
    this.handlers.set(config.scheme, config);
  }

  unregister(scheme: string): void {
    this.handlers.delete(scheme);
  }

  async handle(url: string): Promise<void> {
    const parsed = new URL(url);
    const handler = this.handlers.get(parsed.protocol.replace(':', ''));
    if (handler) {
      await handler.handler(url);
    } else {
      throw new Error(`No handler for protocol: ${parsed.protocol}`);
    }
  }

  hasHandler(scheme: string): boolean {
    return this.handlers.has(scheme);
  }

  getRegistered(): ProtocolConfig[] {
    return Array.from(this.handlers.values());
  }

  getDefaults(): ProtocolConfig[] {
    return [
      { scheme: 'ideia', description: 'IDEIA deep link protocol', handler: () => {}, platforms: ['win32', 'darwin', 'linux'] },
      { scheme: 'ideia-settings', description: 'Open IDEIA settings', handler: () => {}, platforms: ['win32', 'darwin', 'linux'] },
      { scheme: 'ideia-file', description: 'Open file in IDEIA', handler: () => {}, platforms: ['win32', 'darwin', 'linux'] },
      { scheme: 'ideia-project', description: 'Open project in IDEIA', handler: () => {}, platforms: ['win32', 'darwin', 'linux'] },
      { scheme: 'ideia-debug', description: 'Open debug session', handler: () => {}, platforms: ['darwin', 'linux'] },
    ];
  }

  getRegistrationCommands(config: ProtocolConfig, appPath: string): string[] {
    const commands: string[] = [];
    if (!config.platforms || config.platforms.includes('win32')) {
      commands.push(`reg add "HKEY_CLASSES_ROOT\\${config.scheme}" /ve /t REG_SZ /d "URL:${config.description}" /f`);
      commands.push(`reg add "HKEY_CLASSES_ROOT\\${config.scheme}" /v "URL Protocol" /t REG_SZ /d "" /f`);
      commands.push(`reg add "HKEY_CLASSES_ROOT\\${config.scheme}\\shell\\open\\command" /ve /t REG_SZ /d "${appPath} %1" /f`);
    }
    if (!config.platforms || config.platforms.includes('darwin')) {
      commands.push(`/usr/libexec/PlistBuddy -c "Add CFBundleURLTypes:0:CFBundleURLSchemes:0 string ${config.scheme}" "${appPath}/Contents/Info.plist"`);
    }
    if (!config.platforms || config.platforms.includes('linux')) {
      commands.push(`xdg-mime default ideia.desktop x-scheme-handler/${config.scheme}`);
    }
    return commands;
  }
}
