import { Emitter } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { IWebviewWidget, WidgetTitle } from './types';
import { BaseWidget } from './widget-core';
const logger = createLogger('webview-widget');

export class WebviewWidget extends BaseWidget implements IWebviewWidget {
  private html = '';
  private csp = "default-src 'self'; script-src 'none'";
  private onMessageEmitter = new Emitter<unknown>();

  get onMessage() { return this.onMessageEmitter.event; }

  constructor(id: string, title: WidgetTitle) {
    super(id, title);
  }

  setHtml(html: string): void {
    this.html = html;
  }

  getHtml(): string {
    return this.html;
  }

  postMessage(message: unknown): void {
    this.onMessageEmitter.fire(message);
  }

  setContentSecurityPolicy(policy: string): void {
    this.csp = policy;
  }

  getContentSecurityPolicy(): string {
    return this.csp;
  }

  getContentHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${this.csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  ${this.html}
  <script>
    window.addEventListener('message', event => {
      // Forward messages from the webview to the host
    });
  </script>
</body>
</html>`;
  }
}
