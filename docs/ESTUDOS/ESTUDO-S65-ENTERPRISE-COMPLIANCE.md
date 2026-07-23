# ESTUDO S65 -- Enterprise Compliance (SOC2, LGPD, HIPAA)

> **Gate enterprise: what is needed to sell IDEIA to regulated companies**
> Data: 2026-07-22

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0 | 2026-07-22 | IDEIA Architecture Team | Versao inicial -- full enterprise compliance study covering SOC2, LGPD, HIPAA, GDPR, PCI DSS, ISO 27001 with controls, evidence automation, audit preparation, code examples, and implementation roadmap |

---

## Sumario

1. [Introduction](#1-introduction)
2. [Compliance Framework Comparison](#2-compliance-framework-comparison)
3. [SOC2 Readiness](#3-soc2-readiness)
4. [CONTROL: Access Control](#4-control-access-control)
5. [CONTROL: Encryption](#5-control-encryption)
6. [CONTROL: Audit Logging](#6-control-audit-logging)
7. [CONTROL: Incident Response](#7-control-incident-response)
8. [CONTROL: Vendor Management](#8-control-vendor-management)
9. [CONTROL: Data Privacy (LGPD/GDPR)](#9-control-data-privacy-lgpdgdpr)
10. [CONTROL: HIPAA (Healthcare)](#10-control-hipaa-healthcare)
11. [Evidence Collection & Automation](#11-evidence-collection--automation)
12. [Compliance Documentation](#12-compliance-documentation)
13. [Audit Preparation](#13-audit-preparation)
14. [Compliance Widget (Theia)](#14-compliance-widget-theia)
15. [Code Examples](#15-code-examples)
16. [Implementation Roadmap](#16-implementation-roadmap)
17. [Conexoes](#17-conexoes)

---

## 1. Introduction

### 1.1 Why Enterprise Compliance Matters

IDEIA is designed as an AI-powered development platform that can transform ideas into complete systems. To sell to regulated enterprises -- financial services, healthcare, government, and critical infrastructure -- IDEIA must demonstrate compliance with industry-standard security and privacy frameworks.

Devin (by Cognition Labs) is currently pursuing SOC 2 certification, signaling that compliance is a competitive differentiator in the AI-assisted development market. IDEIA must not only match this capability but exceed it by supporting multiple frameworks natively.

### 1.2 Market Context

| Factor | Impact on IDEIA |
|--------|-----------------|
| Enterprise procurement requires SOC 2 | Without SOC 2, enterprise deals above $100K ARR are blocked |
| Brazilian market requires LGPD | IDEIA's target market includes Brazil -- non-compliance is illegal |
| Healthcare requires HIPAA | IDEIA as a development tool for healthcare SaaS companies |
| EU requires GDPR | Any customer with EU data subjects |
| Financial services require PCI DSS | If IDEIA processes payment data |
| ISO 27001 is a baseline | Often required alongside SOC 2 for international deals |

### 1.3 Current IDEIA Compliance Posture

| Framework | Current Score | Status | Critical Gaps |
|-----------|--------------|--------|---------------|
| SOC 2 | 60/100 | 3/5 controls pass | Incident detection, response automation |
| LGPD | 62/100 | 5/8 checks pass | Data deletion (forget), explainability, DPIA generation |
| HIPAA | 71/100 | 5/7 checks pass | MFA, encryption at rest |
| GDPR | 57/100 | 4/7 checks pass | Erasure, automated decision review, breach notification |
| PCI DSS | 0/100 | Not addressed | No payment data handling defined |
| ISO 27001 | 0/100 | Not addressed | No ISMS implemented |

### 1.4 Compliance Maturity Model

```
Level 0: None          -- No compliance controls
Level 1: Ad-hoc        -- Manual controls, no automation
Level 2: Defined       -- Controls documented, basic automation
Level 3: Managed       -- Automated evidence collection, monitoring
Level 4: Continuous    -- Real-time compliance, auto-remediation
Level 5: Predictive    -- Compliance prediction, proactive controls

IDEIA Current: Level 1-2 (varies by framework)
Enterprise Target: Level 3-4
```

---

## 2. Compliance Framework Comparison

### 2.1 Framework Overview

| Framework | Region | Focus | Type | Certification Cost | Typical Duration | Audit Frequency |
|-----------|--------|-------|------|-------------------|------------------|-----------------|
| SOC 2 Type I | USA | Security controls | Point-in-time | $30K-$60K | 3-6 months | Annual |
| SOC 2 Type II | USA | Controls operating effectiveness | Period (min 6mo) | $50K-$100K | 6-12 months | Annual |
| ISO 27001 | Global | ISMS | Certificacao | $40K-$80K | 6-12 months | Annual + surveillance |
| GDPR | EU/Global | Data privacy | Compliance (no cert) | $10K-$50K (legal) | Ongoing | Ongoing |
| LGPD | Brazil | Data privacy | Compliance (no cert) | $5K-$30K (legal) | Ongoing | Ongoing |
| HIPAA | USA | Healthcare data | Compliance (no cert) | $20K-$80K (audit) | 3-6 months | Periodic |
| PCI DSS | Global | Payment data | Compliance | $10K-$40K | 3-6 months | Annual/Quarterly |

### 2.2 Shared Controls Matrix

| Control Area | SOC2 | ISO27001 | GDPR | LGPD | HIPAA | PCI DSS |
|-------------|------|----------|------|------|-------|---------|
| Access Control | CC6.1 | A.9 | Art. 32 | Art. 46 | 164.312(a) | Req. 7 |
| Encryption | CC6.7 | A.10 | Art. 32 | Art. 46 | 164.312(e) | Req. 3-4 |
| Audit Logging | CC7.2 | A.12.4 | Art. 5(2) | Art. 37 | 164.312(b) | Req. 10 |
| Incident Response | CC7.3 | A.16 | Art. 33 | Art. 48 | 164.308(a)(6) | Req. 12 |
| Vendor Management | CC3.2 | A.15 | Art. 28 | Art. 39 | 164.308(b) | Req. 9 |
| Data Privacy | P1-P5 | A.18 | Art. 5-23 | Art. 7-21 | 164.502 | Req. 3 |
| Risk Assessment | CC3.1 | A.8 | Art. 35 | Art. 37 | 164.308(a)(1) | Req. 12 |
| Business Continuity | CC7.4 | A.17 | N/A | N/A | 164.308(a)(7) | Req. 9 |
| Change Management | CC8.1 | A.12.1 | N/A | N/A | N/A | Req. 6 |
| Physical Security | CC6.4 | A.11 | N/A | N/A | 164.310 | Req. 9 |

### 2.3 Unique Requirements Per Framework

| Framework | Unique Requirements |
|-----------|-------------------|
| SOC 2 | Subservice organization monitoring, system description, processing integrity |
| ISO 27001 | ISMS scope, management review, continual improvement, internal audit program |
| GDPR | Data Protection Officer, Data Protection Impact Assessment, cross-border transfer mechanisms |
| LGPD | National DPA (ANPD) registration, specific consent requirements for sensitive data |
| HIPAA | Business Associate Agreements, Notice of Privacy Practices, minimum necessary rule |
| PCI DSS | Network segmentation, quarterly ASV scans, penetration testing at least annually |

### 2.4 Applicability to IDEIA

| Deployment Model | Frameworks Required | Complexity |
|-----------------|--------------------|------------|
| On-premise (Theia Desktop) | SOC 2 (controls only), LGPD/GDPR if data crosses borders | Medium |
| Cloud (Theia Cloud / Web) | SOC 2 (full), ISO 27001, LGPD/GDPR | High |
| Healthcare customer | SOC 2 + HIPAA | Very High |
| Financial services | SOC 2 + PCI DSS | Very High |
| Government | SOC 2 + ISO 27001 + local regulations | Very High |

### 2.5 Cost of Certification (Annual)

```
SOC 2 Type II:      $50K-$100K (audit) + $20K-$40K (internal) = $70K-$140K/yr
ISO 27001:          $40K-$80K (cert) + $15K-$30K (surveillance) = $55K-$110K/yr
HIPAA readiness:    $20K-$80K (audit prep)
GDPR/LGPD counsel:  $5K-$30K/yr (legal)
PCI DSS compliance: $10K-$40K/yr

Total first year:   ~$150K-$350K (depending on scope)
Total ongoing:      ~$80K-$200K/yr

IDEIA Strategy:     SOC 2 Type II first (highest ROI for enterprise sales)
                    + LGPD/GDPR (legal compliance, lower cost)
                    HIPAA and PCI DSS per-customer scope
```

---

## 3. SOC2 Readiness

### 3.1 Trust Service Criteria Mapping

#### Security (Common Criteria CC1-CC9)

| Criteria | IDEIA Control | Status | Evidence |
|----------|--------------|--------|----------|
| CC1.1 Control Environment | Org structure, ethics policies | Not implemented | - |
| CC2.1 Communication | Information security policy, incident communication | Partial | `docs/governance/` policies exist |
| CC2.2 Communication with external parties | Vendor management, breach notification | Not implemented | - |
| CC3.1 Risk Assessment | Risk assessment process | Partial | `policy-engine` has basic risk checks |
| CC3.2 Risk Mitigation | Control selection, vendor oversight | Partial | `approval-flow` with 3 levels |
| CC4.1 Monitoring | Ongoing monitoring of controls | Not implemented | - |
| CC4.2 Evaluation of controls | Control testing, remediation | Not implemented | - |
| CC5.1 Control Activities | Policy deployment, access controls | Partial | `policy-engine` with 27 patterns |
| CC6.1 Logical Access | Authentication, authorization, MFA | Partial | Auth framework documented, not implemented |
| CC6.2 User Access Provisioning | User access review, provisioning | Not implemented | - |
| CC6.3 Physical Access | Data center access (cloud provider) | Inherited from cloud provider | - |
| CC6.4 Physical Security | (Cloud: inherited) | Inherited | AWS/GCP shared responsibility |
| CC6.5 Logical Access Security | Segregation of duties, least privilege | Partial | `policy-engine` RBAC, no ABAC |
| CC6.6 Security Incidents | Incident detection, response | Not implemented | - |
| CC7.1 System Monitoring | Monitoring of infrastructure, applications | Partial | `observability` exists, no SIEM |
| CC7.2 Incident Response | Incident response plan, testing | Not implemented | - |
| CC7.3 Remediation | Patch management, vulnerability remediation | Partial | `vulnerability-management` study exists |
| CC7.4 Business Continuity | Backup, recovery, BCP testing | Not implemented | - |
| CC8.1 Change Management | Change approval, testing, deployment | Partial | `delivery-orchestrator` with gates |
| CC9.1 Privacy | Privacy notice, data retention | Partial | `data-strategy` study exists |

#### Availability (A1)

| Criteria | IDEIA Control | Status | Evidence |
|----------|--------------|--------|----------|
| A1.1 Availability commitments | Monitoring, incident response | Partial | `observability-engine` with health checks |
| A1.2 Capacity management | Auto-scaling, performance | Not implemented | - |
| A1.3 Backup & recovery | Data backup, restore testing | Not implemented | - |

#### Processing Integrity (PI1)

| Criteria | IDEIA Control | Status | Evidence |
|----------|--------------|--------|----------|
| PI1.1 System processing | Accuracy and completeness | Partial | `audit-trail` with SHA-256 chain |
| PI1.2 Processing monitoring | Error handling, data validation | Partial | `output-validation` with 31 rules |
| PI1.3 Processing deviations | Exception handling, correction | Partial | `event-bus` DLQ |

#### Confidentiality (C1)

| Criteria | IDEIA Control | Status | Evidence |
|----------|--------------|--------|----------|
| C1.1 Confidential information protection | Encryption, access controls | Partial | No encryption at rest |
| C1.2 Confidential information disposal | Data deletion, retention | Not implemented | - |

#### Privacy (P1-P5)

| Criteria | IDEIA Control | Status | Evidence |
|----------|--------------|--------|----------|
| P1 Notice | Privacy notice disclosed | Not implemented | - |
| P2 Choice and consent | Consent management | Partial | `prompt-security` consent validation |
| P3 Collection | Data collection limited to purpose | Partial | `data-strategy` study |
| P4 Use and retention | Data minimization, retention limits | Not implemented | - |
| P5 Access | Subject access rights | Not implemented | - |
| P6 Disclosure | Third-party disclosure records | Not implemented | - |
| P7 Quality | Data accuracy | Not implemented | - |
| P8 Monitoring | Privacy program monitoring | Not implemented | - |

### 3.2 SOC2 Gap Analysis Summary

```
SOC2 Readiness: 60/100 (current) -> 85/100 (target)

Critical Gaps (blocking):
  - CC6.6: No incident detection automation
  - CC7.2: No incident response plan
  - CC7.4: No business continuity plan
  - A1.3: No backup/restore automation
  - P1-P5: No privacy program
  - CC4.1: No control monitoring

High Gaps (reducing score):
  - CC6.1: No MFA
  - CC6.2: No access review process
  - CC8.1: Change management partial (gates exist, no formal policy)
  - CC7.1: No SIEM integration
  - CC3.1: No formal risk assessment

Medium Gaps:
  - C1.2: No retention schedule enforcement
  - PI1.3: No formal error handling policy
  - CC2.1: No formal communication plan
```

### 3.3 SOC2 Control Scoring Model

```
Criteria Weighting:

  Security (CC1-CC9):        50%  (most controls, broadest scope)
  Availability (A1):         15%  (critical for cloud)
  Processing Integrity (PI1): 10%  (data processing accuracy)
  Confidentiality (C1):      10%  (client data protection)
  Privacy (P1-P5):           15%  (growing regulatory focus)

Score = sum(criteria_score * criteria_weight) / sum(weight)

Current: (60 * 0.5 + 30 * 0.15 + 50 * 0.10 + 30 * 0.10 + 10 * 0.15) / 1.0
       = (30 + 4.5 + 5 + 3 + 1.5) / 1.0
       = 44 / 1.0
       = 44/100  (unweighted: 60/100, weighted: 44/100)

Target:  (85 * 0.5 + 80 * 0.15 + 80 * 0.10 + 80 * 0.10 + 75 * 0.15) / 1.0
       = (42.5 + 12 + 8 + 8 + 11.25) / 1.0
       = 81.75/100  (unweighted: 85/100, weighted: 82/100)
```

---

## 4. CONTROL: Access Control

### 4.1 Authentication

#### Requirements

| Requirement | SOC2 | HIPAA | LGPD/GDPR | IDEIA Status |
|-------------|------|-------|-----------|-------------|
| Unique user identification | CC6.1 | 164.312(a)(1) | Art. 32 | Auth framework documented |
| Multi-factor authentication (MFA) | CC6.1 | 164.312(d) | Art. 46 | Not implemented |
| SSO/SAML integration | CC6.1 | - | - | Not implemented |
| OAuth2 / OIDC | CC6.1 | - | - | Auth0 integration planned |
| Password policies | CC6.1 | 164.312(a)(1) | Art. 46 | Policy engine has patterns |
| Session timeout | CC6.1 | 164.312(a)(2)(iii) | Art. 46 | Not implemented |
| Concurrent session limit | CC6.1 | - | - | Not implemented |

#### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION LAYER                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  Auth0       │  │  Keycloak    │  │  SAML IdP    │               │
│  │  (cloud)     │  │  (self-host) │  │  (enterprise) │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                 │                  │                        │
│         ▼                 ▼                  ▼                        │
│  ┌──────────────────────────────────────────────────────┐            │
│  │           AuthenticationAdapter (abstracao)           │            │
│  │  @theia/authentication  │  @ideia/auth-adapter        │            │
│  └─────────────────────┬────────────────────────────────┘            │
│                        │                                             │
│         ┌──────────────┼──────────────┐                              │
│         ▼              ▼              ▼                              │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐                        │
│  │ Theia     │  │ CLI       │  │ Agent     │                        │
│  │ Frontend  │  │ Commands  │  │ Runtime   │                        │
│  └───────────┘  └───────────┘  └───────────┘                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Authorization (RBAC/ABAC)

#### Role Definitions

| Role | Scope | Permissions | Mapped To |
|------|-------|-------------|-----------|
| `admin` | System-wide | Full access, audit, user management | SOC2 CC6.1, HIPAA 164.312(a) |
| `developer` | Workspace | Code, agents, debugging | SOC2 CC6.1 |
| `operator` | Workspace | Deployments, configuration | SOC2 CC6.1, CC8.1 |
| `auditor` | Read-only | Audit logs, compliance reports | SOC2 CC7.1, CC7.2 |
| `viewer` | Read-only | Code view, dashboard | SOC2 CC6.1 |
| `security` | System-wide | Incident response, policy management | SOC2 CC7.2, CC7.3 |

#### ABAC Attributes

| Attribute | Example | Purpose |
|-----------|---------|---------|
| `user.department` | "engineering", "security" | Department-based access |
| `user.clearance` | "confidential", "restricted" | Data classification access |
| `resource.classification` | "public", "internal", "confidential" | Document-level access |
| `environment` | "production", "staging" | Environment-based restrictions |
| `time` | "business-hours", "off-hours" | Time-based access |
| `location` | "office", "vpn", "remote" | Location-based policies |
| `risk-score` | 0-100 | Dynamic risk-based access |

### 4.3 Access Review Process

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ACCESS REVIEW WORKFLOW                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Monthly Trigger                                                    │
│       │                                                             │
│       ▼                                                             │
│  System generates access report  ───────────────────┐              │
│       │                                               │             │
│       ▼                                               │             │
│  Manager reviews user access                          │             │
│       │                                               │             │
│       ├── Approved ──> Access continues               │             │
│       │                                               │             │
│       └── Revoked  ──> Automated deprovisioning       │             │
│                         │                              │            │
│                         ▼                              │            │
│                    Audit trail entry                   │            │
│                         │                              │            │
│                         ▼                              │            │
│                    Compliance evidence                  │            │
│                         │                              │            │
│                         ▼                              ▼            │
│              ┌──────────────────────┐                               │
│              │  Access Review Store │                                │
│              │  (SQLite for on-prem,│                                │
│              │   PostgreSQL for     │                                │
│              │   cloud)             │                                │
│              └──────────────────────┘                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.4 Privileged Access Management (PAM)

| Control | Implementation | Priority |
|---------|---------------|----------|
| Just-in-time (JIT) access | Temporary elevation via approval workflow | P0 |
| Session recording | All privileged sessions logged to audit trail | P1 |
| Approver workflow | 2-person rule for admin access | P0 |
| Credential rotation | Automatic rotation after each use | P1 |
| Privilege escalation monitoring | Real-time alert on admin actions | P0 |

---

## 5. CONTROL: Encryption

### 5.1 Data at Rest Encryption

| Storage Type | Algorithm | Key Management | Status |
|-------------|-----------|---------------|--------|
| SQLite databases | AES-256-GCM | Local key derivation (Argon2) | Not implemented |
| PostgreSQL databases | AES-256 (TDE) | AWS KMS / HashiCorp Vault | Planned |
| File storage (MinIO) | AES-256-SSE | MinIO KMS integration | Planned |
| Embedding vectors | AES-256-GCM | Application-level encryption | Not implemented |
| Configuration files | AES-256-GCM | User-provided passphrase | Not implemented |
| Audit logs | Append-only (no encryption) | Integrity via SHA-256 chain | Implemented |
| Cache (Redis/In-memory) | AES-256-GCM | Key rotation | Not implemented |

### 5.2 Data in Transit Encryption

| Communication Channel | Protocol | Cipher | Status |
|---------------------|----------|--------|--------|
| Browser <-> Theia Cloud | TLS 1.3 | TLS_AES_256_GCM_SHA384 | Inherited from Theia |
| CLI <-> API Server | TLS 1.3 | TLS_AES_256_GCM_SHA384 | Not implemented |
| Agent <-> LLM Provider | TLS 1.3 | TLS_AES_256_GCM_SHA384 | Partially (Ollama default) |
| NATS JetStream | TLS 1.3 | TLS_AES_256_GCM_SHA384 | Planned |
| PostgreSQL | TLS 1.3 | TLS_AES_256_GCM_SHA384 | Planned |
| MinIO (S3) | TLS 1.3 | TLS_AES_256_GCM_SHA384 | Planned |

### 5.3 Key Management Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        KEY MANAGEMENT HIERARCHY                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────┐           │
│  │              Key Management Service                   │           │
│  │  (HashiCorp Vault / AWS KMS / Azure Key Vault)       │           │
│  └──────────────────────┬───────────────────────────────┘           │
│                         │                                            │
│         ┌───────────────┼───────────────┐                            │
│         ▼               ▼               ▼                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                     │
│  │ Master Key │  │ KMS Key    │  │ KMS Key    │                     │
│  │ (root)     │  │ (rotation  │  │ (rotation  │                     │
│  │            │  │  monthly)  │  │  monthly)  │                     │
│  └──────┬─────┘  └─────┬──────┘  └─────┬──────┘                     │
│         │               │               │                            │
│         ▼               ▼               ▼                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                     │
│  │ DEK (data) │  │ DEK (data) │  │ DEK (data) │                     │
│  │ per-volume │  │ per-db     │  │ per-bucket │                     │
│  └────────────┘  └────────────┘  └────────────┘                     │
│                                                                      │
│  Key Rotation:                                                       │
│  - Master key: every 12 months (manual ceremony)                    │
│  - KMS keys: every 3 months (automatic)                             │
│  - DEKs: every 30 days (automatic re-encryption)                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.4 Encryption Standards Matrix

| Algorithm | Use Case | Key Size | Mode | Standard |
|-----------|----------|----------|------|----------|
| AES-256 | Data at rest | 256-bit | GCM | NIST SP 800-38D |
| AES-256 | Data in transit | 256-bit | GCM | NIST SP 800-38D |
| RSA-4096 | Key wrapping | 4096-bit | OAEP | NIST SP 800-56B |
| ECDSA P-384 | Digital signatures | 384-bit | - | NIST SP 800-186 |
| Argon2id | Key derivation | - | - | OWASP recommendation |
| HKDF | Key derivation | - | - | RFC 5869 |
| SHA-256 | Integrity | 256-bit | - | NIST FIPS 180-4 |
| SHA-384 | Integrity (higher) | 384-bit | - | NIST FIPS 180-4 |

### 5.5 Encrypted Backups

| Backup Type | Encryption | Retention | Testing |
|-------------|-----------|-----------|---------|
| Daily incremental | AES-256-GCM | 30 days | Monthly restore test |
| Weekly full | AES-256-GCM | 90 days | Quarterly restore test |
| Monthly full | AES-256-GCM | 12 months | Semi-annual restore test |
| Annual archive | AES-256-GCM | 7 years | Annual restore test |

---

## 6. CONTROL: Audit Logging

### 6.1 Comprehensive Audit Logging

#### Events to Log

| Category | Events | Detail | Retention |
|----------|--------|--------|-----------|
| User actions | login, logout, create, delete, update, view | User ID, IP, timestamp, resource ID, action | 7 years |
| Agent actions | plan, execute, approve, reject, modify | Agent ID, plan ID, action, input hash, output hash | 5 years |
| System events | start, stop, crash, deploy, config change | Service name, event type, timestamp, metadata | 3 years |
| Data access | read, write, export, delete | Data type, record ID, user/agent, action, reason | 7 years |
| Access control | grant, revoke, MFA, login failure | Admin ID, target user, role change, result | 7 years |
| Policy violations | block, warn, escalate | Rule ID, input hash, output hash, decision | 5 years |
| Encryption events | key rotation, encrypt, decrypt | Key ID, action, service, result (no key material) | 3 years |
| Compliance events | check run, pass, fail, audit | Framework, control ID, status, evidence hash | 5 years |

#### Log Format

```typescript
interface AuditEvent {
  id: string;                    // UUID v4
  timestamp: string;             // ISO 8601 (UTC)
  category: AuditCategory;
  action: AuditAction;
  actor: {
    type: 'user' | 'agent' | 'system';
    id: string;
    role?: string;
    sessionId?: string;
  };
  resource: {
    type: string;
    id: string;
    action: string;
  };
  context: {
    ip?: string;
    userAgent?: string;
    geo?: string;
    workspaceId?: string;
    correlationId?: string;
  };
  metadata: Record<string, unknown>;
  result: 'success' | 'failure' | 'blocked';
  severity: 'info' | 'warning' | 'critical';
}
```

### 6.2 Log Immutability (Cryptographic Chain)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AUDIT LOG IMMUTABILITY CHAIN                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Genesis Block                                                       │
│  ┌──────────────────────────┐                                        │
│  │ hash: "0000..."          │                                        │
│  │ prev_hash: null          │                                        │
│  │ timestamp: 2026-07-01    │                                        │
│  │ events: [...]            │                                        │
│  └──────────┬───────────────┘                                        │
│             │                                                        │
│             ▼                                                        │
│  Block 1                                                             │
│  ┌──────────────────────────┐                                        │
│  │ hash: "a3f8..."          │─────── SHA-256(prev + events)         │
│  │ prev_hash: "0000..."     │                                        │
│  │ timestamp: 2026-07-01    │                                        │
│  │ events: [...]            │                                        │
│  └──────────┬───────────────┘                                        │
│             │                                                        │
│             ▼                                                        │
│  Block 2                                                             │
│  ┌──────────────────────────┐                                        │
│  │ hash: "b7c2..."          │─────── SHA-256(prev + events)         │
│  │ prev_hash: "a3f8..."     │                                        │
│  │ timestamp: 2026-07-02    │                                        │
│  │ events: [...]            │                                        │
│  └──────────┬───────────────┘                                        │
│             │                                                        │
│             ▼                                                        │
│  ... (continues)                                                     │
│                                                                      │
│  Verification: verifyChain() traverses from genesis                  │
│  to latest, recomputing each hash and comparing                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.3 Log Retention Policy

| Environment | Active Storage | Warm Storage | Cold Storage | Deletion |
|-------------|---------------|-------------|-------------|----------|
| Development | NATS KV (7 days) | SQLite (90 days) | None | After 90 days |
| Staging | NATS KV (30 days) | SQLite (6 months) | Compressed JSON (12 mo) | After 12 months |
| Production | NATS KV (90 days) | PostgreSQL (12 months) | S3 Glacier (7 years) | After 7 years |

### 6.4 SIEM Integration

| SIEM Platform | Protocol | Integration Method | Priority |
|---------------|----------|-------------------|----------|
| Splunk | HEC (HTTP Event Collector) | JSON over HTTPS | P0 |
| ELK Stack | Logstash TCP | JSON over TCP | P0 |
| Datadog | HTTP API | JSON over HTTPS | P1 |
| Azure Sentinel | Log Analytics API | JSON over HTTPS | P1 |
| AWS CloudWatch | Kinesis Firehose | JSON over HTTPS | P1 |
| Wazuh (OSS) | Syslog | CEF over TCP | P2 |

---

## 7. CONTROL: Incident Response

### 7.1 Incident Response Plan

```
┌─────────────────────────────────────────────────────────────────────┐
│                      INCIDENT RESPONSE LIFECYCLE                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Detection                                                          │
│     │                                                               │
│     ▼                                                               │
│  Triage ─────> False Positive ──> Close + Log                       │
│     │                                                               │
│     ▼                                                               │
│  Classification                                                     │
│     │                                                               │
│     ├── Critical ──> SLA: 15min response, 1hr containment           │
│     ├── High     ──> SLA: 30min response, 4hr containment           │
│     ├── Medium   ──> SLA: 2hr response, 24hr containment            │
│     └── Low      ──> SLA: 8hr response, 72hr containment            │
│                                                                      │
│  Containment                                                        │
│     │                                                               │
│     ├── Auto-isolate affected system                                │
│     ├── Revoke compromised credentials                              │
│     └── Block malicious traffic                                     │
│                                                                      │
│  Eradication                                                        │
│     │                                                               │
│     ├── Remove malicious artifacts                                  │
│     ├── Patch vulnerability                                         │
│     └── Restore from clean backup                                   │
│                                                                      │
│  Recovery                                                           │
│     │                                                               │
│     ├── Verify system integrity                                     │
│     ├── Restore service                                             │
│     └── Monitor for recurrence                                      │
│                                                                      │
│  Post-Mortem                                                        │
│     │                                                               │
│     ├── Root cause analysis                                         │
│     ├── Timeline reconstruction                                     │
│     ├── Remediation items                                           │
│     └── Compliance notification                                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2 Severity Classification

| Severity | Definition | Examples | SLA Response | SLA Contain |
|----------|-----------|----------|-------------|-------------|
| Critical | Active data breach, system-wide outage | Unauthorized data access, ransomware, credential leak | 15 min | 1 hour |
| High | Isolated breach, service degradation | Phishing compromise, DDoS, single-tenant breach | 30 min | 4 hours |
| Medium | Vulnerability, non-exploited gap | Scan finding, misconfiguration, stale certificate | 2 hours | 24 hours |
| Low | Policy violation, procedural gap | Failed access attempt, missing doc, expired review | 8 hours | 72 hours |

### 7.3 Regulatory Notification Timeline

| Regulation | Notification Requirement | Timeline | Fines for Non-Compliance |
|------------|------------------------|----------|------------------------|
| GDPR Art. 33 | Notify supervisory authority | Within 72 hours | Up to 4% global revenue |
| LGPD Art. 48 | Notify ANPD and affected subjects | Within reasonable time | Up to 2% Brazil revenue |
| HIPAA Breach Notification | Notify HHS and affected individuals | Within 60 days | Up to $1.5M/year |
| State breach laws (US) | Notify state AG and affected | Varies (30-90 days) | Per-state penalties |

### 7.4 Incident Response Team Structure

| Role | Responsibility | Backup |
|------|---------------|--------|
| Incident Commander | Overall coordination, decision making | Security Lead |
| Technical Lead | Technical investigation, containment | Senior Engineer |
| Communications Lead | Internal/external communication, regulatory | Legal Counsel |
| Scribe | Timeline tracking, evidence collection | Security Analyst |
| Legal Counsel | Regulatory compliance, liability assessment | Outside Counsel |

### 7.5 Post-Mortem Process

```
Post-Mortem Template:

Title: [INCIDENT-XXXX] - [Brief Description]
Date: YYYY-MM-DD
Severity: Critical | High | Medium | Low

Summary:
  3-5 sentences describing what happened

Timeline:
  YYYY-MM-DD HH:MM - Detection
  YYYY-MM-DD HH:MM - Triage
  YYYY-MM-DD HH:MM - Containment
  YYYY-MM-DD HH:MM - Eradication
  YYYY-MM-DD HH:MM - Recovery
  YYYY-MM-DD HH:MM - Post-mortem

Root Cause:
  Technical cause:
  Human cause:
  Process cause:

Impact:
  Users affected:
  Data affected:
  Downtime:
  Financial impact:

Remediation:
  - [ ] P0: Immediate fix (24h)
  - [ ] P1: Short-term fix (7 days)
  - [ ] P2: Long-term improvement (30 days)

Lessons Learned:
  - What went well:
  - What went wrong:
  - What to improve:

Regulatory Notifications:
  - [ ] GDPR DPA notified
  - [ ] LGPD ANPD notified
  - [ ] HIPAA HHS notified
  - [ ] Customers notified
```

---

## 8. CONTROL: Vendor Management

### 8.1 Vendor Risk Assessment

| Vendor Category | Examples | Risk Level | Assessment Frequency |
|-----------------|----------|------------|---------------------|
| LLM Providers | Ollama, OpenAI, Anthropic, DeepSeek | High | Quarterly |
| Cloud Infrastructure | AWS, GCP, Azure | High | Annually |
| Authentication | Auth0, Keycloak | Medium | Annually |
| Monitoring | Datadog, Grafana | Low | Annually |
| Code Storage | GitHub, GitLab | Medium | Annually |
| Package Registry | npm, PyPI, Maven | Medium | Quarterly |
| CI/CD | GitHub Actions, Jenkins | Low | Annually |

### 8.2 Subprocessor List

| Subprocessor | Service | Data Access | Location | DPA Signed |
|-------------|---------|-------------|----------|------------|
| Ollama | LLM inference | Prompts (if remote) | Self-hosted / On-prem | N/A |
| OpenAI | LLM inference | Prompts, outputs | USA | Required |
| Anthropic | LLM inference | Prompts, outputs | USA | Required |
| DeepSeek | LLM inference | Prompts, outputs | China | Required (restricted) |
| AWS | Cloud hosting | All customer data | Region-selected | Required |
| Auth0 | Authentication | User identities | Region-selected | Required |
| GitHub | Code hosting | Source code | USA/EU | Required |
| npm Inc | Package registry | Package metadata | USA | Required |

### 8.3 Data Processing Agreement (DPA) Requirements

| Clause | Description | Status |
|--------|-------------|--------|
| Data processing instructions | Scope, nature, purpose of processing | Not drafted |
| Data security measures | Technical and organizational measures | Partial (existing controls) |
| Subprocessor authorization | List of subprocessors, objection process | Not drafted |
| Data subject rights | Assistance with DSARs | Not drafted |
| Data breach notification | Timeline and process | Not drafted |
| Data deletion | Return/deletion after service end | Not drafted |
| Audits and inspections | Customer audit rights | Not drafted |
| International transfers | Adequacy decisions, SCCs | Not drafted |
| Liability and indemnification | Data processing liability | Not drafted |
| Duration and termination | Data processing during and after contract | Not drafted |

### 8.4 Vendor Security Review Checklist

```
VENDOR SECURITY REVIEW CHECKLIST
=================================

[ ] SOC 2 Type II report reviewed (within last 12 months)
[ ] ISO 27001 certificate reviewed (valid)
[ ] Penetration test report reviewed (within last 12 months)
[ ] Data processing agreement signed
[ ] Subprocessor list reviewed and approved
[ ] Security contact identified and tested
[ ] Incident response process compatible
[ ] Encryption standards meet minimum requirements
[ ] Data residency meets contractual requirements
[ ] Business continuity plan reviewed
[ ] Insurance certificates reviewed (cyber liability)
[ ] Right to audit clause included in contract
[ ] Service level agreement (SLA) defined
[ ] Termination and data return process defined
```

### 8.5 Vendor Termination Procedures

```
VENDOR TERMINATION PROCEDURE
=============================

Phase 1: Notice (T-90 days)
  [ ] Contractual notice sent
  [ ] Project plan for migration created
  [ ] Data export initiated

Phase 2: Migration (T-60 days)
  [ ] Alternative vendor onboarded
  [ ] Data migrated and verified
  [ ] Integration tested

Phase 3: Termination (T-30 days)
  [ ] Service access revoked
  [ ] Data deletion confirmed (certificate of destruction)
  [ ] Final invoice processed
  [ ] Audit trail of termination documented
```

---

## 9. CONTROL: Data Privacy (LGPD/GDPR)

### 9.1 Data Inventory

| Data Category | Collected | Storage Location | Purpose | Retention | Legal Basis |
|---------------|-----------|-----------------|---------|-----------|-------------|
| User identity (name, email) | Yes | Auth provider, local config | Account management | Contract duration | Performance of contract |
| User credentials (password hash) | Yes | Auth provider | Authentication | Contract duration | Performance of contract |
| Workspace files | Yes | Local filesystem, MinIO | Development | Contract duration | Performance of contract |
| Agent prompts | Yes | Event bus, audit trail | Agent operation | 90 days | Legitimate interest |
| Agent responses | Yes | Event bus, audit trail | Output delivery | 90 days | Legitimate interest |
| LLM queries | Yes | Audit trail, LLM provider | AI processing | 30 days | Legitimate interest |
| Audit logs | Yes | Audit trail store | Security, compliance | 7 years | Legal obligation |
| IP addresses | Yes | Logs, auth provider | Security, analytics | 90 days | Legitimate interest |
| Browser/device info | Yes | Logs, auth provider | Security, analytics | 90 days | Legitimate interest |
| Telemetry | Yes | Metrics store | Product improvement | 12 months | Consent |
| API keys | Yes | Config, secrets store | Integration | Contract duration | Performance of contract |
| Payment data | No | N/A | N/A | N/A | N/A |

### 9.2 Consent Management

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CONSENT MANAGEMENT FLOW                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  User Action: Sign Up                                                │
│       │                                                             │
│       ▼                                                             │
│  Consent Collection                                                 │
│  ┌──────────────────────────────────────────────┐                   │
│  │ [x] I agree to the Terms of Service          │                   │
│  │ [x] I agree to the Privacy Policy            │                   │
│  │ [ ] I agree to telemetry collection          │                   │
│  │ [ ] I agree to AI model training (opt-in)    │                   │
│  │ [ ] I agree to marketing emails (opt-in)      │                   │
│  └──────────────────────────────────────────────┘                   │
│       │                                                             │
│       ▼                                                             │
│  Consent Recorded                                                  │
│  ┌──────────────────────────────────────┐                          │
│  │ user_id: "abc123"                    │                          │
│  │ timestamp: "2026-07-22T10:00:00Z"    │                          │
│  │ purposes: {                          │                          │
│  │   "terms": true,                     │                          │
│  │   "privacy": true,                   │                          │
│  │   "telemetry": false,                │                          │
│  │   "ai_training": false,              │                          │
│  │   "marketing": false                 │                          │
│  │ }                                     │                          │
│  │ ip: "192.168.1.1"                    │                          │
│  │ user_agent: "..."                    │                          │
│  └──────────────────────────────────────┘                          │
│                                                                      │
│  User Can:                                                          │
│  - View consent history                                             │
│  - Modify consent at any time                                       │
│  - Withdraw consent (entire account deletion)                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.3 Data Subject Rights

| Right | LGPD | GDPR | Implementation | SLA |
|-------|------|------|---------------|-----|
| Access (LGPD Art. 9, GDPR Art. 15) | Yes | Yes | Data export API, UI dashboard | 15 days |
| Rectification (LGPD Art. 18, GDPR Art. 16) | Yes | Yes | Profile edit, data correction API | 10 days |
| Erasure (LGPD Art. 15, GDPR Art. 17) | Yes | Yes | Account deletion, data purge pipeline | 30 days |
| Portability (LGPD Art. 18, GDPR Art. 20) | Yes | Yes | Data export in JSON/CSV | 30 days |
| Restriction (LGPD Art. 18, GDPR Art. 18) | Yes | Yes | Account suspension, processing freeze | 5 days |
| Objection (LGPD Art. 18, GDPR Art. 21) | Yes | Yes | Opt-out of processing categories | 5 days |
| Automated decisions (LGPD Art. 20, GDPR Art. 22) | Yes | Yes | Human review request, decision explanation | 30 days |

### 9.4 Data Protection Officer (DPO)

| Requirement | LGPD | GDPR | IDEIA Plan |
|-------------|------|------|-----------|
| DPO appointment required | Art. 41 | Art. 37 | Appoint DPO when >10 employees or processing sensitive data |
| DPO contact published | Art. 41 | Art. 37 | dpo@ideia.dev |
| DPO registered with ANPD | Art. 41 | N/A | Register with ANPD when Brazil operations start |
| DPO independence | Art. 41 | Art. 38 | DPO reports to board, not engineering |

### 9.5 Privacy Impact Assessment (DPIA)

```
DPIA TRIGGER CONDITIONS
=======================

Automated DPIA required when:
  [ ] Processing sensitive data (health, biometric, political)
  [ ] Systematic evaluation of individuals (profiling)
  [ ] Large-scale processing of personal data
  [ ] Cross-border data transfer
  [ ] New technology deployment
  [ ] Processing of vulnerable persons' data

DPIA WORKFLOW
=============

1. Trigger identification (automated by DPIA Scanner)
2. Data flow mapping (automated from data inventory)
3. Risk identification (automated + manual review)
4. Risk mitigation plan (manual, reviewed by DPO)
5. DPIA document generation (automated template)
6. DPIA sign-off (DPO + project sponsor)
7. DPIA review schedule (annually or when processing changes)
```

---

## 10. CONTROL: HIPAA (Healthcare)

### 10.1 Business Associate Agreements (BAA)

| Entity | BAA Required | Current Status | Action Needed |
|--------|-------------|---------------|--------------|
| IDEIA (as BA) | Yes | Not drafted | Create BAA template covering HIPAA 164.504(e) |
| Cloud provider (AWS/GCP) | Yes | Available from provider | Review and sign provider BAA |
| LLM provider (self-hosted) | No (if self-hosted) | N/A | Ensure no PHI sent externally |
| LLM provider (OpenAI) | Yes (if used with PHI) | Not signed | Obtain OpenAI BAA for HIPAA-compliant API |
| LLM provider (Anthropic) | Yes | Not signed | Obtain Anthropic BAA for HIPAA-compliant API |
| Database hosting | Yes | Not signed | Encrypt PHI, sign BAA with hosting provider |

### 10.2 PHI Identification and Protection

| PHI Type | Examples | IDEIA Protection |
|----------|----------|-----------------|
| Names | Full name, initials | Output validation (31 patterns), encryption |
| Geographic identifiers | Address, ZIP code | Output validation, access control |
| Dates | Birth date, admission date | Output validation, access control |
| Phone numbers | Mobile, home | Output validation (Brazilian phone pattern) |
| Fax numbers | - | Not processed (not applicable) |
| Email addresses | personal@example.com | Output validation (email pattern) |
| SSN / CPF | 123-45-6789 | Output validation (CPF pattern) |
| Medical record numbers | MRN-12345 | Output validation (health pattern) |
| Health plan numbers | Policy 987654 | Output validation |
| Account numbers | Bank account | Output validation |
| Certificate/license numbers | Driver license | Output validation |
| Device identifiers | Serial numbers | Output validation |
| URLs / IPs | IP addresses | Audit logging, access control |
| Biometric identifiers | Fingerprint, voice | Not processed |
| Full face images | Photos | Not processed |
| Any other unique code | Custom identifier | Configurable pattern |

### 10.3 Minimum Necessary Rule

```
MINIMUM NECESSARY MATRIX
========================

Use Case              | PHI Accessed          | Justification
----------------------|-----------------------|-------------------------
Patient record query  | All PHI               | Direct care
Research query        | De-identified subset  | Research protocol
Audit log review      | Patient identifiers   | Security audit
Agent debugging       | Anonymized only       | Development
Reporting             | Aggregated only       | Operations
Support               | Minimal identifiers   | Customer support

Enforcement:
  - @ideia/output-validation strips PHI that exceeds minimum necessary
  - @ideia/policy-engine enforces purpose-based access limits
  - Audit trail logs what PHI was accessed and for which purpose
```

### 10.4 HIPAA Safeguards Mapping

#### Administrative Safeguards (164.308)

| Standard | IDEIA Control | Status |
|----------|--------------|--------|
| Security management process | Risk analysis, risk management | Partial (risk analysis study exists) |
| Assigned security responsibility | Security officer role | Not implemented |
| Workforce security | Authorization, supervision | Partial (auth framework) |
| Information access management | Access authorization, establishment | Not implemented |
| Security awareness and training | Security reminders, protection from malicious software | Not implemented |
| Security incident procedures | Response and reporting | Not implemented |
| Contingency plan | Data backup, disaster recovery, emergency mode | Not implemented |
| Evaluation | Periodic technical and nontechnical evaluation | Not implemented |
| Business associate contracts | BAA for PHI-sharing vendors | Not implemented |

#### Physical Safeguards (164.310)

| Standard | IDEIA Control | Status |
|----------|--------------|--------|
| Facility access controls | (On-premise only) | N/A for cloud |
| Workstation use | Security policy for workstations | Not implemented |
| Workstation security | Physical security of workstations | Not implemented |
| Device and media controls | Disposal, re-use, accountability | Not implemented |

#### Technical Safeguards (164.312)

| Standard | IDEIA Control | Status |
|----------|--------------|--------|
| Access control | Unique user ID, emergency access, automatic logoff, encryption | Partial (auth framework) |
| Audit controls | Hardware, software, and procedural mechanisms | Partial (audit trail exists) |
| Integrity controls | Mechanism to authenticate PHI not altered | Partial (SHA-256 chain) |
| Person or entity authentication | MFA, OAuth2 | Not implemented |
| Transmission security | Integrity controls, encryption | Partial (TLS planned) |

### 10.5 HIPAA Compliance Score

```
HIPAA Readiness: 71/100 (current) -> 90/100 (target)

Current Score Breakdown:
  Administrative Safeguards:  30/100  (4/13 controls)
  Physical Safeguards:        20/100  (0/4 controls)
  Technical Safeguards:       75/100  (7/9 controls)
  Policies & Documentation:   50/100  (3/6 controls)

Key Gaps (blocking healthcare sales):
  - H1: No MFA implementation (164.312(d))
  - H2: No encryption at rest (164.312(a)(2)(iv))
  - H3: No BAA templates (164.308(b))
  - H4: No automatic logoff (164.312(a)(2)(iii))
  - H5: No emergency access procedure (164.312(a)(2)(ii))

Target Implementation: Phase 3 (Post-SOC2)
```

---

## 11. Evidence Collection & Automation

### 11.1 Evidence Types

| Evidence Type | Description | Collection Method | Frequency | Source |
|---------------|-------------|------------------|-----------|--------|
| Configuration snapshots | System config state, control settings | Automated (scheduled) | Daily | @theia/preferences, @ideia/policy-engine |
| Access reviews | User access list, permission report | Automated (scheduled) | Monthly | @ideia/org-trust |
| Penetration test results | Vulnerability scan output | Automated + Manual | Quarterly | @ideia/vulnerability-management |
| Vulnerability scans | CVE scan results | Automated | Weekly | @ideia/vulnerability-management |
| Training records | Security awareness completion | Manual input | Upon hire, annually | @ideia/compliance |
| Policy acknowledgments | User acceptance of policies | Automated | Upon change, annually | @ideia/org-trust |
| Audit logs | Immutable event logs | Automated (continuous) | Real-time | @ideia/audit-trail |
| Incident reports | Incident response documentation | Manual + Automated | When triggered | @ideia/compliance |
| Change management | Deploy records, approvals | Automated | Per deployment | @ideia/delivery-orchestrator |
| Backup verification | Restore test results | Automated | Monthly | @ideia/data-strategy |

### 11.2 Automated Evidence Collection Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    EVIDENCE COLLECTION PIPELINE                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Scheduled Triggers                                                  │
│  ┌──────────────────────────────────────────────────────┐           │
│  │  Cron: 0 2 * * * (daily config snapshots)            │           │
│  │  Cron: 0 3 1 * * (monthly access reviews)            │           │
│  │  Cron: 0 4 * * 0 (weekly vulnerability scans)        │           │
│  └──────────┬───────────────────────────────────────────┘           │
│             │                                                        │
│             ▼                                                        │
│  ┌──────────────────────────────────────────────────────┐           │
│  │              EvidenceCollectorService                 │           │
│  │  @ideia/compliance  │  @theia/backend                │           │
│  └──────────────────────┬───────────────────────────────┘           │
│                         │                                            │
│         ┌───────────────┼───────────────┐                            │
│         ▼               ▼               ▼                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                     │
│  │ Config     │  │ Access     │  │ Vuln       │                     │
│  │ Collector  │  │ Collector  │  │ Collector  │                     │
│  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘                     │
│         │               │               │                            │
│         ▼               ▼               ▼                            │
│  ┌──────────────────────────────────────────────────────┐           │
│  │              Evidence Store                             │           │
│  │  ┌──────────────────────────────────────────────────┐ │           │
│  │  │  Evidence Package                                │ │           │
│  │  │  {                                               │ │           │
│  │  │    id: "ev-2026-07-22-config-001",               │ │           │
│  │  │    type: "configuration_snapshot",               │ │           │
│  │  │    timestamp: "2026-07-22T02:00:00Z",            │ │           │
│  │  │    hash: "sha256-abc123",                        │ │           │
│  │  │    content: { ... snapshot ... },                │ │           │
│  │  │    hmac: "signature",                            │ │           │
│  │  │    retained_until: "2027-07-22"                  │ │           │
│  │  │  }                                               │ │           │
│  │  └──────────────────────────────────────────────────┘ │           │
│  └──────────────────────────────────────────────────────┘           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 11.3 Compliance Dashboard Metrics

| Metric | Calculation | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| Control pass rate | (Passing / Total) * 100 | >90% | <80% |
| Evidence collection rate | (Collected / Required) * 100 | >95% | <90% |
| Time to evidence | (Total hours / Evidence count) | <1 hour average | >4 hours |
| Vulnerability aging | Average days open | <30 days | >90 days |
| Overdue access reviews | Count of overdue reviews | 0 | >1 |
| Incident MTTR | Mean time to resolve | <4 hours | >24 hours |
| Audit readiness score | Composite of 10 metrics | >85/100 | <70/100 |

### 11.4 Compliance Dashboard Export Formats

| Format | Use Case | Automation |
|--------|----------|------------|
| PDF | Auditor submission | Auto-generated weekly |
| JSON | API consumption | On-demand |
| CSV | Data analysis | On-demand |
| XLSX | Executive reporting | Auto-generated monthly |
| HTML | Internal dashboard | Real-time |

---

## 12. Compliance Documentation

### 12.1 Required Documentation Inventory

| Document | Required By | Status | Owner | Review Cycle |
|----------|------------|--------|-------|-------------|
| Information Security Policy | SOC2, ISO27001, HIPAA | Not drafted | CISO | Annual |
| System Description | SOC2 CC1-CC9 | Not drafted | Architect | Annual |
| Control Matrix | SOC2 | Not drafted | CISO | Annual |
| Risk Assessment | SOC2, ISO27001, HIPAA | Partial (study) | CISO | Quarterly |
| Business Continuity Plan | SOC2 CC7.4, HIPAA | Not drafted | CTO | Annual |
| Incident Response Plan | SOC2 CC7.2, HIPAA | Not drafted | CISO | Quarterly |
| Privacy Policy | LGPD, GDPR | Partial (existing) | DPO | Annual |
| Terms of Service | All | Not drafted | Legal | Annual |
| Data Processing Agreement | LGPD, GDPR | Not drafted | DPO | Annual |
| Data Retention Policy | LGPD, GDPR, SOC2 | Partial (study) | DPO | Annual |
| Acceptable Use Policy | SOC2 | Not drafted | CISO | Annual |
| Vendor Management Policy | SOC2, ISO27001 | Not drafted | CISO | Annual |
| Change Management Policy | SOC2 CC8.1 | Not drafted | CTO | Annual |
| Training and Awareness Policy | HIPAA, ISO27001 | Not drafted | CISO | Annual |
| Code of Conduct | SOC2 | Not drafted | HR | Annual |

### 12.2 Document Template Structure

```
Document: [Policy Name]
Version: 1.0
Date: YYYY-MM-DD
Owner: [Role]
Approved By: [Name/Board]

1. Purpose
   Why this policy exists, scope of applicability

2. Scope
   Systems, data, personnel, and locations covered

3. Policy Statements
   Specific, measurable requirements

4. Roles and Responsibilities
   Who does what

5. Compliance and Enforcement
   Consequences of non-compliance

6. Exceptions
   Exception process and approval

7. Review and Maintenance
   Review cadence and change process

8. Related Documents
   Cross-references to other policies

9. Version History
   Changes, dates, approvers
```

### 12.3 System Description (SOC2)

```
SYSTEM DESCRIPTION
==================

1. System Boundaries
   - System components: Theia Platform, IDEIA Agent Runtime, CLI, Event Bus
   - Data boundaries: Workspace data, user data, agent data, audit logs
   - Network boundaries: Cloud vs on-premise segmentation

2. System Components
   - Theia Platform: Web/Desktop IDE
   - IDEIA Agents: AI-powered development agents
   - IDEIA CLI: Command-line interface for workflow automation
   - NATS JetStream: Event bus for agent communication
   - Policy Engine: Security policy enforcement
   - Audit Trail: Immutable logging with SHA-256 chain

3. Supporting Infrastructure
   - Cloud: AWS/GCP (customer choice)
   - Database: PostgreSQL (cloud) / SQLite (on-prem)
   - Object Storage: MinIO (on-prem) / S3 (cloud)
   - LLM: Ollama (self-hosted) / OpenAI (cloud)

4. Data Flows
   - User -> Theia -> Agent -> LLM -> Agent -> Theia -> User
   - All events pass through NATS JetStream with audit logging
   - Policy engine validates all agent actions before execution

5. Controls
   - Access controls: Authentication, authorization, session management
   - Encryption: TLS 1.3 in transit, AES-256 at rest
   - Audit logging: Comprehensive event logging with cryptographic chain
   - Incident response: Lifecycle from detection to post-mortem
   - Change management: Approval gates, deployment orchestration
```

---

## 13. Audit Preparation

### 13.1 Readiness Assessment

```
PHASE 1: READINESS ASSESSMENT (Weeks 1-4)
===========================================

Week 1: Scoping
  [ ] Define audit scope (systems, locations, services)
  [ ] Select framework(s) for initial certification
  [ ] Identify control owners
  [ ] Gap analysis against selected framework

Week 2-3: Remediation Planning
  [ ] Prioritize critical/missing controls
  [ ] Assign remediation owners
  [ ] Create remediation timeline
  [ ] Estimate implementation effort

Week 4: Readiness Report
  [ ] Compile readiness assessment
  [ ] Present to leadership for approval
  [ ] Adjust timeline based on resource availability
```

### 13.2 Auditor Selection Criteria

| Criteria | Weight | Evaluation |
|----------|--------|------------|
| AICPA-accredited (SOC2) | Required | Verify accreditation |
| Industry experience (AI/DevTools) | High | Prefer auditors with SaaS experience |
| Local presence (LGPD/ANPD) | Required for Brazil | Prefer Brazilian auditor for LGPD |
| Healthcare experience (HIPAA) | Required for HIPAA | Prefer healthcare-specialized auditor |
| Cost | Medium | Budget $50K-$100K for first SOC2 |
| Timeline availability | High | Must align with certification target |
| References | High | Check 2-3 recent audits |

### 13.3 Evidence Package Preparation

```
EVIDENCE PACKAGE STRUCTURE
==========================

For each control, prepare:

1. Control Description
   - Control ID and name
   - Framework mapping
   - Control objective
   - Control owner

2. Control Implementation
   - How the control is implemented (code, config, process)
   - System components involved
   - Automation status

3. Evidence
   - Type: automated/manual/continuous
   - Collection method
   - Collection frequency
   - Retention period
   - Sample evidence (at least 3 samples over audit period for Type II)

4. Monitoring
   - How the control is monitored
   - Alert thresholds
   - Review frequency
   - Escalation path

5. Testing
   - Last test date
   - Test results
   - Remediation of any findings
```

### 13.4 Interview Preparation

| Interview | Participants | Key Topics | Preparation |
|-----------|-------------|------------|-------------|
| System overview | Architect, CTO | System architecture, boundaries, data flows | System description document |
| Security | CISO, Security team | Access control, encryption, monitoring | Policy documentation, control evidence |
| Operations | DevOps, CTO | Change management, incident response, BCP | Runbooks, incident logs |
| HR | HR lead, CISO | Background checks, training, awareness | Training records, policy acknowledgments |
| Privacy | DPO, Legal | Data inventory, DPA, DSAR process | Privacy documentation, consent records |
| Vendor management | Procurement, CISO | Vendor assessment, subprocessors | Vendor list, DPA library |

### 13.5 Continuous Compliance Monitoring

```
┌─────────────────────────────────────────────────────────────────────┐
│                  CONTINUOUS COMPLIANCE MODEL                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────┐                   │
│  │           Compliance Monitor (daemon)          │                   │
│  │  @ideia/compliance  │  @theia/backend         │                   │
│  └──────────┬───────────────────────────────────┘                   │
│             │                                                        │
│     ┌───────┴───────┐                                                │
│     │               │                                                │
│     ▼               ▼                                                │
│  ┌────────┐   ┌────────────┐                                        │
│  │ Control│   │ Evidence   │                                        │
│  │ Health │   │ Freshness  │                                        │
│  └────┬───┘   └─────┬──────┘                                        │
│       │             │                                                │
│       ▼             ▼                                                │
│  ┌──────────────────────────────────────┐                           │
│  │         Alert Engine                  │                           │
│  │  Control drift detected              │                           │
│  │  Evidence expired                    │                           │
│  │  Missing control owner               │                           │
│  │  Upcoming audit deadline             │                           │
│  └──────────────┬───────────────────────┘                           │
│                 │                                                    │
│                 ▼                                                    │
│  ┌──────────────────────────────────────┐                           │
│  │   Remediation Workflow               │                           │
│  │   Auto-ticket in tracking system     │                           │
│  │   Notify control owner               │                           │
│  │   Escalate if not resolved           │                           │
│  └──────────────────────────────────────┘                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 14. Compliance Widget (Theia)

### 14.1 Compliance Overview Widget

```typescript
// @theia/compliance-widget

@injectable()
export class ComplianceWidget extends ReactWidget {
  static readonly ID = 'ideia:compliance-widget';
  static readonly LABEL = 'Compliance Dashboard';

  @postConstruct()
  protected init(): void {
    this.id = ComplianceWidget.ID;
    this.title.label = ComplianceWidget.LABEL;
    this.title.caption = 'Enterprise Compliance Overview';
    this.title.iconClass = 'fa fa-shield';
    this.title.closable = true;
    this.update();
  }

  protected render(): React.ReactNode {
    return React.createElement(ComplianceDashboard);
  }
}
```

### 14.2 Widget Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Compliance Dashboard] [-] [=] [X]                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Overall Compliance Score: 72/100              [PASS]        │   │
│  │  Next Audit: SOC2 Type II - 2027-01-15 (176 days)            │   │
│  │  Controls: 45/62 passing | Evidence: 89% collected            │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐           │
│  │ SOC 2         │  │ LGPD          │  │ HIPAA         │           │
│  │ 68/100        │  │ 62/100        │  │ 71/100        │           │
│  │ 3/5 controls  │  │ 5/8 checks    │  │ 5/7 checks    │           │
│  │ [GAPS: 2]     │  │ [GAPS: 3]     │  │ [GAPS: 2]     │           │
│  └───────────────┘  └───────────────┘  └───────────────┘           │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Active Gaps (5)                                              │   │
│  │  ┌────────────────────────────────────────────────────────┐  │   │
│  │  │ CC6.6: Incident Detection              🔴 Critical   │  │   │
│  │  │ CC7.2: Incident Response Plan          🔴 Critical   │  │   │
│  │  │ CC6.1: MFA Implementation              🟠 High       │  │   │
│  │  │ P1-P5: Privacy Program                  🟡 Medium    │  │   │
│  │  │ CC7.4: BCP/DR                          🟠 High       │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  │  [Remediate All] [Ignore] [Export]                            │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Upcoming Events                                              │   │
│  │  ● Access Review Due: 2026-08-01 (10 days)                   │   │
│  │  ● Vulnerability Scan: 2026-07-29 (7 days)                   │   │
│  │  ● Policy Review: 2026-08-15 (24 days)                       │   │
│  │  ● Penetration Test Due: 2026-10-01 (71 days)                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Evidence Collection Status                                   │   │
│  │  Config Snapshots:   ██████████░░ 90% (45/50) [OK]           │   │
│  │  Access Reviews:     ████████░░░░ 80% (8/10) [ACTION]        │   │
│  │  Vuln Scans:         ████████████ 100% (12/12) [OK]          │   │
│  │  Incident Reports:   ██████████░░ 90% (9/10) [OK]            │   │
│  │  Training Records:   ██████░░░░░░ 60% (6/10) [ACTION]        │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 14.3 Compliance Widget Services

```typescript
// @ideia/compliance-widget

interface ComplianceWidgetState {
  overallScore: number;
  frameworkScores: FrameworkScore[];
  activeGaps: ComplianceGap[];
  upcomingEvents: ComplianceEvent[];
  evidenceStatus: EvidenceStatus[];
  lastUpdated: string;
}

interface FrameworkScore {
  id: string;
  name: string;
  score: number;
  controlCount: number;
  passingCount: number;
  gapCount: number;
}

interface ComplianceGap {
  id: string;
  controlId: string;
  description: string;
  framework: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  owner: string;
  targetDate: string;
  status: 'open' | 'in_progress' | 'remediated';
}

interface ComplianceEvent {
  id: string;
  type: 'review' | 'scan' | 'audit' | 'test';
  description: string;
  dueDate: string;
  assignee: string;
}

interface EvidenceStatus {
  type: string;
  collected: number;
  required: number;
  freshness: 'ok' | 'action' | 'critical';
}
```

---

## 15. Code Examples

### 15.1 ComplianceControlRegistry

```typescript
// @ideia/compliance/src/control-registry.ts

import { randomUUID } from 'crypto';

export type ComplianceFramework = 'soc2' | 'iso27001' | 'gdpr' | 'lgpd' | 'hipaa' | 'pci-dss';
export type ControlStatus = 'implemented' | 'partial' | 'not-implemented' | 'not-applicable';
export type ControlSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface ComplianceControl {
  id: string;
  framework: ComplianceFramework;
  controlId: string;  // e.g., "CC6.1", "A.9", "Art. 32"
  title: string;
  description: string;
  status: ControlStatus;
  severity: ControlSeverity;
  owner: string;
  evidenceTypes: string[];
  lastTested?: string;
  nextTestDue?: string;
  remediationNotes?: string;
  dependsOn: string[];  // control IDs that must be implemented first
}

export interface ControlTestResult {
  controlId: string;
  timestamp: string;
  passed: boolean;
  details: string;
  tester: string;
  evidenceHash: string;
}

export class ComplianceControlRegistry {
  private controls: Map<string, ComplianceControl> = new Map();
  private testResults: ControlTestResult[] = [];

  registerControl(control: Omit<ComplianceControl, 'id'>): ComplianceControl {
    const full: ComplianceControl = { ...control, id: randomUUID() };
    this.controls.set(full.id, full);
    return full;
  }

  getControl(id: string): ComplianceControl | undefined {
    return this.controls.get(id);
  }

  getControlsByFramework(framework: ComplianceFramework): ComplianceControl[] {
    return Array.from(this.controls.values()).filter(c => c.framework === framework);
  }

  getControlsByOwner(owner: string): ComplianceControl[] {
    return Array.from(this.controls.values()).filter(c => c.owner === owner);
  }

  getControlsByStatus(status: ControlStatus): ComplianceControl[] {
    return Array.from(this.controls.values()).filter(c => c.status === status);
  }

  updateControlStatus(id: string, status: ControlStatus, notes?: string): boolean {
    const c = this.controls.get(id);
    if (!c) return false;
    c.status = status;
    if (notes) c.remediationNotes = notes;
    return true;
  }

  recordTestResult(controlId: string, passed: boolean, details: string, tester: string): ControlTestResult {
    const result: ControlTestResult = {
      controlId,
      timestamp: new Date().toISOString(),
      passed,
      details,
      tester,
      evidenceHash: this.computeHash({ controlId, passed, details, tester }),
    };
    this.testResults.push(result);

    const ctrl = this.controls.get(controlId);
    if (ctrl) {
      ctrl.lastTested = result.timestamp;
    }

    return result;
  }

  getTestResults(controlId: string, limit?: number): ControlTestResult[] {
    const results = this.testResults.filter(r => r.controlId === controlId);
    return limit ? results.slice(-limit) : results;
  }

  getControlsByDependency(depId: string): ComplianceControl[] {
    return Array.from(this.controls.values()).filter(c => c.dependsOn.includes(depId));
  }

  getFrameworkScore(framework: ComplianceFramework): { passing: number; total: number; score: number } {
    const fwControls = this.getControlsByFramework(framework);
    const total = fwControls.length;
    const passing = fwControls.filter(c => c.status === 'implemented').length;
    return { passing, total, score: total > 0 ? Math.round((passing / total) * 100) : 0 };
  }

  getAllFrameworksScore(): Record<ComplianceFramework, { passing: number; total: number; score: number }> {
    const frameworks: ComplianceFramework[] = ['soc2', 'iso27001', 'gdpr', 'lgpd', 'hipaa', 'pci-dss'];
    const result = {} as Record<ComplianceFramework, { passing: number; total: number; score: number }>;
    for (const fw of frameworks) {
      result[fw] = this.getFrameworkScore(fw);
    }
    return result;
  }

  private computeHash(data: unknown): string {
    const { createHash } = require('crypto');
    return createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }
}
```

### 15.2 EvidenceCollector

```typescript
// @ideia/compliance/src/evidence-collector.ts

import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export type EvidenceType =
  | 'configuration_snapshot'
  | 'access_review'
  | 'penetration_test'
  | 'vulnerability_scan'
  | 'training_record'
  | 'policy_acknowledgment'
  | 'audit_log'
  | 'incident_report'
  | 'change_management'
  | 'backup_verification';

export interface EvidencePackage {
  id: string;
  type: EvidenceType;
  timestamp: string;
  source: string;
  content: unknown;
  hash: string;
  metadata: Record<string, unknown>;
  retainedUntil: string;
  controlIds: string[];
}

export interface CollectorConfig {
  types: EvidenceType[];
  retentionDays: number;
  storagePath: string;
  schedule: string;  // cron expression
}

export class EvidenceCollector {
  private collected: EvidencePackage[] = [];
  private config: CollectorConfig;

  constructor(config: CollectorConfig) {
    this.config = config;
    if (!fs.existsSync(config.storagePath)) {
      fs.mkdirSync(config.storagePath, { recursive: true });
    }
  }

  async collectConfigSnapshot(): Promise<EvidencePackage> {
    // Collect configuration from @theia/preferences and @ideia/policy-engine
    const snapshot = {
      policies: await this.loadPolicies(),
      preferences: await this.loadPreferences(),
      controlSettings: await this.loadControlSettings(),
      version: process.env.IDEIA_VERSION || 'unknown',
      timestamp: new Date().toISOString(),
    };

    return this.package('configuration_snapshot', snapshot, ['SOC2-CC1', 'SOC2-CC3', 'ISO-A9']);
  }

  async collectAccessReview(): Promise<EvidencePackage> {
    // Collect user access list from @ideia/org-trust
    const accessData = {
      users: await this.listUsers(),
      roles: await this.listRoles(),
      permissions: await this.listPermissions(),
      lastReview: await this.getLastReviewDate(),
      reviewPeriod: 'monthly',
    };

    return this.package('access_review', accessData, ['SOC2-CC6.1', 'SOC2-CC6.2', 'HIPAA-164.312(a)']);
  }

  async collectVulnerabilityScan(): Promise<EvidencePackage> {
    // Collect from @ideia/vulnerability-management
    const scanData = {
      scanner: 'trivy',
      target: 'filesystem',
      scanDate: new Date().toISOString(),
      vulnerabilities: await this.runVulnerabilityScan(),
      summary: await this.getVulnerabilitySummary(),
    };

    return this.package('vulnerability_scan', scanData, ['SOC2-CC7.3', 'SOC2-CC7.1']);
  }

  private async package(
    type: EvidenceType,
    content: unknown,
    controlIds: string[]
  ): Promise<EvidencePackage> {
    const pkg: EvidencePackage = {
      id: randomUUID(),
      type,
      timestamp: new Date().toISOString(),
      source: `@ideia/compliance/evidence-collector`,
      content,
      hash: '',
      metadata: {
        environment: process.env.NODE_ENV || 'production',
        version: process.env.IDEIA_VERSION || 'unknown',
        collectorVersion: '1.0.0',
      },
      retainedUntil: this.computeRetentionDate(),
      controlIds,
    };

    pkg.hash = this.computePackageHash(pkg);
    this.collected.push(pkg);
    await this.persistToStorage(pkg);

    return pkg;
  }

  private computePackageHash(pkg: Omit<EvidencePackage, 'hash'>): string {
    const relevant = {
      id: pkg.id,
      type: pkg.type,
      timestamp: pkg.timestamp,
      content: pkg.content,
      controlIds: pkg.controlIds,
    };
    return createHash('sha256').update(JSON.stringify(relevant)).digest('hex');
  }

  private computeRetentionDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + this.config.retentionDays);
    return date.toISOString();
  }

  private async persistToStorage(pkg: EvidencePackage): Promise<void> {
    const filePath = path.join(
      this.config.storagePath,
      `${pkg.type}-${pkg.id}.json`
    );
    await fs.promises.writeFile(filePath, JSON.stringify(pkg, null, 2));
  }

  getRecentByType(type: EvidenceType, limit = 10): EvidencePackage[] {
    return this.collected
      .filter(p => p.type === type)
      .slice(-limit);
  }

  getEvidenceForControl(controlId: string): EvidencePackage[] {
    return this.collected.filter(p => p.controlIds.includes(controlId));
  }

  verifyEvidenceIntegrity(pkg: EvidencePackage): boolean {
    const { hash, ...rest } = pkg;
    const computed = this.computePackageHash(rest as unknown as EvidencePackage);
    return hash === computed;
  }

  private async loadPolicies(): Promise<unknown[]> {
    return [];
  }

  private async loadPreferences(): Promise<unknown> {
    return {};
  }

  private async loadControlSettings(): Promise<unknown> {
    return {};
  }

  private async listUsers(): Promise<unknown[]> {
    return [];
  }

  private async listRoles(): Promise<unknown[]> {
    return [];
  }

  private async listPermissions(): Promise<unknown[]> {
    return [];
  }

  private async getLastReviewDate(): Promise<string> {
    return new Date().toISOString();
  }

  private async runVulnerabilityScan(): Promise<unknown[]> {
    return [];
  }

  private async getVulnerabilitySummary(): Promise<unknown> {
    return {};
  }
}
```

### 15.3 AuditLogImmutabilityChain

```typescript
// @ideia/audit-trail/src/chain.ts

import { createHash, randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface ChainBlock {
  index: number;
  timestamp: string;
  events: AuditEvent[];
  previousHash: string;
  hash: string;
  nonce: number;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  category: string;
  action: string;
  actorId: string;
  actorType: 'user' | 'agent' | 'system';
  resourceType: string;
  resourceId: string;
  result: 'success' | 'failure' | 'blocked';
  severity: 'info' | 'warning' | 'critical';
  metadata: Record<string, unknown>;
}

export class AuditLogImmutabilityChain {
  private chain: ChainBlock[] = [];
  private chainPath: string;
  private readonly DIFFICULTY = 1;  // number of leading zeros

  constructor(chainPath: string) {
    this.chainPath = chainPath;
    this.loadChain();
  }

  private loadChain(): void {
    if (fs.existsSync(this.chainPath)) {
      try {
        const data = fs.readFileSync(this.chainPath, 'utf8');
        this.chain = JSON.parse(data);
      } catch {
        this.chain = [];
      }
    }

    if (this.chain.length === 0) {
      this.createGenesisBlock();
    }
  }

  private createGenesisBlock(): void {
    const genesis: ChainBlock = {
      index: 0,
      timestamp: '2026-01-01T00:00:00.000Z',
      events: [],
      previousHash: '0'.repeat(64),
      hash: '',
      nonce: 0,
    };
    genesis.hash = this.calculateHash(genesis);
    this.chain.push(genesis);
    this.persistChain();
  }

  addBlock(events: AuditEvent[]): ChainBlock {
    const previousBlock = this.chain[this.chain.length - 1];
    const block: ChainBlock = {
      index: this.chain.length,
      timestamp: new Date().toISOString(),
      events,
      previousHash: previousBlock.hash,
      hash: '',
      nonce: 0,
    };

    block.hash = this.calculateHash(block);
    this.chain.push(block);
    this.persistChain();

    return block;
  }

  private calculateHash(block: Omit<ChainBlock, 'hash'>): string {
    const data = `${block.index}${block.timestamp}${JSON.stringify(block.events)}${block.previousHash}${block.nonce}`;
    return createHash('sha256').update(data).digest('hex');
  }

  private persistChain(): void {
    fs.mkdirSync(path.dirname(this.chainPath), { recursive: true });
    fs.writeFileSync(this.chainPath, JSON.stringify(this.chain, null, 2));
  }

  verifyChain(): { valid: boolean; invalidBlocks: number[]; details: string } {
    const invalidBlocks: number[] = [];

    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];

      // Verify hash integrity
      const computedHash = this.calculateHash(current);
      if (computedHash !== current.hash) {
        invalidBlocks.push(current.index);
        continue;
      }

      // Verify chain linkage
      if (current.previousHash !== previous.hash) {
        invalidBlocks.push(current.index);
        continue;
      }
    }

    return {
      valid: invalidBlocks.length === 0,
      invalidBlocks,
      details: invalidBlocks.length === 0
        ? `Chain valid: ${this.chain.length} blocks, ${this.getTotalEvents()} events`
        : `Chain invalid: ${invalidBlocks.length} corrupted blocks at indices ${invalidBlocks.join(', ')}`,
    };
  }

  getTotalEvents(): number {
    return this.chain.reduce((sum, block) => sum + block.events.length, 0);
  }

  getChainLength(): number {
    return this.chain.length;
  }

  getBlockByIndex(index: number): ChainBlock | undefined {
    return this.chain.find(b => b.index === index);
  }

  getEventsByCategory(category: string, limit = 100): AuditEvent[] {
    const events: AuditEvent[] = [];
    for (const block of this.chain) {
      for (const event of block.events) {
        if (event.category === category) {
          events.push(event);
          if (events.length >= limit) return events;
        }
      }
    }
    return events;
  }

  getEventsByActor(actorId: string, limit = 100): AuditEvent[] {
    const events: AuditEvent[] = [];
    for (const block of this.chain) {
      for (const event of block.events) {
        if (event.actorId === actorId) {
          events.push(event);
          if (events.length >= limit) return events;
        }
      }
    }
    return events;
  }

  getEventsBySeverity(severity: AuditEvent['severity'], limit = 100): AuditEvent[] {
    const events: AuditEvent[] = [];
    for (const block of this.chain) {
      for (const event of block.events) {
        if (event.severity === severity) {
          events.push(event);
          if (events.length >= limit) return events;
        }
      }
    }
    return events;
  }

  exportChain(format: 'json' | 'csv'): string {
    if (format === 'json') {
      return JSON.stringify(this.chain, null, 2);
    }

    // CSV export
    const headers = ['Index', 'Timestamp', 'Category', 'Action', 'ActorId', 'ActorType', 'ResourceType', 'ResourceId', 'Result', 'Severity'];
    const rows: string[] = [headers.join(',')];

    for (const block of this.chain) {
      for (const event of block.events) {
        rows.push([
          block.index,
          event.timestamp,
          event.category,
          event.action,
          event.actorId,
          event.actorType,
          event.resourceType,
          event.resourceId,
          event.result,
          event.severity,
        ].map(v => `"${v}"`).join(','));
      }
    }

    return rows.join('\n');
  }
}
```

### 15.4 DataInventoryScanner

```typescript
// @ideia/compliance/src/data-inventory.ts

import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export type DataCategory = 'identity' | 'credentials' | 'workspace' | 'agent' | 'llm' | 'audit' | 'network' | 'telemetry' | 'secrets' | 'payment';
export type StorageType = 'sqlite' | 'postgresql' | 'filesystem' | 'memory' | 'object-store' | 'cache' | 'external';
export type LegalBasis = 'contract' | 'consent' | 'legitimate-interest' | 'legal-obligation' | 'vital-interest' | 'public-interest';
export type DataSensitivity = 'public' | 'internal' | 'confidential' | 'restricted' | 'critical';

export interface DataAsset {
  id: string;
  name: string;
  category: DataCategory;
  sensitivity: DataSensitivity;
  storageLocation: string;
  storageType: StorageType;
  retentionDays: number;
  legalBasis: LegalBasis;
  purpose: string;
  thirdPartyShared: boolean;
  thirdPartyNames: string[];
  encrypted: boolean;
  backupEnabled: boolean;
  anonymized: boolean;
  dataFields: string[];
  sampleRecords: number;
  lastReviewed: string;
}

export class DataInventoryScanner {
  private assets: DataAsset[] = [];

  constructor() {
    this.registerBuiltinAssets();
  }

  private registerBuiltinAssets(): void {
    this.assets.push(
      {
        id: randomUUID(),
        name: 'User Identity Store',
        category: 'identity',
        sensitivity: 'confidential',
        storageLocation: 'auth-provider / local config',
        storageType: 'postgresql',
        retentionDays: 730,
        legalBasis: 'contract',
        purpose: 'Account management and authentication',
        thirdPartyShared: true,
        thirdPartyNames: ['Auth0 / Keycloak'],
        encrypted: false,
        backupEnabled: false,
        anonymized: false,
        dataFields: ['name', 'email', 'username', 'avatar_url'],
        sampleRecords: 0,
        lastReviewed: '2026-07-01',
      },
      {
        id: randomUUID(),
        name: 'Credential Store',
        category: 'credentials',
        sensitivity: 'critical',
        storageLocation: 'auth-provider',
        storageType: 'postgresql',
        retentionDays: 730,
        legalBasis: 'contract',
        purpose: 'User authentication',
        thirdPartyShared: true,
        thirdPartyNames: ['Auth0 / Keycloak'],
        encrypted: true,
        backupEnabled: true,
        anonymized: false,
        dataFields: ['password_hash', 'mfa_secret'],
        sampleRecords: 0,
        lastReviewed: '2026-07-01',
      },
      {
        id: randomUUID(),
        name: 'Agent Prompt Log',
        category: 'agent',
        sensitivity: 'confidential',
        storageLocation: 'event-bus / audit-trail',
        storageType: 'sqlite',
        retentionDays: 90,
        legalBasis: 'legitimate-interest',
        purpose: 'Agent operation audit and debugging',
        thirdPartyShared: false,
        thirdPartyNames: [],
        encrypted: false,
        backupEnabled: false,
        anonymized: false,
        dataFields: ['prompt_text', 'response_text', 'model_used', 'timestamp'],
        sampleRecords: 0,
        lastReviewed: '2026-06-15',
      },
      {
        id: randomUUID(),
        name: 'Audit Trail Logs',
        category: 'audit',
        sensitivity: 'confidential',
        storageLocation: 'audit-trail-store',
        storageType: 'sqlite',
        retentionDays: 2555,
        legalBasis: 'legal-obligation',
        purpose: 'Security and compliance audit trail',
        thirdPartyShared: false,
        thirdPartyNames: [],
        encrypted: false,
        backupEnabled: false,
        anonymized: false,
        dataFields: ['user_id', 'action', 'resource', 'ip', 'timestamp'],
        sampleRecords: 0,
        lastReviewed: '2026-07-01',
      },
      {
        id: randomUUID(),
        name: 'Telemetry Data',
        category: 'telemetry',
        sensitivity: 'internal',
        storageLocation: 'metrics-store',
        storageType: 'postgresql',
        retentionDays: 365,
        legalBasis: 'consent',
        purpose: 'Product improvement and usage analytics',
        thirdPartyShared: true,
        thirdPartyNames: ['Datadog / Grafana'],
        encrypted: false,
        backupEnabled: false,
        anonymized: true,
        dataFields: ['event_type', 'component', 'duration', 'error_count'],
        sampleRecords: 0,
        lastReviewed: '2026-06-01',
      }
    );
  }

  registerAsset(asset: Omit<DataAsset, 'id'>): DataAsset {
    const full: DataAsset = { ...asset, id: randomUUID() };
    this.assets.push(full);
    return full;
  }

  getAssetsByCategory(category: DataCategory): DataAsset[] {
    return this.assets.filter(a => a.category === category);
  }

  getAssetsBySensitivity(sensitivity: DataSensitivity): DataAsset[] {
    return this.assets.filter(a => a.sensitivity === sensitivity);
  }

  getCriticalAssets(): DataAsset[] {
    return this.assets.filter(a => a.sensitivity === 'critical' || a.sensitivity === 'restricted');
  }

  getAssetsSharedWithThirdParty(): DataAsset[] {
    return this.assets.filter(a => a.thirdPartyShared);
  }

  getUnencryptedAssets(): DataAsset[] {
    return this.assets.filter(a => !a.encrypted);
  }

  getAssetsWithoutBackup(): DataAsset[] {
    return this.assets.filter(a => !a.backupEnabled);
  }

  generateDPIAInput(): { assetCount: number; criticalCount: number; sharedCount: number; unencryptedCount: number } {
    return {
      assetCount: this.assets.length,
      criticalCount: this.getCriticalAssets().length,
      sharedCount: this.getAssetsSharedWithThirdParty().length,
      unencryptedCount: this.getUnencryptedAssets().length,
    };
  }

  toReport(): string {
    const report: string[] = [];
    report.push('=== DATA INVENTORY REPORT ===');
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push(`Total Assets: ${this.assets.length}`);
    report.push('');

    for (const asset of this.assets) {
      report.push(`--- ${asset.name} ---`);
      report.push(`  Category: ${asset.category}`);
      report.push(`  Sensitivity: ${asset.sensitivity}`);
      report.push(`  Storage: ${asset.storageType} @ ${asset.storageLocation}`);
      report.push(`  Retention: ${asset.retentionDays} days`);
      report.push(`  Legal Basis: ${asset.legalBasis}`);
      report.push(`  Encrypted: ${asset.encrypted ? 'Yes' : 'NO'}`);
      report.push(`  Backup: ${asset.backupEnabled ? 'Yes' : 'NO'}`);
      report.push(`  Third-Party: ${asset.thirdPartyShared ? asset.thirdPartyNames.join(', ') : 'No'}`);
      report.push(`  Fields: ${asset.dataFields.join(', ')}`);
      report.push('');
    }

    return report.join('\n');
  }
}
```

### 15.5 IncidentResponseManager

```typescript
// @ideia/compliance/src/incident-manager.ts

import { randomUUID } from 'crypto';
import { createHash } from 'crypto';

export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus = 'detected' | 'triaged' | 'contained' | 'eradicated' | 'recovered' | 'closed';
export type IncidentCategory = 'data_breach' | 'unauthorized_access' | 'malware' | 'dos' | 'policy_violation' | 'vulnerability' | 'physical' | 'other';

export interface Incident {
  id: string;
  title: string;
  description: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  detectedAt: string;
  detectedBy: string;
  triagedAt?: string;
  containedAt?: string;
  eradicatedAt?: string;
  recoveredAt?: string;
  closedAt?: string;
  assignedTo: string;
  slaResponseMinutes: number;
  slaContainMinutes: number;
  affectedSystems: string[];
  affectedDataTypes: string[];
  affectedUsers: string[];
  containmentActions: string[];
  eradicationActions: string[];
  recoveryActions: string[];
  regulatoryNotificationRequired: boolean;
  regulatoryNotifiedAt?: string;
  postMortemId?: string;
  evidenceHashes: string[];
}

export interface IncidentPostMortem {
  id: string;
  incidentId: string;
  title: string;
  summary: string;
  timeline: PostMortemEvent[];
  rootCause: string;
  impact: string;
  remediation: string[];
  lessonsLearned: string[];
  createdAt: string;
  author: string;
}

export interface PostMortemEvent {
  timestamp: string;
  event: string;
  actor: string;
}

export class IncidentResponseManager {
  private incidents: Map<string, Incident> = new Map();
  private postMortems: Map<string, IncidentPostMortem> = new Map();

  createIncident(params: Omit<Incident, 'id' | 'evidenceHashes'>): Incident {
    const incident: Incident = {
      ...params,
      id: randomUUID(),
      evidenceHashes: [],
      status: 'detected',
    };
    this.incidents.set(incident.id, incident);
    this.logAuditEvent('incident_created', incident.id, incident.severity);
    return incident;
  }

  triage(incidentId: string, analyst: string): boolean {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;
    incident.status = 'triaged';
    incident.triagedAt = new Date().toISOString();
    incident.assignedTo = analyst;
    this.logAuditEvent('incident_triaged', incidentId, incident.severity);
    return true;
  }

  contain(incidentId: string, actions: string[]): boolean {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;
    incident.status = 'contained';
    incident.containedAt = new Date().toISOString();
    incident.containmentActions = actions;
    this.logAuditEvent('incident_contained', incidentId, incident.severity);
    return true;
  }

  eradicate(incidentId: string, actions: string[]): boolean {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;
    incident.status = 'eradicated';
    incident.eradicatedAt = new Date().toISOString();
    incident.eradicationActions = actions;
    this.logAuditEvent('incident_eradicated', incidentId, incident.severity);
    return true;
  }

  recover(incidentId: string, actions: string[]): boolean {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;
    incident.status = 'recovered';
    incident.recoveredAt = new Date().toISOString();
    incident.recoveryActions = actions;
    this.logAuditEvent('incident_recovered', incidentId, incident.severity);
    return true;
  }

  close(incidentId: string): boolean {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;
    incident.status = 'closed';
    incident.closedAt = new Date().toISOString();
    this.logAuditEvent('incident_closed', incidentId, incident.severity);
    return true;
  }

  addEvidence(incidentId: string, data: string): boolean {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;
    const hash = createHash('sha256').update(data).digest('hex');
    incident.evidenceHashes.push(hash);
    return true;
  }

  createPostMortem(incidentId: string, data: Omit<IncidentPostMortem, 'id' | 'incidentId'>): IncidentPostMortem | null {
    if (!this.incidents.has(incidentId)) return null;
    const postMortem: IncidentPostMortem = {
      ...data,
      id: randomUUID(),
      incidentId,
    };
    this.postMortems.set(postMortem.id, postMortem);
    return postMortem;
  }

  isWithinSla(incidentId: string): { responseSla: boolean; containSla: boolean } | null {
    const incident = this.incidents.get(incidentId);
    if (!incident) return null;

    const detected = new Date(incident.detectedAt).getTime();
    const now = Date.now();
    const responseMinutes = incident.triagedAt
      ? (new Date(incident.triagedAt).getTime() - detected) / 60000
      : (now - detected) / 60000;
    const containMinutes = incident.containedAt
      ? (new Date(incident.containedAt).getTime() - detected) / 60000
      : (now - detected) / 60000;

    return {
      responseSla: responseMinutes <= incident.slaResponseMinutes,
      containSla: containMinutes <= incident.slaContainMinutes,
    };
  }

  checkRegulatoryNotification(incidentId: string): { required: boolean; deadline: string; notified: boolean } | null {
    const incident = this.incidents.get(incidentId);
    if (!incident) return null;

    if (!incident.regulatoryNotificationRequired) {
      return { required: false, deadline: '', notified: false };
    }

    const detected = new Date(incident.detectedAt).getTime();

    // GDPR: 72 hours, LGPD: reasonable time, HIPAA: 60 days
    let deadlineMs = 72 * 60 * 60 * 1000; // default for GDPR
    if (incident.category === 'data_breach' && incident.severity === 'critical') {
      deadlineMs = 72 * 60 * 60 * 1000; // GDPR 72h
    }

    const deadline = new Date(detected + deadlineMs);
    return {
      required: true,
      deadline: deadline.toISOString(),
      notified: !!incident.regulatoryNotifiedAt,
    };
  }

  getOpenIncidentsBySeverity(severity: IncidentSeverity): Incident[] {
    return Array.from(this.incidents.values())
      .filter(i => i.status !== 'closed' && i.severity === severity);
  }

  getIncidentsByStatus(status: IncidentStatus): Incident[] {
    return Array.from(this.incidents.values())
      .filter(i => i.status === status);
  }

  getMttr(): { averageMinutes: number; bySeverity: Record<IncidentSeverity, number> } {
    const closed = Array.from(this.incidents.values())
      .filter(i => i.status === 'closed' && i.closedAt);

    const bySeverity: Record<IncidentSeverity, number[]> = {
      critical: [], high: [], medium: [], low: [],
    };

    for (const inc of closed) {
      const detected = new Date(inc.detectedAt).getTime();
      const closedTime = new Date(inc.closedAt!).getTime();
      const minutes = (closedTime - detected) / 60000;
      bySeverity[inc.severity].push(minutes);
    }

    const averages: Record<string, number> = {} as Record<IncidentSeverity, number>;
    for (const [sev, times] of Object.entries(bySeverity)) {
      averages[sev] = times.length > 0
        ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
        : 0;
    }

    const allTimes = Object.values(bySeverity).flat();
    const overall = allTimes.length > 0
      ? Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length)
      : 0;

    return {
      averageMinutes: overall,
      bySeverity: averages as Record<IncidentSeverity, number>,
    };
  }

  generateReport(): string {
    const incidents = Array.from(this.incidents.values());
    const openCount = incidents.filter(i => i.status !== 'closed').length;
    const closedCount = incidents.filter(i => i.status === 'closed').length;
    const slaBreaches = incidents.filter(i => {
      const sla = this.isWithinSla(i.id);
      return sla && (!sla.responseSla || !sla.containSla);
    }).length;

    return [
      '=== INCIDENT RESPONSE REPORT ===',
      `Generated: ${new Date().toISOString()}`,
      `Total Incidents: ${incidents.length}`,
      `Open: ${openCount}`,
      `Closed: ${closedCount}`,
      `SLA Breaches: ${slaBreaches}`,
      `MTTR: ${this.getMttr().averageMinutes} minutes`,
      '',
      ...incidents.map(i =>
        `[${i.severity.toUpperCase()}] ${i.id}: ${i.title} (${i.status})`
      ),
    ].join('\n');
  }

  private logAuditEvent(action: string, incidentId: string, severity: string): void {
    // In production, emits to @ideia/event-bus
    console.log(`[AUDIT] ${action}: ${incidentId} (${severity})`);
  }
}
```

### 15.6 ComplianceScoreCalculator

```typescript
// @ideia/compliance/src/score-calculator.ts

export interface ScoreConfiguration {
  frameworkWeights: Record<string, number>;
  controlWeights: Record<string, number>;
  severityPenalties: Record<string, number>;
  evidenceWeight: number;
  testingWeight: number;
  documentationWeight: number;
}

export interface ComplianceScoreResult {
  overall: number;
  byFramework: Record<string, FrameworkScoreDetail>;
  byDimension: DimensionScore;
  components: ScoreComponents;
}

export interface FrameworkScoreDetail {
  raw: number;
  weighted: number;
  controlCount: number;
  implementedCount: number;
  partialCount: number;
  missingCount: number;
}

export interface DimensionScore {
  controls: number;
  evidence: number;
  testing: number;
  documentation: number;
}

export interface ScoreComponents {
  controlScore: number;
  evidenceScore: number;
  testingScore: number;
  documentationScore: number;
}

export class ComplianceScoreCalculator {
  private config: ScoreConfiguration;

  constructor(config?: Partial<ScoreConfiguration>) {
    this.config = {
      frameworkWeights: {
        soc2: 0.30,
        iso27001: 0.15,
        gdpr: 0.15,
        lgpd: 0.15,
        hipaa: 0.15,
        'pci-dss': 0.10,
      },
      controlWeights: {
        critical: 0.40,
        high: 0.30,
        medium: 0.20,
        low: 0.10,
      },
      severityPenalties: {
        critical: 0.50,
        high: 0.30,
        medium: 0.15,
        low: 0.05,
      },
      evidenceWeight: 0.20,
      testingWeight: 0.15,
      documentationWeight: 0.10,
      ...config,
    };
  }

  calculate(
    frameworkScores: Record<string, { implemented: number; partial: number; total: number }>,
    evidenceCoverage: number,
    testingCoverage: number,
    docCoverage: number
  ): ComplianceScoreResult {
    const byFramework: Record<string, FrameworkScoreDetail> = {};

    for (const [fw, scores] of Object.entries(frameworkScores)) {
      byFramework[fw] = {
        raw: scores.total > 0 ? (scores.implemented / scores.total) * 100 : 0,
        weighted: 0,
        controlCount: scores.total,
        implementedCount: scores.implemented,
        partialCount: scores.partial,
        missingCount: scores.total - scores.implemented - scores.partial,
      };
    }

    for (const [fw, scores] of Object.entries(frameworkScores)) {
      const rawScore = scores.total > 0 ? (scores.implemented / scores.total) * 100 : 0;
      const weight = this.config.frameworkWeights[fw] || 0;
      byFramework[fw].weighted = rawScore * weight;
    }

    // Control score (weighted average of framework scores)
    const totalWeight = Object.values(this.config.frameworkWeights)
      .reduce((a, b) => a + b, 0);
    const controlScore = Object.entries(byFramework)
      .reduce((sum, [fw, s]) => sum + (s.raw * (this.config.frameworkWeights[fw] || 0)), 0) / totalWeight;

    // Evidence, testing, documentation scores
    const evidenceScore = evidenceCoverage;
    const testingScore = testingCoverage;
    const documentationScore = docCoverage;

    // Weighted overall score
    const controlWeight = 1 - this.config.evidenceWeight - this.config.testingWeight - this.config.documentationWeight;
    const overall = Math.round(
      controlScore * controlWeight +
      evidenceScore * this.config.evidenceWeight +
      testingScore * this.config.testingWeight +
      documentationScore * this.config.documentationWeight
    );

    // Apply severity penalties
    const penalty = Object.entries(this.config.severityPenalties)
      .reduce((sum, [sev, pen]) => {
        // In production, count actual failures by severity
        return sum + (pen * 0.05); // simulated 5% failure per severity level
      }, 0);

    const finalScore = Math.max(0, Math.min(100, Math.round(overall * (1 - penalty))));

    return {
      overall: finalScore,
      byFramework,
      byDimension: {
        controls: Math.round(controlScore),
        evidence: Math.round(evidenceScore),
        testing: Math.round(testingScore),
        documentation: Math.round(documentationScore),
      },
      components: {
        controlScore: Math.round(controlScore),
        evidenceScore: Math.round(evidenceScore),
        testingScore: Math.round(testingScore),
        documentationScore: Math.round(documentationScore),
      },
    };
  }

  getScoreLevel(score: number): 'critical' | 'low' | 'medium' | 'high' | 'excellent' {
    if (score < 30) return 'critical';
    if (score < 50) return 'low';
    if (score < 70) return 'medium';
    if (score < 90) return 'high';
    return 'excellent';
  }

  getStatusBadge(score: number): string {
    const level = this.getScoreLevel(score);
    const icons: Record<string, string> = {
      critical: 'X',
      low: '-',
      medium: '~',
      high: '+',
      excellent: 'OK',
    };
    return `${icons[level]} ${score}/100 (${level})`;
  }
}
```

### 15.7 ControlTestRunner

```typescript
// @ideia/compliance/src/control-tester.ts

import { randomUUID } from 'crypto';
import { createHash } from 'crypto';

export interface TestDefinition {
  id: string;
  controlId: string;
  name: string;
  description: string;
  testType: 'automated' | 'manual';
  automationScript?: string;
  schedule: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
  severity: 'critical' | 'high' | 'medium' | 'low';
  expectedResult: string;
  remediationGuide?: string;
}

export interface TestExecution {
  id: string;
  testId: string;
  controlId: string;
  executedAt: string;
  executedBy: string;
  passed: boolean;
  details: string[];
  evidenceHash: string;
  durationMs: number;
  failureReason?: string;
}

export class ControlTestRunner {
  private tests: Map<string, TestDefinition> = new Map();
  private executions: TestExecution[] = [];

  registerTest(test: Omit<TestDefinition, 'id'>): TestDefinition {
    const full: TestDefinition = { ...test, id: randomUUID() };
    this.tests.set(full.id, full);
    return full;
  }

  registerDefaultTests(): void {
    this.registerTest({
      controlId: 'SOC2-CC6.1',
      name: 'Authentication required for all API endpoints',
      description: 'Verify that all API endpoints require authentication',
      testType: 'automated',
      schedule: 'daily',
      severity: 'critical',
      expectedResult: 'All endpoints return 401 or 403 when no auth token provided',
    });

    this.registerTest({
      controlId: 'SOC2-CC6.6',
      name: 'Security incident detection on failed auth bursts',
      description: 'Verify that >10 failed auth attempts within 5 minutes triggers incident',
      testType: 'automated',
      schedule: 'daily',
      severity: 'critical',
      expectedResult: 'Incident created and alert sent within 1 minute',
    });

    this.registerTest({
      controlId: 'SOC2-CC7.1',
      name: 'Audit log events are recorded for all admin actions',
      description: 'Verify that every admin action produces an audit log entry',
      testType: 'automated',
      schedule: 'daily',
      severity: 'high',
      expectedResult: 'Audit log contains entry for each admin action within 5 seconds',
    });

    this.registerTest({
      controlId: 'SOC2-A1.3',
      name: 'Backup integrity verification',
      description: 'Verify that backups are restorable and data integrity is maintained',
      testType: 'automated',
      schedule: 'monthly',
      severity: 'critical',
      expectedResult: 'Restore test passes with 100% data integrity',
    });
  }

  async runTest(testId: string, executor: string): Promise<TestExecution | null> {
    const test = this.tests.get(testId);
    if (!test) return null;

    const startTime = Date.now();
    let passed = false;
    const details: string[] = [];

    try {
      if (test.testType === 'automated') {
        const result = await this.executeAutomatedTest(test);
        passed = result.passed;
        details.push(...result.details);
      } else {
        // Manual test -- just record that it was run, pass/fail determined by tester
        passed = true;
        details.push('Manual test requires human verification');
      }
    } catch (error) {
      passed = false;
      details.push(`Test execution error: ${(error as Error).message}`);
    }

    const durationMs = Date.now() - startTime;
    const execution: TestExecution = {
      id: randomUUID(),
      testId,
      controlId: test.controlId,
      executedAt: new Date().toISOString(),
      executedBy: executor,
      passed,
      details,
      evidenceHash: createHash('sha256').update(JSON.stringify({ testId, passed, details, durationMs })).digest('hex'),
      durationMs,
      failureReason: passed ? undefined : details.join('; '),
    };

    this.executions.push(execution);
    return execution;
  }

  private async executeAutomatedTest(test: TestDefinition): Promise<{ passed: boolean; details: string[] }> {
    // Simulated execution -- in production, this would run the actual test
    const details: string[] = [];
    details.push(`Running automated test: ${test.name}`);

    // Simulate test logic based on controlId
    if (test.controlId === 'SOC2-CC6.1') {
      // Check that auth endpoints are configured
      details.push('Auth provider configured: YES');
      details.push('MFA enabled: NO (gap)');
      details.push('SSO/SAML configured: NO (gap)');
      return { passed: false, details };
    }

    if (test.controlId === 'SOC2-CC7.1') {
      details.push('Audit trail service: RUNNING');
      details.push('Event bus connected: YES');
      details.push('Log queue depth: 0');
      return { passed: true, details };
    }

    if (test.controlId === 'SOC2-A1.3') {
      details.push('Backup service: RUNNING');
      details.push('Last backup: 2026-07-22T02:00:00Z');
      details.push('Restore test: NOT SCHEDULED (gap)');
      return { passed: false, details };
    }

    // Default: unknown test
    details.push('No automation script found for this control');
    return { passed: true, details };
  }

  runAllTests(executor: string): Promise<TestExecution[]> {
    const promises = Array.from(this.tests.keys()).map(testId =>
      this.runTest(testId, executor)
    );
    return Promise.all(promises).then(results =>
      results.filter((r): r is TestExecution => r !== null)
    );
  }

  getTestPassRate(): { passed: number; total: number; rate: number } {
    const total = this.executions.length;
    const passed = this.executions.filter(e => e.passed).length;
    return { passed, total, rate: total > 0 ? Math.round((passed / total) * 100) : 0 };
  }

  getLastExecutionByTest(testId: string): TestExecution | undefined {
    return this.executions
      .filter(e => e.testId === testId)
      .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime())[0];
  }

  getFailingTests(): TestDefinition[] {
    const failingTestIds = new Set(
      this.executions
        .filter(e => !e.passed)
        .map(e => e.testId)
    );
    return Array.from(this.tests.values())
      .filter(t => failingTestIds.has(t.id));
  }

  generateReport(): string {
    const passRate = this.getTestPassRate();
    const failingTests = this.getFailingTests();
    const latestExecutions = Array.from(this.tests.keys())
      .map(testId => this.getLastExecutionByTest(testId))
      .filter((e): e is TestExecution => e !== undefined);

    return [
      '=== CONTROL TEST REPORT ===',
      `Generated: ${new Date().toISOString()}`,
      `Total Tests: ${this.tests.size}`,
      `Pass Rate: ${passRate.passed}/${passRate.total} (${passRate.rate}%)`,
      `Failing Tests: ${failingTests.length}`,
      '',
      ...failingTests.map(t => `  FAIL: [${t.severity}] ${t.name} (${t.controlId})`),
      '',
      ...latestExecutions.map(e =>
        `  ${e.passed ? 'PASS' : 'FAIL'}: ${e.testId} (${e.durationMs}ms)`
      ),
    ].join('\n');
  }
}
```

---

## 16. Implementation Roadmap

### 16.1 Six-Phase Implementation Plan

```
Phase 1: Assessment (Weeks 1-4)
Phase 2: Controls (Weeks 5-12)
Phase 3: Evidence (Weeks 13-20)
Phase 4: Audit (Weeks 21-28)
Phase 5: Certification (Weeks 29-36)
Phase 6: Continuous (Ongoing)
```

### 16.2 Phase Detail

#### Phase 1: Assessment (Weeks 1-4)

| Task | Effort | Dependencies | Owner |
|------|--------|-------------|-------|
| Gap analysis against SOC2 criteria | 40h | - | CISO |
| Data inventory and classification | 30h | - | DPO |
| Risk assessment (formal) | 40h | Gap analysis | CISO |
| Control selection and scoping | 30h | Gap analysis | Architect |
| Compliance documentation plan | 20h | Scoping | CISO |
| Tool selection (SIEM, vulnerability scanner) | 20h | - | DevOps |
| **Total Phase 1** | **180h** | | |

Deliverables: Gap report, risk register, control matrix, project plan

#### Phase 2: Controls (Weeks 5-12)

| Task | Effort | Dependencies | Owner |
|------|--------|-------------|-------|
| Implement MFA/SSO authentication | 60h | - | Security |
| Implement encryption at rest (AES-256) | 40h | - | Security |
| Implement encryption in transit (TLS 1.3) | 20h | - | DevOps |
| Enhance audit trail with cryptographic chain | 30h | - | Engineering |
| Implement incident response automation | 50h | Audit trail | Engineering |
| Implement vendor management system | 30h | - | CISO |
| Implement access review automation | 20h | Auth system | Engineering |
| Develop compliance policies | 60h | Gap analysis | CISO/DPO |
| **Total Phase 2** | **310h** | | |

Deliverables: Implemented controls, policy documents, automated evidence sources

#### Phase 3: Evidence (Weeks 13-20)

| Task | Effort | Dependencies | Owner |
|------|--------|-------------|-------|
| Build evidence collection pipeline | 60h | Controls | Engineering |
| Compliance dashboard widget (Theia) | 40h | Evidence pipeline | Frontend |
| SIEM integration | 30h | Audit trail | DevOps |
| Vulnerability scanning automation | 30h | - | Security |
| Penetration testing (first round) | 40h | Controls | External |
| Evidence collection (3+ months) | 20h/mo | Pipeline | CISO |
| **Total Phase 3** | **200h + ongoing** | | |

Deliverables: Evidence collection system, compliance widget, penetration test report

#### Phase 4: Audit Preparation (Weeks 21-28)

| Task | Effort | Dependencies | Owner |
|------|--------|-------------|-------|
| Readiness assessment | 30h | Evidence | CISO |
| Remediation of audit findings | 60h | Readiness | Engineering |
| Evidence package compilation | 40h | Evidence pipeline | CISO |
| Interview preparation | 20h | - | All |
| Auditor selection | 20h | - | CTO |
| **Total Phase 4** | **170h** | | |

Deliverables: Readiness report, evidence packages, auditor engagement

#### Phase 5: Certification (Weeks 29-36)

| Task | Effort | Dependencies | Owner |
|------|--------|-------------|-------|
| Auditor onsite/virtual audit | 40h | All previous | All |
| Remediation of audit findings | 40h | Audit | Engineering |
| Certification report | 10h | Remediation | CISO |
| Certification announcement | 5h | Report | Marketing |
| **Total Phase 5** | **95h** | | |

Deliverables: SOC 2 Type II report, press release, sales enablement materials

#### Phase 6: Continuous Compliance (Ongoing)

| Task | Frequency | Effort | Owner |
|------|-----------|--------|-------|
| Control monitoring | Continuous | 10h/month | CISO |
| Evidence collection verification | Weekly | 4h/week | CISO |
| Vulnerability scanning | Weekly | 2h/week | Security |
| Access review | Monthly | 4h/month | CISO |
| Incident response drills | Quarterly | 16h/quarter | Security |
| Penetration testing | Annually | 40h/year | External |
| Policy review | Annually | 20h/year | CISO/DPO |
| **Total Phase 6** | **~40h/month** | | |

### 16.3 Resource Requirements

| Role | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 | Phase 6 |
|------|---------|---------|---------|---------|---------|---------|
| CISO | 50% | 30% | 20% | 50% | 50% | 20% |
| Security Engineer | 20% | 100% | 50% | 30% | 20% | 20% |
| Engineering | 10% | 50% | 60% | 30% | 20% | 10% |
| DevOps | 10% | 20% | 30% | 10% | 10% | 10% |
| DPO/Legal | 30% | 20% | 10% | 30% | 30% | 10% |
| External Auditor | 0% | 0% | 0% | 20% | 100% | 0% |
| External Pentester | 0% | 0% | 20% | 0% | 0% | 10% |

### 16.4 Risks and Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Scope creep (too many frameworks at once) | Medium | High | Start with SOC2 only, add frameworks incrementally |
| Engineering capacity conflicts | High | High | Dedicate 1 FTE for Phase 2, backfill with contractors |
| Evidence collection insufficient for Type II | Medium | Critical | Start evidence collection early (Phase 2), collect continuously |
| LLM provider security concerns | Medium | Medium | Default to self-hosted Ollama, require BAAs for cloud providers |
| Cost overrun on certification | Medium | Medium | Fixed-price auditor contract, clear scope definition |
| Finding remediation extends timeline | High | Medium | Buffer of 4 weeks in Phase 4, prioritize critical findings |

### 16.5 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to SOC2 Type II certification | 9 months from project start | Date of SOC2 report |
| Time to LGPD compliance | 6 months from project start | Compliance check pass rate >90% |
| Control pass rate (all frameworks) | >90% | ComplianceControlRegistry.getFrameworkScore() |
| Evidence collection coverage | >95% | EvidenceCollector coverage report |
| Audit finding remediation time | <30 days critical, <90 days high | IncidentResponseManager metrics |
| Compliance score (internal) | >85/100 | ComplianceScoreCalculator.calculate() |
| Enterprise deals unblocked | >80% of deals asking for SOC2 | Sales team feedback |
| Customer compliance inquiries | <24h response with evidence | Evidence package compilation time |

---

## 17. Conexoes

### 17.1 Direct Dependencies

| Study | Relationship | Shared Controls |
|-------|-------------|----------------|
| S4 -- Seguranca e Governanca | Fundamental security baseline for all compliance controls | Audit trail, policy enforcement, output validation |
| S14 -- Autenticacao e Autorizacao | Authentication controls required by every framework | MFA, SSO, RBAC, session management |
| S58 -- Data Strategy & Governance | Data inventory, retention, privacy controls | Data classification, backup/DR, retention |
| S59 -- Theia Cloud Multitenant | Cloud deployment model affects compliance scope | Tenant isolation, encryption, availability |
| S61 -- Vulnerability Management | Vulnerability scanning required by SOC2/HIPAA | CVE scanning, patch management, SAST/DAST |
| S17 -- Observabilidade Full-Stack | Monitoring required by SOC2 CC7.1 | SIEM integration, alerting, dashboards |
| S63 -- Agent Debug & Runtime | Agent execution security | Sandbox, permission model, action logging |

### 17.2 Cross-Reference Matrix

| Compliance Control | Related Study | Existing Package | Status |
|-------------------|---------------|-----------------|--------|
| Audit trail immutability | S4 | `@ideia/audit-trail` | Implemented (SHA-256 chain) |
| Policy enforcement | S4 | `@ideia/policy-engine` | Implemented (27 patterns) |
| Output validation (PII detection) | S4 | `@ideia/output-validation` | Implemented (31 rules) |
| Access control framework | S14 | Study only | Not implemented |
| Data inventory | S58 | Study only | Not implemented |
| Backup and DR | S58 | Study only | Not implemented |
| Vulnerability scanning | S61 | Study only | Not implemented |
| Container security | S61 | Study only | Not implemented |
| SBOM generation | S61 | `scripts/generate-sbom.ts` | Implemented (CycloneDX) |
| Incident detection | S63 | Study only | Not implemented |
| SIEM integration | S17 | Study only | Not implemented |
| Org trust / certifications | - | `@ideia/org-trust` | Implemented (basic) |
| Compliance CLI commands | - | `@ideia/cli` | Implemented (basic mapping) |

### 17.3 Implementation Ordering

```
Phase 1 (S4+S14): Security fundamentals, auth
     |
     v
Phase 2 (S58): Data governance, privacy
     |
     v
Phase 3 (S61): Vulnerability management
     |
     v
Phase 4 (S17+S59): Observability, cloud security
     |
     v
Phase 5 (S63): Agent runtime hardening
     |
     v
S65 Completion: SOC2 certification, continuous compliance
```

### 17.4 New Packages Required

| Package | Purpose | Estimated Size | Priority |
|---------|---------|---------------|----------|
| `@ideia/compliance` | Compliance control registry, evidence collection, score calculation | ~2,000 LOC | P0 |
| `@ideia/incident-manager` | Incident detection, response, post-mortem automation | ~1,500 LOC | P0 |
| `@ideia/data-inventory` | Data asset registry, classification, DPIA generation | ~1,000 LOC | P0 |
| `@ideia/vendor-manager` | Vendor assessment, DPA management, subprocessor tracking | ~1,000 LOC | P1 |
| `@ideia/consent-manager` | Consent collection, audit trail, subject rights requests | ~1,500 LOC | P1 |
| `@ideia/encryption` | Key management, encryption/decryption operations, key rotation | ~1,200 LOC | P0 |
| `@ideia/access-review` | Automated access review, certification workflow, deprovisioning | ~1,200 LOC | P1 |

### 17.5 Compliance CLI Commands

```
IDEIA compliance status              # Overall compliance score and status
IDEIA compliance status --framework soc2   # Framework-specific score
IDEIA compliance controls list       # List all registered controls
IDEIA compliance controls test       # Run control tests
IDEIA compliance evidence collect    # Run evidence collection
IDEIA compliance evidence list       # List collected evidence
IDEIA compliance inventory scan      # Run data inventory scanner
IDEIA compliance inventory report    # Generate data inventory report
IDEIA compliance incident create     # Create incident record
IDEIA compliance incident list       # List incidents
IDEIA compliance audit prepare       # Generate auditor evidence package
IDEIA compliance audit report        # Generate compliance report (PDF/JSON)
IDEIA compliance score               # Calculate and display compliance score
```
