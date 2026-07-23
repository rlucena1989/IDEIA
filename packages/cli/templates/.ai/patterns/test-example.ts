/**
 * PADRAO DE TESTE -- use como referencia
 */
describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase
  let mockRepo: jest.Mocked<IUserRepository>

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(), findByEmail: jest.fn(),
      findAll: jest.fn(), save: jest.fn(),
      update: jest.fn(), delete: jest.fn()
    }
    useCase = new CreateUserUseCase(mockRepo)
  })

  it('deve criar usuario com dados validos', async () => {
    mockRepo.findByEmail.mockResolvedValue(null)
    mockRepo.save.mockResolvedValue(undefined)
    const result = await useCase.execute({ name: 'Joao', email: 'joao@email.com' })
    expect(result.id).toBeDefined()
    expect(mockRepo.save).toHaveBeenCalledTimes(1)
  })

  it('deve lancar erro quando e-mail ja existe', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock parcial intencional
    mockRepo.findByEmail.mockResolvedValue({ id: 'existing' } as Record<string, unknown>)
    await expect(useCase.execute({ name: 'Joao', email: 'x@x.com' }))
      .rejects.toThrow('E-mail ja cadastrado')
    expect(mockRepo.save).not.toHaveBeenCalled()
  })
})
