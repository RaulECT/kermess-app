# Kermes App

Sistema de cupones digitales para kermes de recaudación de fondos. Los asistentes compran cupones digitales, los asignan a proyectos específicos, y los consumen en estaciones (juegos, comida, etc.). Un panel de proyector muestra en tiempo real el progreso hacia las 3 metas de recaudación.

**Fecha del evento:** 30 de mayo de 2026 | **Aforo:** ~500 asistentes | **Timezone:** America/Mexico_City

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + shadcn/ui |
| Backend | Firebase Cloud Functions v2 (Node.js 20) |
| Base de datos | Firestore |
| Autenticación | Firebase Anonymous Auth |
| Validaciones | Zod (cliente + servidor) |
| Package manager | pnpm 9 (monorepo workspace) |

---

## Estructura del monorepo

```
kermess-app/
├── packages/
│   ├── frontend/           Next.js — 5 interfaces de usuario
│   │   └── src/
│   │       ├── app/        Rutas (App Router)
│   │       ├── components/ Componentes React + shadcn/ui
│   │       ├── context/    React Context providers
│   │       └── lib/        Cliente Firebase + utilidades
│   ├── functions/          Firebase Cloud Functions v2
│   │   └── src/
│   │       ├── functions/
│   │       │   ├── admin/      Funciones de administración
│   │       │   ├── caja/       Registro y recargas
│   │       │   ├── estacion/   Cobro de cupones
│   │       │   └── triggers/   Triggers de Firestore
│   │       └── lib/            Utilidades internas
│   └── shared/             Tipos TypeScript + Zod schemas compartidos
├── scripts/
│   └── seed-emulator.mjs   Datos de prueba para emuladores
├── firestore.rules         Reglas de seguridad Firestore
├── firestore.indexes.json  Índices compuestos Firestore
├── firebase.json           Configuración Firebase CLI
└── pnpm-workspace.yaml
```

---

## Requisitos previos

- **Node.js** >= 20
- **pnpm** >= 9 — `npm install -g pnpm`
- **Firebase CLI** — `npm install -g firebase-tools`

---

## Setup

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Variables de entorno

```bash
cp packages/frontend/.env.example packages/frontend/.env.local
```

Editar `packages/frontend/.env.local` con los valores del proyecto Firebase:

```bash
# Firebase Console → Project Settings → General → Your apps → Web app
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# URL base para generación de links QR (localhost en dev, URL de Vercel en prod)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Activar emuladores locales (true en desarrollo con emuladores)
NEXT_PUBLIC_USE_EMULATOR=false
```

### 3. Compilar el paquete shared

Requerido antes de correr frontend o functions por primera vez:

```bash
pnpm build:shared
```

---

## Correr la app

### Opción A — Sin emuladores (Firestore en la nube)

```bash
# Terminal 1: Frontend
pnpm dev:frontend
# http://localhost:3000

# Terminal 2 (opcional): Functions en modo watch
pnpm dev:functions
```

### Opción B — Con emuladores (desarrollo aislado, recomendado)

```bash
# Terminal 1: Emuladores Firebase
pnpm emulator:start
# Emulator UI:  http://localhost:4000
# Firestore:    http://localhost:8080
# Functions:    http://localhost:5001
# Auth:         http://localhost:9099

# Terminal 2: Frontend apuntando a emuladores
NEXT_PUBLIC_USE_EMULATOR=true pnpm dev:frontend
# http://localhost:3000

# (Opcional) Sembrar datos de prueba
pnpm emulator:seed
```

#### Datos de prueba que crea el seed

| Rol | PIN |
|---|---|
| Admin | `123456` |
| Cajero 1 | `111111` |
| Cajero 2 | `222222` |
| Estación Tacos | `3333` |
| Estación Bebidas | `4444` |
| Estación Juegos | `5555` |

También crea 5 usuarios de prueba con 100 cupones cada uno y un evento "Kermes 2026" con 3 metas de recaudación.

---

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `pnpm dev:frontend` | Dev server Next.js |
| `pnpm dev:functions` | Functions en modo watch |
| `pnpm build` | Build completo (shared → frontend → functions) |
| `pnpm build:frontend` | Build Next.js |
| `pnpm build:functions` | Bundle functions con esbuild |
| `pnpm build:shared` | Compilar tipos y schemas compartidos |
| `pnpm emulator:start` | Emuladores Firebase con persistencia |
| `pnpm emulator:seed` | Sembrar datos de prueba en emuladores |
| `pnpm lint` | ESLint en frontend |
| `pnpm type-check` | TypeScript en todos los packages |

---

## Rutas del frontend

| Ruta | Módulo | Descripción |
|---|---|---|
| `/` | Home | Página de inicio |
| `/u/[token]` | Asistente | Saldo, QR e historial de transacciones |
| `/caja` | Caja | Registro de usuarios y recarga de cupones |
| `/estacion` | Estación | Escaneo de QR y cobro |
| `/dashboard` | Dashboard | Vista pública para proyector (progreso de metas) |
| `/admin` | Admin | Configuración, reportes y reversión de transacciones |

---

## Cloud Functions (API)

### Admin
| Función | Descripción |
|---|---|
| `createInitialAdmin` | Crea el primer admin |
| `createAdmin` | Crea un nuevo admin |
| `adminLogin` | Autentica un admin por PIN |
| `createOperator` | Crea un operador de caja |
| `upsertStation` | Crea o edita una estación |
| `updateConfig` | Actualiza la configuración del evento |
| `reverseTransaction` | Revierte una transacción |

### Caja
| Función | Descripción |
|---|---|
| `cashierLogin` | Autentica un operador de caja por PIN |
| `registerUser` | Registra un nuevo asistente |
| `topup` | Recarga cupones a un asistente |

### Estación
| Función | Descripción |
|---|---|
| `stationLogin` | Autentica un operador de estación por PIN |
| `charge` | Cobra cupones a un asistente |

### Triggers
| Trigger | Descripción |
|---|---|
| `onTransactionCreate` | Actualiza agregados al crear una transacción |

---

## Deploy

```bash
# Deploy solo Cloud Functions
firebase deploy --only functions

# Deploy completo (functions + reglas Firestore)
firebase deploy
```

---

## Firebase

- **Proyecto:** `kermes-app-39afa`
- **Plan:** Blaze
- **Emuladores:** Auth (9099), Functions (5001), Firestore (8080), UI (4000)

Ver [PLAN.md](./PLAN.md) para la especificación técnica completa.
