# Kermes App — Plan de Implementación

Sistema de cupones digitales para kermes de recaudación de fondos.
**Fecha del evento:** 30 de mayo de 2026.
**Aforo estimado:** 500 asistentes.
**Idioma:** Español mexicano.
**Timezone:** America/Mexico_City.

---

## 1. Resumen funcional

La kermes recauda fondos para **3 proyectos/categorías** distintas. Los asistentes compran cupones en un módulo de caja (efectivo o transferencia, manejado manualmente por el operador) y **eligen a cuál de las 3 metas asignar su aportación**. Los cupones se consumen en estaciones (juegos, comida, etc.). Un proyector muestra en vivo el avance hacia cada meta.

**Cinco flujos / interfaces:**
1. **Asistente** — abre un link con su token, ve saldo y QR.
2. **Caja (registro + recarga)** — registra personas nuevas y recarga cupones.
3. **Estación** — escanea QR y cobra cupones.
4. **Dashboard público** — proyector con progreso de las 3 metas.
5. **Admin** — configura el evento, ve reportes, corrige errores.

---

## 2. Stack técnico

- **Framework:** Next.js 15 (App Router) + TypeScript (strict)
- **UI:** Tailwind CSS + shadcn/ui
- **Backend:** Firebase (Firestore + Anonymous Auth + Cloud Functions v2)
- **Hosting:** Vercel (frontend) + Firebase (backend)
- **QR:** `qrcode.react` (generar), `html5-qrcode` (escanear)
- **Validación:** Zod
- **Forms:** React Hook Form + zodResolver
- **Fechas:** date-fns + date-fns-tz
- **Gestor de paquetes:** pnpm
- **Plan de Firebase:** Blaze (con budget alert en $200 MXN)

---

## 3. Modelo de datos (Firestore)

```
/config/event (documento único)
  - name: string                    // "Kermes App"
  - couponRate: number              // cupones por peso (default 1)
  - goals: [
      { id: string, name: string, target: number, raised: number }
    ]                               // 3 metas
  - totalRaised: number             // denormalizado, Cloud Function
  - status: 'setup' | 'live' | 'closed'
  - startedAt: Timestamp | null
  - endedAt: Timestamp | null

/users/{userId}                     // userId = UUID generado
  - name: string
  - phone: string
  - qrToken: string                 // UUID que va en el QR (= userId)
  - balance: number                 // cupones disponibles
  - totalLoaded: number             // cupones totales cargados histórico
  - createdAt: Timestamp
  - createdBy: string               // operatorId de caja

/stations/{stationId}
  - name: string
  - type: 'simple' | 'menu'
  - simplePrice: number | null      // cupones, si type=simple
  - menu: [
      { id, name, price, active }
    ] | null                        // si type=menu
  - operatorPin: string             // hasheado, 4-6 dígitos
  - totalSales: number              // cupones, denormalizado
  - active: boolean
  - order: number                   // para ordenar en UI

/operators/{operatorId}             // operadores de caja
  - name: string
  - pin: string                     // hasheado
  - role: 'cashier'
  - active: boolean

/admins/{adminId}
  - name: string
  - pin: string                     // hasheado
  - active: boolean

/transactions/{txId}
  - type: 'topup' | 'purchase' | 'reversal'
  - userId: string
  - userName: string                // denormalizado para reportes
  - amount: number                  // cupones (positivo = ingreso al user, negativo = gasto)
  - clientTxId: string              // idempotencia

  // solo topup:
  - pesosReceived?: number
  - paymentMethod?: 'cash' | 'transfer'
  - goalId?: string                 // a qué meta va
  - cashierId?: string

  // solo purchase:
  - stationId?: string
  - stationName?: string
  - operatorPin?: string            // para trazabilidad
  - items?: [{ name, price, qty }]  // solo si estación con menú

  // solo reversal:
  - reverses: string                // txId original
  - reason: string
  - reversedBy: string              // adminId

  - reversedByTx?: string           // si esta tx fue revertida
  - timestamp: Timestamp

/auditLog/{logId}
  - action: string                  // 'create_user', 'reverse_tx', 'update_station', etc.
  - actorId: string
  - actorRole: 'admin' | 'cashier' | 'operator'
  - targetType: string
  - targetId: string
  - details: object
  - timestamp: Timestamp
```

---

## 4. Roles y acceso

| Rol | Autenticación | Permisos |
|---|---|---|
| **Asistente** | Link con token `qrToken` | Ver su saldo, su QR, su historial |
| **Operador de caja** | PIN personal | Crear usuarios, recargar cupones |
| **Operador de estación** | PIN de la estación | Escanear QR, cobrar cupones |
| **Admin** | PIN personal | Todo: config, reportes, reversals, cerrar evento |
| **Público (proyector)** | URL abierta | Solo lectura del progreso de metas |

**Nota:** Firebase Anonymous Auth se usa para todo (cada sesión se auth anónima). El "rol" se valida en Cloud Functions mediante el PIN enviado y consultando `/operators`, `/admins` o `/stations`.

---

## 5. Reglas de seguridad Firestore (resumen)

**Principio:** el cliente NUNCA escribe directo a campos sensibles (`balance`, `totalRaised`, `raised`, `totalSales`, `goals[].raised`). Todo pasa por Cloud Functions o transacciones con validación estricta.

- `/config/event`: lectura pública; escritura solo por Cloud Function de admin.
- `/users/{id}`: lectura pública por `qrToken` (el ID **es** el token, así que quien tenga el link puede leer). Escritura solo por Cloud Function.
- `/stations/{id}`: lectura pública (para menús y precios); escritura solo por Cloud Function de admin.
- `/transactions`: creación solo por Cloud Functions; lectura solo por admin (filtro server-side) o por `userId` del propio token.
- `/auditLog`: lectura admin, escritura solo Cloud Function.

---

## 6. Cloud Functions (v2, callable y triggers)

**Callables (HTTPS):**
- `registerUser(cashierPin, name, phone)` → crea user, retorna qrToken
- `topup(cashierPin, userId, pesos, paymentMethod, goalId)` → crea topup tx, actualiza balance
- `charge(operatorPin, stationId, userId, clientTxId, items?)` → usa runTransaction, valida saldo, debita, registra
- `reverseTransaction(adminPin, txId, reason)` → crea tx de reversión, restaura estado
- `updateConfig(adminPin, patch)` → cambia tasa, metas, nombre
- `upsertStation(adminPin, station)` → crea/edita estación
- `createOperator(adminPin, name, pin)` / `createAdmin(adminPin, name, pin)`
- `closeEvent(adminPin)` → congela escrituras

**Triggers:**
- `onTransactionCreate` → actualiza `config.event.totalRaised`, `goals[].raised`, `stations.totalSales`
- `onTransactionCreate` (reversal) → deshace lo anterior

**Por qué callables:** centralizan validación de PIN, evitan duplicar lógica, rate-limit built-in.

---

## 7. Especificación de pantallas

### 7.1 Asistente — `/u/[token]`
- Sin login explícito, el token en URL es la credencial.
- Muestra: nombre, saldo grande (**"120 cupones"**), QR grande (contiene `userId`).
- Historial de compras (lista simple).
- Botón "Agregar a pantalla de inicio" (PWA).
- Listener `onSnapshot` del documento de user para actualización en vivo.
- Si el token no existe, muestra error amable.

### 7.2 Caja — `/caja`
**Login:** PinPad numérico, valida contra `/operators`.

**Pantalla principal (3 acciones):**
1. **Registrar nuevo** → form: nombre, teléfono → genera user + QR → vista "entregar link" (QR imprimible + URL + botón "Copiar WhatsApp").
2. **Recargar existente** → buscar por nombre/teléfono o escanear QR → captura pesos → selecciona método (efectivo/transferencia) → **selecciona meta (3 botones)** → confirma.
3. **Ver mis recargas del día** (historial del turno).

**Cálculo automático:** `cupones = pesos * couponRate`. Mostrar ambos al confirmar.

### 7.3 Estación — `/estacion`
**Login:** PinPad numérico + selecciona estación de lista activa (valida PIN contra estación).

**Pantalla principal:**
- Botón grande **"Escanear QR"** (abre cámara con `html5-qrcode`).
- Al escanear:
  - **Estación simple:** muestra nombre del asistente, saldo, precio, botón "Cobrar N cupones". Confirma → animación éxito/error.
  - **Estación con menú:** muestra productos con botones +/-, carrito acumulado, total, botón "Cobrar". El operador puede ir sumando items.
- Validación de saldo server-side.
- Generar `clientTxId` (UUID) por intento para idempotencia.
- Historial de ventas del turno al final.

### 7.4 Dashboard público — `/dashboard`
- URL abierta, diseño fullscreen/TV-friendly, tipografía grande.
- **3 barras de progreso grandes**, una por meta: "$X / $Y" + porcentaje.
- Total general en la parte superior.
- Fondo llamativo pero no agresivo.
- Sin datos sensibles (nombres, teléfonos).
- `onSnapshot` sobre `/config/event`.
- Animación suave al actualizarse los números (CountUp).
- Botón discreto para pantalla completa.

### 7.5 Admin — `/admin`
**Login:** PIN personal.

**Secciones:**
- **Configuración**
  - Nombre del evento, tasa cupón/peso, nombres y montos de las 3 metas.
  - Estado del evento (setup / live / closed).
- **Estaciones** — CRUD, toggle active, ver ventas por estación.
- **Personal** — crear/desactivar cajeros, operadores de estación (via PIN de estación), otros admins.
- **Reportes**
  - Total recaudado, por meta, por estación, por método de pago, por hora.
  - Gráfica de recaudación acumulada.
  - Top asistentes por gasto (opcional).
- **Transacciones** — listado con filtros (tipo, estación, fecha, usuario), botón "Revertir" en cada una.
- **Auditoría** — log de acciones.
- **Exportar** — CSV de transacciones, usuarios, ventas por estación.
- **Cerrar evento** — acción destructiva con confirmación doble.

---

## 8. Consideraciones críticas

1. **Concurrencia:** TODA operación que toque `balance` usa `runTransaction` de Firestore. No negociable.

2. **Idempotencia:** cada `charge()` requiere `clientTxId` generado en cliente. Si llega el mismo dos veces, la función detecta y no duplica.

3. **QR token:** el `qrToken` es el `userId` (UUID v4). No JWT — no hay expiración, el evento dura un día. Validación siempre server-side.

4. **Offline:**
   - **Asistente:** puede funcionar offline (solo lectura cacheada).
   - **Estación y caja:** REQUIEREN conexión. No permitimos cobros/recargas offline para evitar inconsistencias de saldo. Si no hay red → mensaje claro "Sin conexión, espera o busca mejor señal".

5. **PINs hasheados:** todos los PINs con bcrypt o similar en Cloud Function. Nunca en plano en Firestore.

6. **Rate limiting:** Cloud Functions con límite básico por IP para evitar brute force de PINs.

7. **Privacidad:** solo nombre y teléfono. El teléfono se puede purgar al cerrar evento (opción en admin).

8. **Timezone:** todas las fechas UI se formatean con `America/Mexico_City`.

9. **Validación de metas:** al crear topup, validar que `goalId` existe y está activa.

10. **Reversals:** solo admin. Crean tx tipo `reversal` que restaura saldo y ajusta contadores. La original queda marcada con `reversedByTx`.

11. **Estado del evento:**
    - `setup`: solo admin puede modificar config y estaciones. No se permiten topups ni charges.
    - `live`: operaciones normales, config bloqueada.
    - `closed`: solo lectura, reportes disponibles.

12. **PWA:** manifest + service worker básico para instalación en home screen (especialmente útil para asistentes).

---

## 9. Fases de desarrollo

### Fase 1 — Fundación
- Setup Next.js 15 + TypeScript strict + Tailwind + shadcn/ui.
- Firebase project, Firestore, Anonymous Auth, Cloud Functions scaffold.
- Estructura de carpetas: `src/app`, `src/components/ui`, `src/lib/firebase`, `src/lib/types`, `src/lib/validations`, `functions/src`.
- Tipos TypeScript de todo el modelo.
- Reglas de seguridad Firestore iniciales (restrictivas).
- Helpers comunes: `PinPad`, `QRScanner`, `QRDisplay`, `Money`, `CountUp`.
- Sistema de "sesión por rol" en client (token en memoria / cookie httpOnly para PIN).

### Fase 2 — Admin + Configuración
- Login admin.
- Pantalla de config del evento (nombre, tasa, 3 metas con target).
- CRUD de estaciones (simple/menú).
- Creación de cajeros y admins.
- Cloud Functions `updateConfig`, `upsertStation`, `createOperator`, `createAdmin`.

### Fase 3 — Caja
- Login cajero.
- Registro de nuevo asistente → genera user + QR imprimible.
- Búsqueda y recarga con selección de meta.
- Historial del turno.
- Cloud Functions `registerUser`, `topup`.

### Fase 4 — Asistente
- Página `/u/[token]` con saldo, QR, historial.
- Listener en tiempo real.
- PWA installable.

### Fase 5 — Estación
- Login operador + selección de estación.
- Escáner QR.
- Flujo simple y flujo menú.
- Cloud Function `charge` con `runTransaction` e idempotencia.

### Fase 6 — Dashboard público
- `/dashboard` con 3 metas en tiempo real.
- Diseño para proyector.
- Animación de números.
- Trigger `onTransactionCreate` para mantener `raised` de cada meta y `totalRaised`.

### Fase 7 — Admin avanzado
- Reportes (totales, por estación, por hora, por método).
- Listado de transacciones con filtros.
- `reverseTransaction` con auditoría.
- Export CSV.
- Cierre del evento.

### Fase 8 — Testing y pulido
- Flujo end-to-end con datos de prueba.
- Simulacro con 5-10 personas reales.
- Documentación de 1 página por rol.
- Seeds de desarrollo (3 cajeros, 10 estaciones, 5 usuarios).
- Revisar accesibilidad básica y responsive.

### Fase 9 — Deploy y soft launch
- Deploy a producción (Vercel + Firebase).
- Entrega a organizadores semanas antes del 30 de mayo.
- Sesiones de capacitación.
- Ajustes basados en feedback.

---

## 10. Entregables

- Repositorio GitHub con README.
- URLs en producción para los 5 flujos.
- Una hoja resumen por rol (asistente, cajero, operador, admin).
- Documento "Día del evento" con pasos de apertura/cierre.
- Credenciales iniciales (1 admin semilla).
- Guía de backup / export al cierre.

---

## 11. Fuera de alcance (v1)

- Pagos con tarjeta dentro de la app (la caja los registra manualmente).
- Reembolsos de cupones no usados.
- Ranking público por estación (solo admin lo ve).
- Notificaciones push.
- Multi-evento (solo una kermes).
- Internacionalización (solo es-MX).
