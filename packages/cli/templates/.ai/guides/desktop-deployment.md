# Desktop Deployment Guide — IDEIA

> **Guia específico para deploy local da IDEIA Desktop**
> Versão: 1.0 | Atualizado em: 2026-07-22

## Overview

Brief description of IDEIA Desktop (Electron-based), its architecture, and deployment options.

## Prerequisites

### System Requirements
- **OS**: Windows 10+ (x64), macOS 12+ (arm64/x64), Linux (Ubuntu 20.04+, x64)
- **RAM**: 4GB minimum, 8GB recommended
- **Disk**: 2GB free for application, 10GB+ for projects
- **Node.js**: 20.x LTS
- **Git**: 2.x+
- **Docker** (optional): for container-based development

### Software Dependencies
- Node.js 20+ with npm
- Git
- Docker Desktop (optional, for local services)
- VS Code or Theia IDE (optional, for plugin development)

## Installation

### From Release (Recommended)
```bash
# Download the latest installer from releases
# Windows: IDEIA-Setup-{version}.exe
# macOS: IDEIA-{version}.dmg
# Linux: IDEIA-{version}.AppImage

# Run the installer and follow the wizard
```

### From Source
```bash
git clone https://github.com/anomalyco/ideia.git
cd ideia
npm install
npm run build
npm run start:desktop
```

### Via Package Manager
```bash
# Windows (winget)
winget install IDEIA

# macOS (brew)
brew install ideia

# Linux (snap)
snap install ideia
```

## Configuration

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `IDEIA_HOME` | Data directory | `~/.ideia/` |
| `EVENT_BUS_TYPE` | Backend type | `auto` |
| `LLM_PROVIDER` | AI provider | `ollama` |
| `LOG_LEVEL` | Log verbosity | `info` |

### LLM Provider Setup
```bash
# Ollama (local, recommended)
ollama pull llama3.2
ideia config set llm.provider ollama

# OpenAI
ideia config set llm.provider openai
ideia config set llm.openai.api_key your-key-here

# DeepSeek
ideia config set llm.provider deepseek
ideia config set llm.deepseek.api_key your-key-here
```

## Running Locally

### Development Mode
```bash
npm run start:desktop:dev    # With hot reload
npm run start:desktop:debug  # With DevTools
```

### Production Mode
```bash
npm run start:desktop        # Normal launch
npm run start:desktop:no-sandbox  # If sandbox issues
```

### CLI Mode (Headless)
```bash
ideia --headless             # No GUI, CLI only
ideia shell                  # Interactive CLI shell
```

## Building for Distribution

### Build Scripts
```bash
# All platforms
npm run build:desktop

# Specific platform
npm run build:desktop:win    # Windows NSIS installer
npm run build:desktop:mac    # macOS DMG
npm run build:desktop:linux  # Linux AppImage
```

### Build Configuration
Check `electron/builder.yml` for:
- App ID, name, description
- Publishing targets
- Code signing settings
- File inclusions/exclusions

### Installer Types
| Platform | Format | Builder |
|----------|--------|---------|
| Windows | NSIS (.exe) | electron-builder |
| macOS | DMG (.dmg) | electron-builder |
| Linux | AppImage | electron-builder |

## Troubleshooting

### App Won't Start
1. Check Node.js version: `node --version` (needs 20.x)
2. Check logs: `cat ~/.ideia/logs/error.log`
3. Verify dependencies: `npm ls --depth=0`
4. Try clean install: `npm ci && npm run build`

### Electron GPU Issues
```bash
# Disable GPU acceleration
npm run start:desktop -- --disable-gpu

# Use software rendering
export ELECTRON_USE_SOFTWARE_GL=1
npm run start:desktop
```

### Auto-Update Fails
- Check internet connectivity
- Verify update URL in `electron/builder.yml`
- Manual: download from releases page
- Disable auto-update: `ideia config set updates.enabled false`

### Sandbox Errors (Linux)
```bash
# Option 1: Enable user namespace cloning
sudo sysctl -w kernel.unprivileged_userns_clone=1

# Option 2: Run without sandbox
npm run start:desktop:no-sandbox
```

## Production Deployment Checklist

- [ ] LLM provider configured and tested
- [ ] Environment variables set
- [ ] Auto-updater configured
- [ ] Error reporting enabled
- [ ] Telemetry configured (opt-in)
- [ ] Backups configured
- [ ] Performance monitoring active
- [ ] SSL certificates valid

## Example: Full Stack App Deployment

### Step-by-step for a Node.js + React app
1. Configure project: `ideia init my-app`
2. Generate code: `ideia generate`
3. Build: `npm run build`
4. Test: `ideia test`
5. Deploy locally: `ideia deploy`
6. Verify: `curl http://localhost:3000/health`

### Docker Compose Setup
```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: myapp
```

## Related Resources

- Zero-to-Deploy Workflow: `.ai/workflows/zero-to-deploy.md`
- Docker setup: `docker/`
- Environment snapshots: `ideia env --help`
- Monitoring: `ideia monitor --help`
- Rollback: `ideia deploy rollback --help`
