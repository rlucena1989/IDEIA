# Deploy Guide — IDEIA

> **Desktop + Cloud:** guia completo de deploy.

---

## Desktop (Electron)

### Requisitos

| Platform | Suporte |
|----------|---------|
| Windows 10/11 | ✅ Native installer (.exe, .msi) |
| macOS 12+ (Intel + Apple Silicon) | ✅ Native installer (.dmg) |
| Linux (deb/rpm/AppImage) | ✅ Native installer |

### Instalação Desktop

```bash
# Via CLI
npm install -g @ideia/cli
ideia start
# Abre janela nativa Electron

# Via instalador (recomendado)
# Baixe o instalador em https://ideia.dev/download
```

### Build do Desktop

```bash
# Build para plataforma atual
npm run build:desktop

# Build para todas as plataformas
npm run build:desktop:all

# Build específico
npm run build:desktop:win   # Windows
npm run build:desktop:mac   # macOS
npm run build:desktop:linux # Linux
```

O instalador será gerado em `dist/electron/`.

### Auto-update

A versão desktop atualiza automaticamente:
- **Windows:** NSIS installer com auto-updater
- **macOS:** DMG com Sparkle
- **Linux:** AppImage com auto-update

```bash
# Verificar versão atual
ideia --version

# Forçar verificação de atualização
ideia doctor
```

---

## Cloud (Docker)

### Imagem Docker

```bash
# Pull da imagem oficial
docker pull ghcr.io/ideia/ideia:latest

# Run
docker run -d \
  --name ideia \
  -p 3000:3000 \
  -p 4222:4222 \
  -v $(pwd)/projects:/home/ideia/projects \
  ghcr.io/ideia/ideia:latest
```

Acesse `http://localhost:3000`.

### Docker Compose

```yaml
version: '3.8'
services:
  ideia:
    image: ghcr.io/ideia/ideia:latest
    ports:
      - "3000:3000"
      - "4222:4222"
    volumes:
      - ./projects:/home/ideia/projects
      - ./config:/home/ideia/.config/ideia
    environment:
      - IDEIA_AUTH=false
      - IDEIA_LOG_LEVEL=info
    restart: unless-stopped

  nats:
    image: nats:2.10-alpine
    ports:
      - "4222:4222"
    command: ["-js", "-m", "8222"]
```

```bash
docker compose up -d
```

### Docker com PostgreSQL

```yaml
version: '3.8'
services:
  ideia:
    image: ghcr.io/ideia/ideia:latest
    ports:
      - "3000:3000"
    volumes:
      - ./projects:/home/ideia/projects
    environment:
      - DATABASE_URL=postgresql://ideia:ideia@postgres:5432/ideia
    depends_on:
      - postgres

  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: ideia
      POSTGRES_PASSWORD: ideia
      POSTGRES_DB: ideia
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  nats:
    image: nats:2.10-alpine
    command: ["-js"]

volumes:
  pgdata:
```

---

## Cloud (Kubernetes)

### Helm Chart

```bash
# Adicionar repo
helm repo add ideia https://charts.ideia.dev
helm repo update

# Instalar
helm install ideia ideia/ideia \
  --namespace ideia \
  --create-namespace \
  --set ingress.enabled=true \
  --set postgresql.enabled=true
```

### Configuração Production

```yaml
# values.yaml
replicaCount: 3

image:
  repository: ghcr.io/ideia/ideia
  tag: latest

ingress:
  enabled: true
  hostname: ideia.meudominio.com
  tls: true

postgresql:
  enabled: true
  auth:
    password: "senha-segura"

nats:
  enabled: true
  jetstream: true

persistence:
  enabled: true
  size: 50Gi
```

```bash
helm upgrade --install ideia ideia/ideia -f values.yaml
```

---

## Deploy via CLI

```bash
# Deploy para ambiente específico
ideia deploy staging
ideia deploy production

# Deploy canário (10% → 50% → 100%)
ideia canary start
ideia canary promote
ideia canary rollback

# Status do deploy
ideia status deploy

# Rollback
ideia rollback
```

---

## GitOps

```bash
# Sincronizar manifesto GitOps
ideia gitops sync

# Detectar drift
ideia gitops drift

# Auto-sync contínuo
ideia gitops auto-sync
```

---

## CI/CD Pipelines

O CI/CD é gerenciado via GitHub Actions:

```bash
# Verificar workflows
ideia workflow list

# Executar workflow manualmente
ideia workflow run deploy-production
```

Workflows disponíveis:

| Workflow | Trigger | Ação |
|----------|---------|------|
| `ci.yml` | push/PR | lint, typecheck, testes, build |
| `cd.yml` | push main | Docker build + deploy staging/production |
| `release.yml` | tag v* | GitHub Release + npm publish |
| `security.yml` | push/semanal | CodeQL, audit, compliance |
| `canary.yml` | manual | Canary deployment |

---

## Ambientes

| Ambiente | URL | Quality Gates |
|----------|-----|---------------|
| Development | `dev.ideia.local` | lint, test, build |
| Staging | `staging.ideia.dev` | lint, test, build, security |
| Production | `ideia.meudominio.com` | lint, test, build, security, architecture |

---

## Troubleshooting

| Problema | Solução |
|----------|---------|
| Porta 3000 ocupada | `ideia start --port 3001` |
| Docker sem GPU | Remover `--gpus` do comando run |
| NATS não conecta | Verificar `docker compose ps` |
| Build desktop falha | `npm run build:desktop -- --verbose` |
| Helm timeout | `helm upgrade --timeout 10m` |

---

> **Próximo:** [FAQ](FAQ.md) — Perguntas frequentes sobre deploy e operação.
