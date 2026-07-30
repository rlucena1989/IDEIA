import { ERPArchitect } from '../erp-architect'

describe('ERPArchitect', () => {
  let arch: ERPArchitect
  beforeEach(() => { arch = new ERPArchitect() })

  it('should add modules', () => {
    arch.addModule({ name: 'Finance', entities: [], processes: [], integrations: ['HR:sync'] })
    const sys = arch.getArchitecture()
    expect(sys.modules.length).toBe(1)
    expect(sys.integrations.length).toBe(1)
  })

  it('should add entities to modules', () => {
    arch.addModule({ name: 'HR', entities: [], processes: [], integrations: [] })
    arch.addEntity('HR', { id: 'E1', name: 'Employee', attributes: { name: 'string' }, relationships: ['Department'] })
    const sys = arch.getArchitecture()
    expect(sys.modules[0].entities.length).toBe(1)
  })

  it('should add processes with steps', () => {
    arch.addModule({ name: 'Sales', entities: [], processes: [], integrations: [] })
    arch.addProcess('Sales', { id: 'P1', name: 'Create Order', steps: [{ id: 'S1', action: 'validate', entity: 'Order', timeout: 5000 }], domain: 'sales', criticality: 'high' })
    const sys = arch.getArchitecture()
    expect(sys.modules[0].processes.length).toBe(1)
  })

  it('should detect process dependencies', () => {
    arch.addModule({ name: 'Inventory', entities: [], processes: [{ id: 'P1', name: 'Check Stock', steps: [{ id: 'S1', action: 'check', entity: 'Product', timeout: 1000 }], domain: 'inventory', criticality: 'medium' }], integrations: [] })
    const deps = arch.detectProcessDependencies('Product')
    expect(deps).toContain('P1')
  })
})
