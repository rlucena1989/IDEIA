export interface AiMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
}

export interface AiTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface AiStreamChunk {
  content: string;
  done: boolean;
}
