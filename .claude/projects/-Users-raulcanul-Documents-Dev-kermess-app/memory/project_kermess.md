---
name: Kermes App — Contexto del proyecto
description: Sistema de cupones digitales para kermes 30 mayo 2026, monorepo pnpm workspaces con Next.js + Firebase
type: project
---

Kermes App es un sistema de cupones digitales para una kermes de recaudación de fondos el 30 de mayo de 2026 (~500 asistentes).

**Why:** Recaudar fondos para 3 proyectos/metas. Asistentes compran cupones en caja y los gastan en estaciones.

**How to apply:** Cada sesión nueva, leer PLAN.md + README antes de empezar. Trabajar fase por fase con aprobación del usuario entre fases.

## Estructura del monorepo (pnpm workspaces)
- `packages/frontend` — Next.js 15, nombre: `@kermess/frontend`
- `packages/functions` — Firebase Cloud Functions v2, nombre: `@kermess/functions`
- `packages/shared` — Tipos TS + Zod schemas compartidos, nombre: `@kermess/shared`
- `firestore.rules` — en la raíz
- `firebase.json` — en la raíz

## Estado de fases
- Fase 1 ✅ Fundación completada
- Fase 2-9: pendientes (esperar aprobación del usuario antes de cada fase)

## Stack
Next.js 15, TypeScript strict, Tailwind 4, shadcn/ui, Firebase Firestore + Anonymous Auth + Cloud Functions v2, pnpm workspaces, Vercel + Firebase hosting
