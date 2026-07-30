import { readFileSync, existsSync } from 'fs';
import { createLogger } from '@ideia/logger';
import { join, resolve } from 'path';
const logger = createLogger('config-manager');

export interface EnvSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'json';
    required?: boolean;
    default?: unknown;
    sensitive?: boolean;
    description?: string;
  };
}

type EnvValue = string | number | boolean | Record<string, unknown> | undefined;

export class ConfigManager {
  private static instance: ConfigManager;
  private secrets: Map<string, string> = new Map();
  private loaded = false;

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private readonly GLOBAL_SCHEMA: EnvSchema = {
    NODE_ENV: { type: 'string', default: 'development', description: 'Runtime environment' },
    PORT: { type: 'number', default: 3001, description: 'HTTP server port' },
    LOG_LEVEL: { type: 'string', default: 'info', description: 'Logging level' },

    IDEIA_API_KEY: { type: 'string', required: false, sensitive: true, description: 'IDEIA API key' },
    IDEIA_ROOT: { type: 'string', required: false, description: 'IDEIA root directory' },
    IDEIA_WORKSPACE_ROOT: { type: 'string', required: false, description: 'Workspace root' },
    IDEIA_MEMORY_PATH: { type: 'string', required: false, description: 'Memory storage path' },
    IDEIA_SESSION_ID: { type: 'string', required: false, description: 'Current session ID' },
    IDEIA_LLM_API_KEY: { type: 'string', required: false, sensitive: true, description: 'LLM API key' },
    IDEIA_LLM_ENDPOINT: { type: 'string', required: false, description: 'LLM endpoint URL' },
    IDEIA_LLM_MODEL: { type: 'string', required: false, description: 'LLM model name' },
    IDEIA_LLM_REASONING: { type: 'boolean', default: false, description: 'Enable reasoning' },
    IDEIA_MAX_WORKERS: { type: 'number', default: 4, description: 'Max concurrent workers' },
    IDEIA_EMERGENCY: { type: 'boolean', default: false, description: 'Emergency mode' },
    IDEIA_LEARNING: { type: 'boolean', default: true, description: 'Learning mode' },

    OPENAI_API_KEY: { type: 'string', required: false, sensitive: true, description: 'OpenAI API key' },
    OPENAI_MODEL: { type: 'string', required: false, description: 'OpenAI model' },
    OPENAI_BASE_URL: { type: 'string', required: false, description: 'OpenAI base URL' },
    ANTHROPIC_API_KEY: { type: 'string', required: false, sensitive: true, description: 'Anthropic API key' },
    DEEPSEEK_API_KEY: { type: 'string', required: false, sensitive: true, description: 'DeepSeek API key' },
    GEMINI_API_KEY: { type: 'string', required: false, sensitive: true, description: 'Gemini API key' },
    GOOGLE_API_KEY: { type: 'string', required: false, sensitive: true, description: 'Google API key' },
    OLLAMA_URL: { type: 'string', default: 'http://localhost:11434', description: 'Ollama URL' },
    OLLAMA_MODEL: { type: 'string', required: false, description: 'Ollama model' },

    GITHUB_TOKEN: { type: 'string', required: false, sensitive: true, description: 'GitHub token' },
    GITLAB_TOKEN: { type: 'string', required: false, sensitive: true, description: 'GitLab token' },
    NPM_TOKEN: { type: 'string', required: false, sensitive: true, description: 'NPM token' },
    JWT_SECRET: { type: 'string', required: false, sensitive: true, description: 'JWT signing secret' },
    API_KEY: { type: 'string', required: false, sensitive: true, description: 'API key' },
    SESSION_SECRET: { type: 'string', required: false, sensitive: true, description: 'Session secret' },
    SECRET: { type: 'string', required: false, sensitive: true, description: 'Generic secret' },
    CERT_PASSWORD: { type: 'string', required: false, sensitive: true, description: 'Certificate password' },
    CERT_PFX_PATH: { type: 'string', required: false, description: 'PFX certificate path' },
    COSIGN_KEY_PATH: { type: 'string', required: false, description: 'Cosign key path' },
    GPG_KEY_ID: { type: 'string', required: false, description: 'GPG key ID' },

    AWS_ACCESS_KEY_ID: { type: 'string', required: false, sensitive: true, description: 'AWS access key' },
    AWS_SECRET_ACCESS_KEY: { type: 'string', required: false, sensitive: true, description: 'AWS secret key' },
    AWS_SESSION_TOKEN: { type: 'string', required: false, sensitive: true, description: 'AWS session token' },
    AWS_REGION: { type: 'string', required: false, description: 'AWS region' },

    DATABASE_URL: { type: 'string', required: false, sensitive: true, description: 'Database URL' },
    POSTGRES_URL: { type: 'string', required: false, sensitive: true, description: 'PostgreSQL URL' },
    POSTGRES_HOST: { type: 'string', default: 'localhost', description: 'PostgreSQL host' },
    POSTGRES_PORT: { type: 'number', default: 5432, description: 'PostgreSQL port' },
    POSTGRES_DB: { type: 'string', required: false, description: 'PostgreSQL database' },
    POSTGRES_USER: { type: 'string', required: false, description: 'PostgreSQL user' },
    POSTGRES_PASSWORD: { type: 'string', required: false, sensitive: true, description: 'PostgreSQL password' },

    NATS_URL: { type: 'string', default: 'nats://localhost:4222', description: 'NATS server URL' },
    NATS_SERVERS: { type: 'string', required: false, description: 'NATS server list' },
    NATS_TOKEN: { type: 'string', required: false, sensitive: true, description: 'NATS auth token' },
    NATS_USER: { type: 'string', required: false, description: 'NATS username' },
    NATS_PASS: { type: 'string', required: false, sensitive: true, description: 'NATS password' },
    NATS_STREAM: { type: 'string', default: 'ideia', description: 'NATS stream name' },
    EVENT_BUS_TYPE: { type: 'string', default: 'auto', description: 'Event bus type' },

    SMTP_HOST: { type: 'string', required: false, description: 'SMTP host' },
    SMTP_PORT: { type: 'number', default: 587, description: 'SMTP port' },
    SMTP_USER: { type: 'string', required: false, description: 'SMTP username' },
    SMTP_PASS: { type: 'string', required: false, sensitive: true, description: 'SMTP password' },

    SLACK_WEBHOOK_URL: { type: 'string', required: false, sensitive: true, description: 'Slack webhook URL' },
    DISCORD_WEBHOOK_URL: { type: 'string', required: false, sensitive: true, description: 'Discord webhook URL' },

    RATE_LIMIT_MAX: { type: 'number', default: 100, description: 'Rate limit max requests' },
    RATE_LIMIT_WINDOW_MS: { type: 'number', default: 60000, description: 'Rate limit window' },

    CI: { type: 'boolean', default: false, description: 'CI mode' },
    ENABLE_TELEMETRY: { type: 'boolean', default: false, description: 'Enable telemetry' },
    ENABLE_EXPERIMENTAL_FEATURES: { type: 'boolean', default: false, description: 'Enable experimental features' },
    ENABLE_LOCAL_AI: { type: 'boolean', default: false, description: 'Enable local AI features' },

    AI_LLM_MODE: { type: 'string', default: 'auto', description: 'LLM mode (auto/manual/off)' },
    AI_DAEMON_CHILD: { type: 'boolean', default: false, description: 'Running as AI daemon child' },
    AI_DEVKIT_NO_RECURSION: { type: 'boolean', default: false, description: 'Prevent recursive AI calls' },
    AI_DEVKIT_WEBHOOK_URL: { type: 'string', required: false, description: 'AI devkit webhook URL' },
    AI_JOB_TIMEOUT_MS: { type: 'number', default: 300000, description: 'AI job timeout in ms' },
    AI_JOB_MAX_ATTEMPTS: { type: 'number', default: 3, description: 'Max AI job retry attempts' },
    AI_CONCURRENCY: { type: 'number', default: 4, description: 'AI job concurrency' },
    AI_STOP_ON_FAILURE: { type: 'boolean', default: false, description: 'Stop AI on first failure' },
    AI_REPORT_DIR: { type: 'string', required: false, description: 'AI report output directory' },
    AI_CACHE_FILE: { type: 'string', required: false, description: 'AI cache file path' },
    AI_STATE_FILE: { type: 'string', required: false, description: 'AI state file path' },
    AI_METRICS_FILE: { type: 'string', required: false, description: 'AI metrics file path' },
    AI_TELEMETRY_FILE: { type: 'string', required: false, description: 'AI telemetry file path' },
    AI_LOOP: { type: 'boolean', default: false, description: 'AI loop mode' },
    AI_MODE: { type: 'string', default: 'production', description: 'AI execution mode' },
    AI_DAEMON_TIMEOUT: { type: 'number', default: 60000, description: 'Daemon timeout' },
    AI_DAEMON_INTERVAL: { type: 'number', default: 5000, description: 'Daemon polling interval' },

    GENERATOR_STACK: { type: 'string', default: 'typescript', description: 'Generator stack target' },
    TAURI_DEBUG: { type: 'boolean', default: false, description: 'Tauri debug mode' },
    CORS_ORIGIN: { type: 'string', default: '*', description: 'CORS allowed origin' },
    A2A_API_KEY: { type: 'string', required: false, sensitive: true, description: 'Agent-to-Agent API key' },

    IDEIA_HOME: { type: 'string', required: false, description: 'IDEIA home directory' },
    IDEIA_LOG_DIR: { type: 'string', required: false, description: 'IDEIA log directory' },
    IDEIA_DATA_DIR: { type: 'string', required: false, description: 'IDEIA data directory' },
    IDEIA_DEFAULT_AUTONOMY: { type: 'string', default: 'N2', description: 'Default autonomy level' },

    ANTHROPIC_MODEL: { type: 'string', required: false, description: 'Anthropic model name' },
    DEEPSEEK_MODEL: { type: 'string', required: false, description: 'DeepSeek model name' },
    OLLAMA_BASE_URL: { type: 'string', required: false, description: 'Ollama base URL (alt)' },

    AUTH_PROVIDER: { type: 'string', default: 'none', description: 'Auth provider type' },
    SESSION_MAX_AGE: { type: 'number', default: 86400000, description: 'Session max age in ms' },
    HOST: { type: 'string', default: '0.0.0.0', description: 'Server bind host' },

    CUDA_VISIBLE_DEVICES: { type: 'string', required: false, description: 'CUDA GPU device list' },
    ROCM_VISIBLE_DEVICES: { type: 'string', required: false, description: 'ROCm GPU device list' },
    NODE_OPTIONS: { type: 'string', required: false, description: 'Node.js runtime options' },

    GITHUB_SHA: { type: 'string', required: false, description: 'Current GitHub commit SHA' },
    GITHUB_REPOSITORY: { type: 'string', required: false, description: 'GitHub repository name' },
    CI_SERVER_URL: { type: 'string', required: false, description: 'CI server base URL' },
    MOCK_PORT: { type: 'number', default: 0, description: 'Mock server port' },
    MOCK_URL: { type: 'string', required: false, description: 'Mock server URL' },

    LANG: { type: 'string', default: 'en_US.UTF-8', description: 'System locale' },
    LC_ALL: { type: 'string', required: false, description: 'Locale override' },

    SENTRY_DSN: { type: 'string', required: false, sensitive: true, description: 'Sentry DSN' },
    OTEL_EXPORTER_OTLP_ENDPOINT: { type: 'string', required: false, description: 'OpenTelemetry OTLP endpoint' },
    OTEL_SERVICE_NAME: { type: 'string', default: 'ideia', description: 'OpenTelemetry service name' },
  };

  private constructor() {}

  init(options?: { envFiles?: string[]; schema?: EnvSchema }): void {
    if (this.loaded) return;
    this.loaded = true;

    if (options?.schema) {
      Object.assign(this.GLOBAL_SCHEMA, options.schema);
    }

    const envFiles = options?.envFiles ?? ['.env', '.env.local', '.env.production'];
    for (const file of envFiles) {
      this.loadEnvFile(file);
    }

    for (const [key, schema] of Object.entries(this.GLOBAL_SCHEMA)) {
      const value = process.env[key];
      if (value !== undefined) {
        if (schema.sensitive) {
          this.secrets.set(key, value);
        }
      }
    }
  }

  private loadEnvFile(filePath: string): void {
    const resolved = resolve(process.cwd(), filePath);
    if (!existsSync(resolved)) return;
    try {
      const content = readFileSync(resolved, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let value = trimmed.slice(eqIdx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    } catch {
    }
  }

  get<T = string>(key: string, fallback?: T): T {
    const schema = this.GLOBAL_SCHEMA[key];
    const value = process.env[key] ?? schema?.default ?? fallback;
    if (value === undefined || value === null) {
      if (schema?.required) {
        throw new Error(`Required environment variable ${key} is not set`);
      }
      return undefined as T;
    }
    if (schema) {
      return this.cast(value, schema.type) as T;
    }
    return value as T;
  }

  getSecret(key: string): string | undefined {
    return this.secrets.get(key);
  }

  getAll(includeSecrets = false): Record<string, EnvValue> {
    const result: Record<string, EnvValue> = {};
    for (const [key, schema] of Object.entries(this.GLOBAL_SCHEMA)) {
      if (schema.sensitive && !includeSecrets) continue;
      result[key] = this.get(key);
    }
    return result;
  }

  validate(): string[] {
    const errors: string[] = [];
    for (const [key, schema] of Object.entries(this.GLOBAL_SCHEMA)) {
      if (!schema.required) continue;
      const value = process.env[key];
      if (value === undefined || value === '') {
        errors.push(`Missing required environment variable: ${key}`);
      }
    }
    return errors;
  }

  maskSecret(value: string): string {
    if (value.length <= 8) return '****';
    return value.slice(0, 4) + '****' + value.slice(-4);
  }

  getMasked(key: string): string | undefined {
    const value = this.getSecret(key);
    if (!value) return undefined;
    return this.maskSecret(value);
  }

  private cast(value: unknown, type: string): unknown {
    switch (type) {
      case 'number': {
        const n = Number(value);
        return isNaN(n) ? value : n;
      }
      case 'boolean': {
        if (typeof value === 'boolean') return value;
        if (value === 'true' || value === '1') return true;
        if (value === 'false' || value === '0') return false;
        return value;
      }
      case 'json': {
        if (typeof value === 'object') return value;
        try { return JSON.parse(value as string); } catch { return value; }
      }
      default:
        return String(value);
    }
  }
}

export const config = ConfigManager.getInstance();
