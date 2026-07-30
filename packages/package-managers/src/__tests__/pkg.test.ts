import { PackageManagerService } from '../pkg-manager'

describe('PackageManagerService', () => {
  let svc: PackageManagerService
  beforeEach(() => { svc = new PackageManagerService() })

  it('should add and list deps', () => {
    svc.addDep({ name: 'express', version: '^4.18', manager: 'npm', dev: false })
    expect(svc.getDeps().length).toBe(1)
  })

  it('should resolve dependencies', () => {
    svc.addDeps([
      { name: 'react', version: '^18.2', manager: 'npm', dev: false },
      { name: 'express', version: '^4.18', manager: 'npm', dev: false },
    ])
    const result = svc.resolve()
    expect(Object.keys(result.resolved).length).toBe(2)
    expect(result.conflicts.length).toBe(0)
  })

  it('should detect version conflicts', () => {
    svc.addDep({ name: 'react', version: '^17.0', manager: 'npm', dev: false })
    svc.addDep({ name: 'react', version: '^18.0', manager: 'npm', dev: false })
    const result = svc.resolve()
    expect(result.conflicts.length).toBeGreaterThan(0)
  })

  it('should audit for vulnerabilities', () => {
    svc.addDep({ name: 'old-pkg', version: '0.1.0', manager: 'npm', dev: false })
    const vulns = svc.audit()
    expect(vulns.length).toBeGreaterThan(0)
  })
})
