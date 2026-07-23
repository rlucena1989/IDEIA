import { z } from 'zod';

export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const TaskStatusSchema = z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskSchema = z.object({
  id: z.string(),
  type: z.string(),
  payload: z.record(z.unknown()),
  priority: TaskPrioritySchema,
  status: TaskStatusSchema,
  createdAt: z.number(),
  startedAt: z.number().optional(),
  completedAt: z.number().optional(),
  retries: z.number().default(0),
  maxRetries: z.number().default(3).optional(),
  error: z.string().optional(),
});

export type TaskInput = Omit<Task, 'id' | 'status' | 'createdAt' | 'retries' | 'maxRetries'> & { maxRetries?: number };
export type Task = z.infer<typeof TaskSchema>;

export const TaskResultSchema = z.object({
  success: z.boolean(),
  taskId: z.string(),
  result: z.unknown().optional(),
  error: z.string().optional(),
  duration: z.number(),
});
export type TaskResult = z.infer<typeof TaskResultSchema>;

export interface TaskHandler {
  (task: Task): Promise<unknown>;
}

export const RETRY_DELAYS = [1_000, 4_000, 16_000, 64_000];
