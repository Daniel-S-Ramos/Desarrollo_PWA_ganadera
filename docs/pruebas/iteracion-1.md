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

![PE-12 Aplicación instalada: persisted() devuelve false](evidencias/iteracion-1/PE-12-4-app-instalada-persisted-false.png)
