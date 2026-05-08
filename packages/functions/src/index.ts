import { initializeApp } from 'firebase-admin/app'

initializeApp()

// Admin
export { adminLogin } from './functions/admin/admin-login'
export { createInitialAdmin } from './functions/admin/create-initial-admin'
export { updateConfig } from './functions/admin/update-config'
export { upsertStation } from './functions/admin/upsert-station'
export { createOperator } from './functions/admin/create-operator'
export { createAdmin } from './functions/admin/create-admin'
export { listStaff } from './functions/admin/list-staff'

// Caja
export { cashierLogin } from './functions/caja/cashier-login'
export { registerUser } from './functions/caja/register-user'
export { topup } from './functions/caja/topup'
export { resendUserLink } from './functions/caja/resend-user-link'

// Estación
export { stationLogin } from './functions/estacion/station-login'
export { charge } from './functions/estacion/charge'

// Admin avanzado
export { reverseTransaction } from './functions/admin/reverse-transaction'
export { resetSystem } from './functions/admin/reset-system'

// Triggers
export { onTransactionCreate } from './functions/triggers/on-transaction-create'
