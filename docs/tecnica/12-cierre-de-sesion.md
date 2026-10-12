# 12 · Cierre de sesión con la cola vacía

| | |
|---|---|
| **Componente** | Cierre de sesión · [`src/sesion/cierre.ts`](../../src/sesion/cierre.ts) · [`src/ui/componentes/ConfirmacionCierre.tsx`](../../src/ui/componentes/ConfirmacionCierre.tsx) |
| **Capa** | Lógica (gestor de sesión, Tabla 20) y presentación |
| **Origen en el documento** | Apartado 3.9.1 (cierre de sesión y un usuario por dispositivo) · Tabla 31 (fila «El usuario intenta cerrar sesión con operaciones pendientes de transmitir») · RNF-04 |
| **Depende de** | [06 · Autenticación](06-autenticacion.md) · [07 · Código de desbloqueo](07-codigo-de-desbloqueo.md) · [09 · Subida](09-sincronizacion-subida.md) |
| **Pruebas** | PU-13 · PE-16 |

---

## 1. El problema

El apartado 3.9.1 identifica el cierre de sesión como una operación delicada:

> Es la única operación capaz de provocar justamente la pérdida de información que el proyecto
> pretende evitar. Cerrar sesión borra la sesión del dispositivo y con ella la posibilidad de atribuir
> y transmitir lo que aún está en la cola. Por eso la aplicación exige que la cola esté vacía, de modo
> que si hay operaciones pendientes advierte cuántas son, ofrece sincronizar primero y no cierra la
> sesión hasta que la cola quede vacía o el usuario confirme de manera explícita que acepta
> descartarlas.

Desde el paso 1.7 existía un cierre preliminar que solo se negaba a cerrar si había pendientes. Este
paso construye el comportamiento completo.

## 2. Comportamiento

| Situación | Lo que se muestra | Acciones |
|---|---|---|
| **Sin pendientes** | Nada: la sesión se cierra | — |
| **Con pendientes y con señal** | «Hay 3 registros sin enviar» | **Enviar y cerrar sesión** (principal) · Cancelar |
| **Con pendientes y sin señal** | «Hay 3 registros sin enviar y no hay conexión. Si cierra la sesión ahora, se perderán.» | **Cancelar** (principal, porque es lo seguro) · Cerrar sesión y descartar los registros |
| **Enviar y cerrar sesión no logró vaciar la cola** | El motivo: sin conexión, sesión vencida, o registros que aún no pueden enviarse | Cancelar (principal) · Cerrar sesión y descartar los registros |

### 2.1 Enviar y cerrar sesión

Ejecuta una sincronización completa (documento 09) y, si al terminar la cola quedó vacía, cierra la
sesión. Si no quedó vacía, no cierra: informa el motivo y vuelve a ofrecer las mismas dos salidas.

### 2.2 Descartar: doble confirmación

Descartar es **la única acción de toda la aplicación que borra información sin posibilidad de
recuperarla**: los registros que nunca llegaron al servicio. Por eso exige una segunda confirmación
que repite la cantidad y la consecuencia:

> ⚠ **Se perderán 3 registros que no se han enviado.** Esta acción no se puede deshacer.
> [Sí, descartar y cerrar sesión] · [No, volver]

En la segunda confirmación la acción de descarte usa el tono de riesgo (rojo oscuro, apartado
3.10.4.1), reservado para lo que tiene consecuencias graves.

### 2.3 Quién puede descartar

Ambos perfiles, con la doble confirmación (decisión del 2026-10-12). El documento no distingue
perfiles para esta operación, y restringirla al propietario podría dejar a un trabajador sin poder
entregar el teléfono a otra persona. La doble confirmación protege contra el descarte accidental.

## 3. Qué hace cada salida

| Acción | Cola | Registros pendientes del teléfono | Código de desbloqueo | Sesión local y de `supabase-js` | Información descargada del predio |
|---|---|---|---|---|---|
| Cerrar con la cola vacía | — | — | Se borra | Se borran | **Se conserva** (documento 10, sección 6) |
| Descartar y cerrar | Se vacía | Se borran los que estaban pendientes | Se borra | Se borran | **Se conserva** |

Al descartar se borran también los **registros** que estaban pendientes, no solo sus entradas en la
cola. Si se borrara solo la cola, esos registros quedarían en el teléfono marcados como pendientes
para siempre, sin que nada pudiera enviarlos. Los registros en conflicto no se tocan: ya no estaban
en la cola y siguen a la vista del propietario.

## 4. La tarjeta de diagnóstico de la Fase 0

Se retira la tarjeta «Conexión con Supabase» de la pantalla de inicio. Fue una verificación de la
configuración en la Fase 0; solo consultaba al abrir la aplicación y la prueba PE-15 mostró que podía
quedar desactualizada. La barra inferior informa la conexión en tiempo real (documento 11).

## 5. Relación con los requerimientos

| Requerimiento | Cómo lo atiende |
|---|---|
| **3.9.1 · Tabla 31** | Advierte cuántos pendientes hay, ofrece sincronizar y solo cierra con la cola vacía o con confirmación explícita |
| **RNF-04** | Ningún registro sin enviar se pierde sin que el usuario lo confirme dos veces |

## 6. Pruebas

### PU-13 (automática)

| # | Qué verifica | Criterio de aprobación |
|---|---|---|
| 1 | Sin pendientes | Se cierra: se borran la sesión local y el código; la información del predio se conserva |
| 2 | Con pendientes | No se cierra sin una decisión; se informa la cantidad |
| 3 | Enviar y cerrar con éxito | Se sincroniza, la cola queda vacía y se cierra |
| 4 | Enviar y cerrar sin éxito | Sin red, con sesión vencida o con registros que no pudieron enviarse, no se cierra y se informa el motivo y la cantidad restante |
| 5 | Descartar | Se vacían la cola y los registros pendientes, se conservan los sincronizados y los en conflicto, y se cierra |
| 6 | Textos | Los mensajes de la sección 2, en singular y plural |

### PE-16 (manual)

Cerrar sesión sin pendientes, verificar que se pide ingresar de nuevo y que la información
descargada sigue en el teléfono.

## Referencias

- Documento de trabajo de grado: apartados 3.9.1 y 3.10.4.1; Tabla 31; RNF-04.
