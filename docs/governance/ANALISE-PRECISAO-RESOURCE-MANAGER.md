# Análise de Precisão — Camadas de Gerenciamento de Recursos

> **Data:** 2026-07-23
> **Versão:** 1.0
> **Propósito:** Auditoria crítica das implementações de resource-manager, scripts de proteção e estudo de otimização. Identificação de gaps, falsos positivos/negativos, riscos de estabilidade e correções necessárias.
> **Base:** `@ideia/resource-manager`, `scripts/*.ps1`, `ESTUDO-OTIMIZACAO-DESENVOLVIMENTO-RECURSOS.md`

---

## Sumário

1. [Gaps Críticos (Devem Ser Corrigidos)](#1-gaps-críticos)
2. [Gaps de Precisão (Falsos Positivos/Negativos)](#2-gaps-de-precisão)
3. [Riscos de Estabilidade (Podem Quebrar o Sistema)](#3-riscos-de-estabilidade)
4. [Gaps Arquiteturais](#4-gaps-arquiteturais)
5. [Plano de Correção Priorizado](#5-plano-de-correção)

---

## 1. Gaps Críticos

### G1 — CPU Measurement Broken no Windows

**Problema:** `os.loadavg()` no Windows retorna `[0, 0, 0]` sempre. É uma API Unix-only. O cálculo `cpu.percentEstimate` será sempre 0, tornando toda degradação baseada em CPU inoperante no Windows.

```typescript
// monitor.ts — linha 37
percentEstimate: Math.round(((cpuLoad[0] ?? 0) / cores) * 100),
// Resultado no Windows: 0% sempre
```

**Impacto:** ✅ Falso negativo permanente — CPU nunca é detectada como alta. Degradação automática por CPU jamais ocorre. Todas as proteções contra CPU-bound (tsc, Jest, ESLint) são cegas no Windows.

**Correção:** No Windows, usar `wmic cpu get loadpercentage` ou `Get-CimInstance Win32_Processor | Select-Object -ExpandProperty LoadPercentage` como fallback.

### G2 — Memory Leak Detection Confunde Alocação Normal com Vazamento

**Problema:** Regressão linear sobre `processHeapUsedMB` não distingue entre:
- **Step function:** Alocação legítima única (carregar módulo, iniciar test suite) — sobe e estabiliza
- **Rampa contínua:** Vazamento real — cresce sem estabilizar

```typescript
// monitor.ts — linhas 70-83
const times = recent.map(s => (s.timestamp - recent[0]!.timestamp) / 1000 / 60);
const heapValues = recent.map(s => s.memory.processHeapUsedMB);
// Regressão linear simples — não detecta step functions
```

**Cenário de falso positivo:** Ao rodar `jest --selectProjects`, o heap sobe 200MB em 10s e estabiliza. O monitor vê slope de ~1200MB/min e dispara alarme de vazamento. Na verdade é alocação normal.

**Cenário de falso negativo:** Um vazamento lento de 0.5MB/min por 30 minutos (30MB total) nunca é detectado porque `leakRateMBperMin > 1` é o threshold.

**Correção:** Detecção em dois estágios:
1. Detectar step function: variança dos resíduos da regressão vs. diferença primeiro-último
2. Detectar rampa: dividir amostras em duas metades, comparar slopes

### G3 — SelfHealer.findProcess Retorna o Próprio PID

**Problema:** `findProcess` não enumera processos do sistema real. Quando o target é "bun", retorna `process.pid` — o PID do próprio Node.js. `killProcess` então tenta `process.kill(ownPid, 'SIGTERM')` — mata o ResourceManager.

```typescript
// self-healing.ts — linhas 117-121
if (lowerName.includes('bun') || lowerName.includes('bunx')) {
  return { pid: currentPid, name: 'bun', ... };
  // ↑ currentPid = PID do ResourceManager, não do Bun!
}
```

**Impacto:** Chamar `kill_process` para "bun" ou "bunx" **mata o próprio processo do ResourceManager** — um self-DoS. Nunca mata o processo Bun real.

**Correção:** No Windows, usar `Get-Process -Name bun` via PowerShell child process. No Linux, `pgrep bun`. Ou usar `tasklist.exe` no Windows.

### G4 — SelfHealer.clearCache Pode Corromper Estado em Runtime

**Problema:** Deletar entradas de `Module._cache` para módulos não-node_modules pode causar:
- Referências pendentes (timers, callbacks, promises) para objetos cujo módulo foi removido
- Módulos parcialmente carregados que esperam estado compartilhado
- Perda de singletons e conexões (NATS, banco)

```typescript
// self-healing.ts — linhas 49-56
for (const key of keys) {
  if (key.includes('node_modules')) continue;
  delete Module._cache[key];
  cleaned.push(key);
}
```

**Impacto:** Pode causar crashes misteriosos minutos após o clear_cache. Conexões NATS são fechadas, eventos são perdidos, timers disparam em módulos órfãos.

**Correção:** `clear_cache` deve ser mais seletivo: limpar apenas caches conhecidos (require.cache de módulos carregados dinamicamente, não de módulos core do sistema). Adicionar verificação de que nenhuma referência ativa existe.

### G5 — Nenhuma Histerese em Degradation Mode

**Problema:** O modo de degradação oscila em torno dos thresholds porque não há banda morta (hysteresis). Exemplo: memória 90.1% → `limited`, próximo ciclo 89.9% → `normal`, próximo ciclo 90.2% → `limited`.

```typescript
// resource-manager.ts — linhas 220-228
if (snapshot.memory.usedPercent > 95) targetMode = 'emergency';
else if (snapshot.memory.usedPercent > 90) targetMode = 'limited';
else if (!budgetCheck.ok) targetMode = 'degraded';
// Sem banda morta — qualquer oscilação alterna modos
```

**Impacto:** Alternância rápida entre modos (thrashing) — cada transição gera eventos, audit trail entradas, e potencial confusão para processos dependentes.

**Correção:** Implementar banda morta de 5%: para voltar ao modo anterior, o recurso precisa cair 5% abaixo do threshold de ativação.

```
normal  → degraded:  mem > 80%
degraded → normal:   mem < 75%  (↓5% banda morta)
limited → degraded:  mem < 85%  (↓5% do threshold de ativação 90%)
```

---

## 2. Gaps de Precisão

### G6 — SafetyCircuit.evaluate Chamado a Cada 5s

**Problema:** `handleBudgetViolations` chama `tripSafetyCircuit` que chama `safetyCircuit.evaluate()` que por sua vez gera eventos EventBus + AuditTrail. A cada 5 segundos durante uma violação.

```typescript
// resource-manager.ts — linha 181
await this.tripSafetyCircuit(trigger);
// ↓ SafetyCircuit.evaluate gera audit trail + events toda vez
```

**Efeito:** Se a memória fica em 85% por 2 minutos, são 24 chamadas ao SafetyCircuit com 24 audit trail entries. O ruído no audit trail enterra eventos reais.

**Correção:** Só chamar `safetyCircuit.evaluate()` quando o trigger muda de estado (nova violação vs. violação continuada), não em cada ciclo.

### G7 — EventBus.emit().catch(() => {}) Esconde Falhas

**Problema:** Todos os `.catch(() => {})` em `emitEvent` silenciam erros como:
- NATS JetStream desconectado
- Fila de mensagens cheia
- Payload muito grande

```typescript
// resource-manager.ts — linhas 263-267
this.eventBus.emit({...}).catch(() => {});
```

**Efeito:** Se o EventBus falha (por exemplo, consumo excessivo de memória causa queda do NATS), o ResourceManager não detecta a perda de conectividade. O sistema de auto-preservação fica cego à sua própria degradação.

**Correção:** Logar o erro pelo menos em `debug` ou `warn`. O catch silencioso só deve ser usado em código não-crítico.

### G8 — Estimativa de CPU no Linux é para 1 minuto

**Problema:** `os.loadavg()` retorna média de 1 minuto. Durante um pico de CPU de 30s (ex: tsc compiling), o valor pode não refletir o pico real porque é suavizado pela média.

**Efeito:** Picos curtos (30-40s de tsc) podem não disparar degradação porque a média de 1 minuto dilui o pico. A proteção reage tarde demais.

**Correção:** Combinar `loadavg1m` com medição ativa: amostrar `process.cpuUsage()` em dois pontos com intervalo de 100ms, calcular delta.

### G9 — GC Só Funciona com --expose-gc

**Problema:** `globalThis.gc` é `undefined` a menos que Node.js seja iniciado com `--expose-gc` ou `--expose-gc` via NODE_OPTIONS.

```typescript
// self-healing.ts — linha 44
if (typeof globalThis.gc === 'function') {
  globalThis.gc();
}
// Sem --expose-gc: nunca executa
```

**Efeito:** No cenário mais comum (Node sem --expose-gc), `clear_cache` limpa module cache mas não força GC. A memória do V8 heap não é liberada. O pico de memória persiste.

**Correção:** Documentar necessidade de `NODE_OPTIONS=--expose-gc` ou usar `process.memoryUsage().heapUsed` para detectar se a limpeza foi eficaz, independente de GC.

### G10 — Memory Trend Ignora RSS e External

**Problema:** `analyzeMemoryTrend` usa apenas `processHeapUsedMB` para detecção de vazamento. Ignora `processRSSMB` e `processExternalMB` que também crescem em vazamentos (native bindings, wasm, segmentos de memória compartilhada).

**Efeito:** Vazamentos em módulos nativos (ex: `node-pty`, `keytar`, `drivelist`) não são detectados. O RSS pode crescer sem aumento correspondente no heap.

**Correção:** Analisar as três métricas em conjunto. Um vazamento legítimo aparece em todas. Alocação normal aparece apenas no heap.

---

## 3. Riscos de Estabilidade

### G11 — Watch Mode no CLI Cria Recursão Infinita

**Problema:** `resource status --watch` chama `resourceCommand().parse()` que cria uma nova instância do Command a cada 5s. Isso cria um novo `createResourceManager()`, que cria um novo monitor, que cria um novo intervalo, etc. Nunca limpa a instância anterior.

```typescript
// resource.ts — linhas 96-99
if (opts.watch) {
  setTimeout(() => {
    resourceCommand().parse(['resource', 'status', '--watch'], { from: 'user' });
  }, 5000);
}
```

**Efeito:** A cada 5s, um novo ResourceManager nasce, o anterior permanece rodando (setInterval nunca é limpo). Em 1 minuto: 12 instâncias, cada uma fazendo `os.loadavg()`, `process.memoryUsage()`, `os.totalmem()` a cada 5s. Auto-sobrecarga.

**Correção:** Não criar nova instância. Usar `setInterval` no mesmo Command com `resourceManager.getStatus()` repetido.

### G12 — Config --set Faz Parse Ingênuo

**Problema:** `isNaN(Number(value))` transforma "true" em `NaN` (não é número) e mantém como string `"true"`. Mas o TypeScript espera `boolean`. O cast `as Record<string, unknown>` contorna o tipo sem verificar.

```typescript
// resource.ts — linha 117
resourceManager.updateConfig({ [key]: isNaN(Number(value)) ? value : Number(value) } as Record<string, unknown>);
// "autoDegrade=false" vira string "false" (truthy), não boolean false
```

**Efeito:** `--set autoDegrade=false` não desabilita degradação porque a string `"false"` é truthy. O usuário pensa que desligou, mas o sistema continua degradando.

**Correção:** Fazer parse tipado: boolean para "true"/"false", number para números, string para o resto.

### G13 — DegradationMode Cast Sem Validação

**Problema:** `targetMode as Parameters<typeof this.degradation.setMode>[0]` faz cast para `DegradationMode` sem validar que o valor é realmente um dos membros do union type.

```typescript
// resource-manager.ts — linha 232
this.degradation.setMode(targetMode as Parameters<typeof this.degradation.setMode>[0]);
// Se targetMode não for 'normal'|'degraded'|'limited'|'emergency'|'offline', quebra em runtime
```

**Efeito:** Se alguém adicionar um modo novo ou se o cast falhar, `setMode` recebe um valor inválido. Como `DegradationManager.setMode` não valida, o sistema entra em estado inconsistente.

**Correção:** Validar o valor contra o enum antes de chamar `setMode`.

### G14 — SelfHealer Pode Ser Chamado em Loop Infinito

**Problema:** `triggerSelfHealing('clear_cache', ...)` é chamado em cada ciclo de monitoramento se a violação persiste. Cada chamada limpa cache, decrementa restarts, e recomeça.

**Efeito:** Se clear_cache reduz temporariamente a memória mas a causa raiz persiste (ex: compilação ativa), o monitor limpa cache repetidamente a cada 5s. Cada limpeza Module._cache pode fazer módulos serem re-require() com novas instâncias.

**Correção:** Só executar self-healing uma vez por tipo de ação até que o trigger mude.

---

## 4. Gaps Arquiteturais

### G15 — ResourceManager Não Se Protege

**Problema:** O ResourceManager monitora processos mas não tem proteção contra o próprio consumo. A cada 5s:
1. `os.loadavg()` → syscall
2. `os.totalmem() + os.freemem()` → syscall
3. `process.memoryUsage()` → syscall V8
4. `os.cpus().length` → syscall
5. Regressão linear sobre array de snapshots
6. EventBus.emit() possível
7. AuditTrail.append() possível

Se o monitor roda por 8h em sessão autônoma: 5760 amostras, 5760 regressões lineares, dezenas de milhares de Module._cache varreduras.

**Efeito:** O próprio ResourceManager pode consumir 1-3% de CPU constantemente em um sistema já sob pressão. A cada coleta de snapshot, faz mais syscalls que consomem CPU.

**Correção:** Amostragem adaptativa: reduzir frequência quando sistema está saudável (a cada 30s), aumentar quando detecta degradação (a cada 2s). Evitar I/O em cada ciclo.

### G16 — Nenhum Limite Real em Processos Filhos

**Problema:** A configuração `agentMemoryBudgetMB` e `agentCPUBudgetPercent` estão definidas em `types.ts` mas **nunca são lidas ou aplicadas**. Nenhum agente, worker, ou child process tem limite imposto.

```typescript
// types.ts — agenteBudget definido mas não usado em resource-manager.ts
agentMemoryBudgetMB: 512,
agentCPUBudgetPercent: 25,
```

**Efeito:** 0% de enforcement. A feature mais importante — limitar agentes individuais consumindo recursos — é declarativa, não funcional.

**Correção:** Integrar com `sandbox.ts` (que já usa `resourceLimits` no Worker) para propagar budgets. No Windows, criar Job Objects para grupos de processos.

### G17 — Degradação Não se Recupera

**Problema:** O sistema degrada (normal → degraded → limited → emergency) mas **nunca volta ao normal**. Não há lógica que detecte melhora e reverta a degradação.

```typescript
// resource-manager.ts — handleAutoDegradation — só transições para baixo
// falta: verificar se recursos melhoraram e recuperar modo normal
```

**Efeito:** Depois de um pico de CPU de 30s, o sistema fica em degraded para sempre. Funcionalidades como histórico de chat e analytics ficam desligadas permanentemente.

**Correção:** Adicionar recovery timer: se o recurso ficou abaixo do threshold por N ciclos consecutivos, sobe um nível de degradação.

### G18 — ResourceManager Monolítico (SRP Violation)

**Problema:** ResourceManager faz:
- Coleta de métricas (Monitor)
- Decisão de orquestração (policy)
- Execução de ações (enforcer)
- Integração com 4 sistemas externos (EventBus, ControlTower, SafetyCircuit, AuditTrail)
- Persistência de estado (config, histórico)
- CLI integration

```typescript
// resource-manager.ts — 321 linhas, 6 responsabilidades distintas
```

**Problema:** Coesão baixa. Se o EventBus muda, ResourceManager inteiro precisa ser alterado. Se a lógica de threshold muda, mesma coisa. Testabilidade difícil.

**Correção:** Extrair:
- `ResourceCollector` — métricas brutas do SO
- `ResourceAnalyzer` — tendências, thresholds, predições
- `ResourceOrchestrator` — decisões, timeline, coordenação
- `ResourceEnforcer` — execução de ações (kill, clear cache, reconnect)

---

## 5. Plano de Correção Priorizado

### Fase 1 — 🔴 Correções de Segurança e Estabilidade (emergencial)

| # | Gap | Correção | Esforço | Risco Atual |
|---|-----|----------|---------|-------------|
| G3 | findProcess retorna próprio PID | Usar PowerShell `Get-Process` para enumerar processos reais no Windows | 2h | **Self-DoS: resource kill -> suicídio** |
| G4 | clear_cache corrompe runtime | Limpar apenas caches conhecidos, não Module._cache inteiro | 1h | **Crash aleatório minutos após self-heal** |
| G11 | Recursão infinita no --watch | Substituir por setInterval no mesmo Command | 30min | **Memory leak exponencial no CLI** |
| G12 | Config --set parse ingênuo | Parse tipado (boolean, number, string) | 30min | **Config ignorada silenciosamente** |

### Fase 2 — 🟡 Correções de Precisão (media prioridade)

| # | Gap | Correção | Esforço | Impacto |
|---|-----|----------|---------|---------|
| G1 | CPU 0 no Windows | Fallback `wmic cpu get loadpercentage` | 4h | CPU degradation cego no Windows |
| G2 | Leak detection confunde step vs ramp | Detecção em 2 estágios (step threshold + slope) | 4h | Falsos positivos de vazamento |
| G5 | Histerese ausente | Banda morta de 5% em thresholds | 1h | Thrashing entre modos |
| G6 | SafetyCircuit chamado em excesso | Debounce: só avaliar quando trigger muda | 1h | Audit trail poluído |
| G13 | DegradationMode sem validação | Validar contra union type antes do cast | 30min | Estado inconsistente em runtime |
| G14 | Self-healing em loop | Flag `lastAction.type + timestamp` | 1h | Cache limpo repetidamente |

### Fase 3 — 🟢 Correções Arquiteturais (melhoria contínua)

| # | Gap | Correção | Esforço | Impacto |
|---|-----|----------|---------|---------|
| G15 | Consumo próprio do monitor | Amostragem adaptativa (30s normal, 2s degradado) | 3h | 3% CPU extra em sistema crítico |
| G16 | Budget de agente não aplicado | Integrar com sandbox.ts + Worker resourceLimits | 8h | 0% enforcement de budgets |
| G17 | Degradação nunca recupera | Recovery timer (N ciclos abaixo do threshold) | 2h | Sistema fica degradado permanentemente |
| G18 | Monolítico SRP | Extrair 4 classes (Collector, Analyzer, Orchestrator, Enforcer) | 8h | Baixa coesão, difícil de testar |
| G7 | catch(()=>{}) esconde erros | Logar fallhas de emit em debug/warn | 30min | Cegueira para perda de conectividade |
| G10 | Ignora RSS/external | Analisar 3 métricas em conjunto | 2h | Falso negativo em vazamento de native addon |

---

## Resumo de Scores

| Dimensão | Score | Status |
|----------|-------|--------|
| **Segurança (não mata o sistema)** | 4/10 🔴 | G3, G4 podem causar self-DoS |
| **Precisão (sem falsos)** | 5/10 🟡 | G1, G2 geram falsos negativos/positivos |
| **Estabilidade (sem thrashing)** | 4/10 🔴 | G5, G11, G14 causam oscilação ou crescimento |
| **Integridade (config respeitada)** | 3/10 🔴 | G12, G13 permitem estado inconsistente |
| **Cobertura (protege o que promete)** | 2/10 🔴 | G16: budgets declarados mas não aplicados |
| **Observabilidade (auditável)** | 6/10 🟡 | G6, G7 enterram eventos reais |
| **Manutenibilidade (SRP)** | 3/10 🔴 | G18: classe monolítica, 6 responsabilidades |

> **Nota final:** O sistema implementado funciona para o caso trivial (pico único de recurso), mas tem riscos de auto-DoS (G3, G4), falso diagnóstico no Windows (G1), e não se recupera sozinho (G17). A Fase 1 de correções é obrigatória antes de usar em produção autônoma.
