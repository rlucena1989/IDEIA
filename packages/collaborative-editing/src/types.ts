export interface Participant {
  id: string;
  name: string;
  role: 'human' | 'agent';
  color: string;
  cursorPosition: CursorPosition | null;
  isConnected: boolean;
}

export interface CollaborationSession {
  id: string;
  documentId: string;
  participants: Participant[];
  status: 'active' | 'archived';
  createdAt: Date;
}

export interface DocumentSnapshot {
  id: string;
  content: string;
  version: number;
  timestamp: Date;
  lastEditorId: string;
}

export interface CursorPosition {
  line: number;
  column: number;
  filePath: string;
}

export interface AwarenessInfo {
  participantId: string;
  cursor: CursorPosition | null;
  selection: { start: CursorPosition; end: CursorPosition } | null;
  activity: 'editing' | 'idle' | 'away';
}

export interface ConflictResolution {
  strategy: 'lastWriteWins' | 'manual' | 'crdt';
  resolvedBy: string;
  timestamp: Date;
}

export interface CollaborationEvent {
  type: 'cursor' | 'edit' | 'awareness' | 'join' | 'leave';
  sender: string;
  timestamp: Date;
  data: unknown;
}
