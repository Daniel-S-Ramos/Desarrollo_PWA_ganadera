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
