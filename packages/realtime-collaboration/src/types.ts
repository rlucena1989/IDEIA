export interface Collaborator { id: string; name: string; color: string; cursor?: CursorPosition; connected: boolean }
export interface CursorPosition { line: number; column: number; file: string }
export interface Operation { id: string; userId: string; type: 'insert' | 'delete' | 'update'; position: number; content: string; timestamp: string }
export interface DocumentState { content: string; version: number; lastModified: string; operations: Operation[] }
export interface PresenceEvent { userId: string; type: 'join' | 'leave' | 'cursor'; data?: unknown; timestamp: string }
