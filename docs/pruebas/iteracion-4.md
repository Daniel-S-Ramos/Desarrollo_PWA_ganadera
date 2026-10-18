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
