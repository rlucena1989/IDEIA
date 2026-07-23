/**
 * PADRAO DE USE CASE -- use como referencia
 */
import { AppError } from '../../../../shared/errors/AppError'
// IMPORTS NECESSARIOS (adapte ao seu modulo):
// import { User } from '../../domain/entities/User'
// import { IUserRepository } from '../../domain/repositories/IUserRepository'
// import { CreateUserInputDTO, CreateUserOutputDTO } from '../dtos/CreateUserDTO'

export class CreateUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(input: CreateUserInputDTO): Promise<CreateUserOutputDTO> {
    const existing = await this.userRepository.findByEmail(input.email)
    if (existing) throw AppError.conflict('E-mail ja cadastrado')
    const user = User.create({ name: input.name, email: input.email })
    await this.userRepository.save(user)
    return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt }
  }
}
