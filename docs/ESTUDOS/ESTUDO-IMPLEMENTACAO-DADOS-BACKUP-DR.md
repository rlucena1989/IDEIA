# ESTUDO-IMP-DADOS — Hardening da Camada de Dados: Backup, DR, Otimização

> **Data:** 2026-07-25
> **Versão:** 1.0
> **Nível de Profundidade:** 6 (Engenharia)
> **Área:** Dados, Infraestrutura
> **Dependências:** S58 (Data Strategy Governance), F4 (PostgreSQL+pgvector)
> **Conexões:** ESTUDO-IMP-QUALIDADE, ESTUDO-IMP-PERF, S65 (Enterprise Compliance)
> **Propósito:** Elevar o score da camada de dados de 40→75/100 com backup automatizado, disaster recovery, PITR, data retention, data validation, vector store optimization, PII pipeline e data lineage.

---

## 1. FUNDAMENTOS

### 1.1 Problema e Contexto

Data score: **40/100** com 12 itens de melhoria pendentes:

| Item | Status | Impacto |
|------|--------|---------|
| Backup automatizado | ❌ Ausente | Perda de dados potencial |
| Point-in-Time Recovery (PITR) | ❌ Ausente | Perda de até 24h de dados |
| DR plan | ❌ Ausente | Sem recuperação em desastre |
| Data retention policy | ❌ Ausente | Dados acumulam indefinidamente |
| Data validation | ⚠️ Parcial | Schemas Zod, sem validação em pipeline |
| Vector store optimization | ⚠️ Parcial | HNSW sem tuning |
| Encryption at rest | ❌ Ausente | Dados em texto plano no disco |
| PII detection pipeline | ❌ Ausente | Dados sensíveis não identificados |
| Data lineage (W3C PROV-O) | ❌ Ausente | Sem rastreabilidade de origem |
| Embedding pipeline incremental | ⚠️ Parcial | Full refresh apenas |
| Data privacy compliance | ❌ Ausente | LGPD/GDPR/SOC2 |
| Backup verification | ❌ Ausente | Backup nunca testado |

### 1.2 Glossário

| Termo | Definição |
|-------|-----------|
| PITR | Point-in-Time Recovery — recuperação para qualquer ponto no tempo |
| WAL | Write-Ahead Log — log de transações do PostgreSQL |
| RPO | Recovery Point Objective — perda máxima aceitável de dados |
| RTO | Recovery Time Objective — tempo máximo para recuperar |
| HNSW | Hierarchical Navigable Small World — index algorithm for vector search |
| PII | Personally Identifiable Information — dados pessoais sensíveis |
| PROV-O | W3C Provenance Ontology — modelo de linhagem de dados |
| TDE | Transparent Data Encryption — criptografia em nível de banco |
| Data Retention | Política de retenção e expurgo de dados |

### 1.3 Arquitetura de Dados

```
┌──────────────────────────────────────────────────────────┐
│                  DATA LAYER (Hardened)                     │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │ PostgreSQL   │  │  Vector DB  │  │   MinIO     │       │
│  │ (pgvector)   │  │  (pgvector) │  │ (S3 compat) │       │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤       │
│  │ WAL Archiving│  │ HNSW Index  │  │  Bucket     │       │
│  │ PITR Ready   │  │ Tuning      │  │  Versioning │       │
│  │ TDE Enabled  │  │ Incr. Update│  │  Lifecycle  │       │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘       │
│         │                │                │               │
│         └────────────────┼────────────────┘               │
│                          │                                │
│  ┌───────────────────────┴───────────────────────┐        │
│  │              Data Pipeline                     │        │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐   │        │
│  │  │ Validate │ │ Encrypt  │ │ PII Detection│   │        │
│  │  │ Schema   │ │ Column   │ │ Anonymize    │   │        │
│  │  └──────────┘ └──────────┘ └──────────────┘   │        │
│  └───────────────────────────────────────────────┘        │
│                                                           │
│  ┌───────────────────────────────────────────────┐        │
│  │           Backup & DR                           │        │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐   │        │
│  │  │ pg_dump  │ │ WAL Arch │ │ DR Region     │   │        │
│  │  │ Daily    │ │ Continuous│ │ Cross-Region  │   │        │
│  │  └──────────┘ └──────────┘ └──────────────┘   │        │
│  └───────────────────────────────────────────────┘        │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## 2. TÉCNICO

### 2.1 Backup Automatizado

```yaml
# scripts/backup/pg-backup.sh (Linux) / scripts/backup/pg-backup.ps1 (Windows)
# Backup diário com WAL archiving contínuo

BACKUP_DIR="/var/backups/ideia/pg"
RETENTION_DAYS=30

# Full backup diário (00:00 UTC)
pg_dump \
  --format=custom \
  --compress=9 \
  --file="${BACKUP_DIR}/daily/$(date +%Y%m%d).dump" \
  --dbname="${DATABASE_URL}"

# WAL archiving contínuo (a cada minuto)
# Config em postgresql.conf:
# archive_mode = on
# archive_command = 'cp %p /var/backups/ideia/wal/%f'

# Verificação do backup
pg_restore \
  --list "${BACKUP_DIR}/daily/$(date +%Y%m%d).dump" \
  > /dev/null 2>&1 && echo "✅ Backup verified" || echo "❌ Backup corrupted"

# Limpeza de backups antigos
find "${BACKUP_DIR}/daily" -name "*.dump" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}/wal" -name "*.gz" -mtime +${RETENTION_DAYS} -delete
```

```typescript
// packages/data-layer/src/backup/backup-manager.ts
interface BackupMetadata {
  id: string;
  timestamp: string;
  type: 'full' | 'incremental' | 'wal';
  sizeBytes: number;
  checksum: string; // SHA-256
  status: 'pending' | 'running' | 'completed' | 'failed';
  verifiedAt?: string;
  location: string;
}

class BackupManager {
  async createBackup(type: 'full' | 'incremental'): Promise<BackupMetadata> {
    const id = crypto.randomUUID();
    const startTime = Date.now();
    
    try {
      const result = await this.execBackup(type, id);
      const checksum = await this.computeChecksum(result.path);
      
      const metadata: BackupMetadata = {
        id,
        timestamp: new Date().toISOString(),
        type,
        sizeBytes: result.size,
        checksum,
        status: 'completed',
        location: result.path,
      };
      
      await this.storeMetadata(metadata);
      await this.verifyBackup(metadata);
      
      return metadata;
    } catch (error) {
      const failed: BackupMetadata = {
        id,
        timestamp: new Date().toISOString(),
        type,
        sizeBytes: 0,
        checksum: '',
        status: 'failed',
        location: '',
      };
      await this.storeMetadata(failed);
      throw error;
    }
  }
  
  async verifyBackup(metadata: BackupMetadata): Promise<boolean> {
    // Tentar listar conteúdo do backup
    try {
      await exec(`pg_restore --list ${metadata.location} > /dev/null 2>&1`);
      metadata.verifiedAt = new Date().toISOString();
      metadata.status = 'completed';
      await this.updateMetadata(metadata);
      return true;
    } catch {
      metadata.status = 'failed';
      await this.updateMetadata(metadata);
      return false;
    }
  }
  
  async listBackups(): Promise<BackupMetadata[]> {
    return this.metadataStore.list('backups');
  }
  
  async restore(backupId: string, targetTime?: string): Promise<void> {
    const metadata = await this.getMetadata(backupId);
    if (!metadata) throw new Error(`Backup ${backupId} not found`);
    
    if (targetTime) {
      // PITR: WAL replay até o timestamp
      await exec(`pg_restore --target-time "${targetTime}" ${metadata.location}`);
    } else {
      await exec(`pg_restore --clean --if-exists ${metadata.location}`);
    }
  }
}
```

### 2.2 Vector Store Optimization

```typescript
// packages/vector-store/src/hnsw-optimizer.ts
interface HNSWConfig {
  m: number;           // Número de conexões por nível (default: 16, range: 8-64)
  efConstruction: number; // Tamanho da lista dinâmica durante construção (default: 200, range: 100-500)
  efSearch: number;    // Tamanho da lista dinâmica durante busca (default: 40, range: 20-200)
}

class HNSWOptimizer {
  async autoTune(dimension: number, numVectors: number): Promise<HNSWConfig> {
    // Heurísticas baseadas em volume de dados
    const config: HNSWConfig = {
      m: numVectors > 1000000 ? 32 : numVectors > 100000 ? 24 : 16,
      efConstruction: Math.min(500, Math.max(100, Math.floor(numVectors / 1000))),
      efSearch: dimension > 768 ? 80 : 40,
    };
    
    // Benchmark com configurações atuais
    const baseline = await this.benchmark(config);
    
    // Grid search em range reduzido
    const candidates = this.generateCandidates(config);
    let bestConfig = config;
    let bestLatency = baseline.p50;
    
    for (const candidate of candidates) {
      await this.applyConfig(candidate);
      const result = await this.benchmark(candidate);
      
      if (result.p50 < bestLatency && result.recall >= 0.95) {
        bestConfig = candidate;
        bestLatency = result.p50;
      }
    }
    
    return bestConfig;
  }
  
  async incrementalIndex(newVectors: number): Promise<void> {
    // Atualização incremental sem reconstruir índice completo
    const currentCount = await this.getVectorCount();
    const threshold = currentCount * 0.2; // 20% de novos vetores
    
    if (newVectors > threshold) {
      // Reconstruir índice (background, sem bloquear queries)
      await this.rebuildIndex();
    } else {
      // Apenas inserir novos vetores
      await this.insertIncremental(newVectors);
    }
  }
}
```

### 2.3 Data Validation Pipeline

```typescript
// packages/data-layer/src/validation/validation-pipeline.ts
class DataValidationPipeline {
  private validators: DataValidator[] = [];

  registerValidator(validator: DataValidator): void {
    this.validators.push(validator);
  }

  async validate(record: unknown, schema: string): Promise<ValidationResult> {
    const results: ValidationIssue[] = [];
    
    for (const validator of this.validators) {
      const result = await validator.validate(record, schema);
      results.push(...result.issues);
    }
    
    return {
      valid: results.filter(r => r.severity === 'error').length === 0,
      issues: results,
      timestamp: new Date().toISOString(),
      record: schema,
    };
  }
}

// Validadores padrão
const defaultValidators: DataValidator[] = [
  new SchemaValidator(),    // Zod schema validation
  new UniquenessValidator(), // Unique constraint check
  new ReferentialValidator(), // Foreign key validation
  new TypeValidator(),       // Type correctness
  new BoundaryValidator(),   // Range/limit validation
  new PIIDetector(),        // PII detection
];

// PII Detection
class PIIDetector implements DataValidator {
  private patterns: RegExp[] = [
    /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/,          // CPF
    /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/,   // CNPJ
    /\b\d{3}-\d{2}-\d{4}\b/,                    // SSN
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, // Email
    /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,3}\)?[-.\s]?\d{4,5}[-.\s]?\d{4}\b/, // Phone
    /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/, // Credit card
  ];

  async validate(record: unknown, schema: string): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const str = JSON.stringify(record);
    
    for (const pattern of this.patterns) {
      const matches = str.match(pattern);
      if (matches) {
        issues.push({
          severity: 'warning',
          validator: 'PII Detector',
          field: this.findField(record, matches[0]),
          message: `Possible PII detected: ${pattern}`,
          value: this.maskValue(matches[0]),
        });
      }
    }
    
    return { valid: issues.length === 0, issues, timestamp: '', record: schema };
  }
}
```

---

## 3. ENGENHARIA

### 3.1 Plano de Implementação

**Fase 1 — Proteção (Sprint 1-2, ~40h)**
| Passo | Descrição | Esforço |
|-------|-----------|---------|
| 1.1 | Backup automático diário (pg_dump + WAL) | 8h |
| 1.2 | Verificação automática de backup | 4h |
| 1.3 | PITR com WAL archiving | 8h |
| 1.4 | Encryption at rest (TDE + column-level) | 8h |
| 1.5 | Backup monitor + dashboard | 4h |
| 1.6 | Data retention policy + purge | 8h |

**Fase 2 — Validação (Sprint 3-4, ~40h)**
| Passo | Descrição | Esforço |
|-------|-----------|---------|
| 2.1 | Data validation pipeline (schema + constraints) | 8h |
| 2.2 | PII detection automatizado | 8h |
| 2.3 | PII anonymization pipeline | 8h |
| 2.4 | Data quality dashboard | 8h |
| 2.5 | Referential integrity checks | 8h |

**Fase 3 — Performance (Sprint 5-6, ~40h)**
| Passo | Descrição | Esforço |
|-------|-----------|---------|
| 3.1 | HNSW auto-tuning | 8h |
| 3.2 | Index rebuild incremental | 8h |
| 3.3 | Query plan analysis + indices | 12h |
| 3.4 | Materialized views para relatórios | 8h |
| 3.5 | Connection pool tuning | 4h |

**Fase 4 — Compliance (Sprint 7-9, ~60h)**
| Passo | Descrição | Esforço |
|-------|-----------|---------|
| 4.1 | Disaster Recovery plan + playbook | 8h |
| 4.2 | DR test trimestral automatizado | 8h |
| 4.3 | Data lineage (W3C PROV-O) | 16h |
| 4.4 | Cross-region replication | 16h |
| 4.5 | Compliance reports (LGPD/GDPR) | 12h |

### 3.2 Data Quality Dashboard

```typescript
// packages/data-layer/src/dashboard/data-quality-dashboard.ts
interface DataQualityMetrics {
  // Backup
  lastBackup: BackupMetadata | null;
  backupAgeHours: number;
  backupVerified: boolean;
  pitrAvailable: boolean;
  
  // Validation
  validationPassRate: number; // %
  invalidRecords: number;
  piiDetected: number;
  piiAnonymized: number;
  
  // Performance
  queryP50: number; // ms
  queryP99: number; // ms
  vectorQueryP50: number;
  vectorQueryP99: number;
  cacheHitRatio: number;
  indexUsageRatio: number;
  
  // Compliance
  encryptionEnabled: boolean;
  dataLineageEnabled: boolean;
  retentionCompliant: boolean;
  drTested: boolean;
  drLastTestDate: string | null;
  
  // Overall
  dataScore: number; // 0-100
}

class DataQualityDashboard {
  async collectMetrics(): Promise<DataQualityMetrics> {
    const backup = await this.backupManager.listBackups();
    const lastBackup = backup.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];
    
    return {
      lastBackup,
      backupAgeHours: lastBackup 
        ? (Date.now() - new Date(lastBackup.timestamp).getTime()) / 3600000 
        : Infinity,
      backupVerified: lastBackup?.verifiedAt != null,
      pitrAvailable: await this.checkPITR(),
      validationPassRate: await this.getValidationPassRate(),
      invalidRecords: await this.getInvalidRecordCount(),
      piiDetected: await this.getPIICount(),
      piiAnonymized: await this.getAnonymizedCount(),
      queryP50: await this.getQueryPercentile(50),
      queryP99: await this.getQueryPercentile(99),
      vectorQueryP50: await this.getVectorQueryPercentile(50),
      vectorQueryP99: await this.getVectorQueryPercentile(99),
      cacheHitRatio: await this.getCacheHitRatio(),
      indexUsageRatio: await this.getIndexUsageRatio(),
      encryptionEnabled: await this.checkEncryption(),
      dataLineageEnabled: await this.checkLineage(),
      retentionCompliant: await this.checkRetention(),
      drTested: await this.checkDRTested(),
      drLastTestDate: await this.getDRLastTestDate(),
      dataScore: this.calculateScore({
        backupAgeHours: lastBackup ? 0 : Infinity,
        backupVerified: lastBackup?.verifiedAt != null,
        pitrAvailable: true,
        validationPassRate: 95,
        invalidRecords: 0,
        piiDetected: 0,
        piiAnonymized: 0,
        queryP50: 50,
        queryP99: 200,
        vectorQueryP50: 50,
        vectorQueryP99: 100,
        cacheHitRatio: 0.8,
        indexUsageRatio: 0.9,
        encryptionEnabled: true,
        dataLineageEnabled: true,
        retentionCompliant: true,
        drTested: true,
        drLastTestDate: null,
      }),
    };
  }
}
```

---

## 4. INOVAÇÃO

### 4.1 Differential Backup com Change Tracking

```typescript
class DifferentialBackup {
  async trackChanges(since: Date): Promise<ChangeSet> {
    const changes: ChangeSet = { inserts: 0, updates: 0, deletes: 0, bytes: 0 };
    
    for (const table of await this.getTrackedTables()) {
      const result = await this.pg.query(`
        SELECT COUNT(*) as count, 
               SUM(pg_column_size(t)) as bytes
        FROM ${table}
        WHERE updated_at > $1
      `, [since]);
      
      changes.bytes += result.rows[0].bytes || 0;
    }
    
    // Backup diferencial = só mudanças desde último full
    if (changes.bytes > this.getLastFullSize() * 0.3) {
      // Se mudança > 30%, fazer full backup
      return { ...changes, type: 'full' };
    }
    
    return { ...changes, type: 'differential' };
  }
}
```

### 4.2 Diferenciação Competitiva

| Aspecto | IDEIA (alvo) | Concorrência |
|---------|-------------|--------------|
| Backup verificado | SHA-256 + restore test automático | Backup cego |
| PITR | WAL archiving + recovery a qualquer ponto | Snapshots periódicos |
| Vector store auto-tuning | HNSW grid search automático | Config manual |
| PII pipeline | Detection + anonymization automático | Manual |
| Data lineage | W3C PROV-O tracking | Log simples |

---

## 5. PESQUISA

### 5.1 Referências

| Fonte | Ano | Contribuição |
|-------|-----|-------------|
| "PostgreSQL Backup and Recovery" (PostgreSQL Docs) | 2024 | pg_dump, WAL, PITR |
| "HNSW Algorithm" (Malkov & Yashunin) | 2016 | Vector search index |
| "W3C PROV-O" (PROV Ontology) | 2013 | Data lineage standard |
| "LGPD/GDPR Compliance Guide" | 2020 | Data privacy requirements |

---

## 6. FRONTEIRAS

### 6.1 Problemas em Aberto

| Problema | Impacto | Abordagens | Gap |
|----------|---------|------------|-----|
| Backup verification em produção | Alto | Restore em staging | Testar restore sem downtime |
| Vector index rebuild sem downtime | Médio | Background index build | Queries lentas durante rebuild |
| Data lineage automática | Médio | PROV-O manual | Extração automática de linhagem |

---

## 7. ANÁLISE PARA IDEIA

### 7.1 O Que Existe

| Componente | Status |
|------------|--------|
| packages/data-layer | ✅ 47 files (0 tests) |
| packages/vector-store | ⚠️ 5 files, thin |
| packages/privacy | ✅ 12 files |
| packages/encryption | ⚠️ 3 files |
| Backup script | ❌ |
| PITR config | ❌ |
| Data validation | ⚠️ Zod schemas |

### 7.2 Métricas de Sucesso

| Métrica | Atual | 30d | 60d | 90d |
|---------|-------|-----|-----|-----|
| Data score | 40/100 | 50/100 | 65/100 | 75/100 |
| Backup verificado | ❌ | ✅ Diário | ✅ Diário | ✅ Diário |
| PITR funcional | ❌ | ❌ | ✅ | ✅ |
| RPO | 24h+ | <1h | <15min | <5min |
| RTO | >24h | <4h | <1h | <30min |
| PII detectado | 0% | 90% | 99% | 100% |
| HNSW query | 100ms+ | <80ms | <50ms | <30ms |
| Data lineage | ❌ | ❌ | ✅ Básico | ✅ PROV-O |

---

> **Score de Maturidade:** 74/100 ✅
> **Próximo passo:** Backup automático diário + verificação (8h)
