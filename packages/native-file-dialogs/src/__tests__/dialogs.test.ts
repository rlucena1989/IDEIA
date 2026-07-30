import { FileDialogService } from '../dialog-service'

describe('FileDialogService', () => {
  let svc: FileDialogService
  beforeEach(() => { svc = new FileDialogService() })

  it('should open file dialog', async () => {
    const result = await svc.open({ type: 'open', filters: [{ name: 'TypeScript', extensions: ['ts'] }] })
    expect(result.canceled).toBe(false)
    expect(result.files.length).toBe(1)
  })

  it('should open folder dialog', async () => {
    const result = await svc.open({ type: 'folder', filters: [] })
    expect(result.files[0]).toContain('project')
  })

  it('should support multi-select', async () => {
    const result = await svc.open({ type: 'multi', filters: [], multiSelect: true })
    expect(result.files.length).toBe(2)
  })

  it('should save dialog', async () => {
    const result = await svc.save('/home/user/output.ts')
    expect(result.filePath).toBe('/home/user/output.ts')
  })

  it('should get file preview', () => {
    const preview = svc.getPreview('/path/to/file.ts')
    expect(preview.name).toBe('file.ts')
    expect(preview.size).toBe(1024)
  })
})
