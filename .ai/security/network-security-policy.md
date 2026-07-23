# Network Security Policy

## Scope
This policy governs all outbound network connections made by the ai-devkit CLI, agents, and associated tooling.

## Allowed Connections

### AI Providers (outbound HTTPS)
| Provider | Domain | Port | Purpose |
|----------|--------|------|---------|
| Ollama (local) | localhost:11434 | 11434 | Local model inference |
| OpenAI | api.openai.com | 443 | Cloud model fallback |
| Anthropic | api.anthropic.com | 443 | Cloud model fallback |
| Google Gemini | generativelanguage.googleapis.com | 443 | Cloud model fallback |
| AWS Bedrock | bedrock-runtime.*.amazonaws.com | 443 | Cloud model fallback |

### Package Registries
| Registry | Domain | Purpose |
|----------|--------|---------|
| npm | registry.npmjs.org | Package resolution |
| GitHub | github.com, api.github.com | Repository operations |

### Blocked by Default
- All inbound connections (no listening ports)
- All outbound to unknown/proxy domains
- All non-HTTPS (except Ollama localhost)
- All WebSocket connections (unless explicitly configured)

## TLS Requirements
- Minimum TLS 1.2, prefer TLS 1.3
- Certificate validation is REQUIRED
- Self-signed certificates are NOT allowed (except localhost dev)

## AI Provider Authentication
- API keys must use environment variables (`OPENAI_API_KEY`, etc.)
- Keys must NEVER be logged, stored in code, or transmitted in cleartext
- AWS must use SigV4 signing (implemented in `providers/aws.ts`)

## Enforcement
Blocked by `security barrier` rules for network config files.
Violations logged to `.ai/reports/network-violations.log`.