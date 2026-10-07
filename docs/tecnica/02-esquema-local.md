# 02 · Esquema local: la base de datos del dispositivo

| | |
|---|---|
| **Componente** | Esquema de la base de datos local · [`src/datos/db.ts`](../../src/datos/db.ts) |
| **Capa** | Acceso a datos y almacenamiento (Figura 10) |
| **Origen en el documento** | RD-01 · apartados 3.6.1, 3.8.4 (Tabla 25), 3.8.5 y 3.8.7 · Tabla 18 (fila «Almacenamiento local») · Tabla 19 (Dexie 4.4.5, Indexed Database API) |
| **Lo usan** | El repositorio local (paso 1.4), único componente autorizado a leer y escribir en ella; el motor de sincronización (paso 1.10) |
| **Pruebas** | PU-04 |

---

## 1. El problema

La restricción RD-01 invierte el orden habitual de una aplicación web:

> El almacenamiento primario debe residir en el dispositivo. El servicio remoto no puede estar en
> la ruta crítica del registro ni de la consulta.

En una aplicación web tradicional el servidor guarda la información y el teléfono la pide cada
vez que la necesita. En la Ganadería JR eso significaría no poder consultar la ficha de un animal
en el potrero, que es justamente el problema que motiva el trabajo. Por eso **el teléfono tiene su
propia base de datos completa**, y el servicio remoto es apenas el lugar al que esa información
llega después para reunirse con la de los otros usuarios y quedar respaldada.

Esa base de datos debe permitir, sin conexión:

- **Guardar** cualquier registro de forma segura, aunque la aplicación se cierre de golpe (RNF-04).
- **Consultar rápido** por los criterios que usan las pantallas: un animal por su chapeta, el
  historial de un animal, la producción de una vaca en un periodo (RNF-09).
- **Conservar** el historial completo del predio durante años (apartado 3.8.7).

## 2. La tecnología: IndexedDB y Dexie

El navegador ofrece varios mecanismos de almacenamiento. La Tabla 18 justifica la elección:

| Mecanismo | Consultas por índice | Transacciones | Volumen | Decisión |
|---|---|---|---|---|
| `localStorage` (clave-valor) | ❌ | ❌ | ~5 MB, solo texto | Descartado |
| Base de datos embebida (p. ej. SQLite compilado a WebAssembly) | ✅ | ✅ | Alto | Descartada: añade complejidad y peso a un prototipo individual |
| **IndexedDB** | ✅ | ✅ | Hasta el 60 % del disco en Chromium | **Adoptada** |

**IndexedDB** es la base de datos que trae todo navegador moderno, especificada por el W3C. Guarda
objetos de JavaScript completos, permite buscarlos por índices y agrupa escrituras en
transacciones que se completan enteras o no se completan.

Su interfaz nativa es de bajo nivel y verbosa, así que se usa a través de **Dexie**, una biblioteca
que la envuelve con una interfaz sencilla. Una comparación de la misma consulta, «los eventos
sanitarios del animal 027»:

```ts
// IndexedDB nativa: abrir transacción, obtener almacén, obtener índice, abrir cursor,
// recorrer resultados con eventos onsuccess / onerror… (alrededor de 15 líneas)

// Con Dexie:
const eventos = await db.evento_sanitario.where('animal_id').equals(idDel027).toArray();
```

Dexie no reemplaza a IndexedDB: los datos siguen guardados en IndexedDB y la especificación del
W3C sigue siendo la que garantiza su comportamiento.

## 3. Conceptos que usa el esquema

| Concepto | Qué es | Ejemplo en el predio |
|---|---|---|
| **Tabla** (*object store*) | Conjunto de objetos del mismo tipo | `pesaje` guarda todos los pesajes |
| **Clave primaria** | Campo que identifica cada objeto de forma única | `id`, el UUID v7 del [documento 01](01-identificador-uuidv7.md) |
| **Índice** | Estructura ordenada que permite encontrar objetos por un campo sin recorrer toda la tabla | El índice `animal_id` de `pesaje` encuentra los pesajes de un animal directamente |
| **Índice compuesto** | Índice sobre dos campos a la vez, escrito `[campo1+campo2]` | `[animal_id+fecha]` responde «¿ya hay ordeño de esta vaca hoy?» |
| **Autoincremental** | Clave numérica que la base de datos asigna en orden, escrita `++campo` | `++seq` en la cola conserva el orden de las operaciones |

**Solo se declaran los campos que tienen índice.** Dexie guarda el objeto completo con todos sus
campos, pero en el esquema solo figuran la clave primaria y los campos por los que se busca. Un
pesaje guarda también `peso` y `metodo`, aunque no aparezcan en la declaración, porque nunca se
busca un pesaje por su peso.

## 4. Las tablas del dispositivo

El esquema tiene **18 tablas** en cuatro grupos.

### 4.1 Entidades del predio que se sincronizan (12)

Las doce entidades de la Tabla 23 que el dispositivo crea. Cada una se replica en el servicio
remoto con el mismo nombre y los mismos campos, más los atributos locales `estado_sync`,
`recibido_en` y `detalle_conflicto`, que existen solo en el teléfono (apartado 3.8.2).

`animal` · `fotografia` · `evento_sanitario` · `produccion_leche` · `pesaje` · `parto` ·
`destino_productivo` · `movimiento_economico` · `salida` · `recordatorio` · `correccion` ·
`medicamento`

### 4.2 Datos de referencia que solo se descargan (2)

| Tabla | Contenido | Por qué está en el teléfono (Tabla 25) |
|---|---|---|
| `usuario` | Identificador, nombre y perfil de los tres usuarios del predio | Para aplicar sin conexión la regla de corrección, que depende del perfil del autor del registro (3.9.5), y para mostrar el nombre del autor en la ficha |
| `parametro` | Umbrales y valores de operación (Tabla 30) | Para calcular promedios, recordatorios y el consolidado en el potrero |

El dispositivo no crea ni modifica estas tablas: las recibe del servicio remoto.

### 4.3 Artefactos propios del dispositivo (4)

No representan información del predio sino el estado de **este** teléfono. Por eso **nunca se
transmiten** al servicio remoto (Tabla 25).

| Tabla | Contenido | Documento de origen |
|---|---|---|
| `cola_operaciones` | Operaciones pendientes de transmitir, en orden | 3.7.2 |
| `cola_imagenes` | Fotografías pendientes de transmitir, en una cola aparte | 3.8.5 |
| `imagen` | Las imágenes guardadas en el teléfono: la reducida de cada animal activo y la completa mientras no se haya transmitido | 3.8.4, 3.8.5 |
| `meta` | Valores sueltos del dispositivo: la marca de avance de la descarga, la configuración del código de desbloqueo y similares | 3.7.7, 3.9.1 |

### 4.4 Por qué las imágenes van en una tabla aparte

La entidad `fotografia` guarda los **datos** de una foto (a qué animal pertenece, qué vista es,
dónde quedó en el servicio de archivos), mientras que la tabla `imagen` guarda el **contenido
binario**. Separarlas trae tres ventajas:

1. Al listar animales o sincronizar fotografías no se cargan en memoria cientos de kilobytes de
   imagen que no se van a mostrar.
2. La imagen completa puede borrarse del teléfono una vez transmitida, y la reducida cuando el
   animal sale del predio (Tabla 25), sin tocar el registro de la fotografía, que sí debe
   conservarse para el historial.
3. Los datos de la fotografía viajan por la cola normal y la imagen por la suya, de modo que una
   foto pesada no bloquea la sincronización de los eventos (3.8.5).

## 5. Índices: cada uno responde a una consulta de la aplicación

Un índice no es gratis: ocupa espacio y hace un poco más lenta cada escritura. Por eso cada índice
del esquema existe porque **una consulta concreta de la aplicación lo necesita**. La tabla
siguiente es la justificación completa.

| Tabla | Índice | Consulta que responde | Origen |
|---|---|---|---|
| `animal` | `codigo_chapeta` | Localizar un animal por su chapeta; advertir que un código ya está asignado antes de guardar | RF-06, CU-02 flujo 4 |
| | `estado` | Listar solo los animales activos | CU-03, RF-15 |
| | `madre_id` | Descendencia de una vaca | CU-11 |
| | `padre_id` | Descendencia de un reproductor del predio; advertencia por cruce entre emparentados | HU-12 |
| `fotografia` | `animal_id` | Las fotografías de un animal | CU-03 |
| | `[animal_id+tipo]` | La fotografía vigente de una vista concreta (izquierda, derecha o frontal) | Tabla 24 |
| `evento_sanitario` | `animal_id` | Historial sanitario de un animal | CU-05 |
| | `[animal_id+medicamento_id]` | Aplicaciones previas de un medicamento a un animal: la **advertencia por dosis repetida** | RF-09 |
| | `medicamento_id` | Última dosis registrada de un medicamento, para proponerla como valor inicial | 3.10.4.4 |
| | `fecha` | Eventos de un periodo | CU-15 |
| `produccion_leche` | `[animal_id+fecha]` | ¿Esta vaca ya tiene ordeño registrado hoy? | HU-04, 3.8.6 |
| | `animal_id` | Serie de producción de una vaca y su promedio | CU-07, RF-11 |
| | `fecha` | Ronda de ordeño del día y comparación entre vacas en un periodo | CU-06, RF-12 |
| `pesaje` | `animal_id` | Evolución del peso de un animal | CU-09 |
| | `fecha` | Animales de ceba sin pesaje reciente | 3.8.11 |
| `parto` | `madre_id` | Partos de una vaca e intervalos entre ellos | CU-11, RF-17 |
| | `cria_id` | Parto del que nació un animal | CU-03 |
| | `fecha` | Ordenar los partos de una vaca | RF-17 |
| `destino_productivo` | `animal_id` | Destino vigente e historial de destinos | RF-18, RF-19 |
| | `desde` | Ordenar los cambios de destino | RF-19 |
| `movimiento_economico` | `animal_id` | Costos de un animal para el consolidado | CU-14 |
| | `concepto` | Verificar que un animal tenga un solo movimiento de compra | Tabla 24 |
| `salida` | `animal_id` | Salida de un animal | CU-13 |
| `recordatorio` | `tipo`, `animal_id` | ¿Este recordatorio está pospuesto para este animal? | 3.8.11 |
| `correccion` | `[entidad_afectada+registro_id]` | Correcciones de un registro, para calcular su valor vigente | 3.9.5 |
| | `registro_id` | Saber si un registro fue anulado | 3.9.5 |
| | `autor_id` | Correcciones hechas por un usuario | CU-18 |
| | `creado_en` | Correcciones recientes, de la más nueva a la más antigua | CU-18 |
| `medicamento` | `nombre` | Ofrecer el medicamento existente en lugar de crear un duplicado (con comparación que ignora mayúsculas) | 3.8.9 |
| Las 12 sincronizables | `estado_sync` | Registros en conflicto que requieren la intervención del propietario | Tabla 22 |
| `cola_operaciones` | `++seq` | Recorrer la cola en el orden en que se produjeron las operaciones | 3.7.2 |
| | `registro_id` | Operaciones pendientes de un registro | 3.7.2 |
| `cola_imagenes` | `++seq`, `fotografia_id` | Igual que la cola de operaciones, para las imágenes | 3.8.5 |
| `imagen` | `animal_id` | Borrar la imagen de un animal que salió del predio | Tabla 25 |

## 6. Una decisión deliberada: la unicidad no se declara en el teléfono

El modelo lógico (Tabla 24) exige dos restricciones de unicidad:

- El **código de chapeta** es único entre todos los animales.
- Solo hay **un registro de producción por vaca y fecha**.

IndexedDB permite declarar índices únicos, que rechazarían un segundo valor igual. Sin embargo,
**en el esquema local esos dos índices se declaran como índices normales, no únicos**, y la
unicidad la hace cumplir la base de datos del servicio remoto. La razón está en la tercera regla
del apartado 3.7.3:

> Si dos dispositivos registran animales distintos con el mismo código, la restricción de unicidad
> de la base de datos rechaza el segundo, aunque la aplicación no lo descarta, sino que lo marca
> como conflicto y lo presenta al propietario.

Para que la aplicación pueda «marcarlo como conflicto y presentarlo», **los dos animales con el
mismo código tienen que poder existir a la vez en el teléfono** hasta que el propietario decida.
Un índice único local lo impediría. Peor aún, provocaría una falla en cadena durante la
sincronización:

```
1. El teléfono del trabajador registró el animal «045» sin señal.
2. El propietario también registró un animal distinto con el código «045».
3. Al sincronizar, el teléfono del trabajador descarga el «045» del propietario.
4. Con un índice único local, la escritura falla y la transacción del lote se cancela.
5. La marca de avance no se guarda, porque el lote no terminó de aplicarse (3.7.7).
6. En el siguiente intento se descarga el mismo lote y vuelve a fallar en el mismo punto.
7. Ese teléfono no vuelve a recibir ningún cambio, nunca.
```

Con índices normales, el lote se aplica completo, el registro rechazado queda en estado
`conflicto` y la sincronización continúa con todo lo demás.

Que el índice local no sea único **no significa que el teléfono no verifique la unicidad**. Antes
de guardar, la aplicación consulta el índice `codigo_chapeta` y, si el código ya existe, lo advierte
y no deja continuar (Tabla 31). La diferencia es quién tiene la última palabra: el teléfono previene
el error en la interfaz y el servidor garantiza la regla para todo el predio.

| Dónde | Qué hace con la unicidad | Cuándo actúa |
|---|---|---|
| Interfaz del teléfono | Consulta el índice y advierte antes de guardar | Cuando el código ya está en **este** teléfono |
| Servicio remoto | Restricción `UNIQUE` en la base de datos | Cuando el código lo registró **otro** teléfono sin que este lo supiera |
| Sincronización | Marca el registro rechazado como `conflicto` | Cuando el servidor rechaza por la regla anterior |

## 7. Formato de los datos guardados

| Tipo de dato | Cómo se guarda | Por qué |
|---|---|---|
| Identificadores | Texto con el UUID v7 | Igual en el teléfono y en el servidor (documento 01) |
| Fechas del predio | Texto `AAAA-MM-DD` | Representan un día del calendario, no un instante (3.8.6). El texto en ese formato se ordena alfabéticamente igual que cronológicamente, así que los índices sobre fechas funcionan sin conversión |
| Instantes (`creado_en`, `recibido_en`) | Texto ISO 8601 con zona horaria | Mismo formato que devuelve PostgreSQL |
| Números (litros, peso, valor) | Número de JavaScript | — |
| Imágenes | `Blob` (contenido binario) | IndexedDB guarda binarios de forma nativa, sin convertirlos a texto, lo que ahorra cerca de un tercio de espacio |

## 8. Evolución del esquema

El esquema lleva un número de versión, hoy la `1`. Cuando en una iteración posterior haga falta
un índice o una tabla nueva, se declarará una versión `2` con los cambios, y Dexie actualizará la
base de datos de los teléfonos que ya tengan la aplicación instalada **sin perder los datos**. Las
versiones anteriores no se borran del código, porque son las que le indican a Dexie cómo llegar
desde cualquier versión vieja hasta la actual.

| Versión | Paso | Cambios |
|---|---|---|
| 1 | 1.3 | Esquema inicial: 18 tablas |

## 9. Volumen y límites

La estimación del apartado 3.8.7 sitúa el contenido completo del predio, datos e imágenes
reducidas, por debajo de **25 MB tras diez años de operación**. Los navegadores basados en
Chromium permiten a un sitio usar hasta el 60 % del disco, y Firefox hasta el 10 %: en un teléfono
de 64 GB, el caso más restrictivo ofrece unos 6 GB, más de doscientas veces lo necesario.

El riesgo no es el volumen sino que el navegador **borre** los datos cuando el dispositivo se
queda sin espacio. Eso lo atiende la solicitud de almacenamiento persistente del paso 1.5
(RNF-15).

## 10. Un solo usuario por dispositivo

La base de datos se llama `ganaderia-jr` y hay **una por teléfono**, no una por usuario. Así lo
permite el supuesto verificado con el propietario en el apartado 3.9.1: cada uno de los tres
usuarios del predio usa su propio teléfono personal. Si ese supuesto cambiara, habría que separar
las bases de datos por usuario.

## 11. Relación con los requerimientos

| Requerimiento | Cómo lo atiende el esquema |
|---|---|
| **RD-01 · RF-28** | Toda la información del predio vive en el teléfono; registrar y consultar no requieren red |
| **RNF-09** | Cada consulta de la ficha y de los historiales se resuelve con un índice local, sin intercambio con el servidor |
| **RNF-04** | IndexedDB es transaccional: una escritura se completa entera o no ocurre. Lo aprovecha la cola en el paso 1.4 |
| **RD-07** | Casi todos los índices parten de `animal_id`: la información se organiza alrededor del animal |
| **RNF-12** | Solo la imagen reducida permanece en el teléfono; la completa se borra al transmitirse |
| **3.7.3, tercera regla** | La unicidad la garantiza el servidor y los conflictos pueden coexistir en el teléfono |

## 12. Pruebas (PU-04)

Pruebas de integración entre el esquema y una base de datos IndexedDB real, simulada en memoria con
`fake-indexeddb`, que implementa la misma especificación del W3C.

| # | Qué verifica | Criterio de aprobación |
|---|---|---|
| 1 | Estructura | La base de datos abre con las 18 tablas, cada una con la clave primaria declarada |
| 2 | Índices | Cada índice de la sección 5 existe en su tabla |
| 3 | Consulta por índice simple | Los eventos sanitarios de un animal se recuperan por `animal_id` sin traer los de otros animales |
| 4 | Consulta por índice compuesto | `[animal_id+fecha]` encuentra el ordeño de una vaca en un día, y `[animal_id+medicamento_id]` las aplicaciones de un medicamento a un animal |
| 5 | Orden de las fechas | Las fechas `AAAA-MM-DD` recuperadas por índice salen en orden cronológico |
| 6 | Unicidad no local (sección 6) | Dos animales con el mismo código de chapeta pueden coexistir en el teléfono, y la consulta por código los devuelve a ambos |
| 7 | Orden de la cola | Las entradas de `cola_operaciones` reciben un `seq` creciente y se recorren en el orden en que se agregaron |
| 8 | Campos no indexados | Un objeto guardado conserva todos sus campos, aunque no estén declarados en el esquema |
| 9 | Contenido binario | Una imagen guardada como `Blob` se recupera con el mismo tamaño y tipo |

Los resultados se registrarán en [`docs/pruebas/iteracion-1.md`](../pruebas/iteracion-1.md).

## Referencias

- World Wide Web Consortium, «Indexed Database API 3.0», W3C.
- D. Fahlander, «Dexie.js — Documentación oficial», sección *Version.stores()* (sintaxis del esquema).
- Mozilla, «Storage quotas and eviction criteria», MDN Web Docs.
- Documento de trabajo de grado: apartados 3.6.1, 3.7.2, 3.7.3, 3.7.7, 3.8.2, 3.8.4 a 3.8.7, 3.9.1 y 3.9.5; Tablas 18, 19, 23, 24 y 25.
