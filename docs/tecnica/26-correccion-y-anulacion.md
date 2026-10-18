# 26 · Corrección, anulación, valor vigente y resolución de conflictos

| | |
|---|---|
| **Componente** | Módulo de correcciones (Tabla 20) · `src/dominio/vigente.ts` · `src/dominio/camposCorregibles.ts` · `src/modulos/correcciones/correcciones.ts` · `src/modulos/correcciones/PantallaCorregir.tsx` · `src/modulos/correcciones/MarcaCorreccion.tsx` · `src/datos/vigentes.ts` · `src/modulos/correcciones/conflictos.ts` · `src/modulos/correcciones/ResolverConflicto.tsx` |
| **Capa** | Dominio, datos, lógica y presentación |
| **Origen en el documento** | RF-26 · RF-27 · RF-28 · RF-31 · CU-17 (Tabla A17) · HU-17 (Tabla B17) · RD-05 · apartados 2.8.10, 3.7.3, 3.9.3 y 3.9.5 · Tablas 21, 24 y 31 |
| **Depende de** | [05 · Esquema remoto](05-esquema-remoto.md), sección 5.3 · [08 · Permisos](08-permisos.md), sección 4 · [09 · Subida](09-sincronizacion-subida.md), sección 5 · [22 · Ronda de ordeño](22-ronda-de-ordeno.md), sección 8 |
| **Entregas** | **4.3a**: secciones 2 a 9 (PU-27, PE-31) · **4.3b**: sección 10 (PU-28, PE-32) |

---

## 1. El problema

HU-17 pide «corregir o anular un registro equivocado dejando constancia de lo que cambié y por qué, para
que el dato quede correcto sin que se pierda el rastro». El apartado 3.9.5 resuelve la aparente oposición
con la regla de inmutabilidad: **corregir no es modificar**. Se agrega un registro de corrección que
sustituye al dato anterior sin borrarlo.

La tabla `correccion`, sus restricciones y la regla de permisos en el teléfono y en el servicio existen
desde la Iteración 1 (documentos 05 y 08); el valor vigente de los litros se adelantó en el paso 3.5
(documento 22). **No hace falta migración.**

## 2. Corrección y anulación (apartado 3.9.5)

| Operación | Qué se agrega en `correccion` | Efecto |
|---|---|---|
| **Corrección** | `tipo = correccion`, `campo`, `valor_anterior` (el vigente), `valor_nuevo`, `motivo`, `nota` | El campo muestra el valor nuevo; el original queda intacto |
| **Anulación** | `tipo = anulacion`, sin campo ni valores, `motivo`, `nota` | El registro queda sin efecto: visible y marcado, fuera de todos los cálculos |

**Motivos** (cinco botones): error de digitación, animal equivocado, fecha equivocada, registro duplicado,
otro. Con **otro**, la nota es obligatoria (CU-17, 5a); en los demás, opcional, hasta 300 caracteres.

**Un registro anulado no admite correcciones ni otra anulación** (CU-17, 1a): «Este registro está anulado.
Si el dato era correcto, regístrelo de nuevo».

Los valores se guardan como texto (`valor_anterior`, `valor_nuevo`): números con punto decimal, fechas
AAAA-MM-DD, identificadores tal cual, `null` como texto vacío. El campo nuevo se valida como en su registro
original antes de convertirlo.

## 3. Qué se corrige en cada registro (decisión A)

Un campo se corrige si el error es de escritura; si cambia la naturaleza del registro, se anula y se
registra de nuevo.

| Registro | Campos que se corrigen | Validación del valor nuevo | Anular |
|---|---|---|---|
| `evento_sanitario` | `fecha`, `tipo`, `medicamento_id`, `dosis`, `costo` (solo el propietario), `sintomas` | Documento 20, sección 6 (la fecha no anterior al nacimiento; el medicamento, del catálogo) | Sí |
| `produccion_leche` | `litros` | 0 a 60, un decimal (documento 22) | Sí, con el aviso de la sección 7 |
| `pesaje` | `peso`, `metodo`, `fecha` | Documento 24, sección 4 | Sí |
| `parto` | `fecha`, `observacion` | Documento 25, sección 4.1 | Sí (un resultado equivocado se anula y se registra de nuevo) |
| `destino_productivo` | — | — | Sí (un destino nuevo ya es un registro nuevo) |
| `animal` | `sexo`, `fecha_nacimiento`, `fecha_nacimiento_exacta`, `fecha_ingreso`, `procedencia`, `peso_inicial`, `madre_id`, `madre_externa`, `padre_id`, `padre_externo` | Documento 13, sección 3 y 4 (madre hembra, padre macho; del predio o externo, no ambos) | **No** |
| `medicamento` | `tipo`, `unidad`, `intervalo_advertencia_dias` | Documento 18, sección 5 | **No** |

**La chapeta no se corrige**: es la identidad del animal y «no cambia durante la vida del animal» (Tabla
24). Un número repetido entre dos teléfonos se resuelve como conflicto (sección 10).

Las fotografías no se corrigen ni se anulan desde aquí: una foto equivocada se reemplaza tomando otra
(documento 14). La colocación de la chapeta no es corregible.

## 4. Permisos (decisión C, RD-05)

La regla es `puedeCorregir` (documento 08, sección 4), la misma que aplica el servicio
(`trabajador_puede_corregir`):

| Quien corrige | Registro creado por | Resultado en pantalla |
|---|---|---|
| Propietario | Cualquiera | **Corregir o anular** |
| Trabajador | Un trabajador, el mismo día del predio | **Corregir o anular** |
| Trabajador | Un trabajador, otro día | La opción aparece y, al tocarla: «La ventana de corrección venció: solo el propietario puede enmendarlo» (CU-17, 2b) |
| Trabajador | El propietario | La opción **no aparece** (CU-17, 2a) |

Además, el campo `costo` solo lo corrige el propietario (documento 20, sección 5.2). La regla se repite al
guardar, dentro de la transacción, y el servicio la vuelve a aplicar.

## 5. La pantalla (decisión B)

**Corregir o anular** aparece en cada fila del historial sanitario, del historial del destino, de la
evolución del peso, del control reproductivo y de la ronda (sobre la vaca registrada); en los datos del
animal de su ficha, y en cada medicamento del catálogo. Abre `/correccion/:entidad/:id`:

1. El registro, con su resumen y su autor.
2. **Corregir un campo** o **Anular el registro** (para animal y medicamento, solo corregir).
3. Si corrige: el campo (lista de la sección 3), su **valor vigente** a la vista y el valor nuevo, con el
   control que corresponde (número, fecha, botones, lista de animales o de medicamentos).
4. El motivo y la nota.
5. **Guardar corrección** o **Anular registro**, con una confirmación que resume el cambio: «La dosis pasará
   de 5 ml a 2,5 ml» o «El pesaje del 11 de octubre de 2026 (1.010 kg) quedará anulado».

Si el valor nuevo es igual al vigente: «Es el mismo valor», sin guardar.

## 6. Valor vigente (decisiones D, E y F)

### 6.1 La regla

| Caso | Valor vigente |
|---|---|
| Sin correcciones | El original |
| Con correcciones de un campo | El `valor_nuevo` de la última, en el orden de la sección 6.2 |
| Con alguna anulación | **Ninguno**: el registro está anulado, cualquiera que sea el orden (Tabla 21) |

### 6.2 El orden

Las correcciones se ordenan por `recibido_en`, la marca que pone el servicio al recibirlas (apartado 3.7.3).
Las que aún no se han enviado no la tienen: van **después** de las recibidas, por `creado_en` y, a igual
instante, por identificador. Así, una corrección hecha en este teléfono prevalece mientras no llegue otra
que el servicio haya recibido después.

### 6.3 Dónde se aplica

Un solo punto de lectura, `src/datos/vigentes.ts`, devuelve los registros de una tabla con sus valores
vigentes, la marca de corregido y la de anulado. Lo usan:

| Pantalla o cálculo | Efecto |
|---|---|
| Ficha y listado | Datos del animal vigentes; último peso, última vacuna, leche y destino sin anulados |
| Historial sanitario | Valores vigentes; los anulados visibles y marcados |
| Advertencia por repetición y dosis precargada | Sin anulados; fecha y medicamento vigentes |
| Ronda, promedio y consulta de producción | Litros vigentes; sin anulados (sustituye a `litrosVigentes` del documento 22) |
| Evolución y variación del peso | Valores vigentes; sin anulados |
| Control reproductivo y parto cercano | Fechas vigentes; sin anulados |
| Destino vigente e historial del destino | Sin anulados en el vigente; visibles y marcados en el historial |
| Catálogo de medicamentos | Tipo, unidad e intervalo vigentes (el intervalo vigente rige la advertencia) |

### 6.4 Cómo se ve

- **Corregido**: el valor vigente con la marca **Corregido**. Al tocarla: «Antes: 5 ml · error de digitación ·
  José Ramos, 18 de octubre de 2026».
- **Anulado**: la fila en gris con **Anulado: registro duplicado, por José Ramos** (y la nota si la hay). En el
  historial sigue visible porque «ocultarlos impediría explicar por qué se registró otro evento en su lugar»
  (3.9.5).

## 7. El límite del ordeño anulado (decisión G)

El servicio admite un ordeño por vaca y fecha **contando los anulados** (la restricción está en la tabla, no
en el valor vigente). Por eso:

- Al anular un ordeño, la confirmación advierte: «Esta vaca no podrá tener otro ordeño el 14 de octubre de
  2026. Si el error es la cantidad, corrija los litros en lugar de anular».
- En la ronda, esa vaca aparece como **Anulado** ese día, sin formulario.

Queda documentado como limitación; se anota para el capítulo de resultados.

## 8. Concurrencia (Tabla 21)

| Situación | Resultado |
|---|---|
| Dos correcciones del mismo campo, en dos teléfonos sin conexión | Se conservan ambas; vigente, la recibida de última (6.2) |
| Una corrección y una anulación | Prevalece la anulación; la corrección queda en el historial |
| Un trabajador corrige un registro del propietario desde un teléfono desactualizado | El servicio la rechaza (42501): conflicto «El servicio rechazó el registro por los permisos del perfil» |

## 9. Pruebas de la entrega 4.3a

### PU-27 (automática)

| # | Qué verifica | Criterio de aprobación |
|---|---|---|
| 1 | Valor vigente | Original; última corrección por `recibido_en`, pendientes al final; anulación prevalece |
| 2 | Campos y validaciones | Los de la sección 3 por tabla; valores nuevos validados como en su registro; mismo valor rechazado |
| 3 | Motivo y nota | Obligatorio el motivo; con «otro», la nota |
| 4 | Permisos | Propietario, trabajador del mismo día, de otro día y sobre el propietario; costo solo el propietario |
| 5 | Anulado | No admite correcciones; queda visible y marcado |
| 6 | Cálculos | Promedio de leche, repetición, ganancia de peso, partos y destino sin anulados y con valores vigentes |
| 7 | Ficha y listado | Datos vigentes del animal; último peso y vacuna sin anulados |
| 8 | Transacción | Una anulación que llega antes de guardar una corrección la rechaza |

### PE-31 (manual)

Como **propietario**: corregir la dosis de un evento y ver la marca; anular un pesaje y ver la evolución sin
él; corregir el tipo de «Prueba Florfenicol LA» a antibiótico; corregir el peso al nacer de una cría; anular
un ordeño y ver la ronda. Como **trabajador**: corregir un pesaje propio del día; comprobar que no ve la
opción en un registro del propietario y el aviso de ventana vencida en uno suyo de otro día.

## 10. Resolución de conflictos (decisión H · entrega 4.3b)

Un registro en conflicto por unicidad **nunca llegó al servicio**: el servicio lo rechazó. Por eso puede
arreglarse en el teléfono sin romper la regla de inmutabilidad, igual que el ordeño duplicado (documento 09,
sección 5.2): lo que no se borra nunca es un registro que el servicio ya aceptó. Solo el **propietario**
resuelve (Tabla 21: «se presenta al propietario para que lo resuelva»).

### 10.1 Chapeta repetida (regla del propietario, 2026-10-13)

En la ficha del animal en conflicto aparece, para el propietario, **Resolver el conflicto**, con el animal que
ya tiene el número (foto, sexo, edad y autor) y dos opciones:

| Opción | Qué hace |
|---|---|
| **Son animales distintos: cambiar el número** | Se escribe otro número, validado como en el registro (formato y que no exista). El animal se vuelve a enviar con ese número: su estado pasa a pendiente y su operación vuelve a la cola. Sus fotos y eventos, que esperaban por dependencia, salen con él |
| **Es el mismo animal: unir con Z930** | Las fotografías, imágenes, eventos sanitarios, ordeños, pesajes, partos, destinos y colocación de chapeta del duplicado que **no llegaron al servicio** pasan al animal correcto (su `animal_id`, `madre_id` o `cria_id` se reescribe y su operación queda pendiente). El duplicado y su operación se retiran. Antes de confirmar, la pantalla lista lo que se va a pasar |

Si algún registro del duplicado ya hubiera llegado al servicio (no debería: depende del animal rechazado),
no se toca, y la unión se detiene con la causa.

### 10.2 Medicamento repetido

En el catálogo, el medicamento en conflicto muestra, para el propietario, **Usar el que ya existe (Prueba
Ivermectina)**: los eventos sanitarios que lo usan y no llegaron al servicio pasan al medicamento registrado,
y el duplicado se retira.

### 10.3 Colocación de chapeta repetida

Si dos teléfonos confirmaron la chapeta del mismo animal, la segunda queda en conflicto: **Descartar**,
porque el dato ya está registrado (la fecha que prevalece es la recibida primero).

### 10.4 Pruebas de la entrega 4.3b

| Prueba | Qué verifica |
|---|---|
| **PU-28** | Cambiar el número: valida, reenvía y libera las dependencias. Unir: reescribe los dependientes no enviados, retira el duplicado y no toca nada enviado. Medicamento y colocación. Solo el propietario |
| **PE-32** | Provocar un conflicto de chapeta con dos teléfonos sin conexión y resolverlo de las dos formas; repetir un medicamento y usar el existente |

## 11. Relación con los requerimientos

| Requerimiento | Cómo lo atiende |
|---|---|
| **RF-31 · HU-17.1 · CU-17** | Corrección y anulación como registros nuevos, con anterior, nuevo, motivo, autor y fecha |
| **HU-17.2 y 3 · RD-05 · CU-17 2a, 2b** | Permisos del trabajador y del propietario, en pantalla y al guardar |
| **HU-17.4** | Anulados visibles y marcados, fuera de los cálculos |
| **CU-17 1a, 3a, 5a** | Anulado sin correcciones; anular sin campo; nota obligatoria con «otro» |
| **Tabla 21** | Orden por recepción; la anulación prevalece; conflictos de chapeta resueltos por el propietario |
| **Regla del propietario (2026-10-13)** | Distintos: otro número; el mismo: unir los eventos con el correcto |

HU-17.5 (consultar las correcciones) es el paso 4.4 (CU-18).

## Referencias

- Documento de trabajo de grado: RF-26, RF-27, RF-28, RF-31, RF-32; CU-17 (Tabla A17), CU-18 (Tabla A18);
  HU-17 (Tabla B17); RD-05; apartados 2.8.10, 3.7.3, 3.9.3 y 3.9.5; Tablas 21, 24 y 31.
