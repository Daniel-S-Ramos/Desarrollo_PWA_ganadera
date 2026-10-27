# 22 · Ronda de ordeño

| | |
|---|---|
| **Componente** | Módulo de leche (Tabla 20) · `src/dominio/leche.ts` · `src/modulos/leche/ronda.ts` · `src/modulos/leche/PantallaRondaOrdeno.tsx` · valor vigente en `src/modulos/consulta/ficha.ts` |
| **Capa** | Dominio, lógica y presentación |
| **Origen en el documento** | RF-10 · RF-27 · RF-28 · RF-31 · CU-06 (Tabla A6) · HU-04 (Tabla B4) · apartados 3.8.6, 3.9.5 y 3.10.4.4 · Tablas 24, 27 y 30 |
| **Depende de** | [05 · Esquema remoto](05-esquema-remoto.md) (unicidad de ordeño) · [08 · Permisos](08-permisos.md), sección 4 · [09 · Subida](09-sincronizacion-subida.md), sección 5.2 · [19 · Destino productivo](19-destino-productivo.md) |
| **Pruebas** | PU-23 · PE-27 |

---

## 1. El problema

La producción «se mide pero se anota uno de cada diez días, y solo cuando el propietario advierte una
disminución» (Tabla 32). HU-04 pide el registro diario por vaca «para advertir a tiempo cuándo una
comienza a producir menos». El apartado 3.10.4.4 organiza el registro como una **ronda**: el usuario
consigna una vaca y la aplicación prepara la siguiente, y junto al valor aparecen el promedio reciente
y la diferencia, «de modo que la disminución se advierta durante el ordeño y no al cabo de un año».

## 2. Un registro por vaca y fecha (apartado 3.8.6)

| Regla | Consecuencia |
|---|---|
| Cada vaca se ordeña una vez al día | Un solo registro por vaca y fecha; el servicio lo garantiza (documento 05, verificación 6) |
| La fecha es la del calendario del predio | El ordeño de las 2 a. m. pertenece al día en que se hace |
| Un cero es un dato real | La vaca se ordeñó y no produjo; cuenta en el promedio |
| Un día sin registro no es un cero | No cuenta en el promedio |
| Un segundo registro de la misma vaca y fecha es una enmienda | No se suma ni se rechaza sin más: se guarda como **corrección** del campo litros (sección 7) |

## 3. Acceso (decisión A)

En Inicio, **Ronda de ordeño**, para ambos perfiles (Tabla 27: el trabajador tiene CU-06 con permisos de
creación). Ruta `/ordeno`.

**Durante la carga inicial** de un teléfono nuevo (documento 17) la pantalla queda en espera, como el
registro de animales: sin el historial del predio, el promedio y la detección de un registro existente
serían incompletos. El aviso dice: «Espere a que termine de llegar la información del predio para
registrar el ordeño. Así se evita registrar dos veces la misma vaca.»

## 4. Las vacas de la ronda (decisión B)

Entran las **hembras** cuyo destino vigente (documento 19, sección 2) es **Producción de leche** y que no
están retiradas, en orden de chapeta (documento 15, sección 2).

**Ninguna vaca en producción** (CU-06, 2a): «Ninguna vaca tiene el destino Producción de leche. Asígnelo
desde la ficha de cada vaca», con un enlace al listado.

## 5. La ronda (decisión C)

| Parte | Regla |
|---|---|
| Fecha | Arriba; hoy por defecto, modificable, no futura. Vale para toda la ronda |
| Lista | Todas las vacas de la ronda; las que ya tienen registro en esa fecha muestran ✓ y sus litros vigentes |
| Vaca actual | Al abrir, la primera sin registro en esa fecha. Se puede tocar cualquier vaca para ir a ella |
| Guardar | Registra y pasa sola a la siguiente sin registro |
| Fin | «Ronda completa: 15 de 15 vacas», con la lista para revisar |

Cada guardado es una transacción independiente; si la aplicación se cierra a mitad de la ronda, lo
guardado queda y lo que se estaba escribiendo no (Tabla 31). Al volver, la ronda abre en la siguiente
vaca sin registro.

## 6. Litros, promedio y diferencia (decisiones D y E)

### 6.1 Litros

De **0 a 60**, con un decimal como máximo; se acepta coma o punto. Campo grande con teclado numérico.
Debajo, la nota: «0 significa que se ordeñó y no produjo».

| Regla | Mensaje |
|---|---|
| Se escribe un valor | «Escriba los litros» |
| Es un número de 0 a 60 con un decimal como máximo | «Escriba los litros, de 0 a 60, con un decimal como máximo» |
| La fecha existe y no es futura | «Escriba una fecha válida» · «La fecha no puede ser posterior a hoy» |
| La vaca no está retirada y sigue en la ronda | «Esta vaca ya no está en producción» |

### 6.2 Promedio

El promedio de los **valores vigentes** de la vaca en los **7 días anteriores** a la fecha de la ronda,
sin incluirla, **solo sobre los días que tienen registro**. Los 7 días son el parámetro
`dias_promedio_produccion` (Tabla 30); si no estuviera en el teléfono, se usan 7.

> Promedio de los últimos 7 días: **12,0 litros** (5 registros)

Sin registros en esa ventana: «Sin registros en los últimos 7 días para comparar».

### 6.3 Diferencia en litros y en palabras

Al escribir los litros aparece la diferencia con el promedio: «2,5 litros menos que su promedio», con
una palabra según el porcentaje:

| Diferencia con el promedio | Palabras | Aspecto |
|---|---|---|
| Hasta 10 %, por encima o por debajo | «Similar a su promedio» | Neutro |
| Más de 10 % y menos de 35 % por debajo | «Por debajo de su promedio» | Neutro |
| Más de 10 % por encima | «Por encima de su promedio» | Neutro |
| **Desde 35 %** por debajo | **«Muy por debajo de su promedio»** | Aviso de atención, sin bloquear |

Con un promedio de 0 (vaca secándose), cualquier valor positivo es «Por encima de su promedio» y 0 es
«Similar». El 10 % es de **presentación**. El umbral de «Muy por debajo» es la **variación atípica** de la
Tabla 30, que corresponde al propietario: el diseño empezó con 25 % y **el propietario lo fijó en 35 % el
2026-10-24** («desde el 35 %», así que el 35 % exacto ya cuenta). Vive en el parámetro
`variacion_atipica_leche` (migración `20261024000200_parametros_del_propietario.sql`); si el parámetro aún
no está en el teléfono, se usa ese mismo 35 %. Lo usan la ronda, la producción diaria por vaca y el
recordatorio de producción bajo el promedio (documento 30, regla 3).

## 7. La vaca ya tiene registro en esa fecha (decisión F)

| Situación | Lo que se muestra | Al guardar |
|---|---|---|
| Sin registro | — | Se crea el registro de producción |
| Con registro y **puede reemplazarlo** | «Ya hay un registro de Z930 para el 14 de octubre de 2026: **12,5 litros**, registrado por Daniel Ramos. El valor nuevo lo reemplazará», con la casilla **Confirmo el reemplazo** | Con la casilla marcada, se crea una **corrección** (sección 7.1). Sin marcarla, Guardar está inhabilitado |
| Con registro y el valor nuevo es **igual** al vigente | «Ya tiene ese valor» | No se guarda nada; la ronda pasa a la siguiente |
| Con registro y **no puede reemplazarlo** (CU-06, 3b) | «No puede reemplazar este registro: la enmienda corresponde al propietario» | No se guarda; Guardar inhabilitado |

**Registro de esa fecha** es el ordeño **vigente** de la vaca ese día: un ordeño anulado no cuenta, y con él la
vaca vuelve a aparecer **Sin registro** (documento técnico 32, paso 6.0).

**Quién puede reemplazar** es la regla de corrección del apartado 3.9.5 (`puedeCorregir`, documento
08, sección 4): el propietario, cualquier registro; el trabajador, solo los creados por un trabajador en
la misma fecha del predio. Si el autor no está en el teléfono, el trabajador no puede reemplazarlo.

### 7.1 La corrección

| Campo de `correccion` | Valor |
|---|---|
| `entidad_afectada` | `produccion_leche` |
| `registro_id` | El registro existente |
| `tipo` | `correccion` |
| `campo` | `litros` |
| `valor_anterior` | El valor vigente antes del reemplazo |
| `valor_nuevo` | El valor escrito |
| `motivo` | `registro_duplicado` |
| `nota` | null |

La existencia del registro, el valor vigente y el permiso se vuelven a leer **dentro de la transacción**
que escribe, por si mientras tanto llegó un registro de otro teléfono. Si al guardar aparece un registro
que la pantalla no mostraba, no se guarda y la pantalla presenta el aviso de la tabla anterior.

Si dos teléfonos sin conexión registran la misma vaca y fecha, la subida ya convierte el segundo en una
corrección (documento 09, sección 5.2).

## 8. Valor vigente (decisión G)

Desde este paso, los litros que se muestran en la ficha («Leche más reciente», documento 16, sección
3.3), en la lista de la ronda y en el promedio son el **valor vigente**: el valor original con su
corrección de litros más reciente aplicada (la de mayor `creado_en` y, a igual instante, mayor UUID).

Es la parte del valor vigente (CU-17) que toca solo los litros, adelantada porque la ronda la necesita.
Las anulaciones y las correcciones de otros campos llegan con el paso 4.3, que generalizará esta regla.

## 9. Relación con los requerimientos

| Requerimiento | Cómo lo atiende |
|---|---|
| **RF-10 · HU-04.1** | Un registro por vaca y fecha |
| **HU-04.3 · CU-06 3a** | Advierte el registro existente con su valor y autor; el reemplazo exige confirmación y se guarda como corrección |
| **CU-06 3b · 3.9.5 · RD-05** | El trabajador no reemplaza registros del propietario |
| **HU-04.4** | Todo se escribe en el teléfono y sube con la cola |
| **CU-06 2a** | Sin vacas en producción, se indica y se sugiere revisar los destinos |
| **3.10.4.4** | Ronda con la siguiente vaca preparada, promedio y diferencia en litros y palabras |
| **3.8.6** | El cero cuenta; el día sin registro no |

HU-04.2 (consultar la producción en periodos diario, semanal y mensual) se atiende en el paso 3.6.

## 10. Pruebas

### PU-23 (automática)

| # | Qué verifica | Criterio de aprobación |
|---|---|---|
| 1 | Vacas de la ronda | Hembras con destino vigente leche, no retiradas, en orden de chapeta; un cambio de destino las saca |
| 2 | Siguiente vaca | La primera sin registro en la fecha; ronda completa cuando no queda ninguna |
| 3 | Litros | 0 a 60 con un decimal, coma o punto; el 0 se admite |
| 4 | Promedio | Solo días con registro dentro de los 7 anteriores, sin la fecha; valores vigentes; sin registros, ninguno |
| 5 | Palabras | Los umbrales de 10 % y 35 % (el exacto cuenta), el parámetro del propietario y el promedio 0 |
| 6 | Reemplazo | Crea la corrección con los dos valores y el motivo; mismo valor no escribe nada; sin confirmar no escribe |
| 7 | Permisos | El trabajador no reemplaza al propietario ni a otro trabajador de otro día; el propietario reemplaza a cualquiera |
| 8 | Valor vigente | La corrección más reciente prevalece en la ficha, la lista y el promedio |
| 9 | Transacción | Un registro que llega entre la vista y el guardado se detecta al guardar |

### PE-27 (manual)

Como **propietario**: asignar el destino Producción de leche a tres vacas de prueba de la serie
Z920–Z949; hacer la ronda de un día anterior y la de hoy (comprobar el promedio y las palabras, con un
valor muy por debajo); reemplazar un valor y verlo en la ficha. Como **trabajador**: hacer la ronda en
el otro teléfono, comprobar que no puede reemplazar un valor del propietario y que sí ve los registros
del propietario con ✓.

## Referencias

- Documento de trabajo de grado: RF-10, RF-27, RF-28, RF-31; CU-06 (Tabla A6); HU-04 (Tabla B4);
  apartados 3.8.6, 3.9.5 y 3.10.4.4; Tablas 24, 27, 30, 31 y 32.

## Ajuste de la sesión C (2026-10-26): buscador de vacas

En la sesión con el propietario (caso CP-54), encontrar la vaca 207 en la lista de la ronda le tomó varios toques.
A su pedido, la tarjeta «Vacas en producción» tiene un **buscador por número de chapeta** sobre la lista, con la
misma regla del listado de animales (los ceros a la izquierda y las minúsculas no cuentan; `filtrarPorChapeta` en
`src/modulos/consulta/listado.ts`, PU-16.8). Al tocar una vaca, el buscador se limpia y la pantalla sube al
formulario. El orden de la lista y las reglas de la ronda no cambian.
