export type StationType = 'simple' | 'menu'

export interface MenuItem {
  id: string
  name: string
  price: number // cupones
  active: boolean
}

export interface Station {
  id: string
  name: string
  type: StationType
  simplePrice: number | null // cupones, si type=simple
  menu: MenuItem[] | null // si type=menu
  operatorPin: string // hasheado
  totalSales: number // cupones, denormalizado
  active: boolean
  order: number // para ordenar en UI
}
