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
