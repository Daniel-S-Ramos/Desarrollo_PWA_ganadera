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
| PU-21 | Registro sanitario e historial | 3.3 | RF-07 · RF-08 · CU-04 · CU-05 · HU-03 · Tabla 27 | ✅ |
| PE-25 | Registro sanitario en el navegador real (cierra HU-02.4) | 3.3 | CU-04 · CU-05 · HU-03 · HU-02.1 y 4 · Tabla 31 | ✅ |
| PU-22 | Advertencia por repetición de un medicamento | 3.4 | RF-09 · CU-04 5a · HU-09 | ✅ |
| PE-26 | Advertencia por repetición en el navegador real | 3.4 | RF-09 · HU-09 · Figura 19 | ✅ |

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
