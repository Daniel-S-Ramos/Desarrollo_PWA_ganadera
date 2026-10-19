# 11 · Indicador de sincronización

| | |
|---|---|
| **Componente** | Indicador de sincronización · [`src/ui/componentes/BarraEstado.tsx`](../../src/ui/componentes/BarraEstado.tsx) y [`src/ui/componentes/DistintivoSync.tsx`](../../src/ui/componentes/DistintivoSync.tsx) |
| **Capa** | Presentación (Figura 10, Tabla 20: «Indicador de sincronización») |
| **Origen en el documento** | Apartados 3.7.4 (Tabla 22), 3.10.4.5 y 3.8.7 (espacio junto al estado) · RF-30 · RNF-01 · Tabla 31 (fila «El usuario registra información sin conexión») |
| **Depende de** | [09](09-sincronizacion-subida.md) y [10](10-sincronizacion-bajada.md) · Motor de sincronización |
| **Pruebas** | PU-12 · PE-15 |

---

## 1. El problema

El propietario de la Ganadería JR ha perdido cuadernos con años de información. El apartado 3.10.4.5
lo convierte en una exigencia de la interfaz:

> El propietario ha extraviado más de cuatro cuadernos y necesita saber si la información está
> únicamente en su teléfono o si ya quedó conservada fuera de él.

El motor del paso 1.10 ya sabe en qué estado está cada registro. Falta **mostrarlo**.

## 2. Dos indicadores, porque responden preguntas distintas

El apartado 3.10.4.5 define dos indicadores complementarios:

| Indicador | Pregunta que responde | Dónde |
|---|---|---|
| **Contador** | ¿Queda algo sin enviar? ¿Cuánto? | Barra inferior, **siempre visible** en todas las pantallas |
| **Distintivo por registro** | ¿Cuál registro está pendiente? | Junto a cada registro, en listas, historiales y fichas |

> Con solo el contador el usuario sabría que hay algo sin enviar pero tendría que buscarlo, y con
> solo las marcas tendría que recorrer la aplicación para enterarse de que queda algo pendiente.

## 3. La barra inferior

Muestra una línea principal con el estado general y, debajo, el detalle. Los mensajes siguen el
criterio de lenguaje del apartado 3.10.4.3: describen la situación y lo que va a pasar, no
el mecanismo técnico.

| Situación | Línea principal | Detalle |
|---|---|---|
| Nada pendiente y la última sincronización terminó bien | ✓ **Todo enviado** | Última sincronización: hace 5 min |
| Sincronizando en este momento | ↻ **Enviando…** | — |
| Hay pendientes y hay señal | ⏳ **3 registros pendientes de enviar** | Se enviarán en unos segundos |
| Hay pendientes y no hay señal | ⏳ **3 registros pendientes de enviar** | Sin conexión: se enviarán cuando vuelva la señal |
| Nada pendiente y no hay señal | ✓ **Todo enviado** | Sin conexión |
| La sesión con el servicio venció (documento 06) | ⚠ **3 registros pendientes de enviar** | Ingrese de nuevo con conexión para enviarlos |
| La subida terminó pero la descarga falló | ✓ o ⏳ según los pendientes | No se pudo descargar lo nuevo; se reintentará |
| Hay registros en conflicto | Se agrega una segunda línea: ⚠ **2 registros en conflicto** | Los resuelve quien los registró o el propietario (documento 26, sección 10) |

Debajo, como hasta ahora, el espacio ocupado (apartado 3.8.7).

### 3.1 Registrar sin conexión no es un error

La Tabla 31 establece que, al registrar sin conexión, «la operación se completa con normalidad y el
registro queda señalado como pendiente, sin ningún mensaje de error». Por eso el estado sin conexión
usa el tono de información (⏳, sin color de alerta) y no el de advertencia. El tono de advertencia
(⚠) se reserva para lo que exige una acción: la sesión vencida y los conflictos.

## 4. El distintivo por registro

Sigue la Tabla 22:

| Estado | Lo que ve el usuario |
|---|---|
| `pendiente` | ⏳ **Pendiente**, en amarillo claro |
| `en_transmision` | ↻ **Enviando**, en amarillo claro |
| `sincronizado` | **Nada**: el distintivo desaparece, el registro está conservado fuera del teléfono |
| `conflicto` | ⚠ **En conflicto**, en rojo, con la causa que dejó el motor (por ejemplo, «El código de chapeta ya está asignado a otro animal.») |

En todos los casos el estado se comunica con **ícono y texto**, no solo con color (apartado 3.10.4.1,
WCAG 1.4.1). Que el distintivo **desaparezca** al sincronizarse es deliberado: la mayoría de los
registros estarán sincronizados, y marcarlos todos llenaría las pantallas de una señal que no exige
nada.

El componente se construye en este paso, aunque todavía no hay listas ni fichas donde mostrarlo: se
usará en la Iteración 2, en el listado de animales y la ficha.

## 5. De dónde salen los datos

| Dato | Origen | Se actualiza |
|---|---|---|
| Pendientes | Número de entradas de la cola de operaciones | En cuanto cambia la cola: la pantalla observa la base de datos local |
| Conflictos | Registros con estado `conflicto` en las doce tablas | Igual |
| Sincronizando y resultado de la última | El motor de sincronización, que avisa al empezar y al terminar | Al empezar y al terminar cada sincronización |
| Conexión | El navegador (eventos `online` y `offline`) | Al cambiar la conexión |

La pantalla **observa** la base de datos local (con `useLiveQuery` de Dexie): cuando se guarda un
registro o el motor lo confirma, el contador cambia solo, sin que nadie tenga que pedirlo.

## 6. Relación con los requerimientos

| Requerimiento | Cómo lo atiende |
|---|---|
| **RF-30** | El contador y el distintivo indican si la información está sincronizada o pendiente |
| **3.10.4.5** | Dos indicadores: contador siempre presente y marca por registro |
| **Tabla 31** | Sin conexión, el registro queda pendiente sin mensaje de error |
| **RNF-01** | Íconos y texto legibles en el potrero, sin depender del color |

## 7. Pruebas

### PU-12 (automática)

| # | Qué verifica | Criterio de aprobación |
|---|---|---|
| 1 | Textos de la barra | Cada situación de la sección 3 produce su línea principal, su detalle y su tono |
| 2 | Singular y plural | «1 registro pendiente de enviar» y «3 registros pendientes de enviar» |
| 3 | Sin conexión no es error | Con pendientes y sin red, el tono es de información y no de advertencia |
| 4 | Distintivo | Cada estado de la Tabla 22 produce su ícono y texto; `sincronizado` no produce distintivo |
| 5 | Tiempo transcurrido | «hace unos segundos», «hace 5 min», «hace 2 h» |
| 6 | Avisos del motor | El motor avisa al empezar y al terminar cada sincronización |

### PE-15 (manual)

Con la aplicación abierta y desbloqueada, observar la barra al sincronizar con red, al cortar la
red y al volver la señal.

## Referencias

- D. Fahlander, «Dexie.js — useLiveQuery()».
- World Wide Web Consortium, «WCAG 2.2», criterio 1.4.1 (uso del color).
- Documento de trabajo de grado: apartados 3.7.4, 3.8.7, 3.10.4.1, 3.10.4.3 y 3.10.4.5; Tablas 22 y 31.
