export type OperatorRole = 'cashier'

export interface Operator {
  id: string
  name: string
  pin: string // hasheado
  role: OperatorRole
  active: boolean
}

export interface Admin {
  id: string
  name: string
  pin: string // hasheado
  active: boolean
}
