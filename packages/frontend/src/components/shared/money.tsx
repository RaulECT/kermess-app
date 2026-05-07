interface MoneyProps {
  amount: number
  unit?: 'coupons' | 'pesos'
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  sm: 'text-xl font-semibold',
  md: 'text-3xl font-bold',
  lg: 'text-5xl font-extrabold',
  xl: 'text-7xl font-extrabold',
}

export function Money({ amount, unit = 'coupons', size = 'md' }: MoneyProps) {
  const formatted =
    unit === 'coupons'
      ? `${amount.toLocaleString('es-MX')} ${amount === 1 ? 'cupón' : 'cupones'}`
      : new Intl.NumberFormat('es-MX', {
          style: 'currency',
          currency: 'MXN',
          minimumFractionDigits: 0,
        }).format(amount)

  return <span className={sizeClasses[size]}>{formatted}</span>
}
