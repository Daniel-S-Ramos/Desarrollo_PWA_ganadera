# Pruebas de la Iteración 4 — Peso, partos y correcciones

Historias de usuario: HU-05 (registro del peso y consulta de su evolución), HU-12 (registro del parto y
la genealogía de la cría), HU-17 (corrección y anulación de registros). Pasos 4.1 a 4.5 del
[plan](../../PLAN.md). Rama `iteracion-4`. Incluye el criterio heredado HU-02.4 en su parte sobre la
evolución del peso y el control reproductivo.

**Responsable:** Daniel Santiago Ramos Pintor
**Estado:** en curso

## Resumen de resultados

| Id | Prueba | Paso | Requerimiento | Estado |
|---|---|---|---|---|
| PU-25 | Pesaje y evolución del peso | 4.1 | RF-13 · RF-14 · CU-08 · CU-09 · HU-05 | ✅ |
| PE-29 | Pesaje y evolución en el navegador real | 4.1 | CU-08 (3a, 4a) · CU-09 · HU-05 · HU-02.4 | ✅ |
| PU-26 | Parto, control reproductivo y chapeta pendiente | 4.2 | RF-16 · RF-17 · CU-10 · CU-11 · HU-12 | ✅ |
| PI-01 | Esquema remoto: chapeta puesta (verificación 15) | 4.2 | Tabla 24 · pedido del propietario | ✅ |
| PE-30 | Parto y chapeta en el navegador real | 4.2 | CU-10 · CU-11 · HU-12 · HU-02.4 | ✅ |
| PU-27 | Corrección, anulación y valor vigente | 4.3a | RF-31 · CU-17 · HU-17 · RD-05 | ✅ |
| PE-31 | Corrección y anulación en el navegador real | 4.3a | CU-17 (1a, 2a, 2b, 5a) · HU-17 · HU-02.4 | ✅ |
| PU-28 | Resolución de conflictos y lista de registros en conflicto | 4.3b | Tabla 21 · CU-17 · regla del propietario | ✅ |
| PE-32 | Resolución de conflictos con dos teléfonos | 4.3b | Tabla 21 · CU-17 | ✅ |

---

## PU-25 · Pesaje y evolución del peso

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar las validaciones, el peso anterior (nunca posterior), la variación atípica con los umbrales del autor, la segunda confirmación del mismo día, el texto de la comparación, la serie con el peso inicial, los tramos, el resumen, la meta de ganancia, la verificación dentro de la transacción y los autores |
| Requerimiento | RF-13 · RF-14 · CU-08 · CU-09 · HU-05 · Tabla 30 |
| Tipo | Unitaria, automática |
| Código | [`src/dominio/peso.ts`](../../src/dominio/peso.ts) · [`src/modulos/peso/pesajes.ts`](../../src/modulos/peso/pesajes.ts) · prueba [`pesajes.test.ts`](../../src/modulos/peso/pesajes.test.ts) · especificación [documento técnico 24](../tecnica/24-pesaje-y-evolucion.md), sección 10 |
| Resultado obtenido | **37 de 37 aprobadas**. Total del conjunto automático: **700 de 700** ([informe](resultados/2026-10-17_233611_e66e452.md)) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-17 |

**Mutaciones.** Veinte, todas detectadas. Dieciséis en la primera versión: umbrales inclusivos, umbral de
2,5, sin la regla del mismo día, peso sin mínimo, método opcional, fecha antes de la llegada, animal
retirado, anterior con pesajes posteriores, serie sin peso inicial, desempate al revés, métodos distintos
con el peso inicial, meta siempre falsa, resumen desde un punto sin fecha, sin verificar al guardar y meta
con valor por defecto. Cuatro tras los cambios de PE-29: sin la confirmación del mismo día, confirmarla con
la de la variación, admitir un peso inicial posterior y quitar del texto la referencia.

## PE-29 · Pesaje y evolución en el navegador real

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar como propietario las validaciones, la comparación con el peso anterior, la variación atípica con confirmación, dos pesajes el mismo día y la evolución; y como trabajador el registro con los pesajes del propietario a la vista |
| Requerimiento | RF-13 · RF-14 · CU-08 (3a, 4a) · CU-09 · HU-05 · HU-02.4 · Figura 25 |
| Tipo | Manual: propietario en Chrome del computador; trabajador en Chrome de un iPhone. Dirección de la rama `iteracion-4` |
| Resultado obtenido | Primera ronda (commit f7ef6ee): un defecto y dos pedidos del autor. Segunda ronda (commit e66e452): todos los pasos como se esperaba |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-17 |

### Primera ronda (commit f7ef6ee)

| # | Acción | Resultado | Evidencia |
|---|---|---|---|
| 1 | Z925, 1.010 kg con fecha 30 de septiembre (antes de la compra) | **Defecto:** comparó con la compra del 1 de octubre, posterior, y mostró «(1 día) · 10 kg por día» con confirmación | [captura](evidencias/iteracion-4/PE-29-r1-01-hallazgo-compara-con-fecha-posterior.png) |
| 2 | Fecha 11 de octubre | «10 kg más que el 1 de octubre de 2026 (10 días) · 1 kg por día». **El autor no entendió con qué se comparaba** | [formulario](evidencias/iteracion-4/PE-29-r1-02-texto-anterior-poco-claro.png) · [evolución](evidencias/iteracion-4/PE-29-r1-03-evolucion-primer-pesaje.png) |
| 3 | 1.100 kg hoy (cifra mal escrita) en Z925 y en Z928 | Aviso y Guardar inhabilitado hasta confirmar; corregido a 1.012, el aviso se va | [Z928](evidencias/iteracion-4/PE-29-r1-04-z928-atipico.png) · [Z925](evidencias/iteracion-4/PE-29-r1-06-cifra-mal-escrita.png) · [1.012](evidencias/iteracion-4/PE-29-r1-05-diferencia-normal.png) |
| 4 | Otro pesaje hoy (1.015 kg) | «Ya tiene un pesaje de esta fecha…» en una línea gris. **El autor pidió que fuera más visible y con una segunda confirmación** | [captura](evidencias/iteracion-4/PE-29-r1-07-mismo-dia-poco-visible.png) · [sin confirmación](evidencias/iteracion-4/PE-29-r1-08-mismo-dia-sin-confirmacion.png) |
| 5 | Evolución | Compra → 1.010 → 1.012 → 1.015, «+15 kg en 16 días · 0,9 kg por día». El 1.015 se registró con cinta, no con báscula: no se vio la nota de métodos distintos | [captura](evidencias/iteracion-4/PE-29-r1-09-evolucion-cuatro-puntos.png) |

**Cambios tras la primera ronda (commit e66e452).** (1) El peso anterior nunca es de una fecha posterior a
la del pesaje. (2) El texto nombra con qué se compara y cuánto pesaba: «Frente al peso de compra del 1 de
octubre de 2026 (1.000 kg): +10 kg en 10 días, +1 kg por día». (3) Otro pesaje en la misma fecha muestra un
aviso de atención con cada pesaje, su método y su autor, y exige la casilla «Es otro pesaje del mismo día»,
independiente de la de la variación. Documento técnico 24, secciones 5 y 6, actualizado.

### Segunda ronda (commit e66e452)

| # | Perfil | Acción | Resultado | Evidencia |
|---|---|---|---|---|
| 1 | Propietario | Abrir un pesaje con fecha de hoy | Aviso de atención: «Z925 ya tiene 2 pesajes del 17 de octubre de 2026», con cada uno y su autor; Guardar inhabilitado | [captura](evidencias/iteracion-4/PE-29-01-mismo-dia-aviso-visible.png) |
| 2 | Propietario | 1.010 kg con fecha 30 de septiembre | Ya no compara; al guardar, «El animal llegó al predio el 1 de octubre de 2026» | [captura](evidencias/iteracion-4/PE-29-02-fecha-antes-de-la-llegada.png) |
| 3 | Propietario | 1.016 kg hoy con báscula, marcando la casilla | «Frente al pesaje anterior del 17 de octubre de 2026 (1.015 kg): +1 kg, el mismo día»; se guarda | [captura](evidencias/iteracion-4/PE-29-03-mismo-dia-confirmado.png) |
| 4 | Propietario | 1.011 kg con fecha 12 de octubre | «Frente al pesaje anterior del 11 de octubre de 2026 (1.010 kg): +1 kg en 1 día, +1 kg por día», sin aviso de mismo día | [captura](evidencias/iteracion-4/PE-29-04-texto-con-referencia.png) |
| 5 | Propietario | Evolución | Compra → 1.010 → 1.012 → 1.015 → 1.016; el último tramo, «mismo día» y «Métodos distintos: compárese con cautela»; «+16 kg en 16 días · 1 kg por día en promedio» | [captura](evidencias/iteracion-4/PE-29-05-evolucion-metodos-distintos.png) |
| 6 | Trabajador | Abrir un pesaje de hoy en Z925 | Aviso con los 3 pesajes del propietario (báscula y cinta) y la casilla; Guardar inhabilitado | [captura](evidencias/iteracion-4/PE-29-06-trabajador-mismo-dia.jpg) |

**Observaciones.** (1) **Pedido del autor tras la segunda ronda:** el aviso de almacenamiento («Los datos
de este teléfono no están protegidos…»), presente en todas las pantallas, sobresalía más que la
comparación del pesaje. Se cambió por una franja discreta con borde amarillo, con el detalle plegado en
«¿Por qué?», y la comparación pasó a un recuadro destacado; el mismo estilo se aplicó a la comparación
con el promedio de la ronda de ordeño, que cumple la misma función. La franja se verificó en el navegador
(computador y ancho de teléfono); la comparación destacada se verá en la próxima prueba manual, porque
requiere iniciar sesión. (2) El trabajador abrió el formulario y comprobó el aviso, pero la captura no
muestra que guardara; el registro del trabajador lo cubren PU-25.4 y PE-25, que usa el mismo camino.

## PU-26 · Parto, control reproductivo y chapeta pendiente

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar las validaciones del parto, la transacción con la cría, la cría (madre, fecha exacta, reproductor, chapeta pendiente), el parto cercano, los parentescos, el siguiente número libre, la chapeta pendiente con su plazo y su confirmación, el control reproductivo y los permisos |
| Requerimiento | RF-04 · RF-16 · RF-17 · CU-10 · CU-11 · HU-12 · pedido del propietario (chapeta) |
| Tipo | Unitaria, automática |
| Código | [`src/dominio/reproduccion.ts`](../../src/dominio/reproduccion.ts) · [`src/dominio/parentesco.ts`](../../src/dominio/parentesco.ts) · [`src/modulos/reproduccion/partos.ts`](../../src/modulos/reproduccion/partos.ts) · [`src/modulos/identificacion/chapetaPendiente.ts`](../../src/modulos/identificacion/chapetaPendiente.ts) · prueba [`partos.test.ts`](../../src/modulos/reproduccion/partos.test.ts) · especificación [documento técnico 25](../tecnica/25-parto-y-control-reproductivo.md), sección 10 |
| Resultado obtenido | **40 de 40 aprobadas**. Total del conjunto automático: **742 de 742** ([informe](resultados/2026-10-18_001722_70fe9f5.md)) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-18 |

**Mutaciones.** Veintitrés. Veintiuna detectadas a la primera: parto cercano inclusivo, intervalos solo con
crías vivas, descendencia con todos los partos, sin validar la hembra, sin cada uno de los parentescos
(padre, hijo, medio hermano por el padre, abuelo, nieto), externo sin normalizar, sin verificar al guardar
el parentesco y el parto cercano, cría con chapeta puesta o con fecha aproximada, siguiente número con la
letra O, casilla también para comprados, pendiente que ignora las colocaciones, vencidos al final,
colocación repetida y colocación sin validar la fecha. **Dos sobrevivieron y mejoraron el código:** «saltar
los números ocupados» no hacía nada, porque se parte del mayor y los siguientes siempre están libres (se
quitó el código y se ajustó el documento 25, sección 6); y el día 90 exacto no estaba probado (se agregó la
prueba: a los 90 días no está vencido, al 91 sí).

## PI-01 · Chapeta puesta (verificación 15)

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar la migración: la tabla `colocacion_chapeta` con RLS y solo inserciones, un animal sin chapeta puesta, la colocación única y el parámetro de 90 días |
| Código | Migración [`20261018000100_chapeta_puesta.sql`](../../supabase/migrations/20261018000100_chapeta_puesta.sql) · [`supabase/pruebas/pi-01-esquema.sql`](../../supabase/pruebas/pi-01-esquema.sql), verificaciones 1, 2 y 15 |
| Resultado obtenido | **15 de 15** ([evidencia](evidencias/iteracion-4/PI-01-8-chapeta-puesta.txt)) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-18 |

**Observaciones.** (1) La primera ejecución no corrió: la prueba insertaba «Prueba Ivermectina», que chocó
con «Prueba ivermectina», registrado por el trabajador en PE-25; la regla de nombre único funcionó en el
servicio. El medicamento de la prueba pasó a «PI01 Ivermectina». (2) La verificación 15 tenía una columna
ambigua (`valor`); se calificó.

## PE-30 · Parto y chapeta en el navegador real

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar como propietario el parto con cría viva y número sugerido, el aborto, los avisos de parto cercano y parentesco, el control reproductivo, el recordatorio de la chapeta y la casilla del registro; y como trabajador la confirmación de la chapeta y los permisos |
| Requerimiento | CU-10 (4a, 8a, 8b) · CU-11 · HU-12 · HU-02.4 · pedido del propietario (chapeta) |
| Tipo | Manual: propietario en Chrome del computador; trabajador en Chrome de un iPhone. Dirección de la rama `iteracion-4` (commit 70fe9f5) |
| Resultado obtenido | Todos los pasos se comportaron como se esperaba |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-18 |

| # | Perfil | Acción | Resultado | Evidencia |
|---|---|---|---|---|
| 1 | Propietario | Z920, parto del 10 de octubre con cría viva | El número llega prellenado con **Z971** (el siguiente después de la chapeta mayor, Z970); macho, 32 kg, reproductor externo «toro de la ganadería villa Rita» | [número](evidencias/iteracion-4/PE-30-01-parto-cria-viva-numero-sugerido.png) · [cría](evidencias/iteracion-4/PE-30-02-cria-con-reproductor-externo.png) |
| 2 | Propietario | Guardar parto y cría | Abre la ficha de Z971: «⚠ Chapeta pendiente de poner · número Z971 · nació hace 8 días · quedan 82 días del plazo», con **Ya tiene la chapeta puesta**; peso al nacer 32 kg | [captura](evidencias/iteracion-4/PE-30-03-ficha-cria-chapeta-pendiente.png) |
| 3 | Propietario | Inicio | **Terneros sin chapeta puesta**: Z971 · nació hace 8 días · quedan 82 días del plazo | [captura](evidencias/iteracion-4/PE-30-04-inicio-terneros-sin-chapeta.png) |
| 4 | Propietario | Z926, aborto con observación | La observación aparece abierta con el aborto (4a); se guarda sin cría | [captura](evidencias/iteracion-4/PE-30-05-aborto-con-observacion.png) |
| 5 | Propietario | Z920, otro parto hoy | «⚠ Z920 tiene un parto del 10 de octubre de 2026, a 8 días de esta fecha… ¿no es el mismo parto?», con **Es otro parto**; Guardar inhabilitado | [captura](evidencias/iteracion-4/PE-30-06-parto-cercano.png) |
| 6 | Propietario | Con cría viva y reproductor del predio Z971 | «⚠ Z971 es hijo de Z920», «La revisión usa solo la genealogía registrada», **Confirmo el cruce**; Guardar inhabilitado. Se canceló sin guardar | [captura](evidencias/iteracion-4/PE-30-07-parentesco-hijo.png) |
| 7 | Propietario | Control reproductivo de Z920 | «1 parto», «Con un solo parto no se puede calcular el intervalo», 10 de octubre · Cría viva; descendencia: Z971 · Macho, con enlace | [captura](evidencias/iteracion-4/PE-30-08-control-reproductivo-z920.png) |
| 8 | Propietario | Registrar animal, nacido en el predio | Aparece **Aún no tiene la chapeta puesta** | [captura](evidencias/iteracion-4/PE-30-09-registro-casilla-sin-chapeta.png) |
| 9 | Trabajador | Ficha de Z971 en el otro teléfono | Llegó la cría con su aviso de chapeta pendiente | [captura](evidencias/iteracion-4/PE-30-10-trabajador-ve-chapeta-pendiente.png) |
| 10 | Trabajador | Confirmar la chapeta con fecha de hoy | «Chapeta puesta el 18 de octubre de 2026 por Daniel Ramos · registrado el 18 de octubre de 2026 a las 12:15 a. m.» | [captura](evidencias/iteracion-4/PE-30-13-trabajador-confirma-chapeta.png) |
| 11 | Trabajador | Inicio | Ya no aparece **Terneros sin chapeta puesta**; tampoco **Producción de leche** | [captura](evidencias/iteracion-4/PE-30-12-trabajador-inicio.png) |
| 12 | Trabajador | Ficha de Z920 | **Registrar parto** sí; **Control reproductivo**, no (Tabla 27) | [captura](evidencias/iteracion-4/PE-30-11-trabajador-ficha-sin-control.png) |

**Observaciones.** (1) El paso 11 deja evidenciado en pantalla que el trabajador no ve **Producción de
leche** en Inicio: era la observación 2 de PE-28 (Iteración 3), que quedaba pendiente. (2) No se tomaron
capturas del control reproductivo de Z926 tras el aborto ni de la marca «Sin chapeta puesta» del listado;
los cubren PU-26.8 y PU-26.7. (3) El número sugerido fue Z971 porque la chapeta mayor del teléfono es la de
prueba Z970; con los datos reales, seguirá la numeración del predio. (4) La franja discreta del aviso de
almacenamiento se ve en el iPhone (pasos 9 a 12).

## PU-27 · Corrección, anulación y valor vigente

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar el orden de aplicación de las correcciones (las recibidas por orden de llegada, las pendientes después) y que la anulación siempre prevalece; los campos corregibles por tabla y sus validaciones; el motivo y la nota; los permisos; que un registro anulado no admite más correcciones; que los cálculos (repetición sanitaria, ronda y promedio de leche, evolución del peso, control reproductivo, destino) usen el valor vigente y descarten lo anulado; la ficha y el listado; y la verificación al guardar |
| Requerimiento | RF-31 · CU-17 (1a, 2a, 2b, 5a) · HU-17.1 a 17.4 · RD-05 · Tabla 21 |
| Tipo | Unitaria, automática |
| Código | [`src/dominio/vigente.ts`](../../src/dominio/vigente.ts) · [`src/dominio/camposCorregibles.ts`](../../src/dominio/camposCorregibles.ts) · [`src/datos/vigentes.ts`](../../src/datos/vigentes.ts) · [`src/modulos/correcciones/correcciones.ts`](../../src/modulos/correcciones/correcciones.ts) · prueba [`correcciones.test.ts`](../../src/modulos/correcciones/correcciones.test.ts) · especificación [documento técnico 26](../tecnica/26-correccion-y-anulacion.md), sección 9 |
| Resultado obtenido | **17 de 17 aprobadas**. Total del conjunto automático: **759 de 759** ([informe](resultados/2026-10-18_172852_1802e83.md)) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-18 |

**Mutaciones.** Diecinueve, todas detectadas: pendientes antes que las recibidas, recibidas en orden inverso,
la anulación sin prevalecer, anulados incluidos en los cálculos, un campo desconocido que altera el registro,
dosis de 0, fecha sin límite inferior, fecha futura, sexo del progenitor sin validar, medicamento fuera del
catálogo, animal anulable, costo corregible por el trabajador, el mismo valor admitido, nota opcional con el
motivo «otro», correcciones sobre un registro anulado, sin la regla de madre o padre del predio o externo,
sin la regla entre nacimiento e ingreso, sin verificar el permiso al guardar y la ventana vencida tratada
como opción oculta.

**Observación.** El valor vigente de los litros que se adelantó en el paso 3.5 (`litrosVigentes`) se retiró:
la ronda, el promedio y la consulta de producción usan ahora la regla general, y su prueba de la Iteración 3
pasó a comprobar la regla general con los mismos datos.

## PE-31 · Corrección y anulación en el navegador real

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar como propietario la corrección de un evento sanitario, de un medicamento y de los datos del animal, la anulación de un pesaje y de un ordeño, y la nota obligatoria con el motivo «otro»; y como trabajador la corrección de su propio registro del día, la opción oculta en los registros del propietario y la ventana vencida |
| Requerimiento | CU-17 (1a, 2a, 2b, 5a) · HU-17.1 a 17.4 · RD-05 · HU-02.4 |
| Tipo | Manual: propietario en Chrome del computador; trabajador en Chrome de un iPhone. Dirección de la rama `iteracion-4` (commits ca23beb y 1802e83) |
| Resultado obtenido | Todos los pasos se comportaron como se esperaba. Un defecto de presentación se corrigió durante la prueba (observación 1) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-18 |

| # | Perfil | Acción | Resultado | Evidencia |
|---|---|---|---|---|
| 1 | Propietario | Corregir la dosis de la vacuna Prueba Aftosa de Z921 | «Valor vigente: 1»; la confirmación dice «Dosis pasará de 1 a 2,5»; el historial muestra **2,5 mg** con la marca **Corregido** | [formulario](evidencias/iteracion-4/PE-31-01-corregir-dosis-formulario.png) · [confirmación](evidencias/iteracion-4/PE-31-02-corregir-dosis-confirmacion.png) · [historial](evidencias/iteracion-4/PE-31-12-historial-dosis-corregida.png) |
| 2 | Propietario | Anular el pesaje de 1.016 kg por registro duplicado | Sale de la serie («+15 kg en 16 días») y aparece tachado en **Pesajes anulados** con su motivo y su autor | [formulario](evidencias/iteracion-4/PE-31-03-anular-pesaje-formulario.png) · [confirmación](evidencias/iteracion-4/PE-31-04-anular-pesaje-confirmacion.png) · [evolución](evidencias/iteracion-4/PE-31-05-evolucion-con-pesaje-anulado.png) |
| 3 | Propietario | Corregir el tipo de Prueba Florfenicol LA a antibiótico | El medicamento pasa a la sección **Antibiótico** del catálogo | [formulario](evidencias/iteracion-4/PE-31-06-corregir-tipo-medicamento.png) · [catálogo](evidencias/iteracion-4/PE-31-07-medicamento-en-antibioticos.png) |
| 4 | Propietario | Corregir el peso inicial de Z971 de 32 a 34 kg | La ficha y la evolución muestran «34 kg · peso al nacer»; la marca **Corregido** se despliega con «antes 32, ahora 34», el motivo, el autor, la fecha y la nota | [formulario](evidencias/iteracion-4/PE-31-21-corregir-peso-inicial-34.png) · [ficha](evidencias/iteracion-4/PE-31-22-ficha-z971-34-kg.png) · [detalle](evidencias/iteracion-4/PE-31-23-ficha-z971-detalle-corregido.png) |
| 5 | Propietario | Motivo «otro» sin nota y con nota | Sin nota: «Con el motivo «otro», escriba una nota» (CU-17, 5a); con nota se habilita | [sin nota](evidencias/iteracion-4/PE-31-10-motivo-otro-sin-nota.png) · [con nota](evidencias/iteracion-4/PE-31-09-motivo-otro-con-nota.png) |
| 6 | Propietario | Anular el ordeño de Z931 del 13 de octubre desde la ronda | El aviso del registro existente ofrece **Corregir o anular este ordeño**; tras anularlo, Z931 aparece **Anulado** y al tocarla: «…fue anulado: no admite otro registro ese día» | [opción](evidencias/iteracion-4/PE-31-11-ronda-corregir-ordeno.png) · [ronda](evidencias/iteracion-4/PE-31-15-ronda-ordeno-anulado.png) · [aviso](evidencias/iteracion-4/PE-31-16-ordeno-anulado-sin-registro.png) |
| 7 | Trabajador | Registrar un pesaje de Z924 y corregirlo el mismo día | Se guarda de 100 a 150 kg; la marca **Corregido** muestra «antes 100, ahora 150 · error de digitación · Daniel Ramos…» | [evolución](evidencias/iteracion-4/PE-31-17-trabajador-pesaje-corregido.png) · [detalle](evidencias/iteracion-4/PE-31-20-trabajador-detalle-correccion.png) |
| 8 | Trabajador | Evolución del peso con pesajes del propietario | Los pesajes registrados por Jose Ramos no tienen la opción (CU-17, 2a) | [captura](evidencias/iteracion-4/PE-31-19-trabajador-sin-opcion-pesajes-propietario.webp) |
| 9 | Trabajador | Corregir o anular su vacuna del 14 de octubre en Z925 | «La ventana de corrección venció: solo el propietario puede enmendarlo» (CU-17, 2b) | [captura](evidencias/iteracion-4/PE-31-18-trabajador-ventana-vencida.png) |

**Observaciones.** (1) La marca de anulación del paso 2 decía «…a las 12:51 a. m.. Ninguna»: la hora ya
termina en punto. La nota pasó a separarse con « · », como en la marca de corrección (commit 1802e83); es el
mismo caso que PE-20 en la ficha. (2) El primer intento del paso 4 quedó sin confirmar y la ficha siguió en
32 kg sin marca ([captura](evidencias/iteracion-4/PE-31-13-ficha-z971-sin-correccion.png) ·
[datos](evidencias/iteracion-4/PE-31-14-ficha-z971-datos.png)); al repetirlo y guardar quedó registrada.

## PU-28 · Resolución de conflictos y lista de registros en conflicto

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar el cambio de número (validación, reenvío, cola reordenada para que salgan sus dependientes), la unión con el animal registrado (reescritura de lo no enviado, imágenes, correcciones, chapeta puesta; se detiene si algo ya llegó al servicio), el medicamento repetido, la chapeta puesta repetida, quién resuelve, la lista de registros en conflicto con su destino y que no se ofrezca corregir un registro en conflicto |
| Requerimiento | Tabla 21 · regla del propietario del 2026-10-13 · CU-17 · decisión del autor del 2026-10-18 (quién resuelve) · pedido del autor en PE-32 (lista de conflictos) |
| Tipo | Unitaria, automática; dos recorridos completos con el servicio simulado (conflicto real, bajada y nueva subida) |
| Código | [`src/datos/resolucionConflictos.ts`](../../src/datos/resolucionConflictos.ts) · [`src/modulos/correcciones/conflictos.ts`](../../src/modulos/correcciones/conflictos.ts) · `listarConflictos` en [`sincronizacionLocal.ts`](../../src/datos/sincronizacionLocal.ts) · prueba [`conflictos.test.ts`](../../src/modulos/correcciones/conflictos.test.ts) · especificación [documento técnico 26](../tecnica/26-correccion-y-anulacion.md), secciones 10.4 a 10.6 |
| Resultado obtenido | **28 de 28 aprobadas**. Total del conjunto automático: **802 de 802** ([informe](resultados/2026-10-18_230446_252358b.md)) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-18 |

**Mutaciones.** Treinta y tres sobre la resolución y la lista. De las veinticuatro de la resolución, dos
sobrevivieron al principio y señalaron casos sin probar (la segunda verificación del número dentro de la
transacción y no ofrecer unir con otro animal que tampoco llegó al servicio); se agregaron sus pruebas y
quedaron 24 de 24. De las nueve de la lista, «el parto sin su madre» sobrevivió hasta agregar un parto al
caso; quedaron 9 de 9.

## Pruebas agregadas por los hallazgos de PE-32

| Prueba | Qué comprueba | Resultado | Mutaciones |
|---|---|---|---|
| **PU-10 · 9** ([`motor.test.ts`](../../src/sync/motor.test.ts)) | Sincroniza cuando la señal vuelve sin el aviso del navegador (revisión cada 15 segundos), al volver a la aplicación y no al ocultarse; deja de vigilar al detenerse | 3 de 3 | 7 de 7 detectadas |
| **PU-27 · 9** ([`consultasEnVivo.test.ts`](../../src/datos/consultasEnVivo.test.ts)) | Doce lecturas de pantallas observadas como lo hace useLiveQuery: chapeta, chapeta repetida, terneros de Inicio, ficha (pesaje y corrección), marca de corrección, listado, historiales sanitario y de destino, evolución del peso, control reproductivo y conflicto de chapeta | 12 de 12 | Con la versión anterior de `vigentes.ts` fallan 4 (chapeta, chapeta repetida, ficha y evolución) |

## PE-32 · Resolución de conflictos con dos teléfonos

| Campo | Contenido |
|---|---|
| Objetivo | Provocar conflictos reales con dos dispositivos sin conexión y resolverlos: chapeta repetida cambiando el número (trabajador) y uniendo (propietario), medicamento repetido y chapeta puesta repetida; entrar por la lista de registros en conflicto |
| Requerimiento | Tabla 21 · CU-17 · regla del propietario del 2026-10-13 · documento técnico 26, sección 10 |
| Tipo | Manual: propietario en Chrome del computador; trabajador en Chrome de un iPhone. Sin conexión: Wi-Fi apagado en el computador y modo avión en el iPhone. Dirección de la rama `iteracion-4` (commits aa724e6 a 252358b) |
| Resultado obtenido | Las cuatro resoluciones funcionaron. Aparecieron tres defectos y una mejora, corregidos durante la prueba (observaciones 1 a 4) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-18 |

| # | Parte | Perfil | Acción | Resultado | Evidencia |
|---|---|---|---|---|---|
| 1 | A | Ambos | Z980 registrado por el propietario con conexión y por el trabajador sin ella | Al volver la señal, el Z980 del trabajador queda «En conflicto: El código de chapeta ya está asignado a otro animal» (tardó: observación 1) | [propietario](evidencias/iteracion-4/PE-32-01-propietario-registra-z980.png) · [sin conexión](evidencias/iteracion-4/PE-32-02-trabajador-z980-sin-conexion.png) · [pendiente](evidencias/iteracion-4/PE-32-03-trabajador-z980-pendiente-con-senal.png) · [conflicto](evidencias/iteracion-4/PE-32-04-trabajador-z980-en-conflicto.webp) |
| 2 | A | Trabajador | **Resolver el conflicto** | Muestra el Z980 registrado («Macho · nacido el 25 de septiembre de 2026 · registrado por Jose Ramos») y las dos opciones; con «z980»: «Escriba un número distinto al que está repetido» | [opciones](evidencias/iteracion-4/PE-32-05-resolver-conflicto.webp) · [número repetido](evidencias/iteracion-4/PE-32-06-numero-repetido.webp) |
| 3 | A | Propietario | Cambiado a Z981 | Llega **Z981**, hembra, 160 kg, con su chapeta pendiente | [captura](evidencias/iteracion-4/PE-32-07-propietario-recibe-z981.png) |
| 4 | B | Ambos | Z982 del propietario (sin conexión, 3 fotos) y del trabajador (con conexión) | El del propietario queda en conflicto solo, sin recargar | [sin conexión](evidencias/iteracion-4/PE-32-08-propietario-z982-sin-conexion.png) · [conflicto](evidencias/iteracion-4/PE-32-09-propietario-z982-en-conflicto.png) |
| 5 | B | Propietario | **Es el mismo animal: unir con Z982** | «Pasarán a Z982: 3 fotografías»; al confirmar abre la ficha del Z982 del trabajador, «Todo enviado» | [lista](evidencias/iteracion-4/PE-32-10-unir-lista-fotografias.png) · [ficha](evidencias/iteracion-4/PE-32-11-ficha-tras-unir.png) |
| 6 | B | Ambos | Ficha de Z982 | La foto y «Fotos: 3 de 3» en los dos dispositivos: la foto siguió al animal correcto y se subió | [propietario](evidencias/iteracion-4/PE-32-12-propietario-z982-con-fotos.png) · [trabajador](evidencias/iteracion-4/PE-32-13-trabajador-recibe-fotos.webp) |
| 7 | C | Ambos | «Prueba Oxitetraciclina» del trabajador sin conexión, con un evento en Z921; «prueba oxitetraciclina» del propietario | El del trabajador queda «En conflicto: Ya existe un medicamento con ese nombre» con **Usar el que ya existe (prueba oxitetraciclina)** | [sin conexión](evidencias/iteracion-4/PE-32-14-trabajador-medicamento-sin-conexion.png) · [evento](evidencias/iteracion-4/PE-32-15-trabajador-evento-con-medicamento-nuevo.png) · [propietario](evidencias/iteracion-4/PE-32-16-propietario-agrega-medicamento.png) · [conflicto](evidencias/iteracion-4/PE-32-17-medicamento-en-conflicto.webp) |
| 8 | C | Trabajador | **Usar el que ya existe** | El evento de Z921 queda con «prueba oxitetraciclina · 15 ml», «Todo enviado» | [captura](evidencias/iteracion-4/PE-32-18-evento-con-medicamento-existente.png) |
| 9 | D | Ambos | Z983: chapeta confirmada en los dos dispositivos | Aviso «Este teléfono también registró la chapeta puesta…» con **Descartar**; confirmar y descartar exigían un segundo clic (observación 3) | [registro](evidencias/iteracion-4/PE-32-19-propietario-registra-z983.png) · [segundo clic](evidencias/iteracion-4/PE-32-20-segundo-clic-confirmar.png) · [aviso](evidencias/iteracion-4/PE-32-21-chapeta-repetida-descartar.png) · [segundo clic](evidencias/iteracion-4/PE-32-22-segundo-clic-descartar.png) · [ficha](evidencias/iteracion-4/PE-32-23-ficha-sin-conflicto.png) · [trabajador](evidencias/iteracion-4/PE-32-24-trabajador-confirma-chapeta.png) |
| 10 | D (repetida con Z984) | Propietario | Confirmar sin conexión | «Chapeta puesta el 17 de octubre…» al primer clic | [captura](evidencias/iteracion-4/PE-32-25-confirmar-un-clic.png) |
| 11 | D | Propietario | Al reconectar | La barra muestra «⚠ 1 registro en conflicto» con **Ver cuáles**; la pantalla **Registros en conflicto** lista «Chapeta puesta de Z984», su causa e **Ir a la ficha de Z984** | [barra](evidencias/iteracion-4/PE-32-26-barra-ver-cuales.png) · [lista](evidencias/iteracion-4/PE-32-27-pantalla-registros-en-conflicto.png) |
| 12 | D | Ambos | **Descartar** | El aviso desaparece al primer clic y queda «Todo enviado»; en el iPhone, la chapeta del trabajador, confirmada al primer clic | [descartar](evidencias/iteracion-4/PE-32-28-descartar-un-clic.png) · [ficha](evidencias/iteracion-4/PE-32-29-ficha-sin-conflicto.png) · [trabajador](evidencias/iteracion-4/PE-32-30-trabajador-chapeta-un-clic.png) |

**Observaciones.**

1. **El envío esperaba hasta 5 minutos al volver la señal (defecto).** El iPhone salió del modo avión sin el
   evento `online`, y la barra prometía «en unos segundos». La aplicación revisa ahora cada 15 segundos si
   volvió la señal y sincroniza al volver a ella (commit 153c861, documento 09, sección 2). En la parte B el
   conflicto apareció solo. PU-10, apartado 9.
2. **El texto de la barra** decía «Requieren la revisión del propietario». Con la decisión de quién resuelve
   pasó a «Los resuelve quien los registró o el propietario» (commit 153c861).
3. **Confirmar la chapeta y descartar la repetida exigían un segundo clic (defecto).** El primero guardaba,
   pero la pantalla no se enteraba. La causa estaba en la lectura de los valores vigentes del paso 4.3a, que
   también afectaba a la ficha y a la evolución del peso (documento 26, sección 10.7; commit 252358b). La
   parte D se repitió con Z984 al primer clic. PU-27, apartado 9.
4. **Mejora pedida por el autor:** la barra lleva a la lista de registros en conflicto, y cada uno al lugar
   donde se resuelve; en un registro en conflicto ya no se ofrece «Corregir», que se vio en la parte C
   (documento 26, sección 10.6; commit 252358b).
5. **Fotos desde iPhone.** El trabajador no pudo tomar fotos: en iPhone todos los navegadores usan el motor
   de Safari, que no genera WebP. Ya estaba fuera del alcance (decisión del 2026-10-12: el predio usa
   Android); el mensaje ahora lo dice en lugar de sugerir Chrome (commit d695e6f). Por eso en la parte A el
   animal no llevó registros dependientes; la parte B lo comprobó con las 3 fotos del propietario, que es
   además el caso pendiente desde PE-22.
6. En la parte B los dos Z982 no eran el mismo animal (macho comprado frente a hembra nacida); la prueba
   comprueba el mecanismo, y la unión conserva los datos del animal registrado.
