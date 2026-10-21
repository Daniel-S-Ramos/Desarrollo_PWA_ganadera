# Pruebas de la Iteración 5 — Consultas, alertas y economía

Historias de usuario: HU-10 (comparación de la producción entre vacas), HU-11 (salida y venta), HU-14
(recordatorios derivados), HU-16 (consolidado económico por animal). Pasos 5.1 a 5.5 del
[plan](../../PLAN.md). Rama `iteracion-5`.

**Responsable:** Daniel Santiago Ramos Pintor
**Estado:** en curso

## Resumen de resultados

| Id | Prueba | Paso | Requerimiento | Estado |
|---|---|---|---|---|
| PU-30 | Comparación de la producción entre vacas | 5.1 | RF-12 · CU-07 (pasos 5 y 6, 5a) · HU-10 | ✅ |
| PU-24 | Producción por vaca: un periodo a la vez (apartados 9 y 10, agregados en PE-34) | 5.1 | RF-11 · CU-07 (pasos 1 a 4, 3a) · HU-04.2 | ✅ |
| PE-34 | Comparación entre vacas y producción por vaca en el navegador real | 5.1 | CU-07 · HU-10 · HU-04.2 · Tabla 27 | ✅ |
| PU-31 | Registro de la salida y venta del animal | 5.2 | RF-15 · CU-13 · HU-11 · Tabla 24 | ✅ |
| PI-01 | Esquema remoto: observación de la salida y una sola salida vigente (verificaciones 16 y 17) | 5.2 | CU-13 3b · Tabla 24 | ✅ |
| PE-35 | Salida y venta en el navegador real | 5.2 | CU-13 · HU-11 · Tabla 27 | ✅ |

---

## PU-30 · Comparación de la producción entre vacas

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar el periodo (día, semana de lunes a domingo, mes calendario, en curso hasta hoy, navegación más allá de una ventana), las vacas incluidas según su historial de destino y sus ordeños, el orden por promedio por día registrado con sus desempates, el promedio del hato como promedio de promedios, el orden inverso, los registros insuficientes y el flujo 5a, el valor vigente y los permisos |
| Requerimiento | RF-12 · RF-28 · CU-07 (pasos 5 y 6, flujo 5a) · HU-10.1 a 10.4 · apartado 3.8.6 · Tabla 27 |
| Tipo | Unitaria, automática |
| Código | [`src/modulos/leche/comparacion.ts`](../../src/modulos/leche/comparacion.ts) · prueba [`comparacion.test.ts`](../../src/modulos/leche/comparacion.test.ts) · especificación [documento técnico 28](../tecnica/28-comparacion-entre-vacas.md), sección 11 |
| Resultado obtenido | **15 de 15 aprobadas**, más el caso de la consulta en vivo agregado a PU-27.9 (14 de 14). Total del conjunto automático: **839 de 839** ([informe](resultados/2026-10-20_215949_890fdf2.md)) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-20 |

**Mutaciones.** Diecisiete. Quince detectadas a la primera: periodo sin pasar de una ventana, cambios de
destino dentro del periodo ignorados o contados después de su fin, solo el destino vigente actual, sin las
vacas con ordeños y sin destino de leche, todas las hembras incluidas, machos incluidos, orden por total, sin
desempate por días, sin invertir, «pocos registros» nunca, comparación posible con una sola vaca, promedio del
hato como total entre días, sin retiradas y ordeños sin valor vigente. **Dos sobrevivieron y señalaron bordes
sin probar:** un destino que empieza justo el primer día del periodo (para entrar y para salir de leche) y la
mitad exacta de los días, que no es «pocos registros»; se agregaron sus casos y quedaron 17 de 17.

## PU-24 · Producción por vaca: un periodo a la vez (apartados 9 y 10)

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar los ajustes del autor en PE-34: la vista diaria es un día con sus litros, el cero como registro, la comparación con el promedio de los días anteriores y el ordeño anterior y siguiente; la semana y el mes son uno a la vez, con su resumen, cada día hasta hoy y los ordeños fuera del periodo; y el salto al periodo que contiene una fecha |
| Requerimiento | RF-11 · CU-07 (pasos 1 a 4, flujo 3a) · HU-04.2 · apartado 3.8.6 |
| Tipo | Unitaria, automática |
| Código | `diaDeVaca`, `periodoDeVaca` y `desplazamientoHasta` en [`produccion.ts`](../../src/modulos/leche/produccion.ts) · prueba [`produccion.test.ts`](../../src/modulos/leche/produccion.test.ts), apartados 9 y 10 · especificación [documento técnico 23](../tecnica/23-consulta-de-produccion.md), «Ajustes del autor en PE-34» |
| Resultado obtenido | **8 pruebas nuevas, aprobadas** (19 de 19 en el archivo) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-20 |

**Mutaciones.** Trece. Del día, cinco: «anterior» y «siguiente» podían ser el mismo día cuando este tenía
registro (sobrevivieron; se agregó la comprobación). De la semana y el mes, ocho: «siguiente» podía caer dentro
del mismo periodo (sobrevivió; se agregó). Al cierre, 13 de 13.

## PE-34 · Comparación entre vacas y producción por vaca en el navegador real

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar como propietario la comparación entre vacas (periodo, orden, marcas, flujo 5a, acceso a la producción de cada vaca) y la producción por vaca; y como trabajador que no tiene acceso |
| Requerimiento | CU-07 (pasos 1 a 6, flujos 3a y 5a) · HU-10 · HU-04.2 · Tabla 27 |
| Tipo | Manual: propietario en Chrome del computador; trabajador en Chrome de un iPhone. Dirección de la rama `iteracion-5` (commits 17ad8aa a 890fdf2) |
| Resultado obtenido | Aprobada en la cuarta ronda. Las rondas anteriores llevaron a tres ajustes del autor sobre el diseño y a un defecto corregido (observaciones) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-20 |

| # | Ronda | Perfil | Acción | Resultado | Evidencia |
|---|---|---|---|---|---|
| 1 | 1 | Propietario | **Comparar con las demás vacas**, mes en curso | Promedio del hato y Z920 (10,5), Z921 (10), Z926 y Z927 (0), todas con «Pocos registros»; Z931 y Z970 bajo «Sin registros en el periodo» | [botón](evidencias/iteracion-5/PE-34-r1-01-boton-comparar.png) · [mes](evidencias/iteracion-5/PE-34-r1-02-mes-mayor-a-menor.png) |
| 2 | 1 | Propietario | **De menor a mayor** | Se invierte; las sin registros siguen al final | [invertido](evidencias/iteracion-5/PE-34-r1-03-mes-menor-a-mayor.png) · [al final](evidencias/iteracion-5/PE-34-r1-04-sin-registros-al-final.png) |
| 3 | 1 | Propietario | Septiembre y la semana del 5 al 11 | «No hubo vacas en producción»: los destinos de leche de prueba empiezan el 15 de octubre | [septiembre](evidencias/iteracion-5/PE-34-r1-05-septiembre-sin-vacas.png) · [semana](evidencias/iteracion-5/PE-34-r1-06-semana-sin-vacas.png) |
| 4 | 1 | Propietario | Ordeño de Z920 el 10 de octubre y semana del 5 al 11 | «La comparación no es posible: solo Z920 tiene registros en este periodo» (CU-07, 5a) | [captura](evidencias/iteracion-5/PE-34-r1-07-semana-solo-z920.png) |
| 5 | 2 | Propietario | Comparación con **Día** | Abre en «19 de octubre de 2026 (hoy)» con **Ver el día anterior**; el 13 de octubre: Z921 12, Z920 10, Z926 y Z927 0, promedio del hato 5,5 litros | [hoy](evidencias/iteracion-5/PE-34-r2-01-comparacion-hoy.png) · [día anterior](evidencias/iteracion-5/PE-34-r2-02-dia-anterior.png) · [13 de octubre](evidencias/iteracion-5/PE-34-r2-03-13-octubre.png) |
| 6 | 3 | Propietario | Producción de Z921, **Diaria** | Hoy sin registro con **Ir al ordeño anterior: 14 oct**; el 14: 8 litros, «Muy por debajo de su promedio: 4 litros menos»; **← Anterior**: el 13 con 12 litros | [hoy](evidencias/iteracion-5/PE-34-r3-01-diaria-hoy.png) · [14 de octubre](evidencias/iteracion-5/PE-34-r3-02-ir-al-14-octubre.png) · [13 de octubre](evidencias/iteracion-5/PE-34-r3-03-anterior-13-octubre.png) |
| 7 | 3 | Trabajador | Escribir la dirección `/produccion/comparar` | Vuelve a Inicio; Inicio no tiene **Producción de leche** | [sin acceso](evidencias/iteracion-5/PE-34-r1-09-trabajador-sin-produccion.png) · [vuelve a Inicio](evidencias/iteracion-5/PE-34-r3-04-trabajador-vuelve-a-inicio.jpg) |
| 8 | 4 | Propietario | Producción de Z921, **Semanal** | «19 – 25 oct (en curso)» sin registro con **Ir a la semana del ordeño anterior: 14 oct**; «12 – 18 oct»: 20 litros, 10 por día registrado, 2 de 7 días, y sus 7 días con el 13 y el 14 | [en curso](evidencias/iteracion-5/PE-34-r4-01-semana-en-curso.png) · [semana](evidencias/iteracion-5/PE-34-r4-02-semana-del-ordeno.png) · [días](evidencias/iteracion-5/PE-34-r4-03-dias-de-la-semana.png) |
| 9 | 4 | Propietario | Producción de Z921, **Mensual** | «Octubre de 2026 (en curso)»: 20 litros, 2 de 20 días, con los días hasta hoy; septiembre sin registro con **Ir al mes del siguiente: 13 oct** | [octubre](evidencias/iteracion-5/PE-34-r4-04-mes-en-curso.png) · [septiembre](evidencias/iteracion-5/PE-34-r4-05-septiembre.png) |

**Observaciones.**

1. **Ajuste del autor: la comparación abre en el día** (ronda 1, commit d2f8fa2). El diseño aprobado
   comparaba semana o mes y descartaba el día; el autor indicó que el propietario compara a diario. Se agregó
   **Día**, que abre en hoy, y al tocar una vaca se abre su producción diaria (documento 28, secciones 3 y 8).
2. **La captura de la ronda 2 mostraba la versión anterior**: la aplicación guardada en el navegador no se
   actualiza sola mientras se usa; aparece el aviso «Hay una versión nueva» con **Actualizar ahora**. No fue un
   defecto.
3. **Defecto: no se sabía qué días se estaban viendo** (ronda 2). El rango de la ventana solo aparecía en el
   resumen, oculto cuando no había registros (commit 6b76563).
4. **Ajuste del autor: un periodo a la vez** (rondas 2 y 3, commits 033f123, e30a057 y 890fdf2). Los rangos
   («20 sep a 19 oct», «25 oct a 3 ago», «octubre de 2025 a noviembre de 2024») confundían: el ordeño ocurre en
   un día concreto. La vista diaria pasó a un día, con su comparación frente al promedio, y la semanal y la
   mensual a una semana o un mes con cada uno de sus días; sin registros se ofrece ir al ordeño más cercano
   (documento 23, «Ajustes del autor en PE-34»).
5. Inicio seguía rotulado «Iteración 4»; se actualizó a la Iteración 5 (commit 890fdf2).
6. Las capturas de la ronda 1 (PE-34-r1-08) muestran la producción semanal con la ventana de 12 semanas, que
   quedó reemplazada; se conservan como evidencia del hallazgo.

## PU-31 · Registro de la salida y venta del animal

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar las validaciones por motivo (venta con peso y valor, muerte con causa, pérdida o robo con observación opcional, campos de otro motivo descartados, fecha), el último peso y el aviso de pesaje no reciente, el registro con su cola y la unicidad de la salida vigente, el retiro del animal en todas las pantallas y su regreso al anular, el texto de la ficha, los campos corregibles y los permisos |
| Requerimiento | RF-15 · RF-27 · RF-28 · CU-13 (pasos 2 a 7, flujos 2a, 3a y 3b) · HU-11 · Tabla 24 · Tabla 27 · RD-05 |
| Tipo | Unitaria, automática |
| Código | [`src/dominio/salida.ts`](../../src/dominio/salida.ts) · [`src/modulos/salida/salidas.ts`](../../src/modulos/salida/salidas.ts) · `salidasVigentes` y `contarSalidasVigentes` en [`vigentes.ts`](../../src/datos/vigentes.ts) · prueba [`salidas.test.ts`](../../src/modulos/salida/salidas.test.ts) · especificación [documento técnico 29](../tecnica/29-salida-y-venta.md), sección 11 |
| Resultado obtenido | **18 de 18 aprobadas**, más el caso de la salida agregado a PU-27.9 (15 de 15). Total del conjunto automático: **858 de 858** ([informe](resultados/2026-10-20_233749_6a53d49.md)) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-20 |

**Mutaciones.** Veintiséis. Veinticuatro detectadas a la primera: sin exigir peso, valor o causa, sin límite
de observación o de comprador, sin descartar la causa de otro motivo, fecha futura o anterior a la llegada,
sin motivo, valor cero o sin quitar los puntos de miles, pesaje reciente con «mayor o igual», sin aviso para un
animal nunca pesado, género fijo, sin comprador en el texto, segunda salida admitida, sin permiso, parámetro
ignorado, retirado con cualquier salida, salidas vigentes sin filtrar las anuladas, todas las salidas contadas,
valor corregible por todos y peso de venta sin la lectura del pesaje. **Dos sobrevivieron:** «sin descartar el
peso de otro motivo» era equivalente, porque el peso solo se lee en la venta (la condición sobrante se quitó), y
«la ficha prefiere la anulada» no se probaba porque normalmente hay una sola salida (se agregó el caso de una
anulada y una vigente). Tras el cambio de la unicidad, la mutación «una anulada cuenta como vigente» también se
detecta. Al cierre, 26 de 26.

## PI-01 · Salida: observación y una sola salida vigente (verificaciones 16 y 17)

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar las dos migraciones del paso: la columna `salida.observacion` (opcional, hasta 300 caracteres) y la unicidad de la salida vigente por disparador (la segunda se rechaza, el reenvío se ignora y, anulada la primera, se admite otra) |
| Código | Migraciones [`20261020000100_salida_observacion.sql`](../../supabase/migrations/20261020000100_salida_observacion.sql) y [`20261021000100_salida_vigente_unica.sql`](../../supabase/migrations/20261021000100_salida_vigente_unica.sql) · [`supabase/pruebas/pi-01-esquema.sql`](../../supabase/pruebas/pi-01-esquema.sql), verificaciones 16 y 17 |
| Resultado obtenido | **16 de 16** tras la primera migración y **17 de 17** tras la segunda ([evidencia 16](evidencias/iteracion-5/PI-01-9-salida-observacion.txt) · [evidencia 17](evidencias/iteracion-5/PI-01-10-salida-vigente-unica.txt)) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-20 |

## PE-35 · Salida y venta en el navegador real

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar como propietario la venta con el aviso de pesaje, las validaciones y la confirmación, la muerte y la pérdida o robo, el animal retirado en la ficha y en el listado, la corrección de la venta y la anulación con una salida nueva; y como trabajador que ve la salida sin poder registrarla ni corregirla |
| Requerimiento | CU-13 (pasos 1 a 7, flujos 2a, 3a y 3b) · HU-11.1 a 11.4 · Tabla 27 · RD-05 |
| Tipo | Manual: propietario en Chrome del computador; trabajador en Chrome de un iPhone. Dirección de la rama `iteracion-5` (commits ba442ab a 6a53d49) |
| Resultado obtenido | Aprobada en la tercera ronda. La primera reveló que un animal con la salida anulada no podía volver a salir; el autor aprobó el cambio a una sola salida vigente (observación 1) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-20 |

| # | Ronda | Perfil | Acción | Resultado | Evidencia |
|---|---|---|---|---|---|
| 1 | 1 | Propietario | Venta de Z971, nunca pesado | «⚠ Nunca se ha pesado. Conviene pesarlo antes de venderlo» con **Registrar pesaje**; tras pesarlo (430 kg) el formulario muestra ese último peso; confirmación «Vendido el 20 de octubre de 2026 · 432 kg · $4.500.000 · comprador Finca Alquitania» | [aviso](evidencias/iteracion-5/PE-35-r1-01-aviso-nunca-pesado.png) · [pesaje](evidencias/iteracion-5/PE-35-r1-02-pesaje-antes-de-vender.png) · [formulario](evidencias/iteracion-5/PE-35-r1-03-formulario-venta.png) · [confirmación](evidencias/iteracion-5/PE-35-r1-04-confirmacion.png) |
| 2 | 1 | Propietario | Anular la venta de Z971 | La salida queda tachada con su anulación, pero el animal ya no admitía otra (hallazgo, observación 1) | [captura](evidencias/iteracion-5/PE-35-r1-05-salida-anulada-sin-otra.png) |
| 3 | 2 | Propietario | Venta de Z982 | Aviso de nunca pesado; sin peso ni valor, «Escriba el peso de venta» y «Escriba el valor recibido, en pesos»; confirmación y ficha «Vendida el 20 de octubre de 2026 · 510 kg · $5.100.000 · comprador Finca la alquitania» con «RETIRADA DEL PREDIO» y sin acciones de registro; en **Retirados** | [aviso](evidencias/iteracion-5/PE-35-r2-01-z982-aviso-nunca-pesado.png) · [errores](evidencias/iteracion-5/PE-35-r2-02-z982-errores-sin-peso-ni-valor.png) · [confirmación](evidencias/iteracion-5/PE-35-r2-03-z982-confirmacion.png) · [ficha](evidencias/iteracion-5/PE-35-r2-04-z982-ficha-vendida.png) · [retirados](evidencias/iteracion-5/PE-35-r2-05-listado-retirados.png) |
| 4 | 2 | Propietario | Muerte de Z980 | La causa aparece obligatoria; «Murió el 20 de octubre de 2026 · causa: De viejo»; Z980 sale de los activos | [antes](evidencias/iteracion-5/PE-35-r2-06-listado-activos-antes.png) · [formulario](evidencias/iteracion-5/PE-35-r2-07-z980-muerte-sin-causa.png) · [confirmación](evidencias/iteracion-5/PE-35-r2-08-z980-confirmacion.png) |
| 5 | 2 | Propietario | Pérdida o robo de Z981 con observación | «Perdida o robada el 20 de octubre de 2026 · Robo» | [formulario](evidencias/iteracion-5/PE-35-r2-09-z981-perdida-con-observacion.png) · [confirmación](evidencias/iteracion-5/PE-35-r2-10-z981-confirmacion.png) |
| 6 | 2 | Propietario | Corregir el valor de la venta de Z982 | $6.900.000 con la marca **Corregido** y «Valor recibido: antes 5.100.000, ahora 6.900.000» | [captura](evidencias/iteracion-5/PE-35-r2-11-z982-valor-corregido.png) |
| 7 | 2 | Propietario | Anular la salida de Z981 y registrar otra | El aviso nuevo («El animal volverá al inventario activo…»); Z981 vuelve a los activos con la salida tachada y **Registrar salida**; la venta nueva se acepta | [aviso](evidencias/iteracion-5/PE-35-r2-12-z981-anular-aviso.png) · [anulada](evidencias/iteracion-5/PE-35-r2-13-z981-anulada-registrar-salida.png) · [activos](evidencias/iteracion-5/PE-35-r2-14-listado-activos-con-z981-sin-z980.png) · [ficha](evidencias/iteracion-5/PE-35-r2-15-z981-anulada-ficha.png) · [nueva](evidencias/iteracion-5/PE-35-r2-16-z981-nueva-salida.png) |
| 8 | 3 | Propietario | Z971, con la venta anulada en la ronda 1, registra una salida nueva | «Murió el 20 de octubre de 2026 · causa: natural»; el servicio la acepta | [formulario](evidencias/iteracion-5/PE-35-r3-01-z971-nueva-salida-muerte.png) · [confirmación](evidencias/iteracion-5/PE-35-r3-02-z971-confirmacion.png) · [ficha](evidencias/iteracion-5/PE-35-r3-03-z971-ficha-retirado.png) |
| 9 | 3 | Trabajador | Z983 activo, Z982 retirada y el listado | Z983 sin **Registrar salida**; Z982 con la venta corregida, «Fotos: 3 de 3» y **Ver fotos**, sin **Corregir o anular**; «4 animales retirados» | [Z983](evidencias/iteracion-5/PE-35-r3-04-trabajador-z983-activo.png) · [acciones](evidencias/iteracion-5/PE-35-r3-05-trabajador-z983-sin-salida.png) · [pie](evidencias/iteracion-5/PE-35-r3-06-trabajador-z983-pie.png) · [Z982](evidencias/iteracion-5/PE-35-r3-07-trabajador-z982-sin-corregir.png) · [fotos](evidencias/iteracion-5/PE-35-r3-08-trabajador-z982-ver-fotos.webp) · [retirados](evidencias/iteracion-5/PE-35-r3-09-trabajador-retirados.png) |

**Observaciones.**

1. **Hallazgo: un animal con la salida anulada no podía volver a salir** (ronda 1). La restricción única de
   `salida.animal_id` contaba también las anuladas, y lo anulado no admite correcciones. El autor aprobó el
   cambio a **una sola salida vigente** por animal: migración `20261021000100_salida_vigente_unica.sql`, PI-01
   verificación 17 y ajuste de la aplicación (documento 29, sección 8; commit 3017ff5). En la ronda 3, Z971 —el
   animal del hallazgo— registró su salida nueva.
2. **El animal retirado pedía completar fotos** (ronda 2): «⚠ Registro fotográfico incompleto» y **Ver y
   completar fotos**, aunque ya no se pueden agregar. Se corrigió, y el texto alternativo pasó de «Fotos: 3 de
   3» fijo al número real (commit 6a53d49). La captura de Z971 de la ronda 3 se tomó antes de publicar el
   arreglo; en el teléfono del trabajador ya se ve «Fotos: 3 de 3 · Ver fotos» en Z982.
3. Las salidas de prueba quedan en Z971, Z980, Z981 y Z982 (serie Z9xx), que se borrarán con los demás datos de
   prueba antes de la evaluación.
