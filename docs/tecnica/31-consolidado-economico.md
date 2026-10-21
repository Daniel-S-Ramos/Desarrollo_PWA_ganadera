# 31 · Costos por animal y consolidado económico

| | |
|---|---|
| **Componente** | Módulo económico (Tabla 20) · `src/dominio/economia.ts` · `src/modulos/economia/costos.ts` · `src/modulos/economia/consolidado.ts` · `src/modulos/economia/PantallaRegistrarCosto.tsx` · `src/modulos/economia/PantallaConsolidado.tsx` |
| **Capa** | Dominio, lógica y presentación |
| **Origen en el documento** | RF-20 · RF-21 · RF-28 · CU-14, pasos 1 a 4 y flujos 2a, 3a, 4a y 4b (Tabla A14) · HU-16 (Tabla B16) · apartado 3.8.12 · Tabla 24 (fila `movimiento_economico`) · Tablas 27 y 30 |
| **Depende de** | [20 · Registro sanitario](20-registro-sanitario.md) (costo del evento) · [22 · Ronda](22-ronda-de-ordeno.md) (litros) · [26 · Valor vigente](26-correccion-y-anulacion.md) · [29 · Salida](29-salida-y-venta.md) (valor de venta, salida vigente) |
| **Base de datos** | Migración [`20261021000200_compra_vigente_unica.sql`](../../supabase/migrations/20261021000200_compra_vigente_unica.sql) · PI-01, verificación 18 |
| **Pruebas** | PU-33 · PI-01 (verificación 18) · PE-37 |

---

## 1. El problema

HU-16 pide saber si un animal genera ganancia o pérdida. La información económica está dispersa: el costo de
los medicamentos en los eventos sanitarios, los litros en los ordeños, el valor de venta en la salida, y los
demás costos (compra, servicios veterinarios, alimentación) no tienen todavía dónde registrarse. El apartado
3.8.12 fija qué cuenta como costo y qué como ingreso, para no contar dos veces el medicamento y para no presentar
siempre en pérdida a las vacas de leche, cuyo ingreso no es una venta.

## 2. Quién y cómo se llega (decisión A)

**Solo el propietario** (CU-14; Tabla 27; `movimiento_economico` es de inserción exclusiva del propietario). En la
ficha, debajo de los datos:

| Acceso | Destino |
|---|---|
| **Registrar costo** | `/animales/:id/costo` |
| **Consolidado económico** | `/animales/:id/consolidado` |

El trabajador no ve ninguna de las dos; si llega a la ruta, se le devuelve al inicio.

## 3. Registrar un costo (decisiones B y C, RF-20)

| Campo | Regla | Mensaje |
|---|---|---|
| **Concepto** | Obligatorio: **Compra**, **Servicio veterinario** o **Alimentación**. **Compra** solo se ofrece a un animal **comprado** (con fecha de ingreso, documento 13) sin compra vigente | «Elija el concepto» |
| **Fecha** | No posterior a hoy ni anterior a la llegada; si el animal salió, no posterior a su salida. En la compra llega con la fecha de ingreso; en los demás, con hoy | «La fecha no puede ser posterior a hoy» · «El animal llegó al predio el …» · «El animal salió del predio el …» |
| **Valor** | Pesos enteros mayores que 0, hasta 100.000.000; admite puntos de miles («2.800.000») | «Escriba el valor en pesos, sin decimales, hasta 100.000.000» |
| **Descripción** | Opcional, hasta 300 caracteres («Visita del veterinario, revisión de cojera») | — |

**El medicamento no es un concepto aquí** (3.8.12): su costo se anota en el evento sanitario que lo aplica, y el
consolidado lo toma de allí. **Un nacido en el predio no tiene compra**: arranca en cero, y el consolidado lo dice
(sección 6).

**Animal retirado (decisión C).** Es la única acción de registro que se mantiene en un animal retirado (documento
29, sección 7), con fecha no posterior a la salida: la cuenta del veterinario o del alimento suele llegar después
de la venta. La ficha del retirado muestra **Registrar costo** al propietario.

Al guardar se vuelve al consolidado del animal, que ya incluye el costo. Dentro de la transacción se comprueba
que una compra nueva no encuentre otra vigente.

## 4. Una compra vigente (decisión D)

El índice único parcial de la Tabla 24 («un animal admite un solo movimiento de compra») contaba también las
compras anuladas, el mismo problema que tuvo la salida en PE-35 (documento 29, sección 8). Se resuelve igual: la
migración `20261021000200_compra_vigente_unica.sql` reemplaza el índice por un disparador que, antes de insertar
una compra, rechaza si el animal tiene otra **sin anulación**, con el código de unicidad (23505); el reenvío del
mismo registro se ignora (3.7.8). Así una compra anulada por error puede registrarse de nuevo, y la anulada queda
como constancia. El teléfono aplica la misma regla. PI-01, verificación 18.

## 5. Corrección (decisión E)

El costo es un registro como los demás del paso 4.3a: el propietario lo corrige o lo anula con motivo, desde
**Corregir o anular** en el detalle del consolidado.

| Campo corregible | Tipo |
|---|---|
| Fecha | Fecha, no anterior a la llegada |
| Valor | Entero, mayor que 0 (solo el propietario) |
| Descripción | Texto, hasta 300 caracteres |

El concepto no se corrige: si una compra se registró como alimentación, se anula y se registra de nuevo.

## 6. El consolidado (decisiones F y G, CU-14 pasos 2 a 4, HU-16.2 y 16.3)

**Invertido** (cada concepto con su total y su número de registros; los que no tienen registros no se muestran):

| Concepto | Fuente |
|---|---|
| Compra | `movimiento_economico`, concepto compra |
| Servicios veterinarios | `movimiento_economico`, concepto servicio veterinario |
| Alimentación | `movimiento_economico`, concepto alimentación |
| Medicamentos | `evento_sanitario.costo` de los eventos del animal que lo tienen |

**Generado:**

| Concepto | Fuente y cálculo |
|---|---|
| Leche | Litros vigentes de sus ordeños × `precio_litro_leche` (Tabla 30, $1.950): «320 litros a $1.950 = $624.000» |
| Venta | `salida.valor_venta` de la salida vigente por venta |

**Resultado:** generado − invertido, como **Ganancia: $X** o **Pérdida: $X** (con el valor absoluto). Debajo, **Ver el
detalle** despliega cada registro de costo e ingreso del animal, del más reciente al más antiguo, con fecha,
concepto, valor y su marca de corregido; los costos registrados aquí llevan **Corregir o anular**.

**Avisos** (todos los que apliquen, encima del resultado):

| Situación | Aviso |
|---|---|
| Sin ningún costo | «No tiene costos registrados: el resultado no es representativo» (CU-14, 2a; HU-16.4) |
| Nacido en el predio | «Nació en el predio: no tiene costo de compra, y su resultado no es comparable con el de un animal comprado» (3a) |
| Activo | «Resultado parcial: el animal sigue en el predio» (4a) |
| Salió por muerte o por pérdida o robo | El resultado se presenta como «**Pérdida por muerte: $X, lo invertido**» (o «por pérdida o robo»), y no como una venta de valor cero (4b) |
| Eventos sanitarios sin costo | «3 eventos sanitarios no tienen costo registrado y no se incluyen» (HU-16.4) |
| Siempre, si hay leche | «La leche se valora al precio del parámetro: es el valor de la producción, no el dinero recibido» (3.8.12) |
| Siempre | «No incluye costos por lote ni otros gastos que no se registraron para este animal» (3.8.12; HU-16.4) |

Si el precio por litro no está en el teléfono, se usa el valor de ejemplo de la Tabla 30 y se dice («precio de
ejemplo»).

## 7. Datos (decisión H)

Todo con **valores vigentes** y sin anulados (3.8.12 y documento 26): costos corregidos, eventos con su costo
corregido, litros corregidos, ordeños y costos anulados fuera, y la salida vigente. Se lee del teléfono, sin
conexión, con todas las lecturas en una sola espera (documento 26, sección 10.7).

## 8. Relación con los requerimientos

| Requerimiento | Cómo lo atiende |
|---|---|
| **RF-20 · HU-16.1** | Compra, servicio veterinario y alimentación por animal; el medicamento desde el evento sanitario |
| **RF-21 · HU-16.2 y 16.3 · CU-14 pasos 2 a 4** | Invertido, generado (leche al precio del parámetro y venta) y resultado |
| **HU-16.4 · CU-14 2a, 3a, 4a, 4b** | Avisos de sin costos, nacido, parcial, pérdida por muerte o robo y conceptos fuera |
| **3.8.12** | Una sola fuente por concepto; una compra; nacidos en cero; costos por lote fuera |
| **Tabla 24** | Una compra vigente por animal |
| **RF-28 · Tabla 27** | Sin conexión; solo el propietario |

## 9. Pruebas

### PU-33 (automática)

| # | Qué verifica | Criterio de aprobación |
|---|---|---|
| 1 | Validaciones | Concepto, fecha (hoy, llegada, salida), valor y descripción |
| 2 | Compra | Solo para comprados; una vigente; anulada, se admite otra; dentro de la transacción |
| 3 | Invertido | Cada concepto con su total y su número; medicamentos desde los eventos con costo |
| 4 | Generado | Leche con el precio del parámetro o el de ejemplo; venta solo si salió por venta |
| 5 | Resultado y avisos | Ganancia o pérdida; cada aviso de la sección 6; muerte como pérdida de lo invertido |
| 6 | Valor vigente | Costos, costos de eventos y litros corregidos; anulados fuera |
| 7 | Corrección | Campos corregibles; el concepto no |
| 8 | Permisos | Solo el propietario registra y consulta |

### PI-01, verificación 18

Una sola compra vigente: la segunda se rechaza, el reenvío se ignora, anulada la primera se admite otra, y la
alimentación no se limita.

### PE-37 (manual)

Como **propietario**: registrar la compra, un servicio veterinario y una alimentación de un animal comprado de
prueba y ver su consolidado; ver el de una vaca de leche (con la leche valorada) y el de un nacido en el predio
(con su aviso); ver el de un animal vendido y el de uno muerto; corregir un costo y anular la compra para
registrarla de nuevo. Como **trabajador**: comprobar que no aparecen las opciones.

## Referencias

- Documento de trabajo de grado: RF-07, RF-20, RF-21, RF-28; CU-14 (Tabla A14); HU-16 (Tabla B16); apartado
  3.8.12; Tablas 24, 27 y 30.
