# 32 · Un solo ordeño vigente por vaca y día

| | |
|---|---|
| **Componente** | Ronda de ordeño (Tabla 20) · `src/modulos/leche/ronda.ts` · `src/modulos/leche/PantallaRondaOrdeno.tsx` · `src/modulos/correcciones/PantallaCorregir.tsx` · `src/servicios/servicioRemotoSupabase.ts` (`buscarOrdeno`) |
| **Capa** | Base de datos remota, sincronización, lógica y presentación |
| **Origen en el documento** | RF-10 · CU-06 (Tabla A6) · CU-17, 1a · apartado 3.8.6 · Tabla 21 · Tabla 24 (fila `produccion_leche`) |
| **Depende de** | [22 · Ronda](22-ronda-de-ordeno.md), sección 7 (reemplazo como corrección) · [26 · Valor vigente](26-correccion-y-anulacion.md), sección 7 (el límite que se retira) · [29 · Salida](29-salida-y-venta.md), sección 8 (el mismo arreglo) |
| **Base de datos** | Migración `20261022000100_ordeno_vigente_unico.sql` · PI-01, verificación 19 |
| **Pruebas** | PU-23 (apartado nuevo) · PU-10 (apartado nuevo) · PI-01 (verificación 19) · PE-38 |

---

## 1. El problema

El servicio admite un ordeño por vaca y fecha con la restricción única `produccion_leche_una_por_vaca_y_fecha`,
que cuenta **también los anulados**: la anulación vive en la tabla `correccion` y el servicio solo admite
inserciones. Si un ordeño se anula —por ejemplo, porque se anotó en la vaca equivocada—, esa vaca se queda sin
ordeño ese día, y como lo anulado no admite correcciones (CU-17, 1a), no hay forma de arreglarlo. El documento
26, sección 7, lo dejó como limitación; el acta de la Iteración 5 lo pasó a la fase de cierre.

Es el mismo problema que tuvieron la salida (PE-35) y la compra (paso 5.4), y se resuelve igual.

## 2. La regla (decisión A)

**Una vaca admite un solo ordeño vigente (no anulado) por día.**

| Situación | Resultado |
|---|---|
| Primer ordeño de la vaca ese día | Se admite |
| Segundo ordeño con el primero vigente | Se rechaza con 23505, como hoy: el teléfono lo convierte en corrección del aceptado (documento 22, sección 7) o lo marca en conflicto |
| El mismo registro reenviado | Se ignora (`ON CONFLICT (id) DO NOTHING`, 3.7.8) |
| Segundo ordeño con el primero anulado | Se admite |

## 3. El servicio (decisión A)

La migración `20261022000100_ordeno_vigente_unico.sql`:

1. Quita la restricción `produccion_leche_una_por_vaca_y_fecha`.
2. Agrega un índice no único sobre `(animal_id, fecha)`, que usan el disparador y la búsqueda del ordeño
   aceptado.
3. Agrega el disparador `ordeno_vigente_unico`, antes de insertar: toma un candado por vaca y fecha
   (`pg_advisory_xact_lock`), para que dos ordeños que llegan a la vez se atiendan uno tras otro, y rechaza con
   23505 si la vaca ya tiene ese día un ordeño **distinto del que llega** y **sin anulación**. Es el patrón de
   las migraciones de la salida y de la compra.

## 4. La sincronización (hallazgo al diseñar)

Cuando el servicio rechaza un ordeño por duplicado, el teléfono busca el ordeño aceptado de esa vaca y fecha
(`buscarOrdeno`) y convierte el suyo en una corrección de litros de ese (documento 22, sección 7). Hoy la
búsqueda espera **una sola fila**: con un anulado y uno nuevo habría dos, la búsqueda fallaría y el ordeño
quedaría en conflicto sin necesidad.

`buscarOrdeno` pasa a devolver el ordeño **vigente**: lee los ordeños de la vaca ese día y descarta los que
tienen una anulación en `correccion`. Si no queda ninguno, devuelve nada (y el ordeño se reintenta como nuevo
en el siguiente envío, porque ya no choca).

## 5. El teléfono (decisiones B y C)

| Dónde | Hoy | Después |
|---|---|---|
| **Ronda** (`cargarRonda`) | El ordeño anulado ocupa el día: la vaca aparece como **Anulado**, sin formulario | Se toma el ordeño **vigente** del día; si solo hay anulados, la vaca aparece **Sin registro** y es la siguiente vaca pendiente |
| **Registrar** (`registrarOrdeno`) | Rechaza con «fue anulado: no admite otro registro ese día» | Busca el ordeño vigente del día dentro de la transacción; si solo hay anulados, registra uno nuevo |
| **Anular un ordeño** (Corregir o anular) | Advierte «Esta vaca no podrá tener otro ordeño el …» | Recuerda que la vaca vuelve a quedar pendiente ese día y que, si el error es la cantidad, conviene corregir los litros |
| **Producción, comparación, recordatorios, consolidado** | Ya leen solo los vigentes | Sin cambios |

El anulado sigue visible con su marca en **Correcciones recientes** y en el historial de correcciones; no se
borra nada.

## 6. Documentos que cambian (decisión D)

- Documento 26, sección 7: el límite queda resuelto por este documento.
- Documento 22, sección 7: el reemplazo como corrección se hace sobre el ordeño vigente.
- Pendiente para el documento de grado, Tabla 24, fila `produccion_leche`: la unicidad es del ordeño
  **vigente** por vaca y día, por disparador, por la misma razón que la salida y la compra.

## 7. Pruebas (decisión E)

### PU-23 · Ronda de ordeño (apartado nuevo)

| # | Qué verifica | Criterio de aprobación |
|---|---|---|
| 1 | Ronda con el ordeño del día anulado | La vaca aparece **Sin registro** y es la siguiente pendiente |
| 2 | Registrar con el anterior anulado | Se crea un ordeño nuevo; la ronda muestra sus litros |
| 3 | Un anulado y uno vigente el mismo día | La ronda muestra el vigente; registrar de nuevo pide confirmar el reemplazo sobre el vigente |
| 4 | Consulta en vivo | La ronda se entera de la anulación (PU-27.9) |

### PU-10 · Subida (apartado nuevo)

| # | Qué verifica | Criterio de aprobación |
|---|---|---|
| 1 | Duplicado frente a un aceptado vigente | Se convierte en corrección de ese, como hoy |
| 2 | Duplicado frente a un anulado y un vigente | Se convierte en corrección del **vigente** |
| 3 | El servicio simulado | Aplica la regla del ordeño vigente, igual que el disparador |

### PI-01 · Verificación 19

El segundo ordeño vigente de la misma vaca y día se rechaza (23505); el reenvío se ignora; anulado el primero,
se admite otro; y un tercero, con el segundo vigente, se rechaza.

### PE-38 (manual)

Como propietario: registrar el ordeño de una vaca de prueba, anularlo, comprobar que la ronda la vuelve a
ofrecer y registrarle otro el mismo día; ver su producción diaria con el nuevo y el anulado en **Correcciones
recientes**. Como trabajador: ver el ordeño nuevo en su ronda después de sincronizar.

## Referencias

- Documento de trabajo de grado: RF-10; CU-06 (Tabla A6); CU-17 (Tabla A17), flujo 1a; apartado 3.8.6;
  Tablas 21 y 24.
- Documentos técnicos 22, 26 (sección 7) y 29 (sección 8).
