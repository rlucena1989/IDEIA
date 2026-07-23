/**
 * PADRAO DE ENTIDADE -- use como referencia
 */
import { randomUUID } from 'crypto'

export class User {
  readonly id: string
  private _name: string
  private _email: string
  readonly createdAt: Date

  private constructor(props: { id?: string; name: string; email: string; createdAt?: Date }) {
    if (!props.name || props.name.trim().length < 2) throw new Error('Nome invalido')
    if (!props.email?.includes('@')) throw new Error('E-mail invalido')
    this.id        = props.id ?? randomUUID()
    this._name     = props.name.trim()
    this._email    = props.email.toLowerCase()
    this.createdAt = props.createdAt ?? new Date()
  }

  static create(props: { name: string; email: string }): User { return new User(props) }
  static reconstitute(props: { id: string; name: string; email: string; createdAt: Date }): User {
    return new User(props)
  }

  get name()  { return this._name }
  get email() { return this._email }

  changeName(name: string): void {
    if (!name || name.trim().length < 2) throw new Error('Nome invalido')
    this._name = name.trim()
  }
}
