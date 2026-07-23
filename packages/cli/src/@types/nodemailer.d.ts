declare module 'nodemailer' {
  interface TransportOptions {
    host?: string;
    port?: number;
    secure?: boolean;
    auth?: { user?: string; pass?: string };
  }
  interface SentMessageInfo { messageId?: string; response?: string; }
  interface Transporter {
    sendMail(options: Record<string, unknown>): Promise<SentMessageInfo>;
  }
  export function createTransport(options: TransportOptions): Transporter;
}
