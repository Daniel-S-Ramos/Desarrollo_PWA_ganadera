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
