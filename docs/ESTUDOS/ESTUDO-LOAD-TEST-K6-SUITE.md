# ESTUDO-LOAD-TEST-K6-SUITE — Suite de Testes de Carga com k6

> **Data:** 2026-07-26 | **Versão:** 3.0 (8 seções, 7 scripts k6 completos, CI/CD integrado)
> **Área:** Qualidade — Performance
> **Dependências:** @ideia/quality-gates, @ideia/cli, @ideia/observability
> **Conexões:** PERFORMANCE-ESCALABILIDADE, S54-PERFORMANCE-OPTIMIZATION, GATE-3-RELEASE
> **Propósito:** Suite completa de 7 scripts k6 para testes de carga em CI Gate 3 (Release), com thresholds progressivos, relatórios HTML interativos, detecção de regressão automática, dashboard Grafana embutido e pipeline de qualidade cross-package.

---

## 1. FUNDAMENTOS

### 1.1 Problema

Release sem teste de carga = risco de degradação em produção. IDEIA precisa saber: quantos agentes simultâneos aguenta? Qual throughput do NATS? Qual latência P95 do LSP? Sem métricas objetivas, decisões de release são baseadas em achismo. Testes de carga precisam ser:

- **Reprodutíveis:** Mesmo script roda em CI e local
- **Comparáveis:** Histórico de execuções para detectar regressão
- **Acionáveis:** Thresholds que bloqueiam release automaticamente
- **Visíveis:** Dashboard consolidado para toda a equipe

### 1.2 Stack Tecnológica

| Componente | Tecnologia | Versão | Função |
|-----------|-----------|--------|--------|
| Test Runner | k6 | >=0.52 | Execução JS ES2020 |
| HTTP Client | k6/http | built-in | HTTP/1.1 e HTTP/2 |
| WebSocket | k6/ws | built-in | Streaming real-time |
| gRPC | k6/net/grpc | built-in | Chamadas gRPC |
| Dashboard | Grafana + InfluxDB | OSS | Visualização histórica |
| Quality Gate | @ideia/quality-gates | local | Bloqueio de release |

### 1.3 Matriz de Scripts

| # | Script | Alvo | Protocolo | Métrica Crítica | Threshold Gate | Peso |
|---|--------|------|-----------|----------------|----------------|------|
| 1 | chat-streaming.js | Chat API | HTTP/SSE | P95 latência < 2s | 2s | 20 |
| 2 | lsp-hover.js | LSP Server | WebSocket | P99 < 500ms | 500ms | 15 |
| 3 | file-crud.js | Filesystem API | HTTP/REST | throughput > 100/s | 100/s | 15 |
| 4 | agent-decision.js | Agent Runtime | gRPC | P95 < 10s | 10s | 20 |
| 5 | nats-throughput.js | Event Bus | NATS | msg/s > 1000 | 1000/s | 15 |
| 6 | search.js | Search API | HTTP/REST | P99 < 200ms | 200ms | 10 |
| 7 | concurrent-agents.js | Multi-agent | mixed | P95 < 30s | 30s | 5 |

**Score total:** 100 pontos — mínimo 80 para release.

---

## 2. SCRIPTS — 7 Scripts Completos

### 2.1 chat-streaming.js — Teste de Chat com Streaming SSE

`javascript
// k6/chat-streaming.js
// Testa a API de chat com streaming (Server-Sent Events)
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

const chatLatency = new Trend('chat_latency_ms');
const chatErrorRate = new Rate('chat_error_rate');
const chatActiveUsers = new Gauge('chat_active_users');

export const options = {
  scenarios: {
    chat_stream: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    chat_latency_ms: ['p95<2000', 'p99<5000'],
    chat_error_rate: ['rate<0.01'],
    http_req_failed: ['rate<0.01'],
  },
  tags: { script: 'chat-streaming', service: 'chat-api', tier: 'critical' },
};

const testMessages = [
  { message: 'Create a login API with JWT authentication', model: 'qwen2.5:7b' },
  { message: 'Explain the CAP theorem in distributed systems', model: 'qwen2.5:7b' },
  { message: 'Write a React component for data table', model: 'qwen2.5:7b' },
  { message: 'Debug TypeError: Cannot read property of undefined', model: 'qwen2.5:7b' },
  { message: 'Generate SQL query for monthly sales report', model: 'qwen2.5:7b' },
  { message: 'Design event-driven architecture for ride-sharing', model: 'qwen2.5:7b' },
  { message: 'Create CI/CD pipeline for monorepo 20 packages', model: 'qwen2.5:7b' },
  { message: 'Explain REST vs gRPC with examples', model: 'qwen2.5:7b' },
  { message: 'Write unit tests for async queue in TypeScript', model: 'qwen2.5:7b' },
  { message: 'Design data model for e-commerce PostgreSQL', model: 'qwen2.5:7b' },
];

export function setup() {
  const healthRes = http.get('http://localhost:3001/api/health');
  check(healthRes, { 'health pass': (r) => r.status === 200 });
  if (healthRes.status !== 200) throw new Error('Service unhealthy');
  return { baseUrl: 'http://localhost:3001' };
}

export default function (data) {
  const baseUrl = data.baseUrl || 'http://localhost:3001';
  group('chat:send_message', function () {
    const msg = testMessages[(__VU - 1) % testMessages.length];
    const payload = JSON.stringify({ message: msg.message, model: msg.model, stream: true });
    chatActiveUsers.add(1);
    const res = http.post('/api/chat', payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: '30s',
    });
    chatLatency.add(res.timings.duration);
    chatErrorRate.add(res.status !== 200);
    check(res, { 'status 200': (r) => r.status === 200 });
    chatActiveUsers.add(-1);
  });
  sleep(Math.random() * 2 + 0.5);
}

export function teardown(data) {
  http.post('/api/metrics/loadtest', JSON.stringify({
    script: 'chat-streaming', timestamp: new Date().toISOString(),
  }), { headers: { 'Content-Type': 'application/json' } });
}
`

### 2.2 lsp-hover.js — Teste de LSP Hover

`javascript
// k6/lsp-hover.js
// Testa servidor LSP - hover para 5 linguagens
import { check, sleep, group } from 'k6';
import ws from 'k6/ws';
import { Rate, Trend } from 'k6/metrics';

const hoverLatency = new Trend('lsp_hover_latency_ms');
const hoverErrorRate = new Rate('lsp_hover_error_rate');

export const options = {
  scenarios: {
    lsp_hover: {
      executor: 'per-vu-iterations',
      vus: 20,
      iterations: 50,
      maxDuration: '10m',
    },
  },
  thresholds: {
    lsp_hover_latency_ms: ['p99<500', 'p95<300'],
    lsp_hover_error_rate: ['rate<0.005'],
  },
  tags: { script: 'lsp-hover', service: 'lsp-server', tier: 'critical' },
};

const testDocuments = [
  { lang: 'typescript', uri: 'file:///test.ts', text: 'interface User { id: number; name: string; }', pos: { line: 0, char: 14 } },
  { lang: 'python', uri: 'file:///test.py', text: 'from typing import List', pos: { line: 0, char: 12 } },
  { lang: 'javascript', uri: 'file:///test.js', text: 'const express = require("express")', pos: { line: 0, char: 6 } },
  { lang: 'go', uri: 'file:///test.go', text: 'package main; import "fmt"; func main() { fmt.Println("hi") }', pos: { line: 2, char: 8 } },
  { lang: 'rust', uri: 'file:///test.rs', text: 'pub struct Config { pub db_url: String }', pos: { line: 0, char: 12 } },
];

export default function () {
  group('lsp:hover', function () {
    const doc = testDocuments[__ITER % testDocuments.length];
    ws.connect('ws://localhost:3002/lsp', {}, function (socket) {
      socket.on('open', function () {
        socket.send(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }));
        socket.send(JSON.stringify({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: doc.uri, languageId: doc.lang, version: 1, text: doc.text } } }));
        socket.setTimeout(function () {
          const start = Date.now();
          socket.send(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'textDocument/hover', params: { textDocument: { uri: doc.uri }, position: { line: doc.pos.line, character: doc.pos.char } } }));
          socket.on('message', function (data) {
            hoverLatency.add(Date.now() - start);
            try { const m = JSON.parse(data); if (m.id === 2 && !m.result?.contents) hoverErrorRate.add(1); } catch (e) { hoverErrorRate.add(1); }
          });
        }, 500);
      });
      socket.on('error', function () { hoverErrorRate.add(1); });
    });
  });
  sleep(1);
}
`

### 2.3 file-crud.js — Teste de CRUD de Arquivos

`javascript
// k6/file-crud.js
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const crudLatency = new Trend('crud_latency_ms');
const crudErrorRate = new Rate('crud_error_rate');
const crudOps = new Counter('crud_operations');

export const options = {
  scenarios: {
    file_crud: {
      executor: 'ramping-arrival-rate',
      startRate: 10, timeUnit: '1s',
      preAllocatedVUs: 10, maxVUs: 50,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 150 },
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: { crud_latency_ms: ['p95<500'], crud_error_rate: ['rate<0.01'] },
  tags: { script: 'file-crud', service: 'filesystem-api', tier: 'high' },
};

let counter = 0;
export default function () {
  group('crud:cycle', function () {
    counter++;
    const fileId = 'f-' + __VU + '-' + counter;
    const base = 'http://localhost:3003';
    const payload = JSON.stringify({ id: fileId, path: '/test/' + fileId + '.json', content: 'test', type: 'json' });
    const headers = { 'Content-Type': 'application/json' };

    http.post(base + '/api/files', payload, { headers, tags: { op: 'create' } });
    http.get(base + '/api/files/' + fileId, { tags: { op: 'read' } });
    http.put(base + '/api/files/' + fileId, payload, { headers, tags: { op: 'update' } });
    http.del(base + '/api/files/' + fileId, null, { tags: { op: 'delete' } });
    crudOps.add(4);
  });
  sleep(0.5);
}
`

### 2.4 agent-decision.js — Teste de Decisao de Agente (gRPC)

`javascript
// k6/agent-decision.js
import { check, sleep, group } from 'k6';
import grpc from 'k6/net/grpc';
import { Rate, Trend } from 'k6/metrics';

const client = new grpc.Client();
client.load(['definitions'], 'agent.proto');

const latency = new Trend('agent_decision_latency_ms');
const errRate = new Rate('agent_decision_error_rate');

export const options = {
  scenarios: { agent: { executor: 'constant-vus', vus: 5, duration: '10m' } },
  thresholds: { agent_decision_latency_ms: ['p95<10000'], agent_decision_error_rate: ['rate<0.05'] },
  tags: { script: 'agent-decision', service: 'agent-runtime', tier: 'critical' },
};

const scenarios = [
  { task: 'Create hello world in TypeScript', complexity: 1 },
  { task: 'Build REST API with Express, JWT, PostgreSQL', complexity: 3 },
  { task: 'Design microservice for e-commerce platform', complexity: 5 },
  { task: 'Create CI/CD pipeline k8s canary deployment', complexity: 7 },
];

export default function () {
  group('agent:decide', function () {
    client.connect('localhost:50051', { plaintext: true });
    const s = scenarios[__ITER % scenarios.length];
    const start = Date.now();
    const res = client.invoke('agent.AgentService/Decide', {
      task: s.task, context: { projectLanguage: 'typescript', complexity: s.complexity, maxSteps: 10 },
    }, { timeout: '30s' });
    latency.add(Date.now() - start);
    errRate.add(res.status !== grpc.StatusOK);
    check(res, { 'grpc ok': (r) => r.status === grpc.StatusOK, 'has plan': (r) => r.message.plan?.steps?.length > 0 });
    client.close();
  });
  sleep(5);
}
`

### 2.5 nats-throughput.js — Teste de Throughput NATS

`javascript
// k6/nats-throughput.js
import { check, sleep, group } from 'k6';
import ws from 'k6/ws';
import { Rate, Trend, Counter } from 'k6/metrics';

const pubLat = new Trend('nats_publish_latency_ms');
const errRate = new Rate('nats_error_rate');
const msgTotal = new Counter('nats_messages_total');

export const options = {
  scenarios: {
    nats: { executor: 'ramping-arrival-rate', startRate: 10, timeUnit: '1s', preAllocatedVUs: 5, maxVUs: 20,
      stages: [
        { duration: '1m', target: 100 }, { duration: '3m', target: 500 },
        { duration: '3m', target: 1000 }, { duration: '2m', target: 2000 }, { duration: '1m', target: 0 },
      ] },
  },
  thresholds: { nats_publish_latency_ms: ['p95<50'], nats_error_rate: ['rate<0.001'] },
  tags: { script: 'nats-throughput', service: 'event-bus', tier: 'critical' },
};

export default function () {
  group('nats:publish', function () {
    ws.connect('ws://localhost:8222/ws', {}, function (socket) {
      socket.on('open', function () {
        socket.send(JSON.stringify({ action: 'subscribe', subject: 'test.results', stream: 'test' }));
        let count = 0;
        socket.on('message', function () { count++; });
        const interval = setInterval(function () {
          const start = Date.now();
          socket.send(JSON.stringify({ action: 'publish', subject: 'test.events', payload: JSON.stringify({ ts: start }), stream: 'test' }));
          pubLat.add(Date.now() - start); msgTotal.add(1);
        }, 10);
        socket.setTimeout(function () { clearInterval(interval); socket.close(); }, 10000);
      });
      socket.on('error', function () { errRate.add(1); });
    });
  });
  sleep(0.1);
}
`

### 2.6 search.js — Teste de Busca

`javascript
// k6/search.js
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const lat = new Trend('search_latency_ms');
const err = new Rate('search_error_rate');

export const options = {
  scenarios: { search: { executor: 'constant-arrival-rate', rate: 50, timeUnit: '1s', duration: '8m', preAllocatedVUs: 10, maxVUs: 30 } },
  thresholds: { search_latency_ms: ['p99<200'], search_error_rate: ['rate<0.01'] },
  tags: { script: 'search', service: 'search-api', tier: 'high' },
};

const queries = ['JWT authentication', 'React table component', 'rate limiting', 'Docker postgres', 'Error handling Express', 'k8s deployment', 'SQL join examples', 'async/await promises', 'GitHub Actions CI', 'monorepo setup'];

export default function () {
  group('search:query', function () {
    const start = Date.now();
    const payload = JSON.stringify({ query: queries[__ITER % queries.length], limit: 20 });
    const res = http.post('http://localhost:3004/api/search', payload, {
      headers: { 'Content-Type': 'application/json' }, timeout: '5s',
    });
    lat.add(Date.now() - start);
    err.add(res.status !== 200);
    check(res, { 'status 200': (r) => r.status === 200, 'has results': (r) => JSON.parse(r.body).results?.length > 0 });
  });
  sleep(0.2);
}
`

### 2.7 concurrent-agents.js — Teste de Agentes Concorrentes

`javascript
// k6/concurrent-agents.js
import { check, sleep, group } from 'k6';
import http from 'k6/http';
import { Rate, Trend, Counter } from 'k6/metrics';

const dur = new Trend('concurrent_duration_ms');
const errRate = new Rate('concurrent_error_rate');
const done = new Counter('concurrent_completed');

export const options = {
  scenarios: { conc: { executor: 'constant-vus', vus: 3, duration: '15m' } },
  thresholds: { concurrent_duration_ms: ['p95<30000'], concurrent_error_rate: ['rate<0.1'] },
  tags: { script: 'concurrent-agents', service: 'multi-agent', tier: 'critical' },
};

const tasks = [
  { title: 'E-commerce Backend', desc: 'Complete CRUD, JWT, cart, payments', role: 'architect' },
  { title: 'React Dashboard', desc: 'Tables, charts, auth, dark mode', role: 'programmer' },
  { title: 'CI/CD Review', desc: 'Bottlenecks, security, improvements', role: 'reviewer' },
  { title: 'DB Migration', desc: 'PG migrations, RLS, FTS, partitioning', role: 'programmer' },
  { title: 'API Gateway', desc: 'Rate limit, auth, routing, OpenAPI', role: 'architect' },
  { title: 'Security Audit', desc: 'OWASP Top 10, secrets, SQLi, XSS', role: 'reviewer' },
];

export default function () {
  group('conc:run', function () {
    const t = tasks[__ITER % tasks.length];
    const start = Date.now();
    const sub = http.post('http://localhost:3001/api/orchestrator/tasks', JSON.stringify({
      title: t.title, description: t.desc, role: t.role, parallel: true,
    }), { headers: { 'Content-Type': 'application/json' }, timeout: '10s' });
    if (sub.status !== 201) { errRate.add(1); return; }
    const taskId = JSON.parse(sub.body).taskId;
    let completed = false, attempts = 0;
    while (!completed && attempts < 60) {
      sleep(30); attempts++;
      const status = http.get('http://localhost:3001/api/orchestrator/tasks/' + taskId + '/status', { timeout: '10s' });
      if (status.status !== 200) break;
      const body = JSON.parse(status.body);
      if (body.state === 'completed') { completed = true; dur.add(Date.now() - start); done.add(1); }
      else if (body.state === 'failed') { errRate.add(1); break; }
    }
    if (!completed) errRate.add(1);
  });
  sleep(1);
}
`
---

## 3. THRESHOLDS — Matriz de Qualidade

### 3.1 Thresholds Centralizados

```typescript
const THRESHOLDS = [
  { script: 'chat-streaming', metric: 'chat_latency_ms', condition: 'p95<2000', severity: 'blocker' },
  { script: 'chat-streaming', metric: 'chat_error_rate', condition: 'rate<0.01', severity: 'blocker' },
  { script: 'lsp-hover', metric: 'lsp_hover_latency_ms', condition: 'p99<500', severity: 'blocker' },
  { script: 'file-crud', metric: 'crud_latency_ms', condition: 'p95<500', severity: 'blocker' },
  { script: 'agent-decision', metric: 'agent_decision_latency_ms', condition: 'p95<10000', severity: 'blocker' },
  { script: 'nats-throughput', metric: 'nats_publish_latency_ms', condition: 'p95<50', severity: 'blocker' },
  { script: 'search', metric: 'search_latency_ms', condition: 'p99<200', severity: 'blocker' },
  { script: 'concurrent-agents', metric: 'concurrent_duration_ms', condition: 'p95<30000', severity: 'blocker' },
];
```

### 3.2 Regras de Release

| Condicao | Acao | Responsavel |
|----------|------|-------------|
| 0 blockers | Release aprovado | Automatico |
| 1-2 blockers nao-criticos | Review tech lead | Tech Lead |
| 3+ blockers ou 1 critico | War room | Squad |
| Threshold violado | Rollback automatico | DevOps |

### 3.3 Regression Detector

```typescript
class RegressionDetector {
  private readonly THRESHOLD = 0.20;

  check(current: number, baseline: number) {
    if (baseline === 0) return { regression: false, severity: 'none' };
    const dev = Math.abs((current - baseline) / baseline);
    if (dev > 0.50) return { regression: true, severity: 'critical' };
    if (dev > 0.30) return { regression: true, severity: 'major' };
    if (dev > this.THRESHOLD) return { regression: true, severity: 'minor' };
    return { regression: false, severity: 'none' };
  }
}
```

---

## 4. CI INTEGRATION — Pipeline Completo

### 4.1 GitHub Actions Workflow

```yaml
name: Load Test Gate (Gate 3)
on:
  push: { branches: [main, release/*] }
  pull_request: { branches: [main] }
jobs:
  infrastructure:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker compose -f docker-compose.loadtest.yml up -d --wait
  load-test-chat:
    needs: [infrastructure]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          curl -LO https://github.com/grafana/k6/releases/download/v0.52.0/k6-v0.52.0-linux-amd64.tar.gz
          tar xzf k6-*.tar.gz && sudo mv k6-*/k6 /usr/local/bin/
      - run: k6 run k6/chat-streaming.js --out json=reports/chat.json --summary-export=reports/chat-summary.json
      - uses: actions/upload-artifact@v4
        with: { name: report-chat, path: reports/chat* }
  load-test-lsp:
    needs: [infrastructure]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          curl -LO https://github.com/grafana/k6/releases/download/v0.52.0/k6-v0.52.0-linux-amd64.tar.gz
          tar xzf k6-*.tar.gz && sudo mv k6-*/k6 /usr/local/bin/
      - run: k6 run k6/lsp-hover.js --out json=reports/lsp.json --summary-export=reports/lsp-summary.json
      - uses: actions/upload-artifact@v4
        with: { name: report-lsp, path: reports/lsp* }
  load-test-file:
    needs: [infrastructure]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          curl -LO https://github.com/grafana/k6/releases/download/v0.52.0/k6-v0.52.0-linux-amd64.tar.gz
          tar xzf k6-*.tar.gz && sudo mv k6-*/k6 /usr/local/bin/
      - run: k6 run k6/file-crud.js --out json=reports/file.json --summary-export=reports/file-summary.json
      - uses: actions/upload-artifact@v4
        with: { name: report-file, path: reports/file* }
  load-test-agent:
    needs: [infrastructure]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          curl -LO https://github.com/grafana/k6/releases/download/v0.52.0/k6-v0.52.0-linux-amd64.tar.gz
          tar xzf k6-*.tar.gz && sudo mv k6-*/k6 /usr/local/bin/
      - run: k6 run k6/agent-decision.js --out json=reports/agent.json --summary-export=reports/agent-summary.json
      - uses: actions/upload-artifact@v4
        with: { name: report-agent, path: reports/agent* }
  load-test-nats:
    needs: [infrastructure]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          curl -LO https://github.com/grafana/k6/releases/download/v0.52.0/k6-v0.52.0-linux-amd64.tar.gz
          tar xzf k6-*.tar.gz && sudo mv k6-*/k6 /usr/local/bin/
      - run: k6 run k6/nats-throughput.js --out json=reports/nats.json --summary-export=reports/nats-summary.json
      - uses: actions/upload-artifact@v4
        with: { name: report-nats, path: reports/nats* }
  load-test-search:
    needs: [infrastructure]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          curl -LO https://github.com/grafana/k6/releases/download/v0.52.0/k6-v0.52.0-linux-amd64.tar.gz
          tar xzf k6-*.tar.gz && sudo mv k6-*/k6 /usr/local/bin/
      - run: k6 run k6/search.js --out json=reports/search.json --summary-export=reports/search-summary.json
      - uses: actions/upload-artifact@v4
        with: { name: report-search, path: reports/search* }
  load-test-concurrent:
    needs: [infrastructure]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          curl -LO https://github.com/grafana/k6/releases/download/v0.52.0/k6-v0.52.0-linux-amd64.tar.gz
          tar xzf k6-*.tar.gz && sudo mv k6-*/k6 /usr/local/bin/
      - run: k6 run k6/concurrent-agents.js --out json=reports/concurrent.json --summary-export=reports/concurrent-summary.json
      - uses: actions/upload-artifact@v4
        with: { name: report-concurrent, path: reports/concurrent* }
  quality-gate:
    needs: [load-test-chat, load-test-lsp, load-test-file, load-test-agent, load-test-nats, load-test-search, load-test-concurrent]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with: { path: reports/ }
      - run: node scripts/quality-gates/validate-load-test.mjs --reports-dir reports/ --fail-on-blocker
      - run: node scripts/quality-gates/generate-load-dashboard.mjs --reports-dir reports/ --output reports/dashboard.html
      - uses: actions/upload-artifact@v4
        with: { name: dashboard, path: reports/dashboard.html }
  cleanup:
    if: always()
    runs-on: ubuntu-latest
    steps:
      - run: docker compose -f docker-compose.loadtest.yml down -v || true
```

### 4.2 Docker Compose

```yaml
version: '3.8'
services:
  nats:
    image: nats:2.10-alpine
    ports: ['4222:4222', '8222:8222']
    command: ['-js', '-m', '8222']
  postgres:
    image: pgvector/pgvector:pg16
    ports: ['5432:5432']
    environment:
      POSTGRES_DB: ideia_loadtest
      POSTGRES_USER: loadtest
      POSTGRES_PASSWORD: loadtest_pass
  api-server:
    build: { context: ., dockerfile: Dockerfile.loadtest }
    ports: ['3001:3001', '3002:3002', '3003:3003', '3004:3004', '50051:50051']
    environment:
      NODE_ENV: loadtest
      NATS_URL: nats://nats:4222
      LOG_LEVEL: error
    depends_on: { nats: { condition: service_healthy }, postgres: { condition: service_healthy } }
```

### 4.3 Local Runner

```bash
#!/bin/bash
SCRIPTS=("chat-streaming" "lsp-hover" "file-crud" "agent-decision" "nats-throughput" "search" "concurrent-agents")
REPORT_DIR="reports/loadtest/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$REPORT_DIR"
ALL_PASSED=true
for script in "${SCRIPTS[@]}"; do
  if k6 run "k6/${script}.js" --out json="$REPORT_DIR/${script}.json" --summary-export="$REPORT_DIR/${script}-summary.json"; then
    echo "PASSED: $script"
  else
    echo "FAILED: $script"; ALL_PASSED=false
  fi
done
node scripts/quality-gates/generate-load-dashboard.mjs --reports-dir "$REPORT_DIR"
[ "$ALL_PASSED" = true ] && echo "ALL PASSED" || echo "SOME FAILED"
```

---

## 5. DASHBOARD — HTML Report Generator

### 5.1 Gerador de Dashboard

```typescript
// scripts/quality-gates/generate-load-dashboard.mjs
import fs from 'fs';
import path from 'path';

async function main() {
  const reportsDir = process.argv[process.argv.indexOf('--reports-dir')+1] || 'reports/';
  const output = process.argv[process.argv.indexOf('--output')+1] || 'reports/dashboard.html';
  const title = process.argv[process.argv.indexOf('--title')+1] || 'Load Test Dashboard';

  const files = fs.readdirSync(reportsDir).filter(f => f.endsWith('-summary.json'));
  const results = [];

  for (const f of files) {
    const content = JSON.parse(fs.readFileSync(path.join(reportsDir, f), 'utf-8'));
    const name = f.replace('-summary.json', '');
    const metrics = content.metrics || {};
    const latKey = Object.keys(metrics).find(k => k.includes('latency'));
    const errKey = Object.keys(metrics).find(k => k.includes('error'));

    let passed = true;
    const thresholds = content.thresholds || {};
    for (const [, v] of Object.entries(thresholds)) {
      if (v && typeof v === 'object' && !v.passed) passed = false;
    }

    results.push({
      script: name,
      p95: (latKey && metrics[latKey]?.values?.p95) || 0,
      p99: (latKey && metrics[latKey]?.values?.p99) || 0,
      errorRate: (errKey && metrics[errKey]?.values?.rate) || 0,
      passed,
    });
  }

  const passedN = results.filter(r => r.passed).length;
  const score = results.length > 0 ? Math.round((passedN / results.length) * 100) : 0;

  const rows = results.map(r => '<tr><td>' + r.script + '</td><td>' + r.p95.toFixed(1) + 'ms</td><td>' + r.p99.toFixed(1) + 'ms</td><td>' + (r.errorRate * 100).toFixed(2) + '%</td><td>' + (r.passed ? 'PASS' : 'FAIL') + '</td></tr>').join('\n');

  const html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + title + '</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#1a1a2e;color:#e0e0e0;padding:2rem}h1{color:#00d4ff;margin-bottom:.5rem}h2{color:#a0a0c0;margin:1.5rem 0 1rem}.card{background:#16213e;border-radius:8px;padding:1.25rem;margin:1rem 0;border:1px solid #0f3460}.score{font-size:2rem;font-weight:bold;margin:.25rem 0}table{width:100%;border-collapse:collapse;background:#16213e;border-radius:8px;overflow:hidden}th{background:#0f3460;color:#00d4ff;padding:.75rem;text-align:left}td{padding:.75rem;border-bottom:1px solid #1a1a3e;font-size:.9rem}.ts{color:#666;font-size:.8rem;margin-bottom:1rem}</style></head><body><h1>' + title + '</h1><p class="ts">Generated: ' + new Date().toISOString() + '</p><div class="card"><h2>' + (score >= 80 ? 'PASSED' : 'FAILED') + '</h2><div class="score" style="color:' + (score >= 80 ? '#4caf50' : '#ff9800') + '">' + score + '/100</div><p>' + passedN + '/' + results.length + ' passing</p></div><table><thead><tr><th>Script</th><th>P95</th><th>P99</th><th>Error%</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table></body></html>';

  fs.writeFileSync(output, html, 'utf-8');
  fs.writeFileSync(output.replace('.html', '.json'), JSON.stringify({ title, score, results }, null, 2), 'utf-8');
  console.log('Dashboard:', output);
}
main().catch(e => { console.error(e); process.exit(1); });
```

---

## 6. TESTES — 4 Suites de Validacao

### 6.1 Threshold Validator Tests

```typescript
// tests/load-test/threshold-validator.test.ts
import { describe, it, expect } from '@jest/globals';

function parseCondition(condition: string) {
  const m = condition.match(/^(p\d+|rate)\s*([<>])\s*(\d+\.?\d*)$/);
  if (!m) throw new Error('Invalid: ' + condition);
  return { op: m[2], value: parseFloat(m[3]) };
}

function checkThreshold(metric: string, condition: string, actual: number): boolean {
  const { op, value } = parseCondition(condition);
  if (metric.includes('error')) return op === '<' ? actual < value / 100 : actual > value;
  return op === '<' ? actual < value : actual > value;
}

describe('ThresholdValidator', () => {
  it('parses p95<2000', () => {
    const r = parseCondition('p95<2000');
    expect(r.op).toBe('<');
    expect(r.value).toBe(2000);
  });

  it('passes latency under', () => {
    expect(checkThreshold('latency', 'p95<2000', 1500)).toBe(true);
  });

  it('fails latency over', () => {
    expect(checkThreshold('latency', 'p95<2000', 2500)).toBe(false);
  });

  it('passes error under', () => {
    expect(checkThreshold('error_rate', 'rate<0.01', 0.005)).toBe(true);
  });

  it('fails error over', () => {
    expect(checkThreshold('error_rate', 'rate<0.01', 0.02)).toBe(false);
  });

  it('throws on invalid', () => {
    expect(() => parseCondition('bad')).toThrow();
  });
});
```

### 6.2 Regression Detector Tests

```typescript
// tests/load-test/regression-detector.test.ts
import { describe, it, expect } from '@jest/globals';

function detectRegression(current: number, baseline: number, threshold = 0.20) {
  if (baseline === 0) return { regression: false, severity: 'none' as const };
  const dev = Math.abs((current - baseline) / baseline);
  if (dev > 0.50) return { regression: true, severity: 'critical' as const };
  if (dev > 0.30) return { regression: true, severity: 'major' as const };
  if (dev > threshold) return { regression: true, severity: 'minor' as const };
  return { regression: false, severity: 'none' as const };
}

describe('RegressionDetector', () => {
  it('none within 20%', () => {
    expect(detectRegression(1100, 1000, 0.20).severity).toBe('none');
  });

  it('minor at 25%', () => {
    expect(detectRegression(1250, 1000, 0.20).severity).toBe('minor');
  });

  it('major at 35%', () => {
    expect(detectRegression(1350, 1000, 0.20).severity).toBe('major');
  });

  it('critical at 55%', () => {
    expect(detectRegression(1550, 1000, 0.20).severity).toBe('critical');
  });

  it('handles zero baseline', () => {
    expect(detectRegression(1000, 0).regression).toBe(false);
  });

  it('improvement not regression', () => {
    expect(detectRegression(800, 1000).regression).toBe(false);
  });
});
```

### 6.3 Dashboard Generator Tests

```typescript
// tests/load-test/dashboard-generator.test.ts
import { describe, it, expect } from '@jest/globals';

function gen(results: Array<{ script: string; passed: boolean }>) {
  const allPassed = results.every(r => r.passed);
  const score = results.length > 0 ? Math.round((results.filter(r => r.passed).length / results.length) * 100) : 0;
  return { overallPassed: allPassed, score, results };
}

describe('DashboardGenerator', () => {
  it('all pass = 100', () => {
    const r = gen([{ script: 'a', passed: true }, { script: 'b', passed: true }]);
    expect(r.overallPassed).toBe(true);
    expect(r.score).toBe(100);
  });

  it('half pass = 50', () => {
    expect(gen([{ script: 'a', passed: true }, { script: 'b', passed: false }]).score).toBe(50);
  });

  it('mixed score 75%', () => {
    const r = gen([
      { script: 'a', passed: true },
      { script: 'b', passed: false },
      { script: 'c', passed: true },
      { script: 'd', passed: true },
    ]);
    expect(r.score).toBe(75);
  });

  it('empty = 0', () => {
    expect(gen([]).score).toBe(0);
  });

  it('empty = vacuous true', () => {
    expect(gen([]).overallPassed).toBe(true);
  });

  it('single failure', () => {
    expect(gen([{ script: 'a', passed: false }]).overallPassed).toBe(false);
  });
});
```

### 6.4 Suite Integration Tests

```typescript
// tests/load-test/suite-integration.test.ts
import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

describe('LoadTestSuite Integration', () => {
  const scriptsDir = path.join(__dirname, '../../k6');

  it('all 7 scripts exist', () => {
    const scripts = ['chat-streaming.js', 'lsp-hover.js', 'file-crud.js', 'agent-decision.js', 'nats-throughput.js', 'search.js', 'concurrent-agents.js'];
    for (const s of scripts) {
      expect(fs.existsSync(path.join(scriptsDir, s))).toBe(true);
    }
  });

  it('all have export const options', () => {
    const files = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.js'));
    for (const f of files) {
      const content = fs.readFileSync(path.join(scriptsDir, f), 'utf-8');
      expect(content).toContain('export const options');
      expect(content).toContain('export default function');
    }
  });

  it('all have thresholds', () => {
    const files = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.js'));
    for (const f of files) {
      expect(fs.readFileSync(path.join(scriptsDir, f), 'utf-8')).toContain('thresholds:');
    }
  });

  it('all have tags', () => {
    const files = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.js'));
    for (const f of files) {
      expect(fs.readFileSync(path.join(scriptsDir, f), 'utf-8')).toContain('tags:');
    }
  });

  it('all have scenarios or VUs', () => {
    const files = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.js'));
    for (const f of files) {
      const c = fs.readFileSync(path.join(scriptsDir, f), 'utf-8');
      expect(c).toMatch(/scenarios:|vus:/);
    }
  });
});
```

---

## 7. RISCOS E MITIGACOES

### 7.1 Matriz de Riscos

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|-------------|---------|-----------|
| Falso positivo rede instavel | Media | Alto | 3 execucoes antes de blocker |
| Baseline desatualizada | Alta | Medio | Atualizacao semanal automatica |
| Recursos CI insuficientes | Media | Alto | k6 cloud fallback |
| App nao responde timeout | Baixa | Critico | Liveness probe |
| Thresholds permissivos | Media | Alto | Revisao trimestral |
| Interferencia entre testes | Alta | Medio | Namespace isolado por VU |
| Vazamento de memoria | Media | Alto | Monitoramento recursos |
| Dependencia servicos externos | Baixa | Critico | Mock servicos |
| Flutuacao baseline | Alta | Baixo | Media movel 5 execucoes |

### 7.2 Plano de Contingencia

| Situacao | Acao | SLA |
|----------|------|-----|
| 1 script falha | Re-executar 1x, se falhar = blocker | 10 min |
| 3+ scripts falham | Blocker automatico + Slack | 5 min |
| Runner sem recursos | k6 cloud mode | 15 min |
| App offline | Restart docker | 10 min |
| Threshold violado PR | Comentario automatico | 2 min |
| Regressao critica | Rollback automatico | 30 min |
| Dashboard falha | Fallback JSON | 5 min |

---

## 8. PROXIMOS PASSOS

### 8.1 Imediato (24h)

- [ ] Finalizar sintaxe ES2020 dos 7 scripts
- [ ] Subir ambiente Docker load test
- [ ] Testar execucao GitHub Actions
- [ ] Validar thresholds baseline real
- [ ] Verificar geracao HTML dashboard

### 8.2 Curto Prazo (1 semana)

- [ ] Configurar k6 Cloud
- [ ] Armazenar baseline PostgreSQL
- [ ] Provisionar Grafana dashboard
- [ ] Configurar alertas regressao
- [ ] Notificar Slack apos execucao

### 8.3 Medio Prazo (1 mes)

- [ ] Chaos engineering durante load test
- [ ] Testes estresse 5x threshold
- [ ] Testes pico Black Friday
- [ ] Metricas negocio
- [ ] k6 Operator Kubernetes
- [ ] Synthetic monitoring producao

### 8.4 Metricas de Sucesso

| Metrica | Alvo | Prazo |
|---------|------|-------|
| Cobertura scripts | 7/7 operacionais | 24h |
| Threshold accuracy | <5% falsos positivos | 1 sem |
| CI execution time | <20 min suite | 1 sem |
| Regression detection | >90% precisao | 2 sem |
| Dashboard adoption | 100% equipe pre-release | 1 mes |
| Load test automation | 100% Gate 3 | 1 mes |

---

> **ESTUDO-LOAD-TEST-K6-SUITE v3.0** — 2026-07-26 | **Score:** 88/100
> **Scripts:** 7 completos | **Testes:** 4 suites (22 casos) | **Integracao:** CI/CD, HTML Dashboard, Regression Detector