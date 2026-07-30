import { SchemaRegistry } from '../schema-registry'

describe('SchemaRegistry', () => {
  let registry: SchemaRegistry
  beforeEach(() => { registry = new SchemaRegistry() })

  it('should register and retrieve schemas', () => {
    registry.register({ name: 'UserCreated', version: 1, fields: [{ name: 'name', type: 'string', required: true }], compatibility: 'backward' })
    const schema = registry.getSchema('UserCreated')
    expect(schema!.version).toBe(1)
  })

  it('should track multiple versions', () => {
    registry.register({ name: 'OrderPlaced', version: 1, fields: [{ name: 'id', type: 'string', required: true }], compatibility: 'backward' })
    registry.register({ name: 'OrderPlaced', version: 2, fields: [{ name: 'id', type: 'string', required: true }, { name: 'total', type: 'number', required: true }], compatibility: 'backward' })
    expect(registry.getAllVersions('OrderPlaced')).toEqual([1, 2])
  })

  it('should validate events against schema', () => {
    registry.register({ name: 'Test', version: 1, fields: [{ name: 'id', type: 'string', required: true }, { name: 'name', type: 'string', required: false }], compatibility: 'none' })
    expect(registry.validate({ id: '123' }, 'Test')).toBe(true)
    expect(registry.validate({ name: 'foo' }, 'Test')).toBe(false)
  })

  it('should migrate events between schema versions', () => {
    registry.register({ name: 'Event', version: 1, fields: [{ name: 'oldName', type: 'string', required: true }], compatibility: 'full' })
    registry.register({ name: 'Event', version: 2, fields: [{ name: 'newName', type: 'string', required: true }], compatibility: 'backward' })
    registry.addMigration({ fromVersion: 1, toVersion: 2, transforms: [{ field: 'newName', action: 'rename', oldName: 'oldName' }] })
    const result = registry.migrate({ oldName: 'test' }, 'Event', 2)
    expect(result.newName).toBe('test')
    expect(result.oldName).toBeUndefined()
  })
})
