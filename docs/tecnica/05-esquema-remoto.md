# 05 · Esquema remoto: la base de datos del servicio

| | |
|---|---|
| **Componente** | Esquema de la base de datos PostgreSQL de Supabase · [`supabase/migrations/`](../../supabase/migrations/) |
| **Capa** | Servicio remoto (Figuras 10 y 12) |
| **Origen en el documento** | Apartados 3.6.1, 3.7.3, 3.7.8, 3.8.3 (Tabla 24), 3.8.4 (Tabla 25), 3.9.3 y 3.9.4 · RD-04, RD-05 · RNF-05, RNF-06, RNF-08 · Tabla 19 (Supabase, PostgreSQL) |
| **Depende de** | [02 · Esquema local](02-esquema-local.md): los nombres de tablas y campos son los mismos |
| **Lo usan** | El motor de sincronización (paso 1.10); las reglas de seguridad a nivel de fila (paso 1.9) se construyen sobre él |
| **Pruebas** | PI-01 |

---

## 1. Qué papel cumple

El apartado 3.6.1 delimita con precisión lo que hace el servicio remoto:

> El servicio remoto no ejecuta lógica del dominio. Su función se limita a conservar la información
> fuera del dispositivo, reunir lo que registran el propietario y sus trabajadores desde equipos
> distintos y aplicar las reglas de seguridad.

Este documento especifica las tablas, las restricciones de integridad y los permisos de esa base
de datos. Tres responsabilidades concretas:

1. **Conservar** una copia de toda la información fuera de los teléfonos, para que perder un
   teléfono no signifique perder el historial (RNF-05).
2. **Reunir** lo que registran los tres usuarios desde dispositivos distintos.
3. **Garantizar** las reglas que el teléfono no puede garantizar por sí solo, porque nada de lo que
   ocurre en el dispositivo del usuario puede considerarse confiable (3.9.3): la unicidad de la
   chapeta, la inmutabilidad de los registros y la autoría.

Las reglas de **quién puede hacer qué** (Tabla 27) se especifican aparte, en el documento del
paso 1.9, porque dependen de la autenticación del paso 1.7.

## 2. Principio rector: la base de datos solo acepta inserciones

Del diseño se desprende una regla que simplifica todo lo demás y que este documento lleva hasta
sus últimas consecuencias:

> **En las tablas del predio, el servicio remoto solo permite insertar y consultar.
> Ningún usuario puede modificar ni eliminar una fila.**

Viene de tres decisiones del capítulo 3:

| Decisión | Apartado |
|---|---|
| Los registros de eventos no se modifican ni se eliminan | 3.7.3, primera regla · RNF-06 |
| Una corrección o una anulación es un registro nuevo que se agrega | 3.9.5 |
| El reenvío es una inserción que ignora el identificador ya presente, para no conceder permiso de modificación sobre las tablas de eventos | 3.7.8 |

El apartado 3.7.8 explica por qué importa que el permiso de modificar **no exista**:

> En el momento en que ese permiso existe nada a nivel de base de datos impide que llegue una
> petición con un identificador ya existente y contenido distinto, y que sobrescriba un registro
> ajeno.

### 2.1 Dos ajustes para que la regla sea completa

El documento preveía dos casos en los que un registro sí cambiaba. Ambos se resuelven sin
modificar filas, siguiendo el mismo criterio que la decisión del 2026-10-06 sobre el estado del
animal ([documento 02](02-esquema-local.md), sección 6.1): **lo que puede calcularse no se guarda**.

| Caso previsto | Cómo cambiaría | Cómo se resuelve sin modificar |
|---|---|---|
| **La ruta de la fotografía** en el servicio de archivos, que se conocería solo después de subir la imagen | Crear la fila sin ruta y actualizarla al terminar la subida | La ruta se **deduce** del registro: `{animal_id}/{id}.webp`. Se conoce desde el momento de la creación, en el propio teléfono. El campo `ruta_remota` sale del modelo |
| **La ficha del animal**, que el apartado 3.7.3 trata como información «que sí cambia de estado» | Reescribir la fila del animal con la versión más reciente | Con el estado deducido de la salida y el destino guardado como historial (`destino_productivo`), la ficha ya no tiene campos que cambien. Un dato mal escrito se enmienda con una corrección (3.9.5), que se agrega como registro |

La consecuencia es que la segunda regla del apartado 3.7.3 («prevalece la versión más reciente»)
**ya no tiene sobre qué aplicarse a nivel de filas**. Se conserva, en cambio, para las correcciones:
cuando dos correcciones del mismo campo compiten, prevalece la que el servicio recibió en último
lugar (Tabla 21). Eso se calcula al leer, no al escribir.

## 3. Las tablas

Catorce tablas, con los mismos nombres del esquema local. Las doce del predio llevan los
atributos comunes de la sección 4; `usuario` y `parametro` son datos de referencia.

| Tabla | Clave primaria | Claves foráneas | Contenido |
|---|---|---|---|
| `usuario` | `id` | `id` → usuario de autenticación de Supabase | Nombre y perfil de cada uno de los tres usuarios |
| `parametro` | `clave` | — | Valores de la Tabla 30 |
| `medicamento` | `id` | `autor_id` | Catálogo de medicamentos del predio |
| `animal` | `id` | `madre_id`, `padre_id` → `animal`; `autor_id` | Ficha de identificación |
| `fotografia` | `id` | `animal_id`; `autor_id` | Datos de cada fotografía (no la imagen) |
| `destino_productivo` | `id` | `animal_id`; `autor_id` | Historial de destinos |
| `evento_sanitario` | `id` | `animal_id`, `medicamento_id`; `autor_id` | Tratamientos y vacunas |
| `produccion_leche` | `id` | `animal_id`; `autor_id` | Litros por vaca y fecha |
| `pesaje` | `id` | `animal_id`; `autor_id` | Pesos con su método |
| `parto` | `id` | `madre_id`, `cria_id` → `animal`; `autor_id` | Partos y su resultado |
| `movimiento_economico` | `id` | `animal_id`; `autor_id` | Costos por animal |
| `salida` | `id` | `animal_id`; `autor_id` | Retiro del animal del predio |
| `recordatorio` | `id` | `animal_id` (opcional); `autor_id` | Decisiones de posponer |
| `correccion` | `id` | `autor_id` | Correcciones y anulaciones |

Las tablas del dispositivo que no representan información del predio (las colas, las imágenes, la
marca de avance) **no existen** en el servicio remoto (Tabla 25).

## 4. Atributos comunes de las tablas del predio

| Columna | Tipo | Quién la fija | Regla | Origen |
|---|---|---|---|---|
| `id` | `uuid` | El dispositivo | Clave primaria. Rechaza una segunda fila con el mismo identificador | 3.7.1, documento 01 |
| `autor_id` | `uuid` | El dispositivo | Debe existir en `usuario`. En el paso 1.9 se exigirá además que coincida con el usuario autenticado que envía la fila | RD-04, RNF-08 |
| `creado_en` | `timestamptz` | El dispositivo | Instante de la creación según el reloj del teléfono. Se conserva tal como llega | RD-04 |
| `recibido_en` | `timestamptz` | **El servicio** | La asigna la base de datos al recibir la fila, **ignorando cualquier valor que envíe el dispositivo** | 3.7.3, 3.7.7 |

`recibido_en` es la marca que el diseño usa en dos lugares: para ordenar correcciones que compiten
(3.7.3) y como **marca de avance** de la descarga incremental (3.7.7). Debe salir del reloj del
servicio y no del teléfono, porque los relojes de dos teléfonos pueden estar desajustados. Un
disparador (*trigger*) la fija en cada inserción, de modo que un dispositivo no puede adelantarla ni
atrasarla aunque lo intente.

Como ninguna fila puede modificarse (sección 2), **`autor_id` y `creado_en` son inalterables por
construcción**: no hace falta una regla especial que proteja esas dos columnas, porque no existe
ninguna operación capaz de cambiarlas. Es la forma más fuerte de cumplir RNF-08.

## 5. Restricciones de integridad

Cada restricción de la Tabla 24 se declara en la base de datos para que se cumpla sin depender de
la aplicación (3.8.3). Las restricciones de valores admitidos usan los mismos valores del paso 1.1
(PU-02).

### 5.1 Restricciones de la Tabla 24 que se declaran tal cual

| Tabla | Restricción | Cómo se declara |
|---|---|---|
| `usuario` | Perfil propietario o trabajador | `CHECK` |
| `animal` | Código de chapeta único entre todos los animales, activos y retirados, y obligatorio | `UNIQUE`, `NOT NULL` |
| | Sexo con valores definidos | `CHECK` |
| | El padre se consigna como animal del predio o como texto externo, nunca de las dos formas | `CHECK` |
| `evento_sanitario` | Fecha, tipo y medicamento obligatorios; medicamento del catálogo; dosis y costo no negativos | `NOT NULL`, clave foránea, `CHECK` |
| `produccion_leche` | Litros no negativos, admite cero | `CHECK (litros >= 0)` |
| | **Un solo registro por vaca y fecha** | `UNIQUE (animal_id, fecha)` |
| `pesaje` | Peso mayor que cero; método cinta o báscula | `CHECK` |
| `parto` | Resultado con tres valores; la cría existe si y solo si nació viva; madre y cría distintas | `CHECK` |
| `destino_productivo` | Seis destinos | `CHECK` |
| `movimiento_economico` | Tres conceptos; valor mayor que cero | `CHECK` |
| | **Un solo movimiento de compra por animal** | Índice único parcial sobre `animal_id` donde `concepto = 'compra'` |
| `salida` | **Una sola salida por animal** | `UNIQUE (animal_id)` |
| | Tres motivos; peso y valor obligatorios en una venta; causa obligatoria en una muerte | `CHECK` |
| `recordatorio` | Cinco tipos; fecha de posposición posterior a la creación | `CHECK` |
| `correccion` | Corrección o anulación; una anulación no lleva campo ni valores; cinco motivos; nota obligatoria si el motivo es «otro» | `CHECK` |
| `medicamento` | Nombre único y obligatorio, **sin distinguir mayúsculas** («Ivermectina» e «ivermectina» son el mismo); tipo y unidad con valores definidos; intervalo no negativo | Índice único sobre `lower(nombre)`, `CHECK` |
| `parametro` | Clave única | Clave primaria |

### 5.2 Restricciones de la Tabla 24 que cambian con este diseño

| Restricción original | Qué pasa | Motivo |
|---|---|---|
| `animal`: «el estado admite valores definidos» | **Se retira**: no hay columna de estado | Decisión del 2026-10-06, documento 02, sección 6.1 |
| `destino_productivo`: «solo una fila por animal se encuentra vigente» | **No se declara como restricción**: el destino vigente es la fila más reciente, y las anteriores forman el historial (RF-19) | Con solo inserciones, no hay forma de «desactivar» la fila anterior; la vigencia se calcula al leer |
| `fotografia`: «no se admite más de una fotografía vigente por tipo y animal» | **Igual que el anterior**: la fotografía vigente de cada vista es la más reciente | Actualizar una fotografía (RF-02) es agregar una nueva |
| `correccion`: «no se admite una corrección ni una anulación sobre un registro ya anulado» | **Se verifica en el dispositivo, no en el servicio** | Ver sección 5.3 |

### 5.3 Un conflicto entre dos tablas del documento

La Tabla 24 prohíbe corregir un registro ya anulado. La Tabla 21, en cambio, describe qué ocurre
cuando un trabajador corrige un registro y otro lo anula, los dos sin conexión:

> Prevalece la anulación, cualquiera que sea el orden de llegada […]. La corrección se conserva en
> el historial y queda señalada como aplicada sobre un registro que después se anuló.

«Cualquiera que sea el orden de llegada» incluye el caso en que **la anulación llega primero**. Si
el servicio aplicara la restricción de la Tabla 24, rechazaría la corrección que llega después, y
esa corrección **no podría conservarse en el historial** como exige la Tabla 21. Las dos reglas son
incompatibles en el servicio.

La solución es aplicar cada una donde tiene sentido:

| Regla | Dónde se aplica | Efecto |
|---|---|---|
| No se corrige un registro anulado (Tabla 24) | **En el dispositivo**, antes de guardar: la opción no se ofrece y la operación se rechaza (CU-17, flujo 1a) | El usuario no puede corregir lo que su teléfono ya sabe anulado |
| Prevalece la anulación y la corrección se conserva (Tabla 21) | **En el servicio**: acepta ambas filas, y el valor vigente se calcula al leer, con la anulación por encima de cualquier corrección | Lo que se registró sin conexión nunca se pierde |

Se registra en los pendientes para el documento de trabajo de grado.

## 6. Permisos de los roles de la base de datos

Supabase expone la base de datos a través de dos roles: `anon`, para peticiones sin sesión, y
`authenticated`, para usuarios que iniciaron sesión. Al crear el proyecto quedó activada la opción
de exponer automáticamente las tablas nuevas, que concede **todos** los privilegios a ambos roles.
Por eso el esquema **retira primero todos los privilegios** y concede después solo los necesarios:

| Tablas | `anon` | `authenticated` |
|---|---|---|
| Las doce tablas del predio | Ninguno | `SELECT`, `INSERT` |
| `usuario`, `parametro` | Ninguno | `SELECT` |

Ningún rol de la aplicación recibe `UPDATE`, `DELETE` ni `TRUNCATE` sobre ninguna tabla. La
seguridad a nivel de fila (RLS) queda **activada** en las catorce tablas. Mientras el paso 1.9 no
defina sus políticas, una tabla con RLS activada y sin políticas no permite ninguna operación: el
estado inicial es «nadie accede», y el paso 1.9 abre exactamente lo que la Tabla 27 permite.

Los permisos actúan en dos niveles que se complementan:

| Nivel | Pregunta que responde | Paso |
|---|---|---|
| Privilegios del rol (`GRANT`) | ¿Esta **operación** existe para los usuarios de la aplicación? | 1.6 (este documento) |
| Políticas a nivel de fila (RLS) | ¿Este **usuario** puede hacer esta operación sobre esta **fila**? | 1.9 |

Que `UPDATE` y `DELETE` no estén concedidos significa que **ninguna política futura podría
habilitarlos por error**: la operación no existe para el rol.

## 7. Datos iniciales

| Tabla | Contenido inicial |
|---|---|
| `parametro` | Los valores de ejemplo de la Tabla 30: días sin pesaje (30), sin ordeño (3), sin registros (90), sin transmitir (3), periodo del promedio de producción (7), precio por litro (1.950 pesos) |
| `usuario` | Los tres usuarios se crean en el paso 1.7, junto con sus cuentas de autenticación |
| `medicamento` | Vacío. Se llena desde la aplicación (Tabla 31) o con los datos simulados del paso 6.1 |

## 8. Cómo se aplica el esquema: migraciones

El esquema se escribe como **archivos SQL numerados** en `supabase/migrations/`, que se aplican en
orden. Tres ventajas:

1. El esquema queda **versionado en Git** junto con el código: se sabe qué cambió, cuándo y por qué.
2. Es **reproducible**: un proyecto de Supabase nuevo queda idéntico aplicando los mismos archivos.
3. Cada cambio posterior es un archivo nuevo, igual que las versiones del esquema local.

| Archivo | Contenido |
|---|---|
| `20261006000100_esquema_inicial.sql` | Tablas, restricciones, disparador de `recibido_en`, permisos de los roles y RLS activada |
| `20261006000200_parametros_iniciales.sql` | Valores de la Tabla 30 |
| `20261006000300_revocar_rls_auto_enable.sql` | Retira el privilegio de ejecución de `public.rls_auto_enable()`, función creada por la opción «Habilitar RLS automático» del proyecto que el revisor de seguridad de Supabase encontró expuesta (agregada tras PI-01) |

Se aplican con la **CLI de Supabase** (`supabase db push`), que registra en el propio servicio qué
migraciones ya se aplicaron, de modo que nunca se aplica dos veces la misma.

## 9. Relación con los requerimientos

| Requerimiento | Cómo lo atiende el esquema |
|---|---|
| **RNF-05** | Copia de toda la información fuera del dispositivo |
| **RNF-06** | Sin privilegio `UPDATE` ni `DELETE`: ninguna fila puede modificarse ni eliminarse |
| **RNF-08 · RD-04** | `autor_id` y `creado_en` llegan del dispositivo y ninguna operación puede alterarlos |
| **RD-05 · 3.9.3** | Las reglas críticas viven en la base de datos, no solo en la interfaz |
| **3.7.3, tercera regla** | La unicidad de la chapeta la garantiza `UNIQUE` en el servicio |
| **3.7.7** | `recibido_en`, fijada por el servicio, sirve de marca de avance |
| **3.7.8** | Clave primaria en `id`: la inserción repetida se reconoce y no duplica |

## 10. Pruebas (PI-01)

Prueba de integración ejecutada **contra la base de datos real** de Supabase, mediante un script
SQL que corre dentro de una transacción que se revierte al final, de modo que no deja datos.

| # | Qué verifica | Criterio de aprobación |
|---|---|---|
| 1 | Estructura | Existen las 14 tablas con RLS activada |
| 2 | Privilegios | `authenticated` tiene solo `SELECT` e `INSERT` en las doce del predio y solo `SELECT` en `usuario` y `parametro`; `anon` no tiene ninguno; nadie tiene `UPDATE` ni `DELETE` |
| 3 | `recibido_en` | Una fila insertada con un `recibido_en` falso queda con la hora del servicio |
| 4 | Clave primaria | Una segunda inserción con el mismo `id` se rechaza; con `ON CONFLICT DO NOTHING` se ignora sin error (3.7.8) |
| 5 | Chapeta única | Un segundo animal con el mismo código se rechaza |
| 6 | Un ordeño por vaca y fecha | Un segundo registro de la misma vaca en la misma fecha se rechaza |
| 7 | Restricciones de valores | Se rechazan: litros negativos, peso cero, sexo inválido, padre doble, parto con cría viva sin cría, venta sin valor, anulación con valores, motivo «otro» sin nota |
| 8 | Medicamento sin distinguir mayúsculas | «ivermectina» se rechaza si ya existe «Ivermectina» |
| 9 | Una compra por animal | Un segundo movimiento de compra del mismo animal se rechaza; un segundo de alimentación se admite |
| 10 | Parámetros | Están cargados los seis valores de la Tabla 30 |
| 11 | Funciones expuestas (agregada tras el revisor de seguridad) | Ninguna función `SECURITY DEFINER` del esquema `public` es ejecutable por `anon` ni `authenticated` |

Las políticas de quién puede insertar o consultar cada fila se prueban en el paso 1.9.

Como complemento, después de cada migración se ejecuta el revisor de seguridad de Supabase
(`npx supabase db advisors --linked`), que en la primera aplicación encontró la exposición que
corrige la tercera migración.

## Referencias

- PostgreSQL Global Development Group, «PostgreSQL Documentation», capítulos *Constraints*, *Privileges* y *Row Security Policies*.
- Supabase, «Database Migrations» y «Row Level Security», Supabase Documentation.
- Documento de trabajo de grado: apartados 3.6.1, 3.7.3, 3.7.7, 3.7.8, 3.8.3, 3.8.4, 3.9.3 a 3.9.5; Tablas 21, 24, 25 y 30.
