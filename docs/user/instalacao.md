# Guia de Instalação

## Requisitos Mínimos

- **Sistema:** Windows 10+, macOS 12+, Linux (glibc 2.28+)
- **Disco:** 500 MB (IDE) + 2 GB (dependências de desenvolvimento)
- **RAM:** 4 GB (8 GB recomendado)
- **Node.js:** 20.x LTS
- **npm:** 9+ ou yarn 1.22+
- **Git:** 2.30+
- **Opcional:** [Ollama](https://ollama.ai) para LLM local

## Instalação via Instalador (Recomendado)

### Windows

1. Baixe `IDEIA-Setup-x.y.z.exe` da [página de releases](https://github.com/anomalyco/ideia/releases)
2. Execute o instalador e siga as instruções
3. Após instalar, inicie a IDEIA pelo menu Iniciar

### macOS

```bash
# Download do .dmg
curl -LO https://github.com/anomalyco/ideia/releases/download/v1.0.0/IDEIA-x.y.z.dmg

# Montar e copiar para Applications
hdiutil attach IDEIA-x.y.z.dmg
cp -R /Volumes/IDEIA/IDEIA.app /Applications/
hdiutil detach /Volumes/IDEIA
```

### Linux

```bash
# AppImage
chmod +x IDEIA-x.y.z.AppImage
./IDEIA-x.y.z.AppImage

# Ou via .deb
sudo dpkg -i ideia_x.y.z_amd64.deb
```

## Instalação via CLI (npm)

```bash
# Instalação global
npm install -g @ideia/cli

# Verificar instalação
ideia --version

# Iniciar primeiro projeto
ideia init meu-projeto
cd meu-projeto
ideia start
```

## Instalação via Docker

```bash
docker pull ghcr.io/anomalyco/ideia:latest

# Executar com volume para código
docker run -it -p 3000:3000 -v $(pwd):/workspace ghcr.io/anomalyco/ideia:latest
```

## Configuração Pós-Instalação

### LLM Provider

A IDEIA suporta 3 provedores de LLM:

```bash
# Ollama (recomendado para desenvolvimento local)
ideia config set llm.provider ollama
ideia config set llm.model llama3

# OpenAI
ideia config set llm.provider openai
ideia config set llm.api-key sk-...  # Ou via env: OPENAI_API_KEY

# DeepSeek
ideia config set llm.provider deepseek
ideia config set llm.api-key sk-...
```

### Configuração de Rede (Proxy)

```bash
ideia config set network.proxy http://proxy:8080
ideia config set network.ca-cert /path/to/ca.pem
```

## Verificação

```bash
# Diagnóstico completo
ideia doctor

# Exemplo de saída esperada:
# ✓ Node.js 20.x
# ✓ npm 9.x
# ✓ Git 2.30+
# ✓ Ollama running (http://localhost:11434)
# ✓ TypeScript 5.x
# ✓ Disk space OK (12 GB free)
```

## Troubleshooting

Consulte o [Guia de Troubleshooting](troubleshooting.md) para problemas comuns:

- **Erro "node-gyp rebuild failed"**: Instale Python 3.x + build-essential (Linux) ou MSVC (Windows)
- **Porta 3000 ocupada**: `ideia config set server.port 3001`
- **Ollama não encontrado**: Verifique se o serviço está rodando (`ollama serve`)
- **Erro de permissão no Linux**: `sudo apt-get install libwebkit2gtk-4.0-dev`
