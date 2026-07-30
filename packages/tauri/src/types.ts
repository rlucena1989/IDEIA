export interface IdeServerState {
  running: boolean;
  port: number;
  pid: number | null;
}

export interface SystemInfo {
  platform: string;
  arch: string;
  os_version: string;
  hostname: string;
  total_memory_mb: number;
}

export interface DeepLinkAction {
  action: string;
  params: Record<string, string>;
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
}

export interface TerminalSession {
  id: string;
  cols: number;
  rows: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}
