/**
 * PADRAO DE INTERFACE DE REPOSITORIO -- use como referencia
 */
export interface IUserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  findAll(page: number, perPage: number): Promise<{ users: User[]; total: number }>
  save(user: User): Promise<void>
  update(user: User): Promise<void>
  delete(id: string): Promise<void>
}
