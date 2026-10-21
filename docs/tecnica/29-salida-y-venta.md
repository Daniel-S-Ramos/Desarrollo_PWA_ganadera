# 29 · Registro de la salida y venta del animal

| | |
|---|---|
| **Componente** | Módulo de salidas (Tabla 20) · `src/dominio/salida.ts` · `src/modulos/salida/salidas.ts` · `src/modulos/salida/PantallaRegistrarSalida.tsx` · `src/datos/vigentes.ts` (salidas vigentes) |
| **Capa** | Dominio, datos, lógica y presentación |
| **Origen en el documento** | RF-15 · RF-20 · RF-27 · RF-28 · CU-13, pasos 1 a 7 y flujos 2a, 3a y 3b (Tabla A13) · HU-11 (Tabla B11) · Tabla 24 (fila `salida`) · Tabla 27 |
| **Depende de** | [24 · Pesaje](24-pesaje-y-evolucion.md) (último peso) · [26 · Corrección y anulación](26-correccion-y-anulacion.md) · [16 · Ficha](16-ficha-del-animal.md) · [15 · Listado](15-listado-de-animales.md) |
| **Base de datos** | Migración [`20261020000100_salida_observacion.sql`](../../supabase/migrations/20261020000100_salida_observacion.sql) · PI-01, verificación 16 |
| **Pruebas** | PU-31 · PI-01 (verificación 16) · PE-35 |

---

## 1. El problema

Hoy un animal vendido, muerto o perdido sigue figurando en el inventario: la tabla `salida` existe desde la
Iteración 1, pero no hay pantalla para registrarla. CU-13 pide dejar constancia de que el animal abandona el
predio y de las condiciones económicas de la operación; HU-11, que el animal deje el inventario activo sin
perder su historia, porque la salida «cierra el ciclo de trazabilidad del animal dentro del predio».

## 2. Quién y cómo se llega (decisión A)

**Solo el propietario** (CU-13; Tabla 27). En la ficha de un **animal activo**, el botón **Registrar salida**
abre `/animales/:id/salida`. No se muestra en un animal ya retirado. Si un trabajador llega a la ruta, se le
devuelve al inicio. El servicio vuelve a aplicar el permiso: la política de `salida` solo admite inserciones
del propietario (migración `20261007000200_politicas_rls.sql`).

## 3. El formulario (decisión B, CU-13 pasos 2 a 5)

| Campo | Regla | Mensaje |
|---|---|---|
| **Fecha** | Llega con hoy. No posterior a hoy ni anterior a la llegada del animal al predio (nacimiento o ingreso, documento 24) | «La fecha no puede ser posterior a hoy» · «El animal llegó al predio el …» |
| **Motivo** | Obligatorio: **Venta**, **Muerte** o **Pérdida o robo** | «Elija el motivo» |
| **Peso de venta** | Solo en la venta; obligatorio; de 1 a 1.500 kg, con un decimal, como el pesaje | «Escriba el peso de venta» |
| **Valor recibido** | Solo en la venta; obligatorio; pesos enteros mayores que 0, hasta 100.000.000 | «Escriba el valor recibido, en pesos» |
| **Comprador** | Solo en la venta; opcional; hasta 100 caracteres | — |
| **Causa de la muerte** | Solo en la muerte; obligatoria; hasta 300 caracteres (CU-13, 3a) | «Escriba la causa» |
| **Observación** | Solo en la pérdida o el robo; opcional; hasta 300 caracteres (CU-13, 3b) | — |

Al cambiar el motivo, los campos de otro motivo se ocultan y no se guardan: una muerte nunca lleva valor de
venta (Tabla 24).

## 4. Columna nueva (decisión E)

La Tabla 24 y el esquema remoto no tenían dónde guardar la observación del flujo 3b. La migración agrega
`salida.observacion` (texto opcional, hasta 300 caracteres). En el teléfono, la tabla local no necesita cambio
de versión: Dexie guarda el campo sin índice. PI-01, verificación 16, comprueba la columna y su límite.

## 5. El último peso y el pesaje reciente (decisión C, CU-13 paso 2 y 2a)

Encima del formulario: «Último peso: 420 kg · 2 de octubre de 2026 · cinta bovinométrica» (o el peso de
compra o al nacer, como en la ficha). El peso de venta **no se precarga**: debe escribirse el del día de la
venta, no el de hace semanas.

Si no hay pesaje en los últimos **`dias_sin_pesaje`** días (parámetro que ya existe, 30 días), aparece:

> ⚠ No tiene un pesaje en los últimos 30 días. Conviene pesarlo antes de venderlo. [Registrar pesaje]

El aviso solo sale con el motivo Venta y **no bloquea**: el ganadero puede vender con el peso de la báscula del
comprador. El enlace abre el registro de pesaje y vuelve a la ficha.

## 6. Confirmación (decisión D, CU-13 paso 6)

**Revisar** valida y presenta un resumen antes de guardar:

> Z925 sale del predio el 20 de octubre de 2026 por **venta**: 418 kg · $3.200.000 · comprador Pedro Gómez.
> Dejará de figurar en el inventario activo; su historial seguirá disponible.
> [Confirmar la salida] [Volver]

Al confirmar se guarda (con su operación en la cola) y se vuelve a la ficha, que ya muestra la salida. La
unidad de trabajo vuelve a comprobar dentro de la transacción que el animal no tenga una salida vigente: si
otro registro llegó entre tanto, se informa «Este animal ya tiene registrada su salida» sin guardar.

## 7. Animal retirado (decisión F, CU-13 paso 7, HU-11.3 y 11.4)

Un animal está **retirado** si tiene una **salida vigente**: registrada y no anulada (Tabla 24: el estado no se
almacena, se deduce). Hasta ahora bastaba con que existiera una salida; desde este paso se usa la salida
vigente, para que anularla devuelva el animal al inventario (sección 8). Una sola función,
`salidasVigentes()`, alimenta a todas las pantallas que distinguen activos de retirados: listado, ficha, ronda,
producción, comparación, chapeta pendiente y búsqueda de chapeta.

| Lugar | Comportamiento |
|---|---|
| Listado | Fuera del filtro «Activos» (ya funciona); en «Retirados» y «Todos», con su marca |
| Ficha | Debajo del encabezado: «Vendido el 20 de octubre de 2026 · 418 kg · $3.200.000», «Murió el … · causa: …» o «Perdido o robado el … · observación», con su autor |
| Ficha, acciones | Se ocultan las de registro: evento sanitario, pesaje, parto, destino, confirmar chapeta y fotos. El historial (sanitario, peso, reproducción, destino) sigue para consulta |
| Ronda, comparación y recordatorios | No aparece (la comparación lo incluye si produjo en el periodo, marcado; documento 28) |

## 8. Una salida equivocada (decisión G)

La salida es un registro como los demás del paso 4.3a: el **propietario** la corrige o la anula con motivo,
desde **Corregir o anular** en el texto de la salida de la ficha. El trabajador no puede, porque no la creó
(RD-05).

| Campo corregible | Tipo |
|---|---|
| Fecha | Fecha, no anterior a la llegada |
| Peso de venta | Número, 1 a 1.500 |
| Valor recibido | Entero, mayor que 0 (solo el propietario) |
| Comprador, causa, observación | Texto |

El motivo no se corrige: si se registró una venta en lugar de una muerte, se anula. **Anulada**, el animal
vuelve a ser activo en todas las pantallas y la ficha muestra la salida tachada con su anulación.

**Límite.** El servicio admite una sola salida por animal (restricción única, Tabla 24), y una salida anulada
ya no admite correcciones (CU-17, 1a): un animal con la salida anulada **no puede volver a salir** desde la
aplicación. La ficha no ofrece **Registrar salida** en ese caso y explica «La salida de este animal fue anulada
y el servicio no admite otra: consulte al desarrollador si debe registrarse». Para que no ocurra por error, al
elegir **Anular** en una salida la pantalla advierte que el animal no podrá registrar otra salida y que, si el
error es la fecha, el peso, el valor o el comprador, se corrija en lugar de anular. Es el mismo límite del
ordeño anulado (documento 26, sección 7), más grave aquí porque no hay otro día en que registrarla.

## 9. Economía (decisión H)

La salida guarda su peso y su valor. El consolidado económico (paso 5.4, HU-16.3) los leerá como ingreso desde
`salida`, sin copiarlos en `movimiento_economico`: un mismo valor en dos tablas podría desalinearse con una
corrección.

## 10. Relación con los requerimientos

| Requerimiento | Cómo lo atiende |
|---|---|
| **RF-15 · HU-11.1 y 11.2 · CU-13 pasos 3 a 5** | Motivo; en la venta, peso y valor obligatorios y comprador opcional |
| **CU-13 paso 2 y 2a** | Último peso y aviso de pesaje no reciente con acceso al pesaje |
| **CU-13 3a y 3b** | Causa obligatoria en la muerte; observación en la pérdida o el robo |
| **CU-13 pasos 6 y 7 · HU-11.3 y 11.4** | Confirmación; retirado del inventario activo con el historial consultable |
| **RF-27 · RF-28** | Autor y fecha; sin conexión, por la cola |
| **Tabla 24** | Una salida por animal; estado retirado deducido de la salida vigente |
| **Tabla 27 · RD-05** | Solo el propietario, en pantalla y en el servicio |

## 11. Pruebas

### PU-31 (automática)

| # | Qué verifica | Criterio de aprobación |
|---|---|---|
| 1 | Validaciones por motivo | Venta con peso y valor; muerte con causa; pérdida con observación opcional; campos de otro motivo descartados; fecha |
| 2 | Último peso y pesaje reciente | Último pesaje vigente o peso inicial; aviso con más de `dias_sin_pesaje` días o sin pesajes, solo en la venta |
| 3 | Registro | Transacción con su cola; una segunda salida rechazada dentro de la transacción |
| 4 | Retirado | Salida vigente retira al animal del listado, de la ronda y de la chapeta pendiente; anulada, vuelve |
| 5 | Ficha | Texto de la salida por motivo; acciones de registro ocultas en el retirado |
| 6 | Corrección | Campos corregibles; el motivo no |
| 7 | Permisos | Solo el propietario registra; el trabajador recibe `PermisoDenegado` |

### PI-01, verificación 16

La salida admite una observación opcional, y rechaza una de más de 300 caracteres.

### PE-35 (manual)

Como **propietario**: vender un animal de prueba con el aviso de pesaje no reciente, comprador y confirmación;
ver la ficha del retirado sin acciones de registro y el listado; registrar una muerte (causa obligatoria) y una
pérdida con observación; corregir el valor de la venta y anular la salida de otro animal, que vuelve al
inventario. Como **trabajador**: comprobar que no ve **Registrar salida** y que el animal vendido le llega como
retirado.

## Referencias

- Documento de trabajo de grado: RF-15, RF-20, RF-27, RF-28; CU-13 (Tabla A13); HU-11 (Tabla B11); Tabla 24
  (fila `salida`); Tabla 27; RD-05.
