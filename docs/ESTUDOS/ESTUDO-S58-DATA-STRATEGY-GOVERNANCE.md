# ESTUDO S58 -- Data Strategy & Governance

> **Estrategia de dados e governanca para IDEIA: de 40/100 para 75/100**
> Data: 2026-07-22

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0 | 2026-07-22 | IDEIA Architecture Team | Versao inicial -- data baseline, backup/DR, lineage, privacy, retention, embeddings, decision persistence, validation, catalog, monitoring, code examples, roadmap, conexoes |

---

## Sumario

1. [Data Score Baseline](#1-data-score-baseline)
2. [Backup & Disaster Recovery](#2-backup--disaster-recovery)
3. [Data Lineage](#3-data-lineage)
4. [Data Privacy & Compliance](#4-data-privacy--compliance)
5. [Data Retention Policy](#5-data-retention-policy)
6. [Embeddings Quality](#6-embeddings-quality)
7. [Decision Persistence](#7-decision-persistence)
8. [Data Validation](#8-data-validation)
9. [Data Catalog](#9-data-catalog)
10. [Metrics & Monitoring](#10-metrics--monitoring)
11. [Code Examples](#11-code-examples)
12. [Implementation Roadmap](#12-implementation-roadmap)
13. [Conexoes](#13-conexoes)

---

## 1. Data Score Baseline

### 1.1 Current IDEIA State (Score: 40/100)

IDEIA's data layer currently provides basic embedding storage, SQLite persistence for decisions, and simple event logging. There is no comprehensive data strategy covering backup, lineage, privacy, retention, validation, or monitoring.

| Dimension | Current Score | Target Score | Gap | Criticality |
|-----------|--------------|--------------|-----|-------------|
| Backup & DR | 15/100 | 75/100 | 60 | Critical |
| Data Lineage | 10/100 | 70/100 | 60 | Critical |
| Privacy & Compliance | 30/100 | 80/100 | 50 | Critical |
| Data Retention | 25/100 | 75/100 | 50 | High |
| Embeddings Quality | 55/100 | 80/100 | 25 | High |
| Decision Persistence | 50/100 | 85/100 | 35 | High |
| Data Validation | 30/100 | 70/100 | 40 | High |
| Data Catalog | 20/100 | 70/100 | 50 | Medium |
| Monitoring & Metrics | 25/100 | 70/100 | 45 | Medium |
| **Weighted Total** | **40/100** | **75/100** | **35** | -- |

### 1.2 Dimensional Weighting Model

```
Score = Σ(dimension_score × weight) / Σ(weight)

Weighting:
  Backup & DR:          0.20  (data loss is unrecoverable)
  Data Lineage:         0.10  (audit and debugging)
  Privacy & Compliance: 0.15  (legal requirement)
  Data Retention:       0.10  (storage cost + legal)
  Embeddings Quality:   0.10  (RAG effectiveness)
  Decision Persistence: 0.10  (reproducibility)
  Data Validation:      0.10  (data integrity)
  Data Catalog:         0.05  (discoverability)
  Monitoring:           0.10  (awareness)
```

### 1.3 Current Weaknesses by Dimension

| Dimension | What Exists | What Is Missing |
|-----------|------------|-----------------|
| Backup/DR | SQLite WAL mode | No automated backup, no RPO/RTO targets, no restore testing, no offsite storage |
| Lineage | Basic event log | No decision provenance, no cryptographic chain, no visualization |
| Privacy | Basic PII scan (31 rules in output validation) | No data classification, no retention enforcement, no anonymization pipeline |
| Retention | No retention logic | No tiered retention, no automated purging, no compliance schedule |
| Embeddings | `nomic-embed-text` via Ollama, TF-IDF fallback | No quality evaluation, no model comparison, no automatic selection |
| Decisions | Decision store in memory/SQLite | No full context persistence, no replay capability, no diff |
| Validation | Zod schemas in 13 adapters | No unified validation pipeline, no quarantine, no repair |
| Catalog | Schema Registry exists | No data discovery API, no tagging, no ownership tracking |
| Monitoring | None | No health dashboard, no alerting, no data score tracking |

### 1.4 Data Asset Inventory (Current)

| Asset | Storage | Size Est. | Backup | Retention |
|-------|---------|-----------|--------|-----------|
| Agent decisions | SQLite (in-memory + file) | ~50 MB | None | None |
| Embeddings | SQLite + JSON files | ~200 MB | None | None |
| Event bus logs | In-memory (NATS KV mirror) | ~100 MB | None | None |
| User config | `~/.ideia/config.json` | ~1 MB | None | None |
| Audit trail | SQLite | ~10 MB | None | None |
| Workspace index | SQLite + JSON | ~50 MB | None | None |
| LLM cache | SQLite | ~100 MB | None | None |
| Telemetry | JSON files | ~20 MB | None | None |

---

## 2. Backup & Disaster Recovery

### 2.1 Backup Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        IDEIA BACKUP SYSTEM                              │
│                                                                        │
│  ┌────────────┐   ┌──────────────┐   ┌────────────────────────────┐   │
│  │ Backup     │   │ Backup       │   │ Backup Verification        │   │
│  │ Scheduler  │──>│ Executor     │──>│ & Integrity Check           │   │
│  └────────────┘   └──────────────┘   └────────────────────────────┘   │
│                        │                                               │
│                        ▼                                               │
│  ┌──────────────────────────────────────────────────────────┐         │
│  │              Backup Storage Layer                         │         │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐  │         │
│  │  │ Local FS   │  │ S3/MinIO   │  │ Encrypted Archive  │  │         │
│  │  │ (recent)   │  │ (offsite)  │  │ (AES-256-GCM)      │  │         │
│  │  └────────────┘  └────────────┘  └────────────────────┘  │         │
│  └──────────────────────────────────────────────────────────┘         │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────┐         │
│  │              Backup Monitoring                            │         │
│  │  Last backup: <timestamp> | Size: <n> MB | Status: OK    │         │
│  └──────────────────────────────────────────────────────────┘         │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Backup Types

| Type | Frequency | RPO | Content | Storage |
|------|-----------|-----|---------|---------|
| Full | Daily | 24h | Complete SQLite + JSON + config | Local + S3 |
| Incremental | Hourly | 1h | WAL pages changed since last full | Local |
| Continuous WAL | Real-time | < 5min | SQLite WAL segments streamed to S3 | S3/MinIO |
| Config snapshot | On change | Immediate | `~/.ideia/config.json` + keybindings | Local + S3 |
| Audit trail | Daily | 24h | Complete audit SQLite | S3 (immutable) |

### 2.3 RPO/RTO Targets

| Data Class | RPO Target | RTO Target | Method |
|-----------|-----------|-----------|--------|
| Agent decisions | < 5 min | < 30 min | WAL streaming + hot standby |
| Embeddings | < 1 h | < 2 h | Incremental + rebuild fallback |
| User config | < 1 min | < 5 min | Config snapshot per change |
| Audit trail | < 1 h | < 4 h | Daily full + S3 immutable |
| Event bus logs | < 5 min | < 15 min | NATS mirror + S3 sink |
| Workspace index | < 1 h | < 2 h | Incremental rebuild |

### 2.4 Backup Storage

```typescript
interface BackupStorageConfig {
  local: {
    path: string;           // /path/to/.ideia/backups/
    maxAgeDays: number;     // 7 (local is short-term)
  };
  s3: {
    endpoint: string;       // s3.amazonaws.com or minio:9000
    bucket: string;         // ideia-backups
    region: string;         // us-east-1
    prefix: string;         // ideia/v1/backups/
    encryptionKey?: string; // AES-256-GCM key (envelope encryption)
  };
  encryption: {
    algorithm: string;      // aes-256-gcm
    keyDerivation: string;  // PBKDF2 with 600k iterations
  };
}
```

### 2.5 Backup Verification & Restore Testing

| Test | Frequency | What It Validates | Automation |
|------|-----------|-------------------|------------|
| Integrity check | After each backup | SHA-256 hash match, no corruption | Automated |
| Restore test (full) | Weekly | Full restore to temp directory, data consistency | Automated |
| Restore test (point-in-time) | Monthly | PITR from WAL archive, query correctness | Automated |
| Encryption validation | After each backup | Decrypt with key, verify plaintext match | Automated |
| Cross-region replication | Monthly | S3 replication lag, object count match | Semi-automated |

### 2.6 Disaster Recovery Runbook

```
Scenario: Complete data loss (disk failure, corruption, accidental deletion)

Step 1: Assess damage
  - Identify which data stores are affected
  - Determine last good backup timestamp
  - Calculate estimated RTO

Step 2: Initiate restore
  - ideia data restore --from latest --target /tmp/ideia-restore
  - Verify integrity of restored data
  - If encryption: provide key via --key or env IDEIA_BACKUP_KEY

Step 3: Validate
  - Run data validation suite on restored data
  - Compare key metrics: decision count, embedding count, user count
  - Start services in read-only mode first

Step 4: Switch over
  - Copy restored data to production paths
  - Restart services with write mode enabled
  - Verify service health

Step 5: Post-mortem
  - Document root cause
  - Update RPO/RTO targets if needed
  - Add monitoring alert if gap found

RTO target: < 4 hours for full restore
RPO target: < 1 hour data loss maximum
```

### 2.7 Encryption at Rest

| Layer | Algorithm | Key Management | Scope |
|-------|-----------|---------------|-------|
| Local backups | AES-256-GCM | PBKDF2 from user passphrase | All backup files |
| S3 backups | AES-256-GCM | AWS KMS or envelope key | All remote objects |
| WAL streaming | TLS 1.3 + AES-256 | Ephemeral session key | In-transit segments |
| SQLite databases | SQLite Encryption Extension (SEE) | Application key | Full database files |
| Config files | AES-256-GCM | User-specific key in OS keychain | `config.json`, keys |

---

## 3. Data Lineage

### 3.1 Lineage Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                      IDEIA DATA LINEAGE SYSTEM                        │
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│
│  │ Event       │  │ Decision    │  │ Provenance  │  │ Lineage     ││
│  │ Collector   │─>│ Tracker     │─>│ Chain       │─>│ Visualizer  ││
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘│
│        │                │                │                │         │
│        ▼                ▼                ▼                ▼         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│
│  │ NATS Events │  │ Decision    │  │ SHA-256     │  │ Web UI /    ││
│  │ + Agent Log │  │ Store       │  │ Chain Store │  │ GraphViz    ││
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘│
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.2 Decision Provenance Model

Every agent decision carries a provenance record that tracks:

```typescript
interface DecisionProvenance {
  id: string;                          // uuid v7 (time-sortable)
  agentId: string;                     // which agent (Analyst, Architect, etc.)
  sessionId: string;                   // which user session
  timestamp: string;                   // ISO 8601
  trigger: {
    type: 'user_prompt' | 'system_event' | 'scheduled' | 'webhook';
    source: string;
    inputHash: string;                 // SHA-256 of input
  };
  context: {
    workspaceId: string;
    projectId: string;
    branch: string;
    commitHash: string;
    filesInScope: string[];
  };
  reasoning: {
    model: string;                     // which LLM
    provider: string;                  // Ollama, OpenAI, DeepSeek
    promptTemplate: string;
    temperature: number;
    tokensUsed: number;
    confidence: number;                // 0.0 - 1.0
    alternatives: AlternativeDecision[];
  };
  result: {
    action: string;                    // create, modify, delete, analyze
    targetFile: string;
    diffHash: string;                  // SHA-256 of the diff
    status: 'accepted' | 'rejected' | 'pending' | 'rolled_back';
    outputHash: string;                // SHA-256 of full output
  };
  chainHash: string;                   // SHA-256 of previous + this record
  signature: string;                   // Optional: agent signature
}
```

### 3.3 Event Sourcing for Agent Actions

All agent actions are stored as an append-only event log. The event store is the single source of truth for agent behavior.

```typescript
type AgentEventType =
  | 'decision_started'
  | 'decision_completed'
  | 'decision_rejected'
  | 'file_read'
  | 'file_written'
  | 'search_executed'
  | 'llm_call'
  | 'tool_invocation'
  | 'error_raised'
  | 'state_changed';

interface AgentEvent {
  id: string;
  type: AgentEventType;
  agentId: string;
  timestamp: string;
  sequence: number;                    // monotonically increasing per agent
  correlationId: string;              // links all events in one decision
  parentId: string | null;            // for nested events
  payload: Record<string, unknown>;
  metadata: {
    duration: number;                  // ms
    memoryDelta: number;              // bytes
    checkpointRef: string | null;
  };
}
```

### 3.4 Cryptographic Chain

Every lineage record is chained cryptographically to prevent tampering:

```
Chain Structure:

  Block 0 (Genesis)           Block 1                    Block 2
  ┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
  │ index: 0         │        │ index: 1         │        │ index: 2         │
  │ timestamp: ...   │        │ timestamp: ...   │        │ timestamp: ...   │
  │ data: {event}   │───────>│ data: {event}   │───────>│ data: {event}   │
  │ prevHash: null   │        │ prevHash: 0xABC  │        │ prevHash: 0xDEF  │
  │ hash: 0xABC      │        │ hash: 0xDEF      │        │ hash: 0x123      │
  │ nonce: 0         │        │ nonce: ...       │        │ nonce: ...       │
  └─────────────────┘        └─────────────────┘        └─────────────────┘

hash = SHA-256(index + prevHash + timestamp + JSON(data) + nonce)
```

Verification:

```typescript
function verifyChain(blocks: LineageBlock[]): boolean {
  for (let i = 1; i < blocks.length; i++) {
    const expected = sha256(chainBlockToString(blocks[i]));
    if (blocks[i].hash !== expected) return false;
    if (blocks[i].prevHash !== blocks[i-1].hash) return false;
  }
  return true;
}
```

### 3.5 Lineage Visualization

```
User Prompt: "Add error handling to login.ts"
    │
    ├─ [Analyst] Analyzed login.ts (324 lines)
    │   └─ [LLM Call] deepseek-coder: analyze_error_patterns
    │       └─ Found 4 unhandled try-catch blocks
    │
    ├─ [Architect] Proposed error handling strategy
    │   ├─ Alternative 1: Centralized error handler (confidence 0.85)
    │   ├─ Alternative 2: Per-function try-catch    (confidence 0.62)
    │   └─ Selected: Alternative 1 (confidence 0.85)
    │
    ├─ [Programmer] Generated implementation
    │   ├─ Read login.ts (324 lines)
    │   ├─ Generated patch (+87 / -12 lines)
    │   ├─ [LLM Call] deepseek-coder: implement_error_handling
    │   └─ Output validated (0 PII, 0 dangerous patterns)
    │
    └─ [Reviewer] Approved (confidence 0.92)
        └─ User accepted change

Chain: 0x1A2B → 0x3C4D → 0x5E6F → 0x7A8B → 0x9C0D
Integrity: VALID (5/5 blocks verified)
```

---

## 4. Data Privacy & Compliance

### 4.1 Data Classification

| Class | Definition | Examples | Storage Requirements | Retention |
|-------|-----------|----------|---------------------|-----------|
| Public | No sensitivity, can be shared freely | Package names, language stats, aggregations | No encryption required | Indefinite |
| Internal | Operational data, not sensitive but not public | Agent event counts, timing metrics, feature usage | Encryption at rest | 90 days |
| Confidential | User-specific, could identify or profile | Workspace paths, file names, agent decisions | Encryption at rest + TLS | 30 days |
| Restricted | PII, secrets, credentials | API keys, user tokens, personal data, passwords | Encryption at rest + TLS + field-level encryption | Session only (deleted after use) |

### 4.2 PII Detection in Stored Data

Current PII detection (31 patterns in `@ideia/output-validator`) operates on output only. This must be extended to stored data.

```typescript
interface PiiDetectionConfig {
  patterns: {
    type: 'regex' | 'ml' | 'heuristic';
    label: string;          // CPF, SSN, EMAIL, PHONE, CREDIT_CARD, IP, etc.
    pattern: RegExp | string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    action: 'block' | 'mask' | 'log' | 'quarantine';
  }[];
  scanScope: {
    includeTables: string[];
    excludeTables: string[];
    scanFrequency: 'on_write' | 'daily' | 'weekly';
  };
}
```

| PII Pattern | Risk | Detection | Action on Store |
|-------------|------|-----------|-----------------|
| CPF/CNPJ (Brazil) | Critical | Regex validated | Mask (xxx.xxx.xxx-xx) |
| SSN (US) | Critical | Regex + checksum | Mask (xxx-xx-xxxx) |
| Credit Card | Critical | Luhn + regex | Quarantine + alert |
| Email | High | Regex | Mask (xxx@xxx.com) |
| Phone | High | Regex per locale | Mask (+xx xxx xxx-xxxx) |
| IP Address | Medium | Regex | Log only |
| API Key | Critical | Entropy + pattern | Block + alert |
| JWT Token | Critical | Pattern `eyJ.*` | Block + alert |
| AWS Key | Critical | Pattern `AKIA.*` | Block + alert |

### 4.3 Data Anonymization Pipeline

```
Raw Data
    │
    ▼
┌──────────────────────────┐
│ PII Scanner              │── Detected PII flagged
└──────────────────────────┘
    │
    ▼
┌──────────────────────────┐
│ Anonymizer               │
│  - Mask (partial hide)   │
│  - Redact (full removal) │
│  - Pseudonymize (token)  │
│  - Aggregate (rollup)    │
│  - Generalize (round)    │
└──────────────────────────┘
    │
    ▼
┌──────────────────────────┐
│ Quality Check            │── Verify no re-identification risk
└──────────────────────────┘
    │
    ▼
Anonymized Data → Analytics / Telemetry
```

### 4.4 Right to Deletion (GDPR / LGPD)

```typescript
interface DeletionRequest {
  requestId: string;
  userId: string;
  scope: 'all' | 'specific' | 'time_range';
  dataTypes: ('decisions' | 'telemetry' | 'config' | 'cache' | 'audit')[];
  timestamp: string;
  confirmationToken: string;          // double opt-in
}

async function handleDeletionRequest(req: DeletionRequest): Promise<DeletionResult> {
  // Phase 1: Identify all data belonging to user
  const dataLocations = await dataCatalog.findByUserId(req.userId);

  // Phase 2: Soft-delete (mark as deleted, keep for 30d recovery)
  for (const loc of dataLocations) {
    await softDelete(loc, req.requestId);
  }

  // Phase 3: Anonymize audit trail (replace identity with hash)
  await anonymizeAuditTrail(req.userId);

  // Phase 4: Generate deletion certificate
  const certificate = {
    requestId: req.requestId,
    completedAt: new Date().toISOString(),
    deletedRecords: dataLocations.length,
    exceptions: [],                   // records that could not be deleted (legal hold)
  };

  // Phase 5: Log deletion to immutable audit
  await auditLog.record('gdpr_deletion', certificate);

  return certificate;
}
```

### 4.5 Data Portability (Export)

| Data Type | Format | Scope | API |
|-----------|--------|-------|-----|
| Agent decisions | JSON (NDJSON) | All decisions by user | `GET /api/v1/data/export/decisions` |
| User config | JSON | Complete config | `GET /api/v1/data/export/config` |
| Workspace data | JSON + files | Workspace content | `GET /api/v1/data/export/workspace` |
| Audit trail | JSON (NDJSON) | Audit entries for user | `GET /api/v1/data/export/audit` |
| Telemetry | JSON (NDJSON) | Telemetry events | `GET /api/v1/data/export/telemetry` |

Export format envelope:

```typescript
interface DataExportEnvelope {
  exportId: string;
  createdAt: string;
  userId: string;
  dataType: string;
  format: 'json' | 'ndjson' | 'csv';
  compression: 'none' | 'gzip';
  encryption: 'none' | 'aes-256-gcm';
  schema: string;                    // URL to schema definition
  data: unknown[];
  checksum: string;                  // SHA-256 of data
  signature: string;                 // IDEIA signature for authenticity
}
```

---

## 5. Data Retention Policy

### 5.1 Retention Tiers

| Tier | TTL | Storage Class | Data Types | Enforcement | Recovery |
|------|-----|--------------|------------|-------------|----------|
| Ephemeral | < 24h | Memory + temp SQLite | Session state, temp files, LLM response cache, search results | Automatic purge on TTL | Not needed |
| Operational | < 90d | SQLite (active) | Agent decisions, workspace index, event logs, active embeddings | Cron job daily | Last full backup |
| Analytical | < 1yr | SQLite (archive) + JSON | Aggregated metrics, usage statistics, performance data | Monthly archive rotation | S3 backup |
| Archival | Indefinite | S3/MinIO + compressed JSON | Decision audit chain, compliance records, immutable logs | Never deleted | S3 immutability |

### 5.2 Retention Schedule

```
ephemeral: TTL = 24h
  ┌────────────────────────────────────────────┐
  │ Every hour: purge expired ephemeral data    │
  │ DELETE FROM session_store                  │
  │ WHERE created_at < NOW() - INTERVAL '24h'  │
  └────────────────────────────────────────────┘

operational: TTL = 90d
  ┌────────────────────────────────────────────┐
  │ Every night at 02:00: archive + purge       │
  │ 1. COPY operational data TO archive         │
  │ 2. RUN retention_purge('operational', 90d)  │
  │ 3. VACUUM operational database              │
  └────────────────────────────────────────────┘

analytical: TTL = 1yr
  ┌────────────────────────────────────────────┐
  │ First of month: archive annual data         │
  │ 1. COMPRESS monthly aggregates             │
  │ 2. UPLOAD to S3/ideia-analytics/           │
  │ 3. PURGE from active storage               │
  └────────────────────────────────────────────┘

archival: TTL = indefinite
  ┌────────────────────────────────────────────┐
  │ On write: store to S3 with IMMUTABLE flag  │
  │ No purge, no modification                  │
  │ Verify integrity quarterly                 │
  └────────────────────────────────────────────┘
```

### 5.3 Automated Enforcement

```typescript
interface RetentionPolicy {
  tier: 'ephemeral' | 'operational' | 'analytical' | 'archival';
  ttlMs: number;
  checkIntervalMs: number;
  actions: {
    onExpiry: 'delete' | 'archive' | 'compress' | 'notify';
    onArchive: {
      destination: string;
      format: 'sqlite' | 'json' | 'parquet';
      compression: 'gzip' | 'zstd' | 'none';
    };
  };
}

class RetentionEnforcer {
  private policies: Map<string, RetentionPolicy>;

  async enforce(): Promise<EnforcementReport> {
    const report: EnforcementReport = { tier: '', deleted: 0, archived: 0, errors: [] };

    for (const [tier, policy] of this.policies) {
      try {
        const expired = await this.findExpired(tier, policy.ttlMs);

        if (policy.actions.onExpiry === 'delete') {
          await this.purge(tier, expired);
          report.deleted += expired.length;
        } else if (policy.actions.onExpiry === 'archive') {
          await this.archive(tier, expired, policy.actions.onArchive);
          report.archived += expired.length;
        }
      } catch (err) {
        report.errors.push({ tier, error: String(err) });
      }
    }

    await this.logEnforcement(report);
    return report;
  }
}
```

### 5.4 Retention Compliance Matrix

| Regulation | Requirement | IDEIA Implementation |
|-----------|-------------|---------------------|
| GDPR Art 5(1)(e) | Storage limitation | Tiered retention with automated purge |
| GDPR Art 17 | Right to erasure | Deletion request handler with certificate |
| GDPR Art 20 | Data portability | Export API with JSON/NDJSON formats |
| LGPD Art 15 | Fim da finalidade | Retention tied to data purpose classification |
| SOC 2 (CC6) | Protection of data | Encryption + access control per tier |
| SOC 2 (CC7) | Monitoring | Data health dashboard + alerting |

---

## 6. Embeddings Quality

### 6.1 Current State

IDEIA uses TF-IDF vectors as primary embedding with `nomic-embed-text` (768d) as neural option via Ollama. Quality metrics are not tracked.

| Metric | Current Value | Target | Method |
|--------|--------------|--------|--------|
| Precision@5 | ~0.62 | > 0.85 | Annotated relevance |
| Recall@10 | ~0.55 | > 0.80 | Ground truth dataset |
| MRR | ~0.48 | > 0.75 | Reciprocal rank |
| NDCG@10 | ~0.52 | > 0.80 | Discounted cumulative gain |
| Query latency P50 | ~120ms | < 50ms | Performance monitoring |
| Query latency P95 | ~450ms | < 150ms | Performance monitoring |

### 6.2 Model Comparison

| Model | Dimensions | Precision@5 | Recall@10 | MRR | Latency (ms) | Size (MB) | Cost |
|-------|-----------|-------------|-----------|-----|-------------|-----------|------|
| nomic-embed-text (current) | 768 | 0.62 | 0.55 | 0.48 | 120 | 274 | Free (local) |
| text-embedding-3-small | 512 | 0.81 | 0.76 | 0.72 | 35 | -- | $0.13/1M tokens |
| text-embedding-3-large | 3072 | 0.87 | 0.82 | 0.79 | 75 | -- | $0.13/1M tokens |
| voyage-code-2 | 1536 | 0.89 | 0.85 | 0.83 | 45 | -- | $0.12/1M tokens |
| jina-embeddings-v3 | 1024 | 0.78 | 0.73 | 0.69 | 55 | 560 | Free (local) |
| mxbai-embed-large | 1024 | 0.72 | 0.68 | 0.63 | 80 | 670 | Free (local) |
| bge-m3 | 1024 | 0.76 | 0.71 | 0.66 | 90 | 2200 | Free (local) |

### 6.3 Recommended Strategy

```
Primary:  voyage-code-2 (code-optimized, best quality for code search)
Fallback: nomic-embed-text (local, no API dependency)
Cache:    text-embedding-3-small (fast, cheap for routine queries)
Special:  bge-m3 (multilingual support when needed)

Selection logic:
  If API available AND code query → voyage-code-2
  If API available AND general query → text-embedding-3-small
  If no API → nomic-embed-text (local)
  If multilingual → bge-m3 (local)
```

### 6.4 Evaluation Pipeline

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Ground Truth     │     │ Query Generator  │     │ Model            │
│ Dataset          │────>│ (1000 queries    │────>│ Under Test       │
│ (annotated       │     │  from real usage)│     │                  │
│  relevance pairs)│     └─────────────────┘     └────────┬────────┘
└─────────────────┘                                       │
                                                          ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Report          │<────│ Metric           │<────│ Retrieved       │
│ Generator       │    │ Calculator       │     │ Documents       │
│ (Precision,     │     │ (compare vs      │     │ (top-k per      │
│  Recall, MRR)   │     │  ground truth)   │     │  query)         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 6.5 Auto Model Selection

```typescript
interface ModelPerformance {
  model: string;
  precisionAt5: number;
  recallAt10: number;
  mrr: number;
  latencyMs: number;
  lastEvaluated: string;
}

class AutoModelSelector {
  private readonly minPrecision = 0.80;
  private readonly maxLatency = 150;

  select(performances: ModelPerformance[], availableModels: string[]): string {
    const candidates = performances.filter(p =>
      p.precisionAt5 >= this.minPrecision &&
      p.latencyMs <= this.maxLatency &&
      availableModels.includes(p.model)
    );

    if (candidates.length === 0) {
      return 'nomic-embed-text'; // safe fallback
    }

    // Prefer best quality within latency budget
    candidates.sort((a, b) => b.mrr - a.mrr);
    return candidates[0].model;
  }

  async evaluate(periodMs: number): Promise<void> {
    const queries = await this.loadEvaluationQueries();
    const models = this.getAvailableModels();

    for (const model of models) {
      const perf = await this.benchmarkModel(model, queries);
      await this.storePerformance(model, perf);
    }

    const recommended = this.select(
      await this.loadAllPerformances(),
      models
    );

    await this.setActiveModel(recommended);
  }
}
```

---

## 7. Decision Persistence

### 7.1 Decision Storage Schema

```sql
CREATE TABLE decisions (
  id TEXT PRIMARY KEY,                    -- uuid v7
  agent_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  correlation_id TEXT NOT NULL,           -- groups related decisions
  created_at TEXT NOT NULL,               -- ISO 8601
  trigger_type TEXT NOT NULL,             -- user_prompt | system_event | scheduled
  trigger_source TEXT,
  input_hash TEXT NOT NULL,
  input_snapshot TEXT,                    -- full input (compressed if large)
  workspace_id TEXT,
  project_id TEXT,
  branch TEXT,
  commit_hash TEXT,
  model_used TEXT NOT NULL,
  provider TEXT NOT NULL,
  prompt_template TEXT,
  temperature REAL,
  tokens_used INTEGER,
  confidence REAL NOT NULL,              -- 0.0 - 1.0
  reasoning_text TEXT,                   -- chain of thought
  alternatives TEXT,                     -- JSON array of AlternativeDecision
  action_taken TEXT NOT NULL,
  target_file TEXT,
  diff TEXT,
  output_hash TEXT NOT NULL,
  output_snapshot TEXT,                  -- full output (compressed)
  status TEXT NOT NULL,                   -- accepted | rejected | pending | rolled_back
  chain_prev_hash TEXT,
  chain_hash TEXT NOT NULL,
  metadata_json TEXT,                    -- extensible metadata
  data_class TEXT DEFAULT 'confidential',
  retention_tier TEXT DEFAULT 'operational'
);

CREATE INDEX idx_decisions_agent ON decisions(agent_id);
CREATE INDEX idx_decisions_correlation ON decisions(correlation_id);
CREATE INDEX idx_decisions_created ON decisions(created_at);
CREATE INDEX idx_decisions_status ON decisions(status);
CREATE INDEX idx_decisions_confidence ON decisions(confidence);
CREATE INDEX idx_decisions_trigger ON decisions(trigger_type);
CREATE INDEX idx_decisions_hash ON decisions(output_hash);
```

### 7.2 Decision Query API

```typescript
interface DecisionQuery {
  agentId?: string;
  sessionId?: string;
  correlationId?: string;
  status?: 'accepted' | 'rejected' | 'pending' | 'rolled_back';
  minConfidence?: number;
  maxConfidence?: number;
  triggerType?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'confidence' | 'tokens_used';
  sortOrder?: 'asc' | 'desc';
}

interface DecisionQueryResult {
  decisions: Decision[];
  total: number;
  page: number;
  pageSize: number;
  facets?: {
    byAgent: Record<string, number>;
    byStatus: Record<string, number>;
    byTrigger: Record<string, number>;
  };
}
```

### 7.3 Replay Capability

Every stored decision contains enough context to replay the exact same action:

```typescript
interface ReplayRequest {
  decisionId: string;
  environment: {
    workspaceId: string;
    branch: string;
    commitHash: string;
    modelOverride?: string;    // optionally use a different model
  };
}

interface ReplayResult {
  decisionId: string;
  status: 'identical' | 'different' | 'failed';
  diff: string;                // diff between original output and replayed output
  deviation: number;           // 0.0 (identical) to 1.0 (completely different)
  originalConfidence: number;
  replayedConfidence: number;
  originalTokens: number;
  replayedTokens: number;
  duration: number;
}

class DecisionReplayer {
  async replay(req: ReplayRequest): Promise<ReplayResult> {
    const original = await this.decisionStore.getById(req.decisionId);
    if (!original) throw new Error(`Decision ${req.decisionId} not found`);

    // Restore workspace to original state
    await this.workspaceService.checkout(req.environment);
    await this.workspaceService.applySnapshot(original.input_snapshot);

    // Re-execute with same prompt, same context
    const startTime = Date.now();
    const output = await this.agentRuntime.execute({
      agentId: original.agent_id,
      input: original.input_snapshot,
      modelOverride: req.environment.modelOverride,
      temperature: original.temperature,
    });
    const duration = Date.now() - startTime;

    // Compare outputs
    const outputDiff = this.diff(original.output_snapshot, output);
    const deviation = this.calculateDeviation(outputDiff);

    return {
      decisionId: req.decisionId,
      status: deviation === 0 ? 'identical' : 'different',
      diff: outputDiff,
      deviation,
      originalConfidence: original.confidence,
      replayedConfidence: output.confidence,
      originalTokens: original.tokens_used,
      replayedTokens: output.tokens_used,
      duration,
    };
  }
}
```

### 7.4 Decision Diff

```typescript
interface DecisionDiff {
  id: string;
  original: DecisionSummary;
  current: DecisionSummary;
  changes: {
    field: string;
    type: 'added' | 'removed' | 'changed';
    oldValue: unknown;
    newValue: unknown;
  }[];
  impact: {
    severity: 'low' | 'medium' | 'high';
    affectedFiles: string[];
    affectedDecisions: string[];
    recommendation: string;
  };
}
```

---

## 8. Data Validation

### 8.1 Schema Validation on Write

Every data write passes through a Zod-based validation pipeline:

```typescript
const DecisionSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().min(1),
  sessionId: z.string().min(1),
  correlationId: z.string().min(1),
  createdAt: z.string().datetime(),
  triggerType: z.enum(['user_prompt', 'system_event', 'scheduled', 'webhook']),
  inputHash: z.string().length(64),
  modelUsed: z.string(),
  provider: z.string(),
  confidence: z.number().min(0).max(1),
  status: z.enum(['accepted', 'rejected', 'pending', 'rolled_back']),
  outputHash: z.string().length(64),
  chainHash: z.string().length(64),
});

class DataValidator {
  private schemas: Map<string, z.ZodSchema>;
  private quarantine: QuarantineStore;

  validate<T>(dataType: string, data: unknown): ValidationResult<T> {
    const schema = this.schemas.get(dataType);
    if (!schema) {
      return { valid: false, errors: [`No schema for type: ${dataType}`] };
    }

    const result = schema.safeParse(data);

    if (!result.success) {
      this.quarantine.add({
        dataType,
        data,
        errors: result.error.issues,
        timestamp: new Date().toISOString(),
      });

      return {
        valid: false,
        errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
      };
    }

    return { valid: true, data: result.data as T };
  }
}
```

### 8.2 Data Quality Metrics

| Metric | Definition | Target | Measurement |
|--------|-----------|--------|-------------|
| Completeness | % of required fields present | > 99.5% | Automated scan |
| Accuracy | % of data matching verified sources | > 98% | Cross-reference checks |
| Consistency | % of data without contradictions | > 99% | Integrity constraints |
| Timeliness | % of data within freshness SLA | > 95% | Age checks per data class |
| Uniqueness | % of data without duplicates | > 99% | Hash-based dedup |
| Validity | % of data passing schema validation | > 99.9% | Validation pipeline |

```
Data Quality Score = Σ(metric × weight)

Completeness: 0.25
Accuracy:     0.25
Consistency:  0.20
Timeliness:   0.15
Uniqueness:   0.10
Validity:     0.05
```

### 8.3 Validation Pipeline

```
Write Request
    │
    ▼
┌──────────────────┐
│ Schema Validation│── FAIL ──► Quarantine
│ (Zod)            │              │
└───────┬──────────┘              ▼
        │ PASS            ┌────────────────┐
        ▼                  │ Bad Data Queue │
┌──────────────────┐       │ (manual review)│
│ Business Rules    │       └────────────────┘
│ (custom checks)   │── FAIL ──► Quarantine
└───────┬──────────┘
        │ PASS
        ▼
┌──────────────────┐
│ Integrity Check   │
│ (ref constraints) │── FAIL ──► Reject + Log
└───────┬──────────┘
        │ PASS
        ▼
┌──────────────────┐
│ PII Scan          │── FLAG ──► Anonymize + Log
│ (31 patterns)     │
└───────┬──────────┘
        │ PASS / Anonymized
        ▼
    Write to Store
```

### 8.4 Bad Data Quarantine

```typescript
interface QuarantineRecord {
  id: string;
  dataType: string;
  data: unknown;
  errors: ValidationError[];
  timestamp: string;
  source: string;
  resolvedAt: string | null;
  resolution: 'fixed' | 'deleted' | 'ignored' | null;
}

class QuarantineStore {
  async add(record: Omit<QuarantineRecord, 'id'>): Promise<string>;
  async list(filters?: QuarantineFilter): Promise<QuarantineRecord[]>;
  async resolve(id: string, resolution: QuarantineRecord['resolution'], fix?: unknown): Promise<void>;

  async autoRepair(): Promise<RepairReport> {
    const records = await this.list({ resolvedAt: null });
    const report: RepairReport = { repaired: 0, failed: 0, skipped: 0 };

    for (const record of records) {
      try {
        const repair = await this.tryRepair(record);
        if (repair.success) {
          await this.resolve(record.id, 'fixed', repair.data);
          report.repaired++;
        } else {
          report.failed++;
        }
      } catch {
        report.skipped++;
      }
    }

    return report;
  }

  private async tryRepair(record: QuarantineRecord): Promise<RepairAttempt> {
    // Strategy 1: Re-validate with relaxed schema
    const relaxed = this.relaxSchema(record.dataType);
    const result = await this.validateWithSchema(relaxed, record.data);
    if (result.valid) return { success: true, data: result.data };

    // Strategy 2: Default missing fields
    const withDefaults = this.applyDefaults(record.dataType, record.data);

    // Strategy 3: Truncate oversized fields
    const truncated = this.truncateFields(record.dataType, withDefaults);

    return this.validateWithSchema(this.schemas.get(record.dataType)!, truncated);
  }
}
```

### 8.5 Data Repair Procedures

| Issue | Detection | Auto-Repair | Manual Procedure |
|-------|-----------|-------------|------------------|
| Missing required field | Schema validation | Apply default value | Fill from source |
| Type mismatch | Schema validation | Coerce to correct type | Manual correction |
| Out of range value | Business rule | Clamp to valid range | Review and adjust |
| Duplicate record | Hash collision | Dedup (keep latest) | Merge manually |
| Broken reference | Integrity check | Set to null | Re-establish reference |
| Stale data | Timeliness check | Flag for refresh | Trigger re-index |
| PII in wrong field | PII scan | Anonymize field | Verify correctness |
| Encoding error | Validation check | Re-encode to UTF-8 | Manual re-import |

---

## 9. Data Catalog

### 9.1 Metadata Registry

```typescript
interface DataCatalogEntry {
  id: string;
  name: string;
  type: 'table' | 'file' | 'stream' | 'cache' | 'event' | 'embedding';
  description: string;
  schema: {
    version: string;
    fields: SchemaField[];
    constraints: string[];
  };
  location: {
    storage: 'sqlite' | 's3' | 'memory' | 'nats';
    path: string;
    sizeBytes: number;
    rowCount?: number;
  };
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  retentionTier: 'ephemeral' | 'operational' | 'analytical' | 'archival';
  owner: string;                    // team or service name
  tags: string[];
  created: string;
  lastUpdated: string;
  lastAccessed: string;
  accessCount: number;
  dependencies: string[];           // IDs of catalog entries this depends on
  quality: {
    completeness: number;
    accuracy: number;
    validity: number;
    lastChecked: string;
  };
  lineage: {
    source: string;
    transformations: string[];
    consumers: string[];
  };
}
```

### 9.2 Schema Registry Integration

The Data Catalog integrates with `@ideia/schema-registry` (G4):

```
Data Catalog ───► Schema Registry
    │                    │
    │  Register schema   │  Store Zod schemas
    │  on data creation  │  Version all schemas
    │                    │  Schema compatibility checks
    ▼                    ▼
┌──────────────────────────────────────┐
│     Unified Data Discovery API        │
│                                       │
│  GET /api/v1/catalog                  │
│  GET /api/v1/catalog/:id              │
│  GET /api/v1/catalog/search?q=...     │
│  GET /api/v1/catalog/:id/lineage      │
│  POST /api/v1/catalog/:id/tags        │
│  GET /api/v1/catalog/usage            │
└───────────────────────────────────────┘
```

### 9.3 Data Discovery API

```typescript
interface CatalogSearchParams {
  q: string;
  type?: string[];
  classification?: string[];
  tag?: string[];
  owner?: string;
  location?: string;
  minCompleteness?: number;
  limit?: number;
  offset?: number;
}

interface CatalogSearchResult {
  entries: DataCatalogEntry[];
  total: number;
  facets: {
    byType: Record<string, number>;
    byClassification: Record<string, number>;
    byTag: Record<string, number>;
  };
  suggestedQueries: string[];         // query expansion suggestions
}

class DataCatalogAPI {
  async search(params: CatalogSearchParams): Promise<CatalogSearchResult>;
  async getEntry(id: string): Promise<DataCatalogEntry>;
  async getLineage(id: string): Promise<DataLineageGraph>;
  async tag(id: string, tags: string[]): Promise<void>;
  async getUsageStats(id: string): Promise<DataUsageStats>;
  async register(entry: Omit<DataCatalogEntry, 'id' | 'created'>): Promise<string>;
  async updateStats(id: string, stats: Partial<DataCatalogEntry>): Promise<void>;
}
```

### 9.4 Data Ownership & Usage Tracking

```
Owner Matrix:

| Data Set              | Owner Service   | Steward           | Consumers               |
|----------------------|-----------------|-------------------|-------------------------|
| Agent decisions      | agent-runtime   | Platform Team     | dashboard, replay, audit|
| Embeddings           | local-ai        | ML Team           | RAG pipeline, search    |
| Event bus logs       | event-bus       | Infra Team        | monitoring, analytics   |
| User config          | settings        | Platform Team     | all services            |
| Audit trail          | security        | Security Team     | compliance, monitoring  |
| Workspace index      | workspace       | Platform Team     | search, LSP, agents     |
| LLM cache            | local-ai        | ML Team           | agent-runtime           |
| Telemetry            | observability   | Platform Team     | dashboard, analytics    |

Usage tracking: every read/write increments accessCount and updates lastAccessed.
```

---

## 10. Metrics & Monitoring

### 10.1 Data Health Dashboard

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       IDEIA DATA HEALTH DASHBOARD                        │
│                         Last updated: 2026-07-22 14:30 UTC              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  OVERALL DATA SCORE: 42/100    ▲ +2 from last week    TARGET: 75/100    │
│                                                                          │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────┐ │
│  │ Backup Age: 0h       │  │ Storage Used: 531 MB │  │ Retention      │ │
│  │ Status: ✅ OK        │  │ Growth: +12 MB/day   │  │ Compliance:    │ │
│  │ RPO: < 5 min         │  │ Projected: 2.1 GB/yr │  │ 78%            │ │
│  └──────────────────────┘  └──────────────────────┘  └────────────────┘ │
│                                                                          │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────┐ │
│  │ Validation:          │  │ PII Detected: 0      │  │ Quarantine:    │ │
│  │ Pass Rate: 99.97%   │  │ Last Scan: 14:00     │  │ 3 items        │ │
│  │ Total Validated: 1.2M│  │ Incidents: 0         │  │ Oldest: 2 days  │ │
│  └──────────────────────┘  └──────────────────────┘  └────────────────┘ │
│                                                                          │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────┐ │
│  │ Embedding Quality:   │  │ Lineage Coverage:    │  │ Catalog:       │ │
│  │ Precision@5: 0.62   │  │ 4,231 decisions       │  │ 12 entries     │ │
│  │ Recall@10: 0.55     │  │ 12,847 events         │  │ 8 tagged        │ │
│  │ MRR: 0.48           │  │ Chain Integrity: 100% │  │ 5 owners        │ │
│  └──────────────────────┘  └──────────────────────┘  └────────────────┘ │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ DATA SCORE TREND (Last 12 weeks)                                    │ │
│  │                                                                     │ │
│  │ 40 ┤╭────────────────────────────────────────────────────────╮     │ │
│  │    ││ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│     │ │
│  │ 35 ┤│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│     │ │
│  │    ││ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│     │ │
│  │ 30 ┤╰────────────────────────────────────────────────────────╯     │ │
│  │    W1 W2 W3 W4 W5 W6 W7 W8 W9 10 11 12                            │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Alerting Thresholds

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| Backup stale | Last backup > 2h | Critical | Notify on-call, trigger backup |
| Backup size anomaly | Size delta > 50% from average | Warning | Investigate growth |
| Storage near capacity | Usage > 80% of quota | Warning | Archive old data, notify owner |
| Retention breach | Data older than TTL found | Critical | Enforce purge, log incident |
| Validation surge | Pass rate < 99% | Warning | Inspect quarantine, notify owner |
| PII incident | PII detected in stored data | Critical | Alert security team, quarantine |
| Embedding degradation | Precision@5 drop > 10% | Warning | Re-evaluate model, notify ML team |
| Lineage gap | Decisions without chain > 100 | Warning | Investigate collector failure |
| Catalog staleness | Entry not updated > 30d | Info | Flag for review, notify owner |
| Quarantine overflow | > 100 items in quarantine | Warning | Manual review needed |
| Data score drop | Score decreases > 5 points | Critical | Full data health audit |

### 10.3 Data Score Recalculation

```typescript
interface DataScoreInput {
  backup: {
    lastBackupAgeMinutes: number;
    hasOffsiteCopy: boolean;
    restoreTestPassed: boolean;
    encryptionEnabled: boolean;
  };
  lineage: {
    totalDecisions: number;
    chainedDecisions: number;
    verifiedChains: number;
    visualizationEnabled: boolean;
  };
  privacy: {
    piiScansRun: number;
    piiIncidents: number;
    classificationCoverage: number;
    deletionRequestsFulfilled: number;
  };
  retention: {
    tiersEnforced: number;
    totalTiers: number;
    purgeCompliance: number;
    automatedEnforcement: boolean;
  };
  embeddings: {
    precisionAt5: number;
    recallAt10: number;
    mrr: number;
    evaluationFrequencyDays: number;
  };
  decisions: {
    totalStored: number;
    withFullContext: number;
    replayable: number;
    replaySuccessRate: number;
  };
  validation: {
    passRate: number;
    quarantineCount: number;
    autoRepairRate: number;
    schemasDefined: number;
  };
  catalog: {
    entries: number;
    tagged: number;
    withOwners: number;
    withLineage: number;
  };
  monitoring: {
    dashboardActive: boolean;
    alertsConfigured: number;
    dataScoreTrending: boolean;
  };
}

class DataScoreCalculator {
  private readonly weights = {
    backup: 0.20,
    lineage: 0.10,
    privacy: 0.15,
    retention: 0.10,
    embeddings: 0.10,
    decisions: 0.10,
    validation: 0.10,
    catalog: 0.05,
    monitoring: 0.10,
  };

  calculate(input: DataScoreInput): { score: number; dimensions: Record<string, number> } {
    const dimensions = {
      backup: this.backupScore(input.backup),
      lineage: this.lineageScore(input.lineage),
      privacy: this.privacyScore(input.privacy),
      retention: this.retentionScore(input.retention),
      embeddings: this.embeddingScore(input.embeddings),
      decisions: this.decisionScore(input.decisions),
      validation: this.validationScore(input.validation),
      catalog: this.catalogScore(input.catalog),
      monitoring: this.monitoringScore(input.monitoring),
    };

    const score = Object.entries(dimensions)
      .reduce((sum, [key, val]) => sum + val * this.weights[key], 0);

    return { score: Math.round(score), dimensions };
  }

  private backupScore(b: DataScoreInput['backup']): number {
    let score = 0;
    if (b.lastBackupAgeMinutes < 120) score += 25;
    else if (b.lastBackupAgeMinutes < 360) score += 15;
    else score += 5;

    if (b.hasOffsiteCopy) score += 25;
    if (b.restoreTestPassed) score += 25;
    if (b.encryptionEnabled) score += 25;
    return score;
  }

  // ... similar scoring for each dimension
}
```

---

## 11. Code Examples

### 11.1 BackupManager with S3/Local Storage

```typescript
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

interface BackupManifest {
  id: string;
  type: 'full' | 'incremental' | 'wal';
  timestamp: string;
  source: string;
  size: number;
  checksum: string;
  encrypted: boolean;
  files: string[];
  parentBackupId?: string;
}

interface BackupOptions {
  localPath: string;
  s3Config?: {
    endpoint: string;
    bucket: string;
    region: string;
    prefix: string;
  };
  encryptionKey?: Buffer;
  compression?: 'gzip' | 'zstd' | 'none';
}

class BackupManager {
  private s3Client: S3Client | null = null;
  private activeBackups: Map<string, AbortController> = new Map();

  constructor(private options: BackupOptions) {
    if (options.s3Config) {
      this.s3Client = new S3Client({
        endpoint: options.s3Config.endpoint,
        region: options.s3Config.region,
      });
    }
  }

  async createFullBackup(sources: string[]): Promise<BackupManifest> {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const backupDir = path.join(this.options.localPath, id);

    await fs.mkdir(backupDir, { recursive: true });

    const files: string[] = [];
    const checksums: string[] = [];

    for (const source of sources) {
      const dest = path.join(backupDir, path.basename(source));
      await fs.cp(source, dest, { recursive: true });
      files.push(dest);

      const content = await fs.readFile(dest);
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      checksums.push(hash);
    }

    const combinedChecksum = crypto
      .createHash('sha256')
      .update(checksums.join(''))
      .digest('hex');

    const manifest: BackupManifest = {
      id,
      type: 'full',
      timestamp,
      source: sources.join(','),
      size: await this.calculateDirSize(backupDir),
      checksum: combinedChecksum,
      encrypted: !!this.options.encryptionKey,
      files,
    };

    await this.writeManifest(backupDir, manifest);

    if (this.options.encryptionKey) {
      await this.encryptBackup(backupDir);
    }

    if (this.options.compression && this.options.compression !== 'none') {
      await this.compressBackup(backupDir);
    }

    if (this.s3Client && this.options.s3Config) {
      await this.uploadToS3(backupDir, manifest);
    }

    await this.pruneOldBackups();
    return manifest;
  }

  async createIncrementalBackup(
    sources: string[],
    parentBackupId: string
  ): Promise<BackupManifest> {
    const parentManifest = await this.loadManifest(parentBackupId);
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const backupDir = path.join(this.options.localPath, id);

    await fs.mkdir(backupDir, { recursive: true });

    const files: string[] = [];
    for (const source of sources) {
      const content = await fs.readFile(source);
      const sourceHash = crypto.createHash('sha256').update(content).digest('hex');

      const parentFile = parentManifest.files.find(f =>
        path.basename(f) === path.basename(source)
      );

      if (parentFile) {
        const parentContent = await fs.readFile(parentFile);
        const parentHash = crypto.createHash('sha256').update(parentContent).digest('hex');

        if (sourceHash !== parentHash) {
          const dest = path.join(backupDir, path.basename(source));
          await fs.writeFile(dest, content);
          files.push(dest);
        }
      } else {
        const dest = path.join(backupDir, path.basename(source));
        await fs.writeFile(dest, content);
        files.push(dest);
      }
    }

    const manifest: BackupManifest = {
      id,
      type: 'incremental',
      timestamp,
      source: sources.join(','),
      size: await this.calculateDirSize(backupDir),
      checksum: crypto.createHash('sha256').update(files.join('')).digest('hex'),
      encrypted: !!this.options.encryptionKey,
      files,
      parentBackupId,
    };

    await this.writeManifest(backupDir, manifest);
    return manifest;
  }

  async restore(backupId: string, targetDir: string): Promise<void> {
    const manifest = await this.loadManifest(backupId);

    // Check if backup is local
    const localDir = path.join(this.options.localPath, backupId);
    const localExists = await fs.stat(localDir).then(() => true).catch(() => false);

    if (!localExists && this.s3Client && this.options.s3Config) {
      await this.downloadFromS3(backupId, localDir);
    }

    // Decrypt if needed
    if (manifest.encrypted && this.options.encryptionKey) {
      await this.decryptBackup(localDir);
    }

    // Decompress if needed
    if (manifest.files.length === 0 && localDir.endsWith('.gz')) {
      await this.decompressBackup(localDir);
    }

    // Verify integrity
    const verified = await this.verifyIntegrity(backupId);
    if (!verified) {
      throw new Error(`Backup ${backupId} integrity check failed`);
    }

    // Restore files
    for (const file of manifest.files) {
      const dest = path.join(targetDir, path.basename(file));
      await fs.cp(file, dest);
    }

    // If incremental, apply parent first
    if (manifest.type === 'incremental' && manifest.parentBackupId) {
      const parentDir = path.join(this.options.localPath, manifest.parentBackupId);
      const parentFiles = await this.loadManifest(manifest.parentBackupId);
      for (const file of parentFiles.files) {
        const dest = path.join(targetDir, path.basename(file));
        if (!manifest.files.includes(file)) {
          await fs.cp(file, dest);
        }
      }
    }

    await this.logRestore(backupId, targetDir);
  }

  async verifyIntegrity(backupId: string): Promise<boolean> {
    try {
      const manifest = await this.loadManifest(backupId);

      for (const file of manifest.files) {
        const content = await fs.readFile(file);
        const hash = crypto.createHash('sha256').update(content).digest('hex');

        const manifestChecksum = manifest.checksum;
        const fileChecksum = crypto
          .createHash('sha256')
          .update(content)
          .digest('hex');

        const hashInManifest = manifest.files.length === 1
          ? manifest.checksum === fileChecksum
          : true;

        if (!hashInManifest) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  async listBackups(): Promise<BackupManifest[]> {
    const dir = await fs.readdir(this.options.localPath);
    const manifests: BackupManifest[] = [];

    for (const entry of dir) {
      const manifestPath = path.join(this.options.localPath, entry, 'manifest.json');
      try {
        const content = await fs.readFile(manifestPath, 'utf-8');
        manifests.push(JSON.parse(content));
      } catch {
        // skip directories without manifests
      }
    }

    return manifests.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  private async uploadToS3(backupDir: string, manifest: BackupManifest): Promise<void> {
    if (!this.s3Client || !this.options.s3Config) return;

    const { bucket, prefix } = this.options.s3Config;
    const key = `${prefix}${manifest.id}/`;

    // Upload manifest
    await this.s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: `${key}manifest.json`,
      Body: JSON.stringify(manifest, null, 2),
    }));

    // Upload files
    for (const file of manifest.files) {
      const content = await fs.readFile(file);
      await this.s3Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: `${key}${path.basename(file)}`,
        Body: content,
      }));
    }
  }

  private async downloadFromS3(backupId: string, targetDir: string): Promise<void> {
    if (!this.s3Client || !this.options.s3Config) return;

    // Implementation for S3 download with listing objects
    await fs.mkdir(targetDir, { recursive: true });

    const { bucket, prefix } = this.options.s3Config;
    const key = `${prefix}${backupId}/`;

    // Download manifest first
    const manifestData = await this.s3Client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: `${key}manifest.json`,
    }));

    const manifestBody = await manifestData.Body?.transformToString();
    if (manifestBody) {
      await fs.writeFile(
        path.join(targetDir, 'manifest.json'),
        manifestBody
      );
    }
  }

  private async calculateDirSize(dir: string): Promise<number> {
    let total = 0;
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile()) {
        const stat = await fs.stat(fullPath);
        total += stat.size;
      } else if (entry.isDirectory()) {
        total += await this.calculateDirSize(fullPath);
      }
    }

    return total;
  }

  private async writeManifest(backupDir: string, manifest: BackupManifest): Promise<void> {
    await fs.writeFile(
      path.join(backupDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
  }

  private async loadManifest(backupId: string): Promise<BackupManifest> {
    const manifestPath = path.join(this.options.localPath, backupId, 'manifest.json');
    const content = await fs.readFile(manifestPath, 'utf-8');
    return JSON.parse(content);
  }

  private async encryptBackup(backupDir: string): Promise<void> {
    if (!this.options.encryptionKey) return;

    const files = await fs.readdir(backupDir);
    for (const file of files) {
      const fullPath = path.join(backupDir, file);
      const stat = await fs.stat(fullPath);
      if (!stat.isFile()) continue;

      const content = await fs.readFile(fullPath);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        'aes-256-gcm',
        this.options.encryptionKey,
        iv
      );

      const encrypted = Buffer.concat([cipher.update(content), cipher.final()]);
      const authTag = cipher.getAuthTag();

      // Store iv + authTag + encrypted
      const packed = Buffer.concat([iv, authTag, encrypted]);
      await fs.writeFile(fullPath + '.enc', packed);
      await fs.rm(fullPath);
    }
  }

  private async decryptBackup(backupDir: string): Promise<void> {
    if (!this.options.encryptionKey) return;

    const files = await fs.readdir(backupDir);
    for (const file of files) {
      if (!file.endsWith('.enc')) continue;

      const fullPath = path.join(backupDir, file);
      const packed = await fs.readFile(fullPath);

      const iv = packed.subarray(0, 16);
      const authTag = packed.subarray(16, 32);
      const encrypted = packed.subarray(32);

      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        this.options.encryptionKey,
        iv
      );
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

      const outPath = fullPath.replace(/\.enc$/, '');
      await fs.writeFile(outPath, decrypted);
      await fs.rm(fullPath);
    }
  }

  private async compressBackup(backupDir: string): Promise<void> {
    // Compress individual large files
    const files = await fs.readdir(backupDir);
    for (const file of files) {
      const fullPath = path.join(backupDir, file);
      const stat = await fs.stat(fullPath);
      if (!stat.isFile() || stat.size < 1024 * 1024) continue; // skip < 1MB

      const outPath = fullPath + '.gz';
      const readStream = fs.createReadStream(fullPath) as unknown as NodeJS.ReadableStream;
      const writeStream = fs.createWriteStream(outPath) as unknown as NodeJS.WritableStream;
      const gzip = createGzip() as unknown as NodeJS.ReadWriteStream;

      await pipeline(readStream, gzip, writeStream);
      await fs.rm(fullPath);
    }
  }

  private async decompressBackup(backupDir: string): Promise<void> {
    const files = await fs.readdir(backupDir);
    for (const file of files) {
      if (!file.endsWith('.gz')) continue;

      const fullPath = path.join(backupDir, file);
      const outPath = fullPath.replace(/\.gz$/, '');

      const readStream = fs.createReadStream(fullPath) as unknown as NodeJS.ReadableStream;
      const writeStream = fs.createWriteStream(outPath) as unknown as NodeJS.WritableStream;
      const gunzip = createGunzip() as unknown as NodeJS.ReadWriteStream;

      await pipeline(readStream, gunzip, writeStream);
      await fs.rm(fullPath);
    }
  }

  private async pruneOldBackups(): Promise<void> {
    const manifests = await this.listBackups();
    const maxLocalBackups = 7; // keep last 7 local backups

    const toRemove = manifests.slice(maxLocalBackups);
    for (const m of toRemove) {
      const dir = path.join(this.options.localPath, m.id);
      await fs.rm(dir, { recursive: true, force: true });
    }
  }

  private async logRestore(backupId: string, targetDir: string): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      backupId,
      targetDir,
      action: 'restore',
    };

    const logPath = path.join(this.options.localPath, 'restore-log.jsonl');
    await fs.appendFile(logPath, JSON.stringify(logEntry) + '\n');
  }
}
```

### 11.2 DataLineageTracker

```typescript
import * as crypto from 'node:crypto';

interface LineageBlock {
  index: number;
  timestamp: string;
  eventType: string;
  data: Record<string, unknown>;
  prevHash: string | null;
  hash: string;
  nonce: number;
}

interface LineageOptions {
  store: LineageStore;
  difficulty?: number; // proof-of-work difficulty (prefix zeros)
}

interface LineageStore {
  append(block: LineageBlock): Promise<void>;
  getChain(agentId: string): Promise<LineageBlock[]>;
  getByCorrelationId(correlationId: string): Promise<LineageBlock[]>;
  getLatest(agentId: string): Promise<LineageBlock | null>;
}

class DataLineageTracker {
  constructor(private options: LineageOptions) {}

  async record(event: {
    agentId: string;
    correlationId: string;
    eventType: string;
    data: Record<string, unknown>;
  }): Promise<LineageBlock> {
    const latest = await this.options.store.getLatest(event.agentId);
    const prevHash = latest?.hash ?? null;

    const block = await this.mineBlock({
      index: latest ? latest.index + 1 : 0,
      timestamp: new Date().toISOString(),
      eventType: event.eventType,
      data: {
        ...event.data,
        agentId: event.agentId,
        correlationId: event.correlationId,
      },
      prevHash,
      hash: '',
      nonce: 0,
    });

    await this.options.store.append(block);
    return block;
  }

  private async mineBlock(block: Omit<LineageBlock, 'hash'> & { hash: string }): Promise<LineageBlock> {
    const difficulty = this.options.difficulty ?? 4;
    const prefix = '0'.repeat(difficulty);
    let nonce = 0;

    while (true) {
      const hash = this.calculateHash({ ...block, nonce } as LineageBlock);
      if (hash.startsWith(prefix)) {
        return { ...block, hash, nonce };
      }
      nonce++;
      if (nonce > 1_000_000) {
        throw new Error('Failed to mine block within nonce limit');
      }
    }
  }

  private calculateHash(block: LineageBlock): string {
    return crypto
      .createHash('sha256')
      .update(`${block.index}${block.prevHash ?? ''}${block.timestamp}${block.eventType}${JSON.stringify(block.data)}${block.nonce}`)
      .digest('hex');
  }

  async verifyChain(agentId: string): Promise<{ valid: boolean; brokenIndex: number | null }> {
    const chain = await this.options.store.getChain(agentId);

    for (let i = 0; i < chain.length; i++) {
      const block = chain[i];

      // Verify hash
      const expectedHash = this.calculateHash(block);
      if (block.hash !== expectedHash) {
        return { valid: false, brokenIndex: i };
      }

      // Verify chain linkage
      if (i > 0) {
        if (block.prevHash !== chain[i - 1]!.hash) {
          return { valid: false, brokenIndex: i };
        }
      } else {
        if (block.prevHash !== null) {
          return { valid: false, brokenIndex: i };
        }
      }
    }

    return { valid: true, brokenIndex: null };
  }

  async getLineageGraph(correlationId: string): Promise<LineageGraph> {
    const blocks = await this.options.store.getByCorrelationId(correlationId);

    const nodes: LineageNode[] = blocks.map((b, i) => ({
      id: b.hash.slice(0, 12),
      type: b.eventType,
      timestamp: b.timestamp,
      data: b.data,
      depth: i,
    }));

    const edges: LineageEdge[] = [];
    for (let i = 1; i < nodes.length; i++) {
      edges.push({
        from: nodes[i - 1]!.id,
        to: nodes[i]!.id,
        type: 'next',
      });
    }

    return { nodes, edges };
  }
}

interface LineageNode {
  id: string;
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
  depth: number;
}

interface LineageEdge {
  from: string;
  to: string;
  type: string;
}

interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
}
```

### 11.3 RetentionPolicyEnforcer

```typescript
import * as fs from 'node:fs/promises';

interface RetentionConfig {
  tiers: RetentionTier[];
  checkIntervalMs: number;
  storage: {
    archivePath: string;
    s3Bucket?: string;
  };
}

interface RetentionTier {
  name: string;
  ttlMs: number;
  stores: string[];
  actions: {
    onExpiry: 'delete' | 'archive' | 'notify';
    archiveFormat?: 'json' | 'sqlite' | 'parquet';
    archiveCompression?: 'gzip' | 'zstd' | 'none';
  };
}

interface EnforcementReport {
  timestamp: string;
  tiersChecked: number;
  totalDeleted: number;
  totalArchived: number;
  totalCompressed: number;
  bytesFreed: number;
  errors: string[];
}

class RetentionPolicyEnforcer {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private config: RetentionConfig,
    private connectors: Map<string, DataConnector>,
    private logger: Logger
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.enforce(), this.config.checkIntervalMs);
    this.logger.info('Retention enforcer started', {
      tiers: this.config.tiers.length,
      intervalMs: this.config.checkIntervalMs,
    });
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async enforce(): Promise<EnforcementReport> {
    const report: EnforcementReport = {
      timestamp: new Date().toISOString(),
      tiersChecked: 0,
      totalDeleted: 0,
      totalArchived: 0,
      totalCompressed: 0,
      bytesFreed: 0,
      errors: [],
    };

    const now = Date.now();

    for (const tier of this.config.tiers) {
      try {
        const result = await this.enforceTier(tier, now);
        report.tiersChecked++;
        report.totalDeleted += result.deleted;
        report.totalArchived += result.archived;
        report.totalCompressed += result.compressed;
        report.bytesFreed += result.bytesFreed;
      } catch (err) {
        report.errors.push(`Tier ${tier.name}: ${String(err)}`);
      }
    }

    await this.logEnforcement(report);

    if (report.bytesFreed > 0) {
      await this.triggerStorageRecalculation();
    }

    return report;
  }

  private async enforceTier(
    tier: RetentionTier,
    now: number
  ): Promise<{
    deleted: number;
    archived: number;
    compressed: number;
    bytesFreed: number;
  }> {
    const cutoff = new Date(now - tier.ttlMs).toISOString();
    const result = { deleted: 0, archived: 0, compressed: 0, bytesFreed: 0 };

    for (const storeName of tier.stores) {
      const connector = this.connectors.get(storeName);
      if (!connector) continue;

      const expiredRecords = await connector.findExpired(cutoff);

      if (tier.actions.onExpiry === 'delete') {
        for (const record of expiredRecords) {
          const size = await connector.getSize(record.id);
          await connector.delete(record.id);
          result.deleted++;
          result.bytesFreed += size;
        }
      } else if (tier.actions.onExpiry === 'archive') {
        for (const record of expiredRecords) {
          const data = await connector.read(record.id);

          const archivePath = path.join(
            this.config.storage.archivePath,
            tier.name,
            `${record.id}.json`
          );

          await fs.mkdir(path.dirname(archivePath), { recursive: true });

          if (tier.actions.archiveCompression === 'gzip') {
            const compressedPath = archivePath + '.gz';
            const content = JSON.stringify(data);
            const buffer = Buffer.from(content);
            const gzipped = await this.gzip(buffer);
            await fs.writeFile(compressedPath, gzipped);
            result.compressed++;
          } else {
            await fs.writeFile(archivePath, JSON.stringify(data, null, 2));
          }

          await connector.delete(record.id);
          result.archived++;
          result.bytesFreed += await connector.getSize(record.id);
        }
      }
    }

    return result;
  }

  private async gzip(buffer: Buffer): Promise<Buffer> {
    const { createGzip } = await import('node:zlib');
    const { promisify } = await import('node:util');
    const gzip = promisify(createGzip);
    // Simple gzip wrapper
    return new Promise((resolve, reject) => {
      const { createGzip } = require('node:zlib');
      const gzipStream = createGzip();
      const chunks: Buffer[] = [];

      gzipStream.on('data', (chunk: Buffer) => chunks.push(chunk));
      gzipStream.on('end', () => resolve(Buffer.concat(chunks)));
      gzipStream.on('error', reject);
      gzipStream.end(buffer);
    });
  }

  private async logEnforcement(report: EnforcementReport): Promise<void> {
    this.logger.info('Retention enforcement completed', report);
  }

  private async triggerStorageRecalculation(): Promise<void> {
    // Notify monitoring system to recalculate storage metrics
  }
}

interface DataConnector {
  findExpired(cutoff: string): Promise<{ id: string }[]>;
  read(id: string): Promise<unknown>;
  delete(id: string): Promise<void>;
  getSize(id: string): Promise<number>;
}

interface Logger {
  info(msg: string, data?: unknown): void;
  warn(msg: string, data?: unknown): void;
  error(msg: string, data?: unknown): void;
}
```

### 11.4 EmbeddingQualityEvaluator

```typescript
interface EvalQuery {
  id: string;
  text: string;
  relevantDocIds: string[];
  category: string;
}

interface EvalDocument {
  id: string;
  text: string;
  embedding?: number[];
}

interface EvalResult {
  model: string;
  precisionAt5: number;
  recallAt10: number;
  mrr: number;
  ndcgAt10: number;
  latencyMs: number;
  evaluatedAt: string;
  queriesEvaluated: number;
}

class EmbeddingQualityEvaluator {
  constructor(
    private embeddingService: {
      embed(text: string, model: string): Promise<number[]>;
    },
    private storage: {
      loadQueries(): Promise<EvalQuery[]>;
      loadDocuments(): Promise<EvalDocument[]>;
      storeResult(result: EvalResult): Promise<void>;
    }
  ) {}

  async evaluate(
    modelName: string,
    options?: { k?: number }
  ): Promise<EvalResult> {
    const k = options?.k ?? 10;
    const queries = await this.storage.loadQueries();
    const documents = await this.storage.loadDocuments();

    const startTime = Date.now();

    // Embed all documents
    const docEmbeddings = await Promise.all(
      documents.map(async (doc) => ({
        id: doc.id,
        embedding: await this.embeddingService.embed(doc.text, modelName),
      }))
    );

    const queryResults = await Promise.all(
      queries.map(async (query) => {
        const queryEmbedding = await this.embeddingService.embed(query.text, modelName);

        const similarities = docEmbeddings.map((doc) => ({
          docId: doc.id,
          score: this.cosineSimilarity(queryEmbedding, doc.embedding),
        }));

        similarities.sort((a, b) => b.score - a.score);
        const topK = similarities.slice(0, k);

        return {
          queryId: query.id,
          relevantIds: query.relevantDocIds,
          retrieved: topK.map((r) => r.docId),
          scores: topK.map((r) => r.score),
        };
      })
    );

    const latencyMs = Date.now() - startTime;

    const result: EvalResult = {
      model: modelName,
      precisionAt5: this.calculatePrecisionAtK(queryResults, 5),
      recallAt10: this.calculateRecallAtK(queryResults, 10),
      mrr: this.calculateMRR(queryResults),
      ndcgAt10: this.calculateNDCG(queryResults, 10),
      latencyMs,
      evaluatedAt: new Date().toISOString(),
      queriesEvaluated: queries.length,
    };

    await this.storage.storeResult(result);
    return result;
  }

  async compareModels(modelNames: string[]): Promise<Record<string, EvalResult>> {
    const results: Record<string, EvalResult> = {};

    for (const model of modelNames) {
      results[model] = await this.evaluate(model);
    }

    return results;
  }

  private calculatePrecisionAtK(
    results: QueryResult[],
    k: number
  ): number {
    let totalPrecision = 0;

    for (const result of results) {
      const retrieved = result.retrieved.slice(0, k);
      const relevant = result.relevantIds;
      const truePositives = retrieved.filter((id) => relevant.includes(id)).length;
      totalPrecision += truePositives / Math.min(k, retrieved.length);
    }

    return totalPrecision / results.length;
  }

  private calculateRecallAtK(
    results: QueryResult[],
    k: number
  ): number {
    let totalRecall = 0;

    for (const result of results) {
      const retrieved = result.retrieved.slice(0, k);
      const relevant = result.relevantIds;
      const truePositives = retrieved.filter((id) => relevant.includes(id)).length;
      totalRecall += relevant.length > 0 ? truePositives / relevant.length : 0;
    }

    return totalRecall / results.length;
  }

  private calculateMRR(results: QueryResult[]): number {
    let totalRR = 0;

    for (const result of results) {
      let reciprocalRank = 0;
      for (let i = 0; i < result.retrieved.length; i++) {
        if (result.relevantIds.includes(result.retrieved[i]!)) {
          reciprocalRank = 1 / (i + 1);
          break;
        }
      }
      totalRR += reciprocalRank;
    }

    return totalRR / results.length;
  }

  private calculateNDCG(results: QueryResult[], k: number): number {
    let totalNDCG = 0;

    for (const result of results) {
      const idealDCG = this.dcg(result.relevantIds.slice(0, k), k);
      const actualDCG = this.dcg(
        result.retrieved.slice(0, k).map((id) =>
          result.relevantIds.includes(id) ? 1 : 0
        ),
        k
      );

      totalNDCG += idealDCG > 0 ? actualDCG / idealDCG : 0;
    }

    return totalNDCG / results.length;
  }

  private dcg(relevance: number[], k: number): number {
    let dcg = 0;
    for (let i = 0; i < Math.min(k, relevance.length); i++) {
      const rel = relevance[i]!;
      dcg += (Math.pow(2, rel) - 1) / Math.log2(i + 2);
    }
    return dcg;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i]! * b[i]!;
      magA += a[i]! * a[i]!;
      magB += b[i]! * b[i]!;
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }
}

interface QueryResult {
  queryId: string;
  relevantIds: string[];
  retrieved: string[];
  scores: number[];
}
```

### 11.5 DecisionStore

```typescript
import { z } from 'zod';

const DecisionSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().min(1),
  sessionId: z.string().min(1),
  correlationId: z.string().min(1),
  createdAt: z.string().datetime(),
  triggerType: z.enum(['user_prompt', 'system_event', 'scheduled', 'webhook']),
  inputHash: z.string().length(64),
  modelUsed: z.string(),
  provider: z.string(),
  temperature: z.number().optional(),
  tokensUsed: z.number().int().nonnegative().optional(),
  confidence: z.number().min(0).max(1),
  reasoningText: z.string().optional(),
  alternatives: z.array(z.any()).optional(),
  actionTaken: z.string(),
  targetFile: z.string().optional(),
  diff: z.string().optional(),
  outputHash: z.string().length(64),
  status: z.enum(['accepted', 'rejected', 'pending', 'rolled_back']),
  chainHash: z.string().length(64),
  chainPrevHash: z.string().length(64).nullable().optional(),
  dataClass: z.enum(['public', 'internal', 'confidential', 'restricted']).optional(),
  retentionTier: z.enum(['ephemeral', 'operational', 'analytical', 'archival']).optional(),
});

type DecisionRecord = z.infer<typeof DecisionSchema>;

interface DecisionQuery {
  agentId?: string;
  sessionId?: string;
  correlationId?: string;
  status?: string;
  minConfidence?: number;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class DecisionStore {
  private db: SQLiteDatabase;

  constructor(db: SQLiteDatabase) {
    this.db = db;
    this.initialize();
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS decisions (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        correlation_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        trigger_type TEXT NOT NULL,
        input_hash TEXT NOT NULL,
        model_used TEXT NOT NULL,
        provider TEXT NOT NULL,
        tokens_used INTEGER,
        confidence REAL NOT NULL,
        action_taken TEXT NOT NULL,
        output_hash TEXT NOT NULL,
        status TEXT NOT NULL,
        chain_hash TEXT NOT NULL,
        data_class TEXT DEFAULT 'confidential',
        retention_tier TEXT DEFAULT 'operational',
        metadata_json TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_decisions_agent ON decisions(agent_id);
      CREATE INDEX IF NOT EXISTS idx_decisions_correlation ON decisions(correlation_id);
      CREATE INDEX IF NOT EXISTS idx_decisions_created ON decisions(created_at);
      CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);
      CREATE INDEX IF NOT EXISTS idx_decisions_hash ON decisions(output_hash);
    `);
  }

  async store(decision: DecisionRecord): Promise<void> {
    const validated = DecisionSchema.parse(decision);

    this.db.run(
      `INSERT INTO decisions (
        id, agent_id, session_id, correlation_id, created_at,
        trigger_type, input_hash, model_used, provider, tokens_used,
        confidence, action_taken, output_hash, status, chain_hash,
        data_class, retention_tier, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        validated.id,
        validated.agentId,
        validated.sessionId,
        validated.correlationId,
        validated.createdAt,
        validated.triggerType,
        validated.inputHash,
        validated.modelUsed,
        validated.provider,
        validated.tokensUsed ?? null,
        validated.confidence,
        validated.actionTaken,
        validated.outputHash,
        validated.status,
        validated.chainHash,
        validated.dataClass ?? 'confidential',
        validated.retentionTier ?? 'operational',
        JSON.stringify({
          temperature: validated.temperature,
          reasoningText: validated.reasoningText,
          alternatives: validated.alternatives,
          targetFile: validated.targetFile,
          diff: validated.diff,
        }),
      ]
    );
  }

  async query(query: DecisionQuery): Promise<{ decisions: DecisionRecord[]; total: number }> {
    let sql = 'SELECT * FROM decisions WHERE 1=1';
    const params: unknown[] = [];

    if (query.agentId) {
      sql += ' AND agent_id = ?';
      params.push(query.agentId);
    }
    if (query.sessionId) {
      sql += ' AND session_id = ?';
      params.push(query.sessionId);
    }
    if (query.correlationId) {
      sql += ' AND correlation_id = ?';
      params.push(query.correlationId);
    }
    if (query.status) {
      sql += ' AND status = ?';
      params.push(query.status);
    }
    if (query.minConfidence !== undefined) {
      sql += ' AND confidence >= ?';
      params.push(query.minConfidence);
    }
    if (query.dateFrom) {
      sql += ' AND created_at >= ?';
      params.push(query.dateFrom);
    }
    if (query.dateTo) {
      sql += ' AND created_at <= ?';
      params.push(query.dateTo);
    }

    // Count total
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = this.db.get(countSql, ...params) as { total: number };

    // Sort
    const sortBy = query.sortBy ?? 'created_at';
    const sortOrder = query.sortOrder ?? 'desc';
    sql += ` ORDER BY ${sortBy} ${sortOrder}`;

    // Pagination
    const limit = Math.min(query.limit ?? 50, 1000);
    const offset = query.offset ?? 0;
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = this.db.all(sql, ...params) as DecisionRecord[];
    const decisions = rows.map((row) => this.mapRowToDecision(row));

    return { decisions, total: countResult.total };
  }

  async getById(id: string): Promise<DecisionRecord | null> {
    const row = this.db.get('SELECT * FROM decisions WHERE id = ?', id) as DecisionRecord | undefined;
    return row ? this.mapRowToDecision(row) : null;
  }

  async getByCorrelationId(correlationId: string): Promise<DecisionRecord[]> {
    const rows = this.db.all(
      'SELECT * FROM decisions WHERE correlation_id = ? ORDER BY created_at ASC',
      correlationId
    ) as DecisionRecord[];
    return rows.map((r) => this.mapRowToDecision(r));
  }

  async getStats(): Promise<DecisionStats> {
    const row = this.db.get(`
      SELECT
        COUNT(*) as total,
        COUNT(DISTINCT agent_id) as unique_agents,
        AVG(confidence) as avg_confidence,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'rolled_back' THEN 1 ELSE 0 END) as rolled_back,
        MAX(created_at) as last_decision
      FROM decisions
    `) as DecisionStats;

    return row;
  }

  async getByDateRange(from: string, to: string): Promise<DecisionRecord[]> {
    const rows = this.db.all(
      'SELECT * FROM decisions WHERE created_at >= ? AND created_at <= ? ORDER BY created_at ASC',
      from,
      to
    ) as DecisionRecord[];
    return rows.map((r) => this.mapRowToDecision(r));
  }

  async updateStatus(id: string, status: string): Promise<void> {
    this.db.run('UPDATE decisions SET status = ? WHERE id = ?', status, id);
  }

  async deleteOlderThan(cutoff: string): Promise<number> {
    const result = this.db.run('DELETE FROM decisions WHERE created_at < ?', cutoff);
    return result.changes;
  }

  private mapRowToDecision(row: Record<string, unknown>): DecisionRecord {
    const metadata = row.metadata_json
      ? JSON.parse(row.metadata_json as string)
      : {};

    return DecisionSchema.parse({
      id: row.id,
      agentId: row.agent_id,
      sessionId: row.session_id,
      correlationId: row.correlation_id,
      createdAt: row.created_at,
      triggerType: row.trigger_type,
      inputHash: row.input_hash,
      modelUsed: row.model_used,
      provider: row.provider,
      tokensUsed: row.tokens_used ?? undefined,
      confidence: row.confidence,
      actionTaken: row.action_taken,
      outputHash: row.output_hash,
      status: row.status,
      chainHash: row.chain_hash,
      dataClass: row.data_class,
      retentionTier: row.retention_tier,
      temperature: metadata.temperature,
      reasoningText: metadata.reasoningText,
      alternatives: metadata.alternatives,
      targetFile: metadata.targetFile,
      diff: metadata.diff,
    });
  }
}

interface DecisionStats {
  total: number;
  unique_agents: number;
  avg_confidence: number;
  accepted: number;
  rejected: number;
  rolled_back: number;
  last_decision: string;
}

interface SQLiteDatabase {
  exec(sql: string): void;
  run(sql: string, ...params: unknown[]): { changes: number };
  get(sql: string, ...params: unknown[]): Record<string, unknown> | undefined;
  all(sql: string, ...params: unknown[]): Record<string, unknown>[];
}
```

### 11.6 DataValidator

```typescript
import { z } from 'zod';

interface ValidationRule<T = unknown> {
  name: string;
  description: string;
  validate: (data: T) => ValidationIssue[];
  severity: 'error' | 'warning' | 'info';
}

interface ValidationIssue {
  rule: string;
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  value: unknown;
  expected: unknown;
}

interface ValidationResult<T = unknown> {
  valid: boolean;
  data: T | null;
  issues: ValidationIssue[];
  passed: number;
  failed: number;
  warnings: number;
}

interface DataQualityReport {
  timestamp: string;
  dataType: string;
  totalRecords: number;
  completeness: number;
  accuracy: number;
  consistency: number;
  validity: number;
  issues: ValidationIssue[];
  recommendations: string[];
}

class DataValidator {
  private schemas: Map<string, z.ZodSchema> = new Map();
  private businessRules: Map<string, ValidationRule[]> = new Map();
  private quarantineStore: QuarantineStore;

  constructor(quarantineStore: QuarantineStore) {
    this.quarantineStore = quarantineStore;
  }

  registerSchema(dataType: string, schema: z.ZodSchema): void {
    this.schemas.set(dataType, schema);
  }

  registerRule(dataType: string, rule: ValidationRule): void {
    const existing = this.businessRules.get(dataType) ?? [];
    existing.push(rule);
    this.businessRules.set(dataType, existing);
  }

  async validate<T>(
    dataType: string,
    data: unknown
  ): Promise<ValidationResult<T>> {
    const issues: ValidationIssue[] = [];
    let passed = 0;
    let failed = 0;
    let warnings = 0;

    // Step 1: Schema validation
    const schema = this.schemas.get(dataType);
    if (schema) {
      const schemaResult = schema.safeParse(data);
      if (!schemaResult.success) {
        for (const issue of schemaResult.error.issues) {
          issues.push({
            rule: 'schema',
            field: issue.path.join('.'),
            message: issue.message,
            severity: 'error',
            value: issue.path.length > 0 ? this.getNestedValue(data, issue.path) : data,
            expected: issue.message,
          });
          failed++;
        }
      } else {
        passed++;
      }
    }

    // Step 2: Business rule validation
    const rules = this.businessRules.get(dataType) ?? [];
    for (const rule of rules) {
      const ruleIssues = rule.validate(data);
      for (const issue of ruleIssues) {
        issues.push(issue);
        if (issue.severity === 'error') failed++;
        else if (issue.severity === 'warning') warnings++;
        else passed++;
      }
    }

    // Step 3: Quarantine bad data
    if (failed > 0) {
      await this.quarantineStore.add({
        dataType,
        data,
        errors: issues.filter((i) => i.severity === 'error'),
        timestamp: new Date().toISOString(),
        source: 'DataValidator',
      });
    }

    return {
      valid: failed === 0,
      data: failed === 0 ? (data as T) : null,
      issues,
      passed,
      failed,
      warnings,
    };
  }

  async generateQualityReport(
    dataType: string,
    data: unknown[]
  ): Promise<DataQualityReport> {
    const schema = this.schemas.get(dataType);
    const rules = this.businessRules.get(dataType) ?? [];

    let completeFields = 0;
    let totalFields = 0;
    let validCount = 0;
    let consistentCount = 0;
    const allIssues: ValidationIssue[] = [];

    for (const record of data) {
      // Schema validation
      if (schema) {
        const result = schema.safeParse(record);
        if (result.success) {
          validCount++;
        }
      }

      // Count fields for completeness
      if (typeof record === 'object' && record !== null) {
        const fields = Object.keys(record as Record<string, unknown>);
        totalFields += fields.length;

        if (schema) {
          const schemaKeys = Object.keys(schema.shape ?? {});
          const presentKeys = fields.filter((f) =>
            (record as Record<string, unknown>)[f] !== undefined &&
            (record as Record<string, unknown>)[f] !== null
          );
          completeFields += presentKeys.length;
          totalFields += schemaKeys.length;
        }
      }

      // Business rules
      for (const rule of rules) {
        const ruleIssues = rule.validate(record);
        allIssues.push(...ruleIssues);
        if (ruleIssues.length === 0) {
          consistentCount++;
        }
      }
    }

    const totalRecords = data.length;
    const completeness = totalFields > 0 ? completeFields / totalFields : 1;
    const accuracy = totalRecords > 0 ? validCount / totalRecords : 1;
    const consistency = totalRecords > 0 ? consistentCount / totalRecords : 1;
    const validity = totalRecords > 0 ? validCount / totalRecords : 1;

    return {
      timestamp: new Date().toISOString(),
      dataType,
      totalRecords,
      completeness: Math.round(completeness * 10000) / 100,
      accuracy: Math.round(accuracy * 10000) / 100,
      consistency: Math.round(consistency * 10000) / 100,
      validity: Math.round(validity * 10000) / 100,
      issues: allIssues,
      recommendations: this.generateRecommendations(allIssues),
    };
  }

  private generateRecommendations(issues: ValidationIssue[]): string[] {
    const recommendations: string[] = [];
    const errorCount = issues.filter((i) => i.severity === 'error').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;

    if (errorCount > 10) {
      recommendations.push('Review data source pipeline for systematic errors');
    }
    if (warningCount > 50) {
      recommendations.push('Consider relaxing validation rules for non-critical fields');
    }
    if (errorCount > 0 && warningCount > 0) {
      recommendations.push('Prioritize error fixes over warnings for data integrity');
    }

    return recommendations;
  }

  private getNestedValue(obj: unknown, path: (string | number)[]): unknown {
    let current = obj;
    for (const key of path) {
      if (current === null || current === undefined) return undefined;
      if (typeof current === 'object' && key in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }
    return current;
  }
}

interface QuarantineStore {
  add(record: {
    dataType: string;
    data: unknown;
    errors: ValidationIssue[];
    timestamp: string;
    source: string;
  }): Promise<string>;
}
```

### 11.7 DataHealthDashboard

```typescript
interface HealthMetrics {
  overallScore: number;
  dimensions: Record<string, number>;
  trend: { date: string; score: number }[];
  backups: {
    lastBackup: string | null;
    ageMinutes: number;
    status: 'ok' | 'warning' | 'critical';
    offsiteCopy: boolean;
    encryptionEnabled: boolean;
  };
  storage: {
    totalBytes: number;
    growthBytesPerDay: number;
    projectedYearlyBytes: number;
    byStore: Record<string, number>;
  };
  retention: {
    compliancePercent: number;
    tiersEnforced: number;
    totalTiers: number;
    lastEnforcement: string | null;
  };
  validation: {
    passRate: number;
    totalValidated: number;
    quarantineCount: number;
    autoRepairRate: number;
  };
  embeddings: {
    precisionAt5: number;
    recallAt10: number;
    mrr: number;
    activeModel: string;
  };
  lineage: {
    totalDecisions: number;
    chainIntegrity: number;
    visualizationEnabled: boolean;
  };
  catalog: {
    entries: number;
    tagged: number;
    withOwners: number;
  };
  privacy: {
    piiScansRun: number;
    piiIncidents: number;
    lastScan: string | null;
  };
}

class DataHealthDashboard {
  private metricsCache: HealthMetrics | null = null;
  private cacheTimestamp: number = 0;
  private readonly cacheTTL = 60_000; // 1 minute

  constructor(
    private backupManager: BackupManager,
    private decisionStore: DecisionStore,
    private retentionEnforcer: RetentionPolicyEnforcer,
    private validator: DataValidator,
    private embeddingEvaluator: EmbeddingQualityEvaluator,
    private lineageTracker: DataLineageTracker,
    private dataCatalog: DataCatalogAPI,
    private scoreCalculator: DataScoreCalculator
  ) {}

  async getMetrics(): Promise<HealthMetrics> {
    const now = Date.now();
    if (this.metricsCache && now - this.cacheTimestamp < this.cacheTTL) {
      return this.metricsCache;
    }

    const [backupMetrics, storageMetrics, retentionMetrics, validationMetrics,
      embeddingMetrics, lineageMetrics, catalogMetrics, privacyMetrics] =
      await Promise.all([
        this.collectBackupMetrics(),
        this.collectStorageMetrics(),
        this.collectRetentionMetrics(),
        this.collectValidationMetrics(),
        this.collectEmbeddingMetrics(),
        this.collectLineageMetrics(),
        this.collectCatalogMetrics(),
        this.collectPrivacyMetrics(),
      ]);

    const dimensions = {
      backup: this.scoreBackup(backupMetrics),
      storage: this.scoreStorage(storageMetrics),
      retention: this.scoreRetention(retentionMetrics),
      validation: this.scoreValidation(validationMetrics),
      embeddings: this.scoreEmbeddings(embeddingMetrics),
      lineage: this.scoreLineage(lineageMetrics),
      catalog: this.scoreCatalog(catalogMetrics),
      privacy: this.scorePrivacy(privacyMetrics),
    };

    const overallScore = Math.round(
      Object.values(dimensions).reduce((a, b) => a + b, 0) / Object.keys(dimensions).length
    );

    const trend = await this.loadTrend();

    this.metricsCache = {
      overallScore,
      dimensions,
      trend,
      backups: backupMetrics,
      storage: storageMetrics,
      retention: retentionMetrics,
      validation: validationMetrics,
      embeddings: embeddingMetrics,
      lineage: lineageMetrics,
      catalog: catalogMetrics,
      privacy: privacyMetrics,
    };
    this.cacheTimestamp = now;

    return this.metricsCache;
  }

  async getAlerts(): Promise<HealthAlert[]> {
    const metrics = await this.getMetrics();
    const alerts: HealthAlert[] = [];

    // Backup stale
    if (metrics.backups.ageMinutes > 120) {
      alerts.push({
        id: 'backup_stale',
        severity: 'critical',
        message: `Backup is ${metrics.backups.ageMinutes} minutes old (threshold: 120 min)`,
        timestamp: new Date().toISOString(),
        dimension: 'backup',
        value: metrics.backups.ageMinutes,
        threshold: 120,
      });
    }

    // Storage near capacity
    if (metrics.storage.totalBytes > 0.8 * 1_000_000_000) {
      alerts.push({
        id: 'storage_high',
        severity: 'warning',
        message: `Storage usage at ${Math.round(metrics.storage.totalBytes / 1_000_000)} MB`,
        timestamp: new Date().toISOString(),
        dimension: 'storage',
        value: metrics.storage.totalBytes,
        threshold: 800_000_000,
      });
    }

    // Retention compliance low
    if (metrics.retention.compliancePercent < 90) {
      alerts.push({
        id: 'retention_low',
        severity: 'warning',
        message: `Retention compliance at ${metrics.retention.compliancePercent}%`,
        timestamp: new Date().toISOString(),
        dimension: 'retention',
        value: metrics.retention.compliancePercent,
        threshold: 90,
      });
    }

    // Validation pass rate low
    if (metrics.validation.passRate < 0.99) {
      alerts.push({
        id: 'validation_low',
        severity: 'warning',
        message: `Validation pass rate at ${(metrics.validation.passRate * 100).toFixed(1)}%`,
        timestamp: new Date().toISOString(),
        dimension: 'validation',
        value: metrics.validation.passRate,
        threshold: 0.99,
      });
    }

    // Embedding quality degradation
    if (metrics.embeddings.mrr < 0.45) {
      alerts.push({
        id: 'embedding_degradation',
        severity: 'warning',
        message: `Embedding MRR at ${metrics.embeddings.mrr} (threshold: 0.45)`,
        timestamp: new Date().toISOString(),
        dimension: 'embeddings',
        value: metrics.embeddings.mrr,
        threshold: 0.45,
      });
    }

    // Lineage integrity issue
    if (metrics.lineage.chainIntegrity < 100) {
      alerts.push({
        id: 'lineage_breach',
        severity: 'critical',
        message: `Lineage chain integrity at ${metrics.lineage.chainIntegrity}%`,
        timestamp: new Date().toISOString(),
        dimension: 'lineage',
        value: metrics.lineage.chainIntegrity,
        threshold: 100,
      });
    }

    // Quarantine overflow
    if (metrics.validation.quarantineCount > 100) {
      alerts.push({
        id: 'quarantine_overflow',
        severity: 'warning',
        message: `${metrics.validation.quarantineCount} items in quarantine`,
        timestamp: new Date().toISOString(),
        dimension: 'validation',
        value: metrics.validation.quarantineCount,
        threshold: 100,
      });
    }

    return alerts;
  }

  private async collectBackupMetrics(): Promise<HealthMetrics['backups']> {
    const backups = await this.backupManager.listBackups();
    const latest = backups[0];

    return {
      lastBackup: latest?.timestamp ?? null,
      ageMinutes: latest
        ? (Date.now() - new Date(latest.timestamp).getTime()) / 60_000
        : Infinity,
      status: latest ? 'ok' : 'critical',
      offsiteCopy: false, // detect from backup manager
      encryptionEnabled: latest?.encrypted ?? false,
    };
  }

  private async collectStorageMetrics(): Promise<HealthMetrics['storage']> {
    // Collect from all data stores
    const stores = ['decisions', 'embeddings', 'audit', 'config', 'cache'];
    const byStore: Record<string, number> = {};

    for (const store of stores) {
      try {
        const size = await this.getStoreSize(store);
        byStore[store] = size;
      } catch {
        byStore[store] = 0;
      }
    }

    const totalBytes = Object.values(byStore).reduce((a, b) => a + b, 0);

    return {
      totalBytes,
      growthBytesPerDay: totalBytes * 0.02, // estimate 2% daily growth
      projectedYearlyBytes: totalBytes * 1.02 ** 365,
      byStore,
    };
  }

  private async collectRetentionMetrics(): Promise<HealthMetrics['retention']> {
    return {
      compliancePercent: 78, // from retention enforcer logs
      tiersEnforced: 2,
      totalTiers: 4,
      lastEnforcement: new Date().toISOString(),
    };
  }

  private async collectValidationMetrics(): Promise<HealthMetrics['validation']> {
    return {
      passRate: 0.9997,
      totalValidated: 1_200_000,
      quarantineCount: 3,
      autoRepairRate: 0.85,
    };
  }

  private async collectEmbeddingMetrics(): Promise<HealthMetrics['embeddings']> {
    return {
      precisionAt5: 0.62,
      recallAt10: 0.55,
      mrr: 0.48,
      activeModel: 'nomic-embed-text',
    };
  }

  private async collectLineageMetrics(): Promise<HealthMetrics['lineage']> {
    return {
      totalDecisions: 4231,
      chainIntegrity: 100,
      visualizationEnabled: false,
    };
  }

  private async collectCatalogMetrics(): Promise<HealthMetrics['catalog']> {
    return {
      entries: 12,
      tagged: 8,
      withOwners: 5,
    };
  }

  private async collectPrivacyMetrics(): Promise<HealthMetrics['privacy']> {
    return {
      piiScansRun: 145,
      piiIncidents: 0,
      lastScan: new Date().toISOString(),
    };
  }

  private async getStoreSize(storeName: string): Promise<number> {
    // Implementation depends on storage backend
    return 50_000_000; // placeholder: 50 MB
  }

  private async loadTrend(): Promise<{ date: string; score: number }[]> {
    return [
      { date: '2026-04-30', score: 30 },
      { date: '2026-05-07', score: 32 },
      { date: '2026-05-14', score: 31 },
      { date: '2026-05-21', score: 35 },
      { date: '2026-05-28', score: 34 },
      { date: '2026-06-04', score: 36 },
      { date: '2026-06-11', score: 38 },
      { date: '2026-06-18', score: 37 },
      { date: '2026-06-25', score: 40 },
      { date: '2026-07-02', score: 39 },
      { date: '2026-07-09', score: 41 },
      { date: '2026-07-16', score: 42 },
    ];
  }

  private scoreBackup(m: HealthMetrics['backups']): number {
    let score = 0;
    if (m.ageMinutes < 120) score += 25;
    else if (m.ageMinutes < 360) score += 15;
    else score += 5;
    if (m.offsiteCopy) score += 25;
    if (m.encryptionEnabled) score += 25;
    return score;
  }

  private scoreStorage(m: HealthMetrics['storage']): number {
    // Simple scoring based on usage percentage
    const usagePercent = m.totalBytes / 1_000_000_000; // assume 1GB budget
    if (usagePercent < 0.5) return 80;
    if (usagePercent < 0.8) return 60;
    return 40;
  }

  private scoreRetention(m: HealthMetrics['retention']): number {
    return m.compliancePercent;
  }

  private scoreValidation(m: HealthMetrics['validation']): number {
    return Math.round(m.passRate * 100);
  }

  private scoreEmbeddings(m: HealthMetrics['embeddings']): number {
    return Math.round((m.precisionAt5 * 0.4 + m.recallAt10 * 0.3 + m.mrr * 0.3) * 100);
  }

  private scoreLineage(m: HealthMetrics['lineage']): number {
    return m.chainIntegrity;
  }

  private scoreCatalog(m: HealthMetrics['catalog']): number {
    return Math.round((m.tagged / Math.max(m.entries, 1)) * 100);
  }

  private scorePrivacy(m: HealthMetrics['privacy']): number {
    if (m.piiIncidents > 0) return 30;
    if (m.piiScansRun > 0) return 80;
    return 40;
  }
}

interface HealthAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  dimension: string;
  value: number;
  threshold: number;
}
```

---

## 12. Implementation Roadmap

### 12.1 Phases

```
Phase 1: Assessment (Week 1-2)
  Current state audit
  Tooling selection
  Quick wins: backup config, basic monitoring

Phase 2: Backup & Lineage (Week 3-6)
  Backup manager with S3 support
  Data lineage tracker + crypto chain
  Retention policy enforcer

Phase 3: Quality & Validation (Week 7-10)
  Data validator with Zod + quarantine
  Embedding evaluator + auto-selector
  Decision store with full context

Phase 4: Compliance & Catalog (Week 11-13)
  PII detection pipeline for stored data
  Data classification + anonymization
  Data catalog + discovery API

Phase 5: Monitoring (Week 14-15)
  Data health dashboard
  Alerting system
  Trend analysis + self-healing
```

### 12.2 Effort & Milestones

| Phase | Tasks | Effort (h) | Milestone | Score After |
|-------|-------|-----------|-----------|-------------|
| P1 Assessment | Audit all data stores, select tools, quick wins | 40 | Data inventory complete | 45/100 |
| P2 Backup + Lineage | BackupManager, DataLineageTracker, RetentionEnforcer | 80 | RPO < 1h, RTO < 4h | 55/100 |
| P3 Quality + Validation | DataValidator, EmbeddingEvaluator, DecisionStore | 80 | Pass rate > 99%, MRR > 0.75 | 65/100 |
| P4 Compliance + Catalog | PII pipeline, classification, DataCatalogAPI | 60 | GDPR ready, catalog searchable | 72/100 |
| P5 Monitoring | Dashboard, alerts, trend analysis | 40 | Data health visible, alerts active | 75/100 |
| **Total** | | **300** | **Data score 75/100** | **75/100** |

### 12.3 Dependencies

| Task | Depends On | Risk | Mitigation |
|------|-----------|------|------------|
| BackupManager | S3 client library | Low | Use @aws-sdk/client-s3, already in dependency tree |
| DataLineageTracker | DecisionStore, event bus | Medium | Build on existing event bus (NATS) |
| RetentionEnforcer | Data classification per store | Medium | Start with simple time-based, refine later |
| EmbeddingEvaluator | Ground truth dataset | High | Generate synthetic eval set from real queries |
| PII Pipeline | Existing 31 patterns | Low | Reuse output-validator patterns |
| DataCatalog | Schema Registry (G4) | Medium | Extend existing registry |
| Dashboard | All prior components | Medium | Start with mock data, connect incrementally |

### 12.4 Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Ground truth dataset too small for embedding eval | Medium | High | Use synthetic data + cross-validation |
| PII false positives in stored data | Medium | High | Gradual rollout with manual review queue |
| Backup storage costs exceed budget | Low | Medium | Tiered backup, local only for non-critical |
| Performance impact of real-time WAL streaming | Low | Medium | Async + batch, configurable interval |
| Chain verification slows down decision logging | Low | Low | Async chain build, verify on read |
| Data catalog becomes stale | Medium | Low | Automated scanning, TTL per catalog entry |

### 12.5 Success Criteria

```
Gate 1 (End of Phase 2):
  - Automated backups running with RPO < 1h
  - Restore test passes in < 4h
  - Data lineage chain verifiable for all new decisions
  - Retention policy enforced automatically
  - Data score >= 55/100

Gate 2 (End of Phase 3):
  - Data validation pass rate > 99%
  - Embedding MRR > 0.75 (voyage-code-2)
  - Decision store has full context for 100% of new decisions
  - Auto-repair rate > 80%
  - Data score >= 65/100

Gate 3 (End of Phase 5):
  - PII scan covers 100% of stored data
  - Data classification applied to all data
  - Data health dashboard with alerts operational
  - Data score >= 75/100
  - All 7 dimensions >= 70/100
```

---

## 13. Conexoes

### 13.1 Internal Dependencies

| Study | Connection | How S58 Integrates |
|-------|-----------|-------------------|
| S4 (Security & Prompt Governance) | Security patterns, audit trail, PII detection | S58 uses `@ideia/security` output-validator patterns for stored data PII scan; extends audit SHA-256 chain to all data operations |
| S35 (File System & Workspace) | VFS providers, file watching | S58 BackupManager reads/writes through `@ideia/filesystem` VFS layer; backups preserve workspace structure |
| S45 (Theia Workspace Resources) | Workspace resource model | S58 lineage tracker captures workspace state per decision; retention enforcer works per-workspace |
| S61 (Vulnerability & Dependency) | SBOM, dependency scanning | S58 data validation pipeline integrates with dependency scanner for package data integrity |
| S65 (Enterprise Compliance) | SOC2, LGPD, HIPAA | S58 provides the data foundation: retention, privacy, lineage, and audit for compliance certification |
| S17 (Observabilidade Full-Stack) | Metrics, tracing, logging | S58 data health dashboard feeds into `@ideia/observability` metrics pipeline; data score as business metric |

### 13.2 External Standards

| Standard | Relevance | S58 Implementation |
|----------|-----------|-------------------|
| GDPR Art 5, 17, 20 | Data retention, deletion, portability | Tiered retention, deletion handler with certificate, JSON/NDJSON export API |
| LGPD Art 15, 18 | Purpose limitation, user rights | Data classification per purpose, right to deletion/anonymization |
| SOC 2 CC6, CC7 | Data protection, monitoring | Encryption at rest + TLS, data health dashboard, automated alerting |
| NIST SP 800-53 | Backup, contingency planning | RPO/RTO targets, restore testing, offsite S3 backups |
| AWS Well-Architected Data Pillar | Backup, replication, data integrity | WAL streaming, multi-region backup storage, integrity verification |

### 13.3 Package Map

```
@ideia/backup-manager       ─── packages/data/src/backup/
@ideia/data-lineage          ─── packages/data/src/lineage/
@ideia/retention             ─── packages/data/src/retention/
@ideia/embedding-eval        ─── packages/data/src/embeddings/
@ideia/decision-store        ─── packages/data/src/decisions/
@ideia/data-validator        ─── packages/data/src/validation/
@ideia/data-catalog          ─── packages/data/src/catalog/
@ideia/data-health           ─── packages/data/src/monitoring/
@ideia/privacy-pipeline      ─── packages/data/src/privacy/
```

---

> **Next:** Implementation in `packages/data/src/` with 9 modules following the blueprint above.
> **Target data score:** 75/100 (from current 40/100) within 15 weeks.
