# Environment Variables Reference

> **Fonte da verdade:** `packages/config-engine/src/config-manager.ts` — schema `GLOBAL_SCHEMA`
> Total: ~90 env vars registrados

## Como Usar

```typescript
import { config } from '@ideia/config-engine';

const port = config.get('PORT', 3001);
const apiKey = config.getSecret('OPENAI_API_KEY');
const masked = config.getMasked('OPENAI_API_KEY'); // "sk-****abcd"
const all = config.getAll(); // secrets masked by default
```

## Core

| Var | Type | Default | Description |
|-----|------|---------|-------------|
| `NODE_ENV` | string | `development` | Runtime environment |
| `PORT` | number | `3001` | HTTP server port |
| `HOST` | string | `0.0.0.0` | Server bind host |
| `LOG_LEVEL` | string | `info` | Logging level |
| `CI` | boolean | `false` | CI mode |

## IDEIA

| Var | Type | Default | Sensitive | Description |
|-----|------|---------|-----------|-------------|
| `IDEIA_ROOT` | string | — | | Root directory |
| `IDEIA_API_KEY` | string | — | 🔒 | API key |
| `IDEIA_HOME` | string | — | | Home directory |
| `IDEIA_LOG_DIR` | string | — | | Log directory |
| `IDEIA_DATA_DIR` | string | — | | Data directory |
| `IDEIA_WORKSPACE_ROOT` | string | — | | Workspace root |
| `IDEIA_MEMORY_PATH` | string | — | | Memory storage path |
| `IDEIA_SESSION_ID` | string | — | | Current session ID |
| `IDEIA_MAX_WORKERS` | number | `4` | | Max concurrent workers |
| `IDEIA_EMERGENCY` | boolean | `false` | | Emergency mode |
| `IDEIA_LEARNING` | boolean | `true` | | Learning mode |
| `IDEIA_DEFAULT_AUTONOMY` | string | `N2` | | Default autonomy level |

## LLM Providers

| Var | Type | Default | Sensitive | Description |
|-----|------|---------|-----------|-------------|
| `OPENAI_API_KEY` | string | — | 🔒 | OpenAI API key |
| `OPENAI_MODEL` | string | — | | OpenAI model |
| `OPENAI_BASE_URL` | string | — | | OpenAI base URL |
| `ANTHROPIC_API_KEY` | string | — | 🔒 | Anthropic API key |
| `ANTHROPIC_MODEL` | string | — | | Anthropic model |
| `DEEPSEEK_API_KEY` | string | — | 🔒 | DeepSeek API key |
| `DEEPSEEK_MODEL` | string | — | | DeepSeek model |
| `GEMINI_API_KEY` | string | — | 🔒 | Gemini API key |
| `GOOGLE_API_KEY` | string | — | 🔒 | Google API key |
| `OLLAMA_URL` | string | `http://localhost:11434` | | Ollama URL |
| `OLLAMA_BASE_URL` | string | — | | Ollama alt URL |
| `OLLAMA_MODEL` | string | — | | Ollama model |

## AI Engine

| Var | Type | Default | Description |
|-----|------|---------|-------------|
| `AI_LLM_MODE` | string | `auto` | LLM mode (auto/manual/off) |
| `AI_DAEMON_CHILD` | boolean | `false` | Running as AI daemon child |
| `AI_DEVKIT_NO_RECURSION` | boolean | `false` | Prevent recursive AI calls |
| `AI_DEVKIT_WEBHOOK_URL` | string | — | Webhook URL |
| `AI_JOB_TIMEOUT_MS` | number | `300000` | Job timeout |
| `AI_JOB_MAX_ATTEMPTS` | number | `3` | Max retry attempts |
| `AI_CONCURRENCY` | number | `4` | Job concurrency |
| `AI_STOP_ON_FAILURE` | boolean | `false` | Stop on first failure |
| `AI_REPORT_DIR` | string | — | Report output directory |
| `AI_CACHE_FILE` | string | — | Cache file path |
| `AI_STATE_FILE` | string | — | State file path |
| `AI_METRICS_FILE` | string | — | Metrics file path |
| `AI_TELEMETRY_FILE` | string | — | Telemetry file path |
| `AI_LOOP` | boolean | `false` | Loop mode |
| `AI_MODE` | string | `production` | Execution mode |

## Database

| Var | Type | Default | Sensitive | Description |
|-----|------|---------|-----------|-------------|
| `DATABASE_URL` | string | — | 🔒 | Database URL |
| `POSTGRES_URL` | string | — | 🔒 | PostgreSQL URL |
| `POSTGRES_HOST` | string | `localhost` | | PostgreSQL host |
| `POSTGRES_PORT` | number | `5432` | | PostgreSQL port |
| `POSTGRES_DB` | string | — | | PostgreSQL database |
| `POSTGRES_USER` | string | — | | PostgreSQL user |
| `POSTGRES_PASSWORD` | string | — | 🔒 | PostgreSQL password |

## NATS/EventBus

| Var | Type | Default | Sensitive | Description |
|-----|------|---------|-----------|-------------|
| `NATS_URL` | string | `nats://localhost:4222` | | NATS server URL |
| `NATS_SERVERS` | string | — | | NATS server list |
| `NATS_TOKEN` | string | — | 🔒 | NATS auth token |
| `NATS_USER` | string | — | | NATS username |
| `NATS_PASS` | string | — | 🔒 | NATS password |
| `NATS_STREAM` | string | `ideia` | | NATS stream name |
| `EVENT_BUS_TYPE` | string | `auto` | | Event bus type |

## Auth/Security

| Var | Type | Default | Sensitive | Description |
|-----|------|---------|-----------|-------------|
| `JWT_SECRET` | string | — | 🔒 | JWT signing secret |
| `API_KEY` | string | — | 🔒 | API key |
| `SESSION_SECRET` | string | — | 🔒 | Session secret |
| `SECRET` | string | — | 🔒 | Generic secret |
| `AUTH_PROVIDER` | string | `none` | | Auth provider type |
| `SESSION_MAX_AGE` | number | `86400000` | | Session max age |
| `A2A_API_KEY` | string | — | 🔒 | Agent-to-Agent API key |
| `CORS_ORIGIN` | string | `*` | | CORS allowed origin |

## Tokens/Credentials

| Var | Type | Default | Sensitive | Description |
|-----|------|---------|-----------|-------------|
| `GITHUB_TOKEN` | string | — | 🔒 | GitHub token |
| `GITLAB_TOKEN` | string | — | 🔒 | GitLab token |
| `NPM_TOKEN` | string | — | 🔒 | NPM token |
| `AWS_ACCESS_KEY_ID` | string | — | 🔒 | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | string | — | 🔒 | AWS secret key |
| `AWS_SESSION_TOKEN` | string | — | 🔒 | AWS session token |
| `AWS_REGION` | string | — | | AWS region |

## Notifications

| Var | Type | Default | Sensitive | Description |
|-----|------|---------|-----------|-------------|
| `SLACK_WEBHOOK_URL` | string | — | 🔒 | Slack webhook URL |
| `DISCORD_WEBHOOK_URL` | string | — | 🔒 | Discord webhook URL |
| `SMTP_HOST` | string | — | | SMTP host |
| `SMTP_PORT` | number | `587` | | SMTP port |
| `SMTP_USER` | string | — | | SMTP username |
| `SMTP_PASS` | string | — | 🔒 | SMTP password |

## Desktop

| Var | Type | Default | Description |
|-----|------|---------|-------------|
| `CERT_PASSWORD` | string | — | 🔒 Certificate password |
| `CERT_PFX_PATH` | string | — | PFX certificate path |
| `COSIGN_KEY_PATH` | string | — | Cosign key path |
| `GPG_KEY_ID` | string | — | GPG key ID |
| `TAURI_DEBUG` | boolean | `false` | Tauri debug mode |
| `SENTRY_DSN` | string | — | 🔒 Sentry DSN |

## Observability

| Var | Type | Default | Description |
|-----|------|---------|-------------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | string | — | OpenTelemetry OTLP endpoint |
| `OTEL_SERVICE_NAME` | string | `ideia` | OpenTelemetry service name |
| `ENABLE_TELEMETRY` | boolean | `false` | Enable telemetry |
| `ENABLE_EXPERIMENTAL_FEATURES` | boolean | `false` | Enable experimental features |

## GPU

| Var | Type | Default | Description |
|-----|------|---------|-------------|
| `CUDA_VISIBLE_DEVICES` | string | — | CUDA GPU device list |
| `ROCM_VISIBLE_DEVICES` | string | — | ROCm GPU device list |

## CI/Platform

| Var | Type | Default | Description |
|-----|------|---------|-------------|
| `GITHUB_SHA` | string | — | Current commit SHA |
| `GITHUB_REPOSITORY` | string | — | Repository name |
| `CI_SERVER_URL` | string | — | CI server base URL |
| `GENERATOR_STACK` | string | `typescript` | Generator stack target |
| `MOCK_PORT` | number | 0 | Mock server port |
| `MOCK_URL` | string | — | Mock server URL |
| `LANG` | string | `en_US.UTF-8` | System locale |
| `LC_ALL` | string | — | Locale override |
| `NODE_OPTIONS` | string | — | Node.js runtime options |
| `RATE_LIMIT_MAX` | number | `100` | Rate limit max requests |
| `RATE_LIMIT_WINDOW_MS` | number | `60000` | Rate limit window |
