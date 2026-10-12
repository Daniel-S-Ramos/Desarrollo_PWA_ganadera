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

**Pendiente de confirmar.** El paso «empezar un registro, cerrar la pestaña y volver a abrir: el
formulario aparece vacío» (Tabla 31) no tiene una captura propia. La captura del paso 7 muestra la
aplicación reabierta sin conexión, pero en la pantalla de inicio.
