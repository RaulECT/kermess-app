# Prompt inicial para Claude Code

Pega esto en Claude Code después de colocar `PLAN.md` en la raíz del repo vacío.

---

```
Vamos a construir "Kermes App", un sistema de cupones digitales para un evento 
de recaudación de fondos. Lee PLAN.md en la raíz del repo: contiene la 
especificación completa (modelo de datos, roles, pantallas, Cloud Functions, 
fases y consideraciones críticas).

Trabajaremos fase por fase. NO avances a la siguiente fase hasta que yo 
confirme que la actual está bien.

Empieza por la Fase 1 (Fundación):

1. Inicializa Next.js 15 con TypeScript strict, App Router, Tailwind, ESLint.
2. Usa pnpm como package manager.
3. Instala y configura shadcn/ui con tema neutral.
4. Instala dependencias de runtime:
   firebase, zod, react-hook-form, @hookform/resolvers, qrcode.react, 
   html5-qrcode, date-fns, date-fns-tz, uuid
5. Instala dev dependencies: 
   @types/uuid, prettier, prettier-plugin-tailwindcss
6. Crea la estructura de carpetas:
   - src/app (rutas: /, /u/[token], /caja, /estacion, /dashboard, /admin)
   - src/components/ui (shadcn)
   - src/components/shared (PinPad, QRScanner, QRDisplay, CountUp, Money)
   - src/lib/firebase (client.ts, admin.ts si aplica)
   - src/lib/types (user.ts, station.ts, transaction.ts, event.ts)
   - src/lib/validations (schemas de Zod)
   - src/lib/utils (formatters, constants)
   - functions/src (Cloud Functions con TypeScript)
7. Define TODOS los tipos TypeScript exactamente como el modelo de datos 
   de PLAN.md sección 3.
8. Configura Firebase client SDK (src/lib/firebase/client.ts) usando 
   variables de entorno públicas (NEXT_PUBLIC_FIREBASE_*).
9. Crea un archivo .env.example con todas las variables necesarias 
   (Firebase config) y actualiza .gitignore.
10. Inicializa Firebase Functions (v2) con TypeScript en la carpeta functions/.
11. Escribe firestore.rules iniciales restrictivas siguiendo PLAN.md sección 5.
12. Crea un README.md con instrucciones de setup local.
13. Configura prettier con plugin de tailwind.

IMPORTANTE durante toda la fase:
- Usa convenciones consistentes: camelCase en TS, kebab-case en archivos 
  de componentes, PascalCase en componentes React.
- Todos los tipos en un solo lugar, reutilizables.
- Schemas de Zod que reflejen exactamente los tipos de TS.
- No escribas lógica de negocio todavía; esta fase es solo estructura.
- Commits pequeños y descriptivos.

Antes de empezar, si algo de PLAN.md no está claro, pregúntame. 
Cuando termines Fase 1, muéstrame:
- Árbol de carpetas
- Resumen de lo instalado
- Los tipos TypeScript
- Las reglas de Firestore
- Estado de los dos proyectos (Next.js y Functions) compilando sin errores

Espera mi aprobación antes de pasar a Fase 2.
```

---

## Tips para trabajar con Claude Code en este proyecto

**1. Un prompt por fase.** No le pidas todo junto. El plan tiene 9 fases, cada una 
se puede pedir con un prompt tipo "ahora Fase 2, lee PLAN.md sección correspondiente".

**2. Contexto persistente.** Al empezar cada sesión nueva de Claude Code, 
recuérdale: "Lee PLAN.md y el README antes de empezar".

**3. Revisión de reglas de Firestore.** Cuando termine la parte de Cloud 
Functions, pídele explícitamente: "Revisa firestore.rules y verifica que 
ningún flujo requiere que el cliente escriba en un campo sensible directamente".

**4. Testing del flujo crítico.** Después de Fase 5 (Estación), dedícale una 
sesión solo a probar la concurrencia: "Simula 3 estaciones cobrándole al 
mismo usuario simultáneamente. ¿El saldo nunca queda negativo?".

**5. Seeds.** Pídele seeds de dev temprano: "Crea un script que poble el 
evento con 1 admin, 3 cajeros, 10 estaciones (5 simples, 5 con menú) y 
20 usuarios de prueba con saldo variado".

**6. Deploy.** La penúltima sesión dedícala solo a deployment: Vercel + 
Firebase, variables de entorno, dominio, monitoreo.

**7. Simulacro.** Antes del 30 de mayo, haz un simulacro real con 5-10 
personas conocidas. Los bugs reales salen así, no en desarrollo.
