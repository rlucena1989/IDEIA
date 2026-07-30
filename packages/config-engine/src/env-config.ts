import { createLogger } from '@ideia/logger';

const log = createLogger('env-config');

export interface EnvConfig {
  nodeEnv: 'development' | 'production' | 'test';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  port: number;
  host: string;

  // LLM Providers
  openaiApiKey?: string;
  openaiModel: string;
  anthropicApiKey?: string;
  anthropicModel: string;
  deepseekApiKey?: string;
  deepseekModel: string;
  ollamaBaseUrl: string;
  ollamaModel: string;

  // Database
  databaseUrl: string;
  pgHost: string;
  pgPort: number;
  pgDatabase: string;
  pgUser: string;
  pgPassword: string;

  // NATS
  natsUrl: string;
  natsToken?: string;

  // Auth
  authProvider: 'auth0' | 'clerk' | 'none';
  auth0Domain?: string;
  auth0ClientId?: string;
  auth0Audience?: string;
  jwtSecret: string;
  sessionSecret: string;
  sessionMaxAge: number;

  // Observability
  otelExporterOtlpEndpoint: string;
  otelServiceName: string;
  sentryDsn?: string;

  // IDEIA specific
  ideiaHome: string;
  ideiaLogDir: string;
  ideiaDataDir: string;
  ideiaMaxWorkers: number;
  ideiaDefaultAutonomy: number;

  // Feature flags
  enableExperimentalFeatures: boolean;
  enableTelemetry: boolean;
  enableLocalAi: boolean;
}

function env(key: string, defaultValue?: string): string | undefined {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined && defaultValue === undefined) {
    log.warn(`Environment variable ${key} is not set and has no default`);
  }
  return value;
}

function envInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    log.warn(`Environment variable ${key} is not a valid integer: "${value}", using default ${defaultValue}`);
    return defaultValue;
  }
  return parsed;
}

function envBool(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1' || value === 'yes';
}

function envOneOf<T extends string>(key: string, validValues: T[], defaultValue: T): T {
  const value = process.env[key] as T | undefined;
  if (value === undefined) return defaultValue;
  if (!validValues.includes(value)) {
    log.warn(`Environment variable ${key} has invalid value "${value}", using default "${defaultValue}"`);
    return defaultValue;
  }
  return value;
}

function createEnvConfig(): EnvConfig {
  return {
    // General
    nodeEnv: envOneOf('NODE_ENV', ['development', 'production', 'test'], 'development'),
    logLevel: envOneOf('LOG_LEVEL', ['debug', 'info', 'warn', 'error'], 'info'),
    port: envInt('PORT', 3000),
    host: env('HOST', '0.0.0.0')!,

    // LLM Providers
    openaiApiKey: env('OPENAI_API_KEY'),
    openaiModel: env('OPENAI_MODEL', 'gpt-4o')!,
    anthropicApiKey: env('ANTHROPIC_API_KEY'),
    anthropicModel: env('ANTHROPIC_MODEL', 'claude-3-opus-20240229')!,
    deepseekApiKey: env('DEEPSEEK_API_KEY'),
    deepseekModel: env('DEEPSEEK_MODEL', 'deepseek-chat')!,
    ollamaBaseUrl: env('OLLAMA_BASE_URL', 'http://localhost:11434')!,
    ollamaModel: env('OLLAMA_MODEL', 'llama3')!,

    // Database
    databaseUrl: env('DATABASE_URL', 'postgresql://localhost:5432/ideia')!,
    pgHost: env('PG_HOST', 'localhost')!,
    pgPort: envInt('PG_PORT', 5432),
    pgDatabase: env('PG_DATABASE', 'ideia')!,
    pgUser: env('PG_USER', 'ideia')!,
    pgPassword: env('PG_PASSWORD', '')!,

    // NATS
    natsUrl: env('NATS_URL', 'nats://localhost:4222')!,
    natsToken: env('NATS_TOKEN'),

    // Auth
    authProvider: envOneOf('AUTH_PROVIDER', ['auth0', 'clerk', 'none'], 'none'),
    auth0Domain: env('AUTH0_DOMAIN'),
    auth0ClientId: env('AUTH0_CLIENT_ID'),
    auth0Audience: env('AUTH0_AUDIENCE'),
    jwtSecret: env('JWT_SECRET', 'change-me-in-production')!,
    sessionSecret: env('SESSION_SECRET', 'change-me-in-production')!,
    sessionMaxAge: envInt('SESSION_MAX_AGE', 86400),

    // Observability
    otelExporterOtlpEndpoint: env('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://localhost:4317')!,
    otelServiceName: env('OTEL_SERVICE_NAME', 'ideia')!,
    sentryDsn: env('SENTRY_DSN'),

    // IDEIA specific
    ideiaHome: env('IDEIA_HOME', '~/.ideia')!,
    ideiaLogDir: env('IDEIA_LOG_DIR', '~/.ideia/logs')!,
    ideiaDataDir: env('IDEIA_DATA_DIR', '~/.ideia/data')!,
    ideiaMaxWorkers: envInt('IDEIA_MAX_WORKERS', 4),
    ideiaDefaultAutonomy: envInt('IDEIA_DEFAULT_AUTONOMY', 2),

    // Feature flags
    enableExperimentalFeatures: envBool('ENABLE_EXPERIMENTAL_FEATURES', false),
    enableTelemetry: envBool('ENABLE_TELEMETRY', true),
    enableLocalAi: envBool('ENABLE_LOCAL_AI', true),
  };
}

let _cachedConfig: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
  if (!_cachedConfig) {
    _cachedConfig = createEnvConfig();
  }
  return _cachedConfig;
}

export function reloadEnvConfig(): EnvConfig {
  _cachedConfig = createEnvConfig();
  return _cachedConfig;
}

export function validateEnvConfig(config: EnvConfig): string[] {
  const errors: string[] = [];

  if (!config.jwtSecret || config.jwtSecret === 'change-me-in-production') {
    errors.push('JWT_SECRET must be changed in production');
  }
  if (!config.sessionSecret || config.sessionSecret === 'change-me-in-production') {
    errors.push('SESSION_SECRET must be changed in production');
  }
  if (config.nodeEnv === 'production') {
    if (!config.openaiApiKey && !config.anthropicApiKey && !config.deepseekApiKey && config.authProvider !== 'none') {
      errors.push('At least one LLM API key must be configured in production');
    }
    if (config.authProvider === 'none') {
      errors.push('Auth provider must be configured in production (AUTH_PROVIDER)');
    }
  }

  return errors;
}
