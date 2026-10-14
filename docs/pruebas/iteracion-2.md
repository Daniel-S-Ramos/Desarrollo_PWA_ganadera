# Pruebas de la Iteración 2 — Identificación animal y ficha

Historias de usuario: HU-01 (registro e identificación individual), HU-02 (consulta de la ficha en
campo), HU-15 (autoría visible). Pasos 2.1 a 2.6 del [plan](../../PLAN.md). Rama `iteracion-2`.
Incluye además los criterios de cierre heredados de la Iteración 1 (HU-06.1, HU-06.4, HU-07.1, la
marca por registro de HU-07.3, y los casos pendientes de PE-14 y PE-16).

**Responsable:** Daniel Santiago Ramos Pintor
**Estado:** en curso

## Resumen de resultados

| Id | Prueba | Paso | Requerimiento | Estado |
|---|---|---|---|---|
| PU-14 | Registro de un animal | 2.1 | CU-02 · HU-01 · RF-01, RF-03, RF-04, RF-27 · Tabla 31 | ✅ |
| PI-01 | Esquema remoto: formato de la chapeta y madre de una sola forma (verificaciones 12 y 13) | 2.1 | RF-01 · RF-04 · 3.9.3 | ✅ |
| PI-03 | Políticas de seguridad, repetida con la serie de pruebas | 2.1 | 3.9.2 · 3.9.3 | ✅ |
| PI-04 | Sincronización de extremo a extremo, repetida con la columna `madre_externa` | 2.1 | RF-29 · RNF-05 | ✅ |
| PE-17 | Registro de un animal en el navegador real, con conexión y sin ella | 2.1 | CU-02 · HU-01 · HU-06.1 · HU-07.1 · Tabla 31 | ⚠️ Aprobada con observaciones |
| PU-15 | Fotografías: dimensiones, vista principal, guardado, cola, subida y limpieza | 2.2 | RF-02 · RNF-12 · 3.8.5 · Tablas 21 y 25 | ✅ |
| PI-05 | Fotografías contra el servicio de archivos real | 2.2 | RNF-12 · 3.8.5 · 3.9.3 · RNF-06 | ✅ |
| PE-18 | Fotografías en el navegador real: computador y teléfono Android | 2.2 · 2.2b | RF-02 · HU-01 criterios 3 y 4 · RNF-12 · Tabla 25 | ⚠️ Aprobada con observaciones |
| PE-19 | Publicación con https en Vercel | 2.2b | RNF-10 · RNF-11 · 3.9.1 | ⚠️ Aprobada tras corrección |
| PU-16 | Listado, búsqueda por chapeta, edad y bajada de imágenes | 2.3 | RF-06 · CU-03 · 3.11.1 · Tabla 25 | ⚠️ Aprobada tras corrección |
| PI-05 | Verificación 6: un teléfono vacío baja la reducida del servicio real | 2.3 | RF-28 · 3.7.6 | ✅ ([evidencia](evidencias/iteracion-2/PI-05-2-bajada-de-imagenes.txt)) |
| PU-17 | Ficha del animal | 2.4 | RF-05 · HU-02 · HU-15 · RNF-08 | ✅ |
| PE-20 | Listado y ficha en el teléfono | 2.3 · 2.4 | RF-05 · RF-06 · RF-28 · CU-03 · HU-02 · HU-15 · HU-07.3 | ⚠️ Aprobada con observaciones |
| PU-18 | Carga inicial de un teléfono nuevo | 2.5 | 3.7.6 · 3.7.7 · RNF-05 | ✅ |
| PE-21 | Carga inicial en el navegador real | 2.5 | 3.7.6 · 3.7.7 · RNF-05 | ⚠️ Aprobada tras corrección (reverificar pasos 4 y 5) |

---

## PU-14 · Registro de un animal

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar la normalización y el formato de la chapeta, su unicidad en el teléfono (también dentro de la transacción), el origen con la edad aproximada, las validaciones, la genealogía y el registro con su entrada en la cola |
| Requerimiento | CU-02 · HU-01 criterios 1, 2 y 5 · RF-01, RF-03, RF-04, RF-27 · apartados 3.8.8 y 3.8.10 · Tabla 31 |
| Tipo | Unitaria, automática. Las funciones de validación se prueban sin base de datos; el registro, contra la base de datos local simulada (`fake-indexeddb`) |
| Código | [`src/modulos/identificacion/registroAnimal.ts`](../../src/modulos/identificacion/registroAnimal.ts) · prueba [`registroAnimal.test.ts`](../../src/modulos/identificacion/registroAnimal.test.ts) · especificación [documento técnico 13](../tecnica/13-registro-de-animal.md), sección 10 |
| Condiciones iniciales | Base de datos local vacía en cada grupo que escribe, con el propietario y un trabajador en la tabla de usuarios |
| Pasos | Ejecutar `npm run test:informe` |
| Resultado esperado | Los nueve grupos de la sección 10 del documento técnico 13 aprobados |
| Resultado obtenido | **87 de 87 aprobadas**. Total del conjunto automático: **362 de 362** y verificación de tipos sin errores ([informe](resultados/2026-10-12_185032_4a0e0f2.md)) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-12 |

| # | Grupo | Pruebas |
|---|---|---|
| 1 | Chapeta: normalización (`01` → `1`, `a-01` → `A1`) y numeración del predio (1–9999, letra sin O + 1–999) | 32 |
| 2 | Origen: nacido en el predio, comprado, nacimiento desconocido, por fecha o por edad | 8 |
| 3 | Edad aproximada: conversión a fecha, fin de mes, años bisiestos, rangos | 14 |
| 4 | Validaciones: fechas futuras e inexistentes, nacimiento posterior al ingreso, sexo, peso, longitud de textos | 15 |
| 5 | Genealogía: madre y padre del predio o externos, nunca ambos; sexo correcto; inexistentes; orden numérico de la lista | 8 |
| 6 | Chapeta repetida: activa, retirada, fecha aproximada, chapeta libre, registro rechazado sin escribir | 5 |
| 7 | Dos registros simultáneos con la misma chapeta: queda uno | 1 |
| 8 | Registro correcto con autor, estado pendiente y entrada en la cola; formulario inválido; formulario modificado | 3 |
| 9 | Ambos perfiles registran (Tabla 27) | 1 |

**Validación de las pruebas con mutaciones.** Se introdujeron a propósito 17 errores en la lógica,
uno por vez, para comprobar que las pruebas los detectan. Las 17 mutaciones fueron detectadas; tras
cada una se restauró el código.

| Mutación | Pruebas que fallaron |
|---|---|
| Quitar la verificación de la chapeta dentro de la transacción | 2 |
| No pasar la chapeta a mayúsculas | 4 |
| No ajustar el fin de mes en la edad | 2 |
| Marcar todo animal como no retirado | 1 |
| Admitir fechas futuras | 1 |
| Guardar la edad aproximada como exacta | 2 |
| Admitir un nacimiento posterior al ingreso | 1 |
| No verificar el sexo de la madre o el padre | 1 |
| Guardar el padre del predio y el externo a la vez | 1 |
| Quitar el tope de peso | 2 |
| Conservar los ceros a la izquierda | 11 |
| Admitir la letra O | 1 |
| Admitir números de cinco dígitos | 1 |
| No quitar los guiones | 3 |
| Ordenar la lista de progenitores como texto (10 antes que 9) | 1 |
| Guardar un progenitor del predio y externo a la vez | 2 |
| No exigir la elección cuando el progenitor es «del predio» | 1 |

Las diez primeras se aplicaron a la versión con el formato genérico de chapeta; las siete últimas, a
la versión con la numeración del predio (ver PE-17, hallazgos 1 y 2).

**Observación.** La prueba de arquitectura de PU-05 siguió aprobada: el módulo de identificación
lee y escribe solo a través del repositorio, sin importar la base de datos.

## PI-01 · Esquema remoto: formato de la chapeta y madre de una sola forma

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar que el servicio solo admite chapetas normalizadas con la numeración del predio y que rechaza una madre del predio y externa a la vez |
| Requerimiento | RF-01 · RF-04 · 3.9.3 (el servicio decide) · documento técnico 13, sección 8 |
| Tipo | Integración contra la base de datos real. Todas las inserciones se revierten al terminar |
| Código | [`supabase/pruebas/pi-01-esquema.sql`](../../supabase/pruebas/pi-01-esquema.sql), verificaciones 12 y 13 · migraciones [`20261012000100_formato_chapeta.sql`](../../supabase/migrations/20261012000100_formato_chapeta.sql) y [`20261012000200_chapeta_del_predio_y_madre_externa.sql`](../../supabase/migrations/20261012000200_chapeta_del_predio_y_madre_externa.sql) |
| Pasos | `npm run db:push` y `npm run prueba:pi-01` |
| Resultado obtenido | Con la primera migración: 12 de 12 ([evidencia](evidencias/iteracion-2/PI-01-5-formato-generico.txt)). Con la segunda: **13 de 13** ([evidencia](evidencias/iteracion-2/PI-01-6-numeracion-del-predio.txt)) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-12 |

| # | Verificación | Resultado |
|---|---|---|
| 12 | Se rechazan `z905`, `Z 905`, `0905`, `O905`, `Z0`, `ZZ1`, `Z1000` y `10000` (código 23514); se admite `Z905` | ✅ |
| 13 | Se rechaza un animal con madre del predio y madre externa; se admite uno con solo madre externa | ✅ |

**Observación.** Las chapetas que usaban las pruebas (`PI01-012`, `PI01-SEXO`…) ya no cumplen el
formato, y en la verificación 7 habrían hecho fallar la inserción por la chapeta y no por la
restricción que se quería probar. Se cambiaron por la serie de pruebas Z901–Z907.

## PI-03 · Políticas de seguridad, repetida con la serie de pruebas

| Campo | Contenido |
|---|---|
| Objetivo | Confirmar que las políticas siguen vigentes tras las migraciones del paso 2.1 y con chapetas válidas |
| Código | [`supabase/pruebas/pi-03-politicas.sql`](../../supabase/pruebas/pi-03-politicas.sql), con las chapetas Z911–Z916 |
| Resultado obtenido | **11 de 11 aprobadas** ([evidencia](evidencias/iteracion-2/PI-03-2-chapetas-serie-Z.txt)) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-12 |

## PI-04 · Sincronización de extremo a extremo, repetida con la columna `madre_externa`

| Campo | Contenido |
|---|---|
| Objetivo | Confirmar que la sincronización real acepta el animal con la columna nueva y una chapeta de la serie de pruebas |
| Código | [`src/sync/sincronizacion.pi.ts`](../../src/sync/sincronizacion.pi.ts), con una chapeta aleatoria entre Z950 y Z999 |
| Resultado obtenido | **4 de 4 aprobadas**; la limpieza dejó 0 registros de la cuenta de prueba ([evidencia](evidencias/iteracion-2/PI-04-2-madre-externa-y-serie-Z.txt)) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-12 |

## PE-17 · Registro de un animal en el navegador real

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar en Chrome, como trabajador, el registro de animales con conexión y sin ella, el aviso de chapeta repetida, los mensajes de formato, la genealogía, la cancelación y el envío al volver la señal |
| Requerimiento | CU-02 · HU-01 criterios 1, 2 y 5 · criterios heredados HU-06.1 (el trabajador crea) y HU-07.1 (registro sin conexión) · Tabla 31 |
| Tipo | Verificación manual en Chrome con la versión compilada (`npm run build` y `npm run preview`), vista de teléfono de DevTools y el modo «Sin conexión» de la pestaña Red |
| Condiciones iniciales | Sesión de Daniel Ramos (trabajador). Migraciones del paso 2.1 aplicadas. Chapetas de la serie de pruebas Z920–Z949 |
| Resultado obtenido | El registro funciona con conexión y sin ella, y el aviso, los mensajes y la genealogía se comportan como especifica el documento técnico 13. La prueba produjo **cuatro hallazgos** que cambiaron el diseño y un incidente con datos reales, todos resueltos |
| Estado | ⚠️ Aprobada con observaciones |
| Fecha | 2026-10-12 |

### Primera ronda: hallazgos

| # | Observación | Evidencia | Acción |
|---|---|---|---|
| 1 | Registrado el animal `1`, la chapeta `01` no se detectó como repetida. Consultado, el propietario indicó que numerará su ganado del 1 al 9999 y después con una letra y un número del 1 al 999, sin la letra O: para él `01` y `1` son el mismo animal | [animal 1](evidencias/iteracion-2/PE-17-01-hallazgo-animal-1-registrado.png) · [1 asignada](evidencias/iteracion-2/PE-17-02-hallazgo-chapeta-1-asignada.png) · [01 aceptada](evidencias/iteracion-2/PE-17-03-hallazgo-01-distinta-de-1.png) | Se revisó la decisión A: los ceros a la izquierda se eliminan y el formato es la numeración del predio, en el teléfono y en el servicio (documento técnico 13, sección 2.1; migración `20261012000200`) |
| 2 | La madre solo ofrecía «Desconocida». No era un error (no había hembras registradas), pero no se entendía. El propietario indicó además que la madre también puede ser externa al predio | [captura](evidencias/iteracion-2/PE-17-04-hallazgo-madre-sin-hembras.png) | La madre admite «Desconocida · Del predio · Externa» (columna `madre_externa`) y la lista vacía lo dice: «No hay hembras registradas en este teléfono» |
| 3 | El distintivo «⏳ Pendiente» mostraba el ícono y el texto en dos líneas | [captura](evidencias/iteracion-2/PE-17-01-hallazgo-animal-1-registrado.png) | Ícono y texto en una sola línea |
| 4 | Los dos registros de la primera ronda se habían guardado con la regla anterior y, si se enviaban, `01` habría impedido aplicar la migración nueva | [inicio con 2 pendientes](evidencias/iteracion-2/PE-17-05-hallazgo-inicio-2-pendientes.png) | Se descartaron sin enviarlos, borrando los datos del sitio en el navegador de prueba con la pestaña sin conexión |

### Segunda ronda, con la numeración del predio

| # | Acción | Resultado | Evidencia |
|---|---|---|---|
| 1 | Registrar Z920: comprada, hembra, edad aproximada 10 meses, procedencia | Guardada. En el servicio: nacimiento **2025-12-10, aproximado** (12 de octubre de 2026 menos 10 meses) | [servidor](evidencias/iteracion-2/PE-17-17-servidor-tiempos-y-limpieza.txt) |
| 2 | Escribir `z0920` | «La chapeta Z920 ya está asignada», con sexo, fecha aproximada y autor; Guardar inhabilitado (HU-01 criterio 2, Tabla 31) | [captura](evidencias/iteracion-2/PE-17-06-z0920-reconocida-como-Z920.png) |
| 3 | Escribir `O5` y `10000` | «La letra O no se usa en las chapetas del predio. ¿Quiso escribir un cero?» y el mensaje de formato | [O5](evidencias/iteracion-2/PE-17-07-letra-O-rechazada.png) · [10000](evidencias/iteracion-2/PE-17-08-fuera-de-rango.png) |
| 4 | Registrar Z921: nacida en el predio, 120 kg, madre del predio Z920, padre externo | Guardada. En el servicio, la madre llegó enlazada a Z920 y el padre externo como texto | [formulario](evidencias/iteracion-2/PE-17-09-genealogia-madre-Z920-padre-externo.png) · [servidor](evidencias/iteracion-2/PE-17-17-servidor-tiempos-y-limpieza.txt) |
| 5 | Elegir «Padre del predio» sin machos registrados | Lista inhabilitada con «No hay machos registrados en este teléfono» | [captura](evidencias/iteracion-2/PE-17-10-sin-machos-registrados.png) |
| 6 | Escribir datos y pulsar Cancelar | «¿Descartar los datos de este animal?», con «No, seguir registrando» como acción principal (CU-02, 7a) | [formulario](evidencias/iteracion-2/PE-17-11-formulario-nacido-en-el-predio.png) · [confirmación](evidencias/iteracion-2/PE-17-12-cancelar-pide-confirmacion.png) |
| 7 | Abrir la aplicación con «Sin conexión» | La pantalla de inicio carga desde el Service Worker con «Todo enviado · Sin conexión» | [captura](evidencias/iteracion-2/PE-17-13-inicio-cargado-sin-conexion.png) |
| 8 | Con la barra en «Sin conexión», registrar un animal | Guardado sin mensajes de error, con «1 registro pendiente de enviar · Sin conexión: se enviarán cuando vuelva la señal» (HU-07.1, Tabla 31) | [captura](evidencias/iteracion-2/PE-17-14-pendiente-sin-conexion.png) |
| 9 | Quitar «Sin conexión» | «↻ Enviando…» y en segundos «✓ Todo enviado». En el servicio el registro llegó **205 s** después de guardarse | [enviando](evidencias/iteracion-2/PE-17-15-enviando-al-volver-la-senal.png) · [todo enviado](evidencias/iteracion-2/PE-17-16-todo-enviado.png) · [servidor](evidencias/iteracion-2/PE-17-17-servidor-tiempos-y-limpieza.txt) |

### Observaciones de la segunda ronda

**1. Z920 y Z921 no se registraron sin conexión.** Llegaron al servicio 3 y 4 segundos después de
guardarse, que es la sincronización automática tras guardar (documento técnico 09), y la barra
inferior de esas capturas dice «Última sincronización: hace unos segundos» y no «Sin conexión». El
modo sin conexión de DevTools aplica solo a la pestaña donde se activa. Por eso se repitió el paso
8 comprobando antes que la barra dijera «Sin conexión». La diferencia entre `creado_en` (lo fija el
teléfono) y `recibido_en` (lo fija el servicio) resultó una forma objetiva de comprobar si un
registro esperó en la cola.

**2. Incidente: un animal de prueba con un número real del predio.** El registro del paso 8 se hizo
con la chapeta `1` en lugar de una de la serie de pruebas. Como el servicio no admite borrados desde
la aplicación, el número 1 del propietario quedó ocupado. Con la autorización del autor del
proyecto se borró del servicio con
[`supabase/pruebas/limpiar-animal-pe-17.sql`](../../supabase/pruebas/limpiar-animal-pe-17.sql),
que solo actúa si hay exactamente un animal con esa chapeta, ese autor y esa fecha, y ningún
registro lo referencia. La verificación final confirmó la chapeta `1` libre
([evidencia](evidencias/iteracion-2/PE-17-17-servidor-tiempos-y-limpieza.txt)). Para la siguiente
prueba se borran también los datos del sitio en el navegador de prueba, que conservaba su copia
local. **Lección:** en las pruebas manuales, la chapeta se elige antes de empezar y siempre de la
serie Z920–Z949.

**3. Ajuste de la pantalla.** Tras «Registrar otro», el campo vacío de la chapeta mostraba «Escriba
el número de la chapeta» apenas perdía el foco. Se cambió la regla: un campo vacío solo se señala al
intentar guardar (documento técnico 13, sección 7).

**4. Incidente de entorno.** Con `npm run dev` y la pestaña sin conexión, la recarga mostró la
página de error del navegador ([captura](evidencias/iteracion-2/PE-17-00-desarrollo-sin-service-worker.png)).
No es un defecto: el Service Worker está desactivado en el modo de desarrollo. Las pruebas sin
conexión se hacen siempre con la versión compilada (`npm run preview`), como en la Iteración 1.

**Confirmado después.** El paso «empezar un registro, cerrar la aplicación y volver a abrir: el
formulario aparece vacío» (Tabla 31) se verificó en el teléfono durante PE-18 (paso 11), sin captura.

---

## PU-15 · Fotografías

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar las dimensiones de las dos versiones, la elección de la vista principal, el guardado del animal con sus fotografías en una sola transacción, el orden de la subida, la clasificación de las respuestas del servicio de archivos y la limpieza del teléfono tras subir |
| Requerimiento | RF-02 · RNF-12 · CU-02 (6a) · HU-01 criterios 3 y 4 · apartado 3.8.5 · Tablas 21 y 25 |
| Tipo | Unitaria, automática, con el servicio simulado (que imita el bucket: no reemplaza y exige la fotografía). La compresión real se verificó aparte en Chrome, porque Vitest no tiene `canvas` |
| Código | [`src/dominio/fotografias.ts`](../../src/dominio/fotografias.ts) · [`src/sync/subidaImagenes.ts`](../../src/sync/subidaImagenes.ts) · [`src/datos/sincronizacionLocal.ts`](../../src/datos/sincronizacionLocal.ts) · pruebas [`src/dominio/fotografias.test.ts`](../../src/dominio/fotografias.test.ts) y [`src/sync/subidaImagenes.test.ts`](../../src/sync/subidaImagenes.test.ts) · especificación [documento técnico 14](../tecnica/14-fotografias.md), sección 11 |
| Pasos | Ejecutar `npm run test:informe` |
| Resultado obtenido | **38 de 38 aprobadas**. Además, 5 casos nuevos en PU-12 (línea de fotografías pendientes en la barra) y 3 en PU-13 (el cierre de sesión cuenta las fotografías). Total del conjunto automático: **408 de 408** ([informe](resultados/2026-10-12_210413_9a3d7bb.md)) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-12 |

| # | Grupo | Pruebas |
|---|---|---|
| 1 | Dimensiones: proporción, horizontal y vertical, nunca amplía | 8 |
| 2 | Vista principal: izquierdo, derecho, frente; vigente = mayor UUID v7; rutas | 5 |
| 3 | Guardar con fotografías en una transacción; nada queda si el animal se rechaza | 2 |
| 4 | Registro incompleto con 0, 1 y 2 vistas | 3 |
| 5 | Orden: una imagen no sube sin su fotografía sincronizada; el motor sube datos y después imágenes | 3 |
| 6 | Respuestas: éxito y «ya existe» confirman; transitorias y sesión vencida detienen; definitivas registran el intento y siguen | 13 |
| 7 | Limpieza: se borra la completa; solo la vista principal conserva la reducida; lo que espera en la cola no se toca; el izquierdo nuevo reemplaza al frente | 4 |

**Validación con mutaciones.** Se introdujeron 13 errores, uno por vez, sobre las pruebas de PU-15,
PU-12 y PU-13. Los 13 fueron detectados.

| Mutación | Pruebas que fallaron |
|---|---|
| Subir la imagen sin que su fotografía esté sincronizada | 2 |
| Tratar «ya existe» como error | 2 |
| Que una falla transitoria no detenga la subida | 1 |
| Conservar en el teléfono las reducidas de todas las vistas | 3 |
| Tocar imágenes que aún esperan en la cola | 1 |
| Cambiar el orden de la vista principal | 2 |
| Tomar como vigente la primera foto y no la más reciente | 1 |
| Ampliar las fotos pequeñas | 2 |
| Quitar la etapa de imágenes del motor | 4 |
| Que el cierre de sesión ignore las imágenes | 1 |
| Que descartar conserve las imágenes pendientes | 1 |
| Mostrar «Todo enviado» con fotografías pendientes | 1 |
| No guardar las imágenes al registrar | 12 |

**Compresión en un navegador real.** Con Chrome y el servidor de desarrollo, una imagen de
4.000 × 3.000 px y 5 MB quedó en 182 KB (1.600 × 1.200) y 21 KB (480 × 360), ambas WebP, en 0,7 s;
una vertical conservó su orientación (1.200 × 1.600 y 360 × 480), y un archivo que no es imagen dio
el mensaje esperado ([evidencia](evidencias/iteracion-2/PU-15-1-compresion-en-chrome.txt)).

**Ajuste encontrado al integrar.** La conversión del ordeño duplicado en corrección abre una unidad
de trabajo dentro de otra transacción. Al sumar las tablas de imágenes a la unidad de trabajo, la
transacción exterior también tuvo que incluirlas; de lo contrario Dexie rechaza la transacción anidada.

## PI-05 · Fotografías contra el servicio de archivos real

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar con Supabase Storage que la fotografía sube con el motor de la aplicación y que las políticas del bucket rechazan reemplazar, borrar, subir sin fotografía, otro formato y más de 1 MB |
| Requerimiento | RNF-12 · 3.8.5 · 3.9.3 (el servicio decide) · RNF-06 (solo inserciones) · documento técnico 14, sección 7 |
| Tipo | Integración contra el servicio real, con la cuenta de prueba (perfil trabajador) |
| Código | [`src/sync/fotografias.pi.ts`](../../src/sync/fotografias.pi.ts) · [`scripts/prueba-pi-05.mjs`](../../scripts/prueba-pi-05.mjs) · migración [`20261012000300_almacen_fotografias.sql`](../../supabase/migrations/20261012000300_almacen_fotografias.sql) |
| Pasos | `npm run db:push` y `npm run prueba:pi-05`, que al terminar borra los archivos con la CLI (`supabase storage rm`) y los registros con `limpiar-usuario-pruebas.sql` |
| Resultado obtenido | **5 de 5 aprobadas**; la limpieza borró los 2 archivos de prueba y dejó 0 registros de la cuenta de prueba ([evidencia](evidencias/iteracion-2/PI-05-1-ejecucion.txt)) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-12 |

| # | Verificación | Resultado |
|---|---|---|
| 1 | El animal y su fotografía suben con el motor; después, la completa (250 KB) y la reducida (40 KB), que se descargan con su tamaño | ✅ |
| 2 | Subir otra vez el mismo archivo responde 409 («ya existe»), que la aplicación clasifica como éxito | ✅ |
| 3 | Reemplazar (`upsert`) se rechaza; borrar no tiene efecto: la imagen sigue intacta | ✅ |
| 4 | Una imagen sin fotografía en el servicio se rechaza (definitiva) | ✅ |
| 5 | Un PNG y un WebP de 1,1 MB se rechazan | ✅ |

**Observaciones.** (1) Los archivos no pueden borrarse con SQL, porque el servicio lo impide, así que
la limpieza usa la CLI con la API del servicio de archivos. (2) La CLI pidió confirmar el borrado
aunque el script le pasa `--yes`. Se respondió que sí; queda anotado para automatizarlo si molesta.

## PE-18 · Fotografías en el navegador real

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar en Chrome el registro con tres vistas y con una sola, el aviso de registro incompleto, el contador de fotografías pendientes sin conexión, el orden de la subida, los archivos en el servicio y lo que queda en el teléfono |
| Requerimiento | RF-02 · HU-01 criterios 3 y 4 · RNF-12 · Tabla 25 · documento técnico 14, secciones 6 y 8 |
| Tipo | Manual. **Parte 1** en el computador (`npm run preview`, fotos elegidas de la galería); **parte 2** en un teléfono Android con la cámara real, tras publicar la aplicación con https (paso 2.2b) |
| Condiciones iniciales | Sesión de Daniel Ramos (trabajador); migración del bucket aplicada; chapetas Z923–Z925 |
| Resultado obtenido | Parte 1 (computador) y parte 2 (Android 10, Chrome 154, aplicación instalada) se comportaron como se esperaba |
| Estado | ⚠️ Aprobada con observaciones: la parte 2 se evidencia con los datos del servicio y no con capturas |
| Fecha | 2026-10-12 |

| # | Acción | Resultado | Evidencia |
|---|---|---|---|
| 1 | Registrar Z923 con las tres vistas | Guardado; en el servicio, 6 archivos: completas de 194 a 231 KB y reducidas de 26 a 28 KB | [servidor](evidencias/iteracion-2/PE-18-6-servidor-archivos-y-tiempos.txt) |
| 2 | Registrar Z924 solo con el frente | «Registro fotográfico incompleto: 1 de 3» (CU-02, 6a) | [captura](evidencias/iteracion-2/PE-18-1-registro-incompleto-1-de-3.png) |
| 3 | Sin conexión, registrar Z925 con una foto | La barra separa «2 registros pendientes de enviar» y «📷 1 fotografía pendiente de enviar» | [captura](evidencias/iteracion-2/PE-18-2-sin-conexion-registros-y-fotografias.png) |
| 4 | Volver la conexión | «Todo enviado». En el servicio, la fila de Z925 llegó a las 20:45:18 y su imagen a las 20:45:27: después de la fila (sección 6.2) | [captura](evidencias/iteracion-2/PE-18-3-todo-enviado.png) · [servidor](evidencias/iteracion-2/PE-18-6-servidor-archivos-y-tiempos.txt) |
| 5 | Revisar el bucket `fotografias` | Una carpeta por animal, con `{id}.webp` y `{id}-reducida.webp`; 10 archivos en total (5 fotos × 2) | [captura](evidencias/iteracion-2/PE-18-4-storage-dos-archivos-por-foto.png) |
| 6 | Revisar la tabla local `imagen` | Una fila por animal: la de la vista principal (Tabla 25) | [captura](evidencias/iteracion-2/PE-18-5-imagen-una-fila-por-animal.png) |

### Parte 2: teléfono Android con la aplicación publicada (paso 2.2b)

Con la dirección https de la rama `iteracion-2` (PE-19), la aplicación instalada en el teléfono y la
sesión de Daniel Ramos. El dispositivo consta en las sesiones del servicio: **Android 10, Chrome 154**.

| # | Acción | Resultado | Evidencia |
|---|---|---|---|
| 7 | Registrar Z926 con las tres vistas tomadas con **la cámara del teléfono** | Las seis imágenes llegaron en WebP (completas de 48 a 55 KB, reducidas de 5 a 6 KB) | [servidor](evidencias/iteracion-2/PE-18-7-telefono-android-servidor.txt) |
| 8 | Una de las fotos, tomada con el teléfono en vertical | Descargada del servicio: 1200 × 1600 y derecha. **La corrección de orientación funciona con la cámara real** | [foto](evidencias/iteracion-2/PE-18-8-foto-vertical-camara-android.webp) |
| 9 | Registrar Z927 y, en modo avión, Z928 | Z928 esperó 64 s en el teléfono; su imagen subió 6 s después de su fila | [servidor](evidencias/iteracion-2/PE-18-7-telefono-android-servidor.txt) |
| 10 | Abrir la aplicación instalada | **No apareció** el aviso de almacenamiento no protegido: Android concedió el almacenamiento persistente | Observado, sin captura |
| 11 | Cerrar y reabrir en modo avión, con un formulario a medias | Abrió sin señal, pidió el código y el formulario apareció vacío (Tabla 31) | Observado, sin captura |

**Observaciones.**

1. **Evidencia sin capturas.** La parte 2 se evidencia con los datos medidos en el servicio:
   dispositivo, tamaños, tiempos y la imagen descargada. Los pasos 10 y 11 constan como observados
   por el autor. Para la sustentación conviene capturar la aplicación en el teléfono; queda como
   tarea del cierre de la iteración.
2. **Las imágenes del teléfono pesan menos** que las del computador porque la escena fotografiada
   (un objeto sobre una pared lisa) tiene poco detalle. Con animales en el potrero se esperan los
   ~200 KB medidos en la parte 1.
3. **Pendiente 6.4 de la Iteración 1, resuelto.** Instalar la aplicación concede el almacenamiento
   persistente en Android, a diferencia de Windows (PE-12). En el teléfono, que es el dispositivo de
   campo, los registros sin enviar quedan protegidos frente al borrado automático del navegador (RNF-15).
4. **iPhone.** Se identificó que Safari, y con él todos los navegadores de iPhone, que usan el mismo
   motor, probablemente no genera WebP desde un `canvas`. En ese caso la aplicación rechaza la foto
   con un mensaje. No se ha probado; queda como pendiente de diseño, a decidir según los teléfonos que
   se usen en el predio.

## PE-19 · Publicación con https en Vercel

| Campo | Contenido |
|---|---|
| Objetivo | Publicar la aplicación en una dirección https para usarla e instalarla en un teléfono, con una dirección por rama |
| Requerimiento | RNF-10 (navegadores móviles) · RNF-11 (instalable sin tienda) · 3.9.1 (el código de desbloqueo exige `crypto.subtle`, disponible solo en contexto seguro) · documento técnico 14, sección 12 |
| Tipo | Verificación manual del despliegue y comprobación desde el navegador |
| Código | [`vercel.json`](../../vercel.json) · `engines` en [`package.json`](../../package.json) · [README, «Publicación»](../../README.md) |
| Condiciones iniciales | Cuenta de Vercel (plan Hobby) creada con la cuenta de GitHub del autor; repositorio importado |
| Resultado obtenido | Producción (`main`): https://desarrollo-pwa-ganadera.vercel.app · Preview (`iteracion-2`): https://desarrollo-pwa-ganadera-git-iteracion-2-daniel-ramos1.vercel.app. Ambas cargan la pantalla de ingreso en contexto seguro, con el Service Worker activo; una ruta directa entrega la aplicación y `sw.js` se sirve sin caché ([evidencia](evidencias/iteracion-2/PE-19-1-publicacion-vercel.txt)) |
| Estado | ⚠️ Aprobada tras corrección |
| Fecha | 2026-10-12 |

**Incidente.** La primera publicación mostró la página en blanco, y la consola decía «Faltan
VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY». Solo se había guardado una de las dos variables
en Vercel, y Vite las inserta al compilar. Se agregó la que faltaba (tipo Config, entornos Production y
Preview) y se volvieron a compilar las dos publicaciones. El mensaje de error que se escribió en la
Fase 0 para este caso permitió encontrar la causa en segundos.

**Decisiones durante la configuración.** (1) No se instaló la integración opcional «Supabase» de
Vercel: habría creado otra cuenta o dado a Vercel acceso a la de Supabase, y no hace falta. (2) Se
desactivó la protección de las publicaciones de prueba (Vercel Authentication), para abrirlas en el
teléfono; la aplicación tiene su propia autenticación. (3) Vercel advirtió que el prefijo `VITE_`
expone la variable al navegador: es lo esperado para la dirección y la clave publicable de Supabase,
que están hechas para ir en la aplicación. La clave secreta no se usa.

---

## PU-16 · Listado, búsqueda por chapeta, edad y bajada de imágenes

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar la búsqueda (normalización, filtro por el inicio, orden numérico), la oferta de registrar una chapeta no registrada, el filtro por estado, el cálculo de la edad, la foto de cada fila y la bajada de las imágenes de otros teléfonos |
| Requerimiento | RF-06 · RF-28 · CU-03 (2a, 2b) · HU-02 criterio 2 · 3.8.10 · 3.11.1 · Tabla 25 |
| Tipo | Unitaria, automática |
| Código | [`src/modulos/consulta/listado.ts`](../../src/modulos/consulta/listado.ts) · [`src/dominio/edad.ts`](../../src/dominio/edad.ts) · [`src/sync/bajadaImagenes.ts`](../../src/sync/bajadaImagenes.ts) · pruebas [`listado.test.ts`](../../src/modulos/consulta/listado.test.ts), [`edad.test.ts`](../../src/dominio/edad.test.ts) y [`bajadaImagenes.test.ts`](../../src/sync/bajadaImagenes.test.ts) · especificación [documento técnico 15](../tecnica/15-listado-de-animales.md), sección 9 |
| Resultado obtenido | **50 de 50 aprobadas**. Total del conjunto automático: **481 de 481** ([informe](resultados/2026-10-13_200947_1e39542.md)) |
| Estado | ⚠️ Aprobada tras corrección |
| Fecha | 2026-10-13 |

**Error encontrado por la prueba.** La edad del 31 de enero al 1 de marzo daba «1 mes y −2 días».
Al descontar un mes no cumplido, el cálculo sumaba los días de febrero en lugar de contarlos desde el
último mes cumplido. Se corrigió calculando los días desde la fecha del aniversario mensual, con el
último día del mes cuando ese día no existe, y se agregaron casos de fin de mes y de año bisiesto.

**Mutaciones.** Se aplicaron 14; 13 fueron detectadas. La sobreviviente («la coincidencia exacta va
primero») resultó **equivalente**: como todas las coincidencias empiezan por lo buscado y son más
largas que la exacta, el orden numérico ya la deja primera. La regla se eliminó por redundante y se
explicó en el documento técnico 15, sección 2.3.

| Mutación | Pruebas que fallaron |
|---|---|
| Buscar en cualquier parte de la chapeta y no por el inicio | 4 |
| Quitar «la exacta primero» | 0 (equivalente, ver arriba) |
| No considerar los retirados al ofrecer el registro | 1 |
| Orden alfabético en lugar de numérico | 2 |
| No preferir la reducida de la vista principal | 1 |
| Bajar las fotos de animales retirados | 1 |
| No reintentar nunca una imagen que faltaba | 1 |
| Reintentar en cada sincronización | 1 |
| Bajar sin aplicar la retención | 1 |
| Quitar la cuarta etapa del motor | 1 |
| Tratar una falla transitoria como «no existe» | 3 |
| Edad aproximada con los meses sueltos | 2 |
| Pasar a años desde los 12 meses | 1 |
| Dar por cumplido el mes antes del día | 5 |

## PU-17 · Ficha del animal

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar la consolidación de la ficha: último peso (o peso de compra o al nacer), última vacuna, leche, destino, genealogía, fotos, autoría y el cambio de una foto |
| Requerimiento | RF-02 · RF-05 · RF-27 · CU-03 (4a) · HU-02 criterio 1 · HU-15 · RNF-08 |
| Tipo | Unitaria, automática |
| Código | [`src/modulos/consulta/ficha.ts`](../../src/modulos/consulta/ficha.ts) · [`src/dominio/origen.ts`](../../src/dominio/origen.ts) · [`src/modulos/identificacion/actualizarFotos.ts`](../../src/modulos/identificacion/actualizarFotos.ts) · prueba [`ficha.test.ts`](../../src/modulos/consulta/ficha.test.ts) · especificación [documento técnico 16](../tecnica/16-ficha-del-animal.md), sección 8 |
| Resultado obtenido | **23 de 23 aprobadas** |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-13 |

**Mutaciones.** Se aplicaron 10; al principio sobrevivió una: quitar el desempate «a igual fecha, el
registrado después». La prueba evaluaba un solo orden de entrada, que daba el resultado correcto por
casualidad. Se reforzó con los dos órdenes y la mutación quedó detectada. Las otras nueve (invertir
el peso de compra y al nacer, tomar el último registrado en lugar del más reciente, contar las purgas
como vacuna, mostrar la leche en machos, tomar el último destino registrado, mostrar el identificador
del autor, no marcar los retirados, quitar el nombre «peso de compra» y admitir fotos de un animal
inexistente) fueron detectadas desde el principio.

## PE-20 · Listado y ficha en el teléfono

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar en el teléfono Android, con la aplicación publicada e instalada, el listado con las fotos de otros teléfonos, la búsqueda, el registro desde una chapeta no registrada, la ficha completa, el cambio de foto y el funcionamiento sin señal |
| Requerimiento | RF-02 · RF-05 · RF-06 · RF-28 · CU-03 · HU-02 criterios 1 a 3 · HU-15 · HU-07.3 (heredado) · 3.11.1 |
| Tipo | Manual, en un teléfono Android 10 con Chrome, aplicación instalada desde la dirección de la rama `iteracion-2` |
| Condiciones iniciales | Sesión de Daniel Ramos (trabajador). En el servicio, Z920 a Z928; las fotos de Z923, Z924 y Z925 se habían tomado en el computador |
| Resultado obtenido | Todos los pasos se comportaron como se esperaba. Se encontraron dos defectos visuales, corregidos |
| Estado | ⚠️ Aprobada con observaciones |
| Fecha | 2026-10-13 |

| # | Acción | Resultado | Evidencia |
|---|---|---|---|
| 1 | Abrir **Animales** | Z920 a Z928, con las fotos de Z923, Z924 y Z925 **bajadas del servicio**: la cuarta etapa del motor funciona con datos reales. Z920 y Z921, que no tienen fotos, dicen «Sin foto» | [listado](evidencias/iteracion-2/PE-20-01-listado-con-fotos-de-otros-telefonos.jpg) · [final](evidencias/iteracion-2/PE-20-02-listado-final.jpg) |
| 2 | Buscar `Z0923` | Encuentra Z923, resaltada | [captura](evidencias/iteracion-2/PE-20-03-busqueda-z0923.jpg) |
| 3 | Buscar `Z929` | «La chapeta Z929 no está registrada en este teléfono»; **Registrar el animal Z929** abre el formulario con la chapeta escrita (CU-03 2a, 3.11.1) | [aviso](evidencias/iteracion-2/PE-20-04-chapeta-no-registrada.jpg) · [formulario](evidencias/iteracion-2/PE-20-05-registro-con-chapeta-precargada.jpg) |
| 4 | Abrir Z924 y completar el costado izquierdo con la cámara | «Registro fotográfico incompleto: 1 de 3». Tras la foto, **la miniatura del listado pasó del frente al costado izquierdo** (vista principal recalculada). En el servicio, la foto nueva es un registro nuevo y la anterior se conserva | [ficha](evidencias/iteracion-2/PE-20-06-ficha-z924-incompleta.jpg) · [listado](evidencias/iteracion-2/PE-20-07-listado-tras-completar-z924.jpg) · [servidor](evidencias/iteracion-2/PE-20-14-servidor-foto-nueva-z924.txt) |
| 5 | Abrir Z921 | «120 kg · peso al nacer», madre **Z920** como enlace, padre externo, autoría al pie (HU-15) | [datos](evidencias/iteracion-2/PE-20-08-ficha-z921-peso-al-nacer.jpg) · [genealogía y autoría](evidencias/iteracion-2/PE-20-09-ficha-z921-genealogia-y-autoria.jpg) |
| 6 | Abrir Z920 | «390 kg · peso de compra»; comprada, con procedencia y nacimiento aproximado | [datos](evidencias/iteracion-2/PE-20-10-ficha-z920-peso-de-compra.jpg) · [origen](evidencias/iteracion-2/PE-20-11-ficha-z920-origen.jpg) |
| 7 | Abrir Z924 (macho) | La fila de leche no aparece (decisión B) | [captura](evidencias/iteracion-2/PE-20-06-ficha-z924-incompleta.jpg) |
| 8 | En modo avión, abrir Z925 y **Ver fotos** | La reducida del encabezado se ve; las completas dicen «Requiere conexión», con la autoría de cada foto | [ficha](evidencias/iteracion-2/PE-20-12-ficha-z925-sin-conexion.jpg) · [fotos](evidencias/iteracion-2/PE-20-13-ver-fotos-sin-conexion.jpg) |

**Defectos encontrados y corregidos.**

1. **Punto doble en la autoría** («a las 6:22 p. m..»). Chrome para Android escribe la hora terminada
   en «p. m.» y la frase le agregaba otro punto. Se quitó el punto final de la frase.
2. **Los filtros en dos filas.** «Todos» quedaba solo en una segunda fila. Los tres filtros van ahora en
   una sola línea.

**Observación.** Las fotos completas con conexión (paso 5 del plan de la prueba) no tienen captura.
La descarga de una imagen del servicio de archivos con la sesión de la aplicación ya está verificada
por PI-05 (verificación 1).

---

## PU-18 · Carga inicial de un teléfono nuevo

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar la marca de carga completa, que las fotos no bloquean, el avance por etapas, el orden de los datos de referencia, la reanudación y los pasos que muestra la pantalla |
| Requerimiento | Apartados 3.7.6 y 3.7.7 · RNF-05 · 3.7.3 (tercera regla) |
| Tipo | Unitaria, automática, con el servicio simulado |
| Código | [`src/sync/cargaInicial.ts`](../../src/sync/cargaInicial.ts) · [`src/sync/bajada.ts`](../../src/sync/bajada.ts) · [`src/sync/motor.ts`](../../src/sync/motor.ts) · `pasosDeCarga` en [`src/ui/estadoSincronizacion.ts`](../../src/ui/estadoSincronizacion.ts) · prueba [`src/sync/cargaInicial.test.ts`](../../src/sync/cargaInicial.test.ts) · especificación [documento técnico 17](../tecnica/17-carga-inicial.md), sección 7 |
| Resultado obtenido | **14 de 14 aprobadas**. Total del conjunto automático: **495 de 495** ([informe](resultados/2026-10-13_221658_8de6beb.md)) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-13 |

| # | Grupo | Pruebas |
|---|---|---|
| 1 | Marca de carga completa: no existe en un teléfono nuevo; se guarda al completarse la bajada; no si se interrumpe; una sola vez; se conserva al cerrar sesión | 4 |
| 2 | Las fotos no bloquean | 1 |
| 3 | Avance en orden y barra con las fotos que bajan | 2 |
| 4 | Usuarios y parámetros antes que las tablas del predio | 1 |
| 5 | Reanudación sin volver a pedir desde el principio | 1 |
| 6 | Pasos de la pantalla con lo que hay en el teléfono (corrección tras PE-21) | 5 |

**Mutaciones.** Diez, todas detectadas al final. Una sobrevivió al principio: reescribir la marca en
cada sincronización en lugar de guardarla una sola vez; ninguna prueba miraba la fecha, y se agregó la
que la comprueba. Tras corregir el defecto de PE-21, **reintroducirlo** (los íconos solo con la
sincronización en curso) hace fallar dos pruebas. La prueba PU-12 del motor se ajustó: exigía
exactamente dos avisos (empezar y terminar), y ahora también hay avisos de avance entre ambos.

## PE-21 · Carga inicial en el navegador real

| Campo | Contenido |
|---|---|
| Objetivo | Simular un teléfono nuevo y comprobar la pantalla de carga, la consulta durante la carga, el registro en espera, la interrupción y la reanudación, y la habilitación del registro al terminar |
| Requerimiento | 3.7.6 · 3.7.7 · RNF-05 |
| Tipo | Manual. Chrome en una ventana de incógnito (sin datos ni sesión) con la dirección de la rama `iteracion-2`, vista de teléfono de DevTools y la red limitada a «3G» para observar el avance |
| Resultado obtenido | El comportamiento fue el esperado; los íconos de los pasos mostraron un defecto tras la interrupción, corregido |
| Estado | ⚠️ Aprobada tras corrección |
| Fecha | 2026-10-13 |

| # | Acción | Resultado | Evidencia |
|---|---|---|---|
| 1 | Ingresar en un navegador sin datos | «Preparando este teléfono», con «↻ Usuarios y parámetros» | [captura](evidencias/iteracion-2/PE-21-1-preparando-al-ingresar.png) |
| 2 | **Ver los animales que ya llegaron** durante la carga | El listado, con el aviso «La información del predio todavía está llegando a este teléfono» | [captura](evidencias/iteracion-2/PE-21-2-listado-durante-la-carga.png) |
| 3 | Abrir `/animales/nuevo` durante la carga | «Espere a que termine de llegar la información del predio para registrar…» | [captura](evidencias/iteracion-2/PE-21-3-registro-en-espera.png) |
| 4 | Cortar la red a mitad de la carga | «Sin conexión: la descarga continuará donde quedó cuando vuelva la señal». **Defecto:** «○ Animales: 8» y «Registros: 0», con los animales ya en el teléfono | [captura](evidencias/iteracion-2/PE-21-4-interrupcion-defecto-iconos.png) |
| 5 | Devolver la red (3G) | La descarga continúa; mismo defecto en los íconos mientras vuelve a pedir la referencia | [captura](evidencias/iteracion-2/PE-21-5-reanudacion-con-3g.png) |
| 6 | Al terminar los datos | El registro queda habilitado; la barra muestra «Bajando fotos de los animales · 2 de 6» mientras las fotos siguen llegando | [captura](evidencias/iteracion-2/PE-21-7-registro-habilitado-fotos-bajando.png) |
| 7 | Ver fotos en una ficha con 3G | La completa muestra «Cargando…» mientras baja | [captura](evidencias/iteracion-2/PE-21-6-ver-fotos-cargando-en-3g.png) |

**Defecto encontrado y corregido.** Los íconos y la cuenta de registros salían solo de la
sincronización en curso, que se reinicia al reanudar. Ahora salen de lo que hay en el teléfono más la
tabla que se está descargando (documento técnico 17, sección 4, y PU-18 grupo 6). Las cuentas no se
reinician: tras una interrupción se ve «✓ Animales: 8».

**Pendiente.** Repetir los pasos 4 y 5 con la corrección publicada, para ver los íconos correctos tras
la interrupción.
