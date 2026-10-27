# 15 · Listado de animales, búsqueda por chapeta y bajada de imágenes

| | |
|---|---|
| **Componente** | Módulo de consulta (Tabla 20) · `src/modulos/consulta/listado.ts` · `src/modulos/consulta/PantallaListado.tsx` · `src/dominio/edad.ts` · `src/sync/bajadaImagenes.ts` |
| **Capa** | Lógica, sincronización y presentación |
| **Origen en el documento** | RF-06 · RF-28 · CU-03 (flujos 2a y 2b) · HU-02 (criterio 2) · HU-07.3 (marca por registro, heredado) · apartados 3.8.10, 3.10.4.4 y 3.11.1 · Tablas 25 y 28 |
| **Depende de** | [02 · Esquema local](02-esquema-local.md) · [11 · Indicador](11-indicador-de-sincronizacion.md) · [13 · Registro de un animal](13-registro-de-animal.md) · [14 · Fotografías](14-fotografias.md) |
| **Pruebas** | PU-16 · PI-05 (verificación 6) · PE-20 |

---

## 1. El problema

El apartado 3.11.1 describe cómo se identifica un animal en el proceso rediseñado:

> Lo primero que hace la persona es leer el código de la chapeta en lugar de observar las manchas,
> con ese código la aplicación busca el animal en la base local y el flujo toma uno de dos caminos
> según lo encuentre o no.

El listado es la puerta de entrada a ese proceso. Debe resolver tres situaciones:

1. **Se conoce la chapeta** (el caso normal): llegar al animal escribiendo su número (RF-06).
2. **La chapeta no está registrada** (CU-03, 2a): decirlo y llevar al registro, para que el
   inventario se complete mientras se trabaja (3.11.1).
3. **El animal perdió la chapeta** (CU-03, 2b): reconocerlo por su apariencia recorriendo las fotos
   (3.8.10).

Y todo sin conexión (RF-28), incluidas las fotos de los animales que se registraron en otro teléfono.

## 2. La búsqueda (decisión A)

### 2.1 Normalización

Lo escrito en el buscador se normaliza **con la misma función del registro** (documento 13, sección
2.1): sin espacios ni guiones, en mayúsculas y sin ceros a la izquierda. Así `045`, ` 45` y `45`
encuentran el mismo animal, y `a01` encuentra el A1.

### 2.2 Filtro progresivo

Se muestran los animales cuya chapeta **empieza por** lo escrito. Al escribir `4` aparecen el 4, del
40 al 49 y del 400 al 499 (y del 4000 al 4999). Cada dígito acota la lista, de modo que con dos o tres
pulsaciones se llega a cualquier animal del hato.

### 2.3 Orden

1. La **coincidencia exacta**, si existe, va primero y resaltada.
2. Después, el resto **en orden numérico** (9 antes que 10, A2 antes que A10, los números antes que
   las letras), el mismo orden de la lista de progenitores (documento 13, sección 4).

El primer punto no necesita una regla propia: todos los resultados empiezan por lo buscado y son más
largos que la coincidencia exacta, así que el orden numérico ya la deja primera (el 4 antes que el 40,
el A1 antes que el A10). Se comprobó al validar las pruebas con mutaciones: quitar una regla explícita
de «exacta primero» no cambiaba ningún resultado, y se eliminó por redundante.

### 2.4 Chapeta no registrada (decisión B)

Si lo escrito es una chapeta válida (documento 13, sección 2.1) y **ningún animal la tiene
exactamente**, al final de la lista aparece:

> La chapeta **45** no está registrada en este teléfono.
> [Registrar el animal 45]

El botón abre el formulario de registro con la chapeta ya escrita (`/animales/nuevo?chapeta=45`). Se
ofrece a ambos perfiles, porque ambos registran animales (Tabla 27). La frase dice «en este teléfono»
porque la búsqueda es local: un animal registrado en otro teléfono que todavía no se ha sincronizado
no aparece, igual que en la verificación de la chapeta del registro.

Si lo escrito no es una chapeta válida (`O5`, `10000`), la lista simplemente queda vacía con el
mensaje de formato del registro.

## 3. El filtro por estado (decisión C)

Tres botones: **Activos · Retirados · Todos**, con **Activos** por defecto, porque el trabajo diario
es sobre los animales que están en el predio. Un animal está retirado cuando tiene una salida
(documento 02, sección 6.1). Los retirados siguen en la base local con su historial (Tabla 25) y se
pueden consultar.

Los filtros por destino productivo, que el apartado 3.10.4.4 presenta como «fichas pulsables», se
agregan en el paso 3.2, cuando exista el destino.

## 4. Cada fila

| Elemento | Contenido | Origen |
|---|---|---|
| **Fotografía** | La reducida de la vista principal (izquierdo, derecho o frente), o un recuadro «Sin foto» | 3.10.4.4, Tabla 25 |
| **Chapeta** | En tamaño grande | 3.10.4.3 |
| **Sexo y edad** | «Hembra · 2 años y 3 meses» (sección 5) | RF-05 |
| **Retirado** | Señalado, en la vista de retirados o de todos | 6.1 del documento 02 |
| **Distintivo** | ⏳ Pendiente, ↻ Enviando o ⚠ En conflicto; nada si está sincronizado | Tabla 22, HU-07.3 |

Tocar una fila abre la **ficha del animal** (paso 2.4, decisión E).

**Qué fotografía se muestra.** La reducida de la vista principal vigente (documento 14, sección 3).
Si esa todavía no está en el teléfono (por ejemplo, porque se está descargando), se muestra cualquier
otra reducida que haya del animal, y si no hay ninguna, el recuadro «Sin foto».

## 5. La edad

El apartado 3.8.10 exige que la edad estimada no se presente con la misma firmeza que una verificada.
La edad se calcula en días calendario del predio (America/Bogota) entre la fecha de nacimiento y hoy:

| Edad | Fecha exacta | Fecha aproximada |
|---|---|---|
| Menos de 1 mes | «12 días» · «1 día» · «Nació hoy» | «Menos de 1 mes» |
| De 1 a 23 meses | «8 meses» · «1 mes» | «Unos 8 meses» · «Cerca de 1 mes» |
| 24 meses o más | «3 años» · «2 años y 5 meses» | «Unos 3 años» |
| Sin fecha de nacimiento | «Edad desconocida» | — |

**Por qué los meses hasta los dos años.** En el predio la edad de las crías y de los animales jóvenes
se maneja en meses (la del destete, la del primer servicio); expresarla en años antes de los dos años
borraría esa precisión. A partir de los dos años, los años con sus meses.

**Por qué la aproximada no lleva los meses sueltos.** Si la fecha se estimó a partir de «unos 3
años», decir «3 años y 2 meses» sugeriría una precisión que no existe. Se redondea a la unidad mayor.

La función es pura (`describirEdad(nacimiento, exacta, hoy)`) y la reutiliza la ficha (paso 2.4).

## 6. Las fotos de los animales de otros teléfonos (decisión D)

### 6.1 El problema

Cada teléfono guarda la reducida de las fotos que **él mismo** tomó. Los datos de los animales
registrados en otro teléfono llegan con la bajada (documento 10), pero sus imágenes no: viven en el
servicio de archivos. Sin ellas, el listado mostraría «Sin foto» justo en los animales que este
teléfono no conoce, que son los que más necesitan la imagen para reconocerse (3.8.10).

### 6.2 La cuarta etapa del motor

```
1. Subida de datos
2. Bajada de datos
3. Subida de imágenes
4. Bajada de imágenes   ← nueva
```

Para cada **animal activo** cuya fotografía principal vigente **no tiene reducida en el teléfono**, se
descarga del servicio `{animal}/{fotografía}-reducida.webp` (unos 30 KB) y se guarda en la tabla
`imagen` con `completa: null`. Después se aplica la misma regla de retención de la subida (documento
14, sección 6.3): el teléfono conserva solo la reducida de la vista principal. La función de
retención se comparte entre la subida y la bajada.

| Caso | Qué se hace |
|---|---|
| La principal es una foto tomada en este teléfono | Ya tiene su reducida: nada que bajar |
| La principal llegó de otro teléfono | Se baja su reducida |
| Llega una foto principal nueva desde otro teléfono (por ejemplo, el costado izquierdo de un animal que solo tenía el frente) | Se baja la nueva y la anterior se borra del teléfono |
| Animal retirado | No se baja (Tabla 25: los retirados no conservan foto en el teléfono) |

### 6.3 Una imagen que todavía no está en el servicio

El otro teléfono sube primero los datos y después las imágenes (documento 14, sección 6.1), así que
este teléfono puede recibir la fila de una fotografía **antes** de que exista su imagen. La descarga
responde entonces «no existe».

Marcarla como no disponible para siempre sería un error: la imagen llegará minutos después. Pedirla
en cada sincronización, cada 5 minutos, gastaría datos en la red rural. Por eso el intento fallido se
anota con su hora en la tabla `meta`, y la imagen **se vuelve a pedir después de 1 hora**. Una imagen
que nunca existirá (por ejemplo, porque el otro teléfono descartó sus pendientes al cerrar sesión)
cuesta una petición por hora, sin consecuencias.

### 6.4 Respuestas

| Respuesta del servicio de archivos | Qué se hace |
|---|---|
| La imagen | Se guarda y se aplica la retención |
| No existe (404) u otro rechazo definitivo | Se anota la hora; se reintenta pasada 1 hora |
| Sin red, tiempo agotado, 5xx | Se detiene la bajada de imágenes; sigue en la próxima sincronización |
| Sesión vencida | Se detiene |

### 6.5 La carga inicial

En un teléfono nuevo (paso 2.5), la bajada de imágenes trae las reducidas de todos los animales
activos en la primera sincronización: unos 55 × 30 KB ≈ 1,6 MB, frente a ~15 MB si se bajaran las
completas (por eso se decidió subir también la reducida, documento 14, sección 4.2).

## 7. La pantalla

- Acceso **Animales** en la pantalla de inicio, para ambos perfiles (Tabla 28), junto a **Registrar
  animal**.
- Arriba, el **buscador** (grande, con el teclado de texto, porque las chapetas pueden tener letra) y
  los filtros de estado.
- La lista, con filas altas y la foto a la izquierda (3.10.4.2): se acierta con el pulgar.
- Un botón **Registrar animal** al final de la lista, además del que aparece con la chapeta no
  registrada.
- El contador «55 animales activos» encima de la lista, para saber de un vistazo cuántos hay.

**Navegación.** `/animales` para el listado y `/animales/:id` para la ficha (paso 2.4). El formulario
de registro acepta la chapeta en la dirección (`/animales/nuevo?chapeta=45`).

## 8. Relación con los requerimientos

| Requerimiento | Cómo lo atiende |
|---|---|
| **RF-06 · HU-02 criterio 2** | Búsqueda por chapeta, normalizada y progresiva, con la coincidencia exacta primero |
| **RF-28** | Todo se resuelve con la base local, incluidas las fotos de otros teléfonos ya bajadas |
| **CU-03, 2a · 3.11.1** | La chapeta no registrada lleva al registro con el número ya escrito |
| **CU-03, 2b · 3.8.10** | Listado completo con fotos, en orden numérico, para reconocer un animal sin chapeta |
| **HU-07.3 (heredado)** | Distintivo de sincronización en cada fila |
| **Tabla 25** | Solo la reducida principal de los animales activos permanece en el teléfono |

## 9. Pruebas

### PU-16 (automática)

| # | Qué verifica | Criterio de aprobación |
|---|---|---|
| 1 | Búsqueda | Normaliza lo escrito; filtra por el inicio; la exacta va primero; el resto en orden numérico |
| 2 | Chapeta no registrada | Se ofrece registrar solo si es válida y no hay coincidencia exacta |
| 3 | Filtro por estado | Activos, retirados y todos, según tengan salida |
| 4 | Edad | Los casos de la tabla de la sección 5, incluidos fin de mes y año bisiesto |
| 5 | Foto de cada fila | La principal si está; si no, otra reducida del animal; si no, ninguna |
| 6 | Bajada de imágenes | Baja la principal que falta; no baja lo que ya está ni la de un retirado; aplica la retención |
| 7 | Imagen que aún no existe | Se anota y no se pide de nuevo antes de 1 hora; después sí |
| 8 | Respuestas | Transitoria y sesión vencida detienen; «no existe» se anota y sigue |

### PI-05, verificación 6

Con la cuenta de prueba: un teléfono vacío (base local nueva) sincroniza y baja la reducida de la
fotografía subida en la verificación 1, con su tamaño.

### PE-20 (manual, en el teléfono)

Abrir el listado en el teléfono Android: deben aparecer Z920 a Z928 **con sus fotos**, incluidas las
de Z923–Z925, que se subieron desde el computador; buscar con ceros y minúsculas; buscar una chapeta
no registrada y registrarla desde ahí; repetir sin señal.

## Referencias

- Documento de trabajo de grado: RF-05, RF-06, RF-28; CU-03 (Tabla A3); HU-02 (Tabla B2); apartados
  3.8.10, 3.10.4.2 – 3.10.4.4 y 3.11.1; Tablas 22, 25, 27 y 28.

## Ajuste de la sesión C (2026-10-26): guía para aplicar un medicamento

Con `?guia=medicamento` (desde Medicamentos → «Aplicar medicamento a un animal»), el listado muestra primero la guía
«Busque y seleccione el animal al que desea aplicar algún medicamento. En su ficha, toque "Registrar evento"», con el
botón **Continuar**, que la cierra y pone el cursor en el buscador. Mientras la guía está, no se ofrece «Registrar
animal», para que no distraiga. El buscador del listado pasó a ser el componente `Buscador`
(`src/ui/componentes/Buscador.tsx`), que usan también la ronda, la producción de carne y Medicamentos.
