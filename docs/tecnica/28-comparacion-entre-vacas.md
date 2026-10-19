# 28 · Comparación de la producción de leche entre vacas

| | |
|---|---|
| **Componente** | Módulo de leche (Tabla 20) · `src/modulos/leche/comparacion.ts` · `src/modulos/leche/PantallaComparacion.tsx` |
| **Capa** | Lógica y presentación |
| **Origen en el documento** | RF-12 · RF-28 · CU-07, pasos 5 y 6 y flujo 5a (Tabla A7) · HU-10 (Tabla B10) · apartado 3.8.6 · Tabla 27 |
| **Depende de** | [23 · Consulta de producción](23-consulta-de-produccion.md) (periodos y promedios) · [19 · Destino productivo](19-destino-productivo.md) (historial) · [26 · Valor vigente](26-correccion-y-anulacion.md), secciones 6 y 10.7 |
| **Pruebas** | PU-30 · PE-34 |

---

## 1. El problema

La consulta de producción (documento 23) muestra una vaca a la vez. CU-07 pide además, en sus pasos 5 y 6,
contrastarla «con las demás vacas en producción durante el mismo periodo» y presentarlas «ordenadas según su
producción»; RF-12 y HU-10 lo recogen. La comparación sustenta, según la historia, decisiones sobre el destino
productivo y el descarte de animales de bajo rendimiento.

## 2. Quién la ve y cómo se llega (decisión A)

**Solo el propietario** (CU-07, actor principal; Tabla 27).

| Acceso | Destino |
|---|---|
| **Producción de leche** → **Comparar con las demás vacas** | `/produccion/comparar` |

Si un trabajador llega a la ruta, se le devuelve al inicio, como en las demás rutas restringidas.

## 3. El periodo (decisión B, HU-10.1; ajustada en PE-34)

| Periodo | Unidad | Al abrir |
|---|---|---|
| **Día** | Un día del calendario del predio | **Hoy** |
| **Semana** | Lunes a domingo (documento 23, sección 4) | — |
| **Mes** | Mes calendario | — |

Se elige con tres botones, **Día**, **Semana** y **Mes**. **← Anterior** y **Siguiente →** mueven un
periodo; **Siguiente** se inhabilita en el periodo que contiene hoy. El periodo en curso lleva **(en curso)**
y sus días cuentan solo hasta hoy, como en el documento 23. El título dice el periodo: «19 de octubre de 2026
(hoy)», «13 – 19 oct.», «Octubre de 2026 (en curso)».

**Ajuste del autor en PE-34 (2026-10-19).** El diseño aprobado proponía semana o mes, abriendo en el mes en
curso, y descartaba el día porque la ronda de ordeño ya muestra un día y un solo dato depende del azar de la
jornada. Al probarlo, el autor indicó que **el propietario compara la producción a diario**, por lo que la
comparación abre en el día de hoy y el día se agrega como periodo. Si hoy todavía no hay ordeños, el aviso
de la sección 7 ofrece **Ver el día anterior**. En el día, cada vaca muestra sus litros (el promedio de un día
es ese día) y no se marca «Pocos registros».

## 4. Qué vacas entran (decisión C, HU-10.2)

Una hembra entra si cumple al menos una de dos condiciones:

1. **Estuvo en Producción de leche en algún momento del periodo**, según su historial de destino vigente
   (documento 19): el destino vigente al empezar el periodo es leche, o un cambio dentro del periodo la pasa a
   leche.
2. **Tiene ordeños vigentes en el periodo**, aunque su destino no lo diga (por ejemplo, un destino registrado
   tarde).

Así, una vaca que dejó la producción de leche a mitad de mes (por ejemplo, pasó a reproductora) sigue en la comparación de ese mes, y una que entró a producción el
día 20 aparece con sus días. Las **retiradas** (con salida) se incluyen, marcadas, porque produjeron en el
periodo.

## 5. Con qué se ordena (decisión D, HU-10.3, apartado 3.8.6)

Por el **promedio por día registrado**: el total de litros vigentes del periodo dividido entre los días con
registro. No por el total: un día sin anotar no es un cero (3.8.6), y ordenar por total castigaría a la vaca
a la que se le olvidó anotar dos días. Un cero registrado sí cuenta como un día con cero litros.

Cada fila presenta:

| Parte | Ejemplo |
|---|---|
| Chapeta | Z920 |
| Promedio por día registrado | **12,3 litros por día** |
| Total y días | 61,5 litros · 5 de 7 días registrados |
| Barra | Proporcional al promedio, relativa al mayor del periodo (CSS, como en el documento 23) |
| Marcas | «Pocos registros» (sección 7) · «Retirada» |

Encima de la lista, el **promedio del hato**: el promedio de los promedios de las vacas con registros, para
que una vaca con muchos días no pese más que otra. Ejemplo: «Promedio del hato: 10,8 litros por día · 5
vacas con registros».

Empates: a igual promedio, la de más días registrados primero; después, por chapeta.

## 6. Orden (decisión E, HU-10.3)

De **mayor a menor** al abrir. El botón **De menor a mayor** invierte la lista de vacas con registros, para
ver primero las de bajo rendimiento; el botón cambia entonces a **De mayor a menor**. Las vacas sin registros
quedan siempre al final.

## 7. Registros insuficientes (decisión F, HU-10.4, CU-07 5a)

| Situación | Presentación |
|---|---|
| Una vaca con registro en **menos de la mitad** de los días del periodo (contados hasta hoy si está en curso) | Se ordena con las demás, marcada: «Pocos registros: 2 de 7 días» |
| Vacas que entran (sección 4) pero **sin ningún registro** | Al final, bajo «Sin registros en el periodo» |
| **Ninguna o una sola** vaca con registros | «La comparación no es posible: solo Z920 tiene registros en este periodo» (o «ninguna vaca tiene…»), con **Ver el periodo anterior** |
| Ninguna vaca entra | «No hubo vacas en producción en este periodo», con **Ver el periodo anterior** |

## 8. Al tocar una vaca (decisión G, CU-07 paso 4)

Abre su producción **diaria** (`/produccion?vaca=<id>`), cualquiera que sea el periodo comparado: es la vista que el propietario consulta con más frecuencia (ajuste del autor en PE-34; el diseño aprobado abría la agregación del periodo).

## 9. Datos (decisión H)

Ordeños con su **valor vigente** y sin los anulados (documento 26, sección 6); destinos vigentes. Todo se lee
del teléfono, sin conexión. La consulta lee todas las tablas en una sola espera al principio y arma el
resultado en memoria, para que la pantalla se entere de los cambios (documento 26, sección 10.7).

## 10. Relación con los requerimientos

| Requerimiento | Cómo lo atiende |
|---|---|
| **RF-12 · HU-10 · CU-07 pasos 5 y 6** | Las vacas en producción del mismo periodo, ordenadas por su promedio |
| **HU-10.1** | Día, semana o mes elegidos por el usuario, con navegación; abre en el día de hoy |
| **HU-10.2** | Vacas en producción de leche durante el periodo, según su historial |
| **HU-10.3** | Orden por promedio, de mayor a menor o de menor a mayor |
| **HU-10.4 · CU-07 5a** | Pocos registros marcados; sin comparación posible con menos de dos vacas |
| **3.8.6** | El día sin registro no es un cero |
| **RF-28 · Tabla 27** | Sin conexión; solo el propietario |

## 11. Pruebas

### PU-30 (automática)

| # | Qué verifica | Criterio de aprobación |
|---|---|---|
| 1 | Periodo | Día, semana de lunes a domingo y mes calendario; en curso, días hasta hoy; navegación; por día, los litros del día sin «pocos registros» |
| 2 | Vacas incluidas | En leche al empezar, pasada a leche dentro del periodo, sacada de leche dentro del periodo, con ordeños sin destino de leche; fuera las que nunca estuvieron; retiradas marcadas |
| 3 | Promedio y orden | Promedio por día registrado; el cero cuenta; los días sin registro no; desempates; promedio del hato como promedio de promedios |
| 4 | Orden inverso | Invierte las vacas con registros; las sin registros siguen al final |
| 5 | Registros insuficientes | Menos de la mitad marcada; sin registros al final; menos de dos vacas, comparación no posible; ninguna vaca |
| 6 | Valor vigente | Litros corregidos y ordeños anulados |
| 7 | Permisos | Solo el propietario (`puedeUsar`, CU-07) |

### PE-34 (manual)

Como **propietario**: abrir la comparación desde **Producción de leche**; ver el mes en curso con las vacas de
prueba (Z920, Z921, Z926, Z927…), el promedio del hato y las marcas; cambiar a semana y moverse a la anterior;
invertir el orden; tocar una vaca y llegar a su producción; buscar un periodo con una sola vaca y ver el
mensaje 5a. Como **trabajador**: comprobar que no aparece la opción.

## Referencias

- Documento de trabajo de grado: RF-11, RF-12, RF-28; CU-07 (Tabla A7); HU-10 (Tabla B10); apartado 3.8.6;
  Tabla 27.
