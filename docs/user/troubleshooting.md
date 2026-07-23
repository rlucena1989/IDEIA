# Troubleshooting — IDEIA

## Problemas Comuns

### IDEIA não inicia

**Sintoma:** `ideia start` falha ou o processo morre logo após iniciar.

**Soluções:**
1. Verifique a versão do Node: `node --version` (requer 20.x)
2. Limpe o cache: `ideia cache clean` ou `rm -rf node_modules/.cache`
3. Verifique portas: `netstat -ano | findstr :3000` (Windows) ou `lsof -i :3000` (Linux/Mac)
4. Logs: `ideia start --verbose`

### Conexão LLM falha

**Sintoma:** "Provedor LLM indisponível" no chat.

**Soluções:**
1. Verifique se o servidor Ollama está rodando: `ollama list`
2. Configure o provedor: `ideia config set llm.provider openai`
3. Verifique a URL base: `ideia config get llm.baseUrl`
4. Teste a conexão: `curl http://localhost:11434/api/tags`

### NATS não conecta

**Sintoma:** Eventos não são processados, erros de conexão NATS.

**Soluções:**
1. Inicie o NATS: `cd docker/nats && docker-compose up -d`
2. Verifique se o Docker está rodando: `docker ps`
3. Porta padrão: 4222
4. Logs: `docker logs ideia-nats`

### Compilação falha

**Sintoma:** `tsc -b` ou `npm run build` retorna erros.

**Soluções:**
1. Limpe builds anteriores: `npm run clean`
2. Reinstale dependências: `npm install`
3. Verifique conflitos de tipo: `tsc --noEmit`
4. Verifique o Node version: `node --version` (deve ser 20.x)

### Testes falham

**Sintoma:** `npm run test:unit` tem falhas.

**Soluções:**
1. Verifique se NATS está rodando (alguns testes de integração dependem)
2. Rode testes específicos: `npx jest --testPathPattern=nome-do-teste`
3. Limpe cache do Jest: `npx jest --clearCache`
4. Verifique timeouts: alguns testes podem precisar de `--testTimeout=30000`

### Porta já em uso

**Sintoma:** `EADDRINUSE` ou "port already in use".

**Solução:**
```bash
# Encontrar processo na porta
netstat -ano | findstr :3000    # Windows
lsof -i :3000                    # Linux/Mac

# Matar processo
kill -9 <PID>                    # Linux/Mac
taskkill /PID <PID> /F           # Windows
```

### Performance lenta

**Sintoma:** IDEIA responde devagar, latency alta.

**Soluções:**
1. Verifique memória: `node scripts/memory-profile.js`
2. Rode benchmarks: `node packages/cli/benchmarks/run-benchmarks.js`
3. Verifique cache hit ratio: `GET /metrics` (métrica `cache_hit_ratio`)
4. Ajuste limites: `ideia config set llm.maxTokens 4096`

### Erro de permissão

**Sintoma:** `EACCES` ou "permission denied".

**Soluções:**
1. Linux/Mac: `sudo chown -R $(whoami) ~/.ideia`
2. Windows: Execute o terminal como administrador
3. Verifique permissões de escrita no diretório do projeto

## Logs

```bash
# Logs da aplicação
~/.ideia/logs/
~/.ideia/logs/error.log

# Logs do NATS (Docker)
docker logs ideia-nats

# Modo verbose
ideia start --verbose
```

## Suporte

- Issues: https://github.com/anomalyco/ideia/issues
- Documentação: https://ideia.dev/docs
- Discord: https://discord.gg/ideia
