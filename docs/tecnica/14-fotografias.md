# 14 · Fotografías: captura, compresión y cola de imágenes

| | |
|---|---|
| **Componente** | Servicio de fotografías (Tabla 20) · `src/modulos/identificacion/fotografias.ts` · `src/sync/subidaImagenes.ts` · sección de fotografías de `PantallaRegistrarAnimal.tsx` |
| **Capa** | Lógica, sincronización y presentación |
| **Origen en el documento** | RF-02 · RNF-12 · CU-02 (paso 6 y flujo 6a) · HU-01 (criterios 3 y 4) · apartados 3.8.4, 3.8.5, 3.8.7 y 3.8.10 · Tablas 19, 21, 24, 25 y 31 |
| **Depende de** | [02 · Esquema local](02-esquema-local.md) · [03 · Repositorio y cola](03-repositorio-y-cola.md) · [05 · Esquema remoto](05-esquema-remoto.md) · [09 · Subida](09-sincronizacion-subida.md) · [11 · Indicador](11-indicador-de-sincronizacion.md) · [12 · Cierre de sesión](12-cierre-de-sesion.md) · [13 · Registro de un animal](13-registro-de-animal.md) |
| **Pruebas** | PU-15 · PI-05 · PE-18 |

---

## 1. El problema

El apartado 3.8.10 explica para qué sirven de verdad las fotografías:

> Cuando un animal pierde la chapeta deja de poder identificarse por su número, y el propietario lo
> reconoce recorriendo las fichas hasta encontrar la imagen que corresponde. La fotografía es por lo
> tanto el respaldo de la identificación y no un adorno de la ficha.

Y el 3.8.5 explica por qué necesitan un tratamiento propio: **consumen más espacio que cualquier
otro contenido y tardan más en transmitirse** dentro de una ventana de conexión corta. Una foto de
un celular actual pesa entre 3 y 8 MB; los 55 animales con tres vistas serían cerca de 1 GB.

De ahí las cuatro exigencias de este componente:

1. **Comprimir en el teléfono**, antes de guardar (RNF-12).
2. **Conservar en el teléfono solo una imagen reducida por animal**; las tres vistas completas viven
   en el servicio de archivos (Tabla 25).
3. **Una cola propia**, para que una foto pesada no frene los registros de la jornada (3.8.5, Tabla 21).
4. **Nunca impedir el registro** por una foto que falta (CU-02, 6a; Tabla 31).

## 2. Las dos versiones de cada fotografía

Al capturar, cada foto se convierte en dos imágenes WebP:

| Versión | Lado mayor | Calidad | Peso aproximado | Uso |
|---|---|---|---|---|
| **Completa** | 1.600 px | 0,80 | 200 – 300 KB | Las tres vistas en el servicio de archivos, para ver el detalle cuando hay conexión |
| **Reducida** | 480 px | 0,70 | 30 – 50 KB | La imagen de la ficha y del listado, disponible sin conexión |

**Por qué WebP.** Con la misma calidad visual pesa entre un 25 % y un 35 % menos que JPEG, y
Chrome para Android lo genera de forma nativa desde un `canvas`. Si el navegador no pudiera
generarlo (el `canvas` devolvería otro formato), la captura se rechaza con un mensaje en lugar de
guardar una imagen con un formato distinto del que espera el servicio.

**Por qué 1.600 y 480 píxeles.** 1.600 px conserva las manchas y los rasgos que permiten reconocer
al animal (3.8.5) aun ampliando la imagen; 480 px es suficiente para la miniatura del listado y el
encabezado de la ficha en un teléfono. La estimación del apartado 3.8.7 suponía unos 100 KB por
animal en el teléfono: la reducida queda por debajo.

**Ninguna imagen se amplía.** Si la foto original mide menos que el lado indicado, se conserva su
tamaño. El cálculo de las dimensiones es una función pura (`escalar(ancho, alto, ladoMayor)`) que
mantiene la proporción.

**La orientación.** Los celulares guardan la foto «acostada» y anotan en sus metadatos (EXIF) cómo
girarla. La imagen se decodifica con `createImageBitmap(archivo, { imageOrientation: 'from-image' })`,
que aplica ese giro, de modo que la vaca no aparezca de lado. Al recodificar, los metadatos (incluida
la ubicación GPS que algunos celulares guardan) se descartan.

**La reducida sale de la completa**, no del original: reducir en dos pasos (por ejemplo, de 4.000 a
1.600 y de 1.600 a 480 píxeles) deja bordes más limpios que reducir de una vez.

**Si una versión supera 1 MB** (el límite del servicio, sección 7), se recodifica bajando la calidad
de 0,1 en 0,1 hasta 0,5. Si ni así cabe, la captura se rechaza con *«La fotografía es demasiado
pesada aun comprimida. Tómela de nuevo.»* En la práctica no ocurre: con una imagen de prueba de
4.000 × 3.000 píxeles y 5 MB, la completa pesó 182 KB y la reducida 21 KB, en 0,7 segundos en Chrome
(verificación del 2026-10-12).

**Cuándo se comprime.** En el momento de la captura, no al guardar. Así el botón Guardar es
instantáneo y el usuario ve la miniatura ya procesada. Mientras el formulario no se confirma, las
imágenes viven solo en la memoria de la pantalla: si la aplicación se cierra, se pierden junto con el
resto de los datos (Tabla 31, sin borradores).

## 3. La vista principal (decisión A)

El teléfono conserva **una sola imagen reducida por animal** (Tabla 25). La vista que se conserva es
la **principal**, elegida en este orden, a pedido del propietario (2026-10-12):

1. **Costado izquierdo**
2. Si falta, **costado derecho**
3. Si faltan ambos, **frente**

La vista principal se calcula sobre las fotografías **vigentes** del animal (la más reciente de cada
vista, documento 05, sección 5.2). Si después se toma el costado izquierdo de un animal que solo
tenía el frente, el izquierdo pasa a ser la principal y la reducida del frente se borra del teléfono.

## 4. Dónde vive cada cosa

### 4.1 En el teléfono

| Tabla | Contenido | Cuándo se borra |
|---|---|---|
| `fotografia` | Los datos de la foto: animal, vista, autor, fecha. Viaja por la cola de datos | Nunca (es historial) |
| `imagen` | Por cada fotografía: la versión **completa** y la **reducida** | La completa, al subirse. La reducida, al subirse **si no es la vista principal** |
| `cola_imagenes` | Las fotografías cuya imagen falta subir | Al confirmarse la subida |

El tipo `ImagenLocal` cambia: `reducida` pasa a admitir `null`, porque la reducida de una vista que no
es la principal se borra del teléfono una vez subida. Cuando una fila de `imagen` queda sin completa
y sin reducida, se borra. No hay cambio de índices, así que no hace falta una versión nueva del
esquema de Dexie.

### 4.2 En el servicio de archivos (decisión B)

Un bucket **privado** de Supabase Storage llamado `fotografias`, con dos archivos por fotografía:

```
fotografias/{animal_id}/{fotografia_id}.webp            ← completa
fotografias/{animal_id}/{fotografia_id}-reducida.webp   ← reducida
```

La ruta no se guarda en ninguna tabla: se deduce de los identificadores (documento 05, sección 2.1).

**Por qué subir también la reducida.** Un teléfono nuevo (paso 2.5) necesita la imagen de la ficha
de los 55 animales. Descargar las reducidas pesa unos 2,5 MB; descargar las completas para reducirlas
en el teléfono, unos 15 MB, sobre la red rural del predio (3.7.6). Las reducidas de las tres vistas se
suben, aunque el teléfono solo conserve la principal, porque la principal puede cambiar.

## 5. Guardar el animal con sus fotografías

`registrarAnimal` (documento 13, sección 6) recibe además las fotografías capturadas, y en **la misma
transacción** del animal:

1. Crea una fila `fotografia` por cada vista capturada (por la cola de datos, como cualquier registro).
2. Guarda en `imagen` la completa y la reducida de cada una.
3. Crea su entrada en `cola_imagenes`.

Si el animal se rechaza (chapeta repetida, progenitor inválido), no queda nada: ni fotografías ni
imágenes. Con menos de tres vistas, el animal se guarda igual y la confirmación lo dice: *«Registro
fotográfico incompleto: 2 de 3»*. La ficha (paso 2.4) lo señalará para completarlo después.

## 6. La subida de las imágenes

### 6.1 Orden

El motor de sincronización (documento 09) pasa a tener tres etapas:

```
1. Subida de datos      ← registros, incluidas las filas de fotografia
2. Bajada de datos      ← lo nuevo de los otros teléfonos
3. Subida de imágenes   ← la última, porque es la más pesada (3.8.5)
```

### 6.2 Una imagen solo sube si su fotografía ya llegó

La cola de imágenes recorre sus entradas en orden y **solo sube la imagen de una fotografía cuyo
estado es `sincronizado`**. Si la fila de la fotografía todavía no llegó al servicio, la imagen espera.
Así la política del servicio (sección 7) puede exigir que exista la fotografía, y nunca hay en el
servicio de archivos una imagen sin su registro.

Si la fotografía quedó **en conflicto** (por ejemplo, porque su animal fue rechazado por una chapeta
repetida), su imagen no puede subir y permanece en la cola, a la vista en el contador. Se resolverá con
el conflicto (pendiente de diseño 2.1).

### 6.3 Clasificación de las respuestas

Para cada fotografía se suben la completa y la reducida. Igual que en la cola de datos (documento 09,
sección 4):

| Respuesta del servicio | Significado | Acción |
|---|---|---|
| Éxito | Se guardó | Siguiente archivo |
| **409 · el archivo ya existe** | Ya se había subido y la confirmación se perdió | **Se trata como éxito** (idempotencia, 3.7.8) |
| Sin red, tiempo agotado, 5xx | Transitoria | Se detiene la subida de imágenes; se reintenta en la próxima sincronización |
| 401 / sesión vencida | Transitoria | Se detiene, igual que los datos |
| 403 u otro rechazo | Definitiva | Se registra el intento y se sigue con la siguiente; la imagen permanece en la cola |

Cuando los dos archivos de una fotografía están confirmados: se borra su entrada de `cola_imagenes`,
se borra la completa del teléfono y, si no es la vista principal, también la reducida.

## 7. Seguridad en el servicio de archivos

Una migración crea el bucket y sus políticas, con la misma filosofía del servidor de solo inserciones
(documento 05):

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotografias', 'fotografias', false, 1048576, array['image/webp']);
```

| Operación | Quién | Condición |
|---|---|---|
| **Subir** (`insert`) | Usuario autenticado con perfil | La ruta tiene la forma `{uuid}/{uuid}.webp` o `{uuid}/{uuid}-reducida.webp`, y **existe una fotografía con ese identificador y ese animal** |
| **Leer** (`select`) | Usuario autenticado con perfil | Ninguna otra (ambos perfiles leen todo lo del predio, documento 08) |
| Reemplazar (`update`) o borrar (`delete`) | **Nadie** | No hay política: el servicio lo rechaza |

Además, el bucket solo acepta **WebP** de hasta **1 MB**. Una foto sin comprimir (3 – 8 MB) o en otro
formato se rechaza aunque alguien evitara el teléfono.

## 8. Lo que ve el usuario

### 8.1 En el formulario de registro (decisión C)

Una sección **Fotografías**, entre el peso y la genealogía (el orden del CU-02), con tres casillas:
**Izquierdo · Derecho · Frente**. En cada una:

- **Tomar foto** (principal): abre la cámara trasera (`<input type="file" accept="image/*" capture="environment">`).
- **Elegir de la galería** (secundario): el mismo campo sin `capture`, para fotos tomadas antes.
- Tras la captura: «Procesando…», luego la miniatura, con **Repetir** y **Quitar**.
- Si la imagen no se puede leer (un formato que el navegador no decodifica): *«No se pudo leer la
  imagen. Tómela de nuevo con la cámara.»*

### 8.2 En la barra inferior (decisión D)

Las imágenes pendientes se cuentan aparte de los registros, porque son otra cosa y tardan más:

> ⏳ 1 registro pendiente de enviar
> 📷 3 fotografías pendientes de enviar

*Precisión tras PE-22 (2026-10-13).* Una foto viaja en dos partes, la fila de datos y la imagen, y la
primera versión contaba la fila entre los registros: un animal con una foto aparecía como «2 registros
y 1 fotografía», que el propietario leería como dos animales. Ahora **la fila de datos de una foto se
cuenta como fotografía**: «1 registro y 1 fotografía». No hay riesgo de que algo quede sin contar,
porque una fila de foto pendiente implica su imagen pendiente (la imagen sube después de la fila,
sección 6.2). La regla está en `src/dominio/pendientes.ts` y la usan la barra, el cierre de sesión y el
reingreso (documento 07, sección 6).

### 8.3 Al cerrar sesión

El cierre exige también la cola de imágenes vacía (3.9.1, documento 12): *«Hay 1 registro y 3
fotografías sin enviar»*. Descartar borra también las imágenes pendientes. Si la fila de una
fotografía ya había llegado al servicio pero su imagen no, la ficha mostrará esa vista como no
disponible.

## 9. Lo que queda fuera de este paso

| Qué | Dónde |
|---|---|
| Completar o actualizar las fotos de un animal ya registrado (RF-02, decisión E) | Paso 2.4, desde la ficha. La lógica de vigencia y de vista principal de este paso ya lo contempla |
| Descargar las imágenes reducidas de los animales registrados en otros teléfonos | Pasos 2.3 y 2.5 |
| Ver las tres vistas completas con conexión | Paso 2.4 |
| Borrar la reducida de un animal que sale del predio (Tabla 25) | Iteración 3, con la salida |

## 10. Relación con los requerimientos

| Requerimiento | Cómo lo atiende |
|---|---|
| **RF-02 · HU-01 criterio 3** | Tres vistas por animal, capturadas desde la cámara o la galería |
| **HU-01 criterio 4 · CU-02 6a** | El animal se guarda con las fotos que haya; la confirmación avisa del registro incompleto |
| **RNF-12** | Compresión WebP en el teléfono; solo la reducida permanece; el servicio rechaza lo que pese más de 1 MB |
| **3.8.5 · Tabla 21** | Cola de imágenes propia, procesada al final; el animal se sincroniza aunque la foto no suba |
| **Tabla 25** | Una reducida por animal en el teléfono; las tres completas en el servicio |
| **3.8.10** | La reducida de la vista principal está siempre disponible sin conexión, como respaldo de la identificación |

## 11. Pruebas

### PU-15 (automática)

| # | Qué verifica | Criterio de aprobación |
|---|---|---|
| 1 | Dimensiones | Mantiene la proporción, nunca amplía, horizontal y vertical |
| 2 | Vista principal | Izquierdo, luego derecho, luego frente, sobre las fotografías vigentes |
| 3 | Guardar con fotografías | En una transacción: animal, fotografías, imágenes y cola; si el animal se rechaza, no queda nada |
| 4 | Registro incompleto | Con 0, 1 o 2 vistas el animal se guarda e informa cuántas tiene |
| 5 | Orden de la subida | Una imagen no sube mientras su fotografía no esté sincronizada |
| 6 | Respuestas | Éxito y «ya existe» confirman; las transitorias detienen; las definitivas registran el intento y siguen |
| 7 | Limpieza tras subir | Se borra la completa; la reducida solo se conserva si es la vista principal |
| 8 | Contador y cierre | Las imágenes pendientes se cuentan aparte y bloquean el cierre de sesión |

La compresión real (decodificar y recodificar) no puede probarse en Vitest, que corre sin navegador:
se verifica en PE-18 midiendo los tamaños obtenidos.

### PI-05 (integración con el servicio real)

Con la cuenta de prueba: subir una completa y una reducida de una fotografía existente; leerlas; y
comprobar que el servicio **rechaza** reemplazarlas, borrarlas, subir una imagen sin fotografía, una
de otro formato y una de más de 1 MB. La limpieza borra después los archivos de prueba.

### PE-18 (manual)

En el computador primero y en un teléfono Android después (con la aplicación publicada, sección 12):
registrar un animal de la serie de pruebas con las tres vistas y otro con una sola; medir el peso de
las imágenes guardadas; registrar sin conexión y comprobar que las fotos suben después de los datos;
verificar en Supabase que existen los archivos y que la ficha de un animal sin el costado izquierdo usa
el derecho.

## 12. Publicación con https (adelantada del paso 6.5)

Para probar la cámara en el teléfono, la aplicación debe abrirse desde una dirección **https**: el
código de desbloqueo (`crypto.subtle`) y el Service Worker solo funcionan en un contexto seguro, y
`localhost` solo existe en el computador. Por eso la publicación, prevista para el paso 6.5, se
adelanta al paso 2.2b (decisión del 2026-10-12). Se documenta aparte en el PLAN, porque no tiene
lógica propia.

## Referencias

- Documento de trabajo de grado: RF-02; RNF-12; CU-02 (Tabla A2); HU-01 (Tabla B1); apartados 3.7.6,
  3.7.8, 3.8.4, 3.8.5, 3.8.7, 3.8.10 y 3.9.1; Tablas 19, 21, 24, 25 y 31.
- Supabase, «Storage Access Control» y «Storage buckets».
- MDN Web Docs, «createImageBitmap()» y «HTMLCanvasElement.toBlob()».
