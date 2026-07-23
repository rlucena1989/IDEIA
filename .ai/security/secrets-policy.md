# Secrets and Credentials Policy

## Scope
Defines how secrets, API keys, credentials, and sensitive configuration are managed, stored, and rotated within ai-devkit projects.

## Prohibited Practices
1. Hardcoding secrets in source code (any language)
2. Committing `.env` files with real values to version control
3. Storing secrets in configuration files tracked by git
4. Logging or printing secrets to console/output
5. Sharing secrets via chat, email, or documentation
6. Using default/weak passwords in production

## Required Practices

### Storage
- All secrets MUST use environment variables
- `.env` files MUST be in `.gitignore` (template provided by `ai-devkit init`)
- `.env.example` with placeholder values MAY be committed
- Production secrets MUST use a secrets manager (HashiCorp Vault, AWS Secrets Manager, Azure Key Vault)

### Access
- Secrets access must be logged and auditable
- Principle of least privilege: only code that needs the secret should have access
- Temporary credentials (AWS STS) are preferred over long-lived keys

### Rotation
- API keys: rotate every 90 days max
- Database passwords: rotate every 180 days max
- TLS certificates: renew before expiry (monitoring required)

## Compliance
- LGPD/GDPR: personal data encryption at rest and in transit
- PCI-DSS: if handling payment data, additional controls apply

## Detection
The `security barrier check` command scans for:
- Hardcoded secrets via regex patterns
- `.env` files committed to git
- Private keys in source tree
- Overridden environment variables in code

## Enforcement
- `security barrier check` runs on every commit (via `ai-devkit verify`)
- CI pipeline blocks PRs with secrets violations
- Bypass requires `--bypass <reason>` logged to audit trail