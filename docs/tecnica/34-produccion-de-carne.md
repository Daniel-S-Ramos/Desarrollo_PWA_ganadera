# 34 · Producción de carne: kilos ganados por los animales de ceba

| | |
|---|---|
| **Componente** | Módulo de peso y ceba (Tabla 20) · `src/modulos/peso/produccionCarne.ts` · `src/modulos/peso/PantallaProduccionCarne.tsx` · `src/modulos/inicio/PantallaInicio.tsx` · `src/ui/componentes/Ilustraciones.tsx` (`Filete`) · migración `20261024000100_peso_final_ceba.sql` |
| **Capa** | Lógica y presentación |
| **Origen en el documento** | Apartado 2.2.7 (pesajes mensuales y evolución mensual del animal) · RF-13 · RF-14 · CU-08 · CU-09 · HU-05 · apartado 3.11.4 · Tabla 27 · Tabla 30 (recordatorio de pesaje a los 30 días) |
| **Depende de** | [24 · Pesaje y evolución](24-pesaje-y-evolucion.md) (serie, ganancia diaria, meta) · [19 · Destino productivo](19-destino-productivo.md) (historial) · [23 · Consulta de producción](23-consulta-de-produccion.md) (meses) · [28 · Comparación entre vacas](28-comparacion-entre-vacas.md) (inclusión y orden) · [26 · Valor vigente](26-correccion-y-anulacion.md), secciones 6 y 10.7 |
| **Pruebas** | PU-36 · PE-40 |

---

## 1. El problema

La finca no solo produce leche: los animales de ceba producen **kilos de carne**. La aplicación ya registra
sus pesajes y muestra la evolución de cada animal en su ficha (documento 24), pero el propietario no tiene
una vista que le diga cuánto ganó el lote de ceba ni qué animales ganan más o menos, como sí la tiene para
la leche (documentos 23 y 28). El autor lo pidió el 2026-10-24.

**La frecuencia no es diaria.** La leche se anota todos los días; el peso, no. El documento lo fija así:

| Fuente | Lo que dice |
|---|---|
| Apartado 2.2.7 | El propietario quiere **pesajes mensuales** y valora conocer la **evolución mensual del animal**; hoy pesa con la cinta bovinométrica de forma esporádica |
| Tabla 30 | El recordatorio de pesaje se genera a los **30 días** sin pesaje de un animal en ceba |
| Capítulo 3, simulación | Treinta animales en ceba con **seis pesajes al año** cada uno |
| Apartado 3.11.4 | La ganancia se calcula frente al pesaje anterior y se señala la que queda por debajo de lo esperado |

Por eso la producción de carne se consulta **por mes**.

## 2. Qué se mide (decisión A)

Los **kilos ganados** por los animales con destino **ceba**, calculados con los pesajes que ya se registran.
No hay tablas, columnas ni migraciones nuevas: todo se deduce de los pesajes, el peso de compra o al nacer y
el historial de destinos.

## 3. El periodo (decisión B)

**Un mes calendario a la vez**, el mismo de la consulta de leche (documento 23). Al abrir, el **mes en
curso**. **← Mes anterior** y **Mes siguiente →** mueven un mes; **Mes siguiente** se inhabilita en el mes
en curso. El título dice el mes: «Octubre de 2026 (en curso)», «Septiembre de 2026». En el mes en curso se
cuenta hasta hoy.

## 4. El cálculo por animal (decisión C)

Cada animal aporta, como mucho, **un tramo por mes**:

| Parte | Regla |
|---|---|
| **Peso final** | El último pesaje vigente del animal con fecha dentro del mes (a igual fecha, el registrado después, como en el documento 24, sección 6) |
| **Peso de referencia** | El último punto de su serie (documento 24, sección 7) con fecha **anterior al primer pesaje del mes**: el último pesaje de un mes anterior o, si no hay, el peso de compra o al nacer. Si no hay ninguno, el primer pesaje del mes, si el mes tiene más de uno |
| **Kilos ganados** | Peso final − peso de referencia, redondeado a un decimal. Puede ser negativo: se muestra como pérdida |
| **Días** | Los días entre la fecha de referencia y la fecha final |
| **Ganancia diaria** | Kilos ganados ÷ días, redondeada a un decimal, con la misma fórmula del documento 24 |

**Un tramo pertenece al mes de su pesaje final.** Si un animal se pesó el 15 de agosto y el 15 de octubre,
octubre muestra «+48 kg en 61 días» y septiembre lo muestra «Sin pesaje este mes». Así ningún kilo se cuenta
en dos meses y la suma de los meses es la ganancia real del animal.

**Casos especiales:**

| Situación | Presentación |
|---|---|
| Sin pesaje en el mes | «Sin pesaje este mes», al final; no se inventan pesos ni se reparten ganancias |
| Un solo pesaje en el mes y ningún punto anterior | «Primer pesaje: 412 kg»; sin kilos ganados, al final con los anteriores |
| Peso de referencia y final de **métodos distintos** (cinta y báscula) | Nota «Compárese con cautela: cinta y báscula», como en la evolución (documento 24, sección 7). El peso inicial no tiene método y no activa la nota |
| Ganancia diaria **bajo la meta** (`ganancia_diaria_esperada`, si el propietario la definió) | Marca «Bajo lo esperado (meta: 0,8 kg por día)» (3.11.4) |
| Animal **retirado** (vendido, muerto, perdido) | Entra si estuvo en ceba en el mes, marcado «Retirado» |

## 5. Qué animales entran (decisión D)

La misma regla de la comparación de leche (documento 28, sección 4), con el destino ceba: entra un animal si
**estuvo en ceba en algún momento del mes**, según su historial de destino vigente (el destino vigente al
empezar el mes es ceba, o un cambio dentro del mes lo pasa a ceba). Un novillo que pasó de ceba a venta el
20 de octubre sigue en octubre; uno que entró a ceba el 10 aparece con sus pesajes.

Los pesajes de animales que **nunca estuvieron en ceba** en el mes no cuentan, aunque existan: la producción
de carne es la del lote de ceba.

## 6. La pantalla «Producción de carne» (decisión E)

Ruta `/produccion-carne`, con el letrero de título y el **filete de carne** (sección 7 bis), como las demás
pantallas. Debajo del título, dos botones eligen la vista: **Por mes** (esta sección, la que abre) y **Ciclo
completo** (sección 6 bis).

**Arriba, el lote del mes:**

| Dato | Ejemplo | Regla |
|---|---|---|
| Kilos ganados | **+184 kg** | Suma de los kilos ganados de los animales con tramo en el mes (las pérdidas restan) |
| Ganancia diaria promedio | 0,9 kg por día | Promedio de las ganancias diarias de los animales con tramo, para que un animal con un tramo largo no pese más que otro (como el promedio del hato del documento 28) |
| Pesados | 12 de 30 pesados | Animales con tramo o con primer pesaje en el mes, de los que entran (sección 5) |

**Debajo, cada animal**, en una tarjeta con su chapeta amarilla:

| Parte | Ejemplo |
|---|---|
| Chapeta | Z950 |
| Kilos ganados | **+24 kg** en 31 días |
| Ganancia diaria | 0,8 kg por día |
| Pesos | De 386 kg (15 de septiembre) a 410 kg (16 de octubre) |
| Barra | Proporcional a la ganancia diaria, relativa a la mayor del mes (CSS, como en el documento 28) |
| Marcas | «Bajo lo esperado» · «Compárese con cautela» · «Retirado» |

**Orden:** por **ganancia diaria**, no por kilos: los tramos tienen largos distintos y la ganancia diaria es
la que se puede comparar. De **mayor a menor** al abrir; el botón **De menor a mayor** invierte la lista para
ver primero los de menor ganancia. Empates: más días primero; después, la chapeta. Los animales sin pesaje en
el mes y los de primer pesaje quedan siempre al final, bajo «Sin pesaje este mes».

**Mensajes:**

| Situación | Mensaje |
|---|---|
| Ningún animal en ceba en el mes | «No hubo animales en ceba en este mes», con **Ver el mes anterior** |
| Animales en ceba pero ninguno con tramo | «Ningún animal de ceba se pesó en este mes», con **Ver el mes anterior** y la lista de sin pesaje |

**Al tocar un animal** se abre su ficha con la evolución del peso desplegada (`/animales/<id>?peso=1`,
documento 24): esa consulta ya existe y no se duplica.

## 6 bis. El ciclo completo de cada animal (decisión I, pedida por el autor)

El autor pidió, el 2026-10-24, ver además **el ciclo completo de cada animal de ceba**: desde que llegó al
predio hasta hoy, cuánto ha ganado en total y **cuánto le falta para los 500 kg**.

**El peso de finalización.** El apartado 2.2.7 recoge que los animales de ceba «suelen venderse cuando
superan los 600 kilogramos». Al revisar esta función, el autor aclaró con el propietario que **500 kg es el
peso mínimo con el que el propietario da por terminado un animal de ceba**; los 600 kg son el peso al que
suelen venderse. Se registra como hallazgo para el capítulo 4. Como los demás umbrales de la Tabla 30, cuya
definición final corresponde al propietario (3.10.4.6), se guarda como **parámetro nuevo**:

| Clave | Valor | Unidad | Descripción |
|---|---|---|---|
| `peso_final_ceba` | 500 | kg | Peso mínimo con el que el propietario da por terminado un animal de ceba |

Se carga con una migración (`supabase/migrations/20261024000100_peso_final_ceba.sql`), como el plazo de la
chapeta (documento 25); el autor la aplica con `db push`. Si el parámetro todavía no está en el teléfono, la
vista se muestra sin la parte de «cuánto falta» (documento 18, sección 8: no hay valores por defecto en el
código).

**Qué animales entran:** los **activos con destino vigente ceba hoy**: el lote que el propietario tiene en el
potrero. Los retirados y los que ya cambiaron de destino no entran en esta vista (sí en la vista por mes, para
el mes en que estuvieron).

**Por animal:**

| Parte | Ejemplo | Regla |
|---|---|---|
| Chapeta | Z950 | — |
| Peso inicial | 320 kg, peso de compra del 3 de marzo | El primer punto de su serie (documento 24, sección 7): el peso de compra o al nacer o, si no hay, el primer pesaje |
| Último peso | 438 kg, 16 de octubre | El último pesaje vigente |
| Kilos ganados en total | **+118 kg** en 227 días | Último − inicial, redondeado a un decimal |
| Ganancia diaria del ciclo | 0,5 kg por día | Kilos ganados ÷ días, con la fórmula del documento 24 |
| **Cuánto falta** | **Faltan 62 kg para los 500 kg** | `peso_final_ceba` − último peso |
| Barra de avance | 88 % | Del peso inicial al peso de finalización; llena y verde al llegar |
| Estimación | A este ritmo, unos 4 meses | Falta ÷ ganancia diaria del ciclo, en días o meses aproximados. Solo si la ganancia es positiva y hay al menos dos puntos; se presenta siempre como aproximada |

**Casos especiales:**

| Situación | Presentación |
|---|---|
| Último peso **igual o mayor** a 500 kg | Marca verde **«Terminado: alcanzó los 500 kg»**, sin estimación |
| Un solo punto (sin pesajes después del peso inicial, o solo un pesaje) | «Un solo peso registrado: 320 kg»; con lo que falta, sin kilos ganados ni estimación |
| Sin ningún peso | «Sin pesos registrados», al final |
| Ganancia del ciclo cero o negativa | Sin estimación; la ganancia se muestra como pérdida |
| Último pesaje de hace más de `dias_sin_pesaje` (30 días) | Nota «Último pesaje hace 45 días», porque lo que falta puede estar desactualizado (Tabla 30) |

**Arriba, el lote:** animales en ceba hoy, cuántos **terminados** y los kilos ganados en total por el lote.
Ejemplo: «30 animales en ceba · 4 terminados · +2.140 kg ganados».

**Orden:** primero los **terminados**; después, **de menor a mayor lo que falta**, para ver arriba los más
cercanos a terminar (los que pronto se pueden vender); al final, los que no tienen peso. Empates por chapeta.
Al tocar un animal, su ficha con la evolución desplegada, como en la vista por mes.

## 7. El inicio: una tarjeta «Producción» dividida en dos (decisión F, ajustada por el autor)

El autor pidió **una sola tarjeta** con el título general **«Producción»**, dividida en **dos mitades**, cada
una con su propio destino. En la prueba PE-40 (2026-10-24) entregó un modelo del inicio completo, que es el
que se sigue:

| Mitad | Muestra | Al tocarla |
|---|---|---|
| **Leche** | Las cantinas en un círculo, «Leche», los litros de hoy o del último día con ordeños y «Último ordeño: 21 de octubre de 2026» (o «hoy») | `/produccion` (documento 23) |
| **Carne** | El filete en un círculo, «Carne», los kilos ganados del mes en curso o, si aún no hay pesajes, del último mes con pesajes, y «Último registro:» con la fecha del pesaje más reciente de ese mes entre los animales de ceba | `/produccion-carne` |

- La tarjeta va **al lado de Pendientes**, en la misma fila de dos tarjetas que antes ocupaba la producción de
  leche. Cada mitad es un enlace aparte, de al menos 64 px de alto (3.10.4.2), separadas por una línea.
- Los kilos se escriben sin signo cuando son ganancia («180 kg») y con «−» cuando el lote perdió peso.
- En **«¿Qué deseas hacer?»** quedan los dos accesos: **Producción de leche** («Consultar litros») y
  **Producción de carne** («Consultar kilos», con el filete). Si el último acceso queda solo en su fila
  (Medicamentos), se muestra en horizontal, con el dibujo a la izquierda, como en el modelo.
- Colores de la Tabla 29 y contraste de 7 a 1 (PU-01).

El **trabajador** no ve la tarjeta ni los accesos de producción (sección 8): sigue viendo **Ordeño de hoy**
al lado de Pendientes, como ahora.

## 7 bis. El dibujo de la carne y de la ceba (pedido del autor)

El autor pidió que la producción de carne se dibuje con un **filete de carne**, que es lo que mejor entiende
el propietario, y que **todo dibujo de la ceba o de la producción de ceba en la aplicación sea ese mismo
filete**. Se agrega `Filete` a `src/ui/componentes/Ilustraciones.tsx`, dibujado como el emoji del filete que el
autor tomó de modelo (el corte rojo, el borde de grasa claro por dentro y el hueso redondo), y se usa en:

| Lugar | Antes | Ahora |
|---|---|---|
| Mitad **Carne** de la tarjeta del inicio y acceso **Producción de carne** | — | Filete |
| Letrero de la pantalla **Producción de carne** | — | Filete |
| Ficha **Ceba** del filtro de categorías del listado | Matas de pasto (`Pasto`) | Filete |

`Pasto` deja de usarse para la ceba. La **báscula** sigue siendo el dibujo del **pesaje** (registrar pesaje y
el tema Peso de la ficha), porque ahí representa la acción de pesar y no la ceba.

## 8. Quién la ve (decisión G)

**Solo el propietario**, como la producción de leche (CU-07, Tabla 27): de ella se derivan decisiones sobre
la venta y el destino de los animales. Se usa el mismo permiso CU-07. Si un trabajador llega a la ruta, se le
devuelve al inicio. El trabajador sigue registrando pesajes y viendo la evolución del peso en la ficha
(CU-08, CU-09).

## 9. Datos (decisión H)

Pesajes con su **valor vigente** y sin los anulados (documento 26, sección 6); destinos vigentes; animales
vigentes con su peso de compra o al nacer; salidas vigentes; la meta de `ganancia_diaria_esperada`. Todo se lee
del teléfono, sin conexión (RF-28). La consulta lee todas las tablas en **una sola espera** al principio y
arma el resultado en memoria, para que la pantalla se entere de los cambios (documento 26, sección 10.7).

## 10. Fuera del alcance

- Repartir la ganancia de un tramo largo entre los meses que abarca: se descartó porque el propietario vería
  kilos en meses en los que no pesó al animal.

## 11. Relación con los requerimientos

| Requerimiento | Cómo lo atiende |
|---|---|
| **2.2.7** | Pesajes y evolución por mes, para el lote de ceba; ciclo completo hasta el peso de finalización (500 kg, aclarado por el propietario) |
| **RF-13 · RF-14 · CU-09 · HU-05** | Ganancia calculada con los pesajes registrados y su serie |
| **3.11.4** | Ganancia frente al pesaje anterior; marca bajo la meta |
| **Tabla 30** | El periodo mensual coincide con el recordatorio de 30 días |
| **RF-28 · Tabla 27** | Sin conexión; solo el propietario |

## 12. Pruebas

### PU-36 (automática)

| # | Qué verifica | Criterio de aprobación |
|---|---|---|
| 1 | Periodo | Mes calendario; en curso hasta hoy; navegación; no pasa del mes en curso |
| 2 | Animales incluidos | En ceba al empezar, pasado a ceba dentro del mes, sacado de ceba dentro del mes; fuera los que nunca estuvieron en ceba aunque tengan pesajes; retirados marcados |
| 3 | Tramo del mes | Peso final = último pesaje del mes; referencia = último punto anterior al primer pesaje del mes, el peso inicial si no hay pesajes previos, o el primer pesaje del mes; kilos y ganancia redondeados; pérdida negativa |
| 4 | Un tramo por mes | Un tramo de agosto a octubre cuenta solo en octubre; septiembre lo muestra sin pesaje |
| 5 | Casos especiales | Sin pesaje; primer pesaje; métodos distintos (el peso inicial no activa la nota); bajo la meta y sin meta definida |
| 6 | Lote | Suma de kilos con pérdidas; promedio de ganancias diarias; «pesados de»; mensajes sin animales y sin pesajes |
| 7 | Orden | Por ganancia diaria, desempates, orden inverso; sin pesaje siempre al final |
| 8 | Valor vigente | Pesos corregidos y pesajes anulados |
| 9 | Resumen del inicio | Mes en curso o último mes con pesajes; sin pesajes nunca; último registro = pesaje más reciente del mes entre los animales de ceba |
| 10 | Permisos | Solo el propietario (`puedeUsar`, CU-07) |
| 11 | Ciclo: animales | Solo activos con destino vigente ceba hoy; fuera retirados y los que cambiaron de destino |
| 12 | Ciclo: cálculo | Peso inicial (compra, nacimiento o primer pesaje), último peso, kilos y ganancia del ciclo, lo que falta, avance |
| 13 | Ciclo: casos | Terminado (igual o mayor al peso final); un solo punto; sin pesos; ganancia cero o negativa sin estimación; pesaje viejo; sin parámetro, sin «falta» |
| 14 | Ciclo: estimación y orden | Días o meses aproximados; terminados primero, luego por lo que falta, sin peso al final; resumen del lote |

Con pruebas de mutación sobre `produccionCarne.ts`, como en los pasos anteriores.

### PE-40 (manual)

Como **propietario**: ver en el inicio la tarjeta **Producción** con sus dos mitades; tocar **Leche** y llegar
a la producción de leche; volver, tocar **Carne** y llegar a la producción de carne. Con animales de ceba de
prueba (Z9xx) pesados en distintos meses: ver el lote del mes, el orden, las marcas (bajo lo esperado,
métodos distintos, retirado), invertir el orden, ir al mes anterior y comprobar que el tramo largo aparece
en un solo mes; tocar un animal y llegar a su evolución. Cambiar a **Ciclo completo**: ver el lote, un animal
terminado arriba, los demás por lo que les falta para los 500 kg con su estimación. Comprobar el filete en el
inicio, en el letrero y en la ficha **Ceba** del listado. Como **trabajador**: comprobar que no ve la tarjeta
ni puede abrir la ruta.

## Referencias

- Documento de trabajo de grado: apartado 2.2.7; RF-13, RF-14, RF-28; CU-08, CU-09; HU-05; apartado 3.11.4;
  Tabla 27; Tabla 30; simulación del capítulo 3.
