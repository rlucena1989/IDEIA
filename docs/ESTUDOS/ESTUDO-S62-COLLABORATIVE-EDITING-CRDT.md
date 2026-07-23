# ESTUDO S62 -- Real-time Collaborative Editing with CRDTs

> **Deep-dive technical architecture for CRDT-based real-time collaborative editing in IDEIA: agent-human pair programming, multi-agent concurrent editing, document synchronization, awareness protocol, history/time-travel, and conflict resolution**
> Data: 2026-07-22

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0 | 2026-07-22 | IDEIA Architecture Team | Versao inicial -- Full CRDT collaborative editing architecture, Yjs/Monaco integration, agent-human collaboration protocol, multi-agent coordination, document history, conflict resolution, persistence, security |

---

## Sumario

1. [Introduction](#1-introduction)
2. [CRDT Fundamentals](#2-crdt-fundamentals)
3. [Yjs + Monaco Integration](#3-yjs--monaco-integration)
4. [Architecture: IDEIA Collaboration Layer](#4-architecture-ideia-collaboration-layer)
5. [Agent-Human Collaboration](#5-agent-human-collaboration)
6. [Multi-Agent Collaboration](#6-multi-agent-collaboration)
7. [Document Synchronization](#7-document-synchronization)
8. [Awareness & Presence](#8-awareness--presence)
9. [History & Undo](#9-history--undo)
10. [Conflict Resolution](#10-conflict-resolution)
11. [Performance & Scalability](#11-performance--scalability)
12. [Security](#12-security)
13. [Code Examples](#13-code-examples)
14. [Implementation Roadmap](#14-implementation-roadmap)
15. [Conexoes](#15-conexoes)

---

## 1. Introduction

### 1.1 Why Collaborative Editing Matters for IDEIA

IDEIA is built around the concept of autonomous AI agents working alongside human developers. The most natural interaction model for code generation, review, and refactoring is a shared editing experience where both human and agent see the same document in real time and can modify it concurrently.

Three core scenarios drive the need for CRDT-based collaborative editing:

```
Scenario 1: Agent-Human Pair Programming
  Human writes business logic, agent suggests optimizations inline
  Both edit same file simultaneously -- changes merge seamlessly

Scenario 2: Multi-Agent Code Generation
  Analyst adds comments and specifications
  Programmer writes implementation
  Reviewer marks issues and suggestions
  All three agents edit the same document concurrently

Scenario 3: Remote Team Collaboration
  Two developers on different continents edit the same file
  Each sees the other's cursor position and selections
  Changes appear in real time with no merge conflicts
```

### 1.2 Current State: No Collaborative Editing in IDEIA

| Aspect | Current IDEIA | Target State |
|--------|--------------|--------------|
| File editing | Single-user Monaco editor | Multi-user CRDT-backed editor |
| Agent output | Agent writes to filesystem, user reloads | Agent edits inline in shared document |
| Cursor awareness | Not available | All collaborators see cursors/selections |
| Undo/redo | Single-user local only | Collaborative undo with timeline |
| Conflict resolution | File-system level (write conflicts) | Automatic CRDT merge + manual override |
| Offline support | None | Local Y.Doc syncs on reconnect |
| History | Git commits only | Per-operation timeline with time-travel |

### 1.3 Design Goals

| Goal | Target | Rationale |
|------|--------|-----------|
| Sync latency | < 50ms p95 local, < 200ms p95 remote | Natural typing experience |
| Conflict resolution | Automatic for 99.9% of cases | CRDT mathematical guarantee |
| Document size | Up to 10MB CRDT state | Large files with history |
| Concurrent users | Up to 16 per document | Team + agents |
| Offline resilience | Full local editing, sync on reconnect | Agent operations may be asynchronous |
| History depth | Unlimited (configurable retention) | Time-travel debugging |
| Awareness updates | 30fps cursor sync, 5fps when idle | Balance accuracy vs bandwidth |

---

## 2. CRDT Fundamentals

### 2.1 What are CRDTs

Conflict-free Replicated Data Types (CRDTs) are data structures that can be replicated across multiple peers and updated concurrently without coordination. Each peer applies operations locally, and the replicas converge to the same state eventually -- without conflicts.

```
CRDT Convergence Property:

  Peer A: "hello"         Peer B: "hello"
     |                        |
     | insert(1, "X")         | insert(5, "!")
     |                        |
     v                        v
  Peer A: "hXello"        Peer B: "hello!"
     |                        |
     +-------- sync ---------+
     |                        |
     v                        v
  Peer A: "hXello!"       Peer B: "hXello!"
     |                        |
     +--- both converge ------+
     |
     v
  Both: "hXello!"   (CRDT merge is commutative, associative, idempotent)
```

### 2.2 CRDT vs Operational Transformation (OT)

| Aspect | CRDT | OT |
|--------|------|----|
| Mathematical foundation | Commutative operations | Operational transforms |
| Central coordinator | Not required | Usually required |
| Consistency model | Strong Eventual Consistency | Depends on transform functions |
| Offline support | Native (merge on reconnect) | Complex (transform queue) |
| Undo complexity | Simple (delete operation) | Complex (transform inverse) |
| Implementation complexity | Moderate | High (all transform pairs) |
| Ecosystem maturity | Yjs, Automerge | ShareJS, Google Docs (proprietary) |
| TypeScript support | Yjs (native TS) | Limited |

**Decision: CRDT** for IDEIA. CRDTs handle concurrent edits without a central server, support offline natively, and Yjs provides a mature TypeScript ecosystem with Monaco integration.

### 2.3 Yjs Architecture

Yjs uses the YATA CRDT algorithm (Yet Another Transformation Approach) with a linked-list-based sequence CRDT.

```
Yjs Core Architecture:

  +----------------------------------------------------------+
  |                    Y.Doc                                   |
  |  +------------------+  +------------------+               |
  |  | Y.Text           |  | Y.Array           |               |
  |  | (string content) |  | (ordered list)    |               |
  |  +------------------+  +------------------+               |
  |  +------------------+  +------------------+               |
  |  | Y.Map            |  | Y.XmlFragment     |               |
  |  | (key-value)      |  | (XML/HTML tree)   |               |
  |  +------------------+  +------------------+               |
  |                                                           |
  |  +------------------+                                     |
  |  | Awareness        |  -- User presence, cursors          |
  |  +------------------+                                     |
  |                                                           |
  |  +------------------+                                     |
  |  | UndoManager      |  -- Collaborative undo/redo         |
  |  +------------------+                                     |
  +----------------------------------------------------------+
```

### 2.4 Yjs Data Types

| Type | Description | Use in IDEIA |
|------|-------------|--------------|
| `Y.Text` | String with insert/delete operations, indexed by position | **Primary** -- code file content |
| `Y.Array` | Ordered list, supports insert/delete/move | Agent task list, breakpoints list |
| `Y.Map` | Key-value store, nested maps supported | Document metadata, user settings |
| `Y.XmlFragment` | XML tree with elements, attributes, text | Structured document AST, diff markup |
| `Y.XmlElement` | Single XML element with attributes | Code annotation, inline comments |

### 2.5 Operation-based vs State-based CRDTs

| Aspect | Operation-based (Yjs) | State-based (Automerge) |
|--------|----------------------|------------------------|
| Sync payload | Individual operations | Full state or snapshot |
| Bandwidth | Low (ops only) | Higher (state includes all data) |
| Garbage collection | Required (delete old ops) | Natural (state replace) |
| Complexity | Higher (GC, op IDs) | Lower |
| Offline support | Full (queue ops) | Full (merge states) |
| Yjs default | Yes | No |

**Decision: Operation-based (Yjs).** Lower bandwidth for real-time sync, better for code files where individual keystrokes are small but frequent.

### 2.6 Garbage Collection

Yjs operations accumulate indefinitely. GC is required for long-lived documents.

```
GC Strategies:

  1. Snapshot + GC
     - Periodically snapshot the full Y.Doc state
     - Delete all operations before the snapshot
     - New peers sync from snapshot + recent ops

  2. Age-based GC
     - Delete operations older than N days
     - Safe if state is persisted via snapshot

  3. Size-based GC
     - When Y.Doc exceeds threshold (e.g., 10MB)
     - Compact via snapshot
```

```typescript
// @ideia/collaboration/crdt/gc.ts
interface GCOptions {
  strategy: 'snapshot' | 'age' | 'size';
  snapshotInterval: number;    // ms
  maxAgeMs: number;            // age-based cutoff
  maxSizeBytes: number;        // size-based threshold
}

interface GCResult {
  deletedOps: number;
  retainedOps: number;
  newSnapshotSize: number;
  durationMs: number;
}
```

---

## 3. Yjs + Monaco Integration

### 3.1 y-monaco Binding Architecture

`y-monaco` bridges Yjs Y.Text with Monaco Editor's ITextModel. The binding translates Yjs operations to Monaco edits and vice versa, maintaining bidirectional synchronization.

```
y-monaco Data Flow:

  User types in Monaco
       |
       v
  Monaco Editor fires onDidChangeContent
       |
       v
  y-monaco binding translates Monaco delta to Yjs ops
       |
       v
  Y.Text.applyDelta([{ insert: 'x', retain: 5 }])
       |
       v
  Y.Doc generates Yjs update (binary, ready for sync)
       |
       v
  Yjs provider sends update to other peers (WebSocket/NATS)
       |
       v
  Remote peer receives update
       |
       v
  Y.Doc applies update, Y.Text modifies
       |
       v
  y-monaco binding receives Yjs event
       |
       v
  Monaco Editor.setValue / applyEdits to reflect remote change
```

### 3.2 ID Mapping

Each editor instance needs a unique client ID for Yjs operation attribution.

```typescript
// @ideia/collaboration/crdt/client-id.ts
import * as Y from 'yjs';

interface ClientIdentity {
  clientId: number;       // Yjs client ID (integer)
  sessionId: string;      // UUID for this collaboration session
  userId: string;         // IDEIA user ID
  agentType?: string;     // 'human' | 'analyst' | 'programmer' | 'reviewer' | ...
  displayName: string;
  color: string;          // Hex color for cursor/selection
}

function createClientIdentity(
  ydoc: Y.Doc,
  identity: Omit<ClientIdentity, 'clientId'>
): ClientIdentity {
  return {
    clientId: ydoc.clientID,
    ...identity
  };
}
```

### 3.3 Monaco Binding Setup

```typescript
// @ideia/collaboration/crdt/monaco-binding.ts
import * as Y from 'yjs';
import * as Monaco from 'monaco-editor';
import { MonacoBinding } from 'y-monaco';

interface CollaborativeBindingOptions {
  ydoc: Y.Doc;
  ytext: Y.Text;
  editor: Monaco.editor.IStandaloneCodeEditor;
  awareness?: Awareness;   // Yjs awareness protocol
  undoManager?: Y.UndoManager;
}

function setupCollaborativeBinding(options: CollaborativeBindingOptions): MonacoBinding {
  const {
    ydoc,
    ytext,
    editor,
    awareness,
    undoManager
  } = options;

  const binding = new MonacoBinding(
    ytext,
    editor.getModel()!,
    new Set([editor]),
    awareness,
    undoManager
  );

  return binding;
}
```

### 3.4 Awareness Protocol

Yjs awareness is a separate protocol for ephemeral state (cursors, selections, user presence). It is not CRDT-based and does not persist.

```typescript
// @ideia/collaboration/crdt/awareness.ts
import * as Y from 'yjs';

interface CursorState {
  anchor: Position;      // Selection anchor
  head: Position;        // Selection head (cursor position)
}

interface Position {
  lineNumber: number;    // 1-indexed
  column: number;        // 1-indexed
}

interface UserAwareness {
  user: {
    id: string;
    name: string;
    color: string;
    avatarUrl?: string;
    isAgent: boolean;
    agentType?: string;
  };
  cursor: CursorState;
  status: 'active' | 'idle' | 'away';
  lastActivity: number;  // timestamp
}

function updateCursorAwareness(
  awareness: Awareness,
  userId: string,
  userData: UserAwareness
): void {
  awareness.setLocalStateField('user', userData.user);
  awareness.setLocalStateField('cursor', userData.cursor);
  awareness.setLocalStateField('status', userData.status);
}
```

### 3.5 Undo/Redo with Y.UndoManager

```typescript
// @ideia/collaboration/crdt/undo-manager.ts
import * as Y from 'yjs';

interface UndoConfig {
  captureTimeout: number;      // ms -- merge operations within timeout (default: 500)
  trackedOrigins: Set<any>;    // only track operations from specific origins
  ignoreRemoteOps: boolean;    // only undo local operations (default: true)
  maxStackSize: number;        // undo depth (default: 100)
}

function createUndoManager(
  ytext: Y.Text,
  config: Partial<UndoConfig> = {}
): Y.UndoManager {
  const um = new Y.UndoManager(ytext, {
    captureTimeout: config.captureTimeout ?? 500,
    trackedOrigins: config.trackedOrigins,
    ignoreRemoteOps: config.ignoreRemoteOps ?? true,
    deleteFilter: () => true,
    capturedOrigin: null
  });

  // Limit stack size to prevent memory issues
  (um as any).maxStackSize = config.maxStackSize ?? 100;

  return um;
}
```

### 3.6 Merge Strategy

CRDTs merge automatically by mathematical construction. However, the user experience around merges needs careful design.

| Scenario | CRDT Behavior | UX |
|----------|--------------|-----|
| Two users type in same line | Characters interleave by YATA ordering | Both edits preserved, may look interleaved |
| User deletes while agent inserts | Delete removes characters that existed at that point | Agent text appears in expected location |
| Both modify same word | Characters merge based on position and client ID | May produce unexpected concatenation |
| Structural edit (brackets) | Both bracket pairs coexist | May produce invalid syntax temporarily |

---

## 4. Architecture: IDEIA Collaboration Layer

### 4.1 High-Level Architecture

```
+----------------------------------------------------------------------+
|                     IDEIA COLLABORATION LAYER                          |
+----------------------------------------------------------------------+
|                                                                        |
|  +------------------+  +------------------+  +------------------+      |
|  | Monaco Editor    |  | Theia Widget     |  | Agent Runtime     |      |
|  | (single-user)    |  | (multi-user UI)  |  | (headless agent)  |      |
|  +--------+---------+  +--------+---------+  +--------+---------+      |
|           |                     |                      |                |
|  +--------v---------------------v----------------------v---------+      |
|  |                    y-monaco Binding                              |      |
|  |         (MonacoBinding + Awareness Protocol)                     |      |
|  +---------------------------+--------------------------------------+      |
|                              |                                          |
|  +---------------------------v--------------------------------------+  |
|  |                    Y.Doc (Document State)                         |  |
|  |  Y.Text (code), Y.Map (metadata), Y.Array (tasks)                |  |
|  +---------------------------+--------------------------------------+  |
|                              |                                          |
|  +---------------------------v--------------------------------------+  |
|  |  @ideia/collaboration/provider                                    |  |
|  |  +------------------+  +------------------+  +-----------------+  |  |
|  |  | YjsNatsProvider  |  | YjsWebSocket     |  | YjsIndexedDB    |  |  |
|  |  | (NATS JetStream) |  | (direct WS)      |  | (persistence)   |  |  |
|  |  +------------------+  +------------------+  +-----------------+  |  |
|  +---------------------------+--------------------------------------+  |
|                              |                                          |
|  +---------------------------v--------------------------------------+  |
|  |  CAMADA DE INFRA                                              |  |
|  |  +------------------+  +------------------+  +-----------------+  |  |
|  |  | NATS JetStream   |  | PostgreSQL       |  | File System     |  |  |
|  |  | (sync channel)   |  | (document store) |  | (workspace)     |  |  |
|  |  +------------------+  +------------------+  +-----------------+  |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
+----------------------------------------------------------------------+
```

### 4.2 Document Provider Interface

```typescript
// @ideia/collaboration/provider/document-provider.ts
import * as Y from 'yjs';

interface DocumentProviderOptions {
  ydoc: Y.Doc;
  documentId: string;
  sessionId: string;
  userId: string;
  awareness?: Awareness;
  onSync?: (state: SyncState) => void;
  onConnectionChange?: (state: ConnectionState) => void;
  onAwarenessChange?: (updates: AwarenessUpdate[]) => void;
}

type SyncState = 'initializing' | 'syncing' | 'synced' | 'disconnected' | 'error';
type ConnectionState = 'connected' | 'disconnected' | 'reconnecting' | 'error';

interface AwarenessUpdate {
  clientId: number;
  state: Record<string, unknown> | null;
}

interface IDocumentProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  destroy(): void;
  getState(): SyncState;
  getDocumentId(): string;
  on(event: 'sync', handler: (state: SyncState) => void): void;
  on(event: 'connection', handler: (state: ConnectionState) => void): void;
  on(event: 'awareness', handler: (updates: AwarenessUpdate[]) => void): void;
  off(event: string, handler: Function): void;
}
```

### 4.3 NATS Document Provider

```typescript
// @ideia/collaboration/provider/nats-document-provider.ts
import * as Y from 'yjs';
import { ConnectionState, IDocumentProvider, DocumentProviderOptions } from './document-provider';

class NatsDocumentProvider implements IDocumentProvider {
  private ydoc: Y.Doc;
  private documentId: string;
  private sessionId: string;
  private userId: string;
  private connectionState: ConnectionState;
  private syncState: SyncState;
  private awareness: Awareness | undefined;
  private subs: Set<string>;

  // NATS subjects
  private static SYNC_SUBJECT = 'collab.doc.{docId}.sync';
  private static AWARENESS_SUBJECT = 'collab.doc.{docId}.awareness';
  private static DOC_REQUEST_SUBJECT = 'collab.doc.{docId}.request';

  constructor(
    private natsConnection: NatsConnection,
    options: DocumentProviderOptions
  ) {
    this.ydoc = options.ydoc;
    this.documentId = options.documentId;
    this.sessionId = options.sessionId;
    this.userId = options.userId;
    this.connectionState = 'disconnected';
    this.syncState = 'initializing';
    this.subs = new Set();
  }

  async connect(): Promise<void> {
    this.connectionState = 'connected';

    // Subscribe to sync updates from other peers
    const syncSub = this.natsConnection.subscribe(
      NatsDocumentProvider.SYNC_SUBJECT.replace('{docId}', this.documentId),
      { queue: `collab-${this.documentId}` }
    );
    this.subs.add('sync');

    (async () => {
      for await (const msg of syncSub) {
        const update = Y.decodeUpdate(msg.data);
        Y.applyUpdate(this.ydoc, update);
      }
    })();

    // Subscribe to awareness updates
    const awSub = this.natsConnection.subscribe(
      NatsDocumentProvider.AWARENESS_SUBJECT.replace('{docId}', this.documentId)
    );
    this.subs.add('awareness');

    // Publish current state on connect
    const stateVector = Y.encodeStateAsUpdate(this.ydoc);
    this.natsConnection.publish(
      NatsDocumentProvider.SYNC_SUBJECT.replace('{docId}', this.documentId),
      stateVector
    );

    this.syncState = 'synced';
    this.onSync?.(this.syncState);
  }

  private handleYdocUpdate(update: Uint8Array, origin: any): void {
    if (origin !== this) {
      this.natsConnection.publish(
        NatsDocumentProvider.SYNC_SUBJECT.replace('{docId}', this.documentId),
        update
      );
    }
  }

  async disconnect(): Promise<void> {
    for (const sub of this.subs) {
      try { await sub.unsubscribe(); } catch {}
    }
    this.subs.clear();
    this.connectionState = 'disconnected';
    this.syncState = 'disconnected';
  }

  destroy(): void {
    this.disconnect();
  }

  getState(): SyncState { return this.syncState; }
  getDocumentId(): string { return this.documentId; }
}

export { NatsDocumentProvider };
```

### 4.4 Awareness Manager

The Awareness Manager handles all ephemeral state: cursors, selections, user status.

```typescript
// @ideia/collaboration/awareness/awareness-manager.ts
import * as Y from 'yjs';

interface AwarenessConfig {
  ydoc: Y.Doc;
  localClientId: number;
  broadcastInterval: number;   // ms (default: 100)
  idleThreshold: number;       // ms without activity (default: 30000)
  awayThreshold: number;       // ms without activity (default: 120000)
}

class AwarenessManager {
  private awareness: Awareness;
  private localState: Record<string, unknown>;
  private broadcastTimer: NodeJS.Timeout | null;
  private lastActivity: number;

  constructor(private config: AwarenessConfig) {
    this.awareness = new Awareness(this.config.ydoc);
    this.lastActivity = Date.now();
    this.broadcastTimer = null;
    this.localState = {
      user: null,
      cursor: null,
      status: 'active',
      lastActivity: this.lastActivity
    };
  }

  setLocalUser(user: {
    id: string;
    name: string;
    color: string;
    isAgent: boolean;
    agentType?: string;
  }): void {
    this.localState.user = user;
    this.broadcastAwareness();
  }

  setCursor(cursor: { anchor: Position; head: Position }): void {
    this.localState.cursor = cursor;
    this.localState.status = 'active';
    this.lastActivity = Date.now();
    this.localState.lastActivity = this.lastActivity;
    this.debouncedBroadcast();
  }

  setStatus(status: 'active' | 'idle' | 'away'): void {
    this.localState.status = status;
    this.broadcastAwareness();
  }

  private debouncedBroadcast(): void {
    if (this.broadcastTimer) {
      clearTimeout(this.broadcastTimer);
    }
    this.broadcastTimer = setTimeout(() => {
      this.broadcastAwareness();
    }, this.config.broadcastInterval ?? 100);
  }

  private broadcastAwareness(): void {
    this.awareness.setLocalState(this.localState);
  }

  getRemoteUsers(): Array<{
    clientId: number;
    state: Record<string, unknown>;
  }> {
    const users: Array<{ clientId: number; state: Record<string, unknown> }> = [];
    this.awareness.getStates().forEach((state, clientId) => {
      if (clientId !== this.config.localClientId) {
        users.push({ clientId, state: state as Record<string, unknown> });
      }
    });
    return users;
  }

  onChange(handler: (changes: AwarenessChange[]) => void): void {
    this.awareness.on('change', (changes: AwarenessChange[]) => {
      handler(changes);
    });
  }

  destroy(): void {
    if (this.broadcastTimer) {
      clearTimeout(this.broadcastTimer);
    }
    this.awareness.destroy();
  }
}

export { AwarenessManager, AwarenessConfig };
```

### 4.5 Document Persistence

```typescript
// @ideia/collaboration/persistence/document-store.ts
import * as Y from 'yjs';

interface DocumentSnapshot {
  documentId: string;
  name: string;
  content: Uint8Array;         // Yjs binary state
  stateVector: Uint8Array;     // Yjs state vector
  mimeType: string;
  createdAt: number;
  updatedAt: number;
  version: number;
  metadata: Record<string, unknown>;
}

interface IDocumentStore {
  save(ydoc: Y.Doc, documentId: string, metadata?: Record<string, unknown>): Promise<void>;
  load(documentId: string): Promise<Y.Doc | null>;
  delete(documentId: string): Promise<void>;
  list(projectId: string): Promise<DocumentSnapshot[]>;
  getSnapshot(documentId: string): Promise<DocumentSnapshot | null>;
}

class PostgresDocumentStore implements IDocumentStore {
  constructor(private pool: pg.Pool) {}

  async save(ydoc: Y.Doc, documentId: string, metadata?: Record<string, unknown>): Promise<void> {
    const content = Y.encodeStateAsUpdate(ydoc);
    const stateVector = Y.encodeStateVector(ydoc);

    await this.pool.query(
      `INSERT INTO crdt_documents (document_id, content, state_vector, metadata, version, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (document_id)
       DO UPDATE SET content = $2, state_vector = $3, metadata = $4, version = $5 + 1, updated_at = NOW()`,
      [documentId, content, stateVector, JSON.stringify(metadata ?? {}), 1]
    );
  }

  async load(documentId: string): Promise<Y.Doc | null> {
    const result = await this.pool.query(
      'SELECT content FROM crdt_documents WHERE document_id = $1',
      [documentId]
    );

    if (result.rows.length === 0) return null;

    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, result.rows[0].content);
    return ydoc;
  }

  async delete(documentId: string): Promise<void> {
    await this.pool.query('DELETE FROM crdt_documents WHERE document_id = $1', [documentId]);
  }

  async list(projectId: string): Promise<DocumentSnapshot[]> {
    const result = await this.pool.query(
      'SELECT * FROM crdt_documents WHERE metadata->>projectId = $1 ORDER BY updated_at DESC',
      [projectId]
    );
    return result.rows.map(row => ({
      documentId: row.document_id,
      name: row.metadata?.name ?? 'untitled',
      content: row.content,
      stateVector: row.state_vector,
      mimeType: row.metadata?.mimeType ?? 'text/plain',
      createdAt: row.created_at.getTime(),
      updatedAt: row.updated_at.getTime(),
      version: row.version,
      metadata: row.metadata ?? {}
    }));
  }

  async getSnapshot(documentId: string): Promise<DocumentSnapshot | null> {
    const result = await this.pool.query(
      'SELECT * FROM crdt_documents WHERE document_id = $1',
      [documentId]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      documentId: row.document_id,
      name: row.metadata?.name ?? 'untitled',
      content: row.content,
      stateVector: row.state_vector,
      mimeType: row.metadata?.mimeType ?? 'text/plain',
      createdAt: row.created_at.getTime(),
      updatedAt: row.updated_at.getTime(),
      version: row.version,
      metadata: row.metadata ?? {}
    };
  }
}

export { IDocumentStore, DocumentSnapshot, PostgresDocumentStore };
```

### 4.6 Document Versioning

```typescript
// @ideia/collaboration/persistence/versioning.ts
import * as Y from 'yjs';

interface Version {
  version: number;
  timestamp: number;
  state: Uint8Array;         // Yjs state at this version
  label?: string;            // User-defined label
  userId: string;
  description?: string;
}

class DocumentVersioning {
  private versions: Version[];
  private maxVersions: number;

  constructor(maxVersions: number = 1000) {
    this.versions = [];
    this.maxVersions = maxVersions;
  }

  async checkpoint(
    ydoc: Y.Doc,
    userId: string,
    label?: string,
    description?: string
  ): Promise<Version> {
    const state = Y.encodeStateAsUpdate(ydoc);
    const version: Version = {
      version: this.versions.length + 1,
      timestamp: Date.now(),
      state,
      userId,
      label,
      description
    };

    this.versions.push(version);

    // Enforce max versions
    if (this.versions.length > this.maxVersions) {
      this.versions.splice(0, this.versions.length - this.maxVersions);
    }

    return version;
  }

  async restore(ydoc: Y.Doc, version: Version): Promise<void> {
    // Reset doc and apply state
    const oldDoc = new Y.Doc();
    Y.applyUpdate(oldDoc, version.state);

    // Merge into current doc
    const currentStateVector = Y.encodeStateVector(ydoc);
    const diff = Y.diffUpdate(version.state, currentStateVector);
    Y.applyUpdate(ydoc, diff);
  }

  listVersions(): Version[] {
    return [...this.versions].reverse();
  }

  getVersion(versionNumber: number): Version | undefined {
    return this.versions.find(v => v.version === versionNumber);
  }

  diffBetween(v1: Version, v2: Version): Uint8Array {
    // Returns operations needed to go from v1 state to v2 state
    const sv1 = Y.encodeStateVectorFromStateVector(v1.state, new Uint8Array(0));
    // Create a temp doc with v2 state, then compute diff
    const tempDoc = new Y.Doc();
    Y.applyUpdate(tempDoc, v2.state);
    const sv = Y.encodeStateVector(tempDoc);
    return Y.diffUpdate(v1.state, sv);
  }
}

export { DocumentVersioning, Version };
```

---

## 5. Agent-Human Collaboration

### 5.1 Shared Document Model

Agent and human share a Y.Doc. The agent writes code via the same Y.Text that the human sees in Monaco. The human can accept, reject, or modify agent changes inline.

```
Agent-Human Collaboration Flow:

  +-------------------+          +-------------------+
  |     HUMAN         |          |     AGENT          |
  | (Monaco Editor)   |          | (Agent Runtime)    |
  +--------+----------+          +--------+----------+
           |                              |
           | type code                    | generate code
           |                              |
           v                              v
  +--------+----------+          +--------+----------+
  | Y.Text (shared)   |<---------+ Y.Text (shared)   |
  | insert 'x', 5     |          | insert 'return x', |
  +--------+----------+          | 10                 |
           |                     +--------+----------+
           |                              |
           | CRDT merge (automatic)       |
           +------------+-----------------+
                        |
                        v
           +------------+-------------+
           | Merged Y.Text            |
           | "function add(a, b) {    |
           |  return a + b"           |
           +--------------------------+
```

### 5.2 Agent Inline Editing Protocol

```typescript
// @ideia/collaboration/agent/agent-editor.ts
import * as Y from 'yjs';

interface AgentEdit {
  id: string;
  agentId: string;
  agentName: string;
  documentId: string;
  type: 'insert' | 'replace' | 'delete' | 'suggestion';
  range: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
  newText: string;
  status: 'pending' | 'applied' | 'rejected' | 'modified';
  timestamp: number;
  explanation?: string;
}

interface AgentEditResult {
  accepted: boolean;
  modifiedText?: string;
  userComment?: string;
}

class AgentInlineEditor {
  private ydoc: Y.Doc;
  private ytext: Y.Text;
  private pendingEdits: Map<string, AgentEdit>;

  constructor(ydoc: Y.Doc, ytext: Y.Text) {
    this.ydoc = ydoc;
    this.ytext = ytext;
    this.pendingEdits = new Map();
  }

  async applyAgentEdit(edit: AgentEdit): Promise<void> {
    // Apply edit directly to shared Y.Text
    // The edit is visible to all collaborators immediately
    this.ydoc.transact(() => {
      const startPos = this.positionToIndex(edit.range.startLine, edit.range.startColumn);
      const endPos = this.positionToIndex(edit.range.endLine, edit.range.endColumn);

      switch (edit.type) {
        case 'insert':
          this.ytext.insert(startPos, edit.newText);
          break;
        case 'replace':
          this.ytext.delete(startPos, endPos - startPos);
          this.ytext.insert(startPos, edit.newText);
          break;
        case 'delete':
          this.ytext.delete(startPos, endPos - startPos);
          break;
        case 'suggestion':
          // Suggestion does not modify document directly
          // Instead, it stores in a Y.Map with the edit details
          const suggestionsMap = this.ydoc.getMap('suggestions');
          suggestionsMap.set(edit.id, edit);
          break;
      }
    }, 'agent');

    if (edit.type !== 'suggestion') {
      edit.status = 'applied';
    }
    this.pendingEdits.set(edit.id, edit);
  }

  async acceptSuggestion(editId: string): Promise<void> {
    const edit = this.pendingEdits.get(editId);
    if (!edit || edit.type !== 'suggestion') return;

    this.ydoc.transact(() => {
      const startPos = this.positionToIndex(edit.range.startLine, edit.range.startColumn);
      const endPos = this.positionToIndex(edit.range.endLine, edit.range.endColumn);
      this.ytext.delete(startPos, endPos - startPos);
      this.ytext.insert(startPos, edit.newText);
    }, 'human');

    edit.status = 'applied';
    const suggestionsMap = this.ydoc.getMap('suggestions');
    suggestionsMap.delete(editId);
  }

  async rejectSuggestion(editId: string): Promise<void> {
    const edit = this.pendingEdits.get(editId);
    if (!edit) return;
    edit.status = 'rejected';
    const suggestionsMap = this.ydoc.getMap('suggestions');
    suggestionsMap.delete(editId);
  }

  private positionToIndex(line: number, column: number): number {
    const docText = this.ytext.toString();
    const lines = docText.split('\n');
    let index = 0;
    for (let i = 0; i < line - 1 && i < lines.length; i++) {
      index += lines[i].length + 1; // +1 for newline
    }
    return index + column - 1;
  }
}

export { AgentInlineEditor, AgentEdit, AgentEditResult };
```

### 5.3 Agent Wait-for-Input Protocol

When an agent reaches a decision point, it can pause editing and wait for human input. This is signaled via a Y.Map entry.

```typescript
// @ideia/collaboration/agent/wait-for-input.ts
import * as Y from 'yjs';

interface DecisionPoint {
  id: string;
  agentId: string;
  agentName: string;
  question: string;
  options: DecisionOption[];
  status: 'waiting' | 'answered' | 'cancelled';
  createdAt: number;
  answeredAt?: number;
  selectedOption?: string;
  context?: Record<string, unknown>;
}

interface DecisionOption {
  id: string;
  label: string;
  description: string;
  action: 'continue' | 'apply' | 'reject' | 'modify';
}

class AgentInputWaiter {
  private decisionsMap: Y.Map<DecisionPoint>;
  private ytext: Y.Text;

  constructor(ydoc: Y.Doc) {
    this.decisionsMap = ydoc.getMap('agent-decisions');
    this.ytext = ydoc.getText('code');
  }

  async requestInput(decision: DecisionPoint): Promise<string> {
    decision.status = 'waiting';
    decision.createdAt = Date.now();
    this.decisionsMap.set(decision.id, decision);

    // Wait for human to respond via the decisions map
    return new Promise((resolve) => {
      const observer = (event: Y.YMapEvent<DecisionPoint>) => {
        const updated = this.decisionsMap.get(decision.id);
        if (updated && updated.status === 'answered') {
          this.decisionsMap.unobserve(observer);
          resolve(updated.selectedOption!);
        }
      };
      this.decisionsMap.observe(observer);

      // Timeout after 5 minutes
      setTimeout(() => {
        this.decisionsMap.unobserve(observer);
        if (this.decisionsMap.get(decision.id)?.status === 'waiting') {
          decision.status = 'cancelled';
          this.decisionsMap.set(decision.id, decision);
          resolve('timeout');
        }
      }, 5 * 60 * 1000);
    });
  }

  async respondToInput(decisionId: string, optionId: string): Promise<void> {
    const decision = this.decisionsMap.get(decisionId);
    if (!decision || decision.status !== 'waiting') return;

    decision.status = 'answered';
    decision.selectedOption = optionId;
    decision.answeredAt = Date.now();
    this.decisionsMap.set(decisionId, decision);
  }
}

export { AgentInputWaiter, DecisionPoint, DecisionOption };
```

### 5.4 Agent Edit Highlighting in Monaco

Agent edits should be visually distinct from human edits. Monaco editor decorations achieve this.

```typescript
// @ideia/collaboration/editor/agent-decorations.ts
import * as Monaco from 'monaco-editor';

interface AgentEditDecoration {
  editId: string;
  agentName: string;
  agentColor: string;
  range: Monaco.IRange;
  text: string;
  type: 'insert' | 'replace' | 'delete' | 'suggestion';
}

class AgentDecorationManager {
  private decorations: Map<string, Monaco.editor.IEditorDecorationsCollection>;
  private editor: Monaco.editor.IStandaloneCodeEditor;

  constructor(editor: Monaco.editor.IStandaloneCodeEditor) {
    this.editor = editor;
    this.decorations = new Map();
  }

  showAgentEdit(edit: AgentEditDecoration): void {
    const decoration = this.editor.createDecorationsCollection([
      {
        range: edit.range,
        options: {
          className: `agent-edit-${edit.type}`,
          glyphMarginClassName: 'agent-edit-glyph',
          glyphMarginHoverMessage: { value: `Agent: ${edit.agentName}` },
          overviewRuler: {
            color: edit.agentColor,
            position: Monaco.editor.OverviewRulerLane.Right
          },
          stickiness: Monaco.editor.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges
        }
      }
    ]);
    this.decorations.set(edit.editId, decoration);
  }

  clearAgentEdit(editId: string): void {
    const decoration = this.decorations.get(editId);
    if (decoration) {
      decoration.clear();
      this.decorations.delete(editId);
    }
  }

  clearAll(): void {
    this.decorations.forEach(d => d.clear());
    this.decorations.clear();
  }
}

export { AgentDecorationManager, AgentEditDecoration };
```

---

## 6. Multi-Agent Collaboration

### 6.1 Multi-Agent Document Model

Multiple agents can edit the same Y.Doc simultaneously. Each agent has a unique Yjs client ID and is identified in the awareness state with its agent type and name.

```
Multi-Agent Editing Scenario:

  Document: src/services/auth.service.ts

  Participants:
    [Human]     Alice       -- writing business logic
    [Agent]     Analyst     -- adding JSDoc comments
    [Agent]     Programmer  -- implementing methods
    [Agent]     Reviewer    -- marking issues

  Y.Doc state after concurrent edits:

  Y.Text "code":
    line 1:  /**                                    (Analyst)
    line 2:   * Authenticates user via JWT         (Analyst)
    line 3:   */                                    (Analyst)
    line 4:  async function authenticate(           (Human)
    line 5:    token: string,                       (Human)
    line 6:    secret: string                       (Programmer - refactored param)
    line 7:  ): Promise<User> {                     (Human)
    line 8:    // TODO: implement rate limiting     (Reviewer)
    line 9:    const payload = jwt.verify(          (Human)
    line 10:     token, secret                      (Human)
    line 11:    );                                  (Human)
    line 12:    return User.fromPayload(payload);    (Programmer)
    line 13:  }                                     (Analyst - added closing)
```

### 6.2 Agent Coordination Protocol

Agents need to coordinate to avoid conflicting edits and to resolve disagreements.

```typescript
// @ideia/collaboration/agent/coordination.ts
import * as Y from 'yjs';

interface AgentCoordinatorOptions {
  ydoc: Y.Doc;
  agentId: string;
  agentType: string;
  lockTimeout: number;        // ms (default: 5000)
  retryDelay: number;         // ms (default: 500)
}

type LockStatus = 'free' | 'locked';

interface DocumentLock {
  holder: string;
  agentType: string;
  scope: 'line' | 'block' | 'section';
  range: {
    startLine: number;
    endLine: number;
  };
  acquiredAt: number;
  expiresAt: number;
  purpose: string;
}

class AgentCoordinator {
  private locksMap: Y.Map<DocumentLock>;
  private options: AgentCoordinatorOptions;

  constructor(options: AgentCoordinatorOptions) {
    this.options = options;
    this.locksMap = options.ydoc.getMap('document-locks');
  }

  async acquireLock(
    scope: DocumentLock['scope'],
    range: DocumentLock['range'],
    purpose: string
  ): Promise<boolean> {
    const lockId = this.lockIdForRange(range);

    // Check if lock is already held
    const existingLock = this.locksMap.get(lockId);
    if (existingLock) {
      if (existingLock.expiresAt > Date.now() && existingLock.holder !== this.options.agentId) {
        return false; // Lock held by another agent
      }
      // Lock expired or self-held, can acquire
    }

    const lock: DocumentLock = {
      holder: this.options.agentId,
      agentType: this.options.agentType,
      scope,
      range,
      acquiredAt: Date.now(),
      expiresAt: Date.now() + this.options.lockTimeout,
      purpose
    };

    this.locksMap.set(lockId, lock);
    return true;
  }

  async releaseLock(range: DocumentLock['range']): Promise<void> {
    const lockId = this.lockIdForRange(range);
    this.locksMap.delete(lockId);
  }

  async withLock<T>(
    scope: DocumentLock['scope'],
    range: DocumentLock['range'],
    purpose: string,
    fn: () => Promise<T>
  ): Promise<T> {
    let acquired = false;
    while (!acquired) {
      acquired = await this.acquireLock(scope, range, purpose);
      if (!acquired) {
        await this.delay(this.options.retryDelay);
      }
    }

    try {
      return await fn();
    } finally {
      await this.releaseLock(range);
    }
  }

  private lockIdForRange(range: DocumentLock['range']): string {
    return `lock-${range.startLine}-${range.endLine}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getActiveLocks(): DocumentLock[] {
    const locks: DocumentLock[] = [];
    this.locksMap.forEach((lock, key) => {
      if (lock.expiresAt > Date.now()) {
        locks.push(lock);
      } else {
        this.locksMap.delete(key); // Clean expired locks
      }
    });
    return locks;
  }
}

export { AgentCoordinator, DocumentLock, LockStatus };
```

### 6.3 Agent Disagreement Resolution

When two agents produce conflicting code changes, a human-in-the-loop resolution is needed.

```typescript
// @ideia/collaboration/agent/disagreement.ts
import * as Y from 'yjs';

interface AgentConflict {
  id: string;
  documentId: string;
  agents: Array<{ id: string; name: string; type: string }>;
  description: string;
  options: ConflictOption[];
  status: 'open' | 'resolved' | 'overridden';
  createdAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
}

interface ConflictOption {
  agentId: string;
  agentName: string;
  label: string;
  code: string;              // The code this agent proposes
  range: { startLine: number; endLine: number };
}

class DisagreementResolver {
  private conflictsMap: Y.Map<AgentConflict>;
  private ytext: Y.Text;

  constructor(ydoc: Y.Doc) {
    this.conflictsMap = ydoc.getMap('agent-conflicts');
    this.ytext = ydoc.getText('code');
  }

  async raiseConflict(conflict: AgentConflict): Promise<void> {
    this.conflictsMap.set(conflict.id, conflict);
  }

  async resolveConflict(
    conflictId: string,
    selectedOptionId: string,
    resolvedBy: string
  ): Promise<void> {
    const conflict = this.conflictsMap.get(conflictId);
    if (!conflict) return;

    const selectedOption = conflict.options.find(o => o.agentId === selectedOptionId);
    if (!selectedOption) return;

    // Apply the selected option's code to the document
    this.ytext.doc!.transact(() => {
      const startIndex = this.lineToIndex(selectedOption.range.startLine);
      const endIndex = this.lineToIndex(selectedOption.range.endLine);
      this.ytext.delete(startIndex, endIndex - startIndex);
      this.ytext.insert(startIndex, selectedOption.code);
    }, 'conflict-resolution');

    conflict.status = 'resolved';
    conflict.resolvedAt = Date.now();
    conflict.resolvedBy = resolvedBy;
    this.conflictsMap.set(conflictId, conflict);
  }

  getOpenConflicts(): AgentConflict[] {
    const open: AgentConflict[] = [];
    this.conflictsMap.forEach(conflict => {
      if (conflict.status === 'open') {
        open.push(conflict);
      }
    });
    return open;
  }

  private lineToIndex(line: number): number {
    const lines = this.ytext.toString().split('\n');
    let idx = 0;
    for (let i = 0; i < line - 1 && i < lines.length; i++) {
      idx += lines[i].length + 1;
    }
    return idx;
  }
}

export { DisagreementResolver, AgentConflict, ConflictOption };
```

### 6.4 Agent Edit Attribution

Every operation in Yjs carries a client ID. By mapping client IDs to agent identities, we can attribute every change.

```typescript
// @ideia/collaboration/agent/attribution.ts
import * as Y from 'yjs';

interface AgentIdentity {
  clientId: number;
  agentId: string;
  agentType: string;
  agentName: string;
  color: string;
}

class AgentAttribution {
  private agentMap: Map<number, AgentIdentity>;
  private ydoc: Y.Doc;

  constructor(ydoc: Y.Doc) {
    this.ydoc = ydoc;
    this.agentMap = new Map();
  }

  registerAgent(identity: AgentIdentity): void {
    this.agentMap.set(identity.clientId, identity);
  }

  unregisterAgent(clientId: number): void {
    this.agentMap.delete(clientId);
  }

  getAgentForClient(clientId: number): AgentIdentity | undefined {
    return this.agentMap.get(clientId);
  }

  getAgentForOperation(operation: { clientId: number }): AgentIdentity | undefined {
    return this.agentMap.get(operation.clientId);
  }

  getAllAgents(): AgentIdentity[] {
    return Array.from(this.agentMap.values());
  }
}

export { AgentAttribution, AgentIdentity };
```

---

## 7. Document Synchronization

### 7.1 Full Sync vs Incremental Sync

| Aspect | Full Sync | Incremental Sync |
|--------|-----------|------------------|
| Payload | Entire document state (Yjs binary) | Single operation update |
| Size | Document size (KB to MB) | < 1KB per keystroke |
| When | Initial connect, reconnection after long offline | Real-time editing |
| Frequency | Once per connection | Every operation |
| Bandwidth | High (one-time) | Low (continuous) |

```
Sync Protocol Sequence:

  Peer A                     Server                     Peer B
    |                          |                          |
    |--- DOC_REQUEST --------->|                          |
    |                          |                          |
    |<-- STATE_SNAPSHOT -------|                          |
    |    (full Yjs state)      |                          |
    |                          |                          |
    |--- SYNC_STEP_1 --------->|                          |
    |    (state vector)        |                          |
    |                          |--- SYNC_STEP_1 --------->|
    |                          |    (state vector)        |
    |<-- SYNC_STEP_2 ----------|<-------------------------|
    |    (missing updates)     |    (missing updates)     |
    |                          |                          |
    |=== Full sync complete ===|=== CRDT consistent ======|
    |                          |                          |
    |--- UPDATE (diff) ------->|--- UPDATE (diff) ------->|
    |    (typed 'x')           |    (agent inserted ')')  |
    |                          |                          |
    |<-- UPDATE (diff) --------|<-------------------------|
    |    (agent ') inserted)   |    (user 'x' inserted)  |
    |                          |                          |
    |=== Incremental sync ===  |=== Both converge ========|
```

### 7.2 Yjs Binary Protocol

Yjs uses a compact binary encoding for operations.

```typescript
// @ideia/collaboration/sync/binary-protocol.ts
import * as Y from 'yjs';

// Message types for custom sync protocol
const enum MessageType {
  SYNC_STEP_1 = 0,      // State vector
  SYNC_STEP_2 = 1,      // Missing updates
  SYNC_UPDATE = 2,       // Single update
  AWARENESS = 3,         // Awareness state
  DOC_REQUEST = 4,       // Request full document
  DOC_SNAPSHOT = 5       // Full document snapshot
}

interface SyncMessage {
  type: MessageType;
  documentId: string;
  payload: Uint8Array;
}

function encodeMessage(msg: SyncMessage): Uint8Array {
  const encoder = new TextEncoder();
  const payload = msg.payload;
  const header = new Uint8Array(1 + 36 + 4); // type + uuid + payload length
  header[0] = msg.type;

  // Encode documentId as bytes (simplified -- use proper UUID encoding)
  const docIdBytes = encoder.encode(msg.documentId);
  header.set(docIdBytes, 1);

  // Payload length as big-endian uint32
  const dv = new DataView(header.buffer);
  dv.setUint32(37, payload.length, false);

  // Combine header + payload
  const result = new Uint8Array(header.length + payload.length);
  result.set(header);
  result.set(payload, header.length);

  return result;
}

function decodeMessage(data: Uint8Array): SyncMessage {
  const type = data[0] as MessageType;
  const payloadLength = new DataView(data.buffer, 37, 4).getUint32(0, false);
  const docIdBytes = data.slice(1, 37);
  const documentId = new TextDecoder().decode(docIdBytes).replace(/\0/g, '');
  const payload = data.slice(41, 41 + payloadLength);

  return { type, documentId, payload };
}

export { MessageType, SyncMessage, encodeMessage, decodeMessage };
```

### 7.3 Compression

```typescript
// @ideia/collaboration/sync/compression.ts
import * as Y from 'yjs';
import { deflateSync, inflateSync } from 'zlib';

interface CompressionConfig {
  enabled: boolean;
  threshold: number;     // bytes -- minimum size to compress (default: 1024)
  level: number;         // zlib level 0-9 (default: 6)
}

class SyncCompressor {
  private config: CompressionConfig;

  constructor(config?: Partial<CompressionConfig>) {
    this.config = {
      enabled: config?.enabled ?? true,
      threshold: config?.threshold ?? 1024,
      level: config?.level ?? 6
    };
  }

  compress(data: Uint8Array): Uint8Array {
    if (!this.config.enabled || data.length < this.config.threshold) {
      return data;
    }
    return deflateSync(data, { level: this.config.level });
  }

  decompress(data: Uint8Array): Uint8Array {
    if (!this.config.enabled) return data;
    try {
      return inflateSync(data);
    } catch {
      return data; // Return as-is if not compressed
    }
  }
}

export { SyncCompressor, CompressionConfig };
```

### 7.4 Offline Support

```typescript
// @ideia/collaboration/sync/offline.ts
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

class OfflineSync {
  private ydoc: Y.Doc;
  private indexeddb: IndexeddbPersistence;
  private pendingUpdates: Uint8Array[];
  private isOnline: boolean;

  constructor(ydoc: Y.Doc, documentId: string) {
    this.ydoc = ydoc;
    this.indexeddb = new IndexeddbPersistence(documentId, ydoc);
    this.pendingUpdates = [];
    this.isOnline = navigator.onLine;

    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    this.ydoc.on('update', (update: Uint8Array, origin: any) => {
      if (!this.isOnline && origin !== 'indexeddb') {
        this.pendingUpdates.push(update);
      }
    });
  }

  private async handleOnline(): Promise<void> {
    this.isOnline = true;

    // Sync pending updates queued while offline
    const pending = [...this.pendingUpdates];
    this.pendingUpdates = [];

    for (const update of pending) {
      this.ydoc.transact(() => {
        Y.applyUpdate(this.ydoc, update);
      }, 'offline-sync');
    }
  }

  private handleOffline(): void {
    this.isOnline = false;
  }

  async saveSnapshot(): Promise<void> {
    await this.indexeddb.save();
  }

  async destroy(): Promise<void> {
    await this.indexeddb.destroy();
    window.removeEventListener('online', () => this.handleOnline());
    window.removeEventListener('offline', () => this.handleOffline());
  }
}

export { OfflineSync };
```

### 7.5 Sync Frequency & Throttling

```typescript
// @ideia/collaboration/sync/throttle.ts
interface SyncThrottleConfig {
  maxUpdatesPerSecond: number;   // default: 30
  maxAwarenessPerSecond: number; // default: 20
  batchInterval: number;         // ms -- batch updates (default: 50)
  idleSyncInterval: number;      // ms -- sync even when idle (default: 5000)
}

class SyncThrottle {
  private config: SyncThrottleConfig;
  private updateQueue: Uint8Array[];
  private lastUpdateTime: number;
  private lastAwarenessTime: number;
  private batchTimer: NodeJS.Timeout | null;
  private idleTimer: NodeJS.Timeout | null;

  constructor(config?: Partial<SyncThrottleConfig>) {
    this.config = {
      maxUpdatesPerSecond: config?.maxUpdatesPerSecond ?? 30,
      maxAwarenessPerSecond: config?.maxAwarenessPerSecond ?? 20,
      batchInterval: config?.batchInterval ?? 50,
      idleSyncInterval: config?.idleSyncInterval ?? 5000
    };
    this.updateQueue = [];
    this.lastUpdateTime = 0;
    this.lastAwarenessTime = 0;
    this.batchTimer = null;
    this.idleTimer = null;
  }

  shouldSendUpdate(update: Uint8Array): boolean {
    const now = Date.now();
    const minInterval = 1000 / this.config.maxUpdatesPerSecond;

    if (now - this.lastUpdateTime < minInterval) {
      this.updateQueue.push(update);
      this.scheduleBatch();
      return false;
    }

    this.lastUpdateTime = now;
    return true;
  }

  shouldSendAwareness(): boolean {
    const now = Date.now();
    const minInterval = 1000 / this.config.maxAwarenessPerSecond;

    if (now - this.lastAwarenessTime < minInterval) {
      return false;
    }

    this.lastAwarenessTime = now;
    return true;
  }

  private scheduleBatch(): void {
    if (this.batchTimer) return;
    this.batchTimer = setTimeout(() => {
      this.flushBatch();
      this.batchTimer = null;
    }, this.config.batchInterval);
  }

  private flushBatch(): void {
    if (this.updateQueue.length === 0) return;
    const batch = this.updateQueue.splice(0);
    this.lastUpdateTime = Date.now();

    // Emit batched update to provider
    this.onBatchUpdate?.(batch);
  }

  onBatchUpdate?: (updates: Uint8Array[]) => void;

  destroy(): void {
    if (this.batchTimer) clearTimeout(this.batchTimer);
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.updateQueue = [];
  }
}

export { SyncThrottle, SyncThrottleConfig };
```

---

## 8. Awareness & Presence

### 8.1 Cursor and Selection Sync

Each collaborator's cursor position and text selection are broadcast via the Yjs awareness protocol.

```
Awareness State Shape:

{
  "user": {
    "id": "alice-123",
    "name": "Alice Silva",
    "color": "#FF6B6B",
    "isAgent": false
  },
  "cursor": {
    "anchor": { "lineNumber": 15, "column": 4 },
    "head": { "lineNumber": 15, "column": 28 }
  },
  "status": "active",
  "lastActivity": 1690051234567
}
```

### 8.2 Cursor Rendering in Monaco

```typescript
// @ideia/collaboration/editor/cursor-renderer.ts
import * as Monaco from 'monaco-editor';

interface RemoteCursor {
  clientId: number;
  userId: string;
  displayName: string;
  color: string;
  isAgent: boolean;
  position: Monaco.IPosition;
  selection: Monaco.ISelection | null;
}

class CursorRenderer {
  private editor: Monaco.editor.IStandaloneCodeEditor;
  private cursorDecorations: Map<number, Monaco.editor.IEditorDecorationsCollection>;

  constructor(editor: Monaco.editor.IStandaloneCodeEditor) {
    this.editor = editor;
    this.cursorDecorations = new Map();
  }

  updateCursor(cursor: RemoteCursor): void {
    const existingDecoration = this.cursorDecorations.get(cursor.clientId);
    if (existingDecoration) {
      existingDecoration.clear();
    }

    const decorations = this.editor.createDecorationsCollection([
      // Cursor line style
      {
        range: {
          startLineNumber: cursor.position.lineNumber,
          startColumn: cursor.position.column,
          endLineNumber: cursor.position.lineNumber,
          endColumn: cursor.position.column
        },
        options: {
          className: 'remote-cursor',
          beforeContentClassName: `remote-cursor-before-${cursor.clientId}`,
          isWholeLine: false
        }
      },
      // Selection highlight (if any)
      ...(cursor.selection ? [{
        range: cursor.selection,
        options: {
          className: 'remote-selection',
          inlineClassName: `remote-selection-inline-${cursor.clientId}`
        }
      }] : [])
    ]);

    this.cursorDecorations.set(cursor.clientId, decorations);
  }

  removeCursor(clientId: number): void {
    const decoration = this.cursorDecorations.get(clientId);
    if (decoration) {
      decoration.clear();
      this.cursorDecorations.delete(clientId);
    }
  }

  removeAll(): void {
    this.cursorDecorations.forEach(d => d.clear());
    this.cursorDecorations.clear();
  }
}

export { CursorRenderer, RemoteCursor };
```

### 8.3 User Presence Indicators

```typescript
// @ideia/collaboration/presence/presence-indicator.ts
interface PresenceUser {
  userId: string;
  displayName: string;
  color: string;
  avatarUrl?: string;
  isAgent: boolean;
  agentType?: string;
  status: 'online' | 'idle' | 'away' | 'offline';
  lastActivity: number;
  currentFile?: string;
  cursorLine?: number;
}

class PresenceManager {
  private users: Map<string, PresenceUser>;
  private listeners: Set<(users: PresenceUser[]) => void>;

  constructor() {
    this.users = new Map();
    this.listeners = new Set();
  }

  updateUser(userId: string, update: Partial<PresenceUser>): void {
    const existing = this.users.get(userId) ?? {
      userId,
      displayName: '',
      color: '#000000',
      isAgent: false,
      status: 'online',
      lastActivity: Date.now()
    };

    this.users.set(userId, { ...existing, ...update, lastActivity: Date.now() });
    this.notifyListeners();
  }

  removeUser(userId: string): void {
    this.users.delete(userId);
    this.notifyListeners();
  }

  getActiveUsers(): PresenceUser[] {
    return Array.from(this.users.values())
      .filter(u => u.status !== 'offline')
      .sort((a, b) => {
        if (a.isAgent && !b.isAgent) return 1;
        if (!a.isAgent && b.isAgent) return -1;
        return b.lastActivity - a.lastActivity;
      });
  }

  onChange(listener: (users: PresenceUser[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const users = this.getActiveUsers();
    this.listeners.forEach(l => l(users));
  }
}

export { PresenceManager, PresenceUser };
```

### 8.4 Agent Activity Indicators

```typescript
// @ideia/collaboration/editor/agent-activity.ts
interface AgentActivity {
  agentId: string;
  agentName: string;
  agentType: string;
  status: 'idle' | 'thinking' | 'writing' | 'reviewing' | 'error';
  currentAction: string;
  progress?: number;     // 0-100
  startedAt: number;
}

class AgentActivityIndicator {
  private activities: Map<string, AgentActivity>;
  private badgeElements: Map<string, HTMLElement>;

  constructor() {
    this.activities = new Map();
    this.badgeElements = new Map();
  }

  setActivity(activity: AgentActivity): void {
    this.activities.set(activity.agentId, activity);
    this.updateBadge(activity);
  }

  clearActivity(agentId: string): void {
    this.activities.delete(agentId);
    const badge = this.badgeElements.get(agentId);
    if (badge) {
      badge.remove();
      this.badgeElements.delete(agentId);
    }
  }

  private updateBadge(activity: AgentActivity): void {
    let badge = this.badgeElements.get(activity.agentId);
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'agent-activity-badge';
      document.body.appendChild(badge);
      this.badgeElements.set(activity.agentId, badge);
    }

    badge.textContent = `${activity.agentName}: ${activity.currentAction}`;
    badge.className = `agent-activity-badge agent-${activity.status}`;

    if (activity.progress !== undefined) {
      badge.style.setProperty('--progress', `${activity.progress}%`);
    }
  }
}

export { AgentActivityIndicator, AgentActivity };
```

---

## 9. History & Undo

### 9.1 Collaborative Undo Model

Collaborative undo in CRDT systems requires careful design. Yjs Y.UndoManager supports:

| Mode | Description | Use Case |
|------|-------------|----------|
| Local undo | Undo only operations from this client | Default for human users |
| Global undo | Undo any operation regardless of origin | Agent rollback, admin operations |
| Scoped undo | Undo operations from specific origins | Agent-specific undo |
| Time-range undo | Undo operations within a time window | Timeline-based undo |

```typescript
// @ideia/collaboration/history/collaborative-undo.ts
import * as Y from 'yjs';

interface UndoConfig {
  mode: 'local' | 'global' | 'scoped' | 'time-range';
  trackedOrigins?: Set<string>;
  timeRangeMs?: number;
}

class CollaborativeUndoManager {
  private undoManager: Y.UndoManager;
  private ytext: Y.Text;

  constructor(ytext: Y.Text, config: UndoConfig) {
    this.ytext = ytext;

    const options: any = {
      captureTimeout: 500,
      ignoreRemoteOps: config.mode === 'local'
    };

    if (config.mode === 'scoped' && config.trackedOrigins) {
      options.trackedOrigins = config.trackedOrigins;
    }

    this.undoManager = new Y.UndoManager(ytext, options);
  }

  undo(): void {
    this.undoManager.undo();
  }

  redo(): void {
    this.undoManager.redo();
  }

  canUndo(): boolean {
    return this.undoManager.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.undoManager.redoStack.length > 0;
  }

  stopCapturing(): void {
    this.undoManager.stopCapturing();
  }

  clear(): void {
    this.undoManager.clear();
  }
}

export { CollaborativeUndoManager, UndoConfig };
```

### 9.2 Document History Timeline

```typescript
// @ideia/collaboration/history/timeline.ts
import * as Y from 'yjs';

interface HistoryEvent {
  id: string;
  timestamp: number;
  agentId: string;
  agentName: string;
  agentColor: string;
  type: 'insert' | 'delete' | 'replace';
  length: number;
  position: number;
  content?: string;
  clientId: number;
}

class HistoryTimeline {
  private events: HistoryEvent[];
  private ydoc: Y.Doc;
  private maxEvents: number;

  constructor(ydoc: Y.Doc, maxEvents: number = 10000) {
    this.ydoc = ydoc;
    this.events = [];
    this.maxEvents = maxEvents;

    this.ydoc.on('update', (update: Uint8Array, origin: any) => {
      this.processUpdate(update, origin);
    });
  }

  private processUpdate(update: Uint8Array, origin: any): void {
    // Decode Yjs update into individual events
    // This is a simplified version -- Yjs updates are binary encoded
    // Full implementation would use Yjs internals to extract events
    const event: HistoryEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      agentId: origin?.agentId ?? 'unknown',
      agentName: origin?.agentName ?? 'Unknown',
      agentColor: origin?.color ?? '#888888',
      type: 'insert',
      length: update.length,
      position: 0,
      clientId: this.ydoc.clientID
    };

    this.events.push(event);

    // Enforce max events
    if (this.events.length > this.maxEvents) {
      this.events.splice(0, this.events.length - this.maxEvents);
    }
  }

  getEvents(options?: {
    fromTimestamp?: number;
    toTimestamp?: number;
    agentId?: string;
    limit?: number;
    offset?: number;
  }): HistoryEvent[] {
    let filtered = [...this.events];

    if (options?.fromTimestamp) {
      filtered = filtered.filter(e => e.timestamp >= options.fromTimestamp!);
    }
    if (options?.toTimestamp) {
      filtered = filtered.filter(e => e.timestamp <= options.toTimestamp!);
    }
    if (options?.agentId) {
      filtered = filtered.filter(e => e.agentId === options.agentId);
    }

    // Sort newest first
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? filtered.length;

    return filtered.slice(offset, offset + limit);
  }

  clear(): void {
    this.events = [];
  }

  getEventCount(): number {
    return this.events.length;
  }
}

export { HistoryTimeline, HistoryEvent };
```

### 9.3 Time-Travel Debugging

Time-travel allows rewinding the document to any point in its history.

```typescript
// @ideia/collaboration/history/time-travel.ts
import * as Y from 'yjs';

interface TimeTravelOptions {
  ydoc: Y.Doc;
  ytext: Y.Text;
  snapshots: Map<number, Uint8Array>;  // timestamp -> Yjs state
  snapshotInterval: number;             // ms between snapshots
}

class TimeTravel {
  private ydoc: Y.Doc;
  private ytext: Y.Text;
  private snapshots: Map<number, Uint8Array>;
  private currentIndex: number;
  private timeline: number[];  // sorted timestamps

  constructor(options: TimeTravelOptions) {
    this.ydoc = options.ydoc;
    this.ytext = options.ytext;
    this.snapshots = options.snapshots;
    this.timeline = Array.from(this.snapshots.keys()).sort((a, b) => a - b);
    this.currentIndex = this.timeline.length - 1; // Start at latest
  }

  goBack(): boolean {
    if (this.currentIndex <= 0) return false;
    this.currentIndex--;
    this.restoreSnapshot();
    return true;
  }

  goForward(): boolean {
    if (this.currentIndex >= this.timeline.length - 1) return false;
    this.currentIndex++;
    this.restoreSnapshot();
    return true;
  }

  goToTimestamp(timestamp: number): boolean {
    const index = this.timeline.findIndex(t => t >= timestamp);
    if (index === -1) return false;
    this.currentIndex = index;
    this.restoreSnapshot();
    return true;
  }

  goToEvent(eventIndex: number): boolean {
    // Convert event index to nearest snapshot
    const snapTimestamp = this.timeline[this.currentIndex];
    // In real implementation, compute exact state at event point
    return this.goToTimestamp(snapTimestamp);
  }

  private restoreSnapshot(): void {
    const timestamp = this.timeline[this.currentIndex];
    const snapshot = this.snapshots.get(timestamp);
    if (!snapshot) return;

    // Create temp doc with snapshot state
    const tempDoc = new Y.Doc();
    Y.applyUpdate(tempDoc, snapshot);

    // Get diff between current and target
    const currentStateVector = Y.encodeStateVector(this.ydoc);
    const diff = Y.diffUpdate(snapshot, currentStateVector);

    // Apply diff to current doc
    this.ydoc.transact(() => {
      Y.applyUpdate(this.ydoc, diff);
    }, 'time-travel');
  }

  getCurrentTimestamp(): number | undefined {
    return this.timeline[this.currentIndex];
  }

  getTimelineLength(): number {
    return this.timeline.length;
  }

  getCurrentPosition(): number {
    return this.currentIndex;
  }
}

export { TimeTravel, TimeTravelOptions };
```

### 9.4 Snapshot & Revert

```typescript
// @ideia/collaboration/history/snapshot.ts
import * as Y from 'yjs';

interface DocumentSnapshot {
  id: string;
  documentId: string;
  label: string;
  state: Uint8Array;
  createdAt: number;
  createdBy: string;
  description?: string;
}

class SnapshotManager {
  private ydoc: Y.Doc;
  private snapshots: DocumentSnapshot[];
  private store: IDocumentStore;

  constructor(ydoc: Y.Doc, store: IDocumentStore) {
    this.ydoc = ydoc;
    this.snapshots = [];
    this.store = store;
  }

  async createSnapshot(
    label: string,
    createdBy: string,
    description?: string
  ): Promise<DocumentSnapshot> {
    const state = Y.encodeStateAsUpdate(this.ydoc);
    const snapshot: DocumentSnapshot = {
      id: crypto.randomUUID(),
      documentId: this.ydoc.guid,
      label,
      state,
      createdAt: Date.now(),
      createdBy,
      description
    };

    this.snapshots.push(snapshot);
    await this.store.save(this.ydoc, snapshot.id, {
      type: 'snapshot',
      label,
      createdBy
    });

    return snapshot;
  }

  async revertToSnapshot(snapshotId: string): Promise<void> {
    const snapshot = this.snapshots.find(s => s.id === snapshotId);
    if (!snapshot) throw new Error(`Snapshot ${snapshotId} not found`);

    this.ydoc.transact(() => {
      // Clear current document and apply snapshot state
      const currentState = Y.encodeStateAsUpdate(this.ydoc);
      const currentSv = Y.encodeStateVector(this.ydoc);
      const diff = Y.diffUpdate(snapshot.state, currentSv);
      Y.applyUpdate(this.ydoc, diff);
    }, 'snapshot-revert');
  }

  listSnapshots(): DocumentSnapshot[] {
    return [...this.snapshots].reverse();
  }

  getSnapshot(id: string): DocumentSnapshot | undefined {
    return this.snapshots.find(s => s.id === id);
  }
}

export { SnapshotManager, DocumentSnapshot };
```

---

## 10. Conflict Resolution

### 10.1 Automatic CRDT Merge

Yjs CRDTs merge automatically by design. No manual conflict resolution is needed for basic text operations. However, semantic conflicts (e.g., two agents writing different implementations for the same function) require user attention.

```
CRDT Automatic Merge Example:

  Initial: "function add(a, b) {\n  \n}"

  Agent A (line 2): "  return a + b;"
  Agent B (line 2): "  return b + a;"

  CRDT merge result (position-based):
    "function add(a, b) {\n  return a + b; return b + a;\n}"

  This is syntactically correct CRDT merge but semantically wrong.
  User needs to resolve the semantic conflict manually.
```

### 10.2 Manual Conflict Resolution UI

```typescript
// @ideia/collaboration/conflict/resolution-ui.ts
interface ManualConflict {
  id: string;
  documentId: string;
  filePath: string;
  description: string;
  leftOption: ConflictSide;
  rightOption: ConflictSide;
  mergedOption?: string;
  status: 'unresolved' | 'accepted-left' | 'accepted-right' | 'merged' | 'overridden';
  createdAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
}

interface ConflictSide {
  label: string;
  authorId: string;
  authorName: string;
  content: string;
  startLine: number;
  endLine: number;
}

class ConflictResolver {
  private conflicts: Map<string, ManualConflict>;
  private onResolve?: (conflict: ManualConflict) => void;

  constructor(onResolve?: (conflict: ManualConflict) => void) {
    this.conflicts = new Map();
    this.onResolve = onResolve;
  }

  registerConflict(conflict: ManualConflict): void {
    this.conflicts.set(conflict.id, conflict);
  }

  async acceptLeft(conflictId: string, resolvedBy: string): Promise<void> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) return;

    conflict.status = 'accepted-left';
    conflict.resolvedAt = Date.now();
    conflict.resolvedBy = resolvedBy;
    this.onResolve?.(conflict);
  }

  async acceptRight(conflictId: string, resolvedBy: string): Promise<void> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) return;

    conflict.status = 'accepted-right';
    conflict.resolvedAt = Date.now();
    conflict.resolvedBy = resolvedBy;
    this.onResolve?.(conflict);
  }

  async acceptMerge(
    conflictId: string,
    mergedContent: string,
    resolvedBy: string
  ): Promise<void> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) return;

    conflict.mergedOption = mergedContent;
    conflict.status = 'merged';
    conflict.resolvedAt = Date.now();
    conflict.resolvedBy = resolvedBy;
    this.onResolve?.(conflict);
  }

  getUnresolved(): ManualConflict[] {
    return Array.from(this.conflicts.values())
      .filter(c => c.status === 'unresolved');
  }

  getConflictHistory(): ManualConflict[] {
    return Array.from(this.conflicts.values())
      .filter(c => c.status !== 'unresolved')
      .sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0));
  }
}

export { ConflictResolver, ManualConflict, ConflictSide };
```

### 10.3 Conflict Detection

```typescript
// @ideia/collaboration/conflict/detection.ts
interface ConflictDetectorOptions {
  proximityLines: number;     // How close edits must be to trigger conflict (default: 5)
  minTimeDelta: number;       // ms -- max time diff to be concurrent (default: 1000)
  ignoreWhitespace: boolean;  // Ignore whitespace-only changes (default: true)
}

interface PotentialConflict {
  id: string;
  type: 'overlapping' | 'adjacent' | 'semantic';
  description: string;
  agents: Array<{ id: string; name: string; type: string }>;
  ranges: Array<{ startLine: number; endLine: number }>;
  severity: 'info' | 'warning' | 'critical';
  detectedAt: number;
}

class ConflictDetector {
  private options: ConflictDetectorOptions;
  private recentEdits: Array<{
    agentId: string;
    agentName: string;
    range: { startLine: number; endLine: number };
    timestamp: number;
    content?: string;
  }>;

  constructor(options?: Partial<ConflictDetectorOptions>) {
    this.options = {
      proximityLines: options?.proximityLines ?? 5,
      minTimeDelta: options?.minTimeDelta ?? 1000,
      ignoreWhitespace: options?.ignoreWhitespace ?? true
    };
    this.recentEdits = [];
  }

  recordEdit(edit: {
    agentId: string;
    agentName: string;
    agentType: string;
    range: { startLine: number; endLine: number };
    content?: string;
  }): void {
    this.recentEdits.push({ ...edit, timestamp: Date.now() });

    // Clean old edits
    const cutoff = Date.now() - this.options.minTimeDelta * 10;
    this.recentEdits = this.recentEdits.filter(e => e.timestamp > cutoff);
  }

  detectConflicts(): PotentialConflict[] {
    const conflicts: PotentialConflict[] = [];

    for (let i = 0; i < this.recentEdits.length; i++) {
      for (let j = i + 1; j < this.recentEdits.length; j++) {
        const a = this.recentEdits[i];
        const b = this.recentEdits[j];

        // Must be different agents
        if (a.agentId === b.agentId) continue;

        // Must be concurrent (within time delta)
        if (Math.abs(a.timestamp - b.timestamp) > this.options.minTimeDelta) continue;

        // Check range proximity
        const overlap = this.rangesOverlap(a.range, b.range);

        if (overlap.type === 'overlapping') {
          conflicts.push({
            id: `conflict-${crypto.randomUUID()}`,
            type: 'overlapping',
            description: `Overlapping edits by ${a.agentName} and ${b.agentName}`,
            agents: [
              { id: a.agentId, name: a.agentName, type: a.agentType ?? 'unknown' },
              { id: b.agentId, name: b.agentName, type: b.agentType ?? 'unknown' }
            ],
            ranges: [a.range, b.range],
            severity: 'critical',
            detectedAt: Date.now()
          });
        } else if (overlap.type === 'adjacent') {
          conflicts.push({
            id: `conflict-${crypto.randomUUID()}`,
            type: 'adjacent',
            description: `Adjacent edits by ${a.agentName} and ${b.agentName}`,
            agents: [
              { id: a.agentId, name: a.agentName, type: a.agentType ?? 'unknown' },
              { id: b.agentId, name: b.agentName, type: b.agentType ?? 'unknown' }
            ],
            ranges: [a.range, b.range],
            severity: 'warning',
            detectedAt: Date.now()
          });
        }
      }
    }

    return conflicts;
  }

  private rangesOverlap(
    a: { startLine: number; endLine: number },
    b: { startLine: number; endLine: number }
  ): { type: 'none' | 'adjacent' | 'overlapping' } {
    const proximity = this.options.proximityLines;

    if (a.startLine <= b.endLine && b.startLine <= a.endLine) {
      return { type: 'overlapping' };
    }

    if (
      Math.abs(a.endLine - b.startLine) <= proximity ||
      Math.abs(b.endLine - a.startLine) <= proximity
    ) {
      return { type: 'adjacent' };
    }

    return { type: 'none' };
  }
}

export { ConflictDetector, PotentialConflict, ConflictDetectorOptions };
```

### 10.4 Conflict Audit Trail

Every conflict and its resolution must be recorded for auditability.

```typescript
// @ideia/collaboration/conflict/audit.ts
interface ConflictAuditEntry {
  conflictId: string;
  documentId: string;
  sessionId: string;
  type: 'auto-merge' | 'manual-left' | 'manual-right' | 'manual-merge' | 'overridden';
  timestamp: number;
  resolvedBy: string;
  details: {
    leftAuthor: string;
    rightAuthor: string;
    leftContentSnippet: string;
    rightContentSnippet: string;
    mergedContentSnippet?: string;
    contextLines: string[];
  };
}

class ConflictAuditor {
  private entries: ConflictAuditEntry[];

  constructor() {
    this.entries = [];
  }

  record(entry: ConflictAuditEntry): void {
    this.entries.push(entry);
  }

  getEntries(options?: {
    conflictId?: string;
    documentId?: string;
    fromTimestamp?: number;
    toTimestamp?: number;
    limit?: number;
  }): ConflictAuditEntry[] {
    let filtered = [...this.entries];

    if (options?.conflictId) {
      filtered = filtered.filter(e => e.conflictId === options.conflictId);
    }
    if (options?.documentId) {
      filtered = filtered.filter(e => e.documentId === options.documentId);
    }
    if (options?.fromTimestamp) {
      filtered = filtered.filter(e => e.timestamp >= options.fromTimestamp!);
    }
    if (options?.toTimestamp) {
      filtered = filtered.filter(e => e.timestamp <= options.toTimestamp!);
    }

    filtered.sort((a, b) => b.timestamp - a.timestamp);

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  exportToAuditLog(): string {
    return JSON.stringify(this.entries, null, 2);
  }
}

export { ConflictAuditor, ConflictAuditEntry };
```

---

## 11. Performance & Scalability

### 11.1 Document Size Limits

| Parameter | Limit | Rationale |
|-----------|-------|-----------|
| Max Y.Doc size in memory | 50 MB | Large files with full history |
| Max file lines | 100,000 | Beyond this, use file splitting |
| Max concurrent editors | 16 per document | Team of 6 humans + 10 agents |
| Max awareness states | 64 | Including historical/disconnected |
| Max operation history | 1,000,000 operations | ~10MB compressed |
| Snapshot interval | Every 100 operations | Balance perf vs restore granularity |

### 11.2 Awareness Update Frequency

| State | Frequency | Bandwidth per User |
|-------|-----------|-------------------|
| Active typing | 30 updates/second | ~3 KB/s |
| Idle (cursor still) | 5 updates/second | ~0.5 KB/s |
| Away | 1 update/30 seconds | ~30 B/s |
| Disconnected | Sent once on disconnect | ~100 B |

### 11.3 Sync Throttling

```typescript
// @ideia/collaboration/performance/throttle-manager.ts
interface ThrottleConfig {
  maxUpdateRate: number;       // ops/second (default: 60)
  maxAwarenessRate: number;    // updates/second (default: 20)
  batchWindow: number;         // ms (default: 16) -- ~60fps
  backpressureThreshold: number; // queued items before slowdown
}

class ThrottleManager {
  private config: ThrottleConfig;
  private updateTimestamps: number[];
  private awarenessTimestamps: number[];
  private queue: Uint8Array[];

  constructor(config?: Partial<ThrottleConfig>) {
    this.config = {
      maxUpdateRate: config?.maxUpdateRate ?? 60,
      maxAwarenessRate: config?.maxAwarenessRate ?? 20,
      batchWindow: config?.batchWindow ?? 16,
      backpressureThreshold: config?.backpressureThreshold ?? 50
    };
    this.updateTimestamps = [];
    this.awarenessTimestamps = [];
    this.queue = [];
  }

  canSendUpdate(): boolean {
    this.updateTimestamps = this.updateTimestamps.filter(
      t => t > Date.now() - 1000
    );
    if (this.updateTimestamps.length >= this.config.maxUpdateRate) {
      return false;
    }
    this.updateTimestamps.push(Date.now());
    return true;
  }

  canSendAwareness(): boolean {
    this.awarenessTimestamps = this.awarenessTimestamps.filter(
      t => t > Date.now() - 1000
    );
    if (this.awarenessTimestamps.length >= this.config.maxAwarenessRate) {
      return false;
    }
    this.awarenessTimestamps.push(Date.now());
    return true;
  }

  queueUpdate(update: Uint8Array): boolean {
    if (this.queue.length >= this.config.backpressureThreshold) {
      return false; // Backpressure: drop old updates
    }
    this.queue.push(update);
    return true;
  }

  flushQueue(): Uint8Array[] {
    const batch = this.queue.splice(0);
    return batch;
  }

  getBacklogSize(): number {
    return this.queue.length;
  }

  isBackpressured(): boolean {
    return this.queue.length >= this.config.backpressureThreshold;
  }
}

export { ThrottleManager, ThrottleConfig };
```

### 11.4 WebSocket Scaling (Horizontal)

```
Horizontal Scaling Architecture:

  +----------+     +----------+     +----------+
  | Client A |     | Client B |     | Client C |
  +----+-----+     +----+-----+     +----+-----+
       |                |                |
       |  WebSocket     |                |
       +-------+--------+                |
               |                         |
        +------v--------+        +-------v-------+
        | WS Server 1   |        | WS Server 2   |
        | (node:3001)   |        | (node:3002)   |
        +------+--------+        +-------+-------+
               |                         |
               |     NATS JetStream       |
               +----------+--------------+
                          |
                   +------v-------+
                   | NATS Cluster |
                   |  (streams)   |
                   +--------------+
                          |
                   +------v-------+
                   | PostgreSQL   |
                   | (persistence)|
                   +--------------+

  Strategy:
    - Each WS server handles a subset of clients (sticky by docId)
    - Servers publish updates to NATS subject per docId
    - All servers subscribe to docId subjects to relay to local clients
    - No direct server-to-server communication; all via NATS
```

### 11.5 Document Sharding for Large Files

```typescript
// @ideia/collaboration/performance/sharding.ts
interface ShardConfig {
  linesPerShard: number;       // default: 1000
  maxShards: number;           // default: 100
}

class DocumentShard {
  private shards: Map<number, Y.Doc>;
  private shardConfig: ShardConfig;

  constructor(config?: Partial<ShardConfig>) {
    this.shards = new Map();
    this.shardConfig = {
      linesPerShard: config?.linesPerShard ?? 1000,
      maxShards: config?.maxShards ?? 100
    };
  }

  getShardForLine(line: number): number {
    return Math.floor(line / this.shardConfig.linesPerShard);
  }

  getTextForShard(shardIndex: number): Y.Text | undefined {
    const shardDoc = this.shards.get(shardIndex);
    return shardDoc?.getText('code');
  }

  createShard(shardIndex: number): Y.Text {
    if (this.shards.size >= this.shardConfig.maxShards) {
      throw new Error('Max shards exceeded');
    }

    const doc = new Y.Doc();
    this.shards.set(shardIndex, doc);
    return doc.getText('code');
  }

  getAllShards(): Map<number, Y.Doc> {
    return new Map(this.shards);
  }

  getTotalShards(): number {
    return this.shards.size;
  }
}

export { DocumentShard, ShardConfig };
```

### 11.6 Memory Management

| Strategy | Description | Impact |
|----------|-------------|--------|
| Snapshot-based GC | Compact Y.Doc periodically, discard old operations | Reduces memory by ~60% for long-lived docs |
| Operation limit | Hard limit on stored operations (1M) | Prevents unbounded growth |
| Awareness timeout | Drop awareness states after 5 min inactivity | Reduces memory from stale connections |
| Document unload | Unload Y.Doc from memory when tab closed, persist to DB | Frees editor memory |
| Compressed storage | Store Yjs binary with zlib compression | Reduces DB storage by ~70% |

---

## 12. Security

### 12.1 Authentication for WebSocket Connections

```typescript
// @ideia/collaboration/security/auth.ts
interface WebSocketAuth {
  token: string;            // JWT
  userId: string;
  sessionId: string;
  documentId: string;
  permissions: DocumentPermission[];
}

type DocumentPermission = 'read' | 'write' | 'comment' | 'admin';

class CollaborationAuth {
  async authenticate(token: string): Promise<WebSocketAuth> {
    // Verify JWT
    const payload = await this.verifyJWT(token);

    // Extract permissions for this document
    const permissions = await this.getPermissions(payload.userId, payload.documentId);

    return {
      token,
      userId: payload.userId,
      sessionId: payload.sessionId,
      documentId: payload.documentId,
      permissions
    };
  }

  private async verifyJWT(token: string): Promise<any> {
    // JWT verification logic
    // Validate signature, expiry, issuer
    return { userId: '', sessionId: '', documentId: '' };
  }

  private async getPermissions(
    userId: string,
    documentId: string
  ): Promise<DocumentPermission[]> {
    // Query permission store (Cedar policy, RBAC, etc.)
    return ['read'];
  }

  hasPermission(
    auth: WebSocketAuth,
    required: DocumentPermission
  ): boolean {
    return auth.permissions.includes(required) || auth.permissions.includes('admin');
  }
}

export { CollaborationAuth, WebSocketAuth, DocumentPermission };
```

### 12.2 Document Access Control

| Level | Read | Write | Comment | Admin |
|-------|------|-------|---------|-------|
| Owner | Yes | Yes | Yes | Yes |
| Editor | Yes | Yes | Yes | No |
| Commenter | Yes | No | Yes | No |
| Viewer | Yes | No | No | No |

### 12.3 Rate Limiting

```typescript
// @ideia/collaboration/security/rate-limiter.ts
interface RateLimitRule {
  windowMs: number;
  maxRequests: number;
  blockDurationMs: number;
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
  blockedUntil: number;
}

class CollaborationRateLimiter {
  private limits: Map<string, RateLimitEntry>;
  private rules: Map<string, RateLimitRule>;

  constructor() {
    this.limits = new Map();
    this.rules = new Map([
      ['sync-update', { windowMs: 1000, maxRequests: 100, blockDurationMs: 10000 }],
      ['awareness', { windowMs: 1000, maxRequests: 60, blockDurationMs: 5000 }],
      ['connect', { windowMs: 60000, maxRequests: 10, blockDurationMs: 300000 }],
      ['auth', { windowMs: 60000, maxRequests: 5, blockDurationMs: 600000 }]
    ]);
  }

  check(key: string, action: string): boolean {
    const rule = this.rules.get(action);
    if (!rule) return true;

    const limitKey = `${key}:${action}`;
    let entry = this.limits.get(limitKey);

    if (!entry) {
      entry = { count: 0, windowStart: Date.now(), blockedUntil: 0 };
      this.limits.set(limitKey, entry);
    }

    // Check if currently blocked
    if (entry.blockedUntil > Date.now()) {
      return false;
    }

    // Reset window if expired
    if (Date.now() - entry.windowStart > rule.windowMs) {
      entry.count = 0;
      entry.windowStart = Date.now();
    }

    entry.count++;

    if (entry.count > rule.maxRequests) {
      entry.blockedUntil = Date.now() + rule.blockDurationMs;
      return false;
    }

    return true;
  }

  reset(key: string, action: string): void {
    this.limits.delete(`${key}:${action}`);
  }
}

export { CollaborationRateLimiter, RateLimitRule };
```

### 12.4 Message Validation

```typescript
// @ideia/collaboration/security/validator.ts
import * as Y from 'yjs';

interface MessageValidationResult {
  valid: boolean;
  reason?: string;
  sanitized?: Uint8Array;
}

class SyncMessageValidator {
  private maxMessageSize: number;  // bytes
  private allowedMessageTypes: Set<number>;

  constructor() {
    this.maxMessageSize = 10 * 1024 * 1024; // 10MB
    this.allowedMessageTypes = new Set([0, 1, 2, 3, 4, 5]);
  }

  validate(data: Uint8Array): MessageValidationResult {
    // Check size
    if (data.length > this.maxMessageSize) {
      return {
        valid: false,
        reason: `Message exceeds max size: ${data.length} > ${this.maxMessageSize}`
      };
    }

    // Check message type
    const type = data[0];
    if (!this.allowedMessageTypes.has(type)) {
      return {
        valid: false,
        reason: `Invalid message type: ${type}`
      };
    }

    // Try to decode as Yjs update
    try {
      if (type === 2) {
        // SYNC_UPDATE: attempt decode
        const decoded = Y.decodeUpdate(data.slice(1));
        if (!decoded) {
          return { valid: false, reason: 'Invalid Yjs update format' };
        }
      }
    } catch (e) {
      return { valid: false, reason: `Yjs decode error: ${(e as Error).message}` };
    }

    return { valid: true };
  }
}

export { SyncMessageValidator, MessageValidationResult };
```

### 12.5 Encrypted Sync (WSS)

| Aspect | Plain WS | WSS |
|--------|----------|-----|
| Encryption | None | TLS 1.3 |
| Performance overhead | N/A | ~5% latency increase |
| Certificate management | None | Required (Let's Encrypt) |
| Browser support | All | All |
| Recommended | Development only | Production |

---

## 13. Code Examples

### 13.1 YjsDocumentProvider (Full WebSocket Sync)

```typescript
// @ideia/collaboration/providers/yjs-document-provider.ts
import * as Y from 'yjs';
import { IDocumentProvider } from './document-provider';

interface WebSocketConfig {
  url: string;
  documentId: string;
  token: string;
  reconnectInterval: number;  // ms
  maxReconnectAttempts: number;
}

class YjsDocumentProvider implements IDocumentProvider {
  private ws: WebSocket | null;
  private ydoc: Y.Doc;
  private config: WebSocketConfig;
  private reconnectAttempts: number;
  private reconnectTimer: NodeJS.Timeout | null;
  private destroyed: boolean;

  constructor(ydoc: Y.Doc, config: WebSocketConfig) {
    this.ydoc = ydoc;
    this.config = config;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.destroyed = false;

    this.ydoc.on('update', (update: Uint8Array, origin: any) => {
      if (origin !== this && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(update);
      }
    });
  }

  connect(): void {
    const wsUrl = `${this.config.url}?doc=${this.config.documentId}&token=${this.config.token}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      // Send state vector to get missing updates
      const sv = Y.encodeStateVector(this.ydoc);
      const message = new Uint8Array(1 + sv.length);
      message[0] = 0; // SYNC_STEP1
      message.set(sv, 1);
      this.ws!.send(message);
    };

    this.ws.onmessage = (event: MessageEvent) => {
      const data = new Uint8Array(event.data);
      const type = data[0];

      switch (type) {
        case 0: { // SYNC_STEP1: received state vector
          const sv = data.slice(1);
          const missing = Y.diffUpdate(Y.encodeStateAsUpdate(this.ydoc), sv);
          const response = new Uint8Array(1 + missing.length);
          response[0] = 1; // SYNC_STEP2
          response.set(missing, 1);
          this.ws!.send(response);
          break;
        }
        case 1: { // SYNC_STEP2: received missing updates
          const update = data.slice(1);
          Y.applyUpdate(this.ydoc, update, this);
          break;
        }
        case 2: { // SYNC_UPDATE: incremental update
          const update = data.slice(1);
          Y.applyUpdate(this.ydoc, update, this);
          break;
        }
      }
    };

    this.ws.onclose = () => {
      if (!this.destroyed) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      return;
    }

    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      30000
    );
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      if (!this.destroyed) {
        this.connect();
      }
    }, delay);
  }

  disconnect(): void {
    this.destroyed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.ws?.close();
    this.ws = null;
  }

  destroy(): void {
    this.disconnect();
  }
}

export { YjsDocumentProvider, WebSocketConfig };
```

### 13.2 MonacoCollaborativeBinding (y-monaco Setup)

```typescript
// @ideia/collaboration/editor/monaco-collaborative-binding.ts
import * as Y from 'yjs';
import * as Monaco from 'monaco-editor';
import { MonacoBinding } from 'y-monaco';

class MonacoCollaborativeBinding {
  private binding: MonacoBinding | null;
  private ydoc: Y.Doc;
  private ytext: Y.Text;
  private editor: Monaco.editor.IStandaloneCodeEditor | null;
  private undoManager: Y.UndoManager;

  constructor() {
    this.binding = null;
    this.editor = null;

    // Create Y.Doc with unique client ID
    this.ydoc = new Y.Doc({
      gc: true,
      guid: crypto.randomUUID()
    });

    this.ytext = this.ydoc.getText('code');
    this.undoManager = new Y.UndoManager(this.ytext, {
      captureTimeout: 500,
      ignoreRemoteOps: true
    });
  }

  bindToEditor(editor: Monaco.editor.IStandaloneCodeEditor, awareness?: Awareness): void {
    this.editor = editor;

    if (this.binding) {
      this.binding.destroy();
    }

    this.binding = new MonacoBinding(
      this.ytext,
      editor.getModel()!,
      new Set([editor]),
      awareness,
      this.undoManager
    );
  }

  undo(): void {
    this.undoManager.undo();
  }

  redo(): void {
    this.undoManager.redo();
  }

  getDocument(): Y.Doc {
    return this.ydoc;
  }

  getText(): Y.Text {
    return this.ytext;
  }

  getContent(): string {
    return this.ytext.toString();
  }

  setContent(content: string): void {
    this.ydoc.transact(() => {
      this.ytext.delete(0, this.ytext.length);
      this.ytext.insert(0, content);
    }, 'init');
  }

  destroy(): void {
    this.binding?.destroy();
    this.undoManager.clear();
    this.ydoc.destroy();
  }
}

export { MonacoCollaborativeBinding };
```

### 13.3 Awareness Manager (Cursor/Selection Sync)

```typescript
// @ideia/collaboration/awareness/awareness-manager-impl.ts
import * as Y from 'yjs';

class AwarenessManagerImpl {
  private awareness: Awareness;
  private ydoc: Y.Doc;
  private localUser: { id: string; name: string; color: string; isAgent: boolean };
  private lastCursorBroadcast: number;

  constructor(ydoc: Y.Doc, user: { id: string; name: string; color: string; isAgent: boolean }) {
    this.ydoc = ydoc;
    this.awareness = new Awareness(ydoc);
    this.localUser = user;
    this.lastCursorBroadcast = 0;

    this.awareness.setLocalState({
      user: this.localUser,
      cursor: null,
      status: 'active',
      lastActivity: Date.now()
    });
  }

  updateCursor(cursor: { anchor: any; head: any }): void {
    const now = Date.now();
    if (now - this.lastCursorBroadcast < 33) return; // ~30fps throttle

    this.lastCursorBroadcast = now;
    const state = this.awareness.getLocalState();
    if (state) {
      state.cursor = cursor;
      state.lastActivity = now;
      this.awareness.setLocalState(state);
    }
  }

  setStatus(status: 'active' | 'idle' | 'away'): void {
    const state = this.awareness.getLocalState();
    if (state) {
      state.status = status;
      this.awareness.setLocalState(state);
    }
  }

  onAwarenessChange(handler: (changes: Array<{
    added: number[];
    updated: number[];
    removed: number[];
  }>) => void): void {
    this.awareness.on('change', handler);
  }

  getRemoteStates(): Map<number, Record<string, unknown>> {
    return this.awareness.getStates() as Map<number, Record<string, unknown>>;
  }

  destroy(): void {
    this.awareness.destroy();
  }
}

export { AwarenessManagerImpl };
```

### 13.4 AgentCollaborationWidget (Agent-Human Interaction)

```typescript
// @theia/ideia/collaboration/agent-collaboration-widget.tsx
import * as React from 'react';
import { injectable, inject } from '@theia/core/shared/inversify';

interface AgentCollaborationWidgetProps {
  ydoc: Y.Doc;
  agentCoordinator: AgentCoordinator;
  conflictResolver: ConflictResolver;
  presenceManager: PresenceManager;
}

class AgentCollaborationWidget extends React.Component<AgentCollaborationWidgetProps> {
  render(): JSX.Element {
    const { presenceManager, conflictResolver, agentCoordinator } = this.props;

    return (
      <div className='agent-collaboration-widget'>
        <div className='presence-panel'>
          <h3>Collaborators</h3>
          {presenceManager.getActiveUsers().map(user => (
            <div key={user.userId} className='presence-user'>
              <span className='presence-indicator' data-status={user.status} />
              <span className='user-name' style={{ color: user.color }}>
                {user.displayName}
              </span>
              {user.isAgent && (
                <span className='agent-badge'>{user.agentType}</span>
              )}
            </div>
          ))}
        </div>

        <div className='conflicts-panel'>
          <h3>Conflicts ({conflictResolver.getUnresolved().length})</h3>
          {conflictResolver.getUnresolved().map(conflict => (
            <div key={conflict.id} className='conflict-item'>
              <p>{conflict.description}</p>
              <div className='conflict-options'>
                <button onClick={() => conflictResolver.acceptLeft(conflict.id, 'local')}>
                  Accept: {conflict.leftOption.authorName}
                </button>
                <button onClick={() => conflictResolver.acceptRight(conflict.id, 'local')}>
                  Accept: {conflict.rightOption.authorName}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className='agent-locks-panel'>
          <h3>Active Locks</h3>
          {agentCoordinator.getActiveLocks().map((lock, i) => (
            <div key={i} className='lock-item'>
              <span>{lock.agentType}: Lines {lock.range.startLine}-{lock.range.endLine}</span>
              <span className='lock-purpose'>{lock.purpose}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

export { AgentCollaborationWidget };
```

### 13.5 DocumentHistory (Undo/Redo + Timeline)

```typescript
// @theia/ideia/collaboration/document-history-widget.tsx
import * as React from 'react';
import { CollaborativeUndoManager } from '@ideia/collaboration/history/collaborative-undo';
import { HistoryTimeline } from '@ideia/collaboration/history/timeline';

interface DocumentHistoryProps {
  undoManager: CollaborativeUndoManager;
  timeline: HistoryTimeline;
  onTimeTravel: (eventIndex: number) => void;
}

class DocumentHistoryWidget extends React.Component<DocumentHistoryProps> {
  render(): JSX.Element {
    const { undoManager, timeline, onTimeTravel } = this.props;
    const events = timeline.getEvents({ limit: 50 });

    return (
      <div className='document-history-widget'>
        <div className='undo-controls'>
          <button
            onClick={() => undoManager.undo()}
            disabled={!undoManager.canUndo()}
          >
            Undo
          </button>
          <button
            onClick={() => undoManager.redo()}
            disabled={!undoManager.canRedo()}
          >
            Redo
          </button>
        </div>

        <div className='history-timeline'>
          <h3>Change History ({timeline.getEventCount()} events)</h3>
          <div className='timeline-list'>
            {events.map((event, index) => (
              <div
                key={event.id}
                className='timeline-event'
                onClick={() => onTimeTravel(index)}
              >
                <span className='event-time'>
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
                <span
                  className='event-agent'
                  style={{ color: event.agentColor }}
                >
                  {event.agentName}
                </span>
                <span className='event-type'>{event.type}</span>
                <span className='event-size'>{event.length} chars</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
}

export { DocumentHistoryWidget };
```

### 13.6 ConflictResolver (Manual Merge UI)

```typescript
// @theia/ideia/collaboration/conflict-resolver-widget.tsx
import * as React from 'react';
import { ConflictResolver, ManualConflict } from '@ideia/collaboration/conflict/resolution-ui';

interface ConflictResolverProps {
  conflictResolver: ConflictResolver;
  onResolve: (conflict: ManualConflict) => void;
}

interface ConflictResolverState {
  activeConflict: ManualConflict | null;
  mergedContent: string;
}

class ConflictResolverWidget extends React.Component<
  ConflictResolverProps,
  ConflictResolverState
> {
  constructor(props: ConflictResolverProps) {
    super(props);
    this.state = {
      activeConflict: null,
      mergedContent: ''
    };
  }

  componentDidMount(): void {
    this.checkForConflicts();
  }

  private checkForConflicts(): void {
    const unresolved = this.props.conflictResolver.getUnresolved();
    if (unresolved.length > 0) {
      this.setState({
        activeConflict: unresolved[0],
        mergedContent: this.buildDefaultMerge(unresolved[0])
      });
    }
  }

  private buildDefaultMerge(conflict: ManualConflict): string {
    // Simple merge: concatenate with separator
    return `${conflict.leftOption.content}\n// ---- merged ----\n${conflict.rightOption.content}`;
  }

  render(): JSX.Element {
    const { activeConflict } = this.state;

    if (!activeConflict) {
      return <div className='conflict-resolver no-conflicts'>No conflicts to resolve</div>;
    }

    return (
      <div className='conflict-resolver'>
        <h3>Resolve Conflict</h3>
        <p className='conflict-description'>{activeConflict.description}</p>

        <div className='conflict-sides'>
          <div className='conflict-side left'>
            <h4>{activeConflict.leftOption.authorName}</h4>
            <pre>{activeConflict.leftOption.content}</pre>
            <button onClick={() => this.acceptLeft()}>Accept Left</button>
          </div>

          <div className='conflict-side right'>
            <h4>{activeConflict.rightOption.authorName}</h4>
            <pre>{activeConflict.rightOption.content}</pre>
            <button onClick={() => this.acceptRight()}>Accept Right</button>
          </div>
        </div>

        <div className='conflict-merge'>
          <h4>Manual Merge</h4>
          <textarea
            value={this.state.mergedContent}
            onChange={e => this.setState({ mergedContent: e.target.value })}
            rows={10}
          />
          <button onClick={() => this.acceptMerge()}>Accept Merge</button>
        </div>
      </div>
    );
  }

  private acceptLeft(): void {
    const { activeConflict } = this.state;
    if (!activeConflict) return;
    this.props.conflictResolver.acceptLeft(activeConflict.id, 'local-user');
    this.props.onResolve({ ...activeConflict, status: 'accepted-left' });
    this.checkForConflicts();
  }

  private acceptRight(): void {
    const { activeConflict } = this.state;
    if (!activeConflict) return;
    this.props.conflictResolver.acceptRight(activeConflict.id, 'local-user');
    this.props.onResolve({ ...activeConflict, status: 'accepted-right' });
    this.checkForConflicts();
  }

  private acceptMerge(): void {
    const { activeConflict, mergedContent } = this.state;
    if (!activeConflict) return;
    this.props.conflictResolver.acceptMerge(activeConflict.id, mergedContent, 'local-user');
    this.props.onResolve({ ...activeConflict, status: 'merged' });
    this.checkForConflicts();
  }
}

export { ConflictResolverWidget };
```

### 13.7 Theia Contribution Registration

```typescript
// @theia/ideia/collaboration/ideia-collaboration-frontend-module.ts
import { ContainerModule, interfaces } from '@theia/core/shared/inversify';
import { WidgetFactory } from '@theia/core/lib/browser/widget-manager';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application';
import { CollaborationService, CollaborationServicePath } from './collaboration-service';
import { CollaborationFrontendContribution } from './collaboration-frontend-contribution';
import { AgentCollaborationWidget } from './agent-collaboration-widget';
import { DocumentHistoryWidget } from './document-history-widget';
import { ConflictResolverWidget } from './conflict-resolver-widget';

export default new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
  // Service
  bind(CollaborationService).toSelf().inSingletonScope();

  // Widget factories
  bind<WidgetFactory>(WidgetFactory).toDynamicValue(ctx => ({
    id: 'agent-collaboration',
    createWidget: () => ctx.container.get(AgentCollaborationWidget)
  }));

  bind<WidgetFactory>(WidgetFactory).toDynamicValue(ctx => ({
    id: 'document-history',
    createWidget: () => ctx.container.get(DocumentHistoryWidget)
  }));

  bind<WidgetFactory>(WidgetFactory).toDynamicValue(ctx => ({
    id: 'conflict-resolver',
    createWidget: () => ctx.container.get(ConflictResolverWidget)
  }));

  // Frontend contribution (menus, commands, keybindings)
  bind<FrontendApplicationContribution>(FrontendApplicationContribution)
    .to(CollaborationFrontendContribution).inSingletonScope();
});
```

```typescript
// @theia/ideia/collaboration/collaboration-service.ts
import { injectable, inject } from '@theia/core/shared/inversify';
import * as Y from 'yjs';

@injectable()
class CollaborationService {
  private activeSessions: Map<string, CollaborationSession>;

  constructor() {
    this.activeSessions = new Map();
  }

  async joinDocument(
    documentId: string,
    userId: string,
    userDisplayName: string,
    userColor: string
  ): Promise<CollaborationSession> {
    const ydoc = new Y.Doc();
    const provider = new YjsDocumentProvider(ydoc, {
      url: 'wss://collab.ideia.dev/ws',
      documentId,
      token: await this.getAuthToken(userId, documentId),
      reconnectInterval: 1000,
      maxReconnectAttempts: 10
    });

    const awareness = new AwarenessManagerImpl(ydoc, {
      id: userId,
      name: userDisplayName,
      color: userColor,
      isAgent: false
    });

    provider.connect();

    const session: CollaborationSession = {
      documentId,
      ydoc,
      provider,
      awareness,
      joinedAt: Date.now()
    };

    this.activeSessions.set(documentId, session);
    return session;
  }

  async leaveDocument(documentId: string): Promise<void> {
    const session = this.activeSessions.get(documentId);
    if (!session) return;

    session.awareness.destroy();
    session.provider.destroy();
    session.ydoc.destroy();
    this.activeSessions.delete(documentId);
  }

  private async getAuthToken(userId: string, documentId: string): Promise<string> {
    // Obtain JWT from IDEIA auth service
    return 'jwt-token-placeholder';
  }
}

interface CollaborationSession {
  documentId: string;
  ydoc: Y.Doc;
  provider: YjsDocumentProvider;
  awareness: AwarenessManagerImpl;
  joinedAt: number;
}

export { CollaborationService, CollaborationSession };
```

---

## 14. Implementation Roadmap

### 14.1 Phase Overview

| Phase | Name | Duration | Effort | Key Deliverable |
|-------|------|----------|--------|-----------------|
| P1 | Core Sync | 4 weeks | 120h | Yjs + Monaco + WebSocket sync working |
| P2 | Agent Collaboration | 3 weeks | 80h | Agent inline editing, wait-for-input, decorations |
| P3 | Multi-Agent & History | 3 weeks | 80h | Agent coordination, timeline, time-travel |
| P4 | Production Hardening | 4 weeks | 120h | Security, perf, sharding, persistence, conflict UI |

### 14.2 Phase 1: Core Sync (Weeks 1-4)

| Week | Tasks | Deliverables |
|------|-------|-------------|
| W1 | Y.Doc setup, y-monaco integration, MonacoBinding | Single-file collaborative editing POC |
| W2 | WebSocket provider (YjsDocumentProvider), awareness protocol | Two users see each other's cursors and edits |
| W3 | NATS provider, sync protocol, persistence (PostgreSQL) | Multi-user editing with persistence |
| W4 | Sync throttle, compression, offline support, reconnection | Robust sync under variable network conditions |

**Risks:** y-monaco compatibility with Theia's Monaco version. Mitigation: verify version alignment early.

**Success Metrics:**
- 2+ users editing same file with <100ms sync latency
- Awareness updates at 30fps
- Offline edits sync correctly on reconnect
- Y.Doc persists and restores correctly

### 14.3 Phase 2: Agent Collaboration (Weeks 5-7)

| Week | Tasks | Deliverables |
|------|-------|-------------|
| W5 | Agent inline editor, AgentEdit protocol, decoration system | Agent writes code visible in human's editor |
| W6 | Wait-for-input protocol, decision points, suggestion model | Agent pauses and waits for human input |
| W7 | Agent collaboration widget, suggestion accept/reject UI | Human can accept/reject agent changes inline |

**Risks:** Agent edits may conflict with human typing. Mitigation: CRDT handles content, lock protocol for logical sections.

**Success Metrics:**
- Agent edits visible in real time (<500ms)
- Human can accept/reject suggestions in <2 clicks
- Wait-for-input resolves in <30s average

### 14.4 Phase 3: Multi-Agent & History (Weeks 8-10)

| Week | Tasks | Deliverables |
|------|-------|-------------|
| W8 | Agent coordination protocol, lock management, coordinator | Multiple agents edit same file with locks |
| W9 | Disagreement resolution, conflict detection, conflict resolver UI | Agents can disagree, human resolves |
| W10 | Document timeline, time-travel, snapshot/revert | Full history browsing and time-travel |

**Risks:** Time-travel with large documents may be slow. Mitigation: snapshot-based approach with diff computation.

**Success Metrics:**
- 5+ agents editing concurrently with <200ms sync
- Conflict detection within 1s of conflicting edits
- Time-travel restore in <500ms for 10K-line files

### 14.5 Phase 4: Production Hardening (Weeks 11-14)

| Week | Tasks | Deliverables |
|------|-------|-------------|
| W11 | Security: JWT auth, WSS, rate limiting, message validation | All sync channels authenticated and encrypted |
| W12 | Performance: sharding, memory management, GC, load testing | 100K-line files, 16 concurrent users |
| W13 | Monitoring: sync latency metrics, awareness health, audit trail | Dashboards for collaboration health |
| W14 | Documentation, testing (load, chaos, edge cases), release | Production-ready collaborative editing system |

**Risks:** Load testing reveals bottlenecks. Mitigation: horizontal WS scaling, NATS JetStream for message relay.

**Success Metrics:**
- P99 sync latency <200ms for 16 users
- Document sharding handles 100K+ line files
- Zero data loss on reconnection
- Audit trail captures all conflict resolutions

### 14.6 Total Effort Summary

| Resource | Hours |
|----------|-------|
| Backend (NATS, persistence, sync protocol) | 140h |
| Frontend (Monaco, y-monaco, widgets, decorations) | 120h |
| Agent integration (inline editing, coordination) | 80h |
| Security, testing, documentation | 60h |
| **Total** | **400h** |

### 14.7 Dependencies

| Dependency | Impact |
|------------|--------|
| NATS JetStream (F1) | Sync provider requires NATS |
| y-monaco npm package | Monaco<->Yjs binding |
| Theia Editor API | Editor widget integration |
| Agent Runtime (IDEIA) | Agent can use Y.Doc to write |
| PostgreSQL + pgvector | Document persistence |

---

## 15. Conexoes

| Estudo | Relacao |
|--------|---------|
| **S22 -- Colaboracao Tempo Real** | Estudo mae: CRDT, Yjs, WebRTC, OT, Theia Cloud. S62 aprofunda especificamente CRDT colaborativo com codigo, agentes e historia |
| **S34 -- Theia Editor & Widget** | Editor Monaco base para binding y-monaco. Widget architecture para CollaborationWidget, HistoryWidget, ConflictResolver |
| **S43 -- Theia Views & Widgets** | Colaboration panel como nova view, factories, open handlers |
| **S47 -- Theia AI Agents** | Agentes como extensoes Theia. S62 adiciona capacidade de agentes editarem documentos compartilhados |
| **S51 -- Parallel Agents** | Multiplos agentes executando em paralelo. S62 fornece o mecanismo de edicao concorrente para esses agentes |
| **S55 -- Resilience & Self-Healing** | Circuit breaker para WebSocket, retry com backoff, state recovery em Y.Doc |
| **S58 -- Data Strategy** | Document versioning, persistence layer para CRDT state |
| **S63 -- Agent Debugger** | Time-travel debugging sobre Y.Doc history. Debugger pode navegar pelo estado do documento em qualquer ponto |

### 15.1 Integracao com Theia-Specific Features

| Theia Feature | S62 Integration |
|---------------|-----------------|
| `@theia/editor` (EditorManager) | Open file -> create Y.Doc + MonacoBinding |
| `@theia/workspace` | Track open files per workspace for collaboration |
| `@theia/core` Command System | `/collab.join`, `/collab.leave`, `/collab.snapshot` |
| `@theia/core` PreferenceService | Collab prefs (sync rate, colors, show cursors) |
| `@theia/monaco` MonacoTextModelService | Bridge between Theia text model and Y.Text |
| `@theia/navigator` | Show collaboration indicators in file tree |
| `@theia/markers` | Show conflict markers from collaborative editing |
| `@theia/status-bar` | Connection status, active collaborators count |

### 15.2 Integracao com IDEIA-Specific Components

| IDEIA Component | S62 Integration |
|-----------------|-----------------|
| `@ideia/cli` context engine | Collab session metadata in agent context |
| `@ideia/agent-runtime` | Agent writes to Y.Text instead of filesystem |
| `@ideia/event-bus` | Collab events on NATS (sync, awareness, conflicts) |
| `@ideia/policy-engine` | Document access control policies |
| `@ideia/audit-trail` | Conflict resolution audit entries |
| `@ideia/output-validator` | Validate agent edits before applying to shared doc |
| `@ideia/memory-hierarchy` | Store collab session state in working memory |

---

## Referencias

1. Yjs Documentation. yjs.dev
2. y-monaco: Monaco Editor binding for Yjs. github.com/yjs/y-monaco
3. YATA CRDT Algorithm. doi.org/10.1145/2957273
4. Kleppmann, M. "CRDTs: The Hard Parts." 2020.
5. Martin Kleppmann. "Designing Data-Intensive Applications." Chapter: Replication.
6. y-indexeddb: IndexedDB persistence for Yjs. github.com/yjs/y-indexeddb
7. y-websocket: WebSocket provider for Yjs. github.com/yjs/y-websocket
8. Monaco Editor API. microsoft.github.io/monaco-editor
9. Theia AI Framework. theia-ide.org/docs/ai
10. NATS JetStream. docs.nats.io/nats-concepts/jetstream
