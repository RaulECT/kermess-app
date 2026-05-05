# Kermes App

Sistema de cupones digitales para kermes de recaudación de fondos.
**Fecha del evento:** 30 de mayo de 2026 — **Aforo:** ~500 asistentes

---

## Estructura del monorepo

```
kermess-app/
├── packages/
│   ├── frontend/       Next.js 15 — 5 interfaces de usuario
│   ├── functions/      Firebase Cloud Functions v2
│   └── shared/         Tipos TypeScript + Zod schemas (compartidos)
├── firestore.rules     Reglas de seguridad de Firestore
├── firestore.indexes.json
├── firebase.json       Configuración de Firebase CLI
└── pnpm-workspace.yaml
```

## Requisitos

- Node.js >= 20
- pnpm >= 9
- Firebase CLI: `npm install -g firebase-tools`

## Setup local

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Variables de entorno

```bash
cp packages/frontend/.env.example packages/frontend/.env.local
# Editar .env.local con los valores de Firebase Console
# Firebase Console → Project Settings → General → Your apps → Web app
```

### 3. Compilar shared (requerido antes de frontend/functions)

```bash
pnpm build:shared
```

### 4. Desarrollo frontend

```bash
pnpm dev:frontend
# http://localhost:3000
```

### 5. Emuladores Firebase (Firestore + Functions + Auth)

```bash
# Desde la raíz del proyecto
firebase emulators:start
# UI: http://localhost:4000
# Firestore: http://localhost:8080
# Functions: http://localhost:5001
```

### 6. Build completo

```bash
pnpm build
```

---

## Rutas del frontend

| Ruta | Descripción |
|---|---|
| `/` | Inicio |
| `/u/[token]` | Vista del asistente (saldo + QR) |
| `/caja` | Módulo de caja (registro + recarga) |
| `/estacion` | Módulo de estación (cobro) |
| `/dashboard` | Dashboard público (proyector) |
| `/admin` | Panel de administración |

## Fases de desarrollo

Ver [PLAN.md](./PLAN.md) para la especificación completa.

- **Fase 1** ✅ Fundación (monorepo, tipos, reglas Firestore)
- **Fase 2** Admin + Configuración
- **Fase 3** Caja
- **Fase 4** Asistente
- **Fase 5** Estación
- **Fase 6** Dashboard público
- **Fase 7** Admin avanzado (reportes, reversals, export)
- **Fase 8** Testing y pulido
- **Fase 9** Deploy y soft launch
