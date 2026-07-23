import { TraceRegistry } from '../src/trace-registry';

describe('TraceRegistry', () => {
  it('should create a link', () => {
    const reg = new TraceRegistry();
    const link = reg.link({
      sourceType: 'requirement', sourceId: 'req-1',
      targetType: 'workflow_task', targetId: 'task-1',
      relationship: 'implements',
    });
    expect(link.id).toBeDefined();
    expect(link.relationship).toBe('implements');
    expect(reg.count()).toBe(1);
  });

  it('should find outgoing links', () => {
    const reg = new TraceRegistry();
    reg.link({ sourceType: 'requirement', sourceId: 'req-1', targetType: 'workflow_task', targetId: 'task-1', relationship: 'implements' });
    reg.link({ sourceType: 'requirement', sourceId: 'req-1', targetType: 'workflow_task', targetId: 'task-2', relationship: 'validates' });
    const links = reg.getBySource('requirement', 'req-1');
    expect(links).toHaveLength(2);
  });

  it('should find incoming links', () => {
    const reg = new TraceRegistry();
    reg.link({ sourceType: 'requirement', sourceId: 'req-1', targetType: 'workflow_task', targetId: 'task-1', relationship: 'implements' });
    reg.link({ sourceType: 'feedback_event', sourceId: 'fb-1', targetType: 'workflow_task', targetId: 'task-1', relationship: 'related_to' });
    const links = reg.getByTarget('workflow_task', 'task-1');
    expect(links).toHaveLength(2);
  });

  it('should unlink', () => {
    const reg = new TraceRegistry();
    const link = reg.link({ sourceType: 'requirement', sourceId: 'req-1', targetType: 'workflow_task', targetId: 'task-1', relationship: 'implements' });
    expect(reg.count()).toBe(1);
    reg.unlink(link.id);
    expect(reg.count()).toBe(0);
  });

  it('should build graph', () => {
    const reg = new TraceRegistry();
    reg.link({ sourceType: 'requirement', sourceId: 'req-1', targetType: 'workflow_task', targetId: 'task-1', relationship: 'implements' });
    reg.link({ sourceType: 'requirement', sourceId: 'req-1', targetType: 'workflow_task', targetId: 'task-2', relationship: 'implements' });
    const graph = reg.getGraph();
    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges).toHaveLength(2);
  });

  it('should find path between entities', () => {
    const reg = new TraceRegistry();
    reg.link({ sourceType: 'requirement', sourceId: 'req-1', targetType: 'workflow_task', targetId: 'task-1', relationship: 'implements' });
    reg.link({ sourceType: 'workflow_task', sourceId: 'task-1', targetType: 'code_file', targetId: 'src/auth.ts', relationship: 'implements' });
    reg.link({ sourceType: 'code_file', sourceId: 'src/auth.ts', targetType: 'test_file', targetId: 'tests/auth.test.ts', relationship: 'tests' });
    const path = reg.findPath('requirement', 'req-1', 'test_file', 'tests/auth.test.ts');
    expect(path).not.toBeNull();
    expect(path!.hops).toBe(3);
    expect(path!.totalConfidence).toBe(1);
  });

  it('should return null for unreachable path', () => {
    const reg = new TraceRegistry();
    const path = reg.findPath('requirement', 'req-1', 'code_file', 'src/main.ts');
    expect(path).toBeNull();
  });

  it('should return entity links', () => {
    const reg = new TraceRegistry();
    reg.link({ sourceType: 'requirement', sourceId: 'req-1', targetType: 'workflow_task', targetId: 'task-1', relationship: 'implements' });
    reg.link({ sourceType: 'feedback_event', sourceId: 'fb-1', targetType: 'requirement', targetId: 'req-1', relationship: 'related_to' });
    const entity = reg.getByEntity('requirement', 'req-1');
    expect(entity.outgoing).toHaveLength(1);
    expect(entity.incoming).toHaveLength(1);
  });

  it('should clear all links', () => {
    const reg = new TraceRegistry();
    reg.link({ sourceType: 'requirement', sourceId: 'req-1', targetType: 'workflow_task', targetId: 'task-1', relationship: 'implements' });
    reg.clear();
    expect(reg.count()).toBe(0);
  });
});
