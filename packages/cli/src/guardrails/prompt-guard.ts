import { JailbreakDetector } from '../hardening/jailbreak-detector';
import { ContentFilter } from './content-filter';

export interface PromptGuardConfig {
  enableJailbreakDetection: boolean;
  enableContentFilter: boolean;
  enableInjectionCheck: boolean;
  blockOnCritical: boolean;
  maxPromptLength: number;
}

export interface PromptGuardResult {
  allowed: boolean;
  reason?: string;
  jailbreakResult?: { detected: boolean; severity: string };
  contentResult?: { blocked: boolean; warnings: string[] };
  sanitizedPrompt?: string;
}

const DEFAULT_CONFIG: PromptGuardConfig = {
  enableJailbreakDetection: true,
  enableContentFilter: true,
  enableInjectionCheck: true,
  blockOnCritical: true,
  maxPromptLength: 32000,
};

export class PromptGuard {
  private config: PromptGuardConfig;
  private jailbreakDetector: JailbreakDetector;
  private contentFilter: ContentFilter;

  constructor(config?: Partial<PromptGuardConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.jailbreakDetector = new JailbreakDetector();
    this.contentFilter = new ContentFilter();
  }

  async guard(input: string): Promise<PromptGuardResult> {
    if (input.length > this.config.maxPromptLength) {
      return {
        allowed: false,
        reason: `Prompt excede o limite de ${this.config.maxPromptLength} caracteres (${input.length})`,
      };
    }

    let sanitized = input;

    if (this.config.enableJailbreakDetection) {
      const jailbreakResult = this.jailbreakDetector.analyze(input);
      if (jailbreakResult.detected && jailbreakResult.overallSeverity === 'critical' && this.config.blockOnCritical) {
        return {
          allowed: false,
          reason: `Jailbreak detectado: ${jailbreakResult.matches.map(m => m.pattern).join(', ')}`,
          jailbreakResult: { detected: true, severity: jailbreakResult.overallSeverity },
        };
      }
    }

    if (this.config.enableContentFilter) {
      const contentResult = this.contentFilter.filter(input);
      if (contentResult.blocked) {
        return {
          allowed: false,
          reason: `Conteúdo bloqueado: ${contentResult.matches.map(m => m.category).join(', ')}`,
          contentResult: { blocked: true, warnings: contentResult.warnings },
        };
      }
    }

    if (this.config.enableInjectionCheck) {
      sanitized = this.sanitizeInput(input);
    }

    return {
      allowed: true,
      sanitizedPrompt: sanitized,
    };
  }

  private sanitizeInput(input: string): string {
    let sanitized = input;
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');
    // Remove control characters (except newline/tab)
    sanitized = sanitized.split('').filter(c => { const n = c.charCodeAt(0); return n > 0x08 && n !== 0x0B && n !== 0x0C && (n < 0x0E || n > 0x1F); }).join('');
    // Truncate at max length
    if (sanitized.length > this.config.maxPromptLength) {
      sanitized = sanitized.substring(0, this.config.maxPromptLength);
    }
    return sanitized;
  }

  updateConfig(config: Partial<PromptGuardConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export function createPromptGuard(config?: Partial<PromptGuardConfig>): PromptGuard {
  return new PromptGuard(config);
}
