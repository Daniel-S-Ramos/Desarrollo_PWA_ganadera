# Pruebas de la Iteración 3 — Sanidad, leche y destino

Historias de usuario: HU-03 (registro sanitario), HU-04 (advertencia por repetición de medicamento),
HU-09 (producción de leche), HU-13 (destino productivo). Pasos 3.1 a 3.7 del [plan](../../PLAN.md).
Rama `iteracion-3`. Incluye los criterios heredados de la Iteración 2: HU-02.4 (acceso desde la ficha
al historial sanitario), HU-06.4 (opciones exclusivas del propietario ocultas al trabajador) y la
comprobación en la ficha de la última vacuna, la leche y el destino (HU-02.1).

**Responsable:** Daniel Santiago Ramos Pintor
**Estado:** en curso

## Resumen de resultados

| Id | Prueba | Paso | Requerimiento | Estado |
|---|---|---|---|---|
| PU-19 | Catálogo de medicamentos y parámetros | 3.1 | RF-09 · 3.8.9 · Tablas 27, 30 y 31 | ✅ |
| PI-01 | Esquema remoto: nombre de medicamento sin tildes ni espacios repetidos (verificación 14) | 3.1 | 3.8.9 · RF-09 | ✅ |
| PE-23 | Catálogo de medicamentos en el navegador real | 3.1 | 3.8.9 · Tabla 31 | ✅ |
| PU-20 | Destino productivo y su historial | 3.2 | RF-18 · RF-19 · CU-12 · HU-13 · Tabla 27 | ✅ |
| PE-24 | Destino productivo en el navegador real (cierra HU-06.4) | 3.2 | CU-12 · HU-13 · HU-06.4 · 3.10.4.4 | ✅ |

---

## PU-19 · Catálogo de medicamentos y parámetros

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar la normalización del nombre, la coincidencia exacta (también dentro de la transacción), los parecidos, la validación, el orden del catálogo, la lectura de parámetros y los permisos |
| Requerimiento | RF-09 · apartado 3.8.9 · Tablas 27, 30 y 31 |
| Tipo | Unitaria, automática |
| Código | [`src/dominio/medicamentos.ts`](../../src/dominio/medicamentos.ts) · [`src/modulos/sanidad/catalogo.ts`](../../src/modulos/sanidad/catalogo.ts) · [`src/datos/parametros.ts`](../../src/datos/parametros.ts) · prueba [`catalogo.test.ts`](../../src/modulos/sanidad/catalogo.test.ts) · especificación [documento técnico 18](../tecnica/18-catalogo-de-medicamentos.md), sección 11 |
| Resultado obtenido | **33 de 33 aprobadas**. Total del conjunto automático: **531 de 531** ([informe](resultados/2026-10-13_235603_ec77b66.md)) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-13 |

**Mutaciones.** Ocho, todas detectadas: no quitar las tildes (4 pruebas fallaron), no reducir los
espacios, quitar también la tilde de la ñ, tratar la coincidencia exacta como parecido, aceptar
palabras de menos de tres letras como parecido, no verificar dentro de la transacción, quitar los
límites del intervalo y ordenar sin el tipo.

## PI-01 · Nombre de medicamento sin tildes ni espacios repetidos (verificación 14)

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar que el servicio rechaza otra escritura de un nombre ya registrado |
| Código | Migración [`20261013000100_nombre_medicamento_normalizado.sql`](../../supabase/migrations/20261013000100_nombre_medicamento_normalizado.sql) · [`supabase/pruebas/pi-01-esquema.sql`](../../supabase/pruebas/pi-01-esquema.sql), verificación 14 |
| Resultado obtenido | **14 de 14** ([evidencia](evidencias/iteracion-3/PI-01-7-medicamento-normalizado.txt)). Con «Prueba Ivermectina», se rechazan «Prueba Ivermectína» y «  prueba   IVERMECTINA » (23505) y se admite «Prueba Ivermectina 1%» |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-13 |

**Observación.** La verificación 8 insertaba «Ivermectina», que chocaría con el nombre real cuando el
propietario lo registre. Se cambió por «Prueba Ivermectina».

## PE-23 · Catálogo de medicamentos en el navegador real

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar el alta de medicamentos, la coincidencia con otra escritura, los parecidos, el intervalo obligatorio y la llegada al otro dispositivo |
| Requerimiento | 3.8.9 · Tabla 31 · Tabla 30 |
| Tipo | Manual: Chrome en el computador y Chrome en un iPhone, con la dirección de la rama `iteracion-3` |
| Resultado obtenido | Todos los pasos se comportaron como se esperaba |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-13 |

| # | Acción | Resultado | Evidencia |
|---|---|---|---|
| 1 | Agregar «Prueba Florfenicol» (antibiótico, ml, 2 días) | Agregado | [captura](evidencias/iteracion-3/PE-23-3-catalogo-con-dos-medicamentos.png) |
| 2 | Escribir «prueba florfenicól» | «Ya existe Prueba Florfenicol», con **Usar Prueba Florfenicol** (Tabla 31) | [captura](evidencias/iteracion-3/PE-23-1-nombre-repetido-con-tilde.png) |
| 3 | Escribir «Prueba Florfenicol LA» | «¿Es alguno de estos?» y se puede agregar igual | [captura](evidencias/iteracion-3/PE-23-2-nombre-parecido.png) |
| 4 | Guardar sin intervalo | «Escriba un número entero de días, de 1 a 730», con la ayuda de consultar al veterinario | [captura](evidencias/iteracion-3/PE-23-4-intervalo-obligatorio.png) |
| 5 | Abrir Medicamentos en el iPhone | Los dos medicamentos llegaron; además bajaban las fotos de los animales («8 de 9») | [captura](evidencias/iteracion-3/PE-23-5-iphone-catalogo-sincronizado.jpg) |

**Observaciones.** (1) «Prueba Florfenicol LA» quedó registrado como vacuna, por un toque en el botón
equivocado. Un medicamento no se modifica: el error se enmendará con una corrección (Iteración 4), y
como es de prueba se borrará antes de la evaluación. (2) El espacio usado se mostró como «110 B» y
«4 B» en la primera apertura de la dirección de la rama: es la estimación que entrega el navegador
(`navigator.storage.estimate`), que aún no había medido ese almacenamiento. Se vigila en las próximas
pruebas.

## PU-20 · Destino productivo y su historial

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar el destino vigente, el historial con el destino reemplazado, las seis validaciones, la asignación (también dentro de la transacción), el destino al registrar un animal, los permisos y el filtro del listado |
| Requerimiento | RF-18 · RF-19 · CU-12 · HU-13 · HU-06.4 · Tabla 27 |
| Tipo | Unitaria, automática |
| Código | [`src/dominio/destino.ts`](../../src/dominio/destino.ts) · [`src/modulos/destino/destino.ts`](../../src/modulos/destino/destino.ts) · [`src/modulos/identificacion/registroAnimal.ts`](../../src/modulos/identificacion/registroAnimal.ts) · [`src/modulos/consulta/listado.ts`](../../src/modulos/consulta/listado.ts) · prueba [`destino.test.ts`](../../src/modulos/destino/destino.test.ts) · especificación [documento técnico 19](../tecnica/19-destino-productivo.md), sección 8 |
| Resultado obtenido | **29 de 29 aprobadas**. Total del conjunto automático: **560 de 560** ([informe](resultados/2026-10-14_002157_06bd6b0.md)) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-14 |

**Hallazgo.** La primera ejecución encontró un defecto: la fecha «2026-02-30» se aceptaba, porque
`Date.parse` la convierte en el 2 de marzo sin avisar. Se corrigió con la misma comprobación de las
fechas del registro (la fecha convertida debe coincidir con la escrita) antes de la versión probada.

**Mutaciones.** Catorce, todas detectadas: invertir el desempate por UUID, tomar como anterior el
siguiente en lugar del previo, quitar cada una de las reglas de mismo destino, fecha del vigente,
llegada al predio y animal retirado, validar la fecha con `Date.parse`, validar fuera de la
transacción, asignar sin comprobar el permiso, registrar el animal sin crear su destino o sin
comprobar el permiso de destino, no comparar con la llegada en el registro, ignorar el filtro «Sin
destino» y tomar en el listado el primer registro en lugar del vigente.

## PE-24 · Destino productivo en el navegador real

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar como propietario la primera asignación, el cambio con confirmación, las validaciones, el historial y el filtro; y como trabajador que las opciones exclusivas del propietario no se muestran (HU-06.4) y que el destino llega a su teléfono |
| Requerimiento | CU-12 · HU-13 · HU-06.4 · HU-15 · 3.10.4.4 · Tabla 31 |
| Tipo | Manual: propietario en Chrome del computador; trabajador en Chrome de un iPhone. Dirección de la rama `iteracion-3` (commit 06bd6b0) |
| Resultado obtenido | Todos los pasos se comportaron como se esperaba |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-14 |

| # | Perfil | Acción | Resultado | Evidencia |
|---|---|---|---|---|
| 1 | Propietario | Abrir la ficha de Z970, sin destino | «Sin destino asignado», con **Cambiar destino** e **Historial del destino** | [captura](evidencias/iteracion-3/PE-24-01-ficha-sin-destino.png) |
| 2 | Propietario | Primer destino: Producción de leche, hoy | Se guardó sin confirmación (CU-12, 3a) | [captura](evidencias/iteracion-3/PE-24-02-primer-destino.png) |
| 3 | Propietario | Ver el historial | «Producción de leche», «Inicial», asignado por Jose Ramos con fecha y hora | [captura](evidencias/iteracion-3/PE-24-03-historial-inicial.png) |
| 4 | Propietario | Elegir otra vez Producción de leche | «Ya tiene ese destino» | [captura](evidencias/iteracion-3/PE-24-04-ya-tiene-ese-destino.png) |
| 5 | Propietario | Ceba con fecha anterior al vigente (13/10) | «Debe ser desde el 14 de octubre de 2026 o después, la fecha del destino actual» | [captura](evidencias/iteracion-3/PE-24-05-fecha-anterior-al-vigente.png) |
| 5b | Propietario | Ceba con fecha de hoy, Guardar | «El destino Producción de leche (desde el 14 de octubre de 2026) será reemplazado por Ceba», con Confirmar y Cancelar | [captura](evidencias/iteracion-3/PE-24-06-confirmacion-del-cambio.png) |
| 5c | Propietario | Confirmar y ver el historial | Ficha con «Ceba»; historial: Ceba «Reemplazó a Producción de leche» y Producción de leche «Inicial» | [captura](evidencias/iteracion-3/PE-24-07-historial-con-cambio.png) |
| 6 | Propietario | Registrar Z931 (nacida el 10 de diciembre de 2025) con destino Reproductora desde el 16 de junio de 2026 | La ficha muestra «Reproductora · desde el 16 de junio de 2026»; el historial la señala como «Inicial», asignada por Jose Ramos. Se admite una fecha pasada posterior a la llegada (sección 4.1) | [ficha](evidencias/iteracion-3/PE-24-14-registro-con-destino-ficha.png) · [historial](evidencias/iteracion-3/PE-24-15-registro-con-destino-historial.png) |
| 7 | Propietario | Filtros del listado: Ceba, Producción de leche, Sin destino | Ceba: Z970 con «Hembra · Nació hoy · Ceba»; Producción de leche: 0 animales; Sin destino: los 12 restantes | [Ceba](evidencias/iteracion-3/PE-24-08-filtro-ceba.png) · [leche](evidencias/iteracion-3/PE-24-09-filtro-leche-vacio.png) · [sin destino](evidencias/iteracion-3/PE-24-10-filtro-sin-destino.png) |
| 8 | Trabajador | Abrir Z970 en el otro teléfono | Llegó «Ceba · desde el 14 de octubre de 2026»; no aparecen Cambiar destino ni Historial | [captura](evidencias/iteracion-3/PE-24-11-trabajador-ficha.jpg) |
| 9 | Trabajador | Listado y registro | Ve los filtros por destino; el registro pasa de Genealogía a Guardar, sin la sección de destino (HU-06.4) | [listado](evidencias/iteracion-3/PE-24-12-trabajador-filtros.png) · [registro](evidencias/iteracion-3/PE-24-13-trabajador-registro-sin-destino.png) |

**Observaciones.** (1) Se usó la chapeta Z970, de la serie reservada a PI-04 y PI-05 (Z950–Z999). No
choca con esas pruebas mientras no repitan ese número, y se borrará en la limpieza anterior a la
evaluación con el resto de la serie Z900–Z999. (2) Los trabajadores del predio usan Android; esta
prueba del perfil trabajador se hizo en un iPhone, lo que basta porque se verifica qué se muestra, no la
cámara.
