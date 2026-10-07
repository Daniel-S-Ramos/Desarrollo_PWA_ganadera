# Pruebas de la Iteración 1 — Fundación técnica

Historias de usuario: HU-08 (autenticación), HU-06 (registro por el trabajador), HU-07 (operación
sin conexión). Pasos 1.1 a 1.13 del [plan](../../PLAN.md). Rama `iteracion-1`.

**Responsable:** Daniel Santiago Ramos Pintor

## Resumen de resultados

| Id | Prueba | Paso | Requerimiento | Estado |
|---|---|---|---|---|
| PU-02 | Tipos del dominio frente al modelo lógico | 1.1 | Tablas 23 y 24 · RD-02, RD-04, RNF-08 | ✅ |
| PU-03 | Identificador UUID versión 7 | 1.2 | 3.7.1 · RD-02 · RF-29 | ✅ |

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
