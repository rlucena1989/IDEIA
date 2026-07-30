import { AiMessage } from '@ideia/theia-ai';
import { createLogger } from '@ideia/logger';
import { ChatResponse, SecurityPipeline } from './types';
const logger = createLogger('security');

export class DefaultSecurityPipeline implements SecurityPipeline {
  private piiPatterns = [
    /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g,
    /\b\d{3}-\d{2}-\d{4}\b/g,
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    /\b\d{16}\b/g,
  ];

  async validateInput(messages: AiMessage[]): Promise<AiMessage[]> {
    const validated: AiMessage[] = [];
    for (const msg of messages) {
      const injection = await this.detectPromptInjection(msg.content);
      if (injection) {
        validated.push({ ...msg, content: '[PROMPT INJECTION DETECTED - BLOCKED]' });
      } else {
        const clean = await this.maskPii(msg.content);
        validated.push({ ...msg, content: clean });
      }
    }
    return validated;
  }

  async validateOutput(response: ChatResponse): Promise<ChatResponse> {
    const clean = await this.maskPii(response.content);
    const injection = await this.detectPromptInjection(response.content);
    return {
      ...response,
      content: injection ? '[OUTPUT BLOCKED - POTENTIAL PROMPT LEAK]' : clean,
    };
  }

  async detectPromptInjection(content: string): Promise<boolean> {
    const patterns = [
      /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
      /forget\s+(all\s+)?(previous|prior)\s+(instructions|prompts)/i,
      /you\s+(are\s+)?(now|must\s+act\s+as)/i,
      /system\s+(prompt|instruction|message)/i,
      /<\|im_start\|>/i,
    ];
    return patterns.some(p => p.test(content));
  }

  async maskPii(content: string): Promise<string> {
    let masked = content;
    for (const pattern of this.piiPatterns) {
      masked = masked.replace(pattern, '[REDACTED]');
    }
    return masked;
  }
}
