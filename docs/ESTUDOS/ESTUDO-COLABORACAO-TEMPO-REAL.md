# Estudo de Colaboração em Tempo Real — Projeto IDEIA

> **Data:** 2026-07-18
> **Versão:** 1.0
> **Propósito:** Definir a arquitetura, tecnologias e padrões para colaboração em tempo real
> no ecossistema IDEIA, abrangendo edição multi-cursor, colaboração entre agentes AI,
> sessões compartilhadas via Theia Cloud e infraestrutura de comunicação via NATS.
> **Autoria:** Equipe de Arquitetura IDEIA

---

## Sumário

1. [Tecnologias de Colaboração](#1-tecnologias-de-colaboração)
   - 1.1 WebRTC
   - 1.2 WebSocket
   - 1.3 CRDTs (Conflict-free Replicated Data Types)
   - 1.4 OT (Operational Transformation)
   - 1.5 NATS JetStream
   - 1.6 Matriz Comparativa
2. [Multi-cursor e Edição Colaborativa](#2-multi-cursor-e-edição-colaborativa)
   - 2.1 Yjs + Monaco Editor
   - 2.2 Awareness Protocol
   - 2.3 Estratégias de Resolução de Conflitos
   - 2.4 Undo/Redo Colaborativo
   - 2.5 Arquitetura de Edição
3. [Colaboração entre Agentes](#3-colaboração-entre-agentes)
   - 3.1 Shared Blackboard / Message Pool
   - 3.2 Agent Handoff Protocol
   - 3.3 Session Sharing
   - 3.4 Debate and Consensus Engine
4. [Theia Cloud Collaboration](#4-theia-cloud-collaboration)
   - 4.1 Theia Blueprint Multi-instance
   - 4.2 Theia Cloud
   - 4.3 Workspace Isolation vs Sharing
   - 4.4 Permissions
5. [Arquitetura de Colaboração](#5-arquitetura-de-colaboração)
   - 5.1 Pub/Sub via NATS
   - 5.2 CRDT Backend Persistente
   - 5.3 Presença e Heartbeats
   - 5.4 Replay de Sessão
   - 5.5 Diagrama de Arquitetura Completo
6. [Casos de Uso](#6-casos-de-uso)
   - 6.1 Pair Programming com Agente AI
   - 6.2 Code Review Colaborativo
   - 6.3 Debugging Compartilhado
   - 6.4 Demo/Presentation Mode
   - 6.5 Classroom/Mentoring

---

## 1. Tecnologias de Colaboração

### 1.1 WebRTC

**Visão Geral:**
WebRTC (Web Real-Time Communication) é um padrão W3C/IETF para comunicação peer-to-peer de áudio, vídeo e dados entre navegadores sem intermediários.

**Aplicação em IDEIA:**

```
+---------+         +---------+
| Peer A  |<------->| Peer B  |
| (Dev 1) |  WebRTC | (Dev 2) |
+----+----+  Data   +----+----+
     |     Channel       |
     |                   |
     |    +---------+    |
     +----+ STUN/   +----+
          | TURN    |
          | Server  |
          +---------+
```

**Casos de uso para IDEIA:**
- **Comunicação direta entre pares** — baixa latência para operações de edição
- **Streaming de tela** — demo/presentation mode
- **Screen share** — debugging colaborativo
- **Voice/video chat** — comunicação entre desenvolvedores

**Limitações:**
- NAT traversal complexa (requer STUN/TURN)
- Escalabilidade: O(n^2) conexões em grupo grande
- Sem persistência — dados perdidos se peer desconecta
- Complexidade de implementação

**Bibliotecas:**

| Biblioteca | Tipo | Vantagens | Desvantagens |
|------------|------|-----------|--------------|
| PeerJS | Wrapper WebRTC | API simples, fallback TURN | Projeto semi-inativo |
| simple-peer | Wrapper WebRTC | Leve (~20KB), bem testado | Sem suporte a grupos built-in |
| LiveKit | WebRTC + SFU | Escalável, gravação, transcript | Infraestrutura dedicada |
| MediaSoup | SFU (Selective Forwarding) | Altamente escalável, modular | Complexo de configurar |

**Recomendação:** Usar WebRTC apenas para comunicação direta (áudio/video/screen share). Para dados de edição, usar WebSocket + CRDT.

### 1.2 WebSocket

**Visão Geral:**
WebSocket fornece canal de comunicação full-duplex sobre TCP, persistente entre cliente e servidor.

**Aplicação em IDEIA:**

```
+---------+     WebSocket      +---------+     WebSocket      +---------+
| Client  |<------------------>| Server  |<------------------>| Client  |
|   A     |    (WSS + NATS)    | (Hub)   |    (WSS + NATS)    |   B     |
+---------+                    +----+----+                    +---------+
                                     |
                                     | NATS JetStream
                                     |
                            +--------+--------+
                            |  NATS Cluster   |
                            |  (Persistencia) |
                            +-----------------+
```

**Vantagens para IDEIA:**
- Baixa latencia (TCP, sem overhead HTTP)
- NATS ja adotado como event bus — integracao natural
- Conexao persistente com reconexao automatica
- Broadcast eficiente via servidor central

**Implementacao no ecossistema atual:**

```typescript
class CollaborationSocket {
  private nc: NatsConnection;
  private subscriptions: Map<string, Subscription> = new Map();
  private presence: PresenceManager;

  constructor(nc: NatsConnection) {
    this.nc = nc;
    this.presence = new PresenceManager(nc);
  }

  async joinSession(sessionId: string, userId: string, onEvent: (event: CollabEvent) => void) {
    const sub = this.nc.subscribe(`collab.${sessionId}.>`, {
      callback: (err, msg) => {
        if (err) return;
        const event = decodeCollabEvent(msg.data);
        onEvent(event);
      },
    });
    this.subscriptions.set(sessionId, sub);
    await this.presence.announce(sessionId, userId, 'online');
  }

  async publish(sessionId: string, event: CollabEvent) {
    await this.nc.publish(`collab.${sessionId}.${event.type}`, encodeCollabEvent(event));
  }

  async leaveSession(sessionId: string) {
    const sub = this.subscriptions.get(sessionId);
    if (sub) { await sub.unsubscribe(); this.subscriptions.delete(sessionId); }
    await this.presence.announce(sessionId, '', 'offline');
  }
}
```

### 1.3 CRDTs (Conflict-free Replicated Data Types)

**Visao Geral:**
CRDTs sao estruturas de dados que permitem que multiplos peers editem concorrentemente sem coordenacao central, garantindo consistencia eventual sem conflitos.

**Por que CRDT para IDEIA:**
- Sem necessidade de servidor central para resolucao de conflitos
- Funciona offline (edicao local, sincronizacao posterior)
- Resolucao automatica de conflitos (semantica matematica)
- Escalabilidade horizontal

**Principais implementacoes:**

| Biblioteca | Linguagem | Algoritmo | Tamanho | Destaque |
|------------|-----------|-----------|---------|----------|
| **Yjs** | JS/TS | YATA CRDT | ~30KB | Performance, ecossistema rico |
| **Automerge** | Rust/JS/WASM | RGA CRDT | ~50KB | Formato de coluna, WASM |
| **Loro** | Rust/JS | Fugue | ~50KB | Rich text, historico temporal |
| **TinyBase** | JS | CRDT proprio | ~20KB | Foco em dados estruturados |

**Yjs vs Automerge:**

| Caracteristica | Yjs | Automerge |
|----------------|-----|-----------|
| Performance (1000 ops) | ~2ms | ~15ms |
| Bundle size | ~30KB | ~70KB (WASM) |
| GC | Automatico | Manual |
| Integracao Monaco | Excelente | Bridge |
| Provider WebSocket | y-websocket | automerge-repo |
| Undo/Redo | Nativo | Via patches |
| Rich Text | Sim | Sim |
| Armazenamento | IndexedDB, SQLite | IndexedDB, SQLite |
| Maturidade | Alta | Media |

**Recomendacao: Yjs** como CRDT primario para IDEIA, com bridge para Automerge em dados estruturados complexos.

### 1.4 OT (Operational Transformation)

OT e a tecnologia usada pelo Google Docs, Etherpad e ShareJS.

**Vantagens:**
- Madura e bem compreendida
- Google Docs-proven (escala global)
- Eficiente para texto

**Desvantagens para IDEIA:**
- Requer servidor central para transformacao
- Complexidade O(n^2) em grupos grandes
- Offline: suporte limitado
- Historico complexo de gerenciar
- Operacoes dependem de confirmacao do servidor

```
           OT Model
  +---------+          +---------+          +---------+
  | Peer A  |---op1-->| Server  |<--op2---| Peer B  |
  |         |<--ack---+ (OT     |---ack-->|         |
  |         |          | Engine) |          |         |
  | op1 +   |          +----+----+          | op2 +   |
  | op2'    |               |               | op1'    |
  +---------+          Aplica OT            +---------+
                       transforma op1 e op2
                       para ordem consistente
```

**Conclusao:** OT nao e recomendado para IDEIA. CRDT e superior para o caso de uso.

### 1.5 NATS JetStream

NATS JetStream ja e a espinha dorsal do ecossistema IDEIA. Para colaboracao:

```
+------------------------------------------------------------------+
|                NATS JetStream — Camada de Colaboracao            |
+------------------------------------------------------------------+
|  Stream: collab.edits.{sessionId}                                 |
|    +-- Todas operacoes de edicao (CRDT ops)                      |
|    +-- Retencao: 7 dias                                          |
|    +-- Deduplicacao: window 5s                                   |
|                                                                   |
|  Stream: collab.presence.{sessionId}                              |
|    +-- Heartbeats de presenca (1/min)                            |
|    +-- Retencao: 1h (KV store)                                   |
|                                                                   |
|  Stream: collab.awareness.{sessionId}                             |
|    +-- Cursor positions, selecoes, estado                        |
|    +-- Retencao: 1h (last value)                                 |
|                                                                   |
|  Stream: collab.agent.{sessionId}                                 |
|    +-- Mensagens de agentes (intencoes, resultados)              |
|    +-- Retencao: 30 dias (replay e audit)                        |
|                                                                   |
|  Stream: collab.system.{sessionId}                                |
|    +-- Eventos de sistema (join/leave/permissions)               |
|    +-- Retencao: 24h                                              |
|                                                                   |
|  KV: collab.state.{sessionId}                                     |
|    +-- Estado atual do CRDT document (snapshot)                  |
|    +-- Atualizado a cada 30s ou N ops                           |
+------------------------------------------------------------------+
```

**Configuracao JetStream para colaboracao:**

```typescript
const COLLAB_STREAMS = {
  edits: {
    name: 'collab-edits',
    subjects: ['collab.edits.>'],
    retention: RetentionPolicy.Limits,
    maxAge: 7 * 24 * 60 * 60 * 1_000_000_000, // 7 dias
    maxMsgsPerSubject: 100_000,
    storage: StorageType.File,
    deduplicationWindow: 5_000_000_000, // 5s
  },
  presence: {
    name: 'collab-presence',
    subjects: ['collab.presence.>'],
    retention: RetentionPolicy.Interest,
    maxAge: 1 * 60 * 60 * 1_000_000_000, // 1 hora
    storage: StorageType.Memory,
  },
  agent: {
    name: 'collab-agent',
    subjects: ['collab.agent.>'],
    retention: RetentionPolicy.Limits,
    maxAge: 30 * 24 * 60 * 60 * 1_000_000_000, // 30 dias
    storage: StorageType.File,
    maxMsgsPerSubject: 10_000,
  },
};
```

### 1.6 Matriz Comparativa

| Tecnologia | Caso de Uso IDEIA | Latencia | Offline | Escalabilidade | Complexidade | Recomendacao |
|------------|-------------------|----------|---------|----------------|-------------|--------------|
| **WebRTC** | A/V, screen share | <100ms | Nao | Media (SFU) | Alta | Uso especifico |
| **WebSocket** | Transporte de eventos | <50ms | Nao (fallback) | Alta (servidor) | Baixa | **Primario** |
| **Yjs (CRDT)** | Edicao de codigo | <10ms | Sim | Muito alta | Media | **Primario** |
| **Automerge** | Dados estruturados | <50ms | Sim | Alta | Media | Complementar |
| **OT** | Edicao de texto | <100ms | Limitado | Media | Muito alta | Nao usar |
| **NATS JetStream** | Persistencia + Pub/Sub | <5ms | N/A | Muito alta | Media | **Ja adotado** |

---

## 2. Multi-cursor e Edicao Colaborativa

### 2.1 Yjs + Monaco Editor

A integracao Yjs + Monaco Editor e o nucleo da edicao colaborativa da IDEIA.

```
+--------------------------------------------------------------------+
|                    ARQUITETURA DE EDICAO                            |
+--------------------------------------------------------------------+
|  +-------------------+         +-------------------+               |
|  |  CLIENTE A        |         |  CLIENTE B        |               |
|  |  +-------------+  |         |  +-------------+  |               |
|  |  | Monaco      |  |         |  | Monaco      |  |               |
|  |  | Editor      |  |         |  | Editor      |  |               |
|  |  | y-monaco    |  |         |  | y-monaco    |  |               |
|  |  +------+------+  |         |  +------+------+  |               |
|  |         |         |         |         |         |               |
|  |  +------v------+  |         |  +------v------+  |               |
|  |  | Y.Doc       |  |         |  | Y.Doc       |  |               |
|  |  | (local)     |  |         |  | (local)     |  |               |
|  |  +------+------+  |         |  +------+------+  |               |
|  |         |         |         |         |         |               |
|  |  +------v------+  |         |  +------v------+  |               |
|  |  | Sync Proto  |  |         |  | Sync Proto  |  |               |
|  |  +------+------+  |         |  +------+------+  |               |
|  |         |         |         |         |         |               |
|  |  +------v------+  |         |  +------v------+  |               |
|  |  | Awareness   |  |         |  | Awareness   |  |               |
|  |  +------+------+  |         |  +------+------+  |               |
|  +---------+---------+         +---------+---------+               |
|            |                             |                         |
|            |       NATS JetStream        |                         |
|            |   collab.edits.sessao_1    |                         |
|            +-------------+--------------+                         |
|                          |                                         |
|  +-----------------------v-----------------------------------+   |
|  |                    NATS Cluster                            |   |
|  |  +---------------------------------------------------+   |   |
|  |  | JetStream: collab.edits.{sessionId}                |   |   |
|  |  | - Todas operacoes Yjs (Step 1, Step 2...)          |   |   |
|  |  | - Retencao: 7 dias (sync de novos participantes)   |   |   |
|  |  | - Dedup window: 5s                                 |   |   |
|  |  +---------------------------------------------------+   |   |
|  |  +---------------------------------------------------+   |   |
|  |  | KV Store: collab.state.{sessionId}                |   |   |
|  |  | - Snapshot do estado Yjs a cada 30s               |   |   |
|  |  | - Novo participante: snapshot + delta             |   |   |
|  |  +---------------------------------------------------+   |   |
|  +-----------------------------------------------------------+   |
|                                                                   |
|  +-----------------------------------------------------------+   |
|  | BACKEND PERSISTENTE                                        |   |
|  | +-------------+ +----------+ +----------+                 |   |
|  | | SQLite+FTS5 | | DuckDB   | | MinIO    |                 |   |
|  | | (CRDT)      | |(analytics)| |(snapshots)|                 |   |
|  | +-------------+ +----------+ +----------+                 |   |
|  +-----------------------------------------------------------+   |
+--------------------------------------------------------------------+
```

**Implementacao da integracao:**

```typescript
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import { editor } from 'monaco-editor';

class CollaborativeEditor {
  private doc: Y.Doc;
  private provider: WebsocketProvider;
  private binding: MonacoBinding;
  private awareness: Awareness;

  constructor(
    private editor: editor.IStandaloneCodeEditor,
    sessionId: string,
    userId: string,
    userName: string,
    userColor: string
  ) {
    this.doc = new Y.Doc();

    this.provider = new WebsocketProvider(
      `wss://collab.ideia.dev/ws`,
      sessionId,
      this.doc,
      { connect: false }
    );

    this.awareness = this.provider.awareness;
    this.awareness.setLocalStateField('user', {
      name: userName,
      color: userColor,
      id: userId,
    });

    const yText = this.doc.getText('code');
    this.binding = new MonacoBinding(
      yText,
      this.editor.getModel()!,
      new Set([this.editor]),
      this.awareness
    );

    this.provider.connect();
  }

  destroy() {
    this.binding.destroy();
    this.provider.disconnect();
    this.doc.destroy();
  }
}
```

**Provedor NATS customizado para Yjs:**

```typescript
class YjsNatsProvider {
  private doc: Y.Doc;
  private nc: NatsConnection;
  private sub: Subscription;
  private sessionId: string;

  constructor(doc: Y.Doc, nc: NatsConnection, sessionId: string) {
    this.doc = doc;
    this.nc = nc;
    this.sessionId = sessionId;

    this.sub = nc.subscribe(`collab.edits.${sessionId}`, {
      callback: (err, msg) => {
        if (err) return;
        const update = Y.decodeUpdate(msg.data);
        Y.applyUpdate(this.doc, update);
      },
    });

    this.doc.on('update', (update: Uint8Array, origin: any) => {
      if (origin !== this) return;
      nc.publish(`collab.edits.${sessionId}`, Y.encodeStateAsUpdate(this.doc));
    });
  }

  destroy() {
    this.sub.unsubscribe();
    this.doc.off('update');
  }
}
```

### 2.2 Awareness Protocol

O protocolo de awareness permite que participantes vejam quem mais esta editando, cursores e selecoes.

**Estrutura de awareness:**

```typescript
interface AwarenessState {
  user: {
    id: string;
    name: string;
    color: string;        // Cor do cursor (hex)
    avatar?: string;
    role: 'owner' | 'editor' | 'viewer' | 'agent';
  };
  cursor: {
    position: { lineNumber: number; column: number } | null;
    selection: {
      startLineNumber: number; startColumn: number;
      endLineNumber: number; endColumn: number;
    } | null;
  };
  document: {
    filePath: string | null;
    status: 'idle' | 'typing' | 'selecting' | 'scrolling';
  };
  activity: {
    lastActive: number;
    isActive: boolean;
  };
  agent?: {
    currentTask: string;
    confidence: number;
    autonomyLevel: 'supervised' | 'assisted' | 'autonomous';
  };
}
```

**Renderizacao de cursores remotos no Monaco:**

```typescript
function applyRemoteCursors(editor: editor.IStandaloneCodeEditor, awareness: Awareness) {
  const decorations: string[] = [];

  awareness.getStates().forEach((state, clientId) => {
    if (clientId === awareness.clientID) return;

    const user = state.user;
    const cursor = state.cursor;

    if (cursor?.position) {
      const cursorDecoration = editor.deltaDecorations([], [{
        range: new monaco.Range(
          cursor.position.lineNumber, cursor.position.column,
          cursor.position.lineNumber, cursor.position.column + 1
        ),
        options: {
          beforeContentClassName: 'remote-cursor',
          hoverMessage: {
            value: `**${user.name}** ${user.role === 'agent' ? 'IA' : ''}`,
          },
        },
      }]);
      decorations.push(...cursorDecoration);
    }

    if (cursor?.selection) {
      const selectionDecoration = editor.deltaDecorations([], [{
        range: new monaco.Range(
          cursor.selection.startLineNumber, cursor.selection.startColumn,
          cursor.selection.endLineNumber, cursor.selection.endColumn
        ),
        options: {
          inlineClassName: 'remote-selection',
          inlineClassNameAffectsLetterSpacing: true,
        },
      }]);
      decorations.push(...selectionDecoration);
    }
  });

  return decorations;
}
```

**CSS para cursores remotos:**

```css
.remote-cursor { position: relative; animation: blink 1s step-end infinite; }
.remote-selection { opacity: 0.3; border-radius: 2px; }

@keyframes blink {
  50% { opacity: 0; }
}

.remote-selection-before-FF6B6B { background: #FF6B6B40; }
.remote-selection-before-4ECDC4 { background: #4ECDC440; }
.remote-selection-before-45B7D1 { background: #45B7D140; }
.remote-selection-before-96CEB4 { background: #96CEB440; }
.remote-selection-before-FFEAA7 { background: #FFEAA740; }
.remote-selection-before-DDA0DD { background: #DDA0DD40; }
.remote-selection-before-98D8C8 { background: #98D8C840; }
.remote-selection-before-F7DC6F { background: #F7DC6F40; }
```

### 2.3 Estrategias de Resolucao de Conflitos

CRDTs resolvem conflitos automaticamente, mas a experiencia do usuario precisa considerar:

**Tipos de conflito e tratamento:**

| Tipo de Conflito | Exemplo | Resolucao CRDT | Experiencia do Usuario |
|-----------------|---------|----------------|------------------------|
| Insercao concorrente | Dois usuarios inserem na mesma linha | YATA: ordena por ID (antes/depois) | Natural - texto aparece em ordem |
| Edicao concorrente | Editar mesma palavra simultaneamente | Ultimo caractere vence (RGA) | Palavra final mesclada |
| Delecao concorrente | Um apaga, outro edita a mesma area | Delete vence sobre insert | O que foi apagado some |
| Reestruturacao | Mover funcao enquanto outro edita | Operacoes estruturais sao atomicas | Requer lock semantico |
| Conflito de nome | Renomear variavel concorrentemente | Duas variaveis sao criadas | Pode causar confusao |

**Estrategias de mitigacao:**

```typescript
// 1. LOCK SEMANTICO — para operacoes que nao podem ser concorrentes
interface SemanticLock {
  resourceId: string;
  lockType: 'refactor' | 'rename' | 'move' | 'delete';
  userId: string;
  acquiredAt: number;
  ttl: number;
  description: string;
}

class LockManager {
  private locks: Map<string, SemanticLock> = new Map();
  private nc: NatsConnection;

  constructor(nc: NatsConnection) {
    this.nc = nc;
    nc.subscribe('collab.locks.>', {
      callback: (err, msg) => {
        const lock: SemanticLock = JSON.parse(msg.data);
        this.locks.set(lock.resourceId, lock);
      },
    });
  }

  async acquireLock(
    resourceId: string, userId: string,
    type: SemanticLock['lockType'], description: string
  ): Promise<boolean> {
    const existing = this.locks.get(resourceId);
    if (existing && existing.userId !== userId &&
        Date.now() - existing.acquiredAt < existing.ttl) {
      return false;
    }
    const lock: SemanticLock = { resourceId, lockType: type, userId,
      acquiredAt: Date.now(), ttl: 30_000, description };
    await this.nc.publish(`collab.locks.${resourceId}`, JSON.stringify(lock));
    this.locks.set(resourceId, lock);
    return true;
  }

  async releaseLock(resourceId: string) {
    this.locks.delete(resourceId);
    await this.nc.publish(`collab.locks.${resourceId}`, JSON.stringify({ release: true }));
  }
}

// 2. CONFLICT RESOLUTION UI
function ConflictResolutionDialog({ conflicts }: { conflicts: Conflict[] }) {
  return (
    <Dialog open>
      <DialogHeader>
        <DialogTitle>Conflito de Edicao</DialogTitle>
        <DialogDescription>
          Dois usuarios modificaram o mesmo trecho simultaneamente.
          Escolha qual versao manter:
        </DialogDescription>
      </DialogHeader>
      <div className="flex gap-4">
        {conflicts.map((conflict) => (
          <div key={conflict.userId} className="flex-1 rounded border p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-3 w-3 rounded-full"
                style={{ background: conflict.userColor }} />
              <span className="font-medium">{conflict.userName}</span>
            </div>
            <pre className="text-sm bg-muted p-2 rounded">{conflict.content}</pre>
            <Button className="mt-2" onClick={() => conflict.resolve(conflict.content)}>
              Usar esta versao
            </Button>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
```

### 2.4 Undo/Redo Colaborativo

**Estrategia IDEIA: Undo semantico por usuario**

```typescript
class CollaborativeUndoManager {
  private undoManagers: Map<string, Y.UndoManager> = new Map();
  private doc: Y.Doc;

  constructor(doc: Y.Doc) { this.doc = doc; }

  registerUser(userId: string, yText: Y.Text) {
    const um = new Y.UndoManager(yText, {
      trackedOrigins: new Set([userId]),
      captureTimeout: 500,
    });
    this.undoManagers.set(userId, um);
  }

  undo(userId: string) { this.undoManagers.get(userId)?.undo(); }
  redo(userId: string) { this.undoManagers.get(userId)?.redo(); }

  undoGlobal() {
    for (const um of this.undoManagers.values()) {
      if (um.undoStack.length > 0) { um.undo(); return; }
    }
  }
}
```

**UX do Undo colaborativo:**

```
+------------------------------------------------+
|  Historico de Operacoes                         |
|  +----------------------------------------+     |
|  | Joao: Renomeou getUser()               |     |
|  | Maria: Adicionou validacao             |<----+ Undo
|  | Joao: Moveu arquivo types.ts          |     |
|  | Maria: Inseriu linha 42-45            |     |
|  +----------------------------------------+     |
|  [Undo Joao]  [Undo Maria]  [Undo Global]      |
+------------------------------------------------+
```

---

## 3. Colaboracao entre Agentes

### 3.1 Shared Blackboard / Message Pool

Agentes da IDEIA colaboram atraves de um **blackboard compartilhado** — espaco de memoria onde agentes publicam resultados, solicitacoes e estado.

```
+-----------------------------------------------------------------------+
|                      SHARED BLACKBOARD IDEIA                          |
+-----------------------------------------------------------------------+
|  +-----------+  +-----------+  +-----------+  +-----------+          |
|  |  Analyst  |  | Architect |  |Programmer |  |  Reviewer |          |
|  +-----+-----+  +-----+-----+  +-----+-----+  +-----+-----+          |
|        |              |              |              |                  |
|        v              v              v              v                  |
|  +----------------------------------------------------------------+   |
|  |                    NATS JetStream — Blackboard                  |   |
|  |  Stream: blackboard.{sessionId}.analysis                       |   |
|  |    msg: { agent: 'analyst', type: 'requirement', data }        |   |
|  |  Stream: blackboard.{sessionId}.architecture                   |   |
|  |    msg: { agent: 'architect', type: 'decision', data }         |   |
|  |  Stream: blackboard.{sessionId}.implementation                 |   |
|  |    msg: { agent: 'programmer', type: 'code', data }            |   |
|  |  Stream: blackboard.{sessionId}.review                         |   |
|  |    msg: { agent: 'reviewer', type: 'feedback', data }          |   |
|  |  Stream: blackboard.{sessionId}.coordinator                    |   |
|  |    msg: { type: 'task_assignment', 'conflict', 'merge' }       |   |
|  +----------------------------------------------------------------+   |
|  +----------------------------------------------------------------+   |
|  |  KV Store: blackboard.context.{sessionId}                      |   |
|  |  - Contexto compartilhado (requisitos, decisoes, rationale)    |   |
|  +----------------------------------------------------------------+   |
+-----------------------------------------------------------------------+
```

**Estrutura da mensagem do blackboard:**

```typescript
interface BlackboardMessage {
  id: string;
  sessionId: string;
  agentId: string;
  agentRole: 'analyst' | 'architect' | 'programmer' | 'reviewer' | 'tester' | 'devops';
  timestamp: number;
  type: 'observation' | 'decision' | 'question' | 'result' | 'error' | 'request';
  priority: 'low' | 'medium' | 'high' | 'critical';
  content: {
    title: string;
    description: string;
    data?: any;
    references?: string[];
    decisions?: Decision[];
    alternatives?: Alternative[];
  };
  status: 'draft' | 'published' | 'acknowledged' | 'resolved' | 'superseded';
  expiresAt?: number;
}
```

### 3.2 Agent Handoff Protocol

Quando um agente precisa passar o controle para outro:

```
+----------+         +----------+         +----------+
| Analyst  |         |Architect |         |Programmer|
+-----+----+         +-----+----+         +-----+----+
      |                    |                    |
      |  Handoff Request   |                    |
      |------------------>|                     |
      |  {tipo: 'handoff',|                     |
      |   de: 'analyst',  |                     |
      |   para: 'architect',                    |
      |   contexto: {...}} |                     |
      |                    |  Accept Handoff    |
      |                    |------------------>|
      |                    |  {status: 'accept'}|
      |       Ack          |                    |
      |<-------------------|                    |
      |                    |   Result (codigo)  |
      |                    |<-------------------|
```

**Implementacao do handoff:**

```typescript
interface HandoffRequest {
  type: 'handoff_request';
  from: AgentId;
  to: AgentId;
  sessionId: string;
  context: {
    taskId: string;
    description: string;
    artifacts: Artifact[];
    decisions: Decision[];
    requirements: Requirement[];
    constraints: Constraint[];
  };
  priority: 'normal' | 'high' | 'urgent';
  timeout: number;
}

interface HandoffResponse {
  type: 'handoff_response';
  requestId: string;
  status: 'accepted' | 'rejected' | 'deferred';
  reason?: string;
  estimatedCompletion?: number;
}

class AgentHandoffManager {
  private nc: NatsConnection;
  private activeHandoffs: Map<string, HandoffRequest> = new Map();

  constructor(nc: NatsConnection) { this.nc = nc; }

  async requestHandoff(request: HandoffRequest): Promise<HandoffResponse> {
    const requestId = crypto.randomUUID();
    this.activeHandoffs.set(requestId, request);

    const response = await this.nc.request(
      `agents.${request.to}.handoff`,
      JSON.stringify(request),
      { timeout: request.timeout }
    );

    const result: HandoffResponse = JSON.parse(response.data);
    this.activeHandoffs.delete(requestId);
    return result;
  }

  async listenForHandoffs(
    agentId: AgentId,
    handler: (request: HandoffRequest) => Promise<HandoffResponse>
  ) {
    return this.nc.subscribe(`agents.${agentId}.handoff`, {
      callback: async (err, msg) => {
        if (err) return;
        const request: HandoffRequest = JSON.parse(msg.data);
        const response = await handler(request);
        msg.respond(JSON.stringify(response));
      },
    });
  }
}
```

### 3.3 Session Sharing

Sessoes de trabalho podem ser compartilhadas entre humanos e agentes.

```
+-----------------------------------------------------------------+
|                    COMPARTILHAMENTO DE SESSAO                     |
+-----------------------------------------------------------------+
|  +----------+     +----------+     +----------+                 |
|  | Humano   |     | Agente 1 |     | Agente 2 |                 |
|  | (Owner)  |     | (Dev)    |     | (Review) |                 |
|  +----+-----+     +----+-----+     +----+-----+                 |
|       |                |                |                        |
|       +----------------+----------------+                        |
|                        |                                          |
|               +--------v--------+                                 |
|               |   Sessao IDEIA  |                                 |
|               |   session_123   |                                 |
|               |  +------------+ |                                 |
|               |  | Workspace  | | (arquivos, config, terminal)   |
|               |  | Compart.   | |                                 |
|               |  +------------+ |                                 |
|               |  +------------+ |                                 |
|               |  | Blackboard | | (mensagens, decisoes, estado)  |
|               |  +------------+ |                                 |
|               |  +------------+ |                                 |
|               |  | CRDT Doc   | | (codigo, edicao colaborativa)  |
|               |  +------------+ |                                 |
|               +-----------------+                                 |
+-----------------------------------------------------------------+
```

**Niveis de compartilhamento:**

| Nivel | Visibilidade | Acoes | Uso |
|-------|-------------|-------|-----|
| **View** | Codigo, terminal, chat | Apenas ler | Review, demo |
| **Comment** | + Anotacoes inline | Comentar, sugerir | Code review |
| **Edit** | + Arquivos | Editar, salvar | Pair programming |
| **Admin** | + Config, agents | Convidar, remover, configurar | Owner |

### 3.4 Debate and Consensus Engine

Multiplos agentes podem ter opinioes divergentes.

```
FASE 1: APRESENTACAO
  Architect: "Proponho microservicos com NATS como barramento"
  Programmer: "Prefiro monolito modular para simplificar deploy"
  Reviewer: "Microservicos trazem complexidade desnecessaria para MVP"

FASE 2: DELIBERACAO
  Architect: "NATS ja esta na stack, microservicos sao extensao natural"
  Programmer: "Custo operacional de 3 servicos vs 1 e 3x maior"
  Reviewer: "Podemos comecar modular e extrair depois — YAGNI"

FASE 3: CONSENSO
  -> Decisao: Monolito modular com boundaries claros
  -> Registro: rationale documentado, arquiteto registra objecao
  -> ADR-004: Monolito Modular com Extracao Futura
```

**Implementacao:**

```typescript
interface DebateTopic {
  id: string;
  sessionId: string;
  title: string;
  description: string;
  options: DebateOption[];
  status: 'open' | 'voting' | 'decided' | 'dismissed';
  createdBy: string;
  createdAt: number;
  deadline?: number;
}

interface DebateOption {
  id: string;
  label: string;
  description: string;
  proposedBy: string;
  arguments: DebateArgument[];
}

interface DebateArgument {
  agentId: string;
  role: AgentRole;
  type: 'support' | 'against' | 'neutral';
  content: string;
  evidence?: string[];
  weight: number;
}

class ConsensusEngine {
  private nc: NatsConnection;
  private topics: Map<string, DebateTopic> = new Map();

  constructor(nc: NatsConnection) { this.nc = nc; }

  async proposeTopic(topic: DebateTopic) {
    this.topics.set(topic.id, topic);
    await this.nc.publish(`debate.${topic.sessionId}.new`, JSON.stringify(topic));
  }

  async addArgument(topicId: string, argument: DebateArgument) {
    const topic = this.topics.get(topicId);
    if (!topic) throw new Error('Topic not found');

    const option = topic.options.find(o => o.arguments.length > 0);
    if (option) { option.arguments.push(argument); }

    await this.nc.publish(`debate.${topic.sessionId}.argument`,
      JSON.stringify({ topicId, argument }));
    await this.checkConsensus(topic);
  }

  private async checkConsensus(topic: DebateTopic) {
    const totalWeight = topic.options.reduce(
      (sum, opt) => sum + opt.arguments.reduce((s, a) => s + a.weight, 0), 0
    );

    for (const option of topic.options) {
      const optionWeight = option.arguments.reduce((s, a) => s + a.weight, 0);
      if (optionWeight / totalWeight >= 0.8) {
        topic.status = 'decided';
        await this.nc.publish(`debate.${topic.sessionId}.decided`,
          JSON.stringify({ topicId: topic.id, decision: option.id, confidence: optionWeight / totalWeight }));
        return;
      }
    }

    if (topic.deadline && Date.now() > topic.deadline) {
      topic.status = 'voting';
      await this.nc.publish(`debate.${topic.sessionId}.voting`,
        JSON.stringify({ topicId: topic.id, options: topic.options.map(o => ({ id: o.id, label: o.label })) }));
    }
  }
}
```

---

## 4. Theia Cloud Collaboration

### 4.1 Theia Blueprint Multi-instance

**Arquitetura multi-instancia:**

```
+-----------------------------------------------------------------+
|                    THEIA BLUEPRINT MULTI-INSTANCE                 |
+-----------------------------------------------------------------+
|  +----------+  +----------+  +----------+  +----------+         |
|  | Theia    |  | Theia    |  | Theia    |  | Theia    |         |
|  | Inst. A  |  | Inst. B  |  | Inst. C  |  | Inst. D  |         |
|  | (Dev 1)  |  | (Dev 2)  |  | (Agente) |  | (Guest)  |         |
|  +----+-----+  +----+-----+  +----+-----+  +----+-----+         |
|       |             |             |             |                 |
|       +-------------+-------------+-------------+                 |
|                     |             |                               |
|            +--------v-------------v--------+                      |
|            |    Theia Cloud / Orchestrator  |                      |
|            |  - Gerenciamento de instancias |                      |
|            |  - Roteamento de WebSocket     |                      |
|            |  - Autenticacao e autorizacao  |                      |
|            |  - Alocacao de recursos        |                      |
|            +----------------+---------------+                      |
|                     |             |                               |
|            +--------v-------------v--------+                      |
|            |        NATS JetStream          |                      |
|            |  (collab.edits, collab.sync)   |                      |
|            +--------------------------------+                      |
+-----------------------------------------------------------------+
```

### 4.2 Theia Cloud para Workspaces Compartilhados

**Ciclo de vida do workspace colaborativo:**

```
1. CRIACAO
   Usuario A cria workspace "projeto-xyz"
   +-- Theia Cloud aloca container/VM
   +-- Workspace registrado no NATS: workspace.projeto-xyz

2. COMPARTILHAMENTO
   Usuario A convida Usuario B: workspace.invite.projeto-xyz
   +-- NATS envia convite
   +-- Usuario B aceita -> Theia Cloud cria mirror instance
   +-- Yjs sync entre as instancias via NATS

3. EDICAO COLABORATIVA
   Ambos editam simultaneamente
   +-- CRDTs resolvem conflitos automaticamente
   +-- Awareness compartilha cursores e selecoes
   +-- Agentes AI podem participar como editores

4. FINALIZACAO
   Usuario B sai da sessao
   +-- Workspace continua disponivel para A
   +-- Estado CRDT persistido em SQLite
   +-- Historico de sessao disponivel para replay
```

**Configuracao Theia Cloud para colaboracao:**

```yaml
# theia-cloud-config.yaml
collaboration:
  enabled: true
  provider: "yjs-nats"
  nats:
    server: "nats://nats-cluster:4222"
    credentials: "/etc/nats/creds/theia.json"

  instances:
    maxPerWorkspace: 10
    idleTimeout: 30
    maxLifetime: 480

  session:
    persistence: true
    snapshotInterval: 30
    retentionDays: 7

  autoscaling:
    enabled: true
    minInstances: 1
    maxInstances: 50
    scaleUpThreshold: 0.7
    scaleDownThreshold: 0.3
```

### 4.3 Workspace Isolation vs Sharing

| Aspecto | Isolado | Compartilhado |
|---------|---------|---------------|
| **Arquivos** | Exclusivos do usuario | Visiveis para todos |
| **Terminal** | Proprio | Compartilhado (screen/tmux) |
| **Config** | Preferencias pessoais | Preferencias do workspace |
| **Extensoes** | Por usuario | Por workspace |
| **AI Agents** | Agentes pessoais | Agentes compartilhados |
| **Historico** | Local | Global (para todos) |
| **Var. ambiente** | Privadas | Compartilhadas |
| **Git config** | User.email pessoal | Por workspace |

**Abordagem hibrida IDEIA:**

```
+-----------------------------------------------------------------+
|                  MODELO HIBRIDO IDEIA                            |
+-----------------------------------------------------------------+
|  +---------------------------------------------------------+    |
|  |  WORKSPACE COMPARTILHADO                                 |    |
|  |  + src/ (codigo do projeto)                             |    |
|  |  + tests/                                               |    |
|  |  + package.json                                         |    |
|  |  + .ideia/ (config do projeto)                          |    |
|  +---------------------------------------------------------+    |
|                                                                   |
|  +--------------+  +--------------+  +--------------+          |
|  | Usuario A    |  | Usuario B    |  | Agente AI    |          |
|  | ~/.ideia/    |  | ~/.ideia/    |  | (config     |          |
|  | settings.json|  | settings.json|  |  embutida)   |          |
|  | keybindings  |  | keybindings  |  |              |          |
|  | extensions/  |  | extensions/  |  |              |          |
|  | tokens.env   |  | tokens.env   |  |              |          |
|  +--------------+  +--------------+  +--------------+          |
|                                                                   |
|  +---------------------------------------------------------+    |
|  |  COMPARTILHADO CONDICIONAL                                |    |
|  |  - Terminal: workspace compartilhado (screen)             |    |
|  |  - Variaveis de ambiente do projeto: sim                  |    |
|  |  - Variaveis de ambiente pessoais: nao                    |    |
|  |  - Git: commits com identidade de quem fez               |    |
|  |  - Debug: breakpoints por usuario, watch compartilhado   |    |
|  +---------------------------------------------------------+    |
+-----------------------------------------------------------------+
```

### 4.4 Permissions

```typescript
interface CollaborationPermissions {
  workspace: { read: boolean; write: boolean; admin: boolean; delete: boolean; share: boolean };
  files: { read: string[]; write: string[]; delete: string[]; execute: string[] };
  agents: { canInvoke: boolean; canConfigure: boolean; canInterrupt: boolean; maxAutonomyLevel: AutonomyLevel };
  communication: { canChat: boolean; canVoice: boolean; canScreenShare: boolean };
  session: { canInvite: boolean; canKick: boolean; canLock: boolean; canReplay: boolean };
}

const DEFAULT_ROLES = {
  owner: {
    workspace: { read: true, write: true, admin: true, delete: true, share: true },
    files: { read: ['**/*'], write: ['**/*'], delete: ['**/*'], execute: ['**/*'] },
    agents: { canInvoke: true, canConfigure: true, canInterrupt: true, maxAutonomyLevel: 'autonomous' },
    communication: { canChat: true, canVoice: true, canScreenShare: true },
    session: { canInvite: true, canKick: true, canLock: true, canReplay: true },
  },
  editor: {
    workspace: { read: true, write: true, admin: false, delete: false, share: false },
    files: { read: ['**/*'], write: ['**/*'], delete: [], execute: ['**/*'] },
    agents: { canInvoke: true, canConfigure: false, canInterrupt: true, maxAutonomyLevel: 'assisted' },
    communication: { canChat: true, canVoice: true, canScreenShare: false },
    session: { canInvite: true, canKick: false, canLock: false, canReplay: false },
  },
  viewer: {
    workspace: { read: true, write: false, admin: false, delete: false, share: false },
    files: { read: ['**/*'], write: [], delete: [], execute: [] },
    agents: { canInvoke: false, canConfigure: false, canInterrupt: false, maxAutonomyLevel: 'supervised' },
    communication: { canChat: true, canVoice: false, canScreenShare: false },
    session: { canInvite: false, canKick: false, canLock: false, canReplay: false },
  },
  agent: {
    workspace: { read: true, write: true, admin: false, delete: false, share: false },
    files: { read: ['src/**/*', 'tests/**/*'], write: ['src/**/*', 'tests/**/*'], delete: [], execute: ['**/*'] },
    agents: { canInvoke: false, canConfigure: false, canInterrupt: false, maxAutonomyLevel: 'guided' },
    communication: { canChat: true, canVoice: false, canScreenShare: false },
    session: { canInvite: false, canKick: false, canLock: false, canReplay: false },
  },
};
```

---

## 5. Arquitetura de Colaboracao

### 5.1 Pub/Sub via NATS

**Namespace de topicos:**

```
collab.{sessionId}.edits.{type}        -> Operacoes CRDT
collab.{sessionId}.awareness           -> Cursor, selecao, estado
collab.{sessionId}.presence            -> Heartbeats, join/leave
collab.{sessionId}.chat.{room}         -> Mensagens de chat
collab.{sessionId}.agent.{agentId}     -> Comunicacao de agentes
collab.{sessionId}.system              -> Eventos de sistema
collab.{sessionId}.lock.{resource}     -> Locks semanticos
collab.{sessionId}.file.{path}         -> Eventos de arquivo
collab.{sessionId}.terminal            -> Terminal compartilhado
collab.{sessionId}.debug               -> Debug compartilhado

presence.{userId}                      -> Onde o usuario esta
workspace.{workspaceId}.users          -> Usuarios ativos no workspace
```

**Garantias de entrega:**

| Topico | QoS | Persistencia | Dedup | TTL |
|--------|-----|-------------|-------|-----|
| `collab.*.edits.*` | At least once | JetStream (7d) | 5s | 7d |
| `collab.*.awareness` | At most once | Nenhuma | N/A | 30s |
| `collab.*.presence` | At least once | JetStream (1h) | N/A | 1h |
| `collab.*.chat.*` | At least once | JetStream (30d) | N/A | 30d |
| `collab.*.system` | Exactly once | JetStream (7d) | 10s | 7d |
| `presence.*` | At most once | Nenhuma | N/A | 30s |

### 5.2 CRDT Backend Persistente

O estado CRDT precisa ser persistido para que novos participantes possam sincronizar e para replay de sessao.

```typescript
// Persistencia Yjs em SQLite + FTS5
interface CRDTPersistence {
  sessionId: string;
  documentId: string;
  stateVector: Uint8Array;   // Vetor de estado para sync diferencial
  snapshot: Uint8Array;       // Snapshot completo do documento
  lastUpdated: number;
  version: number;
}

class YjsPersistence {
  private db: Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS crdt_documents (
        session_id TEXT NOT NULL,
        document_id TEXT NOT NULL,
        state_vector BLOB,
        snapshot BLOB,
        last_updated INTEGER NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (session_id, document_id)
      );

      CREATE TABLE IF NOT EXISTS crdt_updates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        document_id TEXT NOT NULL,
        update_data BLOB NOT NULL,
        timestamp INTEGER NOT NULL,
        origin TEXT,
        INDEX idx_updates_session (session_id, document_id, timestamp)
      );

      -- Full-text search para metadados
      CREATE VIRTUAL TABLE IF NOT EXISTS crdt_fts USING fts5(
        session_id, document_id, content=''
      );
    `);
  }

  async saveSnapshot(sessionId: string, doc: Y.Doc) {
    const snapshot = Y.encodeStateAsUpdate(doc);
    const sv = Y.encodeStateVector(doc);

    this.db.prepare(`
      INSERT INTO crdt_documents (session_id, document_id, state_vector, snapshot, last_updated, version)
      VALUES (?, ?, ?, ?, ?, 1)
      ON CONFLICT(session_id, document_id) DO UPDATE SET
        state_vector = excluded.state_vector,
        snapshot = excluded.snapshot,
        last_updated = excluded.last_updated,
        version = version + 1
    `).run(sessionId, 'main', Buffer.from(sv), Buffer.from(snapshot), Date.now());
  }

  async saveUpdate(sessionId: string, update: Uint8Array, origin?: string) {
    this.db.prepare(`
      INSERT INTO crdt_updates (session_id, document_id, update_data, timestamp, origin)
      VALUES (?, 'main', ?, ?, ?)
    `).run(sessionId, Buffer.from(update), Date.now(), origin || 'unknown');
  }

  async loadDocument(sessionId: string, doc: Y.Doc) {
    const row = this.db.prepare(`
      SELECT snapshot, state_vector FROM crdt_documents
      WHERE session_id = ? AND document_id = 'main'
    `).get(sessionId) as any;

    if (row) {
      Y.applyUpdate(doc, new Uint8Array(row.snapshot));

      // Aplicar updates desde o snapshot
      const updates = this.db.prepare(`
        SELECT update_data FROM crdt_updates
        WHERE session_id = ? AND document_id = 'main'
        AND timestamp > ?
        ORDER BY timestamp ASC
      `).all(sessionId, row.last_updated) as any[];

      for (const u of updates) {
        Y.applyUpdate(doc, new Uint8Array(u.update_data));
      }
    }
  }
}
```

### 5.3 Presenca e Heartbeats

```typescript
class PresenceManager {
  private nc: NatsConnection;
  private heartbeats: Map<string, NodeJS.Timeout> = new Map();

  constructor(nc: NatsConnection) { this.nc = nc; }

  async announce(sessionId: string, userId: string, status: 'online' | 'offline' | 'away') {
    await this.nc.publish(`collab.${sessionId}.presence`, JSON.stringify({
      userId, status, timestamp: Date.now(),
    }));
  }

  startHeartbeat(sessionId: string, userId: string, intervalMs = 30_000) {
    const timer = setInterval(async () => {
      await this.announce(sessionId, userId, 'online');
    }, intervalMs);
    this.heartbeats.set(userId, timer);
  }

  stopHeartbeat(userId: string) {
    const timer = this.heartbeats.get(userId);
    if (timer) { clearInterval(timer); this.heartbeats.delete(userId); }
  }

  // Verificar usuarios ativos (threshold = 60s sem heartbeat)
  async getActiveUsers(sessionId: string, thresholdMs = 60_000): Promise<string[]> {
    const users: string[] = [];
    const sub = this.nc.subscribe(`collab.${sessionId}.presence`, { timeout: 2000 });

    for await (const msg of sub) {
      const presence = JSON.parse(msg.data);
      if (presence.status === 'online' &&
          Date.now() - presence.timestamp < thresholdMs) {
        if (!users.includes(presence.userId)) {
          users.push(presence.userId);
        }
      }
    }

    return users;
  }
}
```

### 5.4 Replay de Sessao

Replay de sessao permite "time travel debug" — rever exatamente o que aconteceu durante uma sessao colaborativa.

```typescript
interface SessionReplay {
  sessionId: string;
  startTime: number;
  endTime: number;
  events: ReplayEvent[];
  participants: string[];
}

interface ReplayEvent {
  timestamp: number;
  type: 'edit' | 'cursor' | 'chat' | 'agent_action' | 'file_change' | 'system';
  userId: string;
  data: any;
}

class SessionReplayService {
  private nc: NatsConnection;

  constructor(nc: NatsConnection) { this.nc = nc; }

  async getSessionTimeline(sessionId: string): Promise<SessionReplay> {
    // Obter todas as mensagens da sessao do JetStream
    const editsStream = await this.nc.jetstream().getStream('collab-edits');
    const msgs = await editsStream.getMessage(`collab.edits.${sessionId}`);

    const events: ReplayEvent[] = [];

    for await (const msg of msgs) {
      events.push({
        timestamp: msg.info.timestamp,
        type: 'edit',
        userId: msg.headers?.get('X-User-Id') || 'unknown',
        data: msg.data,
      });
    }

    return {
      sessionId,
      startTime: events[0]?.timestamp || 0,
      endTime: events[events.length - 1]?.timestamp || 0,
      events,
      participants: [...new Set(events.map(e => e.userId))],
    };
  }

  // Reconstruir documento em um ponto especifico do tempo
  async reconstructAt(sessionId: string, targetTime: number): Promise<Y.Doc> {
    const doc = new Y.Doc();

    // Aplicar apenas eventos ate targetTime
    const timeline = await this.getSessionTimeline(sessionId);
    const filteredEvents = timeline.events
      .filter(e => e.timestamp <= targetTime && e.type === 'edit')
      .sort((a, b) => a.timestamp - b.timestamp);

    for (const event of filteredEvents) {
      Y.applyUpdate(doc, new Uint8Array(event.data));
    }

    return doc;
  }

  // UI de replay
  renderReplayUI(events: ReplayEvent[]) {
    // Timeline scrubber
    // Velocidade de reproducao (1x, 2x, 4x, 16x)
    // Saltar entre eventos de agente
    // Marcadores de decisoes importantes
    // Destaque de quem estava editando em cada momento
    return {
      timeline: events.map((e, i) => ({
        index: i,
        timestamp: new Date(e.timestamp).toISOString(),
        type: e.type,
        user: e.userId,
        preview: this.getEventPreview(e),
      })),
      controls: {
        play: true,
        speed: [1, 2, 4, 16, 64],
        skipAgentEvents: true,
        skipIdle: true,
      },
    };
  }

  private getEventPreview(event: ReplayEvent): string {
    switch (event.type) {
      case 'edit': return 'Edicao de codigo';
      case 'chat': return event.data.text?.substring(0, 80) || 'Mensagem';
      case 'agent_action': return `[Agente] ${event.data.action}`;
      case 'file_change': return `Arquivo: ${event.data.path}`;
      default: return event.type;
    }
  }
}
```

### 5.5 Diagrama de Arquitetura Completo

```
+-----------------------------------------------------------------------------+
|                   ARQUITETURA COMPLETA DE COLABORACAO IDEIA                 |
+-----------------------------------------------------------------------------+
|                                                                             |
|  +-----------------------------------+  +---------------------------------+ |
|  |        FRONTEND WEB               |  |        FRONTEND DESKTOP         | |
|  |  +-----------------------------+  |  |  +---------------------------+  | |
|  |  | Monaco Editor                |  |  |  | Monaco Editor              |  | |
|  |  | y-monaco                     |  |  |  | y-monaco                   |  | |
|  |  | y-websocket (NATS provider)  |  |  |  | y-websocket (NATS prov.)  |  | |
|  |  +-----------------------------+  |  |  +---------------------------+  | |
|  +---------------+-------------------+  +---------------+-------------------+ |
|                  |                                      |                     |
|                  |         WebSocket (WSS)              |                     |
|                  +------------------+-------------------+                     |
|                                     |                                         |
|  +----------------------------------v--------------------------------------+ |
|  |                          API GATEWAY / WS PROXY                         | |
|  |  (Autenticacao, rate limiting, roteamento para cluster NATS)            | |
|  +----------------------------------+--------------------------------------+ |
|                                     |                                         |
|  +----------------------------------v--------------------------------------+ |
|  |                          NATS CLUSTER                                   | |
|  |  +------------------+  +------------------+  +------------------+       | |
|  |  | JetStream        |  | KV Store         |  | Object Store     |       | |
|  |  | - collab.edits   |  | - collab.state   |  | - collab.snap    |       | |
|  |  | - collab.presence|  | - blackboard.ctx |  | - session.rec    |       | |
|  |  | - collab.agent   |  +------------------+  +------------------+       | |
|  |  | - collab.chat    |                                                    | |
|  |  | - collab.system  |                                                    | |
|  |  +------------------+                                                    | |
|  +----------------------------------+--------------------------------------+ |
|                                     |                                         |
|  +----------------------------------v--------------------------------------+ |
|  |                          BACKEND SERVICES                               | |
|  |  +------------------+  +------------------+  +------------------+       | |
|  |  | Yjs Persistence  |  | Agent Orchestr.  |  | Consensus Engine |       | |
|  |  | (SQLite + FTS5)  |  | (LangGraph)      |  | (Debate/Delib)   |       | |
|  |  +------------------+  +------------------+  +------------------+       | |
|  |  +------------------+  +------------------+  +------------------+       | |
|  |  | Session Replay   |  | Permissions Mgr  |  | Analytics        |       | |
|  |  | (DuckDB)         |  | (Cedar Policy)   |  | (DuckDB)         |       | |
|  |  +------------------+  +------------------+  +------------------+       | |
|  +----------------------------------+--------------------------------------+ |
|                                     |                                         |
|  +----------------------------------v--------------------------------------+ |
|  |                          DATA LAYER                                     | |
|  |  +------------------+  +------------------+  +------------------+       | |
|  |  | PostgreSQL       |  | MinIO            |  | DuckDB           |       | |
|  |  | (usuarios,       |  | (snapshots,      |  | (analytics,      |       | |
|  |  |  workspaces)     |  |  gravacoes)      |  |  replay index)   |       | |
|  |  +------------------+  +------------------+  +------------------+       | |
|  +-------------------------------------------------------------------------+ |
|                                                                             |
+-----------------------------------------------------------------------------+
```

---

## 6. Casos de Uso

### 6.1 Pair Programming com Agente AI

**Cenario:** Desenvolvedor quer implementar uma feature complexa com ajuda de um agente AI.

```
Humano: "Preciso implementar um sistema de cache com TTL"
Agente: "Vou criar uma estrutura base. Posso prosseguir?" [Supervisionado]
Humano: "Pode ir"
Agente: [Gera codigo no workspace, o humano ve cada linha aparecendo]
        [Cursor do agente se move pelo editor]
Humano: "Espera, eu prefiro usar Map em vez de objeto"
Agente: [Altera implementacao em tempo real]
        [Cursor do agente destaca a alteracao]
Humano: "Assim ficou melhor. Pode continuar."
Agente: [Continua gerando, o humano revisa em paralelo]
```

**Fluxo de colaboracao:**

```
1. Humano delegada tarefa -> Agente propoe abordagem
2. Humano aprova/rejeita/direciona
3. Agente escreve codigo (streaming, linha a linha)
4. Humano pode interromper, editar diretamente, ou redirecionar
5. Ambos veem o mesmo workspace, cursores visiveis
6. Ao final, humano revisa o diff gerado pelo agente
```

### 6.2 Code Review Colaborativo

**Cenario:** Dois desenvolvedores revisam um PR com auxilio de um agente revisor.

```
Revisor: "Abri o PR #42 para revisao"
Agente: [Analisa codigo, encontra 3 potenciais problemas]
        [Adiciona comentarios inline no codigo]
Revisor: "Discordo do ponto 2, o design pattern e intencional"
Autor: "Exatamente, segui o ADR-005"
Agente: "Entendido, retiro a sugestao 2. Pontos 1 e 3 ainda precisam de atencao"
        [Atualiza comentarios em tempo real]
```

**Funcionalidades necessarias:**
- Comentarios inline sincronizados em tempo real
- Threads de discussao com resolucao
- Agente revisor automatico (analise estatica + boas praticas)
- Diff highlighting com anotacoes colaborativas
- Checklist de review compartilhado
- Aprovacao sincrona (todos veem o merge button)

### 6.3 Debugging Compartilhado

**Cenario:** Sessao de debugging entre dois devs e um agente AI.

```
Dev A: "O servidor esta retornando 500 em /api/users"
Agente: "Identifiquei o erro: TypeORM query mal formada na linha 42"
         [Cursor do agente vai ate a linha 42]
         [Breakpoint visual adicionado automaticamente]
Dev B: "Vou inspecionar o estado do request"
         [Adiciona watch expression]
Agente: "O userId esta undefined. A origem e no controller, linha 18"
         [Destaca a linha 18]
Dev A: "Faz sentido. O middleware de auth nao esta passando o user"
         [Corrige o problema]
Agente: "Teste passando. Incidente resolvido em 3 minutos"
```

**Breakpoints e watch compartilhados:**

```typescript
interface SharedDebugSession {
  sessionId: string;
  breakpoints: SharedBreakpoint[];
  watchExpressions: SharedWatch[];
  currentFrame: DebugFrame | null;
  participants: string[];
}

interface SharedBreakpoint {
  id: string;
  file: string;
  line: number;
  condition?: string;
  hitCount: number;
  addedBy: string;
  enabled: boolean;
}

interface SharedWatch {
  id: string;
  expression: string;
  value?: string;
  addedBy: string;
}
```

### 6.4 Demo/Presentation Mode

**Cenario:** Dev apresenta o sistema para stakeholders.

**Modo apresentacao:**
- Esconde informacoes sensiveis (tokens, variaveis de ambiente)
- Fonte aumenta (acessibilidade)
- Minimap desligado
- Mouse highlights com zoom
- "Modo espectador" — audiencia ve mas nao edita
- Highlights de teclas pressionadas
- Timer integrado
- Transicao suave entre arquivos

```
+-----------------------------------------------------------------+
|                    MODO APRESENTACAO IDEIA                        |
+-----------------------------------------------------------------+
|  [Nome do Projeto]           [ 0:12:34 ] [Sair da Apresentacao] |
|                                                                   |
|  +---------------------------------------------------------+    |
|  |  src/services/user-service.ts                           |    |
|  |                                                         |    |
|  |  class UserService {                                    |    |
|  |    async getUsers() {                                   |    |
|  |      return this.db.find();      <-- Highlight ativo    |    |
|  |    }                                                    |    |
|  |  }                                                      |    |
|  |                                                         |    |
|  |  [Nota: Esta query retorna todos os usuarios]           |    |
|  +---------------------------------------------------------+    |
|                                                                   |
|  +---------------------+  +---------------------+                |
|  | Chat da Audiencia   |  | Notas do Apresentador |               |
|  | [Stakeholder]       |  | 1. Mostrar arquitetura|               |
|  | Otimo trabalho!     |  | 2. Explicar decisao   |               |
|  +---------------------+  +---------------------+                |
+-----------------------------------------------------------------+
```

### 6.5 Classroom/Mentoring

**Cenario:** Instrutor ensina programacao para alunos usando IDEIA.

**Funcionalidades educacionais:**
- **Modo seguir** — aluno ve exatamente o que o instrutor esta fazendo
- **Modo controle** — instrutor pode tomar o controle do teclado do aluno
- **Exercicios ao vivo** — instrutor propoe desafio, alunos resolvem no workspace
- **Diferencas visiveis** — instrutor ve diff do codigo de cada aluno em tempo real
- **Anotacoes** — instrutor pode desenhar/anotar sobre o codigo do aluno
- **Gravacao** — sessoes gravadas para revisao posterior
- **AI Tutor** — agente AI ajuda alunos individualmente enquanto instrutor foca em outros

```
+-----------------------------------------------------------------+
|                    MODO SALA DE AULA IDEIA                       |
+-----------------------------------------------------------------+
|  [Instrutor: Maria]  [Alunos: 12 online]  [Gravando]           |
+-----------------------------------------------------------------+
|  +-----------------------------+  +---------------------------+ |
|  |  CODIGO DO ALUNO (Joao)    |  |  CODIGO DO INSTRUTOR     | |
|  |                             |  |                           | |
|  |  function soma(a, b) {     |  |  function soma(a: number, | |
|  |    return a + b;           |  |    b: number): number {   | |
|  |  }                         |  |    return a + b;          | |
|  |                             |  |  }                        | |
|  |  + Dica do AI Tutor:       |  |                           | |
|  |  Considere adicionar types |  |  [Diferenca destacada]    | |
|  +-----------------------------+  +---------------------------+ |
|  +----------------------------------------------------------+  |
|  |  CHAT DA TURMA                                            |  |
|  |  [Ana] Professor, posso usar const em vez de function?    |  |
|  |  [Maria] Pode sim! Boa pergunta, isso nos leva ao...      |  |
|  +----------------------------------------------------------+  |
+-----------------------------------------------------------------+
```

**Metricas educacionais:**

| Metrica | Descricao | Meta |
|---------|-----------|------|
| Tempo de atencao | % de tempo que aluno segue o instrutor | > 80% |
| Taxa de acerto | % de exercicios concluidos corretamente | > 75% |
| Intervencoes do AI Tutor | % de alunos que precisam de ajuda extra | < 20% |
| Satisfacao do aluno | NPS pos-aula | > 70% |
| Velocidade de aprendizado | Reducao de tempo para completar exercicios | 2x por modulo |

---

## Referencias

1. Yjs Documentation. yjs.dev
2. Monaco Editor Collaborative Extensions. microsoft.github.io/monaco-editor
3. NATS JetStream Documentation. docs.nats.io
4. Theia Cloud Architecture. theia-cloud.io
5. Automerge CRDT. automerge.org
6. WebRTC Standards. w3.org/TR/webrtc
7. Kleppmann, M. "CRDTs: The Hard Parts." 2020.
8. Theia IDE Multi-instance Patterns. eclipsetheia.org
9. LangGraph Multi-agent Patterns. langchain.com
10. YATA CRDT Algorithm. doi.org/10.1145/2957273

---

> **Proximos passos:** Implementar provider NATS para Yjs, configurar streams JetStream para colaboracao, criar POC de multi-cursor com Monaco + Yjs, definir permissoes no esquema Cedar.
