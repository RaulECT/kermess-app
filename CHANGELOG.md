# Changelog — Kermess App (Kupón)

Registro completo de todo lo implementado, corregido y diseñado en el proyecto.
Útil como contexto para sesiones asíncronas posteriores.

---

## Stack técnico

- **Frontend**: Next.js (App Router), React, Tailwind CSS v4, shadcn/ui, Firebase client SDK
- **Backend**: Firebase Cloud Functions v2 (Node.js), Firebase Admin SDK, Firestore
- **Auth**: PIN-based (no Firebase Auth), bcryptjs para hash
- **Mensajería**: Twilio SMS (antes WhatsApp, migrado a SMS)
- **Diseño**: Pencil (`.pen`), tokens oscuros custom
- **Deploy**: Vercel (frontend), Firebase (functions + Firestore)
- **Monorepo**: `packages/frontend` + `packages/functions` + `packages/shared`

---

## Rutas del sistema

| Ruta | Módulo | Auth |
|------|--------|------|
| `/admin` | Panel de administración | PIN admin |
| `/caja` | Módulo cajero | PIN cajero |
| `/estacion` | Módulo operador de estación | PIN estación + operador |
| `/dashboard` | Pantalla pública de metas | Ninguna (público) |
| `/asistente/[userId]` | Cartera digital del asistente | Ninguna (link único) |

---

## [2026-05-05] — Implementación base

### Frontend — validaciones
- Validación de nombre (mínimo 2 caracteres) y teléfono en formularios de la caja
- Validación de monto máximo en la carga de cupones
- Try/catch implementado en `writeAudit` (no interrumpir flujos principales si el log falla)

---

## [2026-05-06] — Sesión principal de features

### 1. Implementación de diseño desde Pencil

Implementados 5 módulos desde `/pencil-new.pen` al frontend:

- **`globals.css`** — tokens de diseño oscuro + compat shadcn (Tailwind v4 `@theme inline`)
  - `surface-primary: #0A0A0A`, `surface-secondary: #1A1A1A`, `surface-elevated: #222222`
  - `accent-primary: #A855F7` (morado), `accent-amber: #F59E0B` (naranja estación)
  - `fg-primary: #FFFFFF`, `fg-secondary: #A1A1AA`, `fg-muted: #71717A`
- **`asistente/[token]`** — header gradiente morado, QR card, balance, historial en dark
- **`dashboard`** — cards side-by-side (desktop), stacked (mobile), gradiente total recaudado
- **`caja/page.tsx`** — sidebar 260px (desktop), bottom nav 4 items (mobile)
- **`estacion`** — sidebar naranja (desktop), bottom nav 3 items (mobile)
- **`admin/page.tsx`** — sidebar 240px (desktop), icon sidebar (tablet), bottom nav (mobile)

### 2. Reconexión en tiempo real — módulo admin

Los 5 tabs del admin (`config-tab`, `stations-tab`, `transactions-tab`, `audit-tab`, `reports-tab`) tenían `onSnapshot` sin reconexión. Al perder conexión y recuperarla, los datos no se actualizaban.

**Fix**: patrón `setup()` + listeners `visibilitychange` + `online` en cada tab.

```ts
function setup() {
  unsub?.()
  unsub = onSnapshot(target, callback, () => { if (active) setup() })
}
document.addEventListener('visibilitychange', reconnect)
window.addEventListener('online', reconnect)
```

### 3. Exportar CSV — auditoría

- Botón "Exportar CSV" en `audit-tab.tsx`
- Columnas: Fecha, Acción, Rol, Actor, Destino, Tipo destino, Detalles
- Etiquetas en español, BOM incluido para compatibilidad con Excel

### 4. Exportar CSV — transacciones

- `transactions-tab.tsx`: columna "Tipo" usa etiquetas legibles (`Recarga`, `Cobro`, `Reversión`)

### 5. Exportar Excel multi-hoja — reportes

- Instalado `xlsx` (SheetJS) en `packages/frontend`
- `reports-tab.tsx`: botón "Exportar Excel" genera `.xlsx` con 5 hojas:
  - Resumen (KPIs), Por meta, Método de pago, Por estación, Por hora

### 6. Reset del sistema

- **Cloud Function `resetSystem`** (`packages/functions/src/functions/admin/reset-system.ts`):
  - Valida PIN admin
  - Borra colecciones en batches de 500: `stations`, `operators`, `users`, `transactions`, `auditLog`
  - Resetea `config/event`: `status→setup`, `totalRaised→0`, `goals[].raised→0`, fechas→null
  - Escribe un audit log del reset como primer entry del log limpio
- **Shared**: nuevo tipo `reset_system` en `AuditAction`, schema `resetSystemSchema`
- **UI en `config-tab.tsx`**: tarjeta "Zona de peligro", modal de confirmación requiere escribir `"RESET"` exacto

### 7. Mensajería Twilio — evolución WhatsApp → SMS

**Historia completa**:
1. Se implementó WhatsApp via Twilio (`whatsapp.ts`) con sandbox (`whatsapp:+14155238886`)
2. La ruta `/u/[token]` fue renombrada a `/asistente/[token]` porque WhatsApp interpretaba `/u/` como escape Unicode y partía el link
3. Se descubrió que el sandbox tiene límite de 5 mensajes/día en trial
4. Se decidió migrar a **SMS** (más confiable, sin aprobación de plantillas)
5. Helper cambiado a `sendWelcomeSMS` en `packages/functions/src/lib/sms.ts`
6. `register-user.ts` usa SMS al registrar un asistente

**Secrets en Firebase Secret Manager**:
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM`, `APP_BASE_URL`
- `APP_BASE_URL` debe configurarse con `printf` (no `echo`) para evitar `\n` al final

**Nota para producción**: Actualizar `APP_BASE_URL` con dominio definitivo.

### 8. Reenviar link por SMS — `resendUserLink`

- Nueva Cloud Function `resendUserLink` en `packages/functions/src/functions/caja/resend-user-link.ts`
- El cajero busca al asistente por nombre/teléfono y reenvía el SMS con su link personal
- Normalización de teléfono: añade `+521` si no empieza con `+` (México)
- UI en módulo caja como opción del menú principal

### 9. Bug: `clientTxId` estático entre transacciones

- **Causa**: `useState(uuidv4())` se genera una sola vez al montar el componente. Al hacer "Registrar otro", el ID se reutilizaba y el backend lo trataba como duplicado (idempotencia), omitiendo el topup.
- **Fix en `register-user.tsx`**: `clientTxId = uuidv4()` dentro de `onSubmit` (no en estado)
- **Fix en `topup-flow.tsx`**: `clientTxId: uuidv4()` inline en el call

### 10. Bug: metas stale al registrar otro asistente

- **Causa**: `getDoc` una sola vez en `useEffect([], [])` — los datos de metas no se actualizaban entre registros
- **Fix**: reemplazado `getDoc` con `onSnapshot` en `register-user.tsx` y `topup-flow.tsx`

### 11. Descripciones de audit log

- Cada acción del sistema tiene etiqueta legible en `audit-tab.tsx` → `ACTION_LABEL`
- Incluye `reset_system: 'Reset del sistema'` (añadido posteriormente)

---

## [2026-05-07] — Branding y manuales PDF

### 12. Branding: nombre actualizado a "Kupón"

- Nombre de la app actualizado a "Kupón" (con acento) en toda la UI
- Favicon actualizado

### 13. Manuales de uso en PDF (Pencil → PDF)

Se generaron 4 manuales desde el archivo `/pencil-new.pen`:

| Archivo | Slides | Módulo |
|---------|--------|--------|
| `manual-asistente.pdf` | — | Módulo Asistente |
| `manual-admin.pdf` | Admin 01–11 | Panel de Administración |
| `manual-caja.pdf` | — | Módulo Caja |
| `manual-sistema.pdf` | Guia 01–15 | Guía completa del sistema |

**Manual Sistema** — contenido de los 15 slides:
1. Portada
2. ¿Qué es Kupón?
3. Config Inicial (crear admin)
4. Preparar Evento (metas, coupon rate)
5. Registrar Personal (cajeros y operadores)
6. Iniciar Evento (flujo Setup → Live → Closed)
7. En la Caja (registrar asistentes, topup)
8. En las Estaciones (cobrar cupones)
9. Dashboard Público (`/dashboard`)
10. Los Asistentes (cartera digital)
11. Durante el Evento (operación normal)
12. Cierre del Evento
13. Recargar Cupones a un Asistente *(slide nuevo)*
14. Reenviar Link por SMS *(slide nuevo)*
15. URLs de Acceso al Sistema *(slide nuevo — referencia rápida de rutas)*

**Correcciones aplicadas a los slides antes de exportar**:
- Admin 02/03: "Kupon" → "Kupón" (sin acento era incorrecto)
- Admin 07: aclarado que estaciones y personal son "dos tabs separadas"
- Guia 03: texto botón corregido a "Primera vez — Configurar admin inicial"
- Guia 07/10: eliminadas referencias a WhatsApp (migrado a SMS)

---

## [2026-05-08] — Bugs en producción

### 14. Bug: Reset del sistema — error interno del servidor

- **Causa**: `configSnap.exists()` llamado como función. En Firebase Admin SDK, `exists` es una **propiedad booleana**, no un método. Llamarla como `exists()` tiraba `TypeError` que el catch convertía en "internal server error".
- **Fix en `reset-system.ts:36`**: `configSnap.exists()` → `configSnap.exists`
- **Deploy requerido**: Cloud Functions

### 15. Bug: cajeros no se listaban después de cambiar de tab

- **Causa**: el estado `staff` vivía en `useState` local. Al cambiar de tab, el componente `PersonalTab` se desmontaba y remontaba vacío.
- **Análisis**: `operators` y `admins` en Firestore tienen `allow read: if false` en las reglas (intencional para no exponer PINs hasheados). Un `onSnapshot` directo del cliente fallaba silenciosamente.
- **Fix**:
  - Nueva Cloud Function `listStaff` (`packages/functions/src/functions/admin/list-staff.ts`): valida PIN admin y devuelve nombre/id/rol de operators y admins **sin el campo `pin`**
  - `personal-tab.tsx`: reemplazado `useState` por llamada a `listStaff` en `useEffect` + después de cada creación
  - Callable `listStaff` añadido a `callables.ts`
- **Deploy requerido**: Cloud Functions + Frontend

### 16. Bug: QR scanner se queda en "Verificando QR" al cambiar de estación

- **Causa**: `Html5Qrcode` mantiene estado interno global keyed por el id del elemento DOM (`'qr-file-reader'`). Al hacer logout/login entre estaciones, el componente remontaba con el mismo id fijo, pero la librería encontraba estado corrupto del scan anterior en su registro global.
- **Causa secundaria**: el bloque `catch` no llamaba `scanner.clear()`, dejando estado sucio para el siguiente scan.
- **Fix en `qr-charge-flow.tsx`**:
  - `scanId` único por montaje: `useMemo(() => 'qr-reader-' + Math.random().toString(36).slice(2), [])`
  - `scanner.clear()` añadido también en el bloque `catch`
- **Deploy requerido**: Frontend

---

## Estado actual del sistema (2026-05-19)

### Cloud Functions exportadas (`packages/functions/src/index.ts`)

**Admin**: `adminLogin`, `createInitialAdmin`, `updateConfig`, `upsertStation`, `createOperator`, `createAdmin`, `listStaff`, `reverseTransaction`, `resetSystem`

**Caja**: `cashierLogin`, `registerUser`, `topup`, `resendUserLink`

**Estación**: `stationLogin`, `charge`

**Triggers**: `onTransactionCreate`

### Colecciones Firestore y permisos de lectura cliente

| Colección | Lectura cliente | Notas |
|-----------|----------------|-------|
| `config/event` | ✅ Pública | Estado del evento, metas, coupon rate |
| `users/{id}` | ✅ Pública | Link único = credencial; sin datos sensibles |
| `stations/{id}` | ✅ Pública | Menús y precios |
| `transactions/{id}` | ✅ Pública | Filtrado por userId en cliente |
| `auditLog/{id}` | ✅ Pública | Solo admin accede via PIN |
| `operators/{id}` | ❌ Solo functions | Contiene PIN hasheado |
| `admins/{id}` | ❌ Solo functions | Contiene PIN hasheado |

### Flujo de estados del evento

```
Setup ──[▶ Iniciar evento]──▶ Live ──[■ Cerrar evento]──▶ Closed
  ▲                                                           │
  └──────────────────[Reset sistema]──────────────────────────┘
```

### Pendientes para producción

- [ ] Configurar número SMS propio en Twilio (actualmente en sandbox/trial)
- [ ] Actualizar `APP_BASE_URL` secret con dominio definitivo: `printf 'https://dominio.com' | firebase functions:secrets:set APP_BASE_URL`
- [ ] Registrar número WhatsApp Business si se quiere migrar de vuelta a WhatsApp en el futuro
