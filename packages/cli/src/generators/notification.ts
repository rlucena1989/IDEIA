import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';

/**
 * Processa notification.
 * @param channel - Valor channel.
 * @param options - Valor options.
 */
export function notification(channel: string, options: GeneratorOptions): void {
  const vars = buildVars(channel);
  const base = 'src/notifications/{{name_kebab}}';
  const files: FileEntry[] = [
    {
      path: `${base}/{{Name}}Notification.ts`,
      content: `export interface {{Name}}Payload {
  to: string | string[];
  subject: string;
  body: string;
  template?: string;
  variables?: Record<string, string>;
}

export interface {{Name}}Result {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class {{Name}}Notification {
  async send(payload: {{Name}}Payload): Promise<{{Name}}Result> {
    try {
      console.log(\`[{{Name}}Notification] Sending to \${payload.to}\`);
      // Implementar envio real pelo canal {{name}} (ex: email SMTP, push notification, notificacao in-app)
      return { success: true, messageId: crypto.randomUUID() };
    } catch (_error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  async broadcast(payloads: {{Name}}Payload[]): Promise<{{Name}}Result[]> {
    return Promise.all(payloads.map(p => this.send(p)));
  }
}
`,
    },
    {
      path: `${base}/index.ts`,
      content: `export { {{Name}}Notification } from './{{Name}}Notification';
export type { {{Name}}Payload, {{Name}}Result } from './{{Name}}Notification';
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Notification: ${channel}`, result, options.dryRun);
}
