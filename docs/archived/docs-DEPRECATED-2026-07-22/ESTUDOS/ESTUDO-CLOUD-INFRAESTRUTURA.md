# Estudo: Cloud, Infraestrutura e Deploy para IDEIA

> **Data:** 2026-07-18
> **Propósito:** Mapear provedores cloud, estratégias de containerização, serverless, banco de dados gerenciado, IaC, rede, backup e arquiteturas de referência para a plataforma IDEIA — do MVP single-server ao enterprise multi-region.
> **Base:** Pesquisa estado-da-arte 2025-2026 + análise das necessidades de infra do ecossistema IDEIA (Theia, NATS, agentes, LLM, memória, storage)

---

## Sumário

1. [Provedores Cloud](#1-provedores-cloud)
2. [Containerização](#2-containerização)
3. [Serverless e Edge](#3-serverless-e-edge)
4. [Database-as-a-Service](#4-database-as-a-service)
5. [Infra as Code (IaC)](#5-infra-as-code-iac)
6. [Rede e DNS](#6-rede-e-dns)
7. [Backup e Recovery](#7-backup-e-recovery)
8. [Arquiteturas de Referência IDEIA](#8-arquiteturas-de-referência-ideia)

---

## 1. Provedores Cloud

### 1.1 AWS (Amazon Web Services)

**Serviços relevantes para IDEIA:**

| Serviço | Categoria | Uso no IDEIA | Custo aproximado |
|---------|-----------|-------------|------------------|
| EC2 | Compute | Servidor Theia, agent runtime, NATS broker | $20-500/mês (t3.medium a c6i.4xlarge) |
| ECS/Fargate | Container | Orquestração Docker serverless | $10-200/mês (Fargate spot) |
| EKS | Kubernetes | Cluster K8s gerenciado | $73/mês (plano de controle) + nós |
| Lambda | Serverless | Webhooks, async processing, API endpoints | $0/mês (free tier: 1M req) |
| RDS | Database | PostgreSQL gerenciado | $15-500/mês (db.t3.micro a db.r6g.xlarge) |
| S3 | Storage | Artefatos, checkpoints, MinIO tier | $0.023/GB/mês (Standard) |
| CloudFront | CDN | Theia Cloud estático, WebSocket proxy | $0.085/GB (primeiros 10TB) |
| ElastiCache | Cache | Redis para sessão, rate-limit | $15-200/mês (cache.t3.micro+) |
| Bedrock | AI/LLM | Hosting de modelos fundacionais | Pay-per-token (Claude, Llama, Mistral) |
| API Gateway | API | Roteamento de agentes, webhooks | $3.50/milhão de chamadas |

**Custos Free Tier AWS (12 meses):**
- EC2: 750h/mês t2.micro (não suficiente para Theia)
- Lambda: 1M requisições/mês
- S3: 5GB standard
- RDS: 750h/mês db.t2.micro (viável para MVP pequeno)
- CloudFront: 1TB/mês

**Prós:** Líder de mercado, 200+ serviços, maturidade, suporte enterprise, Bedrock para LLM.
**Contras:** Complexidade de faturamento, lock-in em serviços gerenciados, custo de suporte.
**Veredito IDEIA:** Cloud primária. Usar Bedrock para fallback de LLM, EKS para K8s enterprise, RDS Aurora para banco.

### 1.2 GCP (Google Cloud Platform)

| Serviço | Categoria | Uso no IDEIA | Diferencial |
|---------|-----------|-------------|-------------|
| Compute Engine | Compute | VM Theia, agent runtime | GPUs disponíveis (T4, L4, A100) |
| GKE | Kubernetes | K8s gerenciado | Autopilot (sem nós) |
| Cloud Run | Serverless/Container | Theia stateless, API agents | Pay-per-request, cold start 200ms |
| Cloud SQL | Database | PostgreSQL/Hypertable | PG15, pontos de restore, até 30GB de cache |
| Cloud Storage | Storage | S3-compatível, Multi-Region | $0.026/GB/mês, nearline $0.01 |
| Cloud CDN | CDN | Global anycast | 100+ pontos de presença |
| Vertex AI | AI/LLM | Model Garden, tuning | Gemini, Claude, Llama, embeddings |
| Memorystore | Cache | Redis gerenciado | Padrão Redis ou Cluster |

**Free Tier GCP (sempre ativo):**
- Compute Engine: 1 f1-micro (us-central1) — insuficiente para Theia
- Cloud Storage: 5GB/mês
- Cloud Functions: 2M invocações/mês
- Cloud Build: 120 min/dia

**Prós:** Preço competitivo (committed use discounts), GKE Autopilot, rede premium global, Vertex AI.
**Contras:** Menor market share, menos serviços que AWS, suporte caro.
**Veredito IDEIA:** Secundária. Vertex AI como alternativa a Bedrock. Cloud Run para microserviços e agents HTTP.

### 1.3 Azure

| Serviço | Categoria | Uso no IDEIA | Observação |
|---------|-----------|-------------|------------|
| VM | Compute | Theia host | Spot VMs 90% desconto |
| AKS | Kubernetes | K8s gerenciado | $73/mês + nós |
| Azure Functions | Serverless | Agent functions, webhooks | 1M req/mês free |
| SQL Database | Database | PostgreSQL/Cosmos DB | SQL Server + PG |
| Blob Storage | Storage | Artefatos | $0.018/GB (cool tier) |
| CDN | CDN | Global | Verizon/Standard |
| OpenAI | AI/LLM | GPT-4o, embeddings | API exclusiva Microsoft |

**Free Tier Azure (sempre + 12 meses):**
- VM: B1s (750h/mês, 12 meses)
- Functions: 1M execuções/mês (sempre)
- Blob: 5GB (sempre)
- Cosmos DB: 1000 RU/s (sempre)

**Prós:** Integração OpenAI nativa, Azure DevOps, mercado enterprise, compliance.
**Contras:** Documentação confusa, UX do portal inferior, alguns serviços defasados.
**Veredito IDEIA:** OpenAI via Azure para clientes enterprise que exigem dados na Microsoft. Usar OpenAI diretamente para MVP.

### 1.4 DigitalOcean

| Serviço | Categoria | Uso no IDEIA | Preço |
|---------|-----------|-------------|-------|
| App Platform | PaaS | Theia Cloud simples | $12/mês (basic) |
| Droplets | VPS | Theia single-node | $6/mês (2GB RAM, 1vCPU) |
| Managed DB | Database | PostgreSQL | $15/mês (1GB RAM, 10GB) |
| Spaces | Storage (S3) | Artefatos | $5/mês (250GB) |
| Managed Redis | Cache | Cache e sessão | $15/mês |

**Prós:** UX excelente, preço fixo e previsível, sem engenharia de custo, droplet reservada.
**Contras:** Poucos serviços, sem AI/LLM, sem serverless (exceto Functions beta), sem multi-region fácil.
**Veredito IDEIA:** Perfeito para MVP e estágio inicial ($20-40/mês total). Droplet $12/mês + Managed DB $15/mês + Spaces $5/mês.

### 1.5 Hetzner

| Produto | Especificação | Preço | Uso IDEIA |
|---------|--------------|-------|-----------|
| CX22 | 2 vCPU, 4GB RAM | €3.99/mês | Theia dev/test |
| CAX21 | 4 vCPU, 8GB RAM (ARM) | €5.99/mês | Theia prod leve |
| CPX31 | 4 vCPU, 8GB RAM (x86) | €9.99/mês | Agent runtime |
| Volume | 100GB NVMe | €0.06/GB/mês | Persistent storage |
| Load Balancer | Shared | €3.99/mês | Distribuição simples |

**Prós:** Preço imbatível (1/5 da AWS para mesmo hardware), localização Europa (GDPR), datacenter próprio.
**Contras:** Sem serviços gerenciados (só VPS + storage + LB + K8s), sem AI, sem CDN, networking básico.
**Veredito IDEIA:** Ideal para self-hosted econômico e infra de staging. Não usar para Theia Cloud em produção sem HA.

### 1.6 Oracle Cloud (OCI)

| Oferta | Free Tier (sempre) | Equivalente AWS | Custo AWS |
|--------|-------------------|----------------|-----------|
| VM.Standard.E2.1.Micro | 4 ARM Ampere A1 + 24GB RAM | t3.medium | ~$30/mês |
| VM.Standard.E2.1.Micro | 2 x86 + 1GB RAM | t2.micro | ~$8/mês |
| Block Storage | 200GB total | EBS gp3 | ~$20/mês |
| Object Storage | 10GB | S3 | — |
| Autonomous DB | 2 DBs (20GB cada) | RDS | ~$20/mês |
| Load Balancer | 10Mbps | ALB | ~$20/mês |

**Prós:** Free tier mais generoso do mercado (4 ARM + 24GB de graça!), banco autônomo, low cost.
**Contras:** Mercado menor, menos serviços, região limitada, UI diferente da AWS.
**Veredito IDEIA:** Excelente para lab, POCs, desenvolvimento. Para produção, usar como alternativa low-budget.

### 1.7 Comparação de Preços

#### Cálculo para MVP IDEIA (1 instância Theia + banco + storage + cache)

| Provedor | Configuração | Custo/mês | Free Tier cobre? |
|----------|-------------|-----------|------------------|
| **DigitalOcean** | 1 Droplet $12 + DB $15 + Spaces $5 | **$32** | Não |
| **Hetzner** | 1 CPX31 €9.99 + 20GB Volume €1.20 | **~$13** | Não |
| **Oracle Cloud** | 4 ARM free + DB free + Storage free | **$0** | Sim |
| **AWS** | 1 t3.medium $30 + RDS micro $15 + S3 $1 | **$46** | Parcial (12 meses) |
| **GCP** | 1 e2-small $15 + Cloud SQL micro $10 + GCS $0.50 | **$25.50** | Parcial |
| **Azure** | 1 B1s $10 + DB micro $10 + Blob $0.50 | **$20.50** | Parcial |

#### Cálculo para cluster IDEIA Startups (3 nós K3s + banco + cache + storage)

| Provedor | Configuração | Custo/mês |
|----------|-------------|-----------|
| **DigitalOcean** | 3 Droplets $12 + DB $30 + Spaces $5 | **$71** |
| **Hetzner** | 3 CX22 €3.99 + 3 volumes €1.80 | **~$18** |
| **AWS** | 3 t3.small $60 + RDS micro $15 + ElastiCache $15 + S3 $5 | **$95** |
| **GCP** | GKE Autopilot $40 + Cloud SQL $20 + Memorystore $15 | **$75** |
| **Azure** | AKS 3 nodos $90 + DB $20 + Cache $15 | **$125** |

### 1.8 Lock-in e Portabilidade

| Estratégia | Risco de lock-in | Portabilidade |
|------------|-----------------|---------------|
| **Docker Compose** | Mínimo | 100% (qualquer provedor) |
| **K3s/K8s + Helm** | Baixo | Cloud-agnostic (kubeconfig) |
| **Terraform/OpenTofu** | Baixo | Providers universais |
| **RDS PostgreSQL** | Médio (pg_dump) | Dados portáteis |
| **S3 API** | Baixo (MinIO compatível) | API padrão mercado |
| **Lambda/Functions** | Alto | Vendor lock-in |
| **Bedrock/Vertex AI** | Alto | Alternativa: Ollama + TGI |
| **NATS JetStream** | Nenhum | Open source, autogestionável |

**Recomendação IDEIA:** Construir sobre Docker + K3s + MinIO + PostgreSQL — stack portável para qualquer cloud. Usar serviços gerenciados apenas para reduzir operação, mas com escape hatch via Terraform.

---

## 2. Containerização

### 2.1 Docker

**Fundamentos para IDEIA:**

```
FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV NODE_ENV=production

# Dependencies (cached layer)
COPY pnpm-lock.yaml package.json ./
RUN corepack enable && pnpm install --frozen-lockfile

# Build
COPY . .
RUN pnpm build

# Production image
FROM base AS runner
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
EXPOSE 3000 4222 8080

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

USER node
CMD ["node", "dist/index.js"]
```

**Docker Compose (MVP):**

```yaml
# docker-compose.yml - IDEIA MVP
version: '3.9'
services:
  theia:
    build: ./theia
    ports: ["3000:3000"]
    volumes:
      - workspace-data:/home/project:cached
      - theia-plugins:/home/theia/plugins
    depends_on: [nats, postgres, minio, redis]
    environment:
      - NATS_URL=nats://nats:4222
      - DB_URL=postgres://ideia:ideia@postgres:5432/ideia
      - REDIS_URL=redis://redis:6379
    deploy:
      resources:
        limits: {memory: 2G, cpus: '2'}
        
  nats:
    image: nats:2.10-alpine
    command: ["-js", "-sd", "/data", "-m", "8222"]
    ports: ["4222:4222", "8222:8222"]
    volumes: [nats-data:/data]

  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: ideia
      POSTGRES_USER: ideia
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes: [pg-data:/var/lib/postgresql/data]
    ports: ["5432:5432"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ideia"]
      interval: 10s

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports: ["9000:9000", "9001:9001"]
    volumes: [minio-data:/data]
    environment:
      MINIO_ROOT_USER: ${MINIO_USER:-ideia}
      MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD}
      MINIO_DEFAULT_BUCKETS: artifacts,checkpoints

  redis:
    image: redis:7-alpine
    command: ["redis-server", "--appendonly", "yes"]
    volumes: [redis-data:/data]
    ports: ["6379:6379"]

  agent-runtime:
    build: ./agent-runtime
    depends_on: [nats, postgres, redis]
    environment:
      - NATS_URL=nats://nats:4222
      - DB_URL=postgres://ideia:ideia@postgres:5432/ideia
    deploy:
      replicas: 2
      resources:
        limits: {memory: 1G, cpus: '1'}

volumes:
  workspace-data:
  theia-plugins:
  nats-data:
  pg-data:
  minio-data:
  redis-data:
```

### 2.2 Kubernetes (K8s)

**Componentes K8s para IDEIA:**

```yaml
# deployment.yaml — Theia Cloud Service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: theia
  namespace: ideia
spec:
  replicas: 3
  selector:
    matchLabels: { app: theia }
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  template:
    metadata:
      labels: { app: theia }
    spec:
      containers:
      - name: theia
        image: ideia/theia:latest
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NATS_URL
          value: nats://nats-cluster:4222
        - name: DB_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        resources:
          requests: { cpu: "500m", memory: "512Mi" }
          limits: { cpu: "2", memory: "2Gi" }
        livenessProbe:
          httpGet: { path: /health, port: http }
          initialDelaySeconds: 10
        readinessProbe:
          httpGet: { path: /ready, port: http }
        volumeMounts:
        - name: workspace-storage
          mountPath: /home/project
      volumes:
      - name: workspace-storage
        persistentVolumeClaim:
          claimName: workspace-pvc
```

```yaml
# ingress.yaml — Theia Cloud + Agent API
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: theia-ingress
  namespace: ideia
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-body-size: "500m"
spec:
  ingressClassName: nginx
  tls:
  - hosts: [app.ideia.dev, api.ideia.dev]
    secretName: ideia-tls
  rules:
  - host: app.ideia.dev
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: theia
            port:
              number: 3000
  - host: api.ideia.dev
    http:
      paths:
      - path: /agents
        pathType: Prefix
        backend:
          service:
            name: agent-api
            port:
              number: 8080
```

### 2.3 Lightweight Kubernetes

| Solução | Descrição | Requisitos | Prós | Contras |
|---------|-----------|-----------|------|---------|
| **K3s** | K8s certificado, binary único (<100MB) | 512MB RAM, 200MB disco | Certificado CNCF, simples, etcd opcional (SQLite) | Menos HA sem etcd |
| **K0s** | K8s com um único binary | 1GB RAM | Air-gap, sem dependências | Comunidade menor |
| **MicroK8s** | Snap-based single-node | 4GB RAM | Addons 1-click (ingress, dns, storage) | Snap lock-in |
| **k3d** | K3s em Docker | Docker host | Ideal para dev local | Só dev/test |
| **Kind** | K8s em Docker | Docker host | Teste de controllers | Só dev/test |

**Recomendação IDEIA:**
- **Desenvolvimento local:** Docker Compose (MVP) ou k3d (testes K8s)
- **Staging:** K3s single-node (Hetzner CX22, ~$4/mês)
- **Produção MVP:** K3s 3 nós com embedded etcd (DigitalOcean $36/mês)
- **Produção Enterprise:** EKS/GKE/AKS cluster gerenciado

### 2.4 Nomad (HashiCorp)

Nomad é uma alternativa ao K8s significativamente mais simples:

| Aspecto | Kubernetes | Nomad |
|---------|------------|-------|
| **Complexidade** | Muito complexo (15+ componentes) | Simples (1 binary) |
| **Setup** | ~30 min (K3s) a ~2h (K8s full) | ~5 min |
| **Orquestração** | Pods, Deployments, StatefulSets, etc. | Jobs, Groups, Tasks |
| **Service mesh** | Service mesh complexo (Istio, Linkerd) | Consul + Connect |
| **Networking** | CNI complexo (Calico, Cilium) | Simples (IP host) |
| **Integração K8s** | Nativa | Pode usar K8s como driver |
| **Stateful** | StatefulSet + PVC | Volume host + CSI |
| **Curva aprendizado** | Alta | Média |

**Exemplo de job Nomad:**

```hcl
job "agent-runtime" {
  datacenters = ["dc1"]
  type = "service"

  group "agents" {
    count = 3
    
    network {
      port "http" { to = 8080 }
    }

    task "agent" {
      driver = "docker"
      config {
        image = "ideia/agent-runtime:latest"
        ports = ["http"]
      }
      
      env {
        NATS_URL = "nats://nats.service.consul:4222"
        DB_URL   = "postgres://ideia@postgres.service.consul:5432/ideia"
      }

      resources {
        cpu    = 500
        memory = 1024
      }
    }
  }
}
```

**Veredito IDEIA:** Nomad é atraente para equipes pequenas que querem simplicidade. Porém, K8s (mesmo via K3s) tem ecossistema muito maior (Helm, ArgoCD, operators, service mesh). **Recomendação:** Começar com K3s, evoluir para K8s gerenciado. Usar Nomad apenas se a equipe for muito sênior em HashiCorp stack.

### 2.5 Kubernetes vs Nomad para IDEIA

```
           Complexidade Operacional
           ↑
           │                  EKS/GKE/AKS
           │                     ●
           │               K8s Full
           │                 ●
           │          K3s Multi-node
           │            ●
           │     K3s Single-node
           │       ●
           │  Nomad
           │   ●
           │  Docker Compose
           │   ●
           └──────────────────────────────►
                Número de Serviços
```

| Fase | Stack | Serviços | Nós |
|------|-------|----------|-----|
| **MVP** | Docker Compose | 6 (theia, nats, pg, minio, redis, agents) | 1 host |
| **Early** | K3s + Helm | 8 (+ ingress, cert-manager) | 3 nós |
| **Growth** | K3s + ArgoCD | 12 (+ monitoring, logging, backups) | 5 nós |
| **Scale** | EKS + ArgoCD + service mesh | 20+ | 10-50 nós |

---

## 3. Serverless e Edge

### 3.1 AWS Lambda + Lambda@Edge

**Uso no IDEIA:**

```typescript
// lambda/handler.ts — Agent Webhook Receiver
import { Context, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

interface WebhookPayload {
  agentId: string;
  taskId: string;
  action: string;
  payload: Record<string, unknown>;
}

// NATS connection feito via SSM parameter store
const natsUrl = process.env.NATS_URL || 'nats://nats.ideia.internal:4222';

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Validar com contrato
  const body: WebhookPayload = JSON.parse(event.body || '{}');
  
  // Publicar no NATS
  // Nota: conexão NATS em Lambda requer cold-start otimizado
  // Alternativa: SQS como buffer assíncrono
  
  return {
    statusCode: 202,
    body: JSON.stringify({ accepted: true, taskId: body.taskId }),
  };
};
```

**Limitações Lambda para IDEIA:**
- Timeout máximo: 15 minutos (incompatível com agentes longos)
- Cold start: 200ms-1s (impacta webhooks)
- Memória máxima: 10GB (insuficiente para modelos LLM grandes)
- Sem WebSocket persistente (incompatível com Theia)
- Sem GPU (incompatível com inferência local)

**O que colocar em Lambda:**
- ✅ Webhooks assíncronos (GitHub, GitLab, Slack)
- ✅ Processamento de eventos NATS (filtros, transformações)
- ✅ Validação de DTOs e contratos
- ✅ Notificações (email, Slack, Discord)
- ✅ Resize de imagens, parsing de artefatos
- ❌ Agentes com execução longa (>15 min)
- ❌ Theia IDE (WebSocket + filesystem)
- ❌ NATS broker
- ❌ LLM inference (exceto Bedrock serverless)

### 3.2 Cloudflare Workers (Edge)

**Prós:** 0ms cold start (isolates V8), 100ms CPU por request, streaming, Workers KV + R2 + D1 + Queues.
**Contras:** APIs limitadas da web platform, sem Node.js fs/net, sem WebSocket bidirecional contínuo.

**Uso no IDEIA:**
```typescript
// worker.ts — Cloudflare Worker como API Gateway + Cache
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Cache em Workers KV para planos de execução
    if (url.pathname.startsWith('/api/v1/plans/')) {
      const planId = url.pathname.split('/').pop()!;
      const cached = await env.PLANS_KV.get(planId, 'json');
      if (cached) {
        return new Response(JSON.stringify(cached), {
          headers: { 'CF-Cache-Status': 'HIT' },
        });
      }
    }
    
    // Proxy para agent-runtime
    const upstream = `https://agent-runtime.ideia.internal${url.pathname}${url.search}`;
    return fetch(upstream, { method: request.method, body: request.body });
  },
};
```

### 3.3 Vercel Edge Functions

**Prós:** Infra Vercel madura, integração monorepo git, preview deployments.
**Contras:** Vendor lock-in, edge functions limitadas a 50ms CPU, sem WebSocket.

**Veredito:** Ótimo para marketing site, docs, dashboard web do IDEIA. Não para o core. Usar Vercel para:
- Landpage / site de documentação
- Dashboard de observabilidade
- Preview de PRs

### 3.4 Deno Deploy

**Prós:** 35 regiões, baixo cold start, TypeScript nativo.
**Contras:** Ecossistema menor, sem Node.js nativo (mas compatível parcial).

**Veredito:** Experimental para IDEIA. Poderia substituir Cloudflare Workers com TypeScript nativo.

### 3.5 Serverless vs Containers na IDEIA

```
Critério de Decisão para Serverless vs Container:

                      ┌─ Requer GPU? ── Sim ──► VM / Container com GPU
                      │
      Qual workload? ─┤
                      │         ┌─ < 15 min? ── Sim ──► Lambda / Cloud Function
                      └─ Síncrono? 
                                └─ Não ──► Container (agentes longos)
                      
                      ┌─ Requer WebSocket? ── Sim ──► Container (Theia, NATS)
                      │
      Comunicação? ───┤
                      └─ HTTP/REST curto? ── Sim ──► Lambda / Edge Function
```

| Categoria | Serverless | Container | Motivo |
|-----------|-----------|-----------|--------|
| Theia IDE | ❌ | ✅ | WebSocket, filesystem, processos longos |
| NATS Broker | ❌ | ✅ | Broker stateful, conexões TCP longas |
| Pool de Agentes | ❌ | ✅ | Execução longa, GPU, memória |
| Webhooks | ✅ | ✅ | Lambda é suficiente e mais barato |
| API REST curta | ✅ | ✅ | Ambos OK, Lambda mais econômico |
| LLM Inference | ✅ (Bedrock) | ✅ (TGI/vLLM) | Bedrock para serverless, Container para controle |
| Background Jobs | ✅ | ✅ | Lambda para filas simples, Container para complexos |
| Event Processing | ✅ | ✅ | Lambda para filtros, Container para transformações |
| File Upload/Download | ✅ | ✅ | S3 presigned URLs independente |

**Recomendação:** Stack híbrida — containers para core (Theia, agentes, NATS, banco) e serverless para borda (webhooks, notificações, cache, CDN).

---

## 4. Database-as-a-Service

### 4.1 PostgreSQL Gerenciado

| Provedor | Plano mínimo | Custo | Diferenciais |
|----------|-------------|-------|-------------|
| **AWS RDS** | db.t3.micro (1GB, 2vCPU) | ~$15/mês | Aurora Serverless, Multi-AZ, IAM auth |
| **GCP Cloud SQL** | db-f1-micro (0.6GB) | ~$10/mês | PG15, PITR automático, 30GB cache |
| **Azure DB** | 1 vCore, 2GB | ~$10/mês | Hyperscale, zone redundancy |
| **DigitalOcean** | 1GB RAM, 10GB | ~$15/mês | Fork point-in-time, read-only nodes |
| **Supabase** | Free tier | $0 | 500MB, auth, realtime, storage, edge functions |
| **Neon** | Free tier | $0 | 500MB, branch de DB (tipo git), cold archive |
| **Railway** | Free tier | $0 | 1GB, backup automático |
| **Turso** | Free tier | $0 | 9GB (libsql edge, SQLite distribuído) |
| **Aiven** | hobbystarter | ~$15/mês | Multi-cloud, Kafka integrado |

**Recomendação para IDEIA:**

| Fase | Database | Motivo |
|------|----------|--------|
| MVP/Dev | Neon Free / Railway Free | $0, branch para cada PR |
| Early | DigitalOcean Managed DB + Neon | $15/mês estável + dev branches |
| Growth | RDS PostgreSQL + Aurora Serverless | produção + escalabilidade |
| Enterprise | RDS Multi-AZ + Read Replicas | HA global |

### 4.2 Redis Gerenciado

| Provedor | Plano mínimo | Custo | Uso IDEIA |
|----------|-------------|-------|-----------|
| **ElastiCache** | cache.t3.micro (0.5GB) | ~$15/mês | Cache principal produção |
| **Memorystore** | 1GB standard | ~$18/mês | Cache GCP |
| **Upstash** | Free 10k commands/dia | $0 | Rate limit, KV, serverless |
| **Redis Cloud (Redis Labs)** | 30MB free | $0 | Teste/dev |
| **DigitalOcean** | 1GB | ~$15/mês | Cache produção pequeno |

**Uso no IDEIA:**
- Cache de sessão de workspace (Theia)
- Rate limiting por token/agente
- Rate limiting para API de LLM
- Queue management para tasks curtas
- Cache de planos de execução
- KV store transiente (checkpoints, locks)

### 4.3 MinIO (S3-compatible Self-hosted)

MinIO é uma alternativa open-source ao S3, rodando em qualquer infraestrutura.

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ MinIO    │     │ MinIO    │     │ MinIO    │
│ Node 1   │─────│ Node 2   │─────│ Node 3   │
└──────────┘     └──────────┘     └──────────┘
      │               │               │
      └───────────────┼───────────────┘
                      │
              ┌───────────────┐
              │  MC / SDK     │
              │ (CLI, Go, JS) │
              └───────────────┘
```

**Buckets padrão IDEIA:**

| Bucket | Conteúdo | Tamanho típico | Período de retenção |
|--------|----------|---------------|---------------------|
| `workspaces` | Checkpoints de workspace | 100MB-5GB | 30 dias |
| `artifacts` | Artefatos gerados (binários, imagens) | 1KB-500MB | 90 dias |
| `models` | Modelos LLM baixados (Ollama) | 4-80GB | Indefinido |
| `backups` | Backups de banco | 1-50GB | 90 dias |
| `extensions` | Plugins Theia/OpenVSX | 1MB-50MB | Indefinido |
| `dumps` | Debug dumps e crash reports | 10MB-1GB | 7 dias |

**Vantagens do MinIO:** Sem custo de egress, performance local (NVMe), criptografia KMS, versionamento, buck notifications para NATS.
**Desvantagens:** Operação manual (backup, scaling, monitoramento), sem multi-region nativo.

### 4.4 DuckDB (Embedded Analytics)

DuckDB é um banco OLAP embeddable, serverless por natureza:

```sql
-- Análise local de métricas de agentes
SELECT 
  agent_id,
  count(*) as total_tasks,
  avg(duration_ms) as avg_duration,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration,
  sum(cost) as total_cost
FROM read_parquet('logs/metrics/*.parquet')
WHERE timestamp >= current_date - interval '7 days'
GROUP BY agent_id
ORDER BY total_cost DESC;
```

**Uso no IDEIA:**
- Análise local de logs de agentes
- Extração de métricas de arquivos Parquet/CSV
- Queries OLAP sem infraestrutura dedicada
- Relatórios one-shot via CLI

---

## 5. Infra as Code (IaC)

### 5.1 Terraform / OpenTofu

```hcl
# main.tf — DigitalOcean infra para IDEIA
terraform {
  required_providers {
    digitalocean = { source = "digitalocean/digitalocean" }
  }
}

resource "digitalocean_droplet" "theia" {
  image    = "docker-20-04"
  name     = "theia-prod-1"
  region   = "nyc3"
  size     = "s-2vcpu-4gb"
  ssh_keys = [var.do_ssh_key_id]
  
  user_data = <<-EOF
    #!/bin/bash
    docker compose -f /opt/ideia/docker-compose.yml up -d
  EOF
  
  tags = ["ideia", "production", "theia"]
}

resource "digitalocean_database_cluster" "postgres" {
  name       = "ideia-pg-prod"
  engine     = "pg"
  version    = "16"
  size       = "db-s-1vcpu-2gb"
  region     = "nyc3"
  node_count = 1
}

resource "digitalocean_spaces_bucket" "artifacts" {
  name   = "ideia-artifacts"
  region = "nyc3"
}

output "theia_ip" {
  value = digitalocean_droplet.theia.ipv4_address
}
```

### 5.2 Pulumi (TypeScript-native IaC)

```typescript
// pulumi/index.ts — AWS infra via Pulumi
import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';

const stack = new pulumi.Config();

// VPC
const vpc = new aws.ec2.Vpc('ideia-vpc', {
  cidrBlock: '10.0.0.0/16',
  enableDnsHostnames: true,
  tags: { Name: 'ideia-vpc', Environment: stack.name },
});

// EKS Cluster
const cluster = new aws.eks.Cluster('ideia-cluster', {
  roleArn: eksRole.arn,
  vpcConfig: {
    subnetIds: vpc.publicSubnetIds,
    securityGroupIds: [sg.id],
  },
  version: '1.30',
});

// RDS PostgreSQL com pgvector
const db = new aws.rds.Instance('ideia-db', {
  engine: 'postgres',
  engineVersion: '16.3',
  instanceClass: 'db.t3.medium',
  allocatedStorage: 100,
  dbName: 'ideia',
  username: 'ideia',
  password: stack.requireSecret('dbPassword'),
  vpcSecurityGroupIds: [dbSg.id],
  backupRetentionPeriod: 30,
  enabledCloudwatchLogsExports: ['postgresql'],
  storageEncrypted: true,
});
```

**Vantagens Pulumi:**
- Linguagem familiar (TypeScript) vs HCL
- IDEs e ferramentas JS (lint, tests, typecheck)
- Reuso de pacotes npm, lógica condicional real
- Automation API (executar IaC via código)

**Desvantagens:** Menos providers que Terraform, estado mais complexo.

### 5.3 AWS CDK

```typescript
// cdk/lib/ideia-stack.ts — AWS CDK
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as rds from 'aws-cdk-lib/aws-rds';

export class IdeiaStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'IdeiaVpc', { maxAzs: 2 });

    const cluster = new ecs.Cluster(this, 'IdeiaCluster', { vpc });
    
    // Theia service
    cluster.addService('theia-service', {
      serviceName: 'theia',
      image: ecs.ContainerImage.fromRegistry('ideia/theia:latest'),
      cpu: 1024, // 1 vCPU
      memoryLimitMiB: 2048,
      desiredCount: 2,
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:3000/health || exit 1'],
      },
    });

    // RDS com pgvector
    new rds.DatabaseInstance(this, 'IdeiaDB', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_3,
      }),
      vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM
      ),
      backupRetention: cdk.Duration.days(30),
    });
  }
}
```

### 5.4 Dagger (CI/CD as Code)

Dagger já está nos ADRs (ADR-006). Aqui seu papel no IaC:

```typescript
// dagger/src/iac.ts — Pipeline de IaC com Dagger
import { dag, func, object } from '@dagger.io/dagger';

@object()
class IdeiaInfra {
  @func()
  async tofuPlan(environment: string): Promise<string> {
    const src = dag.currentModule().source();
    
    const tofu = dag.container()
      .from('opentofu/tofu:1.7')
      .withMountedDirectory('/infra', src.directory(`infra/${environment}`))
      .withWorkdir('/infra')
      .withEnvVariable('TF_VAR_environment', environment);
    
    return tofu.withExec(['init']).withExec(['plan']).stdout();
  }

  @func()
  async tofuApply(environment: string): Promise<string> {
    const src = dag.currentModule().source();
    
    const tofu = dag.container()
      .from('opentofu/opentofu:1.7')
      .withMountedDirectory('/infra', src.directory(`infra/${environment}`))
      .withWorkdir('/infra')
      .withEnvVariable('TF_VAR_environment', environment);
    
    return tofu
      .withExec(['init'])
      .withExec(['apply', '-auto-approve'])
      .stdout();
  }
}
```

### 5.5 Comparação e Recomendação

| Ferramenta | Curva | Linguagem | Provider coverage | State mgmt | Testável | Recomendação |
|-----------|-------|-----------|------------------|------------|----------|-------------|
| **Terraform** | Média | HCL | Excelente (3000+) | Sim (remote) | Terratest | Manter legado |
| **OpenTofu** | Média | HCL | Excelente (fork TF) | Sim | Terratest | **IaC padrão** |
| **Pulumi** | Alta | TS/Go/Python | Muito bom (150+) | Sim | Jest/TS | **Novos projetos** |
| **AWS CDK** | Média | TS/Python | Só AWS | Via CloudFormation | Jest | Só se 100% AWS |
| **Dagger** | Alta | TS/Go | N/A (orquestra wrappers) | Não | Jest/Dagger | CI/CD + IaC |

**Recomendação IDEIA:**
- **IaC principal:** OpenTofu (padrão da indústria, open-source, sem lock-in)
- **IaC novo/experimental:** Pulumi (aproveitar expertise TypeScript da equipe)
- **Pipeline IaC:** Dagger + OpenTofu (executar plan/apply via pipeline)
- **Não usar:** AWS CDK (lock-in AWS, sem suporte multi-cloud)

---

## 6. Rede e DNS

### 6.1 Cloudflare

**Serviços Cloudflare para IDEIA:**

| Serviço | Uso | Custo |
|---------|-----|-------|
| **DNS** | `ideia.dev` nameservers | $0 (free) |
| **CDN** | Theia Cloud estático, OpenVSX assets | $0 (free) |
| **DDoS Protection** | WAF + rate limiting | $0 (free) |
| **Workers** | API gateway, cache, redirects | $0 (100k req/dia) |
| **R2** | Storage S3-compatível, zero egress | $0 (10GB) |
| **Tunnel** | `cloudflared` para self-hosted sem expor IP | $0 |
| **Pages** | Landing page, docs | $0 (500 builds/mês) |

**Cloudflare Tunnel para IDEIA:**

```bash
# cloudflared tunnel — expor Theia self-hosted sem abrir portas
cloudflared tunnel create ideia-tunnel
cloudflared tunnel route dns ideia-tunnel app.ideia.dev

# docker-compose.yml extra
cloudflared:
  image: cloudflare/cloudflared:latest
  command: tunnel run
  environment:
    - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
  depends_on: [theia]
```

**Vantagens:** Zero egress cost (R2), DDoS nativo, latência global reduzida, sem expor IP real.
**Recomendação:** Usar Cloudflare como proxy DNS + CDN + Tunnel para MVP self-hosted.

### 6.2 Route 53 (AWS)

| Feature | Uso | Custo |
|---------|-----|-------|
| Hosted Zone | Domínios gerenciados | $0.50/mês/domínio |
| Health Checks | Monitoramento de endpoint | $0.75/check/mês |
| Traffic Flow | Geo-routing, latency-based | $50/mês |
| Private DNS | Resolução interna VPC | $0 |

**Vantagem:** Integração direta com AWS services (ALB, CloudFront, API Gateway).
**Desvantagem:** Sem free tier real, sem CDN integrado.

### 6.3 VPC, Subnets, Security Groups, VPN

**Arquitetura de Rede IDEIA (multi-cloud):**

```
Internet
    │
    ├── Cloudflare (DNS + CDN + DDoS)
    │       │
    │       ├── Cloudflare Tunnel → Theia (self-hosted)
    │       │
    │       └── Cloudflare LB → API Gateway
    │
    ├── DigitalOcean VPC
    │   ├── Public Subnet
    │   │   ├── Theia (ingress: 443, websocket: 3000)
    │   │   └── Agent API (ingress: 8080)
    │   └── Private Subnet
    │       ├── NATS Cluster (4222, 6222, 8222)
    │       ├── PostgreSQL (5432)
    │       ├── Redis (6379)
    │       └── MinIO (9000)
    │
    └── AWS VPC (drill/backup, cross-region)
        └── RDS Read Replica
```

**Security Groups:**

```hcl
# Exemplo de security groups (DigitalOcean Firewall)
resource "digitalocean_firewall" "theia" {
  name = "theia-prod"

  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = ["0.0.0.0/0", "::/0"]  # via Cloudflare
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "4222"
    source_addresses = ["10.0.0.0/8"]  # NATS interno
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "5432"
    source_addresses = ["10.0.0.0/8"]  # DB privado
  }

  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}
```

### 6.4 Tailscale (VPN Zero-config)

**Vantagens para IDEIA:**
- Mesh VPN sem configuração (WireGuard)
- Acesso SSH direto sem IP público
- MagicDNS (hostnames `*.ts.net`)
- ACLs para segmentação de acesso
- SSO com Google/GitHub/Microsoft

**Setup:**

```bash
# Cada nó do IDEIA
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --auth-key tskey-xxxx --accept-dns=true --hostname=theia-node-1
```

**Uso:** Acesso SSH a servidores self-hosted, acesso ao banco de dados sem exposição, conectividade entre clouds.

---

## 7. Backup e Recovery

### 7.1 Estratégia por Camada

| Camada | Componente | Método | RPO | RTO | Prioridade |
|--------|-----------|--------|-----|-----|-----------|
| **Database** | PostgreSQL | pg_dump + WAL (PITR) | 5 min | 1h | P0 |
| **Database** | Redis | AOF + snapshot dump | 1h | 15 min | P1 |
| **Storage** | MinIO/S3 | Sync bucket cross-region | 1h | 4h | P1 |
| **States** | NATS JetStream | File store snapshot | 5 min | 10 min | P0 |
| **Configs** | Docker volumes | Snapshot zfs/rsync | 24h | 1h | P2 |
| **Code** | Git | Remote (GitHub/GitLab) | Imediato | 1 min | P0 |
| **Secrets** | Vault/env | Backup criptografado | 24h | 1h | P0 |

### 7.2 PostgreSQL PITR

```bash
#!/bin/bash
# scripts/backup-db.sh — Backup PITR automático

DB_NAME="ideia"
DB_USER="ideia"
BACKUP_DIR="/var/backups/postgres"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 1. WAL Archiving (contínuo)
# Config no postgresql.conf:
# wal_level = replica
# archive_mode = on
# archive_command = 'cp %p /var/backups/postgres/wal/%f'

# 2. Full pg_dump semanal
pg_dump -U "$DB_USER" -d "$DB_NAME" \
  --format=custom \
  --compress=9 \
  --file="${BACKUP_DIR}/full/${DB_NAME}_${TIMESTAMP}.dump"

# 3. Backup para S3/MinIO
aws s3 cp "${BACKUP_DIR}/full/${DB_NAME}_${TIMESTAMP}.dump" \
  s3://ideia-backups/postgres/${DB_NAME}_${TIMESTAMP}.dump

# 4. Limpeza
find "${BACKUP_DIR}/full" -type f -mtime +${RETENTION_DAYS} -delete

# 5. Notificar
curl -X POST -H 'Content-type: application/json' \
  --data "{\"text\":\"✅ Backup PostgreSQL concluído: ${DB_NAME} (${TIMESTAMP})\"}" \
  $SLACK_WEBHOOK_URL
```

### 7.3 DR (Disaster Recovery)

**Multi-região vs Single-região:**

```
┌───────────────────────────── Single Region ─────────────────────────────┐
│                                                                          │
│  us-east-1                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Theia │ NATS │ Postgres │ Redis │ MinIO                        │    │
│  │  Snapshot: S3 same-region │ PITR: WAL logs │ Backup: daily dump │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│  RTO: 2-4h (restore dump + replay WAL)                                  │
│  RPO: 5 min (WAL continuous archive)                                    │
│  Custo: $X                                                              │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────── Multi-Region ───────────────────────────────┐
│                                                                          │
│  us-east-1 (Primary)                     us-west-2 (Drill)               │
│  ┌────────────────────────────┐          ┌────────────────────────────┐  │
│  │ Theia │ NATS │ Postgres    │  ──WAL──▶│ Postgres Standby (sync)    │  │
│  │ Primary DB                 │  ──S3──▶│ S3 cross-region replication │  │
│  └────────────────────────────┘          │ NATS: JetStream mirror     │  │
│                                          └────────────────────────────┘  │
│  RTO: 15-30 min (DNS change + promote standby)                           │
│  RPO: 0-5 min (sync commit para standby)                                 │
│  Custo: 2x-3x                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

**Estratégia IDEIA por fase:**

| Fase | Backup | DR | Custo adicional |
|------|--------|----|----------------|
| **MVP** | pg_dump semanal + WAL contínuo | Nenhum | $0 |
| **Startup** | PITR + snapshot diário S3 | Single-region | $10-30/mês |
| **Growth** | Multi-AZ RDS + cross-region S3 | Multi-region standby | $100-300/mês |
| **Enterprise** | Active-Passive multi-region | Hot standby + teste mensal | $500+/mês |

### 7.4 Restore Drills

**Checklist de restore automatizado:**

```bash
#!/bin/bash
# scripts/drill-restore.sh — Teste automático de restore

set -euo pipefail

ENVIRONMENT="${1:-staging}"
BACKUP_FILE=$(aws s3 ls s3://ideia-backups/postgres/ | tail -1 | awk '{print $4}')

echo "🔄 Iniciando restore drill em ${ENVIRONMENT}..."

# 1. Spin up database temporário
docker run -d --name drill-postgres \
  -e POSTGRES_DB=ideia_drill \
  -e POSTGRES_USER=ideia \
  -e POSTGRES_PASSWORD=drill \
  -p 5433:5432 \
  postgres:16-alpine

sleep 5

# 2. Restore do dump
aws s3 cp "s3://ideia-backups/postgres/${BACKUP_FILE}" ./restore.dump
pg_restore -U ideia -h localhost -p 5433 -d ideia_drill ./restore.dump

# 3. Validar integridade
echo "🔍 Validando restore..."
docker exec drill-postgres psql -U ideia -d ideia_drill \
  -c "SELECT count(*) as total_users FROM users;"
docker exec drill-postgres psql -U ideia -d ideia_drill \
  -c "SELECT count(*) as total_tasks FROM tasks;"

# 4. Limpeza
docker stop drill-postgres && docker rm drill-postgres
rm -f ./restore.dump

echo "✅ Drill de restore concluído com sucesso!"
```

---

## 8. Arquiteturas de Referência IDEIA

### 8.1 Single-Server (MVP — $20-40/mês)

```
┌────────────────────────────────────────────────────────┐
│                    Servidor Único                        │
│                    (Hetzner CAX21)                       │
│                    4 vCPU, 8GB RAM                       │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Theia IDE  │  │  Agent Pool  │  │  NATS Broker  │  │
│  │   (port 443) │  │  (port 8080) │  │  (port 4222)  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                  │           │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐  │
│  │  PostgreSQL  │  │    MinIO     │  │    Redis     │  │
│  │   (pgvector) │  │   (S3-like)  │  │   (cache)    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Docker Compose | Cloudflare Tunnel → app.ideia  │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

**Componentes:** Docker Compose com 6 serviços, Cloudflare Tunnel para exposição segura, backups manuais.
**Custo:** Hetzner €9.99 + dominio $1 + Cloudflare $0 = **~$12/mês** (ou DigitalOcean $32/mês).
**Limitações:** Sem HA, sem escalabilidade horizontal, risco de falha única.
**Quando usar:** Equipe <5 pessoas, POC, desenvolvimento, primeiros clientes.

### 8.2 Multi-Server (Startup — $100-300/mês)

```
                    Cloudflare (DNS + CDN + DDoS)
                            │
            ┌───────────────┼───────────────┐
            │               │               │
    ┌───────┴───────┐ ┌────┴────┐ ┌───────┴───────┐
    │   K3s Node 1  │ │ K3s Node│ │   K3s Node 3  │
    │   (Control)   │ │ 2 (Wrk) │ │   (Worker)    │
    │               │ │         │ │               │
    │ Theia │ NATS  │ │ Agents  │ │ ML|LLM Pods   │
    └───────────────┘ └─────────┘ └───────────────┘
            │               │               │
            └───────────────┼───────────────┘
                            │
                    ┌───────┴───────┐
                    │   Volumes     │
                    │  (Longhorn)   │
                    └───────────────┘
```

**Setup com K3s e Longhorn:**

```yaml
# k3s-setup.sh
#!/bin/bash
NODES=("node1" "node2" "node3")

# Node 1: Control + Worker
curl -sfL https://get.k3s.io | sh -s - \
  --cluster-init \
  --tls-san node1.ideia.internal \
  --disable traefik \
  --write-kubeconfig-mode 644

TOKEN=$(cat /var/lib/rancher/k3s/server/token)

# Nodes 2 e 3: Workers
for node in "${NODES[@]:1}"; do
  ssh "$node" "curl -sfL https://get.k3s.io | \
    K3S_URL=https://node1:6443 \
    K3S_TOKEN=$TOKEN sh -"
done

# Helm charts
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager --namespace cert-manager
helm install ingress-nginx ingress-nginx/ingress-nginx
helm install longhorn longhorn/longhorn --namespace longhorn-system
helm install ideia ./charts/ideia --namespace ideia
```

**Custo:** 3 nós Hetzner $30 + load balancer $4 + managed DB $15 + Volumes $5 = **~$54/mês** (ou DigitalOcean $71/mês).
**Capacidade:** Até 50 usuários simultâneos, HA para Theia, escalabilidade horizontal de agentes.
**Backup:** Velero + MinIO snapshot.

### 8.3 Enterprise Multi-Region ($500-2000+/mês)

```
                        Cloudflare Global LB
                              │
              ┌───────────────┴───────────────┐
              │                                │
     us-east-1 (Primary)              eu-west-1 (Drill)
     ┌─────────────────────┐          ┌─────────────────────┐
     │   EKS Cluster       │          │   EKS Cluster       │
     │   ● Theia x3        │          │   ● Theia x2        │
     │   ● Agent pool x5   │          │   ● Agent pool x2   │
     │   ● NATS Cluster x3 │  ──WAL──▶│   ● NATS Cluster x3 │
     │   ● RDS Aurora      │          │   ● RDS Standby     │
     │   ● ElastiCache     │          │   ● ElastiCache     │
     │   ● MinIO HA x4     │  ──S3──▶│   ● S3 Cross-region │
     └─────────────────────┘          └─────────────────────┘
                                                                   
     Prometheus/Grafana (global view)
     ArgoCD (GitOps multi-cluster)
     OTel Collector (traces aggregated)
     External Secrets Operator (AWS Secrets)
```

**Componentes chave enterprise:**
- **K8s:** EKS (AWS) ou GKE Autopilot (GCP)
- **Service Mesh:** Istio ou Linkerd para mTLS + tracing
- **GitOps:** ArgoCD multi-cluster (App of Apps pattern)
- **Secrets:** External Secrets Operator + AWS Secrets Manager
- **Backup:** Velero + S3 cross-region
- **DR:** Active-Passive com failover automático (Route53 health checks + RDS read replica promotion)
- **Monitoring:** Prometheus + Grafana + Loki + Tempo (Grafana stack)
- **Cost:** 20-30 pods, 10-50 nós, banco multi-AZ, Redis cluster

### 8.4 Theia Cloud Deployment

Deploy do Theia Cloud requer atenção especial para workspaces persistentes:

```yaml
# theia-cloud.yaml — Theia Cloud em K8s
apiVersion: theia.cloud/v1beta1
kind: TheiaCloud
metadata:
  name: ideia-cloud
spec:
  replicas: 3
  version: "1.50.0"
  
  # Workspace persistence via PVC
  workspaceStorage:
    storageClassName: longhorn
    size: 10Gi
    accessModes: [ReadWriteOnce]
    
  # Plugins from OpenVSX
  plugins:
    registry: https://open-vsx.org
    installed:
      - vscode:git
      - vscode:python
      - redhat:java
  
  # Resource limits per workspace
  resources:
    requests: { cpu: "500m", memory: "512Mi" }
    limits: { cpu: "2", memory: "4Gi" }
    
  # Health checks
  livenessProbe:
    path: /health
  
  # Autoscaling
  autoscaling:
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilization: 70
```

**Estratégia de deploy Theia Cloud:**
- **Session affinity:** Sticky sessions via ingress (session cookie)
- **Workspace isolation:** Cada workspace em seu pod com seu volume
- **Plugin cache:** Sidecar container com plugin registry cache
- **Workspace eviction:** TTL de inatividade, backup antes de evict

---

## Apêndices

### A. Checklist de Deploy

- [ ] Dockerfile multi-stage otimizado
- [ ] Health checks configurados (liveness + readiness)
- [ ] Resource limits definidos (CPU + memória)
- [ ] Secrets via External Secrets Operator (não em variáveis)
- [ ] Logs estruturados JSON (stdout)
- [ ] OTel instrumentation ativa
- [ ] Backup automático configurado
- [ ] Certificado TLS (Let's Encrypt via cert-manager)
- [ ] Rate limiting por IP/usuario
- [ ] Monitoramento: Prometheus + Grafana
- [ ] Alertas configurados (PagerDuty / Slack)
- [ ] DR testado (pelo menos trimestral)

### B. Glossário

| Termo | Definição |
|-------|-----------|
| IaC | Infrastructure as Code — gerenciamento de infra via código declarativo |
| RPO | Recovery Point Objective — perda máxima aceitável de dados (tempo) |
| RTO | Recovery Time Objective — tempo máximo para recuperação |
| PITR | Point-in-Time Recovery — restore para qualquer momento no tempo |
| Egress | Tráfego de saída do provedor cloud (geralmente cobrado) |
| Spot/Preemptible | Instâncias com desconto (até 90%) que podem ser terminadas a qualquer momento |
| AZ | Availability Zone — datacenter isolado dentro de uma região cloud |
| WAL | Write-Ahead Log — log de transações do PostgreSQL para PITR |
| HA | High Availability — tolerância a falhas de componentes |
| DR | Disaster Recovery — recuperação após falha catastrófica |

### C. Referências

- AWS Well-Architected Framework: https://aws.amazon.com/architecture/well-architected/
- Google Cloud Architecture Framework: https://cloud.google.com/architecture/framework
- K3s Documentation: https://docs.k3s.io/
- OpenTofu Documentation: https://opentofu.org/docs/
- MinIO Deployment: https://min.io/docs/minio/container/index.html
- Cloudflare Tunnels: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
- Velero Backup: https://velero.io/docs/

---

> **Próximo:** Este documento alimenta a implementação de infra no roadmap. Recomenda-se criar `charts/ideia/` com Helm charts oficiais e scripts de setup K3s em `infra/`.
