# Pruebas de la Iteración 3 — Sanidad, leche y destino

Historias de usuario: HU-03 (registro sanitario), HU-04 (advertencia por repetición de medicamento),
HU-09 (producción de leche), HU-13 (destino productivo). Pasos 3.1 a 3.7 del [plan](../../PLAN.md).
Rama `iteracion-3`. Incluye los criterios heredados de la Iteración 2: HU-02.4 (acceso desde la ficha
al historial sanitario), HU-06.4 (opciones exclusivas del propietario ocultas al trabajador) y la
comprobación en la ficha de la última vacuna, la leche y el destino (HU-02.1).

**Responsable:** Daniel Santiago Ramos Pintor
**Estado:** cerrada el 2026-10-15 · `v0.3`

## Resumen de resultados

| Id | Prueba | Paso | Requerimiento | Estado |
|---|---|---|---|---|
| PU-19 | Catálogo de medicamentos y parámetros | 3.1 | RF-09 · 3.8.9 · Tablas 27, 30 y 31 | ✅ |
| PI-01 | Esquema remoto: nombre de medicamento sin tildes ni espacios repetidos (verificación 14) | 3.1 | 3.8.9 · RF-09 | ✅ |
| PE-23 | Catálogo de medicamentos en el navegador real | 3.1 | 3.8.9 · Tabla 31 | ✅ |
| PU-20 | Destino productivo y su historial | 3.2 | RF-18 · RF-19 · CU-12 · HU-13 · Tabla 27 | ✅ |
| PE-24 | Destino productivo en el navegador real (cierra HU-06.4) | 3.2 | CU-12 · HU-13 · HU-06.4 · 3.10.4.4 | ✅ |
| PU-21 | Registro sanitario e historial | 3.3 | RF-07 · RF-08 · CU-04 · CU-05 · HU-03 · Tabla 27 | ✅ |
| PE-25 | Registro sanitario en el navegador real (cierra HU-02.4) | 3.3 | CU-04 · CU-05 · HU-03 · HU-02.1 y 4 · Tabla 31 | ✅ |
| PU-22 | Advertencia por repetición de un medicamento | 3.4 | RF-09 · CU-04 5a · HU-09 | ✅ |
| PE-26 | Advertencia por repetición en el navegador real | 3.4 | RF-09 · HU-09 · Figura 19 | ✅ |
| PU-23 | Ronda de ordeño | 3.5 | RF-10 · CU-06 · HU-04 · 3.8.6 | ✅ |
| PE-27 | Ronda de ordeño en el navegador real | 3.5 | CU-06 · HU-04 · 3.10.4.4 | ✅ |
| PU-24 | Consulta de producción diaria, semanal y mensual | 3.6 | RF-11 · CU-07 · HU-04.2 | ✅ |
| PE-28 | Consulta de producción en el navegador real | 3.6 | RF-11 · CU-07 · HU-04.2 | ✅ |

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

## PU-21 · Registro sanitario e historial

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar las validaciones del evento, el filtro del catálogo por tipo, la dosis precargada, el registro (también dentro de la transacción), el costo solo para el propietario, la copia para aplicar lo mismo a otro animal y el orden del historial |
| Requerimiento | RF-07 · RF-08 · CU-04 · CU-05 · HU-03 · Tablas 27 y 30 |
| Tipo | Unitaria, automática |
| Código | [`src/dominio/sanidad.ts`](../../src/dominio/sanidad.ts) · [`src/modulos/sanidad/eventos.ts`](../../src/modulos/sanidad/eventos.ts) · prueba [`eventos.test.ts`](../../src/modulos/sanidad/eventos.test.ts) · especificación [documento técnico 20](../tecnica/20-registro-sanitario.md), sección 10 |
| Resultado obtenido | **25 de 25 aprobadas**. Total del conjunto automático: **585 de 585** ([informe](resultados/2026-10-14_231346_5baa449.md)) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-14 |

**Mutaciones.** Diecinueve, todas detectadas: quitar «otro» de los medicamentos de un tratamiento,
proponer «otro» en lugar de antibiótico, invertir el desempate por UUID, no descartar los eventos sin
dosis, tomar la dosis de cualquier medicamento, copiar los síntomas, copiar el costo sin permiso,
quitar las reglas de animal retirado, medicamento del catálogo y nacimiento, validar la fecha con
`Date.parse`, admitir dosis 0, quitar el máximo del costo, admitir costo con decimales, quitar el
límite de los síntomas, dejar que el trabajador envíe costo, mostrar el costo a todos y no ordenar el
historial.

## PE-25 · Registro sanitario en el navegador real

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar como propietario el registro con un medicamento agregado desde la misma pantalla, las validaciones, la ronda para varios animales, la dosis precargada, el historial con costo y la última vacuna; y como trabajador el registro sin costo y el historial sin costo |
| Requerimiento | CU-04 · CU-05 · HU-03 · HU-02.1 y 4 · Tablas 27, 30 y 31 |
| Tipo | Manual: propietario en Chrome del computador; trabajador en Chrome de un iPhone. Dirección de la rama `iteracion-3` (commit 5baa449) |
| Resultado obtenido | Un defecto en la primera ejecución, corregido (hallazgo 1). En la segunda, todos los pasos como se esperaba |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-14 |

| # | Perfil | Acción | Resultado | Evidencia |
|---|---|---|---|---|
| 1 | Propietario | En Z920, Vacuna → **Agregar un medicamento**: «Prueba Aftosa» | Queda elegido sin salir del registro; tipo Vacuna propuesto; dosis vacía por ser el primer uso | [agregar](evidencias/iteracion-3/PE-25-01-agregar-medicamento-desde-registro.png) · [elegido](evidencias/iteracion-3/PE-25-02-medicamento-elegido-dosis-vacia.png) |
| 2 | Propietario | Fecha de mañana y dosis 0 | «La fecha no puede ser posterior a hoy»; «La dosis debe ser mayor que 0 y hasta 9.999» | [fecha](evidencias/iteracion-3/PE-25-03-fecha-futura.png) · [dosis](evidencias/iteracion-3/PE-25-04-dosis-cero.png) |
| 3 | Propietario | Guardar con dosis 1 y costo 3.000; **Aplicar lo mismo a otro animal** con Z921 y Z923 | Cada formulario llega con tipo, medicamento, fecha, dosis y costo copiados y «Ya se aplicó en esta ronda a: …»; la confirmación final dice «3 animales (Z920, Z921, Z923)» | [1](evidencias/iteracion-3/PE-25-05-confirmacion-ronda-1.png) · [Z921](evidencias/iteracion-3/PE-25-06-ronda-z921-copiado.png) · [Z923](evidencias/iteracion-3/PE-25-07-ronda-z923-copiado.png) · [3 animales](evidencias/iteracion-3/PE-25-08-ronda-3-animales.png) |
| 4 | Propietario | Ficha de Z921 e historial | «Última vacuna: Prueba Aftosa · 14 de octubre de 2026»; el detalle muestra «Costo: $ 3.000» | [captura](evidencias/iteracion-3/PE-25-09-ficha-ultima-vacuna-e-historial-con-costo.png) |
| 5 | Propietario | Purga, sin purgas en el catálogo → **Ver todo el catálogo** | Lista los demás medicamentos | [captura](evidencias/iteracion-3/PE-25-10-ver-todo-el-catalogo.png) |
| 6 | Propietario | Evento de tipo Otro en Z921 con síntomas y costo 4.000 | Se guarda; el historial lo pone primero (mismo día, registrado después) con síntomas y «$ 4.000» | [captura](evidencias/iteracion-3/PE-25-11-evento-con-sintomas-y-costo.png) |
| 7 | Propietario | En Z924, Vacuna → Prueba Aftosa | Dosis precargada en 1 con «Tomada del último registro de este medicamento: revísela» | [captura](evidencias/iteracion-3/PE-25-12-dosis-precargada.png) |
| 8 | Trabajador | Registrar una vacuna en Z925 | Registrado; llega al computador con «Registrado por Daniel Ramos» y en el servicio con costo vacío | [teléfono](evidencias/iteracion-3/PE-25-14-trabajador-evento-registrado.webp) · [computador](evidencias/iteracion-3/PE-25-13-propietario-ve-evento-del-trabajador.png) · [servicio](evidencias/iteracion-3/PE-25-18-costo-por-perfil.txt) |
| 9 | Trabajador | Ficha e historial de Z921 | Llegaron los eventos del propietario; el detalle muestra síntomas y fecha de registro, **sin el costo** (que el propietario sí ve: $ 3.000 y $ 4.000) | [ficha](evidencias/iteracion-3/PE-25-15-trabajador-ficha-vacuna-llego.png) · [detalle](evidencias/iteracion-3/PE-25-16-trabajador-detalle-sin-costo.png) · [síntomas](evidencias/iteracion-3/PE-25-17-trabajador-sintomas-sin-costo.png) |

**Hallazgo 1 (defecto, corregido).** En la primera ejecución, al pulsar **Agregar medicamento** dentro
del registro la página se recargaba, pedía el código de desbloqueo y el medicamento no se guardaba
(consultado en el servicio: no existía). Causa: el formulario del catálogo quedó dentro del formulario
del evento, un formulario dentro de otro, que el HTML no admite; el navegador enviaba el exterior de la
manera tradicional. Las pruebas automáticas no lo detectan porque no dibujan las pantallas. Corrección
(commit 5baa449): el bloque de agregar un medicamento dejó de ser un formulario y su botón guarda
directamente. [Ficha antes](evidencias/iteracion-3/PE-25-00a-hallazgo-ficha-antes.png) ·
[formulario](evidencias/iteracion-3/PE-25-00b-hallazgo-agregar-medicamento.png) ·
[página recargada](evidencias/iteracion-3/PE-25-00c-hallazgo-pagina-recargada.png)

**Observaciones.** (1) El trabajador registró «Prueba ivermectina» como **Vacuna**, y la ficha de Z925
la muestra como última vacuna. Es lo previsto (se guarda el tipo que elige quien registra, documento
20, sección 4), pero muestra que la clasificación depende de quien registra; con un dato real se
enmendará con una corrección (Iteración 4). (2) No se tomó captura del formulario del trabajador sin el
campo de costo; lo respaldan el evento que llegó al servicio con costo vacío y la prueba automática
PU-21.6, que rechaza un costo enviado por el trabajador. (3) El costo copiado en la ronda se muestra
como «3000», sin separador de miles; se acepta igual y el historial lo presenta como «$ 3.000».
(4) Los medicamentos «Prueba Aftosa», «Prueba ivermectina» y «Otro mas» son de prueba y se borrarán
antes de la evaluación; «Otro mas» no lleva el prefijo «Prueba» y debe incluirse a mano en la limpieza.

## PU-22 · Advertencia por repetición de un medicamento

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar los dos niveles, los límites del intervalo, la aplicación posterior a la fecha registrada, cuál aplicación se muestra, el aislamiento por animal y medicamento, el rechazo sin confirmación (también dentro de la transacción) y los textos del aviso |
| Requerimiento | RF-09 · CU-04 5a · HU-09 |
| Tipo | Unitaria, automática |
| Código | [`src/dominio/repeticion.ts`](../../src/dominio/repeticion.ts) · [`src/modulos/sanidad/eventos.ts`](../../src/modulos/sanidad/eventos.ts) · prueba [`repeticion.test.ts`](../../src/modulos/sanidad/repeticion.test.ts) · especificación [documento técnico 21](../tecnica/21-advertencia-por-repeticion.md), sección 9 |
| Resultado obtenido | **22 de 22 aprobadas**. Total del conjunto automático: **607 de 607** ([informe](resultados/2026-10-14_234519_f91f011.md)) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-14 |

**Hallazgo.** La primera ejecución falló en 5 pruebas: la expresión que reconoce el formato de la fecha
perdió sus barras invertidas al escribirse desde la consola (`/^d{4}-d{2}-d{2}$/`), y con ella la
verificación nunca se hacía: **la advertencia no habría aparecido**. Se corrigió antes de la versión
probada.

**Mutaciones.** Doce, todas detectadas: advertir también a exactamente `intervalo` días, considerar
solo las aplicaciones anteriores, no señalar la posterior, no ordenar por cercanía, invertir el
desempate por UUID, informar la más antigua, restar los días con signo, quitar «ayer», contar
cualquier medicamento del animal, no verificar al guardar, dar por confirmado por defecto y buscar al
autor equivocado.

## PE-26 · Advertencia por repetición en el navegador real

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar como propietario la advertencia con Guardar inhabilitado hasta confirmar, la casilla que se desmarca, la aplicación posterior, la información fuera del intervalo y un intervalo corto; y como trabajador la advertencia sobre una aplicación del propietario |
| Requerimiento | RF-09 · CU-04 5a · HU-09 · Figura 19 |
| Tipo | Manual: propietario en Chrome del computador; trabajador en Chrome de un iPhone. Dirección de la rama `iteracion-3` (commit f91f011) |
| Resultado obtenido | Todos los pasos se comportaron como se esperaba |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-14 |

| # | Perfil | Acción | Resultado | Evidencia |
|---|---|---|---|---|
| 1 | Propietario | Z920, Prueba Aftosa (35 días) otra vez hoy | «⚠ Prueba Aftosa ya se aplicó a Z920 el 14 de octubre de 2026 (hoy), registrada por Jose Ramos», el intervalo y la casilla; **Guardar evento inhabilitado**; al confirmar se habilita | [aviso](evidencias/iteracion-3/PE-26-01-advertencia-mismo-dia.png) · [inhabilitado](evidencias/iteracion-3/PE-26-02-guardar-inhabilitado.png) · [confirmado](evidencias/iteracion-3/PE-26-03-confirmado-guardar-habilitado.png) |
| 2 | Propietario | Cambiar la fecha al 11 de octubre | La casilla se desmarca y el aviso dice «…después de la fecha que está registrando» | [captura](evidencias/iteracion-3/PE-26-04-posterior-casilla-desmarcada.png) |
| 3 | Propietario | Volver a hoy, confirmar y guardar | Registrado | [captura](evidencias/iteracion-3/PE-26-05-guardado-con-confirmacion.png) |
| 4 | Propietario | Z924, Prueba Aftosa sin aplicaciones; luego hoy, con una del 2 de octubre | «Sin aplicaciones anteriores…»; después, advertencia «hace 12 días» (dentro de 35) | [sin anteriores](evidencias/iteracion-3/PE-26-06-sin-aplicaciones-anteriores.png) · [12 días](evidencias/iteracion-3/PE-26-07-advertencia-hace-12-dias.png) |
| 5 | Propietario | Z924, «pp prueba» (purga, 2 días): el 3 de octubre, hoy, otra vez hoy y el 30 de septiembre | Sin anteriores; hoy **informa** «hace 11 días» sin casilla; otra hoy **advierte** (2 días); el 30 de septiembre informa la más reciente, porque la del 3 de octubre está a 3 días | [3 oct](evidencias/iteracion-3/PE-26-08-intervalo-corto-sin-anteriores.png) · [informa](evidencias/iteracion-3/PE-26-09-informacion-hace-11-dias.png) · [advierte](evidencias/iteracion-3/PE-26-10-intervalo-2-dias-advertencia.png) · [30 sep](evidencias/iteracion-3/PE-26-11-informacion-la-mas-reciente.png) |
| 6 | Propietario | Z921, Prueba Florfenicol LA (2 días), aplicada el 12 de octubre: registrar el 13 y el 14 | El 13 (día siguiente) advierte; el 14 (dos días después) informa | [historial](evidencias/iteracion-3/PE-26-12-historial-z921.png) · [13](evidencias/iteracion-3/PE-26-13-intervalo-2-dias-dia-siguiente.png) · [14](evidencias/iteracion-3/PE-26-14-intervalo-2-dias-informa.png) |
| 7 | Trabajador | Z921, Prueba Aftosa | La advertencia nombra la aplicación del 14 de octubre registrada por Jose Ramos, con la casilla | [captura](evidencias/iteracion-3/PE-26-15-trabajador-advertencia.webp) |

**Observaciones.** (1) **Desviación del guion:** el paso planeado con Prueba Aftosa el 1 de agosto en
Z924 no pudo hacerse porque Z924 nació en octubre y la aplicación no admite eventos anteriores al
nacimiento (documento 20, sección 6), que es el comportamiento correcto. El autor usó el 2 de octubre y
otro medicamento de intervalo corto; la aplicación posterior a la fecha registrada quedó cubierta en el
paso 2. (2) El documento 21 decía que el aviso mostraría «✓ Enviado»; una aplicación ya enviada no lleva
distintivo, como en el resto de la aplicación (documento 11, sección 4). Se corrigió el documento, no
la aplicación. (3) «pp prueba» es un medicamento de prueba sin el prefijo «Prueba»; se incluye en la
limpieza previa a la evaluación.

## PU-23 · Ronda de ordeño

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar las vacas de la ronda, la siguiente vaca, la validación de los litros con el cero, el promedio solo sobre días con registro, las palabras y sus umbrales, el reemplazo como corrección, los permisos del reemplazo, el valor vigente y la verificación dentro de la transacción |
| Requerimiento | RF-10 · CU-06 · HU-04 · apartados 3.8.6 y 3.9.5 |
| Tipo | Unitaria, automática |
| Código | [`src/dominio/leche.ts`](../../src/dominio/leche.ts) · [`src/modulos/leche/ronda.ts`](../../src/modulos/leche/ronda.ts) · prueba [`ronda.test.ts`](../../src/modulos/leche/ronda.test.ts) · especificación [documento técnico 22](../tecnica/22-ronda-de-ordeno.md), sección 10 |
| Resultado obtenido | **40 de 40 aprobadas**. Total del conjunto automático: **647 de 647** ([informe](resultados/2026-10-15_000856_7cae766.md)) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-15 |

**Mutaciones.** Veintiuna, todas detectadas: quitar el máximo de litros, admitir dos decimales, admitir
fecha futura, incluir la fecha en el promedio, quitar el límite inferior de la ventana, cambiar los
límites de «similar» y «muy por debajo», quitar el aviso de atención, tomar la primera corrección en vez
de la más reciente, aplicar correcciones de otros campos, admitir vacas sin destino leche, machos o
retiradas, no verificar el permiso, reemplazar sin confirmar o con el mismo valor, guardar el valor
original como anterior, usar otro motivo, crear un segundo registro en vez de la corrección, no verificar
la producción al guardar y mostrar en la ficha el valor original.

**Observación.** Se retiró una prueba que esperaba rechazar a un perfil inexistente: los dos perfiles
registran producción (Tabla 27), así que no verificaba nada; se reemplazó por la que comprueba que el
trabajador registra ordeños nuevos.

## PE-27 · Ronda de ordeño en el navegador real

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar como propietario la ronda sin vacas, la ronda de un día anterior y la de hoy con el promedio y las palabras, el registro existente, el reemplazo y el valor vigente en la ficha; y como trabajador que no puede reemplazar un registro del propietario |
| Requerimiento | CU-06 (2a, 3a, 3b) · HU-04 (1, 3, 4) · apartados 3.8.6 y 3.10.4.4 |
| Tipo | Manual: propietario en Chrome del computador; trabajador en Chrome de un iPhone. Dirección de la rama `iteracion-3` (commit 7cae766) |
| Resultado obtenido | Todos los pasos se comportaron como se esperaba; un ajuste de redacción (observación 1) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-15 |

| # | Perfil | Acción | Resultado | Evidencia |
|---|---|---|---|---|
| 1 | Propietario | Abrir la ronda sin vacas con destino leche | «Ninguna vaca tiene el destino Producción de leche. Asígnelo desde la ficha de cada vaca», con enlace al listado (CU-06, 2a) | [captura](evidencias/iteracion-3/PE-27-01-sin-vacas-en-produccion.png) |
| 2 | Propietario | Asignar Producción de leche a Z920, Z921, Z926, Z927 y Z931 | La ronda las lista en orden de chapeta, «0 de 5», abierta en la primera | [captura](evidencias/iteracion-3/PE-27-02-ronda-cinco-vacas.png) |
| 3 | Propietario | Ronda del 13 de octubre: 10, 12, 0, 0 y 5 litros | «Sin registros en los últimos 7 días»; los ceros quedan como «✓ 0 litros»; «Ronda completa: 5 de 5 vacas» | [captura](evidencias/iteracion-3/PE-27-03-ronda-13-completa.png) |
| 4 | Propietario | Tocar Z920 en la ronda del 13 | «Ya hay un registro… 10 litros, registrado por Jose Ramos. El valor nuevo lo reemplazará», con la casilla; el botón inhabilitado (CU-06, 3a) | [captura](evidencias/iteracion-3/PE-27-04-registro-existente-13.png) |
| 5 | Propietario | Ronda del 14: Z920 = 10,5; Z921 = 8; Z926 = 0 | «Similar a su promedio: 0,5 litros más»; «⚠ Muy por debajo de su promedio: 4 litros menos», en amarillo; con promedio 0, el 0 es igual; la ronda pasa sola a la siguiente | [similar](evidencias/iteracion-3/PE-27-05-similar-al-promedio.png) · [muy por debajo](evidencias/iteracion-3/PE-27-06-muy-por-debajo.png) · [promedio 0](evidencias/iteracion-3/PE-27-07-promedio-cero.png) |
| 6 | Propietario | Reemplazar los 10,5 litros de Z920 por 11, confirmando | Se reemplaza; la ficha muestra «Leche más reciente: 11 litros · 14 de octubre de 2026», el valor vigente | [reemplazo](evidencias/iteracion-3/PE-27-08-reemplazo-confirmado.png) · [ficha](evidencias/iteracion-3/PE-27-11-ficha-valor-vigente.png) |
| 7 | Trabajador | Ronda del 13 en el otro teléfono; tocar Z920 (y Z921 el 14, según el guion) | Los cinco registros del propietario llegaron con ✓; «No puede reemplazar este registro: la enmienda corresponde al propietario», campo y botón inhabilitados (CU-06, 3b) | [ronda](evidencias/iteracion-3/PE-27-10-trabajador-ronda-13.png) · [sin permiso](evidencias/iteracion-3/PE-27-09-trabajador-no-puede-reemplazar.png) · [Z921 el 14](evidencias/iteracion-3/PE-27-12-trabajador-z921-14-sin-permiso.png) |

**Observaciones.** (1) Con un valor igual al promedio el texto decía «Similar a su promedio: igual a su
promedio»; se ajustó para decir solo «Igual a su promedio». (2) Los destinos se asignaron con fecha 15
de octubre y la ronda admitió registrar el 13 y el 14: la ronda toma el destino **vigente**, no el que
tenía la vaca en la fecha del ordeño (documento 22, sección 4). Es razonable, porque asignar el destino es
un acto administrativo posterior a que la vaca ya se ordeñe, y queda anotado. (3) Algunas vacas de prueba
tienen pocos días de nacidas, lo que hace irreales sus litros; sirven para la prueba y se borrarán con la
serie Z900–Z999.

## PU-24 · Consulta de producción diaria, semanal y mensual

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar las ventanas, las semanas de lunes a domingo, los meses con su longitud real, los agregados con el periodo en curso, el cero frente al día sin registro, el valor vigente, las vacas consultables y el permiso |
| Requerimiento | RF-11 · CU-07 pasos 1 a 4 · HU-04.2 · apartado 3.8.6 · Tabla 27 |
| Tipo | Unitaria, automática |
| Código | [`src/dominio/periodos.ts`](../../src/dominio/periodos.ts) · [`src/modulos/leche/produccion.ts`](../../src/modulos/leche/produccion.ts) · prueba [`produccion.test.ts`](../../src/modulos/leche/produccion.test.ts) · especificación [documento técnico 23](../tecnica/23-consulta-de-produccion.md), sección 9 |
| Resultado obtenido | **16 de 16 aprobadas**. Total del conjunto automático: **663 de 663** ([informe](resultados/2026-10-15_003043_82f3bd6.md)) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-15 |

**Mutaciones.** Doce, todas detectadas: empezar la semana el domingo, ventana diaria de 31, invertir el
desplazamiento, fijar el fin de mes en el día 30, contar completo el periodo en curso, promediar sobre
todos los días, tratar el vacío como cero, quitar el mes de inicio en la etiqueta semanal, no marcar el
periodo en curso, consultar sin valor vigente, incluir machos y excluir las vacas con destino leche sin
registros.

**Hallazgo en una prueba anterior.** Al ejecutar el conjunto completo el 15 de octubre falló una prueba
de PU-23 (permiso de reemplazo «del mismo día»): creaba el ordeño con la hora real y lo comparaba con
una hora fija del 14. Coincidían el día en que se escribió y dejaron de coincidir al cambiar el día. Se
corrigió **la prueba**, que ahora usa la hora real y «dos días después» (commit 82f3bd6). La aplicación
no cambió.

## PE-28 · Consulta de producción en el navegador real

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar las tres agregaciones con los registros reales, el valor vigente, la navegación, el caso sin registros, el cero frente al día sin registro y la entrada desde la ficha |
| Requerimiento | RF-11 · CU-07 (pasos 1 a 4 y 3a) · HU-04.2 · apartado 3.8.6 |
| Tipo | Manual: propietario en Chrome del computador; trabajador en Chrome de un iPhone. Dirección de la rama `iteracion-3` (commit 82f3bd6) |
| Resultado obtenido | Todos los pasos del propietario como se esperaba; un ajuste de redacción (observación 1) |
| Estado | ✅ Aprobada, con la observación 2 |
| Fecha | 2026-10-15 |

| # | Acción | Resultado | Evidencia |
|---|---|---|---|
| 1 | Z920, diaria | 15 oct «Sin registro»; 14 oct **11 litros** (el valor reemplazado en PE-27); 13 oct 10 litros; resumen «21 litros · 10,5 por día registrado · 2 de 30 días registrados»; Siguiente inhabilitado | [captura](evidencias/iteracion-3/PE-28-01-diaria-z920.png) |
| 2 | Semanal | «12 – 18 oct (en curso): 21 litros · 10,5 por día · 2 de 4 días registrados» (hoy jueves) | [captura](evidencias/iteracion-3/PE-28-02-semanal-z920.png) |
| 3 | Mensual | «octubre de 2026 (en curso): … 2 de 15 días registrados» | [captura](evidencias/iteracion-3/PE-28-03-mensual-z920.png) |
| 4 | ← Anterior en mensual, diaria y semanal | «Sin registros de Z920 en este periodo», con «Ver el periodo anterior» y, salvo en mensual, «Ver por semanas» o «Ver por meses» (CU-07, 3a) | [mensual](evidencias/iteracion-3/PE-28-04-mensual-sin-registros.png) · [diaria](evidencias/iteracion-3/PE-28-05-diaria-sin-registros.png) · [semanal](evidencias/iteracion-3/PE-28-06-semanal-sin-registros.png) |
| 5 | Z926 | 13 oct «0 litros», con la barra vacía; 14 y 15 oct «Sin registro» (apartado 3.8.6) | [captura](evidencias/iteracion-3/PE-28-07-cero-frente-a-sin-registro.png) |
| 6 | Ficha de Z921 → **Ver producción** | Abre en Z921: 12 litros el 13 y 8 el 14 | [ficha](evidencias/iteracion-3/PE-28-08-ficha-ver-produccion.png) · [consulta](evidencias/iteracion-3/PE-28-09-desde-la-ficha-z921.png) |

**Observaciones.** (1) En semanal, el título del resumen decía «Z920 · 27 jul – 2 ago a 12 – 18 oct»;
se cambió por los días extremos, «Z920 · 27 jul a 18 oct». (2) **El paso del trabajador no quedó
evidenciado en pantalla**: las capturas enviadas muestran su ronda de ordeño (que además confirma, con
Z921 el 14 de octubre, el caso 3b de PE-27), no el Inicio ni la ficha sin los accesos a la producción.
Lo respaldan la ruta, que devuelve al inicio a quien no tiene CU-07, y PU-24.8. Se verificará en
pantalla en la prueba de la comparación entre vacas (paso 5.1), que usa la misma pantalla.
[Ronda del trabajador](evidencias/iteracion-3/PE-28-10-trabajador-ronda-15.png)

---

## Acta de cierre de la Iteración 3

| Campo | Contenido |
|---|---|
| Iteración | 3 · Sanidad, leche y destino (Tabla 13) |
| Historias | HU-03 (5 puntos) · HU-04 (5 puntos) · HU-09 (3 puntos) · HU-13 (3 puntos) · **16 puntos** |
| Periodo | 13 al 15 de octubre de 2026 (3 días calendario; estimado: 20 al 26 de octubre) |
| Rama | `iteracion-3` · se fusiona con `main` y se etiqueta `v0.3` |
| Pasos | 3.1 a 3.7 |
| Casos de prueba | 13 casos (PU-19 a PU-24, PI-01 verificación 14, PE-23 a PE-28): 13 aprobados; 1 defecto encontrado en pantalla y corregido (PE-25) |
| Pruebas automáticas | 663 de 663 aprobadas (531 al empezar la iteración); 86 mutaciones en los grupos nuevos, todas detectadas |
| Documentación técnica | Documentos 18 a 23, nuevos; el 21 corregido tras PE-26 |
| Publicación | Dirección de la rama `iteracion-3`; al fusionar, https://desarrollo-pwa-ganadera.vercel.app |

### Criterios de aceptación

Fuente: tarjetas del Anexo B. ✅ verificado de extremo a extremo · ⚙️ verificado a nivel técnico, con la
verificación en pantalla en una etapa posterior · ➡️ trasladado.

**HU-03 · Registro del evento sanitario en el momento de su aplicación (Tabla B3)**

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | El registro exige fecha, tipo de evento y medicamento | ✅ | PU-21.1; PE-25 (validaciones en pantalla) |
| 2 | Permite consignar de manera opcional la dosis, el costo y los síntomas | ✅ | PU-21.1 y 6; PE-25 (dosis precargada, costo solo del propietario, síntomas) |
| 3 | El evento queda asociado a un animal identificado | ✅ | Registro desde la ficha (documento 20, sección 3); PE-25 |
| 4 | El historial sanitario presenta los eventos ordenados cronológicamente | ✅ | PU-21.8; PE-25 (historial con detalle, en ambos perfiles) |
| 5 | El registro se completa sin conexión | ⚙️ | PU-21.4: se escribe en la base local y en la cola, el mismo camino verificado sin conexión en PE-17 y PE-18. La prueba en pantalla sin señal queda para la verificación en conectividad limitada (paso 6.4) |

**HU-04 · Registro de la producción diaria de leche (Tabla B4)**

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | El registro se asocia a una vaca y a una fecha | ✅ | PU-23; PE-27 |
| 2 | La producción puede consultarse en periodos diario, semanal y mensual | ✅ | PU-24; PE-28 |
| 3 | El sistema impide registrar dos veces la misma vaca en una jornada sin advertirlo | ✅ | PU-23.6, 7 y 9; PE-27 (aviso con valor y autor, reemplazo como corrección, trabajador sin permiso) |
| 4 | El registro se completa sin conexión | ⚙️ | PU-23 (base local y cola); en pantalla sin señal, paso 6.4 |

**HU-09 · Advertencia por medicamento recientemente aplicado (Tabla B9)**

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Al registrar un evento se verifican las aplicaciones previas del mismo medicamento | ✅ | PU-22.5; PE-26 |
| 2 | Si hay una dentro del intervalo, se advierte con la fecha de la anterior | ✅ | PU-22.1 a 4; PE-26 (también una posterior a la fecha registrada y la del trabajador) |
| 3 | El registro solo continúa tras la confirmación explícita | ✅ | PU-22.6 y 7; PE-26 (Guardar inhabilitado; la casilla se desmarca al cambiar la fecha) |
| 4 | La verificación se resuelve sin conexión | ⚙️ | PU-22: se calcula solo con la base local; en pantalla sin señal, paso 6.4 |

**HU-13 · Asignación y seguimiento del destino productivo (Tabla B13)**

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | El destino se selecciona entre los seis | ✅ | PU-20; PE-24 |
| 2 | El destino vigente se muestra en la ficha | ✅ | PE-24 (también en el teléfono del trabajador) |
| 3 | Cada cambio conserva la fecha y el destino anterior | ✅ | PU-20.2; PE-24 («Reemplazó a Producción de leche») |
| 4 | El historial de destinos puede consultarse | ✅ | PE-24 (historial con autor y hora) |

### Criterios heredados de la Iteración 2

| Criterio | Estado | Evidencia |
|---|---|---|
| HU-02.1 · La ficha muestra última vacuna, leche más reciente y destino | ✅ | PE-25 (última vacuna), PE-27 (leche, con el valor vigente), PE-24 (destino). El último peso real llega con los pesajes (Iteración 4); hoy muestra el peso de compra o al nacer |
| HU-02.4 · Desde la ficha se accede al historial sanitario | ✅ | PE-25 (ambos perfiles). Los accesos a la evolución del peso y al control reproductivo se agregan en la Iteración 4 |
| HU-06.4 · Las opciones exclusivas del propietario no se presentan al trabajador | ✅ | PE-24 (sin Cambiar destino, Historial ni destino en el registro); PE-25 (sin costo) |

### Decisión de cierre

La Iteración 3 se cierra con **17 de 17 criterios de sus historias cumplidos**: 14 verificados de extremo
a extremo y 3 a nivel técnico (el registro y la verificación sin conexión de HU-03, HU-04 y HU-09, que
usan el mismo camino ya verificado sin señal en la Iteración 2 y se probarán en pantalla en el paso
6.4). Los tres heredados de la Iteración 2 quedan cumplidos.

**Pasan a etapas posteriores:** la prueba en pantalla sin señal de los registros de esta iteración
(paso 6.4); la verificación en pantalla de que el trabajador no ve la consulta de producción (PE-28,
observación 2; paso 5.1); los accesos de la ficha a la evolución del peso y al control reproductivo
(Iteración 4).

**Pendientes que siguen abiertos:** la resolución de conflictos (pendiente de diseño 4.3, Iteración 4,
que generalizará el valor vigente adelantado para los litros); el catálogo real de 14 medicamentos, que
registrará el propietario; la limpieza de los datos de prueba antes de la evaluación (PLAN, pendientes
de diseño).

### Velocidad

16 puntos en 3 días calendario. Acumulado: 47 de 76 puntos (62 %) en 10 días, del 6 al 15 de octubre.
El calendario estimado ponía el cierre de esta iteración el 26 de octubre.

### Hallazgos de la iteración que cambiaron el diseño o el código

| Hallazgo | Prueba | Cambio |
|---|---|---|
| El intervalo de un medicamento es el mínimo entre dos aplicaciones, y la última aplicación debe mostrarse siempre | Revisión con el autor (paso 3.1) | Dos niveles: información y advertencia (documentos 18 y 21) |
| 35 días para los productos de dosis única y las vacunas | Decisión del autor | Valor por defecto propuesto en el catálogo (documento 18) |
| La fecha «2026-02-30» se aceptaba en el destino | PU-20 | Validación de fecha que exige que exista |
| Un formulario dentro de otro recargaba la página y no guardaba el medicamento | PE-25 | El bloque de agregar medicamento dejó de ser un formulario |
| La expresión de la fecha perdió sus barras al escribirse desde la consola: la advertencia nunca habría aparecido | PU-22 | Corregida antes de publicarse; los archivos con expresiones se escriben sin pasar por la consola |
| El aviso no puede decir «Enviado»: lo enviado no lleva distintivo | PE-26 | Documento 21 corregido |
| «Similar a su promedio: igual a su promedio» y el título semanal se leían mal | PE-27, PE-28 | Textos ajustados |
| Una prueba dependía del día en que se ejecutaba | PU-23 (15 de octubre) | La prueba usa la hora real |
| La ronda toma el destino vigente, no el que tenía la vaca en la fecha del ordeño | PE-27 | Se conserva y se documenta (documento 22, sección 4) |
