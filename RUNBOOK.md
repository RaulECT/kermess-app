# Runbook — Día del Evento (Kermess 2026)

> Guía de diagnóstico y acción remota. Abre el **Monitor** primero siempre.

## 1. URLs importantes (guardar en favoritos antes del evento)

| Recurso | URL |
|---------|-----|
| **Monitor de errores** | `https://TU_DOMINIO/monitor?key=TU_MONITOR_KEY` |
| **Admin panel** | `https://TU_DOMINIO/admin` |
| **Firebase Console — Functions logs** | `https://console.firebase.google.com/project/TU_PROJECT_ID/functions/logs` |
| **Firebase Console — Firestore** | `https://console.firebase.google.com/project/TU_PROJECT_ID/firestore` |
| **Vercel Dashboard** | `https://vercel.com/dashboard` |

---

## 2. "El Monitor muestra errores / recibí email de alerta"

1. Abre el Monitor → lee el **código de error** y el **mensaje**.
2. Busca el código en la tabla de abajo.
3. Si no está en la tabla → abre Firebase Functions logs para ver el stack trace completo.

### Tabla de códigos de error

| Código | Qué significa | Acción |
|--------|--------------|--------|
| `internal` | Error inesperado en el servidor | Ver logs en Firebase Console para más detalle |
| `failed-precondition` | Evento no activo, saldo insuficiente, o evento no configurado | Ver el mensaje exacto — si dice "evento no activo" revisar `config/event.status` en Firestore |
| `unauthenticated` | PIN incorrecto repetido | Ver si el mensaje dice "PIN de estación" (estación) o "PIN de cajero" — si es sistemático revisar el doc en Firestore |
| `not-found` | Usuario o meta no encontrada | Ver el userId/goalId en el contexto del error y buscar en Firestore |
| `invalid-argument` | Datos incorrectos (monto ≤ 0, item no en menú) | Es un error de uso, no de sistema |

---

## 3. "Un cobro o registro no funcionó"

1. Abre Admin → tab **Transacciones** → busca la transacción por nombre o hora.
2. Si aparece → la transacción sí se procesó (solo falló la respuesta al cliente). No hacer nada.
3. Si no aparece → la transacción falló. Ver el Monitor para el error.
4. Si el error fue `failed-precondition: Saldo insuficiente` → es comportamiento correcto, el asistente no tenía saldo.

---

## 4. "El balance de un asistente está incorrecto"

Corrección manual en Firebase Console:

1. Firebase Console → Firestore → colección `users`
2. Buscar el documento por el `userId` (el token del QR del asistente)
3. Editar el campo `balance` con el valor correcto
4. Guardar

> El balance se muestra en cupones (entero), no en pesos.

---

## 5. "Nadie puede hacer login (PIN roto sistemáticamente)"

Para cajeros:
1. Firebase Console → Firestore → colección `operators`
2. Verificar que el documento del cajero existe y tiene campo `pinHash`
3. Si el documento no existe → el cajero no fue creado en el admin

Para estaciones:
1. Firebase Console → Firestore → colección `stations`
2. Verificar que la estación existe, tiene `active: true` y tiene campo `operatorPin`

---

## 6. "La app no carga / pantalla en blanco"

1. Vercel Dashboard → tu proyecto → tab **Deployments**
2. Verificar que el último deployment está en "Ready" (verde)
3. Si está en "Error" → hacer rollback al deployment anterior (botón "..." → "Redeploy")

---

## 7. "Necesito revertir una transacción"

1. Admin panel → tab **Transacciones**
2. Buscar la transacción (filtrar por nombre de usuario o fecha)
3. Botón **Revertir** → confirmar motivo
4. El balance del asistente se restaura automáticamente

---

## 8. "Necesito un hotfix de código"

1. Abre una sesión de Claude Code (claude.ai/code o la extensión de VS Code)
2. Describe el error exacto que aparece en el Monitor (código, mensaje, contexto)
3. Claude puede modificar el código y hacer deploy remotamente
4. El deploy de Functions tarda ~2-3 min, el de frontend ~1-2 min

---

## 9. Ver logs completos en Firebase Console

1. Firebase Console → **Functions** → tab **Logs**
2. Filtrar por nombre de función: `registerUser`, `topup`, o `charge`
3. Buscar líneas rojas (errores) cerca de la hora del problema
4. Los logs muestran el stack trace completo del error

---

## 10. Cold start — Primera request lenta

La **primera request** después de que las Functions estuvieron inactivas (~15 min) puede tardar **15-30 segundos**. El frontend mostrará "cargando" o incluso timeout, pero la operación probablemente sí se procesó. Verificar en Transacciones antes de repetir.

Para evitar esto el día del evento: hacer al menos una operación de prueba 10 minutos antes de abrir el evento.
