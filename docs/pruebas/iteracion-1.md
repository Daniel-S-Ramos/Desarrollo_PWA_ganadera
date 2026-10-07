# Pruebas de la Iteración 1 — Fundación técnica

Historias de usuario: HU-08 (autenticación), HU-06 (registro por el trabajador), HU-07 (operación
sin conexión). Pasos 1.1 a 1.13 del [plan](../../PLAN.md). Rama `iteracion-1`.

**Responsable:** Daniel Santiago Ramos Pintor

## Resumen de resultados

| Id | Prueba | Paso | Requerimiento | Estado |
|---|---|---|---|---|
| PU-02 | Tipos del dominio frente al modelo lógico | 1.1 | Tablas 23 y 24 · RD-02, RD-04, RNF-08 | ✅ |
| PU-03 | Identificador UUID versión 7 | 1.2 | 3.7.1 · RD-02 · RF-29 | ✅ |
| PU-04 | Esquema local | 1.3 | RD-01 · RNF-09 · 3.8.4 · 3.7.3 | ⚠️ Aprobada tras ajuste de la prueba |
| PU-05 | Repositorio local y cola de operaciones | 1.4 | 3.7.2 · RNF-04 · RD-04 · RF-27 · RNF-13 | ✅ |
| PU-06 | Almacenamiento persistente | 1.5 | RNF-15 · 3.8.7 | ✅ |
| PE-12 | Almacenamiento persistente en el navegador real | 1.5 | RNF-15 | ⚠️ Aprobada con observaciones |
| PI-01 | Esquema remoto contra la base de datos real | 1.6 | RNF-05 · RNF-06 · RNF-08 · RD-04 · 3.7.3 · 3.7.8 | ⚠️ Aprobada tras corrección |
| PU-07 | Verificación del token sin conexión y sesión local | 1.7 | 3.9.1 · RD-03 · RF-24 · RF-25 | ✅ |
| PI-02 | Gancho de token de acceso contra el servicio real | 1.7 | 3.9.1 · RF-25 | ✅ |
| PE-13 | Ingreso con conexión y apertura sin conexión | 1.7 | RF-24 · RD-03 · RNF-07 · CU-01 | ⚠️ Aprobada con observaciones |

---

## PU-02 · Tipos del dominio frente al modelo lógico

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar que los valores admitidos de cada entidad coinciden con los del modelo lógico y que los tipos auxiliares impiden, al compilar, las operaciones que el diseño prohíbe |
| Requerimiento | Tablas 23 y 24 · RD-02 y RD-04 (identificador, autor y fecha los fija el dispositivo) · RNF-08 (autoría inalterable) · 3.9.5 (qué entidades admiten corrección) |
| Tipo | Unitaria, automática. Combina verificaciones en ejecución (Vitest) y afirmaciones de tipos evaluadas por el compilador (`expectTypeOf` con `tsc`) |
| Código | [`src/dominio/tipos.ts`](../../src/dominio/tipos.ts) · prueba [`src/dominio/tipos.test.ts`](../../src/dominio/tipos.test.ts) |
| Condiciones iniciales | Ninguna; los tipos no dependen de otros módulos |
| Datos de entrada | Los 15 conjuntos de valores admitidos, contrastados con el apartado del documento que los define |
| Pasos | Ejecutar `npm run test:informe` |
| Resultado esperado | Los 15 conjuntos coinciden con el documento y no tienen repetidos; el compilador acepta las cuatro afirmaciones de tipos |
| Resultado obtenido | 20 verificaciones aprobadas y verificación de tipos sin errores ([informe](resultados/2026-10-06_194946_95cac2c.md)). Total del conjunto automático: 36 de 36 |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-06 |
| Observaciones | **Valores validados con el propietario del proyecto.** El documento no enumera los tipos de evento sanitario, las unidades de dosis ni los sexos. Se propusieron y el 2026-10-06 se validaron: tipos de evento `vacuna, purga, vitamina, tratamiento, otro`; unidades `ml, cc, mg, dosis` (se retiraron `g` y `tableta` de la propuesta inicial; ml y cc se conservan ambas aunque son equivalentes, porque las dos se emplean en campo); sexos `macho, hembra`. **Verificación del mecanismo de prueba.** Las afirmaciones de tipos no se evalúan al ejecutar Vitest sino al compilar. Para comprobar que realmente detectan un error se invirtió de forma deliberada una de ellas (afirmar que una corrección puede corregirse) y el compilador la rechazó con el error TS2344; después se restauró. A raíz de ello, `npm run test:informe` ejecuta primero la verificación de tipos y la incluye en el informe |

## PU-03 · Identificador UUID versión 7

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar que cada dispositivo genera identificadores con el formato de la RFC 9562, únicos, ordenados por fecha de creación y sin coincidencias entre dispositivos que no se comunican |
| Requerimiento | Apartado 3.7.1 · RD-02 · RF-29 (base de la deduplicación del 3.7.8) |
| Tipo | Unitaria, automática |
| Especificación | [docs/tecnica/01-identificador-uuidv7.md](../tecnica/01-identificador-uuidv7.md) |
| Código | [`src/datos/uuidv7.ts`](../../src/datos/uuidv7.ts) · prueba [`src/datos/uuidv7.test.ts`](../../src/datos/uuidv7.test.ts) |
| Condiciones iniciales | Cada prueba carga una instancia nueva del generador, sin estado previo |
| Datos de entrada | Marca temporal fija del 6 de octubre de 2026, 2:15:00 a. m. (hora de Colombia), la del ejemplo resuelto del documento técnico, y la hora real del equipo |
| Pasos | Ejecutar `npm run test:informe` |
| Resultado esperado | Se cumplen los siete criterios de la sección 9 del documento técnico |
| Resultado obtenido | 11 verificaciones aprobadas ([informe](resultados/2026-10-06_211630_9b5012c.md)). Total del conjunto automático: 47 de 47 |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-06 |

**Detalle de los siete criterios:**

| # | Criterio | Datos | Resultado |
|---|---|---|---|
| 1 | Formato | 1.000 identificadores contra el patrón de la RFC; el ejemplo resuelto produce `01a11010-d120-7000-…` | ✅ |
| 2 | Marca temporal | La marca recuperada es exactamente 2026-10-06T07:15:00.000Z; sin argumento cae entre la hora anterior y la posterior a la generación | ✅ |
| 3 | Unicidad | 100.000 identificadores, 0 repetidos | ✅ |
| 4 | Orden | 10.000 identificadores consecutivos ya están en orden alfabético; dentro del mismo milisegundo el contador produce `7000`, `7001`, `7002` y vuelve a `7000` en el milisegundo siguiente | ✅ |
| 5 | Reloj que retrocede | Con el reloj atrasado un minuto, el identificador siguiente queda después del anterior y conserva la marca previa | ✅ |
| 6 | Contador lleno | 5.000 identificadores en el mismo milisegundo: ordenados, sin repetidos, y la marca avanza 1 ms exactamente en el identificador 4.097 | ✅ |
| 7 | Dos dispositivos | Dos generadores independientes, 1.000 identificadores cada uno con la misma marca y los mismos contadores: comparten los primeros 18 caracteres y ninguno coincide | ✅ |

**Verificación del mecanismo de prueba (prueba de mutación).** Para comprobar que las pruebas
detectan un error real se dañó de forma deliberada el generador, reemplazando el incremento del
contador por un reinicio a cero. Fallaron 4 de las 11 verificaciones, exactamente las de orden
(criterios 4, 5 y 6), mientras que las de formato, unicidad y dos dispositivos siguieron
aprobando, como corresponde, porque esas propiedades las sostienen los 62 bits aleatorios y no
el contador. Se restauró el código y volvieron a aprobar las 11.

## PU-04 · Esquema local

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar que la base de datos del dispositivo tiene las tablas e índices especificados y que responde las consultas que la aplicación necesita sin conexión |
| Requerimiento | RD-01 · RF-28 · RNF-09 · apartado 3.8.4 (Tabla 25) · 3.7.3, tercera regla |
| Tipo | Integración, automática: el esquema contra una base IndexedDB real simulada en memoria (`fake-indexeddb`, misma especificación W3C) |
| Especificación | [docs/tecnica/02-esquema-local.md](../tecnica/02-esquema-local.md) |
| Código | [`src/datos/db.ts`](../../src/datos/db.ts) · prueba [`src/datos/db.test.ts`](../../src/datos/db.test.ts) |
| Condiciones iniciales | Cada prueba abre una base de datos propia y vacía, y la elimina al terminar |
| Datos de entrada | Animales, eventos sanitarios, ordeños, pesajes y una imagen de 100 KB, con valores del predio (chapetas 012, 027, 031 y 045) |
| Pasos | Ejecutar `npm run test:informe` |
| Resultado esperado | Se cumplen los nueve criterios de la sección 12 del documento técnico |
| Resultado obtenido | 51 verificaciones aprobadas ([informe](resultados/2026-10-06_222303_3372bed.md)). Total del conjunto automático: 98 de 98 |
| Estado | ⚠️ Aprobada tras ajuste de la prueba |
| Fecha | 2026-10-06 |

**Detalle de los nueve criterios:**

| # | Criterio | Resultado |
|---|---|---|
| 1 | Estructura: 18 tablas con su clave primaria; las colas con clave autoincremental | ✅ |
| 2 | Índices: cada tabla tiene exactamente los índices justificados en la sección 5, ni uno más ni uno menos, y ninguno es único | ✅ |
| 3 | Índice simple: el historial sanitario del animal 027 no trae los eventos del 031 | ✅ |
| 4 | Índices compuestos: `[animal_id+fecha]` encuentra el ordeño de la vaca 012 en un día; `[animal_id+medicamento_id]` encuentra la aplicación previa de un medicamento al 027 (base de RF-09) | ✅ |
| 5 | Fechas: cinco ordeños insertados desordenados, cruzando cambio de mes y de año, salen en orden cronológico; un rango semanal devuelve solo los días del periodo | ✅ |
| 6 | Unicidad no local: dos animales con chapeta 045 coexisten; la consulta por código permite advertir la coincidencia; el registro en conflicto se localiza por su estado | ✅ |
| 7 | Cola: cuatro operaciones se recorren en el orden en que se agregaron, con `seq` creciente y sin repetidos | ✅ |
| 8 | Campos no indexados: un pesaje recuperado es idéntico al guardado, incluidos `peso` y `metodo` | ✅ |
| 9 | Binarios: una imagen de 100 KB se recupera con el mismo tamaño, tipo y contenido byte a byte | ✅ |

**Verificación del mecanismo de prueba (prueba de mutación) y ajuste.** Se declaró de forma
deliberada el índice `codigo_chapeta` como único, que es exactamente lo que la sección 6 del
documento técnico prohíbe. Fallaron las dos pruebas de coexistencia con `ConstraintError`, el
mismo error que en operación bloquearía la sincronización. Sin embargo, la prueba de índices
**siguió aprobando**, porque comparaba solo los nombres de los índices y no si eran únicos. Se
agregó la verificación explícita «ningún índice es único», y al repetir la mutación fallaron tres
pruebas, la nueva señalando directamente `animal.codigo_chapeta`. Se restauró el esquema y las 51
verificaciones aprobaron. El hallazgo mejoró la prueba: ahora detecta la regresión en la propia
declaración del esquema, sin depender de que haya datos que la pongan en evidencia.

## PU-05 · Repositorio local y cola de operaciones

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar que todo registro se guarda junto con su entrada en la cola en una sola transacción, que una falla en cualquier punto no deja registros sin enviar ni entradas huérfanas, y que ningún componente puede escribir esquivando al repositorio |
| Requerimiento | Apartado 3.7.2 · RNF-04 · RD-04 · RF-27 · RNF-08 · RNF-13 · Tabla 21 (fila «El dispositivo se apaga durante el registro») |
| Tipo | Integración, automática, contra IndexedDB simulada en memoria; incluye una prueba de arquitectura sobre el código fuente |
| Especificación | [docs/tecnica/03-repositorio-y-cola.md](../tecnica/03-repositorio-y-cola.md) |
| Código | [`src/datos/repositorio.ts`](../../src/datos/repositorio.ts) · prueba [`src/datos/repositorio.test.ts`](../../src/datos/repositorio.test.ts) |
| Condiciones iniciales | Base de datos de la aplicación vacía al iniciar cada prueba |
| Datos de entrada | Pesajes de 287 a 320 kg, una cría con chapeta 058 nacida el 2026-10-07 y su parto |
| Pasos | Ejecutar `npm run test:informe` |
| Resultado esperado | Se cumplen los nueve criterios de la sección 9 del documento técnico |
| Resultado obtenido | 14 verificaciones aprobadas ([informe](resultados/2026-10-06_223258_d3453ae.md)). Total del conjunto automático: 112 de 112 |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-06 |

**Detalle de los nueve criterios:**

| # | Criterio | Resultado |
|---|---|---|
| 1 | El repositorio fija id UUID v7, autor, hora de creación y estado pendiente; conserva los datos aportados; y sus campos prevalecen aunque lleguen valores falsos mezclados en los datos | ✅ |
| 2 | Tras crear existe exactamente una entrada en la cola que apunta al registro, con tipo `insertar` y cero intentos | ✅ |
| 3 | **Atomicidad.** Con una falla simulada entre la escritura del registro y la de la cola (equivalente a un apagado en ese instante) no queda ni el pesaje ni la entrada; con una falla posterior a la escritura, la transacción se descarta completa | ✅ |
| 4 | **Unidad de trabajo.** La cría 058 y su parto generan dos registros y dos entradas en orden; si el parto falla, no queda la cría ni ninguna entrada | ✅ |
| 5 | Al terminar `crear`, el registro ya es legible desde una segunda conexión a la base de datos | ✅ |
| 6 | Tras cerrar y reabrir la base de datos, el registro y su entrada siguen presentes | ✅ |
| 7 | Cinco pesajes se leen de la cola en el orden en que se crearon y `contarPendientes` devuelve 5 | ✅ |
| 8 | Las tablas de consulta permiten consultar por índice y no tienen `add`, `put`, `update`, `delete`, `bulkAdd` ni `clear` (verificado por el compilador) | ✅ |
| 9 | **Arquitectura.** Ningún archivo fuera de `src/datos/` importa `db.ts` | ✅ |

**Verificación del mecanismo de prueba (dos pruebas de mutación).**

1. *Sin transacción.* Se reemplazó la transacción por la ejecución directa de las escrituras. Fallaron
   las tres pruebas de atomicidad (criterios 3 y 4): en la primera quedó el pesaje sin su entrada en
   la cola, que es exactamente la pérdida silenciosa que describe la sección 1 del documento técnico.
   Las demás pruebas siguieron aprobando, porque sin fallas las escrituras se completan igual. Esto
   confirma que solo las pruebas de falla distinguen un guardado atómico de uno que no lo es.
2. *Acceso prohibido.* Se agregó a `src/app/App.tsx` una importación directa de la base de datos. La
   prueba de arquitectura falló señalando ese archivo.

En ambos casos se restauró el código y las 14 verificaciones aprobaron.

**Ajuste durante la implementación.** En la primera ejecución la prueba de falla del parto no
logró simular la falla, porque el repositorio accedía a las tablas por su nombre con
`db.table()` y la simulación reemplazaba el método de la propiedad `db.parto`. Se cambió el
repositorio para acceder siempre por la propiedad de la tabla, que es la misma instancia en ambos
casos, y la prueba pasó a ejercer la falla. El hallazgo se corrigió antes de dar por aprobada la
prueba.

## Cambio de diseño posterior: estado del animal deducido

| Campo | Contenido |
|---|---|
| Fecha | 2026-10-06 |
| Cambio | Se retiró el campo `estado` de la entidad `animal` y su índice del esquema local. El estado activo o retirado se deduce de la existencia de una salida vigente |
| Motivo | Evita modificar registros (RNF-06), no exige permiso de modificación en el servidor (3.7.8) y la anulación de una salida restituye el estado sin intervención. Justificación completa en [docs/tecnica/02-esquema-local.md](../tecnica/02-esquema-local.md), sección 6.1 |
| Pruebas afectadas | **PU-02:** se agregó la afirmación de tipos «el animal no almacena su estado» (21 verificaciones). **PU-04:** la lista de índices esperados de `animal` ya no incluye `estado`; la prueba «cada tabla tiene exactamente los índices justificados» confirma que el índice se retiró. **PU-05:** los datos de prueba de la cría ya no llevan estado |
| Resultado | 113 de 113 aprobadas y verificación de tipos sin errores ([informe](resultados/2026-10-06_224050_6aee657.md)) |
| Impacto en dispositivos | Ninguno: el cambio se hizo antes de que el esquema guardara datos en algún dispositivo, por lo que se ajustó la versión 1 sin necesidad de migración |

## PU-06 · Almacenamiento persistente

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar que la aplicación solicita el almacenamiento persistente cuando no lo tiene, no lo vuelve a solicitar cuando ya lo tiene, informa correctamente cada respuesta posible del navegador sin fallar, y presenta el espacio en unidades legibles |
| Requerimiento | RNF-15 · apartado 3.8.7 |
| Tipo | Unitaria, automática. La interfaz de almacenamiento del navegador se simula con cada respuesta posible |
| Especificación | [docs/tecnica/04-almacenamiento-persistente.md](../tecnica/04-almacenamiento-persistente.md) |
| Código | [`src/datos/almacenamiento.ts`](../../src/datos/almacenamiento.ts) · prueba [`src/datos/almacenamiento.test.ts`](../../src/datos/almacenamiento.test.ts) |
| Pasos | Ejecutar `npm run test:informe` |
| Resultado esperado | Se cumplen los ocho criterios de la sección 8 del documento técnico |
| Resultado obtenido | 12 verificaciones aprobadas ([informe](resultados/2026-10-06_224751_43cefd6.md)). Tras PE-12 se agregaron 7 verificaciones del texto del aviso y de la detección de la aplicación instalada (criterios 9 y 10), en [`src/ui/componentes/AvisoAlmacenamiento.test.ts`](../../src/ui/componentes/AvisoAlmacenamiento.test.ts): 19 en total ([informe](resultados/2026-10-06_232311_43cefd6.md)). Total del conjunto automático: 132 de 132 |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-06 |

| # | Situación simulada | Resultado |
|---|---|---|
| 1 | Datos ya persistentes: estado `persistente` sin volver a solicitar | ✅ |
| 2 | No persistentes y el navegador concede: una sola solicitud, estado `persistente` | ✅ |
| 3 | El navegador niega: estado `negado` | ✅ |
| 4 | Sin interfaz de almacenamiento, o con la interfaz incompleta: estado `no_disponible` sin errores | ✅ |
| 5 | La solicitud falla con un error: estado `negado`, sin propagar el error | ✅ |
| 6 | Estimación disponible: devuelve bytes ocupados y cuota | ✅ |
| 7 | Estimación ausente, vacía o con error: devuelve vacío sin errores | ✅ |
| 8 | Formato: 0 B, 512 B, 1,5 KB, 4,2 MB y 6,1 GB, con coma decimal | ✅ |
| 9 | Texto del aviso: sin aviso si es persistente; sin instalar recomienda instalar; instalada recomienda espacio libre y sincronizar, sin pedir que instale | ✅ |
| 10 | Detección de la aplicación instalada: pestaña normal, `display-mode: standalone` y `navigator.standalone` de iOS | ✅ |

**Verificación visual.** Con el servidor de desarrollo y una pantalla de teléfono, en un navegador
sin la aplicación instalada, se observó el aviso amarillo «Los datos de este teléfono no están
protegidos» en la parte superior del contenido y el espacio estimado en la barra inferior. La
verificación con Chrome instalado y sin instalar se registra en PE-12.

## PE-12 · Almacenamiento persistente en el navegador real

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar en Chrome que el aviso aparece cuando el navegador niega la persistencia, y verificar la suposición del documento técnico de que instalar la aplicación la concede |
| Requerimiento | RNF-15 |
| Tipo | Verificación manual en el navegador |
| Condiciones iniciales | Versión de producción servida con `npm run build` y `npm run preview`. Aplicación instalada desde PE-11 |
| Pasos | 1. Abrir `http://localhost:4173` en una pestaña normal de Chrome, observar el aviso y ejecutar `await navigator.storage.persisted()` en la consola. 2. Repetir en la aplicación instalada. 3. Agregar el sitio a marcadores (Ctrl+D), recargar y repetir la consulta |
| Resultado esperado | (a) El aviso aparece si y solo si `persisted()` devuelve `false`. (b) Con la aplicación instalada, Chrome concede la persistencia |
| Resultado obtenido | (a) **Se cumple.** En los tres casos `persisted()` devolvió `false` y el aviso apareció. (b) **No se cumple.** Con la aplicación instalada, y también con el sitio en marcadores, Chrome para Windows siguió negando la persistencia |
| Estado | ⚠️ Aprobada con observaciones |
| Fecha | 2026-10-06 |
| Observaciones | El requerimiento RNF-15 se cumple: la aplicación advierte cuando el navegador niega la condición en lugar de continuar en silencio. La suposición (b) del documento técnico no se confirmó en escritorio. Chrome no publica una regla exacta para conceder la persistencia, y la instalación figura entre sus criterios sobre todo en Android. **Acciones:** se corrigió la sección 3 del documento técnico 04; se agregó una segunda variante del aviso para la aplicación ya instalada, que no pide instalarla y recomienda mantener espacio libre y sincronizar con frecuencia; se agregaron las verificaciones 9 y 10 a PU-06. Queda pendiente verificar el comportamiento en un teléfono Android con la aplicación servida por HTTPS (paso 6.4) |

| Caso | Aviso | `persisted()` | Evidencia |
|---|---|---|---|
| Pestaña normal | Aparece | `false` | [captura del aviso](evidencias/iteracion-1/PE-12-1-pestana-normal-aviso.png) · [captura de la consola](evidencias/iteracion-1/PE-12-2-pestana-normal-persisted-false.png) |
| Aplicación instalada | Aparece | `false` | [captura del aviso](evidencias/iteracion-1/PE-12-3-app-instalada-aviso.png) · [captura de la consola](evidencias/iteracion-1/PE-12-4-app-instalada-persisted-false.png) |
| Pestaña normal con el sitio en marcadores | Aparece | `false` | [captura](evidencias/iteracion-1/PE-12-5-con-marcador-persisted-false.png) |
| Aplicación instalada, tras el ajuste del aviso | Aparece la variante para aplicación instalada, sin pedir instalarla | `false` | [captura](evidencias/iteracion-1/PE-12-6-app-instalada-aviso-ajustado.png) |

**Verificación del ajuste (2026-10-06).** Tras compilar la versión con el aviso adaptable y
actualizar la aplicación instalada, el aviso mostró la variante «Mantenga espacio libre en el
teléfono y abra la aplicación con señal con frecuencia para que la información se envíe», sin
pedir instalar la aplicación.

![PE-12 Aplicación instalada: persisted() devuelve false](evidencias/iteracion-1/PE-12-4-app-instalada-persisted-false.png)

## PI-01 · Esquema remoto contra la base de datos real

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar en la base de datos real de Supabase que el esquema tiene las tablas, restricciones y privilegios especificados: solo inserción y consulta, `recibido_en` fijada por el servicio, unicidad de la chapeta y del ordeño diario, y rechazo de valores fuera del dominio |
| Requerimiento | RNF-05 · RNF-06 · RNF-08 · RD-04 · RD-05 · 3.7.3 (tercera regla) · 3.7.7 · 3.7.8 · Tabla 24 |
| Tipo | Integración, contra el servicio real. Script SQL que inserta datos de apoyo y los revierte al terminar |
| Especificación | [docs/tecnica/05-esquema-remoto.md](../tecnica/05-esquema-remoto.md), sección 10 |
| Código | Migraciones en [`supabase/migrations/`](../../supabase/migrations/) · prueba [`supabase/pruebas/pi-01-esquema.sql`](../../supabase/pruebas/pi-01-esquema.sql) |
| Condiciones iniciales | Proyecto de Supabase vinculado con la CLI (`supabase link`) y migraciones aplicadas con `npm run db:push` |
| Pasos | Ejecutar `npm run prueba:pi-01` y, después, el revisor de seguridad `npx supabase db advisors --linked` |
| Resultado esperado | Todas las verificaciones aprobadas; el revisor de seguridad sin hallazgos; ningún dato residual |
| Resultado obtenido | **11 de 11 aprobadas** y revisor de seguridad sin hallazgos, tras una corrección (ver abajo) |
| Estado | ⚠️ Aprobada tras corrección |
| Fecha | 2026-10-06 |

**Detalle de las verificaciones (ejecución final):**

| # | Verificación | Resultado | Detalle |
|---|---|---|---|
| 1 | 14 tablas con RLS activada | ✅ | 14 de 14 |
| 2 | `authenticated`: solo `SELECT` e `INSERT` en el predio y `SELECT` en referencia; `anon`: ninguno; nadie `UPDATE` ni `DELETE` | ✅ | 14 tablas |
| 3 | `recibido_en` la fija el servicio | ✅ | Enviado 2000-01-01, guardado con la hora del servicio |
| 4 | Mismo `id` rechazado; con `ON CONFLICT DO NOTHING` ignorado sin error | ✅ | 23505 · OK · 1 fila |
| 5 | Chapeta única | ✅ | 23505 |
| 6 | Un ordeño por vaca y fecha | ✅ | 23505 |
| 7 | Ocho valores fuera del dominio rechazados: litros negativos, peso cero, sexo inválido, padre doble, cría viva sin cría, venta sin valor, anulación con valores, «otro» sin nota | ✅ | 8 × 23514 |
| 8 | «ivermectina» rechazada si existe «Ivermectina» | ✅ | 23505 |
| 9 | Segunda compra rechazada; segunda alimentación admitida | ✅ | 23505 · OK |
| 10 | Seis parámetros de la Tabla 30 | ✅ | 6 de 6 |
| 11 | Ninguna función `SECURITY DEFINER` de `public` ejecutable por `anon` ni `authenticated` | ✅ | Ninguna expuesta |

**Ciclo de la prueba.**

1. *Primera ejecución:* 10 de 10 aprobadas. Se comprobó además con una consulta que la prueba no
   dejó datos: 0 usuarios, 0 animales, 0 ordeños y 0 cuentas de prueba; solo los 6 parámetros y las
   2 migraciones registradas. [Evidencia](evidencias/iteracion-1/PI-01-1-primera-ejecucion.txt)
2. *Revisor de seguridad de Supabase:* dos advertencias sobre la función `public.rls_auto_enable()`,
   ejecutable por `anon` y `authenticated` mediante la API con privilegios de su dueño
   (`SECURITY DEFINER`). No pertenece al esquema del prototipo: la crea la opción «Habilitar RLS
   automático» elegida al crear el proyecto. La migración inicial retiró los privilegios de las
   tablas y de la función propia, pero no de esta, cuya existencia se desconocía.
   [Evidencia](evidencias/iteracion-1/PI-01-3-revisor-de-seguridad-antes.txt)
3. *Ampliación de la prueba:* se agregó la verificación 11 y se ejecutó antes de corregir: **falló
   señalando `rls_auto_enable`**, lo que confirma que detecta el problema.
   [Evidencia](evidencias/iteracion-1/PI-01-2-antes-de-la-correccion.txt)
4. *Corrección:* migración `20261006000300_revocar_rls_auto_enable.sql`, que retira el privilegio de
   ejecución. La función sigue actuando como disparador de eventos al crear tablas, porque el sistema
   la invoca sin requerir ese privilegio.
5. *Ejecución final:* 11 de 11 aprobadas y el revisor de seguridad responde «No issues found».
   [Evidencia](evidencias/iteracion-1/PI-01-4-despues-de-la-correccion.txt)

**Observación.** No se hizo prueba de mutación sobre el esquema remoto porque implicaría alterar a
propósito la base de datos real del proyecto. El paso 3 cumple una función equivalente: la
verificación 11 se ejecutó contra un estado con el defecto presente y lo detectó.

**Conjunto automático local** tras los cambios de este paso (retiro de `ruta_remota` de la
fotografía): 133 de 133 ([informe](resultados/2026-10-06_235142_36c8303.md)).

## PU-07 · Verificación del token sin conexión y sesión local

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar que el teléfono acepta solo tokens firmados por el servicio, extrae de ellos el usuario y el perfil sin red, acepta tokens vencidos y descarta una sesión guardada que haya sido alterada |
| Requerimiento | Apartado 3.9.1 · RD-03 · RF-24 · RF-25 |
| Tipo | Unitaria y de integración con IndexedDB simulada, automática. La prueba genera su propio par de claves ES256: la privada hace el papel del servicio y la pública el de la clave guardada en el teléfono |
| Especificación | [docs/tecnica/06-autenticacion.md](../tecnica/06-autenticacion.md), sección 11 |
| Código | [`src/sesion/token.ts`](../../src/sesion/token.ts), [`src/sesion/sesionLocal.ts`](../../src/sesion/sesionLocal.ts) · prueba [`src/sesion/token.test.ts`](../../src/sesion/token.test.ts) |
| Pasos | Ejecutar `npm run test:informe` |
| Resultado obtenido | 15 verificaciones aprobadas ([informe](resultados/2026-10-07_003732_0a6e6f0.md)). Total del conjunto automático: 148 de 148 |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-07 |

| # | Verificación | Resultado |
|---|---|---|
| 1 | Token válido: entrega usuario, perfil y nombre | ✅ |
| 2 | Token vencido hace un día: se acepta | ✅ |
| 3 | Perfil cambiado de trabajador a propietario sin volver a firmar: se rechaza por firma | ✅ |
| 4 | Token firmado con otra clave: se rechaza; con otro identificador de clave: se rechaza antes de verificar | ✅ |
| 5 | Token sin perfil: se rechaza | ✅ |
| 6 | Perfil «administrador»: se rechaza | ✅ |
| 7 | Algoritmos `none` y `HS256`: se rechazan; otro emisor: se rechaza; texto que no es token: se rechaza sin errores | ✅ |
| 8 | Sesión local: se guarda y se recupera; un token inválido no se guarda; la sesión no contiene contraseña ni datos derivados de ella (solo los campos `identidad`, `token`, `clave_publica`, `emisor` y `verificada_en`); una sesión alterada directamente en la base de datos se descarta al abrir | ✅ |

**Prueba de mutación.** Se reemplazó la verificación de la firma por una simple lectura del
contenido del token. Fallaron 4 verificaciones: el token con el perfil cambiado, el firmado con
otra clave, el guardado de un token inválido y la sesión alterada. Se restauró el código y las 15
aprobaron.

**Ajuste de la prueba de arquitectura de PU-05.** La primera ejecución del conjunto completo dio
147 de 148: la prueba de arquitectura de PU-05 señaló `src/sesion/token.test.ts`, que importa la
base de datos directamente para reiniciarla y para simular la manipulación de la sesión guardada.
La regla existe para el código de la aplicación, no para las pruebas, que necesitan manipular la
base de datos para simular fallas y ataques. Se excluyeron de la regla los archivos `*.test.ts`,
con el motivo escrito en la propia prueba, y se repitió la mutación de PU-05 (una pantalla que
importa `db.ts`): la prueba siguió detectándola. El informe de esa primera ejecución no se
conservó; el hecho queda registrado aquí.

## PI-02 · Gancho de token de acceso contra el servicio real

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar que la función del gancho agrega perfil y nombre al token solo para usuarios con fila en `usuario`, y que solo el servicio de autenticación puede ejecutarla |
| Requerimiento | Apartado 3.9.1 · RF-25 |
| Tipo | Integración contra el servicio real. Script SQL que se revierte al terminar |
| Código | [`20261007000100_gancho_perfil_token.sql`](../../supabase/migrations/20261007000100_gancho_perfil_token.sql) · prueba [`supabase/pruebas/pi-02-gancho-token.sql`](../../supabase/pruebas/pi-02-gancho-token.sql) |
| Condiciones iniciales | Migración aplicada con `npm run db:push` y gancho activado en *Authentication → Auth Hooks* ([captura](evidencias/iteracion-1/PI-02-0-gancho-activado.png)) |
| Pasos | Ejecutar `npm run prueba:pi-02` y repetir `npm run prueba:pi-01` |
| Resultado obtenido | 5 de 5 aprobadas; PI-01 repetida: 11 de 11 ([evidencia](evidencias/iteracion-1/PI-02-1-ejecucion.txt)) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-07 |

| # | Verificación | Resultado |
|---|---|---|
| 1 | Con fila en `usuario`: el token incluye perfil y nombre | ✅ |
| 2 | Sin fila: el token sale sin perfil ni nombre, aunque llegara uno en las declaraciones originales | ✅ |
| 3 | Solo `supabase_auth_admin` puede ejecutar la función | ✅ |
| 4 | `supabase_auth_admin` puede leer `usuario` (privilegio y política de RLS) | ✅ |
| 5 | La función no es `SECURITY DEFINER` | ✅ |

## PE-13 · Ingreso con conexión y apertura sin conexión

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar con el servicio real y los usuarios reales del predio que el ingreso entrega el perfil firmado, que la identidad se conserva sin red y que el primer ingreso exige conexión |
| Requerimiento | RF-24 · RD-03 · RNF-07 · CU-01 (flujo principal y precondición) · Tabla 31 |
| Tipo | Verificación manual en Chrome, con la versión de producción (`npm run build` y `npm run preview`) |
| Condiciones iniciales | Tres cuentas creadas en el servicio (un propietario y dos trabajadores) con su fila en `usuario`. Las contraseñas y los correos no se registran en este documento |
| Resultado obtenido | Los cinco pasos se comportaron como se esperaba (tabla siguiente) |
| Estado | ⚠️ Aprobada con observaciones |
| Fecha | 2026-10-07 |

| # | Acción | Resultado | Evidencia |
|---|---|---|---|
| 1 | Ingreso como el propietario | El encabezado muestra su nombre y «Propietario» | [captura](evidencias/iteracion-1/PE-13-1-ingreso-propietario.png) |
| 2 | Red en «Sin conexión» y recarga | **Sigue identificado como propietario, sin pedir credenciales**; 0 kB transferidos | [captura](evidencias/iteracion-1/PE-13-2-recarga-sin-conexion-sigue-identificado.png) |
| 3 | Revisión de `meta` en IndexedDB | Existe la entrada `sesion` | captura del paso 4 |
| 4 | Sin conexión: cerrar sesión e intentar ingresar | «El primer ingreso en este teléfono requiere conexión a internet» | [captura, con el correo omitido](evidencias/iteracion-1/PE-13-4-ingreso-sin-conexion-rechazado.png) |
| 5 | Con conexión: ingreso como un trabajador | El encabezado muestra su nombre y «Trabajador» | [captura](evidencias/iteracion-1/PE-13-5-ingreso-trabajador.png) |

**Observaciones.**

1. En la captura del paso 4 el valor de la entrada `sesion` aparece contraído, de modo que la
   captura no permite ver su contenido. La ausencia de contraseña en la sesión guardada la verifica
   PU-07 (criterio 8), que comprueba los campos exactos que se guardan.
2. En esa misma captura la tabla `meta` todavía muestra la entrada `sesion` después de cerrar la
   sesión. Las herramientas de desarrollador no actualizan la vista de IndexedDB por sí solas. La
   aplicación sí la borró: solo muestra la pantalla de ingreso cuando el cierre terminó con éxito,
   y el borrado de la sesión local lo verifica PU-07.
3. Una de las cuentas se creó inicialmente con una dirección de `gmail.com` inexistente. Se
   recomendó cambiarla por una del dominio reservado `.test` (RFC 2606), que no puede pertenecer a
   nadie, para que un eventual correo del servicio no llegue a un tercero.
