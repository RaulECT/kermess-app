export const TIMEZONE = 'America/Mexico_City'

export const FIRESTORE_COLLECTIONS = {
  CONFIG: 'config',
  EVENT_DOC: 'event',
  USERS: 'users',
  STATIONS: 'stations',
  OPERATORS: 'operators',
  ADMINS: 'admins',
  TRANSACTIONS: 'transactions',
  AUDIT_LOG: 'auditLog',
} as const

export const CALLABLE_FUNCTIONS = {
  REGISTER_USER: 'registerUser',
  TOPUP: 'topup',
  CHARGE: 'charge',
  REVERSE_TRANSACTION: 'reverseTransaction',
  UPDATE_CONFIG: 'updateConfig',
  UPSERT_STATION: 'upsertStation',
  CREATE_OPERATOR: 'createOperator',
  CREATE_ADMIN: 'createAdmin',
  CLOSE_EVENT: 'closeEvent',
  HEALTH_CHECK: 'healthCheck',
} as const
