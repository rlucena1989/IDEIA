import { createTaskQueue } from './queue';
import { RobotTask } from './types';

describe('TaskQueue', () => {
  const queue = createTaskQueue();

  function makeTask(id: string, type: string): RobotTask {
    return {
      id,
      type: type as RobotTask['type'],
      scope: [],
      input: {},
      permissions: [],
      timeout: 5000,
      safetyConstraints: [],
      verificationCriteria: [],
    };
  }

  it('should enqueue tasks with priority', () => {
    queue.enqueue(makeTask('t1', 'CODE_GENERATE'), 'robot-1', 1);
    queue.enqueue(makeTask('t2', 'TEST_UNIT'), 'robot-1', 5);
    queue.enqueue(makeTask('t3', 'INFRA_DEPLOY'), 'robot-1', 3);
    const next = queue.dequeue('robot-1');
    expect(next?.taskId).toBe('t2');
  });

  it('should handle failed tasks with retry', () => {
    const entry = queue.enqueue(makeTask('t4', 'INFRA_DEPLOY'), 'robot-1', 1);
    queue.fail(entry.taskId);
    const retried = queue.retryDeadLetter(entry.taskId, 'robot-1');
    expect(retried).toBe(true);
  });

  it('should move to dead letter after max retries', () => {
    const entry = queue.enqueue(makeTask('t5', 'INFRA_DEPLOY'), 'robot-1', 1);
    queue.fail(entry.taskId);
    queue.fail(entry.taskId);
    queue.fail(entry.taskId);
    const retried = queue.retryDeadLetter(entry.taskId, 'robot-1');
    expect(retried).toBe(false);
  });

  it('should return null from empty queue', () => {
    const empty = createTaskQueue();
    expect(empty.dequeue('robot-x')).toBeNull();
  });
});