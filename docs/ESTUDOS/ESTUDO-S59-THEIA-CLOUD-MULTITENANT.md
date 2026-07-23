# ESTUDO S59 — Theia Cloud Multi-Tenant Deployment for IDEIA

> **Arquitetura de implantacao multi-tenant do Theia Cloud: workspace management, container orchestration, session isolation, autenticacao e billing para a plataforma IDEIA**
> Data: 2026-07-22

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0 | 2026-07-22 | IDEIA Architecture Team | Versao inicial — Theia Cloud multi-tenant architecture, K8s orchestration, workspace isolation, session management, pricing, code examples, implementation roadmap, conexoes |

---

## Sumario

1. [Introducao](#1-introducao)
2. [Theia Cloud Architecture](#2-theia-cloud-architecture)
3. [Container Orchestration](#3-container-orchestration)
4. [Workspace Isolation](#4-workspace-isolation)
5. [Session Management](#5-session-management)
6. [Workspace Images](#6-workspace-images)
7. [User Management](#7-user-management)
8. [Resource Management](#8-resource-management)
9. [Networking](#9-networking)
10. [Persistence & Storage](#10-persistence--storage)
11. [Authentication & Authorization](#11-authentication--authorization)
12. [Monitoring & Observability](#12-monitoring--observability)
13. [Pricing Integration](#13-pricing-integration)
14. [Code Examples](#14-code-examples)
15. [Implementation Roadmap](#15-implementation-roadmap)
16. [Conexoes](#16-conexoes)

---

## 1. Introducao

### 1.1 Contexto

Em 2026, o desenvolvimento remoto em nuvem tornou-se o padrao para equipes de engenharia. Ferramentas como GitHub Codespaces, Devin (Cognition) e Cursor estabeleceram expectativas claras: ambiente de desenvolvimento acessivel do navegador, com maquinas pre-configuradas, persistencia de estado e colaboracao em tempo real. A IDEIA, construida sobre Eclipse Theia, ja possui a plataforma de editor via browser, mas carece de uma arquitetura de implantacao multi-tenant que permita oferecer workspaces como servico gerenciado.

### 1.2 Por que Theia Cloud

Eclipse Theia foi projetado para executar tanto em desktop (Electron) quanto em navegador. O Theia Cloud extende essa capacidade para multiplos usuarios simultaneos, cada um com seu proprio workspace isolado. Diferentemente de uma IDE desktop, o Theia Cloud requer:

| Requisito | Descricao |
|-----------|-----------|
| Multi-tenancy | Isolamento completo entre workspaces de diferentes usuarios/orgs |
| Container orchestration | Criacao/destruicao de pods K8s por sessao |
| Session persistence | Snapshot e restore de estado do workspace |
| Resource governance | Quotas de CPU, memoria, disco por usuario/org/plano |
| Identity federation | SSO OAuth2/OIDC com GitHub, GitLab, Google, email+senha |
| Usage metering | Tracking de computacao, armazenamento e transferencia para billing |
| High availability | Failover entre clusters, replicacao multi-regiao |

### 1.3 Casos de Uso

| Caso de Uso | Descricao | Requisitos Chave |
|-------------|-----------|------------------|
| Desenvolvedor individual | Workspace pessoal com imagem Node.js/Python | Quick start, auto-hibernacao, $5-20/mes |
| Startup (5-20 devs) | Workspaces compartilhados com templates de projeto | Team management, shared storage, $50-200/org/mes |
| Enterprise (100+ devs) | Workspaces com SSO, VPC peering, compliance SOC2 | VPC privada, audit log, IP allowlist, $500-5000/org/mes |
| Educacao | Workspaces temporarios para cursos e bootcamps | Session timeout, template-only, $1-2/student/mes |
| CI/CD ephemeral | Workspaces para execucao de pipelines | Criacao/destruicao rapida, sem persistencia |

### 1.4 Arquitetura Conceitual

```
                          INTERNET
                             |
                      [CloudFlare/LB]
                             |
                  +----------------------+
                  |   Ingress Gateway    |
                  |   (Traefik/nginx)    |
                  +---------+------------+
                            |
              +-------------+-------------+
              |             |             |
         [Auth API]   [Session API]   [Workspace API]
              |             |             |
         +----+-------------+-------------+----+
         |         Control Plane               |
         |  +-------------------------------+  |
         |  | Workspace Manager              |  |
         |  | Session Manager                |  |
         |  | User Manager                   |  |
         |  | Image Registry                 |  |
         |  | Usage Meter                    |  |
         |  | Quota Enforcer                 |  |
         |  +-------------------------------+  |
         +----+-------------+-------------+----+
              |             |             |
         +----+-------------+-------------+----+
         |         Kubernetes Cluster          |
         |  +--------+  +--------+  +--------+ |
         |  | Pod    |  | Pod    |  | Pod    | |
         |  | User A |  | User B |  | User C | |
         |  | Theia  |  | Theia  |  | Theia  | |
         |  +--------+  +--------+  +--------+ |
         |  +--------+  +--------+             |
         |  | PVC A  |  | PVC B  |             |
         |  +--------+  +--------+             |
         +-------------------------------------+
              |             |             |
         [S3-compatible] [Docker Reg.] [Monitoring]
```

### 1.5 Comparacao com Concorrentes

| Dimensao | GitHub Codespaces | Devin | Cursor | IDEIA Theia Cloud (alvo) |
|----------|------------------|-------|--------|-------------------------|
| Editor base | VS Code Web | VS Code fork | VS Code fork | Eclipse Theia |
| Container orchestration | K8s (interno) | VM por sessao | Cloud VM | K8s + CRD workspaces |
| Multi-tenant isolation | Namespace K8s | VM dedicada | VM dedicada | Pod + PVC + NetworkPolicy |
| Session timeout | 30min idle | 60min idle | 15min idle | Configuravel (5min-24h) |
| Custom images | Dev Container | Nao | Nao | Dockerfile + builder |
| Precos | $0.18/h (2-core) | $500/mes enterprise | $20/mes pro | $0.10-0.30/h por tier |
| Colaboracao real-time | Limited (VS Code Live Share) | Nao | Nao | Theia collaboration nativa |
| AI integrado | Copilot | Devin agents | Cursor AI | IDEIA agents (LangGraph) |
| Self-hosted | Nao (Codespaces only) | Nao | Nao | Sim (via Theia Cloud) |
| Audit log | Basico | Avancado | Basico | SHA-256 chain + compliance |

---

## 2. Theia Cloud Architecture

### 2.1 Eclipse Theia Cloud Overview

O Eclipse Theia Cloud e uma arquitetura de referencia para implantar o Theia como servico multi-tenant. Diferente do Theia desktop (single-user, electron), o Theia Cloud opera com:

- **Control Plane**: servicos que gerenciam workspaces, sessoes, usuarios e recursos
- **Data Plane**: pods K8s rodando a IDE Theia com backend Node.js + extensoes
- **Frontend Proxy**: servico que roteia requisicoes WebSocket/HTTP para o pod correto

### 2.2 Diferencas: Theia Desktop vs Theia Cloud

| Aspecto | Theia Desktop | Theia Cloud |
|---------|--------------|-------------|
| Execucao | Electron (Node.js + Chromium) | Navegador + Backend Node.js remoto |
| Instalacao | Download + instalacao local | Zero-install, acesso via URL |
| Workspace | Diretorio local | PVC montado em pod K8s |
| Extensions | npm install global/local | Empacotadas na imagem Docker |
| Terminal | Terminal local (node-pty) | Terminal remoto no pod |
| Debug | Processo local ou remote attach | Debug remoto no pod |
| File system | Sistema de arquivos local | PVC + git sync + S3 backup |
| Multi-user | Nao suportado | Nativo (cada usuario tem seu pod) |
| Colaboracao | Nao suportada | Nativa (Theia collaboration API) |

### 2.3 Componentes do Control Plane

```
                    CONTROL PLANE COMPONENTS

  +------------------+  +------------------+  +------------------+
  | WorkspaceManager  |  | SessionManager    |  | UserManager       |
  | - CRUD workspace  |  | - Create session  |  | - Register user   |
  | - State machine   |  | - Health check    |  | - OAuth2/OIDC     |
  | - Provision pod   |  | - Heartbeat       |  | - RBAC            |
  | - Hibernate       |  | - Resume          |  | - API tokens      |
  +------------------+  +------------------+  +------------------+
  +------------------+  +------------------+  +------------------+
  | ImageRegistry     |  | QuotaEnforcer     |  | UsageMeter        |
  | - Build image     |  | - Check limits    |  | - Track compute   |
  | - Cache layers    |  | - Block creation  |  | - Track storage   |
  | - Version tags    |  | - Tier mapping    |  | - Report usage    |
  +------------------+  +------------------+  +------------------+
```

### 2.4 Fluxo de Criacao de Workspace

```
Usuario                        Control Plane                    K8s API
   |                               |                               |
   |  POST /workspaces             |                               |
   |------------------------------>|                               |
   |                               |                               |
   |                               | Valida:                       |
   |                               |  - Auth token                 |
   |                               |  - Quota disponivel          |
   |                               |  - Imagem existe             |
   |                               |                               |
   |                               | Cria Workspace CR            |
   |                               |----------------------------->|
   |                               |                               |
   |                               | Monitora estado              |
   |                               |<--- Pod Created --------------|
   |                               |                               |
   |                               | Cria PVC                     |
   |                               |----------------------------->|
   |                               |                               |
   |                               | Cria Service + Ingress       |
   |                               |----------------------------->|
   |                               |                               |
   |  202 Accepted                 |                               |
   |<------------------------------|                               |
   |                               |                               |
   |  GET /workspaces/:id/status   |                               |
   |-------------------------------------------------------------->|
   |<-- Running (URL: user.ideia.dev) ----------------------------|
   |                               |                               |
   |  Connect via WebSocket        |                               |
   |==============================================================>|
```

### 2.5 Theia Backend no Pod

Cada pod K8s executa o backend Theia como processo Node.js:

```typescript
// @theia/cloud: backend entrypoint
import { Container } from '@theia/core/shared/inversify';
import { BackendApplication } from '@theia/core/lib/node/backend-application';
import { backendContainer } from '@theia/core/lib/node/backend-container';
import { CloudWorkspaceServer } from './cloud-workspace-server';

async function startTheiaBackend(): Promise<void> {
  const container = new Container();
  container.load(backendContainer);

  // Bind cloud-specific services
  container.bind(CloudWorkspaceServer).toSelf().inSingletonScope();
  container.bind(WorkspaceLockService).toSelf().inSingletonScope();

  const app = container.get(BackendApplication);
  await app.start(3000);
}

startTheiaBackend().catch(console.error);
```

## 3. Container Orchestration

### 3.1 Kubernetes Cluster Topology

```
                        +---------------------------+
                        |   Management Cluster      |
                        |   (Control Plane)         |
                        +-------------+-------------+
                                      |
        +-----------------------------+----------------------------+
        |                             |                            |
+-------v--------+          +--------v--------+         +--------v--------+
|  Workload      |          |  Workload       |         |  Workload       |
|  Cluster (us1) |          |  Cluster (eu1)  |         |  Cluster (ap1)  |
|                |          |                  |         |                 |
| Namespaces:    |          | Namespaces:      |         | Namespaces:     |
| - org-abc-dev  |          | - org-def-prod  |         | - org-ghi-stag  |
| - org-abc-prod |          | - org-def-stag  |         |                 |
|                |          |                  |         |                 |
| Node pools:    |          | Node pools:      |         | Node pools:     |
| - spot (dev)   |          | - on-demand      |         | - on-demand     |
| - on-demand    |          | - gpu (ML dev)   |         |                 |
+----------------+          +------------------+         +-----------------+
```

### 3.2 Workspace Custom Resource Definition (CRD)

```typescript
// @ideia/cloud-operator: workspace-crd.ts

export interface WorkspaceSpec {
  userId: string;
  orgId: string;
  plan: 'free' | 'pro' | 'enterprise';
  template: string;
  image: string;
  imageTag: string;
  resources: {
    cpu: string;       // '2' | '4' | '8'
    memory: string;    // '4Gi' | '8Gi' | '16Gi' | '32Gi'
    disk: string;      // '10Gi' | '50Gi' | '100Gi' | '500Gi'
    gpu?: {
      count: number;
      type: 't4' | 'l4' | 'a100';
    };
  };
  timeouts: {
    idleMinutes: number;
    maxLifetimeHours: number;
  };
  networking: {
    exposePorts: number[];
    allowSSH: boolean;
    ipAllowlist?: string[];
  };
  features: {
    collaboration: boolean;
    debug: boolean;
    terminal: boolean;
    ai: boolean;
  };
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface WorkspaceStatus {
  phase: WorkspacePhase;
  podName: string;
  podIP: string;
  ingressURL: string;
  startedAt: string;
  lastHeartbeat: string;
  resourceUsage: {
    currentCPU: string;
    currentMemory: string;
    currentDisk: string;
  };
  conditions: WorkspaceCondition[];
}

export type WorkspacePhase =
  | 'Pending'
  | 'Provisioning'
  | 'Running'
  | 'Hibernating'
  | 'Hibernated'
  | 'Resuming'
  | 'Terminating'
  | 'Failed';

export interface WorkspaceCondition {
  type: 'Provisioned' | 'Ready' | 'Hibernated' | 'Failed';
  status: 'True' | 'False' | 'Unknown';
  reason: string;
  message: string;
  lastTransitionTime: string;
}
```

### 3.3 Pod Lifecycle

```
  +-----------+       +--------------+       +----------+       +-----------+
  | Pending   | ----> | Provisioning | ----> | Running  | ----> | Hibernated |
  | (CR criado|       | (Criando pod, |       | (IDE ativa|       | (PVC retido |
  |  sem pod)  |       |  PVC, ingress)|       |  em uso)  |       |  pod removido|
  +-----------+       +--------------+       +----------+       +-----------+
                                                    |                |
                                                    | idle timeout   | resume
                                                    v                v
                                              +-----------+     +----------+
                                              | Hibernating|--->| Running  |
                                              | (Snapshot, |    | (pod     |
                                              |  drain pod)|    | recriado)|
                                              +-----------+    +----------+
                                                    |
                                                    | fatal error
                                                    v
                                              +-----------+
                                              | Failed    |
                                              | (Logs +    |
                                              |  cleanup)  |
                                              +-----------+
```

### 3.4 Resource Quotas

```typescript
// @ideia/cloud-operator: resource-quotas.ts

export const PLAN_LIMITS: Record<string, WorkspaceLimits> = {
  free: {
    maxWorkspaces: 2,
    maxCPU: '2',
    maxMemory: '4Gi',
    maxDisk: '10Gi',
    maxStorage: '5Gi',
    idleTimeout: 30,
    maxLifetime: 4,
    allowedImages: ['node:18', 'python:3.11', 'go:1.21'],
    features: { collaboration: false, debug: true, terminal: true, ai: true },
    pricePerHour: 0,
  },
  pro: {
    maxWorkspaces: 10,
    maxCPU: '8',
    maxMemory: '32Gi',
    maxDisk: '100Gi',
    maxStorage: '50Gi',
    idleTimeout: 120,
    maxLifetime: 24,
    allowedImages: ['*'],
    features: { collaboration: true, debug: true, terminal: true, ai: true },
    pricePerHour: 0.18,
  },
  enterprise: {
    maxWorkspaces: 100,
    maxCPU: '32',
    maxMemory: '128Gi',
    maxDisk: '500Gi',
    maxStorage: '500Gi',
    idleTimeout: 1440,
    maxLifetime: 168,
    allowedImages: ['*', 'custom'],
    features: { collaboration: true, debug: true, terminal: true, ai: true },
    pricePerHour: 0.30,
  },
};

export interface WorkspaceLimits {
  maxWorkspaces: number;
  maxCPU: string;
  maxMemory: string;
  maxDisk: string;
  maxStorage: string;
  idleTimeout: number;
  maxLifetime: number;
  allowedImages: string[];
  features: Record<string, boolean>;
  pricePerHour: number;
}
```

### 3.5 Auto-Scaling

| Gatilho | Acao | Metricas |
|---------|------|----------|
| Node CPU > 70% por 5min | Adicionar node ao pool | kube_node_status_allocatable_cpu_cores |
| Pod pending > 10 por 2min | Adicionar node spot | kube_pod_status_phase{pending} |
| Node CPU < 30% por 30min | Remover node (drain) | kube_node_status_capacity_cpu_cores |
| Workspace count > 80% do cluster | Provisionar novo cluster | Workspace CR count |
| GPU utilization > 60% | Adicionar node GPU | DCGM_FI_DEV_GPU_UTIL |

### 3.6 Idle Workspace Hibernation

```typescript
// @ideia/cloud-operator: hibernation-controller.ts

export class HibernationController {
  private readonly idleCheckInterval = 60_000;
  private readonly gracePeriod = 30_000;

  async checkAndHibernate(): Promise<void> {
    const running = await this.listRunningWorkspaces();
    for (const ws of running) {
      if (this.isIdle(ws)) {
        await this.hibernateWorkspace(ws);
      }
    }
  }

  private isIdle(ws: Workspace): boolean {
    const idleMs = Date.now() - new Date(ws.status.lastHeartbeat).getTime();
    const timeoutMs = ws.spec.timeouts.idleMinutes * 60_000;
    return idleMs > timeoutMs;
  }

  async hibernateWorkspace(ws: Workspace): Promise<void> {
    await this.sendShutdownSignal(ws);
    await this.delay(this.gracePeriod);
    await this.snapshotPVC(ws);
    await this.deletePod(ws);
    ws.status.phase = 'Hibernated';
    await this.updateWorkspaceStatus(ws);
    await this.eventBus.publish('workspace.hibernated', {
      workspaceId: ws.metadata.id,
      userId: ws.spec.userId,
      snapshotPath: `snapshots/${ws.metadata.id}/latest.tar.gz`,
    });
  }

  async resumeWorkspace(ws: Workspace): Promise<void> {
    ws.status.phase = 'Resuming';
    await this.updateWorkspaceStatus(ws);
    await this.createPod(ws);
    await this.createIngress(ws);
    ws.status.phase = 'Running';
    await this.updateWorkspaceStatus(ws);
  }

  private async snapshotPVC(ws: Workspace): Promise<void> {
    const podName = ws.status.podName;
    const snapshotCmd = 'tar czf - /home/project | aws s3 cp - s3://ideia-snapshots/' +
      ws.metadata.id + '/' + Date.now() + '.tar.gz';
    await this.execInPod(podName, ['sh', '-c', snapshotCmd]);
  }
}
```

---

## 4. Workspace Isolation

### 4.1 Modelo de Multi-Tenancy

| Camada | Mecanismo de Isolamento | Nivel |
|--------|------------------------|-------|
| Cluster | Namespace K8s por organizacao | Organizacional |
| Pod | Pod K8s por workspace (sem compartilhamento) | Workspace |
| Rede | NetworkPolicy deny-ingress por padrao | Pod |
| Filesystem | PVC exclusivo por workspace + readOnlyRootFilesystem | Pod |
| Processos | Container rodando como non-root, seccomp, AppArmor | Container |
| Extensions | Theia plugin host isolado por processo | Processo |
| Rede externa | Egress filter por NetworkPolicy | Namespace |

### 4.2 Namespace Topology por Organizacao

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: org-abc123-prod
  labels:
    organization: abc123
    environment: prod
    tenant: isolated
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: org-abc123-prod
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-control-plane
  namespace: org-abc123-prod
spec:
  podSelector: {}
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          role: control-plane
    ports:
    - port: 3000
    - port: 3001
```

### 4.3 Pod Security Context

```typescript
// @ideia/cloud-operator: pod-security.ts

export function createPodSecurityContext(): Partial<PodSecurityContext> {
  return {
    runAsNonRoot: true,
    runAsUser: 1000,
    runAsGroup: 1000,
    fsGroup: 1000,
    seccompProfile: {
      type: 'RuntimeDefault',
    },
  };
}

export function createContainerSecurityContext(): Partial<SecurityContext> {
  return {
    allowPrivilegeEscalation: false,
    privileged: false,
    readOnlyRootFilesystem: true,
    capabilities: {
      drop: ['ALL'],
    },
    seccompProfile: {
      type: 'RuntimeDefault',
    },
  };
}
```

### 4.4 Tenant Boundaries Matrix

| Resource | Tenant A | Tenant B | Isolamento |
|----------|----------|----------|------------|
| Namespace | org-aaa | org-bbb | Fisico (K8s namespace) |
| Pod | ws-1-pod | ws-2-pod | Fisico (pod separado) |
| PVC | ws-1-pvc | ws-2-pvc | Fisico (volume separado) |
| Service | ws-1-svc | ws-2-svc | Logico (DNS separado) |
| Ingress | user-a.ideia.dev | user-b.ideia.dev | DNS (subdominio) |
| Secrets | ws-1-secrets | ws-2-secrets | Fisico (K8s secret) |
| ConfigMap | ws-1-config | ws-2-config | Fisico (ConfigMap) |
| ResourceQuota | Tenant A quota | Tenant B quota | Fisico (ResourceQuota) |

### 4.5 Filesystem Isolation

```typescript
// @ideia/cloud-operator: pvc-provisioner.ts

export class PVCProvisioner {
  async createWorkspacePVC(ws: Workspace): Promise<V1PersistentVolumeClaim> {
    const storageClass = this.getStorageClass(ws.spec.plan);

    const pvc: V1PersistentVolumeClaim = {
      apiVersion: 'v1',
      kind: 'PersistentVolumeClaim',
      metadata: {
        name: 'ws-' + ws.metadata.id,
        namespace: ws.spec.orgId,
        labels: {
          'app.kubernetes.io/managed-by': 'ideia-cloud',
          'ideia.dev/workspace-id': ws.metadata.id,
          'ideia.dev/user-id': ws.spec.userId,
        },
      },
      spec: {
        accessModes: ['ReadWriteOnce'],
        resources: {
          requests: {
            storage: ws.spec.resources.disk,
          },
        },
        storageClassName: storageClass,
      },
    };

    return this.k8s.createPVC(pvc);
  }

  private getStorageClass(plan: string): string {
    switch (plan) {
      case 'free': return 'ssd-retain-1d';
      case 'pro': return 'ssd-retain-30d';
      case 'enterprise': return 'ssd-encrypted-retain-90d';
      default: return 'ssd-retain-1d';
    }
  }
}
```

### 4.6 NetworkPolicy Templates

```typescript
// @ideia/cloud-operator: network-policy-factory.ts

export function createDefaultNetworkPolicy(namespace: string, wsId: string): V1NetworkPolicy {
  return {
    apiVersion: 'networking.k8s.io/v1',
    kind: 'NetworkPolicy',
    metadata: {
      name: 'ws-' + wsId + '-default-deny',
      namespace,
    },
    spec: {
      podSelector: { matchLabels: { 'ideia.dev/workspace-id': wsId } },
      policyTypes: ['Ingress', 'Egress'],
      ingress: [
        {
          from: [
            { namespaceSelector: { matchLabels: { 'ideia.dev/role': 'control-plane' } } },
            { podSelector: { matchLabels: { 'ideia.dev/workspace-id': wsId } } },
          ],
          ports: [
            { port: 3000, protocol: 'TCP' },
            { port: 3001, protocol: 'TCP' },
          ],
        },
      ],
      egress: [
        {
          to: [
            { ipBlock: { cidr: '0.0.0.0/0', except: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'] } },
          ],
        },
      ],
    },
  };
}
```

---

## 5. Session Management

### 5.1 Session Lifecycle

```
  +-----------+    +-------------+    +-----------+    +------------+
  | Creating  | -> | Initializing | -> | Active   | -> | Terminated |
  | (CR criado|    | (pod pronto, |    | (IDE     |    | (pod + PVC |
  |  + ingress|    |  aguardando  |    |  operando|    |  removidos)|
  |  criados) |    |  primeira    |    |  + heart- |    +-----------+
  +-----------+    |  conexao)   |    |  beat)   |
                   +-------------+    +----+-----+
                                           |
                              +-----------+-----------+
                              |                       |
                         +---------+           +------------+
                         | Idle    |           | Hibernated |
                         | (30min  |           | (PVC salvo,|
                         |  no heart|           |  pod deletado|
                         |  beat)  |           +------------+
                         +----+----+                |
                              | resume              | resume
                              +-------+-------------+
                                      |
                                 +---------+
                                 | Active   | (pod recriado)
                                 +---------+
```

### 5.2 Session Creation Sources

```typescript
// @ideia/session-manager: session-creator.ts

export type SessionSource =
  | { type: 'blank'; template: string }
  | { type: 'snapshot'; snapshotId: string }
  | { type: 'github'; repo: string; branch?: string; subdir?: string }
  | { type: 'gitlab'; repo: string; branch?: string }
  | { type: 'clone'; sourceSessionId: string }
  | { type: 'template'; templateName: string; variables: Record<string, string> };

export class SessionCreator {
  async createSession(userId: string, source: SessionSource): Promise<Session> {
    const ws = await this.workspaceManager.createWorkspace(userId);

    switch (source.type) {
      case 'blank':
        await this.cloneTemplate(ws, source.template);
        break;
      case 'snapshot':
        await this.restoreFromSnapshot(ws, source.snapshotId);
        break;
      case 'github':
        await this.gitClone(ws, source.repo, source.branch);
        if (source.subdir) {
          await this.setWorkspaceRoot(ws, source.subdir);
        }
        break;
      case 'clone':
        await this.cloneSession(ws, source.sourceSessionId);
        break;
      case 'template':
        await this.applyTemplate(ws, source.templateName, source.variables);
        break;
    }

    return this.sessionManager.startSession(ws);
  }

  private async gitClone(ws: Workspace, repo: string, branch?: string): Promise<void> {
    const url = repo.startsWith('http') ? repo : 'https://github.com/' + repo + '.git';
    const cmd = branch
      ? 'git clone --depth 1 --branch ' + branch + ' ' + url + ' /home/project'
      : 'git clone --depth 1 ' + url + ' /home/project';
    await this.execInPod(ws, ['sh', '-c', cmd]);
  }
}
```

### 5.3 Session State Persistence

```typescript
// @ideia/session-manager: session-state.ts

export interface SessionState {
  sessionId: string;
  userId: string;
  workspaceId: string;
  status: SessionStatus;
  createdAt: string;
  lastActiveAt: string;
  editorState: {
    openFiles: string[];
    cursorPosition: { line: number; column: number };
    activeEditor: string;
    splitLayout: any;
  };
  terminalState: {
    sessions: TerminalSession[];
    history: string[];
  };
  extensionStates: Record<string, any>;
  breakpoints: Breakpoint[];
}

export class SessionStateManager {
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  }

  async saveState(sessionId: string, state: SessionState): Promise<void> {
    const key = 'session:' + sessionId + ':state';
    await this.redis.set(key, JSON.stringify(state));

    await this.s3.putObject({
      Bucket: 'ideia-session-states',
      Key: 'sessions/' + sessionId + '/' + Date.now() + '.json',
      Body: JSON.stringify(state),
    });
  }

  async restoreState(sessionId: string): Promise<SessionState | null> {
    const key = 'session:' + sessionId + ':state';
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached);

    const latest = await this.s3.listObjectsV2({
      Bucket: 'ideia-session-states',
      Prefix: 'sessions/' + sessionId + '/',
    });

    if (!latest.Contents || latest.Contents.length === 0) return null;

    const lastKey = latest.Contents.sort(
      (a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0)
    )[0].Key;

    const data = await this.s3.getObject({ Bucket: 'ideia-session-states', Key: lastKey });
    return JSON.parse(await data.Body!.transformToString());
  }

  async heartbeat(sessionId: string): Promise<void> {
    const key = 'session:' + sessionId + ':heartbeat';
    await this.redis.set(key, Date.now().toString(), 'EX', 60);
  }
}
```

### 5.4 Session Timeout & Auto-Hibernation

| Tier | Idle Timeout | Max Session | Apos Timeout |
|------|-------------|-------------|--------------|
| Free | 30 min | 4 horas | Hibernacao + snapshot, pod deletado |
| Pro | 2 horas | 24 horas | Hibernacao + snapshot, pod deletado |
| Enterprise | 24 horas | 168 horas | Hibernacao + snapshot, pod deletado |
| Educacao | 15 min | 2 horas | Terminacao (sem snapshot para ephemeral) |

### 5.5 Collaboration Sessions

```typescript
// @ideia/session-manager: collaboration.ts

export class CollaborationManager {
  async shareSession(sessionId: string, invitedUserId: string, role: 'editor' | 'viewer'): Promise<void> {
    const session = await this.sessionManager.getSession(sessionId);

    await this.redis.hset('session:' + sessionId + ':acl', invitedUserId, role);
    await this.eventBus.publish('session.collaborator.added', {
      sessionId,
      userId: invitedUserId,
      role,
    });

    await this.notificationService.send(invitedUserId, {
      type: 'collaboration_invite',
      title: 'You have been invited to collaborate',
      data: { sessionId, inviterId: session.userId },
      actions: [
        { label: 'Join', url: 'https://ideia.dev/sessions/' + sessionId + '/join' },
      ],
    });
  }

  async getSessionParticipants(sessionId: string): Promise<Participant[]> {
    const acl = await this.redis.hgetall('session:' + sessionId + ':acl');
    const participants: Participant[] = [];

    for (const [userId, role] of Object.entries(acl)) {
      const connected = await this.redis.sismember('session:' + sessionId + ':connected', userId);
      participants.push({
        userId,
        role: role as 'editor' | 'viewer',
        connected: connected === 1,
        joinedAt: await this.redis.hget('session:' + sessionId + ':joined', userId) || '',
      });
    }

    return participants;
  }
}
```

### 5.6 Session Recording for Audit

```typescript
// @ideia/audit: session-recorder.ts

export interface SessionRecordEntry {
  timestamp: string;
  sessionId: string;
  userId: string;
  action: string;
  details: Record<string, unknown>;
  hash: string;
  previousHash: string;
}

export class SessionRecorder {
  private readonly auditChain: AuditChain;

  async recordAction(
    sessionId: string,
    userId: string,
    action: string,
    details: Record<string, unknown>
  ): Promise<void> {
    const previousEntry = await this.getLastEntry(sessionId);
    const previousHash = previousEntry?.hash || '0'.repeat(64);

    const entry: SessionRecordEntry = {
      timestamp: new Date().toISOString(),
      sessionId,
      userId,
      action,
      details,
      previousHash,
      hash: '',
    };

    entry.hash = this.computeHash(entry);
    await this.storeEntry(entry);
  }

  private computeHash(entry: Omit<SessionRecordEntry, 'hash'>): string {
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(entry, Object.keys(entry).sort()))
      .digest('hex');
  }

  private async getLastEntry(sessionId: string): Promise<SessionRecordEntry | null> {
    const entries = await this.s3.listObjectsV2({
      Bucket: 'ideia-audit-logs',
      Prefix: 'sessions/' + sessionId + '/',
    });

    if (!entries.Contents || entries.Contents.length === 0) return null;

    const lastKey = entries.Contents.sort(
      (a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0)
    )[0].Key;

    const data = await this.s3.getObject({ Bucket: 'ideia-audit-logs', Key: lastKey });
    return JSON.parse(await data.Body!.transformToString());
  }
}
```

---

## 6. Workspace Images

### 6.1 Pre-Built Images Catalog

| Image | Tags | Tamanho | Linguagens | Ferramentas |
|-------|------|---------|------------|-------------|
| ideia/base:latest | 18, 20, 22 | 450MB | Node.js, Python | git, curl, jq, vim |
| ideia/node:22 | 22, 22-slim | 680MB | Node.js 22, npm, yarn, pnpm | TypeScript, ESLint, Jest |
| ideia/python:3.12 | 3.12, 3.12-slim | 720MB | Python 3.12, pip, poetry | ruff, mypy, pytest |
| ideia/go:1.22 | 1.22, 1.22-slim | 550MB | Go 1.22 | golangci-lint, delve |
| ideia/rust:1.78 | 1.78, 1.78-slim | 1.2GB | Rust 1.78, cargo | clippy, rustfmt, rust-analyzer |
| ideia/java:21 | 21, 21-slim | 900MB | Java 21, Maven, Gradle | JDT LS, checkstyle |
| ideia/dotnet:8.0 | 8.0, 8.0-slim | 850MB | .NET 8.0, nuget | omnisharp, dotnet-format |
| ideia/full:latest | latest | 2.8GB | Todas as linguagens | Tudo incluido |
| ideia/ai:latest | latest | 3.5GB | Python + Node.js + GPU drivers | CUDA 12, PyTorch, TensorFlow, vLLM |

### 6.2 Custom Image Builder

```typescript
// @ideia/image-registry: image-builder.ts

export interface ImageBuildRequest {
  userId: string;
  orgId: string;
  baseImage: string;
  packages?: string[];
  npmPackages?: string[];
  pipPackages?: string[];
  goPackages?: string[];
  envVars?: Record<string, string>;
  userScript?: string;
  tag: string;
}

export class ImageBuilder {
  private readonly docker: Docker;

  async buildImage(request: ImageBuildRequest): Promise<ImageBuildResult> {
    const dockerfile = this.generateDockerfile(request);
    const imageName = 'ideia-custom/' + request.orgId + '/' + request.userId + ':' + request.tag;

    const buildDir = path.join(os.tmpdir(), 'ideia-build-' + uuid.v4());
    await fs.mkdir(buildDir, { recursive: true });
    await fs.writeFile(path.join(buildDir, 'Dockerfile'), dockerfile);

    try {
      const stream = await this.docker.engine.buildImage(
        { src: [buildDir], context: buildDir },
        { t: imageName, rm: true, forcerm: true }
      );

      await new Promise<void>((resolve, reject) => {
        this.docker.engine.modem.followProgress(
          stream,
          (err: Error | null) => (err ? reject(err) : resolve()),
          (event: any) => {
            if (event.error) reject(new Error(event.error));
          }
        );
      });

      await this.docker.engine.pushImage(imageName, {});

      return {
        imageName,
        tag: request.tag,
        size: await this.getImageSize(imageName),
        digest: await this.getImageDigest(imageName),
        buildTime: 0,
      };
    } finally {
      await fs.rm(buildDir, { recursive: true, force: true });
    }
  }

  private generateDockerfile(req: ImageBuildRequest): string {
    const lines: string[] = [];
    lines.push('FROM ' + req.baseImage);
    lines.push('');
    lines.push('LABEL ideia.user-id="' + req.userId + '"');
    lines.push('LABEL ideia.org-id="' + req.orgId + '"');
    lines.push('');

    if (req.envVars) {
      for (const [k, v] of Object.entries(req.envVars)) {
        lines.push('ENV ' + k + '=' + v);
      }
      lines.push('');
    }

    if (req.npmPackages && req.npmPackages.length > 0) {
      lines.push('RUN npm install -g ' + req.npmPackages.join(' '));
      lines.push('');
    }

    if (req.pipPackages && req.pipPackages.length > 0) {
      lines.push('RUN pip install ' + req.pipPackages.join(' '));
      lines.push('');
    }

    if (req.packages && req.packages.length > 0) {
      lines.push('RUN apt-get update && apt-get install -y ' + req.packages.join(' ') + ' && rm -rf /var/lib/apt/lists/*');
      lines.push('');
    }

    lines.push('EXPOSE 3000');
    lines.push('USER ideia');
    lines.push('WORKDIR /home/project');
    lines.push('CMD ["node", "/ideia-backend/src/main.js"]');

    return lines.join('\n');
  }
}
```

### 6.3 Image Caching Strategy

| Cache Level | Mecanismo | Hit Rate | Descricao |
|-------------|-----------|----------|-----------|
| Layer cache | Docker layer caching | 80% | Camadas reutilizadas entre builds |
| Registry cache | Docker registry mirror | 60% | Pull de camadas de mirror local |
| Node module cache | Volume compartilhado para node_modules | 70% | Evita npm install em cada pod |
| PIP cache | Volume para ~/.cache/pip | 50% | Cache de pacotes Python |
| Go module cache | Volume para ~/go/pkg/mod | 60% | Cache de modulos Go |

### 6.4 Air-Gapped Images for Enterprise

```typescript
// @ideia/image-registry: airgap-sync.ts

export interface AirGapConfig {
  enterpriseId: string;
  images: Array<{ name: string; tag: string }>;
  targetRegistry: string;
  targetRegistryCredentials: { username: string; password: string };
}

export class AirGapSync {
  async syncToAirGapped(config: AirGapConfig): Promise<void> {
    for (const image of config.images) {
      const sourceRef = 'docker.io/ideia/' + image.name + ':' + image.tag;
      const targetRef = config.targetRegistry + '/ideia/' + image.name + ':' + image.tag;

      await this.docker.engine.pull(sourceRef, {});
      await this.docker.engine.tag(sourceRef, targetRef);

      const auth = Buffer.from(
        config.targetRegistryCredentials.username + ':' + config.targetRegistryCredentials.password
      ).toString('base64');

      await this.docker.engine.push(targetRef, {
        authconfig: { auth },
      });
    }
  }
}
```

---

## 7. User Management

### 7.1 Registration Flows

```typescript
// @ideia/user-manager: registration.ts

export type AuthProvider = 'github' | 'gitlab' | 'google' | 'email' | 'saml' | 'oidc';

export class UserRegistrationService {
  async registerWithOAuth2(provider: AuthProvider, code: string): Promise<UserSession> {
    const tokens = await this.exchangeCode(provider, code);
    const profile = await this.getProfile(provider, tokens.accessToken);

    let user = await this.userRepo.findByExternalId(provider, profile.id);

    if (!user) {
      user = await this.userRepo.create({
        externalId: profile.id,
        provider,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        plan: 'free',
        createdAt: new Date().toISOString(),
      });

      const org = await this.orgRepo.create({
        name: profile.name + "'s Organization",
        ownerId: user.id,
        plan: 'free',
      });

      user.defaultOrgId = org.id;
      await this.userRepo.update(user);
    }

    return this.createSession(user, provider);
  }

  async registerWithEmail(email: string, password: string): Promise<UserSession> {
    const existing = await this.userRepo.findByEmail(email);
    if (existing) throw new AppError('EMAIL_EXISTS', 'Email already registered', 409);

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await this.userRepo.create({
      email,
      passwordHash: hashedPassword,
      name: email.split('@')[0],
      plan: 'free',
      createdAt: new Date().toISOString(),
    });

    const org = await this.orgRepo.create({
      name: user.name + "'s Organization",
      ownerId: user.id,
      plan: 'free',
    });

    return this.createSession(user, 'email');
  }

  async createSession(user: User, provider: AuthProvider): Promise<UserSession> {
    const jti = uuid.v4();
    const now = Math.floor(Date.now() / 1000);

    const accessToken = await this.jwt.sign({
      sub: user.id,
      org: user.defaultOrgId,
      plan: user.plan,
      jti,
      iat: now,
      exp: now + 3600,
    });

    const refreshToken = await this.jwt.sign(
      { sub: user.id, jti: uuid.v4(), iat: now, exp: now + 2592000 },
      process.env.JWT_REFRESH_SECRET!
    );

    return { accessToken, refreshToken, expiresIn: 3600, user: { id: user.id, name: user.name, email: user.email, plan: user.plan } };
  }
}
```

### 7.2 Organization & Team Management

```typescript
// @ideia/user-manager: organization-service.ts

export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';
export type OrgPlan = 'free' | 'pro' | 'enterprise' | 'education';

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  plan: OrgPlan;
  createdAt: string;
  settings: {
    maxMembers: number;
    maxWorkspaces: number;
    idleTimeout: number;
    allowedImages: string[];
    enforceSSO: boolean;
    ssoProvider?: string;
    auditRetentionDays: number;
  };
}

export class OrganizationService {
  async addMember(orgId: string, email: string, role: OrgRole): Promise<void> {
    const org = await this.orgRepo.findById(orgId);
    if (!org) throw new AppError('ORG_NOT_FOUND', 'Organization not found', 404);

    const memberCount = await this.orgRepo.countMembers(orgId);
    if (memberCount >= org.settings.maxMembers) {
      throw new AppError('ORG_MEMBER_LIMIT', 'Organization member limit reached', 403);
    }

    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new AppError('USER_NOT_FOUND', 'User not found', 404);

    const existing = await this.orgRepo.findMember(orgId, user.id);
    if (existing) throw new AppError('ALREADY_MEMBER', 'User is already a member', 409);

    await this.orgRepo.addMember({
      orgId,
      userId: user.id,
      role,
      invitedAt: new Date().toISOString(),
      joinedAt: null,
    });

    await this.notificationService.sendInvitation(email, org.name, role, 'https://ideia.dev/orgs/' + orgId + '/accept');
  }
}
```

### 7.3 Role-Based Access Control

| Role | Criar Workspace | Gerenciar Membros | Configurar Org | Ver Audit Log | Faturas | API Tokens |
|------|----------------|-------------------|----------------|--------------|---------|------------|
| Owner | Sim | Sim | Sim | Sim | Sim | Sim |
| Admin | Sim | Sim | Sim | Sim | Nao | Sim |
| Member | Sim | Nao | Nao | Proprio | Nao | Sim |
| Viewer | Nao | Nao | Nao | Proprio | Nao | Apenas leitura |

### 7.4 API Token Management

```typescript
// @ideia/user-manager: api-token-service.ts

export interface ApiToken {
  id: string;
  userId: string;
  name: string;
  prefix: string;
  scopes: TokenScope[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export type TokenScope =
  | 'workspace:create' | 'workspace:read' | 'workspace:delete' | 'workspace:exec'
  | 'session:read' | 'session:write' | 'user:read' | 'org:read' | 'billing:read' | 'audit:read';

export class ApiTokenService {
  async createToken(userId: string, name: string, scopes: TokenScope[], expiresInDays?: number): Promise<{ token: string; data: ApiToken }> {
    const tokenBytes = crypto.randomBytes(48);
    const token = 'ideia_' + tokenBytes.toString('base64url');
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    const apiToken: ApiToken = {
      id: uuid.v4(),
      userId,
      name,
      prefix: token.substring(0, 12),
      scopes,
      expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86400000).toISOString() : null,
      lastUsedAt: null,
      createdAt: new Date().toISOString(),
    };

    await this.tokenRepo.create({ ...apiToken, hash });
    return { token, data: apiToken };
  }

  async validateToken(token: string): Promise<{ userId: string; scopes: TokenScope[] } | null> {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const stored = await this.tokenRepo.findByHash(hash);
    if (!stored) return null;
    if (stored.expiresAt && new Date(stored.expiresAt) < new Date()) return null;
    await this.tokenRepo.updateLastUsed(stored.id);
    return { userId: stored.userId, scopes: stored.scopes };
  }
}
```

---

## 8. Resource Management

### 8.1 Quota Enforcement

```typescript
// @ideia/quota-enforcer: quota-service.ts

export interface QuotaCheck {
  allowed: boolean;
  reason?: string;
  current: ResourceUsage;
  limit: ResourceLimits;
  remaining: ResourceLimits;
}

export class QuotaEnforcer {
  async checkCreation(userId: string, orgId: string, workspaceSpec: Partial<WorkspaceSpec>): Promise<QuotaCheck> {
    const org = await this.orgRepo.findById(orgId);
    const planConfig = PLAN_LIMITS[org.plan] || PLAN_LIMITS.free;
    const currentUsage = await this.usageMeter.getCurrentUsage(orgId);

    const maxCPU = this.parseCPU(planConfig.maxCPU);
    const requestedCPU = this.parseCPU(workspaceSpec.resources?.cpu || '2');

    if (currentUsage.totalCPU + requestedCPU > maxCPU) {
      return { allowed: false, reason: 'CPU limit exceeded: ' + (currentUsage.totalCPU + requestedCPU) + ' > ' + maxCPU + ' cores', current: currentUsage, limit: planConfig, remaining: { cpu: (maxCPU - currentUsage.totalCPU).toString(), memory: '', disk: '' } };
    }

    const userWorkspaceCount = await this.workspaceManager.countByUser(orgId, userId);
    if (userWorkspaceCount >= planConfig.maxWorkspaces) {
      return { allowed: false, reason: 'Workspace limit reached: ' + userWorkspaceCount + ' >= ' + planConfig.maxWorkspaces, current: currentUsage, limit: planConfig, remaining: { cpu: '', memory: '', disk: '' } };
    }

    return { allowed: true, current: currentUsage, limit: planConfig, remaining: await this.computeRemaining(orgId, planConfig, currentUsage) };
  }

  private parseCPU(cpu: string): number {
    return parseInt(cpu) || 0;
  }

  private async computeRemaining(orgId: string, limits: WorkspaceLimits, usage: ResourceUsage): Promise<ResourceLimits> {
    return {
      cpu: (this.parseCPU(limits.maxCPU) - usage.totalCPU).toString(),
      memory: this.subtractMemory(limits.maxMemory, usage.totalMemory),
      disk: this.subtractDisk(limits.maxDisk, usage.totalDisk),
    };
  }

  private subtractMemory(limit: string, used: string): string {
    const limitBytes = this.parseMemoryBytes(limit);
    const usedBytes = this.parseMemoryBytes(used);
    const remaining = Math.max(0, limitBytes - usedBytes);
    return Math.floor(remaining / (1024 * 1024 * 1024)) + 'Gi';
  }

  private subtractDisk(limit: string, used: string): string {
    const limitBytes = this.parseDiskBytes(limit);
    const usedBytes = this.parseDiskBytes(used);
    const remaining = Math.max(0, limitBytes - usedBytes);
    return Math.floor(remaining / (1024 * 1024 * 1024)) + 'Gi';
  }

  private parseMemoryBytes(mem: string): number {
    const match = mem.match(/^(\d+)(Gi|Mi)$/);
    if (!match) return 0;
    const val = parseInt(match[1]);
    return match[2] === 'Gi' ? val * 1024 * 1024 * 1024 : val * 1024 * 1024;
  }

  private parseDiskBytes(disk: string): number {
    const match = disk.match(/^(\d+)(Gi|Ti)$/);
    if (!match) return 0;
    const val = parseInt(match[1]);
    return match[2] === 'Ti' ? val * 1024 * 1024 * 1024 * 1024 : val * 1024 * 1024 * 1024;
  }
}
```

### 8.2 Tier-Based Limits

| Dimensao | Free | Pro ($20/mes) | Enterprise ($100/user/mes) | Education |
|----------|------|---------------|---------------------------|-----------|
| Max workspaces ativos | 2 | 10 | 100 | 50 |
| Max workspaces totais | 5 | 50 | Ilimitado | 200 |
| CPU por workspace | 2 cores | 8 cores | 32 cores | 2 cores |
| Memoria por workspace | 4 GB | 32 GB | 128 GB | 4 GB |
| Disco por workspace | 10 GB | 100 GB | 500 GB | 5 GB |
| Armazenamento total | 5 GB | 50 GB | 500 GB | 10 GB |
| Max membros do time | 1 | 10 | Ilimitado | 100 |
| Max sessoes simultaneas | 1 | 5 | Ilimitado | 1 |
| Colaboracao em tempo real | Nao | Sim | Sim | Nao |
| Imagens customizadas | Nao | Nao | Sim | Nao |
| SSO/SAML | Nao | Nao | Sim | Nao |
| VPC privada | Nao | Nao | Sim | Nao |
| IP allowlist | Nao | Nao | Sim | Nao |
| Audit log | 7 dias | 30 dias | 90 dias | 7 dias |
| Suporte | Community | Email (4h) | Prioridade (1h) | Email (24h) |
| Preco por hora extra | N/A | $0.18 | $0.30 | N/A |

### 8.3 Usage Tracking

```typescript
// @ideia/usage-meter: usage-tracker.ts

export interface UsageRecord {
  id: string;
  orgId: string;
  userId: string;
  workspaceId: string;
  timestamp: string;
  cpuSeconds: number;
  memoryBytes: number;
  diskBytes: number;
  networkBytes: number;
  gpuSeconds: number;
  snapshotBytes: number;
}

export class UsageMeter {
  private readonly batchSize = 100;
  private readonly flushInterval = 60_000;
  private buffer: UsageRecord[] = [];

  constructor() {
    setInterval(() => this.flush(), this.flushInterval);
  }

  async trackUsage(ws: Workspace, metrics: PodMetrics): Promise<void> {
    const record: UsageRecord = {
      id: uuid.v4(),
      orgId: ws.spec.orgId,
      userId: ws.spec.userId,
      workspaceId: ws.metadata.id,
      timestamp: new Date().toISOString(),
      cpuSeconds: metrics.cpuCores * (metrics.periodSeconds || 60),
      memoryBytes: metrics.memoryBytes,
      diskBytes: metrics.diskBytes,
      networkBytes: metrics.networkBytesTransmitted + metrics.networkBytesReceived,
      gpuSeconds: (metrics.gpuUtilization || 0) > 0 ? metrics.periodSeconds || 60 : 0,
      snapshotBytes: 0,
    };

    this.buffer.push(record);
    if (this.buffer.length >= this.batchSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0, this.buffer.length);
    await this.writeToStorage(batch);
    await this.updateRedisCounters(batch);
  }

  async getCurrentUsage(orgId: string): Promise<ResourceUsage> {
    const data = await this.redis.hgetall('usage:org:' + orgId + ':current');
    return {
      totalCPU: parseInt(data.cpu || '0'),
      totalMemory: parseInt(data.memory || '0') + 'Mi',
      totalDisk: parseInt(data.disk || '0') + 'Mi',
      activeWorkspaces: parseInt(data.workspaces || '0'),
    };
  }

  async getUsageReport(orgId: string, startDate: string, endDate: string): Promise<UsageReport> {
    const records = await this.storage.query(
      'SELECT * FROM usage_records WHERE org_id = $1 AND timestamp >= $2 AND timestamp <= $3',
      [orgId, startDate, endDate]
    );

    return {
      totalCPUSeconds: records.reduce((s: number, r: UsageRecord) => s + r.cpuSeconds, 0),
      totalMemoryGBHours: this.computeGBHours(records, 'memoryBytes'),
      totalDiskGBHours: this.computeGBHours(records, 'diskBytes'),
      totalNetworkGB: records.reduce((s: number, r: UsageRecord) => s + r.networkBytes, 0) / (1024 * 1024 * 1024),
      totalGPUSeconds: records.reduce((s: number, r: UsageRecord) => s + r.gpuSeconds, 0),
      totalSnapshotsGB: records.reduce((s: number, r: UsageRecord) => s + r.snapshotBytes, 0) / (1024 * 1024 * 1024),
      periodStart: startDate,
      periodEnd: endDate,
      recordCount: records.length,
    };
  }

  private computeGBHours(records: UsageRecord[], field: 'memoryBytes' | 'diskBytes'): number {
    let total = 0;
    for (let i = 1; i < records.length; i++) {
      const prev = records[i - 1];
      const curr = records[i];
      const hours = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 3600000;
      total += (prev[field] / (1024 * 1024 * 1024)) * hours;
    }
    return total;
  }
}
```

---

## 9. Networking

### 9.1 Ingress Architecture

```
                      INTERNET
                         |
                  [CloudFlare DNS]
                  *.ideia.dev A -> LB
                         |
                  [AWS ALB / GCP HTTP LB]
                         |
                  +------------------+
                  |   Traefik Proxy  |
                  |   (Ingress       |
                  |    Controller)   |
                  +--------+---------+
                           |
          +----------------+----------------+
          |                |                |
    [Ingress A]      [Ingress B]      [Ingress C]
   user-abc.ideia   user-def.ideia   user-ghi.ideia
          |                |                |
     [Pod User A]    [Pod User B]    [Pod User C]
     Theia:3000      Theia:3000      Theia:3000
```

### 9.2 Subdomain Per Session

```typescript
// @ideia/network: subdomain-router.ts

export class SubdomainRouter {
  async createIngress(ws: Workspace): Promise<V1Ingress> {
    const hostname = this.generateHostname(ws);
    const namespace = ws.spec.orgId;

    const ingress: V1Ingress = {
      apiVersion: 'networking.k8s.io/v1',
      kind: 'Ingress',
      metadata: {
        name: 'ws-' + ws.metadata.id,
        namespace,
        annotations: {
          'kubernetes.io/ingress.class': 'traefik',
          'traefik.ingress.kubernetes.io/router.entrypoints': 'websecure',
          'traefik.ingress.kubernetes.io/router.tls': 'true',
          'cert-manager.io/cluster-issuer': 'letsencrypt-prod',
          'traefik.ingress.kubernetes.io/websocket-enabled': 'true',
          'traefik.ingress.kubernetes.io/response-buffering': 'false',
        },
      },
      spec: {
        tls: [{ hosts: [hostname], secretName: 'tls-' + ws.metadata.id }],
        rules: [{
          host: hostname,
          http: {
            paths: [{ path: '/', pathType: 'Prefix', backend: { service: { name: 'ws-' + ws.metadata.id, port: { number: 3000 } } } }],
          },
        }],
      },
    };

    return this.k8s.createIngress(namespace, ingress);
  }

  generateHostname(ws: Workspace): string {
    const slug = ws.spec.userId + '-' + ws.metadata.id.substring(0, 8);
    return slug + '.ideia.dev';
  }
}
```

### 9.3 WebSocket Upgrade & TLS Termination

```typescript
// @ideia/network: websocket-proxy.ts

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { createProxyServer } from 'http-proxy';

export class TheiaWebSocketProxy {
  private proxy: any;

  constructor() {
    this.proxy = createProxyServer({ ws: true, timeout: 120_000, proxyTimeout: 120_000 });
  }

  start(port: number): void {
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const hostname = req.headers.host || '';
      const wsId = this.resolveWorkspaceId(hostname);

      if (!wsId) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const target = 'http://ws-' + wsId + '.svc.cluster.local:3000';
      this.proxy.web(req, res, { target, changeOrigin: true, timeout: 120_000 });
    });

    server.on('upgrade', (req: IncomingMessage, socket: any, head: Buffer) => {
      const hostname = req.headers.host || '';
      const wsId = this.resolveWorkspaceId(hostname);

      if (!wsId) {
        socket.destroy();
        return;
      }

      const target = 'ws://ws-' + wsId + '.svc.cluster.local:3000';
      this.proxy.ws(req, socket, head, { target, changeOrigin: true });
    });

    server.listen(port);
  }

  private resolveWorkspaceId(hostname: string): string | null {
    const match = hostname.match(/ws-([a-f0-9-]{8,36})\./);
    return match ? match[1] : null;
  }
}
```

### 9.4 Port Forwarding (Local to Cloud)

```typescript
// @ideia/network: port-forward-service.ts

export class PortForwardService {
  async startPortForward(workspaceId: string, localPort: number, remotePort: number): Promise<PortForward> {
    const ws = await this.workspaceManager.getWorkspace(workspaceId);
    if (!ws || ws.status.phase !== 'Running') {
      throw new AppError('WORKSPACE_NOT_RUNNING', 'Workspace is not running', 400);
    }

    const pf: PortForward = {
      id: uuid.v4(),
      workspaceId,
      localPort,
      remotePort,
      localAddress: 'localhost:' + localPort,
      remoteAddress: ws.status.podIP + ':' + remotePort,
      startedAt: new Date().toISOString(),
      bytesTransferred: 0,
    };

    await this.gatewayService.createTunnel({
      workspaceId,
      localPort,
      targetHost: ws.status.podIP,
      targetPort: remotePort,
    });

    return pf;
  }

  async listPortForwards(workspaceId: string): Promise<PortForward[]> {
    return this.gatewayService.listTunnels(workspaceId);
  }

  async stopPortForward(workspaceId: string, portForwardId: string): Promise<void> {
    await this.gatewayService.deleteTunnel(workspaceId, portForwardId);
  }
}
```

### 9.5 VPC Peering for Enterprise

```yaml
# Terraform: vpc-peering-enterprise.tf
resource "aws_vpc_peering_connection" "enterprise_prod" {
  peer_vpc_id = module.ideia_prod.vpc_id
  vpc_id      = var.enterprise_vpc_id
  auto_accept = false
  tags = { Name = "ideia-enterprise-peering", Environment = "production" }
}

resource "aws_route" "enterprise_to_ideia" {
  route_table_id            = var.enterprise_route_table_id
  destination_cidr_block    = module.ideia_prod.vpc_cidr
  vpc_peering_connection_id = aws_vpc_peering_connection.enterprise_prod.id
}

resource "aws_route" "ideia_to_enterprise" {
  route_table_id            = module.ideia_prod.private_route_table_id
  destination_cidr_block    = var.enterprise_cidr_block
  vpc_peering_connection_id = aws_vpc_peering_connection.enterprise_prod.id
}

resource "aws_security_group_rule" "allow_enterprise" {
  type              = "ingress"
  from_port         = 3000
  to_port           = 3001
  protocol          = "tcp"
  cidr_blocks       = [var.enterprise_cidr_block]
  security_group_id = module.ideia_prod.workspace_sg_id
  description       = "Enterprise VPC Peering access to workspaces"
}
```

---

## 10. Persistence & Storage

### 10.1 Storage Architecture

```
                    +------------------+
                    |   S3 / MinIO     |
                    |  (Backup tier)   |
                    +--------+---------+
                             |
                    +--------+---------+
                    |   PVC per Pod    |
                    |  (SSD, 10-500GB) |
                    +--------+---------+
                             |
                +------------+-----------+
                |                        |
      +---------v------+       +---------v------+
      | /home/project  |       | /ideia/extdata |
      | (git repos,    |       | (extensions,   |
      |  node_modules, |       |  settings,     |
      |  source code)  |       |  state)        |
      +----------------+       +----------------+
                |                        |
      +---------v------+       +---------v------+
      | /ideia/cache   |       | /ideia/tmp    |
      | (npm/pip/go    |       | (ephemeral)   |
      |  caches)       |       |               |
      +----------------+       +----------------+
```

### 10.2 PVC Configuration

```typescript
// @ideia/cloud-operator: storage-provisioner.ts

export class StorageProvisioner {
  async configureWorkspacePVC(pvc: V1PersistentVolumeClaim, ws: Workspace): Promise<V1PersistentVolumeClaim> {
    const plan = ws.spec.plan;
    const retentionPolicy = this.getRetentionPolicy(plan);

    pvc.metadata = {
      ...pvc.metadata,
      annotations: {
        ...pvc.metadata?.annotations,
        'ideia.dev/retention-policy': retentionPolicy.policy,
        'ideia.dev/retention-days': retentionPolicy.days.toString(),
        'ideia.dev/workspace-id': ws.metadata.id,
        'ideia.dev/user-id': ws.spec.userId,
        'ideia.dev/org-id': ws.spec.orgId,
      },
    };

    return pvc;
  }

  async backupPVC(ws: Workspace): Promise<void> {
    const backupName = 'backup-' + ws.metadata.id + '-' + Date.now();
    const volumeSnapshot: V1VolumeSnapshot = {
      apiVersion: 'snapshot.storage.k8s.io/v1',
      kind: 'VolumeSnapshot',
      metadata: {
        name: backupName,
        namespace: ws.spec.orgId,
        labels: { 'ideia.dev/workspace-id': ws.metadata.id, 'ideia.dev/backup-type': ws.spec.plan === 'enterprise' ? 'hourly' : 'daily' },
      },
      spec: { source: { persistentVolumeClaimName: 'ws-' + ws.metadata.id } },
    };

    await this.k8s.createVolumeSnapshot(backupName, volumeSnapshot);
  }

  private getRetentionPolicy(plan: string): { policy: string; days: number } {
    switch (plan) {
      case 'free': return { policy: 'delete-after-hibernate', days: 1 };
      case 'pro': return { policy: 'retain-snapshot', days: 30 };
      case 'enterprise': return { policy: 'retain-snapshot-encrypted', days: 90 };
      case 'education': return { policy: 'delete-on-terminate', days: 0 };
      default: return { policy: 'delete-on-terminate', days: 1 };
    }
  }
}
```

### 10.3 Backup to S3

```typescript
// @ideia/cloud-operator: backup-service.ts

export class BackupService {
  private readonly bucket = 'ideia-workspace-backups';

  async snapshotWorkspaceToS3(ws: Workspace): Promise<string> {
    const backupKey = 'backups/' + ws.spec.orgId + '/' + ws.metadata.id + '/' + Date.now() + '.tar.gz';

    await this.execInPod(ws.status.podName, [
      'sh', '-c',
      'tar czf /tmp/backup.tar.gz -C /home/project . && aws s3 cp /tmp/backup.tar.gz s3://' + this.bucket + '/' + backupKey,
    ]);

    return backupKey;
  }

  async restoreFromS3(ws: Workspace, backupKey: string): Promise<void> {
    await this.execInPod(ws.status.podName, [
      'sh', '-c',
      'aws s3 cp s3://' + this.bucket + '/' + backupKey + ' /tmp/restore.tar.gz && tar xzf /tmp/restore.tar.gz -C /home/project',
    ]);
  }

  async autoBackupAllRunning(): Promise<void> {
    const running = await this.workspaceManager.listRunning();
    for (const ws of running) {
      try {
        await this.snapshotWorkspaceToS3(ws);
      } catch (err) {
        console.error('Backup failed for workspace ' + ws.metadata.id + ':', err);
      }
    }
  }
}
```

### 10.4 Git-Based Persistence

```typescript
// @ideia/session-manager: git-persistence.ts

export class GitPersistence {
  async autoCommit(ws: Workspace, message?: string): Promise<string> {
    const commitMsg = message || 'Auto-save: ' + new Date().toISOString();
    const result = await this.execInPod(ws.status.podName, [
      'sh', '-c',
      'cd /home/project && git add -A && git commit -m "' + commitMsg + '" --allow-empty && git rev-parse HEAD',
    ]);
    return result.stdout.trim();
  }

  async pushToRemote(ws: Workspace, remote?: string): Promise<void> {
    const remoteName = remote || 'origin';
    await this.execInPod(ws.status.podName, [
      'sh', '-c',
      'cd /home/project && git push ' + remoteName + ' $(git rev-parse --abbrev-ref HEAD)',
    ]);
  }

  async setupGitConfig(ws: Workspace, email: string, name: string): Promise<void> {
    await this.execInPod(ws.status.podName, [
      'sh', '-c',
      'git config --global user.email "' + email + '" && git config --global user.name "' + name + '"',
    ]);
  }
}
```

---

## 11. Authentication & Authorization

### 11.1 JWT-Based Session Auth

```typescript
// @ideia/auth: jwt-service.ts

export class JWTService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly algorithm = 'RS256';
  private readonly keyPair: { privateKey: string; publicKey: string };

  constructor() {
    this.accessSecret = process.env.JWT_ACCESS_SECRET!;
    this.refreshSecret = process.env.JWT_REFRESH_SECRET!;
    this.keyPair = {
      privateKey: process.env.JWT_PRIVATE_KEY!,
      publicKey: process.env.JWT_PUBLIC_KEY!,
    };
  }

  async issueTokens(userId: string, orgId: string, plan: string): Promise<TokenPair> {
    const jti = uuid.v4();
    const now = Math.floor(Date.now() / 1000);

    const accessToken = await sign({
      sub: userId, org: orgId, plan, jti, iat: now, exp: now + 3600, type: 'access',
    }, this.keyPair.privateKey, { algorithm: this.algorithm });

    const refreshToken = await sign({
      sub: userId, jti: uuid.v4(), iat: now, exp: now + 2592000, type: 'refresh',
    }, this.keyPair.privateKey, { algorithm: this.algorithm });

    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await this.redis.set('refresh:' + userId + ':' + jti, refreshHash, 'EX', 2592000);

    return { accessToken, refreshToken, expiresIn: 3600 };
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenPair | null> {
    try {
      const payload = await verify(refreshToken, this.keyPair.publicKey, { algorithms: [this.algorithm] });
      if (payload.type !== 'refresh') return null;

      const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const stored = await this.redis.get('refresh:' + payload.sub + ':' + payload.jti);
      if (!stored || stored !== refreshHash) return null;

      await this.redis.del('refresh:' + payload.sub + ':' + payload.jti);
      return this.issueTokens(payload.sub as string, payload.org as string, payload.plan as string);
    } catch {
      return null;
    }
  }

  async validateAccessToken(token: string): Promise<JWTPayload | null> {
    try {
      const payload = await verify(token, this.keyPair.publicKey, { algorithms: [this.algorithm] });
      if (payload.type !== 'access') return null;
      return payload as unknown as JWTPayload;
    } catch {
      return null;
    }
  }
}
```

### 11.2 Auth Middleware

```typescript
// @ideia/auth: auth-middleware.ts

import { Request, Response, NextFunction } from 'express';

export class AuthMiddleware {
  constructor(private readonly jwtService: JWTService) {}

  authenticate(): (req: Request, res: Response, next: NextFunction) => void {
    return async (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({ error: 'No authorization header' });
        return;
      }

      const [scheme, token] = authHeader.split(' ');
      if (scheme !== 'Bearer' || !token) {
        res.status(401).json({ error: 'Invalid authorization scheme' });
        return;
      }

      const payload = await this.jwtService.validateAccessToken(token);
      if (payload) {
        (req as any).user = { id: payload.sub, orgId: payload.org, plan: payload.plan, tokenType: 'jwt' };
        next();
        return;
      }

      const tokenService = new ApiTokenService();
      const apiResult = await tokenService.validateToken(token);
      if (apiResult) {
        (req as any).user = { id: apiResult.userId, scopes: apiResult.scopes, tokenType: 'api' };
        next();
        return;
      }

      res.status(401).json({ error: 'Invalid or expired token' });
    };
  }

  requireScope(...scopes: TokenScope[]): (req: Request, res: Response, next: NextFunction) => void {
    return (req, res, next) => {
      const user = (req as any).user;
      if (!user) { res.status(401).json({ error: 'Not authenticated' }); return; }
      if (user.tokenType === 'jwt') { next(); return; }
      const hasAllScopes = scopes.every((s) => user.scopes?.includes(s));
      if (!hasAllScopes) { res.status(403).json({ error: 'Insufficient scopes', required: scopes, has: user.scopes }); return; }
      next();
    };
  }
}
```

### 11.3 SSO/OIDC Configuration

```typescript
// @ideia/auth: sso-service.ts

export interface SSOConfig {
  orgId: string;
  provider: 'saml' | 'oidc';
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  attributeMapping: { email: string; name: string; groups: string };
  enforced: boolean;
  allowedDomains: string[];
}

export class SSOService {
  async configureSSO(config: SSOConfig): Promise<void> {
    await this.testConnection(config);
    const encryptedConfig = this.encrypt(JSON.stringify(config), process.env.SSO_ENCRYPTION_KEY!);
    await this.ssoRepo.saveConfig({
      orgId: config.orgId, provider: config.provider, encryptedConfig, enabled: false,
      createdAt: new Date().toISOString(),
    });
  }

  async handleSSOCallback(orgId: string, code: string): Promise<UserSession> {
    const config = await this.ssoRepo.getConfig(orgId);
    const decrypted = JSON.parse(this.decrypt(config.encryptedConfig, process.env.SSO_ENCRYPTION_KEY!));

    const tokenResponse = await fetch(decrypted.issuerUrl + '/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code', code,
        client_id: decrypted.clientId, client_secret: decrypted.clientSecret,
        redirect_uri: 'https://ideia.dev/api/auth/oidc/callback/' + orgId,
      }),
    });

    const tokens = await tokenResponse.json();
    const userInfo = await this.getUserInfo(decrypted.issuerUrl, tokens.access_token);
    const email = this.resolveAttribute(userInfo, decrypted.attributeMapping.email);
    const name = this.resolveAttribute(userInfo, decrypted.attributeMapping.name);

    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      const newUser = await this.userRepo.create({
        email, name, externalId: userInfo.sub, provider: 'sso',
        plan: 'enterprise', createdAt: new Date().toISOString(),
      });
      await this.orgRepo.addMember({
        orgId, userId: newUser.id, role: 'member',
        invitedAt: new Date().toISOString(), joinedAt: new Date().toISOString(),
      });
      return this.registrationService.createSession(newUser, 'saml');
    }
    return this.registrationService.createSession(user, 'saml');
  }
}
```

### 11.4 IP Allowlist

```typescript
// @ideia/auth: ip-allowlist.ts

export class IPAllowlistMiddleware {
  async enforce(req: Request, res: Response, next: NextFunction): Promise<void> {
    const orgId = (req as any).user?.orgId;
    if (!orgId) { next(); return; }

    const allowlist = await this.allowlistRepo.getByOrg(orgId);
    if (!allowlist || allowlist.length === 0) { next(); return; }

    const clientIP = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const allowed = allowlist.some((entry) => entry.type === 'cidr'
      ? iputil.cidrSubnet(entry.value).contains(clientIP)
      : clientIP === entry.value);

    if (!allowed) {
      res.status(403).json({ error: 'Access denied: IP not in allowlist', yourIP: clientIP, orgId });
      return;
    }
    next();
  }
}
```

---

## 12. Monitoring & Observability

### 12.1 Per-Workspace Metrics

```
+--------------------------------------------------------------------+
|                       METRICS PIPELINE                              |
|                                                                     |
|  Pod -> cAdvisor -> Prometheus -> Thanos -> Grafana                |
|    |                                    |                           |
|    +-> kube-state-metrics               +-> S3 (long-term)          |
|    |                                                               |
|    +-> Node exporter                                                |
|                                                                     |
|  Workspace CR -> IDEIA Operator -> Custom Metrics                  |
|    |                                    |                           |
|    +-> Session heartbeat                +-> UsageMeter              |
|                                                                     |
+--------------------------------------------------------------------+
```

### 12.2 Health Checks

```typescript
// @ideia/cloud-operator: health-checker.ts

export class WorkspaceHealthChecker {
  private readonly checkInterval = 30_000;
  private readonly maxRetries = 3;

  async startHealthChecks(): Promise<void> {
    setInterval(async () => {
      const workspaces = await this.workspaceManager.listRunning();
      for (const ws of workspaces) {
        await this.checkWorkspace(ws);
      }
    }, this.checkInterval);
  }

  async checkWorkspace(ws: Workspace): Promise<HealthStatus> {
    let retries = 0;
    while (retries < this.maxRetries) {
      try {
        const status = await this.httpGet(
          'http://ws-' + ws.metadata.id + '.' + ws.spec.orgId + '.svc.cluster.local:3000/health',
          { timeout: 5_000 }
        );
        if (status.ok) {
          await this.updateHealth(ws, 'healthy');
          return { status: 'healthy', lastCheck: new Date().toISOString() };
        }
      } catch {
        retries++;
        await this.delay(5_000);
      }
    }

    await this.updateHealth(ws, 'unhealthy');
    await this.handleUnhealthyWorkspace(ws);
    return { status: 'unhealthy', lastCheck: new Date().toISOString(), error: 'Max retries exceeded' };
  }

  async handleUnhealthyWorkspace(ws: Workspace): Promise<void> {
    await this.k8s.deletePod(ws.status.podName, ws.spec.orgId);
    try {
      await this.waitForPodReady(ws.metadata.id, 60_000);
      await this.updateHealth(ws, 'recovered');
      await this.eventBus.publish('workspace.recovered', { workspaceId: ws.metadata.id, userId: ws.spec.userId });
    } catch {
      ws.status.phase = 'Failed';
      await this.workspaceManager.updateStatus(ws);
      await this.eventBus.publish('workspace.failed', { workspaceId: ws.metadata.id, userId: ws.spec.userId, reason: 'Health check failure, restart timeout' });
    }
  }

  private async updateHealth(ws: Workspace, status: string): Promise<void> {
    await this.redis.hset('workspace:' + ws.metadata.id + ':health', { status, lastCheck: new Date().toISOString() });
  }
}
```

### 12.3 User Activity Tracking

```typescript
// @ideia/observability: activity-tracker.ts

export type ActivityType =
  | 'workspace.created' | 'workspace.deleted' | 'workspace.hibernated' | 'workspace.resumed'
  | 'file.opened' | 'file.saved' | 'file.created' | 'file.deleted'
  | 'terminal.command' | 'debug.session_started' | 'debug.breakpoint_hit'
  | 'git.commit' | 'git.push' | 'git.pull'
  | 'extension.installed' | 'extension.uninstalled'
  | 'collaboration.joined' | 'collaboration.left'
  | 'ai.query' | 'ai.code_generated';

export class ActivityTracker {
  async track(ws: Workspace, userId: string, type: ActivityType, metadata: Record<string, unknown> = {}): Promise<void> {
    const event = {
      id: uuid.v4(), userId, orgId: ws.spec.orgId, workspaceId: ws.metadata.id,
      type, timestamp: new Date().toISOString(), metadata,
      sessionDuration: await this.getSessionDuration(ws.metadata.id),
    };
    await this.eventBus.publish('activity.event', event);
    await this.writeActivityEvent(event);
    await this.updateActivityCounters(event);
  }
}
```

### 12.4 Cost Attribution

```typescript
// @ideia/billing: cost-attribution.ts

export class CostAttributionService {
  private readonly resourceCosts = {
    cpuPerCoreHour: 0.04,
    memoryPerGBHour: 0.005,
    diskPerGBMonth: 0.10,
    networkPerGB: 0.01,
    gpuPerHour: { t4: 0.35, l4: 0.50, a100: 1.50 },
    snapshotPerGBMonth: 0.02,
  };

  async calculateWorkspaceCost(ws: Workspace, hours: number): Promise<WorkspaceCost> {
    const cpuCost = this.parseCPU(ws.spec.resources.cpu) * this.resourceCosts.cpuPerCoreHour * hours;
    const memoryGB = this.parseMemoryGB(ws.spec.resources.memory);
    const memoryCost = memoryGB * this.resourceCosts.memoryPerGBHour * hours;
    const diskGB = this.parseDiskGB(ws.spec.resources.disk);
    const diskCost = diskGB * this.resourceCosts.diskPerGBMonth * (hours / 730);

    let gpuCost = 0;
    if (ws.spec.resources.gpu) {
      gpuCost = this.resourceCosts.gpuPerHour[ws.spec.resources.gpu.type] * ws.spec.resources.gpu.count * hours;
    }

    return {
      cpu: cpuCost, memory: memoryCost, disk: diskCost, gpu: gpuCost, network: 0, snapshots: 0,
      total: cpuCost + memoryCost + diskCost + gpuCost,
    };
  }

  async attributeCostsByOrg(startDate: string, endDate: string): Promise<OrgCostReport[]> {
    const usage = await this.usageMeter.getUsageByOrg(startDate, endDate);
    return usage.map((orgUsage: any) => {
      const totalCost = {
        cpu: orgUsage.totalCPUSeconds / 3600 * this.resourceCosts.cpuPerCoreHour,
        memory: 0, disk: 0, gpu: 0,
        network: orgUsage.totalNetworkGB * this.resourceCosts.networkPerGB,
        snapshots: orgUsage.totalSnapshotsGB * this.resourceCosts.snapshotPerGBMonth,
        total: 0,
      };
      totalCost.total = totalCost.cpu + totalCost.memory + totalCost.disk + totalCost.gpu + totalCost.network + totalCost.snapshots;
      return { orgId: orgUsage.orgId, period: { start: startDate, end: endDate }, costs: totalCost, workspaceCount: orgUsage.workspaceCount, userCount: orgUsage.userCount };
    });
  }
}
```

---

## 13. Pricing Integration

### 13.1 Pricing Model

| Componente | Free | Pro | Enterprise | Education |
|------------|------|-----|------------|-----------|
| Mensalidade | $0 | $20 | $100/user | $0 |
| Compute hora extra | N/A | $0.18/h | $0.30/h | N/A |
| Armazenamento extra | N/A | $0.10/GB/mes | $0.08/GB/mes | N/A |
| Snapshot retention | 1 dia | 30 dias | 90 dias | Nao |
| GPU (T4) | Nao | $0.35/h | $0.35/h | Nao |
| GPU (L4) | Nao | $0.50/h | $0.50/h | Nao |
| GPU (A100) | Nao | $1.50/h | $1.50/h | Nao |
| Transferencia de rede | 1GB/mes | 10GB/mes | Ilimitado | 500MB/mes |

### 13.2 Metering API

```typescript
// @ideia/billing: metering-api.ts

export class MeteringAPI {
  async getCurrentMonthUsage(orgId: string): Promise<MonthlyUsage> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const usage = await this.usageMeter.getUsageReport(orgId, startOfMonth, now.toISOString());
    const activeWorkspaces = await this.workspaceManager.countRunningByOrg(orgId);
    const totalMembers = await this.orgRepo.countMembers(orgId);

    return {
      orgId,
      period: { start: startOfMonth, end: now.toISOString() },
      computeHours: Math.round(usage.totalCPUSeconds / 3600),
      memoryGBHours: Math.round(usage.totalMemoryGBHours),
      diskGBHours: Math.round(usage.totalDiskGBHours),
      networkGB: Math.round(usage.totalNetworkGB * 100) / 100,
      gpuHours: Math.round(usage.totalGPUSeconds / 3600),
      snapshotGB: Math.round(usage.totalSnapshotsGB * 100) / 100,
      activeWorkspaces,
      totalMembers,
      estimatedCost: this.estimateCost(usage),
    };
  }

  async getUsageInvoice(orgId: string, month: string): Promise<Invoice> {
    const [year, m] = month.split('-').map(Number);
    const startDate = new Date(year, m - 1, 1).toISOString();
    const endDate = new Date(year, m, 0, 23, 59, 59).toISOString();
    const usage = await this.usageMeter.getUsageReport(orgId, startDate, endDate);
    const plan = await this.orgRepo.getPlan(orgId);
    const planConfig = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
    const memberCount = await this.orgRepo.countMembers(orgId);
    const planBaseCost = plan === 'free' ? 0 : plan === 'pro' ? 20 : planConfig.pricePerHour * memberCount * 730;
    const computeCost = (usage.totalCPUSeconds / 3600) * planConfig.pricePerHour;
    const storageCost = (usage.totalDiskGBHours / 730) * 0.10;
    const gpuCost = (usage.totalGPUSeconds / 3600) * 0.35;
    const networkCost = usage.totalNetworkGB * 0.01;
    const total = planBaseCost + computeCost + storageCost + gpuCost + networkCost;

    return {
      orgId, month,
      items: [
        { description: 'Plan: ' + plan + ' (' + memberCount + ' members)', amount: planBaseCost },
        { description: 'Compute hours', quantity: Math.round(usage.totalCPUSeconds / 3600), unitPrice: planConfig.pricePerHour, amount: Math.round(computeCost * 100) / 100 },
        { description: 'Storage', quantity: Math.round(usage.totalDiskGBHours / 730), unitPrice: 0.10, amount: Math.round(storageCost * 100) / 100 },
        { description: 'GPU hours', quantity: Math.round(usage.totalGPUSeconds / 3600), unitPrice: 0.35, amount: Math.round(gpuCost * 100) / 100 },
        { description: 'Network transfer', quantity: Math.round(usage.totalNetworkGB * 100) / 100, unitPrice: 0.01, amount: Math.round(networkCost * 100) / 100 },
      ],
      total: Math.round(total * 100) / 100,
      usage,
    };
  }

  private estimateCost(usage: UsageReport): number {
    return Math.round(
      (usage.totalCPUSeconds / 3600) * 0.18 + (usage.totalMemoryGBHours) * 0.005 +
      (usage.totalDiskGBHours / 730) * 0.10 + usage.totalNetworkGB * 0.01 +
      (usage.totalGPUSeconds / 3600) * 0.35 + usage.totalSnapshotsGB * 0.02
    );
  }
}
```

### 13.3 Stripe/Paddle Integration

```typescript
// @ideia/billing: payment-integration.ts

export class PaymentIntegration {
  async createSubscription(orgId: string, plan: OrgPlan, paymentMethodId: string): Promise<Subscription> {
    const customer = await this.getOrCreateCustomer(orgId);
    const priceId = this.getPriceId(plan);

    const subscription = await stripe.subscriptions.create({
      customer: customer.id, items: [{ price: priceId }], metadata: { orgId },
      expand: ['latest_invoice.payment_intent'],
    });

    await this.subscriptionRepo.create({
      orgId, plan, stripeSubscriptionId: subscription.id, status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    });

    return {
      orgId, plan, status: subscription.status as 'active' | 'incomplete' | 'past_due' | 'canceled',
      nextBillingDate: new Date(subscription.current_period_end * 1000).toISOString(),
    };
  }

  async cancelSubscription(orgId: string): Promise<void> {
    const sub = await this.subscriptionRepo.getByOrg(orgId);
    if (!sub) throw new AppError('NO_SUBSCRIPTION', 'No active subscription', 404);
    if (sub.stripeSubscriptionId) {
      await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
    }
    await this.subscriptionRepo.cancelAtPeriodEnd(orgId);
    await this.eventBus.publish('subscription.canceling', { orgId, effectiveEnd: sub.currentPeriodEnd });
  }

  async handleWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const orgId = invoice.subscription_details?.metadata?.orgId;
        await this.subscriptionRepo.markPaid(orgId, invoice.id);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const orgId = invoice.subscription_details?.metadata?.orgId;
        await this.subscriptionRepo.markPastDue(orgId);
        await this.notificationService.sendToOrgAdmins(orgId, {
          type: 'payment_failed', severity: 'high',
          message: 'Payment failed. Workspaces will be suspended in 7 days.',
        });
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata.orgId;
        await this.suspendOrgWorkspaces(orgId);
        break;
      }
    }
  }
}
```

### 13.4 Usage Alerts

```typescript
// @ideia/billing: usage-alerts.ts

export class UsageAlertService {
  private readonly thresholds = {
    cpuPercent: [50, 75, 90, 100],
    memoryPercent: [50, 75, 90, 100],
    diskPercent: [70, 85, 95, 100],
    costThresholds: [10, 50, 100, 500],
  };

  async evaluateAlerts(ws: Workspace): Promise<void> {
    const cpuPercent = (this.parseCPU(ws.status.resourceUsage.currentCPU) / this.parseCPU(ws.spec.resources.cpu)) * 100;
    await this.checkThreshold('cpu', ws, cpuPercent, this.thresholds.cpuPercent);

    const memPercent = (this.parseMemoryMB(ws.status.resourceUsage.currentMemory) / this.parseMemoryMB(ws.spec.resources.memory)) * 100;
    await this.checkThreshold('memory', ws, memPercent, this.thresholds.memoryPercent);

    const diskPercent = (this.parseMemoryMB(ws.status.resourceUsage.currentDisk) / this.parseMemoryMB(ws.spec.resources.disk)) * 100;
    await this.checkThreshold('disk', ws, diskPercent, this.thresholds.diskPercent);
  }

  private async checkThreshold(resource: string, ws: Workspace, current: number, thresholds: number[]): Promise<void> {
    for (const threshold of thresholds) {
      if (current >= threshold) {
        const alertKey = 'alert:' + ws.metadata.id + ':' + resource + ':' + threshold;
        const alreadySent = await this.redis.get(alertKey);
        if (!alreadySent) {
          await this.notificationService.send(ws.spec.userId, {
            type: 'usage_alert',
            severity: current >= 90 ? 'critical' : current >= 75 ? 'warning' : 'info',
            title: resource.charAt(0).toUpperCase() + resource.slice(1) + ' usage at ' + Math.round(current) + '%',
            message: 'Workspace ' + ws.metadata.id + ': ' + resource + ' usage is at ' + Math.round(current) + '% of limit.',
            data: { workspaceId: ws.metadata.id, resource, current, limit: threshold },
          });
          await this.redis.set(alertKey, 'sent', 'EX', 86400);
        }
        break;
      }
    }
  }
}
```

---

## 14. Code Examples

### 14.1 WorkspaceManager (Full Implementation)

```typescript
// @ideia/cloud-operator: workspace-manager.ts

export class WorkspaceManager {
  async createWorkspace(spec: WorkspaceSpec): Promise<Workspace> {
    const quotaCheck = await this.quotaEnforcer.checkCreation(spec.userId, spec.orgId, spec);
    if (!quotaCheck.allowed) {
      throw new AppError('QUOTA_EXCEEDED', quotaCheck.reason!, 403);
    }

    const workspace: Workspace = {
      metadata: { id: uuid.v4(), createdAt: new Date().toISOString() },
      spec,
      status: {
        phase: 'Pending', podName: '', podIP: '', ingressURL: '',
        startedAt: '', lastHeartbeat: '',
        resourceUsage: { currentCPU: '0', currentMemory: '0', currentDisk: '0' },
        conditions: [],
      },
    };

    await this.storeWorkspace(workspace);
    this.provisionWorkspace(workspace).catch((err) => {
      console.error('Provisioning failed for workspace ' + workspace.metadata.id + ':', err);
      workspace.status.phase = 'Failed';
      workspace.status.conditions.push({
        type: 'Failed', status: 'True', reason: 'ProvisioningError',
        message: err.message, lastTransitionTime: new Date().toISOString(),
      });
      this.updateWorkspace(workspace);
    });

    return workspace;
  }

  private async provisionWorkspace(ws: Workspace): Promise<void> {
    ws.status.phase = 'Provisioning';
    await this.updateWorkspace(ws);

    await this.k8s.ensureNamespace(ws.spec.orgId);
    const pvc = await this.storageProvisioner.createWorkspacePVC(ws);
    await this.k8s.createPVC(ws.spec.orgId, pvc);

    const deployment = this.createTheiaDeployment(ws);
    await this.k8s.createDeployment(ws.spec.orgId, deployment);

    const service = this.createTheiaService(ws);
    await this.k8s.createService(ws.spec.orgId, service);

    const ingress = await this.subdomainRouter.createIngress(ws);
    await this.k8s.createIngress(ws.spec.orgId, ingress);

    const netPolicy = createDefaultNetworkPolicy(ws.spec.orgId, ws.metadata.id);
    await this.k8s.createNetworkPolicy(ws.spec.orgId, netPolicy);

    await this.waitForPodReady(ws.metadata.id, 120_000);

    ws.status.phase = 'Running';
    ws.status.startedAt = new Date().toISOString();
    ws.status.podName = 'ws-' + ws.metadata.id + '-pod';
    ws.status.ingressURL = 'https://' + this.subdomainRouter.generateHostname(ws);
    await this.updateWorkspace(ws);

    await this.eventBus.publish('workspace.ready', {
      workspaceId: ws.metadata.id, userId: ws.spec.userId, url: ws.status.ingressURL,
    });
  }

  async hibernateWorkspace(workspaceId: string): Promise<void> {
    const ws = await this.getWorkspace(workspaceId);
    if (!ws || ws.status.phase !== 'Running') {
      throw new AppError('INVALID_STATE', 'Workspace must be Running to hibernate', 400);
    }

    ws.status.phase = 'Hibernating';
    await this.updateWorkspace(ws);
    await this.backupService.snapshotWorkspaceToS3(ws);
    await this.k8s.deleteDeployment(ws.spec.orgId, 'ws-' + ws.metadata.id);
    await this.k8s.deleteService(ws.spec.orgId, 'ws-' + ws.metadata.id);
    await this.k8s.deleteIngress(ws.spec.orgId, 'ws-' + ws.metadata.id);

    ws.status.phase = 'Hibernated';
    ws.status.podName = '';
    ws.status.podIP = '';
    await this.updateWorkspace(ws);
    await this.eventBus.publish('workspace.hibernated', { workspaceId: ws.metadata.id, userId: ws.spec.userId });
  }

  async resumeWorkspace(workspaceId: string): Promise<void> {
    const ws = await this.getWorkspace(workspaceId);
    if (!ws || ws.status.phase !== 'Hibernated') {
      throw new AppError('INVALID_STATE', 'Workspace must be Hibernated to resume', 400);
    }

    ws.status.phase = 'Resuming';
    await this.updateWorkspace(ws);

    const deployment = this.createTheiaDeployment(ws);
    await this.k8s.createDeployment(ws.spec.orgId, deployment);
    const service = this.createTheiaService(ws);
    await this.k8s.createService(ws.spec.orgId, service);
    const ingress = await this.subdomainRouter.createIngress(ws);
    await this.k8s.createIngress(ws.spec.orgId, ingress);

    await this.waitForPodReady(ws.metadata.id, 120_000);

    ws.status.phase = 'Running';
    ws.status.podName = 'ws-' + ws.metadata.id + '-pod';
    ws.status.startedAt = new Date().toISOString();
    await this.updateWorkspace(ws);
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    const ws = await this.getWorkspace(workspaceId);
    if (!ws) throw new AppError('NOT_FOUND', 'Workspace not found', 404);

    ws.status.phase = 'Terminating';
    await this.updateWorkspace(ws);

    await this.k8s.deleteDeployment(ws.spec.orgId, 'ws-' + ws.metadata.id);
    await this.k8s.deleteService(ws.spec.orgId, 'ws-' + ws.metadata.id);
    await this.k8s.deleteIngress(ws.spec.orgId, 'ws-' + ws.metadata.id);
    await this.k8s.deletePVC(ws.spec.orgId, 'ws-' + ws.metadata.id);
    await this.k8s.deleteNetworkPolicy(ws.spec.orgId, 'ws-' + ws.metadata.id + '-default-deny');
    await this.backupService.snapshotWorkspaceToS3(ws);
    await this.deleteWorkspaceCR(workspaceId);
    await this.eventBus.publish('workspace.deleted', { workspaceId: ws.metadata.id, userId: ws.spec.userId });
  }

  private createTheiaDeployment(ws: Workspace): V1Deployment {
    return {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: 'ws-' + ws.metadata.id,
        namespace: ws.spec.orgId,
        labels: { 'app.kubernetes.io/name': 'theia-cloud', 'app.kubernetes.io/component': 'workspace', 'ideia.dev/workspace-id': ws.metadata.id, 'ideia.dev/user-id': ws.spec.userId },
      },
      spec: {
        replicas: 1,
        selector: { matchLabels: { 'ideia.dev/workspace-id': ws.metadata.id } },
        template: {
          metadata: { labels: { 'ideia.dev/workspace-id': ws.metadata.id } },
          spec: {
            securityContext: createPodSecurityContext(),
            containers: [{
              name: 'theia-backend',
              image: ws.spec.image + ':' + ws.spec.imageTag,
              ports: [{ containerPort: 3000 }, { containerPort: 3001 }],
              resources: {
                requests: { cpu: ws.spec.resources.cpu, memory: ws.spec.resources.memory },
                limits: { cpu: ws.spec.resources.cpu, memory: ws.spec.resources.memory },
              },
              securityContext: createContainerSecurityContext(),
              env: [
                { name: 'THEIA_WORKSPACE_ROOT', value: '/home/project' },
                { name: 'THEIA_HOST', value: '0.0.0.0' },
                { name: 'THEIA_PORT', value: '3000' },
              ],
              volumeMounts: [
                { name: 'workspace-data', mountPath: '/home/project' },
                { name: 'ideia-cache', mountPath: '/ideia/cache' },
              ],
              livenessProbe: { httpGet: { path: '/health', port: 3000 }, initialDelaySeconds: 30, periodSeconds: 30 },
              readinessProbe: { httpGet: { path: '/health', port: 3000 }, initialDelaySeconds: 10, periodSeconds: 10 },
            }],
            volumes: [
              { name: 'workspace-data', persistentVolumeClaim: { claimName: 'ws-' + ws.metadata.id } },
              { name: 'ideia-cache', emptyDir: { sizeLimit: '5Gi' } },
            ],
          },
        },
      },
    };
  }

  private createTheiaService(ws: Workspace): V1Service {
    return {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: { name: 'ws-' + ws.metadata.id, namespace: ws.spec.orgId, labels: { 'ideia.dev/workspace-id': ws.metadata.id } },
      spec: { selector: { 'ideia.dev/workspace-id': ws.metadata.id }, ports: [{ name: 'theia-http', port: 3000, targetPort: 3000 }, { name: 'theia-ws', port: 3001, targetPort: 3001 }], type: 'ClusterIP' },
    };
  }
}
```

### 14.2 K8sWorkspaceProvisioner

```typescript
// @ideia/cloud-operator: k8s-provisioner.ts

export class K8sWorkspaceProvisioner {
  private readonly k8s: K8sClient;

  async createPod(ws: Workspace): Promise<void> {
    const deployment: V1Deployment = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: 'ws-' + ws.metadata.id,
        namespace: ws.spec.orgId,
        labels: { 'ideia.dev/workspace-id': ws.metadata.id, 'ideia.dev/user-id': ws.spec.userId, 'ideia.dev/org-id': ws.spec.orgId, 'ideia.dev/plan': ws.spec.plan },
      },
      spec: {
        replicas: 1,
        selector: { matchLabels: { 'ideia.dev/workspace-id': ws.metadata.id } },
        template: {
          metadata: {
            labels: { 'ideia.dev/workspace-id': ws.metadata.id, 'ideia.dev/user-id': ws.spec.userId },
            annotations: { 'ideia.dev/resource-version': ws.metadata.id, 'prometheus.io/scrape': 'true', 'prometheus.io/port': '3000', 'prometheus.io/path': '/metrics' },
          },
          spec: {
            securityContext: createPodSecurityContext(),
            terminationGracePeriodSeconds: 30,
            affinity: {
              podAntiAffinity: {
                preferredDuringSchedulingIgnoredDuringExecution: [{
                  weight: 100,
                  podAffinityTerm: { labelSelector: { matchExpressions: [{ key: 'ideia.dev/org-id', operator: 'In', values: [ws.spec.orgId] }] }, topologyKey: 'kubernetes.io/hostname' },
                }],
              },
            },
            containers: [{
              name: 'theia-backend',
              image: ws.spec.image + ':' + ws.spec.imageTag,
              imagePullPolicy: 'IfNotPresent',
              ports: [{ containerPort: 3000, name: 'theia-http' }, { containerPort: 3001, name: 'theia-ws' }],
              resources: {
                requests: { cpu: ws.spec.resources.cpu, memory: ws.spec.resources.memory, ephemeralStorage: ws.spec.resources.disk },
                limits: { cpu: ws.spec.resources.cpu, memory: ws.spec.resources.memory, ephemeralStorage: ws.spec.resources.disk },
              },
              securityContext: createContainerSecurityContext(),
              env: [
                { name: 'THEIA_WORKSPACE_ROOT', value: '/home/project' },
                { name: 'THEIA_HOST', value: '0.0.0.0' },
                { name: 'THEIA_PORT', value: '3000' },
                { name: 'IDEIA_USER_ID', value: ws.spec.userId },
                { name: 'IDEIA_ORG_ID', value: ws.spec.orgId },
                { name: 'IDEIA_WS_ID', value: ws.metadata.id },
                { name: 'IDEIA_PLAN', value: ws.spec.plan },
                { name: 'NODE_OPTIONS', value: '--max-old-space-size=' + this.computeNodeMemory(ws.spec.resources.memory) },
              ],
              volumeMounts: [
                { name: 'workspace-data', mountPath: '/home/project' },
                { name: 'ideia-cache', mountPath: '/ideia/cache' },
                { name: 'ideia-config', mountPath: '/ideia/config', readOnly: true },
              ],
              livenessProbe: { httpGet: { path: '/health', port: 3000 }, initialDelaySeconds: 20, periodSeconds: 30, failureThreshold: 3, timeoutSeconds: 5 },
              readinessProbe: { httpGet: { path: '/health', port: 3000 }, initialDelaySeconds: 10, periodSeconds: 10, failureThreshold: 2, timeoutSeconds: 3 },
              startupProbe: { httpGet: { path: '/health', port: 3000 }, initialDelaySeconds: 5, periodSeconds: 2, failureThreshold: 30, timeoutSeconds: 3 },
            }],
            volumes: [
              { name: 'workspace-data', persistentVolumeClaim: { claimName: 'ws-' + ws.metadata.id } },
              { name: 'ideia-cache', emptyDir: { sizeLimit: '10Gi' } },
              { name: 'ideia-config', configMap: { name: 'theia-config' } },
            ],
          },
        },
      },
    };

    await this.k8s.createDeployment(ws.spec.orgId, deployment);
  }

  private computeNodeMemory(memorySpec: string): string {
    const match = memorySpec.match(/^(\d+)/);
    if (!match) return '2048';
    const gb = parseInt(match[1]);
    return String(Math.floor(gb * 1024 * 0.75));
  }
}
```

### 14.3 SessionAuth Middleware

```typescript
// @ideia/auth: session-auth-middleware.ts

export class SessionAuthMiddleware {
  constructor(
    private readonly jwtService: JWTService,
    private readonly sessionManager: SessionManager
  ) {}

  authorizeSession(): (req: Request, res: Response, next: NextFunction) => void {
    return async (req, res, next) => {
      const sessionId = req.params.sessionId || this.extractSessionFromHost(req);
      if (!sessionId) { res.status(400).json({ error: 'Session ID required' }); return; }

      const user = (req as any).user;
      if (!user) { res.status(401).json({ error: 'Not authenticated' }); return; }

      const session = await this.sessionManager.getSession(sessionId);
      if (!session) { res.status(404).json({ error: 'Session not found' }); return; }

      const isOwner = session.userId === user.id;
      const isCollaborator = await this.sessionManager.isCollaborator(sessionId, user.id);
      const isOrgAdmin = await this.isOrgAdmin(user.id, session.workspaceSpec.orgId);

      if (!isOwner && !isCollaborator && !isOrgAdmin) {
        res.status(403).json({ error: 'Not authorized for this session' });
        return;
      }

      (req as any).session = session;
      (req as any).sessionRole = isOwner ? 'owner' : isOrgAdmin ? 'admin' : 'collaborator';
      next();
    };
  }

  private extractSessionFromHost(req: Request): string | null {
    const host = req.headers.host || '';
    const match = host.match(/ws-([a-f0-9-]{36})\./);
    return match ? match[1] : null;
  }

  private async isOrgAdmin(userId: string, orgId: string): Promise<boolean> {
    const member = await this.orgRepo.findMember(orgId, userId);
    return member?.role === 'owner' || member?.role === 'admin';
  }
}
```

### 14.4 ImageBuilder (Dockerfile Generation)

```typescript
// @ideia/image-registry: dockerfile-generator.ts

export class DockerfileGenerator {
  generate(template: ImageTemplate): string {
    const lines: string[] = [];

    lines.push('FROM ' + template.baseImage + ' AS base');
    lines.push('');
    lines.push('LABEL org.opencontainers.image.source="https://github.com/ideia/cloud"');
    lines.push('LABEL ideia.template="' + template.name + '"');
    lines.push('LABEL ideia.version="' + template.version + '"');
    lines.push('');

    if (template.systemPackages && template.systemPackages.length > 0) {
      lines.push('USER root');
      lines.push('RUN apt-get update && apt-get install -y --no-install-recommends \\');
      lines.push(template.systemPackages.map((pkg) => '  ' + pkg).join(' \\\n'));
      lines.push('  && rm -rf /var/lib/apt/lists/*');
      lines.push('USER ideia');
      lines.push('');
    }

    for (const runtime of template.languageRuntimes || []) {
      lines.push('# ' + runtime.language + ' setup');
      switch (runtime.language) {
        case 'node':
          lines.push('ENV NODE_VERSION=' + runtime.version);
          lines.push('RUN curl -fsSL https://deb.nodesource.com/setup_$NODE_VERSION.x | bash - \\');
          lines.push('  && apt-get install -y nodejs \\');
          if (runtime.packages?.length) {
            lines.push('  && npm install -g ' + runtime.packages.join(' '));
          }
          break;
        case 'python':
          lines.push('ENV PYTHON_VERSION=' + runtime.version);
          lines.push('RUN pyenv install $PYTHON_VERSION && pyenv global $PYTHON_VERSION');
          break;
        case 'go':
          lines.push('ENV GO_VERSION=' + runtime.version);
          lines.push('RUN curl -fsSL https://go.dev/dl/go$GO_VERSION.linux-amd64.tar.gz | tar -C /usr/local -xz');
          break;
      }
      lines.push('');
    }

    if (template.extensions && template.extensions.length > 0) {
      lines.push('RUN for ext in ' + template.extensions.join(' ') + '; do theia extension install "$ext"; done');
      lines.push('');
    }

    if (template.settings) {
      lines.push('RUN mkdir -p /home/ideia/.theia && cat > /home/ideia/.theia/settings.json << '\''EOF'\''');
      lines.push(JSON.stringify(template.settings, null, 2));
      lines.push('EOF');
      lines.push('');
    }

    lines.push('EXPOSE 3000');
    lines.push('USER ideia');
    lines.push('WORKDIR /home/project');
    lines.push('CMD ["node", "/ideia-backend/src/main.js"]');

    return lines.join('\n');
  }
}

export interface ImageTemplate {
  name: string;
  version: string;
  baseImage: string;
  systemPackages?: string[];
  languageRuntimes?: Array<{
    language: 'node' | 'python' | 'go' | 'rust' | 'java' | 'dotnet';
    version: string;
    packages?: string[];
  }>;
  extensions?: string[];
  settings?: Record<string, unknown>;
}
```

### 14.5 UsageMeter (Complete Implementation)

```typescript
// @ideia/usage-meter: complete-meter.ts

export class CompleteUsageMeter {
  async measureMetrics(ws: Workspace): Promise<PodMetrics> {
    const podName = ws.status.podName;
    const ns = ws.spec.orgId;

    const podMetrics = await this.k8s.getPodMetrics(ns, podName);

    const result: PodMetrics = {
      timestamp: new Date().toISOString(),
      workspaceId: ws.metadata.id,
      cpuCores: this.parseCPUCores(podMetrics.usage.cpu),
      memoryBytes: this.parseMemoryBytes(podMetrics.usage.memory),
      diskBytes: await this.getDiskUsage(podName, ns),
      networkBytesReceived: await this.getNetworkMetric(podName, ns, 'receive'),
      networkBytesTransmitted: await this.getNetworkMetric(podName, ns, 'transmit'),
      gpuUtilization: await this.getGPUUsage(podName, ns),
      periodSeconds: 60,
    };

    await this.eventBus.publish('workspace.metrics', result);
    return result;
  }

  async getAggregatedMetrics(orgId: string, since: string): Promise<AggregatedMetrics> {
    const metrics = await this.storage.queryMetrics(orgId, since);

    return {
      totalWorkspaces: new Set(metrics.map((m: PodMetrics) => m.workspaceId)).size,
      avgCPU: this.average(metrics.map((m: PodMetrics) => m.cpuCores)),
      avgMemoryGB: this.average(metrics.map((m: PodMetrics) => m.memoryBytes / (1024 * 1024 * 1024))),
      totalGPUSeconds: metrics.reduce((s: number, m: PodMetrics) => s + (m.gpuUtilization > 0 ? m.periodSeconds : 0), 0),
      totalNetworkGB: metrics.reduce((s: number, m: PodMetrics) => s + (m.networkBytesReceived + m.networkBytesTransmitted), 0) / (1024 * 1024 * 1024),
    };
  }

  private parseCPUCores(cpu: string): number {
    const match = cpu.match(/^(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  private parseMemoryBytes(memory: string): number {
    const match = memory.match(/^(\d+)(Ki|Mi|Gi)$/);
    if (!match) return 0;
    const val = parseInt(match[1]);
    switch (match[2]) { case 'Ki': return val * 1024; case 'Mi': return val * 1024 * 1024; case 'Gi': return val * 1024 * 1024 * 1024; default: return val; }
  }

  private average(values: number[]): number {
    return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
  }

  private async getDiskUsage(podName: string, ns: string): Promise<number> {
    const { stdout } = await exec('kubectl exec ' + podName + ' -n ' + ns + ' -- df -B1 /home/project | tail -1');
    const parts = stdout.trim().split(/\s+/);
    return parseInt(parts[2]) || 0;
  }

  private async getNetworkMetric(podName: string, ns: string, dir: 'receive' | 'transmit'): Promise<number> {
    const statFile = dir === 'receive' ? 'rx_bytes' : 'tx_bytes';
    const { stdout } = await exec('kubectl exec ' + podName + ' -n ' + ns + ' -- cat /sys/class/net/eth0/statistics/' + statFile);
    return parseInt(stdout.trim()) || 0;
  }

  private async getGPUUsage(podName: string, ns: string): Promise<number> {
    try {
      const { stdout } = await exec('kubectl exec ' + podName + ' -n ' + ns + ' -- nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader 2>/dev/null');
      return parseInt(stdout.trim()) || 0;
    } catch { return 0; }
  }
}

export interface PodMetrics {
  timestamp: string;
  workspaceId: string;
  cpuCores: number;
  memoryBytes: number;
  diskBytes: number;
  networkBytesReceived: number;
  networkBytesTransmitted: number;
  gpuUtilization: number;
  periodSeconds: number;
}
```

### 14.6 QuotaEnforcer (Complete Implementation)

```typescript
// @ideia/quota-enforcer: complete-quota-enforcer.ts

export class QuotaEnforcer {
  async enforceQuotaBeforeAction(
    userId: string, orgId: string, action: 'create' | 'resume' | 'upgrade',
    workspaceSpec?: Partial<WorkspaceSpec>
  ): Promise<void> {
    const org = await this.orgRepo.findById(orgId);
    const planConfig = PLAN_LIMITS[org.plan];
    const orgUsage = await this.usageMeter.getCurrentUsage(orgId);

    if (action === 'create' || action === 'resume') {
      const activeCount = await this.workspaceManager.countRunningByUserAndOrg(userId, orgId);
      if (activeCount >= planConfig.maxWorkspaces) {
        throw new AppError('MAX_WORKSPACES',
          'Active workspace limit reached: ' + activeCount + '/' + planConfig.maxWorkspaces + '. Hibernate or delete a workspace first.', 429);
      }

      if (workspaceSpec?.resources?.cpu) {
        const requestedCPU = this.parseCPU(workspaceSpec.resources.cpu);
        if (orgUsage.totalCPU + requestedCPU > this.parseCPU(planConfig.maxCPU)) {
          throw new AppError('CPU_QUOTA',
            'CPU quota exceeded: ' + (orgUsage.totalCPU + requestedCPU) + ' > ' + planConfig.maxCPU + ' cores', 429);
        }
      }

      if (workspaceSpec?.resources?.memory) {
        const requestedMem = this.parseMemoryMB(workspaceSpec.resources.memory);
        if (orgUsage.totalMemoryMB + requestedMem > this.parseMemoryMB(planConfig.maxMemory)) {
          throw new AppError('MEMORY_QUOTA',
            'Memory quota exceeded: ' + (orgUsage.totalMemoryMB + requestedMem) + ' > ' + planConfig.maxMemory + ' MB', 429);
        }
      }
    }

    const dailyUsage = await this.usageMeter.getDailyUsage(orgId);
    const dailyLimit = this.getDailyLimit(org.plan);
    if (dailyUsage.computeHours >= dailyLimit.computeHours) {
      throw new AppError('DAILY_LIMIT',
        'Daily compute limit reached: ' + dailyUsage.computeHours + '/' + dailyLimit.computeHours + ' hours', 429);
    }

    const billingStatus = await this.billingService.getStatus(orgId);
    if (billingStatus === 'past_due' || billingStatus === 'suspended') {
      throw new AppError('BILLING_SUSPENDED',
        'Organization billing is past due. Please update payment method.', 402);
    }
  }

  private getDailyLimit(plan: string): { computeHours: number } {
    switch (plan) {
      case 'free': return { computeHours: 4 };
      case 'pro': return { computeHours: 24 };
      case 'enterprise': return { computeHours: 168 };
      default: return { computeHours: 4 };
    }
  }

  private parseCPU(cpu: string): number { return parseInt(cpu) || 0; }

  private parseMemoryMB(mem: string): number {
    const match = mem.match(/^(\d+)(Gi|Mi)$/);
    if (!match) return 0;
    const val = parseInt(match[1]);
    return match[2] === 'Gi' ? val * 1024 : val;
  }
}
```

---

## 15. Implementation Roadmap

### 15.1 Phases

| Fase | Descricao | Pacotes | Esforco | Dependencias | Riscos |
|------|-----------|---------|---------|-------------|--------|
| P1 | Control Plane Core — WorkspaceManager, SessionManager, UserManager, CRD, K8s provisioner | @ideia/cloud-operator @ideia/session-manager @ideia/user-manager | 4 semanas (2 devs) | Theia Cloud SDK, K8s client | Complexidade de estado distribuido |
| P2 | Networking & Storage — Ingress, subdomain, WebSocket proxy, PVC, S3 backup | @ideia/network @ideia/cloud-operator | 3 semanas (2 devs) | P1, Traefik, cert-manager | WebSocket timeout e reconnect |
| P3 | Auth & Security — JWT, OAuth2, SSO, RBAC, IP allowlist, API tokens | @ideia/auth @ideia/user-manager | 3 semanas (2 devs) | P1 | Compatibilidade com IdP variados |
| P4 | Metering & Pricing — UsageMeter, QuotaEnforcer, Stripe integration, invoices | @ideia/billing @ideia/usage-meter @ideia/quota-enforcer | 3 semanas (2 devs) | P1, P3 | Precisao de metering (arredondamento, race) |
| P5 | Monitoring & Observability — Health checks, metrics, activity tracking, cost attribution | @ideia/observability @ideia/billing | 2 semanas (1 dev) | P1, P4 | Volume de dados de metrics |
| P6 | Hardening & Scale — Multi-regiao, GPU, air-gapped enterprise, chaos testing | @ideia/cloud-operator @ideia/image-registry | 4 semanas (2 devs) | P1-P5 | Custo de infra multi-regiao |

**Total estimado:** 19 semanas (~5 meses) com equipe de 2-3 devs
**Esforco total:** ~76 semanas-dev (380 dias-dev)

### 15.2 Milestones

| Marco | Data Alvo | Entregaveis | Gate |
|-------|-----------|-------------|------|
| M1 | Semana 4 | Workspace CRD, criacao de pod funcional, hello world Theia via browser | Smoke test: criar workspace + conectar browser |
| M2 | Semana 7 | Session hibernation/resume, ingress com TLS, subdomain por workspace | E2E: criar, hibernar, resume, deletar |
| M3 | Semana 10 | Login OAuth2 (GitHub/Google), SSO SAML, API tokens, 3 niveis de role | Security: OWASP scan + auth bypass test |
| M4 | Semana 13 | Usage metering, quota enforcement, Stripe subscription, invoice generation | Billing: criar subscription, usar ate quota, bloquear |
| M5 | Semana 15 | Grafana dashboard por workspace, health alerts, cost attribution reports | Observability: metricas em tempo real |
| M6 | Semana 19 | Multi-regiao EU/US, GPU workspaces, air-gapped enterprise bundle | Chaos: kill pod aleatorio, verificar recovery |

### 15.3 Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| K8s CRD complexidade de estado | Alta | Medio | Usar controller-runtime com reconciler padrao |
| WebSocket proxy timeout em sessoes longas | Media | Alto | Heartbeat bidirecional a cada 15s + reconexao automatica |
| Compatibilidade com provedores SSO variados | Media | Alto | Testar com GitHub, Google, GitLab, Okta, Azure AD |
| Precisao de billing (arredondamento) | Baixa | Alto | Usar integers para cents, truncar com floor |
| Custo de infra multi-regiao | Alta | Medio | Spot instances para dev, on-demand para producao |
| Vazamento de memoria em pods longos | Media | Alto | Limitar maxLifetime por tier + restart forcado |
| Ataque entre tenants via network | Baixa | Critico | NetworkPolicy deny-all por padrao + audit regular |

### 15.4 Success Metrics

| Metric | Target | Measurement | Instrument |
|--------|--------|-------------|------------|
| Time-to-workspace (criacao ate pronto) | < 30s | P50 latency do workspace creation API | Prometheus + Grafana |
| Workspace availability | > 99.9% | Proporcao de health checks bem-sucedidos | Health Checker |
| Session hibernation success rate | > 99.5% | Hibernacoes sem perda de dados | Audit log |
| User retention (30 dias) | > 60% | Proporcao de usuarios ativos | Activity Tracker |
| Billing accuracy | < 0.1% erro | Diferenca entre metered e billed | Reconciliation job |
| Mean time to resume hibernated | < 15s | P99 latency do resume | Usage Meter |
| Tenant isolation breaches | 0 | NetworkPolicy violations | Falco + audit |

### 15.5 Comparacao com Concorrentes

| Capacidade | GitHub Codespaces | Devin | Cursor | IDEIA Theia Cloud (alvo) |
|------------|------------------|-------|--------|-------------------------|
| Tempo de criacao | ~20s | ~60s | ~45s | < 30s |
| Max CPU | 32 cores | 8 cores | 16 cores | 32 cores (pro) / 128 cores (enterprise) |
| Max RAM | 64 GB | 32 GB | 64 GB | 128 GB |
| GPU suportada | Nao | Nao | Nao | T4/L4/A100 (pro+) |
| Persistent storage | Sim (git) | Sim (VM snapshot) | Limitado | PVC + S3 + git |
| Custom image | Dev Container | Nao | Nao | Dockerfile builder |
| Offline mode | Nao | Nao | Nao | PWA + service worker |
| Colaboracao | Live Share | Nao | Nao | Nativa (Theia) |
| Self-hosted | Nao | Nao | Nao | Sim |
| Audit log | Basico | Avancado | Basico | SHA-256 chain |
| SSO | GitHub only | Nao | Nao | SAML/OIDC multi-IdP |

---

## 16. Conexoes

### 16.1 Matriz de Conexoes com Estudos Existentes

| Estudo | Conexao | Tipo | Descricao |
|--------|---------|------|-----------|
| S11 (Theia IDE Integration) | Base | Forte | Theia Cloud e extensao natural do Theia desktop. Toda configuracao de plugin, widget e servico do Theia se aplica ao cloud. Os containers rodam o mesmo backend Theia. |
| S15 (Cloud Infrastructure) | Infraestrutura | Forte | Define provedores cloud (AWS/GCP/Azure), IaC (Terraform), VPC, DNS, CDN. O Theia Cloud usa AWS EKS ou GCP GKE como base de orquestracao. |
| S41 (Remote Web IDE) | Arquitetura | Forte | Estudo S41 define a arquitetura de desenvolvimento remoto. O Theia Cloud e a implementacao concreta do modelo Browser/Web IDE descrito na secao 7 do S41. |
| S65 (Enterprise) | Go-to-market | Forte | Requisitos enterprise (SSO, VPC, audit, compliance) sao implementados nas secoes 11 (Auth) e 12 (Monitoring) deste estudo. |
| S14 (Authentication) | Seguranca | Forte | Autenticacao OAuth2, JWT, MFA, RBAC. Estudo S14 define a matriz de autenticacao que o Theia Cloud implementa no modulo @ideia/auth. |
| S22 (Collaboration) | Funcionalidade | Media | Colaboracao em tempo real via Theia native API. O SessionManager integra com o CollaborationManager para sessoes compartilhadas. |
| S56 (UX Transformation) | Experiencia | Media | Onboarding do Theia Cloud deve seguir diretrizes S56: time-to-first-workspace < 2min, command palette para acoes cloud. |
| S49 (Theia Preferences) | Configuracao | Fraca | Preferences do Theia Cloud sincronizadas via settings.json no PVC. Preferences de usuario sao salvas em S3 e restauradas em resumo. |
| S55 (Resilience) | Infraestrutura | Media | Health checks, circuit breaker, self-healing. O WorkspaceHealthChecker implementa deteccao de falhas e restart automatico descrito em S55. |
| S52 (PR Automation) | CI/CD | Fraca | Workspaces ephemeral para CI/CD podem ser orquestrados pelo PR Automation Pipeline para ambientes de teste isolados. |

### 16.2 Pacotes @ideia Propostos

| Package | Descricao | Depende de | Dependencia de |
|---------|-----------|------------|----------------|
| @ideia/cloud-operator | K8s operator para Workspace CRD, provisionamento de pods/PVC/ingress | @ideia/core, @ideia/auth | @theia/core, @kubernetes/client-node |
| @ideia/session-manager | Gerenciamento de sessoes, heartbeat, timeout, hibernacao | @ideia/core | NATS JetStream (event bus) |
| @ideia/user-manager | Registro, organizacao, teams, API tokens, RBAC | @ideia/core | bcrypt, jsonwebtoken |
| @ideia/auth | JWT, OAuth2, SSO/OIDC, IP allowlist, middleware Express | @ideia/core | passport, openid-client |
| @ideia/network | Ingress, subdomain, WebSocket proxy, port forwarding, VPC peering | @ideia/core | http-proxy, ws |
| @ideia/usage-meter | Coleta de metricas de pod, tracking de uso, agregacao | @ideia/core | @kubernetes/client-node |
| @ideia/quota-enforcer | Validacao de quotas por tenant, tier enforcement | @ideia/core | @ideia/usage-meter |
| @ideia/billing | Stripe/Paddle integration, invoice, metering API | @ideia/core | stripe |
| @ideia/image-registry | Docker image builder, cache, tag management, air-gap sync | @ideia/core | dockerode |
| @ideia/observability | Health checks, activity tracking, cost attribution | @ideia/core | prom-client, winston |

### 16.3 Diagrama de Dependencias

```
                    @ideia/core (fundacao)
                      /    |    |    \
                     /     |    |     \
                    v      v    v      v
        @ideia/auth  @ideia/session-manager  @ideia/network
             |              |                     |
             v              v                     v
        @ideia/user-manager @ideia/cloud-operator
                                    |
                                    v
                    +---------------+---------------+
                    |               |               |
                    v               v               v
         @ideia/usage-meter  @ideia/image-registry  @ideia/observability
                    |               |
                    v               v
         @ideia/quota-enforcer  @ideia/billing
```

### 16.4 Cronograma de Integracao

```
Semana:  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19
P1:      [=======] (CRD + provisioner + WorkspaceManager)
P2:                  [=======] (ingress + storage + network)
P3:                            [=======] (auth + SSO + tokens)
P4:                                      [=======] (metering + billing)
P5:                                                [=======] (monitoring)
P6:                                                          [=======] (hardening)
S11:     [=======================================================]
S15:     [=======================================================]
S41:     [=======================================================]
S14:           [=======]                            [=======]
S65:                                                     [=======]
```

### 16.5 Criterios de Aceitacao por Conexao

| Conexao | Criterio | Teste |
|---------|----------|-------|
| S11 (Theia) | Container roda backend Theia com suporte a plugins e extensoes | Theia abre no browser com 3 extensoes pre-instaladas |
| S15 (Cloud) | Deploy automatizado via Terraform em AWS EKS e GCP GKE | `terraform apply --auto-approve` cria cluster funcional |
| S41 (Remote) | Workspace acessivel via navegador sem instalacao local | Zero-install: novo usuario cria workspace e programa em 30s |
| S65 (Enterprise) | SSO SAML + VPC peering + audit SHA-256 + 90d retention | Auditoria externa valida compliance SOC2 |
| S14 (Auth) | 3 provedores OAuth2 + email+senha + API tokens com scopes | Matrix test: 4 combinacoes de auth para cada endpoint |
| S22 (Collab) | 2 usuarios editam o mesmo workspace simultaneamente | Live share: ambos veem cursor e alteracoes em tempo real |
| S56 (UX) | Time-to-first-workspace < 2min, workspace creation < 30s | Teste com usuario novo cronometrado |

---

> **Nota:** Este estudo define a arquitetura completa de implantacao multi-tenant do Theia Cloud para a IDEIA. A implementacao segue o padrao de pacotes @theia/* e @ideia/* com Clean Architecture, Inversify DI e integracao com o ecossistema existente (NATS JetStream, LangGraph, PostgreSQL). O roadmap de 19 semanas prioriza o control plane core (P1) como base para todas as capacidades subsequentes.
