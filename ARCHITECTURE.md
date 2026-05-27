# Arquitectura del Sistema — Kupón

Documento técnico de referencia. Complementa `CHANGELOG.md`.
Cubre modelos de datos, flujos de autenticación, lógica de negocio y decisiones de diseño.

---

## Monorepo

```
kermess-app/
├── packages/
│   ├── frontend/       # Next.js App Router (Vercel)
│   ├── functions/      # Firebase Cloud Functions v2
│   └── shared/         # Tipos TypeScript + schemas Zod compartidos
├── firestore.rules
├── firebase.json
├── CHANGELOG.md
└── ARCHITECTURE.md     ← este archivo
```

### `@kermess/shared`

Paquete interno importado por `frontend` y `functions`. Contiene:
- **Tipos TypeScript**: `EventConfig`, `User`, `Station`, `Transaction`, `Operator`, `Admin`, `AuditLog`
- **Schemas Zod**: validación de inputs en las Cloud Functions

---

## Autenticación — sistema PIN custom

El sistema **no usa Firebase Auth**. La autenticación es 100% PIN-based, validada server-side.

### Flujo

1. El usuario introduce su PIN en el frontend
2. El frontend llama una Cloud Function pasando el PIN en texto plano (sobre HTTPS)
3. La función hace `db.collection('admins' | 'operators').get()`, itera todos los docs y compara con `bcrypt.compare(pin, hash)`
4. Si coincide → devuelve `{ id, name }` al cliente; el cliente guarda la sesión en `sessionStorage`
5. Cada llamada posterior incluye el PIN en el payload → cada función lo revalida (stateless)

### Hash

```ts
// lib/hash.ts
bcrypt.hash(pin, 10)      // al crear
bcrypt.compare(pin, hash) // al validar
```

### Sesiones por módulo

| Módulo | Storage | Contexto React |
|--------|---------|----------------|
| Admin | `sessionStorage['kermess_admin_session']` | `AdminSessionContext` |
| Caja | `sessionStorage['kermess_cashier_session']` | `CashierSessionContext` |
| Estación | `sessionStorage['kermess_station_session']` | `StationSessionContext` |

Las sesiones se pierden al cerrar la pestaña (sessionStorage, no localStorage) — intencional para seguridad en dispositivos compartidos.

### Por qué PIN y no Firebase Auth

El evento es presencial y corto. Los cajeros y operadores no tienen correo corporativo. Un PIN de 4-6 dígitos es suficiente y mucho más rápido de usar en el calor del evento.

---

## Modelos de datos Firestore

### `config/event` (documento único)

```ts
interface EventConfig {
  name: string           // nombre del evento, ej. "Kermes Primavera 2026"
  couponRate: number     // cupones por peso — ej. 0.1 → $10 = 1 cupón; 1 → $1 = 1 cupón
  goals: Goal[]          // exactamente 3 metas de recaudación
  totalRaised: number    // pesos totales recaudados (denormalizado, actualizado por trigger)
  status: 'setup' | 'live' | 'closed'
  startedAt: Timestamp | null
  endedAt: Timestamp | null
}

interface Goal {
  id: string
  name: string
  target: number   // pesos objetivo
  raised: number   // pesos recaudados (denormalizado, actualizado por trigger)
}
```

**Lectura**: pública. **Escritura**: solo Cloud Functions.

---

### `users/{userId}`

```ts
interface User {
  id: string          // UUID v4 — también es el qrToken (el QR contiene este UUID)
  name: string
  phone: string
  qrToken: string     // mismo valor que id — redundante pero explícito
  balance: number     // cupones disponibles actualmente
  totalLoaded: number // cupones cargados históricamente (nunca baja)
  createdAt: Timestamp
  createdBy: string   // cashierId que lo registró
}
```

**Lectura**: pública (el userId en la URL es la credencial). **Escritura**: solo Cloud Functions.

El link del asistente es `https://dominio/asistente/{userId}` — quien tiene el link puede ver la cartera. Modelo de seguridad: "link = credencial", como Notion o Figma.

---

### `stations/{stationId}`

```ts
interface Station {
  name: string
  type: 'simple' | 'menu'
  simplePrice: number | null  // cupones fijos si type=simple; null si type=menu
  menu: MenuItem[] | null     // items si type=menu; null si type=simple
  operatorPin: string         // hasheado con bcrypt
  totalSales: number          // cupones cobrados total (denormalizado)
  active: boolean
  order: number               // orden de aparición en UI
}

interface MenuItem {
  id: string
  name: string
  price: number   // en cupones
  active: boolean
}
```

**Lectura**: pública. **Escritura**: solo Cloud Functions.

**Tipos de estación**:
- `simple`: cobra una cantidad fija de cupones por transacción (ej. "Canicas — 50 cupones")
- `menu`: el operador selecciona items con cantidades (ej. tienda con tacos, aguas, etc.)

Login en estación: requiere `stationId` + `operatorPin`. El PIN del operador está hasheado en el doc de la estación.

---

### `transactions/{txId}`

```ts
// Topup — carga de cupones via cajero
interface TopupTransaction {
  type: 'topup'
  userId: string
  userName: string        // denormalizado
  amount: number          // cupones añadidos (positivo)
  pesosReceived: number   // pesos cobrados
  paymentMethod: 'cash' | 'transfer'
  goalId: string          // a qué meta se asigna la recaudación
  cashierId: string
  clientTxId: string      // UUID para idempotencia
  reversedByTx?: string   // id de la reversión si fue revertida
  timestamp: Timestamp
}

// Purchase — cobro en estación
interface PurchaseTransaction {
  type: 'purchase'
  userId: string
  userName: string
  amount: number          // cupones cobrados (negativo en balance del user)
  stationId: string
  stationName: string     // denormalizado
  items?: TransactionItem[] // solo si type=menu
  clientTxId: string
  reversedByTx?: string
  timestamp: Timestamp
}

// Reversal — reversión hecha por admin
interface ReversalTransaction {
  type: 'reversal'
  userId: string
  userName: string
  amount: number          // cupones devueltos (positivo)
  reverses: string        // txId de la transacción original
  reason: string          // motivo (mínimo 5 chars)
  reversedBy: string      // adminId
  clientTxId: string
  timestamp: Timestamp
}
```

**Lectura**: pública. **Escritura**: solo Cloud Functions.

---

### `operators/{operatorId}`

```ts
interface Operator {
  name: string
  pin: string       // hasheado con bcrypt
  role: 'cashier'
  active: boolean
  createdAt: Timestamp
}
```

**Lectura**: ❌ denegada al cliente (expone PIN hasheado). Solo readable via Admin SDK en Cloud Functions.

---

### `admins/{adminId}`

```ts
interface Admin {
  name: string
  pin: string       // hasheado con bcrypt
  active: boolean
  createdAt: Timestamp
}
```

**Lectura**: ❌ denegada al cliente. Solo readable via Admin SDK en Cloud Functions.

---

### `auditLog/{logId}`

```ts
interface AuditLog {
  action: AuditAction
  actorId: string
  actorName?: string
  actorRole: 'admin' | 'cashier' | 'operator'
  targetType: string
  targetId: string
  targetName?: string
  details: Record<string, unknown>
  timestamp: Timestamp
}

type AuditAction =
  | 'create_user' | 'topup' | 'charge' | 'reverse_tx'
  | 'update_config' | 'upsert_station'
  | 'create_operator' | 'create_admin'
  | 'close_event' | 'update_station_status' | 'reset_system'
```

**Lectura**: pública (no hay datos sensibles de usuarios, solo acciones del sistema).

---

## Lógica de negocio

### Conversión pesos → cupones

```
cupones = Math.floor(pesos * couponRate)
```

Ejemplos según `couponRate`:
- `0.1` → $10 = 1 cupón
- `1` → $1 = 1 cupón
- `2` → $1 = 2 cupones

El `couponRate` lo configura el admin en la pantalla de configuración.

### Idempotencia de transacciones

Cada `topup` y `charge` recibe un `clientTxId` (UUID v4 generado en el frontend **dentro del handler**, no en estado del componente). Las Cloud Functions verifican si ya existe una transacción con ese `clientTxId` antes de procesar. Si existe, devuelven `{ idempotent: true }` sin crear duplicado.

**Por qué**: si la red falla después de que el servidor procesó pero antes de que el cliente recibió la respuesta, el usuario podría reintentar. Sin idempotencia, se cobrarían cupones dos veces.

**Importante**: el `clientTxId` debe generarse **dentro del `onSubmit`**, no en `useState`. Si está en estado, se reutiliza entre transacciones y la segunda se marca como duplicado silenciosamente.

### Balance del usuario

El `balance` en `users/{userId}` se actualiza directamente en las Cloud Functions (`topup` y `charge`) usando `FieldValue.increment`. No se recalcula desde transacciones — es un valor denormalizado que se mantiene consistente via las functions.

### Metas de recaudación

El `raised` de cada meta y `totalRaised` del evento se actualizan via el trigger `onTransactionCreate`:

```
Trigger: transactions/{txId} → onCreate
Si type === 'topup':
  goals[goalId].raised += pesosReceived
  totalRaised += pesosReceived
(Usa Firestore transaction para evitar race conditions)
```

Solo los `topup` cuentan para las metas — los `purchase` y `reversal` no afectan los pesos recaudados.

---

## Trigger — `onTransactionCreate`

**Archivo**: `packages/functions/src/functions/triggers/on-transaction-create.ts`

Se dispara cada vez que se crea un documento en `transactions/`. Solo actúa si `type === 'topup'`. Usa una Firestore transaction para:

1. Leer `config/event`
2. Sumar `pesosReceived` al `raised` de la meta correspondiente (`goalId`)
3. Incrementar `totalRaised` con `FieldValue.increment`

Esto mantiene el dashboard público actualizado en tiempo real sin que el cajero tenga que hacer nada extra.

---

## Flujo completo por módulo

### Registrar asistente (Caja)

```
1. Cajero introduce nombre + teléfono + monto + método de pago + meta
2. Frontend llama registerUser({ cashierPin, name, phone })
   → Función crea users/{uuid} con balance=0
   → Envía SMS via Twilio con el link al asistente
   → Devuelve { userId }
3. Si monto > 0: llama topup({ cashierPin, userId, pesos, paymentMethod, goalId, clientTxId })
   → Función crea transactions/{txId} de type='topup'
   → Incrementa users/{userId}.balance
   → Trigger actualiza goals[goalId].raised y totalRaised
4. Frontend muestra QR con la URL: /asistente/{userId}
```

### Cobro en estación

```
1. Operador hace login con stationId + operatorPin
   → stationLogin devuelve { stationId, name, type, simplePrice, menu }
2. Escanea QR del asistente (Html5Qrcode → token = userId)
3. Consulta users/{userId} para mostrar balance
4. Para simple: cobra directamente
   Para menu: operador selecciona items
5. Frontend llama charge({ operatorPin, stationId, userId, clientTxId, items? })
   → Función verifica balance suficiente
   → Crea transactions/{txId} de type='purchase'
   → Decrementa users/{userId}.balance
6. Frontend muestra confirmación y vuelve a 'idle'
```

### Revertir transacción (Admin)

```
1. Admin busca la transacción en el tab Transacciones
2. Ingresa motivo (mínimo 5 chars)
3. Frontend llama reverseTransaction({ adminPin, txId, reason })
   → Función crea transactions/{reversalId} de type='reversal' con amount positivo
   → Incrementa balance del usuario
   → Marca la tx original con reversedByTx = reversalId
```

---

## Patrones importantes

### onSnapshot con reconexión (admin module)

Todos los tabs del admin usan este patrón para sobrevivir desconexiones:

```ts
useEffect(() => {
  let unsub: (() => void) | undefined
  let active = true
  function setup() {
    unsub?.()
    unsub = onSnapshot(target, callback, () => { if (active) setup() })
  }
  function reconnect() { if (active) setup() }
  setup()
  document.addEventListener('visibilitychange', reconnect)
  window.addEventListener('online', reconnect)
  return () => {
    active = false
    unsub?.()
    document.removeEventListener('visibilitychange', reconnect)
    window.removeEventListener('online', reconnect)
  }
}, [])
```

### Html5Qrcode — id único por montaje (estación)

`Html5Qrcode` mantiene estado global keyed por el id del elemento DOM. Si se reutiliza el mismo id entre sesiones (logout/login), el scanner se cuelga. Fix: id único por montaje.

```ts
const scanId = useMemo(() => `qr-reader-${Math.random().toString(36).slice(2)}`, [])
// usar scanId en lugar de string fijo 'qr-reader'
```

### listStaff — por qué no onSnapshot directo

`operators` y `admins` tienen `allow read: if false` en Firestore rules para proteger los PINs hasheados. El frontend no puede leerlos directamente. Se usa la Cloud Function `listStaff` que valida el PIN admin y devuelve solo `{ id, name, role }` — sin exponer el campo `pin`.

---

## Variables de entorno y secrets

### Frontend (`packages/frontend/.env`)

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_APP_URL        # URL base para links de asistentes
```

### Functions — Firebase Secret Manager

```
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_SMS_FROM            # número Twilio en formato +1XXXXXXXXXX
APP_BASE_URL               # URL base, configurar con printf (no echo) para evitar \n
```

Configurar con:
```bash
printf 'https://dominio.com' | firebase functions:secrets:set APP_BASE_URL
```

---

## Decisiones de diseño relevantes

| Decisión | Por qué |
|----------|---------|
| PIN custom vs Firebase Auth | Evento presencial corto, cajeros/operadores sin correo corporativo, PIN más rápido en campo |
| `userId === qrToken` | Simplifica: el UUID en el QR es directamente el ID del documento |
| Balance denormalizado en `users` | Evitar recalcular sumando todas las transacciones en cada lectura; el dashboard del asistente carga instantáneo |
| `raised`/`totalRaised` denormalizados | El dashboard público necesita leer un solo documento para mostrar el progreso |
| Trigger para actualizar metas | Desacopla la lógica de recaudación del `topup`; si el trigger falla, la transacción ya se creó y se puede reprocesar |
| Reglas Firestore `operators`/`admins` read=false | Los PINs están hasheados pero es mala práctica exponer hashes al cliente |
| SessionStorage (no localStorage) | Dispositivos compartidos en el evento — la sesión muere al cerrar la pestaña |
| `clientTxId` generado en `onSubmit` | Si está en `useState`, se reutiliza entre transacciones y la segunda se trata como duplicado |
