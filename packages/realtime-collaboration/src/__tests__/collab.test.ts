import { CollaborationEngine } from '../collab-engine'

describe('CollaborationEngine', () => {
  let engine: CollaborationEngine
  beforeEach(() => { engine = new CollaborationEngine() })

  it('should allow users to join', () => {
    engine.join({ id: 'u1', name: 'Alice', color: '#ff0', connected: true })
    expect(engine.getCollaborators().length).toBe(1)
  })

  it('should track active collaborators', () => {
    engine.join({ id: 'u1', name: 'A', color: '#f00', connected: true })
    engine.join({ id: 'u2', name: 'B', color: '#0f0', connected: true })
    engine.leave('u2')
    expect(engine.getActiveCollaborators().length).toBe(1)
  })

  it('should update cursors', () => {
    engine.join({ id: 'u1', name: 'A', color: '#000', connected: true })
    engine.updateCursor('u1', { line: 5, column: 10, file: 'main.ts' })
    const user = engine.getCollaborators().find(c => c.id === 'u1')
    expect(user!.cursor!.line).toBe(5)
  })

  it('should apply operations to documents', () => {
    const doc = engine.applyOperation('doc1', { id: 'op1', userId: 'u1', type: 'insert', position: 0, content: 'hello', timestamp: '' })
    expect(doc.version).toBe(1)
    expect(doc.operations.length).toBe(1)
  })
})
