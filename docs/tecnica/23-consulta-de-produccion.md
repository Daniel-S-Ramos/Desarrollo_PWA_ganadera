# 23 · Consulta de producción diaria, semanal y mensual

| | |
|---|---|
| **Componente** | Módulo de leche (Tabla 20) · `src/dominio/periodos.ts` · `src/modulos/leche/produccion.ts` · `src/modulos/leche/PantallaProduccion.tsx` |
| **Capa** | Dominio, lógica y presentación |
| **Origen en el documento** | RF-11 · RF-28 · CU-07, pasos 1 a 4 y flujo 3a (Tabla A7) · HU-04, criterio 2 (Tabla B4) · apartados 3.8.6 y 3.10.4.4 · Tabla 27 |
| **Depende de** | [22 · Ronda de ordeño](22-ronda-de-ordeno.md), sección 8 (valor vigente) |
| **Lo completa** | Paso 5.1: comparación entre vacas (CU-07, pasos 5 y 6; RF-12) |
| **Pruebas** | PU-24 · PE-28 |

---

## 1. El problema

En la entrevista, el propietario expresó que le gustaría consultar «la producción diaria, semanal y
mensual por vaca» (apartado 2.2.6). RF-11 lo recoge, y HU-04 lo exige como criterio 2. Hoy la caída de un
animal se advierte «al cabo de un año»; la consulta por periodos permite verla en semanas.

## 2. Quién la ve (decisión A)

**Solo el propietario.** CU-07 lo nombra como único actor y la Tabla 27 no lo asigna al trabajador. Al
trabajador no se le muestran los accesos (Tabla 31); sigue viendo la «Leche más reciente» de la ficha.

| Acceso | Destino |
|---|---|
| Inicio → **Producción de leche** | `/produccion`, con la primera vaca de la lista |
| Ficha de una hembra → **Ver producción** | `/produccion?vaca=<id>`, ya en esa vaca |

Si un trabajador llegara a la ruta, se le devuelve al inicio, como en las demás rutas restringidas.

## 3. La vaca (decisión B)

Una lista con las **hembras que tienen algún registro de leche o el destino vigente Producción de leche**,
en orden de chapeta; las retiradas se incluyen, marcadas, porque su historial sigue siendo consultable.

## 4. Agregación y periodo (decisión C)

| Agregación | Unidad | Ventana inicial | Etiqueta de cada fila |
|---|---|---|---|
| **Diaria** | Un día | Los 30 días que terminan hoy | «14 oct.» |
| **Semanal** | Lunes a domingo | Las 12 semanas que terminan en la semana actual | «6 – 12 oct.» |
| **Mensual** | Mes calendario | Los 12 meses que terminan en el mes actual | «octubre de 2026» |

**← Anterior** y **Siguiente →** mueven la ventana una ventana completa hacia atrás o hacia adelante.
**Siguiente** se inhabilita cuando la ventana ya incluye hoy. Las filas van de la más reciente a la más
antigua, para que lo último quede arriba.

La semana empieza el lunes (uso en Colombia). Los meses tienen su longitud real (28 a 31 días). Todas
las fechas son del calendario del predio.

## 5. Qué muestra cada fila (decisión D)

| Agregación | Contenido |
|---|---|
| Diaria | Litros vigentes del día; **«Sin registro»** si no hay; **«0 litros»** si se registró cero (apartado 3.8.6) |
| Semanal y mensual | **Total** de litros vigentes · **promedio por día registrado** · **días con registro** de los días del periodo |

Ejemplo: «6 – 12 oct. · 61,5 litros · 12,3 por día · 5 de 7 días registrados».

- El periodo que contiene hoy lleva **(en curso)**, y sus «días del periodo» cuentan solo hasta hoy:
  un martes, la semana en curso tiene 2 días, no 7.
- Un periodo sin ningún registro dice «Sin registros», no «0 litros».
- Todo usa el **valor vigente** (documento 22, sección 8).

Encima de la lista, un resumen de la ventana: total, promedio por día registrado y días registrados.

## 6. Presentación (decisión E)

Cada fila lleva una **barra horizontal** proporcional a su promedio diario (en la diaria, a sus litros),
relativa al mayor de la ventana. Las filas sin registros no llevan barra. Es CSS, sin librerías de
gráficos, y se lee en un teléfono de 360 px.

## 7. Sin registros en la ventana (decisión F, CU-07 3a)

> Sin registros de Z920 entre 21 ago y 19 sep.
> [Ver el periodo anterior] · [Ver por semanas] (o [Ver por meses])

La agregación más amplia: de diaria a semanal y de semanal a mensual; en mensual solo se ofrece el
periodo anterior.

El rango de la ventana («20 sep a 19 oct») se muestra siempre debajo de **← Anterior** y **Siguiente →**,
también cuando no hay registros: al retroceder sin datos no se sabía qué días se estaban viendo (PE-34).

## 8. Relación con los requerimientos

| Requerimiento | Cómo lo atiende |
|---|---|
| **RF-11 · HU-04.2** | Agregación diaria, semanal y mensual por vaca |
| **CU-07, pasos 1 a 4** | El usuario elige la vaca, la agregación y el periodo; los datos son los del teléfono |
| **CU-07, 3a** | Sin registros, se informa y se sugiere ampliar |
| **3.8.6** | El día sin registro no es un cero; los promedios usan solo días registrados |
| **Tabla 27** | Solo el propietario |

## 9. Pruebas

### PU-24 (automática)

| # | Qué verifica | Criterio de aprobación |
|---|---|---|
| 1 | Ventanas | 30 días, 12 semanas y 12 meses que terminan hoy; anterior y siguiente; siguiente no pasa de hoy |
| 2 | Semanas | De lunes a domingo, también al cruzar meses y años |
| 3 | Meses | Longitud real, incluido febrero |
| 4 | Agregados | Total, promedio por día registrado y días registrados; periodo en curso cuenta hasta hoy |
| 5 | Cero y vacío | El cero cuenta y se muestra; el día sin registro no |
| 6 | Valor vigente | Los reemplazos se aplican |
| 7 | Vacas | Hembras con registros o destino leche, en orden; machos no |
| 8 | Permisos | El trabajador no tiene CU-07 |

### PE-28 (manual)

Como **propietario**: consultar Z920 y Z921 en las tres agregaciones con los registros del 13 y 14 de
octubre (Z920 debe mostrar 11 litros el 14, el valor reemplazado); mover la ventana; ver el caso sin
registros y sus botones; entrar desde la ficha. Como **trabajador**: comprobar que no aparecen
**Producción de leche** en Inicio ni **Ver producción** en la ficha.

## Referencias

- Documento de trabajo de grado: RF-11, RF-28; CU-07 (Tabla A7); HU-04 (Tabla B4); apartados 2.2.6, 3.8.6
  y 3.10.4.4; Tablas 27 y 31.
