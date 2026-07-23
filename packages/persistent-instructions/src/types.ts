export type InstructionScope = 'project' | 'module' | 'file' | 'global';
export type InstructionPriority = 'critical' | 'high' | 'medium' | 'low';
export type InstructionStatus = 'active' | 'superseded' | 'archived' | 'conflict';

export interface Instruction {
  id: string;
  title: string;
  content: string;
  scope: InstructionScope;
  priority: InstructionPriority;
  status: InstructionStatus;
  tags: string[];
  source: 'user' | 'ai' | 'learned';
  createdAt: string;
  updatedAt: string;
  supersededBy?: string;
  conflicts?: string[];
  appliesTo?: string[];
  version: number;
}
